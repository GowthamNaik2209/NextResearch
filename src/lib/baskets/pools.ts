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
//    They are left out unless the viewer adds them, one by one (see ./pools-data.ts for the rule).
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
  /** Why its figures are mostly from outside this industry, when they are: it is left out unless the viewer adds it. */
  lowExposure?: string;
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

/** Whether a company counts: every one does, except a low-exposure one the viewer hasn't added. */
export const counts = (c: PoolCompany, added: ReadonlySet<string>) => !c.lowExposure || added.has(c.ticker);

/** The companies that count, given the low-exposure ones the viewer added. */
export const countedCompanies = (p: IndustryPools, added: ReadonlySet<string>) => p.companies.filter((c) => counts(c, added));

export type LayerPool = PoolLayer & {
  /** Every company in the layer, counted or not. */
  all: PoolCompany[];
  /** The ones that count. */
  counted: PoolCompany[];
};

export function layerPools(p: IndustryPools, added: ReadonlySet<string>): LayerPool[] {
  return p.layers.map((l) => {
    const all = p.companies.filter((c) => c.layer === l.name);
    return { ...l, all, counted: all.filter((c) => counts(c, added)) };
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

/** Each layer's share of a pool, as the "Where the money sits" bars draw it: the takeaway reads the same numbers. */
export const layerShares = (layers: LayerPool[], id: "rev" | "np" | "mcap") => shares(layers, (l) => groupValue(l.counted, id));

export type TakeawayRow = {
  layer: string;
  /** Its share of the revenue bar and of the profit bar (null: a loss, with no slice of profit). */
  revenue: number;
  profit: number | null;
  /** The layer's profit, ₹ Cr (negative for a loss), as the profit bar counts it. */
  profitCr: number;
  /** Profit over revenue on the bars' basis: what the ranking is by. */
  ratio: number;
  /** Companies in it with a one-off year (in its revenue, not its profit), too small to skew it. */
  oneOff: string[];
};
export type PoolTakeaway = {
  more: TakeawayRow;
  less: TakeawayRow;
  /** Layers left out of the ranking: one-off-year companies, in the revenue bar but not the profit bar, are too big a part of them. */
  skipped: { layer: string; companies: string[] }[];
};

/** A layer whose one-off-year companies hold at least this share of its revenue isn't ranked: its shares would understate it. */
export const ONE_OFF_MATERIAL = 0.1;

/**
 * The one-line read under the bars: the layer that keeps the most profit for its revenue, and the
 * one that keeps the least. It quotes the bars' own shares (layerShares) and ranks on the same
 * basis: profit share over revenue share, i.e. the layer's profit over its revenue (a loss ranks
 * below any profit). That's a ratio, so a small layer with a fat margin beats a big one that is
 * merely above average. A one-off year's company is in the revenue bar but not the profit bar: a
 * layer where such companies hold ONE_OFF_MATERIAL of the revenue or more is left out and named;
 * below that it is ranked, with them listed so the sentence can say so. Null when fewer than two
 * layers can be ranked, or none of them makes a profit.
 */
export function poolTakeaway(layers: LayerPool[]): PoolTakeaway | null {
  const rev = layerShares(layers, "rev");
  const np = layerShares(layers, "np");
  const rows: TakeawayRow[] = [];
  const skipped: PoolTakeaway["skipped"] = [];
  layers.forEach((l, i) => {
    const revenue = rev[i].share;
    const revCr = rev[i].value;
    const profitCr = np[i].value;
    if (revenue == null || revCr == null) return;
    const oneOff = l.counted.filter((c) => c.oneOff);
    const oneOffRev = groupValue(oneOff, "rev") ?? 0;
    if (oneOff.length && (profitCr == null || oneOffRev >= ONE_OFF_MATERIAL * revCr)) {
      skipped.push({ layer: l.name, companies: oneOff.map((c) => c.name) });
      return;
    }
    if (profitCr == null) return;
    rows.push({ layer: l.name, revenue, profit: np[i].share, profitCr, ratio: profitCr / revCr, oneOff: oneOff.map((c) => c.name) });
  });
  // Most profit for its revenue first; the sort is stable, so ties keep the map's order.
  rows.sort((a, b) => b.ratio - a.ratio);
  if (rows.length < 2 || rows[0].profit == null) return null;
  return { more: rows[0], less: rows[rows.length - 1], skipped };
}

// Layer colours. The map colours layers by domain, so neighbours often share a colour (AMCs and
// distribution both #2E86AB) or nearly do (three greens in rare earths). Each run of look-alikes
// gets stepped lightness in OKLCH, keeping its hue and chroma, so every slice, legend swatch and row
// reads apart. Deterministic: the same layers always get the same shades.

type Lab = [number, number, number];
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklab(hex: string): Lab | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s];
}

function oklabToRgb([L, a, b]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(fromLin) as [number, number, number];
}

/** OKLCH to hex, easing chroma down until it fits in sRGB. */
function oklchToHex(L: number, C: number, h: number): string {
  for (let c = C; ; c *= 0.95) {
    const rgb = oklabToRgb([L, c * Math.cos(h), c * Math.sin(h)]);
    if (c < 0.005 || rgb.every((v) => v >= -0.001 && v <= 1.001))
      return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
}

/** Colours closer than this (OKLab distance) are look-alikes. */
export const LOOKALIKE_DIST = 0.09;
/** The lightness band shades are stepped in: dark enough for white slice labels, light enough to show on the dark theme's panel. */
const L_MIN = 0.42;
const L_MAX = 0.7;
const L_STEP = 0.1;

const labDist = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The layers with each look-alike colour stepped into its own shade (see above); a layer with a colour of its own keeps it. */
export function distinctLayerColors<T extends PoolLayer>(layers: T[]): T[] {
  const labs = layers.map((l) => hexToOklab(l.color));
  // Groups of look-alikes, chained: a colour joins the group of any colour it is close to.
  const group = layers.map((_, i) => i);
  const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i])));
  for (let i = 0; i < layers.length; i++)
    for (let j = 0; j < i; j++) {
      const a = labs[i];
      const b = labs[j];
      if (a && b && labDist(a, b) < LOOKALIKE_DIST) group[root(i)] = root(j);
    }
  const out = layers.map((l) => ({ ...l }));
  const byRoot = new Map<number, number[]>();
  layers.forEach((_, i) => byRoot.set(root(i), [...(byRoot.get(root(i)) ?? []), i]));
  for (const members of byRoot.values()) {
    if (members.length < 2) continue;
    // Lightness steps centred on the group's mean, kept in band; the darkest colour stays darkest.
    const n = members.length;
    const step = Math.min(L_STEP, (L_MAX - L_MIN) / (n - 1));
    const mean = members.reduce((t, i) => t + labs[i]![0], 0) / n;
    const lo = Math.min(Math.max(mean - (step * (n - 1)) / 2, L_MIN), L_MAX - step * (n - 1));
    const order = [...members].sort((a, b) => labs[a]![0] - labs[b]![0] || a - b);
    order.forEach((i, k) => {
      const [, a, b] = labs[i]!;
      out[i].color = oklchToHex(lo + k * step, Math.hypot(a, b), Math.atan2(b, a));
    });
  }
  return out;
}
