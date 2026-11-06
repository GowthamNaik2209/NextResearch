// Server side of the landing page's market block (components/landing/MarketPulse.tsx): the module
// tiles (sync, from the content), the period figures (the stored industry & policy basket returns
// the Baskets page's heatmap reads, the Nifty 50 and Sensex, FII / DII net per period) and the
// per-stock figures (each covered company's return for every period, from the price store, worked
// out once per trading day and kept in Next's shared cache). The two async loaders never reject and
// never hold the page for long: the block renders at once and streams them in, showing "updating"
// for whatever isn't ready.
import { unstable_cache } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/live/cache";
import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import { listSectors, findSupplierByTicker } from "@/lib/sector-content";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { basketChart, basketSymbolChart } from "@/lib/prices/store";
import { readBasketReturns } from "@/lib/baskets/basket-returns";
import { listBasketUniverse, listIndustryBaskets } from "@/lib/baskets/industry";
import { lastTradingDay } from "@/lib/baskets/ideas-data";
import { detectOutlier } from "@/lib/baskets/outliers";
import { PERIODS, PERIOD_SRC, benchPeriodRet, type Period } from "@/lib/baskets/periods";
import { rankMoversByFilter, shareUp, stockPeriodReturns, type MoverFilter, type MoverInput, type MoversByPeriod, type UpShare } from "@/lib/baskets/movers";
import { storedCashDays } from "@/lib/flows/query";
import { ensureFinancials } from "@/lib/financials/load";
import { pulseFlowSums, type PulseFlows, type PulseIndex } from "./pulse";

const RANGES: ChartRange[] = [...new Set(PERIODS.map((p) => PERIOD_SRC[p].range))];

// ---------------------------------------------------------------- tiles

export type MarketTile = { slug: string; name: string; category: "sector" | "policy"; count: number };

/**
 * Every live industry and policy with listed stocks (the index left out): industries, then
 * policies, each A to Z, so the map keeps its layout whatever the period. Tiles are one size:
 * sized by combined market cap, the conglomerates (Reliance, the big lenders) made a few policies
 * and Real Estate the biggest tiles, which read as a claim about the industries that isn't true.
 */
export function marketTiles(): MarketTile[] {
  return listIndustryBaskets()
    .filter((b) => (b.category === "sector" || b.category === "policy") && b.stocks.length)
    .map((b) => ({ slug: b.slug, name: b.name, category: b.category as "sector" | "policy", count: b.stocks.length }))
    .sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category === "sector" ? -1 : 1));
}

// ---------------------------------------------------------------- period figures

export type MarketFigures = {
  /** The latest close the figures run to (the Nifty 50's last daily bar), "YYYY-MM-DD". */
  asOf: string | null;
  /** Each module's equal-weight basket return, %, by period then slug (only periods stored and fresh). */
  byPeriod: Partial<Record<Period, Record<string, number>>>;
  indices: PulseIndex[];
  flows: PulseFlows | null;
};

const indexReturns = async (symbol: string): Promise<Partial<Record<Period, number>>> => {
  const charts = new Map<ChartRange, PricePoint[] | null>();
  await Promise.all(RANGES.map(async (r) => charts.set(r, (await basketSymbolChart(symbol, r).catch(() => null))?.points ?? null)));
  const out: Partial<Record<Period, number>> = {};
  for (const p of PERIODS) {
    const v = benchPeriodRet(charts.get(PERIOD_SRC[p].range) ?? null, p);
    if (v != null && Number.isFinite(v)) out[p] = v;
  }
  return out;
};

// The stored basket returns, read on every visit (one small query), so the tiles always show what
// the Baskets page shows: a copy cached here would lag its rebuild each evening.
async function storedReturns(): Promise<Partial<Record<Period, Record<string, number>>>> {
  const stored = await readBasketReturns(prisma);
  const out: Partial<Record<Period, Record<string, number>>> = {};
  for (const [p, bySlug] of Object.entries(stored) as [Period, Record<string, { ret: number }>][])
    out[p] = Object.fromEntries(Object.entries(bySlug).map(([slug, f]) => [slug, f.ret]));
  return out;
}

