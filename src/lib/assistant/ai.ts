// Optional AI rewrite of an assistant answer, through Groq's free tier (Llama 3.1 8B Instant, an
// open-weights model; Groq's API is OpenAI-compatible, so this is a plain fetch with no SDK).
// Off unless GROQ_API_KEY is set. The model only rephrases the code-written facts: anything that
// fails the checks below - a number not in the facts, advice wording, an error, a slow reply - and
// the reader gets the code-written answer instead. Every question here comes from a fixed list per
// page, so answers are cached per (context, question) and the number of model calls stays bounded
// however many people use the site.
import { cached } from "../live/cache";
import type { AssistantQuestion } from "./index";

const MODEL = "llama-3.1-8b-instant";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 6_000;
// Bump when the prompt changes, so cached answers are rewritten.
const PROMPT_VERSION = 1;
// Content only changes with a deploy (which empties this cache), so a day is plenty.
const TTL_MS = 24 * 60 * 60 * 1000;

const SYSTEM = [
  "You answer questions about Indian listed companies for NextResearch, a supply-chain research site.",
  "Use ONLY the facts given. Do not add any number, date, name or claim that is not in them.",
  "Keep figures exactly as written (Rs ... Cr, %, P/E).",
  "Answer in 2-4 short, plain sentences, under 90 words. No headings, no bullet points, no markdown.",
  "Never tell the reader to buy, sell, hold or invest, and never predict prices.",
].join(" ");

export function aiEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

// Number-like tokens ("1,234", "18.5", "26" in "FY26"), commas dropped.
function numbers(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}

// Advice-like wording. "hold" only as advice ("hold the stock"), not as a status ("IPO on hold").
const ADVICE = /\b(?:buy|sell|invest(?:ing)? in|recommend|should (?:consider|look at)|target price|will (?:rise|fall|go up|go down))\b|\bhold (?:the|this|it|its|these|shares|stock)\b/gi;

/** Accepts the model's text only if every number in it is in the facts and it gives no advice. */
export function checkAnswer(text: string, facts: string[]): boolean {
  if (!text || text.length > 900) return false;
  // Advice wording is allowed only when the facts already use it ("projects buy only from approved
  // Indian makers" in the ALMM thesis); otherwise the model added it.
  const source = facts.join(" ").toLowerCase();
  if ((text.match(ADVICE) ?? []).some((w) => !source.includes(w.toLowerCase()))) return false;
  const allowed = new Set<string>();
  for (const n of numbers(facts.join(" "))) {
    allowed.add(n);
    // Let the model round a figure it was given ("18.6" -> "19").
    allowed.add(String(Math.round(Number(n))));
  }
  return numbers(text).every((n) => allowed.has(n));
}

async function callGroq(question: AssistantQuestion, title: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Page: ${title}\nQuestion: ${question.q}\nFacts:\n${question.facts.map((f) => `- ${f}`).join("\n")}` },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // 429 is the free tier's daily/minute limit: expected under load, and the fallback covers it.
      if (res.status !== 429) console.warn(`[assistant] Groq answered ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim().replace(/\s+/g, " ") ?? "";
    return checkAnswer(text, question.facts) ? text : null;
  } catch {
    return null;
  }
}

/** The AI-written answer, or null (no key, limit reached, failed a check): show `question.a`. */
export function aiAnswer(contextKey: string, title: string, question: AssistantQuestion): Promise<string | null> {
  if (!aiEnabled()) return Promise.resolve(null);
  return cached(`assistant:${PROMPT_VERSION}:${contextKey}:${question.id}`, TTL_MS, () => callGroq(question, title));
}
