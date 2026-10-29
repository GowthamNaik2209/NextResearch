// Topping up the price store (prisma/schema.prisma PriceSeries/PriceBar) after each NSE trading day:
// every company with a page and every benchmark gets its new daily bars from Yahoo (Screener's
// closes for a stock Yahoo has none for). Server side only; it takes the Prisma client and imports
// nothing from Next, so the cron route (src/app/api/prices/refresh) and scripts/refresh-prices.ts
// (the first fill, by hand) share it.
//
// A day's top-up is one PriceRun row: each chunk claims its lease (one chunk at a time across every
// instance), works through the series not yet checked for that day for up to `budgetMs`, and gives
// the lease back. Each series is written as it is fetched, and readers use the bars straight away.
//
// A series with no bars yet is fetched whole (five years of daily bars). After that only the last
// couple of weeks are fetched; when those disagree with what is stored on a day both have (a split
// or bonus Yahoo adjusted after we stored the old prices) the whole series is fetched again and replaced.
//
// The Nifty 50's stocks and the Nifty 50 index keep their whole daily history (from 2000, or their
// listing), for the explorer's what-if episodes (2008, 2013, 2020...). Their weekly re-read covers the
// last five years only and keeps the older bars; changed history still brings the whole series again.
import type { PrismaClient } from "@/generated/prisma/client";
import { screenerDailyCloses, yahooDailyFor, yahooDailyHistory, type DailyHistory, type PricePoint } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { latestDueTradingDay } from "@/lib/financials/trading-day";
import { historyChanged, splitLike, STORE_DAYS, type StoredBar } from "./bars";

const DAY = 86_400_000;
// A top-up re-reads this many days before the last stored bar, so a late correction is picked up
// and a split shows up as changed history.
const OVERLAP_DAYS = 14;
const WORKERS = 4;
// This many series failing in a row means Yahoo is down or refusing us: the chunk stops, and the
// series it didn't reach stay due for the next chunk.
const FAILS_IN_A_ROW = 8;
// Every series is re-fetched whole at least this often, so any change to its history (a split Yahoo
// adjusted late, a corrected print) reaches the store within a week even if the top-up missed it.
const WHOLE_EVERY_DAYS = 7;
// How far back a deep series (the Nifty 50's) reaches, and the day this began: a deep series last
// fetched whole before it holds five years only and is fetched in full on its next top-up.
const DEEP_FROM = Date.parse("2000-01-01T00:00:00Z");
const DEEP_HISTORY_SINCE = Date.parse("2026-10-30T00:00:00Z");
const DEEP_INDEX = "nifty50";
/** Days of bars a series keeps: five years, or back to 2000 for a deep one. */
export const keepDays = (deep: boolean, now = Date.now()) => (deep ? Math.ceil((now - DEEP_FROM) / DAY) : STORE_DAYS);


const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateOf = (t: string) => new Date(`${t}T00:00:00Z`);

/**
 * What the store keeps: every company with a page (by its ticker) and every benchmark (by its Yahoo
 * symbol). `deep`: the whole history, not five years (the Nifty 50's stocks and the index itself).
 */
export function storeKeys(): { key: string; benchmark: boolean; deep: boolean }[] {
  const out = new Map<string, { benchmark: boolean; deep: boolean }>();
  for (const p of listCompanyPages()) out.set(p.ticker, { benchmark: false, deep: p.appearances.some((a) => a.sectorSlug === DEEP_INDEX) });
  for (const [id, b] of Object.entries(BENCHMARKS)) out.set(b.symbol, { benchmark: true, deep: id === DEEP_INDEX });
  return [...out].map(([key, k]) => ({ key, ...k }));
}

type Series = { key: string; source: string; firstDay: Date | null; lastDay: Date | null; checkedDay: Date | null; fullAt: Date | null };
type Fetched = { source: string; exchange: string; bars: StoredBar[] };

const fromYahoo = (h: DailyHistory): Fetched => ({
  source: h.symbol,
  exchange: h.exchange,
  // Candles where Yahoo has them; a day with a close but no candle keeps just its close.
  bars: (() => {
    const candles = new Map(h.bars.map((b) => [b.t, b]));
    return h.points.map((p) => {
      const b = candles.get(p.t);
      return { t: p.t, o: b?.o ?? null, h: b?.h ?? null, l: b?.l ?? null, c: p.c, v: b?.v ?? null };
    });
  })(),
});
const fromCloses = (pts: PricePoint[]): Fetched => ({ source: "screener", exchange: "NSE", bars: pts.map((p) => ({ t: p.t, o: null, h: null, l: null, c: p.c, v: null })) });

