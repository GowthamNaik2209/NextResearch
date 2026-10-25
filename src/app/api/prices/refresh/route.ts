// The price store's daily top-up (src/lib/prices/refresh.ts): Vercel Cron calls this once each
// weekday evening (vercel.json, 19:30 IST, after the company figures' run) to add the trading day's
// bars for every mapped stock and benchmark. One chunk of up to ~4 minutes; a series it doesn't reach
// waits for the next day's run, which fetches every day it missed. The first fill (five years of
// every series) is scripts/refresh-prices.ts, by hand.
//
// Same guard as the financials cron (CRON_SECRET; refused without it, so local dev never writes).
// PRICES_AUTO_REFRESH=0 turns it off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { ensureFinancials } from "@/lib/financials/load";
import { runPriceChunk } from "@/lib/prices/refresh";

export const maxDuration = 300;
const BUDGET_MS = 240_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.PRICES_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    // The list of stocks comes from the content, which reads the company table.
    await ensureFinancials();
    return Response.json(await runPriceChunk(prisma, { budgetMs: BUDGET_MS }));
  } catch (e) {
    console.error("prices refresh (cron): chunk failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
