import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isChartRange } from "@/lib/live/yahoo";
import { basketStock, getIndustryBasket } from "@/lib/baskets/industry";
import { backtestBasket, missingPrices } from "@/lib/baskets/run";
import { parseStrategy, shortHash } from "@/lib/baskets/strategy";
import { cleanTickers, getVisibleBasket } from "@/lib/baskets/store";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";

// A cold industry basket fetches up to ~57 price histories (8 at a time).
export const maxDuration = 60;

// GET /api/baskets/backtest?range=1Y&(sector=ev4w | id=<basket id> | tickers=A,B,C)
//   [&w=equal|mcap|custom][&cw=TCS:40,INFY:60][&rb=never|monthly|quarterly|drift][&band=5][&join=listing]
// Returns the basket's value (100 on day one) plus each holding's return and contribution, and
// the turnover and trades its rebalancing took. With no strategy parameters it is bought at equal
// weights (a saved basket: its own weighting) and held, as it always has been. Custom with no cw
// reads a saved basket's own weights (equal for any other basket); "capped" reads as market cap and "layer" as equal (both since removed).
// join=listing: a stock listed during the period joins on its first trading day instead of being
// left out (the Recent listings rule-based basket backtests each stock from its listing).
export async function GET(req: Request) {
  await ensureFinancials();
  await ensureRiskStats();
  const q = new URL(req.url).searchParams;
  const range = q.get("range");
  if (!isChartRange(range)) return NextResponse.json({ error: "bad range" }, { status: 400 });
  let strategy = parseStrategy(q);
  let tickers: string[] = [];
  let shared = true;

  const sector = q.get("sector");
  const id = q.get("id");
  if (sector) {
    const b = getIndustryBasket(sector);
    if (!b) return NextResponse.json({ error: "unknown industry" }, { status: 404 });
    tickers = b.stocks.map((s) => s.ticker);
  } else if (id) {
    const user = await getCurrentUser();
    const b = await getVisibleBasket(id, user?.id ?? null);
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
    // The stocks the page draws (those the content still lists), as savedBasketQuery hashes them.
    tickers = b.items.map((i) => i.ticker).filter((t) => basketStock(t));
    // `v` names the stocks the page expects. A different set means an edit hasn't been saved yet
    // (the page asked mid-save) or the page is out of date: answer 409, cached nowhere, rather than
    // backtest the old stocks under the new name, which the browser would then keep showing.
    const v = q.get("v");
    if (v && v !== shortHash([...tickers].sort().join(","))) {
      return NextResponse.json({ error: "stale", tickers }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    if (!q.get("w")) strategy = parseStrategy(q, b.weighting);
    // Custom weights only for the stocks in it now (a removed stock's kept % never counts).
    if (strategy.weighting === "custom" && !strategy.weights && b.weights) strategy = { ...strategy, weights: Object.fromEntries(Object.entries(b.weights).filter(([t]) => tickers.includes(t))) };
    shared = b.isPublic;
  } else {
    tickers = cleanTickers((q.get("tickers") ?? "").split(","));
  }
  if (!tickers.length) return NextResponse.json({ error: "no stocks" }, { status: 400 });

  const data = await backtestBasket(tickers, range, strategy, { joinLate: q.get("join") === "listing" });
  if (!data.points.length) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  // A private basket's response must not sit in a shared CDN cache.
  // One missing a stock's prices (Yahoo failing or slow) is held a short while, so a reload soon fills it in.
  const brief = missingPrices(data);
  const cache = shared ? (brief ? "public, s-maxage=30" : "public, s-maxage=300, stale-while-revalidate=900") : brief ? "private, max-age=10" : "private, max-age=60";
  return NextResponse.json({ ...data, source: "basket" }, { headers: { "Cache-Control": cache } });
}
