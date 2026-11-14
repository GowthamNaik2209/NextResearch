"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

// Signals is for tablets and computers for now (docs/SIGNALS.md section 5): on a phone the page says
// so and the tool isn't mounted at all, so no backtest runs. The site's phone width, as BasketChart's.
const PHONE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function SignalsGate({ children, what = "build and backtest entry and exit rules" }: { children: ReactNode; /** What the larger screen is for, after "Open this page on a larger screen to". */ what?: string }) {
  // Unknown on the server: nothing is drawn until the browser says which it is.
  const phone = useSyncExternalStore(subscribe, () => window.matchMedia(PHONE_QUERY).matches, () => null);
  // The content appears only after the page loads, so a link to an anchor in it (the guide's
  // #rsi14) found nothing to jump to: jump once it is there.
  useEffect(() => {
    if (phone !== false) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [phone]);
  if (phone === null) return <div className="min-h-48" aria-busy />;
  if (phone) return <SignalsPhoneNote what={what} />;
  return <>{children}</>;
}

/** What a phone sees instead of Signals. `className` lets a page show it by CSS alone (the guide, whose text is in the HTML). */
export function SignalsPhoneNote({ what, className = "" }: { what: string; className?: string }) {
  return (
    <div className={`rounded-md border border-line bg-panel px-4 py-5 text-sm text-ink-soft ${className}`}>
      <p className="font-semibold text-ink">Signals works on a tablet or computer for now.</p>
      <p className="mt-1">Open this page on a larger screen to {what}.</p>
      <Link href="/baskets" className="mt-3 inline-flex min-h-10 items-center rounded border border-btn px-3 text-xs font-semibold text-accent">
        Go to Baskets
      </Link>
    </div>
  );
}
