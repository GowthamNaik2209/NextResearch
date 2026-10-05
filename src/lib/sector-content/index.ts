// Typed façade over products.ts (see that file's header for why the underlying
// data is loosely typed authored 3D content rather than application data).
import { PRODUCTS as PRODUCTS_RAW } from "./products";
import { syntheticTicker } from "@/lib/slugify";

export type SectorView = {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
  // Guided-tour voiceover line for this camera position (spoken via the Web
  // Speech API, shown as a caption when narration is muted). Optional — a view
  // without one falls back to a generic "Now viewing <label>" line at the call
  // site (SectorExplorer.tsx), so sectors that haven't been scripted yet still
  // get a working (if plainer) tour.
  narration?: string;
};

// Provenance of a piece of *static* authored content (industry/domain/component
// narrative, or a company's exposure classification) — the content-layer sibling
// of the `DataStatus` enum on the DB-backed `Company` model (prisma/schema.prisma),
// which covers financial/KPI figures instead. Every field using this must render
// visibly ("Demo data", "Unverified", etc.) wherever it's shown — never silently.
export type DataStatus = "demo" | "user_generated" | "unverified" | "verified" | "source_required";

// How a company relates to a specific component/layer — one company can have a
// different exposure in different zones (e.g. a conglomerate's DC arm vs. its
// unrelated core business), so this lives on the zone->company link, not on the
// company record itself.
export type ExposureType =
  | "direct_supplier"
  | "indirect_supplier"
  | "operator"
  | "owner"
  | "enabler"
  | "emerging_entrant"
  | "potential_substitute"
  | "at_risk_participant";

export type ExposureStrength = "high" | "medium" | "low";

export const EXPOSURE_TYPE_LABEL: Record<ExposureType, string> = {
  direct_supplier: "Direct supplier",
  indirect_supplier: "Indirect supplier",
  operator: "Operator",
  owner: "Owner",
  enabler: "Enabler",
  emerging_entrant: "Emerging entrant",
  potential_substitute: "Potential substitute",
  at_risk_participant: "At-risk participant",
};

export const EXPOSURE_STRENGTH_LABEL: Record<ExposureStrength, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// A zone's `suppliers` entry: either a bare key (legacy shape, still used by the
// 6 sectors not yet upgraded past the original artifact's data) or a key with its
// exposure classification attached (used by `datacenter`, the first sector carrying
// the richer model). Both shapes coexist deliberately — see companyLinkKey() below
// — rather than mass-converting every sector's zones for a vertical slice that only
// needs one of them done properly right now.
export type SectorCompanyLink = string | { key: string; exposureType?: ExposureType; exposureStrength?: ExposureStrength };

export function companyLinkKey(link: SectorCompanyLink): string {
  return typeof link === "string" ? link : link.key;
}

export function companyLinkExposure(
  link: SectorCompanyLink
): { exposureType?: ExposureType; exposureStrength?: ExposureStrength } {
  return typeof link === "string" ? {} : { exposureType: link.exposureType, exposureStrength: link.exposureStrength };
}

export type SectorZone = {
  id: string;
  color: string;
  label: string;
  pos: [number, number, number];
  side: "left" | "right" | "top" | "bottom";
  desc: string;
  suppliers: SectorCompanyLink[];
  deepDive?: boolean;
  // --- richer "Component" fields (optional: populated for `datacenter` so far,
  // left unset for sectors still on the original artifact's flat shape) ---
  domainId?: string;
  roleInSystem?: string;
  whyItMatters?: string;
  valuePoolDescription?: string;
  bottlenecks?: string[];
  keyDrivers?: string[];
  keyRisks?: string[];
  investorMetrics?: string[];
  relatedComponents?: string[];
  displayOrder?: number;
  dataStatus?: DataStatus;
};

export type SectorSupplier = {
  name: string;
  listed: boolean;
  role: string;
  notes?: string[];
  f?: { ticker: string } & Record<string, unknown>;
  strengths?: string[];
  risks?: string[];
  sourceDate?: string;
  dataStatus?: DataStatus;
};

// Groups related zones under a named theme (e.g. "Site & Power") for the industry
// overview / "select a major domain, then a component" navigation step. Optional
// at the sector level — a sector with no `domains` just shows its zones flat, as
// every sector did before this field existed.
export type SectorDomain = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
  relatedDomains?: string[];
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
  // --- richer "Industry" fields (optional; see SectorZone's comment above) ---
  domains?: SectorDomain[];
  whyNow?: string;
  thesisSummary?: string;
  featuredSignals?: string[];
  dataStatus?: DataStatus;
  // The zone whose suppliers are this sector's end manufacturers/integrators
  // (who assembles the finished product — e.g. ev4w's "oem" zone is Mahindra/
  // Tata Motors, railways' "rolling_stock" is Titagarh/BEML) as opposed to the
  // component/sub-assembly suppliers feeding into it. Surfaced as its own
  // section on the sector overview page rather than left buried one click
  // inside the 3D explorer like every other zone.
  integratorZoneId?: string;
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
