// Baskets built from the authored sector content. An industry basket is every listed stock a
// sector maps, so it is derived here rather than stored, and changes whenever the content does.
// The same per-stock record (name, market cap, role, every industry it appears in) backs the
// rows of saved baskets and the watchlist.
import { listSectors, findSupplierByTicker, parseCrore } from "@/lib/sector-content";
import { getCompanyPage, companySlug, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { sectorBenchmarks, type Benchmark } from "@/lib/sector-content/benchmarks";
import { memoByFinancials } from "@/lib/financials/store";
import { oneOffReason } from "./outliers";

export { MAX_BASKET_STOCKS, MAX_BASKETS_PER_USER } from "./limits";

export type BasketStock = {
  ticker: string;
  name: string;
  /** Market cap in Rs Cr from the content's last extract (used for cap weighting). */
  mcapCr: number | null;
  /** Price to earnings from the same extract (null when loss-making or not reported). */
  pe: number | null;
  /** The company's strongest role and the layer it plays it in. */
  role: string;
  layer: string;
  /** Every industry the company is mapped in, primary one first. */
  industries: { slug: string; name: string }[];
  /** Its layer within each industry it is mapped in (the strongest where it has several), by
   * industry slug: the stock picker lists an industry's stocks under that industry's own layers. */
  layerIn: Record<string, string>;
  /** Why its figures have a one-off year (./outliers.ts), when they do: it is left out of the
   * rule-based baskets and screens, and marked "one-off" where a user adds it. Absent otherwise. */
  oneOff?: string;
};

export type IndustryBasket = {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  category: "sector" | "policy";
  stocks: BasketStock[];
  indices: Benchmark[];
};

// kpi is [pe, bookValue, divYield, roce, roe, faceValue]; a P/E at or below zero is a loss, not a multiple.
const peOf = (kpi?: (number | null)[] | null) => {
  const v = kpi?.[0];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
};

// Both caches carry market caps and P/Es, so they rebuild whenever new figures are installed.
const stockCaches = memoByFinancials(() => new Map<string, BasketStock | null>());

/** The basket record for any listed ticker in the content, or null for an unknown one. */
export function basketStock(ticker: string): BasketStock | null {
  const stockCache = stockCaches();
  if (stockCache.has(ticker)) return stockCache.get(ticker)!;
  const sup = findSupplierByTicker(ticker);
  const page = getCompanyPage(companySlug(ticker));
  let out: BasketStock | null = null;
  if (sup && sup.listed && page) {
    const primary = primaryAppearance(page);
    const fp = getCompanyFootprint(ticker);
    const industries = (fp?.sectors ?? []).map((s) => ({ slug: s.sectorSlug, name: s.sectorName }));
    industries.sort((a, b) => (a.slug === primary.sectorSlug ? -1 : b.slug === primary.sectorSlug ? 1 : 0));
    const best = new Map<string, { weight: number; label: string }>();
    for (const a of page.appearances) {
      const had = best.get(a.sectorSlug);
      if (!had || a.weight > had.weight) best.set(a.sectorSlug, { weight: a.weight, label: a.zoneLabel });
    }
    out = {
      ticker,
      name: page.name,
      mcapCr: parseCrore(page.supplier.f?.mcap ?? sup.f?.mcap),
      pe: peOf(page.supplier.f?.kpi ?? sup.f?.kpi),
      role: primary.role,
      layer: primary.zoneLabel,
      industries,
      layerIn: Object.fromEntries([...best].map(([slug, x]) => [slug, x.label])),
    };
    const oneOff = oneOffReason(page.supplier.f ?? sup.f);
    if (oneOff) out.oneOff = oneOff;
  }
  stockCache.set(ticker, out);
  return out;
}

/** One basket per live industry/policy: all its listed stocks, biggest first. */
export const listIndustryBaskets = memoByFinancials((): IndustryBasket[] =>
  listSectors()
    .filter((s) => !s.muted)
    .map((s) => {
      const seen = new Set<string>();
      const stocks: BasketStock[] = [];
      for (const sup of Object.values(s.suppliers)) {
        const t = sup.f?.ticker;
        if (!sup.listed || !t || seen.has(t)) continue;
        seen.add(t);
        const st = basketStock(t);
        if (!st) continue;
        // In an industry's basket a stock reads as its role in that industry (Bharat Forge's
        // railway part, not its EV one), the strongest if it has several there.
        const here = getCompanyPage(companySlug(t))?.appearances.filter((a) => a.sectorSlug === s.slug) ?? [];
        const a = here.reduce<(typeof here)[number] | null>((best, x) => (!best || x.weight > best.weight ? x : best), null);
        stocks.push(a ? { ...st, role: a.role, layer: a.zoneLabel } : st);
      }
      stocks.sort((a, b) => (b.mcapCr ?? -1) - (a.mcapCr ?? -1));
      return {
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        tagline: s.tagline,
        category: s.category ?? "sector",
        stocks,
        indices: sectorBenchmarks(s.slug),
      };
    }),
);

export function getIndustryBasket(slug: string): IndustryBasket | null {
  return listIndustryBaskets().find((b) => b.slug === slug) ?? null;
}

/** Every listed company that can go in a basket, A to Z (the add-stocks search). */
export function listBasketUniverse(): BasketStock[] {
  return listCompanyPages()
    .map((p) => basketStock(p.ticker))
    .filter((s): s is BasketStock => s !== null);
}

/** The industry most of a basket's stocks belong to (what a custom basket is compared with). */
export function dominantIndustry(tickers: string[]): string | null {
  const n = new Map<string, number>();
  for (const t of tickers) for (const i of basketStock(t)?.industries ?? []) n.set(i.slug, (n.get(i.slug) ?? 0) + 1);
  let best: string | null = null;
  for (const [slug, c] of n) if (!best || c > n.get(best)!) best = slug;
  return best;
}
