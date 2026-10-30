"use client";

import { usePathname } from "next/navigation";
import { ShortcutLink } from "./KeyboardShortcuts";

// The main sections, centred in the header as one frosted pill (md and up); MobileMenu lists the
// same ones on phones. `match` lists the path prefixes that light a section up: Analysis also owns
// the sector pages and IPOs (reached from its IPOs tab).
export const SECTIONS = [
  { href: "/docs", shortcut: "A", label: "Analysis", match: ["/docs", "/sector", "/ipos"] },
  { href: "/baskets", shortcut: "B", label: "Baskets", match: ["/baskets"] },
  { href: "/connections", shortcut: "C", label: "Connections", match: ["/connections"] },
  { href: "/updates", shortcut: "U", label: "Updates", match: ["/updates"] },
  { href: "/#how", shortcut: "/", label: "How it works", match: [] },
];

export function isSectionActive(match: string[], pathname: string) {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function NavPill() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="glass hidden items-center gap-0.5 rounded-full p-1 md:flex">
      {SECTIONS.map((s) => {
        const active = isSectionActive(s.match, pathname);
        // nowrap: at 768px "How it works" would otherwise break onto two lines. Touch tablets get
        // 40px-tall links; a mouse keeps the compact look.
        return (
          <ShortcutLink
            key={s.href}
            href={s.href}
            shortcut={s.shortcut}
            label={s.label}
            aria-current={active ? "page" : undefined}
            className={`tap-y whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors lg:px-3.5 lg:text-sm pointer-coarse:py-2.5 ${
              active ? "bg-accent/15 text-ink shadow-sm ring-1 ring-accent/40" : "text-ink-soft hover:bg-panel-2/70 hover:text-ink"
            }`}
          />
        );
      })}
    </nav>
  );
}
