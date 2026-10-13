"use client";

import { useEffect, useState } from "react";
import type { StockApi } from "./types";

// One fetch per selected company (the parent keys SupplierDetail by supplier, so
// it remounts on change). `data` stays null on any failure — every consumer
// falls back to the static seed figures rather than showing an error.
export function useStockData(ticker: string, enabled: boolean) {
  const [data, setData] = useState<StockApi | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(`/api/stock/${encodeURIComponent(ticker)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: StockApi) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ticker, enabled]);

  return { data, loading };
}
