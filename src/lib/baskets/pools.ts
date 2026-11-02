// Industry pools: how an industry's revenue, profit and market value split across its layers and
// companies, from the covered companies' latest-year figures. Pure and dependency-free, so the
// server builder (./pools-data.ts) and the panel (src/components/charts/IndustryPools.tsx) share one
// definition; pools.test.ts pins it.
//
// Revenue, net profit and market cap are pools: they add up, so a layer or company has a share of
// the industry's total. Margin, growth, P/E and ROCE are rates, worked out per layer from the same
// companies (margin = the layer's profit over its revenue, not an average of margins; ROCE, which
// has no capital figure to add up, is the median).
//
// Two kinds of company are handled apart:
//  - Low exposure: the figures are company-wide, not segment revenue, so a group that earns most of
//    its money elsewhere (Adani Enterprises in solar modules, M&M in EVs) would swamp its layer.
//    They are left out unless the viewer ticks them in (see ./pools-data.ts for the rule).
//  - One-off year (./outliers.ts): left out of anything built on profit (profit, margin, P/E), as
//    the screens leave them out; their revenue and market cap still count.

export type PoolCompany = {
  ticker: string;
  name: string;
  layer: string;
  /** Revenue and net profit, ₹ Cr: [previous year, latest year]. */
  rev: [number | null, number | null];
  np: [number | null, number | null];
  mcapCr: number | null;
  /** Return on capital employed, %. */
  roce: number | null;
  /** Why its profit is left out (a one-off year), when it is. */
  oneOff?: string;
  /** Its figures are mostly from outside this industry: left out unless ticked in. */
  lowExposure?: boolean;
};

export type PoolLayer = { name: string; color: string };

export type IndustryPools = {
  slug: string;
  /** The latest fiscal year the figures are for, e.g. "FY26". */
  year: string;
  /** Date of the figures, e.g. "30 Oct 2026". */
  asOf: string;
  /** In value-chain order, as the industry's map lists them. Only layers with a company. */
  layers: PoolLayer[];
  companies: PoolCompany[];
};

export type PoolMetricId = "rev" | "np" | "mcap" | "margin" | "growth" | "pe" | "roce";
export type PoolMetric = { id: PoolMetricId; label: string; kind: "pool" | "rate" };

export const POOL_METRICS: PoolMetric[] = [
  { id: "rev", label: "Revenue", kind: "pool" },
  { id: "np", label: "Net profit", kind: "pool" },
  { id: "mcap", label: "Market cap", kind: "pool" },
  { id: "margin", label: "Net margin", kind: "rate" },
  { id: "growth", label: "Revenue growth", kind: "rate" },
  { id: "pe", label: "P/E", kind: "rate" },
  { id: "roce", label: "ROCE", kind: "rate" },
];

export const poolMetric = (id: PoolMetricId) => POOL_METRICS.find((m) => m.id === id)!;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const num = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);
const profitOk = (c: PoolCompany) => !c.oneOff;

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** One company's value on a metric, or null when it has none (no figure, a loss for P/E, a one-off year for profit). */
export function companyValue(c: PoolCompany, id: PoolMetricId): number | null {
  const [r0, r1] = c.rev;
  const p1 = c.np[1];
  switch (id) {
    case "rev":
      return num(r1) ? r1 : null;
    case "np":
      return profitOk(c) && num(p1) ? p1 : null;
    case "mcap":
      return num(c.mcapCr) ? c.mcapCr : null;
    case "margin":
      return profitOk(c) && num(p1) && num(r1) && r1 > 0 ? p1 / r1 : null;
    case "growth":
      return num(r0) && num(r1) && r0 > 0 ? r1 / r0 - 1 : null;
    case "pe":
      return profitOk(c) && num(p1) && p1 > 0 && num(c.mcapCr) ? c.mcapCr / p1 : null;
    case "roce":
      return num(c.roce) ? c.roce : null;
  }
}

/**
 * A group of companies' value on a metric: the total for a pool, the group's own rate for a rate
 * (null when nothing in it has the figures, or its profit is a loss for P/E).
 */
export function groupValue(cs: PoolCompany[], id: PoolMetricId): number | null {
  if (poolMetric(id).kind === "pool") {
    const vs = cs.map((c) => companyValue(c, id)).filter(num);
    return vs.length ? sum(vs) : null;
  }
  if (id === "roce") return median(cs.map((c) => companyValue(c, "roce")).filter(num));
  // The same companies on both sides of the ratio: one missing a figure drops out of both.
  const both = (a: (c: PoolCompany) => number | null, b: (c: PoolCompany) => number | null) => {
    const k = cs.filter((c) => num(a(c)) && num(b(c)));
    return k.length ? [sum(k.map((c) => a(c)!)), sum(k.map((c) => b(c)!))] : null;
  };
  if (id === "margin") {
    const r = both((c) => (profitOk(c) ? c.np[1] : null), (c) => c.rev[1]);
    return r && r[1] > 0 ? r[0] / r[1] : null;
  }
  if (id === "growth") {
    const r = both((c) => c.rev[1], (c) => c.rev[0]);
    return r && r[1] > 0 ? r[0] / r[1] - 1 : null;
  }
  // P/E: the layer's market cap over its profit.
  const r = both((c) => c.mcapCr, (c) => (profitOk(c) ? c.np[1] : null));
  return r && r[1] > 0 ? r[0] / r[1] : null;
}

/** The companies that count, given whether low-exposure ones are ticked in. */
export const countedCompanies = (p: IndustryPools, withLowExposure: boolean) => p.companies.filter((c) => withLowExposure || !c.lowExposure);

export type LayerPool = PoolLayer & {
  /** Every company in the layer, counted or not. */
  all: PoolCompany[];
  /** The ones that count. */
  counted: PoolCompany[];
};

export function layerPools(p: IndustryPools, withLowExposure: boolean): LayerPool[] {
  return p.layers.map((l) => {
    const all = p.companies.filter((c) => c.layer === l.name);
    return { ...l, all, counted: all.filter((c) => withLowExposure || !c.lowExposure) };
  });
}

/**
 * Each item's share of a pool. Only positive totals take a share (a loss-making layer has no slice
 * of the profit pool); the rest come back with share null.
 */
export function shares<T>(items: T[], value: (x: T) => number | null): { item: T; value: number | null; share: number | null }[] {
  const vals = items.map(value);
  const pos = sum(vals.filter((v): v is number => num(v) && v > 0));
  return items.map((item, i) => {
    const v = vals[i];
    return { item, value: v, share: num(v) && v > 0 && pos > 0 ? v / pos : null };
  });
}

export type PoolTakeaway = { more: { layer: string; profit: number; revenue: number }; less: { layer: string; profit: number; revenue: number } };

/**
 * The one-line read: the layer that keeps the most profit for its share of revenue, and the one
 * that keeps the least. Null when fewer than two layers have both.
 */
export function poolTakeaway(layers: LayerPool[]): PoolTakeaway | null {
  const rev = shares(layers, (l) => groupValue(l.counted, "rev"));
  const np = shares(layers, (l) => groupValue(l.counted, "np"));
  const rows = layers
    .map((l, i) => ({ layer: l.name, revenue: rev[i].share, profit: np[i].share ?? 0 }))
    .filter((r): r is { layer: string; revenue: number; profit: number } => r.revenue != null);
  if (rows.length < 2 || !np.some((x) => x.share)) return null;
  rows.sort((a, b) => b.profit - b.revenue - (a.profit - a.revenue));
  return { more: rows[0], less: rows[rows.length - 1] };
}
