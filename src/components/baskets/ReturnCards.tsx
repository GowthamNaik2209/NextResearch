"use client";

import { useEffect, useState } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import { pct } from "./BasketChart";
import { loadSeries, type Load } from "./series";

// The return cards above a basket chart: the basket itself, the stocks picked in the chart
// (backtested together as their own basket) and the benchmarks, each gap stated against the
// basket. The basket pages and the Analysis charts both use it, so they read the same.
export type CardLine = { key: string; label: string; note?: string };

/** Backtest key for the stocks picked in a chart, or null when none are. Sorted, so order doesn't matter. */
export function picksKey(tickers: string[], weighting: "equal" | "mcap"): string | null {
  if (!tickers.length) return null;
  return `x:tickers=${tickers
    .map((t) => encodeURIComponent(t))
    .sort()
    .join(",")}&w=${weighting}`;
}

// The figure a card displays, so the gap between two cards matches their numbers (−5.4 vs −5.5 is 0.1).
const shown = (v: number) => Number(v.toFixed(Math.abs(v) >= 100 ? 0 : 1));
const monthYear = (t: string) => new Date(t).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export function ReturnCards({
  range,
  basket,
  picks,
  benches,
}: {
  range: ChartRange;
  basket: CardLine;
  /** The picked stocks' backtest, with the tickers and weighting named under the figure. */
  picks: (CardLine & { tickers: string[]; weighting: "equal" | "mcap" }) | null;
  benches: CardLine[];
}) {
  const [loads, setLoads] = useState<Record<string, Load>>({});
  // One string of every key, so a re-render with the same lines doesn't re-run the effect.
  const sig = [basket.key, ...(picks ? [picks.key] : []), ...benches.map((b) => b.key)].join("\n");

  useEffect(() => {
    for (const key of sig.split("\n")) {
      const id = `${key}|${range}`;
      if (loads[id]) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the card's series as loading, then fetches it
      setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
      loadSeries(key, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
    }
  }, [sig, range, loads]);

  const at = (key: string) => loads[`${key}|${range}`];
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
    const slack = (range === "3Y" || range === "5Y" ? 35 : 10) * 86_400_000;
    const from = l.data.points[0].t;
    return Date.parse(from) - Date.parse(b.data.points[0].t) > slack ? from : null;
  };
  const card = (line: CardLine) => {
    const late = lateFrom(line.key);
    return {
      value: late ? null : ret(line.key),
      loading: at(line.key)?.status === "loading" || !at(line.key),
      note: late ? `history from ${monthYear(late)}, pick a shorter range` : line.note,
    };
  };

  const b = card(basket);
  const gap = (v: number | null, picksSide: boolean) => (b.value != null && v != null ? (picksSide ? shown(v) - shown(b.value) : shown(b.value) - shown(v)) : null);
  const p = picks ? card(picks) : null;

  return (
    <section aria-label="Backtest summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label={basket.label} value={b.value} loading={b.loading} note={basket.note} strong />
      {picks && p && (
        <Stat
          label={picks.label}
          value={p.value}
          loading={p.loading}
          who="picks"
          diff={gap(p.value, true)}
          note={p.note ?? `${picks.tickers.join(", ")} · ${picks.weighting === "mcap" ? "market-cap" : "equal"} weight`}
        />
      )}
      {benches.map((line) => {
        const c = card(line);
        return <Stat key={line.key} label={line.label} value={c.value} loading={c.loading} note={c.note} diff={gap(c.value, false)} />;
      })}
    </section>
  );
}

// `who`: whose gap the card states - the basket's against an index, or the picks' against the basket.
function Stat({ label, value, loading, diff, note, strong, who = "basket" }: { label: string; value: number | null; loading: boolean; diff?: number | null; note?: string; strong?: boolean; who?: "basket" | "picks" }) {
  return (
    <div className={"min-w-0 rounded-xl border p-3 " + (strong ? "border-accent bg-accent/5" : "border-line bg-panel")}>
      <div className="text-[11px] leading-snug text-ink-soft">{label}</div>
      <div className={"mt-1 font-mono text-lg font-bold " + (value == null ? "text-ink-soft" : value >= 0 ? "text-pos" : "text-danger")}>{value != null ? pct(value) : loading ? "…" : "—"}</div>
      {diff != null && (
        <div className="mt-0.5 text-[11px] text-ink-soft">
          {Math.abs(diff) < 0.05
            ? "level with the basket"
            : who === "picks"
              ? `${diff > 0 ? "ahead of" : "behind"} the basket by ${Math.abs(diff).toFixed(1)} pts`
              : `basket ${diff > 0 ? "ahead by" : "behind by"} ${Math.abs(diff).toFixed(1)} pts`}
        </div>
      )}
      {note && <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{note}</div>}
    </div>
  );
}
