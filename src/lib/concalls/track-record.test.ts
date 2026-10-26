// The track-record rules on a realistic fixture: a mid-cap pharma company (call it PHARMA) that
// guided FY26 revenue growth "high single digit", EBITDA margin 26-27% and 100-150 bps of margin
// expansion, and is now partway through FY27. Figures are plausible Rs cr, not a real company's.
// Run with PRINT_TABLE=1 to print the sample track-record table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { actualFor, checkGuidance, isLender, periodText, verdictFor, vagueRange, type CompanyData, type GuidanceInput, type QuarterFigures } from "./track-record";

const q = (fiscalYear: number, quarter: number, revenueCr: number, operatingProfitCr: number, netProfitCr: number): QuarterFigures => ({
  fiscalYear,
  quarter,
  revenueCr,
  operatingProfitCr,
  netProfitCr,
  interestCr: 8,
});

// FY25: revenue 9,900, OP 2,530 (25.6%); FY26: revenue 10,780 (+8.9%), OP 2,860 (26.5%); FY27 Q1-Q2 reported.
const PHARMA: CompanyData = {
  asOf: new Date("2026-10-26T00:00:00Z"),
  quarters: [
    q(2025, 1, 2400, 610, 360),
    q(2025, 2, 2450, 625, 370),
    q(2025, 3, 2500, 640, 380),
    q(2025, 4, 2550, 655, 390),
    q(2026, 1, 2620, 690, 410),
    q(2026, 2, 2680, 712, 420),
    q(2026, 3, 2700, 718, 430),
    q(2026, 4, 2780, 740, 440),
    q(2027, 1, 2900, 770, 455),
    q(2027, 2, 2960, 800, 470),
  ],
  annual: [
    { year: 2025, revenueCr: 9900, netProfitCr: 1500 },
    { year: 2026, revenueCr: 10780, netProfitCr: 1700 },
  ],
};

const g = (over: Partial<GuidanceInput> & Pick<GuidanceInput, "metric" | "statement">): GuidanceInput => ({
  periodKind: "FY",
  targetFiscalYear: 2026,
  targetQuarter: null,
  low: null,
  high: null,
  unit: "%",
  direction: null,
  ...over,
});

const CASES: { name: string; g: GuidanceInput; verdict: string }[] = [
  { name: "FY26 revenue growth high single digit", g: g({ metric: "revenue_growth", statement: "We expect high single digit growth in FY26" }), verdict: "met" },
  { name: "FY26 revenue growth 8-10%", g: g({ metric: "revenue_growth", low: 8, high: 10, statement: "Revenue growth of 8-10% for FY26" }), verdict: "met" },
  // Wording from Sun Pharma's Q4 FY25 call. Fixture growth is 8.9%: met against 4-9% (it would also
  // be met against 7-9%), so the 4-9% reading itself is asserted in the vagueRange test below.
  { name: "mid to high single digit", g: g({ metric: "revenue_growth", statement: "FY26 consolidated topline growth guided at mid to high single digit" }), verdict: "met" },
  // Sun Pharma Q2 FY26: a product remark, not company guidance (it read as "missed" before scope existed).
  { name: "product remark is not judged on company revenue", g: g({ metric: "revenue_growth", scope: "product", periodKind: "H2", direction: "down", statement: "Generic Revlimid sales were largely done in H1; only a small amount in H2" }), verdict: "not_checkable" },
  { name: "segment guidance is not judged on company revenue", g: g({ metric: "revenue_growth", scope: "segment", low: 8, high: 10, statement: "US business to grow 8-10% in FY26" }), verdict: "not_checkable" },
  { name: "company scope is checked as before", g: g({ metric: "revenue_growth", scope: "company", low: 8, high: 10, statement: "Revenue growth of 8-10% for FY26" }), verdict: "met" },
  { name: "FY26 revenue growth 12-14%", g: g({ metric: "revenue_growth", low: 12, high: 14, statement: "12-14% growth in FY26" }), verdict: "missed" },
  { name: "FY26 EBITDA margin 26-27%", g: g({ metric: "ebitda_margin", low: 26, high: 27, statement: "EBITDA margin of 26-27% for FY26" }), verdict: "met" },
  { name: "FY26 100-150 bps margin improvement", g: g({ metric: "ebitda_margin", low: 100, high: 150, unit: "bps", direction: "up", statement: "100-150 bps margin improvement in FY26" }), verdict: "met" },
  { name: "FY26 margin to improve by 1-1.5%", g: g({ metric: "ebitda_margin", low: 1, high: 1.5, statement: "margins to improve by 1-1.5% in FY26" }), verdict: "met" },
  { name: "FY26 revenue Rs 10,500 cr", g: g({ metric: "revenue", low: 10500, high: 10500, unit: "Rs cr", statement: "Revenue of about Rs 10,500 crore in FY26" }), verdict: "beat" },
  { name: "FY26 net profit low double-digit growth", g: g({ metric: "net_profit", statement: "PAT growth in the low double-digit for FY26" }), verdict: "met" },
  { name: "FY26 revenue to grow (directional)", g: g({ metric: "revenue_growth", unit: null, direction: "up", statement: "Revenue will grow in FY26" }), verdict: "met" },
  { name: "H2 FY26 growth double-digit", g: g({ metric: "revenue_growth", periodKind: "H2", statement: "H2 FY26 growth will be double-digit" }), verdict: "missed" },
  { name: "Q2 FY27 EBITDA margin ~27%", g: g({ metric: "ebitda_margin", periodKind: "Q", targetFiscalYear: 2027, targetQuarter: 2, low: 27, high: 27, statement: "Q2 margin around 27%" }), verdict: "met" },
  { name: "FY26 margin to fall 50-100 bps (rose instead)", g: g({ metric: "ebitda_margin", low: 50, high: 100, unit: "bps", direction: "down", statement: "Margins to decline 50-100 bps on price erosion" }), verdict: "beat" },
  { name: "FY26 revenue growth at least 6%", g: g({ metric: "revenue_growth", low: 6, statement: "at least 6% growth in FY26" }), verdict: "beat" },
  { name: "FY27 revenue growth 8-10% (not reported)", g: g({ metric: "revenue_growth", targetFiscalYear: 2027, low: 8, high: 10, statement: "FY27 revenue growth of 8-10%" }), verdict: "pending" },
  { name: "H1 FY27 revenue growth 12-14%", g: g({ metric: "revenue_growth", periodKind: "H1", targetFiscalYear: 2027, low: 12, high: 14, statement: "H1 FY27 growth 12-14%" }), verdict: "missed" },
  { name: "Capex Rs 1,000 cr in FY26", g: g({ metric: "capex", low: 1000, high: 1000, unit: "Rs cr", statement: "Capex of Rs 1,000 crore in FY26" }), verdict: "not_checkable" },
  { name: "Revenue Rs 15,000 cr by FY30", g: g({ metric: "revenue", periodKind: "multi_year", targetFiscalYear: 2030, low: 15000, high: 15000, unit: "Rs cr", statement: "Rs 15,000 crore revenue by FY30" }), verdict: "pending" },
  { name: "15% CAGR over three years", g: g({ metric: "revenue_growth", periodKind: "multi_year", targetFiscalYear: 2028, low: 15, high: 15, statement: "15% CAGR over the next three years" }), verdict: "not_checkable" },
  { name: "Growth to continue (no period)", g: g({ metric: "revenue_growth", periodKind: "unspecified", targetFiscalYear: null, direction: "up", unit: null, statement: "Growth momentum will continue" }), verdict: "not_checkable" },
  { name: "H1 FY23 growth 10% (off Screener's window)", g: g({ metric: "revenue_growth", periodKind: "H1", targetFiscalYear: 2023, low: 10, high: 10, statement: "H1 FY23 growth of 10%" }), verdict: "not_checkable" },
];

