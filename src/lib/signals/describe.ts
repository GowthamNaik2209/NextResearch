// A strategy in plain English (docs/SIGNALS.md section 4): the sentence above the rule builder, the
// "why" in an alert email, and the verdict line over the results. Says what the rules do with
// prices, never "buy" or "sell". Pure.
import { METRIC_BY_ID } from "./metrics";
import type { ExitReason, Figures } from "./engine";
import type { Condition, RuleSet, Stops, Strategy } from "./strategy";

const label = (id: string) => {
  const m = METRIC_BY_ID.get(id);
  if (!m) return id;
  if (id === "close") return "the price";
  // "SMA 200" reads as "its SMA 200"; levels keep their own words.
  return m.label;
};
const num = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)).replace("-", "−");

export function describeCondition(c: Condition): string {
  const a = label(c.m);
  const b = c.r ? label(c.r) : c.v != null ? num(c.v) : "";
  switch (c.op) {
    case "above":
      return `${a} is above ${b}`;
    case "below":
      return `${a} is below ${b}`;
    case "crossAbove":
      return `${a} crosses above ${b}`;
    case "crossBelow":
      return `${a} crosses below ${b}`;
    case "rising":
      return `${a} is higher than ${c.n ?? 5} days ago`;
    case "falling":
      return `${a} is lower than ${c.n ?? 5} days ago`;
    case "within":
      return `${a} is within ${num(c.v ?? 2)}% of ${b}`;
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function joinConds(r: RuleSet): string {
  const parts = r.conds.map(describeCondition);
  if (parts.length <= 1) return parts[0] ?? "";
  const glue = r.all ? "and" : "or";
  return `${parts.slice(0, -1).join(", ")} ${glue} ${parts[parts.length - 1]}`;
}

export function describeStops(s: Stops): string[] {
  const out: string[] = [];
  if (s.trail) out.push(`it falls ${num(s.trail)}% from its highest close since entry`);
  if (s.loss) out.push(`it falls ${num(s.loss)}% below the entry price`);
  if (s.atr) out.push(`it falls ${num(s.atr)} × ATR below its highest close`);
  if (s.profit) out.push(`it gains ${num(s.profit)}%`);
  if (s.days) out.push(`${s.days} trading days have passed`);
  return out;
}

const CHECK_WORD: Record<Strategy["check"], string> = { d: "on any close", w: "on a week's last close", m: "on a month's last close" };

/** "Get in when … Get out when …, or …" */
export function describeStrategy(s: Strategy): { entry: string; exit: string } {
  const entry = `Get in when ${joinConds(s.entry)}${s.check === "d" ? "" : `, checked ${CHECK_WORD[s.check]}`}.`;
  const outs = [s.exit.conds.length ? joinConds(s.exit) : "", ...describeStops(s.stops)].filter(Boolean);
  const exit = outs.length ? `Get out when ${outs.length === 1 ? outs[0] : `${outs.slice(0, -1).join("; ")}; or ${outs[outs.length - 1]}`}.` : "Stay in once in: no exit rule or control is set.";
  return { entry: capital(entry), exit: capital(exit) };
}

/** Why a rule was met, for an alert: the entry sentence, the exit sentence, or the control that fired. */
export function describeTrigger(s: Strategy, kind: "entry" | "exit", reason: ExitReason | null): string {
  if (kind === "entry") return describeStrategy(s).entry;
  switch (reason) {
    case "trail":
      return `Trailing stop: ${num(s.stops.trail ?? 0)}% below its highest close since entry.`;
    case "loss":
      return `Stop loss: ${num(s.stops.loss ?? 0)}% below the entry price.`;
    case "atr":
      return `ATR stop: ${num(s.stops.atr ?? 0)} × ATR below its highest close.`;
    case "profit":
      return `Take profit: ${num(s.stops.profit ?? 0)}% above the entry price.`;
    case "days":
      return `Time stop: ${s.stops.days ?? 0} trading days held.`;
    default:
      return s.exit.conds.length ? capital(`${joinConds(s.exit)}.`) : "Exit rule met.";
  }
}

/** An amount given in lakh (2.4 → "₹2.40 lakh"; 140 → "₹1.40 crore"). */
const lakh = (v: number) => (v >= 100 ? `₹${(v / 100).toFixed(2)} crore` : `₹${v.toFixed(v >= 10 ? 1 : 2)} lakh`);

/**
 * The one-line verdict over the results: what ₹1 lakh became under the rules and held, and whether
 * the rules beat holding. `rules`/`hold`: the last value of each growth-of-100 line.
 */
export function verdict(rules: number, hold: number, f: { rules: Figures; hold: Figures }): { text: string; beat: boolean } {
  const beat = rules >= hold;
  const fall = f.rules.maxDd != null && f.hold.maxDd != null && f.rules.maxDd > f.hold.maxDd + 2 ? ` with a smaller largest fall (${num(Math.round(f.rules.maxDd))}% against ${num(Math.round(f.hold.maxDd))}%)` : "";
  const text = `The rules turned ₹1 lakh into ${lakh(rules / 100)}${fall}; ${beat ? "holding" : "simply holding"} made ${lakh(hold / 100)}.`;
  return { text, beat };
}
