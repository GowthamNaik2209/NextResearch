// What every projection panel on a basket page reads (docs/PROJECTIONS.md): built once by
// useProjection (./use-projection.ts) from the page's stocks, weights, chart picks and the
// Projections settings, so the cards, chart, table, Breakdown, statistics and analysis agree.
import type { BasketStock } from "@/lib/baskets/industry";
import type { Horizon, Scenario } from "@/lib/baskets/projection";
import type { BasketProjection, ProjectionSettings, Simulation } from "@/lib/baskets/projection-basket";

export const SCENARIO_LABEL: Record<Scenario, string> = { bear: "Bear", base: "Base", bull: "Bull" };
export const HORIZON_LONG: Record<Horizon, string> = { 1: "1 year", 2: "2 years" };
export const EXIT_LABEL = { own: "Own P/E", ind: "Industry P/E" } as const;
/** The line every projected panel carries. */
export const PROJECTION_DISCLAIMER = "Model projection from reported financials and past prices, not a forecast or a recommendation.";

export type ProjectionView = {
  settings: ProjectionSettings;
  /** "next 1 year" / "next 2 years". */
  period: string;
  /** "base case". */
  caseLabel: string;
  /** The whole basket in the chosen case. */
  basket: BasketProjection;
  /** The basket's return in each case (same horizon and exit), fractions; null when nothing is projected. */
  cases: Record<Scenario, number | null>;
  /** The stocks picked on the chart as their own basket, when some (not all) are picked; else null. */
  picks: BasketProjection | null;
  picksCount: number;
  /** The stocks the table and Breakdown measure: the basket's, or the picks' in Your picks. */
  table: BasketProjection;
  /** Weekly dates from today's last close to the horizon (52 or 104 steps after it). */
  dates: string[];
  /** The basket's value path in the chosen case, % from today, one per date. */
  path: number[];
  /** The basket's volatility over the past year (a fraction), from its 1Y backtest. */
  vol: number | null;
  /** Simulated paths around the chosen case (likely range, drawdowns, chance of a loss). */
  sim: Simulation | null;
  /** "loading": the past year's backtest is still on its way; "none": it failed or is too short. */
  simState: "loading" | "ok" | "none";
  /** Every stock in the basket (names, layers, each one's projection inputs in .proj). */
  stocks: BasketStock[];
  /** Each stock's target share before left-out stocks were spread (0-1), by ticker. */
  shares: Map<string, number>;
};
