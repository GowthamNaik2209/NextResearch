import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { isChartRange } from "@/lib/live/yahoo";
import { liveChart } from "@/lib/prices/store";
import { ensureFinancials } from "@/lib/financials/load";

// GET /api/stock/VOLTAS/chart?range=1M|6M|1Y|2Y|3Y|5Y|MAX
export async function GET(req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  await ensureFinancials();
  const { ticker } = await params;
  const range = new URL(req.url).searchParams.get("range");
  if (!findSupplierByTicker(ticker)) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });
  if (!isChartRange(range)) return NextResponse.json({ error: "bad range" }, { status: 400 });

  const data = await liveChart(ticker, range);
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
