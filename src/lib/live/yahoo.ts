// Quotes, price history and a fallback set of fundamentals from Yahoo Finance via
// the `yahoo-finance2` library (handles Yahoo's cookie/crumb auth and response
// validation, which our own fetch calls didn't). NSE prices on Yahoo are ~15 min
// delayed. Degrades to Screener's price chart if Yahoo has no data for a symbol.
import YahooFinance from "yahoo-finance2";
import { cached } from "./cache";
import type { Fundamentals } from "./screener-company";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"], validation: { logErrors: false } });
// Yahoo occasionally returns a shape the library's schema rejects (symbol-specific);
// the fields we read are all individually optional, so don't fail the whole call.
const LENIENT = { validateResult: false } as const;
// ...which also makes the library return `unknown`, so type just what we read.
type ChartRes = { quotes: { date: Date; close?: number | null }[] };
type SummaryRes = { assetProfile?: { sector?: string; industry?: string }; financialData?: { returnOnEquity?: number } };

export type ChartRange = "1M" | "6M" | "1Y" | "3Y" | "MAX";
export type PricePoint = { t: string; c: number }; // t = YYYY-MM-DD (IST)
export type Quote = {
  price: number;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string;
  asOf: string;
  delayedMin: number | null;
};
export type ChartData = { range: ChartRange; points: PricePoint[]; source: "yahoo" | "screener" };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const DAY = 86_400_000;

// Interval chosen so each range lands at a few hundred points: enough detail,
// small payload. (MAX uses monthly: decades of daily bars aren't useful here.)
const PARAMS: Record<ChartRange, { days: number | null; interval: "1d" | "1wk" | "1mo" }> = {
  "1M": { days: 31, interval: "1d" },
  "6M": { days: 183, interval: "1d" },
  "1Y": { days: 366, interval: "1d" },
  "3Y": { days: 1100, interval: "1wk" },
  MAX: { days: null, interval: "1mo" },
};

export function isChartRange(v: string | null): v is ChartRange {
  return v === "1M" || v === "6M" || v === "1Y" || v === "3Y" || v === "MAX";
}

const sym = (ticker: string) => `${ticker}.NS`;
// Exchange-local (IST) calendar day, so a bar never lands on the previous date.
const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

async function yahooChart(ticker: string, range: ChartRange): Promise<ChartData | null> {
  const p = PARAMS[range];
  const res = (await yf.chart(sym(ticker), { period1: p.days ? new Date(Date.now() - p.days * DAY) : new Date("1990-01-01"), interval: p.interval }, LENIENT)) as ChartRes;
  const points: PricePoint[] = [];
  for (const q of res.quotes) {
    if (q.close == null || !Number.isFinite(q.close)) continue;
    const t = istDay(q.date);
    // Weekly/monthly bars can repeat the in-progress period's date; keep the last.
    if (points.length && points[points.length - 1].t === t) points[points.length - 1].c = q.close;
    else points.push({ t, c: q.close });
  }
  return points.length >= 2 ? { range, points, source: "yahoo" } : null;
}

const SCREENER_DAYS: Record<ChartRange, number> = { "1M": 31, "6M": 183, "1Y": 366, "3Y": 1100, MAX: 3650 };

async function screenerChart(companyId: string, range: ChartRange): Promise<ChartData | null> {
  const url = `https://www.screener.in/api/company/${companyId}/chart/?q=Price&days=${SCREENER_DAYS[range]}&consolidated=true`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const values: [string, string][] | undefined = json?.datasets?.find((d: { metric: string }) => d.metric === "Price")?.values;
  const points = (values ?? []).map(([t, c]) => ({ t, c: parseFloat(c) })).filter((p) => Number.isFinite(p.c));
  return points.length > 1 ? { range, points, source: "screener" } : null;
}

export async function getChart(ticker: string, range: ChartRange, screenerCompanyId?: string | null): Promise<ChartData | null> {
  // 5 min for short ranges (they show recent movement), longer for coarse ones.
  const ttl = range === "MAX" || range === "3Y" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(`chart:${ticker}:${range}`, ttl, async () => {
    try {
      const y = await yahooChart(ticker, range);
      if (y) return y;
    } catch {}
    try {
      if (screenerCompanyId) return await screenerChart(screenerCompanyId, range);
    } catch {}
    return null;
  });
}

