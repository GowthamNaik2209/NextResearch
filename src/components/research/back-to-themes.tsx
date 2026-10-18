"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Set by a theme card's Charts button (SectorBrowser) just before it navigates here, holding
// the tab and scroll position it left; handed back under THEMES_RETURN when Back is used.
export const CHARTS_FROM_THEMES = "nr-charts-from-themes";
export const THEMES_RETURN = "nr-themes-return";
export type ThemesSpot = { tab: string; y: number };

// "Back to themes" on the Analysis page when it was opened from a theme card (?from=themes).
// Came here by clicking in this tab: step back in history, which returns to the same card.
// Opened from a shared link (no marker): load the landing page's Themes section instead.
export function BackToThemes() {
  const router = useRouter();
  const spot = useRef<string | null>(null);

  // Read and clear on arrival, so a marker can never outlive the visit that set it.
  useEffect(() => {
    try {
      // Keep what an earlier run read: effects can run twice (React's dev double-invoke).
      spot.current = sessionStorage.getItem(CHARTS_FROM_THEMES) ?? spot.current;
      sessionStorage.removeItem(CHARTS_FROM_THEMES);
    } catch {}
  }, []);

  return (
    <Link
      href="/#themes"
      onClick={(e) => {
        if (!spot.current) return;
        e.preventDefault();
        try {
          sessionStorage.setItem(THEMES_RETURN, spot.current);
        } catch {}
        router.back();
      }}
      className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full border border-line bg-panel px-3.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
    >
      <span aria-hidden>&larr;</span> Back to themes
    </Link>
  );
}
