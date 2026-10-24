"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { ChartData, ChartRange, OhlcData, Quote } from "@/lib/live/yahoo";
import { fmtNum, fmtPrice, fmtSigned, withLiveQuote } from "./merge";
import { barFor, fmtVolume, withLiveBar, type OhlcBar } from "@/lib/live/ohlc-format";
import { ZOOM_OPTIONS, ZoomControls, useChartZoom } from "@/components/charts/ChartZoom";
import { tickLabel } from "@/components/charts/ticks";
import { cssVar, useSiteTheme } from "@/lib/theme";
import { fmtDay, fmtMonth } from "@/lib/format";

const RANGES: { id: ChartRange; label: string; long: string }[] = [
  { id: "1M", label: "1M", long: "1 month" },
  { id: "6M", label: "6M", long: "6 months" },
  { id: "1Y", label: "1Y", long: "1 year" },
  // Same periods as the basket charts (BasketDetail), plus "All" for a single stock.
  { id: "2Y", label: "2Y", long: "2 years" },
  { id: "3Y", label: "3Y", long: "3 years" },
  { id: "5Y", label: "5Y", long: "5 years" },
  { id: "MAX", label: "All", long: "lifetime" },
];

type Mode = "line" | "candles";
// One range's history: the closes for the line, plus candles + volume when Yahoo has them
// (null on Screener's fallback, which carries closes only).
type Entry = { line: ChartData; ohlc: OhlcData | null };

// lightweight-charts needs concrete colours (no CSS var()), so the theme tokens are read off
// <html> (cssVar) and converted for the gradient fill.
function withAlpha(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// The library hands times back as "YYYY-MM-DD", a business-day object or a UTC timestamp (s).
const timeToMs = (t: Time): number =>
  typeof t === "string" ? Date.parse(t) : typeof t === "number" ? t * 1000 : Date.UTC(t.year, t.month - 1, t.day);
const getJson = <T,>(url: string) => fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(r)));
// Bars are dated "YYYY-MM-DD" (IST trading days); fmtDay/fmtMonth read them in UTC, so a viewer
// west of UTC no longer sees each bar labelled with the previous day.

// `height` sizes the plot: the stock pop-up's default, or a shorter one where more sits above it
// (the Analysis Charts pop-up's dropdowns), so the axis and zoom controls stay in view.
const PLOT_HEIGHT = "h-[46vh] min-h-[260px] sm:h-[min(400px,48vh)]";

