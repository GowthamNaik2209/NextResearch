// Coverage: every listed company in every live (non-muted) industry, policy and index shows up on
// every surface that derives from the content, and every live sector has each page it needs. A new
// module is only done when this passes (docs/PLAYBOOK.md 1.3); what code can't see (a price series,
// shareholding rows in the database) is checked by scripts/check-coverage.ts.
//
// A company may be left off a surface only by a named rule below, with its reason. Nothing is
// skipped silently: a gap no rule explains fails, naming the sector, the ticker and the surface.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { companyLinkKey, findSupplierByTicker, listSectors, type SectorSupplier, type SectorWithSlug } from "./index";
import { companySlug, getCompanyPage, listCompanyPages, primaryIndustry } from "./companies";
import { getCompanyFootprint, listConnectedCompanies } from "./exposure";
import { CORE_CENTRALITY, listCompanyMetrics, sectorCompanyMetrics, type CompanyMetrics } from "./insights";
import { buildSearchIndex, buildSectorCards, getPlatformStats } from "./stats";
import { buildDeck, getReport } from "./reports";
import { sectorBenchmarks } from "./benchmarks";
import { listScenarios } from "./scenarios";
import { getResearchForSector } from "./docs";
import { basketStock, getIndustryBasket, listBasketUniverse, listIndustryBaskets } from "@/lib/baskets/industry";
import { industryPools } from "@/lib/baskets/pools-data";
import { ideaStockInfo } from "@/lib/baskets/ideas-data";
import { cleanPickedFrom } from "@/lib/baskets/picked-from";
import { compareProps } from "@/lib/baskets/page-props";
import { detectOutlier } from "@/lib/baskets/outliers";
import { storeKeys } from "@/lib/prices/refresh";
import { companiesInView } from "@/lib/flows/query";
import { isAbout } from "@/lib/live/news";
import { analysisChartIndustries, analysisProps } from "@/lib/analysis-props";
import { midSentence, themeNames } from "@/lib/site";
import { getFinancials } from "@/lib/financials/store";
import { industryPe } from "@/lib/valuation/pe-data";
import { MIN_PEERS } from "@/lib/valuation/pe-context";
import { isReit } from "@/components/stock/merge";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

before(installFinancialsFromDatabase);

// ---- What is checked ----

type Pair = { sector: SectorWithSlug; key: string; sup: SectorSupplier; ticker: string };

const live = () => listSectors().filter((s) => !s.muted);

