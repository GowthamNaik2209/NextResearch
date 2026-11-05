import { test } from "node:test";
import assert from "node:assert/strict";
import { keyRatios, oneYearTo, withNifty } from "./key-ratios";
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
  assert.deepEqual(k, { pb: null, fy: null, caution: null, revGrowth: null, profitGrowth: null, profitNote: null, netMargin: null, nifty1y: null, vsNifty: null });
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
