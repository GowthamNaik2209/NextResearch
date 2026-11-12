// What a signal backtest runs on (docs/SIGNALS.md section 4): one covered stock, an industry's
// basket ("industry:<slug>", every listed stock mapped in it) or one of the user's own baskets (its
// id). Server only: an own basket is read from the database, and only by its owner. A basket comes
// with its saved weighting: an own basket's as stored, an industry basket's equal (its page's).
import { prisma } from "@/lib/prisma";
import { EQUAL, type SignalWeighting } from "./weighting";
import { basketStock, getIndustryBasket, listBasketUniverse, listIndustryBaskets } from "@/lib/baskets/industry";

export type Scope = "stock" | "basket";
export type Target = { scope: Scope; target: string; name: string; tickers: string[]; weighting: SignalWeighting };

export type TargetChoices = {
  stocks: { ticker: string; name: string }[];
  industries: { target: string; name: string; size: number }[];
  baskets: { target: string; name: string; size: number }[];
};

export const isScope = (v: unknown): v is Scope => v === "stock" || v === "basket";

/** The stock or basket a request names, or null when it doesn't exist or isn't the user's. */
export async function resolveTarget(scope: Scope, target: string, userId: string): Promise<Target | null> {
  if (scope === "stock") {
    const s = basketStock(target.toUpperCase());
    return s ? { scope, target: s.ticker, name: s.name, tickers: [s.ticker], weighting: EQUAL } : null;
  }
  if (target.startsWith("industry:")) {
    const b = getIndustryBasket(target.slice("industry:".length));
    return b && b.stocks.length ? { scope, target, name: b.name, tickers: b.stocks.map((s) => s.ticker), weighting: EQUAL } : null;
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(target)) return null;
  const row = await prisma.basket.findFirst({ where: { id: target, userId }, select: { name: true, weighting: true, customWeighting: true, items: { select: { ticker: true, weight: true } } } });
  const tickers = row?.items.map((i) => i.ticker).filter((t) => basketStock(t)) ?? [];
  if (!row || !tickers.length) return null;
  // As the basket's page reads it (lib/baskets/store.ts toSaved): custom wins, then market cap.
  const weighting: SignalWeighting = row.customWeighting
    ? { scheme: "custom", weights: Object.fromEntries(row.items.filter((i) => i.weight != null).map((i) => [i.ticker, i.weight!])) }
    : row.weighting === "MCAP"
      ? { scheme: "mcap" }
      : EQUAL;
  return { scope, target, name: row.name, tickers, weighting };
}

/** Everything the picker offers this user: covered stocks, industry baskets, and their own baskets. */
export async function listTargets(userId: string): Promise<TargetChoices> {
  const own = await prisma.basket
    .findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, items: { select: { ticker: true } } } })
    .catch((e) => (console.error("signals: own baskets read failed", e), []));
  return {
    stocks: listBasketUniverse()
      .map((s) => ({ ticker: s.ticker, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    industries: listIndustryBaskets()
      .filter((b) => b.stocks.length > 1)
      .map((b) => ({ target: `industry:${b.slug}`, name: b.name, size: b.stocks.length }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    baskets: own.map((b) => ({ target: b.id, name: b.name, size: b.items.length })).filter((b) => b.size > 0),
  };
}
