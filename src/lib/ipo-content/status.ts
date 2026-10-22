// An IPO's status chip, rolled forward from its dated timeline. The authored `status.label` is
// written once ("Opens 21 Oct") and goes stale the day after; the timeline's "Issue opens" /
// "Issue closes" / "Listing" dates say where the issue really stands today. Pure, so the server
// can apply it per request (the decks themselves are cached across requests). Lives here, beside
// the content it reads; src/components/ipo/status.ts re-exports it for the UI.
import type { IpoStage } from "./types";

type WithStatus = {
  status: { stage: IpoStage; label: string; detail: string };
  timeline: { date: string; event: string; done: boolean }[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "21 Oct 2026" -> UTC midnight of that day; ranges and month-only dates ("Aug 2026") -> null. */
function parseDay(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
  if (!m) return null;
  const mon = MONTHS.indexOf(m[2].toLowerCase());
  return mon < 0 ? null : Date.UTC(+m[3], mon, +m[1]);
}

/** Today in India (issues open and close on IST dates), as UTC midnight. */
export function istToday(now = Date.now()): number {
  const d = new Date(now + 5.5 * 3600_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const short = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** The deck (or card) with its stage, chip label and timeline ticks as of `today`. */
export function liveIpoStatus<T extends WithStatus>(deck: T, today = istToday()): T {
  const dated = deck.timeline.map((t) => ({ ...t, at: parseDay(t.date) }));
  const find = (re: RegExp) => dated.find((t) => t.at != null && re.test(t.event))?.at ?? null;
  const opens = find(/^issue opens/i);
  const closes = find(/^issue closes/i);
  const lists = find(/^(listing|listed)\b/i);

  let { stage, label } = deck.status;
  // Only an issue in the window moves on its own; "SEBI approved" or "DRHP filed" waits for news.
  if (stage === "upcoming" || stage === "open") {
    if (lists != null && lists <= today) {
      stage = "listed";
      label = `Listed ${short(lists)}`;
    } else if (closes != null && closes < today) {
      stage = "upcoming";
      label = lists != null ? `Closed · lists ${short(lists)}` : "Closed";
    } else if (opens != null && opens <= today) {
      stage = "open";
      label = closes != null ? `Open · closes ${short(closes)}` : "Open now";
    } else if (opens != null) {
      label = `Opens ${short(opens)}`;
    } else if (/^opens\b/i.test(label)) {
      // An "Opens …" chip with no dated opening to check against: don't promise a date that may have passed.
      label = "Opening soon";
    }
  }
  const timeline = dated.map(({ at, ...t }) => ({ ...t, done: t.done || (at != null && at < today) }));
  if (stage === deck.status.stage && label === deck.status.label && timeline.every((t, i) => t.done === deck.timeline[i].done)) return deck;
  return { ...deck, status: { ...deck.status, stage, label }, timeline };
}
