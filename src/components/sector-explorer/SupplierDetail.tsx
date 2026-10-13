"use client";

import { useState } from "react";
import type { SectorDef } from "@/lib/sector-content";
import { tickerForSupplier } from "@/lib/sector-content";
import { WatchlistButton } from "./WatchlistButton";
import { useStockData } from "@/components/stock/useStockData";
import { mergeStats } from "@/components/stock/merge";
import type { StockTab } from "@/components/stock/types";
import { PriceTag } from "@/components/stock/PriceTag";
import { SummaryView } from "@/components/stock/SummaryView";
import { StockModal } from "@/components/stock/StockModal";

type Props = {
  sector: SectorDef;
  supplierKey: string;
  zoneSuppliers: string[];
  onSelectSupplier: (key: string) => void;
};

const TABS: { id: StockTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "chart", label: "Chart" },
  { id: "news", label: "News" },
  { id: "fundamentals", label: "Fundamentals" },
];

export function SupplierDetail({ sector, supplierKey, zoneSuppliers, onSelectSupplier }: Props) {
  const supplier = sector.suppliers[supplierKey];
  const ticker = tickerForSupplier(supplier);

  // Live data (Yahoo quote + Screener fundamentals) — no database involved. The
  // parent keys this component by supplierKey, so a supplier change remounts it.
  const { data: api, loading } = useStockData(ticker, supplier.listed);
  const [openTab, setOpenTab] = useState<StockTab | null>(null);
  const stats = mergeStats(supplier.f, api);

  const hasNav = zoneSuppliers.length > 1;
  const curIdx = zoneSuppliers.indexOf(supplierKey);
  const goPrev = () => onSelectSupplier(zoneSuppliers[(curIdx - 1 + zoneSuppliers.length) % zoneSuppliers.length]);
  const goNext = () => onSelectSupplier(zoneSuppliers[(curIdx + 1) % zoneSuppliers.length]);

  return (
    <div className="supplier-detail">
      <div className="supplier-head">
        {hasNav && (
          <button className="nav-arrow" title="Previous supplier" onClick={goPrev}>
            &#8249;
          </button>
        )}
        <div className="supplier-head-title">
          <h3 style={{ fontSize: 14.5 }}>
            {supplier.name}
            {supplier.listed && (
              <>
                <span className="fine" style={{ fontWeight: 400 }}>
                  {" "}
                  ({ticker})
                </span>
                <WatchlistButton ticker={ticker} />
              </>
            )}
          </h3>
          <p className="fine" style={{ marginTop: 4 }}>
            {supplier.role}
          </p>
        </div>
        {hasNav && (
          <button className="nav-arrow" title="Next supplier" onClick={goNext}>
            &#8250;
          </button>
        )}
      </div>
      {supplier.listed && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-ink-soft">{api?.quote ? `NSE${api.quote.delayedMin ? ` · ~${api.quote.delayedMin} min delayed` : ""}` : loading ? "Fetching live price…" : "Last known price"}</span>
            <PriceTag price={stats.price} quote={api?.quote ?? null} size="sm" />
          </div>
          <div role="group" aria-label="Open stock details" className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-panel-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpenTab(t.id)}
                className="rounded-lg px-1 py-2 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-panel hover:text-ink sm:text-xs"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
      {supplier.strengths && supplier.strengths.length > 0 && (
        <div className="max-[700px]:hidden">
          <div className="chart-label">Strengths</div>
          <ul className="unlisted-facts" style={{ marginTop: 4 }}>
            {supplier.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {supplier.risks && supplier.risks.length > 0 && (
        <div className="max-[700px]:hidden">
          <div className="chart-label">Risks</div>
          <ul className="unlisted-facts" style={{ marginTop: 4 }}>
            {supplier.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {!supplier.listed ? (
        <>
          <ul className="unlisted-facts">
            {(supplier.notes ?? []).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="source-line">Compiled from public reporting — not exchange-listed.</p>
        </>
      ) : (
        <SummaryView ticker={ticker} supplier={supplier} api={api} loading={loading} onOpenTab={setOpenTab} compact />
      )}
      {openTab && (
        <StockModal
          ticker={ticker}
          supplier={supplier}
          api={api}
          apiLoading={loading}
          initialTab={openTab}
          onClose={() => setOpenTab(null)}
        />
      )}
    </div>
  );
}
