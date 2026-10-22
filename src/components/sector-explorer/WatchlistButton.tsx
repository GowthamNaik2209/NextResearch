"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { returnToStockPath } from "@/lib/safe-next";
import "./watchlist.css";

type Props = { ticker: string; name?: string };

// A page like the sector overview renders a WatchlistButton per company —
// easily 20-30 at once. Without sharing state they'd each fire their own GET
// /api/watchlist on mount (confirmed: 50+ requests for one page load during
// testing). Module-level cache + a tiny listener set instead: one fetch per
// page load total, and a toggle in any one button updates every other
// instance showing the same ticker without a refetch.
let tickersCache: Set<string> | null = null;
// From the same GET: false = signed out, so a heart tap goes straight to the sign-up prompt
// without a request that is bound to 401. null = unknown (load failed) - then we just try.
let signedIn: boolean | null = null;
let inFlight: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

function loadTickers(): Promise<Set<string>> {
  if (tickersCache) return Promise.resolve(tickersCache);
  if (!inFlight) {
    inFlight = fetch("/api/watchlist")
      .then((r) => {
        if (!r.ok) throw new Error(`watchlist ${r.status}`);
        return r.json();
      })
      .then((data: { tickers?: string[]; signedIn?: boolean }) => {
        tickersCache = new Set(data.tickers ?? []);
        signedIn = typeof data.signedIn === "boolean" ? data.signedIn : null;
        return tickersCache;
      })
      .catch(() => {
        // Not cached: a failed load (network blip, a 500) would otherwise show every heart empty
        // for the rest of the visit. The next heart to mount, or the next tap, tries again.
        inFlight = null;
        signedIn = null;
        return new Set<string>();
      });
  }
  return inFlight;
}

function setLiked(ticker: string, liked: boolean) {
  const notifyAll = () => listeners.forEach((notify) => notify());
  // Never start a cache from one ticker (every other heart would read "not saved" for the rest
  // of the visit): with no list loaded, load the real one instead.
  if (!tickersCache) {
    void loadTickers().then(notifyAll);
    return;
  }
  if (liked) tickersCache.add(ticker);
  else tickersCache.delete(ticker);
  notifyAll();
}

// A signed-out tap on the heart remembers the ticker here before sending them to sign up /
// log in; ReturnToStock finishes the save once they're back on the page with ?stock=TICKER.
// localStorage (not the URL) so a shared link can never add to someone's watchlist.
const PENDING_KEY = "nr-pending-watch";
const PENDING_TTL_MS = 60 * 60 * 1000;

function rememberPendingSave(ticker: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ticker, at: Date.now() }));
  } catch {}
}

// True if `ticker` is the one they asked to save within the last hour. Only forgotten once
// the save succeeds, so landing back here still signed out (e.g. browser Back from the login
// page) doesn't use it up.
export function hasPendingSave(ticker: string): boolean {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    const pending = JSON.parse(raw) as { ticker?: string; at?: number };
    if (typeof pending.at !== "number" || Date.now() - pending.at >= PENDING_TTL_MS) {
      localStorage.removeItem(PENDING_KEY);
      return false;
    }
    return pending.ticker === ticker;
  } catch {
    return false;
  }
}

export function clearPendingSave() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

// Adds `ticker` for the signed-in user and updates every heart on the page. Login finishes
// with a client-side navigation, so the cache may still hold the signed-out (empty) list:
// reload it first, which also stops that load landing afterwards and wiping the new entry.
export async function saveToWatchlist(ticker: string): Promise<boolean> {
  tickersCache = null;
  inFlight = null;
  await loadTickers();
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  }).catch(() => null);
  if (!res?.ok) return false;
  setLiked(ticker, true);
  return true;
}