/** The last `days` of a series (five years, or a deep one's whole history), choosing its source afresh. */
async function fetchWhole(key: string, benchmark: boolean, days = STORE_DAYS): Promise<Fetched | null> {
  if (benchmark) {
    const h = await yahooDailyFor(key, days);
    return h?.points.length ? fromYahoo(h) : null;
  }
  // Throws when Yahoo is down: the series stays as it was and is tried again, rather than being
  // switched to Screener's closes (no candles) for good.
  const h = await yahooDailyHistory(key, STORE_DAYS);
  // A deep series: the same symbol as always (picked over five years, as the charts do), read back
  // to `days` - so its old and new bars are one listing's, never NSE's joined to BSE's.
  if (h?.points.length && days > STORE_DAYS) {
    const long = await yahooDailyFor(h.symbol, days);
    if (long && long.points.length > h.points.length) return fromYahoo(long);
  }
  if (h?.points.length) return fromYahoo(h);
  const closes = await screenerDailyCloses(key, STORE_DAYS).catch(() => null);
  return closes ? fromCloses(closes) : null;
}

/** The days since `from` from the series' own source. */
async function fetchSince(s: Series, from: Date): Promise<Fetched | null> {
  const days = Math.ceil((Date.now() - from.getTime()) / DAY) + 1;
  if (s.source === "screener") {
    const closes = await screenerDailyCloses(s.key, days).catch(() => null);
    return closes ? fromCloses(closes) : null;
  }
  const h = await yahooDailyFor(s.source, days);
  return h?.points.length ? fromYahoo(h) : null;
}

const rows = (key: string, bars: StoredBar[]) => bars.map((b) => ({ key, day: dateOf(b.t), open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }));

/** Brings one series up to date; "none" when its source has no prices for it. */
async function topUp(prisma: PrismaClient, key: string, benchmark: boolean, s: Series | undefined, target: Date, deep = false): Promise<"whole" | "top-up" | "none"> {
  const keep = keepDays(deep);
  const cutoff = new Date(Date.now() - keep * DAY);
  const stale = !s?.fullAt || Date.now() - s.fullAt.getTime() > WHOLE_EVERY_DAYS * DAY;
  // A deep series still holding five years only: its first bar sits at the five-year cut of its last
  // whole fetch. Fetched in full straight away if that fetch was before deep history began, else at its
  // weekly re-read (a stock that joined the Nifty 50 later; or one listed under five years ago, which
  // simply gets its whole short history weekly, as every series used to).
  const atCut = !!s?.firstDay && !!s.fullAt && s.firstDay.getTime() >= s.fullAt.getTime() - (STORE_DAYS + 10) * DAY;
  const short = deep && !!s?.lastDay && atCut && (s.fullAt!.getTime() < DEEP_HISTORY_SINCE || stale);
  // Whole: a new series; one on Screener's closes (Yahoo may have it again: it is asked first);
  // or not fetched whole for a week.
  let whole = !s?.lastDay || s.source === "screener" || stale || short;
  // A deep series due only for its weekly re-read: the last five years, keeping the older bars.
  let recent = whole && deep && !short && !!s?.lastDay && s.source !== "screener";
  let got: Fetched | null = null;
  if (!whole) {
    const from = new Date(s!.lastDay!.getTime() - OVERLAP_DAYS * DAY);
    got = await fetchSince(s!, from);
    if (got?.bars.length) {
      const old = await prisma.priceBar.findMany({ where: { key, day: { gte: from } }, orderBy: { day: "asc" }, select: { day: true, close: true } });
      const stored = new Map(old.map((r) => [iso(r.day), r.close]));
      const lastStored = old.length ? old[old.length - 1] : null;
      const fresh = got.bars.filter((b) => !lastStored || b.t > iso(lastStored.day));
      if (historyChanged(stored, got.bars) || splitLike(lastStored?.close ?? null, fresh)) whole = true; // all of it, deep or not
    } else {
      // The source has nothing now (a symbol moved series, say): look for the stock afresh.
      whole = true;
    }
  }
  if (whole) got = await fetchWhole(key, benchmark, recent ? STORE_DAYS : keep);
  // The weekly re-read found the five years changed (a split adjusted late): the older bars need it
  // too, so the whole history is fetched and replaced.
  if (recent && got?.bars.length) {
    const old = await prisma.priceBar.findMany({ where: { key, day: { gte: dateOf(got.bars[0].t) } }, select: { day: true, close: true } });
    if (historyChanged(new Map(old.map((r) => [iso(r.day), r.close])), got.bars)) {
      recent = false;
      got = await fetchWhole(key, benchmark, keep);
    }
  }
  if (!got?.bars.length) return "none";
  // Up to the day being topped up: a run during market hours must not store today's live price as a close.
  const bars = got.bars.filter((b) => b.t >= iso(cutoff) && b.t <= iso(target));
  if (!bars.length) return "none";
  const first = dateOf(bars[0].t);
  const last = dateOf(bars[bars.length - 1].t);
  const replaceAll = whole && !recent;
  // A whole deep series is ~6,000 rows: past the 5 s a transaction gets by default, so it has longer.
  await prisma.$transaction(
    async (tx) => {
      // Whole: everything replaced (a deep series' weekly re-read: its last five years). Top-up: the
      // overlap re-written, and bars past what the series keeps dropped.
      await tx.priceBar.deleteMany({
        where: replaceAll ? { key } : recent ? { key, day: { gte: first } } : { key, OR: [{ day: { gte: first } }, { day: { lt: cutoff } }] },
      });
      await tx.priceBar.createMany({ data: rows(key, bars) });
      await tx.priceSeries.upsert({
        where: { key },
        create: { key, source: got.source, exchange: got.exchange, firstDay: first, lastDay: last, checkedDay: target, fullAt: new Date() },
        update: {
          source: got.source,
          exchange: got.exchange,
          lastDay: last,
          checkedDay: target,
          ...(replaceAll ? { firstDay: first } : {}),
          ...(whole ? { fullAt: new Date() } : {}),
        },
      });
    },
    { timeout: 60_000, maxWait: 30_000 },
  );
  if (!replaceAll) {
    const oldest = await prisma.priceBar.findFirst({ where: { key }, orderBy: { day: "asc" }, select: { day: true } });
    if (oldest) await prisma.priceSeries.update({ where: { key }, data: { firstDay: oldest.day } });
  }
  return whole ? "whole" : "top-up";
}

