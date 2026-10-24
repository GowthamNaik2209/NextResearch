// Prototype of a research-aligned "v2" projection, tested out of sample next to the shipped model
// (docs/PROJECTIONS-V2-PROTOTYPE.md). Lives only here: src/lib/baskets/projection.ts and everything
// the site serves are untouched. Three 1-year periods (start 24 Oct 2024, 24 Apr 2025, 24 Oct 2025),
// each with the inputs rebuilt as of its start date, the same way as scripts/validate-projections.ts.
//   v2 Base  = rf + beta x ERP + IC x sigma x z            (CAPM anchor + Grinold-Kahn tilt)
//   v2 range = (1 + Base) x exp(-/+ 1.28 sigma sqrt(h)) - 1 (EWMA volatility, 20% floor)
// Read-only: company figures from DATABASE_URL (.env), prices from Yahoo (5Y daily, via a copy of
// src/lib/live/yahoo.ts with the 5Y range switched to daily bars). Not shipped.
//   npx tsx scripts/validate-projections-v2.ts [--json out.json] [--prices cache.json]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installFinancialsFromDatabase } from "../src/lib/financials/test-db";
import { companyFinancials, listSectors, parseCrore, tickerForSupplier } from "../src/lib/sector-content";
import { companySlug, getCompanyPage, primaryAppearance } from "../src/lib/sector-content/companies";
import { listBasketUniverse } from "../src/lib/baskets/industry";
import { detectOutlier } from "../src/lib/baskets/outliers";
import * as shipped from "./lib/projection-v1";
import type { ProjectionInput } from "./lib/projection-v1";
import type { PricePoint } from "../src/lib/live/yahoo";
// The model as built for the site (v2), checked here on the same as-of inputs.
import * as built from "../src/lib/baskets/projection";
import { riskOf } from "../src/lib/baskets/projection-risk";

// ---- Periods and market inputs (sources in the doc) ----
type Period = { key: string; start: string; label: string; end: string | null; fyIdx: number };
// fyIdx: the latest fiscal year reported on the start date, as an index in FY22..FY26.
const PERIODS: Period[] = [
  { key: "P1", start: "2024-10-24", label: "24 Oct 2024", end: "2025-10-24", fyIdx: 2 },
  { key: "P2", start: "2025-04-24", label: "24 Apr 2025", end: "2026-04-24", fyIdx: 2 },
  { key: "P3", start: "2025-10-24", label: "24 Oct 2025", end: null, fyIdx: 3 }, // null: last close
];
/** India 10Y G-sec yield on the start date (benchmark close). */
const RF: Record<string, number> = { P1: 0.0685, P2: 0.0637, P3: 0.0653 };
/** Damodaran's total equity risk premium for India (mature market + country premium), July 2025 update. */
const ERP = 0.0746;
const BLUME = (b: number) => 0.67 * b + 0.33;
const EWMA_LAMBDA = 0.94;
const VOL_FLOOR = 0.2;
const Z80 = 1.2816; // two-sided 80%
const ICS = [0, 0.05];
/** Volatility estimates compared: the spec's EWMA 0.94, a slower EWMA 0.97, 1-year equal-weighted. */
type VolRow = { vol: number; vol97: number; vol1y: number };
const VOLS: [string, (r: VolRow) => number][] = [["EWMA 0.94", (r) => r.vol], ["EWMA 0.97", (r) => r.vol97], ["1Y realised", (r) => r.vol1y]];
const V2_FADE = 0.55;
const V2_MARGIN_YEARS = 3; // margin closes on its target over this many years (as shipped)
const MARGIN_SHIFT_A_YEAR = 0.15;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

// ---- Model copies with constants swapped (shipped files untouched) ----
// Inside node_modules so the copies resolve the same packages (yahoo-finance2) as the originals.
const TMP = fileURLToPath(new URL("../node_modules/.cache/validate-proj-v2/", import.meta.url));
mkdirSync(TMP, { recursive: true });
function copyWith(rel: string, edits: [RegExp, string][], name: string) {
  const path = fileURLToPath(new URL(rel, import.meta.url));
  let src = readFileSync(path, "utf8");
  for (const [re, to] of edits) {
    if (!re.test(src)) throw new Error(`${rel}: no match for ${re}`);
    src = src.replace(re, to);
  }
  // Relative imports point back at the real directory.
  const dir = pathToFileURL(join(path, "..")).href;
  src = src.replace(/from "\.\/([^"]+)"/g, (_, m) => `from "${dir}/${m}.ts"`);
  const file = join(TMP, name);
  writeFileSync(file, src);
  return import(pathToFileURL(file).href);
}