/** Every listed supplier with a ticker in every live sector, once per sector and ticker. */
function pairs(): Pair[] {
  const out: Pair[] = [];
  for (const sector of live()) {
    const seen = new Set<string>();
    for (const [key, sup] of Object.entries(sector.suppliers)) {
      const ticker = sup.f?.ticker;
      if (!sup.listed || !ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      out.push({ sector, key, sup, ticker });
    }
  }
  return out;
}

// ---- Named exclusions: the only reasons a company may be missing from a surface ----

type Rule = { id: string; reason: string; applies: (p: Pair) => boolean };

const metricsIn = (p: Pair): CompanyMetrics | undefined => sectorCompanyMetrics(p.sector.slug).find((c) => c.ticker === p.ticker);

const RULES = {
  noFigures: {
    id: "no-figures",
    reason: "the company table has no row for it yet (refresh-financials.ts --add); financials.test.ts fails on this separately",
    applies: (p) => !getFinancials(p.ticker),
  },
  oneOff: {
    id: "one-off-year",
    reason: "a one-off year (Company.screenOut or the detector in baskets/outliers.ts): kept out of rule-based screens, users may add it by hand with a note",
    applies: (p) => !!detectOutlier(getFinancials(p.ticker)),
  },
  sideExposure: {
    id: "side-exposure",
    reason: `its strongest link here is low strength or an enabler/lender (centrality < ${CORE_CENTRALITY}): sector news feeds and the per-industry stake changes leave it out (insights.ts CORE_CENTRALITY)`,
    applies: (p) => (metricsIn(p)?.centrality ?? 1) < CORE_CENTRALITY,
  },
  noOneYear: {
    id: "under-a-year",
    reason: "no 1Y price return in the company table (listed under a year ago): Trend says \"Not enough history\" (financials/trend.ts)",
    applies: (p) => getFinancials(p.ticker)?.cagr?.[0] == null,
  },
  noPe: {
    id: "no-pe",
    reason: "no positive P/E in the company table (a loss, or none reported): P/E in context isn't shown",
    applies: (p) => basketStock(p.ticker)?.pe == null,
  },
  reit: {
    id: "reit",
    reason: "a REIT: P/E isn't meaningful for a trust (merge.ts REIT_NOTE)",
    applies: (p) => isReit(p.ticker),
  },
  thinIndustry: {
    id: "thin-industry",
    reason: `its primary industry has fewer than ${MIN_PEERS} covered stocks with a P/E, so no industry median`,
    applies: (p) => {
      const page = getCompanyPage(companySlug(p.ticker));
      const home = page ? getIndustryBasket(primaryIndustry(page).sectorSlug) : null;
      return (home?.stocks.filter((s) => s.pe != null).length ?? 0) < MIN_PEERS;
    },
  },
  deckCurated: {
    id: "deck-curated",
    reason: "a research deck's company table is its authored beneficiaries (6-10, reports/<slug>.ts), not every listed company",
    applies: () => true,
  },
} satisfies Record<string, Rule>;

// Projections leave a stock out with a reason (projection.ts gate); these are the legitimate ones.
const PROJECTION_REASONS: { id: string; reason: string; match: RegExp }[] = [
  { id: "short-results", reason: "fewer than MIN_YEARS years of reported results", match: /years? of results \(needs \d+\)/ },
  { id: "short-trading", reason: "listed under MIN_YEARS years ago (no 3-year price CAGR)", match: /^Listed under \d+ years ago/ },
  { id: "no-price", reason: "no price or market cap in the company table", match: /^No price or market cap/ },
  { id: "no-revenue", reason: "no revenue in its latest reported year", match: /^No revenue in its latest year/ },
  { id: "no-figures", reason: "no row in the company table", match: /^No figures in our last data update/ },
];

// Live sectors with no index to chart against (sector-content/benchmarks.ts SECTOR_INDEX): each must
// be listed here with why, so a new module can't silently ship without one.
const NO_BENCHMARK: Record<string, string> = {
  nifty50: "it is the benchmark itself (the market lines are always shown)",
  semiconductors: "no NSE semiconductor index or ETF with a year of Yahoo history",
  datacenter: "no data-centre index",
  telecom5g: "no telecom index or ETF with a year of Yahoo history",
  solarmodules: "no solar or renewables index with a year of Yahoo history",
  semicon2: "no semiconductor index (policy)",
  ecms: "no electronics-components index (policy)",
  capmarkets: "Nifty Capital Markets has no Yahoo symbol/ETF with a year of history mapped yet",
};

// Live sectors with no research deck: only a market index.
const NO_DECK: Record<string, string> = { nifty50: "a market index: its page is the heatmap, not a ten-slide deck" };

// ---- Helpers ----

type Gap = { sector: string; ticker: string; surface: string };

/** Fails listing every gap no rule explains; `allowed` rules are applied per pair. */
function check(surface: string, has: (p: Pair) => boolean, allowed: Rule[] = []): number {
  const gaps: Gap[] = [];
  let n = 0;
  for (const p of pairs()) {
    n++;
    if (has(p)) continue;
    if (allowed.some((r) => r.applies(p))) continue;
    gaps.push({ sector: p.sector.slug, ticker: p.ticker, surface });
  }
  assert.deepEqual(
    gaps.map((g) => `${g.sector} / ${g.ticker}: missing from ${g.surface}`),
    [],
    `${gaps.length} listed compan${gaps.length === 1 ? "y is" : "ies are"} missing from ${surface} with no named rule${allowed.length ? ` (allowed: ${allowed.map((r) => r.id).join(", ")})` : ""}`,
  );
  return n;
}

const sectorGaps = (what: string, bad: (s: SectorWithSlug) => string | null) => {
  const gaps = live().flatMap((s) => {
    const why = bad(s);
    return why ? [`${s.slug}: ${what} - ${why}`] : [];
  });
  assert.deepEqual(gaps, [], `${gaps.length} live sector(s) lack ${what}`);
};

// ---- Per company x sector ----

test("the universe: every live sector has listed companies, and each is linked from a zone", () => {
  assert.ok(pairs().length > 500, `only ${pairs().length} sector x company pairs`);
  const gaps: string[] = [];
  for (const s of live()) {
    const linked = new Set(s.zones.flatMap((z) => z.suppliers.map(companyLinkKey)));
    for (const [key, sup] of Object.entries(s.suppliers))
      if (sup.listed && sup.f?.ticker && !linked.has(key)) gaps.push(`${s.slug} / ${sup.f.ticker}: listed supplier "${key}" is linked from no zone (company pages, search, footprint and baskets skip it)`);
  }
  assert.deepEqual(gaps, []);
});

test("stock pop-up allowlist (findSupplierByTicker, /api/stock/*)", () => {
  check("the stock pop-up allowlist", (p) => !!findSupplierByTicker(p.ticker)?.listed);
});

test("/companies and the company page list the sector", () => {
  const listed = new Set(listCompanyPages().map((c) => c.ticker));
  check("/companies", (p) => listed.has(p.ticker));
  check("the company page's appearances", (p) => !!getCompanyPage(companySlug(p.ticker))?.appearances.some((a) => a.sectorSlug === p.sector.slug));
});

test("company URLs are unique (one page per ticker: sitemap, /company/<slug>)", () => {
  const bySlug = new Map<string, string>();
  const clashes: string[] = [];
  for (const p of pairs()) {
    const slug = companySlug(p.ticker);
    const other = bySlug.get(slug);
    if (other && other !== p.ticker) clashes.push(`${p.sector.slug} / ${p.ticker}: slug "${slug}" clashes with ${other} (one of them gets no page)`);
    bySlug.set(slug, p.ticker);
  }
  assert.deepEqual(clashes, []);
  check("the sitemap's company URLs", (p) => getCompanyPage(companySlug(p.ticker))?.ticker === p.ticker);
});

test("search index: one company row opening its page, naming the sector", () => {
  const rows = buildSearchIndex().filter((r) => r.kind === "company");
  const byHref = new Map(rows.map((r) => [r.href, r]));
  check("search (company row)", (p) => {
    const r = byHref.get(`/company/${companySlug(p.ticker)}`);
    return !!r && !!r.aliases?.includes(p.ticker.toLowerCase());
  });
  check("search (sector named in its sub-line)", (p) => !!byHref.get(`/company/${companySlug(p.ticker)}`)?.sub.includes(p.sector.name));
});

test("industry basket and pools", () => {
  check("the industry basket", (p) => !!getIndustryBasket(p.sector.slug)?.stocks.some((s) => s.ticker === p.ticker));
  check("the industry pools", (p) => !!industryPools(p.sector.slug)?.companies.some((c) => c.ticker === p.ticker), [RULES.noFigures]);
});

test("rule-based baskets and stock screens: the universe they rank", () => {
  const info = new Map(ideaStockInfo().map((s) => [s.ticker, s]));
  check("the rule-based basket universe (ideaStockInfo)", (p) => info.has(p.ticker));
  check("the rule-based basket screens (not flagged one-off)", (p) => info.get(p.ticker)?.outlier === false, [RULES.oneOff]);
  const metrics = new Map(listCompanyMetrics().map((c) => [c.ticker, c]));
  check("the landing stock screens (listCompanyMetrics)", (p) => metrics.has(p.ticker), [RULES.noFigures]);
  check("the sector's own metrics (sectorCompanyMetrics)", (p) => !!metricsIn(p));
});

test("basket picker and projections", () => {
  const universe = new Map(listBasketUniverse().map((s) => [s.ticker, s]));
  check("the stock picker's universe", (p) => universe.has(p.ticker));
  check("the stock picker's industry tab", (p) => !!universe.get(p.ticker)?.industries.some((i) => i.slug === p.sector.slug));
  check("the picker's layer for this industry", (p) => !!universe.get(p.ticker)?.layerIn[p.sector.slug]);
  check("cleanPickedFrom (saving a basket picked from this industry)", (p) => cleanPickedFrom({ [p.ticker]: p.sector.slug }, [p.ticker])[p.ticker] === p.sector.slug);
  const unknown: string[] = [];
  check("projections (a projection or a named reason)", (p) => {
    const proj = basketStock(p.ticker)?.proj;
    if (!proj) return false;
    if (proj.ok) return true;
    if (PROJECTION_REASONS.some((r) => r.match.test(proj.reason))) return true;
    unknown.push(`${p.sector.slug} / ${p.ticker}: "${proj.reason}"`);
    return false;
  });
  assert.deepEqual(unknown, [], "projection reasons not in PROJECTION_REASONS");
});

test("Trend: one percentile in the pop-up, company page and basket table", () => {
  // The pop-up and company page read supplier.f (mergeStats); the basket table reads basketStock.
  check("Trend in the stock pop-up / company page (supplier.f.trend)", (p) => p.sup.f?.trend != null, [RULES.noFigures, RULES.noOneYear]);
  check("Trend in the basket table (basketStock.trend)", (p) => basketStock(p.ticker)?.trend === p.sup.f?.trend && p.sup.f?.trend != null, [RULES.noFigures, RULES.noOneYear]);
});

test("P/E in context: its home industry's median among covered stocks", () => {
  check("P/E in context (industryPe)", (p) => !!industryPe(p.ticker), [RULES.noFigures, RULES.noPe, RULES.reit, RULES.thinIndustry]);
});

test("price store keeps a series for it (backtests, projections' risk)", () => {
  const keys = new Set(storeKeys().map((k) => k.key));
  check("the price store's keys (prices/refresh.ts storeKeys)", (p) => keys.has(p.ticker));
});

test("footprint and /connections", () => {
  check("the stock pop-up footprint", (p) => !!getCompanyFootprint(p.ticker)?.sectors.some((s) => s.sectorSlug === p.sector.slug));
  const connected = new Map(listConnectedCompanies().map((c) => [c.ticker, c]));
  const nonIndex = (t: string) => (getCompanyFootprint(t)?.sectors ?? []).filter((s) => !s.isIndex).length;
  // Only companies in 2+ industries/policies are "connected"; the index (Nifty 50) doesn't count.
  check("/connections (companies in 2+ industries or policies)", (p) => {
    if (p.sector.category === "index" || nonIndex(p.ticker) < 2) return true;
    return !!connected.get(p.ticker)?.sectors.some((s) => s.sectorSlug === p.sector.slug);
  });
});

test("/updates: the sector's news feed and FII/DII stake changes", () => {
  check("the sector news feed's companies", (p) => (metricsIn(p)?.centrality ?? 0) >= CORE_CENTRALITY, [RULES.sideExposure]);
  check("the FII/DII view's companies for the sector (companiesInView)", (p) => companiesInView(p.sector.slug).has(p.ticker), [RULES.sideExposure]);
  const all = companiesInView();
  check("the FII/DII view's companies (all themes)", (p) => all.has(p.ticker));  // The news matcher (live/news.ts isAbout) must recognise a headline naming the company: a new
  // name that only matches a GENERIC word, or a look-alike in OTHER_COMPANIES, gets no news at all.
  check("the news matcher (a headline with its own name)", (p) => isAbout(`${p.sup.name.replace(/\s*\(.*?\)/g, "")} shares jump after Q2 results`, { name: p.sup.name, ticker: p.ticker }));
});

test("/updates offers every live sector in its industry dropdown", () => {
  // As app/updates/page.tsx builds the options: every live sector, grouped by category.
  const groups = new Set(["Industries", "Policies", "Indices"]);
  const group = (s: SectorWithSlug) => (s.category === "policy" ? "Policies" : s.category === "index" ? "Indices" : "Industries");
  sectorGaps("an /updates dropdown entry", (s) => (groups.has(group(s)) ? null : `unknown category "${s.category}"`));
});

test("Analysis: the deck's company table and the chart picker", () => {
  check("the research deck's company table", (p) => !!buildDeck(p.sector.slug)?.companies.some((c) => c.ticker === p.ticker), [RULES.deckCurated]);
  const charts = new Map(analysisChartIndustries().map((i) => [i.slug, new Set(i.stocks.map((s) => s.ticker))]));
  check("the Analysis chart picker", (p) => !!charts.get(p.sector.slug)?.has(p.ticker));
});

// ---- Per live sector ----

test("every live sector has its landing card, search entry and theme name", () => {
  const cards = new Map(buildSectorCards().map((c) => [c.slug, c]));
  sectorGaps("a landing / Deep dive card", (s) => (!cards.has(s.slug) ? "no card" : cards.get(s.slug)!.listed === 0 ? "card counts 0 listed companies" : null));
  const search = new Set(buildSearchIndex().filter((r) => r.kind === "sector").map((r) => r.href));
  sectorGaps("a search entry", (s) => (search.has(`/sector/${s.slug}`) ? null : "no sector row"));
  const stats = getPlatformStats();
  assert.equal(stats.sectors, live().filter((s) => s.category !== "index").length, "landing stats count every live industry and policy");
  const names = themeNames();
  // The same short form themeNames() builds (parentheticals and "/ ..." tails dropped).
  sectorGaps("a mention in the site's theme list (lib/site.ts themeNames)", (s) =>
    s.category === "index" || names.includes(midSentence(s.name.replace(/\s*\(.*?\)/g, "").split(" / ")[0].trim())) ? null : "not named",
  );
});

test("every live sector has a basket, pools, compare line and picker tab", () => {
  const baskets = new Map(listIndustryBaskets().map((b) => [b.slug, b]));
  sectorGaps("an industry basket", (s) => (!baskets.has(s.slug) ? "none" : baskets.get(s.slug)!.stocks.length === 0 ? "empty" : null));
  sectorGaps("industry pools", (s) => (industryPools(s.slug) ? null : "industryPools() is null"));
  const compare = new Set(compareProps(null).industries.map((i) => i.slug));
  sectorGaps("a compare line / picker industry (page-props compareProps)", (s) => (compare.has(s.slug) ? null : "missing"));
  const charts = new Set(analysisChartIndustries().map((i) => i.slug));
  sectorGaps("an Analysis chart-picker entry", (s) => (charts.has(s.slug) ? null : "missing"));
});

test("every live sector has a deck (or a named reason), scenarios, reading list and benchmark (or a named none)", () => {
  sectorGaps("a research deck", (s) => (s.slug in NO_DECK ? null : !getReport(s.slug) ? "getReport() is null" : !buildDeck(s.slug) ? "buildDeck() is null" : null));
  const deckCards = new Set(analysisProps().decks.map((d) => d.slug));
  sectorGaps("a Reports card", (s) => (s.slug in NO_DECK || deckCards.has(s.slug) ? null : "no deck card"));
  // A beneficiary or news key the sector doesn't have is dropped from the deck silently (makeDeck).
  sectorGaps("deck keys that resolve", (s) => {
    const r = getReport(s.slug);
    if (!r) return null;
    const bad = [...r.beneficiaries.map((b) => b.key), ...r.companyNews.map((n) => n.key)].filter((k) => !s.suppliers[k]);
    return bad.length ? `unknown supplier keys ${bad.join(", ")}` : null;
  });
  sectorGaps("scenarios", (s) => (listScenarios(s.slug).length ? null : "none in scenarios.ts"));
  sectorGaps("a reading list", (s) => (getResearchForSector(s.slug).length ? null : "none in docs.ts"));
  sectorGaps("a benchmark index or a named none", (s) => (sectorBenchmarks(s.slug).length || s.slug in NO_BENCHMARK ? null : "add it to SECTOR_INDEX (benchmarks.ts) or to NO_BENCHMARK here with the reason"));
  const stale = Object.keys(NO_BENCHMARK).filter((slug) => sectorBenchmarks(slug).length);
  assert.deepEqual(stale, [], "NO_BENCHMARK names a sector that now has an index: remove it");
});
