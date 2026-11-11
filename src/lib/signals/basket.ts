// Signal backtests on a basket (docs/SIGNALS.md section 4): the same rules run on every stock, each
// in its own slot sized by the basket's weighting (equal, market cap or the user's own %), so a slot
// is in its stock while the rules hold it and in cash otherwise. The basket's value is the weighted
// average of its slots (each a one-stock backtest, ./engine.ts), and "held" is every stock bought on
// the first day in those weights and kept (no rebalancing: each slot follows its own rules). A stock listed after the range starts
// keeps its slot in cash until its first close. Pure, so it is unit-tested.
import { figures, runSignals, SPLIT_AT, splitPart, tradeStats, type ExitReason, type Figures, type SignalResult, type Trade } from "./engine";
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
  /** Each stock's slot, % of the basket. */
  weights: { ticker: string; share: number }[];
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
const weighted = (xs: number[], w: number[]) => xs.reduce((a, x, i) => a + x * w[i], 0);

/**
 * Runs the strategy on each stock and combines the slots. `days`: the trading days of the range (the
 * Nifty 50's), `nifty`: its closes on them. Stocks with too little history for the range are left out.
 */
export function runBasketSignals(
  stocks: { ticker: string; mx: Metrics }[],
  s: Strategy,
  rf: number,
  days: string[],
  nifty: (number | null)[],
  /** Each stock's share of the basket (any scale; missing or none: equal). */
  weights?: Map<string, number>,
): BasketResult | null {
  const runs = stocks.map((x) => ({ ticker: x.ticker, r: runSignals(x.mx, s, rf) })).filter((x): x is { ticker: string; r: SignalResult } => x.r != null);
  if (!runs.length || days.length < 3) return null;
  const raw = runs.map((x) => Math.max(0, weights?.get(x.ticker) ?? (weights ? 0 : 1)));
  const total = raw.reduce((a, b) => a + b, 0);
  const share = total > 0 ? raw.map((v) => v / total) : runs.map(() => 1 / runs.length);
  const from = days[0];
  const to = days[days.length - 1];
  const rulesBy = runs.map((x) => onCalendar(days, x.r.curve.map((p) => ({ t: p.t, v: p.rules }))));
  const holdBy = runs.map((x) => onCalendar(days, x.r.curve.map((p) => ({ t: p.t, v: p.hold }))));
  // In a trade on a day: from the close it was bought at up to (not including) the close it was sold at.
  const inBy = runs.map((x) => days.map((d) => x.r.trades.some((t) => t.entryT <= d && (t.exitT == null || d < t.exitT))));
  const n0 = nifty[0];
  const curve = days.map((t, i) => ({
    t,
    rules: weighted(rulesBy.map((v) => v[i]), share),
    hold: weighted(holdBy.map((v) => v[i]), share),
    nifty: n0 != null && nifty[i] != null ? (100 * (nifty[i] as number)) / n0 : null,
    held: inBy.filter((v) => v[i]).length,
  }));
  const trades: BasketTrade[] = runs.flatMap((x) => x.r.trades.map((t) => ({ ...t, ticker: x.ticker }))).sort((a, b) => a.entryT.localeCompare(b.entryT));
  const closed = trades.filter((t) => t.exitT);
  const cut = Math.min(curve.length - 1, Math.max(1, Math.floor(curve.length * SPLIT_AT)));
  const part = (a: number, b: number, ts: Trade[]) => splitPart(curve.slice(a, b + 1).map((p) => p.rules), days.slice(a, b + 1), ts, rf);
  const niftyVals = curve.map((p) => p.nifty);
  return {
    from,
    to,
    curve,
    trades,
    rules: figures(curve.map((p) => p.rules), days, rf),
    hold: figures(curve.map((p) => p.hold), days, rf),
    nifty: niftyVals.every((v) => v != null) ? figures(niftyVals as number[], days, rf) : { cagr: null, maxDd: null, sharpe: null, sortino: null },
    // Time invested: the share of the basket's money in stocks, day by day, on average.
    stats: { ...tradeStats(closed), timeIn: mean(days.map((_, i) => weighted(inBy.map((v) => (v[i] ? 1 : 0)), share))) * 100, size: runs.length },
    split: {
      at: days[cut],
      first: part(0, cut, closed.filter((x) => x.entryT < days[cut])),
      last: part(cut, curve.length - 1, closed.filter((x) => x.entryT >= days[cut])),
    },
    weights: runs.map((x, k) => ({ ticker: x.ticker, share: share[k] * 100 })),
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
