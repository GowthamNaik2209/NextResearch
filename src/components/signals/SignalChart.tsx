"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, CrosshairMode, HistogramSeries, LineSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type SeriesMarker, type Time } from "lightweight-charts";
import { DASHARRAY, STYLE, type Dash } from "@/components/charts/palette";
import { ZOOM_OPTIONS, useChartZoom } from "@/components/charts/ChartZoom";
import { tickLabel } from "@/components/charts/ticks";
import { cssVar, useSiteTheme } from "@/lib/theme";
import { fmtDay } from "@/lib/format";

// The signal backtest's line charts (price with the rules' indicator lines and trade markers; an
// indicator strip; growth of ₹100). Colours are read from the site's tokens by name, since the
// chart draws on a canvas: "--ink" etc., or a hex from the chart palette. Zooming works as on the
// site's other charts (useChartZoom): only a pinch (or Ctrl/⌘ + wheel) zooms; a plain scroll or an
// up/down swipe scrolls the page, and a sideways swipe reads the chart.
// Lines with a label are listed in a stack in the chart's top-left corner, as on TradingView: faint
// until hovered, each with its colour, its value under the crosshair, and a tick to show or hide it.

export type ChartLine = { id: string; label?: string; color: string; dash?: Dash; width?: 1 | 2 | 3; points: { t: string; v: number }[] };
export type ChartMark = { t: string; kind: "entry" | "exit" };

const color = (c: string) => (c.startsWith("--") ? cssVar(c, "#888888") : c);
/** The same colour for the HTML legend, which can read the token itself. */
const cssColor = (c: string) => (c.startsWith("--") ? `var(${c})` : c);
const timeToDay = (t: Time) => (typeof t === "string" ? t : typeof t === "number" ? new Date(t * 1000).toISOString().slice(0, 10) : `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`);

/** A line ticked on or off. The first line carries the trade arrows (`arrows`), so unticked it is
 * drawn clear instead of hidden, and the arrows stay to click. */
const shown = (ln: ChartLine, i: number, on: boolean, arrows: boolean) =>
  i === 0 && arrows ? { visible: true, color: on ? color(ln.color) : "rgba(0,0,0,0)", lastValueVisible: on, crosshairMarkerVisible: on } : { visible: on };

// Stable defaults: a fresh [] each render would rebuild the series on every render.
const NO_MARKS: ChartMark[] = [];
const NO_LEVELS: number[] = [];

