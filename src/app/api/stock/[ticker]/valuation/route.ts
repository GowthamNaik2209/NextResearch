import { NextResponse } from "next/server";
import { ensureFinancials } from "@/lib/financials/load";
import { peContext } from "@/lib/valuation/pe-data";

// GET /api/stock/VOLTAS/valuation — today's P/E against the stock's own month-end P/Es since 2022
// and its primary industry's median among covered stocks (src/lib/valuation/pe-context.ts), for the
// stock pop-up's Summary. The company page computes the same on the server.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  await ensureFinancials();
  const { ticker } = await params;
  const ctx = await peContext(ticker);
  if (!ctx) return NextResponse.json({ error: "no P/E context" }, { status: 404 });
  return NextResponse.json(ctx, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" } });
}
