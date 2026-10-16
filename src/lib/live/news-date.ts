// Pure date label for headlines, shared by the server (news.ts) and the browser (NewsTime) -
// separate from news.ts so client code doesn't bundle the sector content it imports.

const HOUR = 3_600_000;

/** "3h ago" for the last 24 hours, "12 Oct 2026" (IST calendar date) for older ones. */
export function formatNewsDate(ts: number, now = Date.now()): string {
  const hours = (now - ts) / HOUR;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
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
