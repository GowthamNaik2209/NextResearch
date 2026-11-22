// The Key stats ratios worked out from the company table itself, so the pop-up and the company page
// show the same figures on the same date: P/B, the latest reported year's revenue and profit growth
// and net margin, and the 1Y price return against the Nifty 50's over the same year (the index's
// 1Y return to the snapshot date comes from the price store, ./query.ts withNifty). A lender's or
// an insurer's net margin and ROCE mean nothing (./kinds.ts), so they are marked not meaningful;
// a lender gets its own ratios instead (lenderRatios). Pure: no server-only imports.
import type { SupplierFinancials } from "@/lib/sector-content";
import { companyKind } from "./kinds";
import type { LenderFigures } from "./lender";
import { FISCAL_YEARS } from "./rows";
import { detectOutlier } from "@/lib/baskets/outliers";

export type KeyRatios = {
  /** Snapshot price ÷ book value per share; null without a positive book value. */
  pb: number | null;
  /** The latest year with revenue, which growth and margin are for: "FY26", or "CY25" for a Jan-Dec reporter. */
  fy: string | null;
  /** The company's note when it warns that the latest year's figures mislead (a one-off, a merger, a
   * different fiscal year): growth and margin are then left out and the tile points to the note. */
  caution: string | null;
  /** Revenue growth over the year before, %. */
  revGrowth: number | null;
  /** Net profit growth over the year before, %; null when either year is a loss (see profitNote). */
  profitGrowth: number | null;
  /** Why profit growth is not shown as a % although both years are reported. */
  profitNote: ProfitNote | null;
  /** Net profit ÷ revenue in that year, %. */
  netMargin: number | null;
  /** The Nifty 50's 1Y return to the snapshot date, %. */
  nifty1y: number | null;
  /** The stock's 1Y price return minus the Nifty 50's, percentage points. */
  vsNifty: number | null;
  /** The day both 1Y returns run to when it is not the snapshot day ("18 Nov"): the Nifty's close for the snapshot day wasn't stored yet. */
  vsNiftyDay: string | null;
  /** Why there is no "1Y vs Nifty" figure, when there isn't. */
  vsNiftyNote: string | null;
  /** Ratios that mean nothing for this kind of company (net margin and ROCE for lenders and insurers). */
  notMeaningful: NotMeaningful[];
  /** The latest table year ("FY26") when the company's latest reported year (`fy`) is older: its figures are not on Screener yet. */
  notOut: string | null;
  /** The year before `fy` ("FY25") when the table has none for it: why there is no growth rate. */
  noPrior: string | null;
};

export type NotMeaningful = "netMargin" | "roce";

/** A lender's own ratios, all from its standalone page (./lender.ts). */
export type LenderRatios = {
  /** Return on assets: the year's net profit over the average of the two year-end total assets, %. */
  roa: number | null;
  /** Gross and net NPA, % of advances, for `quarter`. */
  gnpa: number | null;
  nnpa: number | null;
  /** Financing margin of the latest full year, %. */
  finMargin: number | null;
  /** Deposits and total assets at the latest year-end over the one before, %. */
  depositGrowth: number | null;
  bsGrowth: number | null;
  /** The quarter the NPAs are from ("Sep 2026"). */
  quarter: string | null;
  /** The full year the financing margin and ROA are for ("FY26"), and the latest year-end the growths run to. */
  year: string | null;
  bsYear: string | null;
};

export type ProfitNote = "from a loss" | "to a loss" | "loss narrowed" | "loss widened";
export const PROFIT_NOTE_LABEL: Record<ProfitNote, string> = { "from a loss": "Back to profit", "to a loss": "Turned to loss", "loss narrowed": "Loss narrowed", "loss widened": "Loss widened" };

// Notes that say the latest year's growth or margin would mislead. A note about an older year
// (a one-off in FY22) leaves the latest figures alone.
const CAUTION = /misleading|cautious|dominated|not meaningful|reverse merger|fiscal year ends september|exceptional gains|one-offs/i;
const CALENDAR_YEAR = /jan-dec|calendar year|\bCY20\d\d/i;

const fin = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const rs = (s?: string | null) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const growth = (now: number | null | undefined, prev: number | null | undefined) => (fin(now) && fin(prev) && prev > 0 ? (now / prev - 1) * 100 : null);
const yearOf = (label: string | null) => /\b(\d{4})\b/.exec(label ?? "")?.[1] ?? null;
/** "Mar 2026" -> "FY26" (an Indian fiscal year); any other year-end is kept as Screener labels it. */
const fyOf = (label: string | null) => {
  const m = /^Mar (\d{4})/.exec(label ?? "");
  return m ? `FY${m[1].slice(-2)}` : label;
};

