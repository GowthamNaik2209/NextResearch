// Risk and return statistics for a value line (a basket's backtest, a stock, an index), computed
// from its own bars: daily on 1M-2Y, weekly on 3Y/5Y, so the bar frequency is read from the dates
// and every annualised figure scales by it. Price change only, like the backtest itself.
// Pure (no fetching), so it is unit-tested on its own.
import type { PricePoint } from "./backtest";
import { shownPct } from "./fmt";
import { CAPTURE_MIN_MONTHS, monthlyCapture } from "./analysis";

export type SeriesStats = {
  /** Total change over the series, %. */
  ret: number;
  /** Compound annual growth, %; null over a year or less (annualising a few months misleads, and
   * over one year it is the return itself, only re-scaled by a calendar that differs by a few days). */
  cagr: number | null;
  /** Annualised standard deviation of bar returns, %; null under minReturns() bar returns. */
  vol: number | null;
  /** Deepest fall from a running high, % (0 or negative), with when it peaked, bottomed and got back. */
  maxDd: number;
  ddPeak: string | null;
  ddTrough: string | null;
  /** First bar back at the old high, or null when it hasn't recovered yet. */
  ddRecovered: string | null;
  /** Annualised mean bar return over annualised downside deviation (target 0); null with no down
   *  bars or under minReturns() bar returns. */
  sortino: number | null;
  /** Calendar-month returns, % (a month counts from the previous month's last close; the first from
   *  the series' first close); null under MIN_STAT_MONTHS months or minReturns() bar returns. */
  bestMonth: { month: string; ret: number } | null;
  worstMonth: { month: string; ret: number } | null;
  /** How many calendar months have a return (the first, part, month included when it has two bars),
   *  and how many of them rose; both 0 when too short for best / worst month. */
  months: number;
  upMonths: number;
  /** Bars per year the series was read at (≈250 daily, ≈52 weekly). */
  periodsPerYear: number;
};

export type RelativeStats = {
  /** Slope of the line's bar returns on the benchmark's; null under minReturns() aligned returns. */
  beta: number | null;
  /** How much of the benchmark's rise (up capture) and fall (down capture) the line took over its up
   *  (down) calendar months, %; null under ten months (analysis.ts monthlyCapture). */
  upCapture: number | null;
  downCapture: number | null;
  /** The benchmark's own change over the same dates, %. */
  benchRet: number;
};

const DAY = 86_400_000;

/** Bars per year, from the median gap between dates (robust to holidays and a missing week). */
export function periodsPerYear(points: PricePoint[]): number {
  if (points.length < 3) return 252;
  const gaps = points
    .slice(1)
    .map((p, i) => (Date.parse(p.t) - Date.parse(points[i].t)) / DAY)
    .sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median >= 25) return 12;
  if (median >= 5) return 52;
  return 252;
}

// Minimum history. A figure read off a handful of bars is noise dressed as a statistic (a stock
// listed four days ago read beta −0.54, volatility 4.6%, its one month both best and worst), so:
// - volatility, Sortino and beta need three weeks of daily returns (15: a 1M range has 19-22 even
//   in a holiday month, so it keeps its figures) or a quarter of weekly ones (12; monthly bars too),
//   the bar frequency read from the dates as everything else here is;
// - best / worst month and months up need at least two calendar months (one month is both) and
//   the same bars as volatility (four days across a month end are two "months" of noise).
// Below that the figure is null and the stats grid says it needs more price history. Return and
// drawdown are shown at any length. (The projection's own statistics ask far more, a year of
// weeks, projection-risk.ts; capture asks ten months, analysis.ts.)
export const MIN_DAILY_RETURNS = 15;
export const MIN_WEEKLY_RETURNS = 12;
export const MIN_STAT_MONTHS = 2;

/** Bar returns a dispersion figure (volatility, Sortino, beta) needs at this bar frequency. */
export const minReturns = (ppy: number) => (ppy >= 252 ? MIN_DAILY_RETURNS : MIN_WEEKLY_RETURNS);

const returns = (points: PricePoint[]) => points.slice(1).map((p, i) => p.c / points[i].c - 1);
const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;

