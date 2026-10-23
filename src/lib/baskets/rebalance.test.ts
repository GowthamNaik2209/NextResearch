import { test } from "node:test";
import assert from "node:assert/strict";
import { runBacktest } from "./backtest";
import { runRebalanced, targetWeights } from "./rebalance";
import { addToWeights, customTargets, heldStrategy, parseStrategy, removeFromWeights, strategyQuery, strategyShort, toPercents, weightsTotal, weightsValid } from "./strategy";

const near = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
const pts = (closes: number[], from = "2026-01-") => closes.map((c, i) => ({ t: `${from}${String(i + 1).padStart(2, "0")}`, c }));

test("never rebalancing matches buy and hold", () => {
  const input = [
    { ticker: "A", weight: 3, points: pts([10, 12, 9, 20]) },
    { ticker: "B", weight: 1, points: pts([5, 4, 6, 5]) },
  ];
  const held = runBacktest(input, 10);
  const r = runRebalanced(input, 10, "never");
  r.points.forEach((p, i) => near(p.c, held.points[i].c));
  r.holdings.forEach((h, i) => {
    near(h.endWeight, held.holdings[i].endWeight);
    near(h.contribution, held.holdings[i].contribution);
  });
  assert.equal(r.trades, 0);
  assert.equal(r.turnover, 0);
});

test("monthly rebalance trims the winner back to equal weight on the month's first bar", () => {
  const input = [
    { ticker: "A", weight: 1, points: [{ t: "2026-01-30", c: 100 }, { t: "2026-01-31", c: 200 }, { t: "2026-02-02", c: 200 }, { t: "2026-02-03", c: 100 }] },
    { ticker: "B", weight: 1, points: [{ t: "2026-01-30", c: 100 }, { t: "2026-01-31", c: 100 }, { t: "2026-02-02", c: 100 }, { t: "2026-02-03", c: 100 }] },
  ];
  const r = runRebalanced(input, 10, "monthly");
  // 100 -> 150 (A doubles), rebalanced to 75/75 on 2 Feb, then A halves: 37.5 + 75 = 112.5.
  assert.deepEqual(
    r.points.map((p) => p.c),
    [100, 150, 150, 112.5],
  );
  assert.equal(r.rebalances.length, 1);
  assert.equal(r.rebalances[0].t, "2026-02-02");
  // Weights were 2/3 and 1/3: a sixth of the basket moved from A to B.
  near(r.rebalances[0].turnover, (100 / 6) * 1);
  assert.equal(r.trades, 2);
  // Held instead, A's halving would leave the basket at 100.
  assert.equal(runBacktest(input, 10).points[3].c, 100);
  // Contributions still add up to the return.
  near(r.holdings.reduce((n, h) => n + h.contribution, 0), 12.5);
  near(r.holdings.find((h) => h.ticker === "A")!.endWeight, 37.5 / 112.5);
});

test("quarterly rebalances only when the quarter turns", () => {
  const dates = ["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15"];
  const input = [
    { ticker: "A", weight: 1, points: dates.map((t, i) => ({ t, c: 100 + i * 10 })) },
    { ticker: "B", weight: 1, points: dates.map((t) => ({ t, c: 100 })) },
  ];
  const r = runRebalanced(input, 10, "quarterly");
  assert.deepEqual(r.rebalances.map((x) => x.t), ["2026-04-15"]);
  assert.equal(runRebalanced(input, 10, "monthly").rebalances.length, 4);
});

test("drift band trades the bar after a stock moves past the band, not on it", () => {
  const input = [
    { ticker: "A", weight: 1, points: pts([100, 102, 130, 130, 130]) },
    { ticker: "B", weight: 1, points: pts([100, 100, 100, 100, 100]) },
  ];
  const r = runRebalanced(input, 10, "drift", 5);
  // Day 2: A at 102 is 0.5 pts off; day 3: 56.5% vs 50% is past 5 pts; trades on day 4's close.
  assert.deepEqual(r.rebalances.map((x) => x.t), ["2026-01-04"]);
  // A wide band never trades.
  assert.equal(runRebalanced(input, 10, "drift", 20).trades, 0);
});

test("a stock with no bar on a rebalance day trades at its last close", () => {
  const input = [
    { ticker: "A", weight: 1, points: [{ t: "2026-01-31", c: 10 }, { t: "2026-02-03", c: 20 }] },
    { ticker: "B", weight: 1, points: [{ t: "2026-01-31", c: 10 }, { t: "2026-02-02", c: 10 }, { t: "2026-02-03", c: 10 }] },
  ];
  const r = runRebalanced(input, 10, "monthly");
  // On 2 Feb A is carried at 10: nothing to trade, so no rebalance is recorded.
  assert.equal(r.rebalances.length, 0);
  near(r.points[2].c, 150);
});

