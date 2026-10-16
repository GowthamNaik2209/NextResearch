import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupplierFinancials } from "@/lib/sector-content";
import { isReit, mergeStats, priceReturn, revenueSeries, withLiveQuote } from "./merge";
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
    quote: { price: 1100, prevClose: 1090, change: 10, changePct: 0.9, currency: "INR", asOf: new Date().toISOString(), delayedMin: 15, symbol: "TEST.NS", exchange: "NSE" },
    news: [],
    newsLive: true,
    footprint: null,
    fundamentals: {
      source: "screener",
      basis: "consolidated",
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

const DAY = 86_400_000;
const istDate = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);
const quoteAt = (asOf: string, price = 464) => ({ price, prevClose: 440, change: 24, changePct: 5.4, currency: "INR", asOf, delayedMin: 15, symbol: "TEST.NS", exchange: "NSE" as const });

test("withLiveQuote closes the series on the live price so chart and header agree", () => {
  const now = Date.now();
  const pts = [{ t: istDate(now - 3 * DAY), c: 400 }, { t: istDate(now - 2 * DAY), c: 429 }];
  // later day than the last bar: appended
  assert.deepEqual(withLiveQuote(pts, quoteAt(new Date(now).toISOString())).at(-1), { t: istDate(now), c: 464 });
  // same IST day as the last bar: that bar's close is replaced, not duplicated
  const same = withLiveQuote(pts, quoteAt(new Date(now - 2 * DAY).toISOString()));
  assert.equal(same.length, 2);
  assert.equal(same.at(-1)!.c, 464);
  // a quote older than the history, a stale (frozen-symbol) quote, or no quote: untouched
  assert.equal(withLiveQuote(pts, quoteAt(new Date(now - 4 * DAY).toISOString())), pts);
  assert.equal(withLiveQuote(pts, quoteAt("2024-07-23T20:00:00.000Z")), pts);
  assert.equal(withLiveQuote(pts, null), pts);
});

test("a stale quote (e.g. Yahoo's frozen REIT symbol) is never presented as live", () => {
  const api = { ticker: "TEST", quote: quoteAt("2024-07-23T20:00:00.000Z", 369.92), fundamentals: null, news: [], newsLive: false, footprint: null } as StockApi;
  const s = mergeStats(seed, api);
  assert.equal(s.liveQuote, false);
  assert.equal(s.live, false);
  assert.equal(s.price, 1000, "falls back to the seed price");
});

test("1Y return comes from the chart's own series when present, so Summary and Chart agree", () => {
  assert.equal(priceReturn([{ t: "2025-10-16", c: 100 }, { t: "2026-10-16", c: 82.08 }]), -17.92);
  assert.equal(priceReturn([{ t: "2026-10-16", c: 100 }]), null);
  const api = { ticker: "TEST", quote: null, fundamentals: null, news: [], newsLive: false, footprint: null, return1y: -17.92 } as StockApi;
  const s = mergeStats(seed, api);
  assert.equal(s.cagr1y, -17.92);
  assert.equal(s.cagr1ySource, "chart");
  assert.equal(s.cagrLongSource, "seed");
  assert.equal(mergeStats(seed, null).cagr1ySource, "seed");
});

test("REITs are recognised by ticker or by Screener's industry", () => {
  assert.equal(isReit("EMBASSY"), true);
  assert.equal(isReit("VOLTAS"), false);
  const api = { fundamentals: { classification: { industry: "Real Estate Investment Trusts (REITs)" } } } as StockApi;
  assert.equal(isReit("NEWREIT", api), true);
});
