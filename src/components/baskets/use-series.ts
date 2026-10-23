"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import { loadSeries, type Load } from "./series";

/**
 * The series a component draws, by key (see series.ts), for one range: each key is fetched once
 * (shared with every other component through loadSeries) and read back with `get`. `retry(key)`
 * fetches a failed one again; bumping `reload` (the page's Retry) retries every failed one.
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

  const get = useCallback((key: string | null | undefined): Load | undefined => (key ? loads[`${key}|${range}`] : undefined), [loads, range]);
  const retry = useCallback(
    (key: string) =>
      setLoads((m) => {
        const rest = { ...m };
        delete rest[`${key}|${range}`];
        return rest;
      }),
    [range],
  );
  return { get, retry };
}
