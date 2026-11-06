// The Key stats ratios worked out from the company table itself, so the pop-up and the company page
// show the same figures on the same date: P/B, the latest reported year's revenue and profit growth
// and net margin, and the 1Y price return against the Nifty 50's over the same year (the index's
// 1Y return to the snapshot date comes from the price store, ./query.ts withNifty). Pure: no
// server-only imports.
import type { SupplierFinancials } from "@/lib/sector-content";
import { FISCAL_YEARS } from "./rows";

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

export function keyRatios(f: SupplierFinancials | undefined): KeyRatios {
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
  const ret1y = f?.cagr?.[0];
  const nifty = f?.nifty1y;
  const note = f?.note ?? "";
  // A screened-out row's latest year is dominated by a one-off (sector-content core.ts screenOut).
  const caution = f?.screenOut || CAUTION.test(note) ? note || "The latest year is dominated by a one-off." : null;
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
    netMargin: !caution && fin(r) && r > 0 && fin(p) ? (p / r) * 100 : null,
    nifty1y: fin(nifty) ? nifty : null,
    vsNifty: fin(ret1y) && fin(nifty) ? ret1y - nifty : null,
  };
}

export const KEY_STATS_NOTE =
  "P/B is price ÷ book value. Growth and net margin are for the latest reported year; 1Y vs Nifty is the 1-year price return minus the Nifty 50's, in points.";

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

/** Each row gets the Nifty 50's 1Y return to its own snapshot day (`asOfDay`: ISO, by ticker). Rows are copied. */
export function withNifty(byTicker: Record<string, SupplierFinancials>, asOfDay: Map<string, string>, bars: { t: string; c: number }[]): Record<string, SupplierFinancials> {
  const byDay = new Map<string, number | null>();
  return Object.fromEntries(
    Object.entries(byTicker).map(([k, f]) => {
      const day = asOfDay.get(k);
      if (day && !byDay.has(day)) byDay.set(day, oneYearTo(bars, day));
      return [k, { ...f, nifty1y: day ? byDay.get(day) ?? null : null }];
    }),
  );
}
