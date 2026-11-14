// Shared pieces of the signal backtest's panels: control styles, number formats and the tiles.
import type { ReactNode } from "react";
import type { ExitReason, SignalResult } from "@/lib/signals/engine";
import type { BasketResult } from "@/lib/signals/basket";
import type { Reading } from "@/lib/signals/readings";
import type { DataGaps, MetricDef } from "@/lib/signals/metrics";
import { ordinal } from "@/lib/financials/trend";
import { NA, signedPct } from "@/lib/format";

export type StockAnswer = { kind: "stock"; scope: "stock"; target: string; name: string; ticker: string; lastDay: string; gaps: DataGaps; result: SignalResult; readings: Reading[] };
export type BasketAnswer = {
  kind: "basket";
  scope: "basket";
  target: string;
  name: string;
  lastDay: string;
  weighting: "equal" | "mcap" | "custom";
  result: BasketResult;
  heat: { ticker: string; readings: Reading[] }[];
  skipped: { ticker: string; why: string }[];
  missing: string[];
};
export type Answer = StockAnswer | BasketAnswer;

export const segBtn = (on: boolean) =>
  "min-h-9 border-r border-line px-2.5 font-mono text-[11px] font-semibold last:border-r-0 sm:min-h-7 pointer-coarse:min-h-9 pointer-coarse:min-w-9 " + (on ? "bg-ink text-bg" : "text-ink-soft hover:text-ink");
export const ctlLabel = "text-[10px] font-semibold uppercase tracking-wider text-ink-soft";
export const FIELD = "min-h-9 rounded border border-line bg-panel-2 px-2 font-mono text-xs font-semibold text-ink sm:min-h-8";
export const BTN = "inline-flex min-h-10 items-center justify-center rounded border border-btn px-3 text-xs font-semibold sm:min-h-8";
export const tone = (v: number | null | undefined) => (v == null ? "" : v > 0 ? "text-pos" : v < 0 ? "text-danger" : "");
// A true minus sign, as signedPct writes one.
export const num = (v: number | null | undefined, dp = 1) => (v == null || !Number.isFinite(v) ? NA : v.toFixed(dp).replace("-", "−"));

export const REASON: Record<ExitReason, string> = {
  rule: "Exit rule",
  trail: "Trailing stop",
  loss: "Stop loss",
  atr: "ATR stop",
  profit: "Take profit",
  days: "Time stop",
  open: "Still open",
};

export function fmtValue(def: MetricDef, v: number | null): string {
  if (v == null) return NA;
  if (def.id === "trendPct") return ordinal(Math.round(v));
  switch (def.kind) {
    case "price": {
      const dp = v < 100 ? 2 : 1;
      return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
    }
    case "pct":
      if (def.id === "rsNifty63" || def.id === "rsInd63") return `${v > 0 ? "+" : ""}${num(v)} pts`;
      if (def.id === "rsNifty252") return `${v > 0 ? "+" : ""}${num(v)} pts`;
      return def.id === "hv60" || def.id === "atrPct" || def.id === "bbWidth" || def.id === "bbWidthLow126" || def.id === "fromHigh52" || def.id === "fromLow52" ? `${num(v)}%` : signedPct(v, 1);
    case "ratio":
      return `${num(v, 2)}×`;
    case "obv":
    case "force":
      return Math.abs(v) >= 1e7 ? `${num(v / 1e7, 2)} Cr` : Math.abs(v) >= 1e5 ? `${num(v / 1e5)} L` : num(v, 0);
    case "pctb":
    case "cmf":
    case "beta":
    case "macd":
    case "macdh":
    case "power":
      return num(v, 2);
    default:
      return num(v);
  }
}

export function Tile({ label, value, sub, valueClass = "" }: { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string }) {
  return (
    <div className="-mb-px -mr-px min-w-0 border-b border-r border-line px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{label}</div>
      <div className={"font-mono text-base font-semibold sm:text-lg " + valueClass}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-ink-soft">{sub}</div>}
    </div>
  );
}

/** A small honest-figures badge: "Too few trades", "Weaker in recent years", "Beat holding". */
export function Badge({ children, kind }: { children: ReactNode; kind: "good" | "warn" | "plain" }) {
  const c = kind === "good" ? "border-pos/50 text-pos" : kind === "warn" ? "border-amber/60 text-amber-ink" : "border-line text-ink-soft";
  return <span className={"inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold " + c}>{children}</span>;
}
