import { NextResponse } from "next/server";
import { analysisChartIndustries } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";

// GET /docs/baskets: every industry's layers and listed stocks for the Analysis block's chart pop-up,
// fetched when a Charts button is first pressed rather than shipped with every page that shows the block.
export async function GET() {
  await ensureFinancials();
  return NextResponse.json(analysisChartIndustries(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
