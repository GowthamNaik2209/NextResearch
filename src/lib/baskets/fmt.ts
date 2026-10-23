// Basket-specific wording on top of src/lib/format.ts.
import { signedPct } from "@/lib/format";

/**
 * A percent as signedPct shows it (one decimal, none from 100% up), as a number. Gaps between two
 * shown figures are taken between these, so "−5.8%" beside "−12.3%" reads "+6.5 pts", never +6.4.
 */
export const shownPct = (v: number) => Number(v.toFixed(Math.abs(v) >= 100 ? 0 : 1));

/**
 * A signed figure in percentage points without the unit ("+2.89", "−0.17", "0.00"): a stock's
 * share of the basket's return, a gap between two returns. Same sign rule as signedPct, so a
 * tiny negative never reads "−0.00".
 */
export const signedPts = (v: number, dp = 1) => signedPct(v, dp).replace("%", "");
