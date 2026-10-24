"use client";

import type { ReactNode } from "react";
import { NA, pct, signedPct } from "@/lib/format";
import { signedPts } from "@/lib/baskets/fmt";
import { rangeEnd } from "./ProjectionCards";
import { HORIZON_LONG, PROJECTION_DISCLAIMER, SCENARIO_LABEL, type ProjectionView } from "./projection-view";

// The stats grid with Projections on (docs/PROJECTIONS.md): the basket's projected return in each
// case, the likely range, chances of a loss and of a 10% fall, the drawdowns of the simulated paths
// and which stocks are projected. Built like BasketStats (same frame, cells and help), so the panel
// keeps its place and size when the switch flips. Export Excel at the top of the page holds them with every case.

// A ratio with a typographic minus, never "−0.00".
const ratio = (v: number) => signedPct(v, 2).replace("%", "").replace("+", "");
const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");
const LOADING = "…";

type Cell = { label: string; value: string; sub?: string; cls?: string; help: string; title?: string };

export function ProjectionStats({
  view,
  compact,
  heading: H,
  empty,
  scope,
  tools,
}: {
  view: ProjectionView | null;
  /** Two columns, for the basket page's side column. */
  compact: boolean;
  heading: "h2" | "h3";
  /** No stocks yet: the panel keeps its place and size, with a line saying so. */
  empty: boolean;
  /** Named in the title when the page also shows a narrower set (the table scoped to your picks). */
  scope?: string;
  /** Controls on the right of the header (the page's All stocks / Your picks). */
  tools?: ReactNode;
}) {
  const loading = !empty && !view;
  const h = view?.settings.h ?? 1;
  const b = view?.basket ?? null;
  const nothing = !!view && b?.ret == null;
  const sim = view?.simState === "ok" ? view.sim : null;
  const simWait = view?.simState === "loading";
  const noSimTitle = "Needs the basket's prices over the past year, which couldn't be loaded.";
  // A cell that needs the simulated paths (or the past year's volatility): "…" while that loads, "—" without it.
  const simCell = (value: (() => string) | null): { value: string; title?: string } =>
    value ? { value: value() } : simWait ? { value: LOADING } : { value: NA, title: noSimTitle };

  const ret = b?.ret != null ? b.ret * 100 : null;
  const cagr = b?.cagr != null ? b.cagr * 100 : null;
  const bear = view?.cases.bear != null ? view.cases.bear * 100 : null;
  const bull = view?.cases.bull != null ? view.cases.bull * 100 : null;
  const vol = view?.vol != null ? view.vol * 100 : null;
  const last = sim ? sim.lo.length - 1 : -1;
  const top = b?.holdings.length ? b.holdings.reduce((a, x) => (x.contribution > a.contribution ? x : a)) : null;
  const k = b?.holdings.length ?? 0;
  const n = k + (b?.leftOut.length ?? 0);
  const m = b?.leftOut.length ?? 0;

  const range = simCell(sim && last >= 0 ? () => `${rangeEnd(sim.lo[last])} to ${rangeEnd(sim.hi[last])}` : null);
  const pLoss = simCell(sim ? () => pct(sim.pLoss * 100, 0) : null);
  const pFall = simCell(sim ? () => pct(sim.pFall10 * 100, 0) : null);
  const volCell = simCell(vol != null ? () => pct(vol) : null);
  const ddT = simCell(sim ? () => signedPct(sim.maxDdTypical) : null);
  const ddB = simCell(sim ? () => signedPct(sim.maxDdBad) : null);
  const rr = simCell(cagr != null && vol != null && vol > 0 ? () => ratio(cagr / vol) : null);

  const cells: Cell[] = [
    { label: "Projected return", value: signedPct(ret), sub: view ? `${SCENARIO_LABEL[view.settings.scenario]} case` : undefined, cls: tone(ret), help: `The basket's change in value over the ${view?.period ?? "next year"} in the chosen case, bought today and held.` },
    {
      label: "Per year",
      value: signedPct(cagr),
      sub: h === 1 ? "1-year horizon" : "compound",
      cls: tone(cagr),
      help: "The projected return as compound growth a year. Over a 1-year horizon it is the same figure.",
    },
    { label: "Bear case", value: signedPct(bear), cls: tone(bear), help: "The weighted average of each stock's Bear case, its 10th-percentile outcome at its own volatility. It assumes every stock at its own low at once, so it is wider than the basket's real range: see Likely range." },
    { label: "Bull case", value: signedPct(bull), cls: tone(bull), help: "The weighted average of each stock's Bull case, its 90th-percentile outcome at its own volatility. It assumes every stock at its own high at once, so it is wider than the basket's real range: see Likely range." },
    {
      label: "Likely range",
      ...range,
      sub: "8 in 10 paths",
      cls: sim && last >= 0 && tone(sim.lo[last]) === tone(sim.hi[last]) ? tone(sim.lo[last]) : "text-ink",
      help: "Where 8 in 10 of 1,000 simulated paths end: averaging the chosen case (the typical path ends a little below it), swinging like the basket did over the past year. This is the basket-level range, since its stocks don't all move together.",
    },
    { label: "Chance of loss", ...pLoss, sub: "at the end, simulated", help: "Share of the simulated paths that end below today's value." },
    { label: "10% fall", ...pFall, sub: "chance, at some point", help: "Share of the simulated paths that fall 10% or more from a high at some point." },
    { label: "Volatility", ...volCell, sub: "past year, annualised", help: "How much the basket swung over the past year (its 1-year backtest), scaled to a year. The simulated paths swing by this much." },
    { label: "Max drawdown", ...ddT, sub: "typical path", cls: sim && sim.maxDdTypical < 0 ? "text-danger" : "text-ink-soft", help: "Deepest fall from a high on the typical simulated path (the median of the paths' worst falls)." },
    { label: "Bad drawdown", ...ddB, sub: "1 in 10 paths", cls: sim && sim.maxDdBad < 0 ? "text-danger" : "text-ink-soft", help: "Deepest fall from a high that 1 in 10 simulated paths reach or pass." },
    { label: "Return / risk", ...rr, sub: "a year ÷ volatility", help: "Projected return a year divided by the past year's volatility. Higher is better." },
    {
      label: "Top contributor",
      value: top?.ticker ?? NA,
      sub: top ? `${signedPts(top.contribution)} pts` : undefined,
      help: "The stock adding the most points to the basket's projected return (its weight times its own return).",
    },
    {
      label: "Stocks projected",
      value: b ? `${k} of ${n}` : NA,
      sub: b ? (m ? `${m} left out` : "all projected") : undefined,
      help: "Stocks with at least 3 years of results and of trading, and a price in our last data update. A left-out stock's share is spread over the rest in proportion to their weights.",
    },
    { label: "Nifty 50", value: NA, sub: "not projected", help: "We have no forecast for an index, so the Nifty 50 isn't projected." },
  ];

  return (
    <section aria-label="Projection statistics" className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <H className="text-balance text-[10px] font-semibold uppercase tracking-wider text-ink-soft sm:text-[11px]">
          <span className="whitespace-nowrap">Projection statistics</span>
          {scope ? ` · ${scope}` : ""} · <span className={compact ? "" : "sm:hidden"}>{h}Y</span>
          {!compact && <span className="whitespace-nowrap max-sm:hidden">next {HORIZON_LONG[h]}</span>}
          {/* The side column is narrow: the case takes its own line there rather than breaking mid-title. */}
          {view && (
            <span title={view.caseLabel} className={compact ? "block truncate" : ""}>
              {compact ? "" : " · "}
              {view.caseLabel}
            </span>
          )}
        </H>
        {tools}
      </div>
      {/* The same grid of cells whatever the state, each cell a fixed height, so the panel never
          changes size; a message sits over it. */}
      <div className="relative overflow-hidden" aria-busy={loading || undefined}>
        <dl className={"-mb-px -mr-px grid " + (compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6") + (view && !nothing ? "" : " opacity-40")}>
          {cells.map((c) => (
            <div key={c.label} title={c.title ? `${c.help} ${c.title}` : c.help} className="min-h-[4.5rem] min-w-0 border-b border-r border-line/70 px-2.5 py-1.5">
              <dt className="truncate text-[10px] leading-snug text-ink-soft sm:text-[11px]">{c.label}</dt>
              <dd className={"font-mono text-sm font-semibold " + (c.value === NA || c.value === LOADING ? "text-ink-soft" : (c.cls ?? "text-ink"))}>
                {loading ? <span className="inline-block h-4 w-12 animate-pulse rounded bg-line/70 align-middle" /> : c.value}
              </dd>
              {c.sub && <dd className="line-clamp-2 text-[10px] leading-snug text-ink-soft">{c.sub}</dd>}
            </div>
          ))}
        </dl>
        {(empty || nothing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel/70 px-4 text-center text-xs text-ink-soft">
            {empty ? "Add stocks to see the projection." : "No stock in this basket has the 3 years of results and trading a projection needs, so nothing is projected."}
          </div>
        )}
      </div>
      <details className="group px-3 pb-1.5 text-[11px] text-ink-soft">
        {/* A flex summary drops the browser's triangle, so it draws its own; tall enough to tap. */}
        <summary className="flex min-h-8 cursor-pointer select-none list-none items-center gap-1 pointer-coarse:min-h-9 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="inline-block text-[9px] transition-transform group-open:rotate-90">
            ▶
          </span>
          What these mean
        </summary>
        <ul className="mt-1 flex flex-col gap-0.5 leading-snug">
          {cells.map((c) => (
            <li key={c.label}>
              <b className="font-semibold text-ink">{c.label}</b>: {c.help}
            </li>
          ))}
          <li>Bought today at the target weights and held; rebalancing doesn&rsquo;t apply.</li>
          <li>{PROJECTION_DISCLAIMER}</li>
        </ul>
      </details>
    </section>
  );
}
