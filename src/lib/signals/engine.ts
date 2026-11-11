// The signal backtest (docs/SIGNALS.md sections 3-4): one stock, fully in it or in cash. Rules are
// read on a close and trade at the next close; exit controls are read on every close; costs are
// taken half on each side. Pure, so its timing and figures are unit-tested.
import { crossesAbove, crossesBelow, type Series } from "./indicators";
import { isTradingDay } from "@/lib/financials/trading-day";
import { METRIC_BY_ID } from "./metrics";
import type { Metrics } from "./compute";
import { RANGE_DAYS, strategyMetrics, type Condition, type RuleSet, type Strategy } from "./strategy";

const DAY = 86_400_000;
const TRADING_DAYS = 252;
/** The share of the range before the split: rules found in the first part, checked on the last. */
export const SPLIT_AT = 0.6;
/** Under this many closed trades a backtest's figures are flagged as resting on too few. */
export const FEW_TRADES = 5;

export type ExitReason = "rule" | "trail" | "loss" | "atr" | "profit" | "days" | "open";

/** The close a rule was met on (the trade happens at the next one), and the rules' indicators then. */
export type SignalDay = { t: string; values: Record<string, number | null> };

export type Trade = {
  entryT: string;
  entryPx: number;
  exitT: string | null;
  exitPx: number;
  reason: ExitReason;
  days: number;
  ret: number;
  /** Why it traded: "Why did it trade here?" on the chart and the trade list. */
  entrySignal?: SignalDay;
  exitSignal?: SignalDay;
};

export type Figures = { cagr: number | null; maxDd: number | null; sharpe: number | null; sortino: number | null };

/** One part of the range: its yearly return (when it spans a year or more, else null), plain return, length and trades. */
export type SplitPart = { cagr: number | null; ret: number | null; years: number; closed: number; winRate: number | null };

export function splitPart(values: number[], days: string[], closed: Trade[], rf: number): SplitPart {
  const years = days.length > 1 ? (Date.parse(days[days.length - 1]) - Date.parse(days[0])) / (365.25 * DAY) : 0;
  const f = figures(values, days, rf);
  const st = tradeStats(closed);
  return { cagr: years >= 1 ? f.cagr : null, ret: values.length > 1 ? (values[values.length - 1] / values[0] - 1) * 100 : null, years, closed: st.closed, winRate: st.winRate };
}

export type SignalResult = {
  from: string;
  to: string;
  /** Each day of the range: the close, and growth of 100 for the rules, the stock held and the Nifty 50. */
  curve: { t: string; price: number; rules: number; hold: number; nifty: number | null }[];
  trades: Trade[];
  rules: Figures;
  hold: Figures;
  nifty: Figures;
  stats: {
    closed: number;
    winRate: number | null;
    avgWin: number | null;
    avgLoss: number | null;
    payoff: number | null;
    avgDays: number | null;
    timeIn: number;
  };
  /** The rules' figures on the first part of the range and on the rest. */
  split: { at: string; first: SplitPart; last: SplitPart };
  /** In a trade at the last close (since when, and how it stands), or out. */
  now: { in: boolean; since: string | null; ret: number | null };
  /** A rule met on the last close: it would trade at the next one. */
  pending: "entry" | "exit" | null;
  /** What met it: "rule" for an entry or an exit rule, else the exit control. */
  pendingReason: ExitReason | null;
  /** The price-level indicators the rules read, for the chart. */
  overlays: { id: string; points: { t: string; v: number }[] }[];
  /** The first other indicator the rules read, for the strip under the chart. */
  /** The other indicators the rules read (MACD, RSI…), for the strip under the chart. */
  oscs: { id: string; points: { t: string; v: number }[] }[];
};

const isNum = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
// Daily volatility under this is rounding error on a flat line, not risk.
const FLAT = 1e-9;

/**
 * True when day `i` is the last trading day of its week or month. The newest close has no next day to
 * look at, so it counts only when NSE's calendar has no trading day left in its week or month
 * (holidays included): otherwise a weekly rule would read as met on every weekday, and the nightly
 * alert would email each day.
 */
export function isCheckDay(t: string[], i: number, check: Strategy["check"]): boolean {
  if (check === "d") return true;
  if (i === t.length - 1) {
    const d = new Date(`${t[i]}T00:00:00Z`);
    for (let k = 1; k <= 31; k++) {
      const n = new Date(d.getTime() + k * DAY);
      if (check === "w" ? n.getUTCDay() === 1 || n.getUTCDay() === 0 : n.getUTCMonth() !== d.getUTCMonth()) return true;
      if (isTradingDay(n)) return false;
    }
    return true;
  }
  if (check === "m") return t[i].slice(0, 7) !== t[i + 1].slice(0, 7);
  const week = (s: string) => {
    const d = Date.parse(`${s}T00:00:00Z`);
    // Days since a Monday (1 Jan 1973 was one), in whole weeks.
    return Math.floor((d - Date.UTC(1973, 0, 1)) / (7 * DAY));
  };
  return week(t[i]) !== week(t[i + 1]);
}

