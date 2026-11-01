// The stored period figures by hand (src/lib/baskets/basket-returns.ts): the first fill, or catching
// up when the daily cron has stopped. The site rebuilds them by itself after each NSE trading day
// (src/app/api/baskets/returns/refresh, Vercel Cron).
//
//   npx tsx scripts/refresh-basket-returns.ts           status only: what is stored (no writes)
//   npx tsx scripts/refresh-basket-returns.ts --apply   work out every industry basket's figures and store them
//
// Writes go to DATABASE_URL (.env); the run prints which database first.
// First: the backtests read the price store through the app's own client, made on import.
import "dotenv/config";
import { readPublishedTable } from "../src/lib/financials/query";
import { installFinancials } from "../src/lib/financials/store";
import { refreshBasketReturns } from "../src/lib/baskets/basket-returns";
import { databaseLabel, scriptPrisma } from "./db";

const APPLY = process.argv.includes("--apply");
const prisma = scriptPrisma();

async function main() {
  console.log(`database: ${databaseLabel()}`);
  const rows = await prisma.basketReturn.findMany({ orderBy: [{ period: "asc" }, { slug: "asc" }] });
  const newest = rows.reduce<Date | null>((d, r) => (!d || r.updatedAt > d ? r.updatedAt : d), null);
  console.log(`stored: ${rows.length} rows, ${new Set(rows.map((r) => r.slug)).size} baskets, last written ${newest?.toISOString() ?? "never"}`);
  if (!APPLY) return console.log("status only; --apply to rebuild");
  // The baskets' stocks come from the content, which reads the company table.
  installFinancials((await readPublishedTable(prisma)).byTicker);
  const res = await refreshBasketReturns(prisma, { log: console.log, concurrency: 1 });
  console.log(`wrote ${res.rows} rows for ${res.baskets} baskets${res.skipped.length ? `; skipped: ${res.skipped.join(", ")}` : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
