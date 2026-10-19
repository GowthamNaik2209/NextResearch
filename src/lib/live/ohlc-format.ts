// Pure helpers for the candlestick / volume chart (no server or DOM imports, so both the
// Yahoo loader and the client chart can use them, and they can be unit-tested).
import type { Quote } from "@/lib/live/yahoo";
import { isFreshQuote } from "@/lib/live/freshness";

export type BarInterval = "1d" | "1wk" | "1mo";
/** One price bar. t = YYYY-MM-DD (IST), the start of its day/week/month. v = shares traded (null when Yahoo has none). */
export type OhlcBar = { t: string; o: number; h: number; l: number; c: number; v: number | null };

/** Monday of the (IST) calendar week that holds `t`. Yahoo dates weekly bars on that Monday. */
function weekStart(t: string): string {
  const d = new Date(`${t}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/** The start of the day/week/month bar that holds `t`. */
export function periodStart(t: string, interval: BarInterval): string {
  if (interval === "1d") return t;
  if (interval === "1mo") return `${t.slice(0, 7)}-01`;
  return weekStart(t);
}

/** The coarsest spacing among some lines' points: daily, weekly or monthly (by each line's median gap). */
export function sharedInterval(series: { t: string }[][]): BarInterval {
  let step = 0;
  for (const s of series) {
    if (s.length < 2) continue;
    const gaps = s.slice(1).map((p, i) => (Date.parse(p.t) - Date.parse(s[i].t)) / 86_400_000).sort((a, b) => a - b);
    step = Math.max(step, gaps[gaps.length >> 1]);
  }
  return step >= 20 ? "1mo" : step >= 5 ? "1wk" : "1d";
}

/**
 * Puts the lines drawn on one chart on a shared date grid. The chart gives every date any line
 * has the same width, so daily closes beside weekly ones (a stock listed last year, on a 5Y chart)
 * stretched their part of the axis and squeezed the rest. On a weekly or monthly grid each line
 * keeps its last close in each period, dated at the period's start, so all lines step together.
 */
export function onSharedGrid<T extends { t: string }>(series: T[][]): T[][] {
  const interval = sharedInterval(series);
  if (interval === "1d") return series;
  return series.map((points) => {
    const out: T[] = [];
    for (const p of points) {
      const t = periodStart(p.t, interval);
      if (out.length && out[out.length - 1].t === t) out[out.length - 1] = { ...p, t };
      else out.push({ ...p, t });
    }
    return out;
  });
}

/** True when two YYYY-MM-DD dates fall in the same bar of the given interval. */
export function samePeriod(a: string, b: string, interval: BarInterval): boolean {
  return periodStart(a, interval) === periodStart(b, interval);
}

const quoteDay = (asOf: string) => new Date(new Date(asOf).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/**
 * The bars with today's live quote folded in, like withLiveQuote does for closes: the bar that
 * holds the quote's day takes it as its close (stretching its high/low to fit); a quote from a
 * later day starts a new bar (opening at the previous close, volume unknown).
 */
export function withLiveBar(bars: OhlcBar[], quote: Quote | null | undefined, interval: BarInterval): OhlcBar[] {
  const last = bars[bars.length - 1];
  if (!last || !quote || !isFreshQuote(quote.asOf) || !Number.isFinite(quote.price) || quote.price <= 0) return bars;
  const t = quoteDay(quote.asOf);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t < last.t) return bars;
  const p = quote.price;
  if (samePeriod(last.t, t, interval)) return [...bars.slice(0, -1), { ...last, c: p, h: Math.max(last.h, p), l: Math.min(last.l, p) }];
  const o = quote.prevClose && quote.prevClose > 0 ? quote.prevClose : last.c;
  return [...bars, { t, o, h: Math.max(o, p), l: Math.min(o, p), c: p, v: null }];
}

/** The bar a (line) point falls in: the last bar starting on or before its date, within the same period. */
export function barFor(bars: OhlcBar[], t: string, interval: BarInterval): OhlcBar | null {
  let lo = 0;
  let hi = bars.length - 1;
  let hit = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].t <= t) [hit, lo] = [mid, mid + 1];
    else hi = mid - 1;
  }
  return hit >= 0 && samePeriod(bars[hit].t, t, interval) ? bars[hit] : null;
}

/** Share volume in Indian units: "8,450", "12.4 L" (lakh), "1.2 Cr" (crore), "125 Cr". */
export function fmtVolume(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v < 0) return "—";
  const one = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en-IN") : n.toFixed(1).replace(/\.0$/, ""));
  if (v >= 1e7 - 5e4) return `${one(v / 1e7)} Cr`; // 99.95 L rounds to 1 Cr, not "100 L"
  if (v >= 1e5) return `${one(v / 1e5)} L`;
  return Math.round(v).toLocaleString("en-IN");
}
