"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ShortcutLink } from "./KeyboardShortcuts";
import { subscribeWatchlist, watchlistSnapshot } from "./sector-explorer/WatchlistButton";

// The header's watchlist link: the heart, a count of saved stocks for a signed-in user (from the
// hearts' shared list, so it moves with every tap on the page), and a short pulse when it grows,
// so a save points the eye at where the list lives. The count is in the accent (yellow in the dark
// theme, green in the light one): red read as an alert. "Watchlist" is spelled out from xl, where the
// header has the room. Signed out it is the plain heart, with no request for a list it can't read.
export function WatchlistNavLink({ signedIn }: { signedIn: boolean }) {
  const snap = useSyncExternalStore(signedIn ? subscribeWatchlist : noop, signedIn ? watchlistSnapshot : none, none);
  const count = snap == null ? null : snap === "" ? 0 : snap.split(",").length;
  const prev = useRef(count);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (count != null && prev.current != null && count > prev.current) setPulse(true);
    prev.current = count;
  }, [count]);

  return (
    <ShortcutLink
      href="/watchlist"
      shortcut="W"
      label="Watchlist"
      aria-label={count ? `Watchlist, ${count} saved` : "Watchlist"}
      className="tap-target relative flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-danger sm:h-9 sm:min-w-9 xl:px-3"
    >
      <span className={"flex" + (pulse ? " watch-nav-pulse text-danger" : "")} onAnimationEnd={() => setPulse(false)}>
        <HeartIcon filled={!!count} />
      </span>
      <span className="hidden text-sm font-medium text-ink xl:inline">Watchlist</span>
      {!!count && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-none text-bg xl:static xl:h-[18px] xl:min-w-[18px]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </ShortcutLink>
  );
}

const noop = () => () => {};
const none = () => null;

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? "currentColor" : "none"} fillOpacity={filled ? 0.18 : undefined} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.9 1 5.3 4.3 4.1c2.3-.8 4.6.1 5.9 2 .5.7 1.4 1.9 1.8 2.5.4-.6 1.3-1.8 1.8-2.5 1.3-1.9 3.6-2.8 5.9-2 3.3 1.2 4.2 4.8 2.5 7.6C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
