// One home for how numbers and dates read on screen, so the same figure looks the same on every
// page (baskets, decks, watchlist, pop-ups). Pure functions: safe in server and client code.

/** Shown wherever a value is missing. */
export const NA = "—";

/** Typographic minus: "−4.2%" lines up with "+4.2%" where a hyphen would not. */
const MINUS = "−";

/**
 * Signed percent, e.g. +12.3% / −4.0%. The sign follows the *rounded* figure, so a tiny loss
 * never reads "−0.0%". Values of 100% or more drop the decimal (+240%) unless `dp` is given.
 */
export function signedPct(v: number | null | undefined, dp?: number): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const places = dp ?? (Math.abs(v) >= 100 ? 0 : 1);
  const r = Number(v.toFixed(places));
  return `${r > 0 ? "+" : r < 0 ? MINUS : ""}${Math.abs(r).toFixed(places)}%`;
}

/** Unsigned percent with a typographic minus for negatives, e.g. 18.4% / −2.1%. */
export function pct(v: number | null | undefined, dp = 1): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const r = Number(v.toFixed(dp));
  return `${r < 0 ? MINUS : ""}${Math.abs(r).toFixed(dp)}%`;
}

/** Chart axis ticks: whole steps drop the ".0" (+8%), half steps keep it (−12.5%). */
export function axisPct(v: number): string {
  const a = Math.round(Math.abs(v) * 10) / 10;
  return `${v > 0 && a ? "+" : v < 0 && a ? MINUS : ""}${a.toFixed(Number.isInteger(a) ? 0 : 1)}%`;
}

/**
 * Rupee crore figure, short: 1,74,575 -> "₹1.75L Cr", 8,420 -> "₹8,420 Cr". A lakh crore reads
 * faster than seven digits on a phone. `rupee: false` drops the ₹ (for table cells under a ₹ header).
 */
export function croreShort(cr: number | null | undefined, { rupee = true }: { rupee?: boolean } = {}): string {
  if (cr == null || !Number.isFinite(cr)) return NA;
  const sym = rupee ? "₹" : "";
  const sign = cr < 0 ? MINUS : "";
  const a = Math.abs(cr);
  return a >= 100_000 ? `${sign}${sym}${(a / 100_000).toFixed(2)}L Cr` : `${sign}${sym}${Math.round(a).toLocaleString("en-IN")} Cr`;
}

/** Indian digit grouping, e.g. 1,74,575. */
export function inr(v: number | null | undefined, dp = 0): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Dates are "YYYY-MM-DD" trading days or ISO timestamps at UTC midnight. Formatting them in UTC
// keeps a reader west of UTC from seeing the previous day.

/** "20 Oct 2026" (or "20 Oct 26" with `short`). */
export function fmtDay(t: string | number | Date, { short = false }: { short?: boolean } = {}): string {
  return new Date(t).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: short ? "2-digit" : "numeric",
    timeZone: "UTC",
  });
}

/** "Oct 2026". */
export function fmtMonth(t: string | number | Date): string {
  return new Date(t).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}
