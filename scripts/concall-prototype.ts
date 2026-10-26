// Earnings-call summaries, local prototype: for a handful of tracked companies, find the latest
// earnings-call transcript filed on BSE (NSE as the fallback), pull its text, have Claude extract
// guidance / demand / risks / initiatives / tone / key Q&A with a supporting quote and page for every
// item, check the quotes and numbers against the PDF text, roll the companies up by industry, and
// write docs/CONCALL-SUMMARIES-PROTOTYPE.md. Read-only: no database access, nothing deployed.
//
//   npx tsx scripts/concall-prototype.ts              fetch + extract + summarise + roll up + report
//   npx tsx scripts/concall-prototype.ts --no-llm     fetch + extract only (no API spend), still writes the report
//   npx tsx scripts/concall-prototype.ts --refresh    ignore cached summaries and call Claude again
//
// Filings: the script asks BSE (then NSE) politely, under its own name, a couple of seconds apart.
// Both sit behind bot protection that can refuse or time out; when that happens it says so and uses a PDF
// placed by hand instead: .concall-cache/<TICKER>/transcript.pdf, plus an optional source.json
// ({ "exchange": "manual", "url": "...", "date": "2026-08-12", "title": "..." }) so the report can link it.
// .concall-cache/ is gitignored: transcripts stay local, only our own summaries + links go anywhere.
//
// Claude: the Anthropic SDK reads ANTHROPIC_API_KEY (or an `ant auth login` profile).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { extractText, getDocumentProxy } from "unpdf";

// ---------------------------------------------------------------------------------------------
// Inputs

type Target = { ticker: string; name: string; bse: string; nse: string; industry: string };

// Two industries from the tracked set (sector content: pharma, defenceproc), large enough that
// every one of them holds a call each quarter.
const TARGETS: Target[] = [
  { ticker: "SUNPHARMA", name: "Sun Pharmaceutical Industries", bse: "524715", nse: "SUNPHARMA", industry: "Pharma" },
  { ticker: "CIPLA", name: "Cipla", bse: "500087", nse: "CIPLA", industry: "Pharma" },
  { ticker: "LUPIN", name: "Lupin", bse: "500257", nse: "LUPIN", industry: "Pharma" },
  { ticker: "HAL", name: "Hindustan Aeronautics", bse: "541154", nse: "HAL", industry: "Defence" },
  { ticker: "BEL", name: "Bharat Electronics", bse: "500049", nse: "BEL", industry: "Defence" },
];

const MODEL = "claude-opus-5-5";
// $ per million tokens (claude-opus-5-5, first-party API, cached 2026-10-06).
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".concall-cache");
const REPORT = path.join(ROOT, "docs", "CONCALL-SUMMARIES-PROTOTYPE.md");
const UA = "NextResearch-concall-prototype/0.1 (research prototype; one request per company)";
const LOOKBACK_DAYS = 200;
const PAUSE_MS = 2000;
// Fewer extractable characters per page than this and the PDF is treated as a scan.
const MIN_CHARS_PER_PAGE = 300;

const args = new Set(process.argv.slice(2));
const NO_LLM = args.has("--no-llm");
const REFRESH = args.has("--refresh");

// ---------------------------------------------------------------------------------------------
// Types

type Source = { exchange: "BSE" | "NSE" | "manual"; url?: string; date?: string; title?: string };
type Attempt = { step: string; ok: boolean; detail: string };

type Quoted = { quote: string; page: number };
type GuidanceItem = Quoted & { metric: string; period: string; statement: string };
type Item = Quoted & { point: string };
type QA = Quoted & { analyst_question: string; management_answer: string };
type Summary = {
  quarter: string;
  call_date: string;
  guidance: GuidanceItem[];
  demand: Item[];
  risks: Item[];
  initiatives: Item[];
  tone: { label: "positive" | "cautiously positive" | "neutral" | "cautious" | "negative"; rationale: string };
  key_qa: QA[];
};

type Check = { section: string; text: string; page: number; quoteFound: "page" | "elsewhere" | "missing"; missingNumbers: string[] };

type Usage = { input: number; output: number; cacheWrite: number; cacheRead: number };

type Result = {
  t: Target;
  attempts: Attempt[];
  source?: Source;
  pdfPath?: string;
  pages?: number;
  chars?: number;
  failure?: string;
  summary?: Summary;
  checks?: Check[];
  usage?: Usage;
  seconds?: number;
};

type Rollup = {
  industry: string;
  headline: string;
  demand_themes: { theme: string; companies: string[] }[];
  guidance_comparison: { company: string; revenue: string; margin: string; capex: string }[];
  shared_risks: { risk: string; companies: string[] }[];
  divergences: string[];
  tone_mix: string;
};

// ---------------------------------------------------------------------------------------------
// Helpers

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const dmy = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("-");