// ---- Prices ----
const priceOn = (pts: PricePoint[], day: string, maxLagDays = 7): number | null => {
  let hit: PricePoint | null = null;
  for (const p of pts) if (p.t <= day) hit = p;
  if (hit) return (Date.parse(day) - Date.parse(hit.t)) / DAY <= maxLagDays ? hit.c : null;
  const first = pts[0];
  return first && (Date.parse(first.t) - Date.parse(day)) / DAY <= maxLagDays ? first.c : null;
};
const isoOf = (label: string | undefined): string | null => {
  const m = label ? /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(label.trim()) : null;
  const mo = m ? MONTHS.indexOf(m[2]) : -1;
  return m && mo >= 0 ? `${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * DAY).toISOString().slice(0, 10);
const worstDay = (pts: PricePoint[], from: string, to: string) => {
  let w = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].t > from && pts[i].t <= to) w = Math.min(w, pts[i].c / pts[i - 1].c - 1);
  return w;
};
/** Last close of each week (Mon-Sun), dated by that close. */
function weekly(pts: PricePoint[]): PricePoint[] {
  const out: PricePoint[] = [];
  const wk = (t: string) => Math.floor((Date.parse(t) / DAY + 3) / 7); // epoch day 0 is a Thursday
  for (const p of pts) {
    if (out.length && wk(out[out.length - 1].t) === wk(p.t)) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}
/** Blume-adjusted beta from 2Y of weekly returns to the day, vs the Nifty 50. */
function betaOf(pts: PricePoint[], nifty: Map<string, number>, day: string) {
  const from = addDays(day, -731);
  const w = weekly(pts.filter((p) => p.t > from && p.t <= day));
  const nw = weekly([...nifty].map(([t, c]) => ({ t, c })).filter((p) => p.t > from && p.t <= day));
  const nAt = new Map(nw.map((p) => [Math.floor((Date.parse(p.t) / DAY + 3) / 7), p.c]));
  const xs: number[] = [], ys: number[] = [];
  for (let i = 1; i < w.length; i++) {
    const k0 = Math.floor((Date.parse(w[i - 1].t) / DAY + 3) / 7), k1 = Math.floor((Date.parse(w[i].t) / DAY + 3) / 7);
    const m0 = nAt.get(k0), m1 = nAt.get(k1);
    if (k1 !== k0 + 1 || m0 == null || m1 == null) continue;
    ys.push(w[i].c / w[i - 1].c - 1);
    xs.push(m1 / m0 - 1);
  }
  if (xs.length < 52) return { raw: null, adj: 1, n: xs.length };
  const mx = mean(xs)!, my = mean(ys)!;
  let cov = 0, vx = 0;
  for (let i = 0; i < xs.length; i++) { cov += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; }
  const raw = cov / vx;
  return { raw, adj: BLUME(raw), n: xs.length };
}
/** EWMA (RiskMetrics, lambda 0.94) volatility of daily log returns over the year to the day, annualised, floored. */
function ewmaVol(pts: PricePoint[], day: string) {
  const from = addDays(day, -400);
  const s = pts.filter((p) => p.t > from && p.t <= day);
  const r: number[] = [];
  for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].c / s[i - 1].c));
  if (r.length < 40) return { raw: null, vol: null as number | null, vol1y: null as number | null, vol97: null as number | null };
  // Seed with the first 20 returns' variance, then run the recursion.
  const ewma = (lambda: number) => {
    let v = mean(r.slice(0, 20).map((x) => x * x))!;
    for (let i = 20; i < r.length; i++) v = lambda * v + (1 - lambda) * r[i] * r[i];
    return Math.sqrt(v * 250);
  };
  const raw = ewma(EWMA_LAMBDA);
  // Diagnostic: a slower EWMA (lambda 0.97, half-life ~23 trading days).
  const slow = ewma(0.97);
  // Diagnostic: equal-weighted volatility over the same year (longer memory than the EWMA).
  const year = Math.sqrt(mean(r.map((x) => x * x))! * 250);
  return { raw, vol: Math.max(VOL_FLOOR, raw), vol1y: Math.max(VOL_FLOOR, year), vol97: Math.max(VOL_FLOOR, slow) };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// ---- Statistics ----
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const med = (xs: number[]) => shipped.median(xs);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs: number[]) => { const m = mean(xs)!; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
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
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}
const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }
/** IC with a bootstrap 95% interval and a two-sided permutation p-value. */
function icStats(pred: number[], act: number[], iters = 1000) {
  const ic = spearman(pred, act);
  const n = pred.length;
  if (new Set(pred).size < 2) return { ic: NaN, lo: NaN, hi: NaN, p: NaN, n };
  const r = rng(7);
  const boots: number[] = [];
  let extreme = 0;
  for (let k = 0; k < iters; k++) {
    const ix = Array.from({ length: n }, () => Math.floor(r() * n));
    boots.push(spearman(ix.map((i) => pred[i]), ix.map((i) => act[i])));
    const sh = [...act];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    if (Math.abs(spearman(pred, sh)) >= Math.abs(ic)) extreme++;
  }
  return { ic, lo: quantile(boots.filter(fin), 0.025), hi: quantile(boots.filter(fin), 0.975), p: (extreme + 1) / (iters + 1), n };
}
function quintSpread(pred: number[], act: number[]) {
  const o = pred.map((p, i) => [p, act[i]] as const).sort((a, b) => a[0] - b[0]);
  const n = o.length;
  const q = (k: number) => o.slice(Math.floor((k * n) / 5), Math.floor(((k + 1) * n) / 5)).map((x) => x[1]);
  return { mean: mean(q(4))! - mean(q(0))!, median: med(q(4))! - med(q(0))! };
}
/** erfc, Numerical Recipes (|error| < 1.2e-7). */
function erfc(x: number) {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
/** Kupiec proportion-of-failures test: misses x of n against an expected miss rate p0. */
function kupiec(x: number, n: number, p0 = 0.2) {
  const ph = x / n;
  const ll = (p: number) => (x ? x * Math.log(p) : 0) + (n - x ? (n - x) * Math.log(1 - p) : 0);
  const lr = -2 * (ll(p0) - ll(ph));
  return { lr, p: erfc(Math.sqrt(Math.max(0, lr) / 2)) }; // chi-square, 1 df
}

// ---- v2 fundamentals scenario (the z signal) ----
type GrowthMod = { growthCases: (revs: number[]) => [number, number, number] };
/**
 * One-year return on fundamentals with today's P/E held: revenue grows at the fade-0.55 Base rate,
 * the margin moves a third of the way from today's toward the average of its own median and its
 * industry's median, at most 15% of today's a year. P/E-method stocks only (null otherwise).
 */
function fundamentalsV2(x: ProjectionInput, indMargin: number | null, g: GrowthMod): { ret: number; growth: number } | null {
  const run = shipped.latestRun(x.rev, x.np);
  if (!run || run[1] - run[0] + 1 < shipped.MIN_YEARS) return null;
  const [a, b] = run;
  const revs = x.rev.slice(a, b + 1) as number[];
  const nps = x.np.slice(a, b + 1) as number[];
  const revLast = revs[revs.length - 1];
  if (!(revLast > 0) || !fin(x.pe) || x.pe <= 0 || nps[nps.length - 1] <= 0) return null;
  let idx = revs.map((_, i) => a + i).filter((i) => (x.rev[i] as number) > 0);
  if (x.oneOffIndex != null && idx.includes(x.oneOffIndex) && idx.length - 1 >= 2) idx = idx.filter((i) => i !== x.oneOffIndex);
  const ownMed = shipped.marginCases(idx.map((i) => (x.np[i] as number) / (x.rev[i] as number)))[1];
  if (!(ownMed > 0)) return null;
  const growth = g.growthCases(revs)[1];
  const mNow = nps[nps.length - 1] / revLast;
  const aim = fin(indMargin) && indMargin > 0 ? (ownMed + indMargin) / 2 : ownMed;
  const m1 = mNow + (aim - mNow) / V2_MARGIN_YEARS;
  const most = 1 + MARGIN_SHIFT_A_YEAR;
  return { ret: (1 + growth) * clamp(m1 / mNow, 1 / most, most) - 1, growth };
}

// ---- Main ----
type Row = {
  ticker: string; home: string | null; input: ProjectionInput; actual: number; past1y: number | null;
  beta: number; betaRaw: number | null; vol: number; volRaw: number | null; vol1y: number; vol97: number; fund: number | null;
  /** The built model's input as of the start (its price statistics to the start date). */
  input2: built.ProjectionInput;
};

async function main() {
  const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
  const jsonOut = arg("--json");
  const cacheFile = arg("--prices") ?? join(tmpdir(), "validate-proj-v2-prices.json");
  await installFinancialsFromDatabase();
  const universe = listBasketUniverse();
  const g55: GrowthMod = await copyWith("./lib/projection-v1.ts", [[/const GROWTH_FADE = [\d.]+;/, `const GROWTH_FADE = ${V2_FADE};`]], "projection-fade55.ts");

  const tickers = new Set(universe.map((s) => s.ticker));
  for (const s of listSectors()) for (const sup of Object.values(s.suppliers)) if (sup.listed && sup.f) tickers.add(tickerForSupplier(sup));
  const list = [...tickers];

  // 5Y of daily closes (cached to a file so reruns use the same prices).
  let charts: Record<string, PricePoint[] | null> = {};
  if (existsSync(cacheFile)) charts = JSON.parse(readFileSync(cacheFile, "utf8"));
  const missing = [...list, "^NSEI"].filter((t) => !(t in charts));
  if (missing.length) {
    console.error(`fetching 5Y daily prices for ${missing.length} tickers...`);
    const y = await copyWith("../src/lib/live/yahoo.ts", [[/"5Y": \{ days: 1830, interval: "1wk" \}/, `"5Y": { days: 1830, interval: "1d" }`]], "yahoo-5y-daily.ts");
    await pool(missing, 6, async (t) => {
      if (t === "^NSEI") { charts[t] = (await y.getSymbolChart(t, "5Y"))?.points ?? null; return; }
      let c = await y.getChartWithFallback(t, "5Y").catch(() => null);
      if (!c) c = await y.getChartWithFallback(t, "5Y").catch(() => null);
      charts[t] = c?.points ?? null;
    });
    writeFileSync(cacheFile, JSON.stringify(charts));
  }
  const niftyPts = charts["^NSEI"] ?? [];
  const nifty = new Map(niftyPts.map((p) => [p.t, p.c]));
  const lastDay = niftyPts[niftyPts.length - 1]?.t ?? "?";

  const results: Record<string, unknown>[] = [];
  const allRows: Record<string, Row[]> = {};
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  const pct = (v: number, d = 1) => (fin(v) ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%` : "-");
  const sh = (v: number) => `${(v * 100).toFixed(0)}%`;
  const f2 = (v: number) => (fin(v) ? (v >= 0 ? "+" : "") + v.toFixed(2) : "-");
  p(`Prices to ${lastDay}. rf ${Object.entries(RF).map(([k, v]) => `${k} ${pct(v, 2)}`).join(", ")}; ERP ${pct(ERP, 2)}; Blume 0.67b+0.33; EWMA lambda ${EWMA_LAMBDA}, floor ${sh(VOL_FLOOR)}.`);

  for (const per of PERIODS) {
    const endDay = per.end ?? lastDay;
    const yearBefore = addDays(per.start, -365);
    // As-of price and market cap for every ticker.
    type Then = { price: number; mcap: number; end: number; past1y: number | null };
    const then = new Map<string, Then | { err: string }>();
    for (const t of list) {
      const pts = charts[t];
      const f = companyFinancials(t);
      if (!pts || pts.length < 2) { then.set(t, { err: "No price history" }); continue; }
      const p0 = priceOn(pts, per.start);
      const p1 = priceOn(pts, endDay);
      if (p0 == null || pts[0].t > addDays(per.start, 7)) { then.set(t, { err: "Listed after the start" }); continue; }
      if (p1 == null) { then.set(t, { err: "No price at the end" }); continue; }
      const mcapNow = parseCrore(f?.mcap);
      const tableDay = isoOf(f?.asOf);
      const pTable = tableDay ? priceOn(pts, tableDay) : null;
      if (mcapNow == null || mcapNow <= 0 || pTable == null) { then.set(t, { err: "No market cap" }); continue; }
      if (worstDay(pts, addDays(per.start, -400), endDay) < -0.4) { then.set(t, { err: "One-day fall over 40% (split/demerger?)" }); continue; }
      const pYear = priceOn(pts, yearBefore, 10);
      then.set(t, { price: p0, mcap: mcapNow * (p0 / pTable), end: p1, past1y: pYear != null ? (p0 / pYear - 1) * 100 : null });
    }
    // Industry medians as of the start: P/E, P/S, net margin, on the latest reported year.
    const ind = new Map<string, { pe: number | null; ps: number | null; margin: number | null }>();
    for (const s of listSectors()) {
      const pes: number[] = [], pss: number[] = [], ms: number[] = [];
      const seen = new Set<string>();
      for (const sup of Object.values(s.suppliers)) {
        if (!sup.listed || !sup.f) continue;
        const t = tickerForSupplier(sup);
        if (seen.has(t)) continue;
        seen.add(t);
        const th = then.get(t), f = companyFinancials(t);
        if (!f) continue;
        const np = f.np?.[per.fyIdx], rev = f.rev?.[per.fyIdx];
        if (fin(np) && fin(rev) && rev > 0) ms.push(np / rev);
        if (!th || "err" in th) continue;
        if (fin(np) && np > 0) pes.push(th.mcap / np);
        if (fin(rev) && rev > 0) pss.push(th.mcap / rev);
      }
      ind.set(s.slug, { pe: med(pes), ps: med(pss), margin: med(ms) });
    }

    const rows: Row[] = [];
    const left = new Map<string, string[]>();
    const leave = (t: string, why: string) => left.set(why, [...(left.get(why) ?? []), t]);
    for (const st of universe) {
      const t = st.ticker;
      const f = companyFinancials(t);
      const th = then.get(t);
      if (!f) { leave(t, "No figures"); continue; }
      if (!th || "err" in th) { leave(t, th ? th.err : "No price history"); continue; }
      const rev = [...(f.rev ?? [])].slice(0, 5), np = [...(f.np ?? [])].slice(0, 5);
      while (rev.length < 5) rev.push(null);
      while (np.length < 5) np.push(null);
      for (let i = per.fyIdx + 1; i < 5; i++) { rev[i] = null; np[i] = null; }
      const npL = np[per.fyIdx];
      const out = detectOutlier({ rev, np, note: f.note });
      const m = out ? /^FY(\d\d)$/.exec(out.year) : null;
      const page = getCompanyPage(companySlug(t));
      const home = page ? primaryAppearance(page).sectorSlug : null;
      const im = (home && ind.get(home)) || { pe: null, ps: null, margin: null };
      const input: ProjectionInput = {
        rev, np, price: th.price, mcapCr: th.mcap,
        pe: fin(npL) && npL > 0 ? th.mcap / npL : null,
        cagr: [th.past1y, null, null], asOf: per.label,
        oneOffIndex: m ? Number(m[1]) - 22 : null,
        industry: { pe: im.pe, ps: im.ps },
      };
      if (!shipped.projectStock(input).ok) { leave(t, "Shipped model can't project (under 3 years of results)"); continue; }
      const pts = charts[t]!;
      const b = betaOf(pts, nifty, per.start);
      const v = ewmaVol(pts, per.start);
      if (v.vol == null) { leave(t, "Under 40 daily returns before the start"); continue; }
      const fv = fundamentalsV2(input, im.margin, g55);
      // Built model: the same figures, price statistics measured to the start date, today's dividend
      // yield (the as-of one isn't in the table), and the 3-year price change as of the start where the
      // 5Y history has it (else 0: the 3-years-of-trading rule is not what is tested here).
      const p3 = priceOn(pts, addDays(per.start, -3 * 365), 10);
      const input2: built.ProjectionInput = {
        rev, np, price: th.price, mcapCr: th.mcap, pe: input.pe,
        cagr: [th.past1y, p3 != null ? (Math.pow(th.price / p3, 1 / 3) - 1) * 100 : 0, null],
        divYield: fin(f.kpi?.[2]) ? f.kpi![2] : null,
        asOf: per.label, oneOffIndex: input.oneOffIndex,
        industry: { margin: im.margin },
        risk: riskOf(pts.filter((q) => q.t <= per.start), niftyPts.filter((q) => q.t <= per.start)),
      };
      rows.push({ ticker: t, home, input, actual: th.end / th.price - 1, past1y: th.past1y, beta: b.adj, betaRaw: b.raw, vol: v.vol, volRaw: v.raw, vol1y: v.vol1y!, vol97: v.vol97!, fund: fv?.ret ?? null, input2 });
    }
    allRows[per.key] = rows;

    // z: the fundamentals return standardised across the period's P/E-method stocks, winsorised at +/-3.
    const fs = rows.map((r) => r.fund).filter(fin);
    const fMed = med(fs)!, fSd = sd(fs);
    const z = (r: Row) => (fin(r.fund) ? clamp((r.fund - fMed) / fSd, -3, 3) : 0);
    const rf = RF[per.key];
    type Pred = { bear: number; base: number; bull: number };
    // Built model: its own beta, volatility, score scale (over this period's stocks), tilt and cases,
    // with the period's rf and ERP in place of today's.
    const scale2 = built.scoreScale(rows.map((r) => built.fundamentalScore(r.input2)).filter(fin));
    const builtPred = (r: Row): Pred => {
      const e = built.explainStock(r.input2, scale2);
      if (!e.ok) throw new Error(`built model left out ${r.ticker}: ${e.reason}`);
      const market = rf + e.ctx.beta * ERP - e.ctx.divYield;
      const [bear, base, bull] = built.casesFor({ ...e.ctx, market }, 1);
      return { bear, base, bull };
    };
    const models: [string, (r: Row) => Pred][] = [
      ["Shipped (own P/E exit)", (r) => { const q = shipped.projectStock(r.input); if (!q.ok) throw new Error(); const [bear, base, bull] = q.ret.own["1"]; return { bear, base, bull }; }],
      ["Shipped (industry P/E exit)", (r) => { const q = shipped.projectStock(r.input); if (!q.ok) throw new Error(); const [bear, base, bull] = q.ret.ind["1"]; return { bear, base, bull }; }],
      ...ICS.map((ic): [string, (r: Row) => Pred] => [`v2, IC ${ic.toFixed(2)}`, (r) => {
        const base = rf + r.beta * ERP + ic * r.vol * z(r);
        return { base, bear: (1 + base) * Math.exp(-Z80 * r.vol) - 1, bull: (1 + base) * Math.exp(Z80 * r.vol) - 1 };
      }]),
      // Diagnostics, IC 0.05: other volatility estimates (used in both the tilt and the band), each
      // with the band centred on the mean (spec) and on the lognormal median, (1 + Base) e^(-sigma^2/2).
      ...VOLS.flatMap(([vname, vf]) => [false, true].map((onMedian): [string, (r: Row) => Pred] => [`v2, IC 0.05, ${vname}${onMedian ? ", on median" : ""}`, (r) => {
        const sg = vf(r);
        const base = rf + r.beta * ERP + 0.05 * sg * z(r);
        const c = (1 + base) * (onMedian ? Math.exp(-(sg ** 2) / 2) : 1);
        return { base, bear: c * Math.exp(-Z80 * sg) - 1, bull: c * Math.exp(Z80 * sg) - 1 };
      }]).filter(([n]) => n !== "v2, IC 0.05, EWMA 0.94")),
      ["Built v2 (projection.ts)", builtPred],
    ];
    const act = rows.map((r) => r.actual);
    const niftyRet = (nifty.get(endDay) ?? priceOn(niftyPts, endDay)!) / priceOn(niftyPts, per.start)! - 1;
    p();
    p(`=== ${per.key}: ${per.label} -> ${endDay}  (fundamentals to FY${22 + per.fyIdx}) ===`);
    p(`Tested ${rows.length} of ${universe.length}; Nifty 50 ${pct(niftyRet)}; stocks median ${pct(med(act)!)} mean ${pct(mean(act)!)} p10 ${pct(quantile(act, 0.1))} p90 ${pct(quantile(act, 0.9))}`);
    for (const [why, ts] of left) p(`  left out (${ts.length}) ${why}${ts.length <= 20 ? ": " + ts.join(", ") : ""}`);
    const betas = rows.map((r) => r.beta), vols = rows.map((r) => r.vol);
    p(`beta (Blume) median ${med(betas)!.toFixed(2)} [p10 ${quantile(betas, 0.1).toFixed(2)}, p90 ${quantile(betas, 0.9).toFixed(2)}], ${rows.filter((r) => r.betaRaw == null).length} without 52 weeks (beta 1); vol median ${sh(med(vols)!)} [p10 ${sh(quantile(vols, 0.1))}, p90 ${sh(quantile(vols, 0.9))}], ${rows.filter((r) => (r.volRaw ?? 0) < VOL_FLOOR).length} at the floor`);
    p(`P/E-method stocks with a fundamentals score: ${fs.length}; loss-makers etc. on the market anchor only: ${rows.length - fs.length}`);
    p(`${"Model".padEnd(30)} ${"IC".padStart(6)} ${"95% CI".padStart(14)} ${"p".padStart(6)}  inside below above  Kupiec LR (p)   med err  mean err  abs err  top-bot(mean/med)  med Base  med width`);
    for (const [name, fn] of models) {
      const pr = rows.map(fn);
      const base = pr.map((x) => x.base);
      const ic = icStats(base, act);
      const inside = rows.filter((r, i) => r.actual >= pr[i].bear && r.actual <= pr[i].bull).length;
      const below = rows.filter((r, i) => r.actual < pr[i].bear).length;
      const k = kupiec(rows.length - inside, rows.length);
      const err = rows.map((r, i) => r.actual - pr[i].base);
      const qs = quintSpread(base, act);
      const res = {
        period: per.key, model: name, n: rows.length, ic: ic.ic, icLo: ic.lo, icHi: ic.hi, icP: ic.p,
        inside: inside / rows.length, below: below / rows.length, above: (rows.length - inside - below) / rows.length,
        kupiecLR: k.lr, kupiecP: k.p, errMed: med(err)!, errMean: mean(err)!, mae: mean(err.map(Math.abs))!,
        spread: qs.mean, spreadMed: qs.median, baseMed: med(base)!, widthMed: med(pr.map((x) => x.bull - x.bear))!,
      };
      results.push(res);
      p(`${name.padEnd(30)} ${f2(res.ic).padStart(6)} ${`${f2(res.icLo)}..${f2(res.icHi)}`.padStart(14)} ${fin(res.icP) ? res.icP.toFixed(3) : "  -  "}  ${sh(res.inside).padStart(5)} ${sh(res.below).padStart(5)} ${sh(res.above).padStart(5)}  ${res.kupiecLR.toFixed(1).padStart(6)} (${res.kupiecP < 0.001 ? "<.001" : res.kupiecP.toFixed(3)})  ${pct(res.errMed, 0).padStart(6)}  ${pct(res.errMean, 0).padStart(6)}  ${pct(res.mae, 0).padStart(6)}  ${pct(res.spread, 0).padStart(6)} / ${pct(res.spreadMed, 0).padStart(5)}  ${pct(res.baseMed, 0).padStart(6)}  ${pct(res.widthMed, 0).padStart(6)}`);
    }
    // Signals on their own (ranking only).
    const sig = (name: string, f: (r: Row) => number | null) => {
      const s = rows.map((r) => [f(r), r.actual] as const).filter((x): x is readonly [number, number] => fin(x[0]));
      const st = icStats(s.map((x) => x[0]), s.map((x) => x[1]));
      results.push({ period: per.key, model: `signal: ${name}`, n: st.n, ic: st.ic, icLo: st.lo, icHi: st.hi, icP: st.p });
      p(`  signal ${name.padEnd(44)} n=${String(st.n).padStart(3)} IC ${f2(st.ic)} [${f2(st.lo)}, ${f2(st.hi)}] p=${st.p.toFixed(3)}`);
    };
    sig("fundamentals score z (P/E held, fade 0.55)", (r) => r.fund);
    sig("shipped Base, P/E-method stocks only", (r) => (fin(r.fund) ? (shipped.projectStock(r.input) as { ret: { own: { "1": number[] } } }).ret.own["1"][1] : null));
    sig("beta (Blume)", (r) => r.beta);
    sig("EWMA volatility", (r) => r.vol);
    sig("past-year price return (momentum)", (r) => r.past1y);
    // The same signals against the market-adjusted return (actual - raw beta x Nifty), which takes
    // out the part a beta explains in an up or down year.
    const resid = new Map(rows.map((r) => [r, r.actual - (r.betaRaw ?? 1) * niftyRet]));
    const sigR = (name: string, f: (r: Row) => number | null) => {
      const s = rows.map((r) => [f(r), resid.get(r)!] as const).filter((x): x is readonly [number, number] => fin(x[0]));
      const st = icStats(s.map((x) => x[0]), s.map((x) => x[1]));
      results.push({ period: per.key, model: `signal (market-adjusted): ${name}`, n: st.n, ic: st.ic, icLo: st.lo, icHi: st.hi, icP: st.p });
      p(`  signal ${("mkt-adj: " + name).padEnd(44)} n=${String(st.n).padStart(3)} IC ${f2(st.ic)} [${f2(st.lo)}, ${f2(st.hi)}] p=${st.p.toFixed(3)}`);
    };
    sigR("fundamentals score z", (r) => r.fund);
    sigR("shipped Base, P/E-method stocks", (r) => (fin(r.fund) ? (shipped.projectStock(r.input) as { ret: { own: { "1": number[] } } }).ret.own["1"][1] : null));
    sigR("shipped Base, all stocks", (r) => (shipped.projectStock(r.input) as { ret: { own: { "1": number[] } } }).ret.own["1"][1]);
    sigR("v2 Base IC 0.05, all stocks", (r) => rf + r.beta * ERP + 0.05 * r.vol * z(r));
    // Band calibration by volatility third and standardised errors, for each volatility estimate.
    for (const [vname, vf] of VOLS) {
    const v2 = models.find(([n]) => n === (vname === "EWMA 0.94" ? "v2, IC 0.05" : `v2, IC 0.05, ${vname}`))![1];
    const byVol = [...rows].sort((a, b) => vf(a) - vf(b));
    const terc = [0, 1, 2].map((k) => byVol.slice(Math.floor((k * byVol.length) / 3), Math.floor(((k + 1) * byVol.length) / 3)));
    p(`  ${vname.padEnd(12)} vol median ${sh(med(rows.map(vf))!)}, ${rows.filter((r) => vf(r) <= VOL_FLOOR).length} at floor; inside by vol third (low..high): ${terc.map((s) => `${sh(s.filter((r) => { const x = v2(r); return r.actual >= x.bear && r.actual <= x.bull; }).length / s.length)} (vol ${sh(med(s.map(vf))!)})`).join("  ")}`);
    // Realised cross-sectional dispersion vs the band's implied one: log(1+actual) - log(1+Base) / sigma.
    const zr = rows.map((r) => (Math.log(1 + r.actual) - Math.log(1 + v2(r).base)) / vf(r));
    p(`  ${"".padEnd(12)} standardised errors (log): median ${f2(med(zr)!)}  sd ${sd(zr).toFixed(2)}  (calibrated: sd ~1)`);
    }
  }

  // Pooled summary across periods (P1 and P3 do not overlap; P2 overlaps both by six months).
  p();
  p(`=== Across periods (mean of per-period figures; pooled band hit with Kupiec) ===`);
  const names = [...new Set(results.filter((r) => !(r.model as string).startsWith("signal")).map((r) => r.model as string))];
  for (const name of names) {
    const rs = results.filter((r) => r.model === name) as { ic: number; inside: number; n: number; errMed: number; mae: number; spread: number; below: number }[];
    const n = rs.reduce((a, r) => a + r.n, 0);
    const ins = rs.reduce((a, r) => a + r.inside * r.n, 0);
    const k = kupiec(Math.round(n - ins), n);
    const nonOverlap = rs.filter((_, i) => i !== 1);
    p(`${name.padEnd(30)} IC mean ${f2(mean(rs.map((r) => r.ic))!)} (P1,P3 ${f2(mean(nonOverlap.map((r) => r.ic))!)})  inside pooled ${sh(ins / n)} (n ${n}) Kupiec LR ${k.lr.toFixed(1)} p ${k.p < 0.001 ? "<.001" : k.p.toFixed(3)}  med err ${pct(mean(rs.map((r) => r.errMed))!, 0)}  abs err ${pct(mean(rs.map((r) => r.mae))!, 0)}  top-bot ${pct(mean(rs.map((r) => r.spread))!, 0)}`);
  }
  for (const s of [...new Set(results.filter((r) => (r.model as string).startsWith("signal")).map((r) => r.model as string))]) {
    const rs = results.filter((r) => r.model === s) as { ic: number }[];
    p(`${s.padEnd(56)} IC by period ${rs.map((r) => f2(r.ic)).join(" / ")}  mean ${f2(mean(rs.map((r) => r.ic))!)}`);
  }
  console.log(L.join("\n"));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ results, rows: Object.fromEntries(Object.entries(allRows).map(([k, rs]) => [k, rs.map((r) => ({ ticker: r.ticker, home: r.home, actual: r.actual, beta: r.beta, betaRaw: r.betaRaw, vol: r.vol, volRaw: r.volRaw, fund: r.fund, past1y: r.past1y, pe: r.input.pe }))])) }, null, 1));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
