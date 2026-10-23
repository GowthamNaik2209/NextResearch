// Re-snapshots every company in the company table (the database) from Screener.in in one run, by
// hand. The site normally does this by itself every NSE trading day (src/lib/financials/auto.ts and
// refresh.ts: page views and a daily cron run it in chunks and publish it in one step); this script
// is for checking the figures (dry run, history report), fixing histories and adding companies, or
// refreshing when the automatic run is stuck. The figures live only in the database: this script and
// the automatic refresh are how they change (never the content files).
//
//   npx tsx scripts/refresh-financials.ts                 dry run: what would change, and checks
//   npx tsx scripts/refresh-financials.ts --apply         write the new figures and publish them
//   npx tsx scripts/refresh-financials.ts --only DIXON,HAL     dry run for a few, with before/after
//   npx tsx scripts/refresh-financials.ts --fix-history=A,B --apply   also replace A's and B's
//       FY22-FY26 revenue/profit with Screener's (after checking the report)
//   npx tsx scripts/refresh-financials.ts --add=MAXHEALTH,BSE [--apply]   add companies we don't cover
//       yet (IPO peers, a new industry's suppliers): full history and ratios from Screener
//
// Writes go to DATABASE_URL (.env); the run prints which database first. --apply claims today's
// FinancialsRun (today in IST; it waits if an automatic chunk holds the lease), writes a KpiSnapshot
// dated today for every company it could read, then publishes the run, so the whole site moves to
// today's date together; one that could not be read keeps its older snapshot and date. The site picks
// it up within about half an hour (src/lib/financials/load.ts), no deploy. Run during market hours it
// publishes intraday prices under today's date, and the automatic refresh then skips today.
// Revenue and profit history is NOT overwritten (it is curated, with basis notes); instead the run
// reports any company whose authored years differ from Screener's by more than 3% (written to
// scripts/.refresh-financials-report.json) for a person to check, and --fix-history replaces the ones
// that are genuinely wrong (those rows change as soon as each company is written, not at publish).
// An IPO whose deck is listed by today (src/lib/ipo-content, live stage) and names a ticker we don't
// track is added in the same run, like --add (the automatic refresh does the same).
// --add dates the new company's snapshot at the published date, so it shows straight away with the
// same date as everyone else; the next refresh brings it up to date with the rest.
import fs from "node:fs";
import path from "node:path";
import { findSupplierByTicker, type SupplierFinancials } from "../src/lib/sector-content";
import { listIpos } from "../src/lib/ipo-content";
import { formatAsOf } from "../src/lib/financials/rows";
import { readCompanyTable, readPublishedCutoff } from "../src/lib/financials/query";
import { claimRun, fetchSnapshot, fiscalColumns, isStandalone, listedIposToAdd, newCompanyFigures, publishRun, releaseRun, ScreenerBlocked, withSnapshot, type Run, type Snap } from "../src/lib/financials/refresh";
import { istDay } from "../src/lib/financials/trading-day";
import { writeFinancials } from "../src/lib/financials/write";
import { databaseLabel, scriptPrisma } from "./db";

const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FIX_HISTORY = new Set(args.find((a) => a.startsWith("--fix-history="))?.split("=")[1]?.split(",") ?? []);
const REPORT = path.join(ROOT, "scripts/.refresh-financials-report.json");
const ADD = args.find((a) => a.startsWith("--add="))?.split("=")[1]?.split(",") ?? null;
const ONLY = args.find((a) => a.startsWith("--only"))?.split("=")[1]?.split(",") ?? (args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null);
// Today in IST at UTC midnight: one snapshot per company per day (re-running the same day updates it).
const SNAPSHOT_DATE = istDay(new Date());
const SNAPSHOT = formatAsOf(SNAPSHOT_DATE);
// Long enough for a full run; released (or published) at the end, and it lapses if the script dies.
const LEASE_SECONDS = 60 * 60;

const prisma = scriptPrisma();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Screener refusing us (rate limit) is a miss here, retried slowly at the end like any other.
async function snapshot(f: { ticker: string; standalone: boolean; tlSlug: string | null }): Promise<Snap | null> {
  try {
    return await fetchSnapshot(f.ticker, f.standalone, f.tlSlug);
  } catch (e) {
    if (!(e instanceof ScreenerBlocked)) throw e;
    console.warn(`  ${f.ticker}: ${e.message}, pausing 30s`);
    await sleep(30_000);
    return null;
  }
}

const lit = (v: unknown) => JSON.stringify(v);

async function claimToday(): Promise<Run> {
  for (let i = 0; i < 12; i++) {
    const run = await claimRun(prisma, SNAPSHOT_DATE, { leaseSeconds: LEASE_SECONDS, manual: true });
    if (run) return run;
    console.log("an automatic refresh chunk is running; waiting 15s...");
    await sleep(15_000);
  }
  throw new Error("Could not claim the refresh run (another refresh holds it); try again in a few minutes");
}

