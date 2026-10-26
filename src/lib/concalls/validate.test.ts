import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCounts, checkSummary, missingNumbers, numbersIn, parseSummary, quoteLocation } from "./validate";
import type { ConcallSummaryJson } from "./types";

const pages = [
  "Moderator: Welcome to the Q1 FY27 earnings call of Example Ltd.",
  "Management: We expect revenue growth of 10% to 12% for FY27. EBITDA margin was 26.5% this quarter.\nThe US business grew",
  "on the back of specialty launches, with sales of $ 1,234 million. Capex will be about Rs 2,000 crore.",
];

export const SAMPLE: ConcallSummaryJson = {
  fiscal_year: 2027,
  quarter: 1,
  call_date: "2026-08-05",
  guidance: [
    {
      metric: "revenue_growth",
      scope: "company",
      period_kind: "FY",
      target_fiscal_year: 2027,
      target_quarter: null,
      low: 10,
      high: 12,
      unit: "%",
      direction: null,
      statement: "Revenue growth of 10-12% in FY27.",
      quote: "We expect revenue growth of 10% to 12% for FY27",
      page: 2,
    },
  ],
  demand: [{ point: "US grew on specialty launches, $1,234 mn of sales.", quote: "The US business grew on the back of specialty launches", page: 2 }],
  risks: [{ point: "Margin may fall to 24%.", quote: "EBITDA margin was 26.5% this quarter", page: 2 }],
  initiatives: [{ point: "Capex of Rs 2,000 crore.", quote: "Capex will be about Rs 2,000 crore", page: 1 }],
  tone: { label: "positive", rationale: "Guided to double-digit growth." },
  key_qa: [],
};

test("quoteLocation: on the page, across a page break, elsewhere, missing", () => {
  assert.equal(quoteLocation("We expect revenue growth of 10% to 12%", 2, pages), "page");
  assert.equal(quoteLocation("The US business grew on the back of specialty launches", 2, pages), "page");
  assert.equal(quoteLocation("Welcome to the Q1 FY27 earnings call", 3, pages), "elsewhere");
  assert.equal(quoteLocation("Something nobody said on the call", 1, pages), "missing");
  assert.equal(quoteLocation("“We expect” revenue growth … 12% for FY27", 2, pages), "page");
});

test("numbersIn / missingNumbers ignore fiscal labels and years, accept 1,234 = 1234", () => {
  assert.deepEqual(numbersIn("Q2 FY27 revenue up 12% in 2026, H1 FY26"), ["12"]);
  assert.deepEqual(missingNumbers("sales of $1,234 mn and 26.5% margin", pages.join("\n")), []);
  assert.deepEqual(missingNumbers("margin of 24%", pages.join("\n")), ["24"]);
  assert.deepEqual(missingNumbers("growth of 12.0%", pages.join("\n")), []);
});

test("checkSummary flags each item; counts passed / total", () => {
  const checks = checkSummary(SAMPLE, pages);
  assert.equal(checks.length, 4);
  const risk = checks.find((c) => c.section === "risks")!;
  assert.deepEqual(risk.missingNumbers, ["24"]);
  const init = checks.find((c) => c.section === "initiatives")!;
  assert.equal(init.quoteFound, "elsewhere");
  assert.deepEqual(checkCounts(checks), { checksPassed: 2, checksTotal: 4 });
});

test("parseSummary accepts the shape and rejects broken ones", () => {
  assert.deepEqual(parseSummary(JSON.stringify(SAMPLE)), SAMPLE);
  assert.throws(() => parseSummary("{not json"), /not JSON/);
  assert.throws(() => parseSummary(JSON.stringify({ ...SAMPLE, quarter: 5 })), /quarter/);
  assert.throws(() => parseSummary(JSON.stringify({ ...SAMPLE, guidance: [{ ...SAMPLE.guidance[0], metric: "ebit" }] })), /metric/);
  assert.throws(() => parseSummary(JSON.stringify({ ...SAMPLE, guidance: [{ ...SAMPLE.guidance[0], scope: "group" }] })), /scope/);
  assert.throws(() => parseSummary(JSON.stringify({ ...SAMPLE, tone: { label: "bullish", rationale: "" } })), /tone/);
});
