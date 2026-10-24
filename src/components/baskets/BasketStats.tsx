"use client";

import { useMemo, type ReactNode } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import { relativeStats, seriesStats } from "@/lib/baskets/stats";
import { rebalanceLabel, weightingLabel, type Strategy } from "@/lib/baskets/strategy";
import { fmtDay, fmtMonth, NA, pct, signedPct } from "@/lib/format";
import { useSeries } from "./use-series";
import { basisLabel, pastPeriod } from "./labels";

// The stats grid under the return cards: risk and return of the basket's backtest over the
// chosen range and strategy (named in the title), how it moved against the Nifty 50 and, when it
// is rebalanced, the trading that took. A flat, dense panel of mono figures (the page's Export
// Excel writes out exactly these numbers with the holdings).
const BENCH = { key: "b:nifty50", name: "Nifty 50" };

const monthName = (m: string) => fmtMonth(`${m}-01T00:00:00Z`);
const day = (t: string) => fmtDay(t, { short: true });
const signed = signedPct;
// A ratio with a typographic minus, never "−0.00".
const ratio = (v: number) => signedPct(v, 2).replace("%", "").replace("+", "");

const nb = (t: string) => t.replace(/ /g, "\u00a0");

export function BasketStats({
  range,
  basketKey,
  strategy,
  compact = false,
  scope,
  heading: H = "h2",
  reload = 0,
  empty = false,
  tools,
}: {
  range: ChartRange;
  basketKey: string;
  strategy: Strategy;
  /** Two columns, for the basket page's side column. */
  compact?: boolean;
  /** Named in the title when the page also shows a narrower set (the table scoped to your picks). */
  scope?: string;
  heading?: "h2" | "h3";
  /** Bumped by the page's Retry: forgets a failed load so the panel tries again. */
  reload?: number;
  /** No stocks yet: the panel keeps its place and size, with a line saying so. */
  empty?: boolean;
  /** Controls on the right of the header (the page's All stocks / Your picks). */
  tools?: ReactNode;
}) {
  const { get, retry } = useSeries(empty ? [] : [basketKey, BENCH.key], range, { reload });
  const b = get(basketKey);
  const n = get(BENCH.key);
  const basket = b?.status === "ok" ? b.data : null;
  const bench = n?.status === "ok" ? n.data.points : null;
  const s = useMemo(() => (basket ? seriesStats(basket.points) : null), [basket]);
  const r = useMemo(() => (basket && bench ? relativeStats(basket.points, bench) : null), [basket, bench]);

  // A failed load keeps the panel, at its size, with the reason and a Retry.
  const failed = !empty && b?.status === "error";
  const loading = !empty && !failed && !basket;
  // Years the range covers, for turnover a year (none under a year, where it would mislead).
  const span = basket && basket.points.length > 1 ? (Date.parse(basket.points[basket.points.length - 1].t) - Date.parse(basket.points[0].t)) / (365.25 * 86_400_000) : 0;
  const years = span >= 0.95 ? span : null;
  const freq = s?.periodsPerYear === 52 ? "weekly" : s?.periodsPerYear === 12 ? "monthly" : "daily";



  const held = strategy.rebalance === "never";
  const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");
  const cells: {
    label: string;
    value: string;
    sub?: string;
    cls?: string;
    help: string;
  }[] = [
    {
      label: "Return",
      value: signed(s?.ret),
      cls: tone(s?.ret),
      help: "Change in the basket's value over the range.",
    },
    {
      label: "CAGR",
      value: signed(s?.cagr),
      sub: s && s.cagr == null ? "not for 1Y or less" : undefined,
      cls: tone(s?.cagr),
      help: "Compound growth per year. Not shown for a year or less: there it would only re-scale the return by the period's exact day count.",
    },
    {
      label: "Volatility",
      value: pct(s?.vol),
      sub: "annualised",
      help: `Standard deviation of ${freq} returns, scaled to a year.`,
    },
    {
      label: "Max drawdown",
      value: signed(s?.maxDd),
      // Non-breaking spaces inside each date and phrase, so a narrow cell breaks only between them.
      sub: !s ? undefined : s.ddPeak && s.ddTrough ? `${nb(day(s.ddPeak))} → ${nb(day(s.ddTrough))}${s.ddRecovered ? "" : ` · ${nb("not regained")}`}` : "no fall",
      cls: s && s.maxDd < 0 ? "text-danger" : "text-ink-soft",
      help: "Deepest fall from a previous high, peak to trough, and whether the basket has climbed back to that high.",
    },
    {
      label: "Sortino",
      value: s?.sortino != null ? ratio(s.sortino) : NA,
      sub: "target 0%",
      help: "Annualised return per unit of downside volatility (only falling bars count). Higher is better; above 1 is good.",
    },
    {
      label: `Beta · ${BENCH.name}`,
      value: r?.beta != null ? ratio(r.beta) : n?.status === "error" || !s ? NA : "…",
      help: `How much the basket moves for a 1% move in the ${BENCH.name}. Above 1 swings more than the market.`,
    },
    {
      label: "Up capture",
      value: pct(r?.upCapture, 0),
      help: `How much of the ${BENCH.name}'s rise the basket took, on the ${freq} bars the index went up. Above 100% beats it.`,
    },
    {
      label: "Down capture",
      value: pct(r?.downCapture, 0),
      help: `How much of the ${BENCH.name}'s fall the basket took, on the bars the index went down. Below 100% loses less.`,
    },
    {
      label: "Best month",
      value: signed(s?.bestMonth?.ret),
      sub: s?.bestMonth ? monthName(s.bestMonth.month) : undefined,
      cls: tone(s?.bestMonth?.ret),
      help: "Best calendar month, from one month-end close to the next.",
    },
    {
      label: "Worst month",
      value: signed(s?.worstMonth?.ret),
      sub: s?.worstMonth ? monthName(s.worstMonth.month) : undefined,
      cls: tone(s?.worstMonth?.ret),
      help: "Worst calendar month, from one month-end close to the next.",
    },
    {
      label: BENCH.name,
      value: signed(r?.benchRet),
      sub: "same dates",
      cls: tone(r?.benchRet),
      help: `The ${BENCH.name}'s own change over the basket's dates (price index, no dividends).`,
    },
    {
      label: "Months up",
      value: s?.months ? `${s.upMonths}/${s.months}` : NA,
      sub: !s ? undefined : s.months ? `${Math.round((s.upMonths / s.months) * 100)}% of months` : "under a month",
      help: "Calendar months the basket ended higher than the month before, out of the months in the range.",
    },
    // Always there (a "—" when not rebalanced), so the grid keeps its shape when rebalancing is switched.
    {
      label: "Turnover",
      value: held ? NA : pct(basket?.turnover, 0),
      sub: held ? "when rebalanced" : basket?.turnover != null && years ? `${(basket.turnover / years).toFixed(0)}% a year` : "one way, total",
      help: "Share of the basket bought and sold to get back to the target weights, counted one way and added up over every rebalance. Each 100% means trading the whole basket once. Shown when the basket is rebalanced.",
    },
    {
      label: "Trades",
      value: held ? NA : basket?.trades != null ? String(basket.trades) : NA,
      sub: held ? "when rebalanced" : `${basket?.rebalances?.length ?? 0} rebalance${basket?.rebalances?.length === 1 ? "" : "s"}`,
      help: "Buys and sells across all the rebalances (the first day's purchase not counted). No costs are taken off the return: brokerage, taxes and slippage would lower it.",
    },
  ];

  return (
    <section aria-label="Backtest statistics" className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <H className="text-balance text-[10px] font-semibold uppercase tracking-wider text-ink-soft sm:text-[11px]">
          <span className="whitespace-nowrap">Backtest statistics</span>
          {scope ? ` · ${scope}` : ""} · <span className={compact ? "" : "sm:hidden"}>{range}</span>
          {!compact && <span className="whitespace-nowrap max-sm:hidden">{pastPeriod(range)}</span>}
          {/* The side column is narrow: the settings take their own line there rather than breaking mid-title. */}
          <span title={`${weightingLabel(strategy)}, ${rebalanceLabel(strategy)}`} className={compact ? "block truncate" : ""}>
            {compact ? "" : " · "}
            {basisLabel(strategy)}
          </span>
        </H>
        <div className="flex flex-none items-center gap-1.5">
        {tools}
        </div>
      </div>
      {/* The same grid of cells whatever the state (loading, no stocks, a failed load, too short a
          range), each cell a fixed height, so the panel never changes size; a message sits over it. */}
      <div className="relative overflow-hidden" aria-busy={loading || undefined}>
        <dl className={"-mb-px -mr-px grid " + (compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6") + (s ? "" : " opacity-40")}>
          {cells.map((c) => (
            <div key={c.label} title={c.help} className="h-[4.5rem] min-w-0 overflow-hidden border-b border-r border-line/70 px-2.5 py-1.5">
              <dt className="truncate text-[10px] leading-snug text-ink-soft sm:text-[11px]">{c.label}</dt>
              <dd className={"font-mono text-sm font-semibold " + (c.cls ?? "text-ink")}>
                {loading ? <span className="inline-block h-4 w-12 animate-pulse rounded bg-line/70 align-middle" /> : c.value}
              </dd>
              {c.sub && <dd className="line-clamp-2 text-[10px] leading-snug text-ink-soft">{c.sub}</dd>}
            </div>
          ))}
        </dl>
        {(empty || failed || (!loading && !s)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel/70 px-4 text-center text-xs text-ink-soft">
            {empty ? (
              "Add stocks to see the statistics."
            ) : failed ? (
              <span>
                Couldn&rsquo;t load the statistics right now.{" "}
                <button type="button" onClick={() => retry(basketKey)} className="font-semibold text-accent underline">
                  Retry
                </button>
              </span>
            ) : (
              "Not enough price history in this range to measure. Try a longer period."
            )}
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
          <li>Measured on {freq} closes against the {BENCH.name} over the same dates.</li>
          <li>Past prices only: not a forecast. Export Excel (at the top of the page) holds these figures, the holdings and the basket&rsquo;s value line, not raw prices.</li>
        </ul>
      </details>
    </section>
  );
}