test("rebalancing reports the same exclusions as the held backtest", () => {
  const r = runRebalanced(
    [
      { ticker: "A", weight: 1, points: [{ t: "2025-01-01", c: 10 }, { t: "2026-01-01", c: 11 }] },
      { ticker: "NEW", weight: 1, points: [{ t: "2025-09-01", c: 10 }, { t: "2026-01-01", c: 30 }] },
      { ticker: "GONE", weight: 1, points: null },
    ],
    10,
    "monthly",
  );
  assert.deepEqual(r.holdings.map((h) => h.ticker), ["A"]);
  assert.deepEqual(r.excluded.map((e) => e.reason), ["no-data", "late"]);
  assert.deepEqual(runRebalanced([], 10, "monthly").points, []);
});

test("custom weights are each stock's own %, fitted to the stocks held", () => {
  const stocks = ["A", "B", "C"].map((t) => ({ ticker: t, mcapCr: 1 }));
  const w = targetWeights(stocks, "custom", { A: 50, B: 30, C: 20 });
  near(w.get("A")!, 0.5);
  near(w.get("C")!, 0.2);
  // A subset (the chart's picks, or a stock with no prices left out) keeps their proportions.
  const sub = targetWeights(stocks.slice(0, 2), "custom", { A: 50, B: 30, C: 20 });
  near(sub.get("A")!, 50 / 80);
  near(sum(sub), 1);
  // A stock with no weight of its own gets the others' average.
  const gap = customTargets(["A", "B", "C"], { A: 60, B: 20 });
  near(gap.get("C")!, 40 / 120);
  // None at all: equal.
  near(customTargets(["A", "B"], undefined).get("A")!, 0.5);
});

test("rebalancing goes back to the custom targets", () => {
  const up = [100, 200, 200].map((c, i) => ({ t: `2026-0${i + 1}-02T00:00:00Z`, c }));
  const flat = [100, 100, 100].map((c, i) => ({ t: `2026-0${i + 1}-02T00:00:00Z`, c }));
  const r = runRebalanced(
    [
      { ticker: "UP", weight: 0.2, points: up },
      { ticker: "FLAT", weight: 0.8, points: flat },
    ],
    10,
    "monthly",
  );
  // Month two: UP doubled to 0.4 of 1.2 (a third), then traded back to 20%.
  near(r.holdings.find((h) => h.ticker === "UP")!.weight, 0.2);
  near(r.rebalances[0].turnover, (1 / 3 - 0.2) * 100);
  near(r.holdings.find((h) => h.ticker === "UP")!.endWeight, 0.2);
});

test("percentages total exactly 100 to a tenth", () => {
  const p = toPercents(new Map([["A", 1 / 3], ["B", 1 / 3], ["C", 1 / 3]]));
  assert.equal(weightsTotal(p), 100);
  assert.deepEqual(Object.values(p).sort(), [33.3, 33.3, 33.4]);
  assert.ok(weightsValid(p, ["A", "B", "C"]));
  assert.ok(!weightsValid({ A: 50, B: 40 }, ["A", "B"]));
  assert.ok(!weightsValid({ A: 50, B: 50 }, ["A", "B", "C"]));
});

test("adding a stock gives it an equal share; removing one keeps the others' proportions", () => {
  const added = addToWeights({ A: 60, B: 40 }, ["C"]);
  near(added.C, 33.3, 0.1);
  near(added.A / added.B, 1.5, 0.01);
  assert.equal(weightsTotal(added), 100);
  const removed = removeFromWeights({ A: 50, B: 30, C: 20 }, ["A"]);
  assert.deepEqual(removed, { B: 60, C: 40 });
  // Weights that didn't total 100 yet come out at 100.
  assert.equal(weightsTotal(addToWeights({ A: 50, B: 30 }, ["C"])), 100);
  assert.deepEqual(addToWeights({}, ["A"]), { A: 100 });
  // Taken off and put back: its earlier % returns, and so do everyone else's.
  const off = removeFromWeights({ B: 10, C: 50, D: 20, A: 20 }, ["A"]);
  assert.deepEqual(off, { B: 12.5, C: 62.5, D: 25 });
  assert.deepEqual(addToWeights(off, ["A"], { A: 20 }), { B: 10, C: 50, D: 20, A: 20 });
});

