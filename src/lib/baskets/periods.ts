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
 * A basket's figures over a period, from its source range's series. Too few closes for the lead's
 * usual measure (1D, 1W): the lead is the plain gap between the two returns over the same dates.
 */
export function periodFigures(points: PricePoint[], bench: PricePoint[] | null, period: Period): BasketFigures | null {
  const pts = cutTo(points, period);
  const fig = basketFigures(pts, bench);
  if (!fig || fig.vs != null || !bench?.length || pts.length < 2) return fig;
  const at = (t: string) => [...bench].reverse().find((p) => p.t <= t)?.c;
  const b0 = at(pts[0].t);
  const b1 = at(pts[pts.length - 1].t);
  return b0 && b1 ? { ...fig, vs: shownPct(fig.ret) - shownPct((b1 / b0 - 1) * 100) } : fig;
}
