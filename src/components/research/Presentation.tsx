"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { SectorSupplier } from "@/lib/sector-content";
import { StockModalHost } from "@/components/stock/StockModalHost";

export type PresentationLink = { href: string; label: string; external?: boolean };
/** A company a slide can open in the stock pop-up on top of the presentation. */
export type OpenableStock = { ticker: string; supplier: SectorSupplier };

type Props = {
  icon: string;
  /** Header eyebrow, e.g. "Industry report · Pharma" or "IPO · Jio Platforms". */
  kicker: string;
  ariaLabel: string;
  slides: { id: string; title: string; blurb: string }[];
  renderSlide: (index: number, openStock: (s: OpenableStock) => void) => ReactNode;
  /** The footer's filled link for a slide: full label from sm up, `short` on phones. */
  cta: (index: number) => PresentationLink & { short: string };
  /** Optional second, outlined link next to it (sm and up). */
  extra?: (index: number) => PresentationLink | undefined;
  onClose: () => void;
  initialSlide?: number;
  /** A search param naming the open deck (?report=<slug>, ?ipo=<slug>), set on the deck's own
   *  history entry so the URL is shareable while it is open and clean again once it closes. */
  urlParam?: { name: string; value: string };
  /** Reopened by browser Forward: the deck's own history entry (with its param) is already the
   *  current one, so it is reused rather than another pushed on top (useForwardReopen). */
  adoptHistoryEntry?: boolean;
};

// The history step back owed by a deck that just closed (see the Back handling below).
let pendingBack: number | null = null;
// Set when a footer link closes the deck to go to another page: that link replaces the deck's
// history entry, so the usual step back must not run (it would undo the navigation).
let leavingByLink = false;

