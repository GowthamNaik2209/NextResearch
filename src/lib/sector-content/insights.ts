// Landing-page "numbers" layer: sector aggregates, rule-based idea screens and
// the news feed — derived from the authored content, the company figures (the
// database's company table, cached by src/lib/financials/load.ts) and the curated
// headlines in the extracted seed data.
import extracted from "../../../prisma/seed-source/extracted.json";
import {
  getSector,
  isSideLink,
  linkStrength,
  listCompanyFinancials,
  listSectors,
  parseCrore,
  primarySector,
  tickerForSupplier,
  type SectorWithSlug,
  type SupplierFinancials,
} from "./index";
import { memoByFinancials } from "@/lib/financials/store";
import { detectOutlier, ONE_OFF_NOTE } from "@/lib/baskets/outliers";
import { signedPct } from "@/lib/format";


// The same guard as the rule-based baskets (baskets/ideas.ts roceMeaningful): ROCE ranks only with a
// positive P/E, a profit in the latest year and positive book value - a loss-maker with negative
// equity can show a huge "ROCE" (Tata Teleservices).
function roceMeaningful(f: SupplierFinancials): boolean {
  const pe = num(f.kpi?.[0]);
  const book = num(f.kpi?.[1]);
  const np = num(f.np?.[4]);
  return num(f.kpi?.[3]) != null && pe != null && pe > 0 && (np == null || np > 0) && !(book != null && book <= 0);
}

export type CompanyMetrics = {
  ticker: string;
  name: string;
  sectorSlug: string;
  sectorName: string;
  href: string;
  pe: number | null;
  roce: number | null;
  divYield: number | null;
  cagr1y: number | null;
  cagr3y: number | null;
  revenueCr: number | null;
  revGrowthPct: number | null; // latest year vs previous
  pctFrom52wHigh: number | null; // negative = below the high
  mcapCr: number | null;
  // 0-1: how central this sector is to the company (its strongest exposure here), used to
  // keep side-exposed mega-caps from crowding a sector's news feed.
  centrality: number;
  // Figures distorted by a one-off year (src/lib/baskets/outliers.ts, shared with the rule-based
  // baskets): kept out of the stock screens.
  outlier: boolean;
};

