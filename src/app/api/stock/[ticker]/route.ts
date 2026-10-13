import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getFundamentals } from "@/lib/live/screener-company";
import { getQuote, getYahooFundamentals } from "@/lib/live/yahoo";
import { newsForTickers } from "@/lib/sector-content/insights";

// GET /api/stock/VOLTAS — live quote + Screener fundamentals + industry medians +
// curated news, with no database dependency. Every part is best-effort: a null
// section means that upstream was unreachable and the client falls back to the
// static seed figures it already carries.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!findSupplierByTicker(ticker)) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });

  // Screener has the full set (ROCE, shareholding, industry medians); if it is
  // unreachable, fall back to Yahoo's partial fundamentals. Quote is independent.
  const [screener, quote] = await Promise.all([getFundamentals(ticker), getQuote(ticker)]);
  const fundamentals = screener ?? (await getYahooFundamentals(ticker));
  const news = newsForTickers([ticker]).map(({ headline, source, url, date }) => ({ headline, source, url, date }));

  return NextResponse.json(
    { ticker, quote, fundamentals, news },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
