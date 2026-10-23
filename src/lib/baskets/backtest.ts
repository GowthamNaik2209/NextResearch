// Backtest of a basket over a chart range: bought once on the first day at the target weights
// and held (not rebalanced), so each stock's share drifts with its price - what an investor who
// bought the basket that day would hold now. Price change only: dividends are not added back.
// Pure (no fetching), so it is unit-tested on its own.
import { basketStart, isLate, walkShares } from "./walk";

export type PricePoint = { t: string; c: number };

export type BacktestHolding = {
  ticker: string;
  /** Share of the basket on the first day (0-1). */
  weight: number;
  /** Share of the basket on the last day, after the price moves (0-1). */
  endWeight: number;
  /** The stock's own price change over the period, % */
  ret: number;
  /** Percentage points of the basket's return this stock accounts for (they sum to the basket's return). */
  contribution: number;
  /** Set when the stock joined after the first day (its start date, see BacktestInput.from): the day it was bought. */
  joined?: string;
};

/** Left out: no prices, listed mid-period ("late"), or set to 0% in a custom weighting ("zero"). */
export type BacktestExcluded = { ticker: string; reason: "no-data" | "late" | "zero"; from?: string };

export type BacktestResult = {
  /** Basket value, 100 on the first day. */
  points: PricePoint[];
  holdings: BacktestHolding[];
  excluded: BacktestExcluded[];
};

/**
 * How much later than the earliest line a line may start and still count as there from day one.
 * Weekly bars (3Y and longer) can start up to a week after a daily-range one, so they get more.
 * The backtest, the chart and the return cards all use this, so they agree on who is "late".
 */
export const slackDaysFor = (range: string) => (range === "3Y" || range === "5Y" || range === "MAX" ? 35 : 10);

/**
 * `from`: the stock's own start date (an ISO day). Bars before it are ignored, and when it falls
 * after the basket's first day the stock joins the basket on its first bar from then (see
 * JoinOptions) instead of being left out.
 */
export type BacktestInput = { ticker: string; weight: number; points: PricePoint[] | null; from?: string };
export type HeldInput = { ticker: string; weight: number; points: PricePoint[]; from?: string };

/**
 * `joinLate`: a stock whose history starts after the basket's first day (listed during the period)
 * joins on its first bar, as if its start date were its listing day, rather than being left out.
 *
 * How a stock joins (the same for every weighting and rebalancing rule): on its first bar it is
 * bought at its target share among the stocks then held (equal weight: 1/k of the basket with k
 * stocks held after it joins), paid for by selling the others in proportion to what they are
 * worth then. No money comes in or out, so the basket's value carries on unbroken, each stock's
 * return runs from the day it joined, and the points each stock added still sum to the return.
 */
export type JoinOptions = { joinLate?: boolean };

/**
 * The stocks a backtest holds, and the rest with the reason: no price data, or a history that
 * starts more than `slackDays` after the earliest one (listed mid-period), unless that stock joins
 * late (a start date of its own, or `joinLate`), when it is held from its first bar.
 */
export function splitHeld(input: BacktestInput[], slackDays: number, opts: JoinOptions = {}): { held: HeldInput[]; excluded: BacktestExcluded[] } {
  const excluded: BacktestExcluded[] = [];
  const trimmed = input.map((s) => (s.from && s.points ? { ...s, points: s.points.filter((p) => p.t >= s.from!) } : s));
  const withData = trimmed.filter((s) => {
    const ok = !!s.points && s.points.length > 1 && s.weight > 0;
    if (!ok) excluded.push({ ticker: s.ticker, reason: s.weight === 0 && s.points && s.points.length > 1 ? "zero" : "no-data" });
    return ok;
  }) as HeldInput[];
  if (!withData.length) return { held: [], excluded };
  const start = basketStart(withData);
  const held = withData.filter((s) => {
    const out = isLate(s, start, slackDays) && !(opts.joinLate || s.from);
    if (out) excluded.push({ ticker: s.ticker, reason: "late", from: s.points[0].t });
    return !out;
  });
  return { held, excluded };
}

/** Whether any held stock joins after the first day (so the backtest needs the joining walk). */
export function hasJoiners(held: HeldInput[], slackDays: number): boolean {
  if (!held.length) return false;
  const start = basketStart(held);
  return held.some((s) => isLate(s, start, slackDays));
}

/**
 * @param input each stock's target weight (any positive scale) and its closes, oldest first
 * @param slackDays a stock whose history starts more than this long after the earliest one
 *   (listed mid-period) can't have been bought on day one, so it is left out and reported (or,
 *   with a start date of its own or `opts.joinLate`, joins on its first bar: see JoinOptions)
 */
export function runBacktest(input: BacktestInput[], slackDays: number, opts: JoinOptions = {}): BacktestResult {
  const { held, excluded } = splitHeld(input, slackDays, opts);
  if (!held.length) return { points: [], holdings: [], excluded };
  // Stocks joining mid-period: the share-based walk (walk.ts, shared with the rebalanced backtest)
  // buys each on its first bar. Without them this simpler walk is kept, so every figure it has
  // always produced is unchanged.
  if (hasJoiners(held, slackDays)) {
    const { points, holdings } = walkShares(held, slackDays, "never");
    return { points, holdings, excluded };
  }
  const total = held.reduce((n, s) => n + s.weight, 0);

  // Walk the union of trading dates, carrying each stock's last close forward over days it has
  // no bar (a holiday on one exchange, a suspended day). Before a stock's first bar (a few days'
  // slack at most) it counts at its first close, i.e. flat.
  const dates = [...new Set(held.flatMap((s) => s.points.map((p) => p.t)))].sort();
  const cursor = held.map(() => 0);
  const base = held.map((s) => s.points[0].c);
  const points: PricePoint[] = [];
  let lastRel: number[] = held.map(() => 1);
  for (const t of dates) {
    let value = 0;
    lastRel = held.map((s, i) => {
      while (cursor[i] + 1 < s.points.length && s.points[cursor[i] + 1].t <= t) cursor[i]++;
      const rel = s.points[cursor[i]].c / base[i];
      value += (s.weight / total) * rel;
      return rel;
    });
    points.push({ t, c: value * 100 });
  }

  const endValue = points[points.length - 1].c / 100;
  const holdings = held.map((s, i) => {
    const w = s.weight / total;
    return {
      ticker: s.ticker,
      weight: w,
      endWeight: (w * lastRel[i]) / endValue,
      ret: (lastRel[i] - 1) * 100,
      contribution: w * (lastRel[i] - 1) * 100,
    };
  });
  return { points, holdings, excluded };
}

/** Weights for a basket: equal, or by market cap (a stock with no figure gets the median cap). */
export function basketWeights(stocks: { ticker: string; mcapCr: number | null }[], scheme: "equal" | "mcap"): Map<string, number> {
  if (scheme === "equal") return new Map(stocks.map((s) => [s.ticker, 1]));
  const known = stocks.map((s) => s.mcapCr).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  return new Map(stocks.map((s) => [s.ticker, s.mcapCr && s.mcapCr > 0 ? s.mcapCr : median]));
}
