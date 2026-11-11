// A signal strategy: entry and exit rules, exit controls, how often rules are checked, costs and the
// backtest range (docs/SIGNALS.md section 3). Pure: the rule builder, the URL (`?s=`) and the API all
// read one through `parseStrategy`, so a strategy is checked the same way wherever it comes from.
import { METRIC_BY_ID, defaultLevel } from "./metrics";

export type Op = "above" | "below" | "crossAbove" | "crossBelow" | "rising" | "falling" | "within";

export const OPS: { id: Op; label: string }[] = [
  { id: "above", label: "is above" },
  { id: "below", label: "is below" },
  { id: "crossAbove", label: "crosses above" },
  { id: "crossBelow", label: "crosses below" },
  { id: "rising", label: "higher than N days ago" },
  { id: "falling", label: "lower than N days ago" },
  { id: "within", label: "within % of" },
];

/**
 * One condition. `m` against `r` (another metric of the same kind) or `v` (a number). "rising" and
 * "falling" compare `m` with itself `n` days back; "within" is `m` no more than `v`% from `r`.
 */
export type Condition = { m: string; op: Op; r?: string; v?: number; n?: number };
export type RuleSet = { all: boolean; conds: Condition[] };

export type Stops = {
  /** % below the highest close since entry. */
  trail?: number;
  /** % below the entry price. */
  loss?: number;
  /** Chandelier: the highest close since entry less this many ATR 22. */
  atr?: number;
  /** % above the entry price. */
  profit?: number;
  /** Trading days held. */
  days?: number;
};

export type Check = "d" | "w" | "m";
export type SignalRange = "1Y" | "2Y" | "3Y" | "5Y";
export const RANGES: SignalRange[] = ["1Y", "2Y", "3Y", "5Y"];
export const RANGE_DAYS: Record<SignalRange, number> = { "1Y": 366, "2Y": 731, "3Y": 1100, "5Y": 1830 };
export const CHECKS: { id: Check; label: string }[] = [
  { id: "d", label: "Daily" },
  { id: "w", label: "Weekly" },
  { id: "m", label: "Monthly" },
];
export const COSTS = [0, 0.1, 0.2, 0.5];

export type Strategy = { entry: RuleSet; exit: RuleSet; stops: Stops; check: Check; cost: number; range: SignalRange };

export const MAX_ENTRY = 8;
export const MAX_EXIT = 8;

export const STOP_LIMITS: Record<keyof Stops, { min: number; max: number }> = {
  trail: { min: 1, max: 60 },
  loss: { min: 1, max: 60 },
  atr: { min: 0.5, max: 10 },
  profit: { min: 1, max: 500 },
  days: { min: 1, max: 1000 },
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Whether a condition compares with another metric (else with a number). */
export const usesMetric = (op: Op) => op !== "rising" && op !== "falling";

/** The condition checked and tidied, or the reason it can't be used. */
export function parseCondition(raw: unknown): { ok: true; cond: Condition } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "a condition is missing" };
  const c = raw as Record<string, unknown>;
  const m = typeof c.m === "string" ? METRIC_BY_ID.get(c.m) : undefined;
  if (!m) return { ok: false, error: `unknown indicator "${String(c.m)}"` };
  const op = OPS.find((o) => o.id === c.op)?.id;
  if (!op) return { ok: false, error: `unknown comparison for ${m.label}` };
  if (op === "rising" || op === "falling") {
    const n = num(c.n);
    return { ok: true, cond: { m: m.id, op, n: clamp(Math.round(n ?? 5), 1, 250) } };
  }
  const r = typeof c.r === "string" && c.r ? METRIC_BY_ID.get(c.r) : undefined;
  if (typeof c.r === "string" && c.r && !r) return { ok: false, error: `unknown indicator "${c.r}"` };
  if (r && r.kind !== m.kind) return { ok: false, error: `${m.label} can't be compared with ${r.label}` };
  if (op === "within") {
    if (!r) return { ok: false, error: `"within %" needs a second indicator for ${m.label}` };
    return { ok: true, cond: { m: m.id, op, r: r.id, v: clamp(num(c.v) ?? 2, 0.1, 50) } };
  }
  if (r) return { ok: true, cond: { m: m.id, op, r: r.id } };
  const v = num(c.v);
  if (v == null) return { ok: false, error: `${m.label} needs a number or an indicator to compare with` };
  return { ok: true, cond: { m: m.id, op, v } };
}

function parseRules(raw: unknown, max: number, what: string): { ok: true; rules: RuleSet } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(r.conds) ? r.conds : [];
  if (list.length > max) return { ok: false, error: `at most ${max} ${what} conditions` };
  const conds: Condition[] = [];
  for (const c of list) {
    const p = parseCondition(c);
    if (!p.ok) return { ok: false, error: `${what}: ${p.error}` };
    conds.push(p.cond);
  }
  return { ok: true, rules: { all: r.all !== false, conds } };
}

/** A strategy from untrusted input (a request body, a URL), checked and with numbers kept in range. */
export function parseStrategy(raw: unknown): { ok: true; strategy: Strategy } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "no strategy" };
  const s = raw as Record<string, unknown>;
  const entry = parseRules(s.entry, MAX_ENTRY, "Entry");
  if (!entry.ok) return entry;
  if (!entry.rules.conds.length) return { ok: false, error: "Add at least one entry condition" };
  const exit = parseRules(s.exit, MAX_EXIT, "Exit");
  if (!exit.ok) return exit;
  const rawStops = (s.stops && typeof s.stops === "object" ? s.stops : {}) as Record<string, unknown>;
  const stops: Stops = {};
  for (const k of Object.keys(STOP_LIMITS) as (keyof Stops)[]) {
    const v = num(rawStops[k]);
    if (v != null && v > 0) stops[k] = clamp(k === "days" ? Math.round(v) : v, STOP_LIMITS[k].min, STOP_LIMITS[k].max);
  }
  const check: Check = s.check === "w" || s.check === "m" ? s.check : "d";
  const cost = clamp(num(s.cost) ?? 0.2, 0, 2);
  const range: SignalRange = RANGES.includes(s.range as SignalRange) ? (s.range as SignalRange) : "5Y";
  return { ok: true, strategy: { entry: entry.rules, exit: exit.rules, stops, check, cost, range } };
}

