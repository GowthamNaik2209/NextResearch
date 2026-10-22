// Company-level view of the authored sector content: one entry per listed ticker, with every
// sector/zone it appears in. Backs the public /company/[slug] pages (one indexable page per
// listed company - the "who supplies X" / "X supply chain" search surface) and the sitemap.
import {
  companyLinkExposure,
  companyLinkKey,
  linkWeight,
  listSectors,
  primaryLink,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  type ExposureStrength,
  type ExposureType,
  type SectorSupplier,
  type SectorWithSlug,
} from "./index";
import { slugify } from "@/lib/slugify";

export type CompanyAppearance = {
  sectorSlug: string;
  sectorName: string;
  zoneId: string;
  zoneLabel: string;
  companyKey: string;
  role: string;
  exposure?: string;
  // How central this layer is to the company (linkWeight in ./index).
  weight: number;
  supplier: SectorSupplier; // this sector's record (role, strengths, risks)
  peers: { name: string; slug: string | null }[];
};

export type CompanyPage = {
  slug: string;
  ticker: string;
  name: string;
  supplier: SectorSupplier;
  appearances: CompanyAppearance[];
};

let cache: Map<string, CompanyPage> | null = null;

export function companySlug(ticker: string): string {
  return slugify(ticker);
}

function build(): Map<string, CompanyPage> {
  const byTicker = new Map<string, CompanyPage>();
  const sectors = listSectors().filter((s) => !s.muted);
  for (const s of sectors) {
    for (const z of s.zones) {
      for (const link of z.suppliers) {
        const key = companyLinkKey(link);
        const sup = s.suppliers[key];
        const ticker = sup?.f?.ticker;
        if (!sup || !sup.listed || !ticker) continue;
        let page = byTicker.get(ticker);
        if (!page) {
          page = { slug: companySlug(ticker), ticker, name: sup.name, supplier: sup, appearances: [] };
          byTicker.set(ticker, page);
        }
        if (page.appearances.some((a) => a.sectorSlug === s.slug && a.zoneId === z.id)) continue;
        const { exposureType } = companyLinkExposure(link);
        const weight = linkWeight(link);
        const peers = z.suppliers
          .map((l) => s.suppliers[companyLinkKey(l)])
          .filter((p): p is SectorSupplier => !!p && p.name !== sup.name)
          .map((p) => ({ name: p.name, slug: p.listed && p.f?.ticker ? companySlug(p.f.ticker) : null }));
        page.appearances.push({
          sectorSlug: s.slug,
          sectorName: s.name,
          zoneId: z.id,
          zoneLabel: z.label,
          companyKey: key,
          role: sup.role,
          exposure: exposureType ? EXPOSURE_TYPE_LABEL[exposureType] : undefined,
          weight,
          peers,
          supplier: sup,
        });
      }
    }
  }
  const bySlug = new Map<string, CompanyPage>();
  for (const p of byTicker.values()) {
    // Describe the company by its strongest link, not whichever sector was authored first.
    p.supplier = primaryAppearance(p).supplier;
    bySlug.set(p.slug, p);
  }
  return bySlug;
}

// The appearance that best describes the company: its home record (primaryLink in ./index, shared
// with the stock pop-up and the landing screens), else its strongest link (first one on ties).
export function primaryAppearance(p: CompanyPage): CompanyAppearance {
  const home = primaryLink(p.ticker);
  const pool =
    p.appearances.filter((a) => a.sectorSlug === home?.slug && a.companyKey === home.key).concat(
      p.appearances.filter((a) => a.sectorSlug === home?.slug),
    );
  return (pool.length ? pool : p.appearances).reduce((best, a) => (a.weight > best.weight ? a : best));
}

export function listCompanyPages(): CompanyPage[] {
  if (!cache) cache = build();
  return [...cache.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCompanyPage(slug: string): CompanyPage | null {
  if (!cache) cache = build();
  return cache.get(slug) ?? null;
}

// ---- One card per company on a sector page ----

export type SectorCompanyZone = {
  zoneId: string;
  zoneLabel: string;
  zoneColor: string;
  companyKey: string;
  exposureType?: ExposureType;
  exposureStrength?: ExposureStrength;
};

export type SectorCompany = {
  key: string; // first supplier key: used for deep links that need just one
  ticker: string;
  supplier: SectorSupplier;
  roles: string[];
  zones: SectorCompanyZone[];
};

// A sector can list one company under two supplier keys for two roles (aerospace has HAL as the
// prime and as the MRO shop; energy has BHEL for thermal and for hydro). Pages and counts group
// them by ticker so the company shows once, with every role and layer it plays in that sector.
export function sectorCompanies(sector: SectorWithSlug): SectorCompany[] {
  const byTicker = new Map<string, SectorCompany>();
  for (const [key, sup] of Object.entries(sector.suppliers)) {
    const ticker = tickerForSupplier(sup);
    const g = byTicker.get(ticker);
    if (g) {
      if (!g.roles.includes(sup.role)) g.roles.push(sup.role);
    } else byTicker.set(ticker, { key, ticker, supplier: sup, roles: [sup.role], zones: [] });
  }
  for (const z of sector.zones)
    for (const link of z.suppliers) {
      const key = companyLinkKey(link);
      const sup = sector.suppliers[key];
      if (!sup) continue;
      const g = byTicker.get(tickerForSupplier(sup))!;
      if (g.zones.some((x) => x.zoneId === z.id)) continue;
      g.zones.push({ zoneId: z.id, zoneLabel: z.label, zoneColor: z.color, companyKey: key, ...companyLinkExposure(link) });
    }
  return [...byTicker.values()];
}

export function sectorCompanyCounts(sector: SectorWithSlug) {
  const cs = sectorCompanies(sector);
  return { companies: cs.length, listed: cs.filter((c) => c.supplier.listed).length };
}
