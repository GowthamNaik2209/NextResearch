// Loads insurers' quarterly figures (VNB margin, embedded value, combined ratio, solvency) that are kept
// by hand in data/insurer-metrics.json from each insurer's public disclosures.
//   npx tsx scripts/insurer-metrics.ts           dry run: prints the rows and checks them
//   npx tsx scripts/insurer-metrics.ts --apply   upsert on (company, period end); refuses if any row is invalid
// Writes go to DATABASE_URL (.env); the run prints which database first.
import fs from "node:fs";
import path from "node:path";
import { validateInsurerRows } from "../src/lib/financials/insurer";
import { databaseLabel, scriptPrisma } from "./db";

const FILE = path.resolve(__dirname, "../data/insurer-metrics.json");
const APPLY = process.argv.includes("--apply");
const day = (s: string) => new Date(`${s}T00:00:00Z`);

async function main() {
  console.log(`Database: ${databaseLabel()}  (${APPLY ? "APPLY" : "dry run"})`);
  const { rows, errors } = validateInsurerRows(JSON.parse(fs.readFileSync(FILE, "utf8")));
  for (const r of rows) {
    console.log(`  ${r.ticker.padEnd(11)} ${r.period} (${r.periodEnd})  VNB ${r.vnbMargin ?? "-"}  EV ${r.embeddedValueCr ?? "-"}  CR ${r.combinedRatio ?? "-"}  solvency ${r.solvencyRatio ?? "-"}`);
  }
  console.log(`${rows.length} valid row(s), ${errors.length} problem(s)`);
  if (errors.length) {
    for (const e of errors) console.error(`  INVALID ${e}`);
    console.error("Nothing written: fix the file first.");
    process.exitCode = 1;
    return;
  }
  if (!APPLY) {
    console.log("Dry run only; add --apply to write.");
    return;
  }
  const prisma = scriptPrisma();
  try {
    const companies = await prisma.company.findMany({ where: { ticker: { in: [...new Set(rows.map((r) => r.ticker))] } }, select: { id: true, ticker: true } });
    const idOf = new Map(companies.map((c) => [c.ticker, c.id]));
    const missing = [...new Set(rows.map((r) => r.ticker))].filter((t) => !idOf.has(t));
    if (missing.length) throw new Error(`Not in the Company table: ${missing.join(", ")}; nothing written`);
    for (const r of rows) {
      const data = {
        period: r.period,
        vnbMargin: r.vnbMargin,
        embeddedValueCr: r.embeddedValueCr,
        combinedRatio: r.combinedRatio,
        solvencyRatio: r.solvencyRatio,
        sourceUrl: r.sourceUrl,
        readOn: day(r.readOn),
      };
      await prisma.insurerMetric.upsert({
        where: { companyId_periodEnd: { companyId: idOf.get(r.ticker)!, periodEnd: day(r.periodEnd) } },
        create: { companyId: idOf.get(r.ticker)!, periodEnd: day(r.periodEnd), ...data },
        update: data,
      });
    }
    console.log(`Wrote ${rows.length} row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
