// The landing page's per-stock figures (movers, % of stocks up, the watchlist strip;
// src/lib/landing/market-data.ts): Vercel Cron calls this each weekday evening (vercel.json, 20:15
// IST, after the price store's top-up and the basket figures) so the day's figures are already in the
// shared cache when the first visitor arrives, instead of being worked out over the first visits.
//
// Same guard as the other crons (CRON_SECRET; refused without it, so local dev never runs it).
// LANDING_AUTO_REFRESH=0 turns it off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { warmMarketStocks } from "@/lib/landing/market-data";

export const maxDuration = 300;
const BUDGET_MS = 270_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.LANDING_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    return Response.json(await warmMarketStocks(Date.now() + BUDGET_MS));
  } catch (e) {
    console.error("landing refresh (cron): failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
