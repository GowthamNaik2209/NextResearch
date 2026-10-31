// The institutional-money tables by hand (src/lib/flows): a look at what the sources publish today,
// or a backfill. The site tops the tables up by itself after each NSE trading day
// (src/app/api/flows/refresh, Vercel Cron).
//
//   npx tsx scripts/refresh-flows.ts                        dry run: fetch every source and print what
//                                                           a run would write (no database at all)
//   npx tsx scripts/refresh-flows.ts --apply                one run, as the cron does it
//   npx tsx scripts/refresh-flows.ts --apply --backfill=60  participant OI and deals for the last 60
//       trading days, and any of the newest 12 NSDL fortnights not stored yet
//   npx tsx scripts/refresh-flows.ts --apply --backfill=1250 --fortnights=125   five years of OI, deals
//       and NSDL sector flows (the FII / DII view's longest period)
//   npx tsx scripts/refresh-flows.ts --official=2021-10           dry run of the official daily history
//       from October 2021: NSDL's confirmed FPI days (a request per month), NSDL's DII days (from June
//       2026, a request per day) and SEBI's mutual-fund days (a request per month), ~1 s apart
//   npx tsx scripts/refresh-flows.ts --official=2021-10 --apply   the same, written (only those three columns)
//
// NSE keeps no history of its provisional cash figures, so those start from the first run; the
// official figures (by trade date) cover the days before. Writes go to
// DATABASE_URL (.env); an --apply run prints which database first.
import { istDay, isTradingDay, latestDueTradingDay } from "../src/lib/financials/trading-day";
import { fetchCashFlows, fetchDeals, fetchLatestDealsArchive, fetchParticipantOi } from "../src/lib/flows/nse";
import { fetchFortnightList, fetchSectorReport } from "../src/lib/flows/nsdl";
import { classifyParty } from "../src/lib/flows/parties";
import { fetchOfficialFlows, officialByTradeDate, runFlowsRefresh, tradingDaysBack, writeOfficialFlows } from "../src/lib/flows/refresh";
import type { Deal, DealKind } from "../src/lib/flows/types";
import { databaseLabel, scriptPrisma } from "./db";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const BACKFILL = Number(args.find((a) => a.startsWith("--backfill="))?.split("=")[1] ?? 0) || 0;
// NSDL fortnights to look back over for ones not stored yet (default 12 with --backfill, else 2).
const FORTNIGHTS = Number(args.find((a) => a.startsWith("--fortnights="))?.split("=")[1] ?? 0) || 0;
// "--official=2021-10": the first month of official history to fetch.
const OFFICIAL = args.find((a) => a.startsWith("--official="))?.split("=")[1];
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

async function official(month: string) {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`--official wants YYYY-MM, got ${month}`);
  const from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const to = istDay(new Date());
  console.log(`official history ${iso(from)}..${iso(to)} (about one request a second)`);
  const got = await fetchOfficialFlows({ from, to, paceMs: 1000, log: (msg) => console.log(`  ${msg}`) });
  const rows = officialByTradeDate(got);
  const by = (k: "fpiNsdlNetCr" | "diiNsdlNetCr" | "mfSebiNetCr") => rows.filter((r) => r[k] !== undefined);
  console.log(`\nfetched: NSDL FPI ${got.fpi.length} reporting days, NSDL DII ${got.dii.length}, SEBI MF ${got.mf.length} trade days`);
  for (const [label, k] of [["FPI (NSDL)", "fpiNsdlNetCr"], ["DII (NSDL)", "diiNsdlNetCr"], ["MF (SEBI)", "mfSebiNetCr"]] as const) {
    const list = by(k);
    const years = new Map<number, number>();
    for (const r of list) years.set(r.day.getUTCFullYear(), (years.get(r.day.getUTCFullYear()) ?? 0) + 1);
    console.log(`  ${label}: ${list.length} trade days, ${list[0] ? iso(list[0].day) : "-"}..${list.at(-1) ? iso(list.at(-1)!.day) : "-"}; per year ${[...years].map(([y, n]) => `${y}:${n}`).join(" ")}`);
  }
  // Trade dates by NSDL's own list vs our calendar, where the calendar knows the holidays (2026).
  const off = rows.filter((r) => r.day.getUTCFullYear() >= 2026 && !isTradingDay(r.day));
  console.log(`  trade dates on a 2026+ non-trading day by our calendar: ${off.length ? off.map((r) => iso(r.day)).join(", ") : "none"}`);
  const notWeekday = rows.filter((r) => [0, 6].includes(r.day.getUTCDay()));
  console.log(`  trade dates on a weekend: ${notWeekday.length ? notWeekday.map((r) => iso(r.day)).join(", ") : "none"}`);
  if (got.failed.length) console.log(`  failed requests: ${got.failed.join(", ")}`);
  console.log("\nspot checks (trade date: FPI / DII / MF net, Rs Cr):");
  const spot = ["2021-03-01", "2021-10-01", "2026-09-30", "2026-10-01", "2026-10-23", "2026-10-27", "2026-10-28", "2026-10-29"];
  for (const d of spot) {
    const r = rows.find((x) => iso(x.day) === d);
    console.log(`  ${d}  ${r?.fpiNsdlNetCr ?? "-"} / ${r?.diiNsdlNetCr ?? "-"} / ${r?.mfSebiNetCr ?? "-"}`);
  }
  console.log("newest rows:");
  for (const r of rows.slice(-6)) console.log(`  ${iso(r.day)}  ${r.fpiNsdlNetCr ?? "-"} / ${r.diiNsdlNetCr ?? "-"} / ${r.mfSebiNetCr ?? "-"}`);
  if (!APPLY) {
    console.log(`\nDry run: ${rows.length} days would be written. Add --apply to store them.`);
    return;
  }
  console.log(`\ndatabase: ${databaseLabel()}`);
  const prisma = scriptPrisma();
  try {
    console.log(`written: ${await writeOfficialFlows(prisma, rows)} days`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (OFFICIAL) return official(OFFICIAL);
  if (!APPLY) return dryRun();
  console.log(`database: ${databaseLabel()}`);
  const prisma = scriptPrisma();
  try {
    const summary = await runFlowsRefresh(prisma, {
      backfillDays: BACKFILL || undefined,
      fortnights: FORTNIGHTS || (BACKFILL ? 12 : undefined),
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
