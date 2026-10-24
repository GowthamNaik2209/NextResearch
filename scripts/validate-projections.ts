// One-period out-of-sample check of the basket projection model (docs/PROJECTIONS-VALIDATION.md).
// Rebuilds every basket stock's projection input as it would have looked on AS_OF (figures up to
// FY25, price and market cap on that date, price CAGR and industry medians from the same as-of
// figures), runs the 1-year projection, and compares it with the actual price return since.
// Read-only: company figures from DATABASE_URL (.env), prices from Yahoo (2Y daily). Not shipped.
//   npx tsx scripts/validate-projections.ts [--json out.json]
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { installFinancialsFromDatabase } from "../src/lib/financials/test-db";
import { companyFinancials, listSectors, parseCrore, tickerForSupplier } from "../src/lib/sector-content";
import { companySlug, getCompanyPage, primaryAppearance } from "../src/lib/sector-content/companies";
import { listBasketUniverse } from "../src/lib/baskets/industry";
import { detectOutlier } from "../src/lib/baskets/outliers";
import * as shipped from "../src/lib/baskets/projection";
import type { ProjectionInput, StockProjection } from "../src/lib/baskets/projection";
import { getChartWithFallback, getSymbolChart, type PricePoint } from "../src/lib/live/yahoo";

const AS_OF = "2025-10-24";
const AS_OF_LABEL = "24 Oct 2025";
const YEAR_BEFORE = "2024-10-24";
const FY25 = 3; // index in FY22..FY26
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---- Parameter variants: a copy of projection.ts with constants swapped (shipped file untouched) ----
type Params = Partial<Record<"GROWTH_FADE" | "REVERT_YEARS" | "TARGET_MIN" | "TARGET_MAX", number>>;
type Model = { projectStock: (x: ProjectionInput) => StockProjection };
const SRC = readFileSync(new URL("../src/lib/baskets/projection.ts", import.meta.url), "utf8");
const TMP = mkdtempSync(join(tmpdir(), "validate-proj-"));
async function variant(name: string, p: Params): Promise<Model> {
  let src = SRC;
  for (const [k, v] of Object.entries(p)) {
    const re = new RegExp(`const ${k} = [\\d.]+;`);
    if (!re.test(src)) throw new Error(`projection.ts has no constant ${k}`);
    src = src.replace(re, `const ${k} = ${v};`);
  }
  const file = join(TMP, `projection-${name}.ts`);
  writeFileSync(file, src);
  return import(pathToFileURL(file).href);
}