export async function getQuote(ticker: string): Promise<Quote | null> {
  return cached(`quote:${ticker}`, 60 * 1000, async () => {
    try {
      const q = await yf.quote(sym(ticker), {}, LENIENT);
      if (typeof q.regularMarketPrice !== "number") return null;
      return {
        price: q.regularMarketPrice,
        prevClose: q.regularMarketPreviousClose ?? null,
        change: q.regularMarketChange ?? null,
        changePct: q.regularMarketChangePercent ?? null,
        currency: q.currency ?? "INR",
        asOf: (q.regularMarketTime ?? new Date()).toISOString(),
        delayedMin: q.exchangeDataDelayedBy ?? null,
      } satisfies Quote;
    } catch {
      return null;
    }
  });
}

const CR = 1e7; // Yahoo reports INR; Indian convention here is ₹ Crore
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fallback when Screener.in is unreachable: Yahoo's headline ratios + annual
// financials. No ROCE, shareholding or industry medians (Yahoo doesn't carry them
// for Indian stocks), so those parts of the UI stay empty and say so.
export async function getYahooFundamentals(ticker: string): Promise<Fundamentals | null> {
  return cached(`yfund:${ticker}`, 6 * 60 * 60 * 1000, async () => {
    try {
      const [q, profile, ts] = await Promise.all([
        yf.quote(sym(ticker), {}, LENIENT).catch(() => null),
        (yf.quoteSummary(sym(ticker), { modules: ["assetProfile", "financialData"] }, LENIENT) as Promise<SummaryRes>).catch(() => null),
        yf.fundamentalsTimeSeries(sym(ticker), { period1: new Date(Date.now() - 6 * 365 * DAY), type: "annual", module: "all" }, LENIENT).catch(() => []),
      ]);
      if (!q && !ts.length) return null;

      const rows = [...ts].sort((a, b) => +a.date - +b.date).slice(-6);
      const label = (d: Date) => `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      const cr = (v: number | undefined | null) => (v == null ? null : Math.round(v / CR));
      const annual: Fundamentals["annual"] = rows.length
        ? {
            years: rows.map((r) => label(r.date)),
            series: [
              { label: "Sales", values: rows.map((r) => cr(r.totalRevenue)) },
              { label: "Operating Profit", values: rows.map((r) => cr(r.operatingIncome)) },
              { label: "OPM %", values: rows.map((r) => (r.totalRevenue && r.operatingIncome != null ? +((r.operatingIncome / r.totalRevenue) * 100).toFixed(1) : null)) },
              { label: "Net Profit", values: rows.map((r) => cr(r.netIncome)) },
              { label: "EPS in Rs", values: rows.map((r) => r.dilutedEPS ?? null) },
            ],
          }
        : null;

      const roe = profile?.financialData?.returnOnEquity;
      return {
        source: "yahoo",
        companyId: null,
        classification: { sector: profile?.assetProfile?.sector, industry: profile?.assetProfile?.industry },
        kpi: q
          ? {
              price: q.regularMarketPrice ?? null,
              marketCap: q.marketCap ? `Rs ${Math.round(q.marketCap / CR).toLocaleString("en-IN")} Cr` : null,
              pe: q.trailingPE ?? null,
              bookValue: q.bookValue ?? null,
              divYield: q.dividendYield ?? null, // already a percentage on Yahoo's NSE quotes
              roce: null,
              roe: roe != null ? +(roe * 100).toFixed(1) : null,
              faceValue: null,
              low52w: q.fiftyTwoWeekLow ?? null,
              high52w: q.fiftyTwoWeekHigh ?? null,
            }
          : null,
        industry: null,
        growth: [],
        shareholding: null,
        annual,
        fetchedAt: new Date().toISOString(),
      } satisfies Fundamentals;
    } catch {
      return null;
    }
  });
}
