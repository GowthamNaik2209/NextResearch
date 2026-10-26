import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBseCode, parseQuarters, quarterOfHeader } from "./quarterly";

const iso = (d: Date) => d.toISOString().slice(0, 10);

// A cut-down "Quarterly Results" section in Screener's markup (row labels carry a "+" expander button).
const section = (cols: string[], rows: [string, string[]][]) => `
<section id="quarters" class="card card-large">
  <div class="responsive-holder"><table class="data-table responsive-text-nowrap">
    <thead><tr><th class="text"></th>${cols.map((c) => `<th class="">${c}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map(([label, vals]) => `<tr><td class="text"><button class="button-plain">${label}&nbsp;<span class="blue-icon">+</span></button></td>${vals.map((v) => `<td class="">${v}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table></div>
</section>`;

test("column headers map to Indian fiscal quarters (FY ends March, Q1 = Apr-Jun)", () => {
  assert.deepEqual(quarterOfHeader("Jun 2026"), { fiscalYear: 2027, quarter: 1 });
  assert.deepEqual(quarterOfHeader("Sep 2026"), { fiscalYear: 2027, quarter: 2 });
  assert.deepEqual(quarterOfHeader("Dec 2025"), { fiscalYear: 2026, quarter: 3 });
  assert.deepEqual(quarterOfHeader("Mar 2022"), { fiscalYear: 2022, quarter: 4 });
  assert.deepEqual(quarterOfHeader(" Mar 2026 "), { fiscalYear: 2026, quarter: 4 });
});

test("headers that are not a calendar quarter-end are rejected", () => {
  assert.equal(quarterOfHeader("Aug 2025"), null); // odd year-end company
  assert.equal(quarterOfHeader("Jan 2026"), null);
  assert.equal(quarterOfHeader("TTM"), null);
  assert.equal(quarterOfHeader(""), null);
  assert.equal(quarterOfHeader("Raw PDF"), null);
});

test("a manufacturer's quarterly table", () => {
  const html = section(
    ["Dec 2025", "Mar 2026", "Jun 2026"],
    [
      ["Sales", ["13,675", "14,612", "15,300"]],
      ["Expenses", ["9,800", "10,658", "10,882"]],
      ["Operating Profit", ["3,875", "3,954", "4,418"]],
      ["OPM %", ["28%", "27%", "29%"]],
      ["Other Income", ["-118", "458", "520"]],
      ["Interest", ["81", "86", "100"]],
      ["Depreciation", ["651", "775", "739"]],
      ["Profit before tax", ["3,025", "3,551", "4,099"]],
      ["Tax %", ["19%", "23%", "29%"]],
      ["Net Profit", ["2,481", "2,710", "2,901"]],
      ["EPS in Rs", ["10.31", "11.31", "12.06"]],
      ["Raw PDF", ["", "", ""]],
    ],
  );
  const p = parseQuarters(html);
  assert.equal(p.layout, "standard");
  assert.deepEqual(p.skipped, []);
  assert.equal(p.rows.length, 3);
  const last = p.rows[2];
  assert.deepEqual([last.fiscalYear, last.quarter, iso(last.periodEnd)], [2027, 1, "2026-06-30"]);
  assert.equal(last.revenueCr, 15300);
  assert.equal(last.expensesCr, 10882);
  assert.equal(last.operatingProfitCr, 4418);
  assert.equal(last.opmPct, 29);
  assert.equal(last.otherIncomeCr, 520);
  assert.equal(last.interestCr, 100);
  assert.equal(last.depreciationCr, 739);
  assert.equal(last.pbtCr, 4099);
  assert.equal(last.netProfitCr, 2901);
  assert.equal(last.epsRs, 12.06);
  assert.equal(p.rows[0].otherIncomeCr, -118);
  assert.deepEqual([p.rows[0].fiscalYear, p.rows[0].quarter, iso(p.rows[0].periodEnd)], [2026, 3, "2025-12-31"]);
});

test("a lender's table: Revenue / Financing Profit, missing rows stay null, -0 is 0", () => {
  const html = section(
    ["Jun 2026", "Sep 2026"],
    [
      ["Revenue", ["90,575", "95,132"]],
      ["Interest", ["47,626", "50,667"]],
      ["Expenses", ["58,292", "50,029"]],
      ["Financing Profit", ["-15,342", "-5,565"]],
      ["Financing Margin %", ["-17%", "-6%"]],
      ["Other Income", ["42,535", "34,227"]],
      ["Depreciation", ["-0", "-0"]],
      ["Profit before tax", ["27,193", "28,663"]],
      ["Net Profit", ["20,383", "21,537"]],
      ["EPS in Rs", ["12.50", "13.43"]],
      ["Gross NPA %", ["", ""]],
    ],
  );
  const p = parseQuarters(html);
  assert.equal(p.layout, "lender");
  assert.equal(p.rows[1].revenueCr, 95132);
  assert.equal(p.rows[1].operatingProfitCr, -5565);
  assert.equal(p.rows[1].opmPct, -6);
  assert.ok(Object.is(p.rows[1].depreciationCr, 0));
  assert.deepEqual([p.rows[1].fiscalYear, p.rows[1].quarter], [2027, 2]);
});

test("odd quarter-ends are skipped and reported; empty columns and duplicates don't make rows", () => {
  const html = section(
    ["Aug 2025", "Nov 2025", "Dec 2025", "Mar 2026", "Mar 2026"],
    [
      ["Sales", ["10", "11", "", "13", "14"]],
      ["Net Profit", ["1", "2", "", "3", "4"]],
    ],
  );
  const p = parseQuarters(html);
  assert.deepEqual(p.skipped, ["Aug 2025", "Nov 2025"]);
  assert.equal(p.rows.length, 1); // Dec 2025 is empty; the second Mar 2026 wins
  assert.equal(p.rows[0].revenueCr, 14);
  assert.equal(p.rows[0].opmPct, null);
});

test("an SME's half-yearly table gives no rows (an H2 is not a Q4)", () => {
  const p = parseQuarters(section(["Mar 2025", "Sep 2025", "Mar 2026"], [["Sales", ["9.52", "13.65", "16.99"]]]));
  assert.equal(p.halfYearly, true);
  assert.deepEqual(p.rows, []);
  // An SME that skipped some half-years (only every September for a while) is still half-yearly.
  assert.equal(parseQuarters(section(["Sep 2023", "Sep 2024", "Mar 2025"], [["Sales", ["1", "2", "3"]]])).halfYearly, true);
  // A quarterly table with one quarter missing is still quarterly.
  const q = parseQuarters(section(["Sep 2025", "Dec 2025", "Jun 2026"], [["Sales", ["1", "2", "3"]]]));
  assert.equal(q.halfYearly, false);
  assert.equal(q.rows.length, 3);
});

test("columns before FY22 (stray old ones, placeholders) are left out", () => {
  const p = parseQuarters(section(["Mar 2000", "Mar 2014", "Dec 2021", "Mar 2022"], [["Sales", ["0", "138", "5", "6"]]]));
  assert.deepEqual(p.rows.map((r) => [r.fiscalYear, r.quarter]), [[2022, 3], [2022, 4]]);
  assert.deepEqual(p.skipped, []);
});

test("no quarters section reads as no rows", () => {
  assert.deepEqual(parseQuarters("<section id='profit-loss'><table></table></section>").rows, []);
});

test("BSE scrip code from the page's bseindia.com link", () => {
  const html = `<a href="https://www.bseindia.com/stock-share-price/sun-pharmaceutical-industries-ltd/SUNPHARMA/524715/" target="_blank">BSE: 524715</a>
    <a href="https://www.bseindia.com/bseplus/AnnualReport/999999/x.pdf">AR</a>`;
  assert.equal(parseBseCode(html), "524715");
  assert.equal(parseBseCode(`<a href="https://www.nseindia.com/get-quotes/equity?symbol=X">NSE</a>`), null);
});
