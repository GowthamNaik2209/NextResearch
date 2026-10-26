// The earnings-call layers built on top of the stored summaries, by hand: the guidance track record
// (src/lib/concalls/track-record.ts), the per-company digests (digest.ts: last year, since FY22)
// and the industry roll-ups per quarter (rollup.ts). The daily concall job runs the same functions
// for the companies that got a new call; this script is for the backfill and for re-running after
// a rule or prompt change.
//
//   npx tsx scripts/concall-track-record.ts                               dry run, every tracked company + sector
//   npx tsx scripts/concall-track-record.ts --tickers=SUNPHARMA,CIPLA     just these companies (no roll-ups)
//   npx tsx scripts/concall-track-record.ts --sectors=pharma --quarter=Q2FY27   one sector's roll-up for a quarter
//   npx tsx scripts/concall-track-record.ts --steps=track                 only the track record (no Claude calls)
//   npx tsx scripts/concall-track-record.ts --apply                       write (digests / roll-ups call Claude: costs money)
//   npx tsx scripts/concall-track-record.ts --apply --force               rebuild digests / roll-ups even when up to date
//
// Dry run (the default) computes the track record and prints it, and builds every digest / roll-up
// prompt that is due without sending it, with a rough cost estimate: nothing is written and
// nothing is spent. --apply writes the verdicts and sends the due prompts (ANTHROPIC_API_KEY).
// Writes go to DATABASE_URL (.env); the run prints which database first.
// The default quarter for roll-ups is the latest quarter any summary covers, and the one before it
// (calls for a quarter keep landing for ~6 weeks after the next one starts).
import { checkCompanyGuidance } from "../src/lib/concalls/track-record";
import { refreshDigest } from "../src/lib/concalls/digest";
import { refreshRollup, rollupSectorSlugs } from "../src/lib/concalls/rollup";
import { OPUS_PRICE, quarterLabel, type DigestScope, type FiscalQuarter } from "../src/lib/concalls/types";
import { databaseLabel, scriptPrisma } from "./db";

const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const list = (name: string) => opt(name)?.split(",").map((s) => s.trim()).filter(Boolean);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");
const TICKERS = list("tickers");
const SECTORS = list("sectors");
const STEPS = new Set(list("steps") ?? ["track", "digest", "rollup"]);
const QUARTER = opt("quarter");
const prisma = scriptPrisma();

// A dry-run prompt is priced at ~4 characters a token plus ~3k output tokens (thinking + JSON).
const estimate = (chars: number) => ((chars / 4) * OPUS_PRICE.input + 3000 * OPUS_PRICE.output) / 1e6;
const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));

function parseQuarter(s: string): FiscalQuarter {
  const m = /^Q([1-4])\s*FY\s*(\d{2}|\d{4})$/i.exec(s.replace(/[\s-]/g, ""));
  if (!m) throw new Error(`--quarter=${s}: expected e.g. Q2FY27`);
  const y = Number(m[2]);
  return { fiscalYear: y < 100 ? 2000 + y : y, quarter: Number(m[1]) as FiscalQuarter["quarter"] };
}

async function companies() {
  return prisma.company.findMany({
    where: TICKERS ? { ticker: { in: TICKERS } } : { tracked: true, concalls: { some: {} } },
    select: { id: true, ticker: true },
    orderBy: { ticker: "asc" },
  });
}

async function trackRecord(cs: { id: string; ticker: string }[]) {
  console.log(`\n== Track record (${cs.length} companies)${APPLY ? "" : " — dry run"}`);
  const totals: Record<string, number> = {};
  let changed = 0;
  for (const c of cs) {
    const rows = await checkCompanyGuidance(prisma, c.id, { apply: APPLY });
    if (!rows.length) continue;
    console.log(`\n${c.ticker}`);
    for (const r of rows) {
      totals[r.verdict] = (totals[r.verdict] ?? 0) + 1;
      if (r.changed) changed++;
      console.log(`  ${pad(r.verdict, 13)} ${pad(r.metric, 15)} ${pad(r.period, 10)} ${pad(r.statement, 60)} ${r.actualNote}`);
    }
  }
  console.log(`\n${Object.entries(totals).map(([v, n]) => `${v} ${n}`).join(", ") || "no guidance rows"}; ${changed} row(s) ${APPLY ? "updated" : "would change"}`);
}

