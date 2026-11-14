import { test } from "node:test";
import assert from "node:assert/strict";
import * as I from "./indicators";

const near = (a: number | null | undefined, b: number, eps = 1e-6) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} != ${b}`);

test("SMA waits for a full window and restarts after a gap", () => {
  assert.deepEqual(I.sma([1, 2, 3, 4], 2), [null, 1.5, 2.5, 3.5]);
  assert.deepEqual(I.sma([1, 2, null, 4, 5], 2), [null, 1.5, null, null, 4.5]);
});

test("EMA is seeded with the simple average, then smooths by 2/(n+1)", () => {
  const e = I.ema([2, 4, 6, 8], 3);
  assert.deepEqual(e.slice(0, 2), [null, null]);
  near(e[2], 4);
  near(e[3], 4 + 0.5 * (8 - 4));
});

test("RSI: all gains is 100, all losses 0, alternating equal moves 50", () => {
  const up = Array.from({ length: 20 }, (_, i) => 100 + i);
  const down = up.slice().reverse();
  near(I.rsi(up, 14)[19], 100);
  near(I.rsi(down, 14)[19], 0);
  const zig = Array.from({ length: 30 }, (_, i) => (i % 2 ? 101 : 100));
  const r = I.rsi(zig, 14)[29] as number;
  assert.ok(r > 40 && r < 60, String(r));
  assert.equal(I.rsi(up, 14)[13], null);
});

test("RSI matches a hand-worked Wilder figure", () => {
  // 3-day RSI: changes +1, +1, −1 seed avg gain 2/3, loss 1/3 -> RS 2 -> RSI 66.67; then +2.
  const r = I.rsi([10, 11, 12, 11, 13], 3);
  near(r[3], 100 - 100 / 3);
  // avg gain (2/3·2 + 2)/3 = 10/9, avg loss (1/3·2)/3 = 2/9 -> RS 5 -> 83.33
  near(r[4], 100 - 100 / 6);
});

test("true range takes the gap from the day before's close", () => {
  const tr = I.trueRange([10, 12, 15], [9, 11, 13], [9.5, 11.5, 14]);
  assert.deepEqual(tr, [1, 2.5, 3.5]);
});

test("highest and lowest, with 'before' leaving today out", () => {
  const x = [3, 1, 4, 1, 5];
  assert.deepEqual(I.highest(x, 2), [null, 3, 4, 4, 5]);
  assert.deepEqual(I.highest(x, 2, true), [null, null, 3, 4, 4]);
  assert.deepEqual(I.lowest(x, 3), [null, null, 1, 1, 1]);
});

test("Bollinger: a flat series has zero width and %B in the middle", () => {
  const b = I.bollinger(new Array(25).fill(50));
  near(b.mid[24], 50);
  near(b.width[24], 0);
  near(b.pctB[24], 0.5);
});

test("MACD of a steady rise is positive and its histogram settles towards zero", () => {
  const c = Array.from({ length: 120 }, (_, i) => 100 + i);
  const m = I.macd(c);
  assert.ok((m.line[119] as number) > 0);
  assert.ok(Math.abs(m.hist[119] as number) < 0.05);
  assert.equal(m.signal[32], null);
  assert.ok(m.signal[33] != null);
});

test("ADX is high and +DI leads in a steady up trend", () => {
  const n = 80;
  const c = Array.from({ length: n }, (_, i) => 100 + i);
  const h = c.map((x) => x + 1), l = c.map((x) => x - 1);
  const a = I.adx(h, l, c);
  assert.ok((a.adx[n - 1] as number) > 50);
  assert.ok((a.pdi[n - 1] as number) > (a.mdi[n - 1] as number));
});

test("Supertrend sits under the price in an up trend and flips above after a fall", () => {
  const up = Array.from({ length: 40 }, (_, i) => 100 + i);
  const down = Array.from({ length: 20 }, (_, i) => 139 - i * 4);
  const c = [...up, ...down];
  const h = c.map((x) => x + 1), l = c.map((x) => x - 1);
  const st = I.supertrend(h, l, c);
  assert.ok((st[39] as number) < c[39]);
  assert.ok((st[59] as number) > c[59]);
});

test("Parabolic SAR trails under a rising price", () => {
  const c = Array.from({ length: 30 }, (_, i) => 100 + i);
  const s = I.psar(c.map((x) => x + 0.5), c.map((x) => x - 0.5));
  for (let i = 2; i < 30; i++) assert.ok((s[i] as number) < c[i] - 0.5 + 1e-9, `day ${i}`);
});

test("Stochastic and Williams %R read the close's place in the range", () => {
  const c = Array.from({ length: 20 }, (_, i) => 100 + i);
  const h = c.slice(), l = c.slice();
  near(I.stochastic(h, l, c).k[19], 100);
  near(I.williamsR(h, l, c)[19], 0);
});

test("Aroon up is 100 on a new high, and counts down as the high ages", () => {
  const h = [...Array.from({ length: 26 }, (_, i) => i), 10, 10];
  const a = I.aroon(h, h, 25);
  near(a.up[25], 100);
  near(a.up[27], 100 * (25 - 2) / 25);
});

test("OBV adds volume on up days and takes it on down days", () => {
  assert.deepEqual(I.obv([10, 11, 10, 10], [5, 7, 3, 9]), [0, 7, 4, 4]);
});

test("CMF is +1 when every close is the high, −1 when it is the low", () => {
  const h = new Array(20).fill(11), l = new Array(20).fill(9), v = new Array(20).fill(100);
  near(I.cmf(h, l, h, v)[19], 1);
  near(I.cmf(h, l, l, v)[19], -1);
});

test("beta of a stock that moves twice the index is 2", () => {
  const idx: number[] = [100];
  const stk: number[] = [100];
  for (let i = 1; i < 300; i++) {
    const r = Math.sin(i) * 0.01;
    idx.push(idx[i - 1] * Math.exp(r));
    stk.push(stk[i - 1] * Math.exp(2 * r));
  }
  near(I.beta(stk, idx, 252)[299], 2, 1e-9);
});

test("crosses compare yesterday with today", () => {
  const a = [1, 2, 3];
  assert.equal(I.crossesAbove(a, 1.5, 1), true);
  assert.equal(I.crossesAbove(a, 1.5, 2), false);
  assert.equal(I.crossesBelow([3, 2, 1], [2, 2, 2], 2), true);
  assert.equal(I.crossesAbove(a, 1.5, 0), false);
});

test("Force Index: change × volume, smoothed by an EMA", () => {
  const f = I.forceIndex([10, 11, 10, 12], [100, 200, 300, 400], 1);
  assert.deepEqual(f, [null, 200, -300, 800]);
});

test("Darvas box: a top and bottom hold after 3 days; a close above the top breaks out, the bottom stays as the stop", () => {
  // High 110 on day 1, not beaten on days 2-4; low 100 on day 2, not undercut on days 3-5: box 110/100 from day 5.
  const h = [105, 110, 108, 107, 106, 107, 115, 116];
  const l = [100, 104, 100, 101, 102, 103, 108, 110];
  const c = [104, 108, 102, 104, 105, 106, 114, 115];
  const x = I.darvas(h, l, c, 3);
  assert.equal(x.top[5], null);
  assert.equal(x.top[6], 110);
  assert.equal(x.bottom[6], 100);
  // Day 6 closes at 114, above the top: the box is gone, the bottom stays.
  assert.equal(x.top[7], null);
  assert.equal(x.bottom[7], 100);
});
