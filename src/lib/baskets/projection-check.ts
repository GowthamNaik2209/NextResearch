// The projection checked against what happened: a stock's inputs rebuilt as they stood on a past
// day (prices to that day, only the fiscal years reported by then), run through the same model
// (./projection.ts), and set against its actual price change since. Pure: the method page's data
// side (./projection-check-data.ts) supplies the prices and the scales.
import { FISCAL_YEARS } from "@/lib/financials/rows";
import type { SupplierFinancials } from "@/lib/sector-content";
import { parseCrore } from "@/lib/sector-content/core";
import { detectOutlier } from "./outliers";
import { casesFor, type Horizon, type ProjectionContext, type ProjectionInput } from "./projection";
import { riskOf } from "./projection-risk";
import type { PricePoint } from "./backtest";

const DAY = 86_400_000;
/** A close this many days before the day asked for still counts (weekends, holidays). */
const MAX_GAP_DAYS = 7;

export const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * DAY).toISOString().slice(0, 10);

/** The last close on or before `day` within MAX_GAP_DAYS, from closes oldest first. */
export function closeOn(pts: PricePoint[], day: string): { t: string; c: number } | null {
  let hit: PricePoint | null = null;
  for (const p of pts) {
    if (p.t > day) break;
    hit = p;
  }
  return hit && hit.c > 0 && Date.parse(day) - Date.parse(hit.t) <= MAX_GAP_DAYS * DAY ? hit : null;
}

/** Index in FISCAL_YEARS of the latest year reported by `day` (FY y, ending 31 Mar y, counts from 1 June y); -1 before FY22. */
export function fyIndexOn(day: string): number {
  let y = Number(day.slice(0, 4));
  if (day.slice(5) < "06-01") y -= 1;
  return FISCAL_YEARS.indexOf(y as (typeof FISCAL_YEARS)[number]);
}

/** Revenue and profit with the years not yet reported by `fyIdx` blanked. */
export function figuresTo(f: SupplierFinancials, fyIdx: number): { rev: (number | null)[]; np: (number | null)[] } {
  const cut = (xs: (number | null)[] | undefined) => FISCAL_YEARS.map((_, i) => (i <= fyIdx ? (xs?.[i] ?? null) : null));
  return { rev: cut(f.rev), np: cut(f.np) };
}

/** Today's table price ("Rs 395"), the price its market cap is at. */
const tablePrice = (s: string | null | undefined) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * The model's inputs as they stood on `day`: its price and market cap then (today's market cap
 * scaled by the price move; share-count changes ignored), the fiscal years reported by then, its
 * beta and volatility to that day, and the industry's median margin in that year. Today's dividend
 * yield (no history of it). `listedFrom`: the stock's first stored close, for the 3-years-of-trading
 * rule (`storeFrom`: the store's first day, so a history reaching it counts as older).
 */
export function inputOn(
  f: SupplierFinancials,
  pts: PricePoint[],
  index: PricePoint[],
  day: string,
  industryMargin: number | null,
  storeFrom: string,
): { ok: true; input: ProjectionInput; price: number } | { ok: false; reason: string } {
  const fyIdx = fyIndexOn(day);
  const p0 = closeOn(pts, day);
  const priceNow = tablePrice(f.price);
  const mcapNow = parseCrore(f.mcap);
  if (fyIdx < 0) return { ok: false, reason: "Before the first fiscal year in the table" };
  if (!pts.length || pts[0].t > day) return { ok: false, reason: "Not listed yet" };
  if (!p0) return { ok: false, reason: "No price on that day" };
  if (!priceNow || !mcapNow)
    return {
      ok: false,
      reason: "No price or market cap in our last data update",
    };
  const { rev, np } = figuresTo(f, fyIdx);
  const mcap = (mcapNow * p0.c) / priceNow;
  const npL = np[fyIdx];
  const year = closeOn(pts, addDays(day, -365));
  const first = pts[0]?.t ?? day;
  const traded3y = first <= addDays(day, -3 * 365 + MAX_GAP_DAYS) || first <= addDays(storeFrom, MAX_GAP_DAYS);
  const out = detectOutlier({ rev, np, note: f.note });
  const m = out ? /^FY(\d\d)$/.exec(out.year) : null;
  const upTo = (xs: PricePoint[]) => xs.filter((q) => q.t <= day);
  return {
    ok: true,
    price: p0.c,
    input: {
      rev,
      np,
      price: p0.c,
      mcapCr: mcap,
      pe: typeof npL === "number" && npL > 0 ? mcap / npL : null,
      // Only whether there is a 3-year figure matters to the model (its trading rule).
      cagr: [year ? (p0.c / year.c - 1) * 100 : null, traded3y ? 0 : null, null],
      divYield: typeof f.kpi?.[2] === "number" ? f.kpi[2] : null,
      asOf: day,
      oneOffIndex: m ? Number(m[1]) - 22 : null,
      industry: { margin: industryMargin },
      risk: riskOf(upTo(pts), upTo(index)),
    },
  };
}

/** Where an outcome landed against the three cases. */
export type Landed = "below" | "inside" | "above";

export type Check = {
  /** The day the projection is made from, and the day it is checked (ISO). */
  from: string;
  to: string;
  h: Horizon;
  bear: number;
  base: number;
  bull: number;
  actual: number;
  landed: Landed;
};

/**
 * The projection made on `from` (the stock's close that day) for `h` years, against the actual price
 * change to the close `h` years after `start` (the day asked for; `from` is earlier on a holiday).
 * Null when that close isn't in yet.
 */
export function checkCase(ctx: ProjectionContext, pts: PricePoint[], from: string, price: number, h: Horizon, start = from): Check | null {
  const end = closeOn(pts, addDays(start, 365 * h));
  if (!end || end.t <= from) return null;
  const [bear, base, bull] = casesFor(ctx, h);
  const actual = end.c / price - 1;
  return {
    from,
    to: end.t,
    h,
    bear,
    base,
    bull,
    actual,
    landed: actual < bear ? "below" : actual > bull ? "above" : "inside",
  };
}

export type CheckSummary = {
  from: string;
  h: Horizon;
  n: number;
  /** Share of stocks that ended below Bear / between Bear and Bull / above Bull. */
  below: number;
  inside: number;
  above: number;
  /** Median of (actual − Base), fractions. */
  baseMiss: number;
  /** Spearman rank correlation of Base with the actual return. */
  rankCorr: number | null;
};

function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 3) return null;
  const ra = ranks(a),
    rb = ranks(b);
  const m = (ra.length + 1) / 2;
  let num = 0,
    da = 0,
    db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - m) * (rb[i] - m);
    da += (ra[i] - m) ** 2;
    db += (rb[i] - m) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

const medianOf = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const k = (s.length - 1) / 2;
  return (s[Math.floor(k)] + s[Math.ceil(k)]) / 2;
};

/** Every stock's check for one start and horizon, summed up. Null with no checks. */
export function summarise(checks: Check[]): CheckSummary | null {
  if (!checks.length) return null;
  const n = checks.length;
  const share = (l: Landed) => checks.filter((c) => c.landed === l).length / n;
  return {
    from: checks[0].from,
    h: checks[0].h,
    n,
    below: share("below"),
    inside: share("inside"),
    above: share("above"),
    baseMiss: medianOf(checks.map((c) => c.actual - c.base)),
    rankCorr: spearman(
      checks.map((c) => c.base),
      checks.map((c) => c.actual),
    ),
  };
}
