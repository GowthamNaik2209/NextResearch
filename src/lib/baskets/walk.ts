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

/** The walk's first day: the calendar's first day when it starts before every stock, else the first bar. */
export const walkStart = (held: { points: PricePoint[] }[], calendar: string[] = []) => {
  const b = basketStart(held);
  return calendar.length && calendar[0] < b ? calendar[0] : b;
};

/** A history starting more than `slackDays` after the basket's first day: listed during the period. */
export const isLate = (s: { points: PricePoint[] }, start: string, slackDays: number) => Date.parse(s.points[0].t) - Date.parse(start) > slackDays * DAY;

const monthOf = (t: string) => t.slice(0, 7);
const quarterOf = (t: string) => `${t.slice(0, 4)}Q${Math.floor((Number(t.slice(5, 7)) - 1) / 3)}`;

export type WalkResult = { points: PricePoint[]; holdings: BacktestHolding[]; turnover: number; trades: number; rebalances: Rebalance[] };

/**
 * Walks the union of trading dates (and `calendar`'s, when given: the range's trading days, so a
 * basket whose stocks all list later still begins with the range, like the index beside it).
 * Every stock's target share is set aside on the first day: one there from day one (within
 * `slackDays` of it) is bought then; a later one's share waits in cash, earning nothing, until its
 * first bar, when that money buys it at the close. Nothing else is traded at a join, so in a basket
 * that is never rebalanced each stock adds exactly its target share times its own return since it
 * was bought, and the targets always total 100%. Then, by `rule`, every stock (and any share still
 * waiting in cash) is traded back to target on the first bar of each month or quarter, or on the bar
 * after any stock drifted more than `band` points off (it can't trade on the close it just saw).
 * A stock's last close carries over days it has no bar.
 *
 * Holdings report each stock's target share (its share of the basket on the first day, money set
 * aside included), its share on the last day, its own price change from the day it was bought, and
 * the points it added (they sum to the basket's return: no money comes in or out). A join counts in
 * turnover and trades only when the basket is rebalanced (a held basket reports none).
 */
export function walkShares(held: HeldInput[], slackDays: number, rule: RebalanceRule, band = 5, calendar: string[] = []): WalkResult {
  const start = walkStart(held, calendar);
  // The day each late stock joins (its first bar); null for those there from day one.
  const joinAt = held.map((s) => (isLate(s, start, slackDays) ? s.points[0].t : null));
  const active = joinAt.map((j) => j == null);
  const total = held.reduce((n, s) => n + s.weight, 0);
  const target = held.map((s) => (total > 0 ? s.weight / total : 1 / held.length));
  // What each stock was bought at: its first close.
  const first = held.map((s) => s.points[0].c);

  const dates = [...new Set([...calendar.filter((t) => t >= start), ...held.flatMap((s) => s.points.map((p) => p.t))])].sort();
  const cursor = held.map(() => 0);
  // Before a day-one stock's first bar (a few days' slack at most) it counts at its first close, i.e. flat.
  const prev = [...first];
  let shares = target.map((w, i) => (active[i] ? w / first[i] : 0));
  // The money set aside for a stock not yet listed.
  let cash = target.map((w, i) => (active[i] ? 0 : w));
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
    const value = shares.reduce((v, sh, i) => v + sh * price[i] + cash[i], 0);
    const sleeve = (i: number) => (shares[i] * price[i] + cash[i]) / value;

    // Stocks listing today: the money set aside for each buys it at this close.
    for (const i of held.flatMap((_, k) => (!active[k] && joinAt[k]! <= t ? [k] : []))) {
      active[i] = true;
      if (rule !== "never" && cash[i] > 0) {
        turnover += ((cash[i] / value) * 100) / 2;
        trades++;
      }
      shares[i] = cash[i] / price[i];
      cash[i] = 0;
    }
    const due =
      d > 0 &&
      (rule === "monthly" ? monthOf(t) !== monthOf(dates[d - 1]) : rule === "quarterly" ? quarterOf(t) !== quarterOf(dates[d - 1]) : rule === "drift" ? drifted : false);
    if (due) {
      // A rebalance: every stock back to its target (a share still waiting stays in cash).
      let moved = 0;
      let count = 0;
      held.forEach((_, i) => {
        const off = Math.abs(target[i] - sleeve(i));
        moved += off;
        if (off > 1e-6) count++;
      });
      if (count) {
        rebalances.push({ t, turnover: (moved / 2) * 100, trades: count });
        turnover += (moved / 2) * 100;
        trades += count;
      }
      shares = target.map((w, i) => (active[i] ? (w * value) / price[i] : 0));
      cash = target.map((w, i) => (active[i] ? 0 : w * value));
    }
    if (rule === "drift") drifted = held.some((_, i) => Math.abs(sleeve(i) - target[i]) * 100 > band);
    points.push({ t, c: value * 100 });
  });

  const endValue = points[points.length - 1].c / 100;
  const holdings = held.map((s, i) => ({
    ticker: s.ticker,
    weight: target[i],
    endWeight: (shares[i] * prev[i] + cash[i]) / endValue,
    ret: (prev[i] / first[i] - 1) * 100,
    contribution: gain[i] * 100,
    ...(joinAt[i] ? { joined: joinAt[i]! } : {}),
  }));
  return { points, holdings, turnover, trades, rebalances };
}
