import { test } from "node:test";
import assert from "node:assert/strict";
import { basketCsv, csvFileName } from "./csv";
import { relativeStats, seriesStats } from "./stats";
import { heldStrategy } from "./strategy";

const points = [
  { t: "2026-01-01", c: 100 },
  { t: "2026-01-02", c: 110 },
  { t: "2026-01-05", c: 105 },
];
const bench = [
  { t: "2026-01-01", c: 24000 },
  { t: "2026-01-02", c: 24240 },
  { t: "2026-01-05", c: 24480 },
];

test("stats, holdings and the rebased value line, with commas and quotes escaped", () => {
  const csv = basketCsv({
    name: 'EV, "4W" basket',
    range: "1Y",
    strategy: heldStrategy("equal"),
    benchName: "Nifty 50",
    points,
    bench,
    stats: seriesStats(points),
    rel: relativeStats(points, bench),
    holdings: [
      { ticker: "B", weight: 0.5, endWeight: 0.4, ret: -5, contribution: -2.5 },
      { ticker: "A", weight: 0.5, endWeight: 0.6, ret: 15, contribution: 7.5 },
    ],
    excluded: [{ ticker: "C", reason: "late", from: "2026-01-02T00:00:00Z" }],
    stocks: [
      { ticker: "C", name: "Gamma", layer: "Cells", pe: null, mcapCr: null },
      { ticker: "A", name: "Alpha Ltd", layer: "Cells", pe: 31.2, mcapCr: 12000 },
      { ticker: "B", name: "Beta, Inc", layer: "Motors", pe: null, mcapCr: null },
    ],
    exportedAt: new Date("2026-10-21T00:00:00Z"),
  });
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], 'Basket,"EV, ""4W"" basket"');
  assert.ok(lines.includes("Return %,5"));
  assert.ok(lines.includes("Weighting,Equal weight") && lines.includes("Rebalancing,bought and held"));
  assert.ok(!lines.some((l) => l.startsWith("Rebalance")));
  assert.ok(lines.includes("Max drawdown %,-4.5455"));
  // Holdings sorted by contribution, empty cells for missing figures.
  const a = lines.findIndex((l) => l.startsWith("A,"));
  const b = lines.findIndex((l) => l.startsWith("B,"));
  assert.ok(a > 0 && a < b);
  assert.equal(lines[a], "A,Alpha Ltd,Cells,50,60,15,7.5,31.2,12000");
  assert.equal(lines[b], 'B,"Beta, Inc",Motors,50,40,-5,-2.5,,');
  assert.ok(lines.includes("C,Gamma,listed during the period (from 2026-01-02)"));
  assert.ok(lines.includes("Best month,") && lines.includes("Months up,0 of 0"), "all within one month: no month figures");
  assert.deepEqual(lines.slice(-3), ["2026-01-01,100,100", "2026-01-02,110,101", "2026-01-05,105,102"]);
});

test("no benchmark: a two-column value line", () => {
  const csv = basketCsv({ name: "X", range: "1M", strategy: heldStrategy("mcap"), benchName: "Nifty 50", points, bench: null, stats: null, rel: null, holdings: [], stocks: [], exportedAt: new Date() });
  assert.ok(csv.includes("Date,Basket (100 = start)\r\n"));
  assert.ok(csv.trim().endsWith("2026-01-05,105"));
});

test("a rebalanced basket names its strategy and lists each rebalance", () => {
  const csv = basketCsv({
    name: "X",
    range: "5Y",
    strategy: { weighting: "capped", rebalance: "monthly", band: 5, cap: 15, layerCap: 35 },
    benchName: "Nifty 50",
    points,
    bench: null,
    stats: null,
    rel: null,
    holdings: [{ ticker: "A", weight: 1, endWeight: 1, ret: 5, contribution: 5 }],
    stocks: [],
    turnover: 12.5,
    trades: 4,
    rebalances: [{ t: "2026-01-05T00:00:00Z", turnover: 12.5, trades: 4 }],
    exportedAt: new Date(),
  });
  const lines = csv.trim().split("\r\n");
  assert.ok(lines.includes('Weighting,"Capped market cap (max 15% a stock, 35% a layer)"'));
  assert.ok(lines.includes("Rebalancing,rebalanced monthly"));
  assert.ok(lines.includes("Trades,4") && lines.includes("Turnover % (one way),12.5"));
  assert.ok(lines.some((l) => l.startsWith("Ticker,Name,Layer,Target weight %")));
  assert.ok(lines.includes("2026-01-05,12.5,4"));
});

test("file name", () => {
  assert.equal(csvFileName("EV 4W basket", "5Y", "Equal · monthly"), "ev-4w-basket-5Y-equal-monthly.csv");
  assert.equal(csvFileName("EV 4W basket", "1Y"), "ev-4w-basket-1Y.csv");
  assert.equal(csvFileName("!!!", "5Y"), "basket-5Y.csv");
});
