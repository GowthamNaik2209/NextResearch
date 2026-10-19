// Server side of the basket backtest: fetch each stock's closes for the range (shared with the
// stock pop-up's cache) and run the pure backtest over them. Cached per basket composition.
import { cached } from "@/lib/live/cache";
import { getChartWithFallback, type ChartRange } from "@/lib/live/yahoo";
import { basketWeights, runBacktest, type BacktestExcluded, type BacktestHolding, type PricePoint } from "./backtest";
import { basketStock } from "./industry";

export type Weighting = "equal" | "mcap";

export type BasketBacktest = {
  range: ChartRange;
  weighting: Weighting;
  /** Basket value, 100 on the first day (the comparison chart rebases it to 0% like any line). */
  points: PricePoint[];
  holdings: BacktestHolding[];
  excluded: BacktestExcluded[];
  /** Each stock's latest close in the range (for the move since it was added to a saved basket). */
  last: Record<string, number>;
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

export async function backtestBasket(tickers: string[], range: ChartRange, weighting: Weighting): Promise<BasketBacktest> {
  const stocks = [...new Set(tickers)].map((t) => basketStock(t)).filter((s) => s !== null);
  const key = `basket3:${weighting}:${range}:${stocks.map((s) => s.ticker).sort().join(",")}`;
  const ttl = range === "3Y" || range === "5Y" || range === "MAX" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(key, ttl, async () => {
    const weights = basketWeights(stocks, weighting);
    const series = await mapLimit(stocks, CONCURRENCY, (s) => getChartWithFallback(s.ticker, range).catch(() => null));
    // Weekly bars on 3Y/5Y can start up to a week later than a daily-range stock would.
    const slackDays = range === "3Y" || range === "5Y" || range === "MAX" ? 35 : 10;
    const result = runBacktest(
      stocks.map((s, i) => ({ ticker: s.ticker, weight: weights.get(s.ticker) ?? 0, points: series[i]?.points ?? null })),
      slackDays,
    );
    const last: Record<string, number> = {};
    stocks.forEach((s, i) => {
      const p = series[i]?.points;
      if (p?.length) last[s.ticker] = p[p.length - 1].c;
    });
    return { range, weighting, ...result, last };
  });
}
