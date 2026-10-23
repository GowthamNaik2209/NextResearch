// Server side of the basket backtest: fetch each stock's closes for the range (shared with the
// stock pop-up's cache) and run the pure backtest over them, bought and held or rebalanced by the
// strategy. Cached per basket composition and strategy.
import { cached } from "@/lib/live/cache";
import { getChartWithFallback, type ChartRange } from "@/lib/live/yahoo";
import { basketWeights, runBacktest, slackDaysFor, splitHeld, type BacktestExcluded, type BacktestHolding, type JoinOptions, type PricePoint } from "./backtest";
import { basketStock } from "./industry";
import { runRebalanced, targetWeights, type Rebalance } from "./rebalance";
import { isPlainHold, strategyQuery, type Strategy } from "./strategy";

/** A saved basket's own weighting. */
export type Weighting = "equal" | "mcap" | "custom";

export type BasketBacktest = {
  range: ChartRange;
  weighting: Strategy["weighting"];
  strategy: Strategy;
  /** Basket value, 100 on the first day (the comparison chart rebases it to 0% like any line). */
  points: PricePoint[];
  holdings: BacktestHolding[];
  excluded: BacktestExcluded[];
  /** Each stock's latest close in the range (for the move since it was added to a saved basket). */
  last: Record<string, number>;
  /** Rebalancing: total one-way turnover (% of the basket), trades, and each rebalance. 0 and [] when held. */
  turnover: number;
  trades: number;
  rebalances: Rebalance[];
};

// Upstream calls in flight at once: a 57-stock industry would otherwise fire 57 Yahoo requests together.
const CONCURRENCY = 8;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/**
 * @param opts `joinLate`: a stock listed during the period joins on its first trading day instead
 *   of being left out (the Recent listings rule-based basket: each stock backtested from its listing).
 */
export async function backtestBasket(tickers: string[], range: ChartRange, strategy: Strategy, opts: JoinOptions = {}): Promise<BasketBacktest> {
  const stocks = [...new Set(tickers)].map((t) => basketStock(t)).filter((s) => s !== null);
  // The plain held backtest keeps the cache key it has always had.
  const plain = isPlainHold(strategy);
  const sorted = stocks.map((s) => s.ticker).sort();
  const key = `basket3:${plain ? strategy.weighting : strategyQuery(strategy)}:${range}:${sorted.join(",")}${opts.joinLate ? ":J" : ""}`;
  const ttl = range === "3Y" || range === "5Y" || range === "MAX" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(key, ttl, async () => {
    const series = await mapLimit(stocks, CONCURRENCY, (s) => getChartWithFallback(s.ticker, range).catch(() => null));
    const slackDays = slackDaysFor(range);
    // Equal and market cap weigh the whole list, as they always have (a missing market cap gets
    // the list's median); custom weighs only the stocks actually held, so a stock with no prices
    // can't leave its share unspent.
    const caps = basketWeights(stocks, "mcap");
    let weights: Map<string, number>;
    if (strategy.weighting === "equal" || strategy.weighting === "mcap") weights = basketWeights(stocks, strategy.weighting);
    else {
      const { held } = splitHeld(
        stocks.map((s, i) => ({ ticker: s.ticker, weight: 1, points: series[i]?.points ?? null })),
        slackDays,
        opts,
      );
      weights = targetWeights(
        held.map((h) => ({ ticker: h.ticker, mcapCr: caps.get(h.ticker) ?? null })),
        strategy.weighting,
        strategy.weights,
      );
    }
    // A stock with no target is one the backtest leaves out anyway; any positive weight lets it
    // be reported with the right reason (no prices, or listed during the period).
    const input = stocks.map((s, i) => ({ ticker: s.ticker, weight: weights.get(s.ticker) ?? 1, points: series[i]?.points ?? null }));
    const result =
      strategy.rebalance === "never" ? { ...runBacktest(input, slackDays, opts), turnover: 0, trades: 0, rebalances: [] } : runRebalanced(input, slackDays, strategy.rebalance, strategy.band, opts);
    const last: Record<string, number> = {};
    stocks.forEach((s, i) => {
      const p = series[i]?.points;
      if (p?.length) last[s.ticker] = p[p.length - 1].c;
    });
    return { range, weighting: strategy.weighting, strategy, ...result, last };
  });
}
