// Price history + quote from Yahoo Finance's public chart endpoint (unofficial;
// no key). Used for the chart pop-up and the live price header. Degrades to
// Screener's own price chart if Yahoo is unreachable.
import { cached } from "./cache";

export type ChartRange = "1M" | "6M" | "1Y" | "3Y" | "MAX";
export type PricePoint = { t: string; c: number }; // t = YYYY-MM-DD
export type Quote = { price: number; prevClose: number | null; change: number | null; changePct: number | null; currency: string; asOf: string };
export type ChartData = { range: ChartRange; points: PricePoint[]; quote: Quote | null; source: "yahoo" | "screener" };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Interval chosen so each range lands at a few hundred points: enough detail,
// small payload. (MAX uses monthly: decades of daily bars aren't useful here.)
const PARAMS: Record<ChartRange, { range: string; interval: string }> = {
  "1M": { range: "1mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "3Y": { range: "3y", interval: "1wk" },
  MAX: { range: "max", interval: "1mo" },
};

export function isChartRange(v: string | null): v is ChartRange {
  return v === "1M" || v === "6M" || v === "1Y" || v === "3Y" || v === "MAX";
}

async function fromYahoo(ticker: string, range: ChartRange): Promise<ChartData | null> {
  const p = PARAMS[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.NS?range=${p.range}&interval=${p.interval}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  const ts: number[] | undefined = r?.timestamp;
  const closes: (number | null)[] | undefined = r?.indicators?.quote?.[0]?.close;
  if (!r || !ts || !closes) return null;
  const points: PricePoint[] = [];
  ts.forEach((t, i) => {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) return;
    // Exchange-local date (IST) so a bar never lands on the previous calendar day.
    const day = new Date((t + (r.meta?.gmtoffset ?? 19800)) * 1000).toISOString().slice(0, 10);
    // Monthly/weekly bars can repeat the in-progress period's date; keep the last.
    if (points.length && points[points.length - 1].t === day) points[points.length - 1].c = c;
    else points.push({ t: day, c });
  });
  if (points.length < 2) return null;
  const m = r.meta ?? {};
  const price: number | undefined = m.regularMarketPrice;
  const prev: number | undefined = m.chartPreviousClose ?? m.previousClose;
  // chartPreviousClose is the close *before the requested range*, not yesterday's,
  // so derive the day change from the last two daily points only for 1d-grain data.
  const dayPrev = range === "1M" || range === "6M" || range === "1Y" ? points[points.length - 2]?.c : null;
  const base = dayPrev ?? (typeof m.previousClose === "number" ? m.previousClose : prev ?? null);
  const quote: Quote | null =
    typeof price === "number"
      ? {
          price,
          prevClose: base,
          change: base != null ? price - base : null,
          changePct: base ? ((price - base) / base) * 100 : null,
          currency: m.currency ?? "INR",
          asOf: new Date((m.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
        }
      : null;
  return { range, points, quote, source: "yahoo" };
}

const DAYS: Record<ChartRange, number> = { "1M": 31, "6M": 183, "1Y": 366, "3Y": 1100, MAX: 3650 };

async function fromScreener(companyId: string, range: ChartRange): Promise<ChartData | null> {
  const url = `https://www.screener.in/api/company/${companyId}/chart/?q=Price&days=${DAYS[range]}&consolidated=true`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const values: [string, string][] | undefined = json?.datasets?.find((d: { metric: string }) => d.metric === "Price")?.values;
  const points = (values ?? []).map(([t, c]) => ({ t, c: parseFloat(c) })).filter((p) => Number.isFinite(p.c));
  return points.length > 1 ? { range, points, quote: null, source: "screener" } : null;
}

export async function getChart(ticker: string, range: ChartRange, screenerCompanyId?: string | null): Promise<ChartData | null> {
  // 5 min for short ranges (they show "live" movement), longer for coarse ones.
  const ttl = range === "MAX" || range === "3Y" ? 60 * 60 * 1000 : 5 * 60 * 1000;
  return cached(`chart:${ticker}:${range}`, ttl, async () => {
    try {
      const y = await fromYahoo(ticker, range);
      if (y) return y;
    } catch {}
    try {
      if (screenerCompanyId) return await fromScreener(screenerCompanyId, range);
    } catch {}
    return null;
  });
}
