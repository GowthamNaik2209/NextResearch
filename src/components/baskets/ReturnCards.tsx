"use client";

import type { ChartRange } from "@/lib/live/yahoo";
import { fmtMonth, NA, signedPct } from "@/lib/format";
import { slackDaysFor } from "@/lib/baskets/backtest";
import { shownPct, signedPts } from "@/lib/baskets/fmt";
import { useSeries } from "./use-series";
import { isBenchKey } from "./series";

// The return cards above a basket chart: the basket itself, the stocks picked in the chart
// (backtested together as their own basket) and the benchmarks, each gap stated against the
// basket. The basket pages and the Analysis charts both use it, so they read the same.
// A line with an empty key is a placeholder: the card keeps its place, shows "—" and its note.
export type CardLine = { key: string; label: string; note?: string };

/**
 * Backtest key for the stocks picked in a chart, or null when none are. Sorted, so order doesn't
 * matter. `strategy` is the strategy's query ("w=equal", or with rebalancing: see strategy.ts).
 */
export function picksKey(tickers: string[], strategy: string): string | null {
  if (!tickers.length) return null;
  return `x:tickers=${tickers
    .map((t) => encodeURIComponent(t))
    .sort()
    .join(",")}&${strategy}`;
}

// The figure a card displays, so the gap between two cards matches their numbers (−5.4 vs −5.5 is 0.1).
const shown = shownPct;

export function ReturnCards({
  range,
  basket,
  picks,
  picksSlot,
  benches,
  dense = false,
  subject = "basket",
  ownRetry = true,
}: {
  range: ChartRange;
  basket: CardLine;
  /** The picked stocks’ backtest, with the tickers and settings ("equal weight, not rebalanced") named in its tooltip. */
  picks: (CardLine & { tickers: string[]; strategy: string }) | null;
  /** When set, the picks card keeps its place with this label and note while there are no picks,
   * so the strip never changes shape (the basket pages). */
  picksSlot?: { label: string; note: string };
  benches: CardLine[];
  /** The basket pages' flat strip (full width, square cells); the Analysis charts keep the cards. */
  dense?: boolean;
  /** What the first card is, in an index card's gap ("basket +4.2 pts"): a stock's ticker on its own Backtest view. */
  subject?: string;
  /** Each card's own Retry; off where the page has one Retry for every panel (a stock's Backtest view). */
  ownRetry?: boolean;
}) {
  const { get: at, retry } = useSeries([basket.key, picks?.key, ...benches.map((b) => b.key)], range);
  const ret = (key: string) => {
    const l = at(key);
    if (l?.status !== "ok" || l.data.points.length < 2) return null;
    const pts = l.data.points;
    return (pts[pts.length - 1].c / pts[0].c - 1) * 100;
  };
  // A benchmark over the basket's own first and last days (its last close on or before each), as
  // the statistics panel measures it, so "Nifty 50" reads the same in both.
  const benchRet = (key: string) => {
    const l = at(key);
    const b = at(basket.key);
    if (l?.status !== "ok" || l.data.points.length < 2) return null;
    if (b?.status !== "ok" || b.data.points.length < 2) return ret(key);
    const pts = l.data.points;
    const bp = b.data.points;
    const on = (t: string) => {
      let v: number | null = null;
      for (const p of pts) {
        if (p.t > t) break;
        v = p.c;
      }
      return v;
    };
    const from = on(bp[0].t) ?? pts[0].c;
    const to = on(bp[bp.length - 1].t);
    return to != null && from > 0 ? (to / from - 1) * 100 : ret(key);
  };
  // A line whose history starts well after the basket's first day (an ETF or a stock listed
  // mid-period) can't be compared over the whole range: its card says when its history begins.
  const lateFrom = (key: string) => {
    const l = at(key);
    const b = at(basket.key);
    if (l?.status !== "ok" || b?.status !== "ok" || !l.data.points.length || !b.data.points.length) return null;
    const slack = slackDaysFor(range) * 86_400_000;
    const from = l.data.points[0].t;
    return Date.parse(from) - Date.parse(b.data.points[0].t) > slack ? from : null;
  };
  const card = (line: CardLine, bench = false) => {
    if (!line.key) return { value: null, loading: false, failed: false, onRetry: () => {}, note: line.note };
    const late = lateFrom(line.key);
    return {
      value: late ? null : bench && isBenchKey(line.key) ? benchRet(line.key) : ret(line.key),
      loading: at(line.key)?.status === "loading" || !at(line.key),
      failed: ownRetry && at(line.key)?.status === "error",
      onRetry: () => retry(line.key),
      note: late ? `history only from ${fmtMonth(late)}` : line.note,
    };
  };

  // The first card's own history starting well after a benchmark's (a stock listed during the
  // range): its card says from when, as the benchmarks' gaps are measured over its days.
  const basketFrom = (() => {
    const l = at(basket.key);
    const first = benches.map((x) => at(x.key)).find((x) => x?.status === "ok" && x.data.points.length);
    if (l?.status !== "ok" || !l.data.points.length || first?.status !== "ok") return null;
    const from = l.data.points[0].t;
    return Date.parse(from) - Date.parse(first.data.points[0].t) > slackDaysFor(range) * 86_400_000 ? from : null;
  })();
  const b = { ...card(basket), ...(basketFrom ? { note: `listed ${fmtMonth(basketFrom)}: return since then` } : {}) };
  const gap = (v: number | null, picksSide: boolean) => (b.value != null && v != null ? (picksSide ? shown(v) - shown(b.value) : shown(b.value) - shown(v)) : null);
  const p = picks ? card(picks) : null;

  // One row of 2 or 3 cards on every screen; 4 cards (picks beside a rebalanced basket) go two by
  // two on phones, where a quarter of the row can't hold their labels.
  const count = 1 + (picks || picksSlot ? 1 : 0) + benches.length;
  const cols = count >= 4 ? "grid-cols-2 sm:grid-cols-4" : count === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <section aria-label="Backtest summary" className={(dense ? "grid gap-2 " : "grid max-w-3xl gap-2 sm:gap-3 ") + cols}>
      <Stat label={basket.label} value={b.value} loading={b.loading} failed={b.failed} onRetry={b.onRetry} note={b.note} strong dense={dense} />
      {picks && p && (
        <Stat
          label={picks.label}
          value={p.value}
          loading={p.loading}
          failed={p.failed}
          onRetry={p.onRetry}
          who="picks"
          diff={gap(p.value, true)}
          note={p.note}
          dense={dense}
          title={`${picks.tickers.join(", ")} · ${picks.strategy}`}
        />
      )}
      {!picks && picksSlot && <Stat label={picksSlot.label} value={null} loading={false} note={picksSlot.note} dense={dense} />}
      {benches.map((line) => {
        const c = card(line, true);
        return <Stat key={line.key || line.label} label={line.label} value={c.value} loading={c.loading} failed={c.failed} onRetry={c.onRetry} note={c.note} diff={gap(c.value, false)} dense={dense} subject={subject} />;
      })}
    </section>
  );
}

