// Server side of the basket backtest: fetch each stock's closes for the range (shared with the
// stock pop-up's cache) and run the pure backtest over them, bought and held or rebalanced by the
// strategy. Cached per basket composition and strategy.
import { after } from "next/server";
import { cached } from "@/lib/live/cache";
import type { ChartRange } from "@/lib/live/yahoo";
import { basketChart, basketSymbolChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
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
  /** 1M only (daily closes): each stock's move on `dayOf`, % (the Nifty 50 heatmap's 1D). */
  day?: Record<string, number>;
  /** The trading day `day` is for: the latest one most stocks have (stored closes end on the last
   * close, a stock fetched live from Yahoo also has today's), so every tile is the same day. */
  dayOf?: string;
  /** Rebalancing: total one-way turnover (% of the basket), trades, and each rebalance. 0 and [] when held. */
  turnover: number;
  trades: number;
  rebalances: Rebalance[];
  /** Stocks whose prices were still loading at the time budget (left out as no data this time). */
  pending?: string[];
};

// Upstream calls in flight at once: a 57-stock industry would otherwise fire 57 Yahoo requests together.
const CONCURRENCY = 8;
// How long a backtest waits for its stocks' prices. When Yahoo is slow or rate-limiting, a stock can
// take tens of seconds (a timeout, then Screener's fallback), and a big basket would run past the
// function's 60s limit and fail outright (504). Past this, a stock still loading counts as having no
// prices; its fetch carries on and fills the price cache, and the answer is kept only briefly, so
// a reload a moment later has it.
const PRICES_BUDGET_MS = 25_000;

/**
 * The promise's value, or null if it isn't settled by `deadline` (ms since the epoch); then `onLate`
 * is called and the promise is kept running after the response, so what it fetches is cached.
 */
export function byDeadline<T>(p: Promise<T | null>, deadline: number, onLate?: () => void): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>(
    (r) =>
      (timer = setTimeout(() => {
        onLate?.();
        try {
          after(() => p.catch(() => {}));
        } catch {
          // Outside a request (a script): nothing to keep alive.
        }
        r(null);
      }, Math.max(0, deadline - Date.now()))),
  );
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}

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
 * Each stock's move on one shared day, against its close before: the latest day at least 80% of
 * them have. Stored closes end on the last close and a stock fetched live from Yahoo also has
 * today's, so going by each stock's own last day mixed two days, and going by the most common last
 * day left the rest blank while a top-up was half done.
 */
export function dayMoves(list: { ticker: string; points: PricePoint[] | null }[]): { day: Record<string, number>; dayOf: string } | null {
  const withPrices = list.filter((x) => x.points?.length);
  const has = new Map<string, number>();
  // The last few days of each series are enough to find the shared one.
  for (const { points } of withPrices) for (const p of points!.slice(-5)) has.set(p.t, (has.get(p.t) ?? 0) + 1);
  const dayOf = [...has].filter(([, n]) => n >= withPrices.length * 0.8).sort((a, b) => b[0].localeCompare(a[0]))[0]?.[0];
  if (!dayOf) return null;
  const day: Record<string, number> = {};
  for (const { ticker, points } of list) {
    const i = points?.findIndex((p) => p.t === dayOf) ?? -1;
    if (i > 0 && points![i - 1].c > 0) day[ticker] = (points![i].c / points![i - 1].c - 1) * 100;
  }
  return { day, dayOf };
}

/**
 * A stock's closes on the range's window: the stored Nifty 50's first to last close (periods.ts
 * benchWindow), so every basket in a range starts and ends on the same days as the index it is
 * compared with. Without it, a stock read live from Yahoo (not in the store yet) carried today's
 * tick while the stored ones ended on the last close, mixing two days in one basket and ending
 * the basket a day after the Nifty 50 it was measured against. Before the window's first day only
 * the last close before it is kept, dated that day (the day-one price); MAX keeps every close (the index's
 * full history can start after a stock's).
 */
export function onBenchWindow(points: PricePoint[], calendar: string[], range: ChartRange): PricePoint[] {
  if (calendar.length < 2) return points;
  const to = calendar[calendar.length - 1];
  const from = range === "MAX" ? null : calendar[0];
  const out = points.filter((p) => p.t <= to);
  if (!from) return out;
  const i = out.findIndex((p) => p.t >= from);
  if (i < 0) return out.length ? [{ ...out[out.length - 1], t: from }] : out;
  // The close before the first day stands for it (a stock with no bar on that day), dated that day.
  return i > 0 && out[i].t > from ? [{ ...out[i - 1], t: from }, ...out.slice(i)] : out.slice(i);
}

/** Some stock's prices were still loading when the backtest stopped waiting (not a stock with no history). */
export const pricesPending = (r: Pick<BasketBacktest, "pending">) => !!r.pending?.length;

/**
 * @param opts `joinLate`: a stock listed during the period joins on its first trading day instead
 *   of being left out (the Recent listings rule-based basket: each stock backtested from its listing).
 */
export async function backtestBasket(tickers: string[], range: ChartRange, strategy: Strategy, opts: JoinOptions = {}): Promise<BasketBacktest> {
  const stocks = [...new Set(tickers)].map((t) => basketStock(t)).filter((s) => s !== null);
  // The plain held backtest keeps the cache key it has always had.
  const plain = isPlainHold(strategy);
  const sorted = stocks.map((s) => s.ticker).sort();
  const key = `basket4:${plain ? strategy.weighting : strategyQuery(strategy)}:${range}:${sorted.join(",")}${opts.joinLate ? ":J2" : ""}`;
  const ttl = range === "3Y" || range === "5Y" || range === "MAX" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(key, ttl, async () => {
    const deadline = Date.now() + PRICES_BUDGET_MS;
    const pending: string[] = [];
    // The range's trading days: the stored Nifty 50's, the line every basket is compared with.
    const niftyP = basketSymbolChart(BENCHMARKS.nifty50.symbol, range).catch(() => null);
    const [raw, nifty] = await Promise.all([
      mapLimit(stocks, CONCURRENCY, (s) => byDeadline(basketChart(s.ticker, range).catch(() => null), deadline, () => pending.push(s.ticker))),
      niftyP,
    ]);
    const days = nifty?.points.map((p) => p.t) ?? [];
    // Every stock on the Nifty's window, so the basket ends on its last close (onBenchWindow).
    const series = raw.map((d) => (d ? { ...d, points: onBenchWindow(d.points, days, range) } : d));
    const slackDays = slackDaysFor(range);
    // Joining at listing: the basket starts on the range's first day with the money for stocks not
    // yet listed waiting in cash, and the chart, statistics and drawdown all share that first day.
    if (opts.joinLate && !opts.calendar) opts = { ...opts, calendar: days };
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
    const daily = range === "1M" ? dayMoves(stocks.map((s, i) => ({ ticker: s.ticker, points: series[i]?.points ?? null }))) : null;
    return { range, weighting: strategy.weighting, strategy, ...result, last, ...(daily ?? {}), ...(pending.length ? { pending } : {}) };
    // A stock's prices still loading (Yahoo slow): kept 10 s, not the full TTL (the page asks again).
  }, pricesPending);
}
