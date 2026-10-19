// Saved baskets: loading with access checks, and the shape the pages and API share.
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getQuote } from "@/lib/live/yahoo";
import { basketStock, MAX_BASKET_STOCKS } from "./industry";
import type { Weighting } from "./run";

export type SavedBasket = {
  id: string;
  name: string;
  description: string | null;
  sourceSector: string | null;
  weighting: Weighting;
  isPublic: boolean;
  isOwner: boolean;
  createdAt: string;
  items: { ticker: string; priceAtAdd: number | null; addedAt: string }[];
};

type Row = NonNullable<Awaited<ReturnType<typeof loadRow>>>;

const loadRow = (id: string) => prisma.basket.findUnique({ where: { id }, include: { items: { orderBy: { addedAt: "asc" } } } });

export function toSaved(row: Row, userId: string | null): SavedBasket {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceSector: row.sourceSector,
    weighting: row.weighting === "MCAP" ? "mcap" : "equal",
    isPublic: row.isPublic,
    isOwner: row.userId === userId,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((i) => ({ ticker: i.ticker, priceAtAdd: i.priceAtAdd ? i.priceAtAdd.toNumber() : null, addedAt: i.addedAt.toISOString() })),
  };
}

/**
 * A basket the viewer may see: their own, or one its owner has shared. Null otherwise.
 * Wrapped in React's cache(): a basket page's metadata and body share one database read.
 */
export const getVisibleBasket = cache(async (id: string, userId: string | null): Promise<SavedBasket | null> => {
  const row = await loadRow(id).catch(() => null);
  if (!row || (row.userId !== userId && !row.isPublic)) return null;
  return toSaved(row, userId);
});

/** Only tickers the content knows as listed, de-duplicated, capped at the basket limit. */
export function cleanTickers(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const t of input) if (typeof t === "string" && !out.includes(t) && basketStock(t)) out.push(t);
  return out.slice(0, MAX_BASKET_STOCKS);
}

export const cleanName = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 60) : fallback);

/** Record each new stock's live price, so the basket can show its move since it was added. */
export async function fillAddPrices(basketId: string, tickers: string[]) {
  for (let i = 0; i < tickers.length; i += 8) {
    await Promise.all(
      tickers.slice(i, i + 8).map(async (ticker) => {
        const q = await getQuote(ticker).catch(() => null);
        if (q) await prisma.basketItem.updateMany({ where: { basketId, ticker, priceAtAdd: null }, data: { priceAtAdd: q.price } });
      }),
    );
  }
}
