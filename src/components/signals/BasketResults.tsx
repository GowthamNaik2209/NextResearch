"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HEAT_IDS } from "@/lib/signals/readings";
import { METRIC_BY_ID } from "@/lib/signals/metrics";
import { Panel } from "@/components/baskets/Panel";
import { SLOTS } from "@/components/charts/palette";
import { useSiteTheme } from "@/lib/theme";
import { fmtDay, NA, signedPct } from "@/lib/format";
import { SignalChart, type ChartLine } from "./SignalChart";
import { SplitRow } from "./StockResults";
import { ResultHeader } from "./ResultHeader";
import { REASON, Tile, fmtValue, num, tone, type BasketAnswer } from "./ui";

// A basket's results (docs/SIGNALS.md section 4): each stock in its own equal slot, in cash while the
// rules are out. The tiles, growth of ₹100 with how many stocks the rules held, the signal heatmap
// (each stock's key readings now, and whether the rules hold it), and each stock's own figures.
// Clicking a stock opens its own backtest with the same rules.

const SHORT: Record<string, string> = {
  sma200: "vs SMA 200",
  macd: "MACD vs signal",
  adx: "ADX",
  supertrend: "Supertrend",
  rsi14: "RSI 14",
  bbPctB: "%B",
  volRatio: "Volume",
  rsNifty63: "RS 3M",
  trendPct: "Trend",
};

