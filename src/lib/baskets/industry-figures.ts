// The Baskets page's industry table, worked out on the server: each industry basket's 1Y return,
// deepest fall and lead over the Nifty 50, from the same cached backtests and Nifty series the
// basket pages fetch through the API. So the table renders with its figures (instead of running a
// dozen backtests in the browser after the page shows) and reads the same as the basket page.
// Kept in Next's shared data cache for an hour, so a visit doesn't wait for the backtests.
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { getSymbolChart } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIndustryBaskets } from "./industry";
import { backtestBasket } from "./run";
import { heldStrategy } from "./strategy";
import { basketFigures, seriesStats, type BasketFigures } from "./stats";

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

async function computeFigures(): Promise<IndustryFigures> {
  const out: IndustryFigures = { figs: {}, benchRet: null };
  const bench = (await getSymbolChart(BENCHMARKS.nifty50.symbol, RANGE).catch(() => null))?.points ?? null;
  out.benchRet = bench ? (seriesStats(bench)?.ret ?? null) : null;
  const baskets = listIndustryBaskets().filter((b) => b.stocks.length);
  const queue = baskets.map((b) => b.slug);
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let slug = queue.shift(); slug; slug = queue.shift()) {
        const b = baskets.find((x) => x.slug === slug)!;
        const bt = await backtestBasket(
          b.stocks.map((s) => s.ticker),
          RANGE,
          heldStrategy(),
        ).catch(() => null);
        const fig = bt?.points.length ? basketFigures(bt.points, bench) : null;
        if (fig) out.figs[slug] = fig;
      }
    }),
  );
  // A run where the price source mostly failed isn't kept: an error is never cached, so the next
  // visit tries again rather than every visit for an hour showing blanks.
  if (Object.keys(out.figs).length < baskets.length / 2) throw new Error(`only ${Object.keys(out.figs).length} of ${baskets.length} industries backtested`);
  return out;
}

// Shared by every server instance (Next's data cache), unlike the backtests' in-memory cache:
// Vercel starts fresh instances often, and each used to redo every industry's backtest (about 6s).
const cachedFigures = unstable_cache(computeFigures, ["industry-figures-1y-v1"], { revalidate: REVALIDATE_SECONDS });

export async function industryFigures(): Promise<IndustryFigures> {
  const work = cachedFigures();
  const got = await Promise.race([work.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), WAIT_MS))]);
  if (got) return got;
  // Still working: the page goes without, and the server finishes so the cache is filled.
  try {
    after(() => work.catch((e) => console.error("[baskets] industry figures failed", e)));
  } catch {
    // Outside a request (a build): nothing to keep alive.
  }
  return { figs: {}, benchRet: null };
}
