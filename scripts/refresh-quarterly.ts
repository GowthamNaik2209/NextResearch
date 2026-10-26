// Quarterly results (revenue, operating profit, OPM %, net profit, EPS per fiscal quarter) and BSE
// scrip codes for every tracked company, from Screener.in (src/lib/financials/quarterly.ts), by hand.
// The concall daily job keeps them current company by company; this script is the first fill and the
// check. Screener shows the latest 13 quarters, so a first fill reaches back about three years.
//
//   npx tsx scripts/refresh-quarterly.ts                       dry run: fetch, write .concall-cache/quarterly/<TICKER>.json
//   npx tsx scripts/refresh-quarterly.ts --tickers HAL,BEL      just these
//   npx tsx scripts/refresh-quarterly.ts --limit 20             the first 20 tracked companies (by ticker)
//   npx tsx scripts/refresh-quarterly.ts --resume               skip companies already cached in the last day
//   npx tsx scripts/refresh-quarterly.ts --apply                upsert QuarterlyResult rows and fill Company.bseCode
//
// The dry run only reads the database (the tracked company list) and writes nothing to it; the cache
// folder is gitignored, and _summary.json there holds the coverage (quarters per company, earliest
// quarter, BSE code found, failures). --apply writes to DATABASE_URL (.env; the run prints which
// database first) and needs the QuarterlyResult table and Company.bseCode column (migration
// 20261026120000_concalls_and_quarterly). Run from a worktree with DOTENV_CONFIG_PATH="../../../.env".
//
// Polite to Screener: one company at a time, a few seconds apart; when it refuses us (429/403/503)
// the run pauses and tries that company again, and gives up after three refusals in a row.
import fs from "node:fs";
import path from "node:path";
import { quarterLabel } from "../src/lib/concalls/types";
import { fetchQuarterly, refreshCompanyQuarterly, type QuarterlyFetch } from "../src/lib/financials/quarterly";
import { ScreenerBlocked } from "../src/lib/financials/refresh";
import { databaseLabel, scriptPrisma } from "./db";

const ROOT = path.resolve(__dirname, "..");
const CACHE = path.join(ROOT, ".concall-cache/quarterly");

const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const APPLY = args.includes("--apply");
const RESUME = args.includes("--resume");
const TICKERS = opt("tickers")?.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean) ?? null;
const LIMIT = opt("limit") ? Number(opt("limit")) : null;
const GAP_MS = 3000;
const BLOCK_PAUSES_MS = [60_000, 5 * 60_000, 15 * 60_000];

const prisma = scriptPrisma();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Company = { id: string; ticker: string; financialsNote: string | null; screenerSlug: string | null; bseCode?: string | null };
type Coverage = { ticker: string; ok: boolean; basis?: string; layout?: string; quarters?: number; earliest?: string; latest?: string; missing?: number; halfYearly?: boolean; bseCode?: string | null; skipped?: string[]; error?: string };

// Quarters absent between the first and the latest row (a basis that was filed only in some quarters).
const missingQuarters = (rows: QuarterlyFetch["rows"]) =>
  rows.length ? rows.at(-1)!.fiscalYear * 4 + rows.at(-1)!.quarter - (rows[0].fiscalYear * 4 + rows[0].quarter) + 1 - rows.length : 0;

function coverageOf(ticker: string, f: QuarterlyFetch): Coverage {
  return {
    ticker,
    ok: true,
    basis: f.basis,
    layout: f.layout,
    quarters: f.rows.length,
    earliest: f.rows[0] ? quarterLabel(f.rows[0]) : undefined,
    latest: f.rows.at(-1) ? quarterLabel(f.rows.at(-1)!) : undefined,
    missing: missingQuarters(f.rows) || undefined,
    halfYearly: f.halfYearly,
    bseCode: f.bseCode,
    skipped: f.skipped?.length ? f.skipped : undefined,
  };
}

const cacheFile = (ticker: string) => path.join(CACHE, `${ticker}.json`);
const freshCache = (ticker: string) => {
  try {
    return Date.now() - fs.statSync(cacheFile(ticker)).mtimeMs < 86_400_000;
  } catch {
    return false;
  }
};

async function one(c: Company): Promise<Coverage> {
  for (let blocks = 0; ; blocks++) {
    try {
      if (APPLY) {
        const r = await refreshCompanyQuarterly(prisma, { id: c.id, ticker: c.ticker, financialsNote: c.financialsNote, bseCode: c.bseCode ?? null }, { tlSlug: c.screenerSlug });
        return { ticker: c.ticker, ok: true, basis: r.basis, quarters: r.written, bseCode: r.bseCode };
      }
      const f = await fetchQuarterly(c.ticker, c.financialsNote, { tlSlug: c.screenerSlug });
      fs.writeFileSync(cacheFile(c.ticker), JSON.stringify({ ticker: c.ticker, fetchedAt: new Date().toISOString(), ...f }, null, 1));
      return coverageOf(c.ticker, f);
    } catch (e) {
      if (!(e instanceof ScreenerBlocked)) return { ticker: c.ticker, ok: false, error: e instanceof Error ? e.message : String(e) };
      if (blocks >= BLOCK_PAUSES_MS.length) throw e;
      console.warn(`  ${c.ticker}: ${e.message}, pausing ${BLOCK_PAUSES_MS[blocks] / 60_000} min`);
      await sleep(BLOCK_PAUSES_MS[blocks]);
    }
  }
}

