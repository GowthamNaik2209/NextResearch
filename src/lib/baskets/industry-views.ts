// What an industry page's full-screen views (Stock heatmap, Industry pools) show, built on the
// server so the page and the /api/industry/[slug] route (the in-view industry picker) agree. Needs
// ensureFinancials() first, like every figure read. Client code gets these as JSON, never this module.
import { getSector, listSectors } from "@/lib/sector-content";
import { memoByFinancials } from "@/lib/financials/store";
import type { HeatStock, IndustryViewData, IndustryViewOption } from "@/components/charts/IndustryHeatmap";
import { getIndustryBasket } from "./industry";
import { industryPools } from "./pools-data";

/** The heatmap's stocks: the industry basket's, in the map's layer order, biggest first in each. A
 * heatmap sector (the Nifty 50) and a muted one have none: the Nifty's heatmap is its explorer. */
export function heatStocksFor(slug: string): HeatStock[] {
  const sector = getSector(slug);
  if (!sector || sector.muted || sector.stage === "heatmap") return [];
  const zoneOrder = new Map(sector.zones.map((z, i) => [z.label, i]));
  return (getIndustryBasket(slug)?.stocks ?? [])
    .map((s) => ({ ticker: s.ticker, name: s.name, layer: s.layer, mcapCr: s.mcapCr }))
    .sort((a, b) => (zoneOrder.get(a.layer) ?? 99) - (zoneOrder.get(b.layer) ?? 99) || (b.mcapCr ?? -1) - (a.mcapCr ?? -1));
}

export function industryViewData(slug: string): IndustryViewData | null {
  const sector = getSector(slug);
  if (!sector) return null;
  return {
    slug,
    name: sector.name,
    stocks: heatStocksFor(slug),
    pools: industryPools(slug),
    basketHref: sector.muted ? null : `/baskets/industry/${slug}`,
  };
}

const GROUP_ORDER: IndustryViewOption["group"][] = ["industry", "policy", "index"];

/** The picker's list: every live industry and policy, with which of the two views it has. */
export const industryViewOptions = memoByFinancials((): IndustryViewOption[] =>
  listSectors()
    .filter((s) => !s.muted)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      group: s.category === "policy" ? ("policy" as const) : s.category === "index" ? ("index" as const) : ("industry" as const),
      heat: heatStocksFor(s.slug).length > 0,
      pools: industryPools(s.slug) != null,
    }))
    .filter((o) => o.heat || o.pools)
    // Industries, policies, then the index, each A to Z (as the 3D map switcher lists them).
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name)),
);
