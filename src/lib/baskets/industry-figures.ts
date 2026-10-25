// The Baskets page's industry table, worked out on the server: each industry basket's 1Y return,
// deepest fall and lead over the Nifty 50, from the same cached backtests and Nifty series the
// basket pages fetch through the API. So the table renders with its figures (instead of running a
// dozen backtests in the browser after the page shows) and reads the same as the basket page.
// Kept in Next's shared data cache for an hour, so a visit doesn't wait for the backtests.
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { basketSymbolChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIndustryBaskets } from "./industry";
import { backtestBasket, pricesPending } from "./run";
import { heldStrategy } from "./strategy";
import { basketFigures, seriesStats, type BasketFigures } from "./stats";
import type { PricePoint } from "./backtest";

const RANGE = "1Y" as const;
// Industries backtested at once; each fetches up to 8 price histories at a time.
const CONCURRENCY = 3;
// How long the page waits for the shared cache. A hit answers in milliseconds; on a miss (the
// first visit after a deploy) the page goes out without figures, the browser fetches them as
// it always could, and the server keeps working so the cache is filled for every later visit.
const WAIT_MS = 1_500;
// The figures move with each day's closes: an hour old is fine, and a stale copy is served while
// a fresh one is worked out.
const REVALIDATE_SECONDS = 3_600;

export type IndustryFigures = {
  /** By industry slug. */
  figs: Record<string, BasketFigures>;
  /** The Nifty 50's own 1Y return (first to last close of its series). */
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
  ["industry-figures-bench-1y-v1"],
  { revalidate: REVALIDATE_SECONDS },
);
const cachedFigure = unstable_cache(
  async (slug: string): Promise<BasketFigures> => {
    const b = listIndustryBaskets().find((x) => x.slug === slug);
    if (!b?.stocks.length) throw new Error(`no stocks in ${slug}`);
    const [bt, bench] = await Promise.all([backtestBasket(b.stocks.map((s) => s.ticker), RANGE, heldStrategy()), cachedBench().catch(() => null)]);
    // Not kept with a stock's prices still loading (Yahoo slow): that would be a different basket's figure all day.
    if (pricesPending(bt)) throw new Error(`prices still loading for ${slug}`);
    const fig = bt.points.length ? basketFigures(bt.points, bench) : null;
    if (!fig) throw new Error(`no backtest for ${slug}`);
    return fig;
  },
  ["industry-figures-1y-v2"],
  { revalidate: REVALIDATE_SECONDS },
);

export async function industryFigures(): Promise<IndustryFigures> {
  const out: IndustryFigures = { figs: {}, benchRet: null };
  const queue = listIndustryBaskets().filter((b) => b.stocks.length).map((b) => b.slug);
  const work = Promise.all([
    cachedBench()
      .then((pts) => void (out.benchRet = seriesStats(pts)?.ret ?? null))
      .catch(() => {}),
    // A few at a time: a cached industry answers at once, one that isn't fetches up to 8 price histories.
    ...Array.from({ length: CONCURRENCY }, async () => {
      for (let slug = queue.shift(); slug; slug = queue.shift()) {
        const fig = await cachedFigure(slug).catch(() => null);
        if (fig) out.figs[slug] = fig;
      }
    }),
  ]);
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