async function getJson(url: string, headers: Record<string, string>): Promise<{ ok: true; data: unknown } | { ok: false; detail: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(20_000) });
    const body = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}${/Access Denied/i.test(body) ? " (Akamai Access Denied)" : ""}` };
    try {
      return { ok: true, data: JSON.parse(body) };
    } catch {
      return { ok: false, detail: `HTTP ${res.status} but not JSON (${body.slice(0, 60).replace(/\s+/g, " ")})` };
    }
  } catch (e) {
    return { ok: false, detail: String(e).slice(0, 120) };
  }
}

// "Earnings Call Transcript" is BSE's subcategory name; NSE only has the free-text subject. AGM
// transcripts also say "transcript" and are not earnings calls.
const isTranscript = (s: string) =>
  /transcript/i.test(s) && /(earnings|conference|con-?call|analysts?|investors?)\W*(call|meet)/i.test(s) && !/annual general meeting|\bAGM\b/i.test(s);

// BSE corporate announcements (the JSON the bseindia.com announcements page reads). Category
// "Company Update" holds the "Earnings Call Transcript" subcategory; filtering on the headline
// keeps this working if the subcategory id moves.
async function findOnBse(t: Target): Promise<{ source?: Source; attempt: Attempt }> {
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK_DAYS * 86400_000);
  const url =
    `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=1&strCat=Company+Update` +
    `&strPrevDate=${ymd(from)}&strScrip=${t.bse}&strSearch=P&strToDate=${ymd(to)}&strType=C&subcategory=-1`;
  // 50 rows a page; three pages covers the window for even busy filers.
  const all: Record<string, string>[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await getJson(url.replace("pageno=1", `pageno=${page}`), { Referer: "https://www.bseindia.com/" });
    if (!r.ok) {
      if (page === 1) return { attempt: { step: "BSE announcements", ok: false, detail: r.detail } };
      break;
    }
    const d = r.data as { Table?: Record<string, string>[]; Table1?: { ROWCNT?: number }[] };
    all.push(...(d.Table ?? []));
    if (all.length >= Number(d.Table1?.[0]?.ROWCNT ?? 0) || !(d.Table ?? []).length) break;
    await sleep(PAUSE_MS);
  }
  const rows = all.filter((x) => isTranscript(`${x.SUBCATNAME ?? ""} ${x.NEWSSUB ?? ""} ${x.HEADLINE ?? ""}`));
  rows.sort((a, b) => String(b.NEWS_DT).localeCompare(String(a.NEWS_DT)));
  const hit = rows.find((x) => x.ATTACHMENTNAME);
  if (!hit) return { attempt: { step: "BSE announcements", ok: false, detail: "no transcript filing in the window" } };
  return {
    source: {
      exchange: "BSE",
      // Recent filings sit under AttachLive and move to AttachHis after a while; download() tries both.
      url: `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${hit.ATTACHMENTNAME}`,
      date: String(hit.NEWS_DT).slice(0, 10),
      title: hit.NEWSSUB || hit.HEADLINE,
    },
    attempt: { step: "BSE announcements", ok: true, detail: hit.NEWSSUB || hit.HEADLINE },
  };
}

async function findOnNse(t: Target): Promise<{ source?: Source; attempt: Attempt }> {
  const to = new Date();
  const from = new Date(Date.now() - LOOKBACK_DAYS * 86400_000);
  const url = `https://www.nseindia.com/api/corporate-announcements?index=equities&symbol=${encodeURIComponent(t.nse)}&from_date=${dmy(from)}&to_date=${dmy(to)}`;
  const r = await getJson(url, { Referer: "https://www.nseindia.com/" });
  if (!r.ok) return { attempt: { step: "NSE announcements", ok: false, detail: r.detail } };
  const rows = (Array.isArray(r.data) ? r.data : []) as Record<string, string>[];
  const hit = rows
    .filter((x) => isTranscript(`${x.desc ?? ""} ${x.attchmntText ?? ""}`) && x.attchmntFile)
    .sort((a, b) => String(b.sort_date ?? b.an_dt).localeCompare(String(a.sort_date ?? a.an_dt)))[0];
  if (!hit) return { attempt: { step: "NSE announcements", ok: false, detail: "no transcript filing in the window" } };
  return {
    source: { exchange: "NSE", url: hit.attchmntFile, date: hit.an_dt, title: hit.attchmntText || hit.desc },
    attempt: { step: "NSE announcements", ok: true, detail: hit.attchmntText || hit.desc },
  };
}

async function download(url: string, dest: string): Promise<Attempt> {
  const first = await downloadOnce(url, dest);
  if (first.ok || !url.includes("/AttachLive/") || !/HTTP 404/.test(first.detail)) return first;
  await sleep(PAUSE_MS);
  const his = await downloadOnce(url.replace("/AttachLive/", "/AttachHis/"), dest);
  return { ...his, detail: `AttachLive 404, AttachHis ${his.ok ? "ok, " : ""}${his.detail}` };
}