/** A lender's ratios from its stored figures. ROA only when the profit and the balance sheet are for the same year. */
export function lenderRatiosFrom(l: LenderFigures): LenderRatios {
  const [assets, assetsPrev] = l.totalAssets;
  const year = yearOf(l.bsYear);
  const aligned = year != null && year === yearOf(l.finMarginYear);
  // Both year-ends must be there and positive: half of one figure is not an average.
  const avg = fin(assets) && fin(assetsPrev) && assets > 0 && assetsPrev > 0 ? (assets + assetsPrev) / 2 : null;
  return {
    roa: aligned && fin(l.netProfit) && avg != null ? (l.netProfit / avg) * 100 : null,
    gnpa: l.gnpa,
    nnpa: l.nnpa,
    finMargin: l.finMargin,
    depositGrowth: growth(l.deposits?.[0], l.deposits?.[1]),
    bsGrowth: growth(assets, assetsPrev),
    quarter: l.quarter,
    year: fyOf(l.finMarginYear),
    bsYear: fyOf(l.bsYear),
  };
}

/** The lender block of a row (worked out when the table is read, ./rows.ts); null for anyone but a lender. */
export function lenderRatios(f: SupplierFinancials): LenderRatios | null {
  return (f.kind ?? companyKind(f.ticker)) === "lender" ? (f.lender ?? null) : null;
}

export function keyRatios(f: SupplierFinancials | undefined): KeyRatios {
  const kind = f ? (f.kind ?? companyKind(f.ticker)) : "operating";
  const notMeaningful: NotMeaningful[] = kind === "operating" ? [] : ["netMargin", "roce"];
  const price = rs(f?.price);
  const book = f?.kpi?.[1];
  const rev = f?.rev ?? [];
  const np = f?.np ?? [];
  let i = rev.length - 1;
  while (i >= 0 && !fin(rev[i])) i--;
  const r = i >= 0 ? rev[i] : null;
  const r0 = i > 0 ? rev[i - 1] : null;
  const p = i >= 0 ? np[i] : null;
  const p0 = i > 0 ? np[i - 1] : null;
  const both = fin(p) && fin(p0);
  // Run to an earlier stored day (nifty1yDay): the stock's return to that same day, from the price store.
  const matched = !!f?.nifty1yDay;
  const ret1y = matched ? f?.ret1yMatched : f?.cagr?.[0];
  const nifty = f?.nifty1y;
  const note = f?.note ?? "";
  // A screened-out row's latest year is dominated by a one-off (sector-content core.ts screenOut).
  // The same one-off detector the screens and pools use: a latest year it flags (JSW Steel's FY26 other
  // income) reads "See note" here too, never a +600% growth as a plain figure.
  const out = f ? detectOutlier(f) : null;
  const latestFlagged = !!out && i === (f?.rev?.length ?? 0) - 1 && out.year === `FY${String(FISCAL_YEARS[i] ?? "").slice(-2)}`;
  const caution =
    f?.screenOut || CAUTION.test(note)
      ? note || "The latest year is dominated by a one-off."
      : latestFlagged
        ? `${out!.year} looks like a one-off year: ${out!.reason.replace(/\.$/, "")}.`
        : null;
  const year = i >= 0 ? (FISCAL_YEARS[i] ?? FISCAL_YEARS[0] + i) : null;
  const profitNote: ProfitNote | null = !both
    ? null
    : p0 <= 0 && p > 0
      ? "from a loss"
      : p0 > 0 && p <= 0
        ? "to a loss"
        : p0 <= 0 && p <= 0
          ? p >= p0
            ? "loss narrowed"
            : "loss widened"
          : null;
  return {
    pb: price && fin(book) && book > 0 ? price / book : null,
    // A Jan-Dec reporter's FY26 column holds calendar 2025.
    fy: year == null ? null : CALENDAR_YEAR.test(note) ? `CY${String(year - 1).slice(-2)}` : `FY${String(year).slice(-2)}`,
    caution,
    revGrowth: !caution && fin(r) && fin(r0) && r0 > 0 ? (r / r0 - 1) * 100 : null,
    profitGrowth: !caution && both && p0 > 0 && p > 0 ? (p / p0 - 1) * 100 : null,
    profitNote: caution ? null : profitNote,
    netMargin: !notMeaningful.length && !caution && fin(r) && r > 0 && fin(p) ? (p / r) * 100 : null,
    nifty1y: fin(nifty) ? nifty : null,
    vsNifty: fin(ret1y) && fin(nifty) ? ret1y - nifty : null,
    vsNiftyDay: matched ? shortDay(f!.nifty1yDay!) : null,
    vsNiftyNote:
      fin(ret1y) && fin(nifty)
        ? null
        : !fin(f?.cagr?.[0])
          ? "Listed under a year"
          : !fin(nifty)
            ? "Nifty close not stored yet"
            : "No stored close for that day",
    notMeaningful,
    // A Jan-Dec reporter's latest column is its own; only a March year can be "not out" here.
    notOut: i >= 0 && i < FISCAL_YEARS.length - 1 && !CALENDAR_YEAR.test(note) ? `FY${String(FISCAL_YEARS[FISCAL_YEARS.length - 1]).slice(-2)}` : null,
    noPrior: year != null && fin(r) && !fin(r0) ? (CALENDAR_YEAR.test(note) ? `CY${String(year - 2).slice(-2)}` : `FY${String(year - 1).slice(-2)}`) : null,
  };
}

