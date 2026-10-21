// Re-snapshots every company in the company table (the database) from Screener.in in one run, so
// all industries, policies and IPO peer tables show price and valuation figures from the same day.
// The figures live only in the database: this script is how they change (never the content files).
//
//   npx tsx scripts/refresh-financials.ts                 dry run: what would change, and checks
//   npx tsx scripts/refresh-financials.ts --apply         write the new figures
//   npx tsx scripts/refresh-financials.ts --only DIXON,HAL     dry run for a few, with before/after
//   npx tsx scripts/refresh-financials.ts --fix-history=A,B --apply   also replace A's and B's
//       FY22-FY26 revenue/profit with Screener's (after checking the report)
//   npx tsx scripts/refresh-financials.ts --add=MAXHEALTH,BSE [--apply]   add companies we don't cover
//       yet (IPO peers, a new industry's suppliers): full history and ratios from Screener
//
// Writes go to DATABASE_URL (.env); the run prints which database first. Each refreshed company gets
// a new KpiSnapshot dated today (market cap, price, [1y, 3y, 5y] price CAGR, 52-week range, top-ratio
// KPIs); the app shows each company's latest, so one that could not be read keeps its older snapshot
// and date. The site picks the new figures up within about half an hour (src/lib/financials/load.ts), no deploy.
// Revenue and profit history is NOT overwritten (it is curated, with basis notes); instead the run
// reports any company whose authored years differ from Screener's by more than 3% (written to
// scripts/.refresh-financials-report.json) for a person to check, and --fix-history replaces the ones
// that are genuinely wrong.
//
// Basis: a company whose note says "standalone figures" is read from Screener's standalone page;
// everything else from consolidated, falling back to standalone when the consolidated page is an empty
// template (the same rule as the live pop-up, src/lib/live/screener-company.ts).
import fs from "node:fs";
import path from "node:path";
import { isUsablePage, parseCompanyPage } from "../src/lib/live/screener-company";
import { findSupplierByTicker, type SupplierFinancials } from "../src/lib/sector-content";
import { listIpos } from "../src/lib/ipo-content";
import { FISCAL_YEARS, formatAsOf, formatPrice } from "../src/lib/financials/rows";
import { readCompanyTable } from "../src/lib/financials/query";
import { writeFinancials } from "../src/lib/financials/write";
import { databaseLabel, scriptPrisma } from "./db";

const ROOT = path.resolve(__dirname, "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FIX_HISTORY = new Set(args.find((a) => a.startsWith("--fix-history="))?.split("=")[1]?.split(",") ?? []);
const REPORT = path.join(ROOT, "scripts/.refresh-financials-report.json");
const ADD = args.find((a) => a.startsWith("--add="))?.split("=")[1]?.split(",") ?? null;
const ONLY = args.find((a) => a.startsWith("--only"))?.split("=")[1]?.split(",") ?? (args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null);
const now = new Date();
// Today at UTC midnight: one snapshot per company per day (re-running the same day updates it).
const SNAPSHOT_DATE = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const SNAPSHOT = formatAsOf(SNAPSHOT_DATE);

const prisma = scriptPrisma();

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
  name: string | null;
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
    name: html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1].trim() ?? null,
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

// ---------------------------------------------------------------- main
const lit = (v: unknown) => JSON.stringify(v);
const isStandalone = (f: SupplierFinancials) => /standalone figures/i.test(f.note ?? "");

// FY22-FY26 from Screener's years: Mar 2022-Mar 2026, or Dec 2021-Dec 2025 for a company whose page
// reports calendar years.
function fiscalColumns(h: NonNullable<Snap["history"]>) {
  const dec = h.years.at(-1)?.startsWith("Dec");
  const want = FISCAL_YEARS.map((y) => (dec ? `Dec ${y - 1}` : `Mar ${y}`));
  const pick = (vals: (number | null)[]) => want.map((y) => { const j = h.years.indexOf(y); return j < 0 ? null : vals[j] ?? null; });
  return { dec: !!dec, want, rev: pick(h.rev), np: pick(h.np) };
}

async function loadTable(): Promise<Map<string, SupplierFinancials>> {
  return new Map(Object.entries(await readCompanyTable(prisma)));
}

