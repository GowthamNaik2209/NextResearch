// Backtest analysis of a value line against a benchmark: the underwater curve, the worst
// drawdown episodes, calendar-month returns (and a years × months matrix), rolling returns over a
// date-based window and capture on monthly returns. Series may be daily (1M-2Y) or weekly (3Y/5Y);
// nothing here assumes a bar frequency. Pure (no fetching, no DOM), so it is unit-tested on its own.
import type { PricePoint } from "./backtest";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/**
 * The benchmark read at each of the line's dates: its last close on or before that date, so an
 * index on a different holiday calendar still lines up. Dates before the benchmark's first bar
 * are left out.
 */
export function alignTo(points: PricePoint[], bench: PricePoint[]): PricePoint[] {
  const out: PricePoint[] = [];
  let j = -1;
  for (const p of points) {
    while (j + 1 < bench.length && bench[j + 1].t <= p.t) j++;
    if (j >= 0) out.push({ t: p.t, c: bench[j].c });
  }
  return out;
}

export type UnderwaterPoint = { t: string; /** % below the running high (0 or negative). */ dd: number };

/** How far below its previous high the line sits at each bar, %. */
export function underwater(points: PricePoint[]): UnderwaterPoint[] {
  let high = -Infinity;
  return points.map((p) => {
    if (p.c > high) high = p.c;
    return { t: p.t, dd: high > 0 ? (p.c / high - 1) * 100 : 0 };
  });
}

export type DrawdownEpisode = {
  /** Deepest fall in the episode, % (negative). */
  depth: number;
  /** The high it fell from, the low it reached, and the first bar back at the high (null: not yet). */
  peak: string;
  trough: string;
  recovered: string | null;
  /** Calendar days from the peak to the recovery, or to the last bar when not yet recovered. */
  days: number;
};

/** The n deepest drawdown episodes (peak → back at that peak), deepest first. */
export function drawdownEpisodes(points: PricePoint[], n = 5): DrawdownEpisode[] {
  const eps: DrawdownEpisode[] = [];
  if (!points.length) return eps;
  let peak = points[0];
  let cur: { peak: PricePoint; trough: PricePoint } | null = null;
  for (const p of points) {
    if (p.c >= peak.c) {
      if (cur) {
        eps.push({ depth: (cur.trough.c / cur.peak.c - 1) * 100, peak: cur.peak.t, trough: cur.trough.t, recovered: p.t, days: daysBetween(cur.peak.t, p.t) });
        cur = null;
      }
      peak = p;
    } else if (!cur) cur = { peak, trough: p };
    else if (p.c < cur.trough.c) cur.trough = p;
  }
  if (cur) {
    const last = points[points.length - 1];
    eps.push({ depth: (cur.trough.c / cur.peak.c - 1) * 100, peak: cur.peak.t, trough: cur.trough.t, recovered: null, days: daysBetween(cur.peak.t, last.t) });
  }
  return eps.sort((a, b) => a.depth - b.depth).slice(0, n);
}

export type MonthReturn = { year: number; /** 0-11 */ month: number; /** % */ ret: number };

/**
 * Calendar-month returns, %: each month from the previous month's last close to its own. The
 * first month counts from the line's first close (a partial month), and is left out when that
 * first bar is the month's only bar.
 */
export function monthlyReturns(points: PricePoint[]): MonthReturn[] {
  const ends: { key: string; first: PricePoint; last: PricePoint }[] = [];
  for (const p of points) {
    const key = p.t.slice(0, 7);
    const prev = ends[ends.length - 1];
    if (prev && prev.key === key) prev.last = p;
    else ends.push({ key, first: p, last: p });
  }
  const out: MonthReturn[] = [];
  ends.forEach((m, i) => {
    const from = i === 0 ? m.first : ends[i - 1].last;
    if (i === 0 && m.first === m.last) return;
    if (!(from.c > 0)) return;
    out.push({ year: Number(m.key.slice(0, 4)), month: Number(m.key.slice(5, 7)) - 1, ret: (m.last.c / from.c - 1) * 100 });
  });
  return out;
}

const compound = (rets: number[]) => (rets.reduce((n, r) => n * (1 + r / 100), 1) - 1) * 100;

export type MonthlyRow = {
  year: number;
  /** Jan..Dec, %; null where the line has no return for that month. */
  months: (number | null)[];
  bench: (number | null)[];
  /** The months compounded, %; null when the year has none. */
  total: number | null;
  benchTotal: number | null;
};

