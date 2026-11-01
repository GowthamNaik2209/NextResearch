import { NextResponse } from "next/server";
import { basketStock } from "@/lib/baskets/industry";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsLoading } from "@/lib/baskets/projection-risk-data";

// GET /api/stock/VOLTAS/projection — the stock's basket record with its 1- and 2-year projection
// (or why it is left out), for the stock pop-up's Backtest view: the same record and model the
// basket pages read (docs/PROJECTIONS.md). `statsLoading`: this server instance is still loading
// the price statistics, so the projection uses stand-ins (beta 1, volatility from the 52-week
// range) and the view asks again shortly; such an answer is cached only briefly.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { ticker } = await params;
  const stock = basketStock(ticker);
  if (!stock) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });
  const statsLoading = riskStatsLoading();
  return NextResponse.json(
    { stock, statsLoading },
    { headers: { "Cache-Control": statsLoading ? "public, s-maxage=15" : "public, s-maxage=900, stale-while-revalidate=900" } }
  );
}
