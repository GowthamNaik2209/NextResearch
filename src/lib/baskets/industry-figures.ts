// The Baskets page's industry table, worked out on the server: each industry basket's 1Y return,
// deepest fall and lead over the Nifty 50, from the same cached backtests and Nifty series the
// basket pages fetch through the API. So the table renders with its figures (instead of running a
// dozen backtests in the browser after the page shows) and reads the same as the basket page.
// Kept in Next's shared data cache for an hour, so a visit doesn't wait for the backtests.
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { basketSymbolChart, PRICES_TAG, priceStorePaused } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIndustryBaskets } from "./industry";
import { backtestBasket, pricesPending } from "./run";
import { heldStrategy } from "./strategy";
import { benchPeriodRet, periodFigures } from "./periods";
import type { BasketFigures } from "./stats";
import type { PricePoint } from "./backtest";

const RANGE = "1Y" as const;
// Industries backtested at once; each fetches up to 8 price histories at a time.
const CONCURRENCY = 3;
// How long the page waits for the shared cache. A hit answers in milliseconds; on a miss (the
// first visit after a deploy) the page goes out without figures, the browser fetches them as
// it always could, and the server keeps working so the cache is filled for every later visit.
const WAIT_MS = 1_500;
// The Nifty line is re-checked hourly (a stale copy is served while a fresh one is worked out); each
// industry's figures are kept per the Nifty's last close (cachedFigure).
const REVALIDATE_SECONDS = 3_600;

export type IndustryFigures = {
  /** By industry slug. */
  figs: Record<string, BasketFigures>;
  /** The Nifty 50's 1Y return over the period's window (periods.ts benchPeriodRet): every row's lead is measured against it. */
  benchRet: number | null;
};

// Each industry's figures, and the Nifty's, kept separately in Next's shared data cache (every
// server instance reads it; the backtests' own cache is per instance, and Vercel starts fresh ones
// often). Kept one by one, so a run cut short still keeps the industries it finished and the next
// visit carries on from there. An error (no prices) is never cached: the next visit tries again.
const cachedBench = unstable_cache(
  async (): Promise<PricePoint[]> => {
    const pts = (await basketSymbolChart(BENCHMARKS.nifty50.symbol, RANGE))?.points;
    if (!pts?.length) throw new Error("no Nifty 50 series");
    return pts;
  },
  ["industry-figures-bench-1y-v2"],
  // The daily price top-up expires it with the figures (cachedFigure), so both move to the new close together.
  { revalidate: REVALIDATE_SECONDS, tags: [PRICES_TAG] },
);
/** `forTheDay`: the figure will be kept until the next close, so only one worked out wholly from the stored prices will do. */
async function figureOf(slug: string, forTheDay = false): Promise<BasketFigures> {
  const b = listIndustryBaskets().find((x) => x.slug === slug);
  if (!b?.stocks.length) throw new Error(`no stocks in ${slug}`);
  if (forTheDay && priceStorePaused()) throw new Error(`price store pausing: ${slug} not kept`);
  const [bt, bench] = await Promise.all([backtestBasket(b.stocks.map((s) => s.ticker), RANGE, heldStrategy()), cachedBench().catch(() => null)]);
  // Not kept with a stock's prices still loading (Yahoo slow): that would be a different basket's figure all day.
  if (pricesPending(bt)) throw new Error(`prices still loading for ${slug}`);
  // Nor with Yahoo's prices standing in for the store's (a pause began mid-run), or with no Nifty to lead.
  if (forTheDay && (priceStorePaused() || !bench)) throw new Error(`stored prices missing: ${slug} not kept`);
  // Over the period's fixed window, against the Nifty's change over it (periods.ts), as every table and card measures it.
  const fig = bt.points.length ? periodFigures(bt.points, bench, RANGE) : null;
  if (!fig) throw new Error(`no backtest for ${slug}`);
  return fig;
}
// Keyed by the Nifty 50's last close (the backtests end on it), so a new trading day is a new
// entry, worked out on the visit that asks for it, and an error there reaches only industryFigures
// (which leaves that row to the browser). Never refreshed on a clock: a refresh in the background
// that hit a stock still loading was logged by Next as an error every hour (and would be every
// weekend day with a day's clock), for figures that move only with each day's closes. The daily
// price top-up expires PRICES_TAG; the next close is a new key anyway.
const cachedFigure = unstable_cache(
  async (asOf: string, slug: string): Promise<BasketFigures> => figureOf(slug, true),
  // v5: kept per last close (v4 refreshed hourly).
  ["industry-figures-1y-v5"],
  { revalidate: false, tags: [PRICES_TAG] },
);

export async function industryFigures(): Promise<IndustryFigures> {
  const out: IndustryFigures = { figs: {}, benchRet: null };
  const queue = listIndustryBaskets().filter((b) => b.stocks.length).map((b) => b.slug);
  const work = cachedBench()
    .catch(() => null)
    .then(async (pts) => {
      if (pts) out.benchRet = benchPeriodRet(pts, RANGE);
      // No Nifty series (store and Yahoo both down): worked out without the shared cache, so no day keeps it.
      const asOf = pts?.[pts.length - 1]?.t;
      const figure = (slug: string) => (asOf ? cachedFigure(asOf, slug) : figureOf(slug));
      // A few at a time: a cached industry answers at once, one that isn't fetches up to 8 price histories.
      await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          for (let slug = queue.shift(); slug; slug = queue.shift()) {
            const fig = await figure(slug).catch(() => null);
            if (fig) out.figs[slug] = fig;
          }
        }),
      );
    });
  const done = await Promise.race([work.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), WAIT_MS))]);
  // Not all there yet: the page goes with what it has (the browser fetches the rest) and the
  // server keeps filling the cache for the next visit.
  if (!done)
    try {
      after(() => work);
    } catch {
      // Outside a request (a build): nothing to keep alive.
    }
  // A copy: the work may still be filling `out`.
  return { figs: { ...out.figs }, benchRet: out.benchRet };
}
