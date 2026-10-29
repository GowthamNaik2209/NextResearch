"use client";

import { useEffect, useRef, useState } from "react";
import { companyLinkKey, parseCrore, type SectorWithSlug } from "@/lib/sector-content/core";
import type { ChartRange } from "@/lib/live/yahoo";
import { forgetSeries, industrySeriesKey, loadSeries } from "@/components/baskets/series";
import { HeatLegend, heatFmt, heatScale, heatStyle } from "@/components/charts/Heatmap";
import type { ImpactMap } from "./engine";

// The explorer's stage for a sector drawn as a heatmap instead of a 3D model (stage: "heatmap", the
// Nifty 50): every stock as a tile, grouped by the sector's zones (NSE's industries), coloured by
// its price change over the period picked. It reads the industry basket's own backtest (the same
// request and cache as the basket page and the overview's heatmap), so the figures agree. Picking
// an industry lifts its group to the top, fades the rest and re-scales the colours to its own
// spread; a what-if scenario marks the industries it touches. A tile opens the stock in the
// explorer's panel, where the stock pop-up is one tap away, as on the 3D maps.

type Range = ChartRange | "1D";

const RANGES: { id: Range; long: string }[] = [
  { id: "1D", long: "latest trading day" },
  { id: "1M", long: "past month" },
  { id: "6M", long: "past 6 months" },
  { id: "1Y", long: "past year" },
  { id: "3Y", long: "past 3 years" },
];

const SEVERITY = ["", "Low", "Medium", "High"];

type Stock = { key: string; ticker: string; name: string; mcapCr: number | null };
type Group = { id: string; label: string; color: string; stocks: Stock[] };

