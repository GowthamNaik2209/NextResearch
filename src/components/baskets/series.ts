import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import type { BacktestExcluded, BacktestHolding } from "@/lib/baskets/backtest";
import type { Rebalance } from "@/lib/baskets/rebalance";
import { shortHash, type Strategy } from "@/lib/baskets/strategy";

// One client-side loader for every line a basket page draws, keyed like the Analysis charts:
// "s:TICKER" a stock, "b:id" an index, "x:<query>" a basket backtest (?sector=, ?id= or ?tickers=).
// "S:TICKER" and "B:id" are the same lines read from the price store first (Yahoo only for what it
// lacks), as basket backtests are: for past returns, where today's live tick doesn't matter.
/** An index's line, either way ("b:" or "B:"). */
export const isBenchKey = (key: string) => /^[bB]:/.test(key);
// Loaded series survive switching views and ranges; a request still running is shared. A failed
// load is not kept, so asking again (Retry) fetches it afresh. Components read it through
// useSeries (use-series.ts).
export type Series = {
  points: PricePoint[];
  holdings?: BacktestHolding[];
  excluded?: BacktestExcluded[];
  last?: Record<string, number>;
  /** 1M basket backtests: each stock's move on `dayOf` (the latest trading day most stocks have), %. */
  day?: Record<string, number>;
  dayOf?: string;
  /** Stocks whose prices were still loading when the backtest answered (shown as loading, asked again). */
  pending?: string[];
  /** Basket backtests: the strategy it ran and the trading its rebalancing took. */
  strategy?: Strategy;
  turnover?: number;
  trades?: number;
  rebalances?: Rebalance[];
};
export type Load = { status: "loading" } | { status: "ok"; data: Series } | { status: "error" };

const loaded = new Map<string, Series>();
const inflight = new Map<string, Promise<Load>>();

const urlFor = (key: string, range: ChartRange) => {
  const id = key.slice(2);
  const stored = key[0] === "S" || key[0] === "B" ? "&store=1" : "";
  if (/^[sS]:/.test(key)) return `/api/stock/${encodeURIComponent(id)}/chart?range=${range}${stored}`;
  if (isBenchKey(key)) return `/api/benchmark/${encodeURIComponent(id)}/chart?range=${range}${stored}`;
  return `/api/baskets/backtest?${id}&range=${range}`;
};

export function loadSeries(key: string, range: ChartRange): Promise<Load> {
  const id = `${key}|${range}`;
  const hit = loaded.get(id);
  if (hit) return Promise.resolve({ status: "ok", data: hit });
  let p = inflight.get(id);
  if (!p) {
    p = fetch(urlFor(key, range))
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Series) => {
        loaded.set(id, data);
        return { status: "ok", data } as const;
      })
      .catch(() => ({ status: "error" }) as const)
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

/** Drops a loaded series, so the next load fetches it again (a backtest whose prices were still loading). */
export function forgetSeries(key: string, range: ChartRange) {
  loaded.delete(`${key}|${range}`);
}

/**
 * The backtest query for a saved basket, under a strategy's query ("w=equal", see strategy.ts). `v` changes with its stocks, so an edit never reads a
 * response the browser cached for the old composition (private baskets are cached for a minute).
 */
export function savedBasketQuery(id: string, strategy: string, tickers: string[]) {
  return `id=${encodeURIComponent(id)}&${strategy}&v=${shortHash([...tickers].sort().join(","))}`;
}

/** An industry basket's backtest key: every listed stock it maps, under a strategy ("w=equal" by default). */
export const industrySeriesKey = (slug: string, strategy = "w=equal") => `x:sector=${slug}&${strategy}`;
