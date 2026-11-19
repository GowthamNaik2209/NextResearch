// The stored period figures' daily rebuild (src/lib/baskets/basket-returns.ts): Vercel Cron calls
// this each weekday evening (vercel.json, 20:00 IST, half an hour after the price store's top-up)
// to work out every industry basket's figures for the Baskets page's period menu, then to fill the
// day's rule-based baskets (their price histories and lists) before the first visitor. By hand:
// scripts/refresh-basket-returns.ts.
//
// Same guard as the other crons (CRON_SECRET; refused without it, so local dev never writes).
// BASKET_RETURNS_AUTO_REFRESH=0 turns it off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { ensureFinancials } from "@/lib/financials/load";
import { refreshBasketReturns } from "@/lib/baskets/basket-returns";
import { warmIdeas } from "@/lib/baskets/ideas-data";

export const maxDuration = 300;
const BUDGET_MS = 240_000;
// What's left of the run after the figures warms the rule-based baskets' price histories.
const WARM_UNTIL_MS = 285_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.BASKET_RETURNS_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    // The baskets' stocks come from the content, which reads the company table.
    const start = Date.now();
    await ensureFinancials();
    const returns = await refreshBasketReturns(prisma, { deadline: start + BUDGET_MS });
    // The day's rule-based baskets, built here so the first visitor doesn't wait on ~700 histories.
    const ideas = await warmIdeas(start + WARM_UNTIL_MS).catch((e: unknown) => {
      console.error("basket ideas warm-up (cron): failed", e);
      return null;
    });
    return Response.json({ ...returns, ideas });
  } catch (e) {
    console.error("basket returns refresh (cron): failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