function summarise(results: Coverage[], total: number) {
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const counts = new Map<number, number>();
  for (const r of ok) counts.set(r.quarters!, (counts.get(r.quarters!) ?? 0) + 1);
  const earliest = new Map<string, number>();
  for (const r of ok) if (r.earliest) earliest.set(r.earliest, (earliest.get(r.earliest) ?? 0) + 1);
  const summary = {
    at: new Date().toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    companies: total,
    tried: results.length,
    withQuarters: ok.length,
    quartersPerCompany: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
    earliestQuarter: Object.fromEntries([...earliest].sort((a, b) => b[1] - a[1])),
    standalone: ok.filter((r) => r.basis === "standalone").map((r) => r.ticker),
    lenders: ok.filter((r) => r.layout === "lender").map((r) => r.ticker),
    bseCodeFound: ok.filter((r) => r.bseCode).length,
    noBseCode: ok.filter((r) => !r.bseCode).map((r) => r.ticker),
    halfYearly: ok.filter((r) => r.halfYearly).map((r) => r.ticker),
    withMissingQuarters: ok.filter((r) => r.missing).map((r) => `${r.ticker}: ${r.missing} missing between ${r.earliest} and ${r.latest}`),
    oddColumns: ok.filter((r) => r.skipped).map((r) => `${r.ticker}: ${r.skipped!.join(", ")}`),
    failures: failed.map((r) => `${r.ticker}: ${r.error}`),
    companiesDetail: results,
  };
  if (!APPLY) fs.writeFileSync(path.join(CACHE, TICKERS || LIMIT ? "_summary-partial.json" : "_summary.json"), JSON.stringify(summary, null, 1));
  const { companiesDetail, ...brief } = summary;
  void companiesDetail;
  console.log(JSON.stringify(brief, null, 1));
}

async function main() {
  console.log(`database: ${databaseLabel()} (${APPLY ? "WRITES QuarterlyResult + Company.bseCode" : "read-only: tracked company list"})`);
  fs.mkdirSync(CACHE, { recursive: true });
  // bseCode is selected only with --apply: the dry run must work before the migration adds the column.
  const rows = (await prisma.company.findMany({
    where: { tracked: true, ...(TICKERS ? { ticker: { in: TICKERS } } : {}) },
    select: { id: true, ticker: true, financialsNote: true, screenerSlug: true, ...(APPLY ? { bseCode: true } : {}) },
    orderBy: { ticker: "asc" },
  })) as Company[];
  if (TICKERS) {
    const missing = TICKERS.filter((t) => !rows.some((r) => r.ticker === t));
    if (missing.length) console.warn(`not tracked: ${missing.join(", ")}`);
  }
  const companies = rows.slice(0, LIMIT ?? rows.length);
  const todo = RESUME && !APPLY ? companies.filter((c) => !freshCache(c.ticker)) : companies;
  console.log(`${companies.length} companies${todo.length < companies.length ? `, ${todo.length} not cached in the last day` : ""}`);

  const results: Coverage[] = [];
  // Resumed runs still report every company: the cached ones from their files.
  for (const c of companies.filter((c) => !todo.includes(c))) {
    const cached = JSON.parse(fs.readFileSync(cacheFile(c.ticker), "utf8")) as QuarterlyFetch;
    results.push(coverageOf(c.ticker, { ...cached, rows: cached.rows.map((r) => ({ ...r, periodEnd: new Date(r.periodEnd) })) }));
  }
  try {
    for (const [i, c] of todo.entries()) {
      const r = await one(c);
      results.push(r);
      console.log(`${String(i + 1).padStart(3)}/${todo.length} ${c.ticker.padEnd(12)} ${r.ok ? `${r.halfYearly ? "HALF-YEARLY " : ""}${r.basis?.padEnd(12)} ${String(r.quarters).padStart(2)}q ${r.quarters ? `${r.earliest} - ${r.latest}` : ""}  BSE ${r.bseCode ?? "-"}` : `FAILED: ${r.error}`}`);
      if (i < todo.length - 1) await sleep(GAP_MS);
    }
  } catch (e) {
    console.error(`stopped: ${e instanceof Error ? e.message : e} (Screener keeps refusing; re-run later with --resume)`);
  }
  summarise(results, companies.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
