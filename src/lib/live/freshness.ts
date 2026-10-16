// Pure helpers shared by the server (lib/live/yahoo.ts) and the stock pop-up (components/stock/
// merge.ts) - kept out of yahoo.ts so the browser bundle doesn't pull in yahoo-finance2.

const DAY = 86_400_000;

// 6 calendar days covers a weekend plus a couple of exchange holidays (Diwali); a quote older
// than that comes from a dead/frozen symbol, not a closed market, and must not be shown as live.
export const MAX_QUOTE_AGE_DAYS = 6;

export function isFreshQuote(asOf: string | Date | null | undefined, now = Date.now()): boolean {
  const t = asOf instanceof Date ? asOf.getTime() : asOf ? Date.parse(asOf) : NaN;
  return Number.isFinite(t) && now - t <= MAX_QUOTE_AGE_DAYS * DAY && t <= now + DAY;
}
