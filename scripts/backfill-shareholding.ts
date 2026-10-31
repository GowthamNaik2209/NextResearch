// The quarterly shareholding table (promoters, FII, DII, ...) by hand. The daily company refresh
// stores it for every company it reads (src/lib/financials/refresh.ts), so this is only for filling
// it at once instead of waiting for the next trading day's run, or for a few companies again.
//
//   npx tsx scripts/backfill-shareholding.ts                 dry run: read five companies, print what would be stored
//   npx tsx scripts/backfill-shareholding.ts --apply         store every tracked company with no quarters yet
//   npx tsx scripts/backfill-shareholding.ts --all --apply   read every tracked company again
//   npx tsx scripts/backfill-shareholding.ts --only=LT,BEL --apply   just these tickers
//
// Writes go to DATABASE_URL (.env); the run prints which database first. One Screener page per
// company, two at a time, 1.5 s apart (about ten minutes for the whole table). Screener answering
// 429 stops the run; run it again later and it carries on with the companies still missing.
import { readCompanyTable } from "../src/lib/financials/query";
import { fetchSnapshot, isStandalone, ScreenerBlocked } from "../src/lib/financials/refresh";
import { writeShareholding } from "../src/lib/flows/shareholding";
import { databaseLabel, scriptPrisma } from "./db";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",");
const ALL = args.includes("--all");
const prisma = scriptPrisma();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pp = (v: number | null) => (v == null ? "  —  " : v.toFixed(2).padStart(5));

async function main() {
  console.log(`database: ${databaseLabel()}${APPLY ? "" : " (dry run: nothing is written)"}`);
  const table = await readCompanyTable(prisma);
  let todo = Object.values(table).filter((f) => !ONLY || ONLY.includes(f.ticker));
  if (!APPLY && !ONLY) todo = todo.slice(0, 5);
  else if (APPLY && !ONLY && !ALL) {
    const have = new Set((await prisma.shareholding.findMany({ distinct: ["companyId"], select: { company: { select: { ticker: true } } } })).map((r) => r.company.ticker));
    todo = todo.filter((f) => !have.has(f.ticker));
    console.log(`${have.size} companies already stored; ${todo.length} to go`);
  }
  let stored = 0;
  let blocked = false;
  let next = 0;
  const failed: string[] = [];
  // Two companies at a time, each worker pausing between pages: three ran into Screener's rate limit.
  const worker = async () => {
    while (!blocked && next < todo.length) {
      const i = next++;
      const f = todo[i];
      try {
        const s = await fetchSnapshot(f.ticker, isStandalone(f), f.tl?.[1] ?? null);
        const qs = s?.shareholding ?? [];
        if (!qs.length) {
          failed.push(f.ticker);
          console.log(`${f.ticker}: no shareholding table`);
        } else {
          const [a, b] = qs.slice(-2);
          const latest = b ?? a;
          console.log(
            `${String(i + 1).padStart(3)}/${todo.length} ${f.ticker.padEnd(12)} ${qs.length} qtrs to ${latest.quarter.toISOString().slice(0, 7)}  FII ${pp(latest.fii)}  DII ${pp(latest.dii)}  promoters ${pp(latest.promoters)}`,
          );
          if (APPLY) stored += await writeShareholding(prisma, f.ticker, qs);
        }
      } catch (e) {
        if (e instanceof ScreenerBlocked) {
          if (!blocked) console.error(`${e.message}: stopping; run again later (stored rows stay).`);
          blocked = true;
          break;
        }
        failed.push(f.ticker);
        console.log(`${f.ticker}: ${e instanceof Error ? e.message.trim().split("\n").at(-1) : e}`);
      }
      await sleep(1500);
    }
  };
  await Promise.all([worker(), worker()]);
  console.log(`${APPLY ? `stored ${stored} company-quarters` : "dry run"}; ${failed.length ? `no table for ${failed.join(", ")}` : "every company read"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
