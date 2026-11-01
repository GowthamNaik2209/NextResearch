"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// The page's three sections, in page order, each on one line. Short names on phones and laptops, where the full ones don't fit beside the intro.
const SECTIONS = [
  { id: "ideas", short: "Rule-based", full: "Rule-based baskets" },
  { id: "mine", short: "Your baskets", full: "Your baskets" },
  { id: "industry", short: "Industry/Policy", full: "Industry/Policy baskets" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// A switch beside the Baskets intro: each segment scrolls to its section (clearing the sticky header
// through the sections' scroll-mt) and the one in view stays marked. Create basket sits apart as the
// page's primary action (Your baskets keeps a quieter copy).
export function BasketsJump({ createHref }: { createHref: string }) {
  const [current, setCurrent] = useState<SectionId>("ideas");
  // A tapped section stays marked until the reader scrolls by hand: near the bottom of the page a
  // short section can't reach the top, and the one below it would otherwise take the mark.
  const picked = useRef<SectionId | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (picked.current) return setCurrent(picked.current);
      // The last section whose top has passed a line just under the sticky header (the sections stop
      // 96px down after a jump); at the very bottom, the last section (a short one may never reach it).
      const line = 150;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let on: SectionId = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) on = s.id;
      }
      setCurrent(atEnd ? SECTIONS[SECTIONS.length - 1].id : on);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const byHand = () => {
      picked.current = null;
    };
    const hand = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    for (const e of hand) window.addEventListener(e, byHand, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      for (const e of hand) window.removeEventListener(e, byHand);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const go = (id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    picked.current = id;
    setCurrent(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Focus follows to the section's heading, so the next Tab carries on from there instead of
    // jumping back up to the switch.
    document.getElementById(`${id}-h`)?.focus({ preventScroll: true });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:flex-col lg:items-end xl:flex-row xl:items-center">
      <nav aria-label="Jump to a section" className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-line bg-bg sm:flex-none">
        {SECTIONS.map((s, i) => {
          const on = s.id === current;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={on ? "location" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                go(s.id);
              }}
              className={
                "flex min-h-11 flex-auto items-center justify-center whitespace-nowrap px-2 text-center text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-10 sm:px-3 sm:text-sm pointer-coarse:min-h-11 " +
                (i ? "border-l border-line " : "") +
                (on ? "bg-ink text-bg" : "text-ink-soft hover:bg-panel hover:text-ink")
              }
            >
              <span className="xl:hidden">{s.short}</span>
              <span className="hidden xl:inline">{s.full}</span>
            </a>
          );
        })}
      </nav>
      <Link
        href={createHref}
        className="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 rounded-md bg-accent px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent text-sm font-semibold text-bg shadow-sm hover:opacity-90 sm:min-h-10 pointer-coarse:min-h-11"
      >
        <span aria-hidden className="text-base leading-none">+</span>
        Create basket
      </Link>
    </div>
  );
}
