// Typed questions for "Ask NextResearch" (signed-in readers): find the pages the question is about,
// hand the model only those pages' facts, and keep its answer only if every number in it is one of
// those facts. The facts are the same code-written lines the suggested questions use (./index), so
// a typed answer can never quote a figure the rest of the site doesn't show.
//
// Retrieval is plain matching, not embeddings: the site's whole vocabulary is a few hundred names
// (sectors, companies, tickers, IPOs: buildSearchIndex), and a question names what it is about. The
// page the reader is on always counts, so "is it expensive?" on HAL's page means HAL.
//
// Groq's free plan allows ~200K tokens a day for gpt-oss-120b. An answer costs ~3-4K (facts in, a
// short answer and the model's reasoning out), so the day holds ~50-70 fresh answers; identical
// questions on the same pages are served from cache. Over the limit, or when the model's answer
// fails a check, the reader gets the code-written answers for the matched pages instead.
import { cached } from "../live/cache";
import { buildSearchIndex, type SearchEntry } from "../sector-content/stats";
import { groqComplete, GroqError } from "../llm/groq";
import { checkAnswer } from "./ai";
import { buildContext, contextKeyForPath, type AssistantContext } from "./index";

export const MAX_QUESTION_CHARS = 300;
const MAX_SOURCES = 4;
// About 2.5K tokens of facts: room for the prompt, the reasoning and the answer inside the free
// plan's 8K tokens a minute.
const MAX_FACT_CHARS = 10_000;
// The 120B model, not the 20B the suggested-question rewording uses: free-form comparisons need
// it (the 20B called 0.9% "lower" than 0.7%). Same free-plan limits; ~1-3 s an answer.
const MODEL = "openai/gpt-oss-120b" as const;
// Bump when the prompt or retrieval changes, so cached answers are rewritten.
const VERSION = 6;
const TTL_MS = 6 * 60 * 60 * 1000;

export type AskSource = { key: string; title: string; href: string };
export type AskAnswer = {
  answer: string;
  /** true: written by the model and passed the checks; false: the code-written fallback. */
  ai: boolean;
  sources: AskSource[];
  /** Why the fallback was used, in words for the reader (null when ai). */
  note: string | null;
};

// ------------------------------------------------------------------ finding the pages

const STOP = new Set(["the", "and", "of", "for", "in", "on", "ltd", "limited", "india", "indian", "industries", "company", "co", "corp", "corporation"]);
// Aliases that name a kind of page, not one page: "ipo" means the IPO list (below).
const GENERIC_ALIASES = new Set(["ipo", "ipos"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9&]+/).filter(Boolean);

/** Where a search entry's link points, as an assistant context key. */
export function keyForHref(href: string): string | null {
  const [path, query = ""] = href.split("?");
  const p = new URLSearchParams(query);
  const [, first, slug] = path.split("/");
  if (first === "ipos" && p.get("ipo")) return `ipo:${p.get("ipo")}`;
  // Unlisted companies deep-link into their sector's map: the sector is what we have facts on.
  if (first === "sector" && slug) return `sector:${slug}`;
  if (first === "company" && slug) return `company:${slug}`;
  return null;
}

/**
 * Where in the question an entry is named (word index), or -1. A name counts when it appears
 * whole ("Bharat Electronics"), or as its first word plus the start of its second ("sun pharma"
 * for Sun Pharmaceutical); a short form (ticker, initials) when it appears as a word and is 3+
 * letters, or is written in capitals in the question ("LT", "M&M").
 */
export function mentionAt(entry: Pick<SearchEntry, "kind" | "label" | "aliases" | "href">, question: string): number {
  const qw = words(question);
  if (entry.kind === "sector") {
    // A theme also goes by its short name (the slug: "pharma", "datacenter") or the start of its
    // first word ("pharmaceutical" for Pharmaceuticals; five letters or more).
    const slug = entry.href.split("/")[2] ?? "";
    const first = words(entry.label)[0] ?? "";
    const i = qw.findIndex((w, k) => w === slug || (k + 1 < qw.length && w + qw[k + 1] === slug) || (w.length >= 5 && first.startsWith(w)));
    if (i >= 0) return i;
  }
  const lw = words(entry.label.replace(/\s+IPO$/i, "")).filter((w) => !STOP.has(w) && /[a-z0-9]{2}/.test(w));
  if (!lw.length) return -1;
  // A theme is named by its first word ("defence" for Defence Procurement, "railways"); theme
  // names are few and distinct. A company needs its full name or first word plus the start of the
  // second, or "tata" would match every Tata company.
  const one = lw.length === 1 || entry.kind === "sector";
  for (let i = 0; i < qw.length; i++) {
    if (qw[i] !== lw[0] || lw[0].length < 3) continue;
    if (one || (i + 1 < qw.length && qw[i + 1].length >= 4 && lw[1].startsWith(qw[i + 1]))) return i;
  }
  const caps = new Set(question.split(/[^A-Za-z0-9&]+/).filter((w) => w.length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w)).map((w) => w.toLowerCase()));
  for (const a of (entry.aliases ?? []).filter((x) => !GENERIC_ALIASES.has(x))) {
    const i = qw.indexOf(a);
    if (i >= 0 && (a.length >= 3 || caps.has(a))) return i;
  }
  return -1;
}

