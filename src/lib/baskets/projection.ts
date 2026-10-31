// One stock's price projection, 1 and 2 years ahead, in a Bear, Base and Bull case (docs/PROJECTIONS.md).
// Base is the return the market prices in for the stock's risk (CAPM: the 10-year G-sec yield plus
// its beta times India's equity risk premium, less its dividend yield, since this is a price
// projection), tilted a little by its fundamentals (Grinold-Kahn: IC x volatility x score). Bear and
// Bull are the 10th and 90th percentiles of a lognormal year at the stock's own 1-year realised
// volatility. Tested out of sample in docs/PROJECTIONS-V2-PROTOTYPE.md.
// Pure: the server feeds it a company's record, its price statistics (./projection-risk.ts) and the
// spread of fundamentals scores across covered companies; the page reads the result. A stock
// needs at least 3 consecutive fiscal years of results and 3 years of trading; anything less is
// left out, with the reason.

export type Scenario = "bear" | "base" | "bull";
export type Horizon = 1 | 2;
export const SCENARIOS: Scenario[] = ["bear", "base", "bull"];
export const HORIZONS: Horizon[] = [1, 2];
export const MIN_YEARS = 3;

/** Market inputs, updated by hand (sources in docs/PROJECTIONS.md). Fractions. */
export const MARKET = {
  /** India 10-year G-sec yield. */
  rf: 0.0747,
  rfAsOf: "23 Oct 2026",
  /** Damodaran's total equity risk premium for India (mature market premium plus India's country premium). */
  erp: 0.0708,
  erpAsOf: "Jan 2026",
} as const;
/** How much a fundamentals score moves the expected return: tilt = IC x volatility x score. */
export const IC = 0.05;
/** Blume's adjustment: a measured beta is pulled a third of the way to 1. */
export const BLUME_WEIGHT = 0.67;
/** Volatility never counts as lower than this a year. */
export const VOL_FLOOR = 0.2;
/** Bear and Bull: the 10th and 90th percentiles (8 in 10 outcomes between them). */
export const Z80 = 1.2816;
/** A fundamentals score counts at most this many standard deviations from the middle. */
export const Z_MAX = 3;
/** Growth fades toward a long-run nominal rate (about India's nominal GDP growth): this much of the way. */
export const LONG_RUN_GROWTH = 0.1;
export const GROWTH_FADE = 0.55;
const GROWTH_MIN = -0.25;
const GROWTH_MAX = 0.4;
const MARGIN_MIN = -0.5;
const MARGIN_MAX = 0.6;
/** The margin closes on its target over this many years (a third of the way in a year). */
export const MARGIN_YEARS = 3;
/** The margin moves at most this share of today's in a year (a thin margin can't double in the model). */
export const MARGIN_SHIFT_A_YEAR = 0.15;
/** A 52-week range (high / low) spans about this many volatilities in a year (Parkinson: sqrt(8/pi)). */
const RANGE_TO_VOL = Math.sqrt(8 / Math.PI);

/** A case's return, as a fraction (0.12 is +12%), by horizon: [bear, base, bull]. */
export type CaseReturns = Record<`${Horizon}`, [number, number, number]>;

/** Price statistics from the stock's history (./projection-risk.ts); null fields where there are too few prices. */
export type RiskInput = {
  /** Beta to the Nifty 50 from 2 years of weekly returns, as measured (before Blume). */
  beta: number | null;
  /** Realised volatility over the last year, annualised, before the floor. */
  vol: number | null;
};

/** The spread of fundamentals scores across covered companies, that a score is measured against. */
export type ScoreScale = { median: number; sd: number; n: number };

export type ProjectionInput = {
  /** Five fiscal years FY22..FY26, Rs Cr; null where not reported. */
  rev: (number | null)[];
  np: (number | null)[];
  price: number | null;
  mcapCr: number | null;
  /** Today's P/E (positive only; null for a loss or none reported). */
  pe: number | null;
  /** Price CAGR over [1, 3, 5] years, %. */
  cagr: (number | null)[] | null;
  /** Dividend yield, % (kpi[2]). */
  divYield?: number | null;
  /** 52-week [low, high] price: a stand-in for volatility while the price history isn't loaded. */
  range?: (number | null)[] | null;
  /** The data's date, "20 Oct 2026". */
  asOf?: string;
  /** Index (0-4) of a one-off year to leave out of the margins. */
  oneOffIndex?: number | null;
  /** The home industry's median net margin (latest year, every listed company it maps). */
  industry: { margin: number | null };
  /** Price statistics; null or missing when not loaded yet. */
  risk?: RiskInput | null;
};

