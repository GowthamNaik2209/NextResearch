"use client";

import { useSyncExternalStore } from "react";
import { isWatched, subscribeWatchlist } from "@/components/sector-explorer/WatchlistButton";
import { NewBasketButton } from "@/components/baskets/NewBasketButton";

// The page is rendered with the list as it was on load; rows can then be removed (or put back)
// without a reload. These follow the shared heart state so the parts that depend on the whole
// list - the backtest button and the news - never act on stocks that were just removed.

/** The tickers still saved (a ticker counts as saved until the shared list says otherwise). */
function useStillWatched(tickers: string[]): string[] {
  const key = useSyncExternalStore(
    subscribeWatchlist,
    () => tickers.filter((t) => isWatched(t) !== false).join(","),
    () => tickers.join(",")
  );
  return key ? key.split(",") : [];
}

export function WatchlistBacktest({ tickers, className }: { tickers: string[]; className: string }) {
  const still = useStillWatched(tickers);
  if (still.length === 0) return null;
  return <NewBasketButton tickers={still} name="My watchlist basket" label="Save as a basket" className={className} />;
}

/** The news section, hidden once every stock it covers has been removed. */
export function WatchlistNewsGate({ tickers, children }: { tickers: string[]; children: React.ReactNode }) {
  const still = useStillWatched(tickers);
  if (still.length === 0) return null;
  return (
    <>
      {children}
      {still.length < tickers.length && <p className="mt-2 text-[11px] text-ink-soft">News for the stocks you just removed drops off when the page reloads.</p>}
    </>
  );
}
