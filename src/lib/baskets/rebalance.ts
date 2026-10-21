// Basket strategies on top of the backtest: target weights (equal, market cap, capped market cap,
// layer-balanced) and a backtest that puts the basket back to those targets on a schedule
// (monthly, quarterly, or when a stock drifts too far off target), counting the trades and
// turnover that takes. Pure (no fetching), so it is unit-tested on its own, like backtest.ts.
import { splitHeld, type BacktestInput, type BacktestResult, type PricePoint } from "./backtest";
import type { RebalanceRule, WeightScheme } from "./strategy";

export type WeightStock = { ticker: string; mcapCr: number | null; layer: string };

/** One rebalance: its date, the share of the basket traded (one way, %) and the stocks traded. */
export type Rebalance = { t: string; turnover: number; trades: number };

export type RebalancedResult = BacktestResult & {
  /** Sum of every rebalance's one-way turnover, % of the basket's value at the time. */
  turnover: number;
  /** Buys and sells, all rebalances together (the first day's purchase not counted). */
  trades: number;
  rebalances: Rebalance[];
};

const EPS = 1e-9;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 1;
};

/**
 * Target weights (summing to 1) for the stocks actually held. Equal and market cap match
 * basketWeights (a stock with no market cap gets the median); capped market cap holds every stock
 * to `cap`% and every layer to `layerCap`%, handing the excess to the rest in proportion to their
 * market caps; layer-balanced splits the basket equally between layers, then equally within each.
 * A cap too tight for the basket (5 stocks at 15% can't add up to 100%) is loosened to the
 * smallest that fits: 1/n per stock, 1/layers per layer.
 */
export function targetWeights(stocks: WeightStock[], scheme: WeightScheme, cap = 15, layerCap = 35): Map<string, number> {
  const n = stocks.length;
  if (!n) return new Map();
  if (scheme === "equal") return new Map(stocks.map((s) => [s.ticker, 1 / n]));
  if (scheme === "layer") {
    const per = new Map<string, number>();
    for (const s of stocks) per.set(s.layer, (per.get(s.layer) ?? 0) + 1);
    return new Map(stocks.map((s) => [s.ticker, 1 / per.size / per.get(s.layer)!]));
  }
  const med = median(stocks.map((s) => s.mcapCr).filter((v): v is number => v != null && v > 0));
  const raw = stocks.map((s) => (s.mcapCr && s.mcapCr > 0 ? s.mcapCr : med));
  const sum = raw.reduce((a, b) => a + b, 0);
  const w = raw.map((v) => v / sum);
  if (scheme === "mcap") return new Map(stocks.map((s, i) => [s.ticker, w[i]]));

  // Two levels of water-filling, as cap-weighted indices do it: layers share the basket by market
  // cap, none above its cap (nor above what its stocks can hold at their own cap); then each
  // layer's share goes to its stocks by market cap, none above the stock cap.
  const layers = [...new Set(stocks.map((s) => s.layer))];
  const sCap = Math.max(cap / 100, 1 / n);
  const lCap = Math.max(layerCap / 100, 1 / layers.length);
  const members = layers.map((l) => stocks.map((s, i) => (s.layer === l ? i : -1)).filter((i) => i >= 0));
  const budgets = waterfill(
    members.map((m) => m.reduce((a, i) => a + raw[i], 0)),
    members.map((m) => Math.min(lCap, m.length * sCap)),
    1,
  );
  const out = new Array<number>(n).fill(0);
  members.forEach((m, l) => {
    const within = waterfill(
      m.map((i) => raw[i]),
      m.map(() => sCap),
      budgets[l],
    );
    m.forEach((i, k) => (out[i] = within[k]));
  });
  // Caps that can't all hold together (one stock alone in its layer, say) leave some unplaced:
  // spread it in proportion, going over the caps as little as the basket allows.
  const total = out.reduce((a, b) => a + b, 0);
  return new Map(stocks.map((s, i) => [s.ticker, out[i] / total]));
}

/**
 * Splits `budget` in proportion to `raw`, none above its cap: whatever a capped item can't take
 * goes to the rest, in proportion again, until nothing is over. Leaves budget unplaced only when
 * every item is at its cap.
 */