/** The fundamentals score: one year's return on growth and margin with today's P/E held. */
export type Fundamentals = {
  revs: number[];
  /** Year-on-year revenue growth over the run (fractions). */
  yoy: number[];
  /** The usual growth before fading (median year, CAGR or a recent slowdown, the lowest), then faded. */
  histGrowth: number;
  growth: number;
  /** Net margin each year used, its median, the industry's, and the one it moves toward. */
  margins: number[];
  ownMargin: number;
  indMargin: number | null;
  aimMargin: number;
  marginNow: number;
  marginThen: number;
  /** marginThen / marginNow, within the yearly limit. */
  marginFactor: number;
  /** (1 + growth) x marginFactor - 1. */
  score: number;
};

/** Every step of a stock's projection, kept for the method page's worked example. */
export type ProjectionContext = {
  years: number;
  span: string;
  skipped?: string;
  /** "pe": profitable, so its fundamentals tilt the market return. "market": a loss-maker (or no
   * usable P/E or margin), projected on the market return and its volatility alone. */
  method: "pe" | "market";
  fundamentals: Fundamentals | null;
  /** Standardised score, (score - median) / sd, within +/-Z_MAX; 0 for the market method. */
  z: number;
  scale: ScoreScale;
  betaRaw: number | null;
  beta: number;
  betaSource: "prices" | "default";
  volRaw: number | null;
  vol: number;
  volSource: "prices" | "range" | "floor";
  divYield: number;
  rf: number;
  erp: number;
  /** rf + beta x ERP - dividend yield: the price return the market prices in, a year. */
  market: number;
  /** IC x vol x z. */
  tilt: number;
  /** Base, a year: market + tilt (what casesFor gives for h = 1). */
  base1: number;
};

export type StockProjection =
  | { ok: false; years: number; reason: string }
  | {
      ok: true;
      years: number;
      method: "pe" | "market";
      /** Fiscal years used, e.g. "FY23-FY26". */
      span: string;
      /** A one-off year left out of the margins ("FY24"), when there was one. */
      skipped?: string;
      beta: number;
      betaSource: "prices" | "default";
      /** Volatility used (after the floor), a year. */
      vol: number;
      volSource: "prices" | "range" | "floor";
      divYield: number;
      /** rf + beta x ERP - dividend yield, a year. */
      market: number;
      /** Revenue growth a year, margin now and a year on, and the score (P/E method only). */
      growth: number | null;
      marginNow: number | null;
      marginThen: number | null;
      score: number | null;
      z: number;
      tilt: number;
      ret: CaseReturns;
    };

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const FIRST_FY = 2022;
const fy = (i: number) => `FY${(FIRST_FY + i) % 100}`;

/** The latest run of consecutive years with both revenue and profit: [first index, last index], or null. */
export function latestRun(rev: (number | null)[], np: (number | null)[]): [number, number] | null {
  let last = -1;
  for (let i = Math.min(rev.length, np.length) - 1; i >= 0; i--)
    if (ok(rev[i]) && ok(np[i])) {
      last = i;
      break;
    }
  if (last < 0) return null;
  let first = last;
  while (first > 0 && ok(rev[first - 1]) && ok(np[first - 1])) first--;
  return [first, last];
}

/** How many consecutive years of results the stock has (the latest run). */
export function yearsOfResults(rev: (number | null)[], np: (number | null)[]): number {
  const r = latestRun(rev, np);
  return r ? r[1] - r[0] + 1 : 0;
}

/**
 * The usual revenue growth a year, faded toward the long-run rate. The usual rate is the lowest of
 * the median year, the CAGR, and (when the latest year is below the median) the average of the two:
 * FY22 was a low post-Covid base for many companies, which flatters a CAGR from it, and a business
 * whose sales just fell isn't projected on its past.
 */
export function usualGrowth(revs: number[]): { hist: number; growth: number } {
  const yoy: number[] = [];
  for (let i = 1; i < revs.length; i++) if (revs[i - 1] > 0) yoy.push(revs[i] / revs[i - 1] - 1);
  const first = revs[0];
  const last = revs[revs.length - 1];
  const cagr = first > 0 && last > 0 ? Math.pow(last / first, 1 / (revs.length - 1)) - 1 : null;
  const mid = median(yoy);
  const latest = yoy.length ? yoy[yoy.length - 1] : null;
  const recent = mid != null && latest != null ? (mid + latest) / 2 : null;
  const hist = Math.min(...[mid, cagr, recent].filter((v): v is number => v != null), ...(mid == null && cagr == null ? [0] : []));
  return { hist, growth: clamp(hist + (LONG_RUN_GROWTH - hist) * GROWTH_FADE, GROWTH_MIN, GROWTH_MAX) };
}

