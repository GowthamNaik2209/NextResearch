import type { SupplierFinancials } from "@/lib/sector-content";
import type { StockApi } from "./types";
import type { PricePoint, Quote } from "@/lib/live/yahoo";
import { isFreshQuote } from "@/lib/live/freshness";
import { FISCAL_YEARS } from "@/lib/financials/rows";
import { NA, pct, signedPct } from "@/lib/format";

export type Stats = {
  /** The live quote when fresh, else the snapshot price. The only figure here live data may change. */
  price: number | null;
  /** The company table's price on `asOf` - what the snapshot ratios were computed at. */
  snapshotPrice: number | null;
  /** Market cap in ₹ crore (snapshot). */
  marketCapCr: number | null;
  pe: number | null;
  bookValue: number | null;
  divYield: number | null;
  roce: number | null;
  roe: number | null;
  faceValue: number | null;
  low52w: number | null;
  high52w: number | null;
  cagr1y: number | null;
  cagr3y: number | null;
  cagr5y: number | null;
  /** Date of the company-table snapshot every figure but the price comes from ("20 Oct 2026"). */
  asOf: string | null;
  /** The price is a live (fresh) exchange quote. */
  liveQuote: boolean;
  // REITs: equity ratios (P/E, ROE, dividend yield) are not meaningful - see REIT_NOTE.
  reit: boolean;
};

// Indian REITs we cover. Screener's industry string catches any added later.
const REIT_TICKERS = new Set(["EMBASSY", "MINDSPACE", "BIRET", "NXST", "KRT", "BAGMANE"]);
export function isReit(ticker: string | undefined, api?: StockApi | null): boolean {
  return (!!ticker && REIT_TICKERS.has(ticker)) || /\bREIT|Real Estate Investment Trust/i.test(api?.fundamentals?.classification?.industry ?? "");
}
export const REIT_NOTE =
  "REITs pass at least 90% of their distributable cash flow to unitholders as distributions, mostly as interest and repayment of debt from their property companies rather than dividends. Screener's dividend yield counts only the dividend part, and heavy depreciation on the buildings depresses reported profit, so P/E, ROE and dividend yield are not meaningful here. Use the trust's distribution per unit (in its quarterly results) for yield.";

/** The quote, only if it is recent enough to call live (the server already filters; this is the belt to its braces). */
export const freshQuote = (q: Quote | null | undefined): Quote | null => (q && isFreshQuote(q.asOf) ? q : null);

const rs = (s?: string | null) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// The owner's figures rule: market cap, P/E, ratios, 52-week range, CAGR, revenue and profit come
// only from the company table (supplier.f, one dated snapshot), so the pop-up shows exactly what
// the company page, decks, baskets and watchlist show. Live data may change only the price (and
// the day change / chart, which read the quote directly) and is labelled live where it appears.
// Screener's live figures still feed the Fundamentals tab's industry comparison, labelled there.
export function mergeStats(f: SupplierFinancials | undefined, api: StockApi | null): Stats {
  const quote = freshQuote(api?.quote);
  const snapshotPrice = rs(f?.price);
  const at = (a: (number | null)[] | null | undefined, i: number) => a?.[i] ?? null;
  return {
    price: quote?.price ?? snapshotPrice,
    snapshotPrice,
    marketCapCr: croreFromLabel(f?.mcap),
    pe: at(f?.kpi, 0),
    bookValue: at(f?.kpi, 1),
    divYield: at(f?.kpi, 2),
    roce: at(f?.kpi, 3),
    roe: at(f?.kpi, 4),
    faceValue: at(f?.kpi, 5),
    low52w: at(f?.range, 0),
    high52w: at(f?.range, 1),
    cagr1y: at(f?.cagr, 0),
    cagr3y: at(f?.cagr, 1),
    cagr5y: at(f?.cagr, 2),
    asOf: f?.asOf ?? api?.seedAsOf ?? null,
    liveQuote: !!quote,
    reit: isReit(f?.ticker ?? api?.ticker, api),
  };
}

/** The company table's market-cap label ("Rs 1,74,575 Cr") as a number of crore. */
export function croreFromLabel(s: string | null | undefined): number | null {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type RevPoint = { label: string; revenue: number | null };

// The five fiscal years of revenue from the company table (same figures as the company page).
export function revenueSeries(f: SupplierFinancials | undefined): RevPoint[] {
  return (f?.rev ?? []).map((v, i) => ({ label: `FY${String(FISCAL_YEARS[i] ?? FISCAL_YEARS[0] + i).slice(-2)}`, revenue: v ?? null }));
}

export const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v) ? NA : v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
/**
 * A rupee price at fixed decimals, so one stock never reads "₹154" on one load and "₹154.64" on the
 * next: paise under ₹1,000 ("₹154.60"), whole rupees from there ("₹11,595"), as the site rule says.
 */
export const fmtPrice = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return NA;
  const dp = Math.abs(v) < 1000 ? 2 : 0;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
};
/** Dividend yield: a real zero (no dividend) reads "0%", not "0.00%"; missing stays "—". */
export const fmtYield = (v: number | null | undefined) => (v === 0 ? "0%" : pct(v, 2));
/** Signed percent with the site's typographic minus (src/lib/format.ts). */
export const fmtSigned = (v: number | null | undefined, digits = 1) => signedPct(v, digits);
/** Colour for a signed % shown at `digits` places: a figure that reads 0.0% is neutral, never red
 * or green (a tiny −0.01% coloured red beside a green +0.0% looked like a different result). */
export function pctTone(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "text-ink-soft";
  const r = Number(v.toFixed(digits));
  return r > 0 ? "text-pos" : r < 0 ? "text-danger" : "text-ink-soft";
}

// The chart's history is cached and ends at the last closed bar, so on its own it can show an older
// price than the live quote in the pop-up header. Close the series on the live quote (same IST
// date: replace that bar's close; later date: append) so the headline price and the line agree.
export function withLiveQuote(points: PricePoint[], quote: Quote | null | undefined): PricePoint[] {
  const last = points[points.length - 1];
  if (!last || !quote || !isFreshQuote(quote.asOf) || !Number.isFinite(quote.price) || quote.price <= 0) return points;
  const t = new Date(new Date(quote.asOf).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t < last.t) return points;
  return t === last.t ? [...points.slice(0, -1), { t, c: quote.price }] : [...points, { t, c: quote.price }];
}
