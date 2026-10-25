import { NextResponse } from "next/server";
import { getBenchmark } from "@/lib/sector-content/benchmarks";
import { isChartRange } from "@/lib/live/yahoo";
import { liveSymbolChart } from "@/lib/prices/store";

// GET /api/benchmark/nifty50/chart?range=1M|6M|1Y|2Y|3Y|5Y|MAX - only the ids in benchmarks.ts.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const range = new URL(req.url).searchParams.get("range");
  const b = getBenchmark(id);
  if (!b) return NextResponse.json({ error: "unknown benchmark" }, { status: 404 });
  if (!isChartRange(range)) return NextResponse.json({ error: "bad range" }, { status: 400 });

  const data = await liveSymbolChart(b.symbol, range);
  if (!data) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
