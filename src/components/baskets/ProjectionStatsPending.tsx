"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Shown while the server instance is still loading the stocks' price statistics (the first visits
// after it starts): its projections use stand-ins until then, so they would differ from the next
// visit's. The page re-fetches its data in place (router.refresh() keeps scroll position, the
// Projections switch and anything typed) until the statistics are in, when this note is no longer
// rendered and the refreshing stops. Quick at first, then further apart: about two minutes in all.
const WAITS_MS = [4_000, 4_000, 8_000, 8_000, 15_000, 15_000, 30_000, 30_000];

export function ProjectionStatsPending() {
  const router = useRouter();
  useEffect(() => {
    let step = 0;
    let timer: number | undefined;
    const refresh = () => {
      router.refresh();
      step += 1;
      next();
    };
    // A hidden tab pauses: the refresh happens when it is looked at again.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", onVisible);
      refresh();
    };
    function next() {
      if (step >= WAITS_MS.length) return;
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") refresh();
        else document.addEventListener("visibilitychange", onVisible);
      }, WAITS_MS[step]);
    }
    next();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
  return (
    <p role="status" className="text-[11px] leading-snug text-ink-soft">
      Projections are using estimates while today&rsquo;s price statistics load (a beta of 1 and volatility from the 52-week range). They
      update by themselves in a moment.
    </p>
  );
}