export function ChartView({ ticker, quote, height = PLOT_HEIGHT }: { ticker: string; quote?: Quote | null; height?: string }) {
  const [range, setRange] = useState<ChartRange>("1Y");
  const [mode, setMode] = useState<Mode>("line");
  const [showVol, setShowVol] = useState(true);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [hover, setHover] = useState<string | null>(null);
  // The hovered bar's volume, drawn as a second crosshair line: its height in the volume band
  // and the pane's width (the label sits on the price axis, like the price's own label).
  const [volHover, setVolHover] = useState<{ y: number; v: number; paneW: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const cacheRef = useRef(new Map<ChartRange, Entry>());
  // Re-colours the chart when the light/dark toggle flips while the pop-up is open.
  const theme = useSiteTheme();

  const pick = useCallback((r: ChartRange) => {
    setRange(r);
    const hit = cacheRef.current.get(r);
    setHover(null);
    if (hit) {
      setEntry(hit);
      setStatus("ok");
    } else {
      setStatus("loading");
    }
  }, []);

  // Fetch the selected range (skipped when already cached by pick()). One request when Yahoo
  // has candles (/ohlc carries the closes too); otherwise /chart, which can fall back to
  // Screener, draws the line alone.
  useEffect(() => {
    if (cacheRef.current.has(range)) return;
    let cancelled = false;
    const base = `/api/stock/${encodeURIComponent(ticker)}`;
    getJson<OhlcData>(`${base}/ohlc?range=${range}`)
      .then((o): Entry => ({ line: { range: o.range, points: o.points, source: "yahoo", exchange: o.exchange }, ohlc: o }))
      .catch(() => getJson<ChartData>(`${base}/chart?range=${range}`).then((d): Entry => ({ line: d, ohlc: null })))
      .then((e) => {
        if (cancelled) return;
        cacheRef.current.set(range, e);
        setEntry(e);
        setStatus("ok");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [ticker, range, attempt]);

  const data = entry?.line ?? null;
  const ohlc = entry?.ohlc ?? null;
  const points = useMemo(() => (data ? withLiveQuote(data.points, quote) : []), [data, quote]);
  const bars = useMemo(() => (ohlc ? withLiveBar(ohlc.bars, quote, ohlc.interval) : []), [ohlc, quote]);
  const canCandle = bars.length >= 2;
  const candles = mode === "candles" && canCandle;
  const hasVol = bars.some((b) => b.v != null && b.v > 0);
  const volOn = showVol && hasVol;
  // The readout follows whichever series is drawn (candles are one per week/month on long ranges).
  const active: { t: string; c: number }[] = candles ? bars : points;
  const first = active[0];
  const last = active[active.length - 1];
  // The line's colour follows the whole period; the figure beside the price follows the
  // crosshair, so it always describes the price and date shown above it.
  const up = first && last ? last.c >= first.c : true;

  // Create the chart once; (re)colour + feed data in the effect below.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--ink-soft", "#888"), fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: withAlpha(cssVar("--line", "#444444"), 0.6) } },
      // A slim bottom margin: the default 10% pushed the axis under ₹0 on long, steep histories.
      // (Widened below while the volume bars are on, so they never sit under the price.)
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.03 } },
      // Fixed edges: dragging or zooming out stops at the first and last bar instead of opening
      // blank space beside the history.
      timeScale: { borderVisible: false, timeVisible: false, lockVisibleTimeRangeOnResize: true, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: tickLabel },
      crosshair: { mode: CrosshairMode.Magnet },
      // The crosshair's date label in the site's format (the library's own read "07 Sept '26").
      localization: { timeFormatter: (t: Time) => fmtDay(timeToMs(t)) },
      // Pinch / Ctrl + wheel zooms; a plain wheel or vertical swipe still scrolls the pop-up.
      ...ZOOM_OPTIONS,
    });
    // The volume band's margin stretches the price axis below the lowest price; on a long history
    // that reached under ₹0, so ticks below zero are left blank rather than reading "−400.00".
    const priceFormat = { type: "custom" as const, minMove: 0.01, formatter: (v: number) => (v < 0 ? "" : v.toFixed(2)) };
    const area = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 4, priceFormat });
    const candle = chart.addSeries(CandlestickSeries, { priceLineVisible: false, lastValueVisible: true, borderVisible: true, priceFormat });
    // Volume on its own overlay scale, squeezed into the bottom fifth of the pane.
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;
    areaRef.current = area;
    candleRef.current = candle;
    volRef.current = vol;
    chart.subscribeCrosshairMove((p) => {
      // Only the drawn price series has data; the hidden one is empty.
      const v = (p.seriesData.get(area) ?? p.seriesData.get(candle)) as object | undefined;
      setHover(p.time && v ? String(p.time) : null);
      const bar = p.time ? (p.seriesData.get(vol) as { value?: number } | undefined) : undefined;
      const y = bar?.value ? vol.priceToCoordinate(bar.value) : null;
      setVolHover(bar?.value && y != null ? { y, v: bar.value, paneW: chart.timeScale().width() } : null);
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      areaRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // The full view: every bar, edge to edge (the time scale's fixed edges keep it there).
  const home = useMemo(() => {
    const vols = volOn ? bars.filter((b) => b.v != null && b.v > 0) : [];
    const n = new Set([...(candles ? bars : points).map((p) => p.t), ...vols.map((b) => b.t)]).size;
    return n < 2 ? null : { from: 0, to: n - 1 };
  }, [points, bars, candles, volOn]);

  useEffect(() => {
    const chart = chartRef.current;
    const area = areaRef.current;
    const candle = candleRef.current;
    const vol = volRef.current;
    if (!chart || !area || !candle || !vol || !data || status !== "ok") return;
    const volBars = volOn ? bars.filter((b): b is OhlcBar & { v: number } => b.v != null && b.v > 0) : [];
    const paint = () => {
      const pos = cssVar("--pos", "#2e9e5b");
      const neg = cssVar("--danger", "#d9534f");
      const line = up ? pos : neg;
      area.applyOptions({ lineColor: line, topColor: withAlpha(line, 0.28), bottomColor: withAlpha(line, 0) });
      candle.applyOptions({ upColor: pos, downColor: neg, borderUpColor: pos, borderDownColor: neg, wickUpColor: pos, wickDownColor: neg });
      // Faint, so the bars read as context under the price rather than a second chart.
      const volUp = withAlpha(pos, 0.32);
      const volDown = withAlpha(neg, 0.32);
      vol.setData(volBars.map((b) => ({ time: b.t as Time, value: b.v, color: b.c >= b.o ? volUp : volDown })));
      chart.applyOptions({
        layout: { textColor: cssVar("--ink-soft", "#888") },
        grid: { horzLines: { color: withAlpha(cssVar("--line", "#444444"), 0.6) } },
      });
    };
    area.setData(candles ? [] : points.map((p) => ({ time: p.t as Time, value: p.c })));
    candle.setData(candles ? bars.map((b) => ({ time: b.t as Time, open: b.o, high: b.h, low: b.l, close: b.c })) : []);
    // The volume band takes the bottom 20%; keep the price's lowest point just above it.
    chart.applyOptions({ rightPriceScale: { scaleMargins: { top: 0.1, bottom: volOn ? 0.24 : 0.03 } } });
    paint();
    if (home) chart.timeScale().setVisibleLogicalRange(home);
  }, [data, points, bars, candles, volOn, status, up, home, theme]);

  const zoom = useChartZoom(chartRef, boxRef, home);

  const shown = (hover ? active.find((p) => p.t === hover) : undefined) ?? last ?? null;
  const shownBar = shown && ohlc ? (candles ? (shown as OhlcBar) : barFor(bars, shown.t, ohlc.interval)) : null;
  const change = first && shown ? shown.c - first.c : null;
  const changePct = first && change != null ? (change / first.c) * 100 : null;
  const shownUp = (change ?? 0) >= 0;
  // The chart can come from a different exchange than the live quote (a BSE series when the NSE
  // one is too short); say so rather than let the header and the footnote disagree.
  const chartExchange = data?.exchange ?? "NSE";
  const otherExchange = quote && data?.exchange && quote.exchange !== data.exchange;
  const coarse = range === "3Y" || range === "5Y" ? " (weekly)" : range === "MAX" ? " (monthly)" : "";
  // A weekly/monthly candle is dated at the start of its period.
  const shownDate = !shown ? "" : candles && range === "MAX" ? fmtMonth(shown.t) : candles && coarse ? `Week of ${fmtDay(shown.t)}` : fmtDay(shown.t);
  const volLabel = range === "MAX" ? "Vol (month)" : coarse ? "Vol (week)" : "Vol";
  const noCandles = status === "ok" && !canCandle;
  const noCandlesNote = "Candles need open/high/low prices, which aren't available for this stock right now";

  const controls = (
    <>
          <div className="inline-flex rounded-full border border-line bg-panel p-0.5" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pick(r.id)}
                aria-pressed={range === r.id}
                className={"min-h-8 min-w-9 rounded-full px-2.5 text-xs pointer-coarse:min-h-10 font-semibold transition-colors " + (range === r.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <div className="inline-flex rounded-full border border-line bg-panel p-0.5" role="group" aria-label="Chart type">
              {(["line", "candles"] as const).map((m) => {
                const disabled = m === "candles" && noCandles;
                const on = m === "candles" ? candles : !candles;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !disabled && setMode(m)}
                    aria-pressed={on}
                    aria-disabled={disabled || undefined}
                    title={disabled ? noCandlesNote : undefined}
                    className={
                      "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors pointer-coarse:min-h-10 " +
                      (on ? "bg-accent text-bg" : disabled ? "cursor-not-allowed text-ink-soft opacity-45" : "text-ink-soft hover:text-ink")
                    }
                  >
                    {m === "line" ? "Line" : "Candles"}
                  </button>
                );
              })}
            </div>
            {hasVol && (
              <button
                type="button"
                role="switch"
                aria-checked={showVol}
                onClick={() => setShowVol((v) => !v)}
                className="flex min-h-9 items-center gap-2 rounded-full px-2 text-xs pointer-coarse:min-h-10 font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                <span aria-hidden className={"relative h-5 w-9 shrink-0 rounded-full border transition-colors " + (showVol ? "border-transparent bg-accent" : "border-line bg-bg")}>
                  <span className={"absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full shadow transition-all " + (showVol ? "left-[18px] bg-bg" : "left-0.5 bg-ink-soft")} />
                </span>
                Volume
              </button>
            )}
          </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {/* Top band: price on the left, change on the right and the chart's controls between them
            (on phones they wrap to their own line under the price), so nothing needs a scroll.
            From lg the controls are centred absolutely in the band: the price and change text
            change width as the crosshair moves, and the controls must not move with them. */}
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="order-1">
            <div className="font-mono text-3xl font-bold text-ink">{shown ? fmtPrice(shown.c) : "—"}</div>
            <div className="mt-0.5 font-mono text-xs text-ink-soft">{shownDate}</div>
          </div>
          <div className="order-3 flex basis-full flex-wrap items-center gap-2 lg:absolute lg:bottom-0 lg:left-1/2 lg:w-max lg:-translate-x-1/2 lg:flex-nowrap">{controls}</div>
          {change != null && changePct != null && (
            <div className={"order-2 text-right font-mono text-sm font-semibold tabular-nums " + (shownUp ? "text-pos" : "text-danger")}>
              {shownUp ? "▲" : "▼"} {Math.abs(change).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (
              {range === "MAX" && first && shown && shown.c / first.c >= 10 ? `${fmtNum(shown.c / first.c, 0)}×` : fmtSigned(changePct, 1)})
              {/* The chart's own move from live price history, which differs from the dated
                  company-table return on Summary; "live" plus the window keeps the two apart.
                  One decimal, like every other return in the pop-up. */}
              <div className="text-[11px] font-normal text-ink-soft">
                {hover && first ? `Since ${fmtDay(first.t)}` : range === "MAX" && first ? `Since ${fmtMonth(first.t)}` : `Past ${range}`},{" "}
                <span className="text-pos">live</span>
              </div>
            </div>
          )}
        </div>
        {shownBar && (candles || (volOn && shownBar.v != null)) && (
          <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-ink-soft">
            {candles &&
              (
                [
                  ["O", shownBar.o],
                  ["H", shownBar.h],
                  ["L", shownBar.l],
                  ["C", shownBar.c],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <dt>{k}</dt>
                  <dd className="text-ink">{v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                </div>
              ))}
            {volOn && (
              <div className="flex gap-1">
                <dt>{volLabel}</dt>
                <dd className="text-ink">{fmtVolume(shownBar.v)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className={"relative rounded-2xl border border-line bg-panel p-2 " + height}>
        <div className="relative h-full w-full">
          <div ref={boxRef} className="h-full w-full" />
          {volOn && volHover && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute left-0 border-t border-dashed border-ink/60" style={{ top: volHover.y, width: volHover.paneW }} />
              <span className="absolute z-10 -translate-y-1/2 rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold text-bg" style={{ top: volHover.y, right: 2 }}>
                {fmtVolume(volHover.v)}
              </span>
            </div>
          )}
        </div>
        {status !== "ok" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-panel/80 text-sm text-ink-soft">
            {status === "loading" ? (
              "Loading price history…"
            ) : (
              <>
                <span>Couldn&rsquo;t load price history right now.</span>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("loading");
                    setAttempt((n) => n + 1);
                  }}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {status === "ok" && <ZoomControls zoom={zoom} />}

      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-ink-soft">
          {data?.source === "screener" ? "Screener.in" : "Yahoo Finance"} · {candles ? "candles" : "closing prices"}
          {coarse}
          {volOn ? " and volume" : ""} · {otherExchange ? `${chartExchange} prices, which go back further than ${quote!.exchange}'s` : chartExchange}
          {mode === "candles" && noCandles ? " · candles aren't available for this stock, so this shows closing prices" : ""}
        </p>
      </div>
    </div>
  );
}
