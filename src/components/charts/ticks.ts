import { TickMarkType, type Time } from "lightweight-charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The time axis' labels for every chart: a year where the year turns, a short month otherwise, and
 * a day only with its month ("12 Oct"), never a bare "12". The library's own labels follow the
 * browser's locale ("Sept") and print a lone day number where a short range ends mid-month.
 */
export function tickLabel(time: Time, type: TickMarkType): string {
  const d = typeof time === "string" ? new Date(`${time}T00:00:00Z`) : typeof time === "number" ? new Date(time * 1000) : new Date(Date.UTC(time.year, time.month - 1, time.day));
  if (type === TickMarkType.Year) return String(d.getUTCFullYear());
  if (type === TickMarkType.Month) return MONTHS[d.getUTCMonth()];
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
