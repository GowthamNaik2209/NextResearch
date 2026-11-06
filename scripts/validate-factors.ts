// Walk-forward test of simple ranking signals (momentum, value, quality, low volatility, and equal-weight
// composites of them) against v2's beta-driven Base, over monthly snapshots (docs/FACTOR-BACKTEST.md).
// Nothing here is fitted: every signal and composite is fixed in advance, each scored by its rank
// correlation (IC) with the stock's return over the next 3 and 12 months.
// Read-only: prices from the price store (PriceBar), FY revenue/profit and today's market cap from the
// company table, both via DATABASE_URL (.env). Not shipped.
//   npx tsx scripts/validate-factors.ts [--json out.json]
import { writeFileSync } from "node:fs";
import { scriptPrisma } from "./db";
import { installFinancialsFromDatabase } from "../src/lib/financials/test-db";
import { listBasketUniverse } from "../src/lib/baskets/industry";

const DAY = 86_400_000;
const BLUME = (b: number) => 0.67 * b + 0.33;
// Annual results (FY ends 31 Mar) are assumed public from 1 June: SEBI's 60-day limit plus a margin.
const RESULTS_FROM = "-06-01";
const HORIZONS = [{ key: "12M", days: 365, months: 12 }, { key: "3M", days: 91, months: 3 }];

type Series = { t: string[]; c: number[] };
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(Date.parse(d) + n * DAY);
/** Index of the last bar on or before `day`, or -1. */
function idxOn(s: Series, day: string): number {
  let lo = 0, hi = s.t.length - 1, hit = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (s.t[m] <= day) { hit = m; lo = m + 1; } else hi = m - 1;
  }
  return hit;
}
/** Close on `day` (last bar within 7 days before it), or null. */
function closeOn(s: Series, day: string): number | null {
  const i = idxOn(s, day);
  return i >= 0 && (Date.parse(day) - Date.parse(s.t[i])) / DAY <= 7 ? s.c[i] : null;
}

// ---- Stats ----
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}
function pearson(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));
/** Newey-West t-statistic of a mean, for overlapping windows (lag = months of overlap). */
function nwT(xs: number[], lag: number) {
  const n = xs.length, m = mean(xs), e = xs.map((x) => x - m);
  let s = e.reduce((a, x) => a + x * x, 0) / n;
  for (let l = 1; l <= lag; l++) {
    let g = 0;
    for (let i = l; i < n; i++) g += e[i] * e[i - l];
    s += 2 * (1 - l / (lag + 1)) * (g / n);
  }
  return m / Math.sqrt(s / n);
}
/** Mean forward return of the top fifth by signal minus the bottom fifth. */
function quintSpread(sig: number[], ret: number[]) {
  const o = sig.map((v, i) => [v, ret[i]] as const).sort((a, b) => a[0] - b[0]);
  const k = Math.floor(o.length / 5);
  return mean(o.slice(-k).map((x) => x[1])) - mean(o.slice(0, k).map((x) => x[1]));
}

// ---- Signals (higher = expected to do better) ----
type Row = Record<string, number | null>;
const BASE_SIGNALS: [string, string][] = [
  ["MOM12_1", "Momentum: return from 12 months to 1 month ago"],
  ["MOM12", "Past-year return (the v1 check's benchmark)"],
  ["VALUE_EY", "Value: earnings yield, last FY profit / market cap"],
  ["VALUE_SY", "Value: sales yield, last FY revenue / market cap"],
  ["QUAL_MARGIN", "Quality: last FY net margin"],
  ["QUAL_STABLE", "Quality: profitable years out of those reported, then margin"],
  ["GROWTH", "Last FY revenue growth"],
  ["LOWVOL", "Low volatility: minus 1Y realised volatility"],
  ["SMALL", "Size: minus log market cap"],
  ["BETA", "Beta (Blume): what orders v2's Base, rf + beta x ERP"],
];
const COMPOSITES: [string, string[]][] = [
  ["C_MQ", ["MOM12_1", "QUAL_MARGIN"]],
  ["C_MQV", ["MOM12_1", "QUAL_MARGIN", "VALUE_EY"]],
  ["C_MQVL", ["MOM12_1", "QUAL_MARGIN", "VALUE_EY", "LOWVOL"]],
];

