"use client";

import { useEffect, useRef, useState } from "react";
import type { Deck } from "@/lib/sector-content/reports";
import type { IpoDeck } from "@/lib/ipo-content";
import { IpoGrid } from "@/components/ipo/IpoGrid";
import { ResearchDeck } from "./ResearchDeck";
import { SectorCharts, type ChartSector } from "./SectorCharts";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import { BackToThemes } from "./back-to-themes";

const TABS = [
  { id: "all", label: "All" },
  { id: "sector", label: "Industries" },
  { id: "policy", label: "Policies" },
  { id: "ipo", label: "IPOs" },
] as const;

const VIEWS = [
  { id: "reports", label: "Reports" },
  { id: "charts", label: "Charts" },
] as const;
type View = (typeof VIEWS)[number]["id"];

// The /docs grid: one card per research deck; a click opens the deck as a pop-up.
// `?report=<slug>` opens one directly (shareable), kept in sync while it is open. The IPOs tab
// holds the upcoming-IPO decks (`?ipo=<slug>` lands on it with that deck open). The right-hand
// toggle swaps the cards for comparison charts (`?view=charts&sector=<slug>`); the left tabs then
// pick which industries the chart offers.
export function ReadingList({
  decks,
  ipos,
  sectors,
  market,
  initial,
  initialIpo,
  initialView = "reports",
  initialSector,
  fromThemes = false,
}: {
  decks: Deck[];
  ipos: IpoDeck[];
  sectors: ChartSector[];
  market: Benchmark[];
  initial?: string;
  initialIpo?: string;
  initialView?: View;
  initialSector?: string;
  fromThemes?: boolean;
}) {
  const [view, setView] = useState<View>(initialView);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Arriving from a theme card's Charts button: bring the chart into view rather than leaving
  // it below the page intro, which on a phone is a full screen down. Once per visit.
  useEffect(() => {
    if (initialView === "charts" && initialSector) toolbarRef.current?.scrollIntoView({ block: "start" });
  }, [initialView, initialSector]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(initialIpo ? "ipo" : "all");
  const open = decks.find((d) => d.slug === openSlug) ?? null;
  const shown = decks.filter((d) => tab === "all" || d.category === tab);

  // Opened after mount: the pop-up portals into document.body, which does not exist on the server.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL on mount
    if (initial && decks.some((d) => d.slug === initial)) setOpenSlug(initial);
  }, [decks, initial]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (openSlug) url.searchParams.set("report", openSlug);
    else url.searchParams.delete("report");
    window.history.replaceState(window.history.state, "", url);
  }, [openSlug]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "charts") url.searchParams.set("view", "charts");
    else {
      url.searchParams.delete("view");
      url.searchParams.delete("sector");
    }
    window.history.replaceState(window.history.state, "", url);
  }, [view]);

  const chartSectors = sectors.filter((s) => tab === "all" || s.category === tab);

  return (
    <>
      <div ref={toolbarRef} className="flex scroll-mt-20 flex-col gap-3">
      {fromThemes && <BackToThemes />}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Report type" className="flex gap-1 self-start rounded-full border border-line bg-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={"rounded-full px-4 py-1.5 text-xs font-semibold transition " + (tab === t.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="View" className="flex gap-1 rounded-full border border-line bg-panel p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={"rounded-full px-4 py-1.5 text-xs font-semibold transition " + (view === v.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {v.label}
          </button>
        ))}
      </div>
      </div>
      </div>
      {view === "charts" &&
        (tab === "ipo" ? (
          <p className="rounded-2xl border border-line bg-panel p-6 text-sm leading-relaxed text-ink-soft">
            Charts cover the listed stocks in our industries and policies, so IPOs aren&rsquo;t charted here. Switch to Reports for their prospectus
            summaries.
          </p>
        ) : (
          <SectorCharts key={tab} sectors={chartSectors} market={market} initialSector={initialSector} />
        ))}
      {view === "reports" && tab !== "ipo" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => (
            <ReportCard key={d.slug} deck={d} onOpen={() => setOpenSlug(d.slug)} />
          ))}
        </div>
      )}
      {view === "reports" && tab === "all" && <h2 className="mt-4 font-display text-xl font-bold text-ink">IPOs</h2>}
      {view === "reports" && (tab === "ipo" || tab === "all") && <IpoGrid ipos={ipos} initial={initialIpo} />}
      {open && <ResearchDeck deck={open} onClose={() => setOpenSlug(null)} />}
    </>
  );
}

const TONE_TEXT = { pos: "text-pos", neg: "text-danger", neutral: "text-ink-soft" } as const;

function ReportCard({ deck, onOpen }: { deck: Deck; onOpen: () => void }) {
  const r = deck.report;
  return (
    <button
      type="button"
      onClick={onOpen}
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
          {r.keyStats.slice(0, 2).map((s) => (
            <span key={s.label} className="rounded-lg border border-line bg-bg/60 p-2.5">
              <span className="block text-[9.5px] uppercase leading-tight tracking-wide text-ink-soft">{s.label}</span>
              <span className="mt-0.5 block font-display text-base font-bold text-ink">{s.value}</span>
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between pt-1 text-xs">
          <span className="text-ink-soft">10 slides · {deck.companies.length} beneficiaries</span>
          <span className="font-semibold text-accent group-hover:underline">Read curated report &rarr;</span>
        </span>
      </span>
    </button>
  );
}
