import { test } from "node:test";
import assert from "node:assert/strict";
import { buildXlsx, colName, sheetName } from "../xlsx";
import { basketWorkbook, workbookFileName } from "./workbook";
import { heldStrategy } from "./strategy";
import type { BasketStock } from "./industry";

// Reads back an uncompressed zip (what buildXlsx writes): each local file header, its name and bytes.
function unzipStored(b: Uint8Array): Record<string, Uint8Array> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: Record<string, Uint8Array> = {};
  for (let at = 0; v.getUint32(at, true) === 0x04034b50; ) {
    assert.equal(v.getUint16(at + 8, true), 0, "stored");
    const size = v.getUint32(at + 18, true);
    const nameLen = v.getUint16(at + 26, true);
    const name = new TextDecoder().decode(b.subarray(at + 30, at + 30 + nameLen));
    out[name] = b.subarray(at + 30 + nameLen, at + 30 + nameLen + size);
    at += 30 + nameLen + size;
  }
  return out;
}
const strFromU8 = (u: Uint8Array) => new TextDecoder().decode(u);

const proj = (r: number) => ({
  ok: true as const,
  years: 5,
  method: "pe" as const,
  span: "FY22-FY26",
  beta: 1.1,
  betaSource: "prices" as const,
  vol: 0.3,
  volSource: "prices" as const,
  divYield: 0.01,
  market: 0.142,
  growth: 0.12,
  marginNow: 0.1,
  marginThen: 0.105,
  score: 0.176,
  z: 0.5,
  tilt: 0.0075,
  ret: { "1": [r - 0.1, r, r + 0.1] as [number, number, number], "2": [r, r * 2, r * 3] as [number, number, number] },
});
const stock = (ticker: string, p: BasketStock["proj"]): BasketStock => ({ ticker, name: `${ticker} Ltd`, mcapCr: 1000, pe: 20, role: "", layer: "Layer", industries: [{ slug: "ev4w", name: "EV" }], layerIn: {}, proj: p });

test("xlsx: column names, sheet names, a valid zip with every part", () => {
  assert.equal(colName(0), "A");
  assert.equal(colName(25), "Z");
  assert.equal(colName(26), "AA");
  const taken = new Set<string>();
  assert.equal(sheetName("A/B:C", taken), "A B C");
  assert.equal(sheetName("A B C", taken), "A B C (2)");
  const bytes = buildXlsx([{ name: "One", rows: [["x", 1.5, null], ["<&>", -2]], bold: [0], widths: [10], freezeTop: true }]);
  const files = unzipStored(bytes);
  for (const f of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) assert.ok(files[f], f);
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);
  assert.match(xml, /<c r="B1" s="1"><v>1.5<\/v><\/c>/);
  assert.match(xml, /&lt;&amp;&gt;/);
  assert.match(xml, /state="frozen"/);
});

test("workbook: every sheet, projections with picks and the left-out stock", () => {
  const stocks = [stock("A", proj(0.2)), stock("B", proj(-0.1)), stock("C", { ok: false, years: 2, reason: "2 years of results (needs 3)" })];
  const shares = new Map([["A", 0.5], ["B", 0.3], ["C", 0.2]]);
  const sheets = basketWorkbook({
    name: "Test basket",
    kind: "Your basket",
    description: null,
    url: "https://example.com/baskets/x",
    exportedAt: new Date("2026-10-24T10:00:00Z"),
    strategy: heldStrategy(),
    range: "1Y",
    benchName: "Nifty 50",
    stocks,
    layerOf: (s) => s.layer,
    shares,
    picks: ["A", "C"],
    backtest: { points: [{ t: "2025-10-24", c: 100 }, { t: "2026-10-23", c: 110 }], holdings: [{ ticker: "A", weight: 0.5, endWeight: 0.55, ret: 20, contribution: 10 }] },
    bench: [{ t: "2025-10-24", c: 20000 }, { t: "2026-10-23", c: 22000 }],
    stats: null,
    rel: null,
    projection: { settings: { h: 1, scenario: "base" }, on: true, sim: null, vol: 0.2, dates: ["2026-10-23", "2026-10-30"], path: [0, 1] },
    disclaimer: "Not advice.",
  });
  assert.deepEqual(sheets.map((s) => s.name), ["Overview", "Stocks", "Backtest stats", "Backtest series", "Projection", "Projection path", "Method"]);
  const stocksSheet = sheets[1].rows;
  assert.equal(stocksSheet[3][11], "No");
  assert.equal(stocksSheet[3][12], "2 years of results (needs 3)");
  // v2 columns: beta, its source, volatility % and the 2Y Bull at the end.
  const head = stocksSheet[0];
  const col = (name: string) => head.indexOf(name);
  assert.equal(stocksSheet[1][col("Beta")], 1.1);
  assert.equal(stocksSheet[1][col("Beta source")], "2Y weekly vs Nifty 50");
  assert.equal(stocksSheet[1][col("Volatility %")], 30);
  assert.equal(stocksSheet[1][col("Tilt %")], 0.75);
  assert.equal(stocksSheet[1][col("2Y Bull %")], 60);
  assert.ok(!head.some((h) => typeof h === "string" && /exit|capped|multiple/i.test(h)));
  // Base 1Y for the basket: A 0.625 × 20% + B 0.375 × −10% = 8.75%; 2Y Bull: 0.625 × 60% + 0.375 × −30% = 26.25%.
  const proj1 = sheets[4].rows.find((r) => r[0] === "Next 1 year")!;
  assert.equal(proj1[2], 8.75);
  assert.equal(sheets[4].rows.find((r) => r[0] === "Next 2 years")![3], 26.25);
  // The method sheet carries the market inputs and their dates.
  const method = sheets[6].rows.map((r) => r[0]).join("\n");
  assert.match(method, /7\.47% \(23 Oct 2026\)/);
  assert.match(method, /7\.08% \(Jan 2026\)/);
  // Your picks: A and C, C left out, so A alone: 20%.
  const picksAt = sheets[4].rows.findIndex((r) => r[0] === "Your 2 picks");
  assert.equal(sheets[4].rows[picksAt + 1][2], 20);
  assert.ok(sheets[4].rows.some((r) => r[0] === "C" && r[2] === "2 years of results (needs 3)"));
  // Series rebased to 100 with the benchmark beside.
  assert.deepEqual(sheets[3].rows[2], ["2026-10-23", 110, 110]);
  assert.ok(buildXlsx(sheets).length > 1000);
  assert.equal(workbookFileName("EV 4W basket", "1Y"), "ev-4w-basket-1Y.xlsx");
});
