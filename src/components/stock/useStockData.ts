"use client";

import { useEffect, useState } from "react";
import type { SectorSupplier } from "@/lib/sector-content";
import type { StockApi } from "./types";

// Module-level request cache shared by every pop-up / panel on the page. Without it the same
// ticker was fetched up to three times per open (React's dev double-mount, ReturnToStock and
// StockModalHost each starting their own request). Entries hold the in-flight promise, so
// concurrent callers share one request; results are reused briefly (the API itself is
// CDN-cached for 5 min), failures are forgotten at once so the next open retries.
const STOCK_TTL_MS = 60_000;
const stockReqs = new Map<string, { at: number; promise: Promise<StockApi | null>; value?: StockApi | null }>();

export function fetchStock(ticker: string): Promise<StockApi | null> {
  const hit = stockReqs.get(ticker);
  if (hit && Date.now() - hit.at < STOCK_TTL_MS) return hit.promise;
  const entry: { at: number; promise: Promise<StockApi | null>; value?: StockApi | null } = { at: Date.now(), promise: Promise.resolve(null) };
  entry.promise = fetch(`/api/stock/${encodeURIComponent(ticker)}`)
    .then((r) => (r.ok ? (r.json() as Promise<StockApi>) : null))
    .catch(() => null)
    .then((d) => {
      if (d) entry.value = d;
      else stockReqs.delete(ticker);
      return d;
    });
  stockReqs.set(ticker, entry);
  return entry.promise;
}

/** Already-loaded data for `ticker`, if any - lets a re-opened pop-up render live figures on its first frame. */
function peekStock(ticker: string): StockApi | null {
  const hit = stockReqs.get(ticker);
  return hit && Date.now() - hit.at < STOCK_TTL_MS ? (hit.value ?? null) : null;
}

// The authored supplier record never changes during a visit, so cache it for the page's life.
const supplierReqs = new Map<string, Promise<SectorSupplier | null>>();
export function fetchSupplier(ticker: string): Promise<SectorSupplier | null> {
  let p = supplierReqs.get(ticker);
  if (!p) {
    p = fetch(`/api/stock/${encodeURIComponent(ticker)}/supplier`)
      .then((r) => (r.ok ? (r.json() as Promise<{ supplier?: SectorSupplier }>) : null))
      .then((d) => d?.supplier ?? null)
      .catch(() => null);
    p.then((s) => !s && supplierReqs.delete(ticker));
    supplierReqs.set(ticker, p);
  }
  return p;
}

// `data` stays null on any failure — every consumer falls back to the company-table figures
// rather than showing an error.
export function useStockData(ticker: string, enabled: boolean) {
  const [state, setState] = useState(() => {
    const cached = enabled ? peekStock(ticker) : null;
    return { ticker, data: cached, loading: enabled && !cached };
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchStock(ticker).then((d) => !cancelled && setState({ ticker, data: d, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [ticker, enabled]);

  // A ticker change (panel reused for another company) shows that company's loading state,
  // never the previous one's figures.
  if (state.ticker !== ticker) return { data: null, loading: enabled };
  return { data: state.data, loading: state.loading };
}
