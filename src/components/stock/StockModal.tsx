"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import type { SectorSupplier } from "@/lib/sector-content";
import type { StockApi, StockTab } from "./types";
import { freshQuote, mergeStats } from "./merge";
import { PriceTag } from "./PriceTag";
import { SummaryView } from "./SummaryView";
import { NewsView } from "./NewsView";
import { FundamentalsView } from "./FundamentalsView";
import { BackToChartButton, BacktestButton } from "./BacktestButtons";
import { onFullEntry, useFullView } from "./useFullView";

// lightweight-charts is only needed once someone opens the Chart tab.
const ChartView = dynamic(() => import("./ChartView").then((m) => m.ChartView), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-ink-soft">Loading chart…</p>,
});
// The full-screen Backtest view (basket panels and charts) loads only when it is opened.
const StockBacktest = dynamic(() => import("./StockBacktest").then((m) => m.StockBacktest), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-ink-soft">Loading backtest…</p>,
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
  // Reopened on a full view's history entry (Forward, or a reload there): its Back lands on the chart.
  const [tab, setTab] = useState<StockTab>(() => (onFullEntry() ? "chart" : initialTab));
  const f = supplier.f;
  const stats = mergeStats(f, api);
  // Backtest & project (Chart tab) opens the full-screen view; its Back returns to the chart.
  const fv = useFullView(onClose, { restore: true });
  const full = fv.full && supplier.listed;

  return (
    <ModalShell label={full ? `${supplier.name} backtest` : `${supplier.name} details`} onClose={fv.close} full={full}>
      {(closeRef) => (
      <>
        <div className={"flex flex-none items-start gap-3 border-b border-line bg-panel px-4 pt-4 sm:px-6 sm:pt-5 " + (full ? "pb-3 sm:pb-4" : "pb-0")}>
          {full && <BackToChartButton onClick={fv.exit} />}
          <div className="min-w-0 flex-1">
            {/* Long names wrap rather than being cut ("Samvardhana Motherson…"): the price and ✕ leave
                the name ~180px on a phone, so no line clamp. */}
            {/* The full view on a phone also holds Back: the scrip ("GRSE") is the title there, so a long
                name can't wrap to three lines; the name sits under it, cut to fit. */}
            <h2 className="min-w-0 break-words font-display text-base font-bold leading-snug sm:text-xl">
              {full ? (
                <>
                  <span className="sm:hidden">{ticker}</span>
                  <span className="max-sm:hidden">{supplier.name}</span>
                </>
              ) : (
                supplier.name
              )}
            </h2>
            {/* The labelled Watch button sits on the ticker line, so it doesn't squeeze the name. */}
            <div className="mt-1 flex items-center gap-2">
              {/* The ticker never truncates; only the role gives way to the Watch pill. */}
              <p className="flex min-w-0 text-xs text-ink-soft">
                {full && <span className="min-w-0 truncate sm:hidden">{supplier.name}</span>}
                <span className={"flex-none font-mono" + (full ? " max-sm:hidden" : "")}>{supplier.listed ? `${freshQuote(api?.quote)?.exchange ?? "NSE"}: ${ticker}` : "Unlisted"}</span>
                <span className="hidden min-w-0 truncate sm:inline">&nbsp;· {supplier.role}</span>
              </p>
              <span className="flex-none">
                <WatchlistButton ticker={ticker} name={supplier.name} variant="pill" />
              </span>
            </div>
          </div>
          {/* A phone's header in the full view also holds Back: the price gives way so the name keeps its room. */}
          {supplier.listed && (
            <div className={full ? "max-sm:hidden" : undefined}>
              <PriceTag price={stats.price} quote={freshQuote(api?.quote)} asOf={stats.asOf} />
            </div>
          )}
          <CloseButton closeRef={closeRef} onClose={fv.close} />
        </div>

        {supplier.listed && !full && (
        // On a phone the four tabs and Backtest share the row: tighter pills there, so it never scrolls.
        <div className="flex flex-none items-center gap-1.5 border-b border-line bg-panel px-1.5 py-2 sm:gap-2 sm:px-4">
        <div role="tablist" aria-label="Stock details" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto sm:gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                // The pill style is the reference for stock tabs elsewhere (explorer card). tap-target
                // grows the pill's hit area to 40px; touch screens (incl. tablets on sm sizing) also
                // get a 40px-tall pill so the visible target matches.
                "tap-target flex-none rounded-full px-2 py-1 text-xs font-semibold transition-colors min-[400px]:px-2.5 sm:px-4 sm:py-1.5 sm:text-sm pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center " +
                (tab === t.id ? "bg-accent text-bg" : "text-ink-soft hover:bg-panel-2 hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "chart" && <BacktestButton variant="tab" onClick={fv.enter} />}
        </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {!supplier.listed && <UnlistedView supplier={supplier} />}
          {full && <StockBacktest ticker={ticker} name={supplier.name} />}
          {supplier.listed && !full && tab === "summary" && <SummaryView ticker={ticker} supplier={supplier} api={api} loading={apiLoading} showNarrative />}
          {supplier.listed && !full && tab === "chart" && <ChartView ticker={ticker} quote={freshQuote(api?.quote)} />}
          {supplier.listed && !full && tab === "news" && <NewsView ticker={ticker} name={supplier.name} supplier={supplier} api={api} />}
          {supplier.listed && !full && tab === "fundamentals" && <FundamentalsView supplier={supplier} api={api} loading={apiLoading} />}
        </div>
      </>
      )}
    </ModalShell>
  );
}

const noopSubscribe = () => () => {};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Blurred backdrop + raised card, scroll lock, Esc / backdrop-click to close, focus on ✕, Tab kept
// inside the card, and focus handed back to whatever opened it on close.
// `full`: the whole screen on every size (the full-screen Backtest view), not the centred card.
export function ModalShell({
  label,
  onClose,
  full = false,
  children,
}: {
  label: string;
  onClose: () => void;
  full?: boolean;
  children: (closeRef: React.RefObject<HTMLButtonElement | null>) => React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Parents pass a fresh onClose on every render; reading it through a ref keeps the effect below
  // mount-only, so a parent re-render no longer re-focuses ✕ or re-toggles the scroll lock.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab" || !cardRef.current) return;
      const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = cardRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // Back to the card or link that opened the pop-up, if it is still on the page.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [mounted]);
  // Portals need `document`. ReturnToStock (root layout) can render the skeleton during SSR of a
  // `?stock=` URL, so render nothing on the server / during hydration and portal afterwards.
  if (!mounted) return null;

  return createPortal(
    <div
      className={"nr-pop-backdrop fixed inset-0 z-[200] flex items-stretch justify-center " + (full ? "" : "sm:items-center sm:p-8")}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        // Without preventDefault the press goes on to focus <body>, undoing the focus handed back on close.
        e.preventDefault();
        onCloseRef.current();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={"nr-pop-card flex h-full w-full flex-col overflow-hidden border border-line bg-bg text-ink " + (full ? "" : "sm:h-[min(88vh,860px)] sm:max-w-[1040px] sm:rounded-3xl")}
      >
        {children(closeRef)}
      </div>
    </div>,
    document.body
  );
}

export function CloseButton({ closeRef, onClose }: { closeRef: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  return (
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
  );
}

/**
 * Shown the moment a pop-up is requested by ticker alone (`?stock=NHPC`, e.g. a company name in
 * a news list) while its supplier record loads - so the click gets instant feedback instead of
 * nothing for a few seconds on a cold server.
 */
export function StockModalSkeleton({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const bar = "animate-pulse rounded bg-panel-2";
  return (
    <ModalShell label={`Loading ${ticker}`} onClose={onClose}>
      {(closeRef) => (
        <>
          <div className="flex flex-none items-start gap-3 border-b border-line bg-panel px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
            <div className="min-w-0 flex-1">
              <div className={bar + " h-6 w-48"} />
              <p className="mt-1.5 font-mono text-xs text-ink-soft">NSE: {ticker}</p>
            </div>
            <CloseButton closeRef={closeRef} onClose={onClose} />
          </div>
          <div aria-busy="true" className="flex flex-col gap-3 px-4 py-5 sm:px-6">
            <p className="text-sm text-ink-soft">Loading {ticker}…</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={bar + " h-12"} />
              ))}
            </div>
            <div className={bar + " h-28"} />
            <div className={bar + " h-16"} />
          </div>
        </>
      )}
    </ModalShell>
  );
}

// Unlisted companies have no market data, so the pop-up is just the written profile.
function FactList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{title}</div>
      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function UnlistedView({ supplier }: { supplier: SectorSupplier }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-soft">{supplier.role}</p>
      <FactList title="Strengths" items={supplier.strengths} />
      <FactList title="Risks" items={supplier.risks} />
      <FactList title="Notes" items={supplier.notes} />
      <p className="border-t border-dashed border-line pt-2 text-[10.5px] text-ink-soft">Compiled from public reporting — not exchange-listed.</p>
    </div>
  );
}
