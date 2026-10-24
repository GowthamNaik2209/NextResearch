"use client";

import type { ReactNode } from "react";
import { NA, signedPct } from "@/lib/format";
import { shownPct, signedPts } from "@/lib/baskets/fmt";
import { PROJECTION_DISCLAIMER, SCENARIO_LABEL, type ProjectionView } from "./projection-view";

// The return cards above a basket chart with Projections on (docs/PROJECTIONS.md): the basket in
// the chosen case, Your picks, the spread from Bear to Bull and the likely range of the simulated
// paths. Always four cards, built like ReturnCards' dense strip, so the strip never changes shape
// when the switch flips.

const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");

/** A % for one end of a range: whole from 10% up, one decimal below ("−4.2%", "+21%"). */
export const rangeEnd = (v: number) => signedPct(v, Math.abs(shownPct(v)) >= 10 ? 0 : 1);

/** "−8% to +27%", each end in its own colour. Figures are % already. */
export function RangeText({ lo, hi }: { lo: number; hi: number }) {
  return (
    <>
      <span className={tone(lo)}>{rangeEnd(lo)}</span>
      <span className="font-normal text-ink-soft"> to </span>
      <span className={tone(hi)}>{rangeEnd(hi)}</span>
    </>
  );
}

export function ProjectionCards({ view, empty, dense = false }: { view: ProjectionView | null; empty: boolean; dense?: boolean }) {
  const loading = !empty && !view;
  const h = view?.settings.h ?? 1;
  const caseName = view ? `${SCENARIO_LABEL[view.settings.scenario]} case` : "";
  const quiet = ` ${PROJECTION_DISCLAIMER}`;

  // a. The basket in the chosen case.
  const bRet = view?.basket.ret != null ? view.basket.ret * 100 : null;
  const bCagr = view?.basket.cagr != null ? view.basket.cagr * 100 : null;
  const basketSub = bRet == null ? undefined : h === 2 ? `${signedPct(bCagr)} a year` : caseName;
  const basketNote = bRet != null || loading ? undefined : empty || !view?.stocks.length ? "add stocks to see" : "no stock has 3 years of results and trading";

  // b. Your picks, its gap taken between the shown figures (as ReturnCards does).
  const picks = view?.picks ?? null;
  const pRet = picks?.ret != null ? picks.ret * 100 : null;
  const gap = pRet != null && bRet != null ? shownPct(pRet) - shownPct(bRet) : null;
  const allPicked = !!view && view.picksCount > 0 && view.picksCount >= view.stocks.length;
  const picksNote = picks
    ? pRet == null
      ? "no pick has 3 years of results and trading"
      : undefined
    : loading
      ? undefined
      : allPicked
        ? "all stocks: same as this basket"
        : "tick stocks in the table or the chart’s Stocks menu";

  // c. Bear to Bull, d. the likely range.
  const bear = view?.cases.bear;
  const bull = view?.cases.bull;
  const base = view?.cases.base;
  const sim = view?.simState === "ok" ? view.sim : null;
  const last = sim ? sim.lo.length - 1 : -1;

  return (
    <section aria-label="Projection summary" className={(dense ? "grid gap-2 " : "grid max-w-3xl gap-2 sm:gap-3 ") + "grid-cols-2 sm:grid-cols-4"}>
      <Card
        label={`This basket · ${h}Y`}
        value={bRet != null ? signedPct(bRet) : null}
        cls={tone(bRet)}
        loading={loading}
        sub={basketSub}
        note={basketNote}
        strong
        dense={dense}
        title={`The basket's projected return over the ${view?.period ?? "next year"} in the ${caseName || "chosen case"}, bought today and held.${quiet}`}
      />
      <Card
        label={picks ? `Your ${view?.picksCount ?? ""} picks` : "Your picks"}
        value={pRet != null ? signedPct(pRet) : null}
        cls={tone(pRet)}
        loading={loading}
        sub={gap == null ? undefined : Math.abs(gap) < 0.05 ? "level with basket" : `${signedPts(gap)} pts vs basket`}
        note={picksNote}
        dense={dense}
        title={`The stocks picked on the chart as their own basket, at the same weighting, in the same case.${quiet}`}
      />
      <Card
        label="Bear to Bull"
        value={bear != null && bull != null ? <RangeText lo={bear * 100} hi={bull * 100} /> : null}
        loading={loading}
        sub={base != null ? `Base ${signedPct(base * 100)}` : undefined}
        note={loading || (bear != null && bull != null) ? undefined : empty ? "add stocks to see" : "nothing projected"}
        dense={dense}
        title={`The basket's projected return in the Bear and Bull cases, same horizon: every stock at its own 10th or 90th percentile at once, so wider than the basket's own range (see Likely range).${quiet}`}
      />
      <Card
        label="Likely range"
        value={sim && last >= 0 ? <RangeText lo={sim.lo[last]} hi={sim.hi[last]} /> : null}
        loading={loading || (view?.simState === "loading" && view.basket.ret != null)}
        sub={sim ? "8 in 10 simulated paths" : view?.simState === "none" && view.basket.ret != null ? "needs a past year of prices" : undefined}
        note={loading ? undefined : empty ? "add stocks to see" : view?.basket.ret == null ? "nothing projected" : undefined}
        dense={dense}
        title={`Where 8 in 10 of 1,000 simulated paths end: averaging the chosen case (the typical path ends a little below it), swinging like the basket did over the past year.${quiet}`}
      />
    </section>
  );
}

// ReturnCards' Stat, for a figure that may be a range: label, the figure, a short line and a note.
function Card({
  label,
  value,
  cls,
  loading,
  sub,
  note,
  title,
  strong,
  dense,
}: {
  label: string;
  value: ReactNode;
  cls?: string;
  loading: boolean;
  sub?: string;
  note?: string;
  title?: string;
  strong?: boolean;
  dense?: boolean;
}) {
  return (
    <div title={title} className={"min-w-0 border " + (dense ? "min-h-[5.75rem] rounded-md px-2.5 py-1.5 sm:min-h-[5.625rem] sm:px-3 " : "rounded-xl px-2.5 py-2 sm:p-3 ") + (strong ? "border-accent bg-accent/5" : "border-line bg-panel")}>
      <div className="text-[10px] leading-snug text-ink-soft sm:text-[11px]">{label}</div>
      <div className={"mt-0.5 font-mono text-base font-bold sm:text-lg " + (value == null ? "text-ink-soft" : (cls ?? "text-ink"))}>
        {value != null ? value : loading ? <span role="img" aria-label="Loading" className="inline-block h-4 w-14 animate-pulse rounded bg-line/70 align-middle" /> : NA}
      </div>
      {sub && <div className="text-[10px] leading-snug text-ink-soft sm:text-[11px]">{sub}</div>}
      {note && <div className="line-clamp-2 text-[10px] leading-snug text-ink-soft sm:text-[11px]">{note}</div>}
    </div>
  );
}