// ---------------------------------------------------------------- runs

export type PriceRunRow = { id: string; day: Date; done: number; total: number; failed: string[]; finishedAt: Date | null };

/** Takes the day's run (creating it), or null when another chunk holds its lease. */
export async function claimPriceRun(prisma: PrismaClient, day: Date, leaseSeconds: number): Promise<PriceRunRow | null> {
  await prisma.priceRun.upsert({ where: { day }, create: { day }, update: {} }).catch(() => {});
  const until = new Date(Date.now() + leaseSeconds * 1000);
  const { count } = await prisma.priceRun.updateMany({ where: { day, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseUntil: until } });
  if (!count) return null;
  return prisma.priceRun.findUnique({ where: { day }, select: { id: true, day: true, done: true, total: true, failed: true, finishedAt: true } });
}

export async function releasePriceRun(prisma: PrismaClient, run: PriceRunRow, finished: boolean) {
  await prisma.priceRun.update({ where: { id: run.id }, data: { done: run.done, total: run.total, failed: run.failed, leaseUntil: null, ...(finished ? { finishedAt: new Date() } : {}) } });
}

export type PriceChunkResult =
  | { status: "up-to-date" | "busy"; day: string }
  | { status: "finished" | "progress" | "stopped"; day: string; done: number; total: number; failed: string[]; whole: number; toppedUp: number };

export type PriceChunkOptions = {
  now?: Date;
  /** Stop starting new series after this long (one already started finishes). */
  budgetMs: number;
  /** Only these keys (the script's --only). */
  only?: string[];
  /** With `only`: fetch them even if already checked today (the script's --refetch, e.g. a first deep fill). */
  refetch?: boolean;
  /** Series fetched at once (default 4). */
  workers?: number;
  log?: (msg: string) => void;
};

/**
 * One chunk of the day's top-up (the latest NSE trading day past 18:30 IST, as the company figures):
 * the series not yet checked for that day, for up to `budgetMs`.
 */
