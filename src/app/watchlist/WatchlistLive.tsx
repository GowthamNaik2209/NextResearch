"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { isWatched, subscribeWatchlist } from "@/components/sector-explorer/WatchlistButton";

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

// Opens Create basket with the stocks still saved, as an unsaved draft (nothing is saved until
// "Create basket" there). Stays in place, greyed out, once every stock has been removed, so the
// header never re-flows.
export function WatchlistBacktest({ tickers, className }: { tickers: string[]; className: string }) {
  const still = useStillWatched(tickers);
  if (still.length === 0)
    return (
      <span aria-disabled className={className + " inline-flex cursor-default items-center opacity-40"} title="Your watchlist is empty">
        Save as a basket
      </span>
    );
  return (
    <Link href="/baskets/new?from=watchlist" className={className + " inline-flex items-center"}>
      Save as a basket
    </Link>
  );
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
