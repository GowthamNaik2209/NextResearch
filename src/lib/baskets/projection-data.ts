// Server side of basket projections: each stock's projection from the company table (the same
// figures shown everywhere), its home industry's median multiples, and every industry basket's
// projected return (the chart's "Compare with" lines). Rebuilt whenever new figures are installed.
import { companyFinancials, getSector, listSectors, parseCrore, tickerForSupplier } from "@/lib/sector-content";
import { memoByFinancials } from "@/lib/financials/store";
import { detectOutlier } from "./outliers";
import { compactProjection, median, projectStock, SCENARIOS, type CaseReturns, type ProjectionInput, type StockProjection } from "./projection";
import { projectBasket } from "./projection-basket";
import { basketWeights } from "./backtest";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** An industry's median P/E (profitable companies) and price to sales, over every listed company it maps. */
const industryMultiples = memoByFinancials(() => {
  const out = new Map<string, { pe: number | null; ps: number | null }>();
  for (const s of listSectors()) {
    const pes: number[] = [];
    const pss: number[] = [];
    const seen = new Set<string>();
    for (const sup of Object.values(s.suppliers)) {
      const f = sup.f;
      if (!sup.listed || !f) continue;
      const t = tickerForSupplier(sup);
      if (seen.has(t)) continue;
      seen.add(t);
      const pe = num(f.kpi?.[0]);
      if (pe != null && pe > 0) pes.push(pe);
      const mcap = parseCrore(f.mcap);
      const rev = num(f.rev?.[f.rev.length - 1]);
      if (mcap != null && mcap > 0 && rev != null && rev > 0) pss.push(mcap / rev);
    }
    out.set(s.slug, { pe: median(pes), ps: median(pss) });
  }
  return out;
});

const projCache = memoByFinancials(() => new Map<string, StockProjection>());

/** A stock's model inputs from the company table, judged against its home industry; null when it has no figures. */
export function projectionInputFor(ticker: string, homeSlug: string | null): ProjectionInput | null {
  const f = companyFinancials(ticker);
  if (!f) return null;
  const out = detectOutlier(f);
  const m = out ? /^FY(\d\d)$/.exec(out.year) : null;
  const pe = num(f.kpi?.[0]);
  return {
    rev: f.rev ?? [],
    np: f.np ?? [],
    price: parseCrore(f.price),
    mcapCr: parseCrore(f.mcap),
    pe: pe != null && pe > 0 ? pe : null,
    cagr: f.cagr ?? null,
    asOf: f.asOf,
    oneOffIndex: m ? Number(m[1]) - 22 : null,
    industry: (homeSlug && getSector(homeSlug) ? industryMultiples().get(homeSlug) : null) ?? { pe: null, ps: null },
  };
}

/** A stock's projection, judged against its home industry (where its company page places it). */
export function projectionFor(ticker: string, homeSlug: string | null): StockProjection {
  const c = projCache();
  const key = `${ticker}|${homeSlug ?? ""}`;
  const hit = c.get(key);
  if (hit) return hit;
  const input = projectionInputFor(ticker, homeSlug);
  const p: StockProjection = input ? compactProjection(projectStock(input)) : { ok: false, years: 0, reason: "No figures in our last data update" };
  c.set(key, p);
  return p;
}

/** A basket's projected return for every horizon, case and exit (null where nothing is projected). */
export type BasketCaseReturns = Record<keyof CaseReturns, Record<"1" | "2", [number | null, number | null, number | null]>>;

/** Every case for a list of stocks at a weighting (the compared industry baskets). */
export function basketCases(stocks: { ticker: string; mcapCr: number | null; proj?: StockProjection }[], weighting: "equal" | "mcap"): BasketCaseReturns {
  const w = basketWeights(stocks, weighting);
  const items = stocks.map((s) => ({ ticker: s.ticker, weight: w.get(s.ticker) ?? 0, proj: s.proj }));
  const out = { own: {}, ind: {} } as BasketCaseReturns;
  for (const exit of ["own", "ind"] as const)
    for (const h of [1, 2] as const)
      out[exit][`${h}`] = SCENARIOS.map((scenario) => {
        const r = projectBasket(items, { h, scenario, exit }).ret;
        return r == null ? null : Math.round(r * 1e4) / 1e4;
      }) as [number | null, number | null, number | null];
  return out;
}
