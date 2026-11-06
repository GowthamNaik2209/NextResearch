// Each user's own stocks in the morning brief's "Key dates": confirmed results dates and ex-dividend
// dates in the next two weeks, from Yahoo (live/yahoo.ts getCompanyCalendar). Yahoo has no AGM
// dates. One read per stock per send, shared by every user who saved it.
import { getCompanyCalendar, type CompanyCalendar } from "@/lib/live/yahoo";
import type { KeyDate } from "./types";

const DAY_MS = 86_400_000;
const CONCURRENCY = 6;

/** Each ticker's calendar (a stock Yahoo has nothing for is left out). */
export async function calendarsFor(tickers: string[]): Promise<Map<string, CompanyCalendar>> {
  const out = new Map<string, CompanyCalendar>();
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < tickers.length) {
        const t = tickers[next++];
        const cal = await getCompanyCalendar(t).catch(() => null);
        if (cal) out.set(t, cal);
      }
    }),
  );
  return out;
}

/** The saved stocks' dates from `today` to `horizonDays` ahead, soonest first. */
export function stockEvents(saved: { ticker: string; name: string }[], cals: Map<string, CompanyCalendar>, today: string, horizonDays = 14): KeyDate[] {
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + horizonDays * DAY_MS).toISOString().slice(0, 10);
  const inWindow = (d: string | null): d is string => d != null && d >= today && d <= end;
  const out: KeyDate[] = [];
  for (const s of saved) {
    const cal = cals.get(s.ticker);
    if (!cal) continue;
    if (inWindow(cal.results)) out.push({ day: cal.results, what: `${s.name} results` });
    if (inWindow(cal.exDividend)) out.push({ day: cal.exDividend, what: `${s.name} ex-dividend` });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