function waterfill(raw: number[], caps: number[], budget: number): number[] {
  const out = raw.map(() => 0);
  const free = new Set(raw.map((_, i) => i));
  let left = budget;
  while (left > EPS && free.size) {
    const base = [...free].reduce((a, i) => a + raw[i], 0);
    const share = (i: number) => (base > 0 ? (left * raw[i]) / base : left / free.size);
    const over = [...free].filter((i) => out[i] + share(i) > caps[i] + EPS);
    if (!over.length) {
      for (const i of free) out[i] += share(i);
      break;
    }
    for (const i of over) {
      left -= caps[i] - out[i];
      out[i] = caps[i];
      free.delete(i);
    }
  }
  return out;
}

const monthOf = (t: string) => t.slice(0, 7);
const quarterOf = (t: string) => `${t.slice(0, 4)}Q${Math.floor((Number(t.slice(5, 7)) - 1) / 3)}`;

/**
 * Backtest with rebalancing. Bought at the target weights on the first day like runBacktest;
 * then, on the first bar of each new month or quarter, or on the bar after any stock has drifted
 * more than `band` percentage points off its target, every stock is traded back to its target at
 * that bar's close. The drift rule acts a bar late on purpose: it can't trade on the close it just
 * saw. No costs or taxes are taken; turnover and trade counts say how much trading it took.
 * Holdings report the target weight, the weight on the last day, the stock's own price change and
 * the points it added to the basket's return (they sum to the basket's return).
 */
export function runRebalanced(input: BacktestInput[], slackDays: number, rule: RebalanceRule, band = 5): RebalancedResult {
  const { held, excluded } = splitHeld(input, slackDays);
  if (!held.length) return { points: [], holdings: [], excluded, turnover: 0, trades: 0, rebalances: [] };
  const total = held.reduce((n, s) => n + s.weight, 0);
  const target = held.map((s) => s.weight / total);

  const dates = [...new Set(held.flatMap((s) => s.points.map((p) => p.t)))].sort();
  const cursor = held.map(() => 0);
  // Before a stock's first bar (a few days' slack at most) it counts at its first close, i.e. flat.
  const first = held.map((s) => s.points[0].c);
  const prev = [...first];
  let shares = target.map((w, i) => w / first[i]);
  const gain = held.map(() => 0);
  const points: PricePoint[] = [];
  const rebalances: Rebalance[] = [];
  let turnover = 0;
  let trades = 0;
  let drifted = false;

  dates.forEach((t, d) => {
    const price = held.map((s, i) => {
      while (cursor[i] + 1 < s.points.length && s.points[cursor[i] + 1].t <= t) cursor[i]++;
      return s.points[cursor[i]].c;
    });
    held.forEach((_, i) => {
      gain[i] += shares[i] * (price[i] - prev[i]);
      prev[i] = price[i];
    });
    const value = shares.reduce((v, sh, i) => v + sh * price[i], 0);
    const due =
      d > 0 &&
      (rule === "monthly" ? monthOf(t) !== monthOf(dates[d - 1]) : rule === "quarterly" ? quarterOf(t) !== quarterOf(dates[d - 1]) : rule === "drift" ? drifted : false);
    if (due) {
      let moved = 0;
      let count = 0;
      held.forEach((_, i) => {
        const off = Math.abs(target[i] - (shares[i] * price[i]) / value);
        moved += off;
        if (off > 1e-6) count++;
      });
      if (count) {
        rebalances.push({ t, turnover: (moved / 2) * 100, trades: count });
        turnover += (moved / 2) * 100;
        trades += count;
      }
      shares = target.map((w, i) => (w * value) / price[i]);
    }
    if (rule === "drift") drifted = held.some((_, i) => Math.abs((shares[i] * price[i]) / value - target[i]) * 100 > band);
    points.push({ t, c: value * 100 });
  });

  const endValue = points[points.length - 1].c / 100;
  const holdings = held.map((s, i) => ({
    ticker: s.ticker,
    weight: target[i],
    endWeight: (shares[i] * prev[i]) / endValue,
    ret: (prev[i] / first[i] - 1) * 100,
    contribution: gain[i] * 100,
  }));
  return { points, holdings, excluded, turnover, trades, rebalances };
}
