// The FII / DII view's period (?period=): one choice for the whole view, from the latest day back.
// Each block reads it at its own data's grain and says what it covered: daily cash flows and futures
// positions use the period as is, NSDL's sector flows come in fortnights, and shareholding changes
// only with each quarterly filing. Pure, so server and client code share it.

export const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "1M";

export const PERIOD_LABEL: Record<Period, string> = {
  "1D": "1 day",
  "1W": "1 week",
  "1M": "1 month",
  "3M": "3 months",
  "6M": "6 months",
  "1Y": "1 year",
  "2Y": "2 years",
  "3Y": "3 years",
  "5Y": "5 years",
};

/** The period's length in months (0 for 1D and 1W, which are counted in days). */
const MONTHS: Record<Period, number> = { "1D": 0, "1W": 0, "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "2Y": 24, "3Y": 36, "5Y": 60 };

export const parsePeriod = (v: string | undefined): Period => PERIODS.find((p) => p === v?.toUpperCase()) ?? DEFAULT_PERIOD;

/**
 * Months back from `d`. A month's last day maps to the last day of the earlier month (30 Sep - 6M =
 * 31 Mar, so quarter ends line up), and a day past the earlier month's end to its last day
 * (31 Mar - 1M = 28 Feb).
 */
export function monthsBefore(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() - months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const monthEnd = d.getUTCDate() === new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, monthEnd ? last : Math.min(d.getUTCDate(), last)));
}

/**
 * The first day a period covers, ending on `latest` (both UTC-midnight days): 1D is the latest day
 * alone, 1W the seven days up to it, and the rest whole calendar months back: the day after the same
 * date that many months earlier (1M ending 30 Oct starts 1 Oct; 1Y ending 30 Oct 2026 starts 31 Oct 2025).
 */
export function periodStart(period: Period, latest: Date): Date {
  const DAY = 86_400_000;
  if (period === "1D") return latest;
  if (period === "1W") return new Date(latest.getTime() - 6 * DAY);
  return new Date(monthsBefore(latest, MONTHS[period]).getTime() + DAY);
}

/** Months the period spans (1D and 1W count as under a month). */
export const periodMonths = (p: Period) => MONTHS[p];