// ---- Prices ----
const priceOn = (pts: PricePoint[], day: string, maxLagDays = 7): number | null => {
  // Last close on or before the day; if the series starts just after it, its first close.
  let hit: PricePoint | null = null;
  for (const p of pts) if (p.t <= day) hit = p;
  if (hit) return (Date.parse(day) - Date.parse(hit.t)) / 86_400_000 <= maxLagDays ? hit.c : null;
  const first = pts[0];
  return first && (Date.parse(first.t) - Date.parse(day)) / 86_400_000 <= maxLagDays ? first.c : null;
};
const isoOf = (label: string | undefined): string | null => {
  const m = label ? /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(label.trim()) : null;
  const mo = m ? MONTHS.indexOf(m[2]) : -1;
  return m && mo >= 0 ? `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};
/** The worst one-day close-to-close move in a window (a big one is often an unadjusted split or a demerger). */
const worstDay = (pts: PricePoint[], from: string) => {
  let w = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].t > from) w = Math.min(w, pts[i].c / pts[i - 1].c - 1);
  return w;
};

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

// ---- Statistics ----
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const med = (xs: number[]) => shipped.median(xs);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
};
function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(a: number[], b: number[]) {
  const ma = mean(a)!, mb = mean(b)!;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}
const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));
// Seeded RNG so every run prints the same intervals.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
/** IC with a bootstrap 95% interval and a permutation p-value (two-sided). */
function icStats(pred: number[], act: number[], iters = 2000) {
  const ic = spearman(pred, act);
  const r = rng(7);
  const boots: number[] = [];
  let extreme = 0;
  const n = pred.length;
  for (let k = 0; k < iters; k++) {
    const ix = Array.from({ length: n }, () => Math.floor(r() * n));
    boots.push(spearman(ix.map((i) => pred[i]), ix.map((i) => act[i])));
    const sh = [...act];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [sh[i], sh[j]] = [sh[j], sh[i]];
    }
    if (Math.abs(spearman(pred, sh)) >= Math.abs(ic)) extreme++;
  }
  const t = ic * Math.sqrt((n - 2) / (1 - ic * ic));
  return { ic, lo: quantile(boots, 0.025), hi: quantile(boots, 0.975), p: (extreme + 1) / (iters + 1), t, n };
}
/** Average actual return of the top and bottom fifth by a prediction. */
function quintiles(pred: number[], act: number[]) {
  const order = pred.map((p, i) => [p, act[i]] as const).sort((a, b) => a[0] - b[0]);
  const n = order.length;
  const q = (k: number) => order.slice(Math.floor((k * n) / 5), Math.floor(((k + 1) * n) / 5)).map((x) => x[1]);
  const buckets = [0, 1, 2, 3, 4].map((k) => ({ meanAct: mean(q(k))!, medAct: med(q(k))!, n: q(k).length, meanPred: mean(q(k).map((_, i) => order[Math.floor((k * n) / 5) + i][0]))! }));
  return { buckets, spread: buckets[4].meanAct - buckets[0].meanAct, spreadMed: buckets[4].medAct - buckets[0].medAct };
}

// ---- Main ----
type Row = {
  ticker: string;
  home: string | null;
  input: ProjectionInput;
  actual: number;
  past1y: number | null;
  mcapThen: number;
};

async function main() {
  const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
  await installFinancialsFromDatabase();
  const universe = listBasketUniverse();
  const left: { ticker: string; reason: string }[] = [];

  // Every ticker whose as-of market cap is needed: the universe and every industry's listed members.
  const tickers = new Set(universe.map((s) => s.ticker));
  for (const s of listSectors()) for (const sup of Object.values(s.suppliers)) if (sup.listed && sup.f) tickers.add(tickerForSupplier(sup));
  const list = [...tickers];
  console.error(`fetching 2Y prices for ${list.length} tickers...`);
  const charts = new Map<string, PricePoint[] | null>();
  await pool(list, 6, async (t) => {
    let c = await getChartWithFallback(t, "2Y").catch(() => null);
    if (!c) c = await getChartWithFallback(t, "2Y").catch(() => null);
    charts.set(t, c?.points ?? null);
  });
  const nifty = (await getSymbolChart("^NSEI", "2Y"))?.points ?? [];
  const lastDay = nifty[nifty.length - 1]?.t ?? "?";

  // As-of market cap: today's from the company table scaled by price then / price on the table's date.
  type Then = { price: number; mcap: number; now: number; past1y: number | null; worst: number; nowDay: string };
  const then = new Map<string, Then | { err: string }>();
  for (const t of list) {
    const pts = charts.get(t);
    const f = companyFinancials(t);
    if (!pts || pts.length < 2) { then.set(t, { err: "No price history from Yahoo or Screener" }); continue; }
    const p0 = priceOn(pts, AS_OF);
    if (p0 == null) { then.set(t, { err: `No price on ${AS_OF_LABEL} (listed later)` }); continue; }
    const mcapNow = parseCrore(f?.mcap);
    const tableDay = isoOf(f?.asOf);
    const pTable = tableDay ? priceOn(pts, tableDay) : null;
    if (mcapNow == null || mcapNow <= 0 || pTable == null) { then.set(t, { err: "No market cap / price on the table's date" }); continue; }
    const pYear = priceOn(pts, YEAR_BEFORE, 10);
    then.set(t, {
      price: p0,
      mcap: mcapNow * (p0 / pTable),
      now: pts[pts.length - 1].c,
      nowDay: pts[pts.length - 1].t,
      past1y: pYear != null ? (p0 / pYear - 1) * 100 : null,
      worst: worstDay(pts, pts[0].t),
    });
  }

  // Industry medians as of AS_OF: P/E = mcap then / FY25 profit (profitable), P/S = mcap then / FY25 revenue.
  const indMult = new Map<string, { pe: number | null; ps: number | null }>();
  for (const s of listSectors()) {
    const pes: number[] = [], pss: number[] = [];
    const seen = new Set<string>();
    for (const sup of Object.values(s.suppliers)) {
      if (!sup.listed || !sup.f) continue;
      const t = tickerForSupplier(sup);
      if (seen.has(t)) continue;
      seen.add(t);
      const th = then.get(t);
      const f = companyFinancials(t);
      if (!th || "err" in th || !f) continue;
      const np = f.np?.[FY25], rev = f.rev?.[FY25];
      if (fin(np) && np > 0) pes.push(th.mcap / np);
      if (fin(rev) && rev > 0) pss.push(th.mcap / rev);
    }
    indMult.set(s.slug, { pe: med(pes), ps: med(pss) });
  }

  const rows: Row[] = [];
  const suspect: string[] = [];
  for (const st of universe) {
    const t = st.ticker;
    const f = companyFinancials(t);
    const th = then.get(t);
    if (!f) { left.push({ ticker: t, reason: "No figures in the company table" }); continue; }
    if (!th || "err" in th) { left.push({ ticker: t, reason: th ? th.err : "No price history" }); continue; }
    if (th.worst < -0.4) { suspect.push(t); left.push({ ticker: t, reason: `A one-day fall of ${(th.worst * 100).toFixed(0)}% in the price history (likely an unadjusted split or demerger)` }); continue; }
    const rev = [...(f.rev ?? [])].slice(0, 5);
    const np = [...(f.np ?? [])].slice(0, 5);
    while (rev.length < 5) rev.push(null);
    while (np.length < 5) np.push(null);
    rev[4] = null; // FY26 was not reported on AS_OF
    np[4] = null;
    const npFY25 = np[FY25];
    const out = detectOutlier({ rev, np, note: f.note });
    const m = out ? /^FY(\d\d)$/.exec(out.year) : null;
    const page = getCompanyPage(companySlug(t));
    const home = page ? primaryAppearance(page).sectorSlug : null;
    const input: ProjectionInput = {
      rev,
      np,
      price: th.price,
      mcapCr: th.mcap,
      pe: fin(npFY25) && npFY25 > 0 ? th.mcap / npFY25 : null,
      cagr: [th.past1y, null, null],
      asOf: AS_OF_LABEL,
      oneOffIndex: m ? Number(m[1]) - 22 : null,
      industry: (home && indMult.get(home)) || { pe: null, ps: null },
    };
    rows.push({ ticker: t, home, input, actual: th.now / th.price - 1, past1y: th.past1y, mcapThen: th.mcap });
  }

  const niftyRet = (nifty[nifty.length - 1]?.c ?? NaN) / (priceOn(nifty, AS_OF) ?? NaN) - 1;

  // ---- Evaluate one model ----
  function evaluate(model: Model, exit: "own" | "ind") {
    const ok: { r: Row; bear: number; base: number; bull: number; method: string; capped: boolean }[] = [];
    const out: { ticker: string; reason: string }[] = [];
    for (const r of rows) {
      const p = model.projectStock(r.input);
      if (!p.ok) { out.push({ ticker: r.ticker, reason: p.reason }); continue; }
      const [bear, base, bull] = p.ret[exit]["1"];
      ok.push({ r, bear, base, bull, method: p.method, capped: p.capped });
    }
    const act = ok.map((x) => x.r.actual);
    const base = ok.map((x) => x.base);
    const inside = ok.filter((x) => x.r.actual >= x.bear && x.r.actual <= x.bull).length;
    const above = ok.filter((x) => x.r.actual > x.bull).length;
    const below = ok.filter((x) => x.r.actual < x.bear).length;
    const err = ok.map((x) => x.r.actual - x.base);
    // Band hit rate after taking out the period's common move (median error).
    const drift = med(err)!;
    const insideDemeaned = ok.filter((x) => x.r.actual - drift >= x.bear && x.r.actual - drift <= x.bull).length;
    // How many half-widths from Base the actual landed (per side): the 80th percentile says how
    // much wider Bear-Bull would need to be to hold 8 in 10.
    const z = ok.map((x) => (x.r.actual >= x.base ? (x.r.actual - x.base) / Math.max(1e-9, x.bull - x.base) : (x.base - x.r.actual) / Math.max(1e-9, x.base - x.bear)));
    const zDemeaned = ok.map((x) => { const a = x.r.actual - drift; return a >= x.base ? (a - x.base) / Math.max(1e-9, x.bull - x.base) : (x.base - a) / Math.max(1e-9, x.base - x.bear); });
    return {
      ok, out, act, base,
      ic: icStats(base, act),
      inside: inside / ok.length, above: above / ok.length, below: below / ok.length,
      insideDemeaned: insideDemeaned / ok.length,
      z80: quantile(z, 0.8), z80Demeaned: quantile(zDemeaned, 0.8),
      errMed: drift, errMean: mean(err)!, mae: mean(err.map(Math.abs))!,
      widthMed: med(ok.map((x) => x.bull - x.bear))!,
      baseMed: med(base)!, bearMed: med(ok.map((x) => x.bear))!, bullMed: med(ok.map((x) => x.bull))!,
      actMed: med(act)!, actMean: mean(act)!, actP10: quantile(act, 0.1), actP90: quantile(act, 0.9),
      quint: quintiles(base, act),
      byMethod: (["pe", "ps"] as const).map((m) => {
        const s = ok.filter((x) => x.method === m);
        return { m, n: s.length, ic: s.length >= 10 ? spearman(s.map((x) => x.base), s.map((x) => x.r.actual)) : null };
      }),
    };
  }

  // Check the copied model reproduces the shipped one exactly.
  const dflt = await variant("default", {});
  for (const r of rows) {
    const a = JSON.stringify(shipped.projectStock(r.input)), b = JSON.stringify(dflt.projectStock(r.input));
    if (a !== b) throw new Error(`copied model differs from shipped for ${r.ticker}`);
  }

  const mainOwn = evaluate(shipped, "own");
  const mainInd = evaluate(shipped, "ind");

  // By home industry (n >= 10).
  const byInd = new Map<string, typeof mainOwn.ok>();
  for (const x of mainOwn.ok) if (x.r.home) byInd.set(x.r.home, [...(byInd.get(x.r.home) ?? []), x]);
  const sectorName = new Map(listSectors().map((s) => [s.slug, s.name]));
  const industries = [...byInd]
    .filter(([, xs]) => xs.length >= 10)
    .map(([slug, xs]) => {
      const pred = xs.map((x) => x.base), act = xs.map((x) => x.r.actual);
      return { slug, name: sectorName.get(slug) ?? slug, n: xs.length, ic: spearman(pred, act), inside: xs.filter((x) => x.r.actual >= x.bear && x.r.actual <= x.bull).length / xs.length, actMed: med(act)!, baseMed: med(pred)! };
    })
    .sort((a, b) => b.n - a.n);
  // Within-industry IC: ranks inside each home industry, pooled (takes out industry-level moves).
  const withinPairs: [number, number][] = [];
  for (const xs of byInd.values()) {
    if (xs.length < 5) continue;
    const rp = ranks(xs.map((x) => x.base)), ra = ranks(xs.map((x) => x.r.actual));
    const n = xs.length;
    for (let i = 0; i < n; i++) withinPairs.push([(rp[i] - (n + 1) / 2) / n, (ra[i] - (n + 1) / 2) / n]);
  }
  const withinIC = pearson(withinPairs.map((p) => p[0]), withinPairs.map((p) => p[1]));

  // Naive benchmarks on the same stocks.
  const S = mainOwn.ok;
  const act = S.map((x) => x.r.actual);
  const withVal = (f: (x: (typeof S)[number]) => number | null) => {
    const s = S.map((x) => [f(x), x.r.actual] as const).filter((p): p is readonly [number, number] => fin(p[0]));
    return { ...icStats(s.map((p) => p[0]), s.map((p) => p[1]), 1000) };
  };
  const momentum = withVal((x) => x.r.past1y);
  const earningsYield = withVal((x) => (fin(x.r.input.pe) ? 1 / x.r.input.pe : null));
  const growthOnly = withVal((x) => { const p = shipped.projectStock(x.r.input); return p.ok ? p.growth[1] : null; });
  const sizeRank = withVal((x) => Math.log(x.r.mcapThen));
  const momPred = S.map((x) => (fin(x.r.past1y) ? x.r.past1y / 100 : 0));
  const constPred = med(S.map((x) => x.base))!;
  const momErr = S.map((x, i) => x.r.actual - momPred[i]);
  const constErr = S.map((x) => x.r.actual - constPred);
  // A band of the same width as each stock's Bear-Bull, centred on the period's actual median: a
  // check on whether misses come from the centre or the width.
  const perfectCentre = med(act)!;
  const insideIfCentred = S.filter((x) => Math.abs(x.r.actual - perfectCentre) <= (x.bull - x.bear) / 2).length / S.length;

  // Sensitivity.
  const variants: [string, Params][] = [
    ["Shipped (fade 0.4, revert 3y, target 0.7-1.4x)", {}],
    ["GROWTH_FADE 0.2", { GROWTH_FADE: 0.2 }],
    ["GROWTH_FADE 0.6", { GROWTH_FADE: 0.6 }],
    ["REVERT_YEARS 2", { REVERT_YEARS: 2 }],
    ["REVERT_YEARS 5", { REVERT_YEARS: 5 }],
    ["Target 0.8-1.25x", { TARGET_MIN: 0.8, TARGET_MAX: 1.25 }],
    ["Target 0.6-1.6x", { TARGET_MIN: 0.6, TARGET_MAX: 1.6 }],
  ];
  const sens = [];
  for (const [i, [name, p]] of variants.entries()) {
    const m = i === 0 ? shipped : await variant(`v${i}`, p);
    const o = evaluate(m, "own"), d = evaluate(m, "ind");
    sens.push({ name, own: { ic: o.ic.ic, inside: o.inside, baseMed: o.baseMed, width: o.widthMed, spread: o.quint.spread }, ind: { ic: d.ic.ic, inside: d.inside, baseMed: d.baseMed, width: d.widthMed, spread: d.quint.spread } });
  }

  // ---- Print ----
  const pct = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;
  const sh = (v: number) => `${(v * 100).toFixed(0)}%`;
  const f2 = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2);
  const leftAll = [...left, ...mainOwn.out];
  const reasons = new Map<string, string[]>();
  for (const l of leftAll) reasons.set(l.reason.replace(/^\d+ years? of results/, "Under 3 years of results"), [...(reasons.get(l.reason.replace(/^\d+ years? of results/, "Under 3 years of results")) ?? []), l.ticker]);
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  p(`As of ${AS_OF_LABEL}; actual = last close (${lastDay}) / close on ${AS_OF_LABEL} - 1 (split-adjusted price, no dividends).`);
  p(`Universe ${universe.length}; tested ${S.length}; left out ${leftAll.length}. Nifty 50 over the period: ${pct(niftyRet)}.`);
  for (const [r, ts] of reasons) p(`  left out (${ts.length}) ${r}: ${ts.join(", ")}`);
  p();
  for (const [label, e] of [["Own P/E exit", mainOwn], ["Industry P/E exit", mainInd]] as const) {
    p(`== ${label} (1 year) ==`);
    p(`IC (Spearman Base vs actual): ${f2(e.ic.ic)}  95% bootstrap ${f2(e.ic.lo)} .. ${f2(e.ic.hi)}  permutation p=${e.ic.p.toFixed(3)}  t=${e.ic.t.toFixed(2)}  n=${e.ic.n}`);
    p(`Projected medians: Bear ${pct(e.bearMed)}  Base ${pct(e.baseMed)}  Bull ${pct(e.bullMed)}; median Bear-Bull width ${pct(e.widthMed)}`);
    p(`Actual: median ${pct(e.actMed)}  mean ${pct(e.actMean)}  10th ${pct(e.actP10)}  90th ${pct(e.actP90)}`);
    p(`Inside [Bear, Bull] ${sh(e.inside)}  above Bull ${sh(e.above)}  below Bear ${sh(e.below)};  inside after taking out the common move ${sh(e.insideDemeaned)}`);
    p(`Error (actual - Base): median ${pct(e.errMed)}  mean ${pct(e.errMean)}  mean absolute ${pct(e.mae)}`);
    p(`Band would need x${e.z80.toFixed(1)} its half-width to hold 8 in 10 (x${e.z80Demeaned.toFixed(1)} after taking out the common move)`);
    p(`Quintiles by Base (bottom..top), mean actual: ${e.quint.buckets.map((b) => `${pct(b.meanAct, 0)} (Base ${pct(b.meanPred, 0)}, n${b.n})`).join("  ")}`);
    p(`Top minus bottom fifth: mean ${pct(e.quint.spread)}  median ${pct(e.quint.spreadMed)}`);
    p(`By method: ${e.byMethod.map((m) => `${m.m} n=${m.n} IC=${m.ic == null ? "-" : f2(m.ic)}`).join("  ")}`);
    p();
  }
  p(`Within-industry IC (ranks inside each home industry with 5+ stocks, pooled): ${f2(withinIC)}`);
  p(`By home industry (n>=10), own P/E exit:`);
  for (const i of industries) p(`  ${i.name.padEnd(36)} n=${String(i.n).padStart(3)}  IC ${f2(i.ic)}  inside ${sh(i.inside)}  actual med ${pct(i.actMed, 0)}  Base med ${pct(i.baseMed, 0)}`);
  p();
  p(`Benchmarks on the same stocks (IC with actual):`);
  p(`  Past-year price return (momentum)  n=${momentum.n} IC ${f2(momentum.ic)} [${f2(momentum.lo)}, ${f2(momentum.hi)}] p=${momentum.p.toFixed(3)}`);
  p(`  Earnings yield 1/(P/E)            n=${earningsYield.n} IC ${f2(earningsYield.ic)} [${f2(earningsYield.lo)}, ${f2(earningsYield.hi)}] p=${earningsYield.p.toFixed(3)}`);
  p(`  Model's Base revenue growth only   n=${growthOnly.n} IC ${f2(growthOnly.ic)} [${f2(growthOnly.lo)}, ${f2(growthOnly.hi)}] p=${growthOnly.p.toFixed(3)}`);
  p(`  Size (log market cap)              n=${sizeRank.n} IC ${f2(sizeRank.ic)} [${f2(sizeRank.lo)}, ${f2(sizeRank.hi)}] p=${sizeRank.p.toFixed(3)}`);
  p(`  Error, every stock at its past-year return: median ${pct(med(momErr)!)} mean abs ${pct(mean(momErr.map(Math.abs))!)}`);
  p(`  Error, every stock at the median Base (${pct(constPred)}): median ${pct(med(constErr)!)} mean abs ${pct(mean(constErr.map(Math.abs))!)}`);
  p(`  Inside a band of each stock's Bear-Bull width centred on the period's actual median: ${sh(insideIfCentred)}`);
  p();
  p(`Sensitivity (1 year): IC / inside [Bear,Bull] / median Base / median width / top-bottom fifth`);
  for (const s of sens) p(`  ${s.name.padEnd(48)} own ${f2(s.own.ic)} ${sh(s.own.inside)} ${pct(s.own.baseMed, 0)} ${pct(s.own.width, 0)} ${pct(s.own.spread, 0)}   ind ${f2(s.ind.ic)} ${sh(s.ind.inside)} ${pct(s.ind.baseMed, 0)} ${pct(s.ind.width, 0)} ${pct(s.ind.spread, 0)}`);
  console.log(L.join("\n"));

  if (jsonOut)
    writeFileSync(
      jsonOut,
      JSON.stringify(
        mainOwn.ok.map((x) => ({ ticker: x.r.ticker, home: x.r.home, method: x.method, bear: x.bear, base: x.base, bull: x.bull, actual: x.r.actual, past1y: x.r.past1y, pe: x.r.input.pe })),
        null,
        1,
      ),
    );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