/** The context keys a question is about, in the order it names them; the current page first when it names none. */
export function findKeys(question: string, currentKey: string, index: SearchEntry[] = buildSearchIndex()): string[] {
  const named = index
    .map((e) => ({ e, at: mentionAt(e, question), key: keyForHref(e.href) }))
    .filter((x) => x.at >= 0 && x.key)
    // A longer name wins over a shorter one at the same spot ("Tata Steel" over "Tata").
    .sort((a, b) => a.at - b.at || b.e.label.length - a.e.label.length)
    .map((x) => x.key!);
  const keys = [...new Set(named)];
  // "Which IPOs are coming up?" names no IPO: the IPO list answers it.
  if (!keys.some((k) => k.startsWith("ipo:")) && /\bipos?\b/i.test(question)) keys.push("ipos");
  // The page the reader is on answers "it" and "this sector"; listed after named pages so a
  // question about something else leads with that.
  if (!keys.includes(currentKey)) keys.push(currentKey);
  if (keys.length === 1 && currentKey !== "platform") keys.push("platform");
  return keys.slice(0, MAX_SOURCES);
}

const hrefForKey = (key: string): string => {
  const [kind, slug] = key.split(":");
  if (kind === "sector") return `/sector/${slug}`;
  if (kind === "company") return `/company/${slug}`;
  if (kind === "ipo") return `/ipos?ipo=${slug}`;
  if (kind === "ipos") return "/ipos";
  return "/";
};

/** Each source's fact lines, numbered by source, cut to the size the model is given. */
export function factsFor(contexts: AssistantContext[]): { text: string; facts: string[] } {
  const facts: string[] = [];
  const blocks: string[] = [];
  let size = 0;
  contexts.forEach((c, i) => {
    const lines = [...new Set(c.questions.flatMap((q) => q.facts))];
    const kept: string[] = [];
    for (const l of lines) {
      if (size + l.length > MAX_FACT_CHARS) break;
      kept.push(l);
      size += l.length;
    }
    facts.push(...kept);
    blocks.push(`Source ${i + 1}: ${c.title}${c.asOf ? ` (figures as of ${c.asOf})` : ""}\n${kept.map((l) => `- ${l}`).join("\n")}`);
  });
  return { text: blocks.join("\n\n"), facts };
}

// ------------------------------------------------------------------ the answer

const SYSTEM = [
  "You answer questions about Indian listed companies, sectors and IPOs for NextResearch, a supply-chain research site.",
  "Use ONLY the facts given under the numbered sources. Do not add any number, date, name or claim that is not in them.",
  "Keep figures exactly as written, with the same units (Rs ... Cr, %, P/E); write Rs, not the rupee sign.",
  "Compare numbers carefully: a larger number is higher. Report what the figures show; do not explain why (no 'reflecting', 'justifies', 'due to') unless a fact says so.",
  "If the facts do not answer the question, say so in one sentence and name the page (the source's title) that comes closest; never guess, and never mention source numbers in the answer.",
  "If asked whether to buy, sell or hold, first say NextResearch doesn't give investment advice, then give the figures that bear on it.",
  "Answer in at most 5 short, plain sentences, under 120 words. No headings, no lists, no markdown.",
  "Never tell the reader to buy, sell, hold or invest, and never predict prices.",
  "End with one last line listing the numbers of the sources you used, like: Sources: 1, 2",
].join(" ");

// Indian grouping (3,19,944) misleads the model: it called Rs 3,19,944 Cr "smaller" than
// Rs 2,67,112 Cr. It reads plain thousands grouping (319,944), and its answer is turned back into
// the Indian grouping the rest of the site uses.
export const toThousands = (s: string) => s.replace(/\d{1,3}(?:,\d{2})+,\d{3}\b/g, (n) => Number(n.replace(/,/g, "")).toLocaleString("en-US"));
export const toIndian = (s: string) => s.replace(/\d{1,3}(?:,\d{3})+\b/g, (n) => Number(n.replace(/,/g, "")).toLocaleString("en-IN"));

