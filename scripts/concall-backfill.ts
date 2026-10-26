// The earnings-call history by hand: every transcript a tracked company filed on BSE/NSE since FY22
// (src/lib/concalls), summarised through the Message Batches API and stored. The site keeps it current
// afterwards with the daily cron (src/app/api/concalls/refresh). Each stage is resumable: what it has
// done is kept under .concall-cache/backfill/ (gitignored) and a re-run carries on from there.
//
//   npx tsx scripts/concall-backfill.ts companies                      list tracked tickers (read-only query)
//   npx tsx scripts/concall-backfill.ts discover [--tickers=A,B] [--limit=N] [--since=2021-04-01] [--refresh]
//        BSE (one fiscal year per request) and NSE announcements -> manifest/<TICKER>.json
//   npx tsx scripts/concall-backfill.ts fetch [--tickers=..] [--limit=N] [--retry]
//        download each transcript (cached by sha256 in .concall-cache/pdf/), extract text, judge it;
//        a cover letter / scan / failed download tries the other exchange's copy; --retry redoes non-ok ones
//   npx tsx scripts/concall-backfill.ts prepare [--tickers=..]
//        write the batch request JSONL (requests-N.jsonl) and a token / cost estimate (estimate.json)
//   npx tsx scripts/concall-backfill.ts report [--tickers=..]
//        coverage per company per fiscal year, missing quarters, duplicates, scans, failures
//   npx tsx scripts/concall-backfill.ts submit --yes        SPENDS MONEY: sends the prepared batches
//   npx tsx scripts/concall-backfill.ts collect             fetches ended batches' results, checks them
//   npx tsx scripts/concall-backfill.ts apply --yes         WRITES THE DATABASE (needs the concall migration)
//
// The worktree has no .env: run with DOTENV_CONFIG_PATH="../../../.env" for the stages that read the
// company table (companies, discover without --tickers, apply). discover/fetch ask BSE and NSE under
// our own name, ~one request every 2 s (src/lib/concalls/fetch-pdf.ts); a full discover over ~306
// companies is ~6 requests each, so about an hour. BSE scrip codes come from
// .concall-cache/backfill/bse-codes.json, filled from BSE's own quote search when missing (until
// Company.bseCode is populated by scripts/refresh-quarterly.ts).
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { discoverCompany, HISTORY_FROM, lookupBseCode, type Candidate, type CompanyDiscovery } from "../src/lib/concalls/discover";
import { callKindFromText, fetchTranscript, hasResultsMarkers, quarterFromText, textStats } from "../src/lib/concalls/extract";
import { backfillCustomId, buildRequest, MAX_TOKENS, PROMPT_VERSION, SUMMARY_SCHEMA, SUMMARY_SYSTEM, type BatchRequest } from "../src/lib/concalls/prompt";
import { batchOutcomes, batchState, splitBatches, submitBatch, type BatchOutcome } from "../src/lib/concalls/batch";
import { checkCounts, checkSummary } from "../src/lib/concalls/validate";
import { storeSummary } from "../src/lib/concalls/store";
import { quarterLabel, type FiscalQuarter, type ItemCheck } from "../src/lib/concalls/types";
import { databaseLabel, scriptPrisma } from "./db";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".concall-cache");
const DIR = path.join(CACHE, "backfill");
const MANIFEST = path.join(DIR, "manifest");
const PDF_DIR = path.join(CACHE, "pdf");
const RESULTS = path.join(DIR, "results");
const CODES_FILE = path.join(DIR, "bse-codes.json");
const NAMES_FILE = path.join(DIR, "names.json");
const BATCHES_FILE = path.join(DIR, "batches.json");

// Opus 5.5 Batch API: half of $4 / $20 per million (src/lib/concalls/types.ts OPUS_PRICE).
const BATCH_PRICE = { input: 2, output: 10 };
// Output per call (answer + adaptive thinking at effort medium); the prototype's answers were ~3-4k.
const OUTPUT_TOKENS = { low: 3_000, mid: 4_000, high: 7_000 };
const TRACKED = 306;

