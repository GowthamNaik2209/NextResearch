// Demergers Yahoo leaves unadjusted, where the listed company stays comparable with its old self
// (unlike TMPV, whose history is cut instead: yahoo.ts HISTORY_FROM). On the ex-date the price
// drops by the value of the demerged business, which a shareholder kept as the new company's
// shares, so prices before it are scaled by the parent's share of the pre-demerger value, as
// Screener and NSE's adjusted series do. Applied when charts are read (the Yahoo charts and the
// price store's bars, src/lib/prices/store.ts): the store keeps Yahoo's closes as sent.
//
// Pure, so yahoo.ts, the store and demergers.test.ts share it.
import { periodStart, type BarInterval } from "./ohlc-format";

export type Demerger = { /** Ex-date (YYYY-MM-DD, IST): the first day without the demerged business. */ exDate: string; /** Pre-ex-date prices are multiplied by this. */ factor: number };

export const DEMERGERS: Record<string, Demerger[]> = {
  // Global services business demerged into STL Networks Ltd (1:1), ex-date 24 Apr 2025. Screener
  // scales every earlier close by 0.7247 (its ratio to Yahoo's close, 0.7233-0.7258 week to week).
  STLTECH: [{ exDate: "2025-04-24", factor: 0.7247 }],
};

// Bar-to-bar move across the ex-date, against the factor: within this the drop is still in the
// series (scale it); further off, Yahoo has adjusted it itself (leave it, rather than adjust twice).
// Weekly/monthly bars carry more of the market's own move, so a looser match (as yahoo.ts's splits).
const TOLERANCE = { "1d": 0.15, "1wk": 0.3, "1mo": 0.3 } as const;

type Priced = { t: string; c: number; o?: number | null; h?: number | null; l?: number | null };

/**
 * `bars` with prices before each of `key`'s demergers scaled (a copy; volume untouched, the share
 * count didn't change). A weekly/monthly bar holding the ex-date closes after it and is left as is.
 * Returns `bars` itself when nothing applies.
 */
export function adjustDemergers<T extends Priced>(key: string, bars: T[], interval: BarInterval): T[] {
  const list = DEMERGERS[key];
  if (!list?.length) return bars;
  let out = bars;
  for (const { exDate, factor } of list) {
    const cut = periodStart(exDate, interval);
    const at = out.findIndex((b) => b.t >= cut);
    if (at < 1) continue; // the series starts after the ex-date (or ends before it)
    const prev = out[at - 1].c;
    if (!(prev > 0) || Math.abs(out[at].c / prev / factor - 1) > TOLERANCE[interval]) continue;
    const s = (v: number | null | undefined) => (v == null ? v : v * factor);
    out = out.map((b, i) => (i < at ? { ...b, c: b.c * factor, ...("o" in b ? { o: s(b.o), h: s(b.h), l: s(b.l) } : {}) } : b));
  }
  return out;
}
