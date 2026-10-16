"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SectorSupplier } from "@/lib/sector-content";
import { clearPendingSave, hasPendingSave, saveToWatchlist } from "@/components/sector-explorer/WatchlistButton";
import { StockModalHost } from "./StockModalHost";
import { StockModalSkeleton } from "./StockModal";
import { fetchStock, fetchSupplier } from "./useStockData";

// Mounted once in the root layout. `?stock=TICKER` on any page opens that stock's pop-up -
// it's where sign up / log in send someone who tapped a watchlist heart while signed out
// (see SavePrompt in WatchlistButton), and if that save is still pending it completes here.
// Closing the pop-up drops the param so a refresh doesn't reopen it.
export function ReturnToStock() {
  const ticker = useSearchParams().get("stock");
  const [open, setOpen] = useState<{ ticker: string; supplier: SectorSupplier } | null>(null);
  // A ticker that turned out not to exist, or whose pop-up was just closed (closing steps back
  // through history, so `?stock=` lingers for a moment): render nothing for it, not the skeleton.
  const [hidden, setHidden] = useState<string | null>(null);
  const [prevTicker, setPrevTicker] = useState(ticker);
  if (prevTicker !== ticker) {
    // A new `?stock=` value (including re-opening the same one after it was cleared) shows again.
    setPrevTicker(ticker);
    setHidden(null);
  }

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    // Start the live-data request alongside the supplier record instead of after it; both are
    // de-duplicated, so StockModalHost picks up this same request.
    void fetchStock(ticker);
    (async () => {
      const supplier = await fetchSupplier(ticker);
      if (cancelled) return;
      if (!supplier) {
        setHidden(ticker);
        return;
      }
      if (hasPendingSave(ticker) && (await saveToWatchlist(ticker))) clearPendingSave();
      if (!cancelled) setOpen({ ticker, supplier });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Stable, since StockModal re-runs its focus / scroll-lock effect whenever onClose changes.
  const close = useCallback(() => {
    setOpen(null);
    setHidden(new URL(window.location.href).searchParams.get("stock"));
    // Opened by a StockLink click (its own history entry): step back, so Back/close agree.
    if ((window.history.state as { nrStock?: boolean } | null)?.nrStock) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("stock");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  if (!ticker || hidden === ticker) return null;
  if (!open || open.ticker !== ticker) return <StockModalSkeleton ticker={ticker} onClose={close} />;
  return <StockModalHost ticker={open.ticker} supplier={open.supplier} onClose={close} />;
}