async function main() {
  const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
  await installFinancialsFromDatabase();
  const universe = listBasketUniverse();
  const prisma = scriptPrisma();

  const load = async (key: string): Promise<Series> => {
    const bars = await prisma.priceBar.findMany({ where: { key }, select: { day: true, close: true }, orderBy: { day: "asc" } });
    return { t: bars.map((b) => iso(b.day.getTime())), c: bars.map((b) => b.close) };
  };
  const nifty = await load("^NSEI");
  const series = new Map<string, Series>();
  const queue = universe.map((s) => s.ticker);
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let t = queue.shift(); t; t = queue.shift()) { const s = await load(t); if (s.t.length) series.set(t, s); }
  }));
  const companies = await prisma.company.findMany({
    where: { ticker: { in: universe.map((s) => s.ticker) } },
    select: { ticker: true, financials: { select: { year: true, revenueCr: true, netProfitCr: true } } },
  });
  await prisma.$disconnect();
  const fy = new Map(companies.map((c) => [c.ticker, new Map(c.financials.map((f) => [f.year, {
    rev: f.revenueCr == null ? null : Number(f.revenueCr), np: f.netProfitCr == null ? null : Number(f.netProfitCr),
  }]))]));
  const industry = new Map(universe.map((s) => [s.ticker, s.industries[0]?.slug ?? "?"]));
  console.error(`universe ${universe.length}, with prices ${series.size}, nifty ${nifty.t[0]} .. ${nifty.t.at(-1)}`);

  // Month-end formation dates: the first with a full year of history behind every momentum window.
  const storeStart = "2021-10-22";
  const lastDay = nifty.t.at(-1)!;
  const monthEnds: string[] = [];
  for (let i = 0; i < nifty.t.length; i++) {
    const d = nifty.t[i], next = nifty.t[i + 1];
    if (d >= addDays(storeStart, 372) && (!next || next.slice(0, 7) !== d.slice(0, 7))) monthEnds.push(d);
  }

  // Weekly Nifty closes for beta (every 5th trading day back from the formation date).
  const weeklyReturns = (s: Series, day: string) => {
    const out: number[] = [];
    for (let d = day, k = 0; k < 105; k++) {
      const a = closeOn(s, d), b = closeOn(s, addDays(d, -7));
      if (a == null || b == null) break;
      out.push(Math.log(a / b));
      d = addDays(d, -7);
    }
    return out;
  };

  function signalsOn(t: string, day: string): Row | null {
    const s = series.get(t)!;
    const p0 = closeOn(s, day), p1m = closeOn(s, addDays(day, -30)), p12m = closeOn(s, addDays(day, -365));
    if (p0 == null || p1m == null || p12m == null) return null;
    const row: Row = { MOM12_1: p1m / p12m - 1, MOM12: p0 / p12m - 1 };
    // 1Y realised volatility; a one-day move over 60% (log) marks a bad bar: skip the stock that month.
    const i0 = idxOn(s, day), i1 = idxOn(s, addDays(day, -365));
    const rs: number[] = [];
    for (let i = Math.max(1, i1 + 1); i <= i0; i++) rs.push(Math.log(s.c[i] / s.c[i - 1]));
    if (rs.length < 150 || rs.some((r) => Math.abs(r) > 0.6)) return null;
    row.LOWVOL = -Math.sqrt(250 * mean(rs.map((r) => r * r)));
    // Beta on up to 2 years of weekly returns (52 weeks needed), Blume-adjusted as in v2.
    const ws = weeklyReturns(s, day), wn = weeklyReturns(nifty, day), n = Math.min(ws.length, wn.length);
    if (n >= 52) {
      const a = ws.slice(0, n), b = wn.slice(0, n), ma = mean(a), mb = mean(b);
      let cov = 0, vb = 0;
      for (let i = 0; i < n; i++) { cov += (a[i] - ma) * (b[i] - mb); vb += (b[i] - mb) ** 2; }
      row.BETA = BLUME(cov / vb);
    } else row.BETA = null;
    // Market cap then = today's (company table) scaled by the price move: share-count changes are ignored.
    const mcapNow = universe.find((u) => u.ticker === t)!.mcapCr;
    const mcap = mcapNow ? mcapNow * (p0 / s.c.at(-1)!) : null;
    row.SMALL = mcap ? -Math.log(mcap) : null;
    // Latest fiscal year public on the day (FY y ends 31 Mar y; results assumed out by 1 June).
    const years = fy.get(t);
    let y = Number(day.slice(0, 4));
    if (day < `${y}${RESULTS_FROM}`) y -= 1;
    const cur = years?.get(y), prev = years?.get(y - 1);
    row.VALUE_EY = mcap && cur && fin(cur.np) ? cur.np / mcap : null;
    row.VALUE_SY = mcap && cur && fin(cur.rev) && cur.rev > 0 ? cur.rev / mcap : null;
    row.QUAL_MARGIN = cur && fin(cur.np) && fin(cur.rev) && cur.rev > 0 ? cur.np / cur.rev : null;
    const known = years ? [...years.entries()].filter(([yr, v]) => yr <= y && fin(v.np)) : [];
    row.QUAL_STABLE = known.length >= 2 && fin(row.QUAL_MARGIN)
      ? known.filter(([, v]) => v.np! > 0).length / known.length + 0.01 * Math.max(-1, Math.min(1, row.QUAL_MARGIN))
      : null;
    row.GROWTH = cur && prev && fin(cur.rev) && fin(prev.rev) && prev.rev > 0 ? cur.rev / prev.rev - 1 : null;
    return row;
  }

  const fwd = (t: string, day: string, days: number) => {
    const s = series.get(t)!, end = addDays(day, days);
    if (end > lastDay) return null;
    const a = closeOn(s, day), b = closeOn(s, end);
    if (a == null || b == null) return null;
    const i0 = idxOn(s, day), i1 = idxOn(s, end);
    for (let i = i0 + 1; i <= i1; i++) if (Math.abs(Math.log(s.c[i] / s.c[i - 1])) > 0.6) return null;
    return b / a - 1;
  };

  const names = [...BASE_SIGNALS.map((s) => s[0]), ...COMPOSITES.map((c) => c[0])];
  type DateStat = { day: string; n: number; ic: number; icInd: number; spread: number };
  const results: Record<string, Record<string, DateStat[]>> = {};
  const market: Record<string, { day: string; nifty: number; medianStock: number }[]> = {};
  for (const h of HORIZONS) {
    results[h.key] = Object.fromEntries(names.map((n) => [n, []]));
    market[h.key] = [];
    for (const day of monthEnds) {
      if (addDays(day, h.days) > lastDay) continue;
      const rows: { t: string; sig: Row; ret: number }[] = [];
      for (const t of series.keys()) {
        const sig = signalsOn(t, day), ret = sig ? fwd(t, day, h.days) : null;
        if (sig && ret != null) rows.push({ t, sig, ret });
      }
      if (rows.length < 50) continue;
      // Composites: mean cross-sectional percentile of their parts (every part needed).
      for (const [name, parts] of COMPOSITES) {
        const pct = new Map<string, number[]>();
        for (const p of parts) {
          const have = rows.filter((r) => fin(r.sig[p]));
          const rk = ranks(have.map((r) => r.sig[p] as number));
          have.forEach((r, i) => pct.set(r.t, [...(pct.get(r.t) ?? []), rk[i] / (have.length - 1)]));
        }
        for (const r of rows) { const v = pct.get(r.t); r.sig[name] = v && v.length === parts.length ? mean(v) : null; }
      }
      // Industry-neutral returns: minus the home industry's median that month (industries with 5+ stocks).
      const byInd = new Map<string, number[]>();
      for (const r of rows) byInd.set(industry.get(r.t)!, [...(byInd.get(industry.get(r.t)!) ?? []), r.ret]);
      const indMed = new Map([...byInd].filter(([, v]) => v.length >= 5).map(([k, v]) => [k, median(v)]));
      const n0 = closeOn(nifty, day), n1 = closeOn(nifty, addDays(day, h.days));
      market[h.key].push({ day, nifty: n1! / n0! - 1, medianStock: median(rows.map((r) => r.ret)) });
      for (const name of names) {
        const have = rows.filter((r) => fin(r.sig[name]));
        if (have.length < 50) continue;
        const sig = have.map((r) => r.sig[name] as number), ret = have.map((r) => r.ret);
        const neut = have.filter((r) => indMed.has(industry.get(r.t)!));
        results[h.key][name].push({
          day, n: have.length, ic: spearman(sig, ret), spread: quintSpread(sig, ret),
          icInd: spearman(neut.map((r) => r.sig[name] as number), neut.map((r) => r.ret - indMed.get(industry.get(r.t)!)!)),
        });
      }
    }
  }

  // ---- Report ----
  const pct = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}`;
  const f2 = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;
  const label = Object.fromEntries([...BASE_SIGNALS, ...COMPOSITES.map(([n, p]) => [n, `Composite: ${p.join(" + ")}`])]);
  const summary: Record<string, unknown> = {};
  for (const h of HORIZONS) {
    const m = market[h.key];
    console.log(`\n## ${h.key} forward return: ${m.length} monthly snapshots, ${m[0].day} .. ${m.at(-1)!.day}`);
    console.log(`Nifty over the windows: mean ${pct(mean(m.map((x) => x.nifty)))}%, worst ${pct(Math.min(...m.map((x) => x.nifty)))}%, best ${pct(Math.max(...m.map((x) => x.nifty)))}%\n`);
    console.log("| Signal | Dates | Stocks (avg) | Mean IC | NW t | IC > 0 | Mean IC, within industry | NW t | Top − bottom fifth (pts) |");
    console.log("|---|---|---|---|---|---|---|---|---|");
    const lag = h.months - 1;
    summary[h.key] = {};
    for (const name of names) {
      const xs = results[h.key][name];
      if (!xs.length) continue;
      const ic = xs.map((x) => x.ic), icInd = xs.map((x) => x.icInd).filter(fin);
      const row = {
        dates: xs.length, stocks: Math.round(mean(xs.map((x) => x.n))), ic: mean(ic), t: nwT(ic, lag), hit: ic.filter((x) => x > 0).length / ic.length,
        icInd: mean(icInd), tInd: nwT(icInd, lag), spread: mean(xs.map((x) => x.spread)),
        byYear: Object.fromEntries([...new Set(xs.map((x) => x.day.slice(0, 4)))].map((y) => [y, mean(xs.filter((x) => x.day.startsWith(y)).map((x) => x.ic))])),
      };
      (summary[h.key] as Record<string, unknown>)[name] = row;
      console.log(`| ${name} (${label[name]}) | ${row.dates} | ${row.stocks} | ${f2(row.ic)} | ${row.t.toFixed(1)} | ${Math.round(row.hit * 100)}% | ${f2(row.icInd)} | ${row.tInd.toFixed(1)} | ${pct(row.spread)} |`);
    }
    console.log(`\nMean IC by formation year (${h.key}):\n`);
    const yrs = [...new Set(m.map((x) => x.day.slice(0, 4)))];
    console.log(`| Signal | ${yrs.join(" | ")} |\n|---|${yrs.map(() => "---").join("|")}|`);
    for (const name of names) {
      const r = (summary[h.key] as Record<string, { byYear: Record<string, number> }>)[name];
      if (r) console.log(`| ${name} | ${yrs.map((y) => (fin(r.byYear[y]) ? f2(r.byYear[y]) : "–")).join(" | ")} |`);
    }
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary, results, market }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
