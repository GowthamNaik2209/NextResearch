import type { ChartRange } from "@/lib/live/yahoo";
import type { RebalanceRule, Strategy } from "@/lib/baskets/strategy";

// The words the basket pages use for a backtest's settings, in one place so every panel title,
// button and help line names the same thing the same way: "Weighting" (Equal, M-cap, Custom),
// "Rebalancing" (Never, Monthly, Quarterly, Drift) and the period ("past 1 year").
// Titles are built from the live strategy, so they always match the controls above them.

/** The Rebalancing buttons. "Never" rather than "Hold": the control is about rebalancing. */
export const REBALANCE_BUTTON: Record<RebalanceRule, string> = { never: "Never", monthly: "Monthly", quarterly: "Quarterly", drift: "Drift" };

const PERIOD: Record<string, string> = { "1M": "1 month", "6M": "6 months", "1Y": "1 year", "2Y": "2 years", "3Y": "3 years", "5Y": "5 years" };
/** "past 1 year" for a range code. */
export const pastPeriod = (range: ChartRange) => `past ${PERIOD[range] ?? range}`;

const WEIGHTING_WORDS = { equal: "equal weight", mcap: "market-cap weight", custom: "custom weights" } as const;

/** "equal weight, not rebalanced" / "custom weights, rebalanced monthly" / "equal weight, rebalanced at 5-pt drift". */
export function basisLabel(s: Strategy): string {
  const r =
    s.rebalance === "never" ? "not rebalanced" : s.rebalance === "drift" ? `rebalanced at ${s.band}-pt drift` : `rebalanced ${s.rebalance}`;
  return `${WEIGHTING_WORDS[s.weighting]}, ${r}`;
}

/** The same basket at the same weights, never rebalanced: the line and card beside a rebalanced one. */
export const NOT_REBALANCED = "Not rebalanced";
