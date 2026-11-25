"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { IpoDeck } from "@/lib/ipo-content";
import Link from "next/link";
import type { IpoCard as IpoCardData, IpoCardStock } from "@/lib/analysis-props";
import { croreShort, inr, signedPct } from "@/lib/format";
import { LazyIpoDeck, dropDeepLinkParam, intentProps, prefetchIpo, useForwardReopen } from "@/components/research/LazyDecks";
import { StageChip } from "./StageChip";
import { fmtCr } from "./headlines";

// Grid of upcoming-IPO cards (landing page's IPOs tab, the reading list, /ipos). A click opens
// the IPO's deck as a pop-up (loaded then, see LazyDecks); `?ipo=<slug>` opens one directly
// (its deck comes with the page as `initialDeck`) and stays in sync while open.
export function IpoGrid({ ipos, initial, initialDeck }: { ipos: IpoCardData[]; initial?: string; initialDeck?: IpoDeck }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = ipos.find((d) => d.slug === openSlug) ?? null;

  // Opened after mount: the pop-up portals into document.body, which does not exist on the server.
  // Applied once, so a re-render with a new `ipos` array cannot reopen a deck the reader closed.
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || !initial) return;
    appliedInitial.current = true;
    if (!ipos.some((d) => d.slug === initial)) return;
    dropDeepLinkParam("ipo");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL on mount
    setOpenSlug(initial);
  }, [ipos, initial]);


  // Stable, so the deck's Esc/Back handlers don't re-subscribe on every render.
  const closeDeck = useCallback(() => setOpenSlug(null), []);
  // Browser Forward onto a deck's entry reopens it on that entry (adopt).
  const [adopt, setAdopt] = useState(false);
  const openFromCard = (slug: string) => {
    setAdopt(false);
    setOpenSlug(slug);
  };
  useForwardReopen(
    "ipo",
    openSlug,
    (slug) => ipos.some((d) => d.slug === slug),
    (slug) => {
      setAdopt(true);
      setOpenSlug(slug);
    }
  );

  // Issues whose bidding is over (awaiting listing, or listed) sit in their own group below the
  // pipeline for a few weeks; a listed one shows its stock figures and where it sits on the platform.
  const groups = [
    { id: "upcoming", label: "Upcoming", items: ipos.filter((d) => !d.closed) },
    { id: "closed", label: "Recently closed", items: ipos.filter((d) => d.closed).sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0)) },
  ].filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label}>
          {groups.length > 1 && <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{g.label}</h3>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((d) => (
              <IpoCard key={d.slug} deck={d} onOpen={() => openFromCard(d.slug)} />
            ))}
          </div>
        </section>
      ))}
      {open && <LazyIpoDeck key={open.slug} slug={open.slug} initialDeck={initialDeck} onClose={closeDeck} urlParam="ipo" adoptHistoryEntry={adopt} />}
    </div>
  );
}

function IpoCard({ deck, onOpen }: { deck: IpoCardData; onOpen: () => void }) {
  // Compact figures from the numeric fields; the authored strings (with their caveats) are for the deck.
  const i = deck.issue;
  const size = i.totalCr != null ? fmtCr(i.totalCr) : i.freshCr ? `${fmtCr(i.freshCr)} +\u00a0OFS` : i.ofsCr ? `${fmtCr(i.ofsCr)} OFS` : "OFS only";
  const s = deck.stock;
  const stats: [string, ReactNode, ReactNode?][] = s
    ? [
        [
          "Share price",
          s.price != null ? `₹${inr(s.price)}` : "—",
          s.vsIssuePct != null ? (
            <span className={s.vsIssuePct > 0 ? "text-pos" : s.vsIssuePct < 0 ? "text-danger" : "text-ink-soft"}>
              {signedPct(s.vsIssuePct)} vs {s.vsBasis === "band-top" ? "band top" : "issue"}
            </span>
          ) : undefined,
        ],
        ["Market cap", croreShort(s.mcapCr), s.pe != null ? `P/E ${s.pe.toFixed(1)}x` : s.lossMaking ? "P/E n/m (loss)" : "P/E —"],
      ]
    : [
        ["Issue size", size],
        ["Valuation", i.valuationCr != null ? fmtCr(i.valuationCr) : "Not yet set"],
      ];
  return (
    <article className="group/card flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.5)]">
    <button
      type="button"
      onClick={onOpen}
      {...intentProps(() => prefetchIpo(deck.slug))}
      aria-haspopup="dialog"
      className="group flex flex-1 flex-col text-left"
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
          {stats.map(([k, v, sub]) => (
            <span key={k} className="min-w-0 rounded-lg border border-line bg-bg/60 p-2.5">
              <span className="block text-[9.5px] uppercase leading-tight tracking-wide text-ink-soft">{k}</span>
              <span className="mt-0.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink tabular-nums">{v}</span>
              {sub && <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft tabular-nums">{sub}</span>}
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-ink-soft">10 slides · prospectus summary</span>
          <span className="font-semibold text-accent group-hover:underline">Read IPO deck &rarr;</span>
        </span>
      </span>
    </button>
    {s && <StockLinks stock={s} />}
    </article>
  );
}

// A listed issue as a stock: the industries it sits in (each opens its map at the company) and its
// company page. Figures above are the company table's, as of its snapshot date.
function StockLinks({ stock }: { stock: IpoCardStock }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-5 py-4">
      {stock.industries.length > 0 && (
        <div>
          <p className="text-[9.5px] uppercase tracking-wide text-ink-soft">On the platform</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {stock.industries.map((x) => (
              <li key={x.slug} className="min-w-0 max-w-full">
                <Link
                  href={x.href}
                  title={`${x.name}: ${x.zone}`}
                  className="tap-y flex max-w-full min-w-0 items-center rounded-2xl border border-accent px-2.5 py-1 text-[11.5px] font-medium leading-snug text-ink transition-colors hover:bg-accent/10"
                >
                  <span className="line-clamp-2 break-words">
                    {x.name} <span className="text-ink-soft">· {x.zone}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-ink-soft">
          {stock.ticker}
          {stock.asOf ? ` · as of ${stock.asOf}` : ""}
        </span>
        {stock.companySlug && (
          <Link href={`/company/${stock.companySlug}`} className="tap-y inline-flex items-center py-1 font-semibold text-accent hover:underline">
            Company page &rsaquo;
          </Link>
        )}
      </div>
    </div>
  );
}
