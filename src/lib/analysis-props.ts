// What the Analysis block (ReadingList) needs, built on the server. The Analysis page (/docs) and
// the landing page's #themes section both render the block, so both take their data from here.
//
// Only card-sized objects go into the page: a full research deck is ~35 KB and the 15 of them,
// plus the IPO decks and every industry basket's stock list, made the landing page ~1 MB of
// props. The decks load when opened (/docs/deck/<slug>, /ipos/deck/<slug>) and the baskets when
// the Charts view is picked (/docs/baskets). A deep link (?report=, ?ipo=, ?view=charts) gets
// its one deck or the baskets in the page, so it opens without a round trip.
import { listIndustryBaskets } from "@/lib/baskets/industry";
import { listComingSoonSectors, listSectors } from "@/lib/sector-content";
import { buildSectorCards } from "@/lib/sector-content/stats";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { BENCHMARKS, MARKET_BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIpoDecks, type IpoDeck } from "@/lib/ipo-content";
import { memoByFinancials } from "@/lib/financials/store";
import type { ChartsIndustry } from "@/components/baskets/IndustryChartsView";

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

const chartBaskets = memoByFinancials((): ChartsIndustry[] =>
  // Without each stock's projection: the Charts view doesn't show projections, so it needn't carry them.
  listIndustryBaskets().map(({ slug, name, tagline, category, stocks, indices }) => ({ slug, name, tagline, category, stocks: stocks.map((s) => ({ ...s, proj: undefined })), indices }))
);
/** Every industry basket for the Charts view (served by /docs/baskets when not in the page). */
export const analysisBaskets = chartBaskets;

/**
 * The Analysis block's props. `report`/`ipo`/`view` are the page's search params: the deck a
 * deep link opens, or the Charts view's baskets, come with the page; everything else on demand.
 */
export function analysisProps({ report, ipo, view }: { report?: string; ipo?: string; view?: string } = {}) {
  const baskets = listIndustryBaskets();
  const decks = deckCards();
  return {
    decks,
    initialDeck: report && decks.some((d) => d.slug === report) ? (buildDeck(report) ?? undefined) : undefined,
    ipos: ipoCards(),
    initialIpoDeck: ipo ? (getIpoDeck(ipo) ?? undefined) : undefined,
    sectorCards: buildSectorCards(),
    comingSoon: listComingSoonSectors(),
    baskets: analysisView(view) === "charts" ? chartBaskets() : undefined,
    industries: baskets.map(({ slug, name, icon }) => ({ slug, name, icon })),
    market: MARKET_BENCHMARKS.map((id) => BENCHMARKS[id]),
  };
}

/** The view the block opens on, from `?view=`: Deep dive unless Reports or Charts is asked for. */
export const analysisView = (view?: string) => (view === "charts" ? "charts" : view === "reports" ? "reports" : "deep");