/** The heatmap's and pulse line's figures. Never rejects: what can't be read is left out. */
export async function getMarketFigures(): Promise<MarketFigures> {
  const asOf = (await lastTradingDay().catch(() => null))?.slice(0, 10) ?? null;
  const [byPeriod, nifty, sensex, cash] = await Promise.all([
    storedReturns().catch(() => ({})),
    cached(`landing:index:${BENCHMARKS.nifty50.symbol}:${asOf}`, 30 * 60_000, () => indexReturns(BENCHMARKS.nifty50.symbol)).catch(() => ({})),
    cached(`landing:index:${BENCHMARKS.sensex.symbol}:${asOf}`, 30 * 60_000, () => indexReturns(BENCHMARKS.sensex.symbol)).catch(() => ({})),
    // The sums per period, from the /updates view's days (its cache, which the flows cron expires): not
    // cached again here, so the line always reads the same days as the Market cash flows card.
    storedCashDays()
      .then((days) =>
        days ? pulseFlowSums(days.map((d) => ({ day: d.day.toISOString().slice(0, 10), fiiNetCr: d.fiiNetCr, diiNetCr: d.diiNetCr, diiSource: d.diiSource }))) : null,
      )
      .catch(() => null),
  ]);
  return {
    asOf,
    byPeriod,
    indices: [
      { name: BENCHMARKS.nifty50.name, ret: nifty },
      { name: BENCHMARKS.sensex.name, ret: sensex },
    ],
    flows: cash,
  };
}

// ---------------------------------------------------------------- per-stock figures

export type MarketStocks = {
  asOf: string;
  /** The movers under each of the block's filters (every covered stock, industry stocks only, policy stocks only). */
  movers: Record<MoverFilter, MoversByPeriod>;
  /** % of stocks up, by period then module slug. */
  up: Record<Period, Record<string, UpShare>>;
  /** Every covered company's name and return per period (PERIODS order, 2 dp, null where missing): the watchlist strip reads it. */
  stocks: Record<string, { n: string; r: (number | null)[] }>;
};

const benchCharts = (day: string) =>
  cached(`landing:bench:${day}`, 60 * 60_000, async () => {
    const out: Partial<Record<ChartRange, PricePoint[]>> = {};
    for (const r of RANGES) {
      const pts = (await basketSymbolChart(BENCHMARKS.nifty50.symbol, r).catch(() => null))?.points;
      // Without the benchmark the windows would differ stock to stock: not kept.
      if (!pts || pts.length < 2) throw new Error(`landing: no Nifty 50 ${r} closes`);
      out[r] = pts;
    }
    return out;
  });

/** One stock's returns for the trading day, kept per stock in the shared cache (a cut-short build keeps what it finished). */
const dayReturns = unstable_cache(
  async (ticker: string, day: string): Promise<Partial<Record<Period, number>>> => {
    const bench = await benchCharts(day);
    const charts: Partial<Record<ChartRange, PricePoint[] | null>> = {};
    for (const r of RANGES) charts[r] = (await basketChart(ticker, r).catch(() => null))?.points ?? null;
    return stockPeriodReturns(charts, bench);
  },
  ["landing-stock-returns-v3"],
  { revalidate: 3 * 60 * 60 },
);

const CONCURRENCY = 8;
// How long one build spends on the ~300 stocks; past it the build is dropped (not cached part-done)
// and the next visit carries on from the stocks already cached.
const BUILD_BUDGET_MS = 25_000;

/** What the movers need per covered company: its name, home industry (never the index), its live industry and policy, and why it is one-off (if it is). */
const oneOff = (ticker: string): { oneOff?: string } => {
  const o = detectOutlier(findSupplierByTicker(ticker)?.f);
  return o ? { oneOff: o.reason || `${o.year} results look one-off` } : {};
};

