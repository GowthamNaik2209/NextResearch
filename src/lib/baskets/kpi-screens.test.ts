import { test } from "node:test";
import assert from "node:assert/strict";
import { compounders, garp, insurerValue, kpiScreens, qualityLenders, turnarounds, wideningMargins, KPI_LIST_N, type KpiStock } from "./kpi-screens";

// Fixture companies: revenue and profit FY22..FY26 (₹ Cr), worth ₹5,000 Cr unless said otherwise.
const co = (ticker: string, o: Partial<KpiStock> = {}): KpiStock => ({ ticker, name: ticker, mcapCr: 5000, pe: 20, roce: 20, rev: [1000, 1200, 1400, 1600, 1800], np: [100, 120, 140, 160, 180], ...o });
const tickers = (xs: { ticker: string }[]) => xs.map((x) => x.ticker);

test("compounders: revenue and profit up every year, ROCE 15%+, fastest profit growth first", () => {
  const list = compounders([
    co("STEADY"), // profit 100 -> 180: +16%/yr
    co("FAST", { np: [100, 150, 200, 300, 400] }), // +41%/yr
    co("DIP", { rev: [1000, 1200, 1100, 1600, 1800] }), // one year of falling revenue
    co("FLATPROFIT", { np: [100, 120, 120, 160, 180] }), // profit not up every year
    co("LOWROCE", { roce: 12 }),
    co("SMALL", { mcapCr: 400 }),
    co("ONEOFF", { outlier: true }),
    co("REIT", { trust: true }),
    co("GAP", { np: [100, null, 140, 160, 180] }), // a year missing: can't show "every year"
    co("LOSS", { np: [-5, 20, 40, 60, 80] }), // growth from a loss isn't a compounding rate
    co("TINYBASE", { np: [1, 8, 33, 58, 122] }), // +232%/yr, but from ₹1 Cr
  ]);
  assert.deepEqual(tickers(list), ["FAST", "STEADY"]);
  assert.equal(list[1].stat, "profit +16%/yr");
});

test("garp: lowest PEG first among real growers, at a positive P/E", () => {
  const list = garp([
    co("CHEAP", { pe: 15, np: [50, 100, 140, 200, 270] }), // FY23->26 profit 100 -> 270: +39.3%/yr, PEG 0.38
    co("FAIR", { pe: 30, np: [50, 100, 140, 200, 270] }), // PEG 0.77
    co("DEAR", { pe: 80, np: [50, 100, 140, 200, 270] }), // PEG 2.1: above 1.5
    co("SLOW", { pe: 10, np: [100, 100, 110, 110, 120] }), // profit growth under 15%
    co("NOSALES", { pe: 10, rev: [1000, 1000, 1010, 1020, 1030], np: [50, 100, 140, 200, 270] }), // revenue growth under 10%
    co("LOSSPE", { pe: -12, np: [50, 100, 140, 200, 270] }),
    co("WEAK", { pe: 15, roce: 8, np: [50, 100, 140, 200, 270] }),
    co("TINYBASE", { pe: 7, np: [7, 11, 55, 126, 201] }), // FY23 profit ₹11 Cr: too small a base
    co("REBOUND", { pe: 15, np: [-1500, 450, 1900, 3300, 5300] }), // a loss in FY22: the Turnarounds list
  ]);
  assert.deepEqual(tickers(list), ["CHEAP", "FAIR"]);
  assert.equal(list[0].stat, "PEG 0.38 · P/E 15.0x");
});

test("turnarounds: a loss in FY22-FY24, profits since and rising; biggest FY26 profit first", () => {
  const list = turnarounds([
    co("SMALLTURN", { np: [-20, -5, 3, 8, 12] }),
    co("BIGTURN", { np: [5, -40, -10, 60, 90] }),
    co("FADING", { np: [-20, -5, 3, 30, 20] }), // FY26 below FY25
    co("ALWAYS", { np: [10, 12, 14, 16, 18] }), // never lost money
    co("STILLLOSS", { np: [-20, -5, -3, -1, 5] }), // FY25 a loss
    co("SHRINK", { rev: [1000, 900, 2000, 1500, 1200], np: [-20, -5, 3, 8, 12] }), // sales below FY24
    co("REIT", { trust: true, np: [246, 131, -15, 160, 537] }), // a fair-value mark, not a loss
  ]);
  assert.deepEqual(tickers(list), ["BIGTURN", "SMALLTURN"]);
  assert.equal(list[0].stat, "loss FY24 → ₹90 Cr");
});

test("widening margins: biggest rise in net margin FY23 to FY26, profitable throughout, on growing sales", () => {
  const list = wideningMargins([
    co("WIDER", { rev: [500, 600, 700, 800, 900], np: [30, 36, 70, 100, 135] }), // 6% -> 15%
    co("SAME", { rev: [500, 600, 700, 800, 900], np: [30, 36, 42, 48, 54] }), // 6% -> 6%
    co("TURN", { rev: [500, 600, 700, 800, 900], np: [30, -10, 40, 80, 135] }), // a loss year: turnarounds' list
    co("TINY", { rev: [100, 120, 140, 160, 180], np: [5, 6, 20, 30, 40] }), // revenue under ₹500 Cr
    co("SHRINKING", { rev: [500, 900, 800, 700, 600], np: [30, 36, 70, 100, 135] }),
    co("HOLDCO", { rev: [500, 600, 700, 800, 900], np: [30, 36, 70, 100, 1200] }), // margin above 100%
  ]);
  assert.deepEqual(tickers(list), ["WIDER", "SAME"]);
  assert.equal(list[0].stat, "margin 6% → 15%");
});

