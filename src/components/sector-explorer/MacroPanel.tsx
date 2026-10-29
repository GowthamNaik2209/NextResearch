"use client";

import { useState } from "react";
import type { SectorWithSlug } from "@/lib/sector-content/core";
import { scenarioIndexSplit, scenarioStockReadings, type Scenario, type ScenarioSection } from "@/lib/sector-content/scenarios";
import { fmtDay, pts, rankByHistory, type Combined, type Episodes } from "./macro";

const SEVERITY = ["", "Low", "Medium", "High"];

// Net reading as a tag: the sign gives the side, the size how strongly (summed severities).
function NetTag({ net }: { net: number }) {
  if (!net) return <span className="scn-tag mixed">Mixed</span>;
  const effect = net > 0 ? "tailwind" : "headwind";
  const size = Math.abs(net);
  return (
    <span className={"scn-tag " + effect}>
      {effect === "tailwind" ? "Tailwind" : "Headwind"} · {size >= 3 ? "High" : SEVERITY[size]}
    </span>
  );
}

/**
 * The panel for the heatmap explorer's picked scenarios (the Nifty 50): what each one is, how much of
 * the index leans each way, the industries and companies it touches, and - from the scenarios' past
 * episodes - the stocks ranked by how they actually did against the index.
 */
export function MacroPanel({
  sector,
  picked,
  sections,
  combined,
  episodes,
  onRemove,
  onPickZone,
  onPickStock,
}: {
  sector: SectorWithSlug;
  picked: Scenario[];
  sections: ScenarioSection[];
  combined: Combined;
  episodes: Episodes;
  onRemove: (id: string) => void;
  onPickZone: (id: string) => void;
  onPickStock: (zoneId: string, key: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const one = picked.length === 1 ? picked[0] : null;
  const section = (id?: string) => sections.find((s) => s.id === id)?.title;

  // The index split for the mix: each company's net reading, weighted by market cap.
  const split = (() => {
    if (one) return scenarioIndexSplit(sector, one);
    // Several: a synthetic scenario whose stock readings are the nets.
    const stocks = [...combined.stocks].filter(([, n]) => n).map(([key, n]) => ({ key, severity: Math.min(3, Math.abs(n)) as 1 | 2 | 3, effect: n > 0 ? ("tailwind" as const) : ("headwind" as const), why: "" }));
    return scenarioIndexSplit(sector, { id: "mix", title: "", blurb: "", story: "", effect: "headwind", impacts: [], stocks });
  })();

  const zones = sector.zones.filter((z) => combined.zones.has(z.id)).sort((a, b) => Math.abs(combined.zones.get(b.id)!) - Math.abs(combined.zones.get(a.id)!));
  // A named company's own reason, from the first picked scenario that names it.
  const why = new Map<string, string>();
  for (const sc of picked) for (const [key, r] of scenarioStockReadings(sector, sc)) if (r.own && !why.has(key)) why.set(key, r.why);

  const epList = episodes.status === "ok" ? episodes.list : [];
  const ranked = rankByHistory(sector, epList);
  const shown = showAll ? ranked : [...ranked.slice(0, 8), ...(ranked.length > 13 ? ranked.slice(-5) : ranked.slice(8))];
  const zoneLabel = (id: string) => sector.zones.find((z) => z.id === id)?.label ?? "";

  return (
    <>
      <h2>{one ? one.title : `${picked.length} scenarios together`}</h2>
      {one ? (
        <p className="zdesc">{one.story}</p>
      ) : (
        <div className="macro-picked">
          {picked.map((sc) => (
            <div key={sc.id} className="macro-chip">
              <span>
                <small>{section(sc.section)}</small>
                {sc.title}
              </span>
              <button type="button" aria-label={`Remove ${sc.title}`} onClick={() => onRemove(sc.id)}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {split && (
        <div>
          <div className="chart-label">The index under {one ? "this scenario" : "these scenarios"}</div>
          <div className="macro-split" role="img" aria-label={`Headwind ${split.headwind.toFixed(0)}%, tailwind ${split.tailwind.toFixed(0)}%, untouched ${split.untouched.toFixed(0)}% of the index by market cap`}>
            <span className="hw" style={{ width: `${split.headwind}%` }} />
            <span className="tw" style={{ width: `${split.tailwind}%` }} />
            <span className="nt" style={{ width: `${split.untouched}%` }} />
          </div>
          <p className="role" style={{ marginTop: 6 }}>
            About <b>{split.headwind.toFixed(0)}%</b> of the index by market cap faces a headwind
            {split.headwindLeads.length > 0 && ` (led by ${split.headwindLeads.join(", ")})`}, <b>{split.tailwind.toFixed(0)}%</b> a tailwind
            {split.tailwindLeads.length > 0 && ` (${split.tailwindLeads.join(", ")})`}; {split.untouched.toFixed(0)}% is not directly touched.
          </p>
        </div>
      )}

      <div>
        <div className="chart-label">Industries touched</div>
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
          {zones.map((z) => {
            const hits = picked.flatMap((sc) => sc.impacts.filter((i) => i.zone === z.id).map((i) => i.why));
            return (
              <button key={z.id} className="scn-row" onClick={() => onPickZone(z.id)}>
                <span>
                  {z.label}
                  <small>{hits.join(" · ")}</small>
                </span>
                <NetTag net={combined.zones.get(z.id)!} />
              </button>
            );
          })}
        </div>
      </div>

      {why.size > 0 && (
        <div>
          <div className="chart-label">Companies that move differently</div>
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
            {[...why].map(([key, reason]) => {
              const z = sector.zones.find((zz) => zz.suppliers.some((l) => (typeof l === "string" ? l : l.key) === key));
              return (
                <button key={key} className="scn-row" onClick={() => z && onPickStock(z.id, key)}>
                  <span>
                    {sector.suppliers[key]?.name}
                    <small>{reason}</small>
                  </span>
                  <NetTag net={combined.stocks.get(key) ?? 0} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="chart-label">Ranked on past episodes</div>
        {episodes.status === "idle" ? (
          <p className="role" style={{ marginTop: 4 }}>
            {one ? "This scenario has" : "These scenarios have"} no past episode to replay.
          </p>
        ) : episodes.status === "loading" ? (
          <p className="role" style={{ marginTop: 4 }}>
            Replaying the past episodes…
          </p>
        ) : episodes.status === "error" ? (
          <p className="role" style={{ marginTop: 4 }}>
            The past episodes couldn’t load right now. Try again in a moment.
          </p>
        ) : (
          <>
            <ul className="macro-episodes">
              {epList.map((e) => (
                <li key={`${e.from}:${e.to}`}>
                  <b>{e.label}</b> · {fmtDay(e.from)} – {fmtDay(e.to)}
                  {e.data.index != null ? ` · Nifty 50 ${e.data.index > 0 ? "+" : "−"}${Math.abs(e.data.index).toFixed(1)}%` : " · before the index’s history (raw moves)"}
                  <small>{e.note}</small>
                </li>
              ))}
            </ul>
            <p className="fine" style={{ marginTop: 6 }}>
              Each stock’s actual move against the Nifty 50 over {epList.length === 1 ? "that window" : "those windows"}, averaged over the ones it was trading through. Tap one for its details.
            </p>
            <ol className="macro-rank">
              {shown.map((r, i) => {
                const pos = ranked.indexOf(r);
                return (
                  <li key={r.key} className={!showAll && i === 8 && ranked.length > 13 ? "gap" : undefined}>
                    <button type="button" className="scn-row" onClick={() => onPickStock(r.zoneId, r.key)}>
                      <span className="rk">{pos + 1}</span>
                      <span className="nm">
                        {r.name}
                        <small>
                          {zoneLabel(r.zoneId)}
                          {r.n < epList.length && ` · ${r.n} of ${epList.length} episodes`}
                        </small>
                      </span>
                      <span className={"vs " + (r.vsIndex >= 0 ? "up" : "down")}>{pts(r.vsIndex)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {ranked.length > 13 && (
              <button type="button" className="scn-clear" onClick={() => setShowAll((s) => !s)}>
                {showAll ? "Show top and bottom only" : `Show all ${ranked.length}`}
              </button>
            )}
          </>
        )}
      </div>

      <p className="fine">
        Readings are an illustrative reading of the economy, not a forecast: each industry and named company is rated by how directly it is
        exposed, summed across the scenarios picked. The ranking is what happened in past episodes, which never repeat exactly. Information
        only, not investment advice.
      </p>
    </>
  );
}
