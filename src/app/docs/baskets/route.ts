import { NextResponse } from "next/server";
import { analysisBaskets } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";

// GET /docs/baskets: every industry basket's stock list for the Analysis block's Charts view,
// fetched when that view is first picked rather than shipped with every page that shows the block.
export async function GET() {
  await ensureFinancials();
  return NextResponse.json(analysisBaskets(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
