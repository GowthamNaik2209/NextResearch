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
import { buildHeroThemeRows, buildSearchIndex, buildSectorCards, getPlatformStats } from "@/lib/sector-content/stats";
import { buildIdeas } from "@/lib/sector-content/insights";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { BENCHMARKS, MARKET_BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIpoDecks, type IpoDeck } from "@/lib/ipo-content";
import { memoByFinancials } from "@/lib/financials/store";
import { liveIpoStatus } from "@/components/ipo/status";
import { croreShort } from "@/lib/format";
import type { ChartsIndustry } from "@/components/baskets/IndustryChartsView";

// ---- Per-request builders, cached until the company table is reinstalled ----
// Each of these walks every sector (or every deck) and was re-run on every request.

const deckCache = memoByFinancials(() => new Map<string, Deck | null>());
/** buildDeck, cached per slug. The result is shared: never mutate it. */
export function cachedDeck(slug: string): Deck | null {
  const m = deckCache();
  if (!m.has(slug)) m.set(slug, buildDeck(slug));
  return m.get(slug)!;
}
const ipoDecks = memoByFinancials(listIpoDecks);
/** Every IPO deck, with its status chip rolled forward to today. */
export const cachedIpoDecks = (): IpoDeck[] => ipoDecks().map((d) => liveIpoStatus(d));
export const cachedIpoDeck = (slug: string): IpoDeck | null => {
  const d = ipoDecks().find((x) => x.slug === slug);
  return d ? liveIpoStatus(d) : null;
};
export const cachedSectorCards = memoByFinancials(buildSectorCards);
export const cachedPlatformStats = memoByFinancials(getPlatformStats);
export const cachedIdeas = memoByFinancials(buildIdeas);

const searchIndex = memoByFinancials(buildSearchIndex);
/** The hero search index, with each IPO's status as of today (the index itself is cached). */
export function cachedSearchIndex() {
  const live = new Map(cachedIpoDecks().map((d) => [`/ipos?ipo=${d.slug}`, d.status.label]));
  return searchIndex().map((e) => (e.kind === "ipo" && live.has(e.href) ? { ...e, sub: `IPO · ${live.get(e.href)}` } : e));
}

const heroRows = memoByFinancials(() => new Map<string, ReturnType<typeof buildHeroThemeRows>>());
/** The hero's theme window rows; IPO chips and sizes follow today's status and the site's ₹ format. */
export function cachedHeroThemeRows(featuredSlug?: string) {
  const m = heroRows();
  const key = featuredSlug ?? "";
  if (!m.has(key)) m.set(key, buildHeroThemeRows(featuredSlug));
  const rows = m.get(key)!;
  const ipos = new Map(cachedIpoDecks().map((d) => [d.slug, d]));
  return {
    ...rows,
    ipo: rows.ipo.map((r) => {
      const d = r.ipoSlug ? ipos.get(r.ipoSlug) : undefined;
      if (!d) return r;
      const open = d.status.stage === "open" || d.status.stage === "upcoming";
      return { ...r, chip: d.status.label, chipTone: open ? ("live" as const) : ("accent" as const), sub: d.issue.totalCr != null ? croreShort(d.issue.totalCr) : r.sub };
    }),
  };
}

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
    .map((s) => cachedDeck(s.slug))
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
  return cachedIpoDecks().map(({ slug, name, icon, sectorLabel, tagline, status, issue }) => ({
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
  listIndustryBaskets().map(({ slug, name, tagline, category, stocks, indices }) => ({ slug, name, tagline, category, stocks, indices }))
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
    initialDeck: report && decks.some((d) => d.slug === report) ? (cachedDeck(report) ?? undefined) : undefined,
    ipos: ipoCards(),
    initialIpoDeck: ipo ? (cachedIpoDeck(ipo) ?? undefined) : undefined,
    sectorCards: cachedSectorCards(),
    comingSoon: listComingSoonSectors(),
    baskets: analysisView(view) === "charts" ? chartBaskets() : undefined,
    industries: baskets.map(({ slug, name, icon }) => ({ slug, name, icon })),
    market: MARKET_BENCHMARKS.map((id) => BENCHMARKS[id]),
  };
}

/** The view the block opens on, from `?view=`: Deep dive unless Reports or Charts is asked for. */
export const analysisView = (view?: string) => (view === "charts" ? "charts" : view === "reports" ? "reports" : "deep");