export function BasketResults({ answer, busy, onOpenStock }: { answer: BasketAnswer; busy: boolean; onOpenStock: (ticker: string) => void }) {
  const r = answer.result;
  const slots = SLOTS[useSiteTheme()];
  const growth = useMemo((): ChartLine[] => {
    const nifty = r.curve.filter((p) => p.nifty != null).map((p) => ({ t: p.t, v: p.nifty as number }));
    return [
      { id: "rules", color: "--accent", width: 2, points: r.curve.map((p) => ({ t: p.t, v: p.rules })) },
      { id: "hold", color: "--ink-soft", width: 1, points: r.curve.map((p) => ({ t: p.t, v: p.hold })) },
      ...(nifty.length ? [{ id: "nifty", color: slots[0], width: 1 as const, dash: "dash" as const, points: nifty }] : []),
    ];
  }, [r, slots]);
  const held = useMemo(() => r.curve.map((p) => ({ t: p.t, v: p.held })), [r]);
  const now = new Map(r.stocks.map((s) => [s.ticker, s]));
  const last = r.curve[r.curve.length - 1];
  const inNow = r.stocks.filter((s) => s.in).length;

  return (
    <div className={"flex min-w-0 flex-col gap-3 " + (busy ? "opacity-60" : "")} aria-busy={busy}>
      <ResultHeader rules={last.rules} hold={last.hold} figures={{ rules: r.rules, hold: r.hold }} closed={r.stats.closed} split={r.split} />
      {(answer.skipped.length > 0 || answer.missing.length > 0) && (
        <p className="rounded-md border border-line bg-panel px-3 py-1.5 text-[11px] text-ink-soft">
          Left out: {[...answer.skipped.map((s) => `${s.ticker} (${s.why})`), ...answer.missing.map((t) => `${t} (no prices)`)].join("; ")}.
        </p>
      )}
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-panel sm:grid-cols-4">
        <Tile label="Rules · CAGR" value={signedPct(r.rules.cagr, 1)} valueClass={tone(r.rules.cagr)} sub={`held ${signedPct(r.hold.cagr, 1)} · Nifty ${signedPct(r.nifty.cagr, 1)}`} />
        <Tile label="Largest fall" value={`${num(r.rules.maxDd)}%`} sub={`held ${num(r.hold.maxDd)}%`} />
        <Tile label="Trades" value={String(r.stats.closed)} sub={`across ${r.stats.size} stocks`} />
        <Tile label="Win rate" value={r.stats.winRate != null ? `${Math.round(r.stats.winRate)}%` : NA} sub={r.stats.payoff != null ? `payoff ${r.stats.payoff.toFixed(1)}×` : undefined} />
        <Tile label="Avg stocks held" value={num((r.stats.timeIn / 100) * r.stats.size)} sub={`of ${r.stats.size} · ${Math.round(100 - r.stats.timeIn)}% in cash`} />
        <Tile label="Held now" value={`${inNow} of ${r.stats.size}`} valueClass={inNow ? "text-pos" : ""} />
        <Tile label="Sharpe · Sortino" value={`${num(r.rules.sharpe, 2)} · ${num(r.rules.sortino, 2)}`} sub={`held ${num(r.hold.sharpe, 2)} · ${num(r.hold.sortino, 2)}`} />
        <Tile label="Rule met last close" value={String(r.stocks.filter((s) => s.pending).length)} sub="trade at the next close" />
      </div>

      <Panel title={`${answer.name} · growth of ₹100 · ${fmtDay(r.from)} – ${fmtDay(r.to)}`} info="Each stock has an equal slot, in the stock while the rules hold it and in cash otherwise. Held: every stock bought on the first day in equal parts and kept. Below: the earlier and later parts of the range; rules that only did well early were often fitted to those years." bodyClassName="p-2">
        <SignalChart label="Growth of 100 rupees" lines={growth} height={220} />
        <div className="mt-1 flex flex-wrap gap-x-3 px-1 font-mono text-[11px] text-ink-soft">
          <span className="text-accent">━ Rules</span>
          <span>━ Held</span>
          <span style={{ color: slots[0] }}>┅ Nifty 50</span>
        </div>
        <div className="mt-2 border-t border-line pt-1">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Stocks the rules held each day (of {r.stats.size})</div>
          <SignalChart label="Stocks held each day" lines={[]} bars={held} height={80} />
        </div>
        <SplitRow split={r.split} />
      </Panel>

      <Panel title={`Signal heatmap · ${fmtDay(answer.lastDay, { short: true })} close`} info={
            <>
              Each stock&rsquo;s key readings on the last close; green is the side trend followers read as strength. Click a stock to open its own backtest with these rules.{" "}
              <Link href="/signals/indicators" className="font-semibold text-accent underline">
                Indicators guide
              </Link>
            </>
          } bodyClassName="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-soft">
              <th className="px-2 py-1.5 text-left font-semibold">Stock</th>
              {HEAT_IDS.map((id) => (
                <th key={id} title={METRIC_BY_ID.get(id)?.note} className="px-1 py-1.5 text-center font-semibold">
                  <Link href={`/signals/indicators#${id}`} className="decoration-dotted underline-offset-2 hover:underline">
                    {SHORT[id] ?? METRIC_BY_ID.get(id)?.label}
                  </Link>
                </th>
              ))}
              <th className="px-2 py-1.5 text-center font-semibold">Rules now</th>
            </tr>
          </thead>
          <tbody>
            {answer.heat.map((h) => {
              const st = now.get(h.ticker);
              return (
                <tr key={h.ticker} className="border-b border-grid last:border-b-0">
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => onOpenStock(h.ticker)} className="font-mono font-semibold text-accent underline decoration-dotted underline-offset-2">
                      {h.ticker}
                    </button>
                  </td>
                  {HEAT_IDS.map((id) => {
                    const x = h.readings.find((y) => y.id === id);
                    const def = METRIC_BY_ID.get(id)!;
                    const cls = x?.tone === "up" ? "bg-pos/15 text-pos" : x?.tone === "down" ? "bg-danger/15 text-danger" : "text-ink-soft";
                    return (
                      <td key={id} title={x?.state ?? x?.unavailable ?? undefined} className={"px-1 py-1 text-center font-mono text-[11px] " + cls}>
                        {x?.unavailable ? "n/a" : id === "sma200" || id === "supertrend" ? (x?.state?.replace("Price ", "") ?? NA) : id === "macd" ? (x?.state?.replace(" signal", "").toLowerCase() ?? NA) : fmtValue(def, x?.value ?? null)}
                      </td>
                    );
                  })}
                  <td className={"px-2 py-1 text-center font-mono text-[11px] font-semibold " + (st?.in ? "bg-pos/15 text-pos" : "text-ink-soft")}>
                    {st?.pending ? (st.pending === "entry" ? "Entry met" : `Exit met`) : st?.in ? "In" : "Out"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="By stock" bodyClassName="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-soft">
              <th className="px-2 py-1.5 font-semibold">Stock</th>
              <th className="px-2 py-1.5 text-right font-semibold">Trades</th>
              <th className="px-2 py-1.5 text-right font-semibold">Win rate</th>
              <th className="px-2 py-1.5 text-right font-semibold">Rules</th>
              <th className="px-2 py-1.5 text-right font-semibold">Held</th>
              <th className="px-2 py-1.5 text-right font-semibold">Time in</th>
              <th className="px-2 py-1.5 font-semibold">Now</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {r.stocks
              .slice()
              .sort((a, b) => (b.rulesRet ?? 0) - (a.rulesRet ?? 0))
              .map((s) => (
                <tr key={s.ticker} className="border-b border-grid last:border-b-0">
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => onOpenStock(s.ticker)} className="font-semibold text-accent underline decoration-dotted underline-offset-2">
                      {s.ticker}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-right">{s.closed}</td>
                  <td className="px-2 py-1 text-right">{s.winRate != null ? `${Math.round(s.winRate)}%` : NA}</td>
                  <td className={"px-2 py-1 text-right " + tone(s.rulesRet)}>{signedPct(s.rulesRet, 0)}</td>
                  <td className={"px-2 py-1 text-right " + tone(s.holdRet)}>{signedPct(s.holdRet, 0)}</td>
                  <td className="px-2 py-1 text-right">{Math.round(s.timeIn)}%</td>
                  <td className="px-2 py-1 font-sans">{s.pending ? `${s.pending === "entry" ? "Entry" : REASON[s.pendingReason ?? "rule"]} met last close` : s.in ? "In" : "Out"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
