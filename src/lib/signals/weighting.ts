// How a basket's money is split across its stocks' slots in a signal backtest (docs/SIGNALS.md
// section 4b): equal, by market cap, or the user's own % (custom), as chosen on the basket's page and
// carried in the Signals link (`w=equal|mcap|custom`, custom % in `wt=` as the basket pages write
// them). Pure, so the rule builder, the API and the tests share it.
import { parseWeights, weightsParam } from "@/lib/baskets/strategy";

export type SignalWeighting = { scheme: "equal" | "mcap" | "custom"; weights?: Record<string, number> };

export const EQUAL: SignalWeighting = { scheme: "equal" };

export const WEIGHTING_LABEL: Record<SignalWeighting["scheme"], string> = { equal: "Equal", mcap: "Market cap", custom: "Your own %" };

/** The weighting a link or request names; equal when it names none or a custom one without weights. */
export function parseWeighting(w: unknown, wt: unknown): SignalWeighting {
  if (w === "mcap") return { scheme: "mcap" };
  if (w === "custom" && typeof wt === "string") {
    const weights = parseWeights(wt);
    if (weights) return { scheme: "custom", weights };
  }
  return EQUAL;
}

/** The link parameters for a weighting (none for equal, the default). */
export function weightingParams(x: SignalWeighting): Record<string, string> {
  if (x.scheme === "mcap") return { w: "mcap" };
  if (x.scheme === "custom" && x.weights) return { w: "custom", wt: weightsParam(x.weights) };
  return {};
}

/**
 * Each stock's share (any scale) under a weighting. Market cap: a stock without one takes the median
 * (as the basket pages do). Custom: a stock without a % gets none. Null: equal.
 */
export function slotWeights(stocks: { ticker: string; mcapCr: number | null }[], x: SignalWeighting): Map<string, number> | null {
  if (x.scheme === "custom" && x.weights) return new Map(stocks.map((s) => [s.ticker, x.weights![s.ticker] ?? 0]));
  if (x.scheme !== "mcap") return null;
  const known = stocks.map((s) => s.mcapCr).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  return new Map(stocks.map((s) => [s.ticker, s.mcapCr && s.mcapCr > 0 ? s.mcapCr : median]));
}
