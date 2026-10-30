import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustDemergers, DEMERGERS } from "./demergers";

const F = DEMERGERS.STLTECH[0].factor;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// STLTECH's stored (Yahoo) daily closes around the STL Networks ex-date, 24 Apr 2025.
const daily = [
  { t: "2025-04-22", o: 85, h: 88, l: 84, c: 86.5, v: 10 },
  { t: "2025-04-23", o: 86, h: 88, l: 85, c: 86.97, v: 10 },
  { t: "2025-04-24", o: 66, h: 67, l: 64, c: 65.05, v: 10 },
  { t: "2025-04-25", o: 65, h: 69, l: 64, c: 68.3, v: 10 },
];

test("daily: prices before the ex-date scaled, from it on as sent, volume untouched", () => {
  const out = adjustDemergers("STLTECH", daily, "1d");
  assert.ok(close(out[1].c, 86.97 * F) && close(out[1].o!, 86 * F) && close(out[1].h!, 88 * F) && close(out[1].l!, 85 * F));
  assert.equal(out[1].v, 10);
  assert.deepEqual(out.slice(2), daily.slice(2));
  // A copy: the input is left as it was.
  assert.equal(daily[1].c, 86.97);
});

test("weekly: the bar holding the ex-date closes after it and is left as is", () => {
  const weekly = [
    { t: "2025-04-14", c: 84.0 },
    { t: "2025-04-21", c: 68.3 },
    { t: "2025-04-28", c: 70.1 },
  ];
  const out = adjustDemergers("STLTECH", weekly, "1wk");
  assert.ok(close(out[0].c, 84 * F));
  assert.deepEqual(out.slice(1), weekly.slice(1));
});

test("already adjusted (no drop across the ex-date): left alone, not adjusted twice", () => {
  const adjusted = daily.map((b, i) => (i < 2 ? { ...b, c: b.c * F } : b));
  assert.equal(adjustDemergers("STLTECH", adjusted, "1d"), adjusted);
});

test("a range starting after the ex-date, or another stock: unchanged", () => {
  assert.equal(adjustDemergers("STLTECH", daily.slice(2), "1d").length, 2);
  assert.deepEqual(adjustDemergers("STLTECH", daily.slice(2), "1d"), daily.slice(2));
  assert.equal(adjustDemergers("HFCL", daily, "1d"), daily);
});

test("closes-only points (no candles) scale just the close", () => {
  const out = adjustDemergers("STLTECH", daily.map(({ t, c }) => ({ t, c })), "1d");
  assert.deepEqual(Object.keys(out[0]), ["t", "c"]);
  assert.ok(close(out[0].c, 86.5 * F));
});
