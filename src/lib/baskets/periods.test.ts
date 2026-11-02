import { test } from "node:test";
import assert from "node:assert/strict";
import { benchPeriodRet, onWindow, periodFigures } from "./periods";
import { runBacktest } from "./backtest";
import { onBenchWindow } from "./run";
import { shownPct } from "./fmt";

const near = (a: number | null | undefined, b: number) => assert.ok(a != null && Math.abs(a - b) < 1e-9, `${a} != ${b}`);
// The stored Nifty 50 over a year: five closes, -10% first to last.
const NIFTY = [
  { t: "2025-11-03", c: 100 },
  { t: "2025-11-04", c: 101 },
  { t: "2026-03-02", c: 95 },
  { t: "2026-07-01", c: 92 },
  { t: "2026-10-30", c: 90 },
];
const DAYS = NIFTY.map((p) => p.t);

test("the Nifty 50's period return is the same for two baskets whose stocks start on different days", () => {
  // One basket's stocks are there from the range's first day, the other's start two days in and
  // one of them, read live, runs on to today's tick.
  const early = [{ t: "2025-11-03", c: 10 }, { t: "2026-03-02", c: 12 }, { t: "2026-10-30", c: 13 }];
  const late = [{ t: "2025-11-05", c: 20 }, { t: "2026-03-02", c: 18 }, { t: "2026-10-30", c: 22 }, { t: "2026-11-02", c: 30 }];
  const run = (pts: { t: string; c: number }[]) => runBacktest([{ ticker: "X", weight: 1, points: onBenchWindow(pts, DAYS, "1Y") }], 10).points;
  const a = run(early);
  const b = run(late);
  assert.notEqual(a[0].t, "2025-11-05");
  const fa = periodFigures(a, NIFTY, "1Y")!;
  const fb = periodFigures(b, NIFTY, "1Y")!;
  const bench = benchPeriodRet(NIFTY, "1Y")!;
  near(bench, -10);
  // Each lead is its return against that one Nifty figure.
  near(fa.vs, shownPct(fa.ret) - shownPct(bench));
  near(fb.vs, shownPct(fb.ret) - shownPct(bench));
  near(fa.ret, 30);
  // The late basket ends on the window's last day (22), not on the live tick (30).
  near(fb.ret, 10);
});

test("a basket series is read over the window: flat before its first close, carried to the last day", () => {
  const pts = [{ t: "2025-11-05", c: 100 }, { t: "2026-07-01", c: 120 }, { t: "2026-11-02", c: 150 }];
  assert.deepEqual(onWindow(pts, NIFTY), [
    { t: "2025-11-03", c: 100 },
    { t: "2025-11-05", c: 100 },
    { t: "2026-07-01", c: 120 },
  ].concat([{ t: "2026-10-30", c: 120 }]));
});

test("shorter periods cut the Nifty's window, and every basket is measured over that same cut", () => {
  const nifty = [
    { t: "2026-10-26", c: 100 },
    { t: "2026-10-27", c: 102 },
    { t: "2026-10-28", c: 101 },
    { t: "2026-10-29", c: 104 },
    { t: "2026-10-30", c: 103 },
  ];
  const basket = [{ t: "2026-10-26", c: 100 }, { t: "2026-10-29", c: 110 }, { t: "2026-10-30", c: 121 }, { t: "2026-11-02", c: 200 }];
  near(benchPeriodRet(nifty, "1D"), (103 / 104 - 1) * 100);
  const f = periodFigures(basket, nifty, "1D")!;
  near(f.ret, 10);
  near(f.vs, shownPct(10) - shownPct((103 / 104 - 1) * 100));
});

test("onBenchWindow dates a stock's close before the first day to that day and drops closes after the last", () => {
  const pts = [{ t: "2025-10-31", c: 9 }, { t: "2025-11-04", c: 10 }, { t: "2026-10-30", c: 11 }, { t: "2026-11-02", c: 12 }];
  assert.deepEqual(onBenchWindow(pts, DAYS, "1Y"), [
    { t: "2025-11-03", c: 9 },
    { t: "2025-11-04", c: 10 },
    { t: "2026-10-30", c: 11 },
  ]);
  // MAX keeps the stock's earlier history (the index's can start later).
  assert.equal(onBenchWindow(pts, DAYS, "MAX")[0].t, "2025-10-31");
});
