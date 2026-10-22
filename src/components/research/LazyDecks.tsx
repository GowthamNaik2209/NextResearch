"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Deck } from "@/lib/sector-content/reports";
import type { IpoDeck } from "@/lib/ipo-content";

// Research and IPO decks, loaded when opened. Pages carry only the cards (src/lib/analysis-props.ts);
// the deck's data comes from /docs/deck/<slug> or /ipos/deck/<slug>, and the slide code (the
// biggest client chunk on the landing page) is split out with next/dynamic. Hovering or focusing
// a card starts both loads, so a click usually finds them ready.

const loadResearchDeck = () => import("./ResearchDeck");
const loadIpoDeck = () => import("@/components/ipo/IpoDeckView");
const ResearchDeck = dynamic(() => loadResearchDeck().then((m) => m.ResearchDeck), { ssr: false, loading: () => <DeckLoading /> });
const IpoDeckView = dynamic(() => loadIpoDeck().then((m) => m.IpoDeckView), { ssr: false, loading: () => <DeckLoading /> });

const requests = new Map<string, Promise<unknown>>();
function load<T>(url: string): Promise<T> {
  let p = requests.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
    // A failed load is retried next time rather than remembered.
    p.catch(() => requests.delete(url));
    requests.set(url, p);
  }
  return p as Promise<T>;
}

const reportUrl = (slug: string) => `/docs/deck/${encodeURIComponent(slug)}`;
const ipoUrl = (slug: string) => `/ipos/deck/${encodeURIComponent(slug)}`;
const quiet = (p: Promise<unknown>) => void p.catch(() => {});

/** Warm a research deck (data + slide code) before it is opened. */
export function prefetchReport(slug: string) {
  quiet(load(reportUrl(slug)));
  quiet(loadResearchDeck());
}
/** Warm an IPO deck (data + slide code) before it is opened. */
export function prefetchIpo(slug: string) {
  quiet(load(ipoUrl(slug)));
  quiet(loadIpoDeck());
}
/**
 * Opening a deck from a deep link (?ipo=<slug>, ?report=<slug>): take the parameter off the
 * landing history entry first. The deck pushes its own entry and closing steps back onto this
 * one; if it still carried the parameter, Next re-rendered the page from it and the deck opened
 * again, so Esc or ✕ seemed to do nothing on /ipos?ipo=… . The open deck puts it back on its
 * own entry (Presentation's urlParam), so the URL stays shareable while the deck is open.
 */
export function dropDeepLinkParam(name: string) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState(window.history.state, "", url);
}

/** Props for a card that opens a deck: start loading on hover, keyboard focus or touch. */
export const intentProps = (prefetch: () => void) => ({ onPointerEnter: prefetch, onFocus: prefetch, onTouchStart: prefetch });

function useDeck<T extends { slug: string }>(url: string, slug: string, initial?: T) {
  const [state, setState] = useState<{ deck: T | null; failed: boolean }>({ deck: initial?.slug === slug ? initial : null, failed: false });
  const ready = state.deck?.slug === slug;
  useEffect(() => {
    if (ready) return;
    let live = true;
    load<T>(url).then(
      (deck) => live && setState({ deck, failed: false }),
      () => live && setState({ deck: null, failed: true })
    );
    return () => {
      live = false;
    };
  }, [url, ready]);
  return { deck: ready ? state.deck : null, failed: state.failed };
}

type LazyProps<T> = {
  slug: string;
  /** The deck a deep link opens, built with the page: skips the fetch. */
  initialDeck?: T;
  onClose: () => void;
  /** Name the deck in the URL while it is open (Presentation's urlParam). */
  urlParam?: string;
};

/** A research deck by slug, loaded on open. */
export function LazyResearchDeck({ slug, initialDeck, onClose, urlParam }: LazyProps<Deck>) {
  const { deck, failed } = useDeck(reportUrl(slug), slug, initialDeck);
  return deck ? <ResearchDeck deck={deck} onClose={onClose} urlParam={urlParam} /> : <DeckLoading failed={failed} onClose={onClose} />;
}

/** An IPO deck by slug, loaded on open. */
export function LazyIpoDeck({ slug, initialDeck, onClose, urlParam }: LazyProps<IpoDeck>) {
  const { deck, failed } = useDeck(ipoUrl(slug), slug, initialDeck);
  return deck ? <IpoDeckView deck={deck} onClose={onClose} urlParam={urlParam} /> : <DeckLoading failed={failed} onClose={onClose} />;
}

// The moment between the click and the deck: the deck's own backdrop with a small status card,
// so the click visibly did something. Esc or a backdrop click cancels.
function DeckLoading({ failed = false, onClose }: { failed?: boolean; onClose?: () => void }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="nr-pop-backdrop fixed inset-0 z-[200] flex items-center justify-center p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-4 text-sm text-ink shadow-xl">
        {failed ? (
          <>
            <span>Couldn&rsquo;t load this deck. Check your connection and try again.</span>
            {onClose && (
              <button type="button" onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-accent hover:text-ink">
                Close
              </button>
            )}
          </>
        ) : (
          <>
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span>Opening deck&hellip;</span>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
