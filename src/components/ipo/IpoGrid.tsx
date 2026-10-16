"use client";

import { useEffect, useRef, useState } from "react";
import type { IpoDeck } from "@/lib/ipo-content";
import { IpoDeckView } from "./IpoDeckView";
import { StageChip } from "./IpoSlides";
import { fmtCr } from "./headlines";

// Grid of upcoming-IPO cards (landing page's IPOs tab, the reading list, /ipos). A click opens
// the IPO's deck as a pop-up; `?ipo=<slug>` opens one directly and stays in sync while open.
export function IpoGrid({ ipos, initial }: { ipos: IpoDeck[]; initial?: string }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = ipos.find((d) => d.slug === openSlug) ?? null;

  // Opened after mount: the pop-up portals into document.body, which does not exist on the server.
  // Applied once, so a re-render with a new `ipos` array cannot reopen a deck the reader closed.
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initial) return;
    appliedInitial.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL on mount
    if (ipos.some((d) => d.slug === initial)) setOpenSlug(initial);
  }, [ipos, initial]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const had = url.searchParams.has("ipo");
    if (openSlug) url.searchParams.set("ipo", openSlug);
    else url.searchParams.delete("ipo");
    if (openSlug || had) window.history.replaceState(window.history.state, "", url);
  }, [openSlug]);

  // Recent listings stay for a few weeks after their debut, in their own group below the pipeline.
  const groups = [
    { id: "upcoming", label: "Upcoming", items: ipos.filter((d) => d.status.stage !== "listed") },
    { id: "listed", label: "Recently listed", items: ipos.filter((d) => d.status.stage === "listed") },
  ].filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label}>
          {groups.length > 1 && <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{g.label}</h3>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((d) => (
              <IpoCard key={d.slug} deck={d} onOpen={() => setOpenSlug(d.slug)} />
            ))}
          </div>
        </section>
      ))}
      {open && <IpoDeckView deck={open} onClose={() => setOpenSlug(null)} />}
    </div>
  );
}

function IpoCard({ deck, onOpen }: { deck: IpoDeck; onOpen: () => void }) {
  // Compact figures from the numeric fields; the authored strings (with their caveats) are for the deck.
  const i = deck.issue;
  const size = i.totalCr != null ? fmtCr(i.totalCr) : i.freshCr ? `${fmtCr(i.freshCr)} + OFS` : i.ofsCr ? `${fmtCr(i.ofsCr)} OFS` : "OFS only";
  const stats: [string, string][] = [
    ["Issue size", size],
    ["Valuation", i.valuationCr != null ? fmtCr(i.valuationCr) : "Not yet set"],
  ];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.5)]"
    >
      <span className="relative block border-b border-line bg-panel-2 p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "linear-gradient(90deg, transparent 35%, #000 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 35%, #000 100%)" }}
        />
        <span className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line bg-bg font-mono text-[11px] font-bold text-accent">{deck.icon}</span>
          <span className="min-w-0 text-[10px] font-bold uppercase leading-snug tracking-wider text-accent">{deck.sectorLabel}</span>
        </span>
        <span className="relative mt-3 block font-display text-lg font-bold leading-snug text-ink">{deck.name}</span>
        <span className="relative mt-1 block text-xs leading-relaxed text-ink-soft">{deck.tagline}</span>
      </span>
      <span className="flex flex-1 flex-col gap-3 p-5">
        <StageChip deck={deck} className="self-start" />
        <span className="grid grid-cols-2 gap-2">
          {stats.map(([k, v]) => (
            <span key={k} className="min-w-0 rounded-lg border border-line bg-bg/60 p-2.5">
              <span className="block text-[9.5px] uppercase leading-tight tracking-wide text-ink-soft">{k}</span>
              <span className="mt-0.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink">{v}</span>
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-ink-soft">10 slides · prospectus summary</span>
          <span className="font-semibold text-accent group-hover:underline">Read IPO deck &rarr;</span>
        </span>
      </span>
    </button>
  );
}
