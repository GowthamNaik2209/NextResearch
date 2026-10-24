// Server side of basket projections: each stock's projection from the company table (the same
// figures shown everywhere), its price statistics (./projection-risk-data.ts), its home industry's
// median margin and the spread of fundamentals scores across every company we cover, and every
// industry basket's projected return (the chart's "Compare with" lines). Rebuilt whenever new
// figures or price statistics are installed.
import { companyFinancials, getSector, listSectors, parseCrore, tickerForSupplier } from "@/lib/sector-content";
import { companySlug, getCompanyPage, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { memoByFinancials } from "@/lib/financials/store";
import { detectOutlier } from "./outliers";
import { compactProjection, fundamentalScore, median, projectStock, scoreScale, SCENARIOS, type CaseReturns, type ProjectionInput, type ScoreScale, type StockProjection } from "./projection";
import { riskStatsFor } from "./projection-risk-data";
import { projectBasket } from "./projection-basket";
import { basketWeights } from "./backtest";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** An industry's median net margin in the latest reported year, over every listed company it maps. */
const industryMargins = memoByFinancials(() => {
  const out = new Map<string, number | null>();
  for (const s of listSectors()) {
    const ms: number[] = [];
    const seen = new Set<string>();
    for (const sup of Object.values(s.suppliers)) {
      const f = sup.f;
      if (!sup.listed || !f) continue;
      const t = tickerForSupplier(sup);
      if (seen.has(t)) continue;
      seen.add(t);
      // The latest year with both figures.
      const rev = f.rev ?? [];
      const np = f.np ?? [];
      for (let i = Math.min(rev.length, np.length) - 1; i >= 0; i--) {
        const r = num(rev[i]), n = num(np[i]);
        if (r == null || n == null) continue;
        if (r > 0) ms.push(n / r);
        break;
      }
    }
    out.set(s.slug, median(ms));
  }
  return out;
});

/** The home industry the projection judges a stock against: where its company page places it. */
export function homeIndustryOf(ticker: string): string | null {
  const page = getCompanyPage(companySlug(ticker));
  return page ? primaryAppearance(page).sectorSlug : null;
}

/** The spread of fundamentals scores over every listed company we cover (against its home industry). */
export const projectionScale = memoByFinancials((): ScoreScale => {
  const scores: number[] = [];
  for (const p of listCompanyPages()) {
    const x = projectionInputFor(p.ticker, homeIndustryOf(p.ticker));
    const s = x ? fundamentalScore(x) : null;
    if (s != null && Number.isFinite(s)) scores.push(s);
  }
  return scoreScale(scores);
});

const projCache = memoByFinancials(() => new Map<string, StockProjection>());

/** A stock's model inputs from the company table and its price statistics, judged against its home industry; null when it has no figures. */
export function projectionInputFor(ticker: string, homeSlug: string | null): ProjectionInput | null {
  const f = companyFinancials(ticker);
  if (!f) return null;
  const out = detectOutlier(f);
  const m = out ? /^FY(\d\d)$/.exec(out.year) : null;
  const pe = num(f.kpi?.[0]);
  const risk = riskStatsFor(ticker);
  return {
    rev: f.rev ?? [],
    np: f.np ?? [],
    price: parseCrore(f.price),
    mcapCr: parseCrore(f.mcap),
    pe: pe != null && pe > 0 ? pe : null,
    cagr: f.cagr ?? null,
    divYield: num(f.kpi?.[2]),
    range: f.range ?? null,
    asOf: f.asOf,
    oneOffIndex: m ? Number(m[1]) - 22 : null,
    industry: { margin: homeSlug && getSector(homeSlug) ? (industryMargins().get(homeSlug) ?? null) : null },
    risk: risk ? { beta: risk.beta, vol: risk.vol } : null,
  };
}

/** A stock's projection, judged against its home industry (where its company page places it). */
export function projectionFor(ticker: string, homeSlug: string | null): StockProjection {
  const c = projCache();
  const key = `${ticker}|${homeSlug ?? ""}`;
  const hit = c.get(key);
  if (hit) return hit;
  const input = projectionInputFor(ticker, homeSlug);
  const p: StockProjection = input ? compactProjection(projectStock(input, projectionScale())) : { ok: false, years: 0, reason: "No figures in our last data update" };
  c.set(key, p);
  return p;
}

/** A basket's projected return for every horizon and case (null where nothing is projected). */
export type BasketCaseReturns = Record<keyof CaseReturns, [number | null, number | null, number | null]>;

/**
 * Every case for a list of stocks at a weighting (the compared industry baskets, and the Baskets
 * page's rows). Custom: the basket's own % (a stock missing from them is not held).
 */
export function basketCases(
  stocks: { ticker: string; mcapCr: number | null; proj?: StockProjection }[],
  weighting: "equal" | "mcap" | "custom",
  weights?: Record<string, number> | null,
): BasketCaseReturns {
  // Custom weights that don't add up to anything fall back to equal weight.
  const custom = weighting === "custom" && stocks.some((s) => (weights?.[s.ticker] ?? 0) > 0);
  const w = custom ? new Map(stocks.map((s) => [s.ticker, weights?.[s.ticker] ?? 0])) : basketWeights(stocks, weighting === "mcap" ? "mcap" : "equal");
  const items = stocks.map((s) => ({ ticker: s.ticker, weight: w.get(s.ticker) ?? 0, proj: s.proj }));
  const out = {} as BasketCaseReturns;
  for (const h of [1, 2] as const)
    out[`${h}`] = SCENARIOS.map((scenario) => {
      const r = projectBasket(items, { h, scenario }).ret;
      return r == null ? null : Math.round(r * 1e4) / 1e4;
    }) as [number | null, number | null, number | null];
  return out;
}
