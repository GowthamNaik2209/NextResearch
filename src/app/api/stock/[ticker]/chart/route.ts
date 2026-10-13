import { NextResponse } from "next/server";
import { lookupTicker } from "@/lib/live/allowlist";
import { getChart, isChartRange } from "@/lib/live/yahoo";
import { getFundamentals } from "@/lib/live/screener-company";

// GET /api/stock/VOLTAS/chart?range=1M|6M|1Y|3Y|MAX
export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const range = new URL(req.url).searchParams.get("range");
  if (!lookupTicker(ticker)) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });
  if (!isChartRange(range)) return NextResponse.json({ error: "bad range" }, { status: 400 });

  let data = await getChart(ticker, range);
  if (!data) {
    // Yahoo unreachable: retry with Screener's chart as a fallback (needs its company id).
    const f = await getFundamentals(ticker);
    data = await getChart(ticker, range, f?.companyId);
  }
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
