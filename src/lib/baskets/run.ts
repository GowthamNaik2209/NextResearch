// Server side of the basket backtest: fetch each stock's closes for the range (shared with the
// stock pop-up's cache) and run the pure backtest over them, bought and held or rebalanced by the
// strategy. Cached per basket composition and strategy.
import { cached } from "@/lib/live/cache";
import { getChartWithFallback, type ChartRange } from "@/lib/live/yahoo";
import { basketWeights, runBacktest, splitHeld, type BacktestExcluded, type BacktestHolding, type PricePoint } from "./backtest";
import { basketStock } from "./industry";
import { runRebalanced, targetWeights, type Rebalance } from "./rebalance";
import { isPlainHold, strategyQuery, type Strategy } from "./strategy";

/** A saved basket's own weighting (layer-balanced lives only in the page's URL). */
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
 * @param layers each stock's value-chain layer where the caller knows a better one than the stock's
 *   primary (an industry basket reads layers within that industry); used by the layer-balanced
 *   weighting.
 */
export async function backtestBasket(tickers: string[], range: ChartRange, strategy: Strategy, layers?: Map<string, string>): Promise<BasketBacktest> {
  const stocks = [...new Set(tickers)].map((t) => basketStock(t)).filter((s) => s !== null);
  // The plain held backtest keeps the cache key it has always had; layers only matter to the
  // weightings that read them.
  const plain = isPlainHold(strategy);
  const sorted = stocks.map((s) => s.ticker).sort();
  const byLayer = layers && (strategy.weighting === "layer") ? `:L${layerHash(sorted.map((t) => layers.get(t) ?? ""))}` : "";
  const key = `basket3:${plain ? strategy.weighting : strategyQuery(strategy)}:${range}:${sorted.join(",")}${byLayer}`;
  const ttl = range === "3Y" || range === "5Y" || range === "MAX" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(key, ttl, async () => {
    const series = await mapLimit(stocks, CONCURRENCY, (s) => getChartWithFallback(s.ticker, range).catch(() => null));
    // Weekly bars on 3Y/5Y can start up to a week later than a daily-range stock would.
    const slackDays = range === "3Y" || range === "5Y" || range === "MAX" ? 35 : 10;
    // Equal and market cap weigh the whole list, as they always have (a missing market cap gets
    // the list's median); custom and layer-balanced weigh only the stocks actually held, so a stock
    // with no prices can't leave its layer short or its share unspent.
    const caps = basketWeights(stocks, "mcap");
    let weights: Map<string, number>;
    if (strategy.weighting === "equal" || strategy.weighting === "mcap") weights = basketWeights(stocks, strategy.weighting);
    else {
      const { held } = splitHeld(
        stocks.map((s, i) => ({ ticker: s.ticker, weight: 1, points: series[i]?.points ?? null })),
        slackDays,
      );
      const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
      weights = targetWeights(
        held.map((h) => ({ ticker: h.ticker, mcapCr: caps.get(h.ticker) ?? null, layer: layers?.get(h.ticker) ?? byTicker.get(h.ticker)!.layer })),
        strategy.weighting,
        strategy.weights,
      );
    }
    // A stock with no target is one the backtest leaves out anyway; any positive weight lets it
    // be reported with the right reason (no prices, or listed during the period).
    const input = stocks.map((s, i) => ({ ticker: s.ticker, weight: weights.get(s.ticker) ?? 1, points: series[i]?.points ?? null }));
    const result =
      strategy.rebalance === "never" ? { ...runBacktest(input, slackDays), turnover: 0, trades: 0, rebalances: [] } : runRebalanced(input, slackDays, strategy.rebalance, strategy.band);
    const last: Record<string, number> = {};
    stocks.forEach((s, i) => {
      const p = series[i]?.points;
      if (p?.length) last[s.ticker] = p[p.length - 1].c;
    });
    return { range, weighting: strategy.weighting, strategy, ...result, last };
  });
}

const layerHash = (xs: string[]) => {
  let h = 0;
  for (const ch of xs.join("|")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
};
