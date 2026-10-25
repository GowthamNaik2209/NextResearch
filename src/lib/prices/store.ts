// Reading the price store (prisma/schema.prisma PriceSeries/PriceBar, filled by ./refresh.ts): a
// stock's or benchmark's chart for a range, in the shape the Yahoo loaders return, so callers can
// use either. Null when the store can't serve it (no series yet, a range it doesn't keep, or bars
// so old the daily top-up must have stopped), and the caller then fetches Yahoo as before.
//
// Which callers read the store first: the baskets (backtests, industry figures, the rule-based
// lists and the projections' price statistics). The stock pop-up's charts still fetch Yahoo first,
// for the day's live moves, and fall back to the store.
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/live/cache";
import { MAX_QUOTE_AGE_DAYS } from "@/lib/live/freshness";
import { getChartWithFallback, getOhlcChart, getSymbolChart, HISTORY_FROM, type ChartData, type ChartRange, type Exchange, type OhlcData } from "@/lib/live/yahoo";
import { rollUp, sinceDays, storedRange, toCandles, toPoints, type StoredBar } from "./bars";

const DAY = 86_400_000;
// The store moves once a day: a reader's copy may be this old.
const TTL_MS = 15 * 60 * 1000;
// A store read slower than this gives up and the caller fetches Yahoo (as slow a deadline as Yahoo's own).
const READ_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error("price store: read timed out")), ms)));
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}

type Loaded = { source: string; exchange: Exchange; bars: StoredBar[] };

// At most this many store reads at once per instance: background work (the projections' statistics,
// a rule-based list build) reads hundreds of series, and must leave the rest of the instance's small
// database pool (src/lib/prisma.ts, 5) to page queries. A read takes milliseconds, so they queue briefly.
const READS_AT_ONCE = 2;
let reading = 0;
const waiting: (() => void)[] = [];
async function oneRead<T>(read: () => Promise<T>): Promise<T> {
  if (reading >= READS_AT_ONCE) await new Promise<void>((r) => waiting.push(r));
  reading++;
  try {
    return await read();
  } finally {
    reading--;
    waiting.shift()?.();
  }
}

/** A series' bars for the last `days` (one query per key and span, kept in memory a few minutes). */
function load(key: string, days: number): Promise<Loaded | null> {
  return cached(`store1:${key}:${days}`, TTL_MS, async () => {
    const s = await oneRead(() => prisma.priceSeries.findUnique({ where: { key }, select: { source: true, exchange: true, lastDay: true } }));
    // Stale: the top-up has stopped for this series (or altogether); Yahoo is the better answer.
    if (!s?.lastDay || Date.now() - s.lastDay.getTime() > MAX_QUOTE_AGE_DAYS * DAY) return null;
    const from = new Date(Date.now() - days * DAY);
    const rows = await oneRead(() =>
      prisma.priceBar.findMany({ where: { key, day: { gte: from } }, orderBy: { day: "asc" }, select: { day: true, open: true, high: true, low: true, close: true, volume: true } }),
    );
    if (rows.length < 2) return null;
    const bars = rows.map((r) => ({ t: r.day.toISOString().slice(0, 10), o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume }));
    return { source: s.source, exchange: s.exchange === "BSE" ? "BSE" : "NSE", bars };
  });
}

// The tables don't exist yet (code deployed before its migration): skip the store for a while
// instead of failing, and logging, every read.
let absentUntil = 0;

async function storedBars(key: string, range: ChartRange): Promise<(Loaded & { interval: "1d" | "1wk" | "1mo"; lastDay: string | null }) | null> {
  const r = storedRange(range);
  if (!r || Date.now() < absentUntil) return null;
  const got = await withTimeout(load(key, r.days), READ_TIMEOUT_MS).catch((e: unknown) => {
    if ((e as { code?: string })?.code === "P2021") absentUntil = Date.now() + 10 * 60_000;
    else console.error(`price store: reading ${key} failed`, e);
    return null;
  });
  if (!got) return null;
  // Corporate actions that make earlier prices a different security (as the Yahoo charts cut them).
  const from = HISTORY_FROM[key];
  const daily = sinceDays(from ? got.bars.filter((b) => b.t >= from) : got.bars, r.days, Date.now());
  // A week or month starting before the cut is left out whole, as Yahoo's bars are.
  const bars = rollUp(daily, r.interval).filter((b) => !from || b.t >= from);
  return bars.length >= 2 ? { ...got, bars, interval: r.interval, lastDay: daily[daily.length - 1]?.t ?? null } : null;
}

// Yahoo's weekly/monthly closes end with an extra point dated the latest day (after the period's
// own, which carries the same close, also for a period still running), so a long range's line ends
// on the last trading day; the same here.
function withLastDay(points: { t: string; c: number }[], lastDay: string | null) {
  const last = points[points.length - 1];
  return lastDay && last && lastDay > last.t ? [...points, { t: lastDay, c: last.c }] : points;
}

/** A stock's or benchmark's closes for a range from the store, or null. */
export async function storedChart(key: string, range: ChartRange): Promise<ChartData | null> {
  const s = await storedBars(key, range);
  if (!s) return null;
  const points = withLastDay(toPoints(s.bars), s.lastDay);
  return s.source === "screener" ? { range, points, source: "screener" } : { range, points, source: "yahoo", exchange: s.exchange };
}

/** A stock's candles for a range from the store, or null (also for a closes-only series). */
export async function storedOhlc(key: string, range: ChartRange): Promise<OhlcData | null> {
  const s = await storedBars(key, range);
  const candles = s && s.source !== "screener" ? toCandles(s.bars) : null;
  if (!s || !candles) return null;
  return { range, interval: s.interval, bars: candles, points: withLastDay(toPoints(s.bars), s.lastDay), source: "yahoo", exchange: s.exchange };
}

// ---------------------------------------------------------------- the callers' loaders

/** Baskets: the store first, then Yahoo (and Screener) as before. */
export async function basketChart(ticker: string, range: ChartRange): Promise<ChartData | null> {
  return (await storedChart(ticker, range)) ?? getChartWithFallback(ticker, range);
}

/** Baskets' benchmark lines (the Nifty 50): the store first, then Yahoo. */
export async function basketSymbolChart(symbol: string, range: ChartRange): Promise<ChartData | null> {
  return (await storedChart(symbol, range)) ?? getSymbolChart(symbol, range);
}

/** The stock pop-up: Yahoo first (today's moves), the store when Yahoo has nothing. */
export async function liveChart(ticker: string, range: ChartRange): Promise<ChartData | null> {
  return (await getChartWithFallback(ticker, range)) ?? storedChart(ticker, range);
}

export async function liveOhlc(ticker: string, range: ChartRange): Promise<OhlcData | null> {
  return (await getOhlcChart(ticker, range)) ?? storedOhlc(ticker, range);
}

export async function liveSymbolChart(symbol: string, range: ChartRange): Promise<ChartData | null> {
  return (await getSymbolChart(symbol, range)) ?? storedChart(symbol, range);
}
