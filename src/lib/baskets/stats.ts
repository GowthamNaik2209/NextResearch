// Risk and return statistics for a value line (a basket's backtest, a stock, an index), computed
// from its own bars: daily on 1M-2Y, weekly on 3Y/5Y, so the bar frequency is read from the dates
// and every annualised figure scales by it. Price change only, like the backtest itself.
// Pure (no fetching), so it is unit-tested on its own.
import type { PricePoint } from "./backtest";
import { shownPct } from "./fmt";

export type SeriesStats = {
  /** Total change over the series, %. */
  ret: number;
  /** Compound annual growth, %; null under a year (annualising a few months misleads). */
  cagr: number | null;
  /** Annualised standard deviation of bar returns, %. */
  vol: number | null;
  /** Deepest fall from a running high, % (0 or negative), with when it peaked, bottomed and got back. */
  maxDd: number;
  ddPeak: string | null;
  ddTrough: string | null;
  /** First bar back at the old high, or null when it hasn't recovered yet. */
  ddRecovered: string | null;
  /** Annualised mean bar return over annualised downside deviation (target 0); null with no down bars. */
  sortino: number | null;
  /** Calendar-month returns, % (a month counts from the previous month's last close). */
  bestMonth: { month: string; ret: number } | null;
  worstMonth: { month: string; ret: number } | null;
  /** How many calendar months the series spans (after its first), and how many of them rose. */
  months: number;
  upMonths: number;
  /** Bars per year the series was read at (≈250 daily, ≈52 weekly). */
  periodsPerYear: number;
};

export type RelativeStats = {
  /** Slope of the line's bar returns on the benchmark's. */
  beta: number | null;
  /** How much of the benchmark's rise (up capture) and fall (down capture) the line took, %. */
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

/** Geometric mean of bar returns (fractions): the steady per-bar rate that compounds to the same total. */
export const geoMean = (xs: number[]) => Math.pow(xs.reduce((n, x) => n * (1 + x), 1), 1 / xs.length) - 1;

const returns = (points: PricePoint[]) => points.slice(1).map((p, i) => p.c / points[i].c - 1);
const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;

export function seriesStats(points: PricePoint[]): SeriesStats | null {
  if (points.length < 2 || points.some((p) => !(p.c > 0))) return null;
  const ppy = periodsPerYear(points);
  const first = points[0];
  const last = points[points.length - 1];
  const ret = (last.c / first.c - 1) * 100;
  const years = (Date.parse(last.t) - Date.parse(first.t)) / (365.25 * DAY);
  const cagr = years >= 0.98 ? (Math.pow(last.c / first.c, 1 / years) - 1) * 100 : null;

  const r = returns(points);
  const m = mean(r);
  const vol = r.length >= 2 ? Math.sqrt(r.reduce((n, x) => n + (x - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(ppy) * 100 : null;
  const downs = r.filter((x) => x < 0);
  const downDev = Math.sqrt(r.reduce((n, x) => n + Math.min(x, 0) ** 2, 0) / r.length) * Math.sqrt(ppy);
  const sortino = downs.length && downDev > 0 ? (m * ppy) / downDev : null;

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

  // Month ends: the last bar of each calendar month; month returns chain from one to the next.
  const ends: PricePoint[] = [];
  for (const p of points) {
    const prev = ends[ends.length - 1];
    if (prev && prev.t.slice(0, 7) === p.t.slice(0, 7)) ends[ends.length - 1] = p;
    else ends.push(p);
  }
  const months = ends.slice(1).map((p, i) => ({ month: p.t.slice(0, 7), ret: (p.c / ends[i].c - 1) * 100 }));
  const bestMonth = months.length ? months.reduce((a, b) => (b.ret > a.ret ? b : a)) : null;
  const worstMonth = months.length ? months.reduce((a, b) => (b.ret < a.ret ? b : a)) : null;

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
  const beta = varB > 0 ? cov / varB : null;

  // Capture: the line's compound return over the benchmark's up (or down) bars, per bar, over the
  // benchmark's own - 100 means it moved one for one with the index on those bars.
  const capture = (up: boolean) => {
    const idx = rb.map((x, i) => (up ? x > 0 : x < 0) ? i : -1).filter((i) => i >= 0);
    if (!idx.length) return null;
    const b = geoMean(idx.map((i) => rb[i]));
    return b === 0 ? null : (geoMean(idx.map((i) => ra[i])) / b) * 100;
  };

  const benchRet = (aligned[aligned.length - 1].b / aligned[0].b - 1) * 100;
  return { beta, upCapture: capture(true), downCapture: capture(false), benchRet };
}
