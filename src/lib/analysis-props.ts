// What the Analysis block (ReadingList) needs, built on the server. The Analysis page (/docs) and
// the landing page's #themes section both render the block, so both take their data from here.
//
// Only card-sized objects go into the page: a full research deck is ~35 KB and the 15 of them,
// plus the IPO decks and every industry basket's stock list, made the landing page ~1 MB of
// props. The decks load when opened (/docs/deck/<slug>, /ipos/deck/<slug>) and the chart picker's
// stock lists when a card's Charts button is first pressed (/docs/baskets). A deep link (?report=,
// ?ipo=, ?view=charts) gets its one deck or the stock lists in the page, so it opens without a round trip.
import { listIndustryBaskets } from "@/lib/baskets/industry";
import { listSectors, companyLinkKey, companyLinkExposure, isSideLink, linkStrength, type SectorCompanyLink } from "@/lib/sector-content";
import { buildSectorCards } from "@/lib/sector-content/stats";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { listIpoDecks, type IpoDeck } from "@/lib/ipo-content";
import { memoByFinancials } from "@/lib/financials/store";
import type { ChartPickerIndustry } from "@/components/stock/StockChartPopup";

// The builders used here (buildDeck, listIpoDecks, buildSectorCards, ...) memoise themselves per
// installed company table, and listIpoDecks rolls each IPO's status forward to today.

/** One IPO deck, status as of today. */
export const getIpoDeck = (slug: string): IpoDeck | null => listIpoDecks().find((d) => d.slug === slug) ?? null;

// ---- Card-sized props ----

/** What a Reports card shows; the deck itself loads when the card is opened. */
export type DeckCard = Pick<Deck, "slug" | "name" | "icon" | "category"> & {
  report: Pick<Deck["report"], "title" | "subtitle" | "asOf" | "stance" | "keyStats">;
  beneficiaries: number;
};

/** What an IPO card shows; the deck itself loads when the card is opened. */
export type IpoCard = Pick<IpoDeck, "slug" | "name" | "icon" | "sectorLabel" | "tagline" | "status"> & {
  issue: Pick<IpoDeck["issue"], "totalCr" | "freshCr" | "ofsCr" | "valuationCr">;
};

const deckCards = memoByFinancials((): DeckCard[] =>
  listSectors()
    .filter((s) => !s.muted)
    .map((s) => buildDeck(s.slug))
    .filter((d): d is Deck => d !== null)
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      icon: d.icon,
      category: d.category,
      report: { title: d.report.title, subtitle: d.report.subtitle, asOf: d.report.asOf, stance: d.report.stance, keyStats: d.report.keyStats.slice(0, 2) },
      beneficiaries: d.companies.length,
    }))
);

export function ipoCards(): IpoCard[] {
  return listIpoDecks().map(({ slug, name, icon, sectorLabel, tagline, status, issue }) => ({
    slug,
    name,
    icon,
    sectorLabel,
    tagline,
    status,
    issue: { totalCr: issue.totalCr, freshCr: issue.freshCr, ofsCr: issue.ofsCr, valuationCr: issue.valuationCr },
  }));
}

type Sector = ReturnType<typeof listSectors>[number];
const DIRECT_TYPES = new Set(["owner", "operator", "direct_supplier", undefined]);

/**
 * The stock the chart picker opens a policy on: the biggest listed company in its integrator
 * layer (the end makers / owners) at high or medium strength, else the biggest there at all, else
 * the biggest direct, high-exposure company anywhere in it. Independent of the order of the
 * layers (which follows the 3D map), so a peripheral name (Hyundai for the battery PLI) never leads.
 */
function leadTicker(s: Sector, mcap: Map<string, number>): string | undefined {
  const links = (pred: (zoneId: string, link: SectorCompanyLink) => boolean) =>
    s.zones.flatMap((z) => z.suppliers.filter((l) => pred(z.id, l)).map((l) => s.suppliers[companyLinkKey(l)]?.f?.ticker)).filter((t): t is string => !!t && mcap.has(t));
  const biggest = (ts: string[]) => [...ts].sort((a, b) => mcap.get(b)! - mcap.get(a)!)[0];
  const inLead = (z: string) => z === s.integratorZoneId;
  return (
    biggest(links((z, l) => inLead(z) && linkStrength(l) !== "low" && !isSideLink(l))) ??
    biggest(links((z) => inLead(z))) ??
    biggest(links((_, l) => linkStrength(l) === "high" && DIRECT_TYPES.has(companyLinkExposure(l).exposureType)))
  );
}

const chartIndustries = memoByFinancials((): ChartPickerIndustry[] => {
  const sectors = new Map(listSectors().map((s) => [s.slug, s]));
  return listIndustryBaskets().map(({ slug, name, category, stocks }) => {
    const sector = sectors.get(slug);
    // Layers in the industry's own order (its map's systems), keeping only those with a listed stock.
    const used = new Set(stocks.map((s) => s.layer));
    const layers = [...new Set([...(sector?.zones.map((z) => z.label) ?? []), ...used])].filter((l) => used.has(l));
    // Policies only: an industry's biggest core company already leads (Apollo, Power Grid); a policy's
    // "core" pick was whichever big name happens to call it home (Hyundai for the battery PLI).
    const lead = sector && category === "policy" ? leadTicker(sector, new Map(stocks.map((s) => [s.ticker, s.mcapCr ?? -1]))) : undefined;
    return {
      slug,
      name,
      category,
      layers,
      ...(lead ? { lead } : {}),
      stocks: stocks.map(({ ticker, name, layer, industries }) => ({ ticker, name, layer, core: industries[0]?.slug === slug })),
    };
  });
});
/** Every industry's layers and listed stocks for the chart pop-up (served by /docs/baskets when not in the page). */
export const analysisChartIndustries = chartIndustries;

/**
 * The Analysis block's props. `report`/`ipo`/`view` are the page's search params: the deck a
 * deep link opens, or the chart pop-up's stock lists, come with the page; everything else on demand.
 */
export function analysisProps({ report, ipo, view }: { report?: string; ipo?: string; view?: string } = {}) {
  const decks = deckCards();
  return {
    decks,
    initialDeck: report && decks.some((d) => d.slug === report) ? (buildDeck(report) ?? undefined) : undefined,
    ipos: ipoCards(),
    initialIpoDeck: ipo ? (getIpoDeck(ipo) ?? undefined) : undefined,
    sectorCards: buildSectorCards(),
    chartIndustries: view === "charts" ? chartIndustries() : undefined,
  };
}

/** The view the block opens on, from `?view=`: Deep dive unless Reports is asked for. (`?view=charts`,
 * the old Charts view, now opens the chart pop-up over the Deep dive.) */
export const analysisView = (view?: string) => (view === "reports" ? "reports" : "deep");
