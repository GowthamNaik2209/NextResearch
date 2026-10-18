"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Phone-only navigation: the header's text links are hidden below `md`, so this hamburger
// opens the same destinations as a dropdown. Closes on a pick, outside tap or Escape.
const ITEMS: [string, string][] = [
  ["Themes", "/#themes"],
  ["Connections", "/connections"],
  ["Updates", "/updates"],
  ["How it works", "/#how"],
  ["Analysis", "/docs"],
];

// `hideFrom` is the class that hides the menu once the page shows its own nav links: the site
// header shows them from md (768px); the explorer header never does, so it keeps the menu longer.
export function MobileMenu({ hideFrom = "md:hidden" }: { hideFrom?: string } = {}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${hideFrom}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="tap-target flex h-8 w-8 items-center sm:h-9 sm:w-9 justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-ink"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 flex w-52 flex-col rounded-xl border border-line bg-panel p-1.5 shadow-xl">
          {ITEMS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel-2"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
