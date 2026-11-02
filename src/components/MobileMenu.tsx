"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_MENU_EVENT } from "./KeyboardShortcuts";
import { SECTIONS, sectionActive, useAnchorInView } from "./NavPill";

// Phone-only navigation: the header's text links are hidden below `md`, so this hamburger
// opens the same destinations (SECTIONS) as a dropdown. Closes on a pick, outside tap or Escape.

// `hideFrom` is the class that hides the menu once the page shows its own nav links: the site
// header shows them from md (768px); the explorer header never does, so it keeps the menu longer.
export function MobileMenu({ hideFrom = "md:hidden" }: { hideFrom?: string } = {}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const anchor = useAnchorInView(pathname);
  const ref = useRef<HTMLDivElement>(null);

  // ⌥P opens the account menu; close this one so the two dropdowns never overlap.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener(ACCOUNT_MENU_EVENT, close);
    return () => window.removeEventListener(ACCOUNT_MENU_EVENT, close);
  }, []);

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
        // Below sm the ☰ sits mid-header, so a 208px dropdown right-aligned to it ran off the left
        // edge at 360px: there it spans the screen with a 12px gutter instead.
        <div role="menu" className="absolute right-0 top-11 z-50 flex w-52 flex-col rounded-xl border border-line bg-panel p-1.5 shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-14 max-sm:w-auto">
          {SECTIONS.map((s) => {
            const active = sectionActive(s, pathname, anchor);
            return (
              <Link
                key={s.href}
                href={s.href}
                role="menuitem"
                aria-current={active ? (s.anchor ? "location" : "page") : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink ${active ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-panel-2"}`}
              >
                {s.label}
                {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
