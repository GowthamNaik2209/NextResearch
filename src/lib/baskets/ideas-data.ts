// Server side of the basket ideas: each listed stock's five-year closes, turned into the day's
// price facts and run through the idea rules (ideas.ts). The result is kept in Next's data cache,
// shared by every server instance, and rebuilt in the background a few hours after it was made,
// so the lists follow each trading day without a visitor waiting on ~260 price histories.
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { listSectors, companyLinkKey, companyLinkExposure, findSupplierByTicker, strengthPoints } from "@/lib/sector-content";
import { HISTORY_FROM, getChartWithFallback, getSymbolChart } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listBasketUniverse } from "./industry";
import { ensureFinancials } from "@/lib/financials/load";
import { backtestBasket } from "./run";
import { heldStrategy } from "./strategy";
import { detectOutlier } from "./outliers";
import { buildIdeas, priceStat, withBacktestReturns, type Idea, type IdeaBacktest, type IdeaStockInfo, type PriceSnapshot, type PriceStat } from "./ideas";

const CONCURRENCY = 10;
// Below this share of stocks with prices the day's run is treated as an upstream outage: it
// throws, so the cache keeps serving the last good lists instead of thin ones.
const MIN_COVERAGE = 0.6;
// Rule-based baskets are re-ranked once a day (owner's call, Oct 2026): the lists, and the cards'
// figures with them, are worked out once and served from the shared cache until the next day.
const REVALIDATE_SECONDS = 24 * 60 * 60;

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
    // The company table's snapshot (kpi is [pe, bookValue, divYield, roce, roe, faceValue]).
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      ticker: st.ticker,
      name: st.name,
      mcapCr: st.mcapCr,
      roce: num(f?.kpi?.[3]),
      pe: num(f?.kpi?.[0]),
      book: num(f?.kpi?.[1]),
      rev: f?.rev ?? undefined,
      np: f?.np ?? undefined,
      outlier: !!detectOutlier(f),
      trust: /\b(REIT|InvIT)\b|Trust\b/i.test(st.name),
      // Industries only: a policy map (PLI, ALMM) isn't another industry the company sells into.
      industries: st.industries.filter((i) => !policySlugs.has(i.slug)).length,
      policies: st.industries.filter((i) => policySlugs.has(i.slug)).length,
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

/** The day's ideas, from the shared cache (rebuilt in the background once a day). */
export const getIdeas = unstable_cache(
  async (): Promise<IdeasPayload> => {
    await ensureFinancials();
    const snap = await priceSnapshot();
    return { asOf: snap.asOf, ideas: buildIdeas(ideaStockInfo(), snap, Date.parse(snap.asOf)) };
  },
  // v11: Highest ROCE needs a profit and positive book value (roceMeaningful), and Turnarounds'
  // card line was reworded, so cached v10 lists aren't served.
  ["basket-ideas-v11"],
  { revalidate: REVALIDATE_SECONDS, tags: ["basket-ideas"] },
);

/** One idea, with its card's figures and order (its page lists the stocks as the card does). */
export async function getIdea(id: string): Promise<{ asOf: string; idea: Idea } | null> {
  const { asOf, ideas } = await getIdeas();
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return null;
  // Its own backtest, as before (cached per server for minutes). Reading the cards' shared daily
  // cache from the page render hung on Vercel (every idea page timed out), so the page doesn't.
  const bt = await ideaBacktest(idea);
  const [withRet] = withBacktestReturns([idea], { [idea.id]: bt });
  return { asOf, idea: withRet };
}

// Backtests run at once while the cards' figures load (each fetches up to 8 price histories at a time).
const BACKTEST_CONCURRENCY = 3;

/**
 * Each idea's card figure, from the backtest its page runs (same function, range and weighting:
 * equal, held), worked out once a day and kept per idea in the shared cache (keyed by the lists'
 * date and the idea), so every visit and every server instance reads it at once. They used to run
 * on every request, and all of them together can outlast a request's 60s on a cold server; one by
 * one, a run cut short keeps the ideas it finished. A failed backtest isn't kept.
 */
const ideaFigure = unstable_cache(
  async (asOf: string, id: string): Promise<IdeaBacktest> => {
    const { ideas } = await getIdeas();
    const idea = ideas.find((i) => i.id === id);
    const bt = idea ? await ideaBacktest(idea) : null;
    if (!bt) throw new Error(`no backtest for idea ${id} (${asOf})`);
    return bt;
  },
  ["basket-ideas-backtest-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["basket-ideas"] },
);
const dailyBacktest = (asOf: string, id: string) => ideaFigure(asOf, id).catch(() => null);

// How long the cards wait for figures not cached yet; the rest come on the next visit.
const CARDS_WAIT_MS = 8_000;

/** The day's ideas with each card's figure (see ideaFigure); `complete` is false while some are still being worked out. */
export async function getIdeasWithReturns(): Promise<IdeasPayload & { complete: boolean }> {
  const { asOf, ideas } = await getIdeas();
  const got: Record<string, IdeaBacktest | null> = {};
  const queue = ideas.map((i) => i.id);
  const work = Promise.all(
    Array.from({ length: BACKTEST_CONCURRENCY }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) got[id] = await dailyBacktest(asOf, id);
    }),
  );
  const done = await Promise.race([work.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), CARDS_WAIT_MS))]);
  if (!done)
    try {
      after(() => work);
    } catch {
      // Outside a request: nothing to keep alive.
    }
  return { asOf, ideas: withBacktestReturns(ideas, { ...got }), complete: done && ideas.every((i) => got[i.id]) };
}

async function ideaBacktest(idea: Idea): Promise<IdeaBacktest | null> {
  const bt = await backtestBasket(
    idea.stocks.map((s) => s.ticker),
    idea.range,
    heldStrategy(),
    { joinLate: !!idea.joinAtListing },
  ).catch(() => null);
  const pts = bt?.points ?? [];
  // Measured as the page's return card measures the same series.
  return pts.length < 2 ? null : { ret: (pts[pts.length - 1].c / pts[0].c - 1) * 100, holdings: bt!.holdings };
}
