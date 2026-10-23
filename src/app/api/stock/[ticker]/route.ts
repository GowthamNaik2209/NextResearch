import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getFundamentals } from "@/lib/live/screener-company";
import { getQuote, getYahooFundamentals } from "@/lib/live/yahoo";
import { getCompanyNews } from "@/lib/live/news";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { dataAsOf } from "@/lib/sector-content/insights";
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
  // (Key stats, CAGR and revenue come from the company table the client already has - see
  // mergeStats - so no price history is fetched here; the Chart tab loads its own.)
  const [screener, quote, newsResult] = await Promise.all([
    within(getFundamentals(ticker), null),
    within(getQuote(ticker), null),
    within(getCompanyNews(ticker, 8), { items: [], live: false }),
  ]);
  const fundamentals = screener ?? (await within(getYahooFundamentals(ticker), null));
  // `ts` lets the browser render "3h ago" against its own clock (this response is CDN-cached).
  const news = newsResult.items.map(({ headline, source, url, date, ts }) => ({ headline, source, url, date, ts }));

  return NextResponse.json(
    { ticker, quote, fundamentals, news, newsLive: newsResult.live, footprint: getCompanyFootprint(ticker), seedAsOf: findSupplierByTicker(ticker)?.f?.asOf ?? dataAsOf() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
