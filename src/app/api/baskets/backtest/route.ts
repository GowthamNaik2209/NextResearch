import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isChartRange } from "@/lib/live/yahoo";
import { getIndustryBasket } from "@/lib/baskets/industry";
import { backtestBasket } from "@/lib/baskets/run";
import { parseStrategy } from "@/lib/baskets/strategy";
import { cleanTickers, getVisibleBasket } from "@/lib/baskets/store";

// A cold industry basket fetches up to ~57 price histories (8 at a time).
export const maxDuration = 60;

// GET /api/baskets/backtest?range=1Y&(sector=ev4w | id=<basket id> | tickers=A,B,C)
//   [&w=equal|mcap|capped|layer][&cap=15&lcap=35][&rb=never|monthly|quarterly|drift][&band=5]
// Returns the basket's value (100 on day one) plus each holding's return and contribution, and
// the turnover and trades its rebalancing took. With no strategy parameters it is bought at equal
// weights (a saved basket: its own weighting) and held, as it always has been.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const range = q.get("range");
  if (!isChartRange(range)) return NextResponse.json({ error: "bad range" }, { status: 400 });
  let strategy = parseStrategy(q);
  let layers: Map<string, string> | undefined;
  let tickers: string[] = [];
  let shared = true;

  const sector = q.get("sector");
  const id = q.get("id");
  if (sector) {
    const b = getIndustryBasket(sector);
    if (!b) return NextResponse.json({ error: "unknown industry" }, { status: 404 });
    tickers = b.stocks.map((s) => s.ticker);
    // Its stocks' layers within this industry, for the capped and layer-balanced weightings.
    layers = new Map(b.stocks.map((s) => [s.ticker, s.layer]));
  } else if (id) {
    const user = await getCurrentUser();
    const b = await getVisibleBasket(id, user?.id ?? null);
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
    tickers = b.items.map((i) => i.ticker);
    if (!q.get("w")) strategy = parseStrategy(q, b.weighting);
    shared = b.isPublic;
  } else {
    tickers = cleanTickers((q.get("tickers") ?? "").split(","));
  }
  if (!tickers.length) return NextResponse.json({ error: "no stocks" }, { status: 400 });

  const data = await backtestBasket(tickers, range, strategy, layers);
  if (!data.points.length) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  // A private basket's response must not sit in a shared CDN cache.
  const cache = shared ? "public, s-maxage=300, stale-while-revalidate=900" : "private, max-age=60";
  return NextResponse.json({ ...data, source: "basket" }, { headers: { "Cache-Control": cache } });
}
