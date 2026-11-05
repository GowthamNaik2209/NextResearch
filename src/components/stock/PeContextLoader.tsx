"use client";

import { useEffect, useState } from "react";
import type { PeContext } from "@/lib/valuation/pe-context";
import { PeContextView } from "./PeContextView";

// The pop-up's copy of "P/E in context", fetched once per ticker (the company page renders it on the
// server). Nothing shows while it loads or when there is none (a REIT, a loss-maker, too little history).
const cache = new Map<string, PeContext | null>();

export function PeContextLoader({ ticker, className }: { ticker: string; className?: string }) {
  const [ctx, setCtx] = useState<PeContext | null>(() => cache.get(ticker) ?? null);
  // The parent keys this by ticker, so a new stock starts from its own cached copy.
  useEffect(() => {
    if (cache.has(ticker)) return;
    let live = true;
    fetch(`/api/stock/${encodeURIComponent(ticker)}/valuation`)
      .then((r) => (r.ok ? (r.json() as Promise<PeContext>) : null))
      .catch(() => null)
      .then((v) => {
        // A failed fetch isn't remembered: the next open tries again.
        if (v) cache.set(ticker, v);
        if (live) setCtx(v);
      });
    return () => {
      live = false;
    };
  }, [ticker]);
  return ctx ? <PeContextView ctx={ctx} ticker={ticker} className={className} /> : null;
}
