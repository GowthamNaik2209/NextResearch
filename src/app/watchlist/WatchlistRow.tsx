"use client";

import { useEffect, useRef, useState } from "react";
import type { SectorSupplier } from "@/lib/sector-content";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";

// One watchlist row with its own heart, so a stock can be removed right here. Every heart for a
// ticker shares one state (WatchlistButton), so removing it from the row's pop-up flips this
// row's heart too; the row watches that heart and collapses to a "removed" line at once - no
// reload - with the heart still there to put it back.
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
  const heartRef = useRef<HTMLSpanElement>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const btn = heartRef.current?.querySelector("button");
    if (!btn) return;
    // The heart starts unpressed until the shared list loads, so only a pressed -> unpressed
    // change means "removed".
    let wasLiked = btn.getAttribute("aria-pressed") === "true";
    const mo = new MutationObserver(() => {
      const liked = btn.getAttribute("aria-pressed") === "true";
      if (liked) setRemoved(false);
      else if (wasLiked) setRemoved(true);
      wasLiked = liked;
    });
    mo.observe(btn, { attributes: true, attributeFilter: ["aria-pressed"] });
    return () => mo.disconnect();
    // The heart moves between the two layouts below (a new button), so watch the new one.
  }, [removed]);

  const heart = (
    <span ref={heartRef} className="flex-none">
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
