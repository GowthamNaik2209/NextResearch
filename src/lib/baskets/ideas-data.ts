// Server side of the basket ideas: each listed stock's five-year closes, turned into the day's
// price facts and run through the idea rules (ideas.ts). The result is kept in Next's data cache,
// shared by every server instance, and rebuilt in the background a few hours after it was made,
// so the lists follow each trading day without a visitor waiting on ~260 price histories.
import { unstable_cache } from "next/cache";
import { listSectors, companyLinkKey, companyLinkExposure, findSupplierByTicker, strengthPoints } from "@/lib/sector-content";
import { HISTORY_FROM, getChartWithFallback, getSymbolChart } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listBasketUniverse } from "./industry";
import { ensureFinancials } from "@/lib/financials/load";
import { backtestBasket } from "./run";
import { heldStrategy } from "./strategy";
import { buildIdeas, priceStat, withBacktestReturns, type Idea, type IdeaBacktest, type IdeaStockInfo, type PriceSnapshot, type PriceStat } from "./ideas";

const CONCURRENCY = 10;
// Below this share of stocks with prices the day's run is treated as an upstream outage: it
// throws, so the cache keeps serving the last good lists instead of thin ones.
const MIN_COVERAGE = 0.6;
const REVALIDATE_SECONDS = 4 * 60 * 60;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** What the rules need from the maps, per listed stock. */
export function ideaStockInfo(): IdeaStockInfo[] {
  // Each stock's strongest place in a layer with only one or two listed suppliers.
  const scarce = new Map<string, NonNullable<IdeaStockInfo["scarce"]>>();
  for (const s of listSectors().filter((x) => !x.muted)) {
    for (const z of s.zones) {
      const listed = new Map<string, number>();
      for (const link of z.suppliers) {
        const t = s.suppliers[companyLinkKey(link)]?.listed ? s.suppliers[companyLinkKey(link)]?.f?.ticker : undefined;
        if (!t) continue;
        // The site's one link-strength scale (a link with no rating counts as high, as everywhere else).
        listed.set(t, Math.max(listed.get(t) ?? 0, strengthPoints(companyLinkExposure(link).exposureStrength)));
      }
      if (listed.size === 0 || listed.size > 2) continue;
      for (const [t, strength] of listed) {
        if (strength < 2) continue;
        const prev = scarce.get(t);
        if (!prev || listed.size < prev.listed || (listed.size === prev.listed && strength > prev.strength)) {
          scarce.set(t, { listed: listed.size, strength, layer: z.label, industry: s.name });
        }
      }
    }
  }
  const policySlugs = new Set(listSectors().filter((x) => x.category === "policy").map((x) => x.slug));
  return listBasketUniverse().map((st) => {
    const f = findSupplierByTicker(st.ticker)?.f;
    const roce = f?.kpi?.[3];
    return {
      ticker: st.ticker,
      name: st.name,
      mcapCr: st.mcapCr,
      roce: typeof roce === "number" && Number.isFinite(roce) ? roce : null,
      screenOut: f?.screenOut,
      // Industries only: a policy map (PLI, ALMM) isn't another industry the company sells into.
      industries: st.industries.filter((i) => !policySlugs.has(i.slug)).length,
      notIpo: /\b(REIT|InvIT)\b|Trust\b/i.test(st.name) || st.ticker in HISTORY_FROM,
      scarce: scarce.get(st.ticker) ?? null,
    };
  });
}

async function priceSnapshot(): Promise<PriceSnapshot> {
  const tickers = listBasketUniverse().map((s) => s.ticker);
  const now = Date.now();
  const charts = await mapLimit(tickers, CONCURRENCY, (t) => getChartWithFallback(t, "5Y").catch(() => null));
  const stats: Record<string, PriceStat> = {};
  tickers.forEach((t, i) => {
    const st = charts[i] ? priceStat(charts[i]!.points, now) : null;
    if (st) stats[t] = st;
  });
  if (Object.keys(stats).length < tickers.length * MIN_COVERAGE) throw new Error(`basket ideas: prices for only ${Object.keys(stats).length} of ${tickers.length} stocks`);
  return { asOf: (await lastTradingDay()) ?? new Date(now).toISOString(), stats };
}

/**
 * The day of the latest close the lists were ranked on (the Nifty 50's last daily bar), not the
 * hour the lists were built: a rebuild after midnight on yesterday's closes still says yesterday.
 */
async function lastTradingDay(): Promise<string | null> {
  const pts = (await getSymbolChart(BENCHMARKS.nifty50.symbol, "1M").catch(() => null))?.points;
  return pts?.length ? pts[pts.length - 1].t : null;
}

export type IdeasPayload = { asOf: string; ideas: Idea[] };

/** The day's ideas, from the shared cache (rebuilt in the background once it is a few hours old). */
export const getIdeas = unstable_cache(
  async (): Promise<IdeasPayload> => {
    await ensureFinancials();
    const snap = await priceSnapshot();
    return { asOf: snap.asOf, ideas: buildIdeas(ideaStockInfo(), snap, Date.parse(snap.asOf)) };
  },
  ["basket-ideas-v6"],
  { revalidate: REVALIDATE_SECONDS, tags: ["basket-ideas"] },
);

/** One idea, with its card's figures and order (its page lists the stocks as the card does). */
export async function getIdea(id: string): Promise<{ asOf: string; idea: Idea } | null> {
  const { asOf, ideas } = await getIdeas();
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return null;
  const [withRet] = withBacktestReturns([idea], { [idea.id]: await ideaBacktest(idea) });
  return { asOf, idea: withRet };
}

// Backtests run at once while the cards' figures load (each fetches up to 8 price histories at a time).
const BACKTEST_CONCURRENCY = 3;

/**
 * The day's ideas with each card's figure from the backtest its page runs: the same function,
 * range and weighting (equal, held), so the same cache entry and the same number. Run per request
 * (the backtests cache for minutes), not inside the lists' four-hour cache, which would freeze the
 * card while the page moves with the day's prices.
 */
export async function getIdeasWithReturns(): Promise<IdeasPayload> {
  const { asOf, ideas } = await getIdeas();
  const results = await mapLimit(ideas, BACKTEST_CONCURRENCY, ideaBacktest);
  return { asOf, ideas: withBacktestReturns(ideas, Object.fromEntries(ideas.map((i, k) => [i.id, results[k]]))) };
}

async function ideaBacktest(idea: Idea): Promise<IdeaBacktest | null> {
  const bt = await backtestBasket(
    idea.stocks.map((s) => s.ticker),
    idea.range,
    heldStrategy(),
  ).catch(() => null);
  const pts = bt?.points ?? [];
  // Measured as the page's return card measures the same series.
  return pts.length < 2 ? null : { ret: (pts[pts.length - 1].c / pts[0].c - 1) * 100, holdings: bt!.holdings };
}
