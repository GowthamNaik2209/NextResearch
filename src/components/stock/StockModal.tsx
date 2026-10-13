"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import type { SectorSupplier } from "@/lib/sector-content";
import type { StaticFin, StockApi, StockTab } from "./types";
import { mergeStats } from "./merge";
import { PriceTag } from "./PriceTag";
import { SummaryView } from "./SummaryView";
import { NewsView } from "./NewsView";
import { FundamentalsView } from "./FundamentalsView";

// lightweight-charts is only needed once someone opens the Chart tab.
const ChartView = dynamic(() => import("./ChartView").then((m) => m.ChartView), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-ink-soft">Loading chart…</p>,
});

const TABS: { id: StockTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "chart", label: "Chart" },
  { id: "news", label: "News" },
  { id: "fundamentals", label: "Fundamentals" },
];

type Props = {
  ticker: string;
  supplier: SectorSupplier;
  api: StockApi | null;
  apiLoading: boolean;
  initialTab: StockTab;
  onClose: () => void;
};

// Full-screen pop-up: blurred, dimmed backdrop with a raised card that tilts in
// (CSS .nr-pop in globals.css). Full-bleed sheet on phones, centred card on
// larger screens. Closes via the ✕ button, Esc, or a click on the backdrop.
export function StockModal({ ticker, supplier, api, apiLoading, initialTab, onClose }: Props) {
  const [tab, setTab] = useState<StockTab>(initialTab);
  const closeRef = useRef<HTMLButtonElement>(null);
  const f = supplier.f as unknown as StaticFin | undefined;
  const stats = mergeStats(f, api);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="nr-pop-backdrop fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${supplier.name} details`}
        className="nr-pop-card flex h-full w-full flex-col overflow-hidden border border-line bg-bg text-ink sm:h-[min(88vh,860px)] sm:max-w-[1040px] sm:rounded-3xl"
      >
        <div className="flex flex-none items-start gap-3 border-b border-line bg-panel px-4 pb-0 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-lg font-bold sm:text-xl">{supplier.name}</h2>
              <WatchlistButton ticker={ticker} />
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-soft">
              <span className="font-mono">NSE: {ticker}</span> · {supplier.role}
            </p>
          </div>
          <PriceTag price={stats.price} quote={api?.quote ?? null} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div role="tablist" aria-label="Stock details" className="flex flex-none overflow-x-auto border-b border-line bg-panel px-2 sm:px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "relative flex-none px-4 py-3 text-sm font-semibold transition-colors " +
                (tab === t.id ? "text-ink" : "text-ink-soft hover:text-ink")
              }
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {tab === "summary" && <SummaryView ticker={ticker} supplier={supplier} api={api} loading={apiLoading} showNarrative />}
          {tab === "chart" && <ChartView ticker={ticker} />}
          {tab === "news" && <NewsView ticker={ticker} name={supplier.name} supplier={supplier} api={api} />}
          {tab === "fundamentals" && <FundamentalsView supplier={supplier} api={api} loading={apiLoading} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
