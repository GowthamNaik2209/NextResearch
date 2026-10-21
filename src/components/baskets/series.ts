"use client";

import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import type { BacktestExcluded, BacktestHolding } from "@/lib/baskets/backtest";
import type { Rebalance } from "@/lib/baskets/rebalance";
import type { Strategy } from "@/lib/baskets/strategy";

// One client-side loader for every line a basket page draws, keyed like the Analysis charts:
// "s:TICKER" a stock, "b:id" an index, "x:<query>" a basket backtest (?sector=, ?id= or ?tickers=).
// Loaded series survive switching views and ranges; a request still running is shared.
export type Series = {
  points: PricePoint[];
  holdings?: BacktestHolding[];
  excluded?: BacktestExcluded[];
  last?: Record<string, number>;
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
  if (key.startsWith("s:")) return `/api/stock/${encodeURIComponent(id)}/chart?range=${range}`;
  if (key.startsWith("b:")) return `/api/benchmark/${encodeURIComponent(id)}/chart?range=${range}`;
  return `/api/baskets/backtest?${id}&range=${range}`;
};

export const cachedSeries = (key: string, range: ChartRange) => loaded.get(`${key}|${range}`);

export function loadSeries(key: string, range: ChartRange, fresh = false): Promise<Load> {
  const id = `${key}|${range}`;
  if (fresh) loaded.delete(id);
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

/**
 * The backtest query for a saved basket, under a strategy's query ("w=equal", see strategy.ts). `v` changes with its stocks, so an edit never reads a
 * response the browser cached for the old composition (private baskets are cached for a minute).
 */
export function savedBasketQuery(id: string, strategy: string, tickers: string[]) {
  let h = 0;
  for (const ch of [...tickers].sort().join(",")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `id=${encodeURIComponent(id)}&${strategy}&v=${(h >>> 0).toString(36)}`;
}
