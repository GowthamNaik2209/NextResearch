// One stock's price projection, 1 and 2 years ahead, in a Bear, Base and Bull case, from the
// figures in the company table (docs/PROJECTIONS.md). Pure: the server feeds it a company's record
// and its industry's medians, the page reads the result. A stock needs at least 3 consecutive
// fiscal years of revenue and net profit (ending at its latest reported year) and today's price and
// market cap; anything less is left out, with the reason.

export type Scenario = "bear" | "base" | "bull";
export type ExitBasis = "own" | "ind";
export type Horizon = 1 | 2;
export const SCENARIOS: Scenario[] = ["bear", "base", "bull"];
export const HORIZONS: Horizon[] = [1, 2];
export const MIN_YEARS = 3;

/** A case's return, as a fraction (0.12 is +12%), by exit basis and horizon: [bear, base, bull]. */
export type CaseReturns = Record<ExitBasis, Record<`${Horizon}`, [number, number, number]>>;

export type StockProjection =
  | { ok: false; years: number; reason: string }
  | {
      ok: true;
      years: number;
      /** "pe": earnings times P/E. "ps": revenue times price to sales (loss-makers). */
      method: "pe" | "ps";
      /** Revenue growth a year, [bear, base, bull] (fractions). */
      growth: [number, number, number];
      /** Net margin, [bear, base, bull] (fractions); the P/E method only. */
      margin: [number, number, number] | null;
      /** Today's multiple (P/E or P/S). */
      multipleNow: number;
      /** The multiple it moves toward: its own median, and its home industry's (null: none known). */
      targetOwn: number;
      targetInd: number | null;
      /** Fiscal years used, e.g. "FY23-FY26". */
      span: string;
      /** A one-off year left out of the margins ("FY24"), when there was one. */
      skipped?: string;
      ret: CaseReturns;
      /** Some case hit the -60% / +80% a year bound. */
      capped: boolean;
    };

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
  /** The data's date, "20 Oct 2026". */
  asOf?: string;
  /** Index (0-4) of a one-off year to leave out of the margins. */
  oneOffIndex?: number | null;
  /** The home industry's median P/E and price to sales. */
  industry: { pe: number | null; ps: number | null };
};

