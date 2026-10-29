"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Deck } from "@/lib/sector-content/reports";
import type { IpoDeck } from "@/lib/ipo-content";
import type { DeckCard, IpoCard } from "@/lib/analysis-props";
import { IpoGrid } from "@/components/ipo/IpoGrid";
import { InfoTip } from "@/components/InfoTip";
import { LazyResearchDeck, dropDeepLinkParam, intentProps, prefetchReport, useForwardReopen } from "./LazyDecks";
import type { ChartPickerIndustry } from "@/components/stock/StockChartPopup";
import { THEME_TAB_EVENT, ThemeCards, type ComingSoonSector, type SectorCard, type ThemeTab } from "./ThemeCards";

// The Charts pop-up (one stock's price chart) loads when a card's Charts button is pressed.
const StockChartPopup = dynamic(() => import("@/components/stock/StockChartPopup").then((m) => m.StockChartPopup), { ssr: false });

const TABS = [
  { id: "all", label: "All" },
  { id: "sector", label: "Industries" },
  { id: "policy", label: "Policies" },
  { id: "ipo", label: "IPOs" },
] as const;

const VIEWS = [
  { id: "deep", label: "Deep dive" },
  { id: "reports", label: "Reports" },
] as const;
type View = (typeof VIEWS)[number]["id"];

// The Analysis block (on /docs and the landing page's #themes section). Two views on the
// right-hand toggle: Deep dive (default) has one card per industry or policy opening its page;
// Reports has one card per research deck, opened as a pop-up (`?report=<slug>`, shareable). A Deep
// dive card's Charts button opens a pop-up with one stock's price chart, picked by industry, layer
// and stock (`?view=charts&sector=<slug>`, shareable); basket backtests live in Baskets. The left
// tabs filter both views; the IPOs tab holds the IPO decks (`?ipo=<slug>` lands on it with that deck open).
export function ReadingList({
  decks,
  initialDeck,
  ipos,
  initialIpoDeck,
  sectorCards,
  comingSoon,
  chartIndustries,
  initial,
  initialIpo,
  initialView = "deep",
  initialSector,
  initialCharts = false,
}: {
  decks: DeckCard[];
  /** The deck a ?report= link opens, built with the page; any other deck loads when opened. */
  initialDeck?: Deck;
  ipos: IpoCard[];
  /** The IPO deck a ?ipo= link opens, built with the page. */
  initialIpoDeck?: IpoDeck;
  sectorCards: SectorCard[];
  comingSoon: ComingSoonSector[];
  /** Every industry's layers and stocks for the Charts pop-up: in the page on a ?view=charts link, else fetched on first use. */
  chartIndustries?: ChartPickerIndustry[];
  initial?: string;
  initialIpo?: string;
  initialView?: View;
  initialSector?: string;
  /** `?view=charts`: open the Charts pop-up on `initialSector` (or the first industry). */
  initialCharts?: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  // The industry the Charts pop-up is open on (null when closed): a card's Charts button, or a ?view=charts link.
  const [chartSlug, setChartSlug] = useState<string | null>(initialCharts ? (initialSector ?? "") : null);
  // A ?view=charts link opens the pop-up over the top of the page; closing it brings the Analysis
  // block into view (on the landing page it is a screen or more down).
  const blockRef = useRef<HTMLDivElement>(null);
  const fromLink = useRef(initialCharts);
  const closeCharts = useCallback(() => {
    setChartSlug(null);
    if (fromLink.current) blockRef.current?.scrollIntoView({ block: "start" });
    fromLink.current = false;
  }, []);
  // Keeps ?view=charts&sector= in step with the open pop-up, so a reload or a shared link opens it.
  const syncChartUrl = useCallback((slug: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "charts");
    url.searchParams.set("sector", slug);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, []);
  useEffect(() => {
    if (chartSlug !== null) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") !== "charts") return;
    url.searchParams.delete("view");
    url.searchParams.delete("sector");
    url.searchParams.delete("bview");
    window.history.replaceState(window.history.state, "", url);
  }, [chartSlug]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeDeck = useCallback(() => setOpenSlug(null), []);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(initialIpo ? "ipo" : "all");
  const open = decks.find((d) => d.slug === openSlug) ?? null;
  const shown = decks.filter((d) => tab === "all" || d.category === tab);

  // Opened after mount: the pop-up portals into document.body, which does not exist on the server.
  // Applied once, so a re-render can't reopen a deck the reader closed.
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initial || !decks.some((d) => d.slug === initial)) return;
    appliedInitial.current = true;
    dropDeepLinkParam("report");
    setOpenSlug(initial);
  }, [decks, initial]);

  // ?report=<slug> is set on the open deck's own history entry (Presentation's urlParam), and
  // browser Forward onto that entry opens the deck again there (adopt).
  const [adopt, setAdopt] = useState(false);
  useForwardReopen(
    "report",
    openSlug,
    (slug) => decks.some((d) => d.slug === slug),
    (slug) => {
      setAdopt(true);
      setOpenSlug(slug);
    }
  );

  // The hero's theme window picks a tab here too (landing page), opening the Deep dive on it.
  useEffect(() => {
    const onTab = (e: Event) => {
      setTab((e as CustomEvent<ThemeTab | "all">).detail);
      setView("deep");
    };
    window.addEventListener(THEME_TAB_EVENT, onTab);
    return () => window.removeEventListener(THEME_TAB_EVENT, onTab);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    // Deep dive is the default, so it needs no parameter. The Charts pop-up keeps its own ?view=charts.
    if (view === "reports") url.searchParams.set("view", "reports");
    else if (url.searchParams.get("view") === "reports") url.searchParams.delete("view");
    // Only when it changes: on first load the URL already matches, and a replaceState that early
    // reaches Next's router before it has initialised ("Router action dispatched before
    // initialization" and a state update before mount, seen on the landing page).
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [view]);

  return (
    <>
      <div ref={blockRef} className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Report type" className="flex gap-1 self-start rounded-full border border-line bg-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={"inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold transition pointer-coarse:min-h-9 " + (tab === t.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
      <div role="tablist" aria-label="View" className="flex gap-1 rounded-full border border-line bg-panel p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={"inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold transition pointer-coarse:min-h-9 " + (view === v.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {v.label}
          </button>
        ))}
      </div>
      <InfoTip label="About the two views">
        <b>Deep dive</b>: each industry&rsquo;s supply chain and who supplies it; its <b>Charts</b> button shows any of its listed stocks&rsquo;
        price chart. <b>Reports</b>: ten-slide summaries for investors.
      </InfoTip>
      </div>
      </div>
      </div>
      {view === "deep" && tab !== "ipo" && <ThemeCards sectors={sectorCards} comingSoon={comingSoon} filter={tab} onCharts={setChartSlug} />}
      {view === "reports" && tab !== "ipo" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((d) => (
            <ReportCard key={d.slug} deck={d} onOpen={() => {
              setAdopt(false);
              setOpenSlug(d.slug);
            }} />
          ))}
        </div>
      )}
      {tab === "all" && <h2 className="mt-4 font-display text-xl font-bold text-ink">IPOs</h2>}
      {(tab === "ipo" || tab === "all") && <IpoGrid ipos={ipos} initial={initialIpo} initialDeck={initialIpoDeck} />}
      {chartSlug !== null && <StockChartPopup initialSlug={chartSlug || undefined} initialIndustries={chartIndustries} order={sectorCards.map((s) => s.slug)} onSlug={syncChartUrl} onClose={closeCharts} />}
      {open && <LazyResearchDeck key={open.slug} slug={open.slug} initialDeck={initialDeck} onClose={closeDeck} urlParam="report" adoptHistoryEntry={adopt} />}
    </>
  );
}

