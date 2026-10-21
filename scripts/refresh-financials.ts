// Re-snapshots every company's price and valuation figures from Screener.in in one run, so all
// industries, policies and IPO peer tables show figures from the same day.
//
//   npx tsx scripts/refresh-financials.ts                 dry run: what would change, and checks
//   npx tsx scripts/refresh-financials.ts --apply         write the new figures
//   npx tsx scripts/refresh-financials.ts --only DIXON,HAL     dry run for a few, with before/after
//   npx tsx scripts/refresh-financials.ts --fix-history=A,B --apply   also replace A's and B's
//       FY22-FY26 revenue/profit with Screener's (after checking the report)
//   npx tsx scripts/refresh-financials.ts --add=MAXHEALTH,BSE [--apply]   create FIN entries for
//       companies we don't cover yet (IPO peers): full history and ratios from Screener
//
// What it updates in each FIN entry (products.ts `FIN["X"] = fin(...)` and policies/*.ts
// `addFin("X", fin(...))`): market cap, price, the [1y, 3y, 5y] price CAGR, the 52-week range and the
// top-ratio KPIs. It strips per-entry "Price/valuation as of ..." phrases and sets products.ts's ASOF
// to the snapshot date, so every entry carries the same `asOf`. Revenue and profit history is NOT
// overwritten (it is curated, with basis notes); instead the run reports any company whose latest
// authored year differs from Screener's by more than 3% (written to scripts/.refresh-financials-report.json)
// for a person to check, and --fix-history replaces the ones that are genuinely wrong.
//
// Basis: an entry whose note says "standalone figures" is read from Screener's standalone page; everything
// else from consolidated, falling back to standalone when the consolidated page is an empty template
// (the same rule as the live pop-up, src/lib/live/screener-company.ts).
import fs from "node:fs";
import path from "node:path";
import { isUsablePage, parseCompanyPage } from "../src/lib/live/screener-company";

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  path.join(ROOT, "src/lib/sector-content/products.ts"),
  ...fs
    .readdirSync(path.join(ROOT, "src/lib/sector-content/policies"))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".extras.ts"))
    .map((f) => path.join(ROOT, "src/lib/sector-content/policies", f)),
];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FIX_HISTORY = new Set(args.find((a) => a.startsWith("--fix-history="))?.split("=")[1]?.split(",") ?? []);
const REPORT = path.join(ROOT, "scripts/.refresh-financials-report.json");
const ADD = args.find((a) => a.startsWith("--add="))?.split("=")[1]?.split(",") ?? null;
const ONLY = args.find((a) => a.startsWith("--only"))?.split("=")[1]?.split(",") ?? (args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null);
const now = new Date();
const SNAPSHOT = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

// ---------------------------------------------------------------- locate fin() calls
type Call = { file: string; ticker: string; start: number; end: number; args: string[] };

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "", q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === "\\") { cur += s[++i]; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function findCalls(file: string, src: string): Call[] {
  const calls: Call[] = [];
  const re = /(?:FIN\["([^"]+)"\]\s*=\s*|addFin\(\s*"([^"]+)"\s*,\s*)fin\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (src.slice(src.lastIndexOf("\n", m.index) + 1, m.index).includes("//")) continue; // a comment
    const open = m.index + m[0].length - 1;
    let depth = 0, j = open, q: string | null = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (q) { if (c === "\\") { j++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === "(") depth++;
      else if (c === ")" && --depth === 0) break;
    }
    calls.push({ file, ticker: m[1] ?? m[2], start: open + 1, end: j, args: splitTopLevel(src.slice(open + 1, j)) });
  }
  return calls;
}

// ---------------------------------------------------------------- Screener
// "missing" (404) is a real answer; null means the request itself failed (network, rate limit).
async function get(url: string): Promise<string | "missing" | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return "missing";
      if (res.ok) return await res.text();
    } catch {
      // retry below
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  return null;
}

// Screener addresses most companies by NSE symbol; SME, BSE-only and trust listings by a BSE code.
async function resolveBase(ticker: string, tlSlug: string | null): Promise<string | null> {
  for (const q of [ticker, tlSlug?.replace(/-/g, " ").replace(/\b(ltd|limited)\b/g, "").trim()]) {
    if (!q) continue;
    const res = await get(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}`);
    if (!res || res === "missing") continue;
    const hits = JSON.parse(res) as { url: string }[];
    const url = hits.find((h) => /^\/company\/[^/]+\//.test(h.url))?.url;
    if (url) return `https://www.screener.in${url.match(/^\/company\/[^/]+/)![0]}`;
  }
  return null;
}