const FIRST_FY = 2022;
const GROWTH_MIN = -0.25;
/** Growth fades toward a long-run nominal rate (about India's nominal GDP growth): this much of the way. */
const LONG_RUN_GROWTH = 0.1;
const GROWTH_FADE = 0.4;
/** A target multiple is kept within these factors of today's (a past year's tiny profit can't set a 700x target). */
const TARGET_MIN = 0.7;
const TARGET_MAX = 1.4;
const GROWTH_MAX = 0.4;
/** A case at least this far from Base on growth (3 points a year). */
const GROWTH_GAP = 0.03;
const MARGIN_MIN = -0.5;
const MARGIN_MAX = 0.6;
/** Today's multiple, and today's margin, close on their targets over this many years. */
const REVERT_YEARS = 3;
/** A case's margin moves at most this share of today's a year (a thin margin can't double in a year in the model). */
const MARGIN_SHIFT_A_YEAR = 0.15;
/** Bear and Bull move the exit multiple by this much: P/E, then P/S. */
const EXIT_SPREAD = { pe: 0.1, ps: 0.2 } as const;
/** A case's return a year is kept within these. */
export const ANNUAL_MIN = -0.6;
export const ANNUAL_MAX = 0.8;

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const fy = (i: number) => `FY${(FIRST_FY + i) % 100}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function parseDate(s: string | undefined): number | null {
  const m = s ? /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(s.trim()) : null;
  const mo = m ? MONTHS.indexOf(m[2]) : -1;
  return m && mo >= 0 ? Date.UTC(Number(m[3]), mo, Number(m[1])) : null;
}

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
 * Bear, Base, Bull revenue growth a year from the run's yearly growth. Base is the median year, not
 * the CAGR: FY22 was a low post-Covid base for many companies, which flatters a CAGR from it.
 */
export function growthCases(revs: number[]): [number, number, number] {
  const yoy: number[] = [];
  for (let i = 1; i < revs.length; i++) if (revs[i - 1] > 0) yoy.push(revs[i] / revs[i - 1] - 1);
  const first = revs[0];
  const last = revs[revs.length - 1];
  const cagr = first > 0 && last > 0 ? Math.pow(last / first, 1 / (revs.length - 1)) - 1 : null;
  const mid = median(yoy);
  // A recent slowdown counts: the latest year is averaged in when it is below the median (a steady or
  // speeding-up company is unchanged), so a business whose sales just fell isn't projected on its past.
  const latest = yoy.length ? yoy[yoy.length - 1] : null;
  const recent = mid != null && latest != null ? (mid + latest) / 2 : null;
  const hist = Math.min(...[mid, cagr, recent].filter((v): v is number => v != null), ...(mid == null && cagr == null ? [0] : []));
  // Past growth rarely lasts: each case fades part of the way toward the long-run rate.
  const fade = (g: number) => g + (LONG_RUN_GROWTH - g) * GROWTH_FADE;
  const base = clamp(fade(hist), GROWTH_MIN, GROWTH_MAX);
  const lo = yoy.length ? fade(Math.min(...yoy)) : base;
  const hi = yoy.length ? fade(Math.max(...yoy)) : base;
  // The same distance either side of Base: a quarter of the range of its years, at least 3 points.
  const gap = Math.max(GROWTH_GAP, (hi - lo) / 4);
  const bear = clamp(base - gap, GROWTH_MIN, GROWTH_MAX);
  const bull = clamp(base + gap, GROWTH_MIN, GROWTH_MAX);
  return [Math.min(bear, base), base, Math.max(bull, base)];
}

/** Bear (lowest), Base (median), Bull (highest) net margin over the years given. */
export function marginCases(margins: number[]): [number, number, number] {
  const m = margins.map((v) => clamp(v, MARGIN_MIN, MARGIN_MAX));
  return [Math.min(...m), median(m)!, Math.max(...m)];
}

/** A total return over h years kept within the yearly bounds; also whether it was cut. */
export function bound(r: number, h: number): [number, boolean] {
  const a = r <= -1 ? -Infinity : Math.pow(1 + r, 1 / h) - 1;
  const c = clamp(a, ANNUAL_MIN, ANNUAL_MAX);
  return [Math.pow(1 + c, h) - 1, c !== a];
}

/** Everything a stock's cases are worked out from (see projectStock), kept for the method page's worked example. */
export type ProjectionContext = {
  years: number;
  span: string;
  skipped?: string;
  method: "pe" | "ps";
  revs: number[];
  /** Year-on-year revenue growth over the run (fractions). */
  yoy: number[];
  growth: [number, number, number];
  /** Net margin each year used (fractions), and the cases. */
  margins: number[];
  margin: [number, number, number];
  marginNow: number;
  /** Years since the latest fiscal year ended. */
  lag: number;
  /** Today's multiple, and its own past ones: [label, value]. */
  now: number;
  ownPoints: [string, number][];
  ownMedian: number;
  targetOwn: number;
  indMedian: number | null;
  targetInd: number | null;
  spread: number;
};

export type CaseDetail = {
  target: number;
  /** Share of the way to the target by the horizon. */
  step: number;
  exitBase: number;
  exit: number;
  growthFactor: number;
  /** The P/E method's margin then, and its factor (1 for P/S). */
  marginThen: number | null;
  marginFactor: number;
  raw: number;
  ret: number;
  capped: boolean;
};

type Prepared = { ok: false; years: number; reason: string } | { ok: true; ctx: ProjectionContext };

function prepare(x: ProjectionInput): Prepared {
  const run = latestRun(x.rev, x.np);
  const years = run ? run[1] - run[0] + 1 : 0;
  if (years < MIN_YEARS) return { ok: false, years, reason: `${years} year${years === 1 ? "" : "s"} of results (needs ${MIN_YEARS})` };
  if (!ok(x.price) || x.price <= 0 || !ok(x.mcapCr) || x.mcapCr <= 0) return { ok: false, years, reason: "No price or market cap in our last data update" };
  // Three years of trading too: a recent listing's earlier "results" are from before it listed, and
  // it has no valuation history to judge a usual P/E by. No 3-year price change means it listed
  // under 3 years ago.
  if (!ok(x.cagr?.[1])) return { ok: false, years, reason: `Listed under ${MIN_YEARS} years ago (needs ${MIN_YEARS} years of trading)` };
  const [a, b] = run!;
  const revs = x.rev.slice(a, b + 1) as number[];
  const nps = x.np.slice(a, b + 1) as number[];
  const revLast = revs[revs.length - 1];
  if (revLast <= 0) return { ok: false, years, reason: "No revenue in its latest year" };

  const growth = growthCases(revs);
  const yoy: number[] = [];
  for (let i = 1; i < revs.length; i++) if (revs[i - 1] > 0) yoy.push(revs[i] / revs[i - 1] - 1);
  // Margins, leaving out a one-off year when at least two others remain.
  let idx = revs.map((_, i) => a + i).filter((i) => (x.rev[i] as number) > 0);
  let skipped: string | undefined;
  if (x.oneOffIndex != null && idx.includes(x.oneOffIndex) && idx.length - 1 >= 2) {
    idx = idx.filter((i) => i !== x.oneOffIndex);
    skipped = fy(x.oneOffIndex);
  }
  const margins = idx.map((i) => (x.np[i] as number) / (x.rev[i] as number));
  const margin = marginCases(margins);
  const latestLoss = nps[nps.length - 1] <= 0;
  const method: "pe" | "ps" = ok(x.pe) && x.pe > 0 && !latestLoss && margin[1] > 0 ? "pe" : "ps";

  // Years since the latest fiscal year ended (31 March). Today's P/E is on trailing earnings, which
  // already include that time; price to sales is on the fiscal year's revenue, so it is moved up to today.
  const fyEnd = Date.UTC(FIRST_FY + b, 2, 31);
  const asOf = parseDate(x.asOf);
  const lag = asOf != null ? clamp((asOf - fyEnd) / (365.25 * 86_400_000), 0, 1.5) : 0.5;
  const revNow = revLast * Math.pow(1 + growth[1], lag);
  const marginNow = nps[nps.length - 1] / revLast;

  // Its own multiple: today's, and 1 and 3 years ago (price then, from the price CAGRs, over that
  // year's profit or revenue). Five years back falls before FY22, so it isn't used.
  const now = method === "pe" ? x.pe! : x.mcapCr / revNow;
  const ownPoints: [string, number][] = [["today", now]];
  ([[1, 0], [3, 1]] as const).forEach(([k, ci]) => {
    const c = x.cagr?.[ci];
    const j = b - k;
    if (!ok(c) || j < 0) return;
    const capThen = x.mcapCr! / Math.pow(1 + c / 100, k);
    const base = method === "pe" ? x.np[j] : x.rev[j];
    if (ok(base) && base > 0) ownPoints.push([`${k} year${k === 1 ? "" : "s"} ago (${fy(j)})`, capThen / base]);
  });
  const fit = (t: number) => clamp(t, now * TARGET_MIN, now * TARGET_MAX);
  const ownMedian = median(ownPoints.map((p) => p[1]))!;
  const indRaw = method === "pe" ? x.industry.pe : x.industry.ps;
  const indMedian = ok(indRaw) && indRaw > 0 ? indRaw : null;
  return {
    ok: true,
    ctx: {
      years,
      span: `${fy(a)}-${fy(b)}`,
      ...(skipped ? { skipped } : {}),
      method,
      revs,
      yoy,
      growth,
      margins,
      margin,
      marginNow,
      lag,
      now,
      ownPoints,
      ownMedian,
      targetOwn: fit(ownMedian),
      indMedian,
      targetInd: indMedian != null ? fit(indMedian) : null,
      spread: EXIT_SPREAD[method],
    },
  };
}

/** One case for one horizon and exit basis, step by step. */
export function caseDetail(c: ProjectionContext, basis: ExitBasis, h: Horizon, s: Scenario): CaseDetail {
  const si = SCENARIOS.indexOf(s);
  const target = basis === "ind" ? (c.targetInd ?? c.targetOwn) : c.targetOwn;
  const step = Math.min(1, h / REVERT_YEARS);
  const exitBase = c.now + (target - c.now) * step;
  const exit = exitBase * (si === 0 ? 1 - c.spread : si === 2 ? 1 + c.spread : 1);
  // Earnings (or revenue) grow from today's; the margin moves from today's toward the case's by the
  // same third a year as the multiple. Price ratio = exit / today's multiple x that growth.
  const growthFactor = Math.pow(1 + c.growth[si], h);
  let marginThen: number | null = null;
  let marginFactor = 1;
  if (c.method === "pe") {
    // Base aims halfway between today's margin and its usual (median) one.
    const aim = si === 1 ? (c.marginNow + c.margin[1]) / 2 : c.margin[si];
    marginThen = c.marginNow + (aim - c.marginNow) * step;
    const most = 1 + MARGIN_SHIFT_A_YEAR * h;
    marginFactor = clamp(marginThen / c.marginNow, 1 / most, most);
  }
  const raw = (exit / c.now) * growthFactor * marginFactor - 1;
  const [ret, capped] = bound(raw, h);
  return { target, step, exitBase, exit, growthFactor, marginThen, marginFactor, raw, ret, capped };
}

/** A stock's working, for the method page: its context, or why it is left out. */
export function explainStock(x: ProjectionInput): Prepared {
  return prepare(x);
}

export function projectStock(x: ProjectionInput): StockProjection {
  const p = prepare(x);
  if (!p.ok) return p;
  const c = p.ctx;
  let capped = false;
  const ret = { own: {}, ind: {} } as CaseReturns;
  for (const basis of ["own", "ind"] as const)
    for (const h of [1, 2] as const) {
      const cases = SCENARIOS.map((s) => {
        const d = caseDetail(c, basis, h, s);
        if (d.capped) capped = true;
        return d.ret;
      }) as [number, number, number];
      // A case never lands the wrong side of Base (a bound can squeeze them together).
      cases[0] = Math.min(cases[0], cases[1]);
      cases[2] = Math.max(cases[2], cases[1]);
      ret[basis][`${h}`] = cases;
    }
  return {
    ok: true,
    years: c.years,
    method: c.method,
    growth: c.growth,
    margin: c.method === "pe" ? c.margin : null,
    multipleNow: c.now,
    targetOwn: c.targetOwn,
    targetInd: c.targetInd,
    span: c.span,
    ...(c.skipped ? { skipped: c.skipped } : {}),
    ret,
    capped,
  };
}

/** A projection rounded for sending to the page (returns to 0.01 pt, multiples to 0.1). */
export function compactProjection(p: StockProjection): StockProjection {
  if (!p.ok) return p;
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const tri = (t: [number, number, number]) => t.map(r4) as [number, number, number];
  return {
    ...p,
    growth: tri(p.growth),
    margin: p.margin ? tri(p.margin) : null,
    multipleNow: r1(p.multipleNow),
    targetOwn: r1(p.targetOwn),
    targetInd: p.targetInd == null ? null : r1(p.targetInd),
    ret: { own: { "1": tri(p.ret.own["1"]), "2": tri(p.ret.own["2"]) }, ind: { "1": tri(p.ret.ind["1"]), "2": tri(p.ret.ind["2"]) } },
  };
}

/** One case's total return for a stock, or null when it isn't projected. */
export function caseReturn(p: StockProjection | undefined | null, h: Horizon, s: Scenario, exit: ExitBasis): number | null {
  if (!p || !p.ok) return null;
  return p.ret[exit][`${h}`][SCENARIOS.indexOf(s)];
}
