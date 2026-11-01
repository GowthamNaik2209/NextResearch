"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { IChartApi, LogicalRange } from "lightweight-charts";

// Pinch (phones, trackpads) or Ctrl/⌘ + wheel zooms the dates. With a mouse, dragging sideways moves
// along them. A finger on the plot reads it instead (useChartZoom's touch handling), as it does in
// broker apps; a finger on the dates moves along them. A vertical swipe or a plain wheel still
// scrolls the page past the chart.
export const ZOOM_OPTIONS = {
  handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false }, axisDoubleClickReset: { time: true, price: true } },
  handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: false, vertTouchDrag: false },
  kineticScroll: { touch: false, mouse: false },
};

// How far a finger moves before its drag counts as sideways (read the chart) or up/down (scroll).
const DRAG_SLOP = 6;

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

    // One finger. The library only shows its crosshair after a 240ms press, so a plain drag did
    // nothing. Here a tap or a sideways drag on the plot moves the crosshair under the finger, by
    // handing the library the mouse events a pointer would send (so the price readout, the magnet
    // and the volume line all follow exactly as with a mouse); it stays where the finger lifts. A
    // drag on the dates moves along them when zoomed in; an up/down drag scrolls the page and
    // clears the crosshair. Two fingers go to the library untouched, for its pinch zoom.
    let mode: "idle" | "pending" | "read" | "pan" | "scroll" | "multi" = "idle";
    let start = { x: 0, y: 0 };
    let shown: HTMLCanvasElement | null = null; // the plot canvas holding the crosshair, if any
    // The plot's top canvas, which takes the pointer events. The pane's element is its whole row,
    // price axes included, so it is the widest canvas there (the last of its two layers).
    const plot = () => {
      let best: HTMLCanvasElement | null = null;
      for (const c of chart.panes()[0]?.getHTMLElement()?.querySelectorAll("canvas") ?? []) {
        if (!best || c.clientWidth >= best.clientWidth) best = c;
      }
      return best;
    };
    const mouse = (target: HTMLCanvasElement, type: string, x: number, y: number) => {
      const r = target.getBoundingClientRect();
      const clientX = Math.min(r.right - 1, Math.max(r.left, x));
      const clientY = Math.min(r.bottom - 1, Math.max(r.top, y));
      target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: type !== "mouseenter" && type !== "mouseleave" }));
    };
    const read = (x: number, y: number) => {
      const target = shown ?? plot();
      if (!target) return;
      if (!shown) mouse(target, "mouseenter", x, y);
      shown = target;
      mouse(target, "mousemove", x, y);
    };
    const hide = () => {
      if (shown) mouse(shown, "mouseleave", 0, 0);
      shown = null;
    };
    const onPlot = (x: number, y: number) => {
      const r = plot()?.getBoundingClientRect();
      return !!r && y <= r.bottom;
    };
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length > 1 || mode === "multi") {
        // A second finger: a pinch, for the library. Let it see this touchstart.
        hide();
        mode = "multi";
        return;
      }
      e.stopPropagation();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      mode = "pending";
    };
    const touchMove = (e: TouchEvent) => {
      if (mode === "multi" || mode === "idle") return;
      e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (mode === "pending") {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP) return;
        mode = Math.abs(dy) > Math.abs(dx) ? "scroll" : onPlot(start.x, start.y) ? "read" : "pan";
        if (mode === "scroll") hide();
      }
      if (mode === "scroll") return;
      if (e.cancelable) e.preventDefault();
      if (mode === "read") read(t.clientX, t.clientY);
      else {
        // Move the dates with the finger: one finger-width of pixels is that many bars.
        const r = ts.getVisibleLogicalRange();
        const w = ts.width();
        if (r && w > 0) {
          const shift = -((t.clientX - start.x) * (r.to - r.from)) / w;
          const h = homeRef.current;
          const width = r.to - r.from;
          let from = r.from + shift;
          if (h) from = Math.min(h.to - width, Math.max(h.from, from));
          ts.setVisibleLogicalRange({ from, to: from + width });
        }
        start = { x: t.clientX, y: t.clientY };
      }
    };
    const touchEnd = (e: TouchEvent) => {
      if (mode === "multi") {
        if (e.touches.length === 0) mode = "idle";
        return;
      }
      if (mode === "idle") return;
      e.stopPropagation();
      const t = e.changedTouches[0];
      // A tap on the plot reads that day.
      if (mode === "pending" && t && onPlot(t.clientX, t.clientY)) read(t.clientX, t.clientY);
      mode = "idle";
    };
    // Up/down drags stay with the browser; sideways ones come here (no page pinch-zoom over the chart).
    el.style.touchAction = "pan-y";
    el.addEventListener("touchstart", touchStart, { capture: true, passive: true });
    el.addEventListener("touchmove", touchMove, { capture: true, passive: false });
    el.addEventListener("touchend", touchEnd, { capture: true });
    el.addEventListener("touchcancel", touchEnd, { capture: true });
    // A tap elsewhere on the page puts the crosshair away.
    const outside = (e: TouchEvent) => {
      if (shown && !el.contains(e.target as Node)) hide();
    };
    document.addEventListener("touchstart", outside, { passive: true });
    return () => {
      el.removeEventListener("wheel", wheel, { capture: true });
      el.removeEventListener("touchstart", touchStart, { capture: true });
      el.removeEventListener("touchmove", touchMove, { capture: true });
      el.removeEventListener("touchend", touchEnd, { capture: true });
      el.removeEventListener("touchcancel", touchEnd, { capture: true });
      document.removeEventListener("touchstart", outside);
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
  "inline-flex min-h-8 min-w-8 items-center pointer-coarse:min-h-9 pointer-coarse:min-w-9 justify-center rounded-full border border-line bg-panel px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-ink-soft";

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
      <span className="text-[11px] text-ink-soft">
        <span className="pointer-coarse:hidden">Pinch or Ctrl + scroll to zoom, drag sideways to move</span>
        <span className="hidden pointer-coarse:inline">Touch the chart to read a day. Pinch to zoom, drag the dates to move</span>
      </span>
    </div>
  );
}
