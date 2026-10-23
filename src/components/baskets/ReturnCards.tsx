"use client";

import type { ChartRange } from "@/lib/live/yahoo";
import { fmtMonth, NA, signedPct } from "@/lib/format";
import { slackDaysFor } from "@/lib/baskets/backtest";
import { shownPct, signedPts } from "@/lib/baskets/fmt";
import { useSeries } from "./use-series";

// The return cards above a basket chart: the basket itself, the stocks picked in the chart
// (backtested together as their own basket) and the benchmarks, each gap stated against the
// basket. The basket pages and the Analysis charts both use it, so they read the same.
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
  benches,
  dense = false,
}: {
  range: ChartRange;
  basket: CardLine;
  /** The picked stocks’ backtest, with the tickers and settings ("equal weight, not rebalanced") named in its tooltip. */
  picks: (CardLine & { tickers: string[]; strategy: string }) | null;
  benches: CardLine[];
  /** The basket pages' flat strip (full width, square cells); the Analysis charts keep the cards. */
  dense?: boolean;
}) {
  const { get: at, retry } = useSeries([basket.key, picks?.key, ...benches.map((b) => b.key)], range);
  const ret = (key: string) => {
    const l = at(key);
    if (l?.status !== "ok" || l.data.points.length < 2) return null;
    const pts = l.data.points;
    return (pts[pts.length - 1].c / pts[0].c - 1) * 100;
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
  const card = (line: CardLine) => {
    const late = lateFrom(line.key);
    return {
      value: late ? null : ret(line.key),
      loading: at(line.key)?.status === "loading" || !at(line.key),
      failed: at(line.key)?.status === "error",
      onRetry: () => retry(line.key),
      note: late ? `history only from ${fmtMonth(late)}` : line.note,
    };
  };

  const b = card(basket);
  const gap = (v: number | null, picksSide: boolean) => (b.value != null && v != null ? (picksSide ? shown(v) - shown(b.value) : shown(b.value) - shown(v)) : null);
  const p = picks ? card(picks) : null;

  // One row of 2 or 3 cards on every screen; 4 cards (picks beside a rebalanced basket) go two by
  // two on phones, where a quarter of the row can't hold their labels.
  const count = 1 + (picks ? 1 : 0) + benches.length;
  const cols = count >= 4 ? "grid-cols-2 sm:grid-cols-4" : count === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <section aria-label="Backtest summary" className={(dense ? "grid gap-2 " : "grid max-w-3xl gap-2 sm:gap-3 ") + cols}>
      <Stat label={basket.label} value={b.value} loading={b.loading} failed={b.failed} onRetry={b.onRetry} note={basket.note} strong dense={dense} />
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
      {benches.map((line) => {
        const c = card(line);
        return <Stat key={line.key} label={line.label} value={c.value} loading={c.loading} failed={c.failed} onRetry={c.onRetry} note={c.note} diff={gap(c.value, false)} dense={dense} />;
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
}) {
  // "pts" only from sm: a phone's third-of-a-row card has room for the number alone.
  const pts =
    diff == null ? null : (
      <>
        {signedPts(diff)}
        <span className="hidden sm:inline"> pts</span>
      </>
    );
  return (
    <div title={title} className={"min-w-0 border " + (dense ? "rounded-md px-2.5 py-1.5 sm:px-3 " : "rounded-xl px-2.5 py-2 sm:p-3 ") + (strong ? "border-accent bg-accent/5" : "border-line bg-panel")}>
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
            "level with basket"
          ) : who === "picks" ? (
            <>{pts} vs basket</>
          ) : (
            <>basket {pts}</>
          )}
        </div>
      )}
      {note && <div className="line-clamp-2 text-[10px] leading-snug text-ink-soft sm:text-[11px]">{note}</div>}
    </div>
  );
}
