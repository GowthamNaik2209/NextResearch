import { NextResponse } from "next/server";
import { getIdeas } from "@/lib/baskets/ideas-data";
import { basketStock } from "@/lib/baskets/industry";

// The first build of the day's lists reads ~260 price histories (10 at a time).
export const maxDuration = 60;

// GET /api/baskets/ideas - the day's basket ideas, each stock with its name for the cards.
export async function GET() {
  try {
    const { asOf, ideas } = await getIdeas();
    return NextResponse.json(
      { asOf, ideas: ideas.map((i) => ({ ...i, stocks: i.stocks.map((s) => ({ ...s, name: basketStock(s.ticker)?.name ?? s.ticker })) })) },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    console.error("[ideas] building the basket ideas failed", e);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
