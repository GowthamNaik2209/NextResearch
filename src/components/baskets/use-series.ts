"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import { loadSeries, type Load } from "./series";

// Every mounted useSeries, so any Retry asks again for every line that failed, in every panel: the
// panels of a page share each download, and one panel recovering while the next still says "no
// data" read as a contradiction (a dropped connection fails them all at once anyway).
const resets = new Set<() => void>();
/** Asks again for every line that failed to load, in every panel (a single page-level Retry). */
export function retryFailedSeries() {
  resets.forEach((reset) => reset());
}

/**
 * The series a component draws, by key (see series.ts), for one range: each key is fetched once
 * (shared with every other component through loadSeries) and read back with `get`. `retry(key)`
 * fetches every failed one again, in every panel; bumping `reload` (the page's Retry) retries this
 * component's failed ones.
 * Every basket panel loads through this, so a retry or a range switch behaves the same in each.
 */
export function useSeries(keys: (string | null | undefined)[], range: ChartRange, { reload = 0 }: { reload?: number } = {}) {
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [seen, setSeen] = useState(reload);
  if (reload !== seen) {
    setSeen(reload);
    setLoads((m) => Object.fromEntries(Object.entries(m).filter(([, l]) => l.status !== "error")));
  }
  // One string of every key, so a re-render with the same lines doesn't re-run the effect.
  const sig = [...new Set(keys.filter((k): k is string => !!k))].join("\n");
  useEffect(() => {
    for (const key of sig ? sig.split("\n") : []) {
      const id = `${key}|${range}`;
      if (loads[id]) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the series as loading, then fetches it
      setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
      loadSeries(key, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
    }
  }, [sig, range, loads]);

  useEffect(() => {
    const reset = () => setLoads((m) => (Object.values(m).some((l) => l.status === "error") ? Object.fromEntries(Object.entries(m).filter(([, l]) => l.status !== "error")) : m));
    resets.add(reset);
    return () => {
      resets.delete(reset);
    };
  }, []);

  const get = useCallback((key: string | null | undefined): Load | undefined => (key ? loads[`${key}|${range}`] : undefined), [loads, range]);
  // Takes the line's key, as its callers name what they retry; asks again for every failed line.
  const retry: (key: string) => void = useCallback(() => retryFailedSeries(), []);
  return { get, retry };
}