async function downloadOnce(url: string, dest: string): Promise<Attempt> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) return { step: "download PDF", ok: false, detail: `HTTP ${res.status}` };
    if (buf.subarray(0, 4).toString() !== "%PDF") return { step: "download PDF", ok: false, detail: "response is not a PDF" };
    fs.writeFileSync(dest, buf);
    return { step: "download PDF", ok: true, detail: `${(buf.length / 1024).toFixed(0)} KB` };
  } catch (e) {
    return { step: "download PDF", ok: false, detail: String(e).slice(0, 120) };
  }
}

async function pdfPages(file: string): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(file)));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((p) => p.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
}

// ---------------------------------------------------------------------------------------------
// Validation: a quote should be on the page it cites, and every number in a claim should be
// somewhere in the transcript.

const norm = (s: string) =>
  s.toLowerCase().replace(/[‘’“”"'`]/g, "").replace(/[–—-]/g, "-").replace(/\s+/g, " ").trim();
const digitsOnly = (s: string) => s.replace(/,/g, "");

function quoteLocation(quote: string, page: number, pages: string[]): Check["quoteFound"] {
  const q = norm(quote).replace(/\.\.\.|…/g, "\u0000");
  const parts = q.split("\u0000").map((p) => p.trim()).filter((p) => p.length >= 8);
  if (!parts.length) return "missing";
  const on = (txt: string) => parts.every((p) => norm(txt).includes(p));
  if (pages[page - 1] && on(pages[page - 1])) return "page";
  // Text extraction can split a sentence across a page break.
  if (on(pages.slice(Math.max(0, page - 2), page + 1).join(" "))) return "page";
  return on(pages.join(" ")) ? "elsewhere" : "missing";
}

function numbersIn(s: string): string[] {
  return [...new Set((digitsOnly(s).match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !/^(19|20)\d\d$/.test(n) && n.length > 0))];
}

function missingNumbers(claim: string, quote: string, fullText: string): string[] {
  const hay = digitsOnly(fullText);
  // Fiscal labels the model writes in its own words (FY27, Q2) are not figures.
  const own = claim.replace(/\b(?:FY|Q[1-4]|H[12])\s*'?\d{2,4}\b/gi, " ");
  return numbersIn(`${own} ${quote}`).filter((n) => !new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}(?![\\d])`).test(hay));
}

function validate(s: Summary, pages: string[]): Check[] {
  const full = pages.join("\n");
  const out: Check[] = [];
  const push = (section: string, text: string, q: Quoted) =>
    out.push({ section, text, page: q.page, quoteFound: quoteLocation(q.quote, q.page, pages), missingNumbers: missingNumbers(text, q.quote, full) });
  for (const g of s.guidance) push("guidance", `${g.metric} ${g.period}: ${g.statement}`, g);
  for (const x of s.demand) push("demand", x.point, x);
  for (const x of s.risks) push("risks", x.point, x);
  for (const x of s.initiatives) push("initiatives", x.point, x);
  for (const x of s.key_qa) push("key_qa", `${x.analyst_question} ${x.management_answer}`, x);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Claude

const quoted = {
  quote: { type: "string", description: "Verbatim words from the transcript (max ~30 words) that support the item." },
  page: { type: "integer", description: "The [[Page N]] the quote is on." },
};
const itemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["point", "quote", "page"],
  properties: { point: { type: "string" }, ...quoted },
};
const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["quarter", "call_date", "guidance", "demand", "risks", "initiatives", "tone", "key_qa"],
  properties: {
    quarter: { type: "string", description: "e.g. Q1 FY27" },
    call_date: { type: "string", description: "YYYY-MM-DD if stated, else empty" },
    guidance: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metric", "period", "statement", "quote", "page"],
        properties: {
          metric: { type: "string", enum: ["revenue", "margin", "capex", "order book", "other"] },
          period: { type: "string" },
          statement: { type: "string" },
          ...quoted,
        },
      },
    },
    demand: { type: "array", items: itemSchema },
    risks: { type: "array", items: itemSchema },
    initiatives: { type: "array", items: itemSchema },
    tone: {
      type: "object",
      additionalProperties: false,
      required: ["label", "rationale"],
      properties: {
        label: { type: "string", enum: ["positive", "cautiously positive", "neutral", "cautious", "negative"] },
        rationale: { type: "string" },
      },
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
};

const SUMMARY_SYSTEM = `You summarise Indian listed companies' earnings-call transcripts for investors who compare companies within an industry.

Extract only what management said on this call. For every item give a short verbatim quote (copied exactly, no paraphrase, max ~30 words; use "..." only to join two pieces from the same passage) and the [[Page N]] marker it appears under.

- guidance: forward-looking numbers or explicit directional statements on revenue/growth, margin (EBITDA, gross), capex, order book/inflow. Keep the period management used (FY27, H2, next 2-3 years). No guidance given on a metric means no item for it.
- demand: what management said about end-market demand, pricing, volumes, segment trends.
- risks: headwinds, uncertainties, one-offs management flagged or analysts pressed on.
- initiatives: new products, launches, capacity, acquisitions, entries into new markets.
- tone: one label plus a one-sentence reason grounded in the call.
- key_qa: the 3-5 analyst questions that mattered most and the gist of the answer.

Numbers in statements must be the ones in the transcript, with their units (Rs crore, %, $ mn). Do not compute, convert or annualise. 3-6 items per list is typical; fewer is fine.`;

const ROLLUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "demand_themes", "guidance_comparison", "shared_risks", "divergences", "tone_mix"],
  properties: {
    headline: { type: "string", description: "One or two sentences: what this quarter's calls say about the industry." },
    demand_themes: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["theme", "companies"], properties: { theme: { type: "string" }, companies: { type: "array", items: { type: "string" } } } },
    },
    guidance_comparison: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company", "revenue", "margin", "capex"],
        properties: { company: { type: "string" }, revenue: { type: "string" }, margin: { type: "string" }, capex: { type: "string" } },
      },
    },
    shared_risks: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["risk", "companies"], properties: { risk: { type: "string" }, companies: { type: "array", items: { type: "string" } } } },
    },
    divergences: { type: "array", items: { type: "string" } },
    tone_mix: { type: "string" },
  },
};

const ROLLUP_SYSTEM = `You write an industry roll-up from several companies' earnings-call summaries (JSON, already extracted and checked). Use only what is in them; name the companies (by ticker) behind every theme or risk. In guidance_comparison write "not guided" where a company gave nothing on that metric. divergences: where companies in the same industry said clearly different things. Keep it short: an investor should read it in a minute.`;

let client: Anthropic | null = null;
function claude(): Anthropic {
  return (client ??= new Anthropic());
}

async function callJson<T>(system: string, schema: object, content: string, maxTokens: number): Promise<{ data: T; usage: Usage }> {
  const stream = claude().beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  } as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error(`refused (${msg.stop_details?.category ?? "no category"})`);
  if (msg.stop_reason === "max_tokens") throw new Error("hit max_tokens");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const u = msg.usage;
  return {
    data: JSON.parse(text) as T,
    usage: { input: u.input_tokens, output: u.output_tokens, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 },
  };
}

const cost = (u: Usage) => (u.input * PRICE.input + u.output * PRICE.output + u.cacheWrite * PRICE.cacheWrite + u.cacheRead * PRICE.cacheRead) / 1e6;
const addUsage = (a: Usage, b: Usage): Usage => ({ input: a.input + b.input, output: a.output + b.output, cacheWrite: a.cacheWrite + b.cacheWrite, cacheRead: a.cacheRead + b.cacheRead });
const ZERO: Usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };

// Cached by content hash so re-running the report costs nothing unless the PDF or prompt changes.
function cacheKey(...parts: string[]) {
  return crypto.createHash("sha256").update([MODEL, ...parts].join("\u0000")).digest("hex").slice(0, 16);
}
function readCache<T>(file: string, key: string): T | null {
  if (REFRESH || !fs.existsSync(file)) return null;
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  return c.key === key ? (c.value as T) : null;
}
const writeCache = (file: string, key: string, value: unknown) => fs.writeFileSync(file, JSON.stringify({ key, value }, null, 2));

// ---------------------------------------------------------------------------------------------
// Pipeline

async function runCompany(t: Target): Promise<Result> {
  const r: Result = { t, attempts: [] };
  const dir = path.join(CACHE, t.ticker);
  fs.mkdirSync(dir, { recursive: true });
  const pdf = path.join(dir, "transcript.pdf");
  const srcFile = path.join(dir, "source.json");

  // 1. Find the filing. A PDF already fetched (source.json beside it) is reused without asking the
  // exchanges again; delete the company's folder to look for a newer call.
  // A PDF without source.json was placed by hand.
  const fetched = fs.existsSync(pdf)
    ? fs.existsSync(srcFile)
      ? (JSON.parse(fs.readFileSync(srcFile, "utf8")) as Source)
      : ({ exchange: "manual" } as Source)
    : undefined;
  if (fetched) r.attempts.push({ step: fetched.exchange === "manual" ? "manual PDF" : "cached filing", ok: true, detail: `${fetched.exchange} ${fetched.date ?? ""}`.trim() });
  const bse = fetched ? undefined : await findOnBse(t);
  if (bse) r.attempts.push(bse.attempt);
  let source = fetched ?? bse?.source;
  if (!source) {
    await sleep(PAUSE_MS);
    const nse = await findOnNse(t);
    r.attempts.push(nse.attempt);
    source = nse.source;
  }
  if (source?.url && !fs.existsSync(pdf)) {
    await sleep(PAUSE_MS);
    const d = await download(source.url, pdf);
    r.attempts.push(d);
    if (d.ok) fs.writeFileSync(srcFile, JSON.stringify(source, null, 2));
  }
  // Results are quarterly; a transcript older than ~4 months means the latest quarter had no call
  // (or it was not filed), so the summary is a quarter behind.
  const filed = source?.date ? Date.parse(source.date.replace(/^(\d{2})-(\w{3})-(\d{4})/, "$2 $1 $3")) : NaN;
  if (Number.isFinite(filed) && Date.now() - filed > 120 * 86400_000) {
    r.attempts.push({ step: "freshness", ok: false, detail: `latest transcript filed ${source!.date!.slice(0, 11)}: no call filed for the latest quarter` });
  }
  if (fs.existsSync(pdf)) {
    r.source = source;
  } else {
    const why = r.attempts.filter((a) => !a.ok).map((a) => `${a.step}: ${a.detail}`).join("; ");
    r.failure = `No transcript (${why || "nothing found"}) and no PDF placed by hand`;
    return r;
  }
  r.pdfPath = pdf;

  // 2. Text.
  let pages: string[];
  try {
    pages = await pdfPages(pdf);
  } catch (e) {
    r.failure = `PDF could not be read: ${String(e).slice(0, 100)}`;
    return r;
  }
  r.pages = pages.length;
  r.chars = pages.reduce((n, p) => n + p.length, 0);
  fs.writeFileSync(path.join(dir, "transcript.txt"), pages.map((p, i) => `[[Page ${i + 1}]]\n${p}`).join("\n\n"));
  if (r.chars / Math.max(1, pages.length) < MIN_CHARS_PER_PAGE) {
    r.failure = `Looks scanned: ${r.chars} characters over ${pages.length} pages (needs OCR)`;
    return r;
  }
  if (!/question|analyst|moderator/i.test(pages.join(" "))) {
    r.attempts.push({ step: "content check", ok: false, detail: "no Q&A markers: may be a presentation, not a transcript" });
  }
  if (NO_LLM) return r;

  // 3. Summary.
  const body = `Company: ${t.name} (NSE: ${t.nse})\nFiling: ${r.source?.title ?? "earnings call transcript"} ${r.source?.date ?? ""}\n\n<transcript>\n${pages
    .map((p, i) => `[[Page ${i + 1}]]\n${p}`)
    .join("\n\n")}\n</transcript>`;
  const key = cacheKey(SUMMARY_SYSTEM, JSON.stringify(SUMMARY_SCHEMA), body);
  const sumFile = path.join(dir, "summary.json");
  type Got = { summary: Summary; usage: Usage; seconds: number };
  const cached = readCache<Got>(sumFile, key);
  try {
    const t0 = Date.now();
    const got: Got = cached ?? (await callJson<Summary>(SUMMARY_SYSTEM, SUMMARY_SCHEMA, body, 32000).then((x) => ({ summary: x.data, usage: x.usage, seconds: (Date.now() - t0) / 1000 })));
    if (!cached) writeCache(sumFile, key, got);
    r.summary = got.summary;
    r.usage = got.usage;
    r.seconds = got.seconds;
  } catch (e) {
    r.failure = `Claude call failed: ${e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e)}`.slice(0, 300);
    return r;
  }

  // 4. Checks.
  r.checks = validate(r.summary, pages);
  return r;
}

async function runRollup(industry: string, rs: Result[]): Promise<{ rollup?: Rollup; usage?: Usage; failure?: string }> {
  const done = rs.filter((r) => r.summary);
  if (done.length < 2) return { failure: `${done.length} of ${rs.length} companies summarised; a roll-up needs at least 2` };
  const content = `Industry: ${industry}\n\n${done.map((r) => `<company ticker="${r.t.ticker}" name="${r.t.name}">\n${JSON.stringify(r.summary)}\n</company>`).join("\n\n")}`;
  const key = cacheKey(ROLLUP_SYSTEM, JSON.stringify(ROLLUP_SCHEMA), content);
  const file = path.join(CACHE, `rollup-${industry.toLowerCase()}.json`);
  const cached = readCache<{ rollup: Rollup; usage: Usage }>(file, key);
  if (cached) return cached;
  try {
    const x = await callJson<Omit<Rollup, "industry">>(ROLLUP_SYSTEM, ROLLUP_SCHEMA, content, 16000);
    const out = { rollup: { industry, ...x.data }, usage: x.usage };
    writeCache(file, key, out);
    return out;
  } catch (e) {
    return { failure: `Claude call failed: ${String(e).slice(0, 200)}` };
  }
}

// ---------------------------------------------------------------------------------------------
// Report

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
const money = (n: number) => `$${n.toFixed(3)}`;

function companySection(r: Result): string {
  const L: string[] = [`### ${r.t.ticker} · ${r.t.name} (${r.t.industry})`, ""];
  const src = r.source;
  if (src) L.push(`Source: ${src.exchange}${src.date ? `, filed ${src.date}` : ""}${src.title ? ` · ${esc(src.title)}` : ""}${src.url ? ` · [filing](${src.url})` : ""}${r.pages ? ` · ${r.pages} pages` : ""}`, "");
  if (r.failure) return [...L, `**Not summarised:** ${r.failure}`, ""].join("\n");
  if (!r.summary) return [...L, "_Text extracted; summary skipped (--no-llm)._", ""].join("\n");
  const s = r.summary;
  const flag = (section: string, text: string) => {
    const c = r.checks?.find((x) => x.section === section && x.text === text);
    if (!c) return "";
    const bits = [];
    if (c.quoteFound === "elsewhere") bits.push("quote found on another page");
    if (c.quoteFound === "missing") bits.push("quote not found in text");
    if (c.missingNumbers.length) bits.push(`number(s) not in text: ${c.missingNumbers.join(", ")}`);
    return bits.length ? ` ⚠️ _${bits.join("; ")}_` : "";
  };
  const cite = (q: Quoted) => `> "${esc(q.quote)}" (p. ${q.page})`;
  L.push(`**${s.quarter}**${s.call_date ? ` · call ${s.call_date}` : ""} · tone: **${s.tone.label}** (${s.tone.rationale})`, "");
  L.push("**Guidance**", "");
  if (!s.guidance.length) L.push("- No numeric or directional guidance given.");
  for (const g of s.guidance) L.push(`- **${g.metric}, ${g.period}:** ${g.statement}${flag("guidance", `${g.metric} ${g.period}: ${g.statement}`)}`, `  ${cite(g)}`);
  for (const [title, key] of [["Demand", "demand"], ["Risks", "risks"], ["New initiatives", "initiatives"]] as const) {
    L.push("", `**${title}**`, "");
    if (!s[key].length) L.push("- None stated.");
    for (const x of s[key]) L.push(`- ${x.point}${flag(key, x.point)}`, `  ${cite(x)}`);
  }
  L.push("", "**Key Q&A**", "");
  for (const q of s.key_qa) L.push(`- **Q:** ${q.analyst_question}`, `  **A:** ${q.management_answer}${flag("key_qa", `${q.analyst_question} ${q.management_answer}`)}`, `  ${cite(q)}`);
  L.push("");
  return L.join("\n");
}

function rollupSection(industry: string, x: { rollup?: Rollup; failure?: string }): string {
  const L = [`### ${industry}`, ""];
  if (!x.rollup) return [...L, `_Not produced: ${x.failure}_`, ""].join("\n");
  const r = x.rollup;
  L.push(r.headline, "", `Tone: ${r.tone_mix}`, "", "| Company | Revenue | Margin | Capex |", "|---|---|---|---|");
  for (const g of r.guidance_comparison) L.push(`| ${esc(g.company)} | ${esc(g.revenue)} | ${esc(g.margin)} | ${esc(g.capex)} |`);
  L.push("", "**Demand themes**", "");
  for (const d of r.demand_themes) L.push(`- ${d.theme} (${d.companies.join(", ")})`);
  L.push("", "**Shared risks**", "");
  for (const d of r.shared_risks) L.push(`- ${d.risk} (${d.companies.join(", ")})`);
  if (r.divergences.length) {
    L.push("", "**Where they differ**", "");
    for (const d of r.divergences) L.push(`- ${d}`);
  }
  L.push("");
  return L.join("\n");
}

const PRISMA_PROPOSAL = `\`\`\`prisma
// One row per company per call: our own summary and a link to the filing (never the transcript).
model ConcallSummary {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  fiscalYear   Int      // 2027 for FY27
  quarter      Int      // 1-4
  callDate     DateTime?
  exchange     String   // "BSE" | "NSE"
  filingUrl    String   // the exchange attachment, shown as the source link
  filingDate   DateTime
  pdfSha256    String   // re-summarise only when the filing changes
  tone         String   // positive | cautiously positive | neutral | cautious | negative
  toneNote     String
  // Guidance / demand / risks / initiatives / key Q&A, each item with { quote, page } -
  // the shape the prototype writes (SUMMARY_SCHEMA in scripts/concall-prototype.ts).
  summary      Json
  checksPassed Int      // items whose quote and numbers were found in the PDF text
  checksTotal  Int
  model        String   // e.g. claude-opus-5-5
  promptVer    String   // bump when SUMMARY_SYSTEM / schema change
  inputTokens  Int
  outputTokens Int
  costUsd      Decimal
  status       String   @default("ok") // ok | scanned | missing | failed
  guidance     ConcallGuidance[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([companyId, fiscalYear, quarter])
  @@index([fiscalYear, quarter])
}

// Guidance pulled out as rows so it can be checked against FinancialSnapshot when the year's
// figures land (guidance vs delivery), and compared across an industry.
model ConcallGuidance {
  id         String         @id @default(cuid())
  summaryId  String
  summary    ConcallSummary @relation(fields: [summaryId], references: [id], onDelete: Cascade)
  metric     String         // revenue | margin | capex | order book | other
  targetYear Int?           // the FY the guidance is for, when stated
  low        Decimal?       // parsed range (%, or Rs crore), null when only directional
  high       Decimal?
  unit       String?        // "%", "Rs cr", "$ mn"
  statement  String
  quote      String
  page       Int
  delivered  Decimal?       // filled from FinancialSnapshot once the year closes
  verdict    String?        // met | missed | beat | pending

  @@index([metric, targetYear])
}

// Industry roll-ups are cheap to regenerate from the company rows; store them so pages load fast.
model ConcallRollup {
  id          String   @id @default(cuid())
  sectorSlug  String   // sector-content slug (pharma, defenceproc, ...)
  fiscalYear  Int
  quarter     Int
  rollup      Json     // headline, demand_themes, guidance_comparison, shared_risks, divergences, tone_mix
  companies   String[] // tickers that fed it
  model       String
  costUsd     Decimal
  createdAt   DateTime @default(now())

  @@unique([sectorSlug, fiscalYear, quarter])
}
\`\`\`

\`Company\` gains \`bseCode String?\` (BSE scrip code) and \`concalls ConcallSummary[]\`. The scrip code is
what the BSE announcements endpoint keys on; NSE uses the ticker we already store.`;

function writeReport(results: Result[], rollups: Map<string, { rollup?: Rollup; usage?: Usage; failure?: string }>) {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const summarised = results.filter((r) => r.summary);
  const checks = summarised.flatMap((r) => r.checks ?? []);
  const okChecks = checks.filter((c) => c.quoteFound === "page" && !c.missingNumbers.length).length;
  const L: string[] = [
    "# Earnings-call summaries: prototype",
    "",
    `Generated ${now} UTC by \`npx tsx scripts/concall-prototype.ts\`${NO_LLM ? " --no-llm" : ""}. Local, read-only: no database writes, nothing deployed.`,
    `Model: \`${MODEL}\` (adaptive thinking, effort medium, structured JSON output). Prices used: $${PRICE.input} / $${PRICE.output} per million input / output tokens.`,
    "",
    "## Result",
    "",
    `- Companies: ${results.length} (${[...new Set(results.map((r) => r.t.industry))].join(", ")}); summarised: ${summarised.length}.`,
    checks.length
      ? `- Checks: ${okChecks} of ${checks.length} items had their quote on the cited page and every number present in the PDF text.`
      : "- Checks: none run (no summaries).",
    "",
    "| Ticker | Industry | Filing found via | Pages | Status | Input tok | Output tok | Cost | Time |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of results) {
    const via = r.source ? r.source.exchange : "-";
    const status = r.failure ? `❌ ${esc(r.failure).slice(0, 70)}` : r.summary ? "✅ summarised" : "text only";
    const u = r.usage;
    L.push(
      `| ${r.t.ticker} | ${r.t.industry} | ${via} | ${r.pages ?? "-"} | ${status} | ${u ? (u.input + u.cacheWrite + u.cacheRead).toLocaleString("en-US") : "-"} | ${u ? u.output.toLocaleString("en-US") : "-"} | ${u ? money(cost(u)) : "-"} | ${r.seconds ? `${r.seconds.toFixed(0)}s` : "-"} |`,
    );
  }
  const companyUsage = summarised.reduce((a, r) => addUsage(a, r.usage!), ZERO);
  const rollupUsage = [...rollups.values()].reduce((a, x) => (x.usage ? addUsage(a, x.usage) : a), ZERO);
  if (summarised.length) {
    const per = cost(companyUsage) / summarised.length;
    L.push(
      "",
      `Cost per transcript: **${money(per)}** on average (${summarised.length} transcripts, ${money(cost(companyUsage))}). Industry roll-ups: ${money(cost(rollupUsage))} for ${[...rollups.values()].filter((x) => x.rollup).length}.`,
      `At ~${TRACKED_COUNT} tracked companies x 4 calls a year that is about ${money(per * TRACKED_COUNT * 4)} a year before batch (-50%) or a cheaper model.`,
    );
  }
  L.push("", "## Industry roll-ups", "");
  for (const [ind, x] of rollups) L.push(rollupSection(ind, x));
  L.push("## Company summaries", "", "Each item carries the quote it rests on and its page. ⚠️ marks items the text check could not confirm.", "");
  for (const r of results) L.push(companySection(r));

  L.push("## How filings were fetched, and what failed", "");
  for (const r of results) {
    L.push(`- **${r.t.ticker}**: ${r.attempts.map((a) => `${a.step} ${a.ok ? "✓" : "✗"} (${esc(a.detail)})`).join(" → ")}`);
  }
  const fails = results.filter((r) => r.failure);
  L.push("", "Failure cases seen:", "");
  if (!fails.length) L.push("- None in this run.");
  for (const r of fails) L.push(`- ${r.t.ticker}: ${r.failure}`);
  const flagged = checks.filter((c) => c.quoteFound !== "page" || c.missingNumbers.length);
  if (flagged.length) {
    L.push("", "Items the check flagged (kept in the summaries above, marked ⚠️):", "");
    for (const c of flagged.slice(0, 30)) {
      const owner = summarised.find((r) => r.checks?.includes(c))!.t.ticker;
      L.push(`- ${owner} / ${c.section} p.${c.page}: quote ${c.quoteFound}${c.missingNumbers.length ? `; numbers not in text: ${c.missingNumbers.join(", ")}` : ""} — "${esc(c.text).slice(0, 110)}"`);
    }
  }
  L.push("", "## Proposed storage", "", PRISMA_PROPOSAL, "");
  L.push(NOTES);
  fs.writeFileSync(REPORT, L.join("\n"));
  console.log(`\nReport: ${path.relative(ROOT, REPORT)}`);
}

// Rough size of the production run (tracked = true in Company, 2026-10-26).
const TRACKED_COUNT = 306;

const NOTES = `## Notes for the production version

- **Getting filings.** BSE's \`api.bseindia.com\` announcements JSON and NSE's \`/api/corporate-announcements\`
  both sit behind Akamai bot protection and refuse plain scripted requests (the run above logs the
  response). Getting around that with browser imitation is not something we should build on. Options, in
  order of preference: a licensed data feed (BSE/NSE corporate-announcement feeds, or a vendor that
  redistributes filings); the companies' own investor-relations pages (most large caps post the
  transcript PDF there too, and IR pages do not block); or a manually triggered fetch per quarter.
  The SEBI LODR filing deadline (transcript within 5 working days of the call) gives a predictable
  window to look in.
- **Scrip codes.** \`Company\` has no BSE scrip code yet; the five used here are hard-coded in the script.
  Adding \`bseCode\` needs a one-off mapping (BSE's scrip master CSV), which is a DB write: ask first.
- **Scanned PDFs.** Detected by characters per page (< ${MIN_CHARS_PER_PAGE}); those need OCR or Claude's own PDF input
  (send the PDF as a document block, which reads page images, at a higher token cost per page).
- **Presentations vs transcripts.** Some companies file the investor presentation under a similar
  heading; the script flags PDFs with no Q&A markers.
- **Guidance vs delivery.** Guidance items are kept with metric + period so they can be lined up
  against \`FinancialSnapshot\` revenue once the year closes (ConcallGuidance.delivered / verdict).
- **Cost levers.** Batch API halves the price and suits a nightly job; transcripts are 20-40 pages
  so a call is roughly 15-30k input tokens.
`;

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!NO_LLM && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn("ANTHROPIC_API_KEY is not set: the SDK will try an `ant auth login` profile, and summaries will fail without one.");
  }
  const results: Result[] = [];
  for (const t of TARGETS) {
    process.stdout.write(`${t.ticker.padEnd(10)} `);
    const r = await runCompany(t);
    results.push(r);
    const u = r.usage;
    console.log(
      r.failure
        ? `✗ ${r.failure}`
        : `✓ ${r.source?.exchange} ${r.pages}p ${r.chars} chars${u ? `, ${u.input + u.cacheWrite + u.cacheRead} in / ${u.output} out, ${money(cost(u))}` : ""}` +
            (r.checks ? `, checks ${r.checks.filter((c) => c.quoteFound === "page" && !c.missingNumbers.length).length}/${r.checks.length}` : ""),
    );
    console.log(`           ${r.attempts.map((a) => `${a.step}: ${a.ok ? "ok" : a.detail}`).join(" | ")}`);
    await sleep(PAUSE_MS);
  }
  const rollups = new Map<string, { rollup?: Rollup; usage?: Usage; failure?: string }>();
  for (const ind of [...new Set(TARGETS.map((t) => t.industry))]) {
    const x = NO_LLM ? { failure: "skipped (--no-llm)" } : await runRollup(ind, results.filter((r) => r.t.industry === ind));
    rollups.set(ind, x);
    console.log(`roll-up ${ind}: ${x.failure ?? "ok"}`);
  }
  writeReport(results, rollups);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
