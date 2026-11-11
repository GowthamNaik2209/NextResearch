// Signal backtests on a basket (docs/SIGNALS.md section 4): the same rules run on every stock, each
// in its own equal slot, so a slot is in its stock while the rules hold it and in cash otherwise. The
// basket's value is the average of its slots (each a one-stock backtest, ./engine.ts), and "held" is
// every stock bought on the first day in equal parts and kept. A stock listed after the range starts
// keeps its slot in cash until its first close. Pure, so it is unit-tested.
import { figures, runSignals, SPLIT_AT, tradeStats, type ExitReason, type Figures, type SignalResult, type Trade } from "./engine";
import type { Metrics } from "./compute";
import type { Strategy } from "./strategy";

export type BasketTrade = Trade & { ticker: string };

export type BasketStockResult = {
  ticker: string;
  closed: number;
  winRate: number | null;
  /** Growth of the stock's slot over the range under the rules, and bought and held, %. */
  rulesRet: number | null;
  holdRet: number | null;
  timeIn: number;
  in: boolean;
  pending: "entry" | "exit" | null;
  pendingReason: ExitReason | null;
};

export type BasketResult = {
  from: string;
  to: string;
  /** Each day: growth of 100 for the rules, the basket held and the Nifty 50, and how many stocks the rules held. */
  curve: { t: string; rules: number; hold: number; nifty: number | null; held: number }[];
  trades: BasketTrade[];
  rules: Figures;
  hold: Figures;
  nifty: Figures;
  stats: ReturnType<typeof tradeStats> & { timeIn: number; size: number };
  split: SignalResult["split"];
  stocks: BasketStockResult[];
};

/** Each day's value of a stock's curve, carried over a day it lacks, and 100 (cash) before its first. */
function onCalendar(days: string[], curve: { t: string; v: number }[]): number[] {
  const out: number[] = [];
  let j = 0;
  let last = 100;
  for (const d of days) {
    while (j < curve.length && curve[j].t <= d) last = curve[j++].v;
    out.push(last);
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Runs the strategy on each stock and combines the slots. `days`: the trading days of the range (the
 * Nifty 50's), `nifty`: its closes on them. Stocks with too little history for the range are left out.
 */
export function runBasketSignals(stocks: { ticker: string; mx: Metrics }[], s: Strategy, rf: number, days: string[], nifty: (number | null)[]): BasketResult | null {
  const runs = stocks.map((x) => ({ ticker: x.ticker, r: runSignals(x.mx, s, rf) })).filter((x): x is { ticker: string; r: SignalResult } => x.r != null);
  if (!runs.length || days.length < 3) return null;
  const from = days[0];
  const to = days[days.length - 1];
  const rulesBy = runs.map((x) => onCalendar(days, x.r.curve.map((p) => ({ t: p.t, v: p.rules }))));
  const holdBy = runs.map((x) => onCalendar(days, x.r.curve.map((p) => ({ t: p.t, v: p.hold }))));
  // In a trade on a day: from the close it was bought at up to (not including) the close it was sold at.
  const inBy = runs.map((x) => days.map((d) => x.r.trades.some((t) => t.entryT <= d && (t.exitT == null || d < t.exitT))));
  const n0 = nifty[0];
  const curve = days.map((t, i) => ({
    t,
    rules: mean(rulesBy.map((v) => v[i])),
    hold: mean(holdBy.map((v) => v[i])),
    nifty: n0 != null && nifty[i] != null ? (100 * (nifty[i] as number)) / n0 : null,
    held: inBy.filter((v) => v[i]).length,
  }));
  const trades: BasketTrade[] = runs.flatMap((x) => x.r.trades.map((t) => ({ ...t, ticker: x.ticker }))).sort((a, b) => a.entryT.localeCompare(b.entryT));
  const closed = trades.filter((t) => t.exitT);
  const cut = Math.min(curve.length - 1, Math.max(1, Math.floor(curve.length * SPLIT_AT)));
  const part = (a: number, b: number, ts: Trade[]) => {
    const f = figures(curve.slice(a, b + 1).map((p) => p.rules), days.slice(a, b + 1), rf);
    const st = tradeStats(ts);
    return { cagr: f.cagr, closed: st.closed, winRate: st.winRate };
  };
  const niftyVals = curve.map((p) => p.nifty);
  return {
    from,
    to,
    curve,
    trades,
    rules: figures(curve.map((p) => p.rules), days, rf),
    hold: figures(curve.map((p) => p.hold), days, rf),
    nifty: niftyVals.every((v) => v != null) ? figures(niftyVals as number[], days, rf) : { cagr: null, maxDd: null, sharpe: null, sortino: null },
    stats: { ...tradeStats(closed), timeIn: (mean(curve.map((p) => p.held)) / runs.length) * 100, size: runs.length },
    split: {
      at: days[cut],
      first: part(0, cut, closed.filter((x) => x.entryT < days[cut])),
      last: part(cut, curve.length - 1, closed.filter((x) => x.entryT >= days[cut])),
    },
    stocks: runs.map((x, k) => {
      const st = tradeStats(x.r.trades.filter((t) => t.exitT));
      const rv = rulesBy[k], hv = holdBy[k];
      return {
        ticker: x.ticker,
        closed: st.closed,
        winRate: st.winRate,
        rulesRet: rv[rv.length - 1] - 100,
        holdRet: hv[hv.length - 1] - 100,
        timeIn: (inBy[k].filter(Boolean).length / days.length) * 100,
        in: x.r.now.in,
        pending: x.r.pending,
        pendingReason: x.r.pendingReason,
      };
    }),
  };
}
