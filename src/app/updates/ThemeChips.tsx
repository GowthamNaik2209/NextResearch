"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// The theme filter row. Phones get one sideways-scrolling row (11+ chips wrapped to ~9 rows and
// filled the first screen); from sm they wrap. After a pick the row scrolls the selected chip
// into view in place - it used to be moved next to "All themes" (CSS order) while the row kept its
// scroll position, so the highlighted chip ended up off-screen and labels overlapped mid-reflow.
export function ThemeChips({ sectors, active }: { sectors: { slug: string; name: string }[]; active?: string }) {
  const row = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = row.current;
    const chip = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return;
    // Centre it within the row only (scrollIntoView would also scroll the page).
    nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2, behavior: "instant" });
  }, [active]);

  const chip = (isActive: boolean) =>
    "tap-y flex-none whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold " +
    (isActive ? "border-accent bg-accent text-bg" : "border-line bg-panel text-ink-soft hover:text-ink");

  return (
    <nav
      ref={row}
      aria-label="Filter by theme"
      className="scrollbar-none relative -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pointer-coarse:pt-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      <Link href="/updates" scroll={false} className={chip(!active)} aria-current={!active ? "page" : undefined}>
        All themes
      </Link>
      {sectors.map((s) => (
        <Link key={s.slug} href={`/updates?sector=${s.slug}`} scroll={false} className={chip(active === s.slug)} aria-current={active === s.slug ? "page" : undefined}>
          {s.name}
        </Link>
      ))}
    </nav>
  );
}
