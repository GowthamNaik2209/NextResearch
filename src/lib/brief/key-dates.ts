// The morning brief's market-wide "Key dates": data releases in the next two weeks. Most follow
// fixed rules (India's CPI and GDP, auto sales); one-off dates (central bank meetings) are typed into
// SCHEDULED below. Each user's own stocks' results and ex-dividend dates are added per email
// (events.ts). F&O expiries are left out: they come every week and aren't news. Pure: `today` is the
// IST day the brief goes out.

import type { KeyDate } from "./types";

/** Dated events that follow no rule, "YYYY-MM-DD". Add each one when its date is announced. */
export const SCHEDULED: KeyDate[] = [
  // FOMC's published 2026 calendar: the decision lands early the next morning in India.
  { day: "2026-12-09", what: "US Fed rate decision" },
];

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const weekday = (t: number) => new Date(t).getUTCDay();
const isWeekend = (t: number) => weekday(t) === 0 || weekday(t) === 6;

/** The last weekday of the month `t` is in. */
function lastWeekday(t: number): number {
  const d = new Date(t);
  let end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
  while (isWeekend(end)) end -= DAY_MS;
  return end;
}

// GDP for the quarter ending a month before: released at the end of Feb, May, Aug and Nov.
const GDP_QUARTER: Record<number, string> = { 1: "Oct–Dec", 4: "Jan–Mar", 7: "Apr–Jun", 10: "Jul–Sep" };

/** The rule-based events falling on day `t`. */
function ruleEvents(t: number): string[] {
  const d = new Date(t);
  const out: string[] = [];
  const date = d.getUTCDate();
  const month = d.getUTCMonth();
  if (date === 12) out.push(`India CPI inflation (${MONTHS[(month + 11) % 12]})`);
  if (GDP_QUARTER[month] && t === lastWeekday(t)) out.push(`India GDP, ${GDP_QUARTER[month]} quarter`);
  if (date === 1) out.push("Monthly auto sales");
  return out;
}

/** Up to `max` events from `today` to `horizonDays` ahead, soonest first. */
export function keyDates(today: string, { horizonDays = 14, max = 4 } = {}): KeyDate[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  const out: KeyDate[] = [];
  for (let t = start; t <= start + horizonDays * DAY_MS; t += DAY_MS) {
    for (const what of ruleEvents(t)) out.push({ day: iso(t), what });
    for (const s of SCHEDULED) if (s.day === iso(t)) out.push(s);
  }
  return out.slice(0, max);
}
