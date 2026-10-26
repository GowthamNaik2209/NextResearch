// Can an open-weights model on Groq's free plan write the concall summaries? Runs the production
// prompt and schema (src/lib/concalls/prompt.ts) through Groq on transcripts we already summarised
// and checked by hand (.concall-cache/<TICKER>/summary.manual.json), then scores the result with the
// production checks (src/lib/concalls/validate.ts) and against those reference summaries.
//
//   npx tsx scripts/concall-groq-eval.ts                      SUNPHARMA CIPLA LUPIN HAL BEL on gpt-oss-120b
//   npx tsx scripts/concall-groq-eval.ts --tickers=BEL --model=openai/gpt-oss-20b
//
// Free plan: 8K tokens a minute, 200K a day for gpt-oss-120b. A transcript goes in parts of about
// 11K characters, one request a minute; the five reference transcripts use roughly 150K tokens.
// Each part's answer is cached in .concall-cache/groq-eval/, so a run stopped by the daily limit
// picks up where it left off the next day. Writes .concall-cache/groq-eval/report.md.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { groqComplete, splitPages, type GroqModel } from "../src/lib/llm/groq";
import { SUMMARY_SCHEMA, SUMMARY_SYSTEM } from "../src/lib/concalls/prompt";
import { checkPassed, checkSummary, parseSummary } from "../src/lib/concalls/validate";
import type { ConcallSummaryJson, GuidanceItem, Point } from "../src/lib/concalls/types";

const CACHE = ".concall-cache";
const OUT = path.join(CACHE, "groq-eval");
const PART_CHARS = 11_000;
const PART_MAX_TOKENS = 3_000;
const GAP_MS = 62_000;

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const TICKERS = (arg("tickers") ?? "SUNPHARMA,CIPLA,LUPIN,HAL,BEL").split(",");
const MODEL = (arg("model") ?? "openai/gpt-oss-120b") as GroqModel;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readPages(ticker: string): string[] {
  const raw = fs.readFileSync(path.join(CACHE, ticker, "transcript.txt"), "utf8");
  return raw.split(/\[\[Page \d+\]\]\n?/).slice(1).map((p) => p.trim());
}

const PART_NOTE = (i: number, n: number, from: number, to: number) =>
  `This is part ${i} of ${n} of the transcript (pages ${from}-${to}); the other parts are summarised separately and merged. ` +
  `Extract only what is on these pages, cite the page numbers shown, and keep each list to the strongest items. ` +
  `Set tone from this part alone. If the quarter or call date is not visible here, still give your best reading of it.`;

// --------------------------------------------------------------------------------- merging parts

const normQuote = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function dedupe<T extends { quote: string }>(items: T[], limit: number): T[] {
  const seen: string[] = [];
  const out: T[] = [];
  for (const it of items) {
    const q = normQuote(it.quote);
    if (seen.some((s) => s.includes(q.slice(0, 40)) || q.includes(s.slice(0, 40)))) continue;
    seen.push(q);
    out.push(it);
  }
  return out.slice(0, limit);
}
const TONE_ORDER = ["negative", "cautious", "neutral", "cautiously positive", "positive"] as const;

/** Parts -> one summary: lists concatenated and de-duplicated, tone = the median of the parts. */
function merge(parts: ConcallSummaryJson[]): ConcallSummaryJson {
  const tones = parts.map((p) => TONE_ORDER.indexOf(p.tone.label)).filter((i) => i >= 0).sort((a, b) => a - b);
  const mid = tones[Math.floor((tones.length - 1) / 2)] ?? 2;
  const first = parts.find((p) => p.fiscal_year) ?? parts[0];
  return {
    fiscal_year: first.fiscal_year,
    quarter: first.quarter,
    call_date: parts.find((p) => p.call_date)?.call_date ?? "",
    guidance: dedupe(parts.flatMap((p) => p.guidance), 15),
    demand: dedupe(parts.flatMap((p) => p.demand), 8),
    risks: dedupe(parts.flatMap((p) => p.risks), 8),
    initiatives: dedupe(parts.flatMap((p) => p.initiatives), 8),
    tone: { label: TONE_ORDER[mid], rationale: parts.find((p) => TONE_ORDER.indexOf(p.tone.label) === mid)?.tone.rationale ?? "" },
    key_qa: dedupe(parts.flatMap((p) => p.key_qa), 5),
  };
}

