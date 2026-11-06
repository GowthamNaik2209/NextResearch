// Server side of the projection check (./projection-check.ts) for the method page: projections made
// 1 and 2 years ago from the inputs as they stood then, against what each stock did since. One stock
// for the worked example, and every covered stock (kept in Next's shared data cache for a day) for
// how often each case was right. Market inputs (rf, ERP) and dividend yields are today's: their
// history isn't stored. Callers await ensureFinancials() first.
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { storedDailyChart } from "@/lib/prices/store";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { companyFinancials, listSectors, tickerForSupplier } from "@/lib/sector-content";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { memoByFinancials } from "@/lib/financials/store";
import { FISCAL_YEARS } from "@/lib/financials/rows";
import { addDays, checkCase, closeOn, figuresTo, fyIndexOn, inputOn, summarise, type Check, type CheckSummary } from "./projection-check";
import { explainStock, fundamentalScore, median, scoreScale, type Horizon, type ProjectionContext, type ScoreScale } from "./projection";
import { homeIndustryOf } from "./projection-data";
import type { PricePoint } from "./backtest";

const DAY_SECONDS = 86_400;
const CONCURRENCY = 8;
/** How far back the store keeps prices (bars.ts STORE_DAYS for 5Y). */
const STORE_SPAN_DAYS = 1830;

/** Each industry's median net margin in fiscal year `fyIdx`, over every listed company it maps. */
const marginsAt = memoByFinancials(() => {
  const byYear = new Map<number, Map<string, number | null>>();
  return (fyIdx: number) => {
    const hit = byYear.get(fyIdx);
    if (hit) return hit;
    const out = new Map<string, number | null>();
    for (const s of listSectors()) {
      const ms: number[] = [];
      const seen = new Set<string>();
      for (const sup of Object.values(s.suppliers)) {
        if (!sup.listed || !sup.f) continue;
        const t = tickerForSupplier(sup);
        if (seen.has(t)) continue;
        seen.add(t);
        const r = sup.f.rev?.[fyIdx],
          n = sup.f.np?.[fyIdx];
        if (typeof r === "number" && typeof n === "number" && r > 0) ms.push(n / r);
      }
      out.set(s.slug, median(ms));
    }
    byYear.set(fyIdx, out);
    return out;
  };
});

/** The spread of fundamentals scores over every covered company with the years reported by `fyIdx`. */
const scaleAt = memoByFinancials(() => {
  const byYear = new Map<number, ScoreScale>();
  return (fyIdx: number) => {
    const hit = byYear.get(fyIdx);
    if (hit) return hit;
    const margins = marginsAt()(fyIdx);
    const scores: number[] = [];
    for (const p of listCompanyPages()) {
      const f = companyFinancials(p.ticker);
      if (!f) continue;
      const { rev, np } = figuresTo(f, fyIdx);
      const npL = np[fyIdx];
      const home = homeIndustryOf(p.ticker);
      // The score needs no price: only that the year then was a profit (a positive P/E).
      const s = fundamentalScore({
        rev,
        np,
        price: 1,
        mcapCr: 1,
        pe: typeof npL === "number" && npL > 0 ? 1 : null,
        // The trading rule as of then without today's knowledge: a 5-year price history today means
        // at least 3 years of trading on either day (stocks listed 4-5 years ago are left out of the scale).
        cagr: [null, typeof f.cagr?.[2] === "number" ? 0 : null, null],
        industry: { margin: home ? (margins.get(home) ?? null) : null },
      });
      if (s != null && Number.isFinite(s)) scores.push(s);
    }
    const sc = scoreScale(scores);
    byYear.set(fyIdx, sc);
    return sc;
  };
});

/** The days the projections are made from: a year and two years before the Nifty 50's last close. */
function startsFrom(index: PricePoint[]): { last: string; starts: { from: string; hs: Horizon[] }[] } | null {
  const last = index[index.length - 1]?.t;
  if (!last) return null;
  return {
    last,
    starts: [
      { from: addDays(last, -365), hs: [1] },
      { from: addDays(last, -730), hs: [1, 2] },
    ],
  };
}

export type StockCheck = {
  from: string;
  /** The model's working then; null with the reason it left the stock out. */
  ctx: ProjectionContext | null;
  reason: string | null;
  /** The fiscal year its results ran to then. */
  fy: string;
  checks: Check[];
};

function checkOne(ticker: string, pts: PricePoint[], index: PricePoint[], from: string, hs: Horizon[], storeFrom: string): StockCheck | null {
  const f = companyFinancials(ticker);
  if (!f) return null;
  const fyIdx = fyIndexOn(from);
  const fy = `FY${String(FISCAL_YEARS[fyIdx] ?? "").slice(-2)}`;
  // A stock left out is dated by the Nifty's close on the day, as every other row (the day may be a holiday).
  const marketDay = closeOn(index, from)?.t ?? from;
  const home = homeIndustryOf(ticker);
  const built = inputOn(f, pts, index, from, home ? (marginsAt()(fyIdx).get(home) ?? null) : null, storeFrom);
  if (!built.ok) return { from: marketDay, ctx: null, reason: built.reason, fy, checks: [] };
  const e = explainStock(built.input, scaleAt()(fyIdx));
  if (!e.ok) return { from: marketDay, ctx: null, reason: e.reason, fy, checks: [] };
  // Dated by the stock's own close on (or just before) the day: the day itself may be a holiday.
  const day = closeOn(pts, from)!.t;
  const checks = hs.map((h) => checkCase(e.ctx, pts, day, built.price, h, from)).filter((c): c is Check => c != null);
  return { from: day, ctx: e.ctx, reason: null, fy, checks };
}

