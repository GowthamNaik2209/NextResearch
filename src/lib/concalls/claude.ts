// The Claude client and cost arithmetic every concall step shares (summaries via the Batch API,
// digests and roll-ups via plain requests). The SDK reads ANTHROPIC_API_KEY from the environment.
import Anthropic from "@anthropic-ai/sdk";
import { BATCH_DISCOUNT, OPUS_PRICE } from "./types";

let client: Anthropic | null = null;
export function concallClient(): Anthropic {
  return (client ??= new Anthropic());
}

export type TokenUsage = { input: number; output: number; cacheWrite: number; cacheRead: number };

export function usageOf(u: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): TokenUsage {
  return { input: u.input_tokens, output: u.output_tokens, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 };
}

/** US dollars for one request; `batch` applies the Batch API discount. */
export function costOf(u: TokenUsage, opts: { batch?: boolean } = {}): number {
  const p = OPUS_PRICE;
  const usd = (u.input * p.input + u.output * p.output + u.cacheWrite * p.cacheWrite + u.cacheRead * p.cacheRead) / 1e6;
  return opts.batch ? usd * BATCH_DISCOUNT : usd;
}
