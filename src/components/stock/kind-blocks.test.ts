import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupplierFinancials } from "@/lib/sector-content";
import { lenderRatiosFrom } from "@/lib/financials/key-ratios";
import { fundamentalsForKind, notMeaningfulNote } from "@/lib/financials/kinds";
import type { Fundamentals } from "@/lib/live/screener-company";
import { HOLDING_LENDER, insurerRows, lenderRows, LENDER_UNREAD, NOT_IN_DISCLOSURE, NPA_NOT_REPORTED } from "./kind-blocks";
import { EMPTY_LENDER } from "@/lib/financials/lender";
import { ratioTiles } from "./ratio-tiles";

const figs = { price: "Rs 2,000", mcap: "Rs 15,00,000 Cr", kpi: [20, 800, 1, null, 16.5, 1], rev: [80, 100], np: [8, 10], asOf: "16 Nov 2026" };
const bankBlock = lenderRatiosFrom({
  gnpa: 1.11, nnpa: 0.37, finMargin: 12.4, finMarginYear: "Mar 2026", netProfit: 100,
  totalAssets: [1100, 1000], deposits: [880, 800], bsYear: "Mar 2026", quarter: "Sep 2026",
});
const nbfcBlock = lenderRatiosFrom({
  gnpa: 1.2, nnpa: 0.6, finMargin: 30, finMarginYear: "Mar 2026", netProfit: 50,
  totalAssets: [500, 400], deposits: null, bsYear: "Mar 2026", quarter: "Sep 2026",
});
const bank: SupplierFinancials = { ticker: "HDFCBANK", kind: "lender", ...figs, lender: bankBlock };
const nbfc: SupplierFinancials = { ticker: "BAJFINANCE", kind: "lender", ...figs, lender: nbfcBlock };
const life: SupplierFinancials = {
  ticker: "HDFCLIFE", kind: "insurer", ...figs,
  insurer: { period: "Q2 FY27", periodEnd: "2026-09-30", vnbMargin: 25.5, pev: 2.31, combinedRatio: null, solvency: 1.94, sourceUrl: "https://example.com/q2.pdf", fresh: "fresh" },
};
const general: SupplierFinancials = {
  ticker: "ICICIGI", kind: "insurer", ...figs,
  insurer: { period: "Q1 FY27", periodEnd: "2026-06-30", vnbMargin: null, pev: null, combinedRatio: 102.6, solvency: 2.7, sourceUrl: "https://example.com/q1.pdf", fresh: "stale" },
};

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

test("the lender's year labels: the financing-margin year and the balance-sheet year", () => {
  assert.deepEqual([bankBlock.year, bankBlock.bsYear], ["FY26", "FY26"]);
  const dec = lenderRatiosFrom({ ...{ gnpa: null, nnpa: null, finMargin: null, netProfit: null, totalAssets: [null, null], deposits: null, quarter: null }, finMarginYear: "Dec 2025", bsYear: null });
  assert.deepEqual([dec.year, dec.bsYear], ["Dec 2025", null]);
});

test("a bank's block: the six lending figures in order, each period beside it, never NIM, CASA or loan growth; P/B and ROE stay in the tiles above", () => {
  const b = lenderRows(bank);
  assert.deepEqual(labels(b.rows), ["ROA", "Gross NPA", "Net NPA", "Financing profit / revenue", "Deposit growth", "Balance-sheet growth"]);
  const v = Object.fromEntries(b.rows.map((r) => [r.label, [r.value, r.period ?? null]]));
  assert.deepEqual(v["ROA"], ["9.52%", "FY26"]);
  assert.deepEqual(v["Gross NPA"], ["1.11%", "Sep 2026"]);
  assert.deepEqual(v["Net NPA"], ["0.37%", "Sep 2026"]);
  assert.deepEqual(v["Financing profit / revenue"], ["12.4%", "FY26"]);
  assert.deepEqual(v["Deposit growth"], ["+10.0%", "FY26"]);
  assert.deepEqual(v["Balance-sheet growth"], ["+10.0%", "FY26"]);
  assert.equal(b.missing, false);
  for (const r of b.rows) assert.doesNotMatch(r.label, /NIM|CASA|loan growth/i);
});

test("the deposit growth row is a bank's (kinds.ts BANKS), whatever is stored; an NBFC has none", () => {
  assert.ok(!labels(lenderRows(nbfc).rows).includes("Deposit growth"));
  // A bank with no stored deposits (or no lender figures at all) still shows the row, as a dash.
  for (const l of [{ ...bankBlock, depositGrowth: null }, null]) {
    const r = lenderRows({ ...bank, lender: l }).rows.find((x) => x.label === "Deposit growth");
    assert.equal(r?.value, "—");
  }
  // An NBFC with a stored Deposits row is still not a bank.
  assert.ok(!labels(lenderRows({ ...nbfc, lender: bankBlock }).rows).includes("Deposit growth"));
});

