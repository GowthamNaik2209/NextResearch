// Pure helpers shared by the server (lib/live/yahoo.ts) and the stock pop-up (components/stock/
// merge.ts) - kept out of yahoo.ts so the browser bundle doesn't pull in yahoo-finance2.

import { sep } from "@/lib/format";

const DAY = 86_400_000;

// 6 calendar days covers a weekend plus a couple of exchange holidays (Diwali); a quote older
// than that comes from a dead/frozen symbol, not a closed market, and must not be shown as live.
export const MAX_QUOTE_AGE_DAYS = 6;

export function isFreshQuote(asOf: string | Date | null | undefined, now = Date.now()): boolean {
  const t = asOf instanceof Date ? asOf.getTime() : asOf ? Date.parse(asOf) : NaN;
  return Number.isFinite(t) && now - t <= MAX_QUOTE_AGE_DAYS * DAY && t <= now + DAY;
}

// How to describe a quote's timing. Yahoo's NSE feed is ~15 minutes behind while the market is
// open; once it has closed (evenings, weekends, holidays) the latest quote is the last trade, and
// "~15 min delayed" would read as if it were current - so say when it was.
export function quoteTiming(q: { asOf: string; delayedMin?: number | null }, now = Date.now()): string {
  const t = Date.parse(q.asOf);
  if (Number.isFinite(t) && now - t > 30 * 60_000) {
    const when = sep(new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }));
    return `last trade ${when} IST`;
  }
  return q.delayedMin ? `~${q.delayedMin} min delayed` : "live";
}
