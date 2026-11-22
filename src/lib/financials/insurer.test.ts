import { test } from "node:test";
import assert from "node:assert/strict";
import { insurerFreshness, parseMarketCapCr, priceToEmbeddedValue, validateInsurerRows } from "./insurer";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const today = day("2026-11-18");
const daysBefore = (n: number) => new Date(today.getTime() - n * 86_400_000);

test("freshness: 199 days old is fresh, 200 still fresh (not more than 200), 201 is stale", () => {
  assert.equal(insurerFreshness(daysBefore(199), today), "fresh");
  assert.equal(insurerFreshness(daysBefore(200), today), "fresh");
  assert.equal(insurerFreshness(daysBefore(201), today), "stale");
});

test("market cap string parses to crore", () => {
  assert.equal(parseMarketCapCr("Rs 1,74,575 Cr"), 174575);
  assert.equal(parseMarketCapCr("Rs 980.5 Cr"), 980.5);
  assert.equal(parseMarketCapCr(null), null);
  assert.equal(parseMarketCapCr("n/a"), null);
});

test("P/EV is market cap divided by embedded value, null when either side is missing or EV <= 0", () => {
  assert.equal(priceToEmbeddedValue("Rs 1,00,000 Cr", 50000), 2);
  assert.equal(priceToEmbeddedValue(null, 50000), null);
  assert.equal(priceToEmbeddedValue("Rs 1,00,000 Cr", null), null);
  assert.equal(priceToEmbeddedValue("Rs 1,00,000 Cr", 0), null);
  assert.equal(priceToEmbeddedValue("Rs 1,00,000 Cr", -5), null);
  assert.equal(priceToEmbeddedValue("garbage", 5), null);
});

const good = {
  ticker: "HDFCLIFE", period: "Q2 FY27", periodEnd: "2026-09-30", vnbMargin: 25.1, embeddedValueCr: 60000,
  combinedRatio: null, solvencyRatio: 1.9, sourceUrl: "https://example.com/disclosure.pdf", readOn: "2026-11-18",
};

test("a valid row passes", () => {
  const r = validateInsurerRows([good]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.rows.length, 1);
});

test("an empty list is valid", () => {
  assert.deepEqual(validateInsurerRows([]), { rows: [], errors: [] });
});

test("invalid rows are reported with their position", () => {
  const bad = [
    { ...good, ticker: "TCS" },
    { ...good, sourceUrl: "ftp://x" },
    { ...good, vnbMargin: "25" },
    { ...good, period: "" },
    { ...good, periodEnd: "30/09/2026" },
    { ...good, readOn: undefined },
    "nope",
  ];
  const r = validateInsurerRows(bad);
  assert.equal(r.errors.length, 7);
  assert.match(r.errors[0], /^row 1: .*ticker/);
  assert.match(r.errors[1], /^row 2: .*sourceUrl/);
  assert.match(r.errors[2], /^row 3: .*vnbMargin/);
  assert.match(r.errors[3], /^row 4: .*period/);
  assert.match(r.errors[4], /^row 5: .*periodEnd/);
  assert.match(r.errors[5], /^row 6: .*readOn/);
});

test("duplicate (ticker, periodEnd) is an error; the file must be an array", () => {
  assert.equal(validateInsurerRows([good, good]).errors.length, 1);
  assert.equal(validateInsurerRows({}).errors.length, 1);
});

test("hand-kept figures outside their sanity ranges are rejected with the row position", () => {
  const out = [
    { ...good, solvencyRatio: 0 },
    { ...good, solvencyRatio: 194 },
    { ...good, vnbMargin: -1 },
    { ...good, vnbMargin: 250 },
    { ...good, ticker: "ICICIGI", vnbMargin: null, embeddedValueCr: null, combinedRatio: 201 },
    { ...good, embeddedValueCr: 0 },
  ];
  const r = validateInsurerRows(out);
  assert.equal(r.rows.length, 0);
  assert.equal(r.errors.length, 6);
  assert.match(r.errors[0], /^row 1: solvencyRatio 0 is out of range/);
  assert.match(r.errors[1], /^row 2: solvencyRatio 194 is out of range/);
  assert.match(r.errors[2], /^row 3: vnbMargin -1 is out of range/);
  assert.match(r.errors[3], /^row 4: vnbMargin 250 is out of range/);
  assert.match(r.errors[4], /^row 5: combinedRatio 201 is out of range/);
  assert.match(r.errors[5], /^row 6: embeddedValueCr 0 is out of range/);
  // The edges inside the ranges, and nulls, pass.
  const edge = validateInsurerRows([
    { ...good, solvencyRatio: 9.99, vnbMargin: 0, embeddedValueCr: 0.5 },
    { ...good, periodEnd: "2026-06-30", solvencyRatio: null, vnbMargin: 200, combinedRatio: 0, embeddedValueCr: null },
  ]);
  assert.deepEqual(edge.errors, []);
});
