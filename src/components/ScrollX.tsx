"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A box that scrolls sideways on its own (never the page), for tables with more columns than a phone
 * fits. While more columns sit off to the right, the right edge fades out as the cue; the fade goes
 * once the reader reaches the end. `fade` is the colour the edge fades to (the box's background).
 * `startAtEnd` opens it scrolled to the right, for year columns where the latest come last; the
 * left edge then fades while columns sit off to the left, just past the held first column (`heldWidth`).
 */
export function ScrollX({
  children,
  className = "",
  fade = "from-panel",
  startAtEnd = false,
  heldWidth = "left-0",
}: {
  children: ReactNode;
  className?: string;
  fade?: string;
  startAtEnd?: boolean;
  /** Where the left fade starts: a `left-*` class the width of a sticky first column. */
  heldWidth?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const [before, setBefore] = useState(false);

  // Before paint, so a table that opens on its latest columns doesn't first flash the earliest.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => {
      setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
      setBefore(startAtEnd && el.scrollLeft > 4);
    };
    if (startAtEnd) el.scrollLeft = el.scrollWidth;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [startAtEnd]);

  return (
    <div className="relative min-w-0">
      <div ref={box} className={"overflow-x-auto overflow-y-hidden overscroll-x-contain " + className}>
        {children}
      </div>
      {startAtEnd && <div aria-hidden className={"pointer-events-none absolute inset-y-0 z-[2] w-8 bg-gradient-to-r to-transparent transition-opacity " + heldWidth + " " + fade + (before ? " opacity-100" : " opacity-0")} />}
      <div aria-hidden className={"pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent transition-opacity " + fade + (more ? " opacity-100" : " opacity-0")} />
    </div>
  );
}