const argv = process.argv.slice(2);
const STAGE = argv[0];
const opt = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const flag = (k: string) => argv.includes(`--${k}`);
const TICKERS = opt("tickers")?.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
const LIMIT = opt("limit") ? Number(opt("limit")) : undefined;
const SINCE = opt("since") ? new Date(`${opt("since")}T00:00:00Z`) : HISTORY_FROM;

// ------------------------------------------------------------------ Manifest

type FetchResult = {
  status: "ok" | "scanned" | "not_transcript" | "download_failed" | "failed";
  detail: string;
  url?: string;
  sha256?: string;
  pages?: number;
  chars?: number;
  /** The company-site PDF a link-only letter pointed to (the text came from there). */
  linkedUrl?: string;
  /** From the opening pages; the filing is special when this or the headline says so. */
  textCallKind?: "results" | "special";
};
type FilingEntry = Omit<Candidate, "filedAt"> & { filedAt: string; fetch?: FetchResult };
type Manifest = {
  ticker: string;
  name: string;
  bseCode: string | null;
  discoveredAt: string;
  from: string;
  to: string;
  attempts: CompanyDiscovery["attempts"];
  filings: FilingEntry[];
  duplicates: { exchange: string; exchangeId: string; url?: string; title: string; filedAt: string; keptId: string; reason: string }[];
};

const readJson = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : fallback);
const writeJson = (file: string, v: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(v, null, 2));
};
const manifestFile = (t: string) => path.join(MANIFEST, `${t}.json`);
function manifests(): Manifest[] {
  if (!fs.existsSync(MANIFEST)) return [];
  return fs
    .readdirSync(MANIFEST)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Manifest>(path.join(MANIFEST, f), null as unknown as Manifest))
    .filter((m) => !TICKERS || TICKERS.includes(m.ticker))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}
const pagesFile = (sha: string) => path.join(PDF_DIR, `${sha}.pages.json`);
const kindOf = (f: FilingEntry) => (f.callKind === "special" || f.fetch?.textCallKind === "special" ? "special" : "results");
const customIdOf = (f: { exchange: string; exchangeId: string }) => backfillCustomId(f.exchange, f.exchangeId);

// ------------------------------------------------------------------ companies

type Tracked = { ticker: string; name: string };

/** Tracked companies (read-only). Only columns that exist before the concall migration are selected. */
async function trackedCompanies(): Promise<Tracked[]> {
  const prisma = scriptPrisma();
  try {
    const rows = await prisma.company.findMany({ where: { tracked: true }, select: { ticker: true, name: true }, orderBy: { ticker: "asc" } });
    writeJson(NAMES_FILE, Object.fromEntries(rows.map((r) => [r.ticker, r.name])));
    return rows;
  } finally {
    await prisma.$disconnect();
  }
}

async function companiesStage() {
  const rows = await trackedCompanies();
  console.log(`${rows.length} tracked companies (names saved to ${path.relative(ROOT, NAMES_FILE)})`);
  console.log(rows.map((r) => r.ticker).join(","));
}

// ------------------------------------------------------------------ discover

