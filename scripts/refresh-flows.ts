// The institutional-money tables by hand (src/lib/flows): a look at what the sources publish today,
// or a backfill. The site tops the tables up by itself after each NSE trading day
// (src/app/api/flows/refresh, Vercel Cron).
//
//   npx tsx scripts/refresh-flows.ts                        dry run: fetch every source and print what
//                                                           a run would write (no database at all)
//   npx tsx scripts/refresh-flows.ts --apply                one run, as the cron does it
//   npx tsx scripts/refresh-flows.ts --apply --backfill=60  participant OI and deals for the last 60
//       trading days, and any of the newest 12 NSDL fortnights not stored yet
//
// NSE keeps no history of the cash figures, so those start from the first run. Writes go to
// DATABASE_URL (.env); an --apply run prints which database first.
import { latestDueTradingDay } from "../src/lib/financials/trading-day";
import { fetchCashFlows, fetchDeals, fetchLatestDealsArchive, fetchParticipantOi } from "../src/lib/flows/nse";
import { fetchFortnightList, fetchSectorReport } from "../src/lib/flows/nsdl";
import { classifyParty } from "../src/lib/flows/parties";
import { runFlowsRefresh, tradingDaysBack } from "../src/lib/flows/refresh";
import type { Deal, DealKind } from "../src/lib/flows/types";
import { databaseLabel, scriptPrisma } from "./db";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const BACKFILL = Number(args.find((a) => a.startsWith("--backfill="))?.split("=")[1] ?? 0) || 0;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const pct = (a: number, b: number) => (a + b ? `${((100 * a) / (a + b)).toFixed(1)}%` : "-");

async function dryRun() {
  const latest = latestDueTradingDay(new Date());
  const dealDays = tradingDaysBack(latest, Math.max(5, BACKFILL));
  console.log(`latest due trading day ${iso(latest)}${BACKFILL ? `; backfill window ${BACKFILL} trading days from ${iso(dealDays.at(-1)!)}` : ""}\n`);

  const cash = await fetchCashFlows();
  if (cash) {
    console.log(`cash ${iso(cash.day)}${cash.day.getTime() < latest.getTime() ? " (NSE has not published the latest day yet)" : ""}`);
    console.log(`  FII/FPI buy ${cash.fii.buyCr}  sell ${cash.fii.sellCr}  net ${cash.fii.netCr} Cr`);
    console.log(`  DII     buy ${cash.dii.buyCr}  sell ${cash.dii.sellCr}  net ${cash.dii.netCr} Cr`);
  } else console.log("cash: NSE did not answer");

  const oi = await fetchParticipantOi(latest);
  if (oi) {
    console.log(`\nparticipant OI ${iso(oi.day)} (index futures, contracts)`);
    console.log(`  FII long ${oi.fii.idxFutLong}  short ${oi.fii.idxFutShort}  long share ${pct(oi.fii.idxFutLong, oi.fii.idxFutShort)}`);
    console.log(`  DII long ${oi.dii.idxFutLong}  short ${oi.dii.idxFutShort}  long share ${pct(oi.dii.idxFutLong, oi.dii.idxFutShort)}`);
  } else console.log(`\nparticipant OI ${iso(latest)}: not published (or NSE did not answer)`);
  if (BACKFILL) console.log(`  an --apply run tries every day of the ${BACKFILL}-day window not stored yet`);

  console.log(`\ndeals ${iso(dealDays.at(-1)!)}..${iso(latest)}`);
  const all: Deal[] = [];
  for (const kind of ["BULK", "BLOCK"] as DealKind[]) {
    const deals: Deal[] = [];
    let ok = true;
    for (let i = 0; i < dealDays.length; i += 20) {
      const chunk = dealDays.slice(i, i + 20);
      const got = await fetchDeals(kind, chunk.at(-1)!, chunk[0]);
      if (got) deals.push(...got);
      else ok = false;
    }
    if (!ok) {
      const latestRows = await fetchLatestDealsArchive(kind);
      console.log(`  ${kind}: the API did not answer; archive file has ${latestRows?.length ?? "no"} rows`);
      if (latestRows) deals.push(...latestRows);
    }
    const byDay = new Map<string, number>();
    for (const d of deals) byDay.set(iso(d.day), (byDay.get(iso(d.day)) ?? 0) + 1);
    console.log(`  ${kind}: ${deals.length} rows; by day ${[...byDay].map(([d, n]) => `${d.slice(5)}:${n}`).join(" ")}`);
    all.push(...deals);
  }
  const parties = { FII: 0, DII: 0, OTHER: 0 };
  for (const d of all) parties[classifyParty(d.clientName)]++;
  console.log(`  clients: FII ${parties.FII}, DII ${parties.DII}, other ${parties.OTHER}`);
  for (const d of all.filter((x) => classifyParty(x.clientName) !== "OTHER").slice(0, 8))
    console.log(`  e.g. ${iso(d.day)} ${d.kind} ${d.symbol} ${d.side} ${d.quantity} @ ${d.price}  ${d.clientName} [${classifyParty(d.clientName)}]`);

  const list = await fetchFortnightList();
  if (!list) console.log("\nNSDL: the fortnight list did not load");
  else {
    console.log(`\nNSDL: ${list.length} fortnights listed; newest ${list.slice(0, 12).map((l) => iso(l.periodEnd)).join(", ")}`);
    const report = await fetchSectorReport(list[0].url);
    if (!report) console.log(`  newest report did not load or parse: ${list[0].url}`);
    else {
      console.log(`  ${report.periodLabel} (period end ${iso(report.periodEnd)}): ${report.rows.length} rows (net equity / AUC equity, Rs Cr)`);
      for (const r of report.rows) console.log(`    ${r.sector.padEnd(40)} ${String(r.netEquityCr).padStart(9)} ${String(r.aucEquityCr ?? "-").padStart(11)}`);
    }
  }
  console.log("\nDry run: nothing written. Add --apply to store it.");
}

async function main() {
  if (!APPLY) return dryRun();
  console.log(`database: ${databaseLabel()}`);
  const prisma = scriptPrisma();
  try {
    const summary = await runFlowsRefresh(prisma, {
      backfillDays: BACKFILL || undefined,
      fortnights: BACKFILL ? 12 : undefined,
      log: (m) => console.log(`  ${m}`),
    });
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
