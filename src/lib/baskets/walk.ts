// The share-based walk behind every backtest that trades after day one: the rebalanced backtest
// (rebalance.ts) and a held one whose stocks join on their own start dates (backtest.ts). It holds a
// number of shares of each stock, so a rebalance or a stock joining is just a change of shares at
// that day's close, with the basket's value carried on unbroken. Pure, unit-tested through both.
// Only types are imported from the engines, so there is no import cycle at load time.
import type { BacktestHolding, HeldInput, PricePoint } from "./backtest";
import type { Rebalance } from "./rebalance";
import type { RebalanceRule } from "./strategy";

const DAY = 86_400_000;

/** The basket's first day: the earliest first bar among the stocks held. */
export const basketStart = (held: { points: PricePoint[] }[]) => held.reduce((m, s) => (s.points[0].t < m ? s.points[0].t : m), held[0].points[0].t);

/** A history starting more than `slackDays` after the basket's first day: listed during the period. */
export const isLate = (s: { points: PricePoint[] }, start: string, slackDays: number) => Date.parse(s.points[0].t) - Date.parse(start) > slackDays * DAY;

const monthOf = (t: string) => t.slice(0, 7);
const quarterOf = (t: string) => `${t.slice(0, 4)}Q${Math.floor((Number(t.slice(5, 7)) - 1) / 3)}`;

export type WalkResult = { points: PricePoint[]; holdings: BacktestHolding[]; turnover: number; trades: number; rebalances: Rebalance[] };

/**
 * Walks the union of trading dates. Stocks there from day one (within `slackDays` of the first
 * bar) are bought at their target shares on the first day; a later one joins on its first bar,
 * bought at its target share among the stocks then held and paid for by selling the others in
 * proportion (so a held basket keeps their drifted mix). Targets are the weights scaled over the
 * stocks held at the time. Then, by `rule`, every stock is traded back to target on the first bar
 * of each month or quarter, or on the bar after any stock drifted more than `band` points off
 * (it can't trade on the close it just saw). A stock's last close carries over days it has no bar.
 *
 * Holdings report the share each stock was bought at (held) or its final target (rebalanced), its
 * share on the last day, its own price change from the day it was bought, and the points it added
 * (they sum to the basket's return: no money comes in or out at a join or a rebalance). A join is
 * counted in turnover and trades only when the basket is rebalanced (a held basket reports none).
 */
export function walkShares(held: HeldInput[], slackDays: number, rule: RebalanceRule, band = 5): WalkResult {
  const start = basketStart(held);
  // The day each late stock joins (its first bar); null for those there from day one.
  const joinAt = held.map((s) => (isLate(s, start, slackDays) ? s.points[0].t : null));
  const active = joinAt.map((j) => j == null);
  const targets = () => {
    const sum = held.reduce((n, s, i) => n + (active[i] ? s.weight : 0), 0);
    return held.map((s, i) => (active[i] && sum > 0 ? s.weight / sum : 0));
  };
  let target = targets();
  // What each stock was bought at: its first close, and its share of the basket that day.
  const first = held.map((s) => s.points[0].c);
  const entry = [...target];

  const dates = [...new Set(held.flatMap((s) => s.points.map((p) => p.t)))].sort();
  const cursor = held.map(() => 0);
  // Before a day-one stock's first bar (a few days' slack at most) it counts at its first close, i.e. flat.
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

    const joining = held.flatMap((_, i) => (!active[i] && joinAt[i]! <= t ? [i] : []));
    if (joining.length) {
      for (const i of joining) active[i] = true;
      target = targets();
      for (const i of joining) entry[i] = target[i];
    }
    const due =
      d > 0 &&
      (rule === "monthly" ? monthOf(t) !== monthOf(dates[d - 1]) : rule === "quarterly" ? quarterOf(t) !== quarterOf(dates[d - 1]) : rule === "drift" ? drifted : false);
    if (due || (joining.length && rule !== "never")) {
      // A rebalance (a join on a rebalanced basket is one too): every stock back to its target.
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
    } else if (joining.length) {
      // Held: the newcomers bought at their target shares, the rest sold down in proportion.
      const bought = joining.reduce((n, i) => n + target[i], 0);
      shares = shares.map((sh, i) => (joining.includes(i) ? (target[i] * value) / price[i] : sh * (1 - bought)));
    }
    if (rule === "drift") drifted = held.some((_, i) => active[i] && Math.abs((shares[i] * price[i]) / value - target[i]) * 100 > band);
    points.push({ t, c: value * 100 });
  });

  const endValue = points[points.length - 1].c / 100;
  const holdings = held.map((s, i) => ({
    ticker: s.ticker,
    weight: rule === "never" ? entry[i] : target[i],
    endWeight: (shares[i] * prev[i]) / endValue,
    ret: (prev[i] / first[i] - 1) * 100,
    contribution: gain[i] * 100,
    ...(joinAt[i] ? { joined: joinAt[i]! } : {}),
  }));
  return { points, holdings, turnover, trades, rebalances };
}