for (const c of CASES)
  test(`PHARMA: ${c.name} -> ${c.verdict}`, () => {
    const r = checkGuidance(c.g, PHARMA);
    assert.equal(r.verdict, c.verdict, r.actualNote);
  });

test("actuals are computed the way the header says", () => {
  const growth = actualFor(g({ metric: "revenue_growth", statement: "" }), PHARMA);
  assert.equal(growth.status, "ok");
  if (growth.status === "ok") assert.ok(Math.abs(growth.value - 8.89) < 0.01 && /annual/.test(growth.note));
  const margin = actualFor(g({ metric: "ebitda_margin", low: 26, high: 27, statement: "" }), PHARMA);
  if (margin.status === "ok") assert.ok(Math.abs(margin.value - 26.53) < 0.01);
  const bps = actualFor(g({ metric: "ebitda_margin", low: 100, high: 150, unit: "bps", statement: "" }), PHARMA);
  if (bps.status === "ok") assert.ok(Math.abs(bps.value - 97.5) < 1 && bps.unit === "bps");
  // FY27 absent from the annual table: growth comes from quarters once all four are in.
  const full: CompanyData = { ...PHARMA, asOf: new Date("2027-07-01T00:00:00Z"), quarters: [...PHARMA.quarters, q(2027, 3, 3000, 790, 480), q(2027, 4, 3050, 800, 490)] };
  const fy27 = actualFor(g({ metric: "revenue_growth", targetFiscalYear: 2027, statement: "" }), full);
  assert.equal(fy27.status, "ok");
  if (fy27.status === "ok") assert.ok(/sum of 4 quarters/.test(fy27.note) && Math.abs(fy27.value - (11910 / 10780 - 1) * 100) < 0.01);
});

test("pending turns not_checkable once the results are overdue and still missing", () => {
  const fy27 = g({ metric: "revenue_growth", targetFiscalYear: 2027, low: 8, high: 10, statement: "" });
  assert.equal(checkGuidance(fy27, PHARMA).verdict, "pending");
  assert.equal(checkGuidance(fy27, { ...PHARMA, asOf: new Date("2027-09-01T00:00:00Z") }).verdict, "not_checkable");
});

