"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SectorSupplier } from "@/lib/sector-content";
import { clearPendingSave, hasPendingSave, saveToWatchlist } from "@/components/sector-explorer/WatchlistButton";
import { StockModalHost } from "./StockModalHost";

// Mounted once in the root layout. `?stock=TICKER` on any page opens that stock's pop-up -
// it's where sign up / log in send someone who tapped a watchlist heart while signed out
// (see SavePrompt in WatchlistButton), and if that save is still pending it completes here.
// Closing the pop-up drops the param so a refresh doesn't reopen it.
export function ReturnToStock() {
  const ticker = useSearchParams().get("stock");
  const [open, setOpen] = useState<{ ticker: string; supplier: SectorSupplier } | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stock/${encodeURIComponent(ticker)}/supplier`).catch(() => null);
      const data = res?.ok ? ((await res.json()) as { supplier?: SectorSupplier }) : null;
      if (cancelled || !data?.supplier) return;
      if (hasPendingSave(ticker) && (await saveToWatchlist(ticker))) clearPendingSave();
      if (!cancelled) setOpen({ ticker, supplier: data.supplier });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Stable, since StockModal re-runs its focus / scroll-lock effect whenever onClose changes.
  const close = useCallback(() => {
    setOpen(null);
    // Opened by a StockLink click (its own history entry): step back, so Back/close agree.
    if ((window.history.state as { nrStock?: boolean } | null)?.nrStock) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("stock");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  if (!open || open.ticker !== ticker) return null;
  return <StockModalHost ticker={open.ticker} supplier={open.supplier} onClose={close} />;
}
