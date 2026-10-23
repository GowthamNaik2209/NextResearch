import { test } from "node:test";
import assert from "node:assert/strict";
import { basketWeights, runBacktest } from "./backtest";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("equal-weight buy and hold: value follows the average of relative prices", () => {
  const r = runBacktest(
    [
      { ticker: "A", weight: 1, points: [{ t: "2026-01-01", c: 100 }, { t: "2026-01-02", c: 200 }] },
      { ticker: "B", weight: 1, points: [{ t: "2026-01-01", c: 50 }, { t: "2026-01-02", c: 50 }] },
    ],
    10,
  );
  assert.deepEqual(r.points.map((p) => p.c), [100, 150]);
  const a = r.holdings.find((h) => h.ticker === "A")!;
  near(a.ret, 100);
  near(a.contribution, 50);
  near(a.endWeight, 2 / 3);
  near(r.holdings.reduce((n, h) => n + h.contribution, 0), 50);
});

test("weights are normalised and a missing bar carries the last close forward", () => {
  const r = runBacktest(
    [
      { ticker: "A", weight: 3, points: [{ t: "2026-01-01", c: 10 }, { t: "2026-01-03", c: 20 }] },
      { ticker: "B", weight: 1, points: [{ t: "2026-01-01", c: 10 }, { t: "2026-01-02", c: 5 }, { t: "2026-01-03", c: 5 }] },
    ],
    10,
  );
  assert.deepEqual(r.points.map((p) => p.t), ["2026-01-01", "2026-01-02", "2026-01-03"]);
  near(r.points[1].c, 100 * (0.75 * 1 + 0.25 * 0.5));
  near(r.points[2].c, 100 * (0.75 * 2 + 0.25 * 0.5));
});

test("a stock listed mid-period and one with no data are left out and reported", () => {
  const r = runBacktest(
    [
      { ticker: "A", weight: 1, points: [{ t: "2025-01-01", c: 10 }, { t: "2026-01-01", c: 11 }] },
      { ticker: "NEW", weight: 1, points: [{ t: "2025-09-01", c: 10 }, { t: "2026-01-01", c: 30 }] },
      { ticker: "GONE", weight: 1, points: null },
    ],
    10,
  );
  assert.deepEqual(r.holdings.map((h) => h.ticker), ["A"]);
  assert.deepEqual(r.excluded, [
    { ticker: "GONE", reason: "no-data" },
    { ticker: "NEW", reason: "late", from: "2025-09-01" },
  ]);
  near(r.points[r.points.length - 1].c, 110);
});

test("nothing to hold gives an empty result", () => {
  assert.deepEqual(runBacktest([{ ticker: "X", weight: 1, points: [] }], 10).points, []);
});

test("cap weights fall back to the median for a stock with no figure", () => {
  const w = basketWeights(
    [
      { ticker: "A", mcapCr: 100 },
      { ticker: "B", mcapCr: 300 },
      { ticker: "C", mcapCr: 200 },
      { ticker: "D", mcapCr: null },
    ],
    "mcap",
  );
  assert.equal(w.get("D"), 200);
  assert.equal(basketWeights([{ ticker: "A", mcapCr: 5 }], "equal").get("A"), 1);
});

// ---- stocks joining on their own start date (listed during the period) ----

const late = () => [
  { ticker: "OLD", weight: 1, points: [{ t: "2026-01-01", c: 100 }, { t: "2026-02-01", c: 200 }, { t: "2026-03-01", c: 200 }] },
  // Listed a month in, far past the slack: joins on its first bar.
  { ticker: "NEW", weight: 1, points: [{ t: "2026-02-01", c: 10 }, { t: "2026-03-01", c: 20 }] },
];

test("without joining, a stock listed mid-period is left out as late", () => {
  const r = runBacktest(late(), 10);
  assert.deepEqual(r.holdings.map((h) => h.ticker), ["OLD"]);
  assert.deepEqual(r.excluded, [{ ticker: "NEW", reason: "late", from: "2026-02-01" }]);
});

test("joinLate: a late stock joins on its first bar at an equal share, paid for by the others", () => {
  const r = runBacktest(late(), 10, { joinLate: true });
  assert.deepEqual(r.excluded, []);
  // 100 -> 200 on OLD alone; then half goes into NEW (which doubles), half stays flat in OLD.
  assert.deepEqual(r.points.map((p) => p.c), [100, 200, 300]);
  const old = r.holdings.find((h) => h.ticker === "OLD")!;
  const nw = r.holdings.find((h) => h.ticker === "NEW")!;
  near(old.weight, 1); // bought as the whole basket
  near(nw.weight, 0.5); // bought at 1/2 of the basket on joining
  assert.equal(nw.joined, "2026-02-01");
  assert.equal(old.joined, undefined);
  near(nw.ret, 100); // its own return from its listing
  near(old.ret, 100);
  // Points added still sum to the basket's return: OLD 100 (before NEW joined), NEW 100.
  near(old.contribution, 100);
  near(nw.contribution, 100);
  near(old.endWeight + nw.endWeight, 1);
  near(nw.endWeight, 2 / 3);
});

test("a stock's own start date trims its earlier bars and makes it join then", () => {
  const input = [
    { ticker: "A", weight: 1, points: [{ t: "2026-01-01", c: 10 }, { t: "2026-02-01", c: 10 }, { t: "2026-03-01", c: 10 }] },
    { ticker: "B", weight: 1, from: "2026-02-01", points: [{ t: "2026-01-01", c: 1 }, { t: "2026-02-01", c: 50 }, { t: "2026-03-01", c: 100 }] },
  ];
  const r = runBacktest(input, 10);
  assert.deepEqual(r.points.map((p) => p.c), [100, 100, 150]);
  near(r.holdings.find((h) => h.ticker === "B")!.ret, 100);
});

test("joining with custom-style weights: the newcomer takes its share of the weights then held", () => {
  const input = [
    { ticker: "A", weight: 3, points: [{ t: "2026-01-01", c: 10 }, { t: "2026-02-01", c: 10 }, { t: "2026-03-01", c: 10 }] },
    { ticker: "B", weight: 1, points: [{ t: "2026-02-01", c: 10 }, { t: "2026-03-01", c: 30 }] },
  ];
  const r = runBacktest(input, 10, { joinLate: true });
  near(r.holdings.find((h) => h.ticker === "B")!.weight, 0.25);
  // B is a quarter of the basket and triples: +50%.
  near(r.points[2].c, 150);
});

test("with no late stock, joinLate changes nothing", () => {
  const input = [
    { ticker: "A", weight: 1, points: [{ t: "2026-01-01", c: 100 }, { t: "2026-01-02", c: 200 }] },
    { ticker: "B", weight: 1, points: [{ t: "2026-01-01", c: 50 }, { t: "2026-01-02", c: 50 }] },
  ];
  assert.deepEqual(runBacktest(input, 10, { joinLate: true }), runBacktest(input, 10));
});
