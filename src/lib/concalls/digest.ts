// Multi-call digests (ConcallDigest): what a company's management said over the last year (its
// last 4 calls) or over the whole history since FY22, how its guidance moved from call to call, and
// how that guidance compared with what was then reported. The company page shows them above the
// per-call summaries; one row per company per scope, replaced when a newer call lands.
//
// Claude writes the prose (headline, narrative shifts, guidance path, risks) from the stored call
// summaries; it never decides a verdict. The track record (./track-record.ts) has already lined
// each guidance row up against the results, and we pass those verdicts in as facts. The
// credibility counts in the stored digest are ours, overwritten after the model answers, so the
// numbers on the page always match the track-record table beside them.
//
// One plain Messages API request per digest (not batch: a new call lands for a handful of
// companies a day, and the page wants the digest the same day), structured output against
// DIGEST_SCHEMA, adaptive thinking at medium effort, and the server-side refusal fallback
// (`fallbacks: "default"`) so a classifier decline on financial text is retried on Anthropic's
// recommended fallback model inside the same request rather than failing the digest.
//
// refreshDigest is idempotent: it does nothing while the stored digest's throughKey (the latest call
// it includes) equals the latest call on file, so the daily job can call it for every company that
// got a new summary without spending anything on the rest.
import type Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { concallClient, costOf, usageOf, type TokenUsage } from "./claude";
import { checkGuidance, loadCompanyData, periodText, type GuidanceInput } from "./track-record";
import {
  CONCALL_MODEL,
  GUIDANCE_METRICS,
  HISTORY_FROM_FY,
  quarterKey,
  quarterLabel,
  type ConcallDigestJson,
  type ConcallSummaryJson,
  type DigestScope,
  type FiscalQuarter,
  type Verdict,
} from "./types";

// Bump when DIGEST_SYSTEM / DIGEST_SCHEMA change in a way worth regenerating every digest for
// (refreshDigest's `force` does that; the version is stored inside the digest JSON).
export const DIGEST_PROMPT_VERSION = "digest-v1";
/** Calls in the "year" digest. */
export const YEAR_CALLS = 4;
const MAX_TOKENS = 16000;

// ------------------------------------------------------------------ Shared Claude call

/** One structured-output request; rollup.ts uses it too. Throws on refusal / truncation / bad JSON. */
export async function callStructured<T>(
  system: string,
  schema: Record<string, unknown>,
  content: string,
  maxTokens = MAX_TOKENS,
): Promise<{ data: T; usage: TokenUsage; costUsd: number; model: string }> {
  const params: Anthropic.Beta.Messages.MessageCreateParamsStreaming = {
    model: CONCALL_MODEL,
    max_tokens: maxTokens,
    stream: true,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  };
  // Streamed so a long multi-year digest never trips the SDK's non-streaming timeout.
  const msg = await concallClient().beta.messages.stream(params).finalMessage();
  if (msg.stop_reason === "refusal") throw new Error(`refused (${msg.stop_details?.category ?? "no category"})`);
  if (msg.stop_reason === "max_tokens") throw new Error(`hit max_tokens (${maxTokens})`);
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const usage = usageOf(msg.usage);
  return { data: JSON.parse(text) as T, usage, costUsd: costOf(usage), model: msg.model };
}

// ------------------------------------------------------------------ Inputs (pure)

/** One stored call: a ConcallSummary row with its filing date. */
export type CallInput = FiscalQuarter & {
  summaryId: string;
  filedAt: Date;
  tone: string;
  summary: ConcallSummaryJson;
};

/** A guidance row with its track-record verdict, and the call it was given on. */
export type GuidanceWithVerdict = GuidanceInput & {
  saidIn: FiscalQuarter;
  verdict: Verdict;
  actualNote: string;
};

/** A quarter can have more than one transcript filed (a corrected re-filing): keep the latest. */
export function latestPerQuarter<T extends FiscalQuarter & { filedAt: Date }>(calls: T[]): T[] {
  const by = new Map<number, T>();
  for (const c of calls) {
    const k = quarterKey(c);
    const prev = by.get(k);
    if (!prev || c.filedAt > prev.filedAt) by.set(k, c);
  }
  return [...by.values()].sort((a, b) => quarterKey(a) - quarterKey(b));
}

/** The calls a scope covers, oldest first. */
export function callsForScope<T extends FiscalQuarter & { filedAt: Date }>(calls: T[], scope: DigestScope): T[] {
  const all = latestPerQuarter(calls).filter((c) => c.fiscalYear >= HISTORY_FROM_FY);
  return scope === "year" ? all.slice(-YEAR_CALLS) : all;
}

/**
 * The guidance a digest weighs: everything said on the included calls, plus earlier guidance
 * whose target year falls inside the window (so the "year" digest can say whether last year's
 * promises for this year were kept).
 */
export function guidanceForScope(rows: GuidanceWithVerdict[], calls: FiscalQuarter[]): GuidanceWithVerdict[] {
  if (!calls.length) return [];
  const keys = new Set(calls.map(quarterKey));
  const firstFy = calls[0].fiscalYear;
  return rows.filter((r) => keys.has(quarterKey(r.saidIn)) || (r.targetFiscalYear != null && r.targetFiscalYear >= firstFy));
}