/** A beta as used: Blume-adjusted, or 1 when there isn't one. */
export function blume(beta: number | null): number {
  return ok(beta) ? BLUME_WEIGHT * beta + (1 - BLUME_WEIGHT) : 1;
}

type Gate = { ok: false; years: number; reason: string } | { ok: true; years: number; run: [number, number] };

function gate(x: ProjectionInput): Gate {
  const run = latestRun(x.rev, x.np);
  const years = run ? run[1] - run[0] + 1 : 0;
  if (years < MIN_YEARS) return { ok: false, years, reason: `${years} year${years === 1 ? "" : "s"} of results (needs ${MIN_YEARS})` };
  if (!ok(x.price) || x.price <= 0 || !ok(x.mcapCr) || x.mcapCr <= 0) return { ok: false, years, reason: "No price or market cap in our last data update" };
  // Three years of trading too: a recent listing's earlier "results" are from before it listed. No
  // 3-year price change means it listed under 3 years ago.
  if (!ok(x.cagr?.[1])) return { ok: false, years, reason: `Listed under ${MIN_YEARS} years ago (needs ${MIN_YEARS} years of trading)` };
  if (!((x.rev[run![1]] as number) > 0)) return { ok: false, years, reason: "No revenue in its latest year" };
  return { ok: true, years, run: run! };
}

function fundamentalsOf(x: ProjectionInput, run: [number, number]): { f: Fundamentals | null; skipped?: string } {
  const [a, b] = run;
  const revs = x.rev.slice(a, b + 1) as number[];
  const nps = x.np.slice(a, b + 1) as number[];
  // Margins, leaving out a one-off year when at least two others remain.
  let idx = revs.map((_, i) => a + i).filter((i) => (x.rev[i] as number) > 0);
  let skipped: string | undefined;
  if (x.oneOffIndex != null && idx.includes(x.oneOffIndex) && idx.length - 1 >= 2) {
    idx = idx.filter((i) => i !== x.oneOffIndex);
    skipped = fy(x.oneOffIndex);
  }
  const margins = idx.map((i) => clamp((x.np[i] as number) / (x.rev[i] as number), MARGIN_MIN, MARGIN_MAX));
  const ownMargin = median(margins)!;
  const revLast = revs[revs.length - 1];
  const npLast = nps[nps.length - 1];
  // The fundamentals score needs a profit to grow: a positive P/E, a profit in the latest year and a
  // positive usual margin. Anything else is projected on the market return alone.
  if (!ok(x.pe) || x.pe <= 0 || npLast <= 0 || !(ownMargin > 0)) return { f: null, skipped };
  const yoy: number[] = [];
  for (let i = 1; i < revs.length; i++) if (revs[i - 1] > 0) yoy.push(revs[i] / revs[i - 1] - 1);
  const { hist, growth } = usualGrowth(revs);
  const marginNow = npLast / revLast;
  const indMargin = ok(x.industry.margin) && x.industry.margin > 0 ? x.industry.margin : null;
  const aimMargin = indMargin != null ? (ownMargin + indMargin) / 2 : ownMargin;
  const marginThen = marginNow + (aimMargin - marginNow) / MARGIN_YEARS;
  const most = 1 + MARGIN_SHIFT_A_YEAR;
  const marginFactor = clamp(marginThen / marginNow, 1 / most, most);
  return {
    f: { revs, yoy, histGrowth: hist, growth, margins, ownMargin, indMargin, aimMargin, marginNow, marginThen, marginFactor, score: (1 + growth) * marginFactor - 1 },
    skipped,
  };
}

/** A stock's fundamentals score (null: not projected, or a loss-maker), for working out the ScoreScale. */
export function fundamentalScore(x: ProjectionInput): number | null {
  const g = gate(x);
  return g.ok ? (fundamentalsOf(x, g.run).f?.score ?? null) : null;
}

/** The median and standard deviation of a list of scores (covered companies). */
export function scoreScale(scores: number[]): ScoreScale {
  const n = scores.length;
  const m = median(scores) ?? 0;
  const mean = n ? scores.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { median: m, sd, n };
}

