import { test } from "node:test";
import assert from "node:assert/strict";
import { alignTo, drawdownEpisodes, monthlyCapture, monthlyMatrix, monthlyReturns, rollingReturn, underwater } from "./analysis";
import type { PricePoint } from "./backtest";

const near = (a: number | null | undefined, b: number, eps = 1e-9) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} != ${b}`);

// Consecutive calendar days (or weeks) from 1 Jan 2024, one close per entry.
const daily = (cs: number[], stepDays = 1, from = Date.UTC(2024, 0, 1)): PricePoint[] =>
  cs.map((c, i) => ({ t: new Date(from + i * stepDays * 86_400_000).toISOString().slice(0, 10), c }));

test("benchmark is carried to the line's dates, holidays filled by the last close", () => {
  const line = daily([1, 1, 1, 1]); // 1-4 Jan
  const bench: PricePoint[] = [
    { t: "2024-01-02", c: 10 },
    { t: "2024-01-04", c: 12 }, // 3 Jan is a benchmark holiday
  ];
  assert.deepEqual(alignTo(line, bench), [
    { t: "2024-01-02", c: 10 },
    { t: "2024-01-03", c: 10 },
    { t: "2024-01-04", c: 12 },
  ]);
});

test("underwater: % below the running high, zero on new highs", () => {
  const u = underwater(daily([100, 120, 90, 110, 130]));
  assert.deepEqual(u.map((p) => p.t), ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"]);
  near(u[0].dd, 0);
  near(u[1].dd, 0);
  near(u[2].dd, -25);
  near(u[3].dd, (110 / 120 - 1) * 100);
  near(u[4].dd, 0);
  assert.ok(underwater(daily([1, 2, 3])).every((p) => p.dd === 0), "a rising line is never underwater");
  assert.deepEqual(underwater([]), []);
});

test("drawdown episodes: deepest first, recovered and unrecovered", () => {
  // Episode A: 120 → 90 → back at 130 (5 Jan). Episode B: 130 → 117 → 104, not regained.
  const eps = drawdownEpisodes(daily([100, 120, 90, 110, 130, 117, 104]), 5);
  assert.equal(eps.length, 2);
  near(eps[0].depth, -25);
  assert.equal(eps[0].peak, "2024-01-02");
  assert.equal(eps[0].trough, "2024-01-03");
  assert.equal(eps[0].recovered, "2024-01-05");
  assert.equal(eps[0].days, 3);
  near(eps[1].depth, -20);
  assert.equal(eps[1].peak, "2024-01-05");
  assert.equal(eps[1].trough, "2024-01-07");
  assert.equal(eps[1].recovered, null);
  assert.equal(eps[1].days, 2, "unrecovered: peak to the last bar");
});

test("drawdown episodes: none on a rising line, top n only, a flat retest counts as recovered", () => {
  assert.deepEqual(drawdownEpisodes(daily([1, 2, 2, 3])), []);
  assert.deepEqual(drawdownEpisodes([]), []);
  const eps = drawdownEpisodes(daily([100, 95, 100, 90, 100, 80, 100]), 2);
  assert.deepEqual(eps.map((e) => Math.round(e.depth)), [-20, -10]);
  assert.ok(eps.every((e) => e.recovered));
});

test("drawdown episodes on weekly bars count calendar days", () => {
  const eps = drawdownEpisodes(daily([100, 90, 95, 101], 7));
  assert.equal(eps.length, 1);
  assert.equal(eps[0].days, 21);
});

test("monthly returns chain month ends; first month from the first close", () => {
  const pts: PricePoint[] = [
    { t: "2024-01-15", c: 100 },
    { t: "2024-01-31", c: 110 },
    { t: "2024-02-29", c: 99 },
    { t: "2024-03-10", c: 120 },
    { t: "2024-03-28", c: 108.9 },
  ];
  const m = monthlyReturns(pts);
  assert.deepEqual(m.map((x) => [x.year, x.month]), [[2024, 0], [2024, 1], [2024, 2]]);
  near(m[0].ret, 10);
  near(m[1].ret, -10);
  near(m[2].ret, 10);
});

test("monthly returns: a single month, and a first month of one bar", () => {
  const one = monthlyReturns(daily([100, 105]));
  assert.equal(one.length, 1);
  near(one[0].ret, 5);
  const m = monthlyReturns([
    { t: "2024-01-31", c: 100 },
    { t: "2024-02-15", c: 102 },
    { t: "2024-02-29", c: 110 },
  ]);
  assert.equal(m.length, 1, "a lone first bar is a starting close, not a month");
  assert.equal(m[0].month, 1);
  near(m[0].ret, 10);
  assert.deepEqual(monthlyReturns([{ t: "2024-01-31", c: 100 }]), []);
});

test("monthly returns on weekly bars across a year end", () => {
  const pts = daily([100, 101, 102, 103, 104, 105, 106, 107], 7, Date.UTC(2023, 11, 1)); // 1 Dec 2023 .. 19 Jan 2024
  const m = monthlyReturns(pts);
  assert.deepEqual(m.map((x) => [x.year, x.month]), [[2023, 11], [2024, 0]]);
  near(m[0].ret, (104 / 100 - 1) * 100); // last December bar is 29 Dec (index 4)
  near(m[1].ret, (107 / 104 - 1) * 100);
});

test("monthly matrix: years × months, compounded year totals, benchmark beside", () => {
  const basket: PricePoint[] = [
    { t: "2023-11-30", c: 100 },
    { t: "2023-12-29", c: 110 },
    { t: "2024-01-31", c: 121 },
    { t: "2024-02-29", c: 108.9 },
  ];
  const bench: PricePoint[] = [
    { t: "2023-11-30", c: 50 },
    { t: "2023-12-28", c: 55 }, // holiday on the 29th: carried
    { t: "2024-01-31", c: 55 },
    { t: "2024-02-29", c: 66 },
  ];
  const rows = monthlyMatrix(basket, bench);
  assert.deepEqual(rows.map((r) => r.year), [2023, 2024]);
  near(rows[0].months[11], 10);
  near(rows[0].bench[11], 10);
  assert.equal(rows[0].months[0], null);
  near(rows[0].total, 10);
  near(rows[1].months[0], 10);
  near(rows[1].months[1], -10);
  near(rows[1].total, (1.1 * 0.9 - 1) * 100);
  near(rows[1].bench[0], 0);
  near(rows[1].bench[1], 20);
  near(rows[1].benchTotal, 20);
});

test("monthly matrix with no benchmark data leaves benchmark cells empty", () => {
  const rows = monthlyMatrix(daily([100, 110, 120]), []);
  assert.equal(rows.length, 1);
  assert.ok(rows[0].bench.every((x) => x == null));
  assert.equal(rows[0].benchTotal, null);
});

test("rolling return uses a date window, not a bar count", () => {
  // Weekly bars doubling every 52 weeks (364 days): a 364-day window gives exactly +100%.
  const cs = Array.from({ length: 60 }, (_, i) => 100 * Math.pow(2, i / 52));
  const r = rollingReturn(daily(cs, 7), 364);
  assert.equal(r.length, 60 - 52);
  near(r[0].ret, 100, 1e-9);
  assert.equal(r[0].t, daily(cs, 7)[52].t);
  // With a 365-day window the start falls between bars: the close on or before it (bar 0 again).
  const r365 = rollingReturn(daily(cs, 7), 365);
  assert.equal(r365.length, 60 - 53);
  near(r365[0].ret, (Math.pow(2, 53 / 52) / Math.pow(2, 0) - 1) * 100, 1e-9);
});

test("rolling return across benchmark-style gaps and too-short series", () => {
  assert.deepEqual(rollingReturn(daily([1, 2, 3]), 365), []);
  assert.deepEqual(rollingReturn([], 365), []);
  const pts: PricePoint[] = [
    { t: "2024-01-01", c: 100 },
    { t: "2024-01-05", c: 110 }, // window start 3 Jan falls in a gap: reads 1 Jan
    { t: "2024-01-06", c: 120 },
  ];
  const r = rollingReturn(pts, 2);
  near(r[0].ret, 10);
  near(r[1].ret, 20); // 4 Jan start also falls in the gap: still 1 Jan
  assert.equal(r.length, 2);
});

test("monthly capture: up/down on benchmark months, months beating it", () => {
  // Month ends; the basket does 2× the benchmark's month in every month.
  const bench: PricePoint[] = [
    { t: "2024-01-01", c: 100 },
    { t: "2024-01-31", c: 110 }, // +10
    { t: "2024-02-29", c: 99 }, // -10
    { t: "2024-03-29", c: 108.9 }, // +10
  ];
  const basket: PricePoint[] = [
    { t: "2024-01-01", c: 100 },
    { t: "2024-01-31", c: 120 }, // +20
    { t: "2024-02-29", c: 96 }, // -20
    { t: "2024-03-29", c: 115.2 }, // +20
  ];
  const c = monthlyCapture(basket, bench);
  near(c.upCapture, 200);
  near(c.downCapture, 200);
  assert.equal(c.upMonths, 2);
  assert.equal(c.downMonths, 1);
  assert.equal(c.beat, 2);
  assert.equal(c.months, 3);
});

test("monthly capture with only rising benchmark months has no down capture", () => {
  const c = monthlyCapture(daily([100, 101, 102]), daily([10, 11, 12]));
  assert.equal(c.downCapture, null);
  assert.equal(c.downMonths, 0);
  assert.equal(c.months, 1);
  assert.equal(monthlyCapture(daily([100, 101]), []).months, 0);
});