// --------------------------------------------------------------------------------- scoring

/** A reference guidance item counts as found when the model has the same metric and period and the same numbers. */
function sameGuidance(a: GuidanceItem, b: GuidanceItem): boolean {
  if (a.metric !== b.metric) return false;
  if ((a.target_fiscal_year ?? 0) !== (b.target_fiscal_year ?? 0) && a.target_fiscal_year && b.target_fiscal_year) return false;
  const na = [a.low, a.high].filter((x) => x != null).map(Number);
  const nb = [b.low, b.high].filter((x) => x != null).map(Number);
  if (!na.length && !nb.length) return true;
  return na.some((x) => nb.includes(x));
}

type Score = {
  ticker: string;
  parts: number;
  inputTokens: number;
  outputTokens: number;
  seconds: number;
  items: number;
  passed: number;
  guidanceFound: number;
  guidanceRef: number;
  missed: string[];
  extra: number;
  tone: string;
  refTone: string;
  quarter: string;
  refQuarter: string;
  failures: string[];
};

async function runTicker(ticker: string): Promise<Score> {
  const pages = readPages(ticker);
  const ref = JSON.parse(fs.readFileSync(path.join(CACHE, ticker, "summary.manual.json"), "utf8")) as ConcallSummaryJson;
  const parts = splitPages(pages, PART_CHARS);
  const dir = path.join(OUT, MODEL.replace("/", "_"), ticker);
  fs.mkdirSync(dir, { recursive: true });
  const got: ConcallSummaryJson[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let seconds = 0;
  const failures: string[] = [];
  for (const [i, part] of parts.entries()) {
    const file = path.join(dir, `part-${i + 1}.json`);
    if (fs.existsSync(file)) {
      const c = JSON.parse(fs.readFileSync(file, "utf8"));
      got.push(c.summary);
      inputTokens += c.inputTokens;
      outputTokens += c.outputTokens;
      seconds += c.seconds;
      continue;
    }
    const user =
      `Company: ${ticker}\n${PART_NOTE(i + 1, parts.length, part.from, part.to)}\n\n<transcript>\n` +
      part.pages.map((p, j) => `[[Page ${part.from + j}]]\n${p}`).join("\n\n") +
      `\n</transcript>`;
    const t0 = Date.now();
    try {
      const r = await groqComplete(
        { model: MODEL, system: SUMMARY_SYSTEM, user, schema: { name: "concall_summary", schema: SUMMARY_SCHEMA }, maxTokens: PART_MAX_TOKENS, reasoning: "low" },
        { onWait: (s) => console.log(`    rate limit, waiting ${s}s`) },
      );
      const summary = parseSummary(r.text);
      const secs = (Date.now() - t0) / 1000;
      fs.writeFileSync(file, JSON.stringify({ summary, inputTokens: r.inputTokens, outputTokens: r.outputTokens, reasoningTokens: r.reasoningTokens, seconds: secs }, null, 2));
      got.push(summary);
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;
      seconds += secs;
      console.log(`  ${ticker} part ${i + 1}/${parts.length} (pages ${part.from}-${part.to}): ${r.inputTokens} in / ${r.outputTokens} out, ${secs.toFixed(1)}s`);
    } catch (e) {
      failures.push(`part ${i + 1}: ${String(e).slice(0, 160)}`);
      console.log(`  ${ticker} part ${i + 1}/${parts.length}: FAILED ${String(e).slice(0, 160)}`);
      if (/daily|per day|TPD/i.test(String(e))) throw e;
    }
    await sleep(GAP_MS);
  }
  const merged = got.length ? merge(got) : null;
  if (merged) fs.writeFileSync(path.join(dir, "merged.json"), JSON.stringify(merged, null, 2));
  const checks = merged ? checkSummary(merged, pages) : [];
  const found = ref.guidance.filter((g) => merged?.guidance.some((m) => sameGuidance(g, m)));
  const missed = ref.guidance.filter((g) => !found.includes(g)).map((g) => g.statement.slice(0, 90));
  const extra = merged ? merged.guidance.filter((m) => !ref.guidance.some((g) => sameGuidance(g, m))).length : 0;
  return {
    ticker,
    parts: parts.length,
    inputTokens,
    outputTokens,
    seconds,
    items: checks.length,
    passed: checks.filter(checkPassed).length,
    guidanceFound: found.length,
    guidanceRef: ref.guidance.length,
    missed,
    extra,
    tone: merged?.tone.label ?? "-",
    refTone: ref.tone.label,
    quarter: merged ? `Q${merged.quarter} FY${String(merged.fiscal_year).slice(-2)}` : "-",
    refQuarter: `Q${ref.quarter} FY${String(ref.fiscal_year).slice(-2)}`,
    failures,
  };
}

function report(scores: Score[]): string {
  const sum = (f: (s: Score) => number) => scores.reduce((n, s) => n + f(s), 0);
  const L = [
    `# Groq evaluation: ${MODEL}`,
    "",
    `Run ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC with the production prompt (src/lib/concalls/prompt.ts), in parts of ~${PART_CHARS.toLocaleString()} characters, reasoning effort low.`,
    "Checks: the quote must be on the page it cites and every number must be in the PDF text (src/lib/concalls/validate.ts).",
    "Guidance found: a reference guidance item (hand-checked summary) with the same metric, period and numbers in the model's output.",
    "",
    "| Ticker | Parts | Items passing checks | Guidance found | Extra guidance | Quarter (ref) | Tone (ref) | Tokens in / out |",
    "|---|---|---|---|---|---|---|---|",
    ...scores.map(
      (s) =>
        `| ${s.ticker} | ${s.parts} | ${s.passed}/${s.items} | ${s.guidanceFound}/${s.guidanceRef} | ${s.extra} | ${s.quarter} (${s.refQuarter}) | ${s.tone} (${s.refTone}) | ${s.inputTokens.toLocaleString()} / ${s.outputTokens.toLocaleString()} |`,
    ),
    "",
    `Total: ${sum((s) => s.passed)}/${sum((s) => s.items)} items pass the checks; ${sum((s) => s.guidanceFound)}/${sum((s) => s.guidanceRef)} reference guidance items found; ${sum((s) => s.inputTokens + s.outputTokens).toLocaleString()} tokens.`,
    "",
    "## Reference guidance the model missed",
    "",
    ...scores.flatMap((s) => (s.missed.length ? [`**${s.ticker}**`, ...s.missed.map((m) => `- ${m}`), ""] : [])),
    "## Failures",
    "",
    ...(scores.some((s) => s.failures.length) ? scores.flatMap((s) => s.failures.map((f) => `- ${s.ticker} ${f}`)) : ["- none"]),
    "",
  ];
  return L.join("\n");
}

async function main() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set (.env)");
  fs.mkdirSync(OUT, { recursive: true });
  const scores: Score[] = [];
  for (const t of TICKERS) {
    console.log(`${t}:`);
    try {
      scores.push(await runTicker(t));
    } catch (e) {
      console.log(`stopped: ${String(e).slice(0, 200)}`);
      break;
    }
  }
  const md = report(scores);
  fs.writeFileSync(path.join(OUT, `report-${MODEL.replace("/", "_")}.md`), md);
  console.log("\n" + md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
