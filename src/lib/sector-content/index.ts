// Typed façade over products.ts (see that file's header for why the underlying
// data is loosely typed authored 3D content rather than application data).
import { PRODUCTS as PRODUCTS_RAW } from "./products";
import { financialsVersion, getFinancials, listFinancials } from "@/lib/financials/store";
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
  // A view about one layer (e.g. "Cooling Yard", "Underground") also peels the model to it.
  layer?: number;
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
  // Index into the sector's `layerNames` of the layer that visibly shows this system
  // (e.g. ev4w's e-axle sits in "Powertrain"). Picking the zone peels the model to it.
  layer?: number;
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

// A company's figures from the company table in the database (src/lib/financials/: load.ts reads
// them, store.ts fills every supplier's `f` in place). They are also the fallback behind the live
// Screener.in / Yahoo data in the stock pop-up (see components/stock/merge.ts).
export type SupplierFinancials = {
  ticker: string;
  rev?: (number | null)[]; // 5 fiscal years FY22..FY26, Rs Cr
  np?: (number | null)[]; // net profit, same years
  mcap?: string | null; // "Rs 1,74,575 Cr"
  price?: string | null; // "Rs 166"
  note?: string | null;
  cagr?: (number | null)[] | null; // stock price CAGR [1y, 3y, 5y], %
  range?: (number | null)[] | null; // 52-week [low, high]
  tl?: [number | null, string] | null; // Trendlyne [id, slug]
  kpi?: (number | null)[] | null; // [pe, bookValue, divYield, roce, roe, faceValue]
  asOf?: string; // date of the price/valuation figures, e.g. "16 Oct 2026" (the latest refresh)
  // Latest-year profit/revenue dominated by a one-off (e.g. SPARC's FY26 priority-review
  // voucher sale): kept out of the landing page's rule-based idea screens.
  screenOut?: boolean;
};

export type SectorSupplier = {
  name: string;
  listed: boolean;
  role: string;
  notes?: string[];
  f?: SupplierFinancials;
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
  // The zone the overview's domain card opens. Defaults to the domain's first zone in array
  // order, but that order also sets the explorer's callout rails, so it isn't always the best entry.
  leadZoneId?: string;
};

export type SectorDef = {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  // "sector" (default, omitted on all pre-existing entries) groups by industry
  // value chain; "policy" groups by a single government/regulatory move and the
  // stocks it benefits (e.g. ALMM -> domestic solar module manufacturing) - same
  // underlying zones/suppliers/3D-explorer shape, just a different entry point
  // and filtered into its own tab on the landing page.
  category?: "sector" | "policy";
  // True hides this sector's landing-page card behind the same muted,
  // non-clickable "Coming soon" treatment as a _comingSoon placeholder, while
  // keeping its real zones/suppliers/3D build intact and still reachable by
  // direct URL — for a sector that's functional but not polished enough to
  // put in front of users yet.
  muted?: boolean;
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
  // Short points (a line each), shown as bullets on the sector page and the landing thesis.
  whyNow?: string[];
  thesisSummary?: string[];
  featuredSignals?: string[];
  dataStatus?: DataStatus;
  // The zone whose suppliers are this sector's end manufacturers/integrators
  // (who assembles the finished product — e.g. ev4w's "oem" zone is Mahindra/
  // Tata Motors, railways' "rolling_stock" is Titagarh/BEML) as opposed to the
  // component/sub-assembly suppliers feeding into it. Surfaced as its own
  // section on the sector overview page rather than left buried one click
  // inside the 3D explorer like every other zone.
  integratorZoneId?: string;
  // Overrides for the overview's integrator section when "assemble the finished product" does not fit
  // the sector (e.g. power generation, where the end players are plant operators).
  integratorHeading?: string;
  integratorBlurb?: string;
  // Phone/tablet overview framing: tilt, turn (up to 30 degrees) and re-centre a flat campus so it
  // fills the portrait stage (engine.ts portraitFit). Opt-in, so sectors whose phone views were
  // already approved keep them.
  portraitFit?: boolean;
};

type ComingSoonSector = { icon: string; name: string; tagline: string; category?: "sector" | "policy" };

// products.ts is untyped authored content (see its header) — PRODUCTS itself is
// inferred as `{}`, so cast the whole registry once here rather than per call site.
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

// A sector plus the registry key it is addressed by in URLs.
export type SectorWithSlug = SectorDef & { slug: string };

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

// The real (or synthetic UNLISTED_*) ticker for a supplier entry — must match
// prisma/seed.ts's logic exactly since that's how DB rows get keyed.
export function tickerForSupplier(sup: SectorSupplier): string {
  return sup.f?.ticker ?? syntheticTicker(sup.name);
}

// Listed ticker -> supplier record (plain data), first sector that has it. Used wherever a
// company is shown outside the 3D explorer (watchlist) and as the allowlist for the live
// stock API routes, which proxy third-party sites and so must only serve tickers we cover.
// A company in several sectors (L&T: naval, aerospace, real estate…) has one supplier record per
// sector, each with that sector's role/strengths/risks. Pick the record from its strongest link
// (high > medium > low; side links like lenders rank lower), so the stock pop-up and the
// company page describe it the same way. Same weighting as companies.ts primaryAppearance().
export function linkWeight(link: SectorCompanyLink): number {
  const { exposureType, exposureStrength } = companyLinkExposure(link);
  return (
    (exposureStrength ? { high: 3, medium: 2, low: 1 }[exposureStrength] : 3) -
    (exposureType === "enabler" || exposureType === "indirect_supplier" ? 0.5 : 0)
  );
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

/** "Rs 1,12,682 Cr" -> 112682. */
export function parseCrore(s: string | null | undefined): number | null {
  const n = s ? parseFloat(s.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
}

let supplierByTicker: Map<string, SectorSupplier> | null = null;
export function findSupplierByTicker(ticker: string): SectorSupplier | null {
  assertFiguresLoaded();
  if (!supplierByTicker) {
    const best = new Map<string, { sup: SectorSupplier; w: number }>();
    for (const slug of SECTOR_KEYS) {
      const sector = PRODUCTS[slug];
      for (const z of sector.zones) {
        for (const link of z.suppliers) {
          const sup = sector.suppliers[companyLinkKey(link)];
          const t = sup?.f?.ticker;
          if (!sup?.listed || !t) continue;
          const w = linkWeight(link);
          if (!best.has(t) || w > best.get(t)!.w) best.set(t, { sup, w });
        }
      }
      // Listed suppliers not linked from any zone still resolve (first one wins).
      for (const sup of Object.values(sector.suppliers)) {
        const t = sup.f?.ticker;
        if (sup.listed && t && !best.has(t)) best.set(t, { sup, w: -1 });
      }
    }
    supplierByTicker = new Map([...best].map(([t, b]) => [t, b.sup]));
  }
  return supplierByTicker.get(ticker) ?? null;
}