test("plain cap weights match the held backtest's (median for a missing figure)", () => {
  const w = targetWeights(
    [
      { ticker: "A", mcapCr: 100 },
      { ticker: "B", mcapCr: 300 },
      { ticker: "C", mcapCr: null },
    ],
    "mcap",
  );
  near(w.get("C")!, 300 / 700);
});

test("an old link with the removed layer-balanced weighting opens at equal weight", () => {
  assert.equal(parseStrategy(new URLSearchParams("w=layer&rb=monthly")).weighting, "equal");
  // Even where the basket's own weighting would otherwise apply.
  assert.equal(parseStrategy(new URLSearchParams("wt=layer"), "mcap", { w: "wt" }).weighting, "equal");
  assert.equal(strategyQuery(parseStrategy(new URLSearchParams("w=layer"))), "w=equal");
});

test("strategy query: the default is the old w= only, and it round-trips", () => {
  assert.equal(strategyQuery(heldStrategy("equal")), "w=equal");
  assert.equal(strategyQuery(heldStrategy("mcap")), "w=mcap");
  const s = { weighting: "custom" as const, rebalance: "drift" as const, band: 10, weights: { TCS: 40, INFY: 60 } };
  const q = strategyQuery(s);
  assert.equal(q, "w=custom&cw=INFY:60,TCS:40&rb=drift&band=10");
  assert.deepEqual(parseStrategy(new URLSearchParams(q)), s);
  // Junk falls back to the defaults, and numbers are clamped.
  const j = parseStrategy(new URLSearchParams("w=bogus&rb=daily&band=999"), "mcap");
  assert.equal(j.weighting, "mcap");
  assert.equal(j.rebalance, "never");
  assert.equal(j.band, 50);
  assert.equal(strategyShort(s), "Custom · drift 10 pts");
  // Capped is gone: an old link reads as market cap, its caps ignored.
  const old = parseStrategy(new URLSearchParams("wt=capped&cap=15&lcap=35&rb=monthly"), "equal", { w: "wt" });
  assert.deepEqual(old, { weighting: "mcap", rebalance: "monthly", band: 5 });
  // Custom with no weights in the link leaves them to the basket's own.
  assert.equal(parseStrategy(new URLSearchParams("w=custom")).weights, undefined);
});

test("a stock set to 0% is left out as such, not as missing prices", () => {
  const r = runBacktest(
    [
      { ticker: "A", weight: 1, points: pts([100, 110]) },
      { ticker: "Z", weight: 0, points: pts([100, 90]) },
      { ticker: "N", weight: 0, points: null },
    ],
    10,
  );
  assert.deepEqual(r.holdings.map((h) => h.ticker), ["A"]);
  assert.deepEqual(r.excluded.map((e) => [e.ticker, e.reason]), [["Z", "zero"], ["N", "no-data"]]);
});

test("rebalanced with a stock joining: its cash buys it on its first bar, counted as one trade", () => {
  const input = [
    { ticker: "OLD", weight: 1, points: [{ t: "2026-01-05", c: 100 }, { t: "2026-01-20", c: 200 }, { t: "2026-01-25", c: 200 }] },
    { ticker: "NEW", weight: 1, points: [{ t: "2026-01-20", c: 10 }, { t: "2026-01-25", c: 20 }] },
  ];
  const r = runRebalanced(input, 10, "monthly", 5, { joinLate: true });
  assert.deepEqual(r.excluded, []);
  assert.deepEqual(r.points.map((p) => p.c), [100, 150, 200]);
  // No rebalance fell due in January; the join bought NEW with its cash (one stock, a third of the basket bought).
  assert.deepEqual(r.rebalances, []);
  assert.equal(r.trades, 1);
  const sum = r.holdings.reduce((n, h) => n + h.contribution, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
  // The same basket held reports the same values (the join is the only trade either way).
  assert.deepEqual(runBacktest(input, 10, { joinLate: true }).points, r.points);
});

test("custom weights typed to one decimal around an even split are exactly equal weights", () => {
  const tickers = Array.from({ length: 23 }, (_, i) => `T${i}`);
  const shown = toPercents(new Map(tickers.map((t) => [t, 1 / 23])));
  assert.ok(new Set(Object.values(shown)).size > 1, "Reset to equal shows 4.4% and 4.3%");
  const w = customTargets(tickers, shown);
  for (const t of tickers) assert.ok(Math.abs(w.get(t)! - 1 / 23) < 1e-12);
});