// `who`: whose gap the card states - the basket's against an index, or the picks' against the basket.
// Compact on purpose: three of these share one row on a phone. The gap is one short line,
// signed: on the picks card it is the picks against the basket, on an index card the basket
// against that index.
function Stat({
  label,
  value,
  loading,
  failed,
  onRetry,
  diff,
  note,
  title,
  strong,
  dense,
  who = "basket",
  subject = "basket",
}: {
  label: string;
  value: number | null;
  loading: boolean;
  failed?: boolean;
  onRetry?: () => void;
  diff?: number | null;
  note?: string;
  title?: string;
  strong?: boolean;
  dense?: boolean;
  who?: "basket" | "picks";
  subject?: string;
}) {
  // Always with its unit, at every width: a bare "+330.8" beside a % figure reads as a percent.
  const pts = diff == null ? null : `${signedPts(diff)} pts`;
  return (
    // Dense cards have a minimum height that fits a label, the figure and two short lines (the Your
    // picks placeholder's note wraps to two at desktop widths), so a card
    // filling in (or a placeholder note) never changes the strip's height.
    <div title={title} className={"min-w-0 border " + (dense ? "min-h-[5.75rem] rounded-md px-2.5 py-1.5 sm:min-h-[5.625rem] sm:px-3 " : "rounded-xl px-2.5 py-2 sm:p-3 ") + (strong ? "border-accent bg-accent/5" : "border-line bg-panel")}>
      {/* Labels and gaps wrap rather than cut off: a phone's third of a row is about 100px. */}
      <div className="text-[10px] leading-snug text-ink-soft sm:text-[11px]">{label}</div>
      <div className={"mt-0.5 font-mono text-base font-bold sm:text-lg " + (value == null ? "text-ink-soft" : value >= 0 ? "text-pos" : "text-danger")}>
        {value != null ? signedPct(value) : loading ? <span role="img" aria-label="Loading" className="inline-block h-4 w-14 animate-pulse rounded bg-line/70 align-middle" /> : NA}
      </div>
      {failed && onRetry && (
        <button type="button" onClick={onRetry} className="text-[10px] font-semibold text-accent underline sm:text-[11px]">
          Retry
        </button>
      )}
      {diff != null && (
        <div className="text-[10px] leading-snug text-ink-soft sm:text-[11px]">
          {Math.abs(diff) < 0.05 ? (
            `level with ${subject}`
          ) : who === "picks" ? (
            <>{pts} vs basket</>
          ) : (
            <>
              {subject} {pts}
            </>
          )}
        </div>
      )}
      {note && <div className="line-clamp-2 text-[10px] leading-snug text-ink-soft sm:text-[11px]">{note}</div>}
    </div>
  );
}