function condMet(c: Condition, i: number, mx: Metrics): boolean {
  const a = mx.get(c.m);
  const b: Series | number | undefined = c.r ? mx.get(c.r) : c.v;
  const at = (s: Series | number, j: number) => (typeof s === "number" ? s : s[j]);
  switch (c.op) {
    case "rising":
    case "falling": {
      const n = c.n ?? 5;
      const now = a[i], then = a[i - n];
      if (i < n || !isNum(now) || !isNum(then)) return false;
      return c.op === "rising" ? now > then : now < then;
    }
    case "crossAbove":
      return b != null && crossesAbove(a, b, i);
    case "crossBelow":
      return b != null && crossesBelow(a, b, i);
    case "within": {
      if (b == null) return false;
      const x = a[i], y = at(b, i);
      return isNum(x) && isNum(y) && y !== 0 && Math.abs(x / y - 1) * 100 <= (c.v ?? 2);
    }
    default: {
      if (b == null) return false;
      const x = a[i], y = at(b, i);
      if (!isNum(x) || !isNum(y)) return false;
      return c.op === "above" ? x > y : x < y;
    }
  }
}

const rulesMet = (r: RuleSet, i: number, mx: Metrics) => (r.conds.length ? (r.all ? r.conds.every((c) => condMet(c, i, mx)) : r.conds.some((c) => condMet(c, i, mx))) : false);

export function figures(values: number[], days: string[], rf: number): Figures {
  if (values.length < 2) return { cagr: null, maxDd: null, sharpe: null, sortino: null };
  const years = (Date.parse(days[days.length - 1]) - Date.parse(days[0])) / (365.25 * DAY);
  const growth = values[values.length - 1] / values[0];
  let peak = values[0], maxDd = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    maxDd = Math.min(maxDd, v / peak - 1);
  }
  const rets = values.slice(1).map((v, i) => v / values[i] - 1);
  const ex = rets.map((r) => r - rf / TRADING_DAYS);
  const mean = ex.reduce((a, b) => a + b, 0) / ex.length;
  const sd = Math.sqrt(ex.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, ex.length - 1));
  const down = Math.sqrt(ex.reduce((a, b) => a + Math.min(0, b) ** 2, 0) / ex.length);
  return {
    cagr: years >= 0.25 && growth > 0 ? (Math.pow(growth, 1 / years) - 1) * 100 : null,
    maxDd: maxDd * 100,
    // A line that never moves (the rules stayed in cash) has no risk to measure a return against.
    sharpe: sd > FLAT ? (mean / sd) * Math.sqrt(TRADING_DAYS) : null,
    sortino: sd > FLAT && down > 0 ? (mean / down) * Math.sqrt(TRADING_DAYS) : null,
  };
}