export function SignalChart({
  lines,
  marks = NO_MARKS,
  height,
  label,
  levels = NO_LEVELS,
  bars,
  onPick,
}: {
  lines: ChartLine[];
  marks?: ChartMark[];
  height: number;
  label: string;
  levels?: number[];
  /** Drawn as bars instead of lines (a basket's stocks held each day). */
  bars?: { t: string; v: number }[];
  /** A click on the chart: the day under it ("Why did it trade here?"). */
  onPick?: (t: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const pickRef = useRef(onPick);
  const theme = useSiteTheme();
  useEffect(() => {
    pickRef.current = onPick;
  });
  // Lines unticked in the legend, by id (kept when a new result has the same lines).
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const hiddenRef = useRef(hidden);
  const seriesRef = useRef(new Map<string, ISeriesApi<"Line">>());
  // The legend's values: the day under the crosshair, or the last day when it's off the chart.
  const [hoverVals, setHoverVals] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--ink-soft", "#888"), fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVar("--grid", "#333") } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.06 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: tickLabel },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { timeFormatter: (t: Time) => fmtDay(timeToDay(t)) },
      ...ZOOM_OPTIONS,
    });
    chartRef.current = chart;
    chart.subscribeClick((p) => p.time != null && pickRef.current?.(timeToDay(p.time)));
    chart.subscribeCrosshairMove((p) => {
      if (p.time == null) return setHoverVals(null);
      const vals = new Map<string, number>();
      for (const [id, s] of seriesRef.current) {
        const d = p.seriesData.get(s);
        if (d && "value" in d) vals.set(id, d.value);
      }
      setHoverVals(vals);
    });
    // A narrower box (a window resized, a tablet turned) shows the whole range again, not a cut of it.
    const ro = new ResizeObserver(() => chart.timeScale().fitContent());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({ layout: { textColor: cssVar("--ink-soft", "#888") }, grid: { horzLines: { color: cssVar("--grid", "#333") } } });
    const made = lines.map((ln, i) => {
      const s = chart.addSeries(LineSeries, {
        color: color(ln.color),
        lineWidth: ln.width ?? 2,
        lineStyle: STYLE[ln.dash ?? "solid"],
        priceLineVisible: false,
        lastValueVisible: i === 0,
        crosshairMarkerRadius: 3,
        ...shown(ln, i, !hiddenRef.current.has(ln.id), marks.length > 0),
      });
      s.setData(ln.points.map((p) => ({ time: p.t as Time, value: p.v })));
      return s;
    });
    seriesRef.current = new Map(lines.map((ln, i) => [ln.id, made[i]]));
    if (bars) {
      const h = chart.addSeries(HistogramSeries, { color: cssVar("--accent", "#888"), priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "price", precision: 0, minMove: 1 } });
      h.setData(bars.map((p) => ({ time: p.t as Time, value: p.v })));
      made.push(h as unknown as (typeof made)[number]);
    }
    if (made[0]) {
      for (const lv of levels) made[0].createPriceLine({ price: lv, color: cssVar("--line", "#555"), lineWidth: 1, lineStyle: STYLE.dash, axisLabelVisible: false });
      const pos = cssVar("--pos", "#2e9e5b");
      const neg = cssVar("--danger", "#d9534f");
      const markers: SeriesMarker<Time>[] = marks.map((m) =>
        m.kind === "entry" ? { time: m.t as Time, position: "belowBar", color: pos, shape: "arrowUp", size: 1 } : { time: m.t as Time, position: "aboveBar", color: neg, shape: "arrowDown", size: 1 },
      );
      if (markers.length) createSeriesMarkers(made[0], markers);
    }
    chart.timeScale().fitContent();
    return () => {
      // On unmount the chart itself is already gone (its effect's clean-up runs first).
      if (chartRef.current !== chart) return;
      for (const s of made) chart.removeSeries(s);
    };
  }, [lines, marks, levels, bars, theme]);

  useEffect(() => {
    hiddenRef.current = hidden;
    lines.forEach((ln, i) => seriesRef.current.get(ln.id)?.applyOptions(shown(ln, i, !hidden.has(ln.id), marks.length > 0)));
  }, [hidden, lines, marks]);
  const toggle = (id: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const legend = lines.filter((ln) => ln.label);

  // The full view, in bar positions: how far zooming out goes.
  const home = useMemo(() => {
    const n = Math.max(bars?.length ?? 0, ...lines.map((l) => l.points.length));
    return n > 1 ? { from: 0, to: n - 1 } : null;
  }, [lines, bars]);
  useChartZoom(chartRef, box, home);

  return (
    <div className="relative w-full min-w-0">
      <div ref={box} role="img" aria-label={label} style={{ height }} className="w-full min-w-0" />
      {legend.length > 0 && (
        <div className="absolute left-1 top-1 z-10 flex max-w-[calc(100%-5rem)] flex-col rounded px-1 py-0.5 font-mono text-[11px] opacity-65 transition-[opacity,background-color] hover:bg-panel/85 hover:opacity-100 focus-within:bg-panel/85 focus-within:opacity-100">
          {legend.map((ln) => {
            const off = hidden.has(ln.id);
            const v = hoverVals ? hoverVals.get(ln.id) : ln.points[ln.points.length - 1]?.v;
            return (
              <label key={ln.id} className="flex min-h-6 cursor-pointer items-center gap-1.5 whitespace-nowrap">
                <input type="checkbox" checked={!off} onChange={() => toggle(ln.id)} aria-label={`Show ${ln.label} on the chart`} className="size-3.5 accent-[var(--accent)]" />
                <svg width="16" height="6" aria-hidden className="shrink-0">
                  <line x1="0" y1="3" x2="16" y2="3" stroke={cssColor(ln.color)} strokeWidth={ln.width ?? 2} strokeDasharray={DASHARRAY[ln.dash ?? "solid"]} />
                </svg>
                <span className={off ? "text-ink-soft line-through" : "text-ink"}>{ln.label}</span>
                {!off && v != null && <span style={{ color: cssColor(ln.color) }}>{v.toFixed(2)}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
