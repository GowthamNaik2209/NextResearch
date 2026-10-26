// What Claude is asked for one earnings call: the system prompt, the JSON schema its answer must
// follow (structured outputs, so the reply parses as ConcallSummaryJson in src/lib/concalls/types.ts)
// and the request body the Batch API gets for each filing.
//
// Bump PROMPT_VERSION whenever the system prompt, the schema or the request settings change: it is
// stored on every ConcallSummary so rows from an older prompt can be found and redone.
//
// Guidance is structured (metric, period, low/high, unit) because the track record lines it up
// against reported quarterly and annual figures. The numbers must be the ones management said, not
// computed: validate.ts checks every number against the transcript text.
import type Anthropic from "@anthropic-ai/sdk";
import { CONCALL_MODEL, GUIDANCE_METRICS, GUIDANCE_SCOPES, PERIOD_KINDS, TONES } from "./types";
import { pagedText } from "./extract";

export const PROMPT_VERSION = "2026-10-26.3";
/** A ceiling, not a cost: adaptive thinking plus a ~3-4k token answer fit well inside it. */
export const MAX_TOKENS = 32_000;

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

const quoted = {
  quote: { type: "string", description: "Verbatim words from the transcript (max ~30 words) that support the item." },
  page: { type: "integer", description: "The N of the [[Page N]] marker the quote is under." },
};
const point = {
  type: "object",
  additionalProperties: false,
  required: ["point", "quote", "page"],
  properties: { point: { type: "string" }, ...quoted },
};

export const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fiscal_year", "quarter", "call_date", "guidance", "demand", "risks", "initiatives", "tone", "key_qa"],
  properties: {
    fiscal_year: { type: "integer", description: "Fiscal year of the results the call discussed: 2027 for FY27 (Apr 2026 - Mar 2027)." },
    quarter: { type: "integer", enum: [1, 2, 3, 4], description: "Quarter of those results: Q1 = Apr-Jun ... Q4 = Jan-Mar." },
    call_date: { type: "string", description: "Date the call was held, YYYY-MM-DD, if the transcript states it; else empty." },
    guidance: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metric", "scope", "period_kind", "target_fiscal_year", "target_quarter", "low", "high", "unit", "direction", "statement", "quote", "page"],
        properties: {
          metric: { type: "string", enum: [...GUIDANCE_METRICS] },
          scope: { type: "string", enum: [...GUIDANCE_SCOPES], description: "company = whole company; segment = a geography or business line; product = one drug/product/programme/launch." },
          period_kind: { type: "string", enum: [...PERIOD_KINDS] },
          target_fiscal_year: nullable({ type: "integer", description: "2027 for FY27; for multi_year the last year of the range." }),
          target_quarter: nullable({ type: "integer", enum: [1, 2, 3, 4] }),
          low: nullable({ type: "number" }),
          high: nullable({ type: "number" }),
          unit: nullable({ type: "string", enum: ["%", "bps", "Rs cr", "$ mn", "x", "units"] }),
          direction: nullable({ type: "string", enum: ["up", "down", "flat"] }),
          statement: { type: "string", description: "The guidance in one sentence, with the numbers and units management used." },
          ...quoted,
        },
      },
    },
    demand: { type: "array", items: point },
    risks: { type: "array", items: point },
    initiatives: { type: "array", items: point },
    tone: {
      type: "object",
      additionalProperties: false,
      required: ["label", "rationale"],
      properties: { label: { type: "string", enum: [...TONES] }, rationale: { type: "string" } },
    },
    key_qa: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["analyst_question", "management_answer", "quote", "page"],
        properties: { analyst_question: { type: "string" }, management_answer: { type: "string" }, ...quoted },
      },
    },
  },
} as const;

export const SUMMARY_SYSTEM = `You summarise Indian listed companies' earnings-call transcripts for investors who track what management said over many quarters and check guidance against what was delivered.

Indian fiscal years end 31 March: FY27 = April 2026 to March 2027; Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar. fiscal_year and quarter are the results the call discussed (a call in May 2026 on the year's results is Q4 FY26: fiscal_year 2026, quarter 4), not the date of the call. A call that is not about results (an acquisition investor call, an investor day): fiscal_year and quarter are the latest results quarter reported before the call.

Extract only what management said on this call. For every item give a short verbatim quote (copied exactly from the text, no paraphrase, max ~30 words; use "..." only to join two pieces of the same passage) and the N of the [[Page N]] marker it appears under.

- guidance: forward-looking numbers or explicit directional statements management made. One item per metric and period. metric: revenue_growth (% growth), revenue (absolute), ebitda_margin, gross_margin, net_profit, capex, order_book, order_inflow, volume (units, tonnes, utilisation), other. scope: company = a consolidated / whole-company figure; segment = a geography or business line (US, India, North America, emerging markets, specialty); product = a single drug, product, programme or launch (e.g. "generic Revlimid sales will be small in H2" is product scope, not company revenue). Only company-scope items are checked against reported results, so never tag a segment or product remark as company. period_kind: FY, H1, H2, Q, multi_year, or unspecified; target_fiscal_year / target_quarter when stated (null otherwise). low/high: the numbers as stated (a point estimate has low = high; "mid-teens" or "double digit" with no number has low = high = null and direction set). Percentages as written (15 for 15%). unit: one of %, bps, Rs cr, $ mn, x, units; when management used another unit (Rs billion, lakh crore, $ billion) keep low/high null rather than converting. direction: up/down/flat for directional guidance, else null. No guidance on a metric means no item for it; do not restate past results as guidance.
- demand: end-market demand, pricing, volumes, segment and geography trends.
- risks: headwinds, uncertainties and one-offs management flagged or analysts pressed on.
- initiatives: new products, launches, capacity, acquisitions, new markets.
- tone: one label plus a one-sentence reason grounded in the call.
- key_qa: the 3-5 analyst questions that mattered most and the gist of the answer.

Numbers in statements must be the ones in the transcript, with their units (Rs crore, %, $ mn). Do not compute, convert or annualise. 3-6 items per list is typical; fewer is fine. If the document is not an earnings-call transcript, return empty lists and say so in tone.rationale.`;

export type FilingContext = { companyName: string; ticker: string; title: string; filedAt: Date };

/** The user turn: who filed it, then the paged transcript text. */
export function userContent(ctx: FilingContext, pages: string[]): string {
  return `Company: ${ctx.companyName} (NSE: ${ctx.ticker})\nFiling: ${ctx.title} (filed ${ctx.filedAt.toISOString().slice(0, 10)})\n\n<transcript>\n${pagedText(pages)}\n</transcript>`;
}

export type BatchRequest = Anthropic.Messages.Batches.BatchCreateParams.Request;

/**
 * One Batch API request. custom_id must match ^[a-zA-Z0-9_-]{1,64}$: the daily job uses the
 * ConcallFiling id, the backfill `${exchange}_${exchangeId}`. No `fallbacks` (the Batch API rejects it).
 */
export function buildRequest(customId: string, ctx: FilingContext, pages: string[]): BatchRequest {
  return {
    custom_id: customId,
    params: {
      model: CONCALL_MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SUMMARY_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: SUMMARY_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent(ctx, pages) }],
    },
  };
}

/** A custom_id the Batch API accepts, from an exchange filing id (backfill). */
export const backfillCustomId = (exchange: string, exchangeId: string) => `${exchange}_${exchangeId}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