async function discoverStage() {
  let names = readJson<Record<string, string>>(NAMES_FILE, {});
  let tickers = TICKERS;
  if (!tickers) {
    const rows = await trackedCompanies();
    names = Object.fromEntries(rows.map((r) => [r.ticker, r.name]));
    tickers = rows.map((r) => r.ticker);
  }
  if (LIMIT) tickers = tickers.slice(0, LIMIT);
  const codes = readJson<Record<string, string | null>>(CODES_FILE, {});
  const to = new Date();
  let n = 0;
  for (const ticker of tickers) {
    n++;
    if (fs.existsSync(manifestFile(ticker)) && !flag("refresh")) {
      console.log(`${ticker.padEnd(12)} manifest exists (--refresh to rediscover)`);
      continue;
    }
    if (!(ticker in codes)) {
      codes[ticker] = await lookupBseCode(ticker);
      writeJson(CODES_FILE, codes);
    }
    const d = await discoverCompany({ ticker, bseCode: codes[ticker] ?? null }, SINCE, to);
    const m: Manifest = {
      ticker,
      name: names[ticker] ?? ticker,
      bseCode: codes[ticker] ?? null,
      discoveredAt: new Date().toISOString(),
      from: SINCE.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      attempts: d.attempts,
      filings: d.candidates.map((c) => ({ ...c, filedAt: c.filedAt.toISOString() })),
      duplicates: d.duplicates.map((x) => ({ exchange: x.filing.exchange, exchangeId: x.filing.exchangeId, url: x.filing.url, title: x.filing.title, filedAt: x.filing.filedAt.toISOString(), keptId: x.keptId, reason: x.reason })),
    };
    // A rediscovery keeps what fetch already learnt about filings it finds again.
    const old = readJson<Manifest | null>(manifestFile(ticker), null);
    if (old) {
      const prev = new Map(old.filings.map((f) => [`${f.exchange}:${f.exchangeId}`, f.fetch]));
      for (const f of m.filings) f.fetch ??= prev.get(`${f.exchange}:${f.exchangeId}`);
    }
    writeJson(manifestFile(ticker), m);
    const t = m.filings.filter((f) => f.kind === "transcript").length;
    const fails = d.attempts.filter((a) => !a.ok).map((a) => `${a.step}: ${a.detail}`);
    console.log(
      `${ticker.padEnd(12)} [${n}/${tickers.length}] bse=${m.bseCode ?? "-"} transcripts=${t} other=${m.filings.length - t} dup=${m.duplicates.length}${fails.length ? `  (${fails.join("; ")})` : ""}`,
    );
  }
}

// ------------------------------------------------------------------ fetch

async function fetchStage() {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  let ms = manifests();
  if (LIMIT) ms = ms.slice(0, LIMIT);
  for (const m of ms) {
    let done = 0;
    for (const f of m.filings) {
      const again = flag("retry") && f.fetch && f.fetch.status !== "ok";
      if (f.kind !== "transcript" || (f.fetch && f.fetch.status !== "download_failed" && !again)) continue;
      f.fetch = await fetchOne(f.url);
      // A cover letter or a failed download on one exchange: the twin filed on the other exchange
      // (or a re-filed copy) often carries the full transcript (BEL 2022-11-04 on BSE is a one-page
      // letter; its NSE twin is the transcript).
      for (const alt of m.duplicates.filter((d) => d.keptId === f.exchangeId && d.url)) {
        if (f.fetch.status === "ok") break;
        const second = await fetchOne(alt.url!);
        if (second.status === "ok") f.fetch = { ...second, detail: `${second.detail} (from ${alt.exchange} ${alt.exchangeId}; ${f.exchange} copy: ${f.fetch.detail})` };
      }
      done++;
      writeJson(manifestFile(m.ticker), m);
    }
    const st = (s: FetchResult["status"]) => m.filings.filter((f) => f.fetch?.status === s).length;
    console.log(`${m.ticker.padEnd(12)} +${done} fetched; ok=${st("ok")} scanned=${st("scanned")} not_transcript=${st("not_transcript")} download_failed=${st("download_failed")} failed=${st("failed")}`);
  }
}

/** Download (PDF cached by sha256), extract and judge one filing; a link-only letter's linked PDF is followed. */
async function fetchOne(url: string): Promise<FetchResult> {
  const t = await fetchTranscript(url);
  if (!t.ok) return { status: t.kind === "unreadable" ? "failed" : "download_failed", detail: `${t.kind}: ${t.detail}` };
  fs.writeFileSync(path.join(PDF_DIR, `${t.sha256}.pdf`), t.buf);
  writeJson(pagesFile(t.sha256), t.pages);
  const s = textStats(t.pages);
  const v = t.verdict;
  return {
    status: v.status,
    // fetchTranscript's detail already carries the reason when it tried a link.
    detail: v.status === "ok" || /link/.test(t.detail) ? t.detail : v.reason,
    url: t.linkedFrom ?? t.url,
    ...(t.linkedFrom ? { linkedUrl: t.url } : {}),
    sha256: t.sha256,
    pages: s.pages,
    chars: s.chars,
    textCallKind: callKindFromText(t.pages),
  };
}

