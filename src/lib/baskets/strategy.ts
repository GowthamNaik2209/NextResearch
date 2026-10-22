// A basket strategy: how the money is split (weighting) and when it is put back to that split
// (rebalancing). Shared by the backtest API, the basket page and the CSV export, so one query
// string names a strategy everywhere. The default (equal or market-cap weights, bought once and
// held) writes the same "w=equal" the backtest has always used, so its URLs and caches are unchanged.

export type WeightScheme = "equal" | "mcap" | "custom" | "layer";
export type RebalanceRule = "never" | "monthly" | "quarterly" | "drift";

export type Strategy = {
  weighting: WeightScheme;
  rebalance: RebalanceRule;
  /** Drift rule: rebalance once any stock is more than this many percentage points off its target. */
  band: number;
  /** Custom weighting: each stock's target, % of the basket (they total 100). */
  weights?: Record<string, number>;
};

export const DEFAULT_BAND = 5;
export const BAND_CHOICES = [2, 5, 10, 20];

export const WEIGHT_SCHEMES: WeightScheme[] = ["equal", "mcap", "custom", "layer"];
export const REBALANCE_RULES: RebalanceRule[] = ["never", "monthly", "quarterly", "drift"];

export const heldStrategy = (weighting: WeightScheme = "equal", weights?: Record<string, number>): Strategy => ({
  weighting,
  rebalance: "never",
  band: DEFAULT_BAND,
  ...(weighting === "custom" && weights ? { weights } : {}),
});

