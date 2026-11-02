// The periods the Baskets page's industry section reads (its period menu, 1D to 3Y), and how each
// is measured. The backtest API serves 1M, 6M, 1Y and 3Y; the shorter cuts are read off a longer
// series (1D and 1W off 1M, 3M off 6M): from the last close on or before that many days back to the
// latest close. Shared by the browser's table and the stored figures (basket-returns.ts), so the two
// always read the same. Pure (no fetching).
import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import { shownPct } from "./fmt";
import { basketFigures, type BasketFigures } from "./stats";

export const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y"] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (v: unknown): v is Period => PERIODS.includes(v as Period);

export const PERIOD_SRC: Record<Period, { range: ChartRange; days: number | null }> = {
  "1D": { range: "1M", days: 1 },
  "1W": { range: "1M", days: 7 },
  "1M": { range: "1M", days: null },
  "3M": { range: "6M", days: 91 },
  "6M": { range: "6M", days: null },
  "1Y": { range: "1Y", days: null },
  "3Y": { range: "3Y", days: null },
};
export const PERIOD_WORDS: Record<Period, string> = {
  "1D": "the latest day",
  "1W": "the past week",
  "1M": "the past month",
  "3M": "the past 3 months",
  "6M": "the past 6 months",
  "1Y": "the past year",
  "3Y": "the past 3 years",
};
const DAY_MS = 86_400_000;

/** A series cut to the period: 1D is the latest two closes, longer cuts start at the last close on or before that many days back. */
export function cutTo(points: PricePoint[], period: Period): PricePoint[] {
  const { days } = PERIOD_SRC[period];
  if (days == null || points.length < 2) return points;
  if (days === 1) return points.slice(-2);
  const from = Date.parse(points[points.length - 1].t) - days * DAY_MS;
  let i = 0;
  while (i + 1 < points.length && Date.parse(points[i + 1].t) <= from) i++;
  return points.slice(i);
}

/**
 * "The Nifty 50 over a period": the stored index series (B:nifty50, basketSymbolChart: the price
 * store first) for the period's source range, cut to the period. Its first and last closes are the
 * period's fixed window: the same start and end day for every basket, row and header in that
 * period, whichever days its stocks start on.
 */
export function benchWindow(bench: PricePoint[], period: Period): PricePoint[] {
  return cutTo(bench, period);
}

/** The Nifty 50's change over the period's window, % (null with under two closes). */
export function benchPeriodRet(bench: PricePoint[] | null, period: Period): number | null {
  const w = bench?.length ? benchWindow(bench, period) : [];
  return w.length >= 2 && w[0].c > 0 ? (w[w.length - 1].c / w[0].c - 1) * 100 : null;
}

/**
 * A line moved onto a window's first and last days: closes outside it dropped, a close on the first
 * day added from its last close on or before it (or, starting later, its first close: the money
 * waits in cash until then, as a stock joining at its listing does), and its last close carried to
 * the window's last day. Read against the window, every line runs over the same dates.
 */
export function onWindow(points: PricePoint[], window: PricePoint[]): PricePoint[] {
  if (!points.length || window.length < 2) return points;
  const from = window[0].t;
  const to = window[window.length - 1].t;
  let base: PricePoint | null = null;
  const inside: PricePoint[] = [];
  for (const p of points) {
    if (p.t <= from) base = p;
    else if (p.t <= to) inside.push(p);
  }
  const out = [{ t: from, c: (base ?? inside[0] ?? points[0]).c }, ...inside];
  if (out[out.length - 1].t < to) out.push({ t: to, c: out[out.length - 1].c });
  return out;
}

/**
 * A basket's figures over a period, from its source range's series, measured over the period's
 * fixed window (benchWindow): the basket's return and fall over those days, and its lead over the
 * Nifty 50's change over the same window (benchPeriodRet), the gap between the two figures as
 * shown. With no benchmark, the basket's own series cut to the period, and no lead.
 */
export function periodFigures(points: PricePoint[], bench: PricePoint[] | null, period: Period): BasketFigures | null {
  const win = bench?.length ? benchWindow(bench, period) : [];
  if (win.length < 2) return basketFigures(cutTo(points, period), null);
  const fig = basketFigures(onWindow(points, win), null);
  const b = benchPeriodRet(bench, period);
  return fig && b != null ? { ...fig, vs: shownPct(fig.ret) - shownPct(b) } : fig;
}
