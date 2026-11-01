// The stored period figures (BasketReturn): each industry & policy basket's return, deepest fall
// and lead over the Nifty 50 for every period of the Baskets page's menu (periods.ts), so the
// heatmap and table switch periods at once instead of running a dozen backtests in the browser.
// Filled after the price store's daily top-up (src/app/api/prices/refresh, and by hand with
// scripts/refresh-basket-returns.ts) from the same backtests the API serves: four per basket (1M,
// 6M, 1Y, 3Y), the shorter periods cut from them. Server side only.
import type { PrismaClient } from "@/generated/prisma/client";
import { basketSymbolChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import { listIndustryBaskets } from "./industry";
import { PERIODS, PERIOD_SRC, isPeriod, periodFigures, type Period } from "./periods";
import { backtestBasket, pricesPending } from "./run";
import type { BasketFigures } from "./stats";
import { heldStrategy } from "./strategy";

const RANGES: ChartRange[] = [...new Set(PERIODS.map((p) => PERIOD_SRC[p].range))];
// Baskets backtested at once; each reads up to 8 price histories at a time.
const CONCURRENCY = 3;
// Rounds over the backtests a run skipped.
const PASSES = 3;
// Older than this and the stored figures are left out (the cron has stopped): the page falls back
// to backtesting in the browser rather than show last week's numbers as today's.
const STALE_MS = 4 * 86_400_000;

export type BasketReturnsResult = { baskets: number; rows: number; skipped: string[] };

/** Works out every industry basket's figures for every period and writes them (upserts; baskets no longer listed are removed). */
export async function refreshBasketReturns(
  prisma: PrismaClient,
  opts: { deadline?: number; concurrency?: number; log?: (m: string) => void } = {},
): Promise<BasketReturnsResult> {
  const log = opts.log ?? (() => {});
  const baskets = listIndustryBaskets().filter((b) => b.stocks.length);
  const bench = new Map<ChartRange, PricePoint[] | null>();
  for (const r of RANGES) bench.set(r, (await basketSymbolChart(BENCHMARKS.nifty50.symbol, r).catch(() => null))?.points ?? null);

  const rows: { slug: string; period: Period; ret: number; maxDd: number; vs: number | null; asOf: Date }[] = [];
  // One backtest per basket and range. A stock's prices still loading (a slow store read or Yahoo)
  // skips that backtest; skipped ones are tried again, with the prices fetched so far now cached.
  let todo = baskets.flatMap((b) => RANGES.map((range) => ({ b, range })));
  for (let pass = 0; pass < PASSES && todo.length; pass++) {
    const queue = [...todo];
    const again: typeof todo = [];
    await Promise.all(
      Array.from({ length: opts.concurrency ?? CONCURRENCY }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const { b, range } = job;
          if (opts.deadline && Date.now() > opts.deadline) {
            again.push(job);
            continue;
          }
          const bt = await backtestBasket(b.stocks.map((s) => s.ticker), range, heldStrategy()).catch(() => null);
          // Not kept with a stock's prices still loading: that would be a different basket's figure.
          if (!bt?.points.length || pricesPending(bt)) {
            again.push(job);
            continue;
          }
          const asOf = new Date(`${bt.points[bt.points.length - 1].t}T00:00:00Z`);
          for (const period of PERIODS.filter((p) => PERIOD_SRC[p].range === range)) {
            const f = periodFigures(bt.points, bench.get(range) ?? null, period);
            if (f && Number.isFinite(f.ret)) rows.push({ slug: b.slug, period, ret: f.ret, maxDd: f.maxDd, vs: f.vs, asOf });
          }
          log(`  ${b.slug} ${range}`);
        }
      }),
    );
    todo = again;
  }
  const skipped = todo.map(({ b, range }) => `${b.slug} ${range}`);

  // Upserts a few at a time, not one transaction: a long batch can't start on the busy pooler, and
  // each row stands on its own (a run cut short leaves the rest at their last figures).
  await prisma.basketReturn.deleteMany({ where: { slug: { notIn: baskets.map((b) => b.slug) } } });
  for (let i = 0; i < rows.length; i += 10)
    await Promise.all(
      rows.slice(i, i + 10).map(({ slug, period, ...data }) =>
        prisma.basketReturn.upsert({ where: { slug_period: { slug, period } }, create: { slug, period, ...data }, update: data }),
      ),
    );
  return { baskets: baskets.length, rows: rows.length, skipped };
}

/** The stored figures by period, then industry slug. Empty when the table is missing, empty or stale. */
export async function readBasketReturns(prisma: PrismaClient): Promise<Partial<Record<Period, Record<string, BasketFigures>>>> {
  const out: Partial<Record<Period, Record<string, BasketFigures>>> = {};
  let rows: { slug: string; period: string; ret: number; maxDd: number; vs: number | null }[] = [];
  // Never takes the page down: without the table (not migrated yet) the browser backtests as before.
  try {
    rows = await prisma.basketReturn.findMany({ where: { updatedAt: { gte: new Date(Date.now() - STALE_MS) } } });
  } catch (e) {
    console.error("[baskets] reading stored period figures failed", e);
  }
  for (const r of rows) {
    if (!isPeriod(r.period)) continue;
    (out[r.period] ??= {})[r.slug] = { ret: r.ret, maxDd: r.maxDd, vs: r.vs };
  }
  return out;
}
