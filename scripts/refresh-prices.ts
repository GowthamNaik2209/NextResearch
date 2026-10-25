// The price store by hand (src/lib/prices): the first fill (five years of daily bars for every
// mapped stock and benchmark), or catching up when the daily cron has stopped. The site tops the
// store up by itself after each NSE trading day (src/app/api/prices/refresh, Vercel Cron).
//
//   npx tsx scripts/refresh-prices.ts                  status only: what is stored, what is due (no writes)
//   npx tsx scripts/refresh-prices.ts --apply          fetch and store everything due, chunk after chunk
//   npx tsx scripts/refresh-prices.ts --only=LT,BEL --apply   just these keys (tickers, or ^NSEI etc.)
//
// Writes go to DATABASE_URL (.env); the run prints which database first. It takes the day's
// PriceRun lease like the cron, so the two never work at once (it waits while the cron holds it).
import { readPublishedTable } from "../src/lib/financials/query";
import { installFinancials } from "../src/lib/financials/store";
import { latestDueTradingDay } from "../src/lib/financials/trading-day";
import { runPriceChunk, storeKeys } from "../src/lib/prices/refresh";
import { databaseLabel, scriptPrisma } from "./db";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",") ?? undefined;
const prisma = scriptPrisma();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function status() {
  const target = latestDueTradingDay(new Date());
  const keys = storeKeys().filter((k) => !ONLY || ONLY.includes(k.key));
  const series = new Map((await prisma.priceSeries.findMany()).map((s) => [s.key, s]));
  const bars = await prisma.priceBar.count();
  const missing = keys.filter((k) => !series.has(k.key)).map((k) => k.key);
  const due = keys.filter((k) => series.has(k.key) && (series.get(k.key)!.checkedDay?.getTime() ?? 0) < target.getTime()).map((k) => k.key);
  const screener = [...series.values()].filter((s) => s.source === "screener").map((s) => s.key);
  console.log(`${keys.length} series to keep (${keys.filter((k) => k.benchmark).length} benchmarks); target day ${target.toISOString().slice(0, 10)}`);
  console.log(`stored: ${series.size} series, ${bars} bars`);
  console.log(`never fetched: ${missing.length}${missing.length ? ` (${missing.slice(0, 15).join(", ")}${missing.length > 15 ? ", ..." : ""})` : ""}`);
  console.log(`behind: ${due.length}${due.length ? ` (${due.slice(0, 15).join(", ")}${due.length > 15 ? ", ..." : ""})` : ""}`);
  if (screener.length) console.log(`closes only (Screener): ${screener.join(", ")}`);
}

async function main() {
  console.log(`database: ${databaseLabel()}`);
  installFinancials((await readPublishedTable(prisma)).byTicker);
  await status();
  if (!APPLY) {
    console.log("\nStatus only. Add --apply to fetch and store what is due.");
    return;
  }
  for (let chunk = 1; ; chunk++) {
    const r = await runPriceChunk(prisma, { budgetMs: 10 * 60_000, only: ONLY, log: (m) => console.log(`  ${m}`) });
    if (r.status === "up-to-date") break;
    if (r.status === "busy") {
      console.log("  another run holds the lease (the cron?); waiting a minute");
      await sleep(60_000);
      continue;
    }
    if (r.status === "finished") break;
    if (r.status === "stopped") {
      console.log("  Yahoo is failing; waiting two minutes before the next chunk");
      await sleep(120_000);
    }
    if (chunk >= 20) {
      console.log("  20 chunks without finishing; stopping (run again later)");
      break;
    }
  }
  console.log("");
  await status();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
