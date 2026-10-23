// A basket's projection from its stocks' (./projection.ts): bought today at the target weights and
// held for 1 or 2 years. Stocks that aren't projected are left out and their share is spread over
// the rest in proportion to their own weights. Also the weekly paths the chart draws and the
// simulated paths behind the likely range, drawdowns and chance of a loss (docs/PROJECTIONS.md).
// Pure, so the page and the server (compared industry baskets) share it, and it is unit-tested.
import type { BacktestHolding, PricePoint } from "./backtest";
import { caseReturn, type ExitBasis, type Horizon, type Scenario, type StockProjection } from "./projection";

export type ProjectionSettings = { h: Horizon; scenario: Scenario; exit: ExitBasis };
export type LeftOut = { ticker: string; reason: string; /** Its share of the basket (or picks) before spreading, 0-1. */ share: number };

export type BasketProjection = {
  /** Each projected stock, in the backtest's holding shape: weight (0-1, after spreading), endWeight
   * (0-1, at the horizon), ret (%), contribution (pts; they sum to the basket's return). */
  holdings: BacktestHolding[];
  leftOut: LeftOut[];
  /** Total share spread from left-out stocks, 0-1. */
  spread: number;
  /** The basket's return over the horizon and a year, fractions; null when nothing is projected. */
  ret: number | null;
  cagr: number | null;
};

/**
 * @param items each stock's weight (any positive scale; 0 means not held) and its projection
 * Stocks with weight 0 are not held, as in the backtest, and are neither projected nor left out.
 */
export function projectBasket(items: { ticker: string; weight: number; proj: StockProjection | undefined | null }[], s: ProjectionSettings): BasketProjection {
  const held = items.filter((i) => i.weight > 0);
  const total = held.reduce((a, i) => a + i.weight, 0);
  const leftOut: LeftOut[] = [];
  const kept: { ticker: string; w: number; r: number }[] = [];
  for (const i of held) {
    const r = caseReturn(i.proj, s.h, s.scenario, s.exit);
    if (r == null) leftOut.push({ ticker: i.ticker, reason: i.proj && !i.proj.ok ? i.proj.reason : "No figures in our last data update", share: i.weight / total });
    else kept.push({ ticker: i.ticker, w: i.weight, r });
  }
  const keptTotal = kept.reduce((a, k) => a + k.w, 0);
  if (!kept.length || keptTotal <= 0) return { holdings: [], leftOut, spread: leftOut.reduce((a, l) => a + l.share, 0), ret: null, cagr: null };
  const ret = kept.reduce((a, k) => a + (k.w / keptTotal) * k.r, 0);
  const holdings = kept.map((k) => {
    const w = k.w / keptTotal;
    return { ticker: k.ticker, weight: w, endWeight: (w * (1 + k.r)) / (1 + ret), ret: k.r * 100, contribution: w * k.r * 100 };
  });
  return { holdings, leftOut, spread: leftOut.reduce((a, l) => a + l.share, 0), ret, cagr: Math.pow(1 + ret, 1 / s.h) - 1 };
}

/** One point a week from `start` (an ISO date) for h years: 52 or 104 steps after it. */
export function weeklyDates(start: string, h: Horizon): string[] {
  const t0 = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  return Array.from({ length: 52 * h + 1 }, (_, k) => new Date(t0 + k * 7 * 86_400_000).toISOString().slice(0, 10));
}

/** A total return R reached smoothly over the steps: (1+R)^(k/n) - 1, in %. */
export function stockPath(r: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, k) => (Math.pow(1 + r, k / steps) - 1) * 100);
}

/** The bought-and-held basket's value over the steps, in % from today: sum of w (1+R)^(k/n). */
export function basketPath(holdings: BacktestHolding[], steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, k) => (holdings.reduce((a, h) => a + h.weight * Math.pow(1 + h.ret / 100, k / steps), 0) - 1) * 100);
}