export async function runPriceChunk(prisma: PrismaClient, opts: PriceChunkOptions): Promise<PriceChunkResult> {
  const log = opts.log ?? ((m: string) => console.log(`prices refresh: ${m}`));
  const started = Date.now();
  const target = latestDueTradingDay(opts.now ?? new Date());
  const day = iso(target);

  const keys = storeKeys().filter((k) => !opts.only || opts.only.includes(k.key));
  const series = new Map((await prisma.priceSeries.findMany({ select: { key: true, source: true, firstDay: true, lastDay: true, checkedDay: true, fullAt: true } })).map((s) => [s.key, s]));
  const due = (k: string) => {
    if (opts.only && opts.refetch) return true;
    const c = series.get(k)?.checkedDay;
    return !c || c.getTime() < target.getTime();
  };
  // Done for the day: every series checked, or the run went through them all (the misses wait for tomorrow).
  const finishedRun = await prisma.priceRun.findUnique({ where: { day: target }, select: { finishedAt: true } });
  if ((finishedRun?.finishedAt && !opts.only) || !keys.some((k) => due(k.key))) return { status: "up-to-date", day };

  const leaseSeconds = Math.ceil(opts.budgetMs / 1000) + 120;
  const run = await claimPriceRun(prisma, target, leaseSeconds);
  if (!run) return { status: "busy", day };

  // A series that failed this day isn't retried by later chunks (tomorrow's top-up tries again),
  // unless named by hand (the script's --only).
  const failedToday = new Set(opts.only ? [] : run.failed);
  if (opts.only) run.failed = run.failed.filter((k) => !opts.only!.includes(k));
  // Least recently checked first (never fetched before all), so a chunk that runs out of time
  // leaves different series behind each day rather than the same ones.
  const checkedAt = (k: string) => series.get(k)?.checkedDay?.getTime() ?? 0;
  const todo = keys.filter((k) => due(k.key) && !failedToday.has(k.key)).sort((a, b) => checkedAt(a.key) - checkedAt(b.key));
  run.total = keys.length;
  let whole = 0;
  let toppedUp = 0;
  let inARow = 0;
  let stopped = false;
  let next = 0;
  const retried = new Set<string>();
  try {
    await Promise.all(
      Array.from({ length: opts.workers ?? WORKERS }, async () => {
        while (!stopped && next < todo.length && Date.now() - started < opts.budgetMs) {
          const k = todo[next++];
          let how: Awaited<ReturnType<typeof topUp>> | null = null;
          try {
            how = await topUp(prisma, k.key, k.benchmark, series.get(k.key), target, k.deep);
          } catch (e) {
            log(`${k.key}: ${String(e).replace(/\s+/g, " ").slice(-300)}`);
          }
          if (how === "whole" || how === "top-up") {
            inARow = 0;
            if (how === "whole") whole++;
            else toppedUp++;
          } else if (how === null && !retried.has(k.key)) {
            // An error (a Yahoo or database blip, ~4% of the first fill): once more, at the end of the queue.
            retried.add(k.key);
            todo.push(k);
            if (++inARow >= FAILS_IN_A_ROW && !stopped) {
              stopped = true;
              log(`${FAILS_IN_A_ROW} series failed in a row (Yahoo down or refusing us); stopping this chunk`);
            }
          } else {
            run.failed = [...run.failed, k.key];
            if (++inARow >= FAILS_IN_A_ROW && !stopped) {
              stopped = true;
              log(`${FAILS_IN_A_ROW} series failed in a row (Yahoo down or refusing us); stopping this chunk`);
            }
          }
        }
      }),
    );
    // Recount from the table: other chunks may have done some.
    const checked = await prisma.priceSeries.count({ where: { checkedDay: { gte: target }, key: { in: keys.map((k) => k.key) } } });
    run.done = checked;
    const finished = !stopped && next >= todo.length;
    // A run over some keys only (the script's --only) never marks the day done for the rest.
    await releasePriceRun(prisma, run, finished && !opts.only);
    log(`${day}: ${run.done}/${run.total} up to date (+${whole} whole, +${toppedUp} topped up this chunk), ${run.failed.length} failed${finished ? ", finished" : ""}`);
    return { status: finished ? "finished" : stopped ? "stopped" : "progress", day, done: run.done, total: run.total, failed: run.failed, whole, toppedUp };
  } catch (e) {
    await releasePriceRun(prisma, run, false).catch(() => {});
    throw e;
  }
}
