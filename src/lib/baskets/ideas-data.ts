// Server side of the basket ideas: each listed stock's five-year closes, turned into the day's
// price facts and run through the idea rules (ideas.ts). The result is kept in Next's data cache,
// shared by every server instance, and rebuilt in the background a few hours after it was made,
// so the lists follow each trading day without a visitor waiting on ~260 price histories.
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { listSectors, companyLinkKey, companyLinkExposure, findSupplierByTicker, strengthPoints } from "@/lib/sector-content";
import { HISTORY_FROM } from "@/lib/live/yahoo";
import { basketChart, basketSymbolChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listBasketUniverse } from "./industry";
import { ensureFinancials } from "@/lib/financials/load";
import { backtestBasket, byDeadline, pricesPending } from "./run";
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
  // An index's industries hold every big company in them, not a scarce supplier: left out.
  for (const s of listSectors().filter((x) => !x.muted && x.category !== "index")) {
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
  const policySlugs = new Set(listSectors().filter((x) => x.category === "policy" || x.category === "index").map((x) => x.slug));
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
      // Industries only: a policy map (PLI, ALMM) or the Nifty 50 isn't another industry the company sells into.
      industries: st.industries.filter((i) => !policySlugs.has(i.slug)).length,
      policies: st.industries.filter((i) => policySlugs.has(i.slug)).length,
      notIpo: /\b(REIT|InvIT)\b|Trust\b/i.test(st.name) || st.ticker in HISTORY_FROM,
      scarce: scarce.get(st.ticker) ?? null,
    };
  });
}

// How long one build spends fetching histories. All ~260 at once can outlast the function's 60s
// (Yahoo slow or rate-limiting, Screener fallbacks), and a build cut off by the limit used to lose
// everything it had fetched, so every later visit started over and was cut off again (Vercel
// "Task timed out after 60 seconds" on the idea pages). Past this the build stops, the histories it
// has stay in the cache below, and the next visit carries on from there.
const SNAPSHOT_BUDGET_MS = 30_000;

/**
 * A stock's five-year closes for one trading day's lists, kept one by one in the shared cache
 * (every instance reads it). Keyed by the day, so a new day fetches afresh rather than serving
 * yesterday's copy. No prices is kept too (null), so a stock that fails doesn't cost every later
 * build another timeout (the lists leave it out, as they always did); it is re-asked after a few
 * hours in case it was a blip.
 */
const dayHistory = unstable_cache(
  // `day` is only part of the cache key.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (ticker: string, day: string): Promise<{ t: string; c: number }[] | null> => {
    const pts = (await basketChart(ticker, "5Y").catch(() => null))?.points;
    return pts && pts.length >= 2 ? pts : null;
  },
  ["basket-ideas-history-5y-v2"],
  { revalidate: 3 * 60 * 60 },
);

async function priceSnapshot(): Promise<PriceSnapshot> {
  const tickers = listBasketUniverse().map((s) => s.ticker);
  const now = Date.now();
  const asOf = (await lastTradingDay()) ?? new Date(now).toISOString();
  const day = asOf.slice(0, 10);
  const deadline = now + SNAPSHOT_BUDGET_MS;
  let cut = false;
  // A fetch still running at the deadline isn't waited for; it carries on and fills the cache.
  const charts = await mapLimit(tickers, CONCURRENCY, async (t) => {
    if (Date.now() >= deadline) {
      cut = true;
      return null;
    }
    // Still loading at the deadline isn't "no prices": the build is cut short.
    return byDeadline(dayHistory(t, day).catch(() => null), deadline, () => void (cut = true));
  });
  // Cut short: thrown, so the cache keeps serving the last full lists (none are built from part of
  // the stocks); the histories fetched so far are kept, and the next build finishes the rest.
  if (cut) throw new Error("basket ideas: price histories still loading, carrying on next visit");
  const stats: Record<string, PriceStat> = {};
  tickers.forEach((t, i) => {
    const st = charts[i] ? priceStat(charts[i]!, now) : null;
    if (st) stats[t] = st;
  });
  if (Object.keys(stats).length < tickers.length * MIN_COVERAGE) throw new Error(`basket ideas: prices for only ${Object.keys(stats).length} of ${tickers.length} stocks`);
  return { asOf, stats };
}

/**
 * The day of the latest close the lists were ranked on (the Nifty 50's last daily bar), not the
 * hour the lists were built: a rebuild after midnight on yesterday's closes still says yesterday.
 */
async function lastTradingDay(): Promise<string | null> {
  const pts = (await basketSymbolChart(BENCHMARKS.nifty50.symbol, "1M").catch(() => null))?.points;
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
    // Kept for the day only when no stock's prices were still loading (a slow Yahoo can leave some out).
    const bt = idea ? await ideaBacktest(idea, true) : null;
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

/** `complete`: null when a stock's prices were still loading, rather than a figure from the others. */
async function ideaBacktest(idea: Idea, complete = false): Promise<IdeaBacktest | null> {
  const bt = await backtestBasket(
    idea.stocks.map((s) => s.ticker),
    idea.range,
    heldStrategy(),
    { joinLate: !!idea.joinAtListing },
  ).catch(() => null);
  if (complete && bt && pricesPending(bt)) return null;
  const pts = bt?.points ?? [];
  // Measured as the page's return card measures the same series.
  return pts.length < 2 ? null : { ret: (pts[pts.length - 1].c / pts[0].c - 1) * 100, holdings: bt!.holdings };
}
