import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_DAILY_RETURNS, MIN_WEEKLY_RETURNS, periodsPerYear, relativeStats, seriesStats } from "./stats";
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

// Weekday closes moving in a straight line from each anchor to the next.
const path = (anchors: PricePoint[]): PricePoint[] => {
  const out: PricePoint[] = [anchors[0]];
  for (let k = 1; k < anchors.length; k++) {
    const t0 = Date.parse(anchors[k - 1].t);
    const t1 = Date.parse(anchors[k].t);
    for (let t = t0 + 86_400_000; t <= t1; t += 86_400_000) {
      if (t < t1 && new Date(t).getUTCDay() % 6 === 0) continue;
      out.push({ t: new Date(t).toISOString().slice(0, 10), c: anchors[k - 1].c + ((anchors[k].c - anchors[k - 1].c) * (t - t0)) / (t1 - t0) });
    }
  }
  return out;
};

// Closes for alternating bar returns +a, -a, … (n returns).
const zigzag = (n: number, a: number, start = 100) => {
  const cs = [start];
  for (let i = 0; i < n; i++) cs.push(cs[i] * (i % 2 ? 1 - a : 1 + a));
  return cs;
};

test("volatility and Sortino from bar returns", () => {
  // Returns +10%, -10%, … on 20 daily bars.
  const s = seriesStats(daily(zigzag(20, 0.1)))!;
  const r = Array.from({ length: 20 }, (_, i) => (i % 2 ? -0.1 : 0.1));
  const sd = Math.sqrt(r.reduce((n, x) => n + x * x, 0) / (r.length - 1));
  near(s.vol, sd * Math.sqrt(252) * 100);
  near(s.sortino, 0, 1e-12); // mean return 0
});

test("a few days of prices: return and drawdown, but no volatility, beta or best month", () => {
  // A stock listed four trading days ago.
  const pts: PricePoint[] = [
    { t: "2026-10-29", c: 100 },
    { t: "2026-10-30", c: 96 },
    { t: "2026-10-31", c: 103 },
    { t: "2026-11-02", c: 101 },
  ];
  const s = seriesStats(pts)!;
  near(s.ret, 1);
  near(s.maxDd, -4);
  assert.equal(s.vol, null);
  assert.equal(s.sortino, null);
  assert.equal(s.bestMonth, null, "four days across a month end: too few bars");
  assert.equal(s.worstMonth, null);
  assert.equal(s.months, 0, "October and November, but four days of them");
  const bench = pts.map((p, i) => ({ t: p.t, c: [100, 101, 99, 100][i] }));
  const r = relativeStats(pts, bench)!;
  assert.equal(r.beta, null);
  near(r.benchRet, 0);
  // One return short of the minimum: still none; at it, a figure.
  assert.equal(seriesStats(daily(zigzag(MIN_DAILY_RETURNS - 1, 0.1)))!.vol, null);
  assert.equal(seriesStats(daily(zigzag(MIN_WEEKLY_RETURNS - 1, 0.1), 7))!.vol, null);
  assert.ok(seriesStats(daily(zigzag(MIN_WEEKLY_RETURNS, 0.1), 7))!.vol! > 0, "weekly bars need a quarter, not 20 bars");
});

test("the first, part, month counts from the first bar", () => {
  // A 1M range on weekdays, 5 Oct to 2 Nov: October (5th to 30th, 100 → 95) from its first close,
  // November (one day, +0.8%) from October's last.
  const oct: string[] = [];
  for (let d = 5; d <= 31; d++) {
    const t = `2026-10-${String(d).padStart(2, "0")}`;
    if (new Date(`${t}T00:00:00Z`).getUTCDay() % 6) oct.push(t);
  }
  const pts: PricePoint[] = [...oct.map((t, i) => ({ t, c: 100 - (5 * i) / (oct.length - 1) })), { t: "2026-11-02", c: 95.76 }];
  const s = seriesStats(pts)!;
  assert.equal(s.periodsPerYear, 252);
  assert.equal(s.months, 2);
  assert.equal(s.upMonths, 1);
  assert.equal(s.worstMonth!.month, "2026-10");
  near(s.worstMonth!.ret, -5);
  assert.equal(s.bestMonth!.month, "2026-11");
  near(s.bestMonth!.ret, 0.8);
  // A first month of one bar has no return of its own: it is only the base for the next.
  const one = seriesStats([{ t: "2026-09-30", c: 100 }, ...pts])!;
  assert.equal(one.months, 2);
  near(one.worstMonth!.ret, -5);
});

test("best and worst calendar month chain from month ends", () => {
  // January (15th to 31st, flat) counts from its first bar.
  const pts = path([
    { t: "2024-01-15", c: 100 },
    { t: "2024-01-31", c: 100 },
    { t: "2024-02-29", c: 110 },
    { t: "2024-03-29", c: 99 },
  ]);
  const s = seriesStats(pts)!;
  assert.equal(s.periodsPerYear, 252);
  assert.equal(s.bestMonth!.month, "2024-02");
  near(s.bestMonth!.ret, 10);
  assert.equal(s.worstMonth!.month, "2024-03");
  near(s.worstMonth!.ret, -10);
  assert.equal(s.months, 3);
  assert.equal(s.upMonths, 1);
});

test("beta against a benchmark; capture waits for ten months", () => {
  const n = 20;
  const bench = daily(zigzag(n, 0.1));
  // A line that moves exactly twice the index each bar.
  const line = daily(zigzag(n, 0.2));
  const r = relativeStats(line, bench)!;
  near(r.beta, 2);
  assert.equal(r.upCapture, null);
  assert.equal(r.downCapture, null);
  near(r.benchRet, (Math.pow(1.1 * 0.9, n / 2) - 1) * 100, 1e-9);
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
