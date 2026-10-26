// Digest inputs and output shaping: which calls a scope covers, which guidance it weighs, and that
// the credibility counts stored are ours, not the model's. No Claude calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDigestPrompt, callsForScope, countVerdicts, DIGEST_SCHEMA, finishDigest, guidanceForScope, latestPerQuarter, type CallInput, type GuidanceWithVerdict } from "./digest";
import type { ConcallSummaryJson } from "./types";

const summary = (fy: number, q: number, extra: Partial<ConcallSummaryJson> = {}): ConcallSummaryJson => ({
  fiscal_year: fy,
  quarter: q,
  call_date: "",
  guidance: [],
  demand: [{ point: `demand ${q}/${fy}`, quote: "x", page: 1 }],
  risks: [{ point: "US price erosion", quote: "x", page: 2 }],
  initiatives: [],
  tone: { label: "cautiously positive", rationale: "steady" },
  key_qa: [],
  ...extra,
});
const call = (fy: number, q: number, filed: string, id = `${fy}${q}`): CallInput => ({
  summaryId: id,
  fiscalYear: fy,
  quarter: q as 1 | 2 | 3 | 4,
  filedAt: new Date(filed),
  tone: "cautiously positive",
  summary: summary(fy, q),
});

// FY21 Q4 (before the history), FY22 Q1 .. FY27 Q2, with Q1 FY27 filed twice.
const CALLS: CallInput[] = [call(2021, 4, "2021-05-20")];
for (let fy = 2022; fy <= 2027; fy++)
  for (let q = 1; q <= 4; q++) if (fy < 2027 || q <= 2) CALLS.push(call(fy, q, `${fy - 1}-${String(q * 3 + 4).padStart(2, "0")}-10`));
CALLS.push(call(2027, 1, "2026-08-20", "refiled"));

test("one call per quarter: the latest filing wins", () => {
  const kept = latestPerQuarter(CALLS);
  const q1 = kept.filter((c) => c.fiscalYear === 2027 && c.quarter === 1);
  assert.equal(q1.length, 1);
  assert.equal(q1[0].summaryId, "refiled");
});

test("year = last 4 calls; multi_year = every call since FY22", () => {
  const year = callsForScope(CALLS, "year");
  assert.deepEqual(year.map((c) => `${c.quarter}/${c.fiscalYear}`), ["3/2026", "4/2026", "1/2027", "2/2027"]);
  const multi = callsForScope(CALLS, "multi_year");
  assert.equal(multi[0].fiscalYear, 2022);
  assert.equal(multi.length, 4 * 5 + 2);
});

const gv = (saidFy: number, saidQ: number, target: number, verdict: GuidanceWithVerdict["verdict"]): GuidanceWithVerdict => ({
  metric: "revenue_growth",
  periodKind: "FY",
  targetFiscalYear: target,
  targetQuarter: null,
  low: 8,
  high: 10,
  unit: "%",
  direction: null,
  statement: `FY${target % 100} growth 8-10%`,
  saidIn: { fiscalYear: saidFy, quarter: saidQ as 1 | 2 | 3 | 4 },
  verdict,
  actualNote: "",
});

test("the year digest weighs its own calls' guidance and older promises for its years", () => {
  const year = callsForScope(CALLS, "year"); // Q3 FY26 .. Q2 FY27
  const rows = [gv(2024, 4, 2025, "met"), gv(2025, 4, 2026, "missed"), gv(2026, 3, 2027, "pending"), gv(2023, 2, 2024, "beat")];
  const picked = guidanceForScope(rows, year);
  assert.deepEqual(picked.map((r) => r.targetFiscalYear), [2026, 2027]);
});

test("credibility counts come from our verdicts, whatever the model says", () => {
  const year = callsForScope(CALLS, "year");
  const rows = [gv(2025, 4, 2026, "missed"), gv(2026, 3, 2027, "pending"), gv(2026, 4, 2026, "met")];
  const d = finishDigest(
    { headline: "h", narrative_shifts: [], guidance_path: [], credibility_note: "n", recurring_risks: [] },
    "year",
    year,
    rows,
  );
  assert.deepEqual(d.credibility.verdicts, { beat: 0, met: 1, missed: 1, pending: 1, not_checkable: 0 });
  assert.equal(d.from, "Q3 FY26");
  assert.equal(d.through, "Q2 FY27");
  assert.equal(d.calls, 4);
  assert.deepEqual(countVerdicts([]), { beat: 0, met: 0, missed: 0, pending: 0, not_checkable: 0 });
});

test("the prompt carries the calls in order and the verdicts as facts", () => {
  const year = callsForScope(CALLS, "year");
  const p = buildDigestPrompt({ ticker: "PHARMA", name: "Pharma Ltd", scope: "year", calls: year, guidance: [gv(2025, 4, 2026, "missed")] });
  assert.ok(p.content.indexOf("Q3 FY26") < p.content.indexOf("Q2 FY27"));
  assert.match(p.content, /\[Q4 FY25\] revenue_growth, FY26: "FY26 growth 8-10%" \(8-10 %\) -> missed/);
  assert.doesNotMatch(p.content, /"quote"/);
});

test("the schema is strict-mode shaped: every object closed and fully required", () => {
  const walk = (s: Record<string, unknown>) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort());
      for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) walk(v);
    }
    if (s.type === "array") walk(s.items as Record<string, unknown>);
  };
  walk(DIGEST_SCHEMA as unknown as Record<string, unknown>);
});
