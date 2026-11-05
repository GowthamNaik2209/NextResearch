import { test } from "node:test";
import assert from "node:assert/strict";
import { ordinal, trendLabel, withTrend } from "./trend";
import type { SupplierFinancials } from "@/lib/sector-content";

const row = (ticker: string, r: number | null): SupplierFinancials => ({ ticker, cagr: r == null ? null : [r, null, null] });
const table = (rows: SupplierFinancials[]) => Object.fromEntries(rows.map((r) => [r.ticker, r]));

test("percentile: the share of the others with a lower return, highest 100, lowest 0", () => {
  const t = withTrend(table(Array.from({ length: 11 }, (_, i) => row(`S${i}`, i * 10))));
  assert.deepEqual(
    Array.from({ length: 11 }, (_, i) => t[`S${i}`].trend),
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  );
  assert.equal(trendLabel(t.S9.trend), "90th percentile");
});

test("no 1Y return (under a year listed) gets no percentile and is left out of the ranking", () => {
  const t = withTrend(table([row("A", 50), row("B", null), row("C", -10), { ticker: "D" }]));
  assert.equal(t.B.trend, null);
  assert.equal(t.D.trend, null);
  assert.equal(t.A.trend, 100);
  assert.equal(t.C.trend, 0);
  assert.equal(trendLabel(t.B.trend), "Not enough history");
});

test("equal returns share a percentile, at the middle of their ranks", () => {
  const t = withTrend(table([row("A", 30), row("B", 20), row("C", 20), row("D", -5), row("E", -9)]));
  assert.equal(t.B.trend, t.C.trend);
  assert.equal(t.B.trend, 63); // 2 below + 1 tied counted half, of 4 others
});

test("ordinals", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 100].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "100th"]);
});

test("rows are copied, not changed in place", () => {
  const src = table([row("A", 10), row("B", 5)]);
  const out = withTrend(src);
  assert.equal(src.A.trend, undefined);
  assert.notEqual(out.A, src.A);
});