test("tolerances: 0.5 pp on %, 25 bps on bps, 2% on Rs cr", () => {
  const ok = (value: number, unit: "%" | "bps" | "Rs cr") => ({ status: "ok" as const, value, unit, note: "" });
  const range = g({ metric: "revenue_growth", low: 8, high: 10, statement: "" });
  assert.equal(verdictFor(range, ok(7.6, "%")), "met");
  assert.equal(verdictFor(range, ok(7.4, "%")), "missed");
  assert.equal(verdictFor(range, ok(10.4, "%")), "met");
  assert.equal(verdictFor(range, ok(10.6, "%")), "beat");
  const bps = g({ metric: "ebitda_margin", low: 100, high: 150, unit: "bps", statement: "" });
  assert.equal(verdictFor(bps, ok(76, "bps")), "met");
  assert.equal(verdictFor(bps, ok(74, "bps")), "missed");
  const abs = g({ metric: "revenue", low: 10000, high: 10000, unit: "Rs cr", statement: "" });
  assert.equal(verdictFor(abs, ok(9810, "Rs cr")), "met");
  assert.equal(verdictFor(abs, ok(9790, "Rs cr")), "missed");
  assert.equal(verdictFor(abs, ok(10210, "Rs cr")), "beat");
  // Ceiling only ("up to 10%") is a point estimate at 10.
  const ceiling = g({ metric: "revenue_growth", high: 10, statement: "up to 10%" });
  assert.equal(verdictFor(ceiling, ok(9.6, "%")), "met");
  assert.equal(verdictFor(ceiling, ok(8, "%")), "missed");
});

test("directional and down guidance", () => {
  const ok = (value: number) => ({ status: "ok" as const, value, unit: "%" as const, note: "" });
  const down = g({ metric: "revenue_growth", low: 5, high: 7, direction: "down", statement: "revenue to decline 5-7%" });
  assert.equal(verdictFor(down, ok(-6)), "met");
  assert.equal(verdictFor(down, ok(-9)), "missed");
  assert.equal(verdictFor(down, ok(-2)), "beat");
  const flat = g({ metric: "revenue_growth", direction: "flat", unit: null, statement: "flat revenue" });
  assert.equal(verdictFor(flat, ok(1.5)), "met");
  assert.equal(verdictFor(flat, ok(-3)), "missed");
  assert.equal(verdictFor(g({ metric: "revenue_growth", direction: "down", unit: null, statement: "" }), ok(2)), "missed");
});

test("vague wording", () => {
  assert.deepEqual(vagueRange("high single-digit growth")?.low, 7);
  assert.deepEqual(vagueRange("low double digit")?.high, 13);
  assert.deepEqual(vagueRange("mid-teens growth")?.low, 14);
  assert.equal(vagueRange("double-digit growth")?.high, null);
  assert.equal(vagueRange("strong growth"), null);
});

test("lenders, calendar-year reporters and foreign units are not checkable", () => {
  const bank: CompanyData = { ...PHARMA, quarters: PHARMA.quarters.map((r) => ({ ...r, interestCr: r.revenueCr! * 0.55 })) };
  assert.equal(isLender(bank.quarters), true);
  assert.equal(isLender(PHARMA.quarters), false);
  assert.equal(checkGuidance(g({ metric: "ebitda_margin", low: 26, high: 27, statement: "" }), bank).verdict, "not_checkable");
  // A lender's revenue growth is still checkable.
  assert.equal(checkGuidance(g({ metric: "revenue_growth", low: 8, high: 10, statement: "" }), bank).verdict, "met");
  assert.equal(checkGuidance(g({ metric: "revenue_growth", low: 8, high: 10, statement: "" }), { ...PHARMA, calendarYear: true }).verdict, "not_checkable");
  assert.equal(checkGuidance(g({ metric: "revenue", low: 1200, high: 1200, unit: "$ mn", statement: "" }), PHARMA).verdict, "not_checkable");
});

if (process.env.PRINT_TABLE)
  test("print the sample track record", () => {
    const rows = CASES.map((c) => {
      const r = checkGuidance(c.g, PHARMA);
      const range = c.g.low == null && c.g.high == null ? (c.g.direction ?? "-") : c.g.low === c.g.high ? `${c.g.low}` : `${c.g.low ?? ""}-${c.g.high ?? ""}`;
      return `| ${c.g.metric} | ${periodText(c.g)} | ${c.g.statement} | ${range} ${c.g.unit ?? ""} | ${r.actual ?? "-"} | **${r.verdict}** | ${r.actualNote} |`;
    });
    console.log(["| Metric | Period | Statement | Guided | Actual | Verdict | Note |", "|---|---|---|---|---|---|---|", ...rows].join("\n"));
  });

test("two-band wording is read before the single band it contains", () => {
  assert.deepEqual(vagueRange("mid to high single digit"), { low: 4, high: 9, label: "mid to high single digit = 4-9%" });
  assert.deepEqual(vagueRange("mid-to-high single-digit growth")?.low, 4);
  assert.deepEqual(vagueRange("high single digit")?.low, 7);
});