// ------------------------------------------------------------------ which filings get summarised

type Extra = { f: FilingEntry; why: "same_pdf" | "same_quarter"; keptId: string };

/**
 * The filings worth a summary, after what only the PDFs show: the same PDF filed twice (same
 * sha256), and several transcripts for one results quarter (by the quarter the opening names,
 * else the headline/date guess) where headlines could not tell them apart (TVS Motor files every
 * transcript as "Compliance under Regulation 30" and holds broker-hosted meets too). For one
 * quarter the filing whose opening reads like a results call wins, then the latest (a re-file).
 * Special calls are always kept.
 */
function selectCalls(m: Manifest): { calls: (FilingEntry & { quarter: FiscalQuarter })[]; extras: Extra[] } {
  const extras: Extra[] = [];
  const ok = m.filings.filter((f) => f.kind === "transcript" && f.fetch?.status === "ok" && f.fetch.sha256);
  const seen = new Map<string, FilingEntry>();
  const unique: (FilingEntry & { quarter: FiscalQuarter; results: boolean })[] = [];
  for (const f of [...ok].sort((a, b) => b.filedAt.localeCompare(a.filedAt))) {
    const twin = seen.get(f.fetch!.sha256!);
    if (twin) {
      extras.push({ f, why: "same_pdf", keptId: twin.exchangeId });
      continue;
    }
    seen.set(f.fetch!.sha256!, f);
    const pages = readJson<string[]>(pagesFile(f.fetch!.sha256!), []);
    unique.push({ ...f, quarter: quarterFromText(pages) ?? f.guess, results: hasResultsMarkers(pages) });
  }
  const calls: (FilingEntry & { quarter: FiscalQuarter })[] = [];
  const byQuarter = new Map<number, typeof unique>();
  for (const f of unique) {
    if (kindOf(f) === "special") {
      calls.push(f);
      continue;
    }
    const k = qKey(f.quarter);
    byQuarter.set(k, [...(byQuarter.get(k) ?? []), f]);
  }
  for (const group of byQuarter.values()) {
    group.sort((a, b) => Number(b.results) - Number(a.results) || b.filedAt.localeCompare(a.filedAt));
    calls.push(group[0]);
    for (const f of group.slice(1)) extras.push({ f, why: "same_quarter", keptId: group[0].exchangeId });
  }
  return { calls: calls.sort((a, b) => a.filedAt.localeCompare(b.filedAt)), extras };
}

// ------------------------------------------------------------------ prepare

const estTokens = (chars: number) => Math.ceil(chars / 4);

