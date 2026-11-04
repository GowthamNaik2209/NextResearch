import { NextResponse } from "next/server";
import { ensureFinancials } from "@/lib/financials/load";
import { industryViewData } from "@/lib/baskets/industry-views";

// GET /api/industry/hospitals — one industry's full-screen view data (the heatmap's stocks and the
// pools), for the picker inside those views. The same server functions as the sector page.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const data = industryViewData(slug);
  if (!data) return NextResponse.json({ error: "unknown industry" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
