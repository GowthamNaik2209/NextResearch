// Typed façade over products.ts (see that file's header for why the underlying
// data is loosely typed authored 3D content rather than application data).
import { PRODUCTS as PRODUCTS_RAW } from "./products";
import { syntheticTicker } from "@/lib/slugify";

export type SectorView = {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
};

export type SectorZone = {
  id: string;
  color: string;
  label: string;
  pos: [number, number, number];
  side: "left" | "right" | "top" | "bottom";
  desc: string;
  suppliers: string[];
  deepDive?: boolean;
};

export type SectorSupplier = {
  name: string;
  listed: boolean;
  role: string;
  notes?: string[];
  f?: { ticker: string } & Record<string, unknown>;
};

export type SectorDef = {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  headerTitle: string;
  headerSub: string;
  layerNames: string[];
  shellMaxOpacity: number;
  exoBaseOpacity: number;
  defaultView: string;
  views: SectorView[];
  zones: SectorZone[];
  suppliers: Record<string, SectorSupplier>;
  // three.js geometry builder — only ever called client-side by SectorExplorer.
  build: (ctx: { THREE: unknown; layerGroups: unknown[]; staticGroup: unknown }) => unknown;
};

type ComingSoonSector = { icon: string; name: string; tagline: string };

// products.ts is untyped authored content (see its header) — PRODUCTS itself is
// inferred as `{}`, so cast the whole registry once here rather than per call site.
const PRODUCTS = PRODUCTS_RAW as unknown as Record<string, SectorDef> & {
  _comingSoon: ComingSoonSector[];
};

const SECTOR_KEYS = Object.keys(PRODUCTS).filter((k) => k !== "_comingSoon");

export function listSectorSlugs(): string[] {
  return [...SECTOR_KEYS];
}

export function listSectors(): (SectorDef & { slug: string })[] {
  return SECTOR_KEYS.map((slug) => ({ slug, ...PRODUCTS[slug] }));
}

export function getSector(slug: string): (SectorDef & { slug: string }) | null {
  const sector = PRODUCTS[slug];
  return sector ? { slug, ...sector } : null;
}

export function listComingSoonSectors(): ComingSoonSector[] {
  return PRODUCTS._comingSoon;
}

// The real (or synthetic UNLISTED_*) ticker for a supplier entry — must match
// prisma/seed.ts's logic exactly since that's how DB rows get keyed.
export function tickerForSupplier(sup: SectorSupplier): string {
  return sup.f?.ticker ?? syntheticTicker(sup.name);
}

// Every ticker referenced anywhere across all sectors — used to know which
// companies a zone's supplier chips need to fetch from the database.
export function listAllTickers(): string[] {
  const set = new Set<string>();
  for (const slug of SECTOR_KEYS) {
    const sector = PRODUCTS[slug];
    for (const sup of Object.values(sector.suppliers)) {
      set.add(tickerForSupplier(sup));
    }
  }
  return [...set];
}

// Ticker -> supplier key, scoped to one sector (zone.suppliers arrays store the
// sector-local key, e.g. "motherson"; this resolves it back to a DB ticker).
export function tickersForSector(slug: string): Record<string, string> {
  const sector = getSector(slug);
  if (!sector) return {};
  const map: Record<string, string> = {};
  for (const [key, sup] of Object.entries(sector.suppliers)) {
    map[key] = tickerForSupplier(sup);
  }
  return map;
}