export function WatchlistButton({ ticker, name }: Props) {
  const [, setTick] = useState(0);
  // A tap is being saved. The heart already shows the new state (optimistic); this only stops
  // a second tap from racing the first and marks the button busy for assistive tech.
  const [pending, setPending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const liked = tickersCache?.has(ticker) ?? false;

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    loadTickers().then(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (pending) return;
      setPending(true);
      let flipped: boolean | null = null; // the state shown optimistically, to undo on failure
      try {
        // Usually already loaded on mount; awaiting covers a tap before that finished. A cached
        // "signed out" may predate a login finished by client-side navigation (module state
        // survives it), so re-check that case - a GET, which answers 200 either way.
        if (signedIn !== true) {
          tickersCache = null;
          inFlight = null;
        }
        await loadTickers();
        listeners.forEach((notify) => notify());
        if (signedIn === false) {
          setNeedsAuth(true);
          return;
        }
        // The list couldn't be read, so we can't tell an add from a remove: leave it for a retry.
        if (!tickersCache) return;
        const wasLiked = tickersCache?.has(ticker) ?? false;
        // Fill (or empty) the heart now: the save can take a few seconds (it fetches a live
        // price for priceAtAdd), and a heart that doesn't react invites a second tap.
        flipped = !wasLiked;
        setLiked(ticker, flipped);
        if (flipped) {
          // Instagram-style pop only plays on the like action, not on unlike
          // or on mount with an already-liked ticker.
          setJustLiked(true);
          setTimeout(() => setJustLiked(false), 450);
        }
        const res = await (wasLiked
          ? fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" })
          : fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticker }),
            })
        ).catch(() => null);
        if (res?.ok) {
          setNeedsAuth(false);
          flipped = null;
        } else if (res?.status === 401) {
          // Session expired since the page loaded.
          signedIn = false;
          setNeedsAuth(true);
        }
      } finally {
        // Anything but a success puts the heart back the way it was.
        if (flipped !== null) setLiked(ticker, !flipped);
        setPending(false);
      }
    },
    [ticker, pending]
  );

  return (
    <span className="watch-wrap">
      <button
        type="button"
        // The visible heart stays small on a mouse; on touch screens the button itself is the
        // 40x40 target (watchlist.css), so its tap area never reaches over the text beside it.
        className={"watch-btn" + (liked ? " active" : "") + (justLiked ? " pop" : "") + (pending ? " pending" : "")}
        onClick={toggle}
        aria-busy={pending || undefined}
        aria-pressed={liked}
        aria-label={liked ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
        title={liked ? "Remove from watchlist" : "Add to watchlist"}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" className="watch-heart" aria-hidden>
          <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.9 1 5.3 4.3 4.1c2.3-.8 4.6.1 5.9 2 .5.7 1.4 1.9 1.8 2.5.4-.6 1.3-1.8 1.8-2.5 1.3-1.9 3.6-2.8 5.9-2 3.3 1.2 4.2 4.8 2.5 7.6C19.5 16.4 12 21 12 21z" />
        </svg>
      </button>
      {needsAuth && <SavePrompt ticker={ticker} name={name} onClose={() => setNeedsAuth(false)} />}
    </span>
  );
}

// Shown when a signed-out visitor taps the heart: the moment they actually want an account.
// Portalled to <body> so it sits above the stock pop-up and is never clipped by a list row.
// Sign up / log in return them to this page with the pop-up reopened and the stock saved.
function SavePrompt({ ticker, name, onClose }: { ticker: string; name?: string; onClose: () => void }) {
  const [next] = useState(() => returnToStockPath(window.location.pathname, window.location.search, ticker));
  const q = `?next=${encodeURIComponent(next)}`;
  const firstRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    // Capture phase on window runs before the stock pop-up's own Escape handler, so Esc
    // closes just this prompt and leaves the pop-up open.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    // React events bubble through portals up the component tree (to list rows and cards
    // that open the pop-up on click), so stop them here.
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-prompt-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 text-ink shadow-2xl"
      >
        <h2 id="save-prompt-title" className="font-display text-base font-bold">
          Save {name ?? ticker} to your watchlist
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Create a free account to keep track of companies you&rsquo;re researching. We&rsquo;ll bring you straight back here.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            ref={firstRef}
            href={`/signup${q}`}
            onClick={() => rememberPendingSave(ticker)}
            className="rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-bg hover:opacity-90"
          >
            Create free account
          </Link>
          <Link
            href={`/login${q}`}
            onClick={() => rememberPendingSave(ticker)}
            className="rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-center text-sm font-semibold text-ink hover:border-accent"
          >
            I already have an account
          </Link>
          <button type="button" onClick={onClose} className="mt-1 py-1 text-xs text-ink-soft hover:text-ink">
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
