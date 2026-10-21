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
  dense = false,
}: {
  range: ChartRange;
  basket: CardLine;
  /** The picked stocks' backtest, with the tickers and weighting named under the figure. */
  picks: (CardLine & { tickers: string[]; weighting: "equal" | "mcap" }) | null;
  benches: CardLine[];
  /** The basket pages' flat strip (full width, square cells); the Analysis charts keep the cards. */
  dense?: boolean;
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
      note: late ? `history only from ${monthYear(late)}` : line.note,
    };
  };

  const b = card(basket);
  const gap = (v: number | null, picksSide: boolean) => (b.value != null && v != null ? (picksSide ? shown(v) - shown(b.value) : shown(b.value) - shown(v)) : null);
  const p = picks ? card(picks) : null;

  // One row on every screen, one column per card (2 or 3), so the cards never stack on phones.
  const count = 1 + (picks ? 1 : 0) + benches.length;
  return (
    <section aria-label="Backtest summary" className={dense ? "grid gap-2" : "grid max-w-3xl gap-2 sm:gap-3"} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      <Stat label={basket.label} value={b.value} loading={b.loading} note={basket.note} strong dense={dense} />
      {picks && p && (
        <Stat
          label={picks.label}
          value={p.value}
          loading={p.loading}
          who="picks"
          diff={gap(p.value, true)}
          note={p.note}
          dense={dense}
          title={`${picks.tickers.join(", ")} · ${picks.weighting === "mcap" ? "market-cap" : "equal"} weight`}
        />
      )}
      {benches.map((line) => {
        const c = card(line);
        return <Stat key={line.key} label={line.label} value={c.value} loading={c.loading} note={c.note} diff={gap(c.value, false)} dense={dense} />;
      })}
    </section>
  );
}

// `who`: whose gap the card states - the basket's against an index, or the picks' against the basket.
// Compact on purpose: three of these share one row on a phone. The gap is one short line,
// signed: on the picks card it is the picks against the basket, on an index card the basket
// against that index.
function Stat({ label, value, loading, diff, note, title, strong, dense, who = "basket" }: { label: string; value: number | null; loading: boolean; diff?: number | null; note?: string; title?: string; strong?: boolean; dense?: boolean; who?: "basket" | "picks" }) {
  // "pts" only from sm: a phone's third-of-a-row card has room for the number alone.
  const pts =
    diff == null ? null : (
      <>
        {diff > 0 ? "+" : "−"}
        {Math.abs(diff).toFixed(1)}
        <span className="hidden sm:inline"> pts</span>
      </>
    );
  return (
    <div title={title} className={"min-w-0 border " + (dense ? "rounded-md px-2.5 py-1.5 sm:px-3 " : "rounded-xl px-2.5 py-2 sm:p-3 ") + (strong ? "border-accent bg-accent/5" : "border-line bg-panel")}>
      <div className="truncate text-[10px] leading-snug text-ink-soft sm:text-[11px]">{label}</div>
      <div className={"mt-0.5 font-mono text-base font-bold sm:text-lg " + (value == null ? "text-ink-soft" : value >= 0 ? "text-pos" : "text-danger")}>{value != null ? pct(value) : loading ? "…" : "—"}</div>
      {diff != null && (
        <div className="truncate text-[10px] text-ink-soft sm:text-[11px]">
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
