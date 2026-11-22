import { NextResponse } from "next/server";
import { getIdeasWithReturns, ideaStockInfo } from "@/lib/baskets/ideas-data";
import { withAwaitingFigures } from "@/lib/baskets/ideas";
import { screensAwaitingFigures } from "@/lib/baskets/kpi-screens";
import { basketStock } from "@/lib/baskets/industry";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";

// The first build of the day's lists reads ~260 price histories (10 at a time), and each card's
// figure is its idea's own backtest.
export const maxDuration = 60;

// GET /api/baskets/ideas - the day's basket ideas, each stock with its name for the cards. The
// lists and figures change once a day, so the CDN keeps them an hour (and serves a stale copy while
// it refreshes).
export async function GET() {
  await ensureFinancials();
  await ensureRiskStats();
  try {
    const { asOf, ideas: today, complete } = await getIdeasWithReturns();
    // Screens with no stocks only because their figures aren't added yet are listed too, saying so.
    const ideas = withAwaitingFigures(today, screensAwaitingFigures(ideaStockInfo()));
    return NextResponse.json(
      { asOf, ideas: ideas.map((i) => ({ ...i, stocks: i.stocks.map((s) => ({ ...s, name: basketStock(s.ticker)?.name ?? s.ticker })) })) },
      // Some cards still without a figure (the server is working them out): the CDN keeps it a minute only.
      { headers: { "Cache-Control": complete ? "public, s-maxage=3600, stale-while-revalidate=86400" : "public, s-maxage=60" } },
    );
  } catch (e) {
    console.error("[ideas] building the basket ideas failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