const loadIndex = () => storedDailyChart(BENCHMARKS.nifty50.symbol, "5Y");

/** One stock's projections from a year and two years ago, against what it did. Null without prices. */
export async function stockChecks(ticker: string): Promise<StockCheck[] | null> {
  const [pts, index] = await Promise.all([storedDailyChart(ticker, "5Y").catch(() => null), loadIndex().catch(() => null)]);
  const s = index ? startsFrom(index) : null;
  if (!pts?.length || !index || !s) return null;
  const storeFrom = addDays(s.last, -STORE_SPAN_DAYS);
  return s.starts.map(({ from, hs }) => checkOne(ticker, pts, index, from, hs, storeFrom)).filter((c): c is StockCheck => c != null);
}

export type AllChecks = {
  last: string;
  nifty: { from: string; h: Horizon; ret: number | null }[];
  summaries: CheckSummary[];
  /** Covered stocks whose prices were read, of all of them. */
  read: number;
  of: number;
};

/** More stocks than this without prices and the run is not kept: the store or its connection failed partway. */
const MAX_MISSING = 0.1;

/** Every covered stock's checks summed up (uncached: allChecks keeps it a day). */
export async function computeAllChecks(index: PricePoint[]): Promise<AllChecks | null> {
  const s = startsFrom(index);
  if (!s) return null;
  const storeFrom = addDays(s.last, -STORE_SPAN_DAYS);
  const tickers = listCompanyPages().map((p) => p.ticker);
  const byKey = new Map<string, Check[]>();
  let i = 0;
  let missing = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < tickers.length) {
        const t = tickers[i++];
        const pts = await storedDailyChart(t, "5Y").catch(() => null);
        if (!pts?.length) {
          missing++;
          continue;
        }
        for (const { from, hs } of s.starts)
          for (const c of checkOne(t, pts, index, from, hs, storeFrom)?.checks ?? []) {
            const k = `${from}|${c.h}`;
            byKey.set(k, [...(byKey.get(k) ?? []), c]);
          }
      }
    }),
  );
  const summaries = s.starts
    .flatMap(({ from, hs }) =>
      hs.map((h) => {
        const sum = summarise(byKey.get(`${from}|${h}`) ?? []);
        // Dated by the Nifty's close on the day, as the stocks' own rows are.
        return sum && { ...sum, from: closeOn(index, from)?.t ?? from };
      }),
    )
    .filter((x): x is CheckSummary => x != null);
  const nifty = s.starts.flatMap(({ from, hs }) =>
    hs.map((h) => {
      const a = closeOn(index, from),
        b = closeOn(index, addDays(from, 365 * h));
      return { from: a?.t ?? from, h, ret: a && b ? b.c / a.c - 1 : null };
    }),
  );
  return { last: s.last, nifty, summaries, read: tickers.length - missing, of: tickers.length };
}

const cachedAll = unstable_cache(
  async (last: string): Promise<AllChecks> => {
    const got = await computeAllChecks((await loadIndex()) ?? []);
    // An error is never cached: the next visit tries again.
    if (!got || got.last !== last) throw new Error("projection check: no Nifty 50 series");
    if (got.read < got.of * (1 - MAX_MISSING)) throw new Error(`projection check: prices for only ${got.read} of ${got.of} stocks`);
    return got;
  },
  ["projection-check-all-v2"],
  { revalidate: DAY_SECONDS },
);

// The latest summary this instance has, and the load working one out (a cold one reads every
// stock's prices: minutes, so it runs after the response and the page says it is being worked out).
let latest: AllChecks | null = null;
let loading: Promise<void> | null = null;
const WAIT_MS = 1_500;

/**
 * Every covered stock's projections from a year and two years ago, summed up by start and horizon,
 * for the Nifty 50's last close (the previous one while that is worked out). Null until the first is in.
 */
export async function allChecks(): Promise<AllChecks | null> {
  const index = await loadIndex().catch(() => null);
  const last = index?.[index.length - 1]?.t;
  if (!last) return latest;
  if (latest?.last === last) return latest;
  loading ??= cachedAll(last)
    .then((r) => {
      latest = r;
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  const work = loading;
  const done = await Promise.race([work.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), WAIT_MS))]);
  if (!done)
    try {
      after(() => work);
    } catch {
      // Outside a request: nothing to keep alive.
    }
  // Yesterday's summary until today's is in (each row carries its own dates).
  return latest;
}
