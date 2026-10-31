import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nsdlDate, parseDiiReport, parseFortnightList, parseFpiArchive, parseSectorReport, tradeDatesFor } from "./nsdl";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

test("the fortnight list: newest first, ~/ resolved, every spelling of the date", () => {
  const list = parseFortnightList(fixture("nsdl-fortnight-list.html"));
  assert.equal(list.length, 35);
  assert.deepEqual(list[0], {
    periodEnd: day("2026-10-15"),
    url: "https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSector_Oct152026.html",
  });
  assert.deepEqual(list[1].periodEnd, day("2026-09-30"));
  // "February 29, 2012 " and the misspelt "FIIInvestSecor_Jan312012.html".
  assert.ok(list.some((l) => l.periodEnd.getTime() === day("2012-02-29").getTime()));
  assert.equal(list.at(-1)?.url, "https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSecor_Jan312012.html");
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].periodEnd > list[i].periodEnd);
});

test("a report: this fortnight's net equity and closing equity AUC per sector (Rs crore)", () => {
  const r = parseSectorReport(fixture("nsdl-sector-oct152026.html"));
  assert.ok(r);
  assert.deepEqual(r.periodEnd, day("2026-10-15"));
  assert.equal(r.periodLabel, "October 01-15, 2026");
  assert.deepEqual(
    r.rows.map((x) => x.sector),
    ["Automobile and Auto Components", "Capital Goods", "Financial Services", "Information Technology", "Oil, Gas & Consumable Fuels", "Sovereign", "Others", "Grand Total"],
  );
  const by = new Map(r.rows.map((x) => [x.sector, x]));
  // Data cell 50 (INR equity in the third group) and 74 (INR equity in the fourth).
  assert.deepEqual(by.get("Automobile and Auto Components"), { sector: "Automobile and Auto Components", netEquityCr: -6533, aucEquityCr: 477593 });
  assert.deepEqual(by.get("Information Technology"), { sector: "Information Technology", netEquityCr: 2599, aucEquityCr: 398397 });
  assert.deepEqual(by.get("Oil, Gas & Consumable Fuels"), { sector: "Oil, Gas & Consumable Fuels", netEquityCr: -3680, aucEquityCr: 429974 });
  assert.deepEqual(by.get("Sovereign"), { sector: "Sovereign", netEquityCr: 0, aucEquityCr: 0 });
  assert.deepEqual(by.get("Grand Total"), { sector: "Grand Total", netEquityCr: -47955, aucEquityCr: 6594378 });
});

test("a report in the older, narrower layout (before September 2024) reads the same columns", () => {
  const r = parseSectorReport(fixture("nsdl-sector-apr302024.html"));
  assert.ok(r);
  assert.deepEqual(r.periodEnd, day("2024-04-30"));
  assert.equal(r.periodLabel, "April 16-30, 2024");
  assert.deepEqual(r.rows[0], { sector: "Automobile and Auto Components", netEquityCr: -560, aucEquityCr: 507247 });
  assert.deepEqual(r.rows.at(-1), { sector: "Grand Total", netEquityCr: -14079, aucEquityCr: 6627680 });
});

test("a report from before Aug 2023 (single-quoted colspans, five columns a group) reads the same columns", () => {
  const r = parseSectorReport(fixture("nsdl-sector-jul312023.html"));
  assert.ok(r);
  assert.deepEqual(r.periodEnd, day("2023-07-31"));
  assert.equal(r.periodLabel, "July 16-31, 2023");
  assert.deepEqual(r.rows[0], { sector: "Automobile and Auto Components", netEquityCr: 1609, aucEquityCr: 345726 });
  assert.deepEqual(r.rows.at(-1), { sector: "Grand Total", netEquityCr: 15958, aucEquityCr: 5324288 });
});

test("a page that isn't a report is null", () => {
  assert.equal(parseSectorReport("<html><body>Server Error</body></html>"), null);
  // Equity no longer first in the INR block: refuse rather than read the wrong column.
  const shuffled = fixture("nsdl-sector-oct152026.html").replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*Sr\. No\.[\s\S]*?<\/tr>/, (tr) => tr.replace(/>Equity</g, ">Debt<"));
  assert.equal(parseSectorReport(shuffled), null);
});

// ---- confirmed daily FPI and DII figures ----

test("FPI archive: the equity Stock Exchange row of each reporting day", () => {
  const rows = parseFpiArchive(fixture("nsdl-fpi-archive-202610.html"));
  assert.deepEqual(
    rows.map((r) => [r.reportDay.toISOString().slice(0, 10), r.netCr]),
    [
      ["2026-10-01", -9569.57],
      ["2026-10-27", -1340.52],
      ["2026-10-28", 4197.9],
      ["2026-10-29", 1113],
      ["2026-10-30", -812.73],
    ],
  );
  assert.deepEqual(rows[0], { reportDay: day("2026-10-01"), buyCr: 17667.9, sellCr: 27237.47, netCr: -9569.57 });
});

test("FPI archive: the 2021 layout (one Debt row, no MF/AIF rows) reads the same", () => {
  const rows = parseFpiArchive(fixture("nsdl-fpi-archive-202110.html"));
  assert.deepEqual(rows.map((r) => r.netCr), [-2034.15, 1594.89]);
  assert.deepEqual(rows[0].reportDay, day("2021-10-01"));
});

test("DII report: only the Total / Equity / Stock Exchange row", () => {
  assert.deepEqual(parseDiiReport(fixture("nsdl-dii-20261030.html")), { reportDay: day("2026-10-30"), buyCr: 18635.2, sellCr: 16732.99, netCr: 1902.2 });
  assert.equal(parseDiiReport(fixture("nsdl-dii-nodata.html")), null);
});

test("a reporting day's trade date is the reporting day before it in NSDL's list", () => {
  const list = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-05", "2026-10-19", "2026-10-21", "2026-10-29", "2026-10-30"].map(day);
  const t = tradeDatesFor(list);
  const at = (s: string) => t.get(day(s).getTime())?.toISOString().slice(0, 10);
  assert.equal(at("2026-10-30"), "2026-10-29");
  assert.equal(at("2026-10-01"), "2026-09-30");
  assert.equal(at("2026-10-05"), "2026-10-01"); // 2 Oct (Gandhi Jayanti) and the weekend between
  assert.equal(at("2026-10-21"), "2026-10-19"); // 20 Oct (Dussehra)
  // The first of the list, and one after a gap longer than a week, use our NSE calendar.
  assert.equal(at("2026-09-29"), "2026-09-28");
  assert.equal(at("2026-10-19"), "2026-10-16");
  assert.equal(at("2026-10-29"), "2026-10-28");
});

test("NSDL's forms take DD-Mon-YYYY", () => {
  assert.equal(nsdlDate(day("2026-10-31")), "31-Oct-2026");
  assert.equal(nsdlDate(day("2021-03-05")), "05-Mar-2021");
});
