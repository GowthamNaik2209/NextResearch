// When the company table is due for a refresh, and which snapshot the app shows. Pure (no I/O), so
// the app, the refresh script and the tests share one definition.
//
// Dates are IST trading days stored at UTC midnight, like KpiSnapshot.asOf: "23 Oct 2026" is
// 2026-10-23T00:00:00Z whatever the server's time zone.

const IST_OFFSET_MS = 330 * 60_000; // UTC+5:30, no daylight saving
const DAY_MS = 86_400_000;

// NSE closes at 15:30 IST; Screener's pages reliably carry the day's close by about 18:00. Figures
// for trading day D are due from 18:30 IST on D.
export const DUE_MINUTES_IST = 18 * 60 + 30;

// NSE equity trading holidays falling on weekdays (NSE's published calendar). A missing or wrong
// entry is harmless: the refresh either re-reads the previous close under that day's date or waits
// a day. Add the next year's list when NSE publishes it (around December).
export const NSE_HOLIDAYS = new Set([
  // 2026
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-03-26", // Shri Ram Navami
  "2026-03-31", // Shri Mahavir Jayanti
  "2026-04-03", // Good Friday
  "2026-04-14", // Dr. Baba Saheb Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-28", // Bakri Id
  "2026-06-26", // Muharram
  "2026-09-14", // Ganesh Chaturthi
  "2026-10-02", // Mahatma Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-10", // Diwali Balipratipada
  "2026-11-24", // Prakash Gurpurb Sri Guru Nanak Dev
  "2026-12-25", // Christmas
]);

const iso = (day: Date) => day.toISOString().slice(0, 10);

/** The IST calendar date of `now`, at UTC midnight. */
export function istDay(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

/** Minutes since IST midnight. */
function istMinutes(now: Date): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/** A weekday that is not an NSE holiday (`day` at UTC midnight). */
export function isTradingDay(day: Date): boolean {
  const wd = day.getUTCDay();
  return wd !== 0 && wd !== 6 && !NSE_HOLIDAYS.has(iso(day));
}

/** The latest trading day whose figures are due by `now` (on or before today, IST). */
export function latestDueTradingDay(now: Date): Date {
  let day = istDay(now);
  if (!(isTradingDay(day) && istMinutes(now) >= DUE_MINUTES_IST)) day = new Date(day.getTime() - DAY_MS);
  while (!isTradingDay(day)) day = new Date(day.getTime() - DAY_MS);
  return day;
}

/** True when the published figures are older than the latest trading day that is due. */
export function isRefreshDue(published: Date | null, now: Date): boolean {
  return published === null || published.getTime() < latestDueTradingDay(now).getTime();
}

/**
 * The newest snapshot date the app may show. The latest PUBLISHED run's date; with no published run
 * but a run under way, the day before the earliest run (its writes stay hidden until it publishes);
 * with no runs at all, null: every company's latest snapshot (the behaviour before runs existed).
 */
export function publishedCutoff(latestPublished: Date | null, earliestRun: Date | null): Date | null {
  if (latestPublished) return latestPublished;
  if (earliestRun) return new Date(earliestRun.getTime() - DAY_MS);
  return null;
}

/** A company's snapshot to show: its latest dated on or before `cutoff` (any, when cutoff is null). */
export function pickSnapshot<T extends { asOf: Date }>(snapshots: readonly T[], cutoff: Date | null): T | undefined {
  let best: T | undefined;
  for (const s of snapshots) {
    if (cutoff && s.asOf.getTime() > cutoff.getTime()) continue;
    if (!best || s.asOf.getTime() > best.asOf.getTime()) best = s;
  }
  return best;
}
