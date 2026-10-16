"use client";

import { useSyncExternalStore } from "react";
import { newsAgeLabel } from "@/lib/live/news-date";

// Headline age rendered against the *viewer's* clock. Pages and /api/stock responses are cached
// for minutes to hours, so a server-computed "3h ago" disagreed between the landing page, the
// pop-up and /updates for the same story. Hydration first shows the server label (no mismatch),
// then switches to the age computed here, refreshed every minute.
const MINUTE = 60_000;
const subscribe = (notify: () => void) => {
  const id = setInterval(notify, MINUTE);
  return () => clearInterval(id);
};
const nowMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;
const serverNow = () => null;

export function NewsTime({ label, ts, className }: { label: string; ts?: number; className?: string }) {
  const now = useSyncExternalStore(subscribe, nowMinute, serverNow);
  return <span className={className}>{now == null ? label : newsAgeLabel(label, ts, now)}</span>;
}
