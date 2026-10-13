import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupplierFinancials } from "@/lib/sector-content";
import { mergeStats, revenueSeries } from "./merge";
import type { StockApi } from "./types";

const seed: SupplierFinancials = {
  ticker: "TEST",
  rev: [100, 120, 140, 160, 180],
  price: "Rs 1,000",
  mcap: "Rs 5,000 Cr",
  kpi: [30, 200, 0.5, 15, 12, 1],
  cagr: [5, 10, 15],
  range: [800, 1200],
};

test("mergeStats falls back to the seed figures when no live data is available", () => {
  const s = mergeStats(seed, null);
  assert.equal(s.price, 1000);
  assert.equal(s.pe, 30);
  assert.equal(s.roce, 15);
  assert.equal(s.cagr3y, 10);
  assert.equal(s.ratioSource, "cached");
  assert.equal(s.live, false);
});

test("mergeStats prefers the live quote and live Screener ratios over the seed", () => {
  const api = {
    ticker: "TEST",
    quote: { price: 1100, prevClose: 1090, change: 10, changePct: 0.9, currency: "INR", asOf: "", delayedMin: 15 },
    news: [],
    newsLive: true,
    fundamentals: {
      source: "screener",
      companyId: "1",
      classification: {},
      kpi: { price: 1099, marketCap: "Rs 6,000 Cr", pe: 25, bookValue: null, divYield: null, roce: 18, roe: null, faceValue: null, low52w: null, high52w: null },
      industry: null,
      growth: [{ title: "Stock Price CAGR", rows: [{ period: "3 Years", value: "22%" }] }],
      shareholding: null,
      annual: null,
      fetchedAt: "",
    },
  } as StockApi;
  const s = mergeStats(seed, api);
  assert.equal(s.price, 1100, "the live quote beats Screener's cached price");
  assert.equal(s.pe, 25);
  assert.equal(s.cagr3y, 22);
  assert.equal(s.bookValue, 200, "fields Screener left null fall back to the seed");
  assert.equal(s.ratioSource, "screener");
});

test("revenueSeries uses the seed's FY22-FY26 series when there is no live annual P&L", () => {
  const r = revenueSeries(seed, null);
  assert.deepEqual(r.map((p) => p.label), ["FY22", "FY23", "FY24", "FY25", "FY26"]);
  assert.equal(r.at(-1)?.revenue, 180);
});