export function countVerdicts(rows: { verdict: Verdict }[]): Record<Verdict, number> {
  const out: Record<Verdict, number> = { beat: 0, met: 0, missed: 0, pending: 0, not_checkable: 0 };
  for (const r of rows) out[r.verdict]++;
  return out;
}

// ------------------------------------------------------------------ Prompt + schema

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;

/** What the model writes; scope/from/through/calls/credibility.verdicts are filled in by us. */
export const DIGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "narrative_shifts", "guidance_path", "credibility_note", "recurring_risks"],
  properties: {
    headline: { type: "string", description: "1-2 sentences: the story of these calls for an investor." },
    narrative_shifts: {
      type: "array",
      description: "How management's story changed across the calls, oldest first. 2-6 items.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["theme", "detail", "quarters"],
        properties: { theme: str, detail: str, quarters: { ...strArr, description: 'Quarter labels as given, e.g. "Q2 FY27".' } },
      },
    },
    guidance_path: {
      type: "array",
      description: "One item per metric management guided on in this window.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metric", "path", "delivered"],
        properties: {
          metric: { type: "string", enum: [...GUIDANCE_METRICS] },
          path: { type: "string", description: 'How the guidance moved call to call, e.g. "8-10% (Q4 FY25) -> 10-12% (Q2 FY26) -> ~10% (Q4 FY26)".' },
          delivered: { type: "string", description: "What the verdicts given say about delivery; \"not yet reported\" or \"not checkable\" when so." },
        },
      },
    },
    credibility_note: { type: "string", description: "One sentence on guidance vs delivery, grounded only in the verdicts given." },
    recurring_risks: { ...strArr, description: "Risks raised on more than one call, most persistent first. Up to 5." },
  },
} as const;

type DigestModelOut = Omit<ConcallDigestJson, "scope" | "from" | "through" | "calls" | "credibility"> & { credibility_note: string };

export const DIGEST_SYSTEM = `You write a digest of one Indian listed company's earnings calls for investors, from summaries that were already extracted from the transcripts and checked against them (JSON, oldest call first).

- Use only what is in the summaries and the guidance track record. Do not add outside knowledge, prices or opinions.
- narrative_shifts: where management's story moved between calls (demand, pricing, a segment, a launch, a risk that appeared or went away). Name the quarters.
- guidance_path: for each metric guided on, how the number or stance moved from call to call, with quarter labels; then what the verdicts say about delivery. The verdicts (beat / met / missed / pending / not_checkable) were computed from reported results: repeat them, never re-judge them, and do not compute numbers of your own.
- credibility_note: one plain sentence, e.g. "Met or beat 5 of 7 checkable targets; missed FY26 margin by about a point."
- Short, plain English an investor reads in a minute. Keep figures exactly as given, with units.`;

/** The compact text of one call (quotes and pages dropped: the digest cites quarters, not pages). */
function callBlock(c: CallInput): string {
  const s = c.summary;
  const pts = (xs: { point: string }[]) => xs.map((x) => x.point);
  return JSON.stringify({
    quarter: quarterLabel(c),
    tone: { label: s.tone?.label ?? c.tone, why: s.tone?.rationale ?? "" },
    guidance: (s.guidance ?? []).map((g) => g.statement),
    demand: pts(s.demand ?? []),
    risks: pts(s.risks ?? []),
    initiatives: pts(s.initiatives ?? []),
    key_qa: (s.key_qa ?? []).map((q) => `${q.analyst_question} -> ${q.management_answer}`),
  });
}

function guidanceLine(r: GuidanceWithVerdict): string {
  const range = r.low == null && r.high == null ? (r.direction ?? "") : r.low === r.high ? `${r.low}` : `${r.low ?? ""}-${r.high ?? ""}`;
  return `- [${quarterLabel(r.saidIn)}] ${r.metric}, ${periodText(r)}: "${r.statement}" (${range}${r.unit ? ` ${r.unit}` : ""}) -> ${r.verdict}${r.actualNote ? `: ${r.actualNote}` : ""}`;
}

export function buildDigestPrompt(input: { ticker: string; name: string; scope: DigestScope; calls: CallInput[]; guidance: GuidanceWithVerdict[] }): {
  system: string;
  content: string;
} {
  const { calls } = input;
  const window = calls.length ? `${quarterLabel(calls[0])} to ${quarterLabel(calls[calls.length - 1])}` : "none";
  const what = input.scope === "year" ? `the last ${calls.length} calls` : `every call since FY${String(HISTORY_FROM_FY).slice(-2)}`;
  const content = [
    `Company: ${input.name} (${input.ticker})`,
    `Digest: ${what}, ${window}.`,
    "",
    "<calls>",
    ...calls.map(callBlock),
    "</calls>",
    "",
    "<guidance_track_record>",
    ...(input.guidance.length ? input.guidance.map(guidanceLine) : ["(no guidance rows)"]),
    "</guidance_track_record>",
  ].join("\n");
  return { system: DIGEST_SYSTEM, content };
}

