// Trend: each company's past-year price return as a percentile among every covered company (99th =
// the highest returns, 1st = the lowest). The only simple signal that ranked covered stocks in the
// walk-forward test (docs/FACTOR-BACKTEST.md); it describes the past year, not a forecast, and it is
// kept apart from the projection's Base. Computed from the company table's own 1Y return (cagr[0]),
// so the pop-up, company page and baskets all show the same percentile on the same date. Pure: no
// server-only imports.
import type { SupplierFinancials } from "@/lib/sector-content";

/** A company with under a year of trading has no 1Y return, so no percentile. */
export const TREND_NONE = "Not enough history";
export const TREND_NOTE =
  "Where the past year's price return ranks among covered stocks: 90th percentile means it beat about 90% of them. In our test (monthly checks since Oct 2022), stocks at the 80th percentile and up went on to beat those below the 20th by about 7 points over the next 3 months on average, and fell behind in 8 of 46 checks. Past trend, not a forecast.";

/** 1 -> "1st", 22 -> "22nd", 13 -> "13th". */
export function ordinal(n: number): string {
  const r100 = n % 100;
  const suffix = r100 >= 11 && r100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export const trendLabel = (t: number | null | undefined): string => (t != null && Number.isFinite(t) ? `${ordinal(t)} percentile` : TREND_NONE);

/** How one return ranks among `returns` (every covered company's 1Y return): the working behind a percentile. */
export type TrendRank = { ret: number; n: number; below: number; equal: number; pct: number };

/** The share of the other ranked companies with a lower return (equal returns count half), rounded and kept
 * within 1-99 (the usual percentile scale: "0th" and "100th" read as errors). */
export function rankIn(sorted: number[], r: number): TrendRank {
  const n = sorted.length;
  // Lower and equal counts by binary search on the sorted returns.
  const first = (pred: (x: number) => boolean) => {
    let lo = 0, hi = n;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (pred(sorted[m])) hi = m; else lo = m + 1;
    }
    return lo;
  };
  const below = first((x) => x >= r);
  const equal = first((x) => x > r) - below;
  return { ret: r, n, below, equal, pct: n > 1 ? Math.min(99, Math.max(1, Math.round(((below + (equal - 1) / 2) / (n - 1)) * 100))) : 50 };
}

const oneYear = (f: SupplierFinancials) => {
  const r = f.cagr?.[0];
  return typeof r === "number" && Number.isFinite(r) ? r : null;
};

/** Every row's 1Y return, low to high: the population a percentile is ranked in. */
export function sortedReturns(rows: SupplierFinancials[]): number[] {
  return rows.map(oneYear).filter((r): r is number => r != null).sort((a, b) => a - b);
}

/** The working for one company's percentile (the method page's worked example), or null without a 1Y return. */
export function trendDetail(rows: SupplierFinancials[], ticker: string): TrendRank | null {
  const f = rows.find((x) => x.ticker === ticker);
  const r = f ? oneYear(f) : null;
  return r == null ? null : rankIn(sortedReturns(rows), r);
}

/** Each row with a 1Y return gets its percentile (rankIn). Rows are copied, never changed in place (the table is a cached object). */
export function withTrend(byTicker: Record<string, SupplierFinancials>): Record<string, SupplierFinancials> {
  const sorted = sortedReturns(Object.values(byTicker));
  return Object.fromEntries(
    Object.entries(byTicker).map(([k, f]) => {
      const r = oneYear(f);
      return [k, { ...f, trend: r == null ? null : rankIn(sorted, r).pct }];
    }),
  );
}
