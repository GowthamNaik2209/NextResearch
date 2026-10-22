"use client";

import { useState, useSyncExternalStore } from "react";
import type { SectorSupplier } from "@/lib/sector-content";
import { WatchlistButton, isWatched, subscribeWatchlist } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";

// One watchlist row with its own heart, so a stock can be removed right here. Every heart for a
// ticker shares one state (WatchlistButton), so removing it from the row's pop-up flips this
// row's heart too; the row follows that shared state and collapses to a "removed" line at once -
// no reload - with the heart still there to put it back.
export function WatchlistRow({
  ticker,
  name,
  supplier,
  className,
  children,
}: {
  ticker: string;
  name: string;
  supplier: SectorSupplier | null;
  className: string;
  children: React.ReactNode;
}) {
  // null until the shared list has loaded; only a saved -> not saved change means "removed".
  const liked = useSyncExternalStore(subscribeWatchlist, () => isWatched(ticker), () => null);
  const [prevLiked, setPrevLiked] = useState(liked);
  const [removed, setRemoved] = useState(false);
  if (liked !== prevLiked) {
    // Adjusting state while rendering (React's pattern for reacting to a changed value).
    setPrevLiked(liked);
    if (liked) setRemoved(false);
    else if (prevLiked === true && liked === false) setRemoved(true);
  }

  const heart = (
    <span className="flex-none">
      <WatchlistButton ticker={ticker} name={name} />
    </span>
  );
  const body = removed ? (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink">{name}</span> removed from your watchlist.
      </p>
      <span className="flex flex-none items-center gap-1 text-xs text-ink-soft">
        Undo {heart}
      </span>
    </div>
  ) : (
    <div className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
      {heart}
    </div>
  );

  return supplier ? (
    <OpenStockCard ticker={ticker} supplier={supplier} className={className + (removed ? " opacity-80" : "")}>
      {body}
    </OpenStockCard>
  ) : (
    <div className={className}>{body}</div>
  );
}
