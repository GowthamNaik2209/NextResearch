import { test } from "node:test";
import assert from "node:assert/strict";
import { toCompany } from "./index";

const sup = (ticker: string, kind?: "operating" | "lender" | "insurer") => ({
  name: ticker, listed: true, role: "r",
  f: { ticker, kind, rev: [80, 90, 100, 110, 120], np: [8, 9, 10, 11, 12], kpi: [20, 100, 1, null, 15, 1], mcap: "Rs 1,000 Cr" },
});

test("a deck's lender or insurer carries its kind and no net margin; an operating company keeps its margin", () => {
  for (const [t, k] of [["HDFCBANK", "lender"], ["RECLTD", undefined], ["HDFCLIFE", "insurer"]] as const) {
    const c = toCompany("k", sup(t, k));
    assert.equal(c.npMargin, null, t);
    assert.notEqual(c.kind, "operating", t);
  }
  const op = toCompany("k", sup("TCS", "operating"));
  assert.equal(op.kind, "operating");
  assert.equal(op.npMargin, 10);
});