test("a lender with no stored figures yet: dashes (never 0) and a missing flag", () => {
  const b = lenderRows({ ...bank, lender: null });
  assert.equal(b.missing, true);
  const v = Object.fromEntries(b.rows.map((r) => [r.label, r.value]));
  assert.equal(v["Gross NPA"], "—");
  assert.equal(v["ROA"], "—");
  assert.equal(v["P/B"], undefined, "P/B and ROE are the tiles' (not repeated in the block)");
  assert.equal(v["Deposit growth"], "—");
  // A zero NPA is a real zero; a missing one is a dash.
  const zero = lenderRows({ ...bank, lender: { ...bankBlock, nnpa: 0, gnpa: null } });
  const z = Object.fromEntries(zero.rows.map((r) => [r.label, r.value]));
  assert.deepEqual([z["Gross NPA"], z["Net NPA"]], ["—", "0.00%"]);
});

test("a life insurer's block: hand-kept figures carry their quarter and source; no combined ratio row; nothing the tiles already show", () => {
  const b = insurerRows(life);
  assert.deepEqual(labels(b.rows), ["VNB margin", "P/EV", "Solvency ratio"]);
  const v = Object.fromEntries(b.rows.map((r) => [r.label, r]));
  assert.equal(v["VNB margin"].value, "25.5%");
  assert.equal(v["P/EV"].value, "2.31x");
  assert.equal(v["Solvency ratio"].value, "1.94x");
  for (const l of ["VNB margin", "P/EV", "Solvency ratio"]) {
    assert.equal(v[l].period, "Q2 FY27", l);
    assert.equal(v[l].source, "https://example.com/q2.pdf", l);
    assert.equal(v[l].stale, false, l);
  }
  assert.equal(b.missing, false);
});

test("a general insurer's block: combined ratio, no VNB or P/EV; a stale quarter is marked", () => {
  const b = insurerRows(general);
  assert.deepEqual(labels(b.rows), ["Combined ratio", "Solvency ratio"]);
  const c = b.rows.find((r) => r.label === "Combined ratio")!;
  assert.deepEqual([c.value, c.period, c.stale], ["102.6%", "Q1 FY27", true]);
});

test("an insurer with no hand-kept row yet: its rows still listed as dashes (life or general by kinds.ts), and a missing flag", () => {
  const b = insurerRows({ ...life, insurer: null });
  assert.deepEqual(labels(b.rows), ["VNB margin", "P/EV", "Solvency ratio"]);
  assert.ok(b.rows.every((r) => r.value === "—" && r.note === undefined && r.period === undefined));
  assert.equal(b.missing, true);
  const g = insurerRows({ ...general, insurer: null });
  assert.deepEqual(labels(g.rows), ["Combined ratio", "Solvency ratio"]);
  assert.equal(g.missing, true);
});

test("ROCE and net margin read as a note for lenders and insurers, never a number or a bare dash", () => {
  assert.equal(notMeaningfulNote("lender"), "Not meaningful for lenders");
  assert.equal(notMeaningfulNote("insurer"), "Not meaningful for insurers");
  assert.equal(notMeaningfulNote("operating"), null);
  for (const [f, note] of [[bank, "Not meaningful for lenders"], [life, "Not meaningful for insurers"]] as const) {
    const t = ratioTiles(f, false).find((x) => x.label === "Net margin")!;
    assert.deepEqual([t.value, t.muted], [note, true]);
  }
  const op = ratioTiles({ ticker: "TCS", ...figs, kpi: [20, 800, 1, 50, 45, 1] }, false).find((x) => x.label === "Net margin")!;
  assert.deepEqual([op.value, op.muted], ["10.0%", undefined]);
});