// Centrality scale (0-1) for the thresholds below (CORE_CENTRALITY) and the news feed's weighting;
// side links (lenders, enablers: isSideLink) count a tenth. Which sector a company is shown under
// is not decided here but by primarySector() in ./index, shared with the company page and pop-up.
const STRENGTH_WEIGHT = { high: 1, medium: 0.2, low: 0.03 } as const;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Every listed company in one sector, once per ticker (a few sectors list one company under two
// keys for two roles, e.g. HAL as prime and as MRO). Centrality is the ticker's strongest link.
function buildSectorMetrics(s: SectorWithSlug): CompanyMetrics[] {
  // First zone each supplier sits in, so the link lands on a real layer.
  const zoneOf = new Map<string, string>();
  const centralityOf = new Map<string, number>();
  for (const z of s.zones)
    for (const l of z.suppliers) {
      const k = typeof l === "string" ? l : l.key;
      if (!zoneOf.has(k)) zoneOf.set(k, z.id);
      const w = STRENGTH_WEIGHT[linkStrength(l)] * (isSideLink(l) ? 0.1 : 1);
      const t = s.suppliers[k] ? tickerForSupplier(s.suppliers[k]) : k;
      centralityOf.set(t, Math.max(centralityOf.get(t) ?? 0, w));
    }
  const seen = new Set<string>();
  const out: CompanyMetrics[] = [];
  for (const [key, sup] of Object.entries(s.suppliers)) {
    const f = sup.f;
    if (!sup.listed || !f) continue;
    const ticker = tickerForSupplier(sup);
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    const price = parseCrore(f.price);
    const hi = num(f.range?.[1]);
    const rev = f.rev ?? [];
    const last = rev[rev.length - 1];
    const prev = rev[rev.length - 2];
    const zone = zoneOf.get(key);
    out.push({
      ticker,
      name: sup.name,
      sectorSlug: s.slug,
      sectorName: s.name,
      href: `/sector/${s.slug}/explore${zone ? `?zone=${encodeURIComponent(zone)}&company=${encodeURIComponent(key)}` : ""}`,
      pe: num(f.kpi?.[0]),
      // ROCE ranks only where it means something (see roceMeaningful).
      roce: roceMeaningful(f) ? num(f.kpi?.[3]) : null,
      divYield: num(f.kpi?.[2]),
      cagr1y: num(f.cagr?.[0]),
      cagr3y: num(f.cagr?.[1]),
      revenueCr: num(last),
      revGrowthPct: last != null && prev ? ((last - prev) / prev) * 100 : null,
      pctFrom52wHigh: price != null && hi ? ((price - hi) / hi) * 100 : null,
      mcapCr: parseCrore(f.mcap),
      centrality: centralityOf.get(ticker) ?? 1,
      outlier: !!detectOutlier(f),
    });
  }
  return out;
}

// Rebuilt whenever new figures are installed (see memoByFinancials).
const sectorCache = memoByFinancials(() => new Map<string, CompanyMetrics[]>());
function sectorMetrics(s: SectorWithSlug): CompanyMetrics[] {
  const c = sectorCache();
  let m = c.get(s.slug);
  if (!m) c.set(s.slug, (m = buildSectorMetrics(s)));
  return m;
}

/** Every listed company in one sector or policy, with its centrality there (sector feeds). */
export function sectorCompanyMetrics(slug: string): CompanyMetrics[] {
  const s = getSector(slug);
  return s && !s.muted ? sectorMetrics(s) : [];
}

// One row per listed company across the platform (ideas, the all-themes news feed): a company in
// several sectors or policies appears once, under its home sector (primarySector) - Bharat Forge
// under the industry it mainly supplies, not a policy it touches at low strength - the same one its
// company page and stock pop-up describe it by.
export const listCompanyMetrics = memoByFinancials((): CompanyMetrics[] => {
  const best = new Map<string, CompanyMetrics>();
  for (const s of listSectors().filter((x) => !x.muted))
    for (const c of sectorMetrics(s)) {
      const prev = best.get(c.ticker);
      const home = primarySector(c.ticker);
      if (!prev || (c.sectorSlug === home && prev.sectorSlug !== home)) best.set(c.ticker, c);
    }
  return [...best.values()];
});

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type SectorNumbers = { medianPe: number | null; medianRoce: number | null; combinedRevenueCr: number | null; medianGrowthPct: number | null };

// Companies whose strongest link to a sector is a low-strength or side (lender/enabler) exposure
// - centrality under this - stay out of its combined revenue: SBI's and HDFC Bank's whole loan
// books are not real-estate revenue. Below 0.1 means "low" strength or any side-type link.
export const CORE_CENTRALITY = 0.1;

// Medians (not means) so one outlier P/E doesn't distort a small peer set. Every listed company
// mapped in the sector counts, including ones shared with other sectors.
export function sectorNumbers(slug: string): SectorNumbers {
  const sector = getSector(slug);
  const cs = sector ? sectorMetrics(sector) : [];
  const pick = (f: (c: CompanyMetrics) => number | null, positiveOnly = false) =>
    cs.map(f).filter((v): v is number => v != null && (!positiveOnly || v > 0));
  const revs = cs.filter((c) => c.centrality >= CORE_CENTRALITY).map((c) => c.revenueCr).filter((v): v is number => v != null);
  return {
    medianPe: median(pick((c) => c.pe, true)),
    medianRoce: median(pick((c) => c.roce)),
    combinedRevenueCr: revs.length ? revs.reduce((a, b) => a + b, 0) : null,
    medianGrowthPct: median(pick((c) => c.revGrowthPct)),
  };
}

export type Idea = {
  id: string;
  title: string;
  rule: string;
  metricLabel: string;
  rows: { name: string; sector: string; href: string; value: string }[];
};

const top = (cs: CompanyMetrics[], n = 5) => cs.slice(0, n);
const fmt1 = (v: number) => v.toFixed(1);
const pct = (v: number) => signedPct(v, 0);

// Rule-based screens, not recommendations: each states its rule so the list is
// reproducible, and ranks purely on one reported number. Cached until new figures are installed.
export const buildIdeas = memoByFinancials((): Idea[] => {
  // Side-exposed companies (Coal India bidding for the magnet scheme) would be labelled with a
  // theme their own business isn't about, so screens use companies central to some theme.
  const cs = listCompanyMetrics().filter((c) => !c.outlier && c.centrality >= CORE_CENTRALITY);
  const row = (c: CompanyMetrics, value: string) => ({ name: c.name, sector: c.sectorName, href: c.href, value });
  const sorted = (f: (c: CompanyMetrics) => number | null, dir: 1 | -1, filter: (c: CompanyMetrics) => boolean = () => true) =>
    cs.filter((c) => f(c) != null && filter(c)).sort((a, b) => dir * ((f(a) as number) - (f(b) as number)));
  return [
    {
      id: "quality",
      title: "High return on capital",
      rule: `Ranked by ROCE, among companies with revenue above ₹1,000 Cr. ${ONE_OFF_NOTE}`,
      metricLabel: "ROCE",
      rows: top(sorted((c) => c.roce, -1, (c) => (c.revenueCr ?? 0) > 1000)).map((c) => row(c, `${fmt1(c.roce!)}%`)),
    },
    {
      id: "growth",
      title: "Fastest revenue growth",
      rule: `Latest-year revenue growth, among companies with revenue above ₹1,000 Cr in both years. ${ONE_OFF_NOTE}`,
      metricLabel: "Revenue YoY",
      rows: top(sorted((c) => c.revGrowthPct, -1, (c) => (c.revenueCr ?? 0) > 1000 && c.revenueCr! / (1 + c.revGrowthPct! / 100) > 1000)).map((c) => row(c, pct(c.revGrowthPct!))),
    },
    {
      id: "value",
      title: "Quality at a lower multiple",
      rule: `Lowest P/E among companies with ROCE above 15% and a positive P/E. ${ONE_OFF_NOTE}`,
      metricLabel: "P/E",
      rows: top(sorted((c) => c.pe, 1, (c) => (c.pe ?? 0) > 0 && (c.roce ?? 0) > 15)).map((c) => row(c, `${fmt1(c.pe!)}x`)),
    },
    {
      id: "dip",
      title: "Furthest below 52-week high",
      rule: `Price vs 52-week high, among companies with revenue above ₹1,000 Cr. ${ONE_OFF_NOTE}`,
      metricLabel: "vs 52w high",
      rows: top(sorted((c) => c.pctFrom52wHigh, 1, (c) => (c.revenueCr ?? 0) > 1000)).map((c) => row(c, pct(c.pctFrom52wHigh!))),
    },
    {
      id: "income",
      title: "Highest dividend yield",
      rule: `Dividend yield, among companies with ROCE above 10%. ${ONE_OFF_NOTE}`,
      metricLabel: "Yield",
      rows: top(sorted((c) => c.divYield, -1, (c) => (c.roce ?? 0) > 10)).map((c) => row(c, `${c.divYield!.toFixed(2)}%`)),
    },
  ].filter((i) => i.rows.length > 0);
});

/** The date of the latest figures in the company table, e.g. "20 Oct 2026". */
export function dataAsOf(): string {
  const dates = listCompanyFinancials().flatMap((f) => (f.asOf ? [f.asOf] : []));
  return dates.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a), dates[0] ?? "");
}

