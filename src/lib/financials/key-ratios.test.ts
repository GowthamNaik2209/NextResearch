import { test } from "node:test";
import assert from "node:assert/strict";
import { keyRatios, lenderRatios, missingRatioReason, lenderRatiosFrom, niftyDayFor, niftyFallbackDays, oneYearTo, withNifty } from "./key-ratios";
import { ratioTiles } from "@/components/stock/ratio-tiles";
import type { SupplierFinancials } from "@/lib/sector-content";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("P/B, growth and margin come from the latest reported year", () => {
  const k = keyRatios({ ticker: "A", price: "Rs 300", kpi: [30, 100, 1, 15, 12, 1], rev: [50, 60, 80, 100, null], np: [5, 6, 8, 10, null], cagr: [25, 10, 8], nifty1y: 5 });
  close(k.pb!, 3);
  assert.equal(k.fy, "FY25");
  close(k.revGrowth!, 25);
  close(k.profitGrowth!, 25);
  close(k.netMargin!, 10);
  close(k.vsNifty!, 20);
  assert.equal(k.nifty1y, 5);
});

test("a loss in either year gives no profit growth %, and says which way", () => {
  assert.deepEqual([keyRatios({ ticker: "A", rev: [100, 120], np: [-5, 10] })].map((k) => [k.profitGrowth, k.profitNote]), [[null, "from a loss"]]);
  assert.deepEqual([keyRatios({ ticker: "A", rev: [100, 120], np: [5, -10] })].map((k) => [k.profitGrowth, k.profitNote]), [[null, "to a loss"]]);
  const k = keyRatios({ ticker: "A", rev: [100, 120], np: [5, -10] });
  close(k.netMargin!, (-10 / 120) * 100);
  assert.equal(keyRatios({ ticker: "A", rev: [100, 120], np: [-50, -20] }).profitNote, "loss narrowed");
  assert.equal(keyRatios({ ticker: "A", rev: [100, 120], np: [-20, -50] }).profitNote, "loss widened");
});

test("a note warning about the latest year leaves growth and margin out; a Jan-Dec year is labelled CY", () => {
  const rev = [50, 60, 80, 100, 130];
  const np = [5, 6, 8, 10, 40];
  const odd = keyRatios({ ticker: "A", rev, np, note: "FY26 net profit is dominated by a one-off demerger gain" });
  assert.equal(odd.caution, "FY26 net profit is dominated by a one-off demerger gain");
  assert.deepEqual([odd.revGrowth, odd.profitGrowth, odd.netMargin], [null, null, null]);
  assert.equal(keyRatios({ ticker: "A", rev, np, screenOut: true }).revGrowth, null);
  // A note about an older year doesn't count.
  close(keyRatios({ ticker: "A", rev, np, note: "FY22 profit is depressed by a one-off settlement" }).revGrowth!, 30);
  assert.equal(keyRatios({ ticker: "A", rev, np, note: "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025" }).fy, "CY25");
  assert.equal(keyRatios({ ticker: "A", rev, np }).fy, "FY26");
});

test("missing figures give nulls, not zeros", () => {
  const k = keyRatios({ ticker: "A", price: "Rs 300", kpi: [30, -4, 1, 15, 12, 1], cagr: [25, null, null] });
  assert.deepEqual(k, { pb: null, fy: null, caution: null, revGrowth: null, profitGrowth: null, profitNote: null, netMargin: null, nifty1y: null, vsNifty: null, vsNiftyDay: null, vsNiftyNote: "Nifty close not stored yet", notMeaningful: [], notOut: null, noPrior: null });
});

test("a latest year not on Screener yet, or no year before it, is named rather than left a bare dash", () => {
  // HDBFS's shape: FY26 not out, figures for FY25.
  const late: SupplierFinancials = { ticker: "A", rev: [null, 12403, 14173, 16300, null], np: [null, 1959, 2461, 2176, null] };
  assert.deepEqual([keyRatios(late).fy, keyRatios(late).notOut, keyRatios(late).noPrior], ["FY25", "FY26", null]);
  const lateTiles = ratioTiles(late, false);
  assert.equal(lateTiles.find((t) => t.label === "Revenue growth")!.sub, "FY25 · FY26 not on Screener yet");
  // UGROCAP's shape: only FY26 in the table, so no growth rate, and the tile says why.
  const lone: SupplierFinancials = { ticker: "A", rev: [null, null, null, null, 1960], np: [null, null, null, null, 175] };
  assert.deepEqual([keyRatios(lone).notOut, keyRatios(lone).noPrior], [null, "FY25"]);
  for (const label of ["Revenue growth", "Profit growth"]) {
    const t = ratioTiles(lone, false).find((x) => x.label === label)!;
    assert.deepEqual([t.value, t.sub], ["—", "No FY25 figure"], label);
    assert.ok(t.title);
  }
  // A full history: neither.
  const full = keyRatios({ ticker: "A", rev: [1, 2, 3, 4, 5], np: [1, 1, 1, 1, 1] });
  assert.deepEqual([full.notOut, full.noPrior], [null, null]);
});

