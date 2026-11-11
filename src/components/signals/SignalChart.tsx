"use client";

import { useEffect, useRef } from "react";
import { ColorType, CrosshairMode, HistogramSeries, LineSeries, createChart, createSeriesMarkers, type IChartApi, type SeriesMarker, type Time } from "lightweight-charts";
import { STYLE, type Dash } from "@/components/charts/palette";
import { ZOOM_OPTIONS } from "@/components/charts/ChartZoom";
import { tickLabel } from "@/components/charts/ticks";
import { cssVar, useSiteTheme } from "@/lib/theme";
import { fmtDay } from "@/lib/format";

// The signal backtest's line charts (price with the rules' indicator lines and trade markers; an
// indicator strip; growth of ₹100). Colours are read from the site's tokens by name, since the
// chart draws on a canvas: "--ink" etc., or a hex from the chart palette.

export type ChartLine = { id: string; color: string; dash?: Dash; width?: 1 | 2 | 3; points: { t: string; v: number }[] };
export type ChartMark = { t: string; kind: "entry" | "exit" };

const color = (c: string) => (c.startsWith("--") ? cssVar(c, "#888888") : c);
const timeToDay = (t: Time) => (typeof t === "string" ? t : typeof t === "number" ? new Date(t * 1000).toISOString().slice(0, 10) : `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`);

export function SignalChart({
  lines,
  marks = [],
  height,
  label,
  levels = [],
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
    return () => {
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
      });
      s.setData(ln.points.map((p) => ({ time: p.t as Time, value: p.v })));
      return s;
    });
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

  return <div ref={box} role="img" aria-label={label} style={{ height }} className="w-full min-w-0" />;
}