export function HeatmapStage({
  sector,
  zoneId,
  hoverZoneId,
  impact,
  supplierKey,
  onPickZone,
  onPickStock,
}: {
  sector: SectorWithSlug;
  zoneId: string | null;
  hoverZoneId: string | null;
  impact: ImpactMap | null;
  supplierKey: string | null;
  onPickZone: (id: string | null) => void;
  onPickStock: (zoneId: string, key: string) => void;
}) {
  const [range, setRange] = useState<Range>("1D");
  // A newly picked industry moves to the top: bring the top into view.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (zoneId) scrollRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [zoneId]);
  const [got, setGot] = useState<{ range: Range; ret: Map<string, number>; pending: Set<string>; dayOf?: string } | "error" | null>(null);
  // A cold backtest answers before every stock's prices are in (`pending`): those tiles keep their
  // placeholder, and it is asked again a few times until they arrive.
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const key = industrySeriesKey(sector.slug);
    // 1D is each stock's move on the latest trading day, which the 1M backtest carries (daily closes).
    const span = range === "1D" ? "1M" : range;
    loadSeries(key, span).then((l) => {
      if (!live) return;
      if (l.status !== "ok") return setGot("error");
      const ret = range === "1D" ? new Map(Object.entries(l.data.day ?? {})) : new Map((l.data.holdings ?? []).map((h) => [h.ticker, h.ret]));
      const pending = new Set(l.data.pending ?? []);
      setGot({ range, ret, pending, dayOf: l.data.dayOf });
      // The server keeps a part-loaded answer up to a minute, so keep asking for about two.
      if (pending.size && retry < 12)
        timer = setTimeout(() => {
          forgetSeries(key, span);
          setRetry((n) => n + 1);
        }, 10_000);
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [sector.slug, range, retry]);

  const loading = got == null || (got !== "error" && got.range !== range);
  const ret = got && got !== "error" && !loading ? got.ret : new Map<string, number>();
  const pendingSet = got && got !== "error" && !loading ? got.pending : new Set<string>();
  const dayOf = got && got !== "error" ? got.dayOf : undefined;
  // "over the past year", or for 1D the day itself: "on 28 Oct (close)".
  const period =
    range === "1D" && dayOf
      ? `on ${new Date(`${dayOf}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} (close)`
      : `over the ${RANGES.find((r) => r.id === range)!.long}`;

  const groups: Group[] = sector.zones.map((z) => ({
    id: z.id,
    label: z.label,
    color: z.color,
    stocks: z.suppliers
      .map(companyLinkKey)
      .flatMap((key) => {
        const s = sector.suppliers[key];
        return s?.listed && s.f?.ticker ? [{ key, ticker: s.f.ticker, name: s.name, mcapCr: parseCrore(s.f.mcap) }] : [];
      })
      .sort((a, b) => (b.mcapCr ?? -1) - (a.mcapCr ?? -1)),
  }));
  // The picked industry leads; the rest keep the authored order.
  const ordered = zoneId ? [...groups.filter((g) => g.id === zoneId), ...groups.filter((g) => g.id !== zoneId)] : groups;
  const picked = zoneId ? groups.find((g) => g.id === zoneId) ?? null : null;

  // Bigger companies take bigger tiles, against the whole index's median market cap.
  const caps = groups.flatMap((g) => g.stocks.flatMap((s) => (s.mcapCr ? [s.mcapCr] : []))).sort((a, b) => a - b);
  const median = caps.length ? caps[Math.floor(caps.length / 2)] : 0;
  const sizeOf = (c: number | null) => (!c || !median ? 1 : c >= median * 4 ? 3 : c >= median * 1.6 ? 2 : 1);

  const valueOf = (s: Stock) => ret.get(s.ticker) ?? null;
  // Re-heatmapped: with an industry picked the colours span that industry's own moves.
  const scale = heatScale((picked ? picked.stocks : groups.flatMap((g) => g.stocks)).map(valueOf));
  const avg = (g: Group) => {
    const v = g.stocks.map(valueOf).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const all = groups.flatMap((g) => g.stocks);
  const known = all.filter((s) => valueOf(s) != null);
  const up = known.filter((s) => valueOf(s)! > 0).length;

  return (
    <div className="heat-stage-inner" ref={scrollRef}>
      <div className="heat-top">
        <p className="heat-summary">
          {got === "error" ? (
            "The prices couldn’t load right now. Try again in a moment."
          ) : loading ? (
            `Loading the ${sector.name} stocks…`
          ) : picked ? (
            <>
              <b>{picked.label}</b>: {picked.stocks.filter((s) => (valueOf(s) ?? 0) > 0).length} of {picked.stocks.length} up {period}
              {avg(picked) != null && <> · average {heatFmt(avg(picked)!)}</>}
            </>
          ) : (
            <>
              <b>
                {up} of {known.length}
              </b>{" "}
              {sector.name} stocks are up {period}.{pendingSet.size > 0 && ` ${pendingSet.size} still loading.`}
              {all.length - known.length - pendingSet.size > 0 && ` ${all.length - known.length - pendingSet.size} without prices ${period} (shown —).`}
            </>
          )}
        </p>
        <div role="group" aria-label="Period" className="heat-ranges">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.id}
            </button>
          ))}
        </div>
      </div>

      <div className="heat-groups">
        {ordered.map((g) => {
          const hit = impact?.[g.id];
          const dim = (zoneId && g.id !== zoneId) || (impact && !hit && !zoneId);
          const a = avg(g);
          return (
            <section
              key={g.id}
              className={"heat-group" + (dim ? " dim" : "") + (g.id === zoneId ? " picked" : "") + (hoverZoneId === g.id ? " hover" : "")}
              style={{ ["--zc" as string]: g.color } as React.CSSProperties}
            >
              <button type="button" className="heat-group-head" aria-pressed={g.id === zoneId} onClick={() => onPickZone(g.id === zoneId ? null : g.id)}>
                <span className="dot" aria-hidden />
                <span className="name">
                  {g.label} <span className="count">· {g.stocks.length}</span>
                </span>
                {hit && (
                  <span className={"scn-tag " + hit.effect}>
                    {hit.effect === "headwind" ? "Headwind" : "Tailwind"} · {SEVERITY[hit.severity]}
                  </span>
                )}
                {a != null && !loading && <span className="avg">{heatFmt(a)}</span>}
              </button>
              <ul className="heat-grid" aria-label={`${g.label} stocks`}>
                {g.stocks.map((s) => {
                  const v = valueOf(s);
                  const waiting = loading || pendingSet.has(s.ticker);
                  const size = sizeOf(s.mcapCr);
                  const title =
                    v != null ? `${s.name}: ${heatFmt(v)} ${period}` : waiting ? `${s.name}: prices loading` : `${s.name}: no prices ${period}`;
                  return (
                    <li key={s.key} className={"s" + size}>
                      <button
                        type="button"
                        title={title}
                        aria-pressed={g.id === zoneId && supplierKey === s.key}
                        className={"heat-tile" + (hit ? " " + hit.effect : "")}
                        style={heatStyle(v, scale)}
                        onClick={() => onPickStock(g.id, s.key)}
                      >
                        <span className="nm">{s.name}</span>
                        <span className="v">
                          {v != null ? heatFmt(v) : waiting ? <span aria-label="Loading" className="sk" /> : <span className="na">—</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="heat-foot">
        <HeatLegend scale={scale} note={picked ? `Colours span ${picked.label} only · tap a tile for the stock` : "Bigger tile = bigger company · tap a tile for the stock"} />
      </div>
    </div>
  );
}
