import { test } from "node:test";
import assert from "node:assert/strict";
import { pulseHeading, pulseItems } from "./pulse";

const IDX = [
  { name: "Nifty 50", ret: { "1D": 0.42, "1W": -1.26, "1M": -0.04, "3Y": 140.2 } },
  { name: "Sensex", ret: { "1D": 0.38 } },
];

test("the heading carries the latest close's date", () => {
  assert.equal(pulseHeading("2026-11-03"), "Market pulse · 3 Nov 2026");
  assert.equal(pulseHeading(null), "Market pulse");
});

test("index returns are signed, toned by the shown figure and labelled with the period", () => {
  const d1 = pulseItems(IDX, null, "1D");
  assert.deepEqual(
    d1.map((i) => [i.label, i.value, i.tone]),
    [
      ["Nifty 50 · 1D", "+0.4%", "pos"],
      ["Sensex · 1D", "+0.4%", "pos"],
    ],
  );
  const w = pulseItems(IDX, null, "1W");
  assert.deepEqual([w[0].value, w[0].tone], ["−1.3%", "neg"]);
  // Missing: a dash, untoned, not a zero.
  assert.deepEqual([w[1].value, w[1].tone], ["—", "none"]);
  // A tiny move reads 0.0%, never −0.0%, and is neither green nor red.
  assert.deepEqual([pulseItems(IDX, null, "1M")[0].value, pulseItems(IDX, null, "1M")[0].tone], ["0.0%", "flat"]);
  assert.equal(pulseItems(IDX, null, "3Y")[0].value, "+140%");
});

test("FII and DII net read in ₹ crore with Indian grouping and their own date, whatever the period", () => {
  const flows = { day: "2026-11-03", fiiNetCr: -2418.4, diiNetCr: 13106.6 };
  for (const p of ["1D", "1Y"] as const) {
    const items = pulseItems(IDX, flows, p).slice(2);
    assert.deepEqual(
      items.map((i) => [i.label, i.value, i.tone]),
      [
        ["FII net · 3 Nov", "−₹2,418 Cr", "neg"],
        ["DII net · 3 Nov", "+₹13,107 Cr", "pos"],
      ],
    );
  }
  const flat = pulseItems([], { day: "2026-11-03", fiiNetCr: 0.2, diiNetCr: Number.NaN }, "1D");
  assert.deepEqual(flat.map((i) => [i.value, i.tone]), [["₹0 Cr", "flat"], ["—", "none"]]);
});
