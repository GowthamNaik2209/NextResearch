"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaSeries, ColorType, CrosshairMode, createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import type { ChartData, ChartRange, Quote } from "@/lib/live/yahoo";
import { fmtNum, fmtSigned, withLiveQuote } from "./merge";

const RANGES: { id: ChartRange; label: string; long: string }[] = [
  { id: "1M", label: "1M", long: "1 month" },
  { id: "6M", label: "6M", long: "6 months" },
  { id: "1Y", label: "1Y", long: "1 year" },
  { id: "3Y", label: "3Y", long: "3 years" },
  { id: "5Y", label: "5Y", long: "5 years" },
  { id: "MAX", label: "All", long: "lifetime" },
];

// lightweight-charts needs concrete colours (no CSS var()), so read the live
// theme tokens off <html> and convert for the gradient fill.
function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function withAlpha(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function ChartView({ ticker, quote }: { ticker: string; quote?: Quote | null }) {
  const [range, setRange] = useState<ChartRange>("1Y");
  const [data, setData] = useState<ChartData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [hover, setHover] = useState<{ t: string; c: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const cacheRef = useRef(new Map<ChartRange, ChartData>());

  const pick = useCallback((r: ChartRange) => {
    setRange(r);
    const hit = cacheRef.current.get(r);
    setHover(null);
    if (hit) {
      setData(hit);
      setStatus("ok");
    } else {
      setStatus("loading");
    }
  }, []);

  // Fetch the selected range (skipped when already cached by pick()).
  useEffect(() => {
    if (cacheRef.current.has(range)) return;
    let cancelled = false;
    fetch(`/api/stock/${encodeURIComponent(ticker)}/chart?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: ChartData) => {
        if (cancelled) return;
        cacheRef.current.set(range, d);
        setData(d);
        setStatus("ok");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [ticker, range, attempt]);

  const points = useMemo(() => (data ? withLiveQuote(data.points, quote) : []), [data, quote]);
  const first = points[0];
  const last = points[points.length - 1];
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
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.03 } },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
      handleScale: { mouseWheel: false },
      handleScroll: { mouseWheel: false },
    });
    const series = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 4 });
    chartRef.current = chart;
    seriesRef.current = series;
    chart.subscribeCrosshairMove((p) => {
      const v = p.seriesData.get(series) as { value?: number } | undefined;
      if (p.time && v?.value != null) setHover({ t: String(p.time), c: v.value });
      else setHover(null);
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !data || status !== "ok") return;
    const paint = () => {
      const line = cssVar(up ? "--pos" : "--danger", up ? "#2e9e5b" : "#d9534f");
      series.applyOptions({ lineColor: line, topColor: withAlpha(line, 0.28), bottomColor: withAlpha(line, 0) });
      chart.applyOptions({
        layout: { textColor: cssVar("--ink-soft", "#888") },
        grid: { horzLines: { color: withAlpha(cssVar("--line", "#444444"), 0.6) } },
      });
    };
    series.setData(points.map((p) => ({ time: p.t as Time, value: p.c })));
    paint();
    // Fit with a little room either side: the first and last date labels sit centred on the
    // edge bars, and with no margin they were cut in half ("96", "202…") on phones.
    const pad = Math.max(1, Math.round(points.length * 0.06));
    chart.timeScale().setVisibleLogicalRange({ from: -pad, to: points.length - 1 + pad });
    // Follow a live light/dark toggle while the pop-up is open.
    const mo = new MutationObserver(paint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [data, points, status, up]);

  const shown = hover ?? last ?? null;
  const change = first && shown ? shown.c - first.c : null;
  const changePct = first && change != null ? (change / first.c) * 100 : null;
  const shownUp = (change ?? 0) >= 0;
  // The chart can come from a different exchange than the live quote (a BSE series when the NSE
  // one is too short); say so rather than let the header and the footnote disagree.
  const chartExchange = data?.exchange ?? "NSE";
  const otherExchange = quote && data?.exchange && quote.exchange !== data.exchange;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-3xl font-bold text-ink">{shown ? `₹${fmtNum(shown.c)}` : "—"}</div>
          <div className="mt-0.5 font-mono text-xs text-ink-soft">
            {shown ? new Date(shown.t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
          </div>
        </div>
        {change != null && changePct != null && (
          <div className={"text-right font-mono text-sm font-semibold " + (shownUp ? "text-pos" : "text-danger")}>
            {shownUp ? "▲" : "▼"} {fmtNum(Math.abs(change))} (
            {range === "MAX" && first && shown && shown.c / first.c >= 10 ? `${fmtNum(shown.c / first.c, 0)}×` : fmtSigned(changePct, 2)})
            <div className="text-[11px] font-normal text-ink-soft">
              {hover && first ? `since ${new Date(first.t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : `past ${RANGES.find((r) => r.id === range)?.long}`}
            </div>
          </div>
        )}
      </div>

      <div className="relative h-[46vh] min-h-[260px] rounded-2xl border border-line bg-panel p-2 sm:h-[400px]">
        <div ref={boxRef} className="h-full w-full" />
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-panel p-1" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r.id)}
              aria-pressed={range === r.id}
              className={"min-w-12 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors " + (range === r.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-soft">
          {data?.source === "screener" ? "Screener.in" : "Yahoo Finance"} · closing prices{range === "3Y" || range === "5Y" ? " (weekly)" : range === "MAX" ? " (monthly)" : ""} ·{" "}
          {otherExchange ? `${chartExchange} prices, which go back further than ${quote!.exchange}'s` : chartExchange}
        </p>
      </div>
    </div>
  );
}