/** Years × months of the line's returns beside the benchmark's (read on the line's dates). */
export function monthlyMatrix(basket: PricePoint[], bench: PricePoint[]): MonthlyRow[] {
  const a = monthlyReturns(basket);
  const b = monthlyReturns(alignTo(basket, bench));
  const rows = new Map<number, MonthlyRow>();
  const row = (year: number) => {
    let r = rows.get(year);
    if (!r) rows.set(year, (r = { year, months: Array(12).fill(null), bench: Array(12).fill(null), total: null, benchTotal: null }));
    return r;
  };
  for (const m of a) row(m.year).months[m.month] = m.ret;
  for (const m of b) if (rows.has(m.year)) row(m.year).bench[m.month] = m.ret;
  for (const r of rows.values()) {
    const am = r.months.filter((x): x is number => x != null);
    const bm = r.bench.filter((x, i): x is number => x != null && r.months[i] != null);
    r.total = am.length ? compound(am) : null;
    r.benchTotal = bm.length ? compound(bm) : null;
  }
  return [...rows.values()].sort((x, y) => x.year - y.year);
}

export type RollingPoint = { t: string; /** % over the window ending here */ ret: number };

/**
 * Return over the trailing `days` calendar days at each bar, from the last close on or before
 * the window's start. Bars without a full window behind them are left out.
 */
export function rollingReturn(points: PricePoint[], days: number): RollingPoint[] {
  const out: RollingPoint[] = [];
  if (!points.length) return out;
  const t0 = Date.parse(points[0].t);
  let j = 0;
  for (const p of points) {
    const start = Date.parse(p.t) - days * DAY;
    if (start < t0) continue;
    while (j + 1 < points.length && Date.parse(points[j + 1].t) <= start) j++;
    if (points[j].c > 0) out.push({ t: p.t, ret: (p.c / points[j].c - 1) * 100 });
  }
  return out;
}

/** Compound mean return per bar, from simple returns as fractions. */
const geoMean = (xs: number[]) => Math.pow(xs.reduce((n, x) => n * (1 + x), 1), 1 / xs.length) - 1;

/** A handful of months gives wild capture ratios (three up months can read −13%), so it waits for ten. */
export const CAPTURE_MIN_MONTHS = 10;

export type MonthlyCapture = {
  /** The line's compound monthly return over the benchmark's up (down) months, per month, over the benchmark's, %. */
  upCapture: number | null;
  downCapture: number | null;
  upMonths: number;
  downMonths: number;
  /** Months the line returned more than the benchmark, of the months both have. */
  beat: number;
  /** Months the line itself rose: the stats grid's "Months up", over the same months. */
  lineUp: number;
  months: number;
};

/**
 * Up/down capture and months beating the benchmark, on calendar-month returns aligned by month.
 * Months are counted as the stats grid counts them: each from the previous month's last close,
 * so the first (partial) month of the range is left out and "of N months" matches "Months up".
 */
export function monthlyCapture(basket: PricePoint[], bench: PricePoint[]): MonthlyCapture {
  const startKey = basket.length ? Number(basket[0].t.slice(0, 4)) * 12 + Number(basket[0].t.slice(5, 7)) - 1 : null;
  const a = monthlyReturns(basket).filter((m) => m.year * 12 + m.month !== startKey);
  const bMap = new Map(monthlyReturns(alignTo(basket, bench)).map((m) => [m.year * 12 + m.month, m.ret]));
  const pairs = a.flatMap((m) => {
    const b = bMap.get(m.year * 12 + m.month);
    return b == null ? [] : [{ a: m.ret / 100, b: b / 100 }];
  });
  const capture = (up: boolean) => {
    const sel = pairs.filter((p) => (up ? p.b > 0 : p.b < 0));
    if (!sel.length) return { v: null, n: 0 };
    const b = geoMean(sel.map((p) => p.b));
    return { v: b === 0 ? null : (geoMean(sel.map((p) => p.a)) / b) * 100, n: sel.length };
  };
  const up = capture(true);
  const down = capture(false);
  return {
    upCapture: up.v,
    downCapture: down.v,
    upMonths: up.n,
    downMonths: down.n,
    beat: pairs.filter((p) => p.a > p.b).length,
    lineUp: pairs.filter((p) => p.a > 0).length,
    months: pairs.length,
  };
}

/**
 * Whether a capture figure is good for the holder, judged on the whole percent shown so a bar
 * reading "100%" is never coloured as a miss: taking at least all of the rise (up), or at most
 * all of the fall (down).
 */
export function captureIsGood(kind: "up" | "down", v: number): boolean {
  const shown = Math.round(v);
  return kind === "up" ? shown >= 100 : shown <= 100;
}
