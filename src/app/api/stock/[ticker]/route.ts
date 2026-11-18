import { NextResponse } from "next/server";
import { companyFinancials, findSupplierByTicker } from "@/lib/sector-content";
import { getFundamentals } from "@/lib/live/screener-company";
import { getQuote, getYahooFundamentals } from "@/lib/live/yahoo";
import { getCompanyNews } from "@/lib/live/news";
import { presentableNews } from "@/lib/news-display";
import { isListedTicker } from "@/lib/news-listed";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { dataAsOf } from "@/lib/sector-content/insights";
import { ensureFinancials } from "@/lib/financials/load";
import { companyKind, fundamentalsForKind, INSURERS, LENDERS } from "@/lib/financials/kinds";
import { industryPe } from "@/lib/valuation/pe-data";
import { kindMedians } from "@/lib/financials/kind-medians";

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
  // A lender's or an insurer's ROCE and operating margin mean nothing: left out here, so the pop-up
  // never gets them as a number (financials/kinds.ts).
  const kind = companyKind(ticker.toUpperCase());
  const fundamentals = fundamentalsForKind(screener ?? (await within(getYahooFundamentals(ticker), null)), kind);
  // A lender's or an insurer's P/B and ROE are set against covered companies of its own kind (company table).
  // Its P/E median is the one "P/E in context" shows (the same covered companies of its kind).
  const kindPeers = kind === "operating" ? null : { ...kindMedians((kind === "lender" ? LENDERS : INSURERS).flatMap((t) => companyFinancials(t) ?? []), kind), pe: industryPe(ticker.toUpperCase())?.median ?? null };
  // `ts` lets the browser render "3h ago" against its own clock (this response is CDN-cached).
  // Grey-market and stale IPO run-up stories left out, cut-off headlines marked with an ellipsis.
  const news = presentableNews(newsResult.items, isListedTicker).map(({ headline, source, url, date, ts }) => ({ headline, source, url, date, ts }));

  return NextResponse.json(
    { ticker, quote, fundamentals, kindPeers, news, newsLive: newsResult.live, footprint: getCompanyFootprint(ticker), seedAsOf: findSupplierByTicker(ticker)?.f?.asOf ?? dataAsOf() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
