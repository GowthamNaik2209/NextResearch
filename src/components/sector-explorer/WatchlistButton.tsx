"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Props = { ticker: string };

// A page like the sector overview renders a WatchlistButton per company —
// easily 20-30 at once. Without sharing state they'd each fire their own GET
// /api/watchlist on mount (confirmed: 50+ requests for one page load during
// testing). Module-level cache + a tiny listener set instead: one fetch per
// page load total, and a toggle in any one button updates every other
// instance showing the same ticker without a refetch.
let tickersCache: Set<string> | null = null;
let inFlight: Promise<Set<string>> | null = null;
const listeners = new Set<() => void>();

function loadTickers(): Promise<Set<string>> {
  if (tickersCache) return Promise.resolve(tickersCache);
  if (!inFlight) {
    inFlight = fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data: { tickers?: string[] }) => {
        tickersCache = new Set(data.tickers ?? []);
        return tickersCache;
      })
      .catch(() => {
        tickersCache = new Set();
        return tickersCache;
      });
  }
  return inFlight;
}

function setLiked(ticker: string, liked: boolean) {
  if (!tickersCache) tickersCache = new Set();
  if (liked) tickersCache.add(ticker);
  else tickersCache.delete(ticker);
  listeners.forEach((notify) => notify());
}

export function WatchlistButton({ ticker }: Props) {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
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
      if (loading) return;
      setLoading(true);
      const wasLiked = tickersCache?.has(ticker) ?? false;
      try {
        const res = wasLiked
          ? await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" })
          : await fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticker }),
            });
        if (res.status === 401) {
          setNeedsAuth(true);
        } else if (res.ok) {
          setNeedsAuth(false);
          setLiked(ticker, !wasLiked);
          // Instagram-style pop only plays on the like action, not on unlike
          // or on mount with an already-liked ticker.
          if (!wasLiked) {
            setJustLiked(true);
            setTimeout(() => setJustLiked(false), 450);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [ticker, loading]
  );

  return (
    <span className="watch-wrap">
      <button
        type="button"
        className={"watch-btn" + (liked ? " active" : "") + (justLiked ? " pop" : "")}
        onClick={toggle}
        disabled={loading}
        aria-pressed={liked}
        aria-label={liked ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
        title={liked ? "Remove from watchlist" : "Add to watchlist"}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" className="watch-heart">
          <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.9 1 5.3 4.3 4.1c2.3-.8 4.6.1 5.9 2 .5.7 1.4 1.9 1.8 2.5.4-.6 1.3-1.8 1.8-2.5 1.3-1.9 3.6-2.8 5.9-2 3.3 1.2 4.2 4.8 2.5 7.6C19.5 16.4 12 21 12 21z" />
        </svg>
      </button>
      {needsAuth && (
        <Link href="/login" className="watch-auth-hint">
          Log in to save
        </Link>
      )}
    </span>
  );
}