export function seriesStats(points: PricePoint[]): SeriesStats | null {
  if (points.length < 2 || points.some((p) => !(p.c > 0))) return null;
  const ppy = periodsPerYear(points);
  const first = points[0];
  const last = points[points.length - 1];
  const ret = (last.c / first.c - 1) * 100;
  const years = (Date.parse(last.t) - Date.parse(first.t)) / (365.25 * DAY);
  // Only past about a year: a 1-year backtest spans 360-368 calendar days, so its CAGR would be the
  // return re-scaled by that odd day count (-8.9% beside a -8.8% return), saying nothing new.
  const cagr = years >= 1.1 ? (Math.pow(last.c / first.c, 1 / years) - 1) * 100 : null;

  const r = returns(points);
  const m = mean(r);
  const enough = r.length >= minReturns(ppy);
  const vol = enough ? Math.sqrt(r.reduce((n, x) => n + (x - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(ppy) * 100 : null;
  const downs = r.filter((x) => x < 0);
  const downDev = Math.sqrt(r.reduce((n, x) => n + Math.min(x, 0) ** 2, 0) / r.length) * Math.sqrt(ppy);
  const sortino = enough && downs.length && downDev > 0 ? (m * ppy) / downDev : null;

  // Max drawdown: the deepest fall below the running high, and the bar it was first regained.
  let peak = first;
  let maxDd = 0;
  let ddPeak: PricePoint | null = null;
  let ddTrough: PricePoint | null = null;
  for (const p of points) {
    if (p.c > peak.c) peak = p;
    const dd = (p.c / peak.c - 1) * 100;
    if (dd < maxDd) {
      maxDd = dd;
      ddPeak = peak;
      ddTrough = p;
    }
  }
  let ddRecovered: string | null = null;
  if (ddPeak && ddTrough) {
    const from = points.indexOf(ddTrough);
    const back = points.slice(from).find((p) => p.c >= ddPeak.c);
    ddRecovered = back ? back.t : null;
  }

  // Month ends: the last bar of each calendar month; month returns chain from one to the next. The
  // first month (a listing month, or the range's start) counts from the series' first bar to its
  // last bar, unless it has only the one bar; the month in progress counts to the latest bar. The
  // same months as analysis.ts monthlyReturns.
  const ends: PricePoint[] = [];
  for (const p of points) {
    const prev = ends[ends.length - 1];
    if (prev && prev.t.slice(0, 7) === p.t.slice(0, 7)) ends[ends.length - 1] = p;
    else ends.push(p);
  }
  const months = ends.map((p, i) => ({ month: p.t.slice(0, 7), ret: (p.c / (i ? ends[i - 1] : first).c - 1) * 100 }));
  if (ends[0] === first) months.shift();
  const monthly = enough && months.length >= MIN_STAT_MONTHS;
  if (!monthly) months.length = 0;
  const bestMonth = monthly ? months.reduce((a, b) => (b.ret > a.ret ? b : a)) : null;
  const worstMonth = monthly ? months.reduce((a, b) => (b.ret < a.ret ? b : a)) : null;

  return {
    ret,
    cagr,
    vol,
    maxDd,
    ddPeak: ddPeak?.t ?? null,
    ddTrough: ddTrough?.t ?? null,
    ddRecovered,
    sortino,
    bestMonth,
    worstMonth,
    months: months.length,
    upMonths: months.filter((x) => x.ret > 0).length,
    periodsPerYear: ppy,
  };
}

/** A basket row's headline figures: return, deepest fall and lead over the benchmark (pts). */
export type BasketFigures = { ret: number; maxDd: number; vs: number | null };

/**
 * The figures the Baskets tables show, from a backtest's points and the benchmark's. The lead is
 * measured over the basket's own dates (the benchmark's last close on or before each), as the
 * basket page's stats grid measures it, so the two read the same.
 */
export function basketFigures(points: PricePoint[], bench: PricePoint[] | null): BasketFigures | null {
  const st = seriesStats(points);
  if (!st) return null;
  const rel = bench ? relativeStats(points, bench) : null;
  // The lead between the two figures as shown, so the row's three numbers add up on screen.
  return { ret: st.ret, maxDd: st.maxDd, vs: rel ? shownPct(st.ret) - shownPct(rel.benchRet) : null };
}

/**
 * The line against a benchmark over the line's own dates. The benchmark is read at each of those
 * dates (its last close on or before it), so an index on a different holiday calendar still lines up.
 */
export function relativeStats(points: PricePoint[], bench: PricePoint[]): RelativeStats | null {
  if (points.length < 3 || bench.length < 2) return null;
  const aligned: { a: number; b: number }[] = [];
  let j = -1;
  for (const p of points) {
    while (j + 1 < bench.length && bench[j + 1].t <= p.t) j++;
    if (j >= 0) aligned.push({ a: p.c, b: bench[j].c });
  }
  if (aligned.length < 3) return null;
  const ppy = periodsPerYear(points);
  const ra = aligned.slice(1).map((x, i) => x.a / aligned[i].a - 1);
  const rb = aligned.slice(1).map((x, i) => x.b / aligned[i].b - 1);

  const ma = mean(ra);
  const mb = mean(rb);
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    varB += (rb[i] - mb) ** 2;
  }
  const beta = ra.length >= minReturns(ppy) && varB > 0 ? cov / varB : null;

  // Capture on calendar months, the usual measure and the same figures as the Capture panel
  // (daily bars read close to 100% for anything that tracks the index). Under ten months: none.
  const m = monthlyCapture(points, bench);
  const enough = m.months >= CAPTURE_MIN_MONTHS;

  const benchRet = (aligned[aligned.length - 1].b / aligned[0].b - 1) * 100;
  return { beta, upCapture: enough ? m.upCapture : null, downCapture: enough ? m.downCapture : null, benchRet };
}