function prepareStage() {
  const ms = manifests();
  const reqs: BatchRequest[] = [];
  const index: Record<string, { ticker: string; exchange: string; exchangeId: string; sha256: string; url: string; title: string; filedAt: string }> = {};
  let inputChars = 0;
  let extras = 0;
  for (const m of ms) {
    const sel = selectCalls(m);
    extras += sel.extras.length;
    for (const f of flag("all") ? m.filings.filter((x) => x.kind === "transcript" && x.fetch?.status === "ok") : sel.calls) {
      if (f.fetch?.status !== "ok" || !f.fetch.sha256) continue;
      const pages = readJson<string[]>(pagesFile(f.fetch.sha256), []);
      if (!pages.length) continue;
      const id = customIdOf(f);
      const r = buildRequest(id, { companyName: m.name, ticker: m.ticker, title: f.title, filedAt: new Date(f.filedAt) }, pages);
      reqs.push(r);
      const user = r.params.messages[0].content as string;
      inputChars += user.length;
      index[id] = { ticker: m.ticker, exchange: f.exchange, exchangeId: f.exchangeId, sha256: f.fetch.sha256, url: f.fetch.url ?? f.url, title: f.title, filedAt: f.filedAt };
    }
  }
  // Old request files go first so a smaller re-prepare leaves no stale chunk behind.
  for (const f of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) if (/^requests-\d+\.jsonl$/.test(f)) fs.rmSync(path.join(DIR, f));
  const chunks = splitBatches(reqs);
  chunks.forEach((c, i) => fs.writeFileSync(path.join(DIR, `requests-${i + 1}.jsonl`), c.map((r) => JSON.stringify(r)).join("\n") + "\n"));
  writeJson(path.join(DIR, "requests-index.json"), index);

  // Tokens: the transcript at ~4 characters a token, plus the system prompt and schema on every request.
  const fixed = estTokens(SUMMARY_SYSTEM.length + JSON.stringify(SUMMARY_SCHEMA).length) + 50;
  const calls = reqs.length;
  const input = estTokens(inputChars) + fixed * calls;
  const cost = (out: number) => (input * BATCH_PRICE.input + calls * out * BATCH_PRICE.output) / 1e6;
  const companies = ms.filter((m) => m.filings.some((f) => f.fetch?.status === "ok")).length;
  const perCo = companies ? calls / ms.length : 0;
  const perCall = (out: number) => (calls ? cost(out) / calls : 0);
  const est = {
    preparedAt: new Date().toISOString(),
    promptVersion: PROMPT_VERSION,
    companies: ms.length,
    companiesWithCalls: companies,
    calls,
    batches: chunks.map((c, i) => ({ file: `requests-${i + 1}.jsonl`, requests: c.length, bytes: Buffer.byteLength(c.map((r) => JSON.stringify(r)).join("\n")) })),
    inputTokens: input,
    inputTokensPerCall: calls ? Math.round(input / calls) : 0,
    maxTokens: MAX_TOKENS,
    costUsd: { low: cost(OUTPUT_TOKENS.low), mid: cost(OUTPUT_TOKENS.mid), high: cost(OUTPUT_TOKENS.high) },
    costPerCallUsd: { low: perCall(OUTPUT_TOKENS.low), mid: perCall(OUTPUT_TOKENS.mid), high: perCall(OUTPUT_TOKENS.high) },
    projection306: {
      callsPerCompany: Number(perCo.toFixed(2)),
      calls: Math.round(perCo * TRACKED),
      costUsd: {
        low: perCall(OUTPUT_TOKENS.low) * perCo * TRACKED,
        mid: perCall(OUTPUT_TOKENS.mid) * perCo * TRACKED,
        high: perCall(OUTPUT_TOKENS.high) * perCo * TRACKED,
      },
    },
    note: "input = transcript chars/4 + system prompt + schema; output per call low/mid/high = 3k/4k/7k tokens (answer + adaptive thinking). Batch prices $2/M in, $10/M out.",
  };
  writeJson(path.join(DIR, "estimate.json"), est);
  const usd = (n: number) => `$${n.toFixed(2)}`;
  console.log(`${extras} extra transcript(s) left out (same PDF twice, or a second transcript for one quarter; --all keeps them)`);
  console.log(`${calls} calls from ${companies}/${ms.length} companies -> ${chunks.length} batch file(s) in ${path.relative(ROOT, DIR)}`);
  console.log(`input ~${(input / 1e6).toFixed(2)}M tokens (~${est.inputTokensPerCall} a call)`);
  console.log(`cost at batch prices: ${usd(est.costUsd.low)} / ${usd(est.costUsd.mid)} / ${usd(est.costUsd.high)} (output 3k / 4k / 7k a call)`);
  console.log(
    `all ${TRACKED} companies at ${est.projection306.callsPerCompany} calls each (~${est.projection306.calls} calls): ${usd(est.projection306.costUsd.low)} / ${usd(est.projection306.costUsd.mid)} / ${usd(est.projection306.costUsd.high)}`,
  );
}

// ------------------------------------------------------------------ report

const fyLabel = (fy: number) => `FY${String(fy).slice(-2)}`;
const qKey = (q: FiscalQuarter) => q.fiscalYear * 10 + q.quarter;

