import { test } from "node:test";
import assert from "node:assert/strict";
import { poolFmt, poolTick } from "./pool-format";

test("pool figures in their own units: P/B and solvency as multiples, the lender and insurer rates as %", () => {
  assert.equal(poolFmt("pb", 1.94), "1.9x");
  assert.equal(poolFmt("solvency", 1.94), "1.9x");
  for (const id of ["roe", "roa", "gnpa", "nnpa", "vnb", "combined"] as const) assert.match(poolFmt(id, 2.345), /^2\.\d+%$/, id);
  assert.equal(poolFmt("gnpa", 1.11), "1.11%");
  assert.equal(poolFmt("roa", 1.9), "1.90%");
  assert.equal(poolFmt("roe", 16.54), "16.5%");
  assert.equal(poolFmt("vnb", 25.5), "25.5%");
  assert.equal(poolFmt("combined", 102.6), "102.6%");
  // The usual ones are unchanged.
  assert.equal(poolFmt("margin", 0.1), "10.0%");
  assert.equal(poolFmt("roce", 22), "22.0%");
  assert.equal(poolFmt("pe", 20), "20.0×");
  assert.equal(poolFmt("nnpa", null), "—");
});

test("axis ticks in the same units", () => {
  assert.equal(poolTick("pb", 2, 4), "2x");
  assert.equal(poolTick("solvency", 1.5, 3), "1.5x");
  assert.equal(poolTick("roe", 15, 20), "15%");
  assert.equal(poolTick("gnpa", 0.5, 2), "0.5%");
  assert.equal(poolTick("margin", 0.2, 0.4), "20%");
  assert.equal(poolTick("rev", 0, 10), "0");
});
