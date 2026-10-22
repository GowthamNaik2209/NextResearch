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
import { quoteTiming } from "@/lib/live/freshness";

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
                <WatchlistButton ticker={ticker} name={supplier.name} />
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
            {/* Live only when the quote is in; until then (or if it never comes) the price is the
                company table's snapshot, so say so with its date rather than "live". */}
            <span className="text-[11px] text-ink-soft">
              {api?.quote
                ? `${api.quote.exchange} · ${quoteTiming(api.quote)}`
                : `Price as of ${supplier.f?.asOf ?? "last refresh"}${loading ? " · fetching live…" : ""}`}
            </span>
            <PriceTag price={stats.price} quote={api?.quote ?? null} size="sm" />
          </div>
          {/* Same pill bar as the stock pop-up's tabs. The card itself shows the summary, so that
              pill is the lit one; every pill opens the full pop-up on its tab. */}
          <div role="group" aria-label="Open stock details" className="flex gap-1">
            {TABS.map((t) => {
              const current = t.id === "summary";
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-haspopup="dialog"
                  aria-current={current || undefined}
                  title={`Open ${t.label.toLowerCase()} in the stock pop-up`}
                  onClick={() => setOpenTab(t.id)}
                  className={
                    "flex-auto whitespace-nowrap rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors pointer-coarse:min-h-10 " +
                    (current ? "border-accent bg-accent text-bg" : "border-line text-ink-soft hover:border-accent hover:bg-panel-2 hover:text-ink")
                  }
                >
                  {t.label}
                </button>
              );
            })}
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
