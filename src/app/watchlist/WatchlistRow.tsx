"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SectorSupplier } from "@/lib/sector-content";
import { WatchlistButton, isWatched, restoreToWatchlist, subscribeWatchlist } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";

// One watchlist row with its own heart, so a stock can be removed right here. Every heart for a
// ticker shares one state (WatchlistButton), so removing it from the row's pop-up flips this
// row's heart too; the row follows that shared state and shows a "Removed X · Undo" line in its
// place at once - no reload.
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
  const [undo, setUndo] = useState<"idle" | "saving" | "failed">("idle");
  if (liked !== prevLiked) {
    // Adjusting state while rendering (React's pattern for reacting to a changed value).
    setPrevLiked(liked);
    if (liked) {
      setRemoved(false);
      setUndo("idle");
    } else if (prevLiked === true && liked === false) setRemoved(true);
  }

  const undoRef = useRef<HTMLButtonElement>(null);
  // Removed with this row's own heart, focus was on a button that is gone: hand it to Undo.
  useEffect(() => {
    if (removed && (document.activeElement === document.body || document.activeElement == null)) undoRef.current?.focus();
  }, [removed]);

  const restore = async () => {
    setUndo("saving");
    setUndo((await restoreToWatchlist(ticker)) ? "idle" : "failed");
  };

  // Removed, the row keeps its height (its content stays laid out, hidden) so the rows and the
  // news below don't move; one short line sits across it with a real Undo button. The card stops
  // opening the pop-up meanwhile, so a click on or around Undo can never open it instead.
  const body = (
    <div className="relative">
      <div aria-hidden={removed || undefined} className={"flex items-start gap-2 " + (removed ? "invisible" : "")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
        {!removed && (
          <span className="flex-none">
            <WatchlistButton ticker={ticker} name={name} />
          </span>
        )}
      </div>
      {removed && (
        <div role="status" className="absolute inset-0 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-ink-soft">
            Removed <span className="font-semibold text-ink">{name}</span>
            {undo === "failed" && <span className="text-danger"> · couldn&rsquo;t put it back, try again</span>}
          </p>
          <button
            ref={undoRef}
            type="button"
            onClick={restore}
            disabled={undo === "saving"}
            aria-label={`Undo: put ${name} back on your watchlist`}
            className="min-h-9 flex-none rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );

  // Dashed and flat while removed: reads as a placeholder, not a card to open.
  const boxClass = removed ? className.replace("bg-panel", "bg-transparent border-dashed").replace("hover:border-accent", "") : className;
  return supplier ? (
    <OpenStockCard ticker={ticker} supplier={supplier} disabled={removed} className={boxClass}>
      {body}
    </OpenStockCard>
  ) : (
    <div className={boxClass}>{body}</div>
  );
}
