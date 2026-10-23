// Basket strategies on top of the backtest: target weights (equal, market cap, custom) and a backtest that puts the basket back to those targets on a schedule
// (monthly, quarterly, or when a stock drifts too far off target), counting the trades and
// turnover that takes. Pure (no fetching), so it is unit-tested on its own, like backtest.ts.
import { splitHeld, type BacktestInput, type BacktestResult, type JoinOptions } from "./backtest";
import { walkShares } from "./walk";
import { customTargets, type RebalanceRule, type WeightScheme } from "./strategy";

export type WeightStock = { ticker: string; mcapCr: number | null };

/** One rebalance: its date, the share of the basket traded (one way, %) and the stocks traded. */
export type Rebalance = { t: string; turnover: number; trades: number };

export type RebalancedResult = BacktestResult & {
  /** Sum of every rebalance's one-way turnover, % of the basket's value at the time. */
  turnover: number;
  /** Buys and sells, all rebalances together (the first day's purchase not counted). */
  trades: number;
  rebalances: Rebalance[];
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 1;
};

/**
 * Target weights (summing to 1) for the stocks actually held. Equal and market cap match
 * basketWeights (a stock with no market cap gets the median); custom takes each stock's own %
 * (see customTargets).
 */
export function targetWeights(stocks: WeightStock[], scheme: WeightScheme, custom?: Record<string, number>): Map<string, number> {
  const n = stocks.length;
  if (!n) return new Map();
  if (scheme === "equal") return new Map(stocks.map((s) => [s.ticker, 1 / n]));
  if (scheme === "custom") return customTargets(stocks.map((s) => s.ticker), custom);
  const med = median(stocks.map((s) => s.mcapCr).filter((v): v is number => v != null && v > 0));
  const raw = stocks.map((s) => (s.mcapCr && s.mcapCr > 0 ? s.mcapCr : med));
  const sum = raw.reduce((a, b) => a + b, 0);
  return new Map(stocks.map((s, i) => [s.ticker, raw[i] / sum]));
}

/**
 * Backtest with rebalancing. Bought at the target weights on the first day like runBacktest;
 * then, on the first bar of each new month or quarter, or on the bar after any stock has drifted
 * more than `band` percentage points off its target, every stock is traded back to its target at
 * that bar's close. The drift rule acts a bar late on purpose: it can't trade on the close it just
 * saw. No costs or taxes are taken; turnover and trade counts say how much trading it took.
 * Holdings report the target weight, the weight on the last day, the stock's own price change and
 * the points it added to the basket's return (they sum to the basket's return). With a start date
 * of its own or `opts.joinLate`, a stock listed during the period joins on its first bar, bought
 * with its target share set aside in cash since the first day: see walkShares.
 */
export function runRebalanced(input: BacktestInput[], slackDays: number, rule: RebalanceRule, band = 5, opts: JoinOptions = {}): RebalancedResult {
  const { held, excluded } = splitHeld(input, slackDays, opts);
  if (!held.length) return { points: [], holdings: [], excluded, turnover: 0, trades: 0, rebalances: [] };
  return { ...walkShares(held, slackDays, rule, band, opts.joinLate ? (opts.calendar ?? []) : []), excluded };
}