function expectedQuarters(from: FiscalQuarter, through: FiscalQuarter): FiscalQuarter[] {
  const out: FiscalQuarter[] = [];
  let q = { ...from };
  while (qKey(q) <= qKey(through)) {
    out.push({ ...q });
    q = q.quarter === 4 ? { fiscalYear: q.fiscalYear + 1, quarter: 1 } : { fiscalYear: q.fiscalYear, quarter: (q.quarter + 1) as 1 | 2 | 3 | 4 };
  }
  return out;
}

function reportStage() {
  const ms = manifests();
  // Calls are due through the last quarter whose results season has ended (Q1 FY27 as of Oct 2026;
  // Q2 FY27 calls are being filed now and are reported as in season, not missing).
  const through: FiscalQuarter = { fiscalYear: 2027, quarter: 1 };
  const exp = expectedQuarters({ fiscalYear: 2022, quarter: 1 }, through);
  const fys = [2021, 2022, 2023, 2024, 2025, 2026, 2027];
  console.log(`| Ticker | BSE | ${fys.map(fyLabel).join(" | ")} | dup | not_tr | scanned | dl_fail | missing quarters |`);
  console.log(`|---|---|${fys.map(() => "---").join("|")}|---|---|---|---|---|`);
  const tot = { transcripts: 0, ok: 0, dup: 0, dupX: 0, dupRe: 0, notTr: 0, notTrFetch: 0, scanned: 0, dl: 0, failed: 0, pages: 0, chars: 0, missing: 0, q4fy21: 0, special: 0, samePdf: 0, sameQuarter: 0, calls: 0 };
  const specialList: string[] = [];
  const failKinds = new Map<string, number>();
  const discoverFails = new Map<string, number>();
  for (const m of ms) {
    const all = m.filings.filter((f) => f.kind === "transcript");
    const specials = all.filter((f) => kindOf(f) === "special");
    tot.special += specials.length;
    for (const f of specials) specialList.push(`${m.ticker} ${f.filedAt.slice(0, 10)} "${f.title.slice(0, 80)}"`);
    // Coverage counts results calls only.
    const tr = all.filter((f) => kindOf(f) === "results");
    const ok = tr.filter((f) => f.fetch?.status === "ok");
    const sel = selectCalls(m);
    tot.samePdf += sel.extras.filter((x) => x.why === "same_pdf").length;
    tot.sameQuarter += sel.extras.filter((x) => x.why === "same_quarter").length;
    const chosen = sel.calls.filter((f) => kindOf(f) === "results");
    // Coverage: the calls chosen for summaries, plus filings not fetched (yet) by their guess.
    const counted = [...chosen.map((f) => f.quarter), ...tr.filter((f) => !f.fetch).map((f) => f.guess)];
    const byFy = new Map<number, number>();
    for (const q of counted) byFy.set(q.fiscalYear, (byFy.get(q.fiscalYear) ?? 0) + 1);
    const have = new Set(counted.map(qKey));
    const missing = exp.filter((q) => !have.has(qKey(q))).map(quarterLabel);
    const st = (s: string) => tr.filter((f) => f.fetch?.status === s).length;
    console.log(
      `| ${m.ticker} | ${m.bseCode ?? "-"} | ${fys.map((y) => byFy.get(y) ?? 0).join(" | ")} | ${m.duplicates.length} | ${m.filings.length - all.length}+${st("not_transcript")} | ${st("scanned")} | ${st("download_failed")} | ${missing.join(", ") || "-"} |`,
    );
    tot.transcripts += tr.length;
    tot.ok += ok.length;
    tot.dup += m.duplicates.length;
    tot.dupX += m.duplicates.filter((d) => d.reason === "other_exchange").length;
    tot.dupRe += m.duplicates.filter((d) => d.reason === "refiled").length;
    tot.notTr += m.filings.length - all.length;
    tot.notTrFetch += st("not_transcript");
    tot.scanned += st("scanned");
    tot.dl += st("download_failed");
    tot.failed += st("failed");
    tot.missing += missing.length;
    tot.q4fy21 += counted.filter((q) => q.fiscalYear === 2021).length;
    tot.calls += sel.calls.length;
    for (const f of ok) {
      tot.pages += f.fetch!.pages ?? 0;
      tot.chars += f.fetch!.chars ?? 0;
    }
    for (const f of tr) if (f.fetch && f.fetch.status !== "ok") failKinds.set(`${f.fetch.status}: ${f.fetch.detail.replace(/\d+/g, "N").slice(0, 70)}`, (failKinds.get(`${f.fetch.status}: ${f.fetch.detail.replace(/\d+/g, "N").slice(0, 70)}`) ?? 0) + 1);
    for (const a of m.attempts) if (!a.ok) discoverFails.set(`${a.step.replace(/\d{8}-\d{8}/, "window")}: ${a.detail}`, (discoverFails.get(`${a.step.replace(/\d{8}-\d{8}/, "window")}: ${a.detail}`) ?? 0) + 1);
  }
  console.log("");
  console.log(`companies ${ms.length}; transcript filings ${tot.transcripts} (of which Q4 FY21 calls ${tot.q4fy21}); text ok ${tot.ok}`);
  console.log(`after reading the PDFs: ${tot.samePdf} same PDF filed twice, ${tot.sameQuarter} extra transcripts for an already-covered quarter; ${tot.calls} calls to summarise`);
  console.log(`duplicates removed ${tot.dup} (other exchange ${tot.dupX}, re-filed ${tot.dupRe}); not_transcript by headline ${tot.notTr}, by text ${tot.notTrFetch}`);
  console.log(`scanned ${tot.scanned}; download failed ${tot.dl}; unreadable ${tot.failed}; missing quarters Q1 FY22-Q1 FY27: ${tot.missing} over ${ms.length} companies (${exp.length} each)`);
  if (tot.ok) console.log(`average ${(tot.pages / tot.ok).toFixed(1)} pages, ${Math.round(tot.chars / tot.ok).toLocaleString("en-US")} characters per transcript`);
  console.log(`special (non-results) calls kept apart: ${tot.special}${specialList.length ? `\n  ${specialList.join("\n  ")}` : ""}`);
  if (failKinds.size) console.log(`fetch failures: ${[...failKinds].map(([k, n]) => `${n} x ${k}`).join("; ")}`);
  if (discoverFails.size) console.log(`discovery failures: ${[...discoverFails].map(([k, n]) => `${n} x ${k}`).join("; ")}`);
}

