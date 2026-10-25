// Server side of the projections' price statistics: each basket stock's beta and 1-year volatility
// (./projection-risk.ts) from its 2-year daily closes and the Nifty 50's. Kept one by one in Next's
// shared data cache for a day (every server instance reads it), and installed in memory for the
// synchronous basket tables. Basket pages await ensureRiskStats() after ensureFinancials(): a cache
// hit answers at once; on a miss (the first visits after the cache key changes) the page goes out
// with what is there and the server keeps fetching, and a stock still missing its statistics is
// projected with a beta of 1 and a volatility from its 52-week range (shown as such).
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { basketChart, basketSymbolChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { invalidateDerived } from "@/lib/financials/store";
import type { PricePoint } from "./backtest";
import type { RiskInput } from "./projection";
import { riskOf } from "./projection-risk";

const DAY_SECONDS = 86_400;
// Price histories fetched at once.
const CONCURRENCY = 8;
// How long a page waits for the statistics before going out with what it has.
const WAIT_MS = 1_500;
// How often an instance asks the shared cache again (it refreshes once a day).
const RECHECK_MS = 60 * 60 * 1000;

export type RiskStats = RiskInput & { asOf: string };

const cachedIndex = unstable_cache(
  async (): Promise<PricePoint[]> => {
    const pts = (await basketSymbolChart(BENCHMARKS.nifty50.symbol, "2Y"))?.points;
    if (!pts?.length) throw new Error("no Nifty 50 series");
    return pts;
  },
  ["projection-risk-index-2y-v1"],
  { revalidate: DAY_SECONDS },
);

const cachedRisk = unstable_cache(
  async (ticker: string): Promise<RiskStats> => {
    const [chart, index] = await Promise.all([basketChart(ticker, "2Y"), cachedIndex()]);
    const pts = chart?.points;
    // An error is never cached: the next visit tries again.
    if (!pts || pts.length < 2) throw new Error(`no price history for ${ticker}`);
    return { ...riskOf(pts, index), asOf: pts[pts.length - 1].t };
  },
  ["projection-risk-2y-v1"],
  { revalidate: DAY_SECONDS },
);

const stats = new Map<string, RiskStats>();
let loading: Promise<void> | null = null;
let checkedAt = 0;
// The load a request has already waited the full WAIT_MS for.
let waitedOn: Promise<void> | null = null;

/** A stock's installed price statistics, or null when they aren't loaded (yet). */
export function riskStatsFor(ticker: string): RiskStats | null {
  return stats.get(ticker) ?? null;
}

/** Loads every basket stock's price statistics (from the shared cache where it has them) and installs them. */
export async function ensureRiskStats(): Promise<void> {
  if (!loading && Date.now() - checkedAt < RECHECK_MS) return;
  if (!loading) {
    checkedAt = Date.now();
    const queue = listCompanyPages().map((p) => p.ticker);
    const got = new Map<string, RiskStats>();
    loading = Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let t = queue.shift(); t; t = queue.shift()) {
          const r = await cachedRisk(t).catch(() => null);
          if (r) got.set(t, r);
        }
      }),
    ).then(() => {
      install(got);
      loading = null;
    });
  }
  const work = loading;
  // The hourly re-check with statistics already installed runs in the background: only an
  // instance with none yet waits, and only once per load (a basket page calls this up to three
  // times per view, and every view during a slow load would otherwise wait again).
  const wait = stats.size === 0 && waitedOn !== work;
  const done = wait && (await Promise.race([work.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), WAIT_MS))]));
  if (wait && !done) waitedOn = work;
  if (!done)
    try {
      after(() => work);
    } catch {
      // Outside a request (a build): nothing to keep alive.
    }
}

function install(got: Map<string, RiskStats>) {
  let changed = got.size !== stats.size;
  for (const [t, r] of got) {
    const had = stats.get(t);
    if (!had || had.asOf !== r.asOf || had.beta !== r.beta || had.vol !== r.vol) changed = true;
  }
  if (!changed) return;
  stats.clear();
  for (const [t, r] of got) stats.set(t, r);
  // Basket stocks carry their projection: rebuild them with the new statistics.
  invalidateDerived();
}
