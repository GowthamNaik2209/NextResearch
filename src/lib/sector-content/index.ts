// The sector registry: every sector's content, for server code, scripts and tests. Types and pure
// helpers live in ./core.ts (re-exported here); the browser explorer loads one sector at a time
// through ./sectors/load.ts instead of this file, which pulls in all of them.
import { PRODUCTS as PRODUCTS_RAW } from "./products";
import { financialsVersion, getFinancials, listFinancials } from "@/lib/financials/store";
import { isSideLink, linkWeight, companyLinkKey, type ComingSoonSector, type SectorDef, type SectorSupplier, type SectorWithSlug, type SupplierFinancials } from "./core";

export * from "./core";

// The sector modules are untyped authored content (see products.ts's header), so cast the whole
// registry once here rather than per call site.
const PRODUCTS = PRODUCTS_RAW as unknown as Record<string, SectorDef> & {
  _comingSoon: ComingSoonSector[];
};

const SECTOR_KEYS = Object.keys(PRODUCTS).filter((k) => k !== "_comingSoon");

// Suppliers' figures are filled from the database (src/lib/financials/), so inside the Next server
// reading sectors before they are installed would quietly render blanks: fail loudly instead.
// Scripts and tests (no NEXT_RUNTIME) read the content without figures; the browser installs the
// slice it is handed (the 3D explorer) before reading.
function assertFiguresLoaded() {
  if (process.env.NEXT_RUNTIME && typeof window === "undefined" && financialsVersion() === 0)
    throw new Error("Company figures are not loaded: await ensureFinancials() (src/lib/financials/load.ts) first");
}

export function listSectorSlugs(): string[] {
  return [...SECTOR_KEYS];
}

export function listSectors(): SectorWithSlug[] {
  assertFiguresLoaded();
  return SECTOR_KEYS.map((slug) => ({ slug, ...PRODUCTS[slug] }));
}

export function getSector(slug: string): SectorWithSlug | null {
  assertFiguresLoaded();
  const sector = PRODUCTS[slug];
  return sector ? { slug, ...sector } : null;
}

export function listComingSoonSectors(): ComingSoonSector[] {
  return PRODUCTS._comingSoon;
}

type Home = { slug: string; key: string; weight: number };
let homeByTicker: Map<string, Home> | null = null;

// Strongest link wins; ties keep the earlier sector (industries come before the policies that reuse
// their companies) and the earlier zone. An index (the Nifty 50) is a company's home only where no
// industry or policy maps it in the chain itself - it beats a side link (HDFC Bank as a home-loan
// lender to real estate), never a direct one - and muted sectors only count for a company found
// nowhere else; a listed supplier linked from no zone resolves to its first record.
const homePenalty = (s: SectorDef) => (s.muted ? 100 : s.category === "index" ? 50 : 0);
function homes(): Map<string, Home> {
  if (homeByTicker) return homeByTicker;
  const best = new Map<string, Home>();
  // Companies an industry or policy maps in the chain itself (not only as a lender or enabler beside it).
  const direct = new Set<string>();
  const ordered = [...SECTOR_KEYS].sort((a, b) => homePenalty(PRODUCTS[a]) - homePenalty(PRODUCTS[b]));
  for (const slug of ordered) {
    const sector = PRODUCTS[slug];
    for (const z of sector.zones)
      for (const link of z.suppliers) {
        const key = companyLinkKey(link);
        const sup = sector.suppliers[key];
        const t = sup?.f?.ticker;
        if (!sup?.listed || !t) continue;
        const weight = linkWeight(link) - homePenalty(sector);
        const prev = best.get(t);
        const live = !sector.muted && sector.category !== "index";
        if (live && !isSideLink(link)) direct.add(t);
        // Ordered live sectors first, so by the index's turn `direct` is complete.
        const overSide = sector.category === "index" && !sector.muted && !!prev && prev.weight > -homePenalty(sector) && !direct.has(t);
        if (!prev || weight > prev.weight || overSide) best.set(t, { slug, key, weight: overSide ? Infinity : weight });
      }
  }
  for (const slug of ordered)
    for (const [key, sup] of Object.entries(PRODUCTS[slug].suppliers)) {
      const t = sup.f?.ticker;
      if (sup.listed && t && !best.has(t)) best.set(t, { slug, key, weight: -Infinity });
    }
  return (homeByTicker = best);
}

/** The sector (slug) and supplier key that describe a listed company everywhere it is shown once. */
export function primaryLink(ticker: string): { slug: string; key: string } | null {
  const h = homes().get(ticker);
  return h ? { slug: h.slug, key: h.key } : null;
}

/** The sector or policy slug a listed company is shown under when it is shown once. */
export function primarySector(ticker: string): string | null {
  return homes().get(ticker)?.slug ?? null;
}

// Listed ticker -> its home supplier record (plain data). Used wherever a company is shown outside
// the 3D explorer (watchlist, stock pop-up) and as the allowlist for the live stock API routes,
// which proxy third-party sites and so must only serve tickers we cover.
export function findSupplierByTicker(ticker: string): SectorSupplier | null {
  assertFiguresLoaded();
  const h = homes().get(ticker);
  return h ? PRODUCTS[h.slug].suppliers[h.key] : null;
}

// The one record of a listed company's figures (the company table in the database, loaded by
// src/lib/financials/load.ts): every sector, policy and IPO peer table reads a company from here,
// so the same ticker shows the same numbers everywhere.
export function companyFinancials(ticker: string): SupplierFinancials | null {
  return getFinancials(ticker);
}

export function listCompanyFinancials(): SupplierFinancials[] {
  return listFinancials();
}
