"use client";

import type { SectorSupplier } from "@/lib/sector-content";
import type { StockTab } from "./types";
import { StockModal } from "./StockModal";
import { useStockData } from "./useStockData";

// Self-contained pop-up for places outside the 3D explorer (watchlist, company lists):
// fetches the live data itself, then renders the same pop-up the explorer uses.
export function StockModalHost({
  ticker,
  supplier,
  initialTab = "summary",
  onClose,
}: {
  ticker: string;
  supplier: SectorSupplier;
  initialTab?: StockTab;
  onClose: () => void;
}) {
  const { data, loading } = useStockData(ticker, supplier.listed);
  return <StockModal ticker={ticker} supplier={supplier} api={data} apiLoading={loading} initialTab={initialTab} onClose={onClose} />;
}
