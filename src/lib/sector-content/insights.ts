// Landing-page "numbers" layer: sector aggregates, rule-based idea screens and
// the news feed — all derived from the authored content + extracted seed data
// (static, no DB), so the home page stays fast and never depends on a DB call.
import extracted from "../../../prisma/seed-source/extracted.json";
import { listSectors, tickerForSupplier } from "./index";


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
  // Latest-year figures distorted by a one-off (see SupplierFinancials.screenOut).
  screenOut: boolean;
};

const STRENGTH_WEIGHT = { high: 1, medium: 0.2, low: 0.03 } as const;
// Lenders, software and other enablers sit beside the chain rather than in it.
const SIDE_TYPES = new Set(["enabler", "indirect_supplier"]);

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const parseRs = (s?: string) => {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

let cache: CompanyMetrics[] | null = null;
export function listCompanyMetrics(): CompanyMetrics[] {
  if (cache) return cache;
  const seen = new Set<string>();
  const out: CompanyMetrics[] = [];
  for (const s of listSectors().filter((x) => !x.muted)) {
    // First zone each supplier sits in, so the link lands on a real layer.
    const zoneOf = new Map<string, string>();
    const centralityOf = new Map<string, number>();
    for (const z of s.zones)
      for (const l of z.suppliers) {
        const k = typeof l === "string" ? l : l.key;
        if (!zoneOf.has(k)) zoneOf.set(k, z.id);
        // Bare-key links (sectors not yet carrying exposure data) count as central.
        const w =
          typeof l === "string" || !l.exposureStrength
            ? 1
            : STRENGTH_WEIGHT[l.exposureStrength] * (l.exposureType && SIDE_TYPES.has(l.exposureType) ? 0.1 : 1);
        centralityOf.set(k, Math.max(centralityOf.get(k) ?? 0, w));
      }
    for (const [key, sup] of Object.entries(s.suppliers)) {
      const f = sup.f;
      if (!sup.listed || !f) continue;
      const ticker = tickerForSupplier(sup);
      if (seen.has(ticker)) continue;
      seen.add(ticker);
      const price = parseRs(f.price);
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
        roce: num(f.kpi?.[3]),
        divYield: num(f.kpi?.[2]),
        cagr1y: num(f.cagr?.[0]),
        cagr3y: num(f.cagr?.[1]),
        revenueCr: num(last),
        revGrowthPct: last != null && prev ? ((last - prev) / prev) * 100 : null,
        pctFrom52wHigh: price != null && hi ? ((price - hi) / hi) * 100 : null,
        mcapCr: parseRs(f.mcap),
        centrality: centralityOf.get(key) ?? 1,
        screenOut: !!f.screenOut,
      });
    }
  }
  return (cache = out);
}

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type SectorNumbers = { medianPe: number | null; medianRoce: number | null; combinedRevenueCr: number | null; medianGrowthPct: number | null };

// Medians (not means) so one outlier P/E doesn't distort a small peer set.
export function sectorNumbers(slug: string): SectorNumbers {
  const cs = listCompanyMetrics().filter((c) => c.sectorSlug === slug);
  const pick = (f: (c: CompanyMetrics) => number | null, positiveOnly = false) =>
    cs.map(f).filter((v): v is number => v != null && (!positiveOnly || v > 0));
  const revs = pick((c) => c.revenueCr);
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
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`;

// Rule-based screens, not recommendations: each states its rule so the list is
// reproducible, and ranks purely on one reported number.
export function buildIdeas(): Idea[] {
  const cs = listCompanyMetrics().filter((c) => !c.screenOut);
  const row = (c: CompanyMetrics, value: string) => ({ name: c.name, sector: c.sectorName, href: c.href, value });
  const sorted = (f: (c: CompanyMetrics) => number | null, dir: 1 | -1, filter: (c: CompanyMetrics) => boolean = () => true) =>
    cs.filter((c) => f(c) != null && filter(c)).sort((a, b) => dir * ((f(a) as number) - (f(b) as number)));
  return [
    {
      id: "quality",
      title: "High return on capital",
      rule: "Ranked by ROCE, among companies with revenue above ₹1,000 Cr",
      metricLabel: "ROCE",
      rows: top(sorted((c) => c.roce, -1, (c) => (c.revenueCr ?? 0) > 1000)).map((c) => row(c, `${fmt1(c.roce!)}%`)),
    },
    {
      id: "growth",
      title: "Fastest revenue growth",
      rule: "Latest-year revenue growth, among companies with revenue above ₹1,000 Cr in both years",
      metricLabel: "Revenue YoY",
      rows: top(sorted((c) => c.revGrowthPct, -1, (c) => (c.revenueCr ?? 0) > 1000 && c.revenueCr! / (1 + c.revGrowthPct! / 100) > 1000)).map((c) => row(c, pct(c.revGrowthPct!))),
    },
    {
      id: "value",
      title: "Quality at a lower multiple",
      rule: "Lowest P/E among companies with ROCE above 15% and a positive P/E",
      metricLabel: "P/E",
      rows: top(sorted((c) => c.pe, 1, (c) => (c.pe ?? 0) > 0 && (c.roce ?? 0) > 15)).map((c) => row(c, `${fmt1(c.pe!)}x`)),
    },
    {
      id: "dip",
      title: "Furthest below 52-week high",
      rule: "Price vs 52-week high, among companies with revenue above ₹1,000 Cr",
      metricLabel: "vs 52w high",
      rows: top(sorted((c) => c.pctFrom52wHigh, 1, (c) => (c.revenueCr ?? 0) > 1000)).map((c) => row(c, pct(c.pctFrom52wHigh!))),
    },
    {
      id: "income",
      title: "Highest dividend yield",
      rule: "Dividend yield, among companies with ROCE above 10%",
      metricLabel: "Yield",
      rows: top(sorted((c) => c.divYield, -1, (c) => (c.roce ?? 0) > 10)).map((c) => row(c, `${c.divYield!.toFixed(2)}%`)),
    },
  ].filter((i) => i.rows.length > 0);
}

export const DATA_AS_OF: string = (extracted as { asOf: string }).asOf;

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

let newsCache: NewsItem[] | null = null;
export function listNews(): NewsItem[] {
  if (newsCache) return newsCache;
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
  return (newsCache = items.sort((a, b) => b.ts - a.ts));
}

export function newsForTickers(tickers: string[]): NewsItem[] {
  const set = new Set(tickers);
  return listNews().filter((n) => set.has(n.ticker));
}
