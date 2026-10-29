"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Opened from the home screen, the app has no browser refresh and iOS can keep it in the
// background for hours. Coming back after a while re-fetches the page's data (prices, figures)
// in place: router.refresh() keeps scroll position and anything typed. In a browser tab this
// does nothing; the tab's own reload is there.
const STALE_AFTER_MS = 5 * 60 * 1000;

export function AppResume() {
  const router = useRouter();
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt != null && Date.now() - hiddenAt > STALE_AFTER_MS) {
        hiddenAt = null;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);
  return null;
}