export const tradeStats = (closed: Trade[]) => {
  const wins = closed.filter((t) => t.ret > 0);
  const losses = closed.filter((t) => t.ret <= 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgWin = avg(wins.map((t) => t.ret));
  const avgLoss = avg(losses.map((t) => t.ret));
  return {
    closed: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    avgWin,
    avgLoss,
    payoff: avgWin != null && avgLoss != null && avgLoss < 0 ? avgWin / -avgLoss : null,
    avgDays: avg(closed.map((t) => t.days)),
  };
};

/** The first day of the range: `range` back from the last close, but never before the first bar. */
export function rangeStart(t: string[], range: Strategy["range"]): number {
  const last = Date.parse(`${t[t.length - 1]}T00:00:00Z`);
  const from = new Date(last - RANGE_DAYS[range] * DAY).toISOString().slice(0, 10);
  const i = t.findIndex((d) => d >= from);
  return Math.max(0, i);
}

/** Runs the strategy over the range. `rf`: the yearly risk-free rate (the repo rate), as a fraction. */
export function runSignals(mx: Metrics, s: Strategy, rf: number): SignalResult | null {
  const { t, c } = mx.ctx.bars;
  const n = t.length;
  if (n < 3) return null;
  const start = rangeStart(t, s.range);
  if (n - start < 3) return null;
  const half = s.cost / 100 / 2;
  const atr = s.stops.atr ? mx.get("atr22") : null;
  const nifty = mx.ctx.nifty;

  const trades: Trade[] = [];
  const curve: SignalResult["curve"] = [];
  let cash = 100;
  let shares = 0;
  let inTrade = false;
  let entryIdx = -1;
  let entryPx = 0;
  let peak = 0;
  let pending: { kind: "entry" | "exit"; reason: ExitReason; at: number } | null = null;
  let entrySignal: SignalDay | undefined;
  const used = strategyMetrics(s);
  const snapshot = (i: number): SignalDay => ({ t: t[i], values: Object.fromEntries(used.map((id) => [id, mx.get(id)[i] ?? null])) });
  let daysIn = 0;
  const c0 = c[start] as number;
  const n0 = nifty[start];

  for (let i = start; i < n; i++) {
    const px = c[i] as number;
    // Yesterday's signal trades at today's close.
    if (pending) {
      if (pending.kind === "entry") {
        shares = (cash * (1 - half)) / px;
        cash = 0;
        inTrade = true;
        entryIdx = i;
        entrySignal = snapshot(pending.at);
        entryPx = px;
        peak = px;
      } else {
        cash = shares * px * (1 - half);
        trades.push({ entryT: t[entryIdx], entryPx, exitT: t[i], exitPx: px, reason: pending.reason, days: i - entryIdx, ret: ((px * (1 - half)) / (entryPx / (1 - half)) - 1) * 100, entrySignal, exitSignal: snapshot(pending.at) });
        shares = 0;
        inTrade = false;
      }
      pending = null;
    }
    if (inTrade) {
      daysIn++;
      peak = Math.max(peak, px);
    }
    const nv = nifty[i];
    curve.push({ t: t[i], price: px, rules: inTrade ? shares * px : cash, hold: (100 * px) / c0, nifty: isNum(nv) && isNum(n0) ? (100 * nv) / n0 : null });

    const check = isCheckDay(t, i, s.check);
    if (inTrade) {
      const { stops } = s;
      // Hard stops first, then the trailing ones, then targets, time and the rules.
      let reason: ExitReason | null = null;
      if (stops.loss && px <= entryPx * (1 - stops.loss / 100)) reason = "loss";
      else if (stops.trail && px <= peak * (1 - stops.trail / 100)) reason = "trail";
      else if (atr && stops.atr && isNum(atr[i]) && px <= peak - stops.atr * (atr[i] as number)) reason = "atr";
      else if (stops.profit && px >= entryPx * (1 + stops.profit / 100)) reason = "profit";
      else if (stops.days && i - entryIdx >= stops.days) reason = "days";
      else if (check && rulesMet(s.exit, i, mx)) reason = "rule";
      if (reason) pending = { kind: "exit", reason, at: i };
    } else if (check && rulesMet(s.entry, i, mx)) pending = { kind: "entry", reason: "rule", at: i };
  }

  const last = n - 1;
  const lastPx = c[last] as number;
  if (inTrade) {
    trades.push({ entryT: t[entryIdx], entryPx, exitT: null, exitPx: lastPx, reason: "open", days: last - entryIdx, ret: ((lastPx * (1 - half)) / (entryPx / (1 - half)) - 1) * 100, entrySignal });
  }
  const days = curve.map((p) => p.t);
  const closed = trades.filter((x) => x.exitT);
  const cut = Math.min(curve.length - 1, Math.max(1, Math.floor(curve.length * SPLIT_AT)));
  const part = (a: number, b: number, ts: Trade[]) => splitPart(curve.slice(a, b + 1).map((p) => p.rules), days.slice(a, b + 1), ts, rf);
  const niftyVals = curve.map((p) => p.nifty);
  const niftyOk = niftyVals.every(isNum);

  const window = (id: string) => {
    const x = mx.get(id);
    const pts: { t: string; v: number }[] = [];
    for (let i = start; i < n; i++) if (isNum(x[i])) pts.push({ t: t[i], v: x[i] as number });
    return { id, points: pts };
  };
  const overlays = used.filter((id) => id !== "close" && METRIC_BY_ID.get(id)?.kind === "price").map(window);
  const oscIds = used.filter((id) => METRIC_BY_ID.get(id)?.kind !== "price");

  return {
    from: t[start],
    to: t[last],
    curve,
    trades,
    rules: figures(curve.map((p) => p.rules), days, rf),
    hold: figures(curve.map((p) => p.hold), days, rf),
    nifty: niftyOk ? figures(niftyVals as number[], days, rf) : { cagr: null, maxDd: null, sharpe: null, sortino: null },
    stats: { ...tradeStats(closed), timeIn: (daysIn / curve.length) * 100 },
    split: {
      at: days[cut],
      first: part(0, cut, closed.filter((x) => x.entryT < days[cut])),
      last: part(cut, curve.length - 1, closed.filter((x) => x.entryT >= days[cut])),
    },
    now: inTrade ? { in: true, since: t[entryIdx], ret: ((lastPx * (1 - half)) / (entryPx / (1 - half)) - 1) * 100 } : { in: false, since: closed.length ? closed[closed.length - 1].exitT : null, ret: null },
    pending: pending?.kind ?? null,
    pendingReason: pending?.reason ?? null,
    overlays,
    oscs: oscIds.map(window),
  };
}
