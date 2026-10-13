import { NextResponse } from "next/server";
import { lookupTicker } from "@/lib/live/allowlist";
import { getFundamentals } from "@/lib/live/screener-company";
import { getChart } from "@/lib/live/yahoo";
import { newsForTickers } from "@/lib/sector-content/insights";

// GET /api/stock/VOLTAS — live quote + Screener fundamentals + industry medians +
// curated news, with no database dependency. Every part is best-effort: a null
// section means that upstream was unreachable and the client falls back to the
// static seed figures it already carries.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const known = lookupTicker(ticker);
  if (!known) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });

  const fundamentals = await getFundamentals(known.slug);
  const month = await getChart(ticker, "1M", fundamentals?.companyId);
  const news = newsForTickers([ticker]).map(({ headline, source, url, date }) => ({ headline, source, url, date }));

  return NextResponse.json(
    { ticker, quote: month?.quote ?? null, fundamentals, news },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