// A company the refresh could not read keeps its older snapshot (and date), so screens that mix
// them state the span: "25 Sep – 16 Oct 2026", or a single date when they all agree.
export function dataAsOfRange(): string {
  const dates = new Set<string>();
  for (const s of listSectors().filter((x) => !x.muted))
    // A company with no market price has no price date (the refresh cannot read it): leave it out.
    for (const sup of Object.values(s.suppliers)) if (sup.listed && sup.f?.asOf && sup.f.price != null) dates.add(sup.f.asOf);
  const sorted = [...dates].sort((a, b) => Date.parse(a) - Date.parse(b));
  if (sorted.length <= 1) return sorted[0] ?? dataAsOf();
  const [first, last] = [sorted[0], sorted[sorted.length - 1]];
  const sameYear = first.slice(-4) === last.slice(-4);
  return `${sameYear ? first.slice(0, -5) : first} – ${last}`;
}

// ---- News feed ----
export type NewsItem = {
  ticker: string;
  company: string;
  sectorSlug: string;
  sectorName: string;
  date: string;
  ts: number;
  headline: string;
  source: string;
  url: string;
};

export const listNews = memoByFinancials((): NewsItem[] => {
  const byTicker = new Map<string, CompanyMetrics>();
  for (const c of listCompanyMetrics()) byTicker.set(c.ticker, c);
  const now = Date.now();
  const items: NewsItem[] = [];
  const news = (extracted as unknown as { news: Record<string, { items: { date: string; headline: string; source: string; url: string }[] }> }).news;
  for (const [ticker, entry] of Object.entries(news)) {
    const c = byTicker.get(ticker);
    if (!c) continue;
    for (const it of entry.items) {
      // "2026" (year only) parses to Jan 1 — still sortable, shown as given.
      const ts = Date.parse(/^\d{4}$/.test(it.date) ? `Jan 1 ${it.date}` : it.date);
      if (!Number.isFinite(ts) || ts > now) continue;
      items.push({ ticker, company: c.name, sectorSlug: c.sectorSlug, sectorName: c.sectorName, ...it, ts });
    }
  }
  return items.sort((a, b) => b.ts - a.ts);
});

export function newsForTickers(tickers: string[]): NewsItem[] {
  const set = new Set(tickers);
  return listNews().filter((n) => set.has(n.ticker));
}
