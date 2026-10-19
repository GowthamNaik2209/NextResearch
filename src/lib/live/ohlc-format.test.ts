import assert from "node:assert/strict";
import { test } from "node:test";
import type { Quote } from "@/lib/live/yahoo";
import { barFor, fmtVolume, onSharedGrid, periodStart, samePeriod, sharedInterval, withLiveBar, type OhlcBar } from "./ohlc-format";

test("fmtVolume uses Indian units", () => {
  assert.equal(fmtVolume(8450), "8,450");
  assert.equal(fmtVolume(99_999), "99,999");
  assert.equal(fmtVolume(1_240_000), "12.4 L");
  assert.equal(fmtVolume(100_000), "1 L");
  assert.equal(fmtVolume(12_000_000), "1.2 Cr");
  assert.equal(fmtVolume(1_254_000_000), "125 Cr");
  assert.equal(fmtVolume(null), "—");
  assert.equal(fmtVolume(0), "0");
});

test("samePeriod groups by day, Monday-start week, and month", () => {
  assert.ok(samePeriod("2026-10-19", "2026-10-19", "1d"));
  assert.ok(!samePeriod("2026-10-19", "2026-10-20", "1d"));
  assert.ok(samePeriod("2026-10-19", "2026-10-25", "1wk")); // Mon..Sun
  assert.ok(!samePeriod("2026-10-18", "2026-10-19", "1wk")); // Sun | Mon
  assert.ok(samePeriod("2026-10-01", "2026-10-31", "1mo"));
  assert.ok(!samePeriod("2026-09-30", "2026-10-01", "1mo"));
});

const bars: OhlcBar[] = [
  { t: "2026-10-12", o: 100, h: 110, l: 95, c: 105, v: 1000 },
  { t: "2026-10-19", o: 105, h: 108, l: 101, c: 104, v: 500 },
];
const quote = (price: number, asOf: string): Quote => ({
  price, prevClose: 104, change: null, changePct: null, currency: "INR", asOf, delayedMin: 15, symbol: "X.NS", exchange: "NSE",
});

test("withLiveBar folds a same-period quote into the last bar and appends a later one", () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const daily: OhlcBar[] = [{ ...bars[0], t: ist }];
  const same = withLiveBar(daily, quote(120, now.toISOString()), "1d");
  assert.deepEqual(same.at(-1), { t: ist, o: 100, h: 120, l: 95, c: 120, v: 1000 });
  const older: OhlcBar[] = [{ ...bars[0], t: "2000-01-03" }];
  const added = withLiveBar(older, quote(90, now.toISOString()), "1d");
  assert.equal(added.length, 2);
  assert.deepEqual(added[1], { t: ist, o: 104, h: 104, l: 90, c: 90, v: null });
  // A stale quote changes nothing.
  assert.equal(withLiveBar(older, quote(90, "2001-01-01T00:00:00Z"), "1d"), older);
});

test("barFor finds the bar holding a date, within its period only", () => {
  assert.equal(barFor(bars, "2026-10-14", "1wk")?.t, "2026-10-12");
  assert.equal(barFor(bars, "2026-10-19", "1wk")?.t, "2026-10-19");
  assert.equal(barFor(bars, "2026-10-14", "1d"), null);
  assert.equal(barFor(bars, "2026-10-01", "1wk"), null);
});

test("periodStart gives the day, Monday or first of the month", () => {
  assert.equal(periodStart("2026-10-22", "1d"), "2026-10-22");
  assert.equal(periodStart("2026-10-22", "1wk"), "2026-10-19");
  assert.equal(periodStart("2026-10-19", "1wk"), "2026-10-19");
  assert.equal(periodStart("2026-10-25", "1wk"), "2026-10-19"); // Sunday
  assert.equal(periodStart("2026-10-22", "1mo"), "2026-10-01");
});

const days = (from: string, n: number, step: number) =>
  Array.from({ length: n }, (_, i) => ({ t: new Date(Date.parse(from) + i * step * 86_400_000).toISOString().slice(0, 10), c: 100 + i }));

test("sharedInterval takes the coarsest line's spacing", () => {
  assert.equal(sharedInterval([days("2026-01-05", 30, 1)]), "1d");
  assert.equal(sharedInterval([days("2026-01-05", 30, 1), days("2024-01-01", 30, 7)]), "1wk");
  assert.equal(sharedInterval([days("2026-01-05", 30, 7), days("2020-01-01", 30, 30)]), "1mo");
  assert.equal(sharedInterval([[{ t: "2026-01-05" }]]), "1d");
});

test("onSharedGrid folds daily closes into weekly steps beside a weekly line", () => {
  const weekly = days("2026-09-28", 4, 7); // Mondays 28 Sep .. 19 Oct
  const daily = [
    { t: "2026-10-08", c: 1 }, // Thu
    { t: "2026-10-09", c: 2 }, // Fri: last close of the week of 5 Oct
    { t: "2026-10-12", c: 3 },
    { t: "2026-10-16", c: 4 },
    { t: "2026-10-19", c: 5 },
  ];
  const [w, d] = onSharedGrid([weekly, daily]);
  assert.deepEqual(w, weekly);
  assert.deepEqual(d, [
    { t: "2026-10-05", c: 2 },
    { t: "2026-10-12", c: 4 },
    { t: "2026-10-19", c: 5 },
  ]);
  // Every date a line has is on the weekly line's grid, so the axis stays evenly spaced.
  assert.ok(d.every((p) => w.some((q) => q.t === p.t)));
});

test("onSharedGrid leaves all-daily lines as they are", () => {
  const a = days("2026-10-01", 10, 1);
  const b = days("2026-10-03", 8, 1);
  const out = onSharedGrid([a, b]);
  assert.equal(out[0], a);
  assert.equal(out[1], b);
});