const TONE_TEXT = { pos: "text-pos", neg: "text-danger", neutral: "text-ink-soft" } as const;

function ReportCard({ deck, onOpen }: { deck: DeckCard; onOpen: () => void }) {
  const r = deck.report;
  return (
    <button
      type="button"
      onClick={onOpen}
      {...intentProps(() => prefetchReport(deck.slug))}
      aria-haspopup="dialog"
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.5)]"
    >
      {/* Mini "cover slide" */}
      <span className="relative block border-b border-line bg-panel-2 p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "linear-gradient(90deg, transparent 35%, #000 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 35%, #000 100%)" }}
        />
        <span className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg font-mono text-sm font-bold text-accent">{deck.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{deck.category === "policy" ? "Policy report" : "Industry report"}</span>
          <span className="ml-auto font-mono text-[10px] text-ink-soft">{r.asOf}</span>
        </span>
        <span className="relative mt-3 block font-display text-lg font-bold leading-snug text-ink">{r.title}</span>
        <span className="relative mt-1 block text-xs leading-relaxed text-ink-soft">{r.subtitle}</span>
      </span>
      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className={"inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + TONE_TEXT[r.stance.tone]}>
          {r.stance.label}
        </span>
        <span className="grid grid-cols-2 gap-2">
          {r.keyStats.map((s) => (
            <span key={s.label} className="rounded-lg border border-line bg-bg/60 p-2.5">
              <span className="block text-[9.5px] uppercase leading-tight tracking-wide text-ink-soft">{s.label}</span>
              <span className="mt-0.5 block font-display text-base font-bold text-ink">{s.value}</span>
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between pt-1 text-xs">
          <span className="text-ink-soft">10 slides · {deck.beneficiaries} beneficiaries</span>
          <span className="font-semibold text-accent group-hover:underline">Read curated report &rarr;</span>
        </span>
      </span>
    </button>
  );
}
