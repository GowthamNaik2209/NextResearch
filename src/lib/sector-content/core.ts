// Types and pure helpers for the authored sector content. Content-free on purpose: client
// components (the explorer, the stock pop-up) import from here, so importing a label or a type
// never drags every sector's zones, suppliers and 3D models into their bundle. The registry
// lookups (getSector, listSectors, findSupplierByTicker...) live in ./index.ts, which re-exports
// all of this, so server code can keep importing "@/lib/sector-content".
import { syntheticTicker } from "@/lib/slugify";

export type SectorCategory = "sector" | "policy" | "index";

/** What a theme is called in running text: "industry", "policy" or "index". */
export const categoryWord = (c: SectorCategory | undefined) => (c === "policy" ? "policy" : c === "index" ? "index" : "industry");

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
// narrative, or a company's exposure classification). It covers the authored text only:
// company figures carry their own source and snapshot date (SupplierFinancials.asOf).
// Every field using this must render visibly ("Demo data", "Unverified", etc.)
// wherever it's shown — never silently.
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
  mcap?: string | null; // "Rs 1,74,575 Cr" (the table's own label; shown as ₹ by the UI)
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
  // and filtered into its own tab on the landing page. "index" is a market index (the Nifty 50):
  // its stocks grouped by the index provider's own industries, shown as a heatmap instead of a 3D
  // model (see `stage`), listed first under All and never a company's home while it has another.
  category?: SectorCategory;
  // "heatmap": the explorer's stage is a stock heatmap (HeatmapStage) instead of the three.js model;
  // layers and camera views are not shown and `build` is never called.
  stage?: "model" | "heatmap";
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
  // Retired supplier keys -> the key that replaced them, kept when a company's duplicate records in
  // one sector were merged into one, so old ?company=<key> deep links still open the company
  // (resolveSupplierKey). validate:content checks every target exists and no alias is a live key.
  keyAliases?: Record<string, string>;
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
  // fills the portrait stage (engine.ts portraitFit). On by default (QA: the authored low, wide
  // shots left the model a thin band across the middle third of a phone); `false` opts a sector out.
  portraitFit?: boolean;
};

export type ComingSoonSector = { icon: string; name: string; tagline: string; category?: SectorCategory };

// A sector plus the registry key it is addressed by in URLs.
export type SectorWithSlug = SectorDef & { slug: string };

/** A supplier key from a URL as the sector knows it today (following keyAliases), or null if unknown. */
export function resolveSupplierKey(sector: Pick<SectorDef, "suppliers" | "keyAliases">, key: string | null | undefined): string | null {
  if (!key) return null;
  if (Object.hasOwn(sector.suppliers, key)) return key;
  const to = sector.keyAliases && Object.hasOwn(sector.keyAliases, key) ? sector.keyAliases[key] : undefined;
  return to && Object.hasOwn(sector.suppliers, to) ? to : null;
}

// The real (or synthetic UNLISTED_*) ticker for a supplier entry — must match
// prisma/seed.ts's logic exactly since that's how DB rows get keyed.
export function tickerForSupplier(sup: SectorSupplier): string {
  return sup.f?.ticker ?? syntheticTicker(sup.name);
}

// ---- A company's home: the one sector and record that describe it ----
// A company in several sectors (L&T: naval, aerospace, real estate…) has one supplier record per
// sector, each with that sector's role/strengths/risks. Every surface that shows the company once
// (stock pop-up, company page, landing ideas, basket stocks) must pick the same one, so they all
// read the weights below and primarySector() (./index.ts).

const STRENGTH_POINTS: Record<ExposureStrength, number> = { high: 3, medium: 2, low: 1 };

/** A link's exposure strength. A link without one counts as high: the company was placed in that layer as one of its suppliers. */
export function linkStrength(link: SectorCompanyLink): ExposureStrength {
  return companyLinkExposure(link).exposureStrength ?? "high";
}

/** Lenders, software and other enablers sit beside the chain rather than in it. */
export function isSideLink(link: SectorCompanyLink): boolean {
  const { exposureType } = companyLinkExposure(link);
  return exposureType === "enabler" || exposureType === "indirect_supplier";
}

/** Points for a strength (high 3, medium 2, low 1; none counts as high, as in linkStrength). */
export function strengthPoints(strength: ExposureStrength | undefined): number {
  return STRENGTH_POINTS[strength ?? "high"];
}

/** How central one link is to the company: high > medium > low, and a side link ranks half a step below a direct one. */
export function linkWeight(link: SectorCompanyLink): number {
  return STRENGTH_POINTS[linkStrength(link)] - (isSideLink(link) ? 0.5 : 0);
}

/** A crore figure as a number: "Rs 1,12,682 Cr" or "₹8,420 Cr" -> the number; "₹1.75L Cr" / "Rs 1.75 lakh crore" -> 175000. */
export function parseCrore(s: string | null | undefined): number | null {
  const n = s ? parseFloat(s.replace(/[^\d.]/g, "")) : NaN;
  if (!Number.isFinite(n)) return null;
  return /\d\s?(L|lakh)\b/i.test(s!) ? n * 100_000 : n;
}
