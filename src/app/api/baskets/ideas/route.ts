import { NextResponse } from "next/server";
import { getIdeasWithReturns } from "@/lib/baskets/ideas-data";
import { basketStock } from "@/lib/baskets/industry";
import { ensureFinancials } from "@/lib/financials/load";

// The first build of the day's lists reads ~260 price histories (10 at a time), and each card's
// figure is its idea's own backtest.
export const maxDuration = 60;

// GET /api/baskets/ideas - the day's basket ideas, each stock with its name for the cards. Cached
// at the CDN no longer than the backtest route, so a card never trails its idea's page.
export async function GET() {
  await ensureFinancials();
  try {
    const { asOf, ideas } = await getIdeasWithReturns();
    return NextResponse.json(
      { asOf, ideas: ideas.map((i) => ({ ...i, stocks: i.stocks.map((s) => ({ ...s, name: basketStock(s.ticker)?.name ?? s.ticker })) })) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (e) {
    console.error("[ideas] building the basket ideas failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
