import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCase, closeOn, figuresTo, fyIndexOn, inputOn, spearman, summarise, type Check } from "./projection-check";
import { casesFor, type ProjectionContext } from "./projection";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

/** Daily closes from `from` for `days` days, growing by `g` a day. */
function series(from: string, days: number, start = 100, g = 0.0004) {
  const out: { t: string; c: number }[] = [];
  for (let i = 0; i < days; i++) out.push({ t: new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10), c: start * Math.pow(1 + g, i) * (1 + 0.01 * Math.sin(i)) });
  return out;
}

test("the fiscal year reported by a day counts from 1 June", () => {
  assert.equal(fyIndexOn("2025-05-31"), 2);
  assert.equal(fyIndexOn("2025-06-01"), 3);
  assert.equal(fyIndexOn("2022-03-01"), -1);
  assert.deepEqual(figuresTo({ ticker: "A", rev: [1, 2, 3, 4, 5], np: [1, 1, 1, 1, 1] }, 2).rev, [1, 2, 3, null, null]);
});

test("a close counts within a week before the day, never after it", () => {
  const pts = [
    { t: "2025-01-01", c: 10 },
    { t: "2025-01-10", c: 12 },
  ];
  assert.equal(closeOn(pts, "2025-01-05")?.c, 10);
  assert.equal(closeOn(pts, "2025-01-09"), null);
  assert.equal(closeOn(pts, "2024-12-31"), null);
});

test("inputs on a past day: price and market cap then, years reported by then, not listed yet", () => {
  const pts = series("2021-01-01", 1900);
  const index = series("2021-01-01", 1900, 1000, 0.0003);
  const f = { ticker: "A", price: "Rs 200", mcap: "Rs 2,000 Cr", rev: [100, 110, 120, 130, 140], np: [10, 11, 12, 13, 14], kpi: [30, 50, 1.5, 15, 15, 1] };
  const r = inputOn(f, pts, index, "2024-11-05", 0.1, "2021-01-01");
  assert.ok(r.ok);
  if (!r.ok) return;
  close(r.input.mcapCr!, (2000 * r.price) / 200);
  assert.deepEqual(r.input.np, [10, 11, 12, null, null]);
  close(r.input.pe!, r.input.mcapCr! / 12);
  assert.equal(r.input.divYield, 1.5);
  assert.ok(r.input.risk?.vol != null && r.input.risk.beta != null);
  // Listed after the day.
  assert.deepEqual(inputOn(f, series("2025-01-01", 300), index, "2024-11-05", 0.1, "2021-01-01"), { ok: false, reason: "Not listed yet" });
});

test("a check lands below Bear, inside or above Bull, and sums up", () => {
  const ctx = { market: 0.1, tilt: 0, vol: 0.3 } as ProjectionContext;
  const [bear, , bull] = casesFor(ctx, 1);
  const at = (ret: number) => checkCase(ctx, [{ t: "2025-01-01", c: 100 }, { t: "2026-01-01", c: 100 * (1 + ret) }], "2025-01-01", 100, 1)!;
  assert.equal(at(bear - 0.01).landed, "below");
  assert.equal(at(0).landed, "inside");
  assert.equal(at(bull + 0.01).landed, "above");
  // No close a year on yet: no check.
  assert.equal(checkCase(ctx, [{ t: "2025-01-01", c: 100 }], "2025-01-01", 100, 1), null);
  const cs: Check[] = [at(bear - 0.01), at(0), at(0), at(bull + 0.01)];
  const s = summarise(cs)!;
  assert.deepEqual([s.n, s.below, s.inside, s.above], [4, 0.25, 0.5, 0.25]);
  assert.equal(summarise([]), null);
  close(spearman([1, 2, 3], [10, 20, 30])!, 1);
  close(spearman([1, 2, 3], [30, 20, 10])!, -1);
});