/**
 * Splits the model's reply into the answer and its closing "Sources: ..." line. The line usually
 * lists source numbers, sometimes source titles ("Sources: Pharmaceuticals"); both are read, and
 * the line never reaches the reader. Plain text rather than Groq's strict JSON mode, which
 * sometimes fails server-side ("Failed to generate JSON").
 */
export function splitReply(reply: string, titles: string[] = []): { answer: string; sources: number[] } {
  const text = reply.trim();
  const m = text.match(/(?:^|[\s.])\**sources?\**\s*:\**\s*([^\n]*)$/i);
  const tail = m?.[1] ?? "";
  // Only numbers that can be a source: a date in the line ("as of 26 Oct 2026") is not one.
  const max = titles.length || 9;
  const byNumber = (tail.match(/\b\d+\b/g) ?? []).map(Number).filter((n) => n >= 1 && n <= max);
  const byTitle = titles.flatMap((t, i) => (tail.toLowerCase().includes(t.toLowerCase()) ? [i + 1] : []));
  const answer = (m ? text.slice(0, m.index! + (m[0].match(/^[\s.]/) ? 1 : 0)) : text).trim().replace(/\s+/g, " ");
  return { answer, sources: [...new Set([...byNumber, ...byTitle])] };
}

/** Links for the pages used; the general "NextResearch" page only when nothing more specific is. */
function sourcesOf(contexts: AssistantContext[]): AskSource[] {
  const specific = contexts.filter((c) => c.key !== "platform");
  return (specific.length ? specific : contexts).map((c) => ({ key: c.key, title: c.title, href: hrefForKey(c.key) }));
}

/** What the reader sees when there is no AI answer: each matched page's own summary answer. */
function fallback(contexts: AssistantContext[], note: string): AskAnswer {
  const lead = contexts.slice(0, 2).map((c) => {
    const a = c.questions[0]?.a ?? "";
    return a.startsWith(c.title) ? a : `${c.title}: ${a}`;
  });
  return {
    answer: lead.join("\n\n") || "We couldn't find that in NextResearch's data.",
    ai: false,
    sources: sourcesOf(contexts),
    note,
  };
}

async function writeAnswer(question: string, contexts: AssistantContext[]): Promise<AskAnswer> {
  const { text, facts } = factsFor(contexts);
  try {
    const r = await groqComplete(
      {
        model: MODEL,
        system: SYSTEM,
        user: `Question: ${question}\n\n${toThousands(text)}`,
        // Reasoning tokens count here too; the answer itself is under 200.
        maxTokens: 1_500,
        reasoning: "low",
        timeoutMs: 12_000,
      },
      // A reader is waiting: one short wait for the minute's allowance, then the fallback.
      { maxWaits: 1 },
    );
    const out = splitReply(r.text, contexts.map((c) => c.title));
    const answer = toIndian(out.answer);
    if (!answer) return fallback(contexts, "The AI answer isn't available right now, so here is what our pages say.");
    if (!checkAnswer(answer, facts)) return fallback(contexts, "The AI answer didn't match our figures, so here is what our pages say.");
    const used = (out.sources ?? []).filter((n) => n >= 1 && n <= contexts.length).map((n) => contexts[n - 1]);
    const cited = used.length ? used : contexts;
    return { answer, ai: true, sources: sourcesOf(cited), note: null };
  } catch (e) {
    const busy = e instanceof GroqError && e.status === 429;
    console.warn(`[assistant] ask fell back: ${String(e).slice(0, 160)}`);
    return fallback(contexts, busy ? "AI answers have reached today's limit, so here is what our pages say." : "The AI answer isn't available right now, so here is what our pages say.");
  }
}

export function aiAskEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Answer a typed question asked on `pathname` (with its context query params). `ai: false` (a
 * signed-out reader) answers from the matched pages' own text, with no model call: the free AI
 * allowance is kept for signed-in readers, but nobody gets a question left unanswered.
 */
export async function answerQuestion(question: string, pathname: string, params: URLSearchParams, opts: { ai?: boolean } = {}): Promise<AskAnswer> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const current = contextKeyForPath(pathname, params);
  const contexts = findKeys(q, buildContext(current) ? current : "platform")
    .map((k) => buildContext(k))
    .filter((c): c is AssistantContext => !!c);
  if (opts.ai === false) return fallback(contexts, "Here is what our pages say. Log in for an AI-written answer to your exact question.");
  if (!aiAskEnabled()) return fallback(contexts, "AI answers are switched off, so here is what our pages say.");
  const norm = q.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").replace(/\s+/g, " ").trim();
  return cached(`ask:${VERSION}:${contexts.map((c) => c.key).join(",")}:${norm}`, TTL_MS, () => writeAnswer(q, contexts), (a) => !a.ai);
}
