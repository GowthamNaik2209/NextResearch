import { test } from "node:test";
import assert from "node:assert/strict";
import { companyKind, INSURERS, LENDERS } from "./kinds";

test("lenders, insurers and everything else are told apart", () => {
  for (const t of ["HDFCBANK", "BAJFINANCE", "RECLTD", "PFC", "IRFC", "BAJAJFINSV", "JIOFIN"]) assert.equal(companyKind(t), "lender", t);
  assert.equal(companyKind("HDFCLIFE"), "insurer");
  assert.equal(companyKind("SBILIFE"), "insurer");
  assert.equal(companyKind("ICICIGI"), "insurer");
  assert.equal(companyKind("TCS"), "operating");
});

test("brokers, exchanges and insurance aggregators stay operating", () => {
  for (const t of ["POLICYBZR", "ANGELONE", "BSE", "CAMS", "HDFCAMC", "CRISIL", "MEDIASSIST"]) assert.equal(companyKind(t), "operating", t);
});

test("each ticker sits in exactly one list, once", () => {
  const all = [...LENDERS, ...INSURERS];
  assert.equal(new Set(all).size, all.length);
});
