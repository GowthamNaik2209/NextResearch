import { test } from "node:test";
import assert from "node:assert/strict";
import { periodsPerYear, relativeStats, seriesStats } from "./stats";
import { monthlyCapture } from "./analysis";
import type { PricePoint } from "./backtest";

const near = (a: number | null | undefined, b: number, eps = 1e-9) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} != ${b}`);

// Consecutive calendar days (or weeks) from 1 Jan 2024, one close per entry.
const daily = (cs: number[], stepDays = 1): PricePoint[] =>
  cs.map((c, i) => ({ t: new Date(Date.UTC(2024, 0, 1) + i * stepDays * 86_400_000).toISOString().slice(0, 10), c }));

test("bar frequency is read from the dates", () => {
  assert.equal(periodsPerYear(daily([1, 2, 3, 4, 5])), 252);
  assert.equal(periodsPerYear(daily([1, 2, 3, 4, 5], 7)), 52);
  assert.equal(periodsPerYear(daily([1, 2, 3, 4, 5], 30)), 12);
});

test("return, drawdown with peak, trough and recovery", () => {
  const s = seriesStats(daily([100, 120, 90, 110, 130, 125]))!;
  near(s.ret, 25);
  near(s.maxDd, -25);
  assert.equal(s.ddPeak, "2024-01-02");
  assert.equal(s.ddTrough, "2024-01-03");
  assert.equal(s.ddRecovered, "2024-01-05");
  assert.equal(s.cagr, null, "under a year has no CAGR");
});

test("a drawdown not yet regained has no recovery date; a rising line has none at all", () => {
  assert.equal(seriesStats(daily([100, 80, 90]))!.ddRecovered, null);
  const up = seriesStats(daily([100, 101, 102]))!;
  near(up.maxDd, 0);
  assert.equal(up.ddPeak, null);
  assert.equal(up.sortino, null, "no down bars, no downside deviation");
});

test("CAGR over two years of weekly bars", () => {
  // 105 weekly bars ≈ 2.01 years, doubling: CAGR just under 41.4%.
  const cs = Array.from({ length: 105 }, (_, i) => 100 * Math.pow(2, i / 104));
  const pts = daily(cs, 7);
  const s = seriesStats(pts)!;
  const years = (Date.parse(pts[104].t) - Date.parse(pts[0].t)) / (365.25 * 86_400_000);
  near(s.cagr, (Math.pow(2, 1 / years) - 1) * 100, 1e-6);
  assert.equal(s.periodsPerYear, 52);
  near(s.vol, 0, 1e-6);
});

test("volatility and Sortino from bar returns", () => {
  // Returns +10%, -10%, +10%, -10% on daily bars.
  const s = seriesStats(daily([100, 110, 99, 108.9, 98.01]))!;
  const r = [0.1, -0.1, 0.1, -0.1];
  const sd = Math.sqrt(r.reduce((n, x) => n + x * x, 0) / 3);
  near(s.vol, sd * Math.sqrt(252) * 100);
  near(s.sortino, 0, 1e-12); // mean return 0
});

test("best and worst calendar month chain from month ends", () => {
  const pts: PricePoint[] = [
    { t: "2024-01-15", c: 100 },
    { t: "2024-01-31", c: 100 },
    { t: "2024-02-29", c: 110 },
    { t: "2024-03-29", c: 99 },
  ];
  const s = seriesStats(pts)!;
  assert.equal(s.bestMonth!.month, "2024-02");
  near(s.bestMonth!.ret, 10);
  assert.equal(s.worstMonth!.month, "2024-03");
  near(s.worstMonth!.ret, -10);
});

test("beta against a benchmark; capture waits for ten months", () => {
  const bench = daily([100, 110, 99, 108.9, 98.01]);
  // A line that moves exactly twice the index each bar.
  const line = daily([100, 120, 96, 115.2, 92.16]);
  const r = relativeStats(line, bench)!;
  near(r.beta, 2);
  assert.equal(r.upCapture, null);
  assert.equal(r.downCapture, null);
  near(r.benchRet, -1.99, 1e-9);
});

test("capture is the Capture panel's monthly figure, not a per-bar one", () => {
  // Month-end closes from Dec 2023 to Dec 2024: the index alternates +10% / -10% months and the
  // line does twice that. Inside one month, a daily wiggle the index doesn't have.
  const months = ["2023-12-29", "2024-01-31", "2024-02-29", "2024-03-29", "2024-04-30", "2024-05-31", "2024-06-28", "2024-07-31", "2024-08-30", "2024-09-30", "2024-10-31", "2024-11-29", "2024-12-31"];
  const bench: PricePoint[] = [];
  const line: PricePoint[] = [];
  let b = 100;
  let a = 100;
  months.forEach((t, i) => {
    if (i > 0) {
      const up = i % 2 === 1;
      b *= up ? 1.1 : 0.9;
      a *= up ? 1.2 : 0.8;
    }
    bench.push({ t, c: b });
    line.push({ t, c: a });
  });
  line.splice(1, 0, { t: "2024-01-15", c: line[0].c * 1.5 });
  bench.splice(1, 0, { t: "2024-01-15", c: bench[0].c });
  const r = relativeStats(line, bench)!;
  const m = monthlyCapture(line, bench);
  near(r.upCapture, m.upCapture!);
  near(r.downCapture, m.downCapture!);
  near(r.upCapture, 200, 1e-6);
  near(r.downCapture, 200, 1e-6);
});

test("the benchmark is read at the line's dates, carrying its last close over its holidays", () => {
  const bench: PricePoint[] = [
    { t: "2024-01-01", c: 100 },
    { t: "2024-01-03", c: 110 },
  ];
  const line = daily([100, 100, 110]);
  const r = relativeStats(line, bench)!;
  near(r.benchRet, 10);
});

test("too short to say anything", () => {
  assert.equal(seriesStats([{ t: "2024-01-01", c: 1 }]), null);
  assert.equal(relativeStats(daily([1, 2]), daily([1, 2])), null);
});
