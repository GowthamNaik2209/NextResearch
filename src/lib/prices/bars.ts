// Pure helpers for the price store (./store.ts reads, ./refresh.ts writes): cutting a range out of
// the stored daily bars, rolling them up to the weekly/monthly bars the long ranges use (as Yahoo
// sends them), and telling a top-up apart from changed history. No I/O, so they are unit-tested.
import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import { periodStart, type BarInterval, type OhlcBar } from "@/lib/live/ohlc-format";

const DAY = 86_400_000;

/** How far back the store keeps bars: the longest range it serves (5Y), plus a little. */
export const STORE_DAYS = 1840;

// Each range's span and bar size, as the Yahoo charts fetch them (src/lib/live/yahoo.ts PARAMS).
// "All" has no fixed start, so the store doesn't serve it.
const RANGES: Partial<Record<ChartRange, { days: number; interval: BarInterval }>> = {
  "1M": { days: 31, interval: "1d" },
  "6M": { days: 183, interval: "1d" },
  "1Y": { days: 366, interval: "1d" },
  "2Y": { days: 731, interval: "1d" },
  "3Y": { days: 1100, interval: "1wk" },
  "5Y": { days: 1830, interval: "1wk" },
};

export const storedRange = (range: ChartRange) => RANGES[range] ?? null;

/** A stored row: a day's bar; open/high/low/volume are null for closes-only (Screener) series. */
export type StoredBar = { t: string; o: number | null; h: number | null; l: number | null; c: number; v: number | null };

/** The bars from `days` before `now` on (YYYY-MM-DD order assumed). */
export function sinceDays<T extends { t: string }>(bars: T[], days: number, now: number): T[] {
  const from = new Date(now - days * DAY).toISOString().slice(0, 10);
  return bars.filter((b) => b.t >= from);
}

/**
 * Daily bars rolled up to `interval`: each period's first open, highest high, lowest low, last close
 * and summed volume, dated at the period's start (Monday, or the 1st) as Yahoo dates them. This
 * matches Yahoo's own weekly bars except in a few weeks with a weekend session (Budget-day
 * Saturdays/Sundays, a 2024 Saturday drill), where Yahoo's weekly close disagrees with its own
 * daily closes in no consistent way; there the store follows the daily closes.
 */
export function rollUp(bars: StoredBar[], interval: BarInterval): StoredBar[] {
  if (interval === "1d") return bars;
  const out: StoredBar[] = [];
  for (const b of bars) {
    const t = periodStart(b.t, interval);
    const prev = out[out.length - 1];
    if (!prev || prev.t !== t) {
      out.push({ ...b, t });
      continue;
    }
    prev.h = prev.h != null && b.h != null ? Math.max(prev.h, b.h) : (prev.h ?? b.h);
    prev.l = prev.l != null && b.l != null ? Math.min(prev.l, b.l) : (prev.l ?? b.l);
    prev.c = b.c;
    prev.v = prev.v != null && b.v != null ? prev.v + b.v : (prev.v ?? b.v);
    if (prev.o == null) prev.o = b.o;
  }
  return out;
}

export const toPoints = (bars: StoredBar[]): PricePoint[] => bars.map((b) => ({ t: b.t, c: b.c }));

/** The candles, when every bar has open/high/low (a Yahoo series); null for closes only. */
export function toCandles(bars: StoredBar[]): OhlcBar[] | null {
  const out: OhlcBar[] = [];
  for (const b of bars) {
    if (b.o == null || b.h == null || b.l == null) return null;
    out.push({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v });
  }
  return out;
}

// A stored close and a fresh one for the same day differing by more than this means history changed
// (a split or bonus Yahoo adjusted after we stored it, or a corrected print): the series is re-fetched whole.
const CHANGED = 0.02;

/** True when fresh bars disagree with stored closes on a day both have. */
export function historyChanged(stored: Map<string, number>, fresh: { t: string; c: number }[]): boolean {
  for (const b of fresh) {
    const old = stored.get(b.t);
    if (old != null && old > 0 && Math.abs(b.c / old - 1) > CHANGED) return true;
  }
  return false;
}

// A day-to-day move this large is treated as a possible unadjusted split (Yahoo can date the event
// months from the drop, outside a top-up's window): the series is re-fetched whole, where the
// charts' split matching sees the whole history. A genuine move this big just costs one re-fetch.
const SPLIT_LIKE = 0.45;

/** True when consecutive closes (the last stored one, then the new bars) jump like a split. */
export function splitLike(prevClose: number | null, bars: { c: number }[]): boolean {
  let prev = prevClose;
  for (const b of bars) {
    if (prev != null && prev > 0 && Math.abs(b.c / prev - 1) > SPLIT_LIKE) return true;
    prev = b.c;
  }
  return false;
}