/** A stock's working, for the method page: every step, or why it is left out. */
export function explainStock(x: ProjectionInput, scale: ScoreScale): { ok: false; years: number; reason: string } | { ok: true; ctx: ProjectionContext } {
  const g = gate(x);
  if (!g.ok) return g;
  const { f, skipped } = fundamentalsOf(x, g.run);
  const betaRaw = ok(x.risk?.beta) ? x.risk!.beta : null;
  const beta = blume(betaRaw);
  // Volatility: the last year's, or while the price history isn't loaded, an estimate from the
  // 52-week range; never below the floor.
  const volRaw = ok(x.risk?.vol) && x.risk!.vol > 0 ? x.risk!.vol : null;
  const lo = x.range?.[0], hi = x.range?.[1];
  const fromRange = ok(lo) && ok(hi) && lo > 0 && hi > lo ? Math.log(hi / lo) / RANGE_TO_VOL : null;
  const est = volRaw ?? fromRange;
  const vol = Math.max(VOL_FLOOR, est ?? 0);
  const volSource = est == null || est < VOL_FLOOR ? "floor" : volRaw != null ? "prices" : "range";
  const divYield = ok(x.divYield) && x.divYield > 0 ? x.divYield / 100 : 0;
  const market = MARKET.rf + beta * MARKET.erp - divYield;
  const z = f && scale.sd > 0 ? clamp((f.score - scale.median) / scale.sd, -Z_MAX, Z_MAX) : 0;
  const tilt = IC * vol * z;
  const [a, b] = g.run;
  return {
    ok: true,
    ctx: {
      years: g.years,
      span: `${fy(a)}-${fy(b)}`,
      ...(skipped ? { skipped } : {}),
      method: f ? "pe" : "market",
      fundamentals: f,
      z,
      scale,
      betaRaw,
      beta,
      betaSource: betaRaw != null ? "prices" : "default",
      volRaw: est,
      vol,
      volSource,
      divYield,
      rf: MARKET.rf,
      erp: MARKET.erp,
      market,
      tilt,
      base1: market + tilt,
    },
  };
}

/**
 * The three cases over h years. Base: a year, market return + tilt; two years, that year then a
 * year at the market return, (1 + market) (1 + market + tilt) - 1 (a one-year signal isn't carried
 * into the second year). Bear and Bull: the 10th and 90th
 * percentiles of a lognormal outcome with that mean, (1 + Base) e^(-vol^2 h / 2 -/+ 1.28 vol sqrt h) - 1.
 * (The middle of that range, the median, sits below Base: a volatile stock's typical year is below its average one.)
 */
export function casesFor(c: Pick<ProjectionContext, "market" | "tilt" | "vol">, h: Horizon): [number, number, number] {
  const base = Math.pow(1 + c.market, h - 1) * (1 + c.market + c.tilt) - 1;
  const mid = (1 + base) * Math.exp((-c.vol * c.vol * h) / 2);
  const w = Z80 * c.vol * Math.sqrt(h);
  return [mid * Math.exp(-w) - 1, base, mid * Math.exp(w) - 1];
}

export function projectStock(x: ProjectionInput, scale: ScoreScale): StockProjection {
  const e = explainStock(x, scale);
  if (!e.ok) return e;
  const c = e.ctx;
  const f = c.fundamentals;
  return {
    ok: true,
    years: c.years,
    method: c.method,
    span: c.span,
    ...(c.skipped ? { skipped: c.skipped } : {}),
    beta: c.beta,
    betaSource: c.betaSource,
    vol: c.vol,
    volSource: c.volSource,
    divYield: c.divYield,
    market: c.market,
    growth: f?.growth ?? null,
    marginNow: f?.marginNow ?? null,
    marginThen: f?.marginThen ?? null,
    score: f?.score ?? null,
    z: c.z,
    tilt: c.tilt,
    ret: { "1": casesFor(c, 1), "2": casesFor(c, 2) },
  };
}

/** A projection rounded for sending to the page (fractions to 0.01 pt, beta and z to 0.01). */
export function compactProjection(p: StockProjection): StockProjection {
  if (!p.ok) return p;
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const n4 = (v: number | null) => (v == null ? null : r4(v));
  const tri = (t: [number, number, number]) => t.map(r4) as [number, number, number];
  return {
    ...p,
    beta: r2(p.beta),
    vol: r4(p.vol),
    divYield: r4(p.divYield),
    market: r4(p.market),
    growth: n4(p.growth),
    marginNow: n4(p.marginNow),
    marginThen: n4(p.marginThen),
    score: n4(p.score),
    z: r2(p.z),
    tilt: r4(p.tilt),
    ret: { "1": tri(p.ret["1"]), "2": tri(p.ret["2"]) },
  };
}

/** One case's total return for a stock, or null when it isn't projected. */
export function caseReturn(p: StockProjection | undefined | null, h: Horizon, s: Scenario): number | null {
  if (!p || !p.ok) return null;
  return p.ret[`${h}`][SCENARIOS.indexOf(s)];
}
