import { test } from "node:test";
import assert from "node:assert/strict";
import { kindMedians } from "./kind-medians";
import type { SupplierFinancials } from "@/lib/sector-content";

// kpi: [P/E, book value, dividend yield, ROCE, ROE, face value]; price "Rs 300".
const f = (ticker: string, book: number | null, roe: number | null): SupplierFinancials => ({ ticker, price: "Rs 300", kpi: [20, book, 1, null, roe, 1] });

test("kindMedians: P/B and ROE medians across covered companies of one kind only", () => {
  const m = kindMedians([f("HDFCBANK", 100, 15), f("SBIN", 150, 18), f("RECLTD", 300, 20), f("TCS", 30, 50), f("HDFCLIFE", 50, 12)], "lender");
  assert.equal(m.kind, "lender");
  assert.equal(m.n, 3);
  assert.equal(m.pb, 2); // P/B 3, 2, 1
  assert.equal(m.roe, 18);
  const ins = kindMedians([f("HDFCLIFE", 50, 12), f("SBILIFE", 100, 14), f("TCS", 30, 50)], "insurer");
  assert.equal(ins.n, 2);
  assert.equal(ins.pb, (6 + 3) / 2);
  assert.equal(ins.roe, 13);
});

test("kindMedians: a company missing a figure drops out of that median only; none gives null", () => {
  const m = kindMedians([f("HDFCBANK", null, 15), f("SBIN", 150, null)], "lender");
  assert.equal(m.pb, 2);
  assert.equal(m.roe, 15);
  assert.deepEqual(kindMedians([f("TCS", 30, 50)], "lender"), { kind: "lender", n: 0, pb: null, roe: null });
});