/** The stored digest: the model's prose plus the fields we own. */
export function finishDigest(out: DigestModelOut, scope: DigestScope, calls: FiscalQuarter[], guidance: { verdict: Verdict }[]): ConcallDigestJson & { promptVersion: string } {
  return {
    scope,
    from: quarterLabel(calls[0]),
    through: quarterLabel(calls[calls.length - 1]),
    calls: calls.length,
    headline: out.headline,
    narrative_shifts: out.narrative_shifts,
    guidance_path: out.guidance_path,
    credibility: { verdicts: countVerdicts(guidance), note: out.credibility_note },
    recurring_risks: out.recurring_risks,
    promptVersion: DIGEST_PROMPT_VERSION,
  };
}

// ------------------------------------------------------------------ DB layer

const num = (d: { toString(): string } | null | undefined) => (d == null ? null : Number(d.toString()));

/** A company's calls and guidance (verdicts recomputed now, so a digest never waits on the track-record job). */
export async function loadCompanyCalls(prisma: PrismaClient, companyId: string): Promise<{ calls: CallInput[]; guidance: GuidanceWithVerdict[] }> {
  const [summaries, rows, data] = await Promise.all([
    prisma.concallSummary.findMany({
      where: { companyId, fiscalYear: { gte: HISTORY_FROM_FY } },
      select: { id: true, fiscalYear: true, quarter: true, tone: true, summary: true, filing: { select: { filedAt: true } } },
    }),
    prisma.concallGuidance.findMany({ where: { companyId }, include: { summary: { select: { fiscalYear: true, quarter: true, id: true } } } }),
    loadCompanyData(prisma, companyId),
  ]);
  const calls = latestPerQuarter(
    summaries.map((s) => ({
      summaryId: s.id,
      fiscalYear: s.fiscalYear,
      quarter: s.quarter as FiscalQuarter["quarter"],
      filedAt: s.filing.filedAt,
      tone: s.tone,
      summary: s.summary as unknown as ConcallSummaryJson,
    })),
  );
  const kept = new Set(calls.map((c) => c.summaryId));
  const guidance = rows
    .filter((r) => kept.has(r.summaryId)) // guidance from a superseded filing of the same quarter is dropped
    .map((r) => {
      const g: GuidanceInput = {
        metric: r.metric,
        periodKind: r.periodKind,
        targetFiscalYear: r.targetFiscalYear,
        targetQuarter: r.targetQuarter,
        low: num(r.low),
        high: num(r.high),
        unit: r.unit,
        direction: r.direction,
        statement: r.statement,
      };
      const c = checkGuidance(g, data);
      return { ...g, saidIn: { fiscalYear: r.summary.fiscalYear, quarter: r.summary.quarter as FiscalQuarter["quarter"] }, verdict: c.verdict, actualNote: c.actualNote };
    });
  return { calls, guidance };
}

export type DigestOutcome =
  | { status: "skipped"; reason: string }
  | { status: "dry_run"; throughKey: number; calls: number; promptChars: number }
  | { status: "written"; throughKey: number; calls: number; costUsd: number };

/**
 * Rebuild one company's digest for a scope when a newer call has landed (or `force`).
 * `apply: false` builds the prompt and reports its size without calling Claude or writing.
 */
export async function refreshDigest(
  prisma: PrismaClient,
  companyId: string,
  scope: DigestScope,
  opts: { apply?: boolean; force?: boolean } = {},
): Promise<DigestOutcome> {
  const apply = opts.apply ?? true;
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { ticker: true, name: true } });
  const { calls: all, guidance: allGuidance } = await loadCompanyCalls(prisma, companyId);
  const calls = callsForScope(all, scope);
  if (!calls.length) return { status: "skipped", reason: "no calls on file" };
  if (scope === "multi_year" && calls.length <= YEAR_CALLS) return { status: "skipped", reason: `only ${calls.length} calls: the year digest covers them` };
  const throughKey = quarterKey(calls[calls.length - 1]);
  const existing = await prisma.concallDigest.findUnique({ where: { companyId_scope: { companyId, scope } }, select: { throughKey: true } });
  if (existing?.throughKey === throughKey && !opts.force) return { status: "skipped", reason: `up to date through ${quarterLabel(calls[calls.length - 1])}` };

  const guidance = guidanceForScope(allGuidance, calls);
  const prompt = buildDigestPrompt({ ticker: company.ticker, name: company.name, scope, calls, guidance });
  if (!apply) return { status: "dry_run", throughKey, calls: calls.length, promptChars: prompt.content.length };

  const res = await callStructured<DigestModelOut>(prompt.system, DIGEST_SCHEMA as unknown as Record<string, unknown>, prompt.content);
  const digest = finishDigest(res.data, scope, calls, guidance) as unknown as Prisma.InputJsonValue;
  const costUsd = res.costUsd.toFixed(6);
  await prisma.concallDigest.upsert({
    where: { companyId_scope: { companyId, scope } },
    create: { companyId, scope, throughKey, digest, model: res.model, costUsd },
    update: { throughKey, digest, model: res.model, costUsd },
  });
  return { status: "written", throughKey, calls: calls.length, costUsd: res.costUsd };
}