test("every screen caps its list and breaks ties on market cap", () => {
  const many = Array.from({ length: 30 }, (_, i) => co(`C${String(i).padStart(2, "0")}`, { mcapCr: 1000 + i }));
  assert.equal(compounders(many).length, KPI_LIST_N);
  const list = compounders(many);
  assert.equal(list.length, KPI_LIST_N);
  // Same growth for all: the biggest company first.
  assert.equal(list[0].ticker, "C29");
});

test("each screen states a one-line rule with its market-cap floor", () => {
  for (const s of kpiScreens([co("A")])) {
    assert.ok(s.rule.includes("₹1,000 Cr"), s.id);
    assert.ok(!s.rule.includes("\n"), s.id);
  }
});

test("a company with a one-off year is in no screen, and every rule says so", () => {
  // Tata Steel's shape: an impairment loss in FY24 makes it look like a turnaround.
  const oneOff = co("ONEOFFTURN", { outlier: true, rev: [243959, 243353, 229171, 218543, 232140], np: [41749, 8075, -4910, 3174, 10886] });
  assert.deepEqual(tickers(turnarounds([oneOff, { ...oneOff, ticker: "TURN", outlier: false }])), ["TURN"]);
  for (const s of kpiScreens([oneOff, co("FAST", { outlier: true, np: [100, 150, 200, 300, 400] })])) {
    assert.equal(s.stocks.length, 0, s.id);
    assert.ok(s.rule.includes("One-off years left out."), s.id);
  }
});

// ---- Lenders and insurers ----

const bank = (ticker: string, roe: number | null, nnpa: number | null, o: Partial<KpiStock> = {}): KpiStock => co(ticker, { kind: "lender", roce: null, roe, nnpa, ...o });
const life = (ticker: string, vnbMargin: number | null, pev: number | null, fresh: "fresh" | "stale" = "fresh", o: Partial<KpiStock> = {}): KpiStock =>
  co(ticker, { kind: "insurer", roce: null, insurer: { vnbMargin, pev, fresh }, ...o });

test("ROCE and margin screens skip lenders and insurers, as they skip REITs", () => {
  // Shaped to pass every operating rule, even with a ROCE figure left on them.
  const shapes = { roce: 25, pe: 15, rev: [500, 600, 700, 800, 900], np: [50, 100, 140, 200, 270] };
  const xs = [co("OPCO", shapes), co("BANKX", { ...shapes, kind: "lender" }), co("LIFEX", { ...shapes, kind: "insurer" })];
  for (const screen of [compounders, garp, wideningMargins]) assert.deepEqual(tickers(screen(xs)), ["OPCO"], screen.name);
  // Turnarounds is about a loss and a recovery, not ROCE or margin: a lender can be one.
  assert.deepEqual(tickers(turnarounds([co("YES", { kind: "lender", np: [-3000, 1000, 1200, 1500, 2000] })])), ["YES"]);
});

test("qualityLenders: ROE 15%+ and net NPA 1% or less, at the edges; highest ROE first", () => {
  const list = qualityLenders([
    bank("EDGE", 15, 1.0), // both on the line: in
    bank("BEST", 22, 0.3),
    bank("LOWROE", 14.9, 0.3),
    bank("BADBOOK", 20, 1.01),
    bank("NONPA", 20, null), // no NPA reported: can't show it is clean
    bank("NOROE", null, 0.2),
    bank("SMALL", 25, 0.1, { mcapCr: 400 }),
    bank("ONEOFF", 25, 0.1, { outlier: true }),
    co("OPCO", { roe: 30, nnpa: 0.1 }), // not a lender
    life("LIFE", 30, 2, "fresh", { roe: 30, nnpa: 0.1 }),
  ]);
  assert.deepEqual(tickers(list), ["BEST", "EDGE"]);
  assert.equal(list[0].stat, "ROE 22% · Net NPA 0.30%");
});

test("insurerValue: life insurers with VNB margin 20%+ on fresh figures, cheapest P/EV first", () => {
  const list = insurerValue([
    life("DEAR", 26, 3.1),
    life("CHEAP", 20, 1.4), // VNB margin on the line: in
    life("THIN", 19.9, 1.0),
    life("STALE", 30, 0.9, "stale"),
    life("NOPEV", 30, null),
    life("GENERAL", null, 1.2), // no VNB margin: a general or health insurer
    life("SMALL", 30, 1.0, "fresh", { mcapCr: 400 }),
    co("OPCO", { insurer: { vnbMargin: 30, pev: 1, fresh: "fresh" } }), // not an insurer
    bank("BANK", 20, 0.5, { insurer: { vnbMargin: 30, pev: 1, fresh: "fresh" } }),
  ]);
  assert.deepEqual(tickers(list), ["CHEAP", "DEAR"]);
  assert.equal(list[0].stat, "P/EV 1.40x · VNB 20%");
});

test("the lender and insurer screens are in the list, each with its thresholds in its one-line rule", () => {
  const screens = kpiScreens([bank("B", 20, 0.5), life("L", 25, 2)]);
  const q = screens.find((s) => s.id === "quality-lenders")!;
  const v = screens.find((s) => s.id === "insurer-value")!;
  assert.deepEqual(tickers(q.stocks), ["B"]);
  assert.deepEqual(tickers(v.stocks), ["L"]);
  for (const s of [q, v]) assert.ok(!s.rule.includes("\n") && s.rule.includes("₹1,000 Cr"), s.id);
  assert.ok(q.rule.includes("ROE 15%+") && q.rule.includes("net NPA 1% or less"), q.rule);
  assert.ok(v.rule.includes("VNB margin 20%+") && v.rule.includes("P/EV"), v.rule);
});
