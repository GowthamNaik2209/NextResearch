"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShortcutLink } from "./KeyboardShortcuts";

// The main sections, centred in the header as one frosted pill (md and up); MobileMenu lists the
// same ones on phones. `match` lists the path prefixes that light a section up: Analysis also owns
// the sector pages and IPOs (reached from its IPOs tab). How it works is a section of the home page
// rather than a page, so it lights up while that section (`anchor`) is on screen there.
export const SECTIONS: { href: string; shortcut: string; label: string; match: string[]; anchor?: string }[] = [
  { href: "/docs", shortcut: "A", label: "Analysis", match: ["/docs", "/sector", "/ipos"] },
  { href: "/baskets", shortcut: "B", label: "Baskets", match: ["/baskets"] },
  { href: "/connections", shortcut: "C", label: "Connections", match: ["/connections"] },
  { href: "/updates", shortcut: "U", label: "Updates", match: ["/updates"] },
  { href: "/#how", shortcut: "/", label: "How it works", match: [], anchor: "how" },
];

export function isSectionActive(match: string[], pathname: string) {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** On the home page, the id of the anchored section (How it works) crossing the middle of the screen, else null. */
export function useAnchorInView(pathname: string): string | null {
  const [inView, setInView] = useState<string | null>(null);
  useEffect(() => {
    const ids = SECTIONS.flatMap((s) => (s.anchor ? [s.anchor] : []));
    const els = pathname === "/" ? ids.flatMap((id) => document.getElementById(id) ?? []) : [];
    if (!els.length) return;
    // A thin band across the middle of the viewport: the section counts once it fills the screen,
    // and a link to #how (which scrolls it to the top) lights it straight away.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView((cur) => (e.isIntersecting ? e.target.id : cur === e.target.id ? null : cur));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return pathname === "/" ? inView : null;
}

export const sectionActive = (s: (typeof SECTIONS)[number], pathname: string, anchorInView: string | null) =>
  s.anchor ? s.anchor === anchorInView : isSectionActive(s.match, pathname);

export function NavPill() {
  const pathname = usePathname();
  const anchor = useAnchorInView(pathname);
  return (
    <nav aria-label="Sections" className="glass hidden items-center gap-0.5 rounded-full p-1 md:flex">
      {SECTIONS.map((s) => {
        const active = sectionActive(s, pathname, anchor);
        // nowrap: at 768px "How it works" would otherwise break onto two lines. Touch tablets get
        // 40px-tall links; a mouse keeps the compact look.
        return (
          <ShortcutLink
            key={s.href}
            href={s.href}
            shortcut={s.shortcut}
            label={s.label}
            aria-current={active ? (s.anchor ? "location" : "page") : undefined}
            className={`tap-y whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors lg:px-3.5 lg:text-sm pointer-coarse:py-2.5 ${
              active ? "bg-accent/15 text-ink shadow-sm ring-1 ring-accent/40" : "text-ink-soft hover:bg-panel-2/70 hover:text-ink"
            }`}
          />
        );
      })}
    </nav>
  );
}
