import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMfTrends, sebiDate } from "./sebi";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

test("SEBI's mutual-fund trends: the equity row of each trading day, by trade date", () => {
  const rows = parseMfTrends(fixture("sebi-mf-202610.html"));
  assert.equal(rows.length, 14);
  assert.deepEqual(rows[0], { day: day("2026-10-01"), buyCr: 18661.67, sellCr: 11096.41, netCr: 7565.26 });
  assert.deepEqual(rows.at(-1), { day: day("2026-10-23"), buyCr: 15208.64, sellCr: 12406.31, netCr: 2802.33 });
  // Negative nets are in brackets.
  assert.equal(rows.find((r) => r.day.getTime() === day("2026-10-16").getTime())?.netCr, -3374.45);
  // SEBI has no row for 14 Oct 2026 (an NSE trading day); the gap is SEBI's.
  assert.ok(!rows.some((r) => r.day.getTime() === day("2026-10-14").getTime()));
  // Neither the Total row nor the derivatives table is read.
  assert.ok(rows.every((r) => r.day.getUTCMonth() === 9 && r.buyCr < 100_000));
});

test("SEBI's 2021 figures read the same (spot check 01-Mar-2021)", () => {
  const rows = parseMfTrends(fixture("sebi-mf-202103.html"));
  assert.deepEqual(rows[0], { day: day("2021-03-01"), buyCr: 2435.68, sellCr: 1942.6, netCr: 493.08 });
  assert.equal(rows[1].netCr, -259.58);
});

test("a month with nothing reported yet is an empty list", () => {
  assert.deepEqual(parseMfTrends(fixture("sebi-mf-empty.html")), []);
});

test("SEBI's search takes DD-MM-YYYY", () => {
  assert.equal(sebiDate(day("2021-03-01")), "01-03-2021");
});

test("a row with nothing bought or sold (SEBI's 12 Jul 2025, a Saturday) is skipped", () => {
  const html = `<table><tr><td>Trading Date</td><td>Debt/Equity</td><td>P</td><td>S</td><td>N</td></tr>
<tr><td rowspan="2">11 Jul, 2025</td><td>Equity</td><td>11835.00</td><td>9000.00</td><td>2835.00</td></tr>
<tr><td rowspan="2">12 Jul, 2025</td><td>Equity</td><td>0.00</td><td>0.00</td><td>0.00</td></tr></table>`;
  assert.deepEqual(parseMfTrends(html).map((r) => r.day.toISOString().slice(0, 10)), ["2025-07-11"]);
});
