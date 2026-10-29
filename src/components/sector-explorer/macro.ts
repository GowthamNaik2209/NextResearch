"use client";

// The heatmap explorer's what-if maths (the Nifty 50): several scenarios picked across sections
// combine into one net reading per stock and industry, and their past episodes - real windows read
// from the stored history (/api/episodes) - rank the stocks by how they actually did against the
// index. Readings are editorial (severity x direction); the ranking is history, not a forecast.
import { useEffect, useState } from "react";
import { companyLinkKey, type SectorWithSlug } from "@/lib/sector-content/core";
import { scenarioStockReadings, type Scenario, type ScenarioEpisode } from "@/lib/sector-content/scenarios";

/** Net reading per stock (supplier key) and per zone: + tailwind, - headwind, severity summed over the picked scenarios. */
export type Combined = { stocks: Map<string, number>; zones: Map<string, number> };

export function combineScenarios(sector: SectorWithSlug, picked: Scenario[]): Combined {
  const stocks = new Map<string, number>();
  const zones = new Map<string, number>();
  for (const sc of picked) {
    for (const [key, r] of scenarioStockReadings(sector, sc)) stocks.set(key, (stocks.get(key) ?? 0) + (r.effect === "tailwind" ? 1 : -1) * r.severity);
    for (const imp of sc.impacts) zones.set(imp.zone, (zones.get(imp.zone) ?? 0) + ((imp.effect ?? sc.effect) === "tailwind" ? 1 : -1) * imp.severity);
  }
  return { stocks, zones };
}

export type EpisodeData = { from: string; to: string; index: number | null; stocks: Record<string, number> };
export type Episodes = { status: "idle" | "loading" | "error" } | { status: "ok"; list: (ScenarioEpisode & { scenario: string; data: EpisodeData })[] };

const loaded = new Map<string, EpisodeData>();

/** The picked scenarios' episodes, each stock's and the index's actual move over each (one request). */
export function useEpisodes(slug: string, picked: Scenario[]): Episodes {
  const withEp = picked.filter((s) => s.episode);
  const key = withEp.map((s) => `${s.episode!.from}:${s.episode!.to}`).join(",");
  const [got, setGot] = useState<{ key: string; ok: boolean; tries: number } | null>(null);
  // A failed load is asked again twice, a few seconds apart, before the panel says so.
  const tries = got?.key === key ? got.tries : 0;
  useEffect(() => {
    if (!key) return;
    const missing = key.split(",").filter((w) => !loaded.has(w));
    if (!missing.length) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (!live) return;
      if (tries < 2) timer = setTimeout(() => live && setGot({ key, ok: true, tries: tries + 1 }), 3000);
      else setGot({ key, ok: false, tries });
    };
    fetch(`/api/episodes?sector=${encodeURIComponent(slug)}&w=${missing.join(",")}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((j: { episodes: EpisodeData[] }) => {
        for (const e of j.episodes) loaded.set(`${e.from}:${e.to}`, e);
        // A window the answer left out would otherwise keep the panel "replaying" for good.
        if (missing.every((w) => loaded.has(w))) {
          if (live) setGot({ key, ok: true, tries });
        } else fail();
      })
      .catch(fail);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [slug, key, tries]);
  if (!key) return { status: "idle" };
  const list = withEp.map((s) => ({ ...s.episode!, scenario: s.title, data: loaded.get(`${s.episode!.from}:${s.episode!.to}`) }));
  if (list.every((e) => e.data)) return { status: "ok", list: list as (ScenarioEpisode & { scenario: string; data: EpisodeData })[] };
  return got?.key === key && !got.ok ? { status: "error" } : { status: "loading" };
}

export type HistoryRow = {
  key: string;
  ticker: string;
  name: string;
  zoneId: string;
  /** Average of (stock move - Nifty 50 move) over the episodes it traded through, percentage points. */
  vsIndex: number;
  /** Each episode's move against the index, in the order of the episodes; null where it wasn't trading. */
  each: (number | null)[];
  /** Episodes it counts (some stocks listed later). */
  n: number;
};

/**
 * Stocks ranked by how they did against the index across the episodes, best first. An episode
 * before the index's own history (Sep 2007) is measured on raw moves, which `index: null` marks.
 */
export function rankByHistory(sector: SectorWithSlug, episodes: { data: EpisodeData }[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const z of sector.zones)
    for (const link of z.suppliers) {
      const key = companyLinkKey(link);
      const sup = sector.suppliers[key];
      const ticker = sup?.listed ? sup.f?.ticker : undefined;
      if (!ticker) continue;
      const each = episodes.map(({ data }) => {
        const v = data.stocks[ticker];
        return v == null ? null : v - (data.index ?? 0);
      });
      const known = each.filter((v): v is number => v != null);
      if (!known.length) continue;
      rows.push({ key, ticker, name: sup.name, zoneId: z.id, vsIndex: known.reduce((a, b) => a + b, 0) / known.length, each, n: known.length });
    }
  return rows.sort((a, b) => b.vsIndex - a.vsIndex);
}

/** "+4.2 pts" / "−3.1 pts". */
export const pts = (v: number) => {
  // Signed by the shown figure, so a tiny move reads "0.0 pts", never "−0.0 pts".
  const shown = Number(v.toFixed(1));
  return `${shown > 0 ? "+" : shown < 0 ? "−" : ""}${Math.abs(shown).toFixed(1)} pts`;
};
// "12 Sep 2008", as the episode labels write it (the browsers' en-IN and en-GB say "Sept").
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