test("the Nifty's 1Y return runs from the close a year before to the close on the day", () => {
  const bars = [
    { t: "2025-11-03", c: 100 },
    { t: "2025-11-04", c: 101 },
    { t: "2026-11-02", c: 110 },
    { t: "2026-11-05", c: 121 },
  ];
  close(oneYearTo(bars, "2026-11-05")!, 19.80198019801982);
  // No close on the day itself yet (stored later that evening): no figure rather than one a day short.
  assert.equal(oneYearTo(bars, "2026-11-04"), null);
  // Nothing within a week of a year before: no figure rather than a stretched one.
  assert.equal(oneYearTo([{ t: "2025-10-01", c: 100 }, { t: "2026-11-05", c: 110 }], "2026-11-05"), null);
});

test("each row gets the Nifty figure for its own snapshot day, copied", () => {
  const bars = [
    { t: "2025-11-05", c: 100 },
    { t: "2026-11-05", c: 110 },
  ];
  const src: Record<string, SupplierFinancials> = { A: { ticker: "A" }, B: { ticker: "B" } };
  const out = withNifty(src, new Map([["A", "2026-11-05"]]), bars);
  close(out.A.nifty1y!, 10);
  assert.equal(out.B.nifty1y, null);
  assert.equal(src.A.nifty1y, undefined);
});

test("tiles: always five, REIT profit figures n/m, 1Y vs Nifty in whole points", () => {
  const f: SupplierFinancials = { ticker: "A", price: "Rs 300", kpi: [30, 100, 1, 15, 12, 1], rev: [80, 100], np: [8, 10], cagr: [-4, null, null], nifty1y: -4.1 };
  const t = ratioTiles(f, false);
  assert.deepEqual(t.map((x) => x.label), ["P/B", "Revenue growth", "Profit growth", "Net margin", "1Y vs Nifty"]);
  assert.equal(t[4].value, "0 pts");
  assert.equal(t[4].sub, "Nifty −4.1%");
  assert.deepEqual(ratioTiles(f, true).map((x) => x.value), ["3.0x", "+25.0%", "n/m", "n/m", "0 pts"]);
  assert.deepEqual(ratioTiles({ ticker: "B" }, false).map((x) => x.value), ["—", "—", "—", "—", "—"]);
});

test("lender ROA is standalone net profit over average total assets; growths year on year", () => {
  const l = lenderRatiosFrom({
    gnpa: 1.2, nnpa: 0.3, finMargin: 12, finMarginYear: "Mar 2026", netProfit: 100,
    totalAssets: [1100, 900], deposits: [880, 800], bsYear: "Mar 2026", quarter: "Sep 2026",
  });
  close(l.roa!, 10);
  close(l.depositGrowth!, 10);
  close(l.bsGrowth!, (1100 / 900 - 1) * 100);
  assert.deepEqual([l.gnpa, l.nnpa, l.finMargin, l.quarter], [1.2, 0.3, 12, "Sep 2026"]);
});

test("lender ROA is null when the balance-sheet year and the profit year differ, or a figure is missing", () => {
  const base = { gnpa: null, nnpa: null, finMargin: null, netProfit: 100, totalAssets: [1100, 900] as [number, number], deposits: null, quarter: null };
  assert.equal(lenderRatiosFrom({ ...base, finMarginYear: "Mar 2026", bsYear: "Mar 2025" }).roa, null);
  assert.equal(lenderRatiosFrom({ ...base, finMarginYear: null, bsYear: "Mar 2026" }).roa, null);
  assert.equal(lenderRatiosFrom({ ...base, finMarginYear: "Mar 2026", bsYear: "Mar 2026", netProfit: null }).roa, null);
  assert.equal(lenderRatiosFrom({ ...base, finMarginYear: "Mar 2026", bsYear: "Mar 2026", totalAssets: [1100, null] }).roa, null);
  // An NBFC has no deposits; a previous figure of zero gives no growth rather than infinity.
  const nbfc = lenderRatiosFrom({ ...base, finMarginYear: "Mar 2026", bsYear: "Mar 2026", totalAssets: [1100, 0] });
  assert.deepEqual([nbfc.depositGrowth, nbfc.bsGrowth, nbfc.roa], [null, null, null]);
});

test("lenderRatios reads the block for lenders only", () => {
  const block = lenderRatiosFrom({ gnpa: 1, nnpa: 0.2, finMargin: 3, finMarginYear: "Mar 2026", netProfit: 10, totalAssets: [110, 90], deposits: null, bsYear: "Mar 2026", quarter: "Sep 2026" });
  assert.equal(lenderRatios({ ticker: "HDFCBANK", kind: "lender", lender: block }), block);
  assert.equal(lenderRatios({ ticker: "HDFCBANK", kind: "lender", lender: null }), null);
  assert.equal(lenderRatios({ ticker: "TCS", kind: "operating", lender: block }), null);
});

