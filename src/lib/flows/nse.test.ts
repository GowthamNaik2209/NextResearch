import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCashFlows, parseCsv, parseDayMonYear, parseDealsCsv, parseDealsJson, parseParticipantOi } from "./nse";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

test("NSE's dates read as UTC midnight", () => {
  assert.deepEqual(parseDayMonYear("30-Oct-2026"), day("2026-10-30"));
  assert.deepEqual(parseDayMonYear("01-OCT-2026"), day("2026-10-01"));
  assert.equal(parseDayMonYear("2026-10-30"), null);
  assert.equal(parseDayMonYear("31-Foo-2026"), null);
});

test("the CSV reader handles quotes, commas inside cells, CRLF, a BOM and no final newline", () => {
  assert.deepEqual(parseCsv('﻿"a ","b"\r\n"1,000","x ""y"""\r\n\r\n3,4'), [
    ["a ", "b"],
    ["1,000", 'x "y"'],
    ["3", "4"],
  ]);
});

test("cash: FII/FPI and DII rows from fiidiiTradeReact", () => {
  const c = parseCashFlows(JSON.parse(fixture("fiidii-trade.json")));
  assert.ok(c);
  assert.deepEqual(c.day, day("2026-10-30"));
  assert.deepEqual(c.fii, { buyCr: 20564.02, sellCr: 16965.48, netCr: 3598.54 });
  assert.deepEqual(c.dii, { buyCr: 16643.55, sellCr: 17461.06, netCr: -817.51 });
});

test("cash: anything but both rows for one day is null", () => {
  assert.equal(parseCashFlows(null), null);
  assert.equal(parseCashFlows({}), null);
  assert.equal(parseCashFlows([{ category: "DII", date: "30-Oct-2026", buyValue: "1", sellValue: "2", netValue: "-1" }]), null);
  assert.equal(
    parseCashFlows([
      { category: "DII", date: "30-Oct-2026", buyValue: "1", sellValue: "2", netValue: "-1" },
      { category: "FII/FPI", date: "29-Oct-2026", buyValue: "1", sellValue: "2", netValue: "-1" },
    ]),
    null,
  );
});

test("participant OI: FII and DII index futures, dated by the title line", () => {
  const oi = parseParticipantOi(fixture("fao_participant_oi_30102026.csv"));
  assert.ok(oi);
  assert.deepEqual(oi.day, day("2026-10-30"));
  assert.deepEqual(oi.fii, { idxFutLong: 34437, idxFutShort: 275190 });
  assert.deepEqual(oi.dii, { idxFutLong: 46993, idxFutShort: 6470 });
});

test("participant OI: a page that isn't the file is null", () => {
  assert.equal(parseParticipantOi("<html>404</html>"), null);
  assert.equal(parseParticipantOi('"as on Oct 30, 2026"\nClient Type,Foo\nFII,1'), null);
});

test("deals: the archive's bulk.csv", () => {
  const deals = parseDealsCsv(fixture("bulk.csv"), "BULK");
  assert.equal(deals.length, 88);
  assert.deepEqual(deals[0], {
    day: day("2026-10-30"),
    kind: "BULK",
    symbol: "AEROFLEX",
    securityName: "Aeroflex Industries Ltd",
    clientName: "QE SECURITIES LLP",
    side: "BUY",
    quantity: 670611,
    price: 540.12,
  });
  assert.ok(deals.every((d) => d.kind === "BULK" && (d.side === "BUY" || d.side === "SELL")));
});

test("deals: the archive's block.csv (no Remarks column)", () => {
  const deals = parseDealsCsv(fixture("block.csv"), "BLOCK");
  assert.equal(deals.length, 12);
  const sg = deals.find((d) => d.clientName === "SOCIETE GENERALE");
  assert.deepEqual(sg && { symbol: sg.symbol, side: sg.side, quantity: sg.quantity, price: sg.price }, { symbol: "SWIGGY", side: "BUY", quantity: 23740000, price: 180.65 });
});

test("deals: the historicalOR CSV (quoted, Indian digit grouping, padded header) matches the archive", () => {
  const hist = parseDealsCsv(fixture("historical-bulk-deals.csv"), "BULK");
  const oct30 = hist.filter((d) => d.day.getTime() === day("2026-10-30").getTime());
  const oct29 = hist.filter((d) => d.day.getTime() === day("2026-10-29").getTime());
  assert.equal(oct30.length, 88);
  assert.equal(oct29.length, 71);
  const key = (d: { symbol: string; clientName: string; side: string; quantity: number; price: number }) => `${d.symbol}|${d.clientName}|${d.side}|${d.quantity}|${d.price}`;
  assert.deepEqual(oct30.map(key).sort(), parseDealsCsv(fixture("bulk.csv"), "BULK").map(key).sort());
  // "1,45,72,000" is 14,572,000 shares.
  const block = parseDealsCsv(fixture("historical-block-deals.csv"), "BLOCK");
  assert.equal(block.length, 48);
  assert.equal(block.find((d) => d.clientName === "PABRAI WAGONS ETF")?.quantity, 14572000);
});

test("deals: the historicalOR JSON gives the same rows as its CSV", () => {
  const json = parseDealsJson(JSON.parse(fixture("historical-block-deals.json")), "BLOCK");
  assert.equal(json.length, 12);
  const csv = parseDealsCsv(fixture("historical-block-deals.csv"), "BLOCK").slice(0, 12);
  assert.deepEqual(json, csv);
  assert.deepEqual(parseDealsJson({}, "BULK"), []);
});

test("deals: an unexpected header reads nothing rather than wrong columns", () => {
  assert.deepEqual(parseDealsCsv("Foo,Bar\n1,2", "BULK"), []);
  assert.deepEqual(parseDealsCsv("", "BULK"), []);
});
