// Company-level view of the authored sector content: one entry per listed ticker, with every
// sector/zone it appears in. Backs the public /company/[slug] pages (one indexable page per
// listed company - the "who supplies X" / "X supply chain" search surface) and the sitemap.
import { companyLinkExposure, companyLinkKey, listSectors, EXPOSURE_TYPE_LABEL, type SectorSupplier } from "./index";
import { slugify } from "@/lib/slugify";

export type CompanyAppearance = {
  sectorSlug: string;
  sectorName: string;
  zoneId: string;
  zoneLabel: string;
  companyKey: string;
  role: string;
  exposure?: string;
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
          peers,
        });
      }
    }
  }
  const bySlug = new Map<string, CompanyPage>();
  for (const p of byTicker.values()) bySlug.set(p.slug, p);
  return bySlug;
}

export function listCompanyPages(): CompanyPage[] {
  if (!cache) cache = build();
  return [...cache.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCompanyPage(slug: string): CompanyPage | null {
  if (!cache) cache = build();
  return cache.get(slug) ?? null;
}