const isScheme = (v: string | null): v is WeightScheme => !!v && (WEIGHT_SCHEMES as string[]).includes(v);
const isRule = (v: string | null): v is RebalanceRule => !!v && (REBALANCE_RULES as string[]).includes(v);
const int = (v: string | null, min: number, max: number, fallback: number) => {
  const n = v == null ? NaN : Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** "TCS:40,INFY:60" -> { TCS: 40, INFY: 60 }. Junk entries are dropped; undefined when none are left. */
export function parseWeights(v: string | null): Record<string, number> | undefined {
  if (!v) return undefined;
  const out: Record<string, number> = {};
  for (const part of v.split(",")) {
    const at = part.lastIndexOf(":");
    if (at <= 0) continue;
    const t = decodeURIComponent(part.slice(0, at));
    const w = Number(part.slice(at + 1));
    if (t && Number.isFinite(w) && w >= 0 && w <= 100) out[t] = w;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The weights as a stable query value: tickers A to Z, at most two decimals. */
export const weightsParam = (w: Record<string, number>) =>
  Object.keys(w)
    .sort()
    .map((t) => `${encodeURIComponent(t)}:${Math.round(w[t] * 100) / 100}`)
    .join(",");

/**
 * Reads a strategy from query parameters. `names` maps the weighting to its parameter (the API
 * uses w; the page's own URL uses wt, so it can't clash with a host page's parameters). A missing
 * weighting falls back to `fallback` (a saved basket's own). "capped", a weighting since removed,
 * reads as market cap so old links still open. Custom weights ride in cw ("TCS:40,INFY:60").
 */
export function parseStrategy(q: URLSearchParams, fallback: WeightScheme = "equal", names = { w: "w" }): Strategy {
  const raw = q.get(names.w);
  const w = raw === "capped" ? "mcap" : raw;
  const rb = q.get("rb");
  const weighting = isScheme(w) ? w : fallback;
  const weights = weighting === "custom" ? parseWeights(q.get("cw")) : undefined;
  return {
    weighting,
    rebalance: isRule(rb) ? rb : "never",
    band: int(q.get("band"), 1, 50, DEFAULT_BAND),
    ...(weights ? { weights } : {}),
  };
}

/** The strategy's query string, only naming the parts that apply: "w=equal" for the default. */
export function strategyQuery(s: Strategy): string {
  let q = `w=${s.weighting}`;
  if (s.weighting === "custom" && s.weights) q += `&cw=${weightsParam(s.weights)}`;
  if (s.rebalance !== "never") q += `&rb=${s.rebalance}`;
  if (s.rebalance === "drift") q += `&band=${s.band}`;
  return q;
}

/** Bought once and held at plain equal or market-cap weights: the backtest as it has always been. */
export const isPlainHold = (s: Strategy) => s.rebalance === "never" && (s.weighting === "equal" || s.weighting === "mcap");

export const SCHEME_SHORT: Record<WeightScheme, string> = { equal: "Equal", mcap: "M-cap", custom: "Custom", layer: "Layers" };
export const RULE_SHORT: Record<RebalanceRule, string> = { never: "Hold", monthly: "Monthly", quarterly: "Quarterly", drift: "Drift" };

export function weightingLabel(s: Strategy): string {
  if (s.weighting === "equal") return "Equal weight";
  if (s.weighting === "mcap") return "Market cap";
  if (s.weighting === "custom") return "Custom (each stock's % set by hand)";
  return "Layer-balanced (equal per value-chain layer, equal within)";
}

export function rebalanceLabel(s: Strategy): string {
  if (s.rebalance === "never") return "bought and held";
  if (s.rebalance === "drift") return `rebalanced when a stock drifts ${s.band} pts above or below its target`;
  return `rebalanced ${s.rebalance}`;
}

/** A short name for panel titles: "Equal · held", "Custom · monthly", "Layers · drift 5 pts". */
export function strategyShort(s: Strategy): string {
  const r = s.rebalance === "never" ? "held" : s.rebalance === "drift" ? `drift ${s.band} pts` : s.rebalance;
  return `${SCHEME_SHORT[s.weighting]} · ${r}`;
}

/**
 * Custom targets for the stocks given, summing to 1. A stock with no weight of its own (one added
 * where the weights weren't kept) gets the average of the others'; a subset (the chart's picks)
 * keeps the same proportions between its stocks.
 */
export function customTargets(tickers: string[], weights: Record<string, number> | undefined): Map<string, number> {
  const given = tickers.map((t) => weights?.[t]).filter((v): v is number => v != null && Number.isFinite(v) && v >= 0);
  const avg = given.length ? given.reduce((a, b) => a + b, 0) / given.length : 1;
  const raw = tickers.map((t) => {
    const v = weights?.[t];
    return v != null && Number.isFinite(v) && v >= 0 ? v : avg;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return new Map(tickers.map((t, i) => [t, sum > 0 ? raw[i] / sum : 1 / tickers.length]));
}

/**
 * Fractions (summing to 1) as percentages to one decimal that total exactly 100: each is rounded
 * down, then the tenths left over go to the largest remainders.
 */
export function toPercents(w: Map<string, number> | Record<string, number>): Record<string, number> {
  const entries = w instanceof Map ? [...w] : Object.entries(w);
  const sum = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const tenths = entries.map(([t, v]) => {
    const x = (v / sum) * 1000;
    return { t, base: Math.floor(x + 1e-9), rem: x - Math.floor(x + 1e-9) };
  });
  let left = 1000 - tenths.reduce((a, x) => a + x.base, 0);
  for (const x of [...tenths].sort((a, b) => b.rem - a.rem)) {
    if (left <= 0) break;
    x.base++;
    left--;
  }
  return Object.fromEntries(tenths.map((x) => [x.t, x.base / 10]));
}

/** Sum of the weights, to one decimal (floating-point noise taken off). */
export const weightsTotal = (w: Record<string, number>) => Math.round(Object.values(w).reduce((a, b) => a + b, 0) * 10) / 10;
/** Custom weights are usable once they add up to 100% (to a tenth) and none is negative. */
export const weightsValid = (w: Record<string, number> | undefined, tickers: string[]) =>
  !!w && tickers.length > 0 && tickers.every((t) => w[t] != null && w[t] >= 0) && Math.abs(weightsTotal(Object.fromEntries(tickers.map((t) => [t, w[t]]))) - 100) < 0.05;

/** A stock added to custom weights gets an equal share (100/n); the others shrink in proportion. */
export function addToWeights(w: Record<string, number>, added: string[]): Record<string, number> {
  const fresh = added.filter((t) => w[t] == null);
  if (!fresh.length) return w;
  const n = Object.keys(w).length + fresh.length;
  const keep = Object.keys(w).length / n;
  const scaled = Object.fromEntries(Object.entries(w).map(([t, v]) => [t, (v / (weightsTotal(w) || 100)) * keep]));
  for (const t of fresh) scaled[t] = 1 / n;
  return toPercents(scaled);
}

/** A stock taken off: the others keep their proportions and are scaled back up to 100%. */
export function removeFromWeights(w: Record<string, number>, removed: string[]): Record<string, number> {
  const rest = Object.fromEntries(Object.entries(w).filter(([t]) => !removed.includes(t)));
  if (!Object.keys(rest).length) return {};
  const sum = Object.values(rest).reduce((a, b) => a + b, 0);
  return toPercents(sum > 0 ? rest : Object.fromEntries(Object.keys(rest).map((t) => [t, 1])));
}
