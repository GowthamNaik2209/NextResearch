"use client";

import { Fragment, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import type { PricePoint } from "@/lib/baskets/backtest";
import { periodsPerYear } from "@/lib/baskets/stats";
import { CAPTURE_MIN_MONTHS, alignTo, captureIsGood, drawdownEpisodes, monthlyCapture, monthlyMatrix, rollingReturn, underwater } from "@/lib/baskets/analysis";
import { fmtDay, NA, pct, signedPct } from "@/lib/format";
import { useSeries } from "./use-series";
import { MINI_SEG, Panel, miniSegBtn } from "./Panel";
import { pastPeriod } from "./labels";

// Backtest analysis under the stats grid: how deep and how long the basket fell (underwater
// curve and worst drawdowns), its calendar-month returns, rolling one-year return and how much of
// the benchmark's up and down months it captured. Small charts are plain inline SVG drawn with the
// theme's CSS variables, so light and dark both work without re-rendering.
type View = "dd" | "monthly" | "rolling" | "capture";
const VIEWS: { id: View; label: string }[] = [
  { id: "dd", label: "Drawdown" },
  { id: "monthly", label: "Monthly" },
  { id: "rolling", label: "Rolling 1Y" },
  { id: "capture", label: "Capture" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_RANGES: ChartRange[] = ["2Y", "3Y", "5Y", "MAX"];

const signed = signedPct;
const day = (t: string) => fmtDay(t, { short: true });
const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");

export function BasketAnalysis({
  range,
  basketKey,
  benchKey = "b:nifty50",
  benchName = "Nifty 50",
  heading = "h2",
  reload = 0,
  empty = false,
  scope,
  scopeTools,
  single,
}: {
  range: ChartRange;
  basketKey: string;
  benchKey?: string;
  benchName?: string;
  heading?: "h2" | "h3";
  /** Bumped by the page's Retry: forgets a failed load so the panel tries again. */
  reload?: number;
  /** No stocks yet: the panel keeps its place and size, with a line saying so. */
  empty?: boolean;
  /** What it measures when not the whole basket ("your 3 picks"). */
  scope?: string;
  /** The All / Picks switch. */
  scopeTools?: ReactNode;
  /** One stock's own prices (the stock pop-up's Backtest view): its ticker names the line. */
  single?: string;
}) {
  const it = single ? "stock" : "basket";
  const name = single ?? (scope ? "Your picks" : "Basket");
  const [view, setView] = useState<View>("dd");
  const { get, retry } = useSeries(empty ? [] : [basketKey, benchKey], range, { reload });
  const b = get(basketKey);
  const n = get(benchKey);
  const points = useMemo(() => (b?.status === "ok" ? b.data.points.filter((p) => p.c > 0) : null), [b]);
  const bench = useMemo(() => (n?.status === "ok" ? n.data.points.filter((p) => p.c > 0) : n?.status === "error" ? [] : null), [n]);

  // A failed load keeps the panel at its size, with the reason and a Retry, instead of vanishing.
  const failed = !empty && b?.status === "error";
  const ready = points && bench && points.length >= 2;
  const freq = points && points.length >= 3 ? (periodsPerYear(points) === 52 ? "weekly" : periodsPerYear(points) === 12 ? "monthly" : "daily") : null;

  return (
    <Panel
      heading={heading}
      title={
        <>
          Backtest analysis{scope ? ` · ${scope}` : ""} · <span className="sm:hidden">{range}</span>
          <span className="max-sm:hidden">{pastPeriod(range)}</span>
        </>
      }
      label={`Backtest analysis${scope ? `, ${scope}` : ""}, ${pastPeriod(range)}`}
      infoLabel="About the backtest analysis"
      info={
        <ul className="flex flex-col gap-1">
          <li><b>Drawdown</b>: how far below its last high the {it} was, and its 5 worst falls.</li>
          <li><b>Monthly</b>: each calendar month&rsquo;s return.</li>
          <li><b>Rolling 1Y</b>: the 1-year return through time.</li>
          <li><b>Capture</b>: how it moved in the Nifty&rsquo;s up and down months.</li>
          {freq && <li>{single ? "Same prices as the chart" : "Same basket and settings as the chart"}, on {freq} closes.</li>}
        </ul>
      }
      tools={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {scopeTools}
          <div role="tablist" aria-label="Analysis view" className={MINI_SEG}>
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} className={miniSegBtn(view === v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {empty || failed ? (
        <div className="flex h-[13rem] items-center justify-center px-4 text-center text-xs text-ink-soft">
          {empty ? (
            "Add stocks to see how the basket fell and recovered, month by month."
          ) : (
            <span>
              Couldn&rsquo;t load the backtest analysis right now.{" "}
              <button type="button" onClick={() => retry(basketKey)} className="font-semibold text-accent underline">
                Retry
              </button>
            </span>
          )}
        </div>
      ) : !ready ? (
        b?.status === "ok" && points && points.length < 2 ? (
          <div className="flex h-[13rem] items-center justify-center px-4 text-center text-xs text-ink-soft">Not enough history in this range.</div>
        ) : (
          <div aria-busy className="h-[13rem] animate-pulse bg-line/40" />
        )
      ) : view === "dd" ? (
        <DrawdownView points={points} bench={bench} benchName={benchName} name={name} />
      ) : view === "monthly" ? (
        <MonthlyView points={points} bench={bench} benchName={benchName} name={single ?? "basket"} />
      ) : view === "rolling" ? (
        <RollingView points={points} bench={bench} benchName={benchName} range={range} name={name} />
      ) : (
        <CaptureView points={points} bench={bench} benchName={benchName} it={it} />
      )}
      {ready && bench.length === 0 && <p className="border-t border-line px-3 py-1 text-[10px] text-ink-soft">{benchName} could not be loaded; {it} only.</p>}
    </Panel>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="px-3 py-3 text-[11px] text-ink-soft">{children}</p>;
}

/* ---------------------------------------------------------------- Drawdown */

function DrawdownView({ points, bench, benchName, name }: { points: PricePoint[]; bench: PricePoint[]; benchName: string; /** The line's name: "Basket", or "Your picks". */ name: string }) {
  const { dates, series, episodes } = useMemo(() => {
    const uw = underwater(points);
    const bMap = new Map(underwater(alignTo(points, bench)).map((p) => [p.t, p.dd]));
    return {
      dates: uw.map((p) => p.t),
      series: [
        { name, color: "var(--danger)", area: true, values: uw.map((p) => p.dd) },
        ...(bench.length ? [{ name: benchName, color: "var(--ink-soft)", dash: true, values: uw.map((p) => bMap.get(p.t) ?? null) }] : []),
      ],
      episodes: drawdownEpisodes(points, 5),
    };
  }, [points, bench, benchName, name]);

  return (
    <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
        <SubTitle>% below its previous high</SubTitle>
        <LineChart dates={dates} series={series} />
      </div>
      <div className="min-w-0">
        <SubTitle>{episodes.length === 1 ? "Worst drawdown" : `Worst ${episodes.length || ""} drawdowns`}</SubTitle>
        {episodes.length === 0 ? (
          <Note>No fall from a high in this range.</Note>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[19rem] text-[11px]">
              <thead className="text-[10px] text-ink-soft">
                <tr className="border-b border-line">
                  <Th left>#</Th>
                  <Th>Depth</Th>
                  <Th>Peak</Th>
                  <Th>Trough</Th>
                  <Th>Recovered</Th>
                  <Th>Days</Th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {episodes.map((e, i) => (
                  <tr key={e.peak} className="border-b border-line/60 last:border-b-0">
                    <td className="px-2 py-1 text-ink-soft">{i + 1}</td>
                    <td className="px-2 py-1 text-right font-semibold text-danger">{signed(e.depth)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">{day(e.peak)}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">{day(e.trough)}</td>
                    <td className={"whitespace-nowrap px-2 py-1 text-right " + (e.recovered ? "" : "text-ink-soft")}>{e.recovered ? day(e.recovered) : "not yet"}</td>
                    <td className="px-2 py-1 text-right" title={e.recovered ? "Peak to recovery" : "Peak to the last bar"}>
                      {e.days}
                      {e.recovered ? "" : "+"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Monthly */

function MonthlyView({ points, bench, benchName, name }: { points: PricePoint[]; bench: PricePoint[]; benchName: string; /** The line's name in a month's readout: "basket", or a stock's ticker. */ name: string }) {
  const rows = useMemo(() => monthlyMatrix(points, bench), [points, bench]);
  // The tapped month's basket and benchmark figures, shown under the grid (a phone can't hover).
  const [picked, setPicked] = useState<string | null>(null);
  const spansTwo = points[0].t.slice(0, 7) !== points[points.length - 1].t.slice(0, 7);
  if (!spansTwo || !rows.length) return <Note>The range sits inside one calendar month; pick a longer range for monthly returns.</Note>;

  const all = rows.flatMap((r) => r.months.filter((x): x is number => x != null));
  const scale = Math.max(2, Math.min(15, Math.max(...all.map(Math.abs))));
  const bg = (v: number | null) => {
    if (v == null) return undefined;
    const pctMix = Math.round(10 + Math.min(Math.abs(v) / scale, 1) * 55);
    return `color-mix(in srgb, ${v >= 0 ? "var(--pos)" : "var(--danger)"} ${pctMix}%, var(--panel))`;
  };
  // Cells are tight: the number alone (no "+" or "%"), a fall in red with a typographic minus.
  const fmt = (v: number) => pct(v).replace("%", "");

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-[10px] sm:text-[11px]">
          <thead className="text-ink-soft">
            <tr className="border-b border-line">
              <Th left>Year</Th>
              {MONTHS.map((m) => (
                <Th key={m}>{m}</Th>
              ))}
              <Th>Total</Th>
              <Th title={`${benchName} over the same months`}>{benchName.length > 8 ? "Bench" : benchName}</Th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => (
              <tr key={r.year} className="border-b border-line/60 last:border-b-0">
                <td className="sticky left-0 bg-panel px-1.5 py-1 font-semibold text-ink-soft">{r.year}</td>
                {r.months.map((v, i) => (
                  <td key={i} className="border-l border-line/40 p-0 text-right text-ink" style={{ background: bg(v) }}>
                    {v != null &&
                      (() => {
                        const label = `${MONTHS[i]} ${r.year}: ${name} ${signed(v)}${r.bench[i] != null ? ` · ${benchName} ${signed(r.bench[i]!)}` : ""}`;
                        return (
                          <button type="button" title={label} aria-label={label} aria-pressed={picked === label} onClick={() => setPicked(label)} className="block w-full px-1 py-1 text-right aria-pressed:outline aria-pressed:outline-1 aria-pressed:-outline-offset-1 aria-pressed:outline-ink pointer-coarse:min-h-9">
                            {fmt(v)}
                          </button>
                        );
                      })()}
                  </td>
                ))}
                <td className={"border-l border-line px-1.5 py-1 text-right font-semibold " + tone(r.total)}>{r.total == null ? NA : fmt(r.total)}</td>
                <td className={"px-1.5 py-1 text-right " + tone(r.benchTotal)}>{r.benchTotal == null ? NA : fmt(r.benchTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-3 py-1 text-[10px] leading-snug text-ink-soft">
        <b aria-live="polite" className="block font-mono font-semibold text-ink empty:hidden">
          {picked}
        </b>
        % per calendar month, month-end close to month-end close; the first month counts from the range&rsquo;s first close, so it may be partial. Tap a month for the {benchName}.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Rolling */

function RollingView({ points, bench, benchName, range, name }: { points: PricePoint[]; bench: PricePoint[]; benchName: string; range: ChartRange; name: string }) {
  const data = useMemo(() => {
    const a = rollingReturn(points, 365);
    if (!a.length) return null;
    const bMap = new Map(rollingReturn(alignTo(points, bench), 365).map((p) => [p.t, p.ret]));
    return {
      dates: a.map((p) => p.t),
      series: [
        { name, color: "var(--accent)", values: a.map((p) => p.ret) },
        ...(bench.length ? [{ name: benchName, color: "var(--ink-soft)", dash: true, values: a.map((p) => bMap.get(p.t) ?? null) }] : []),
      ],
    };
  }, [points, bench, benchName, name]);
  if (!LONG_RANGES.includes(range) || !data) return <Note>Pick 2Y or longer to see rolling 1-year returns.</Note>;
  return (
    <div>
      <SubTitle>Return over the trailing 365 days, at each bar</SubTitle>
      <LineChart dates={data.dates} series={data.series} />
    </div>
  );
}

/* ---------------------------------------------------------------- Capture */

function CaptureView({ points, bench, benchName, it }: { points: PricePoint[]; bench: PricePoint[]; benchName: string; /** "basket" or "stock". */ it: string }) {
  const c = useMemo(() => monthlyCapture(points, bench), [points, bench]);
  if (!bench.length) return <Note>{benchName} could not be loaded, so capture can&rsquo;t be worked out.</Note>;
  if (c.months < CAPTURE_MIN_MONTHS) return <Note>Capture needs at least ten calendar months: pick 1Y or longer.</Note>;
  const bars = [
    { label: "Up capture", v: c.upCapture, n: c.upMonths, good: (v: number) => captureIsGood("up", v), help: `of the ${benchName}'s rise, over its ${c.upMonths} up month${c.upMonths === 1 ? "" : "s"}` },
    { label: "Down capture", v: c.downCapture, n: c.downMonths, good: (v: number) => captureIsGood("down", v), help: `of the ${benchName}'s fall, over its ${c.downMonths} down month${c.downMonths === 1 ? "" : "s"}` },
  ];
  const vals = bars.map((x) => x.v).filter((v): v is number => v != null);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(150, ...vals) * 1.05;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const whole = (v: number) => pct(v, 0);

  return (
    <div className="px-3 py-2">
      <div className="flex flex-col gap-2.5">
        {bars.map((bar) => (
          <div key={bar.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-[11px]">
            <span className="text-ink-soft">{bar.label}</span>
            <div className="relative h-4 rounded-sm bg-bg" title={bar.v == null ? "No such months in the range" : `${whole(bar.v)} ${bar.help}`}>
              {bar.v != null && (
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{ left: `${x(Math.min(0, bar.v))}%`, width: `${Math.abs(x(bar.v) - x(0))}%`, background: bar.good(bar.v) ? "var(--pos)" : "var(--danger)" }}
                />
              )}
              {lo < 0 && <div className="absolute inset-y-[-3px] w-px bg-ink-soft" style={{ left: `${x(0)}%` }} aria-hidden />}
              <div className="absolute inset-y-[-3px] w-px bg-ink" style={{ left: `${x(100)}%` }} aria-hidden />
            </div>
            <span className={"text-right font-mono font-semibold " + (bar.v == null ? "text-ink-soft" : bar.good(bar.v) ? "text-pos" : "text-danger")}>{bar.v == null ? NA : whole(bar.v)}</span>
          </div>
        ))}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.5rem] gap-2 text-[10px] text-ink-soft">
          <span />
          <span className="relative h-3">
            {lo < 0 && (
              <span className="absolute -translate-x-1/2 font-mono" style={{ left: `${x(0)}%` }}>
                0
              </span>
            )}
            <span className="absolute -translate-x-1/2 font-mono" style={{ left: `${x(100)}%` }}>
              100%
            </span>
          </span>
          <span />
        </div>
      </div>
      <dl className="mt-1 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5 text-[11px]">
        {[
          { label: `Months beating the ${benchName}`, n: c.beat },
          { label: "Months up", n: c.lineUp },
        ].map((row) => (
          <Fragment key={row.label}>
            <dt>{row.label}</dt>
            <dd className="whitespace-nowrap">
              <b className="font-mono font-semibold text-ink">
                {row.n}/{c.months}
              </b>
              <span className="ml-1 font-mono text-ink-soft">({Math.round((row.n / c.months) * 100)}%)</span>
            </dd>
          </Fragment>
        ))}
      </dl>
      <p className="mt-1 text-[10px] leading-snug text-ink-soft">
        Calendar months, counted as in the stats grid: the part month the range starts in is left out, the month in progress is in. Beating the {benchName} means a better month than
        it, even when both fell. Up capture above 100% means the {it} rose more than the {benchName} in its up months; down capture below 100% means it fell less in its down months, and
        below 0% that it rose in them. The stats grid shows these same two figures.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Shared bits */

function SubTitle({ children }: { children: ReactNode }) {
  return <h4 className="px-3 pt-1.5 text-[10px] font-semibold text-ink-soft">{children}</h4>;
}

function Th({ children, left, title }: { children: ReactNode; left?: boolean; title?: string }) {
  return (
    <th scope="col" title={title} className={"whitespace-nowrap px-1.5 py-1 font-semibold " + (left ? "text-left" : "text-right")}>
      {children}
    </th>
  );
}

type Line = { name: string; color: string; values: (number | null)[]; area?: boolean; dash?: boolean };
const W = 1000;
const H = 100;

/**
 * A small line chart over shared dates: SVG stretched to the box (strokes stay 1.5px via
 * non-scaling-stroke), axis labels in HTML so text never stretches. Hover or drag reads out a date.
 */
function LineChart({ dates, series, height = 150 }: { dates: string[]; series: Line[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  let lo = Math.min(0, ...all);
  let hi = Math.max(0, ...all);
  if (hi - lo < 1) hi = lo + 1;
  const pad = (hi - lo) * 0.06;
  lo -= lo < 0 ? pad : 0;
  hi += hi > 0 ? pad : 0;
  const last = dates.length - 1;
  const xs = (i: number) => (last > 0 ? (i / last) * W : W / 2);
  const ys = (v: number) => ((hi - v) / (hi - lo)) * H;

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) return void (pen = false);
      d += `${pen ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(2)}`;
      pen = true;
    });
    return d;
  };
  const area = (vals: (number | null)[]) => {
    const idx = vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    if (idx.length < 2) return "";
    const y0 = ys(0).toFixed(2);
    return `M${xs(idx[0]).toFixed(1)},${y0}` + idx.map((i) => `L${xs(i).toFixed(1)},${ys(vals[i]!).toFixed(2)}`).join("") + `L${xs(idx[idx.length - 1]).toFixed(1)},${y0}Z`;
  };

  const pick = (e: ReactPointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0 || last < 0) return;
    setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last))));
  };
  const at = hover ?? last;
  const fmt = (v: number) => signedPct(v);
  const ticks = [hi, 0, lo].filter((v, i, a) => a.indexOf(v) === i && (v === 0 || Math.abs(v) > (hi - lo) * 0.12));

  return (
    <div className="px-3 pb-2">
      <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px]" aria-live="polite">
        {/* Fixed widths for the date and each figure (as wide as the longest they can be), so the
            row never re-wraps, and the chart below never moves, as the crosshair moves. */}
        <span className="inline-block font-mono tabular-nums text-ink-soft" style={{ minWidth: `${day("2000-12-31").length}ch` }}>
          {dates[at] ? day(dates[at]) : ""}
        </span>
        {series.map((s) => {
          const v = s.values[at];
          return (
            <span key={s.name} className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ background: s.color }} aria-hidden />
              <span className="text-ink-soft">{s.name}</span>
              <span className="inline-block min-w-[6ch] text-right font-mono font-semibold tabular-nums text-ink">{v == null ? NA : fmt(v)}</span>
            </span>
          );
        })}
      </div>
      <div className="relative mt-1 flex">
        <div
          ref={box}
          className="relative min-w-0 flex-1 cursor-crosshair touch-pan-y select-none"
          style={{ height }}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          onPointerCancel={() => setHover(null)}
          role="img"
          aria-label={series.map((s) => `${s.name} ${s.values[last] == null ? NA : fmt(s.values[last]!)}`).join(", ")}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((v) => (
              <line key={v} x1={0} x2={W} y1={ys(v)} y2={ys(v)} stroke={v === 0 ? "var(--line)" : "var(--grid)"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) =>
              s.area ? <path key={s.name + "-a"} d={area(s.values)} fill={`color-mix(in srgb, ${s.color} 22%, transparent)`} stroke="none" /> : null,
            )}
            {series.map((s) => (
              <path
                key={s.name}
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray={s.dash ? "4 3" : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {hover != null && <line x1={xs(hover)} x2={xs(hover)} y1={0} y2={H} stroke="var(--ink-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
        </div>
        <div className="relative w-11 flex-none font-mono text-[10px] text-ink-soft" style={{ height }} aria-hidden>
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${(ys(v) / H) * 100}%` }}>
              {fmt(v)}
            </span>
          ))}
        </div>
      </div>
      <div className="mr-11 flex justify-between font-mono text-[10px] text-ink-soft" aria-hidden>
        <span>{dates[0] ? day(dates[0]) : ""}</span>
        <span>{dates[last] ? day(dates[last]) : ""}</span>
      </div>
    </div>
  );
}