/** Every metric a strategy reads (entry, exit, and ATR for the Chandelier stop). */
export function strategyMetrics(s: Strategy): string[] {
  const out = new Set<string>();
  for (const c of [...s.entry.conds, ...s.exit.conds]) {
    out.add(c.m);
    if (c.r) out.add(c.r);
  }
  return [...out];
}

/** A new condition for a metric: price levels against the price, the rest against a usual level. */
export function conditionFor(metricId: string): Condition {
  const m = METRIC_BY_ID.get(metricId);
  if (!m) return { m: "rsi14", op: "above", v: 50 };
  if (m.kind === "price" && m.id !== "close") return { m: "close", op: "above", r: m.id };
  if (m.id === "close") return { m: "close", op: "above", r: "sma200" };
  if (m.id === "macd") return { m: "macd", op: "crossAbove", r: "macdSignal" };
  if (m.id === "stochK") return { m: "stochK", op: "crossAbove", r: "stochD" };
  if (m.id === "pdi") return { m: "pdi", op: "above", r: "mdi" };
  if (m.id === "aroonUp") return { m: "aroonUp", op: "above", r: "aroonDown" };
  if (m.id === "obv") return { m: "obv", op: "above", r: "obvSma20" };
  if (m.id === "adx") return { m: "adx", op: "above", v: 25 };
  if (m.id === "trendPct") return { m: "trendPct", op: "above", v: 80 };
  return { m: m.id, op: "above", v: defaultLevel(m.kind) };
}

const base = { check: "d" as Check, cost: 0.2, range: "5Y" as SignalRange };

/** Ready-made starting points ("Start from"); each is an ordinary strategy the user can then change. */
export const PRESETS: { id: string; label: string; note: string; strategy: Strategy }[] = [
  {
    id: "trend-200",
    label: "Above the 200-day average",
    note: "In while the price is above its 200-day average; out on a close back below it, or 15% off the high.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }] },
      exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "sma200" }] },
      stops: { trail: 15 },
    },
  },
  {
    id: "golden-cross",
    label: "Golden cross",
    note: "The 50-day average crossing above the 200-day; out on the cross back below.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "sma50", op: "crossAbove", r: "sma200" }] },
      exit: { all: false, conds: [{ m: "sma50", op: "crossBelow", r: "sma200" }] },
      stops: {},
    },
  },
  {
    id: "trend-top-fifth",
    label: "Trend top fifth",
    note: "In when the past-year return ranks in the top fifth of covered stocks, checked monthly; out below the middle.",
    strategy: {
      ...base,
      check: "m",
      entry: { all: true, conds: [{ m: "trendPct", op: "above", v: 80 }] },
      exit: { all: false, conds: [{ m: "trendPct", op: "below", v: 50 }] },
      stops: { trail: 20 },
    },
  },
  {
    id: "rsi-pullback",
    label: "RSI pullback in an uptrend",
    note: "RSI dipping under 40 while the price holds above its 200-day average; out when RSI reaches 70.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "close", op: "above", r: "sma200" }, { m: "rsi14", op: "crossBelow", v: 40 }] },
      exit: { all: false, conds: [{ m: "rsi14", op: "above", v: 70 }] },
      stops: { loss: 8, days: 40 },
    },
  },
  {
    id: "breakout-20",
    label: "20-day breakout",
    note: "A close above the 20-day high; out on a close below the 20-day low (Donchian).",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "dch20" }] },
      exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "dcl20" }] },
      stops: { loss: 10 },
    },
  },
  {
    id: "supertrend",
    label: "Supertrend",
    note: "In when the price closes above the Supertrend line, out when it closes below.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "supertrend" }] },
      exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "supertrend" }] },
      stops: {},
    },
  },
  {
    id: "macd-adx",
    label: "MACD cross with ADX",
    note: "MACD crossing above its signal while ADX shows a trend; out on the cross back.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "macd", op: "crossAbove", r: "macdSignal" }, { m: "adx", op: "above", v: 20 }] },
      exit: { all: false, conds: [{ m: "macd", op: "crossBelow", r: "macdSignal" }] },
      stops: { trail: 12 },
    },
  },
  {
    id: "bb-squeeze",
    label: "Bollinger squeeze breakout",
    note: "A close above the upper band after the bands narrowed; out at the middle band.",
    strategy: {
      ...base,
      entry: { all: true, conds: [{ m: "close", op: "crossAbove", r: "bbUpper" }, { m: "bbWidth", op: "below", v: 12 }] },
      exit: { all: false, conds: [{ m: "close", op: "crossBelow", r: "bbMid" }] },
      stops: { loss: 8 },
    },
  },
];

export const DEFAULT_STRATEGY = PRESETS[0].strategy;

/** A strategy as a URL value: compact JSON, base64url, so a strategy can be bookmarked or shared. */
export function encodeStrategy(s: Strategy): string {
  const json = JSON.stringify(s);
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The strategy in a URL value, or null when it is missing or can't be read. */
export function decodeStrategy(v: string | null | undefined): Strategy | null {
  if (!v || v.length > 4000) return null;
  try {
    const b64 = v.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
    const p = parseStrategy(JSON.parse(json));
    return p.ok ? p.strategy : null;
  } catch {
    return null;
  }
}
