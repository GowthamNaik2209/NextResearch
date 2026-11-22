// Rewrites the "... left blank" clause of company notes so it gives the real reason for each blank
// FY22-FY26 column: "FY22-FY24 before its listing, left blank" only for years that ended before the
// company listed (price store's first day and Screener's price CAGRs, refresh.ts listingBound), else
// "FY22 not on Screener, left blank". Replaces the old generic "years before its listing or not on
// Screener left blank", which read wrong on companies listed for decades (ACC, PGHH, Patanjali).
// A few companies whose blanks come from a change of financial year get a hand-written reason.
// Only Company.financialsNote changes; the daily refresh carries the note forward.
//
//   npx tsx scripts/fix-blank-year-notes.ts            dry run: old and new note per company
//   npx tsx scripts/fix-blank-year-notes.ts --apply    write them
import { readCompanyTable } from "../src/lib/financials/query";
import { listingBound, noteAfterHistoryFix } from "../src/lib/financials/refresh";
import { istDay } from "../src/lib/financials/trading-day";
import { databaseLabel, scriptPrisma } from "./db";

const APPLY = process.argv.includes("--apply");
const GENERIC = /years before its listing or not on Screener left blank/i;

// Blank years from a change of financial year: the reason is the change, not the listing.
const BY_HAND: Record<string, string> = {
  ACC: "Moved its financial year from January-December to April-March in 2023 (FY23 was a 15-month period); FY22-FY23 left blank",
  PGHH: "standalone figures; Moved its financial year from July-June to April-March in 2025: FY25 is the nine months to March 2025, so FY26 growth over it is misleading; earlier July-June years left blank",
  IGIL: "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025; CY2021 before its listing, left blank; moved to an April-March year in 2025 and Screener shows January 2025-March 2026 as one 15-month period, so CY2025 is left blank",
  GILLETTE: "standalone figures; Moved its financial year from July-June to April-March in 2025: FY25 is the nine months to March 2025, so FY26 growth over it is misleading; earlier July-June years left blank",
};

async function main() {
  const prisma = scriptPrisma();
  console.log(`company table: ${databaseLabel()}${APPLY ? "" : " (dry run)"}`);
  const table = await readCompanyTable(prisma);
  const firstDay = new Map((await prisma.priceSeries.findMany({ select: { key: true, firstDay: true } })).map((p) => [p.key, p.firstDay]));
  const today = istDay(new Date());
  let changed = 0;
  for (const f of Object.values(table)) {
    if (!GENERIC.test(f.note ?? "") && !BY_HAND[f.ticker]) continue;
    const dec = /jan-dec/i.test(f.note ?? "") && !/moved/i.test(f.note ?? "");
    const next =
      BY_HAND[f.ticker] ??
      noteAfterHistoryFix(f.note, f.rev ?? [null, null, null, null, null], f.np ?? [null, null, null, null, null], "consolidated", {
        listedOn: listingBound(f.cagr, firstDay.get(f.ticker) ?? null, today),
        dec,
      });
    if (next === (f.note ?? null)) continue;
    changed++;
    console.log(`${f.ticker}\n  was ${f.note}\n  now ${next}`);
    if (APPLY) await prisma.company.update({ where: { ticker: f.ticker }, data: { financialsNote: next } });
  }
  console.log(`${changed} notes ${APPLY ? "written" : "would change"}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