// ------------------------------------------------------------------ submit / collect / apply

type BatchLog = { file: string; batchId: string; requests: number; submittedAt: string; collectedAt?: string }[];

async function submitStage() {
  if (!flag("yes")) throw new Error("submit sends the prepared batches to the Batch API and spends money: re-run with --yes once approved");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const log = readJson<BatchLog>(BATCHES_FILE, []);
  const files = fs.readdirSync(DIR).filter((f) => /^requests-\d+\.jsonl$/.test(f)).sort();
  for (const file of files) {
    if (log.some((b) => b.file === file)) {
      console.log(`${file}: already submitted`);
      continue;
    }
    const reqs = fs.readFileSync(path.join(DIR, file), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as BatchRequest);
    const batchId = await submitBatch(reqs);
    log.push({ file, batchId, requests: reqs.length, submittedAt: new Date().toISOString() });
    writeJson(BATCHES_FILE, log);
    console.log(`${file}: batch ${batchId} (${reqs.length} requests)`);
  }
}

type StoredResult = { customId: string; outcome: BatchOutcome; checks?: ItemCheck[]; pages?: number; sha256?: string };

async function collectStage() {
  const log = readJson<BatchLog>(BATCHES_FILE, []);
  const index = readJson<Record<string, { sha256: string }>>(path.join(DIR, "requests-index.json"), {});
  for (const b of log) {
    if (b.collectedAt) continue;
    const s = await batchState(b.batchId);
    if (!s.ended) {
      console.log(`${b.batchId}: still processing (${JSON.stringify(s.counts)})`);
      continue;
    }
    let ok = 0;
    let bad = 0;
    for await (const out of batchOutcomes(b.batchId)) {
      const r: StoredResult = { customId: out.customId, outcome: out };
      const sha = index[out.customId]?.sha256;
      if (out.ok && sha) {
        // Locally the cached text is the PDF's (keyed by its sha256), so no second download here.
        const pages = readJson<string[]>(pagesFile(sha), []);
        r.checks = checkSummary(out.summary, pages);
        r.pages = pages.length;
        r.sha256 = sha;
        ok++;
      } else bad++;
      writeJson(path.join(RESULTS, `${out.customId}.json`), r);
    }
    b.collectedAt = new Date().toISOString();
    writeJson(BATCHES_FILE, log);
    console.log(`${b.batchId}: ${ok} summaries, ${bad} failed`);
  }
}

