"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { IChartApi, LogicalRange } from "lightweight-charts";

// Pinch (phones, trackpads) or Ctrl/⌘ + wheel zooms the dates; dragging sideways moves along them.
// A vertical swipe or a plain wheel still scrolls the page past the chart (see useChartZoom).
export const ZOOM_OPTIONS = {
  handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false }, axisDoubleClickReset: { time: true, price: true } },
  handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
  kineticScroll: { touch: true, mouse: false },
};

/** The full view, in bar positions: what Reset returns to and how far zooming out goes. */
export type ZoomHome = { from: number; to: number };

// The closest zoom the buttons go to, in bars.
const MIN_BARS = 8;

/**
 * Zoom state and buttons for a lightweight-charts chart. Call it after the effect that creates the
 * chart, so the chart exists when this subscribes. `home` is the chart's full view for its data.
 */
export function useChartZoom(chartRef: RefObject<IChartApi | null>, boxRef: RefObject<HTMLDivElement | null>, home: ZoomHome | null) {
  const [zoomed, setZoomed] = useState(false);
  const homeRef = useRef(home);
  useEffect(() => {
    homeRef.current = home;
  }, [home]);

  useEffect(() => {
    const chart = chartRef.current;
    const el = boxRef.current;
    if (!chart || !el) return;
    const ts = chart.timeScale();
    const onRange = (r: LogicalRange | null) => {
      const h = homeRef.current;
      setZoomed(!!r && !!h && (Math.abs(r.from - h.from) > 0.5 || Math.abs(r.to - h.to) > 0.5));
    };
    ts.subscribeVisibleLogicalRangeChange(onRange);
    // A plain wheel never reaches the chart, so it scrolls the page. A trackpad pinch arrives as
    // Ctrl + wheel, so it zooms, as does Ctrl/⌘ + a mouse wheel.
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
    };
    el.addEventListener("wheel", wheel, { capture: true });
    return () => {
      el.removeEventListener("wheel", wheel, { capture: true });
      try {
        ts.unsubscribeVisibleLogicalRangeChange(onRange);
      } catch {
        // The chart was already removed.
      }
    };
  }, [chartRef, boxRef]);

  // Buttons keep the latest date in view: widen or narrow from the right edge, within the full view.
  const zoomBy = useCallback(
    (factor: number) => {
      const ts = chartRef.current?.timeScale();
      const h = homeRef.current;
      const r = ts?.getVisibleLogicalRange();
      if (!ts || !h || !r) return;
      const width = Math.min(h.to - h.from, Math.max(MIN_BARS, (r.to - r.from) * factor));
      const to = Math.min(h.to, r.to);
      const from = Math.max(h.from, to - width);
      ts.setVisibleLogicalRange({ from, to: from + width });
    },
    [chartRef],
  );
  const reset = useCallback(() => {
    const h = homeRef.current;
    if (h) chartRef.current?.timeScale().setVisibleLogicalRange(h);
  }, [chartRef]);

  return { zoomed, zoomIn: () => zoomBy(0.5), zoomOut: () => zoomBy(2), reset };
}

const btn =
  "inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-line bg-panel px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-ink-soft";

/** − / + / Reset under a chart, with how to zoom by hand. */
export function ZoomControls({ zoom }: { zoom: ReturnType<typeof useChartZoom> }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex items-center gap-1" role="group" aria-label="Zoom">
        <button type="button" onClick={zoom.zoomOut} disabled={!zoom.zoomed} aria-label="Zoom out" className={btn}>
          −
        </button>
        <button type="button" onClick={zoom.zoomIn} aria-label="Zoom in" className={btn}>
          +
        </button>
        {/* Laid out even when hidden, so it appearing doesn't re-wrap the hint and push the controls below. */}
        <button type="button" onClick={zoom.reset} aria-hidden={!zoom.zoomed} tabIndex={zoom.zoomed ? 0 : -1} className={btn + (zoom.zoomed ? "" : " invisible")}>
          Reset
        </button>
      </div>
      <span className="text-[11px] text-ink-soft">Pinch or Ctrl + scroll to zoom, drag sideways to move</span>
    </div>
  );
}
