import { test } from "node:test";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { parseBatchResult, splitBatches } from "./batch";
import { buildRequest, SUMMARY_SCHEMA } from "./prompt";
import { summaryRows } from "./store";
import { checkSummary } from "./validate";
import { SAMPLE } from "./validate.test";

type R = Anthropic.Messages.Batches.MessageBatchIndividualResponse;

// Hand-written results in the shape the Batch API's results JSONL has.
const usage = { input_tokens: 21000, output_tokens: 3500, cache_creation_input_tokens: 0, cache_read_input_tokens: 1800 };
const message = (text: string, stop_reason: string, extra: object = {}) =>
  ({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text },
    ],
    stop_reason,
    stop_sequence: null,
    stop_details: null,
    usage,
    ...extra,
  }) as unknown as Anthropic.Messages.Message;

const succeeded = (id: string, text: string, stop = "end_turn", extra = {}): R => ({ custom_id: id, result: { type: "succeeded", message: message(text, stop, extra) } });

test("parseBatchResult: a good result parses with usage", () => {
  const out = parseBatchResult(succeeded("f1", JSON.stringify(SAMPLE)));
  assert.ok(out.ok);
  assert.equal(out.customId, "f1");
  if (out.ok) {
    assert.equal(out.summary.fiscal_year, 2027);
    assert.deepEqual(out.usage, { input: 21000, output: 3500, cacheWrite: 0, cacheRead: 1800 });
  }
});

test("parseBatchResult: refusal, max_tokens and bad JSON are final; server errors and expiry retry", () => {
  const refused = parseBatchResult(succeeded("f2", "", "refusal", { stop_details: { type: "refusal", category: "cyber" } }));
  assert.deepEqual([refused.ok, !refused.ok && refused.retry, !refused.ok && refused.error], [false, false, "refused (cyber)"]);
  const cut = parseBatchResult(succeeded("f3", '{"fiscal_year": 20', "max_tokens"));
  assert.ok(!cut.ok && !cut.retry && /max_tokens/.test(cut.error));
  const junk = parseBatchResult(succeeded("f4", JSON.stringify({ ...SAMPLE, quarter: 9 })));
  assert.ok(!junk.ok && !junk.retry && /quarter/.test(junk.error));
  const overloaded = parseBatchResult({
    custom_id: "f5",
    result: { type: "errored", error: { type: "error", request_id: null, error: { type: "overloaded_error", message: "Overloaded" } } },
  } as unknown as R);
  assert.ok(!overloaded.ok && overloaded.retry && /overloaded_error/.test(overloaded.error));
  const invalid = parseBatchResult({
    custom_id: "f6",
    result: { type: "errored", error: { type: "error", request_id: null, error: { type: "invalid_request_error", message: "bad" } } },
  } as unknown as R);
  assert.ok(!invalid.ok && !invalid.retry);
  const expired = parseBatchResult({ custom_id: "f7", result: { type: "expired" } });
  assert.ok(!expired.ok && expired.retry);
});

test("buildRequest: model, structured output, no fallbacks, cached system prompt", () => {
  const r = buildRequest("cid_1", { companyName: "Example", ticker: "EXM", title: "Q1 FY27 transcript", filedAt: new Date("2026-08-06T10:00:00Z") }, ["page one", "page two"]);
  assert.equal(r.custom_id, "cid_1");
  assert.equal(r.params.model, "claude-opus-5-5");
  assert.equal((r.params as unknown as Record<string, unknown>).fallbacks, undefined);
  assert.deepEqual(r.params.output_config?.format, { type: "json_schema", schema: SUMMARY_SCHEMA });
  assert.equal(r.params.output_config?.effort, "medium");
  assert.ok(Array.isArray(r.params.system) && r.params.system[0].cache_control);
  assert.match(r.params.messages[0].content as string, /\[\[Page 2\]\]\npage two/);
});

test("splitBatches respects the size limit", () => {
  const reqs = Array.from({ length: 5 }, (_, i) => buildRequest(`c${i}`, { companyName: "E", ticker: "E", title: "t", filedAt: new Date() }, ["x".repeat(1000)]));
  const one = Buffer.byteLength(JSON.stringify(reqs[0]));
  assert.deepEqual(splitBatches(reqs, one * 2 + 10).map((b) => b.length), [2, 2, 1]);
  assert.deepEqual(splitBatches(reqs).map((b) => b.length), [5]);
});

test("summaryRows: what store writes for a filing", () => {
  const out = parseBatchResult(succeeded("f1", JSON.stringify(SAMPLE)));
  assert.ok(out.ok);
  if (!out.ok) return;
  const checks = checkSummary(out.summary, ["We expect revenue growth of 10% to 12% for FY27"]);
  const rows = summaryRows({ filing: { id: "f1", companyId: "c1", filedAt: new Date() }, summary: out.summary, checks, usage: out.usage, batch: true });
  assert.equal(rows.summary.fiscalYear, 2027);
  assert.equal(rows.summary.quarter, 1);
  assert.equal(rows.summary.callDate?.toISOString().slice(0, 10), "2026-08-05");
  assert.equal(rows.summary.inputTokens, 22800);
  // (21000 * 4 + 3500 * 20 + 1800 * 0.2) / 1e6 / 2
  assert.equal(rows.summary.costUsd, 0.07718);
  assert.equal(rows.summary.checksTotal, 4);
  assert.equal(rows.guidance.length, 1);
  assert.deepEqual([rows.guidance[0].metric, rows.guidance[0].low, rows.guidance[0].high, rows.guidance[0].unit], ["revenue_growth", 10, 12, "%"]);
});
