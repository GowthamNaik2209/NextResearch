"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, METRICS, METRIC_BY_ID } from "@/lib/signals/metrics";
import type { Strategy } from "@/lib/signals/strategy";
import type { Trade } from "@/lib/signals/engine";
import { describeTrigger } from "@/lib/signals/describe";
import { SLOTS } from "@/components/charts/palette";
import { Panel } from "@/components/baskets/Panel";
import { fmtDay, NA, signedPct } from "@/lib/format";
import { useSiteTheme } from "@/lib/theme";
import { SignalChart, type ChartLine, type ChartMark } from "./SignalChart";
import { REASON, Tile, fmtValue, num, tone, type StockAnswer } from "./ui";
import { ResultHeader } from "./ResultHeader";

// One stock's results: the tiles, the price chart with the rules' lines and trades (a click on a
// trade explains it), the growth of ₹100 with the early/late split, and the trade list.

/** A trade's entry or exit; `also`: an exit and the re-entry right after it, shown together (their arrows overlap at 5Y). */
type Pick = { trade: Trade; side: "entry" | "exit"; also?: { trade: Trade; side: "entry" | "exit" } };

function WhyCard({ pick, strategy, onClose }: { pick: Pick; strategy: Strategy; onClose: () => void }) {
  const sig = pick.side === "entry" ? pick.trade.entrySignal : pick.trade.exitSignal;
  const traded = pick.side === "entry" ? { t: pick.trade.entryT, px: pick.trade.entryPx } : { t: pick.trade.exitT!, px: pick.trade.exitPx };
  return (
    <div className="rounded-md border border-accent/60 bg-panel-2 px-3 py-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink">
            {pick.side === "entry" ? "Why it got in" : "Why it got out"} · traded {fmtDay(traded.t, { short: true })} at ₹{traded.px.toFixed(1)}
          </div>
          <div className="mt-0.5 text-ink-soft">
            {sig ? `Met on the ${fmtDay(sig.t, { short: true })} close: ` : ""}
            {describeTrigger(strategy, pick.side, pick.side === "exit" ? pick.trade.reason : null)}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex min-h-8 min-w-8 items-center justify-center rounded border border-btn text-ink-soft hover:text-ink">
          ×
        </button>
      </div>
      {sig && (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono">
          {Object.entries(sig.values).map(([id, v]) => {
            const def = METRIC_BY_ID.get(id);
            return def ? (
              <span key={id}>
                <span className="text-ink-soft">{def.label}</span> {fmtValue(def, v)}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function StockResults({ answer, strategy, busy }: { answer: StockAnswer; strategy: Strategy; busy: boolean }) {
  const theme = useSiteTheme();
  const slots = SLOTS[theme];
  const r = answer.result;
  const [pick, setPick] = useState<Pick | null>(null);
  const [pickedFor, setPickedFor] = useState(r);
  // A new result clears the explanation of a trade from the last one.
  if (pickedFor !== r) {
    setPickedFor(r);
    setPick(null);
  }

  const priceLines = useMemo(
    (): ChartLine[] => [
      { id: "close", color: "--ink", width: 2, points: r.curve.map((p) => ({ t: p.t, v: p.price })) },
      ...r.overlays.map((o, i) => ({ id: o.id, color: slots[i % slots.length], width: 1 as const, dash: (i % 2 ? "dash" : "solid") as "dash" | "solid", points: o.points })),
    ],
    [r, slots],
  );
  const marks = useMemo((): ChartMark[] => r.trades.flatMap((t) => [{ t: t.entryT, kind: "entry" as const }, ...(t.exitT ? [{ t: t.exitT, kind: "exit" as const }] : [])]), [r]);
  const growth = useMemo((): ChartLine[] => {
    const nifty = r.curve.filter((p) => p.nifty != null).map((p) => ({ t: p.t, v: p.nifty as number }));
    return [
      { id: "rules", color: "--accent", width: 2, points: r.curve.map((p) => ({ t: p.t, v: p.rules })) },
      { id: "hold", color: "--ink-soft", width: 1, points: r.curve.map((p) => ({ t: p.t, v: p.hold })) },
      ...(nifty.length ? [{ id: "nifty", color: slots[0], width: 1 as const, dash: "dash" as const, points: nifty }] : []),
    ];
  }, [r, slots]);
  const oscLines = useMemo((): ChartLine[] => (r.osc ? [{ id: r.osc.id, color: "--accent", width: 1, points: r.osc.points }] : []), [r]);
  const oscDef = r.osc ? METRIC_BY_ID.get(r.osc.id) : undefined;
  const oscLevels = useMemo(
    () => (oscDef?.id === "rsi14" || oscDef?.id === "mfi14" ? [30, 70] : oscDef?.kind === "stoch" || oscDef?.id === "stochRsi" ? [20, 80] : oscDef?.kind === "willr" ? [-80, -20] : oscDef?.kind === "cci" ? [-100, 100] : oscDef?.kind === "pct" || oscDef?.kind === "macdh" ? [0] : []),
    [oscDef],
  );
  // A click on the chart: the trade that entered or left on that very day (an arrow), else the nearest
  // within 3 days; a click anywhere else does nothing.
  const onPick = (t: string) => {
    const at = Date.parse(t);
    let best: { p: Pick; gap: number } | null = null;
    for (const tr of r.trades) {
      for (const side of ["entry", "exit"] as const) {
        const d = side === "entry" ? tr.entryT : tr.exitT;
        if (!d) continue;
        const gap = Math.abs(Date.parse(d) - at) / 86_400_000;
        if (gap <= 3 && (!best || gap < best.gap)) best = { p: { trade: tr, side }, gap };
      }
    }
    if (!best) return;
    // An exit with a re-entry within 3 days (or the other way round) is one click: show both, exit first.
    const { trade, side } = best.p;
    const i = r.trades.indexOf(trade);
    const near = (a: string | null, b: string | null) => !!a && !!b && Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000 <= 3;
    const next = r.trades[i + 1], prev = r.trades[i - 1];
    if (side === "exit" && next && near(trade.exitT, next.entryT)) setPick({ trade, side, also: { trade: next, side: "entry" } });
    else if (side === "entry" && prev && near(prev.exitT, trade.entryT)) setPick({ trade: prev, side: "exit", also: { trade, side } });
    else setPick({ trade, side });
  };
  // 13: the card opens above the chart, which a click in the trade list leaves off-screen.
  const whyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pick) whyRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pick]);
  const last = r.curve[r.curve.length - 1];
  const rangeLabel = `${fmtDay(r.from)} – ${fmtDay(r.to)}`;

  return (
    <div className={"flex min-w-0 flex-col gap-3 " + (busy ? "opacity-60" : "")} aria-busy={busy}>
      <ResultHeader rules={last.rules} hold={last.hold} figures={{ rules: r.rules, hold: r.hold }} closed={r.stats.closed} split={r.split} />
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel sm:grid-cols-4">
        <Tile label="Rules · CAGR" value={signedPct(r.rules.cagr, 1)} valueClass={tone(r.rules.cagr)} sub={`held ${signedPct(r.hold.cagr, 1)} · Nifty ${signedPct(r.nifty.cagr, 1)}`} />
        <Tile label="Largest fall" value={`${num(r.rules.maxDd)}%`} sub={`held ${num(r.hold.maxDd)}%`} />
        <Tile label="Trades" value={String(r.stats.closed)} sub={r.stats.avgDays != null ? `avg ${Math.round(r.stats.avgDays)} days held` : undefined} />
        <Tile label="Win rate" value={r.stats.winRate != null ? `${Math.round(r.stats.winRate)}%` : NA} sub={r.stats.payoff != null ? `payoff ${r.stats.payoff.toFixed(1)}×` : undefined} />
        <Tile label="Avg win / loss" value={`${signedPct(r.stats.avgWin, 1)} / ${signedPct(r.stats.avgLoss, 1)}`} valueClass="whitespace-nowrap !text-sm sm:!text-base" />
        <Tile label="Time invested" value={`${Math.round(r.stats.timeIn)}%`} sub="rest in cash" />
        <Tile label="Sharpe · Sortino" value={`${num(r.rules.sharpe, 2)} · ${num(r.rules.sortino, 2)}`} sub={`held ${num(r.hold.sharpe, 2)} · ${num(r.hold.sortino, 2)}`} />
        <Tile
          label="Best / worst trade"
          value={r.trades.length ? `${signedPct(Math.max(...r.trades.map((t) => t.ret)), 0)} / ${signedPct(Math.min(...r.trades.map((t) => t.ret)), 0)}` : NA}
          sub={r.trades.some((t) => !t.exitT) ? "open trade included" : "closed trades"}
          valueClass="whitespace-nowrap !text-sm sm:!text-base"
        />
      </div>

      <Panel title={`${answer.ticker} · price, the rules' indicators and trades · ${rangeLabel}`} info="Click a green or red arrow to see why the rules traded there. A rule met on a close trades at the next close." bodyClassName="p-2">
        <SignalChart label={`${answer.ticker} price with trades`} lines={priceLines} marks={marks} height={300} onPick={onPick} />
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 font-mono text-[11px] text-ink-soft">
          <span className="text-ink">━ Price</span>
          {r.overlays.map((o, i) => (
            <span key={o.id} style={{ color: slots[i % slots.length] }}>
              {i % 2 ? "┅" : "━"} {METRIC_BY_ID.get(o.id)?.label}
            </span>
          ))}
          <span className="text-pos">▲ entry</span>
          <span className="text-danger">▼ exit</span>
          <span>click an arrow: why it traded</span>
        </div>
        {pick && (
          <div ref={whyRef} className="mt-2 scroll-mt-20">
            <WhyCard pick={pick} strategy={strategy} onClose={() => setPick(null)} />
            {pick.also && (
              <div className="mt-1.5">
                <WhyCard pick={pick.also} strategy={strategy} onClose={() => setPick(null)} />
              </div>
            )}
          </div>
        )}
        {r.osc && oscDef && (
          <div className="mt-2 border-t border-line pt-1">
            <div className="flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {oscDef.label}
            </div>
            <SignalChart label={`${oscDef.label} over the range`} lines={oscLines} height={110} levels={oscLevels} onPick={onPick} />
          </div>
        )}
      </Panel>

      <Panel title="Growth of ₹100 · rules vs held vs Nifty 50" info="Rules: in the stock while the rules hold it, in cash after an exit, costs taken off each trade. Held: bought on the first day and kept. Below: the earlier and later parts of the range; rules that only did well early were often fitted to those years." bodyClassName="p-2">
        <SignalChart label="Growth of 100 rupees" lines={growth} height={200} />
        <div className="mt-1 flex flex-wrap gap-x-3 px-1 font-mono text-[11px] text-ink-soft">
          <span className="text-accent">━ Rules</span>
          <span>━ Held</span>
          <span style={{ color: slots[0] }}>┅ Nifty 50</span>
        </div>
        <SplitRow split={r.split} />
      </Panel>

      <Panel title={`Trades · ${r.stats.closed} closed${r.trades.length > r.stats.closed ? " + 1 open" : ""}`} info="Click a trade to see why it got in and out." bodyClassName="overflow-x-auto">
        {r.trades.length ? (
          <TradeTable trades={r.trades} onPick={setPick} />
        ) : (
          <p className="px-3 py-3 text-xs text-ink-soft">The entry rules weren&rsquo;t met in this range.</p>
        )}
      </Panel>
    </div>
  );
}

export function SplitRow({ split }: { split: StockAnswer["result"]["split"] }) {
  return (
    <div className="mt-2 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2">
      {(
        [
          ["first", `Before ${fmtDay(split.at, { short: true })}`],
          ["last", `From ${fmtDay(split.at, { short: true })} on`],
        ] as const
      ).map(([k, label]) => {
        const p = split[k];
        return (
          <div key={k} className="bg-panel px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {label}
            </div>
            <div className="font-mono text-xs">
              {p.cagr != null ? "CAGR" : `Return over ${Math.max(1, Math.round(p.years * 12))} months`} <b className={tone(p.cagr ?? p.ret)}>{signedPct(p.cagr ?? p.ret, 1)}</b> · {p.closed} trade{p.closed === 1 ? "" : "s"}
              {p.winRate != null ? ` · win ${Math.round(p.winRate)}%` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TradeTable({ trades, onPick }: { trades: Trade[]; onPick: (p: Pick) => void }) {
  return (
    <table className="w-full min-w-[36rem] text-xs">
      <thead>
        <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-soft">
          <th className="px-2 py-1.5 font-semibold">#</th>
          <th className="px-2 py-1.5 font-semibold">Entry</th>
          <th className="px-2 py-1.5 text-right font-semibold">Price</th>
          <th className="px-2 py-1.5 font-semibold">Exit</th>
          <th className="px-2 py-1.5 text-right font-semibold">Price</th>
          <th className="px-2 py-1.5 font-semibold">Why out</th>
          <th className="px-2 py-1.5 text-right font-semibold">Days</th>
          <th className="px-2 py-1.5 text-right font-semibold">Return</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {trades
          .slice()
          .reverse()
          .map((t, i) => (
            <tr key={t.entryT} className="cursor-pointer border-b border-grid last:border-b-0 hover:bg-accent/5" onClick={() => onPick({ trade: t, side: t.exitT ? "exit" : "entry" })}>
              <td className="px-2 py-1 text-ink-soft">{trades.length - i}</td>
              <td className="px-2 py-1">
                <button type="button" className="underline decoration-dotted underline-offset-2" onClick={(e) => (e.stopPropagation(), onPick({ trade: t, side: "entry" }))}>
                  {fmtDay(t.entryT, { short: true })}
                </button>
              </td>
              <td className="px-2 py-1 text-right">₹{t.entryPx.toFixed(1)}</td>
              <td className="px-2 py-1">
                {t.exitT ? (
                  <button type="button" className="underline decoration-dotted underline-offset-2" onClick={(e) => (e.stopPropagation(), onPick({ trade: t, side: "exit" }))}>
                    {fmtDay(t.exitT, { short: true })}
                  </button>
                ) : (
                  "open"
                )}
              </td>
              <td className="px-2 py-1 text-right">₹{t.exitPx.toFixed(1)}</td>
              <td className="px-2 py-1 font-sans">{REASON[t.reason]}</td>
              <td className="px-2 py-1 text-right">{t.days}</td>
              <td className={"px-2 py-1 text-right " + tone(t.ret)}>{signedPct(t.ret, 1)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

/** Every indicator on the last close, grouped, each with its note and a + that adds it to the entry rules. */
export function Readings({ answer, onAdd, full }: { answer: StockAnswer; onAdd: (id: string) => void; full: boolean }) {
  const byId = new Map(answer.readings.map((x) => [x.id, x]));
  return (
    <table className="w-full table-fixed text-xs">
      <colgroup>
        <col className="w-[40%]" />
        <col className="w-[23%]" />
        <col />
        <col className="w-10" />
      </colgroup>
      <tbody>
        {GROUPS.map((g) => (
          <ReadingGroup key={g} group={g} byId={byId} onAdd={onAdd} full={full} />
        ))}
      </tbody>
    </table>
  );
}

function ReadingGroup({ group, byId, onAdd, full }: { group: string; byId: Map<string, StockAnswer["readings"][number]>; onAdd: (id: string) => void; full: boolean }) {
  return (
    <>
      <tr className="bg-panel-2">
        <td colSpan={4} className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          {group}
        </td>
      </tr>
      {METRICS.filter((m) => m.group === group).map((def) => {
        const x = byId.get(def.id);
        const na = !!x?.unavailable;
        return (
          <tr key={def.id} className="border-b border-grid last:border-b-0">
            <td className="px-2 py-1" title={def.note}>
              <Link href={`/signals/indicators#${def.id}`} className="decoration-dotted underline-offset-2 hover:underline">
                {def.label}
              </Link>
            </td>
            <td className="px-2 py-1 text-right font-mono">{na ? "n/a" : fmtValue(def, x?.value ?? null)}</td>
            <td className="px-2 py-1">
              {x?.state && (
                <span className={"inline-block rounded border px-1 font-mono text-[10.5px] leading-snug " + (x.tone === "up" ? "border-pos/50 text-pos" : x.tone === "down" ? "border-danger/50 text-danger" : "border-line text-ink-soft")}>{x.state}</span>
              )}
            </td>
            <td className="px-1 py-0.5 text-right">
              <button
                type="button"
                disabled={na || full}
                onClick={() => onAdd(def.id)}
                aria-label={`Add ${def.label} to the entry rules`}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded border border-btn font-mono text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-40 sm:min-h-6 sm:min-w-6"
              >
                +
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