/**
 * Why a company has no P/E or ROE in the company table, for the dash beside it: a loss in its latest
 * reported year, negative equity (ROE), or none given by Screener (its trailing P/E is blank after a
 * loss over the last four quarters, which the yearly figures may not show).
 */
export function missingRatioReason(f: SupplierFinancials | undefined, which: "pe" | "roe"): string {
  const np = f?.np ?? [];
  let i = np.length - 1;
  while (i >= 0 && !fin(np[i])) i--;
  const book = f?.kpi?.[1];
  if (which === "roe" && fin(book) && book <= 0) return "Negative equity";
  if (i >= 0 && np[i]! <= 0) return `Loss in FY${String(FISCAL_YEARS[i] ?? FISCAL_YEARS[0] + i).slice(-2)}`;
  if (which === "pe" && f?.peNote) return f.peNote;
  return which === "pe" ? "No trailing P/E on Screener" : "None on Screener";
}

export const KEY_STATS_NOTE =
  "P/B is price ÷ book value. Growth and net margin are for the latest reported year (where Screener does not have a company's latest year yet, the year before, marked); a growth rate needs the year before it too. 1Y vs Nifty is the 1-year price return minus the Nifty 50's, in points.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-18" -> "18 Nov". */
const shortDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const DAY = 86_400_000;
// The closes at each end must be this close to the dates asked for (a gap in the series gives no figure).
const MAX_GAP_DAYS = 7;

/** The last close on or before `day` (ISO), within `gapDays`, from closes oldest first. */
function closeAt(bars: { t: string; c: number }[], day: string, gapDays: number): number | null {
  let hit: { t: string; c: number } | null = null;
  for (const b of bars) {
    if (b.t > day) break;
    hit = b;
  }
  return hit && hit.c > 0 && Date.parse(day) - Date.parse(hit.t) <= gapDays * DAY ? hit.c : null;
}

/**
 * An index's return over the year to `day` (ISO), %: its close on that day (the snapshot is a trading
 * day; until the index's bar for it is stored there is no figure, rather than one a day short)
 * against its last close on or before the same date a year before.
 */
export function oneYearTo(bars: { t: string; c: number }[], day: string): number | null {
  const end = closeAt(bars, day, 0);
  const start = closeAt(bars, `${Number(day.slice(0, 4)) - 1}${day.slice(4)}`, MAX_GAP_DAYS);
  return end != null && start != null ? (end / start - 1) * 100 : null;
}

/**
 * The day "1Y vs Nifty" runs to for a snapshot taken on `day` (ISO): the snapshot day when the
 * index's close for it is stored, else the latest stored close before it (within MAX_GAP_DAYS) - a
 * refresh run during market hours dates its snapshot today, before the evening price run stores
 * today's close. Null when no close that recent is stored.
 */
export function niftyDayFor(bars: { t: string; c: number }[], day: string): string | null {
  let hit: string | null = null;
  for (const b of bars) {
    if (b.t > day) break;
    hit = b.t;
  }
  return hit && Date.parse(day) - Date.parse(hit) <= MAX_GAP_DAYS * DAY ? hit : null;
}

/** The snapshot days whose Nifty close isn't stored yet, each with the earlier stored day the comparison runs to instead. */
export function niftyFallbackDays(bars: { t: string; c: number }[], days: Iterable<string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const day of new Set(days)) {
    const end = niftyDayFor(bars, day);
    if (end && end !== day) out.set(day, end);
  }
  return out;
}

/**
 * Each row gets the Nifty 50's 1Y return to its own snapshot day (`asOfDay`: ISO, by ticker). When
 * that day's index close isn't stored yet, both returns run to the latest stored close instead: the
 * Nifty's from its bars, the stock's from its own stored closes (`stockBars`, by ticker), so the
 * two always cover the same dates. Rows are copied.
 */
export function withNifty(
  byTicker: Record<string, SupplierFinancials>,
  asOfDay: Map<string, string>,
  bars: { t: string; c: number }[],
  stockBars: Map<string, { t: string; c: number }[]> = new Map(),
): Record<string, SupplierFinancials> {
  const byDay = new Map<string, { end: string | null; ret: number | null }>();
  return Object.fromEntries(
    Object.entries(byTicker).map(([k, f]) => {
      const day = asOfDay.get(k);
      if (!day) return [k, { ...f, nifty1y: null }];
      if (!byDay.has(day)) {
        const end = niftyDayFor(bars, day);
        byDay.set(day, { end, ret: end ? oneYearTo(bars, end) : null });
      }
      const { end, ret } = byDay.get(day)!;
      if (!end || end === day) return [k, { ...f, nifty1y: ret }];
      // The stock's latest stored close on or before that day (its own last bar may be a day older,
      // fetched before that close): both returns run to the day the two series share.
      const own = stockBars.get(k) ?? [];
      const shared = niftyDayFor(own, end);
      if (!shared) return [k, { ...f, nifty1y: ret, nifty1yDay: end, ret1yMatched: null }];
      return [k, { ...f, nifty1y: shared === end ? ret : oneYearTo(bars, shared), nifty1yDay: shared, ret1yMatched: oneYearTo(own, shared) }];
    }),
  );
}
