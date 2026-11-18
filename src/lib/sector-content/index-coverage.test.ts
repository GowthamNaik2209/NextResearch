import { test } from "node:test";
import assert from "node:assert/strict";
import { indexCoverage } from "./index-coverage";

const rows = [
  { symbol: "A", industry: "Auto", name: "A Ltd" },
  { symbol: "B", industry: "Auto", name: "B Ltd" },
  { symbol: "C", industry: "Auto", name: "C Ltd" },
  { symbol: "D", industry: "Metals", name: "D Ltd" },
  { symbol: "D", industry: "Metals", name: "D Ltd again" },
  { symbol: "E", industry: "Banks", name: "E Ltd" },
];

test("per-industry and total coverage, most missing first", () => {
  const r = indexCoverage(rows, new Set(["A", "D", "ZZ"]));
  assert.deepEqual(r.industries, [
    { industry: "Auto", covered: 1, total: 3, missing: ["B", "C"] },
    { industry: "Banks", covered: 0, total: 1, missing: ["E"] },
    { industry: "Metals", covered: 1, total: 1, missing: [] },
  ]);
  assert.equal(r.covered, 2);
  assert.equal(r.total, 5);
  assert.equal(r.percent, 40);
});

test("empty list is 0%", () => {
  assert.equal(indexCoverage([], new Set()).percent, 0);
});

test("placeholder rows are skipped", () => {
  const r = indexCoverage(
    [
      { symbol: "A", industry: "Auto", name: "A" },
      { symbol: "DUMMYHEG", industry: "Auto", name: "Dummy" },
      { symbol: "HFCL", industry: "Auto", name: "BE-series member" },
    ],
    new Set(["A"]),
  );
  assert.equal(r.total, 2);
  assert.deepEqual(r.industries[0].missing, ["HFCL"]);
});

test("percent rounds to the nearest whole number", () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ symbol: "S" + i, industry: "I", name: "n" }));
  assert.equal(indexCoverage(mk(3), new Set(["S0"])).percent, 33);
  assert.equal(indexCoverage(mk(3), new Set(["S0", "S1"])).percent, 67);
  assert.equal(indexCoverage(mk(8), new Set(["S0"])).percent, 13);
});
