import { test } from "node:test";
import assert from "node:assert/strict";
import { BANKS, companyKind, INSURERS, isBank, isLifeInsurer, LENDERS, LIFE_INSURERS } from "./kinds";

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

test("the banks are lenders; NBFCs and housing or infrastructure lenders are not banks", () => {
  for (const t of BANKS) assert.ok(LENDERS.includes(t), t);
  for (const t of ["HDFCBANK", "SBIN", "AUBANK", "YESBANK", "CANBK"]) assert.ok(isBank(t), t);
  for (const t of ["BAJFINANCE", "BAJAJHFL", "RECLTD", "CREDITACC", "JIOFIN", "TCS", "HDFCLIFE"]) assert.ok(!isBank(t), t);
});

test("life insurers are insurers; general and health insurers are not life", () => {
  for (const t of LIFE_INSURERS) assert.ok(INSURERS.includes(t), t);
  assert.ok(isLifeInsurer("HDFCLIFE") && isLifeInsurer("LICI"));
  for (const t of ["ICICIGI", "NIACL", "GICRE", "STARHEALTH", "NIVABUPA", "HDFCBANK"]) assert.ok(!isLifeInsurer(t), t);
});
