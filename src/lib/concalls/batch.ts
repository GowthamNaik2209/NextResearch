// Summaries go through the Message Batches API: half the price of plain requests, and a call's
// summary is never needed within the hour (most batches end well inside one; the limit is 24 h).
// The daily job submits one batch per run for every filing fetched that day and collects earlier
// batches on later runs; the backfill submits the history in a few large batches by hand.
//
// Results come back in any order: each is keyed by custom_id (the ConcallFiling id in the daily job,
// `${exchange}_${exchangeId}` in the backfill). parseBatchResult() turns one result into either a
// parsed ConcallSummaryJson with its token usage, or a failure that says whether resubmitting can
// help: errored with a server-side error type or expired -> retry; invalid_request, refusal,
// max_tokens or a reply that does not parse -> do not (the same request would fail the same way).
import type Anthropic from "@anthropic-ai/sdk";
import { concallClient, usageOf, type TokenUsage } from "./claude";
import type { BatchRequest } from "./prompt";
import type { ConcallSummaryJson } from "./types";
import { parseSummary } from "./validate";

/** Batch API limits: 100,000 requests or 256 MB per batch. Kept well under the size limit. */
export const MAX_BATCH_REQUESTS = 100_000;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;

export type BatchOutcome =
  | { customId: string; ok: true; summary: ConcallSummaryJson; usage: TokenUsage }
  | { customId: string; ok: false; retry: boolean; error: string; usage?: TokenUsage };

const RETRYABLE_ERRORS = new Set(["api_error", "overloaded_error", "rate_limit_error", "timeout_error"]);

/** One batch result as a summary or a failure. Pure: unit-tested against hand-written results. */
export function parseBatchResult(r: Anthropic.Messages.Batches.MessageBatchIndividualResponse): BatchOutcome {
  const customId = r.custom_id;
  const res = r.result;
  switch (res.type) {
    case "succeeded": {
      const msg = res.message;
      const usage = usageOf(msg.usage);
      if (msg.stop_reason === "refusal") {
        const cat = (msg as { stop_details?: { category?: string | null } | null }).stop_details?.category;
        return { customId, ok: false, retry: false, error: `refused${cat ? ` (${cat})` : ""}`, usage };
      }
      if (msg.stop_reason === "max_tokens") return { customId, ok: false, retry: false, error: "hit max_tokens", usage };
      const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      try {
        return { customId, ok: true, summary: parseSummary(text), usage };
      } catch (e) {
        return { customId, ok: false, retry: false, error: (e as Error).message.slice(0, 300), usage };
      }
    }
    case "errored": {
      const type = res.error?.error?.type ?? "unknown";
      const message = (res.error?.error as { message?: string } | undefined)?.message ?? "";
      return { customId, ok: false, retry: RETRYABLE_ERRORS.has(type), error: `${type}${message ? `: ${message}` : ""}`.slice(0, 300) };
    }
    case "expired":
      return { customId, ok: false, retry: true, error: "expired (not processed within 24 h)" };
    case "canceled":
      return { customId, ok: false, retry: true, error: "canceled" };
  }
}

/** Splits requests into batches inside the API's count and size limits. */
export function splitBatches(requests: BatchRequest[], maxBytes = MAX_BATCH_BYTES, maxCount = MAX_BATCH_REQUESTS): BatchRequest[][] {
  const out: BatchRequest[][] = [];
  let cur: BatchRequest[] = [];
  let bytes = 0;
  for (const r of requests) {
    const size = Buffer.byteLength(JSON.stringify(r));
    if (cur.length && (bytes + size > maxBytes || cur.length >= maxCount)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(r);
    bytes += size;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Sends one batch; returns its id. Spends money once processed: callers ask first. */
export async function submitBatch(requests: BatchRequest[]): Promise<string> {
  if (!requests.length) throw new Error("empty batch");
  const b = await concallClient().messages.batches.create({ requests });
  return b.id;
}

export type BatchState = { id: string; ended: boolean; counts: Anthropic.Messages.Batches.MessageBatchRequestCounts; expiresAt: string };

export async function batchState(id: string): Promise<BatchState> {
  const b = await concallClient().messages.batches.retrieve(id);
  return { id: b.id, ended: b.processing_status === "ended", counts: b.request_counts, expiresAt: b.expires_at };
}

/** Every result of an ended batch, parsed. */
export async function* batchOutcomes(id: string): AsyncGenerator<BatchOutcome> {
  for await (const r of await concallClient().messages.batches.results(id)) yield parseBatchResult(r);
}
