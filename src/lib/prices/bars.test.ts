import { test } from "node:test";
import assert from "node:assert/strict";
import { historyChanged, rollUp, splitLike, sinceDays, storedRange, toCandles, toPoints, type StoredBar } from "./bars";

const bar = (t: string, c: number, extra: Partial<StoredBar> = {}): StoredBar => ({ t, o: c, h: c + 1, l: c - 1, c, v: 100, ...extra });

test("weekly roll-up: Monday-dated, first open, high/low extremes, last close, summed volume", () => {
  // Wed 1 Jan 2025 to Tue 7 Jan: two weeks (30 Dec and 6 Jan).
  const days = [bar("2025-01-01", 10, { o: 9, h: 12 }), bar("2025-01-02", 11, { l: 8 }), bar("2025-01-03", 13), bar("2025-01-06", 14), bar("2025-01-07", 15, { v: null })];
  const w = rollUp(days, "1wk");
  assert.deepEqual(w, [
    { t: "2024-12-30", o: 9, h: 14, l: 8, c: 13, v: 300 },
    { t: "2025-01-06", o: 14, h: 16, l: 13, c: 15, v: 100 },
  ]);
  // The input is left as it was.
  assert.equal(days[0].t, "2025-01-01");
});

test("monthly roll-up dates bars on the 1st", () => {
  const m = rollUp([bar("2025-01-30", 10), bar("2025-01-31", 11), bar("2025-02-03", 12)], "1mo");
  assert.deepEqual(toPoints(m), [
    { t: "2025-01-01", c: 11 },
    { t: "2025-02-01", c: 12 },
  ]);
});

test("closes-only bars roll up and give no candles", () => {
  const closes = [bar("2025-01-06", 10, { o: null, h: null, l: null, v: null }), bar("2025-01-07", 11, { o: null, h: null, l: null, v: null })];
  assert.deepEqual(rollUp(closes, "1wk"), [{ t: "2025-01-06", o: null, h: null, l: null, c: 11, v: null }]);
  assert.equal(toCandles(closes), null);
  assert.equal(toCandles([bar("2025-01-06", 10)])?.length, 1);
});

test("ranges: daily up to 2Y, weekly for 3Y and 5Y, none for All", () => {
  assert.deepEqual(storedRange("1Y"), { days: 366, interval: "1d" });
  assert.equal(storedRange("5Y")?.interval, "1wk");
  assert.equal(storedRange("MAX"), null);
});

test("sinceDays keeps bars from that many days back", () => {
  const now = Date.parse("2025-01-10T12:00:00Z");
  assert.deepEqual(
    sinceDays([bar("2025-01-01", 1), bar("2025-01-03", 2), bar("2025-01-09", 3)], 7, now).map((b) => b.t),
    ["2025-01-03", "2025-01-09"],
  );
});

test("history changed: a stored close moved by more than 2% (a split adjusted afterwards)", () => {
  const stored = new Map([
    ["2025-01-06", 100],
    ["2025-01-07", 102],
  ]);
  assert.equal(historyChanged(stored, [{ t: "2025-01-07", c: 102.5 }, { t: "2025-01-08", c: 90 }]), false);
  assert.equal(historyChanged(stored, [{ t: "2025-01-07", c: 51 }]), true);
  assert.equal(historyChanged(new Map(), [{ t: "2025-01-07", c: 51 }]), false);
});

test("split-like jumps: a 2:1 drop after the last stored close, or within the new bars", () => {
  assert.equal(splitLike(200, [{ c: 101 }, { c: 99 }]), true);
  assert.equal(splitLike(100, [{ c: 104 }, { c: 52 }]), true);
  assert.equal(splitLike(100, [{ c: 90 }, { c: 120 }]), false);
  assert.equal(splitLike(null, [{ c: 100 }, { c: 98 }]), false);
});
