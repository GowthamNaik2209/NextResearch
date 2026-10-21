"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import { relativeStats, seriesStats } from "@/lib/baskets/stats";
import { basketCsv, csvFileName, type CsvStock } from "@/lib/baskets/csv";
import { loadSeries, type Load } from "./series";

// The stats grid under the return cards: risk and return of the basket's backtest over the
// chosen range, and how it moved against the Nifty 50. A flat, dense panel of mono figures; the
// CSV export sits in its header because it writes out exactly these numbers and the holdings.
const BENCH = { key: "b:nifty50", name: "Nifty 50" };

const monthName = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const day = (t: string) =>
  new Date(t).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
// Signed on the rounded figure, so a tiny loss never reads "−0.0%".
const signed = (v: number, dp = 1) => {
  const r = Number(v.toFixed(dp));
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(dp)}%`;
};

export function BasketStats({
  range,
  basketKey,
  name,
  weighting,
  stocks,
  compact = false,
  scope,
  heading: H = "h2",
  reload = 0,
}: {
  range: ChartRange;
  basketKey: string;
  name: string;
  weighting: "equal" | "mcap";
  stocks: CsvStock[];
  /** Two columns, for the basket page's side column. */
  compact?: boolean;
  /** Named in the title when the page also shows a narrower set (the table scoped to your picks). */
  scope?: string;
  heading?: "h2" | "h3";
  /** Bumped by the page's Retry: forgets a failed load so the panel tries again. */
  reload?: number;
}) {
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [seen, setSeen] = useState(reload);
  if (reload !== seen) {
    setSeen(reload);
    setLoads((m) => Object.fromEntries(Object.entries(m).filter(([, l]) => l.status !== "error")));
  }
  useEffect(() => {
    for (const key of [basketKey, BENCH.key]) {
      const id = `${key}|${range}`;
      if (loads[id]) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the series as loading, then fetches it
      setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
      loadSeries(key, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
    }
  }, [basketKey, range, loads]);

  const b = loads[`${basketKey}|${range}`];
  const n = loads[`${BENCH.key}|${range}`];
  const basket = b?.status === "ok" ? b.data : null;
  const bench = n?.status === "ok" ? n.data.points : null;
  const s = useMemo(() => (basket ? seriesStats(basket.points) : null), [basket]);
  const r = useMemo(() => (basket && bench ? relativeStats(basket.points, bench) : null), [basket, bench]);

  if (b?.status === "error") return null;
  const loading = !basket;
  const freq = s?.periodsPerYear === 52 ? "weekly" : s?.periodsPerYear === 12 ? "monthly" : "daily";

  const exportCsv = () => {
    if (!basket) return;
    const csv = basketCsv({
      name,
      range,
      weighting,
      benchName: BENCH.name,
      points: basket.points,
      bench,
      stats: s,
      rel: r,
      holdings: basket.holdings ?? [],
      excluded: basket.excluded,
      stocks,
      exportedAt: new Date(),
    });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(name, range);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");
  const cells: {
    label: string;
    value: string;
    sub?: string;
    cls?: string;
    help: string;
  }[] = s
    ? [
        {
          label: "Return",
          value: signed(s.ret),
          cls: tone(s.ret),
          help: "Change in the basket's value over the range.",
        },
        {
          label: "CAGR",
          value: s.cagr != null ? signed(s.cagr) : "—",
          sub: s.cagr == null ? "under a year" : undefined,
          cls: tone(s.cagr),
          help: "Compound growth per year. Not shown under a year, where annualising misleads.",
        },
        {
          label: "Volatility",
          value: s.vol != null ? `${s.vol.toFixed(1)}%` : "—",
          sub: "annualised",
          help: `Standard deviation of ${freq} returns, scaled to a year.`,
        },
        {
          label: "Max drawdown",
          value: signed(s.maxDd),
          sub: s.ddPeak && s.ddTrough ? `${day(s.ddPeak)} → ${day(s.ddTrough)}${s.ddRecovered ? "" : " · not regained"}` : "no fall",
          cls: s.maxDd < 0 ? "text-danger" : "text-ink-soft",
          help: "Deepest fall from a previous high, peak to trough, and whether the basket has climbed back to that high.",
        },
        {
          label: "Sortino",
          value: s.sortino != null ? s.sortino.toFixed(2).replace("-", "−") : "—",
          sub: "target 0%",
          help: "Annualised return per unit of downside volatility (only falling bars count). Higher is better; above 1 is good.",
        },
        {
          label: `Beta · ${BENCH.name}`,
          value: r?.beta != null ? r.beta.toFixed(2).replace("-", "−") : n?.status === "error" ? "—" : "…",
          help: `How much the basket moves for a 1% move in the ${BENCH.name}. Above 1 swings more than the market.`,
        },
        {
          label: "Up capture",
          value: r?.upCapture != null ? `${r.upCapture.toFixed(0)}%` : "—",
          help: `How much of the ${BENCH.name}'s rise the basket took, on the ${freq} bars the index went up. Above 100% beats it.`,
        },
        {
          label: "Down capture",
          value: r?.downCapture != null ? `${r.downCapture.toFixed(0)}%` : "—",
          help: `How much of the ${BENCH.name}'s fall the basket took, on the bars the index went down. Below 100% loses less.`,
        },
        {
          label: "Best month",
          value: s.bestMonth ? signed(s.bestMonth.ret) : "—",
          sub: s.bestMonth ? monthName(s.bestMonth.month) : undefined,
          cls: tone(s.bestMonth?.ret),
          help: "Best calendar month, from one month-end close to the next.",
        },
        {
          label: "Worst month",
          value: s.worstMonth ? signed(s.worstMonth.ret) : "—",
          sub: s.worstMonth ? monthName(s.worstMonth.month) : undefined,
          cls: tone(s.worstMonth?.ret),
          help: "Worst calendar month, from one month-end close to the next.",
        },
        {
          label: BENCH.name,
          value: r ? signed(r.benchRet) : "—",
          sub: "same dates",
          cls: tone(r?.benchRet),
          help: `The ${BENCH.name}'s own change over the basket's dates (price index, no dividends).`,
        },
        {
          label: "Months up",
          value: s.months ? `${s.upMonths}/${s.months}` : "—",
          sub: s.months ? `${Math.round((s.upMonths / s.months) * 100)}% of months` : "under a month",
          help: "Calendar months the basket ended higher than the month before, out of the months in the range.",
        },
      ]
    : [];

  return (
    <section aria-label="Backtest statistics" className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <H className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft sm:text-[11px]">
          Statistics{scope ? ` · ${scope}` : ""} · {range}
          {s ? ` · ${freq} bars` : ""}
        </H>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!basket}
          className="min-h-8 rounded border border-line px-2 text-[11px] font-semibold text-ink hover:border-accent disabled:opacity-40 pointer-coarse:min-h-9"
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <div aria-busy className="h-[7.5rem] animate-pulse bg-line/40" />
      ) : !s ? (
        <p className="px-3 py-3 text-xs text-ink-soft">Not enough price history in this range to measure. Try a longer period.</p>
      ) : (
        <div className="overflow-hidden">
          <dl className={"-mb-px -mr-px grid " + (compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6")}>
            {cells.map((c) => (
              <div key={c.label} title={c.help} className="min-w-0 border-b border-r border-line/70 px-2.5 py-1.5">
                <dt className="truncate text-[10px] leading-snug text-ink-soft sm:text-[11px]">{c.label}</dt>
                <dd className={"font-mono text-sm font-semibold " + (c.cls ?? "text-ink")}>{c.value}</dd>
                {c.sub && <dd className="text-[10px] leading-snug text-ink-soft">{c.sub}</dd>}
              </div>
            ))}
          </dl>
        </div>
      )}
      <details className="px-3 py-1.5 text-[11px] text-ink-soft">
        <summary className="cursor-pointer select-none">What these mean</summary>
        <ul className="mt-1 flex flex-col gap-0.5 leading-snug">
          {cells.map((c) => (
            <li key={c.label}>
              <b className="font-semibold text-ink">{c.label}</b>: {c.help}
            </li>
          ))}
          <li>Past prices only: not a forecast. The CSV holds these figures, the holdings and the basket&rsquo;s value line, not raw prices.</li>
        </ul>
      </details>
    </section>
  );
}