test("a bank's or an insurer's net margin and ROCE are not meaningful; an operating company is unchanged", () => {
  const figs = { price: "Rs 300", kpi: [30, 100, 1, 15, 12, 1], rev: [80, 100], np: [8, 10] };
  const bank = keyRatios({ ticker: "HDFCBANK", kind: "lender", ...figs });
  assert.equal(bank.netMargin, null);
  assert.deepEqual(bank.notMeaningful, ["netMargin", "roce"]);
  close(bank.revGrowth!, 25);
  close(bank.pb!, 3);
  assert.deepEqual(keyRatios({ ticker: "HDFCLIFE", kind: "insurer", ...figs }).notMeaningful, ["netMargin", "roce"]);
  // Without a kind on the row, the ticker's kind in code decides.
  assert.equal(keyRatios({ ticker: "SBIN", ...figs }).netMargin, null);
  const op = keyRatios({ ticker: "TCS", kind: "operating", ...figs });
  close(op.netMargin!, 10);
  assert.deepEqual(op.notMeaningful, []);
});

test("a snapshot taken before the day's Nifty close is stored compares both 1Y returns to the last stored close", () => {
  const nifty = [
    { t: "2025-11-18", c: 100 },
    { t: "2026-11-18", c: 105 },
  ];
  // The 19 Nov snapshot (an intraday refresh): 19 Nov's index close isn't stored, so 18 Nov is used.
  assert.equal(niftyDayFor(nifty, "2026-11-19"), "2026-11-18");
  assert.equal(niftyDayFor(nifty, "2026-11-18"), "2026-11-18");
  assert.equal(niftyDayFor(nifty, "2026-12-30"), null, "nothing within a week: no day");
  assert.deepEqual([...niftyFallbackDays(nifty, ["2026-11-19", "2026-11-18"])], [["2026-11-19", "2026-11-18"]]);
  const stock = [
    { t: "2025-11-18", c: 200 },
    { t: "2026-11-18", c: 260 },
  ];
  const out = withNifty({ A: { ticker: "A", cagr: [99, null, null] }, B: { ticker: "B", cagr: [10, null, null] } }, new Map([["A", "2026-11-19"], ["B", "2026-11-19"]]), nifty, new Map([["A", stock]]));
  close(out.A.nifty1y!, 5);
  assert.equal(out.A.nifty1yDay, "2026-11-18");
  close(out.A.ret1yMatched!, 30);
  // The stock's own stored return to 18 Nov, not Screener's figure for 19 Nov.
  const k = keyRatios(out.A);
  close(k.vsNifty!, 25);
  assert.equal(k.vsNiftyDay, "18 Nov");
  const tile = ratioTiles(out.A, false).find((t) => t.label === "1Y vs Nifty")!;
  assert.deepEqual([tile.value, tile.sub], ["+25 pts", "Nifty +5.0% · to 18 Nov"]);
  // C's last stored close is 17 Nov (fetched before the 18th's close): both run to 17 Nov.
  const nifty3 = [{ t: "2025-11-17", c: 100 }, { t: "2025-11-18", c: 100 }, { t: "2026-11-17", c: 104 }, { t: "2026-11-18", c: 105 }];
  const c3 = withNifty({ C: { ticker: "C", cagr: [9, null, null] } }, new Map([["C", "2026-11-19"]]), nifty3, new Map([["C", [{ t: "2025-11-17", c: 50 }, { t: "2026-11-17", c: 60 }]]]));
  assert.equal(c3.C.nifty1yDay, "2026-11-17");
  close(c3.C.nifty1y!, 4);
  close(keyRatios(c3.C).vsNifty!, 16);
  // No stored closes for B on that day: no figure, with its reason.
  const kb = keyRatios(out.B);
  assert.equal(kb.vsNifty, null);
  assert.equal(ratioTiles(out.B, false).find((t) => t.label === "1Y vs Nifty")!.sub, "No stored close for that day");
  // The snapshot day's close stored: Screener's 1Y return as before, no day named.
  const same = withNifty({ C: { ticker: "C", cagr: [12, null, null] } }, new Map([["C", "2026-11-18"]]), nifty);
  assert.equal(same.C.nifty1yDay, undefined);
  close(keyRatios(same.C).vsNifty!, 7);
  // Listed under a year: says so.
  assert.equal(keyRatios({ ticker: "D", nifty1y: 5 }).vsNiftyNote, "Listed under a year");
});

test("a missing P/E or ROE says why", () => {
  assert.equal(missingRatioReason({ ticker: "A", np: [1, 2, 3, 4, -5] }, "pe"), "Loss in FY26");
  assert.equal(missingRatioReason({ ticker: "A", np: [1, 2, 3, 62, null], kpi: [null, -10, null, null, null, 10] }, "roe"), "Negative equity");
  // SPICEJET's shape: a profit in its latest year but no trailing P/E (a loss over the last four quarters).
  assert.equal(missingRatioReason({ ticker: "A", np: [1, 2, 3, 62, null], kpi: [null, -10, null, null, null, 10] }, "pe"), "No trailing P/E on Screener");
  assert.equal(missingRatioReason({ ticker: "A", np: [1, 2, 3, 4, 73] }, "roe"), "None on Screener");
});
