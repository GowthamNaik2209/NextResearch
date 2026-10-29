import { NextResponse } from "next/server";
import { getIndustryBasket } from "@/lib/baskets/industry";
import { ensureFinancials } from "@/lib/financials/load";
import { episodeMoves, type EpisodeWindow } from "@/lib/prices/episodes";

// GET /api/episodes?sector=nifty50&w=2008-01-10:2009-03-09,2013-05-22:2013-08-28
// Each listed stock's move (and the Nifty 50's) over each past window, from the price store: the
// explorer's "last time this happened" and its history ranking. Past prices don't change, so the CDN
// keeps an answer for a day.
// Every scenario's episode at once (26 scenarios today), with room to grow.
const MAX_WINDOWS = 40;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  await ensureFinancials();
  const q = new URL(req.url).searchParams;
  const b = getIndustryBasket(q.get("sector") ?? "");
  if (!b) return NextResponse.json({ error: "unknown industry" }, { status: 404 });
  const windows: EpisodeWindow[] = [];
  const parts = (q.get("w") ?? "").split(",").filter(Boolean);
  // Too many is refused outright: dropping some silently left the explorer waiting for them.
  if (parts.length > MAX_WINDOWS) return NextResponse.json({ error: "too many windows" }, { status: 400 });
  for (const part of parts) {
    const [from, to] = part.split(":");
    if (!DATE.test(from ?? "") || !DATE.test(to ?? "") || from >= to) return NextResponse.json({ error: "bad window" }, { status: 400 });
    windows.push({ from, to });
  }
  if (!windows.length) return NextResponse.json({ error: "no windows" }, { status: 400 });
  const episodes = await episodeMoves(
    b.stocks.map((s) => s.ticker),
    windows,
  );
  return NextResponse.json({ episodes }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
