import type { StaticFin, StockApi } from "./types";

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
export function mergeStats(f: StaticFin | undefined, api: StockApi | null): Stats {
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
export function revenueSeries(f: StaticFin | undefined, api: StockApi | null): RevPoint[] {
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
export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${v > 0 ? "" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: digits })}%`;
export const fmtSigned = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: digits })}%`;
