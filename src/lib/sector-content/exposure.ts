// Cross-sector footprint: the same listed company often sits in several supply
// chains (Bharat Forge in EV, rail, naval and aerospace). Each sector's content
// lists it separately, so this joins them by ticker. Pure derivation from the
// authored content - no DB, no network - and muted sectors are left out, as
// everywhere else on the site.
import {
  companyLinkExposure,
  companyLinkKey,
  listSectors,
  strengthPoints,
  tickerForSupplier,
  type ExposureStrength,
  type ExposureType,
} from "./index";

export type FootprintZone = {
  id: string;
  label: string;
  exposureType?: ExposureType;
  exposureStrength?: ExposureStrength;
};

export type FootprintSector = {
  sectorSlug: string;
  sectorName: string;
  zones: FootprintZone[];
  /** Deep link to the company in this sector's 3D explorer. */
  href: string;
};

export type CompanyFootprint = {
  ticker: string;
  name: string;
  sectors: FootprintSector[];
};

let cache: Map<string, CompanyFootprint> | null = null;

function build(): Map<string, CompanyFootprint> {
  const out = new Map<string, CompanyFootprint>();
  for (const s of listSectors().filter((x) => !x.muted)) {
    const perCompany = new Map<string, { name: string; ticker: string; zones: FootprintZone[]; firstKey: string }>();
    for (const z of s.zones) {
      for (const link of z.suppliers) {
        const key = companyLinkKey(link);
        const sup = s.suppliers[key];
        if (!sup || !sup.listed) continue;
        const ticker = tickerForSupplier(sup);
        const entry = perCompany.get(ticker) ?? { name: sup.name, ticker, zones: [], firstKey: key };
        entry.zones.push({ id: z.id, label: z.label, ...companyLinkExposure(link) });
        perCompany.set(ticker, entry);
      }
    }
    for (const [ticker, e] of perCompany) {
      const first = e.zones[0];
      const fp = out.get(ticker) ?? { ticker, name: e.name, sectors: [] };
      fp.sectors.push({
        sectorSlug: s.slug,
        sectorName: s.name,
        zones: e.zones,
        href: `/sector/${s.slug}/explore?zone=${encodeURIComponent(first.id)}&company=${encodeURIComponent(e.firstKey)}`,
      });
      out.set(ticker, fp);
    }
  }
  return out;
}

export function getCompanyFootprint(ticker: string): CompanyFootprint | null {
  cache ??= build();
  return cache.get(ticker) ?? null;
}

/** How concentrated this company's exposure is: total strength points across every layer it sits in. */
export function footprintScore(fp: CompanyFootprint): number {
  let n = 0;
  for (const s of fp.sectors) for (const z of s.zones) n += strengthPoints(z.exposureStrength);
  return n;
}

/** Companies present in 2+ sectors, widest footprint first. */
export function listConnectedCompanies(): CompanyFootprint[] {
  cache ??= build();
  return [...cache.values()]
    .filter((c) => c.sectors.length > 1)
    .sort(
      (a, b) =>
        b.sectors.length - a.sectors.length ||
        footprintScore(b) - footprintScore(a) ||
        a.name.localeCompare(b.name)
    );
}