/** Annualised volatility (a fraction) of a price line's bar returns, using its bar spacing. */
export function annualVol(points: PricePoint[]): number | null {
  const pts = points.filter((p) => p.c > 0);
  if (pts.length < 10) return null;
  const r: number[] = [];
  for (let i = 1; i < pts.length; i++) r.push(Math.log(pts[i].c / pts[i - 1].c));
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  const gaps = pts.slice(1).map((p, i) => (Date.parse(p.t) - Date.parse(pts[i].t)) / 86_400_000).sort((a, b) => a - b);
  const gap = gaps[Math.floor(gaps.length / 2)];
  const perYear = gap >= 25 ? 12 : gap >= 5 ? 52 : 252;
  return Math.sqrt(v * perYear);
}

/** A small seeded generator (mulberry32), so the same settings always draw the same paths. */
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** A text's hash, for seeding from the settings and the stocks. */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Simulation = {
  /** Per week, % from today: the 10th, 50th and 90th percentile of the paths. */
  lo: number[];
  mid: number[];
  hi: number[];
  /** Per week, % below the path's high so far: the median path's and the bad (10th percentile) one's. */
  ddTypical: number[];
  ddBad: number[];
  /** The worst fall from a high over the horizon, %: the median path's and the bad 1-in-10's. */
  maxDdTypical: number;
  maxDdBad: number;
  /** Share of paths below today's value at the end, 0-1. */
  pLoss: number;
  /** Share of paths that fall 10% or more from a high at some point, 0-1. */
  pFall10: number;
};

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

/**
 * Weekly paths whose median ends at the basket's return (log-drift ln(1+R)/n a week) and which swing
 * like the basket did over the past year (vol, a yearly fraction).
 */
export function simulate(ret: number, h: Horizon, vol: number, seed: number, paths = 1000): Simulation {
  const n = 52 * h;
  const sig = vol / Math.sqrt(52);
  const mu = Math.log(1 + ret) / n;
  const r = rng(seed);
  const values: Float64Array[] = [];
  const dds: Float64Array[] = [];
  const worst: number[] = [];
  let fall10 = 0;
  for (let p = 0; p < paths; p++) {
    const v = new Float64Array(n + 1);
    const d = new Float64Array(n + 1);
    let x = 1;
    let peak = 1;
    let w = 0;
    v[0] = 1;
    for (let k = 1; k <= n; k++) {
      x *= Math.exp(mu + sig * gauss(r));
      if (x > peak) peak = x;
      const dd = x / peak - 1;
      if (dd < w) w = dd;
      v[k] = x;
      d[k] = dd;
    }
    if (w <= -0.1) fall10++;
    values.push(v);
    dds.push(d);
    worst.push(w);
  }
  const lo: number[] = [];
  const mid: number[] = [];
  const hi: number[] = [];
  const ddTypical: number[] = [];
  const ddBad: number[] = [];
  const col = new Array<number>(paths);
  for (let k = 0; k <= n; k++) {
    for (let p = 0; p < paths; p++) col[p] = values[p][k];
    const s = [...col].sort((a, b) => a - b);
    lo.push((quantile(s, 0.1) - 1) * 100);
    mid.push((quantile(s, 0.5) - 1) * 100);
    hi.push((quantile(s, 0.9) - 1) * 100);
    for (let p = 0; p < paths; p++) col[p] = dds[p][k];
    const ds = [...col].sort((a, b) => a - b);
    ddTypical.push(quantile(ds, 0.5) * 100);
    ddBad.push(quantile(ds, 0.1) * 100);
  }
  const ws = [...worst].sort((a, b) => a - b);
  return {
    lo,
    mid,
    hi,
    ddTypical,
    ddBad,
    maxDdTypical: quantile(ws, 0.5) * 100,
    maxDdBad: quantile(ws, 0.1) * 100,
    pLoss: values.filter((v) => v[n] < 1).length / paths,
    pFall10: fall10 / paths,
  };
}
