import type { SupplierFinancials } from "@/lib/sector-content";
import type { StockApi } from "./types";
import type { PricePoint, Quote } from "@/lib/live/yahoo";
import { isFreshQuote } from "@/lib/live/freshness";

export type Stats = {
  price: number | null;
  marketCap: string | null;
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
  live: boolean; // true when any figure came from a live fetch
  ratioSource: "screener" | "yahoo" | "cached"; // where P/E, market cap etc. came from
  liveQuote: boolean; // price is a live (fresh) exchange quote
  // 1Y: "chart" = computed from the same live price history the Chart tab draws (so they agree);
  // 3Y/5Y: Screener's stock-price CAGR. "seed" = the cached snapshot.
  cagr1ySource: "chart" | "screener" | "seed" | null;
  cagrLongSource: "screener" | "seed" | null;
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

/** Simple % change from the first to the last point of a series (null if it can't be computed). */
export function priceReturn(points: PricePoint[]): number | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2 || !(first.c > 0)) return null;
  return +(((last.c - first.c) / first.c) * 100).toFixed(2);
}

const rs = (s?: string) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const pctStr = (s?: string) => {
  const n = parseFloat((s ?? "").replace(/[%,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Live figures win; the seed data (as of the extract date) fills any gap, so a
// failed/rate-limited upstream degrades to "cached" instead of an error.
export function mergeStats(f: SupplierFinancials | undefined, api: StockApi | null): Stats {
  const k = api?.fundamentals?.kpi ?? null;
  const quote = freshQuote(api?.quote);
  const priceCagr = api?.fundamentals?.growth.find((g) => /price/i.test(g.title))?.rows ?? [];
  const cg = (re: RegExp) => pctStr(priceCagr.find((r) => re.test(r.period))?.value);
  const seedCagr = (i: number) => f?.cagr?.[i] ?? null;
  const c1 = api?.return1y ?? null;
  const s1 = cg(/^1 Year/i);
  const s3 = cg(/^3 Year/i);
  const s5 = cg(/^5 Year/i);
  const cagr1y = c1 ?? s1 ?? seedCagr(0);
  const cagr3y = s3 ?? seedCagr(1);
  const cagr5y = s5 ?? seedCagr(2);
  return {
    price: quote?.price ?? k?.price ?? rs(f?.price),
    marketCap: k?.marketCap ?? f?.mcap ?? null,
    pe: k?.pe ?? f?.kpi?.[0] ?? null,
    bookValue: k?.bookValue ?? f?.kpi?.[1] ?? null,
    divYield: k?.divYield ?? f?.kpi?.[2] ?? null,
    roce: k?.roce ?? f?.kpi?.[3] ?? null,
    roe: k?.roe ?? f?.kpi?.[4] ?? null,
    faceValue: k?.faceValue ?? f?.kpi?.[5] ?? null,
    low52w: k?.low52w ?? f?.range?.[0] ?? null,
    high52w: k?.high52w ?? f?.range?.[1] ?? null,
    cagr1y,
    cagr3y,
    cagr5y,
    live: !!(k || quote),
    ratioSource: k ? (api?.fundamentals?.source === "yahoo" ? "yahoo" : "screener") : "cached",
    liveQuote: !!quote,
    cagr1ySource: c1 != null ? "chart" : s1 != null ? "screener" : cagr1y != null ? "seed" : null,
    cagrLongSource: s3 != null || s5 != null ? "screener" : cagr3y != null || cagr5y != null ? "seed" : null,
    reit: isReit(f?.ticker ?? api?.ticker, api),
  };
}

export type RevPoint = { label: string; revenue: number | null };

// Last five fiscal years of revenue: live annual P&L (Screener) when available,
// else the seed's FY22–FY26 series.
export function revenueSeries(f: SupplierFinancials | undefined, api: StockApi | null): RevPoint[] {
  const annual = api?.fundamentals?.annual;
  const sales = annual?.series.find((s) => s.label === "Sales");
  if (annual && sales) {
    const pts = annual.years
      .map((y, i) => ({ y, v: sales.values[i] ?? null }))
      .filter((p) => /^[A-Z][a-z]{2} \d{4}$/.test(p.y)) // drop the "TTM" column
      .slice(-5);
    if (pts.length) return pts.map((p) => ({ label: `FY${p.y.slice(-2)}`, revenue: p.v }));
  }
  return (f?.rev ?? []).map((v, i) => ({ label: `FY${22 + i}`, revenue: v ?? null }));
}

export const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const fmtSigned = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: digits })}%`;

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
