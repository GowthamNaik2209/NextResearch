// Roll-up inputs and output shaping. No Claude calls, no DB.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRollupPrompt, finishRollup, ROLLUP_SCHEMA, rollupSectorSlugs, sectorTickers, toneCounts, type RollupCall } from "./rollup";
import { getSector } from "@/lib/sector-content";
import type { ConcallSummaryJson } from "./types";

const summary = (tone: ConcallSummaryJson["tone"]["label"]): ConcallSummaryJson => ({
  fiscal_year: 2027,
  quarter: 2,
  call_date: "",
  guidance: [{ metric: "revenue_growth", scope: "company", period_kind: "FY", target_fiscal_year: 2027, target_quarter: null, low: 8, high: 10, unit: "%", direction: null, statement: "8-10% growth in FY27", quote: "8-10%", page: 3 }],
  demand: [{ point: "US generics pricing stable", quote: "x", page: 1 }],
  risks: [],
  initiatives: [],
  tone: { label: tone, rationale: "" },
  key_qa: [],
});
const CALLS: RollupCall[] = [
  { ticker: "SUNPHARMA", name: "Sun Pharma", tone: "positive", summary: summary("positive") },
  { ticker: "CIPLA", name: "Cipla", tone: "cautious", summary: summary("cautious") },
  { ticker: "LUPIN", name: "Lupin", tone: "positive", summary: summary("positive") },
];

test("sector membership: listed tickers from the zones, policies left out by default", () => {
  const pharma = getSector("pharma");
  assert.ok(pharma);
  const ts = sectorTickers(pharma);
  assert.ok(ts.length >= 10 && new Set(ts).size === ts.length);
  const slugs = rollupSectorSlugs();
  assert.ok(slugs.includes("pharma") && !slugs.includes("defenceproc"));
  assert.ok(rollupSectorSlugs({ includePolicies: true }).includes("defenceproc"));
});

test("tone mix is counted, not written by the model", () => {
  assert.deepEqual(toneCounts(CALLS.map((c) => c.tone)), { positive: 2, "cautiously positive": 0, neutral: 0, cautious: 1, negative: 0 });
  const p = buildRollupPrompt({ sectorName: "Pharma", q: { fiscalYear: 2027, quarter: 2 }, calls: CALLS });
  assert.match(p.content, /Tone mix \(counted\): positive: 2, cautious: 1/);
  assert.match(p.content, /"period":"FY27"/);
});

test("tickers the model made up are dropped", () => {
  const r = finishRollup(
    {
      headline: "h",
      demand_themes: [{ theme: "US pricing", tickers: ["SUNPHARMA", "DRREDDY"] }],
      guidance_comparison: [
        { ticker: "CIPLA", revenue: "8-10% FY27", margin: "not guided", capex: "not guided", other: "-" },
        { ticker: "ZYDUS", revenue: "x", margin: "x", capex: "x", other: "x" },
      ],
      shared_risks: [],
      divergences: [],
      tone_note: "mostly positive",
    },
    "Pharma",
    { fiscalYear: 2027, quarter: 2 },
    CALLS,
  );
  assert.deepEqual(r.demand_themes[0].tickers, ["SUNPHARMA"]);
  assert.deepEqual(r.guidance_comparison.map((g) => g.ticker), ["CIPLA"]);
  assert.equal(r.quarter, "Q2 FY27");
  assert.equal(r.tone_mix.counts.positive, 2);
});

test("the schema is strict-mode shaped", () => {
  const walk = (s: Record<string, unknown>) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort());
      for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) walk(v);
    }
    if (s.type === "array") walk(s.items as Record<string, unknown>);
  };
  walk(ROLLUP_SCHEMA as unknown as Record<string, unknown>);
});
