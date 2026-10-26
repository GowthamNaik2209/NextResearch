// Groq: open-weights models (gpt-oss, Qwen) behind an OpenAI-compatible API, used for the concall
// summaries when CONCALL_LLM=groq and for the Ask NextResearch rewording. Plain fetch, no SDK.
// GROQ_API_KEY comes from .env (scripts) / .env.local and Vercel (the site).
//
// Limits shape everything here. On the free plan gpt-oss-120b allows 8K tokens a minute and 200K a
// day, and a request's prompt plus its completion budget must fit inside the minute's allowance,
// so a 15K-token transcript has to go in parts (see splitPages) a minute apart. A 429 says how long
// to wait (retry-after); we wait and try again rather than fail the run.

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export type GroqModel = "openai/gpt-oss-120b" | "openai/gpt-oss-20b" | "qwen/qwen3.8-27b";

export type GroqRequest = {
  model: GroqModel;
  system: string;
  user: string;
  /** JSON schema for strict structured output; omit for free text. */
  schema?: { name: string; schema: object };
  maxTokens: number;
  /** gpt-oss reasoning depth; reasoning tokens count against maxTokens. */
  reasoning?: "low" | "medium" | "high";
  timeoutMs?: number;
};

export type GroqResult = { text: string; inputTokens: number; outputTokens: number; reasoningTokens: number; model: string };

export class GroqError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One completion; waits out rate limits (up to `maxWaits` times) instead of failing. */
export async function groqComplete(req: GroqRequest, opts: { maxWaits?: number; onWait?: (s: number) => void } = {}): Promise<GroqResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new GroqError(0, "GROQ_API_KEY is not set");
  const body = {
    model: req.model,
    max_completion_tokens: req.maxTokens,
    ...(req.model.startsWith("openai/gpt-oss") && req.reasoning ? { reasoning_effort: req.reasoning } : {}),
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    ...(req.schema ? { response_format: { type: "json_schema", json_schema: { name: req.schema.name, strict: true, schema: req.schema.schema } } } : {}),
  };
  for (let wait = 0; ; wait++) {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(req.timeoutMs ?? 120_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
      error?: { message?: string; code?: string };
    };
    if (res.status === 429 && wait < (opts.maxWaits ?? 5)) {
      const s = Math.min(120, Math.ceil(Number(res.headers.get("retry-after")) || 30)) + 1;
      opts.onWait?.(s);
      await sleep(s * 1000);
      continue;
    }
    if (!res.ok) throw new GroqError(res.status, json.error?.message ?? `HTTP ${res.status}`);
    const choice = json.choices?.[0];
    if (choice?.finish_reason === "length") throw new GroqError(200, "hit max tokens");
    return {
      text: choice?.message?.content ?? "",
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      model: req.model,
    };
  }
}

/**
 * Groups consecutive pages into parts of at most `maxChars` characters (about 4 characters a
 * token), so each request fits the per-minute token allowance. A single page longer than that
 * is its own part.
 */
export function splitPages(pages: string[], maxChars: number): { from: number; to: number; pages: string[] }[] {
  const parts: { from: number; to: number; pages: string[] }[] = [];
  let cur: string[] = [];
  let start = 0;
  let size = 0;
  pages.forEach((p, i) => {
    if (cur.length && size + p.length > maxChars) {
      parts.push({ from: start + 1, to: i, pages: cur });
      cur = [];
      size = 0;
      start = i;
    }
    cur.push(p);
    size += p.length;
  });
  if (cur.length) parts.push({ from: start + 1, to: pages.length, pages: cur });
  return parts;
}