type Snap = {
  mcap: string; price: number; range: [number, number] | null; cagr: (number | null)[]; kpi: (number | null)[];
  basis: "consolidated" | "standalone"; latestRev: { year: string; value: number | null } | null;
  history: { years: string[]; rev: (number | null)[]; np: (number | null)[] } | null;
};

const yearOf = (label: string) => Number(label.match(/(\d{4})$/)?.[1] ?? 0);
const latestYear = (html: string) => {
  const ys = parseCompanyPage(html).annual?.years.filter((y) => /^[A-Z][a-z]{2} \d{4}$/.test(y)) ?? [];
  return ys.length ? yearOf(ys[ys.length - 1]) : 0;
};

// Screener addresses a few listings by a code its search doesn't return for the ticker.
const SCREENER_ID: Record<string, string> = { ALTIUSINVIT: "543225" };

async function snapshot(ticker: string, standalone: boolean, tlSlug: string | null): Promise<Snap | null> {
  let base = `https://www.screener.in/company/${encodeURIComponent(SCREENER_ID[ticker] ?? ticker)}`;
  let basis: Snap["basis"] = standalone ? "standalone" : "consolidated";
  let html = await get(standalone ? `${base}/` : `${base}/consolidated/`);
  if (html === "missing") {
    const found = await resolveBase(ticker, tlSlug);
    if (!found) return null;
    base = found;
    html = await get(standalone ? `${base}/` : `${base}/consolidated/`);
  }
  if (html === null || html === "missing") return null;
  if (!standalone) {
    // Consolidated is the default; standalone when it is an empty template or its accounts stop
    // years earlier than the standalone page's (a stale consolidated filing, e.g. RailTel).
    const usable = isUsablePage(html);
    if (!usable || latestYear(html) < now.getFullYear() - 1) {
      const sa = await get(`${base}/`);
      if (sa === null) return null;
      if (sa !== "missing" && isUsablePage(sa) && (!usable || latestYear(sa) > latestYear(html))) {
        html = sa;
        basis = "standalone";
      }
    }
  }
  const page = parseCompanyPage(html);
  const k = page.kpi;
  if (!k || k.price == null || !k.marketCap) return null;
  const pct = (title: string, period: string) => {
    const v = page.growth.find((g) => g.title === title)?.rows.find((r) => r.period === period)?.value;
    const n = v ? parseFloat(v.replace(/[%,]/g, "")) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const cagr = [pct("Stock Price CAGR", "1 Year"), pct("Stock Price CAGR", "3 Years"), pct("Stock Price CAGR", "5 Years")];
  // Latest full fiscal year's revenue: Screener labels lenders' top line "Revenue", others "Sales".
  // Lenders' P&L has a "Revenue" row instead of "Sales"; parseCompanyPage keeps only Sales, so read it here.
  const sales = page.annual?.series.find((s) => s.label === "Sales") ?? revenueRow(html, page.annual?.years ?? []);
  const profit = page.annual?.series.find((s) => s.label === "Net Profit");
  let latestRev: Snap["latestRev"] = null;
  let history: Snap["history"] = null;
  if (page.annual && sales) {
    const idxs = page.annual.years.map((y, i) => (/^[A-Z][a-z]{2} \d{4}$/.test(y) ? i : -1)).filter((i) => i >= 0);
    const idx = idxs.at(-1);
    if (idx != null) latestRev = { year: page.annual.years[idx], value: sales.values[idx] };
    const last5 = idxs; // every full year on the page (about five); aligned by year in main()
    history = {
      years: last5.map((i) => page.annual!.years[i]),
      rev: last5.map((i) => sales.values[i] ?? null),
      np: last5.map((i) => profit?.values[i] ?? null),
    };
  }
  return {
    mcap: k.marketCap,
    price: k.price,
    range: k.low52w != null && k.high52w != null ? [k.low52w, k.high52w] : null,
    cagr,
    kpi: [k.pe, k.bookValue, k.divYield, k.roce, k.roe, k.faceValue],
    basis,
    latestRev,
    history,
  };
}

function revenueRow(html: string, years: string[]): { label: string; values: (number | null)[] } | undefined {
  const i = html.indexOf('id="profit-loss"');
  if (i < 0 || !years.length) return undefined;
  const table = html.slice(html.indexOf("<table", i), html.indexOf("</table>", i));
  const row = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/\s*\+\s*$/, "").trim()))
    .find((cells) => cells[0] === "Revenue");
  if (!row) return undefined;
  const vals = row.slice(1).map((v) => { const n = parseFloat(v.replace(/[,%\s]/g, "")); return Number.isFinite(n) ? n : null; });
  return { label: "Revenue", values: vals.slice(-years.length) };
}