async function applyStage() {
  if (!flag("yes")) throw new Error("apply writes ConcallFiling / ConcallSummary / ConcallGuidance rows: re-run with --yes once approved (and the migration applied)");
  const prisma = scriptPrisma();
  console.log(`writing to ${databaseLabel()}`);
  try {
    const companies = new Map((await prisma.company.findMany({ where: { tracked: true }, select: { id: true, ticker: true } })).map((c) => [c.ticker, c.id]));
    let filings = 0;
    let stored = 0;
    let failed = 0;
    for (const m of manifests()) {
      const companyId = companies.get(m.ticker);
      if (!companyId) {
        console.log(`${m.ticker}: not a tracked company, skipped`);
        continue;
      }
      for (const f of m.filings) {
        const res = readJson<StoredResult | null>(path.join(RESULTS, `${customIdOf(f)}.json`), null);
        const status =
          f.kind === "not_transcript"
            ? "not_transcript"
            : res
              ? res.outcome.ok
                ? "batched"
                : "failed"
              : f.fetch?.status === "ok"
                ? "fetched"
                : f.fetch?.status ?? "found";
        const error = f.kind === "not_transcript" ? f.reason ?? null : res && !res.outcome.ok ? res.outcome.error : f.fetch && f.fetch.status !== "ok" ? f.fetch.detail : null;
        const data = {
          companyId,
          exchange: f.exchange,
          exchangeId: f.exchangeId,
          url: f.fetch?.url ?? f.url,
          title: f.title.slice(0, 500),
          filedAt: new Date(f.filedAt),
          status,
          error,
          pdfSha256: f.fetch?.sha256 ?? null,
          pages: f.fetch?.pages ?? null,
        };
        const row = await prisma.concallFiling.upsert({
          where: { exchange_exchangeId: { exchange: f.exchange, exchangeId: f.exchangeId } },
          create: data,
          // A filing the daily job has already summarised keeps its state.
          update: status === "batched" ? data : { url: data.url, title: data.title },
          select: { id: true, companyId: true, filedAt: true, status: true },
        });
        filings++;
        if (res?.outcome.ok && res.checks) {
          await storeSummary(prisma, {
            filing: row,
            callKind: kindOf(f),
            summary: res.outcome.summary,
            checks: res.checks,
            usage: res.outcome.usage,
            batch: true,
            pages: res.pages,
            pdfSha256: res.sha256,
          });
          stored++;
          const c = checkCounts(res.checks);
          if (c.checksTotal && c.checksPassed / c.checksTotal < 0.7) console.log(`  ${m.ticker} ${customIdOf(f)}: only ${c.checksPassed}/${c.checksTotal} items checked out`);
        } else if (status === "failed") failed++;
      }
      console.log(`${m.ticker.padEnd(12)} done`);
    }
    console.log(`${filings} filings written, ${stored} summaries stored, ${failed} failed`);
  } finally {
    await prisma.$disconnect();
  }
}

// ------------------------------------------------------------------

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  switch (STAGE) {
    case "companies":
      return companiesStage();
    case "discover":
      return discoverStage();
    case "fetch":
      return fetchStage();
    case "prepare":
      return prepareStage();
    case "report":
      return reportStage();
    case "submit":
      return submitStage();
    case "collect":
      return collectStage();
    case "apply":
      return applyStage();
    default:
      console.log("usage: npx tsx scripts/concall-backfill.ts <companies|discover|fetch|prepare|report|submit|collect|apply> [--tickers=A,B] [--limit=N] [--since=YYYY-MM-DD]");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
