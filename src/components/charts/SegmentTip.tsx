"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";

// The name of a slice in a stacked bar (a layer, a company, a holder), shown above it on hover, on
// keyboard focus and on a tap (title tooltips never show on a phone, and a slice is too narrow to
// carry its own name). Fixed-positioned so a bar's overflow-hidden can't clip it. It keeps its own
// width (up to its max) and is shifted sideways to stay 8px inside the screen, never squeezed; with
// no room above the slice it goes below. A tap shows it for a moment, scrolling hides it.
const EDGE = 8;
const GAP = 6;

type Tip = { text: string; x: number; top: number; bottom: number };

export function useSegmentTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [tip]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Measured before paint: centred on the slice, then shifted in from the screen's edges.
  useLayoutEffect(() => {
    const el = box.current;
    if (!tip || !el) return setPos(null);
    const { width: w, height: h } = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(EDGE, Math.min(tip.x - w / 2, vw - EDGE - w));
    const above = tip.top - GAP - h;
    const top = above >= EDGE || tip.bottom + GAP + h > vh - EDGE ? Math.max(EDGE, above) : tip.bottom + GAP;
    setPos({ left, top });
  }, [tip]);

  const place = (el: Element, text: string) => {
    clearTimeout(timer.current);
    const r = el.getBoundingClientRect();
    setTip({ text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };

  /** Spread onto a slice: `<span {...tipFor("Transformers: 32%")} />`. */
  const tipFor = (text: string) => ({
    "aria-label": text,
    onPointerEnter: (e: PointerEvent) => e.pointerType === "mouse" && place(e.currentTarget, text),
    onPointerLeave: (e: PointerEvent) => e.pointerType === "mouse" && setTip(null),
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      place(e.currentTarget, text);
      timer.current = setTimeout(() => setTip(null), 2200);
    },
    onFocus: (e: FocusEvent) => place(e.currentTarget, text),
    onBlur: () => setTip(null),
  });

  // Rendered at the corner, unseen, until measured (so its width is its own, not what's left of the screen).
  const node = tip && (
    <span
      ref={box}
      role="tooltip"
      className="pointer-events-none fixed z-50 w-max max-w-[min(16rem,calc(100vw-16px))] rounded-md border border-line bg-panel px-2 py-1 text-[11px] font-semibold leading-snug text-ink shadow-lg sm:text-xs"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
    >
      {tip.text}
    </span>
  );

  return { tipFor, tipNode: node };
}
