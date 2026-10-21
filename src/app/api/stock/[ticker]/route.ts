import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getFundamentals } from "@/lib/live/screener-company";
import { getChart, getQuote, getYahooFundamentals } from "@/lib/live/yahoo";
import { getCompanyNews } from "@/lib/live/news";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { dataAsOf } from "@/lib/sector-content/insights";
import { priceReturn, withLiveQuote } from "@/components/stock/merge";
import { ensureFinancials } from "@/lib/financials/load";

// One slow upstream must not hold the whole response (an Apollo pop-up once sat on "fetching" for
// a minute): each part gets this long, then counts as unreachable and the client uses cached figures.
const PART_TIMEOUT_MS = 10_000;
function within<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), PART_TIMEOUT_MS))]);
}

// GET /api/stock/VOLTAS — live quote + Screener fundamentals + industry medians +
// latest headlines (curated fallback). Every part is best-effort: a null
// section means that upstream was unreachable and the client falls back to the
// company-table figures it already carries (the allowlist check needs that table loaded).
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  await ensureFinancials();
  const { ticker } = await params;
  if (!findSupplierByTicker(ticker)) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });

  // Screener has the full set (ROCE, shareholding, industry medians); if it is
  // unreachable, fall back to Yahoo's partial fundamentals. Quote is independent.
  // The 1Y price history is the same cached series the Chart tab draws, so the Summary's
  // 1-year return and the chart's "past 1 year" change are one computation, not two sources.
  const [screener, quote, newsResult, chart1y] = await Promise.all([
    within(getFundamentals(ticker), null),
    within(getQuote(ticker), null),
    within(getCompanyNews(ticker, 8), { items: [], live: false }),
    within(getChart(ticker, "1Y"), null),
  ]);
  const fundamentals = screener ?? (await within(getYahooFundamentals(ticker), null));
  // `ts` lets the browser render "3h ago" against its own clock (this response is CDN-cached).
  const news = newsResult.items.map(({ headline, source, url, date, ts }) => ({ headline, source, url, date, ts }));
  const return1y = chart1y ? priceReturn(withLiveQuote(chart1y.points, quote)) : null;

  return NextResponse.json(
    { ticker, quote, fundamentals, news, newsLive: newsResult.live, footprint: getCompanyFootprint(ticker), return1y, seedAsOf: findSupplierByTicker(ticker)?.f?.asOf ?? dataAsOf() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
