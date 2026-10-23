// Pure date label for headlines, shared by the server (news.ts) and the browser (NewsTime) -
// separate from news.ts so client code doesn't bundle the sector content it imports.

const HOUR = 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Times that mean "this day, time unknown": Google News dates many stories 07:00:00 GMT (12:30
// IST) when the publisher gave no time, and curated items are parsed at UTC or IST midnight. A
// dozen such stories all read "Just now" at once at 12:30 IST, so these get the date instead.
const DATE_ONLY_UTC_MINUTES = new Set([0, 7 * 60, 18 * 60 + 30]);
export function isDateOnly(ts: number): boolean {
  const d = new Date(ts);
  return d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 && DATE_ONLY_UTC_MINUTES.has(d.getUTCHours() * 60 + d.getUTCMinutes());
}

/** "3h ago" for the last 24 hours, "12 Oct 2026" (IST calendar date) for older ones and date-only stamps. */
export function formatNewsDate(ts: number, now = Date.now()): string {
  const hours = isDateOnly(ts) ? Infinity : (now - ts) / HOUR;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  // Fixed month names: newer ICU builds abbreviate September as "Sept", which the rest of the
  // site writes "Sep". The calendar date is IST's (+5:30).
  const ist = new Date(ts + 5.5 * HOUR);
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

const RELATIVE = /^(Just now|\d+h ago)$/;
const FULL_DATE = /^\d{1,2} [A-Z][a-z]{2,3} \d{4}$/; // "Sept" in some ICU builds

/**
 * The label to show for a headline at `now`. Server labels go stale in cached pages/responses
 * ("3h ago" rendered three hours ago), so relative and exact-date labels are recomputed from
 * `ts`; anything else (curated items dated only "Mar 2026") is shown as authored.
 */
export function newsAgeLabel(label: string, ts: number | undefined, now: number): string {
  if (ts == null || !Number.isFinite(ts)) return label;
  if (RELATIVE.test(label) || FULL_DATE.test(label)) return formatNewsDate(ts, now);
  return label;
}
