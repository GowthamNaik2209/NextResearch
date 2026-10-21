import { test } from "node:test";
import assert from "node:assert/strict";
import { runBacktest } from "./backtest";
import { runRebalanced, targetWeights } from "./rebalance";
import { heldStrategy, parseStrategy, strategyQuery, strategyShort } from "./strategy";

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

test("layer-balanced: equal per layer, then equal within", () => {
  const w = targetWeights(
    [
      { ticker: "A", mcapCr: 1, layer: "Cells" },
      { ticker: "B", mcapCr: 1, layer: "Cells" },
      { ticker: "C", mcapCr: 1, layer: "Cells" },
      { ticker: "D", mcapCr: 1, layer: "Motors" },
    ],
    "layer",
  );
  near(w.get("D")!, 0.5);
  near(w.get("A")!, 1 / 6);
  near(sum(w), 1);
});

test("capped market cap holds every stock and layer to its cap", () => {
  const stocks = [
    { ticker: "BIG", mcapCr: 1000, layer: "OEM" },
    { ticker: "OEM2", mcapCr: 300, layer: "OEM" },
    { ticker: "OEM3", mcapCr: 200, layer: "OEM" },
    ...["C1", "C2", "C3", "C4", "C5"].map((t) => ({ ticker: t, mcapCr: 50, layer: "Cells" })),
    ...["M1", "M2", "M3"].map((t) => ({ ticker: t, mcapCr: 40, layer: "Motors" })),
    { ticker: "X", mcapCr: null, layer: "Chargers" },
  ];
  const w = targetWeights(stocks, "capped", 15, 35);
  near(sum(w), 1);
  for (const v of w.values()) assert.ok(v <= 0.15 + 1e-9, `stock ${v}`);
  const byLayer = new Map<string, number>();
  for (const s of stocks) byLayer.set(s.layer, (byLayer.get(s.layer) ?? 0) + w.get(s.ticker)!);
  for (const v of byLayer.values()) assert.ok(v <= 0.35 + 1e-9, `layer ${v}`);
  near(w.get("BIG")!, 0.15);
  // The giant is capped; the rest of its layer's 35% goes to the others by market cap (300:200).
  near(w.get("OEM2")!, 0.12);
  near(w.get("OEM3")!, 0.08);
  near(byLayer.get("OEM")!, 0.35);
  near(byLayer.get("Cells")!, 0.35);
});

test("a cap too tight for the basket is loosened to equal weights", () => {
  const w = targetWeights(
    [
      { ticker: "A", mcapCr: 900, layer: "L" },
      { ticker: "B", mcapCr: 100, layer: "L" },
    ],
    "capped",
    15,
    35,
  );
  near(w.get("A")!, 0.5);
  near(w.get("B")!, 0.5);
});

test("caps that can't all hold together go over as little as the basket allows", () => {
  // A lone stock in its layer can hold at most 15%, so the other layer has to take 85%.
  const w = targetWeights(
    [
      { ticker: "SOLO", mcapCr: 500, layer: "A" },
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ ticker: `B${i}`, mcapCr: 10, layer: "B" })),
    ],
    "capped",
    15,
    35,
  );
  near(sum(w), 1);
  assert.ok(w.get("SOLO")! >= 0.15 - 1e-9);
});

test("plain cap weights match the held backtest's (median for a missing figure)", () => {
  const w = targetWeights(
    [
      { ticker: "A", mcapCr: 100, layer: "L" },
      { ticker: "B", mcapCr: 300, layer: "L" },
      { ticker: "C", mcapCr: null, layer: "L" },
    ],
    "mcap",
  );
  near(w.get("C")!, 300 / 700);
});

test("strategy query: the default is the old w= only, and it round-trips", () => {
  assert.equal(strategyQuery(heldStrategy("equal")), "w=equal");
  assert.equal(strategyQuery(heldStrategy("mcap")), "w=mcap");
  const s = { weighting: "capped" as const, rebalance: "drift" as const, band: 10, cap: 20, layerCap: 50 };
  const q = strategyQuery(s);
  assert.equal(q, "w=capped&cap=20&lcap=50&rb=drift&band=10");
  assert.deepEqual(parseStrategy(new URLSearchParams(q)), s);
  // Junk falls back to the defaults, and numbers are clamped.
  const j = parseStrategy(new URLSearchParams("w=bogus&rb=daily&band=999&cap=-3"), "mcap");
  assert.equal(j.weighting, "mcap");
  assert.equal(j.rebalance, "never");
  assert.equal(j.band, 50);
  assert.equal(j.cap, 1);
  assert.equal(strategyShort(s), "Capped 20/50 · drift 10 pts");
});
