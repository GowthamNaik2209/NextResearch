// What the Analysis block (ReadingList) needs, built on the server. The Analysis page (/docs) and
// the landing page's #themes section both render the block, so both take their data from here.
import { listIndustryBaskets } from "@/lib/baskets/industry";
import { listComingSoonSectors, listSectors } from "@/lib/sector-content";
import { buildSectorCards } from "@/lib/sector-content/stats";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { BENCHMARKS, MARKET_BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIpoDecks } from "@/lib/ipo-content";

export function analysisProps() {
  // The Charts view is each industry's basket page (same component), so it gets the baskets.
  const baskets = listIndustryBaskets();
  return {
    decks: listSectors()
      .filter((s) => !s.muted)
      .map((s) => buildDeck(s.slug))
      .filter((d): d is Deck => d !== null),
    ipos: listIpoDecks(),
    sectorCards: buildSectorCards(),
    comingSoon: listComingSoonSectors(),
    baskets: baskets.map(({ slug, name, tagline, category, stocks, indices }) => ({ slug, name, tagline, category, stocks, indices })),
    industries: baskets.map(({ slug, name, icon }) => ({ slug, name, icon })),
    market: MARKET_BENCHMARKS.map((id) => BENCHMARKS[id]),
  };
}

/** The view the block opens on, from `?view=`: Deep dive unless Reports or Charts is asked for. */
export const analysisView = (view?: string) => (view === "charts" ? "charts" : view === "reports" ? "reports" : "deep");