test("live fundamentals for a lender or insurer carry no ROCE and no operating margin", () => {
  const m = { pe: 20, marketCapCr: 100, divYield: 1, qtrProfitVarPct: 5, qtrSalesVarPct: 6, roce: 7.1 };
  const fund = {
    kpi: { roce: 7.1, roe: 16 },
    industry: { peerCount: 10, median: { ...m }, self: { ...m } },
    annual: { years: ["Mar 2025", "Mar 2026"], series: [{ label: "Sales", values: [1, 2] }, { label: "Operating Profit", values: [1, 1] }, { label: "OPM %", values: [30, 31] }, { label: "Net Profit", values: [1, 1] }] },
  } as unknown as Fundamentals;
  const b = fundamentalsForKind(fund, "lender")!;
  assert.equal(b.industry!.median.roce, null);
  assert.equal(b.industry!.self!.roce, null);
  assert.deepEqual([b.kpi!.roce, b.kpi!.roe], [null, 16]);
  assert.deepEqual(b.annual!.series.map((s) => s.label), ["Sales", "Net Profit"]);
  assert.equal(fund.industry!.median.roce, 7.1, "input untouched");
  assert.equal(fundamentalsForKind(fund, "operating"), fund);
  assert.equal(fundamentalsForKind(null, "lender"), null);
});

test("NPAs Screener doesn't report read as a dash with the reason; reported ones carry no note", () => {
  const noNpa = lenderRatiosFrom({
    gnpa: null, nnpa: null, finMargin: 30, finMarginYear: "Mar 2026", netProfit: 50,
    totalAssets: [500, 400], deposits: null, bsYear: "Mar 2026", quarter: null,
  });
  const b = lenderRows({ ...nbfc, lender: noNpa });
  const v = Object.fromEntries(b.rows.map((r) => [r.label, r]));
  for (const l of ["Gross NPA", "Net NPA"]) assert.deepEqual([v[l].value, v[l].note], ["—", NPA_NOT_REPORTED], l);
  assert.equal(v["Financing profit / revenue"].note, undefined);
  assert.equal(b.footnote, undefined);
  for (const r of lenderRows(bank).rows) assert.equal(r.note, undefined, r.label);
  // No block stored yet: the "not yet added" flag says why, not a Screener note.
  const none = lenderRows({ ...bank, lender: null });
  assert.ok(none.rows.every((r) => r.note === undefined));
  assert.equal(none.footnote, undefined);
});

test("a lender block stored with no figure read: one footnote, not a note on every row", () => {
  const b = lenderRows({ ...bank, lender: lenderRatiosFrom(EMPTY_LENDER) });
  assert.equal(b.missing, false);
  assert.equal(b.footnote, LENDER_UNREAD);
  assert.match(LENDER_UNREAD, /standalone page on Screener/);
  assert.ok(b.rows.every((r) => r.note === undefined));
  assert.equal(b.rows.find((r) => r.label === "Gross NPA")?.value, "—");
});

test("a hand-kept insurer figure the row leaves out reads as a dash with a note; known ones carry none", () => {
  const partial: SupplierFinancials = { ...life, insurer: { ...life.insurer!, vnbMargin: null, solvency: null } };
  const v = Object.fromEntries(insurerRows(partial).rows.map((r) => [r.label, r]));
  for (const l of ["VNB margin", "Solvency ratio"]) {
    assert.deepEqual([v[l].value, v[l].note, v[l].period], ["—", NOT_IN_DISCLOSURE, "Q2 FY27"], l);
  }
  assert.equal(v["P/EV"].note, undefined);
  // A life insurer with no P/EV (no embedded value in the row).
  const noEv = Object.fromEntries(insurerRows({ ...life, insurer: { ...life.insurer!, pev: null } }).rows.map((r) => [r.label, r]));
  assert.deepEqual([noEv["P/EV"].value, noEv["P/EV"].note], ["—", NOT_IN_DISCLOSURE]);
  for (const r of insurerRows(life).rows) assert.equal(r.note, undefined, r.label);
});

test("a lender block with one figure missing gives that dash its reason and no period (HDBFS's gross NPA)", () => {
  const f: SupplierFinancials = {
    ticker: "HDBFS",
    lender: { roa: 2.1, gnpa: null, nnpa: 1.04, finMargin: 30, depositGrowth: null, bsGrowth: 12, quarter: "Jun 2026", year: "FY26", bsYear: "FY26" },
  };
  const rows = new Map(lenderRows(f).rows.map((r) => [r.label, r]));
  assert.deepEqual(rows.get("Gross NPA"), { label: "Gross NPA", value: "—", note: "Not reported on Screener" });
  assert.equal(rows.get("Net NPA")!.period, "Jun 2026");
});

test("a holding company with a lending kind shows one line, not a block of dashes", () => {
  const b = lenderRows({ ticker: "BAJAJFINSV", kind: "lender", lender: null } as SupplierFinancials);
  assert.deepEqual(b.rows, []);
  assert.equal(b.missing, false);
  assert.equal(b.footnote, HOLDING_LENDER);
});