function moverUniverse(): Omit<MoverInput, "ret">[] {
  const category = new Map(listSectors().map((s) => [s.slug, s.category]));
  const live = new Map(listSectors().filter((s) => !s.muted).map((s) => [s.slug, s.category ?? "sector"]));
  return listBasketUniverse().map((st) => ({
    ticker: st.ticker,
    name: st.name,
    industry: (st.industries.find((i) => category.get(i.slug) !== "index") ?? st.industries[0])?.name ?? "",
    sector: st.industries.find((i) => live.get(i.slug) === "sector")?.name,
    policy: st.industries.find((i) => live.get(i.slug) === "policy")?.name,
    // The rule-based screens' one-off rule (ideas-data.ts ideaStockInfo): ranked all the same, with a tag.
    ...oneOff(st.ticker),
  }));
}

const buildStocks = unstable_cache(
  async (day: string): Promise<MarketStocks> => {
    await ensureFinancials();
    const universe = moverUniverse();
    const deadline = Date.now() + BUILD_BUDGET_MS;
    const rets: (Partial<Record<Period, number>> | null)[] = new Array(universe.length).fill(null);
    let next = 0;
    let cut = false;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (next < universe.length) {
          const i = next++;
          if (Date.now() > deadline) {
            cut = true;
            return;
          }
          rets[i] = await dayReturns(universe[i].ticker, day).catch(() => null);
        }
      }),
    );
    if (cut) throw new Error(`landing: stock returns for ${rets.filter(Boolean).length} of ${universe.length} so far, carrying on next visit`);
    const rows: MoverInput[] = universe.map((u, i) => ({ ...u, ret: rets[i] ?? {} }));
    const movers = rankMoversByFilter(rows);
    if (!movers.all["1D"]) throw new Error("landing: too few 1D returns to rank");
    const byTicker = Object.fromEntries(rows.map((r) => [r.ticker, r.ret]));
    const tiles = listIndustryBaskets()
      .filter((b) => b.category === "sector" || b.category === "policy")
      .map((b) => ({ slug: b.slug, tickers: b.stocks.map((s) => s.ticker) }));
    const stocks: MarketStocks["stocks"] = {};
    for (const r of rows) stocks[r.ticker] = { n: r.name, r: PERIODS.map((p) => (r.ret[p] != null ? Math.round(r.ret[p]! * 100) / 100 : null)) };
    return { asOf: day, movers, up: shareUp(tiles, byTicker), stocks };
  },
  ["landing-market-stocks-v3"],
  { revalidate: 24 * 60 * 60 },
);

// How long the page waits on the per-stock figures before showing "updating" (the build carries on).
const STOCKS_WAIT_MS = 8_000;

/** The movers, % up and watchlist figures for the latest trading day, or null while they are being worked out. Never rejects. */
export async function getMarketStocks(): Promise<MarketStocks | null> {
  const day = (await lastTradingDay().catch(() => null))?.slice(0, 10);
  if (!day) return null;
  // One build per instance at a time; a failed one is retried after a minute.
  const work = cached(`landing:stocks:v3:${day}`, 30 * 60_000, () =>
    buildStocks(day).catch((e: unknown) => {
      console.warn("[landing] market stocks:", e instanceof Error ? e.message : e);
      return null;
    }),
  );
  const late = new Promise<null>((r) => setTimeout(() => r(null), STOCKS_WAIT_MS));
  const got = await Promise.race([work, late]);
  if (!got)
    try {
      after(() => work);
    } catch {
      // Outside a request: nothing to keep alive.
    }
  return got;
}

/**
 * Works out the day's per-stock figures ahead of visitors (the landing cron, after the price store's
 * top-up): builds again and again until one finishes, each picking up the stocks the last one cached,
 * so the first visitor of the day gets the movers at once instead of carrying a cold build.
 */
export async function warmMarketStocks(deadline: number): Promise<{ day: string | null; done: boolean; tries: number }> {
  const day = (await lastTradingDay().catch(() => null))?.slice(0, 10) ?? null;
  if (!day) return { day, done: false, tries: 0 };
  let tries = 0;
  while (Date.now() + BUILD_BUDGET_MS < deadline) {
    tries++;
    const got = await buildStocks(day).catch(() => null);
    if (got) return { day, done: true, tries };
  }
  return { day, done: false, tries };
}