async function main() {
  console.log(`company table: ${databaseLabel()}`);
  const table = await loadTable();
  if (ADD) return addEntries(table);
  if (ONLY && APPLY) throw new Error("--apply with --only would leave other companies on an older date; refresh everything");
  const todo = [...table.values()].filter((f) => !ONLY || ONLY.includes(f.ticker));
  console.log(`${todo.length} companies, snapshot ${SNAPSHOT}${APPLY ? "" : " (dry run)"}`);

  const results = new Map<string, Snap | null>();
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const f = todo[next++];
      results.set(f.ticker, await snapshot(f.ticker, isStandalone(f), f.tl?.[1] ?? null));
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  // Screener rate-limits bursts: retry the misses one at a time, slowly.
  for (const f of todo.filter((f) => !results.get(f.ticker))) {
    await new Promise((r) => setTimeout(r, 3000));
    results.set(f.ticker, await snapshot(f.ticker, isStandalone(f), f.tl?.[1] ?? null));
  }

  const failed: string[] = [];
  const revFlags: string[] = [];
  const history: Record<string, unknown> = {};
  const updates: { f: SupplierFinancials; history: boolean }[] = [];
  for (const old of todo) {
    const s = results.get(old.ticker);
    if (!s) {
      failed.push(old.ticker);
      continue;
    }
    // A KPI authored as null is a curated "not meaningful" (e.g. a REIT's P/E and ROE): keep it null.
    const kpi = old.kpi ? s.kpi.map((v, i) => (old.kpi![i] === null ? null : v)) : s.kpi;
    const f: SupplierFinancials = { ...old, mcap: s.mcap, price: formatPrice(s.price), cagr: s.cagr, range: s.range, kpi, asOf: SNAPSHOT };
    let fixHistory = false;
    if (s.history && old.rev && old.np) {
      const cols = fiscalColumns(s.history);
      const off = (x: number | null, y: number | null) => (x == null) !== (y == null) ? x == null && y != null : x != null && y != null && Math.abs(x - y) > 2 && Math.abs(x - y) / Math.max(1, Math.abs(y)) > 0.03;
      const bad = old.rev.some((v, i) => off(v, cols.rev[i])) || old.np.some((v, i) => off(v, cols.np[i]));
      if (bad) {
        revFlags.push(old.ticker);
        history[old.ticker] = { basis: s.basis, years: cols.want, authoredRev: old.rev, screenerRev: cols.rev, authoredNp: old.np, screenerNp: cols.np, note: old.note };
      }
      if (FIX_HISTORY.has(old.ticker)) {
        f.rev = cols.rev;
        f.np = cols.np;
        fixHistory = true;
      }
    }
    if (ONLY) {
      const show = (x: SupplierFinancials) => [x.mcap, x.price, x.note, x.cagr, x.range, x.kpi].map(lit).join(" | ");
      console.log(`${old.ticker} [${s.basis}]\n  was ${show(old)} (${old.asOf})\n  now ${show(f)}`);
    }
    updates.push({ f, history: fixHistory });
  }

  console.log(`updated ${updates.length}, failed ${failed.length}${failed.length ? ": " + failed.join(", ") : ""}`);
  if (revFlags.length) {
    fs.writeFileSync(REPORT, JSON.stringify(history, null, 1));
    console.log(`\n${revFlags.length} companies whose authored revenue/profit history differs from Screener by >3% in some year (details: ${path.relative(ROOT, REPORT)}):\n  ${revFlags.join(", ")}`);
  }

  if (!APPLY) return;
  for (const u of updates) await writeFinancials(prisma, u.f, SNAPSHOT_DATE, { identity: { name: u.f.ticker }, history: u.history });
  console.log(`wrote ${updates.length} snapshots dated ${SNAPSHOT}`);
  if (failed.length) {
    console.log("\nNot refreshed (kept their older snapshot and date) - fix by hand or re-run with --only:");
    console.log("  " + failed.join(", "));
    process.exitCode = 1;
  }
}

// --add: new companies (e.g. IPO peers) from Screener, with their full FY history.
async function addEntries(table: Map<string, SupplierFinancials>) {
  const peerName = new Map(listIpos().flatMap((r) => r.peers.filter((p) => p.ticker).map((p) => [p.ticker!, p.name])));
  let added = 0;
  for (const t of ADD!) {
    if (table.has(t)) { console.log(`${t}: already in the company table, skipped`); continue; }
    const s = await snapshot(t, false, null);
    if (!s || !s.history) { console.log(`${t}: FAILED`); continue; }
    const cols = fiscalColumns(s.history);
    const note = [
      s.basis === "standalone" ? "standalone figures" : null,
      cols.dec ? "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025" : null,
      cols.rev.some((v) => v == null) ? "years before its listing or not on Screener left blank" : null,
    ].filter(Boolean).join("; ") || null;
    const f: SupplierFinancials = { ticker: t, rev: cols.rev, np: cols.np, mcap: s.mcap, price: formatPrice(s.price), note, cagr: s.cagr, range: s.range, tl: null, kpi: s.kpi, asOf: SNAPSHOT };
    const sup = findSupplierByTicker(t);
    const name = sup?.name ?? peerName.get(t) ?? s.name ?? t;
    console.log(`${t} (${name}): ${lit(f)}`);
    if (APPLY) {
      await writeFinancials(prisma, f, SNAPSHOT_DATE, { identity: { name, listed: true, role: sup?.role ?? "" } });
      added++;
    }
  }
  if (APPLY) console.log(`added ${added} to the company table`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
