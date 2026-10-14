import type { SupplierFinancials } from "@/lib/sector-content";
import type { StockApi } from "./types";
import type { PricePoint, Quote } from "@/lib/live/yahoo";

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
  liveQuote: boolean; // price is a live NSE quote
};

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
  const priceCagr = api?.fundamentals?.growth.find((g) => /price/i.test(g.title))?.rows ?? [];
  const cg = (re: RegExp) => pctStr(priceCagr.find((r) => re.test(r.period))?.value);
  return {
    price: api?.quote?.price ?? k?.price ?? rs(f?.price),
    marketCap: k?.marketCap ?? f?.mcap ?? null,
    pe: k?.pe ?? f?.kpi?.[0] ?? null,
    bookValue: k?.bookValue ?? f?.kpi?.[1] ?? null,
    divYield: k?.divYield ?? f?.kpi?.[2] ?? null,
    roce: k?.roce ?? f?.kpi?.[3] ?? null,
    roe: k?.roe ?? f?.kpi?.[4] ?? null,
    faceValue: k?.faceValue ?? f?.kpi?.[5] ?? null,
    low52w: k?.low52w ?? f?.range?.[0] ?? null,
    high52w: k?.high52w ?? f?.range?.[1] ?? null,
    cagr1y: cg(/^1 Year/i) ?? f?.cagr?.[0] ?? null,
    cagr3y: cg(/^3 Year/i) ?? f?.cagr?.[1] ?? null,
    cagr5y: cg(/^5 Year/i) ?? f?.cagr?.[2] ?? null,
    live: !!(k || api?.quote),
    ratioSource: k ? (api?.fundamentals?.source === "yahoo" ? "yahoo" : "screener") : "cached",
    liveQuote: !!api?.quote,
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
  if (!last || !quote || !Number.isFinite(quote.price) || quote.price <= 0) return points;
  const t = new Date(new Date(quote.asOf).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t < last.t) return points;
  return t === last.t ? [...points.slice(0, -1), { t, c: quote.price }] : [...points, { t, c: quote.price }];
}