// Pop-up slide presentation (research decks and IPO decks) — the same blurred backdrop +
// tilting card as the stock pop-up (.nr-pop-* in globals.css), sized like a presentation.
// Arrow keys / swipe / the footer buttons move between slides; Esc, the ✕ or a backdrop
// click closes it. A company named on a slide opens the regular stock pop-up on top.
export function Presentation({ icon, kicker, ariaLabel, slides, renderSlide, cta: ctaFor, extra: extraFor, onClose, initialSlide = 0, urlParam, adoptHistoryEntry = false }: Props) {
  const [index, setIndex] = useState(initialSlide);
  const [dir, setDir] = useState<1 | -1>(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stock, setStock] = useState<OpenableStock | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = slides.length;
  const slide = slides[index];

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(total - 1, to));
      setIndex((cur) => {
        if (next !== cur) setDir(next > cur ? 1 : -1);
        return next;
      });
      setMenuOpen(false);
    },
    [total]
  );

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [index]);

  // Back (an iPhone swipe-back included) closes the deck instead of leaving the page: opening
  // adds a history entry, and closing any other way steps back off it. The step back is
  // scheduled, so React's dev double-mount (unmount + mount in one tick) reuses the entry
  // instead of popping it.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // The deck's param goes on its own entry only: closing steps back onto the page's entry, which
  // never had it, so nothing (Next included) can read the old URL and open the deck again.
  const paramName = urlParam?.name;
  const paramValue = urlParam?.value;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (paramName && paramValue) url.searchParams.set(paramName, paramValue);
    if (pendingBack !== null || adoptHistoryEntry) {
      if (pendingBack !== null) window.clearTimeout(pendingBack);
      pendingBack = null;
      window.history.replaceState(window.history.state, "", url);
    } else {
      window.history.pushState(window.history.state, "", url);
    }
    leavingByLink = false;
    let leftByBack = false;
    const onPop = () => {
      leftByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (leftByBack || leavingByLink) return;
      pendingBack = window.setTimeout(() => {
        pendingBack = null;
        window.history.back();
      }, 0);
    };
    // adoptHistoryEntry only matters on the first run (how this opening got its entry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramName, paramValue]);

  // A footer link leaves for another page: it takes over the deck's history entry (so Back returns
  // to the page the deck was opened on) and the deck closes without stepping back. A link to the
  // page the deck sits on (no #section) only closes it, so no duplicate entry is left for Back.
  const leave = useCallback(
    (href: string) => (e: MouseEvent) => {
      const to = new URL(href, window.location.href);
      const here = new URL(window.location.href);
      if (paramName) here.searchParams.delete(paramName);
      if (!to.hash && to.pathname === here.pathname && to.search === here.search) e.preventDefault();
      else leavingByLink = true;
      onClose();
    },
    [onClose, paramName]
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.({ preventScroll: true }); // back to the card/button that opened the deck
    };
  }, []);

  // "More below" hint while the current slide has unseen content under the fold.
  const [moreBelow, setMoreBelow] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stock) return; // the stock pop-up on top owns the keyboard
      if (e.key === "Escape") return menuOpen ? setMenuOpen(false) : onClose();
      // Keep Tab inside the deck (aria-modal): wrap from the last control to the first and back,
      // and pull focus back in if it is somewhere behind the backdrop.
      if (e.key === "Tab" && cardRef.current) {
        const items = [...cardRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]')].filter(
          (el) => el.tabIndex >= 0 && el.getClientRects().length > 0
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const at = document.activeElement as HTMLElement | null;
        const inside = !!at && cardRef.current.contains(at);
        if (e.shiftKey && (!inside || at === first)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!inside || at === last)) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(index + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, menuOpen, onClose, stock, total]);

  const extra = extraFor?.(index);
  const cta = ctaFor(index);

  return createPortal(
    <div
      className="nr-pop-backdrop fixed inset-0 z-[200] flex items-stretch justify-center sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-roledescription="presentation"
        aria-label={ariaLabel}
        className="nr-pop-card relative flex h-full w-full flex-col overflow-hidden border border-line bg-bg text-ink sm:h-[min(92vh,900px)] sm:max-w-[1240px] sm:rounded-3xl"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || stock) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Header */}
        <div className="flex flex-none items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-accent">
              {kicker}
            </p>
            <h2 className="truncate font-display text-sm font-bold sm:text-base">{slide.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="All slides"
            className="flex h-10 flex-none items-center gap-2 rounded-full border border-line bg-panel-2 px-3 text-xs font-semibold text-ink-soft hover:border-accent hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span className="font-mono tabular-nums">
              {index + 1}/{total}
            </span>
          </button>
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
        <div className="h-0.5 flex-none bg-line" aria-hidden>
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        {/* Slide */}
        <div className="relative min-h-0 flex-1">
        {/* overflow-x-hidden: the slide's entrance slides in from 28px to the side, which otherwise
            gave the scroller a hidden 28px of horizontal scroll on phones. */}
        <div ref={bodyRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div
            key={index}
            className={"nr-slide mx-auto flex min-h-full w-full max-w-[1160px] flex-col px-4 py-4 sm:px-10 sm:py-7 " + (dir > 0 ? "nr-slide-next" : "nr-slide-prev")}
            aria-live="polite"
          >
            {renderSlide(index, setStock)}
          </div>
        </div>
        {/* The slide's bottom edge fades a little while more is below; the "More below" button
            itself sits in the footer, where it never covers a table row or a card's text. (One
            set of Prev/Next in the footer too: side arrows on top of the slide doubled them.) */}
        {moreBelow && !menuOpen && <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-5 bg-gradient-to-t from-bg to-transparent" />}
        {/* Slide index */}
        {menuOpen && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-bg p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">Contents</p>
            <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className={
                      "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition " +
                      (i === index ? "border-accent bg-panel" : "border-line bg-panel hover:border-accent")
                    }
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-panel-2 font-mono text-xs font-bold text-accent">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-display text-sm font-semibold text-ink">{s.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{s.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center gap-2 border-t border-line bg-panel px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          {cta.external ? (
            // An outside document (an IPO's offer document) opens in a new tab and keeps the deck open.
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-bg hover:opacity-90 sm:px-4 sm:text-sm"
            >
              <span className="truncate sm:hidden">{cta.short}</span>
              <span className="hidden truncate sm:inline">{cta.label}</span>
              <span aria-hidden>&#8599;</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <Link
              href={cta.href}
              replace
              onClick={leave(cta.href)}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-bg hover:opacity-90 sm:px-4 sm:text-sm"
            >
              <span className="truncate sm:hidden">{cta.short}</span>
              <span className="hidden truncate sm:inline">{cta.label}</span>
              <span aria-hidden>&rarr;</span>
            </Link>
          )}
          {extra && (
            <Link
              href={extra.href}
              replace
              onClick={leave(extra.href)}
              className="hidden flex-none items-center gap-1.5 rounded-lg border border-line px-3 py-2.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-ink sm:inline-flex sm:text-sm"
            >
              {extra.label}
            </Link>
          )}
          <div className="ml-auto hidden items-center gap-1.5 md:flex" aria-hidden>
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                tabIndex={-1}
                onClick={() => go(i)}
                title={s.title}
                className={"h-1.5 rounded-full transition-all " + (i === index ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-ink-soft")}
              />
            ))}
          </div>
          <div className="ml-auto flex flex-none items-center gap-2 md:ml-3">
            {moreBelow && !menuOpen && (
              <button
                type="button"
                onClick={() => bodyRef.current?.scrollBy({ top: bodyRef.current.clientHeight * 0.7, behavior: "smooth" })}
                aria-label="Scroll down for more"
                className="flex h-10 items-center gap-1 rounded-full border border-line bg-panel-2 px-3 text-xs font-semibold text-ink-soft transition hover:border-accent hover:text-ink"
              >
                <span className="hidden lg:inline">More below</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-accent bg-accent text-bg transition hover:opacity-90 disabled:border-line disabled:bg-panel-2 disabled:text-ink-soft disabled:opacity-60 disabled:hover:opacity-60"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={() => (index === total - 1 ? onClose() : go(index + 1))}
              aria-label={index === total - 1 ? "Close report" : "Next slide"}
              className="flex h-10 items-center gap-1.5 rounded-full border border-accent bg-accent px-4 text-sm font-semibold text-bg transition hover:opacity-90"
            >
              <span className="hidden sm:inline">{index === total - 1 ? "Done" : "Next"}</span>
              {index === total - 1 ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                <Chevron dir="right" />
              )}
            </button>
          </div>
        </div>

      </div>
      {stock && <StockModalHost ticker={stock.ticker} supplier={stock.supplier} onClose={() => setStock(null)} />}
    </div>,
    document.body
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