async function digests(cs: { id: string; ticker: string }[]) {
  console.log(`\n== Digests${APPLY ? "" : " — dry run"}`);
  let spent = 0;
  let est = 0;
  for (const c of cs)
    for (const scope of ["year", "multi_year"] as DigestScope[]) {
      try {
        const r = await refreshDigest(prisma, c.id, scope, { apply: APPLY, force: FORCE });
        if (r.status === "written") spent += r.costUsd;
        if (r.status === "dry_run") est += estimate(r.promptChars);
        const detail =
          r.status === "skipped" ? r.reason : r.status === "dry_run" ? `${r.calls} calls, ${r.promptChars} chars, ~$${estimate(r.promptChars).toFixed(3)}` : `${r.calls} calls, $${r.costUsd.toFixed(3)}`;
        console.log(`  ${pad(c.ticker, 12)} ${pad(scope, 10)} ${pad(r.status, 8)} ${detail}`);
      } catch (e) {
        console.log(`  ${pad(c.ticker, 12)} ${pad(scope, 10)} FAILED   ${String(e).slice(0, 160)}`);
      }
    }
  console.log(APPLY ? `spent $${spent.toFixed(2)}` : `would spend ~$${est.toFixed(2)}`);
}

async function rollups() {
  let quarters: FiscalQuarter[];
  if (QUARTER) quarters = [parseQuarter(QUARTER)];
  else {
    const latest = await prisma.concallSummary.findFirst({ orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }], select: { fiscalYear: true, quarter: true } });
    if (!latest) return console.log("\n== Roll-ups: no summaries on file");
    const q = { fiscalYear: latest.fiscalYear, quarter: latest.quarter as FiscalQuarter["quarter"] };
    const prev: FiscalQuarter = q.quarter === 1 ? { fiscalYear: q.fiscalYear - 1, quarter: 4 } : { fiscalYear: q.fiscalYear, quarter: (q.quarter - 1) as FiscalQuarter["quarter"] };
    quarters = [prev, q];
  }
  const sectors = SECTORS ?? rollupSectorSlugs();
  console.log(`\n== Roll-ups: ${sectors.length} sectors x ${quarters.map(quarterLabel).join(", ")}${APPLY ? "" : " — dry run"}`);
  let spent = 0;
  let est = 0;
  for (const slug of sectors)
    for (const q of quarters) {
      try {
        const r = await refreshRollup(prisma, slug, q.fiscalYear, q.quarter, { apply: APPLY, force: FORCE });
        if (r.status === "written") spent += r.costUsd;
        if (r.status === "dry_run") est += estimate(r.promptChars);
        const detail =
          r.status === "skipped" ? r.reason : r.status === "dry_run" ? `${r.companies.join(",")} (${r.promptChars} chars, ~$${estimate(r.promptChars).toFixed(3)})` : `${r.companies.length} companies, $${r.costUsd.toFixed(3)}`;
        console.log(`  ${pad(slug, 16)} ${pad(quarterLabel(q), 9)} ${pad(r.status, 8)} ${detail}`);
      } catch (e) {
        console.log(`  ${pad(slug, 16)} ${pad(quarterLabel(q), 9)} FAILED   ${String(e).slice(0, 160)}`);
      }
    }
  console.log(APPLY ? `spent $${spent.toFixed(2)}` : `would spend ~$${est.toFixed(2)}`);
}

async function main() {
  console.log(`database: ${databaseLabel()}${APPLY ? "  (--apply: writing)" : "  (dry run: no writes, no Claude calls)"}`);
  const cs = STEPS.has("track") || STEPS.has("digest") ? await companies() : [];
  if (STEPS.has("track")) await trackRecord(cs);
  if (STEPS.has("digest")) await digests(cs);
  // Roll-ups run for sectors; a --tickers run is about those companies only.
  if (STEPS.has("rollup") && (!TICKERS || SECTORS)) await rollups();
  if (!APPLY) console.log("\nDry run. Add --apply to write (digests and roll-ups then call Claude).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
