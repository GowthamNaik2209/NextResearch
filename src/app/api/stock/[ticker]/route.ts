import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getFundamentals } from "@/lib/live/screener-company";
import { getChart, getQuote, getYahooFundamentals } from "@/lib/live/yahoo";
import { getCompanyNews } from "@/lib/live/news";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { DATA_AS_OF } from "@/lib/sector-content/insights";
import { priceReturn, withLiveQuote } from "@/components/stock/merge";

// GET /api/stock/VOLTAS — live quote + Screener fundamentals + industry medians +
// latest headlines (curated fallback), with no database dependency. Every part is best-effort: a null
// section means that upstream was unreachable and the client falls back to the
// static seed figures it already carries.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!findSupplierByTicker(ticker)) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });

  // Screener has the full set (ROCE, shareholding, industry medians); if it is
  // unreachable, fall back to Yahoo's partial fundamentals. Quote is independent.
  // The 1Y price history is the same cached series the Chart tab draws, so the Summary's
  // 1-year return and the chart's "past 1 year" change are one computation, not two sources.
  const [screener, quote, newsResult, chart1y] = await Promise.all([
    getFundamentals(ticker),
    getQuote(ticker),
    getCompanyNews(ticker, 8),
    getChart(ticker, "1Y").catch(() => null),
  ]);
  const fundamentals = screener ?? (await getYahooFundamentals(ticker));
  // `ts` lets the browser render "3h ago" against its own clock (this response is CDN-cached).
  const news = newsResult.items.map(({ headline, source, url, date, ts }) => ({ headline, source, url, date, ts }));
  const return1y = chart1y ? priceReturn(withLiveQuote(chart1y.points, quote)) : null;

  return NextResponse.json(
    { ticker, quote, fundamentals, news, newsLive: newsResult.live, footprint: getCompanyFootprint(ticker), return1y, seedAsOf: findSupplierByTicker(ticker)?.f?.asOf ?? DATA_AS_OF },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
