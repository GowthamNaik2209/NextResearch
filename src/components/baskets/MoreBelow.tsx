"use client";

import { useEffect, useState } from "react";

// A scroll cue for a fixed-height list: how many of its rows are still below the visible part,
// and an overlay (a fade and "N more ↓") laid over its bottom edge. The overlay floats, so it never
// changes the list's height, and it lets taps through to the rows under it.

/**
 * Rows (matching `rows` inside the scroll box) that end below the box's visible bottom. Returns a
 * callback ref for the box (it may mount later, with the view that holds it) and the count.
 */
export function useMoreBelow<T extends HTMLElement>(rows: string): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const bottom = el.getBoundingClientRect().top + el.clientHeight;
      let below = 0;
      el.querySelectorAll<HTMLElement>(rows).forEach((r) => {
        const b = r.getBoundingClientRect();
        // A row more than half out of view still counts as "more".
        if (b.height && b.top + b.height / 2 > bottom + 1) below++;
      });
      setN(below);
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
      mo.disconnect();
    };
  }, [el, rows]);
  return [setEl, el ? n : 0];
}

/** The overlay: place it inside a `relative` wrapper around the scroll box. */
export function MoreBelow({ count, noun = "more" }: { count: number; noun?: string }) {
  return (
    <div aria-hidden className={"pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center bg-gradient-to-t from-panel via-panel/85 to-transparent pb-1 transition-opacity " + (count > 0 ? "opacity-100" : "opacity-0")}>
      <span className="rounded-full border border-line bg-panel px-2 py-px font-mono text-[10px] font-semibold text-ink-soft">
        {count} {noun} ↓
      </span>
    </div>
  );
}
