// Where each stock in a saved basket was picked from (BasketItem.pickedFrom): checked here before
// it is stored, so only real industry or policy slugs reach the database. Pure (content only).
import { listSectors } from "@/lib/sector-content";

/**
 * Where each stock was picked from, from a request ({ ticker: industry slug }): only for these
 * tickers and only slugs of industries or policies the content has. Anything else is dropped (the
 * stock then reads in the basket's source industry, or its own), never saved.
 */
export function cleanPickedFrom(input: unknown, tickers: string[]): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const slugs = new Set(listSectors().map((s) => s.slug));
  const src = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const t of tickers) {
    const v = src[t];
    if (typeof v === "string" && slugs.has(v)) out[t] = v;
  }
  return out;
}
