// The Baskets page's industry table, worked out on the server: each industry basket's 1Y return,
// deepest fall and lead over the Nifty 50, from the same cached backtests and Nifty series the
// basket pages fetch through the API. So the table renders with its figures (instead of running a
// dozen backtests in the browser after the page shows) and reads the same as the basket page.
import { getSymbolChart } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIndustryBaskets } from "./industry";
import { backtestBasket } from "./run";
import { heldStrategy } from "./strategy";
import { basketFigures, seriesStats, type BasketFigures } from "./stats";

const RANGE = "1Y" as const;
// Industries backtested at once; each fetches up to 8 price histories at a time.
const CONCURRENCY = 3;
// A cold server (no price histories cached yet) can't finish every industry quickly. Past this,
// the page goes out with the figures it has, the browser fetches the rest, and the server keeps
// working so the next visit has them cached.
const BUDGET_MS = 6_000;

export type IndustryFigures = {
  /** By industry slug. */
  figs: Record<string, BasketFigures>;
  /** The Nifty 50's own 1Y return (first to last close of its series). */
  benchRet: number | null;
};

export async function industryFigures(): Promise<IndustryFigures> {
  const out: IndustryFigures = { figs: {}, benchRet: null };
  const nifty = getSymbolChart(BENCHMARKS.nifty50.symbol, RANGE).catch(() => null);
  const work = (async () => {
    const bench = (await nifty)?.points ?? null;
    out.benchRet = bench ? (seriesStats(bench)?.ret ?? null) : null;
    const queue = listIndustryBaskets().map((b) => b.slug);
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let slug = queue.shift(); slug; slug = queue.shift()) {
          const b = listIndustryBaskets().find((x) => x.slug === slug);
          if (!b?.stocks.length) continue;
          const bt = await backtestBasket(
            b.stocks.map((s) => s.ticker),
            RANGE,
            heldStrategy(),
            new Map(b.stocks.map((s) => [s.ticker, s.layer])),
          ).catch(() => null);
          const fig = bt?.points.length ? basketFigures(bt.points, bench) : null;
          if (fig) out.figs[slug] = fig;
        }
      }),
    );
  })().catch((e) => console.error("[baskets] industry figures failed", e));
  await Promise.race([work, new Promise((r) => setTimeout(r, BUDGET_MS))]);
  // A copy: the work may still be filling `out` after the budget ran out.
  return { figs: { ...out.figs }, benchRet: out.benchRet };
}