// ---------------------------------------------------------------- formatting
const fmtPrice = (p: number) => `Rs ${p >= 100 ? Math.round(p).toLocaleString("en-IN") : p.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const lit = (v: unknown) => JSON.stringify(v);

function stripAsOf(noteLit: string): string {
  if (noteLit === "null") return "null";
  let note: string = JSON.parse(noteLit);
  note = note
    .replace(/\s*;?\s*Price\/valuation as of \d{1,2} [A-Z][a-z]{2} \d{4}\s*;?\s*/i, "; ")
    .replace(/^\s*;\s*|\s*;\s*$/g, "")
    .trim();
  return note ? JSON.stringify(note) : "null";
}

// ---------------------------------------------------------------- main
async function main() {
  const sources = new Map(FILES.map((f) => [f, fs.readFileSync(f, "utf8")]));
  const calls = [...sources].flatMap(([f, s]) => findCalls(f, s));
  const dupes = calls.map((c) => c.ticker).filter((t, i, a) => a.indexOf(t) !== i);
  if (dupes.length) throw new Error(`More than one fin() entry for: ${[...new Set(dupes)].join(", ")}`);
  if (ADD) return addEntries(calls, sources.get(FILES[0])!);
  const todo = calls.filter((c) => !ONLY || ONLY.includes(c.ticker));
  console.log(`${todo.length} companies, snapshot ${SNAPSHOT}${APPLY ? "" : " (dry run)"}`);

  const results = new Map<Call, Snap | null>();
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const c = todo[next++];
      const standalone = /standalone figures/i.test(c.args[5] ?? "");
      const tl = (() => { try { return (JSON.parse(c.args[8] ?? "null") as [unknown, string] | null)?.[1] ?? null; } catch { return null; } })();
      results.set(c, await snapshot(c.ticker, standalone, tl));
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  // Screener rate-limits bursts: retry the misses one at a time, slowly.
  for (const c of todo.filter((c) => !results.get(c))) {
    await new Promise((r) => setTimeout(r, 3000));
    const tl = (() => { try { return (JSON.parse(c.args[8] ?? "null") as [unknown, string] | null)?.[1] ?? null; } catch { return null; } })();
    results.set(c, await snapshot(c.ticker, /standalone figures/i.test(c.args[5] ?? ""), tl));
  }

  const failed: string[] = [];
  const revFlags: string[] = [];
  const history: Record<string, unknown> = {};
  const edits = new Map<string, { start: number; end: number; text: string }[]>();
  if (ONLY && APPLY) throw new Error("--apply with --only would leave other entries on the old date; refresh everything");
  const oldAsOf = sources.get(FILES[0])!.match(/var ASOF = "([^"]+)";/)![1];
  const addEdit = (c: Call, text: string) => edits.set(c.file, [...(edits.get(c.file) ?? []), { start: c.start, end: c.end, text }]);
  for (const c of todo) {
    const s = results.get(c);
    if (!s) {
      failed.push(c.ticker);
      // Keep its old date explicitly, since ASOF (the default) moves to the snapshot date.
      const note = c.args[5] && c.args[5] !== "null" ? (JSON.parse(c.args[5]) as string) : "";
      if (!/as of \d{1,2} [A-Z][a-z]{2} \d{4}/i.test(note)) {
        const a = [...c.args];
        a[5] = lit([`Price/valuation as of ${oldAsOf}`, note].filter(Boolean).join("; "));
        addEdit(c, a.join(","));
      }
      continue;
    }
    const a = [...c.args];
    while (a.length < 10) a.push("null");
    a[2] = lit(s.mcap);
    a[3] = lit(fmtPrice(s.price));
    a[5] = stripAsOf(a[5]);
    a[6] = lit(s.cagr);
    a[7] = lit(s.range);
    // A KPI authored as null is a curated "not meaningful" (e.g. a REIT's P/E and ROE): keep it null.
    const oldKpi = (() => { try { return JSON.parse(c.args[9] ?? "null") as (number | null)[] | null; } catch { return null; } })();
    a[9] = lit(oldKpi ? s.kpi.map((v, i) => (oldKpi[i] === null ? null : v)) : s.kpi);
    // Compare the authored FY22-FY26 columns with Screener's figures for the same years: Mar 2022-
    // Mar 2026, or Dec 2021-Dec 2025 for a company whose page reports calendar years.
    const authored = (i: number) => { try { return JSON.parse(a[i]) as (number | null)[] | null; } catch { return null; } };
    const [rev, np] = [authored(0), authored(1)];
    if (s.history && rev && np) {
      const h = s.history;
      const dec = h.years.at(-1)?.startsWith("Dec");
      const want = [0, 1, 2, 3, 4].map((i) => (dec ? `Dec ${2021 + i}` : `Mar ${2022 + i}`));
      const pick = (vals: (number | null)[]) => want.map((y) => { const j = h.years.indexOf(y); return j < 0 ? null : vals[j] ?? null; });
      const [sRev, sNp] = [pick(h.rev), pick(h.np)];
      const off = (x: number | null, y: number | null) => (x == null) !== (y == null) ? x == null && y != null : x != null && y != null && Math.abs(x - y) > 2 && Math.abs(x - y) / Math.max(1, Math.abs(y)) > 0.03;
      const bad = rev.some((v, i) => off(v, sRev[i])) || np.some((v, i) => off(v, sNp[i]));
      if (bad) {
        revFlags.push(c.ticker);
        history[c.ticker] = { basis: s.basis, years: want, authoredRev: rev, screenerRev: sRev, authoredNp: np, screenerNp: sNp, note: c.args[5] };
      }
      if (FIX_HISTORY.has(c.ticker)) {
        a[0] = lit(sRev);
        a[1] = lit(sNp);
      }
    }
    if (ONLY) console.log(`${c.ticker} [${s.basis}]\n  was ${[2, 3, 5, 6, 7, 9].map((i) => c.args[i]).join(" | ")}\n  now ${[2, 3, 5, 6, 7, 9].map((i) => a[i]).join(" | ")}`);
    addEdit(c, a.join(","));
  }

  console.log(`updated ${todo.length - failed.length}, failed ${failed.length}${failed.length ? ": " + failed.join(", ") : ""}`);
  if (revFlags.length) {
    fs.writeFileSync(REPORT, JSON.stringify(history, null, 1));
    console.log(`\n${revFlags.length} companies whose authored revenue/profit history differs from Screener by >3% in some year (details: ${path.relative(ROOT, REPORT)}):\n  ${revFlags.join(", ")}`);
  }

  if (!APPLY) return;
  for (const [file, list] of edits) {
    let src = sources.get(file)!;
    for (const e of list.sort((x, y) => y.start - x.start)) src = src.slice(0, e.start) + e.text + src.slice(e.end);
    if (file.endsWith("products.ts")) src = src.replace(/var ASOF = "[^"]+";/, `var ASOF = "${SNAPSHOT}";`);
    fs.writeFileSync(file, src);
  }
  if (failed.length) {
    console.log("\nNot refreshed (kept their old figures and date) - fix by hand or re-run with --only:");
    console.log("  " + failed.join(", "));
    process.exitCode = 1;
  }
}

// --add: new FIN entries (e.g. IPO peers) from Screener, inserted into products.ts's sorted FIN block.
async function addEntries(calls: Call[], products: string) {
  const have = new Set(calls.map((c) => c.ticker));
  const lines: string[] = [];
  for (const t of ADD!) {
    if (have.has(t)) { console.log(`${t}: already in FIN, skipped`); continue; }
    const s = await snapshot(t, false, null);
    if (!s || !s.history) { console.log(`${t}: FAILED`); continue; }
    const h = s.history;
    const dec = h.years.at(-1)?.startsWith("Dec");
    const want = [0, 1, 2, 3, 4].map((i) => (dec ? `Dec ${2021 + i}` : `Mar ${2022 + i}`));
    const pick = (vals: (number | null)[]) => want.map((y) => { const j = h.years.indexOf(y); return j < 0 ? null : vals[j] ?? null; });
    const rev = pick(h.rev), np = pick(h.np);
    const notes = [
      `Price/valuation as of ${SNAPSHOT}`,
      s.basis === "standalone" ? "standalone figures" : null,
      dec ? "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025" : null,
      rev.some((v) => v == null) ? "years before its listing or not on Screener left blank" : null,
    ].filter(Boolean).join("; ");
    const line = ` FIN[${lit(t)}] = fin(${[lit(rev), lit(np), lit(s.mcap), lit(fmtPrice(s.price)), lit(t), lit(notes), lit(s.cagr), lit(s.range), "null", lit(s.kpi)].join(",")});`;
    console.log(line);
    lines.push(line);
  }
  if (!APPLY || !lines.length) return;
  const all = products.split("\n");
  const idx = all.map((l, i) => (/^ FIN\["/.test(l) ? i : -1)).filter((i) => i >= 0);
  const block = [...all.slice(idx[0], idx.at(-1)! + 1), ...lines];
  const key = (l: string) => l.match(/FIN\["([^"]+)"/)![1];
  block.sort((a, b) => key(a).localeCompare(key(b)));
  all.splice(idx[0], idx.at(-1)! - idx[0] + 1, ...block);
  fs.writeFileSync(FILES[0], all.join("\n"));
  console.log(`added ${lines.length} to products.ts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
