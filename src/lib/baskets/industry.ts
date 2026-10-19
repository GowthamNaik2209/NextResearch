// Baskets built from the authored sector content. An industry basket is every listed stock a
// sector maps, so it is derived here rather than stored, and changes whenever the content does.
// The same per-stock record (name, market cap, role, every industry it appears in) backs the
// rows of saved baskets and the watchlist.
import { listSectors, findSupplierByTicker } from "@/lib/sector-content";
import { getCompanyPage, companySlug, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { getCompanyFootprint } from "@/lib/sector-content/exposure";
import { sectorBenchmarks, type Benchmark } from "@/lib/sector-content/benchmarks";

/** Upper bound on a saved basket (the largest industry, real estate, has 57). */
export const MAX_BASKET_STOCKS = 75;
/** Saved baskets one account may keep. */
export const MAX_BASKETS_PER_USER = 50;

export type BasketStock = {
  ticker: string;
  name: string;
  /** Market cap in Rs Cr from the content's last extract (used for cap weighting). */
  mcapCr: number | null;
  /** The company's strongest role and the layer it plays it in. */
  role: string;
  layer: string;
  /** Every industry the company is mapped in, primary one first. */
  industries: { slug: string; name: string }[];
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

const parseCr = (s?: string) => {
  const n = s ? parseFloat(s.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

const stockCache = new Map<string, BasketStock | null>();

/** The basket record for any listed ticker in the content, or null for an unknown one. */
export function basketStock(ticker: string): BasketStock | null {
  if (stockCache.has(ticker)) return stockCache.get(ticker)!;
  const sup = findSupplierByTicker(ticker);
  const page = getCompanyPage(companySlug(ticker));
  let out: BasketStock | null = null;
  if (sup && sup.listed && page) {
    const primary = primaryAppearance(page);
    const fp = getCompanyFootprint(ticker);
    const industries = (fp?.sectors ?? []).map((s) => ({ slug: s.sectorSlug, name: s.sectorName }));
    industries.sort((a, b) => (a.slug === primary.sectorSlug ? -1 : b.slug === primary.sectorSlug ? 1 : 0));
    out = {
      ticker,
      name: page.name,
      mcapCr: parseCr(page.supplier.f?.mcap ?? sup.f?.mcap),
      role: primary.role,
      layer: primary.zoneLabel,
      industries,
    };
  }
  stockCache.set(ticker, out);
  return out;
}

let industryCache: IndustryBasket[] | null = null;

/** One basket per live industry/policy: all its listed stocks, biggest first. */
export function listIndustryBaskets(): IndustryBasket[] {
  industryCache ??= listSectors()
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
    });
  return industryCache;
}

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