async function main() {
  console.log(`company table: ${databaseLabel()}`);
  const table = new Map(Object.entries(await readCompanyTable(prisma)));
  if (ADD) return addEntries(table);
  if (ONLY && APPLY) throw new Error("--apply with --only would leave other companies on an older date; refresh everything");
  // IPOs listed by today whose deck names a ticker we don't track yet: added in the same run.
  const ipos = listedIposToAdd(new Set(table.keys()), SNAPSHOT_DATE, (m) => console.log(m));
  const newNames = new Map(ipos.map((i) => [i.ticker, i.name]));
  const todo = [...table.values(), ...ipos.map((i): SupplierFinancials => ({ ticker: i.ticker }))].filter((f) => !ONLY || ONLY.includes(f.ticker));
  if (ipos.length) console.log(`newly listed IPOs to add: ${ipos.map((i) => i.ticker).join(", ")}`);
  console.log(`${todo.length} companies, snapshot ${SNAPSHOT}${APPLY ? "" : " (dry run)"}`);
  const run = APPLY ? await claimToday() : null;

  try {
    const results = new Map<string, Snap | null>();
    const read = (f: SupplierFinancials) => snapshot({ ticker: f.ticker, standalone: isStandalone(f), tlSlug: f.tl?.[1] ?? null });
    let next = 0;
    async function worker() {
      while (next < todo.length) {
        const f = todo[next++];
        results.set(f.ticker, await read(f));
        await sleep(400);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    // Screener rate-limits bursts: retry the misses one at a time, slowly.
    for (const f of todo.filter((f) => !results.get(f.ticker))) {
      await sleep(3000);
      results.set(f.ticker, await read(f));
    }

    const failed: string[] = [];
    const revFlags: string[] = [];
    const history: Record<string, unknown> = {};
    const updates: { f: SupplierFinancials; history: boolean; name?: string }[] = [];
    for (const old of todo) {
      const s = results.get(old.ticker);
      const ipoName = newNames.get(old.ticker);
      const fresh = s && ipoName ? newCompanyFigures(old.ticker, s, SNAPSHOT_DATE) : null;
      if (!s || (ipoName && !fresh)) {
        failed.push(old.ticker);
        continue;
      }
      if (fresh) {
        console.log(`${old.ticker} (${ipoName}, newly listed): ${lit(fresh)}`);
        updates.push({ f: fresh, history: true, name: ipoName });
        continue;
      }
      const f = withSnapshot(old, s, SNAPSHOT_DATE);
      let fixHistory = false;
      if (s.history && old.rev && old.np) {
        const cols = fiscalColumns(s.history);
        const off = (x: number | null, y: number | null) =>
          (x == null) !== (y == null) ? x == null && y != null : x != null && y != null && Math.abs(x - y) > 2 && Math.abs(x - y) / Math.max(1, Math.abs(y)) > 0.03;
        const bad = old.rev.some((v, i) => off(v, cols.rev[i])) || old.np.some((v, i) => off(v, cols.np[i]));
        if (bad) {
          revFlags.push(old.ticker);
          history[old.ticker] = { basis: s.basis, years: cols.want, authoredRev: old.rev, screenerRev: cols.rev, authoredNp: old.np, screenerNp: cols.np, note: old.note };
        }
        if (FIX_HISTORY.has(old.ticker)) {
          f.rev = cols.rev;
          f.np = cols.np;
          fixHistory = true;
        }
      }
      if (ONLY) {
        const show = (x: SupplierFinancials) => [x.mcap, x.price, x.note, x.cagr, x.range, x.kpi].map(lit).join(" | ");
        console.log(`${old.ticker} [${s.basis}]\n  was ${show(old)} (${old.asOf})\n  now ${show(f)}`);
      }
      updates.push({ f, history: fixHistory });
    }

    console.log(`updated ${updates.length}, failed ${failed.length}${failed.length ? ": " + failed.join(", ") : ""}`);
    if (revFlags.length) {
      fs.writeFileSync(REPORT, JSON.stringify(history, null, 1));
      console.log(`\n${revFlags.length} companies whose authored revenue/profit history differs from Screener by >3% in some year (details: ${path.relative(ROOT, REPORT)}):\n  ${revFlags.join(", ")}`);
    }

    if (!run) return;
    for (const u of updates) await writeFinancials(prisma, u.f, SNAPSHOT_DATE, { identity: { name: u.name ?? u.f.ticker, listed: true, role: "" }, history: u.history });
    Object.assign(run, { done: updates.length, total: todo.length, failed });
    await publishRun(prisma, run);
    console.log(`wrote ${updates.length} snapshots dated ${SNAPSHOT} and published them`);
    if (failed.length) {
      console.log("\nNot refreshed (kept their older snapshot and date) - fix by hand or re-run:");
      console.log("  " + failed.join(", "));
      process.exitCode = 1;
    }
  } finally {
    if (run && run.status !== "PUBLISHED") await releaseRun(prisma, run).catch(() => {});
  }
}

// --add: new companies (e.g. IPO peers) from Screener, with their full FY history.
async function addEntries(table: Map<string, SupplierFinancials>) {
  const peerName = new Map(listIpos().flatMap((r) => r.peers.filter((p) => p.ticker).map((p) => [p.ticker!, p.name])));
  // Dated like everyone else (the published date), so the new company shows at once.
  const asOf = (await readPublishedCutoff(prisma)) ?? SNAPSHOT_DATE;
  let added = 0;
  for (const t of ADD!) {
    if (table.has(t)) {
      console.log(`${t}: already in the company table, skipped`);
      continue;
    }
    const s = await snapshot({ ticker: t, standalone: false, tlSlug: null });
    const f = s ? newCompanyFigures(t, s, asOf) : null;
    if (!s || !f) {
      console.log(`${t}: FAILED`);
      continue;
    }
    const sup = findSupplierByTicker(t);
    const name = sup?.name ?? peerName.get(t) ?? s.name ?? t;
    console.log(`${t} (${name}): ${lit(f)}`);
    if (APPLY) {
      await writeFinancials(prisma, f, asOf, { identity: { name, listed: true, role: sup?.role ?? "" } });
      added++;
    }
  }
  if (APPLY) console.log(`added ${added} to the company table (snapshot dated ${formatAsOf(asOf)})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
