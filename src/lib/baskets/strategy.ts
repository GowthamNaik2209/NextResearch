// A basket strategy: how the money is split (weighting) and when it is put back to that split
// (rebalancing). Shared by the backtest API, the basket page and the CSV export, so one query
// string names a strategy everywhere. The default (equal or market-cap weights, bought once and
// held) writes the same "w=equal" the backtest has always used, so its URLs and caches are unchanged.

export type WeightScheme = "equal" | "mcap" | "capped" | "layer";
export type RebalanceRule = "never" | "monthly" | "quarterly" | "drift";

export type Strategy = {
  weighting: WeightScheme;
  rebalance: RebalanceRule;
  /** Drift rule: rebalance once any stock is more than this many percentage points off its target. */
  band: number;
  /** Capped market cap: most any one stock may hold, % of the basket. */
  cap: number;
  /** Capped market cap: most any one value-chain layer may hold, % of the basket. */
  layerCap: number;
};

export const DEFAULT_BAND = 5;
export const DEFAULT_CAP = 15;
export const DEFAULT_LAYER_CAP = 35;
export const BAND_CHOICES = [2, 5, 10, 20];
export const CAP_CHOICES = [10, 15, 20, 25];
export const LAYER_CAP_CHOICES = [25, 35, 50];

export const WEIGHT_SCHEMES: WeightScheme[] = ["equal", "mcap", "capped", "layer"];
export const REBALANCE_RULES: RebalanceRule[] = ["never", "monthly", "quarterly", "drift"];

export const heldStrategy = (weighting: WeightScheme = "equal"): Strategy => ({
  weighting,
  rebalance: "never",
  band: DEFAULT_BAND,
  cap: DEFAULT_CAP,
  layerCap: DEFAULT_LAYER_CAP,
});

const isScheme = (v: string | null): v is WeightScheme => !!v && (WEIGHT_SCHEMES as string[]).includes(v);
const isRule = (v: string | null): v is RebalanceRule => !!v && (REBALANCE_RULES as string[]).includes(v);
const int = (v: string | null, min: number, max: number, fallback: number) => {
  const n = v == null ? NaN : Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * Reads a strategy from query parameters. `names` maps each part to its parameter (the API uses
 * w/rb/band/cap/lcap; the page's own URL uses wt for the weighting, so it can't clash with a host
 * page's parameters). A missing weighting falls back to `weighting` (a saved basket's own).
 */
export function parseStrategy(q: URLSearchParams, fallback: WeightScheme = "equal", names = { w: "w" }): Strategy {
  const w = q.get(names.w);
  const rb = q.get("rb");
  return {
    weighting: isScheme(w) ? w : fallback,
    rebalance: isRule(rb) ? rb : "never",
    band: int(q.get("band"), 1, 50, DEFAULT_BAND),
    cap: int(q.get("cap"), 1, 100, DEFAULT_CAP),
    layerCap: int(q.get("lcap"), 1, 100, DEFAULT_LAYER_CAP),
  };
}

/** The strategy's query string, only naming the parts that apply: "w=equal" for the default. */
export function strategyQuery(s: Strategy): string {
  let q = `w=${s.weighting}`;
  if (s.weighting === "capped") q += `&cap=${s.cap}&lcap=${s.layerCap}`;
  if (s.rebalance !== "never") q += `&rb=${s.rebalance}`;
  if (s.rebalance === "drift") q += `&band=${s.band}`;
  return q;
}

/** Bought once and held at plain equal or market-cap weights: the backtest as it has always been. */
export const isPlainHold = (s: Strategy) => s.rebalance === "never" && (s.weighting === "equal" || s.weighting === "mcap");

export const SCHEME_SHORT: Record<WeightScheme, string> = { equal: "Equal", mcap: "M-cap", capped: "Capped", layer: "Layers" };
export const RULE_SHORT: Record<RebalanceRule, string> = { never: "Hold", monthly: "Monthly", quarterly: "Quarterly", drift: "Drift" };

export function weightingLabel(s: Strategy): string {
  if (s.weighting === "equal") return "Equal weight";
  if (s.weighting === "mcap") return "Market cap";
  if (s.weighting === "capped") return `Capped market cap (max ${s.cap}% a stock, ${s.layerCap}% a layer)`;
  return "Layer-balanced (equal per value-chain layer, equal within)";
}

export function rebalanceLabel(s: Strategy): string {
  if (s.rebalance === "never") return "bought and held";
  if (s.rebalance === "drift") return `rebalanced when a stock drifts ${s.band} pts off target`;
  return `rebalanced ${s.rebalance}`;
}

/** A short name for panel titles: "Equal · held", "Capped 15/35 · monthly", "Layers · drift 5 pts". */
export function strategyShort(s: Strategy): string {
  const w = s.weighting === "capped" ? `Capped ${s.cap}/${s.layerCap}` : SCHEME_SHORT[s.weighting];
  const r = s.rebalance === "never" ? "held" : s.rebalance === "drift" ? `drift ${s.band} pts` : s.rebalance;
  return `${w} · ${r}`;
}
