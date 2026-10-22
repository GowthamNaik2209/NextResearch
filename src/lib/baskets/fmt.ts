// Basket-specific wording on top of src/lib/format.ts.
import { signedPct } from "@/lib/format";

/**
 * A signed figure in percentage points without the unit ("+2.89", "−0.17", "0.00"): a stock's
 * share of the basket's return, a gap between two returns. Same sign rule as signedPct, so a
 * tiny negative never reads "−0.00".
 */
export const signedPts = (v: number, dp = 1) => signedPct(v, dp).replace("%", "");
