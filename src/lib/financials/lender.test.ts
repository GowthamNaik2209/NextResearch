import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EMPTY_LENDER, lenderFromStandalone, parseLenderFigures } from "./lender";
import { lenderColumns } from "./write";
import { DEFAULT_GAP_MS, lenderSource, newCompanyWriteOptions } from "./refresh";

const fixture = (dir: string, name: string) => fs.readFileSync(path.join(import.meta.dirname, dir, name), "utf8");
const bank = fixture("__fixtures__", "screener-bank.html");
const nbfc = fixture("__fixtures__", "screener-nbfc-no-npa.html");

test("a bank page: latest quarter's NPAs, latest year's financing margin, last two year-ends of assets and deposits", () => {
  // HDFCBANK standalone, 18 Nov 2026: quarters end Sep 2026 (GNPA 1.11%, NNPA 0.37%); P&L Mar 2026
  // financing margin 12% (TTM 15% is not a year); balance sheet Mar 2026 / Mar 2025 (Sep 2026 is a half-year).
  assert.deepEqual(parseLenderFigures(bank), {
    gnpa: 1.11,
    nnpa: 0.37,
    finMargin: 12,
    finMarginYear: "Mar 2026",
    netProfit: 74671,
    totalAssets: [4364886, 3910199],
    deposits: [3105250, 2714715],
    bsYear: "Mar 2026",
    quarter: "Sep 2026",
  });
});

test("an infrastructure NBFC: no deposits, empty NPA rows read as null, '(S)' year labels still count", () => {
  // IRFC consolidated, 18 Nov 2026: every column carries Screener's "(S)" standalone marker.
  assert.deepEqual(parseLenderFigures(nbfc), {
    gnpa: null,
    nnpa: null,
    finMargin: 26,
    finMarginYear: "Mar 2026",
    netProfit: 7009,
    totalAssets: [516676, 488835],
    deposits: null,
    bsYear: "Mar 2026",
    quarter: null,
  });
});

test("a lender page with no NPA rows at all", () => {
  const stripped = bank.replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*?(?:Gross|Net) NPA %[\s\S]*?<\/tr>/g, "");
  assert.ok(!stripped.includes("NPA %"));
  const f = parseLenderFigures(stripped);
  assert.equal(f?.gnpa, null);
  assert.equal(f?.nnpa, null);
  assert.equal(f?.quarter, null);
  assert.equal(f?.finMargin, 12);
});

test("pages that are not a lender layout parse to null", () => {
  assert.equal(parseLenderFigures(fixture("__fixtures__", "screener-insurer.html")), null);
  assert.equal(parseLenderFigures(fixture("../live/__fixtures__", "screener-voltas.html")), null);
  assert.equal(parseLenderFigures(""), null);
});

test("a lender's figures map onto the KpiSnapshot columns", () => {
  assert.deepEqual(lenderColumns(parseLenderFigures(bank)!), {
    gnpa: 1.11, nnpa: 0.37, finMargin: 12, totalAssets: 4364886, totalAssetsPrev: 3910199,
    deposits: 3105250, depositsPrev: 2714715, npaQuarter: "Sep 2026",
    lenderNetProfit: 74671, bsYear: "Mar 2026", finMarginYear: "Mar 2026",
  });
  const c = lenderColumns(parseLenderFigures(nbfc)!);
  assert.equal(c.deposits, null);
  assert.equal(c.depositsPrev, null);
});

test("the lender block comes from the standalone page; no standalone page means all nulls, never consolidated", () => {
  assert.deepEqual(lenderFromStandalone(bank), parseLenderFigures(bank));
  for (const miss of [null, "missing" as const, fixture("__fixtures__", "screener-insurer.html")]) assert.deepEqual(lenderFromStandalone(miss), EMPTY_LENDER);
  assert.deepEqual(EMPTY_LENDER, {
    gnpa: null, nnpa: null, finMargin: null, finMarginYear: null, netProfit: null,
    totalAssets: [null, null], deposits: null, bsYear: null, quarter: null,
  });
});

test("a lender's figures: the page already read, else one more request, skipped once the lender columns are known missing", () => {
  // A page the snapshot or the basis check already read is used, whatever it was (even a failed one).
  for (const page of ["<html/>", "missing", null] as const) {
    assert.equal(lenderSource(page, false), "page");
    assert.equal(lenderSource(page, true), "page");
  }
  // Not read yet: one more request, unless this process found no lender columns to store the figures in.
  assert.equal(lenderSource(undefined, false), "fetch");
  assert.equal(lenderSource(undefined, true), "skip");
  assert.equal(DEFAULT_GAP_MS, 1000);
});

test("a company new to the table (--add, a listing-day IPO) is written with its lender figures, not without them", () => {
  const lender = lenderFromStandalone(bank);
  assert.deepEqual(newCompanyWriteOptions({ lender }, "UGRO Capital", "MSME lender"), {
    identity: { name: "UGRO Capital", listed: true, role: "MSME lender" },
    lender,
  });
  // Not a lender (no lender figures read): nothing extra written.
  assert.deepEqual(newCompanyWriteOptions({}, "Indian Hotels"), { identity: { name: "Indian Hotels", listed: true, role: "" }, lender: null });
});
