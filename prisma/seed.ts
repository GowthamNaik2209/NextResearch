// Populates the database from prisma/seed-source/extracted.json (produced by
// `npx tsx prisma/extract-source-data.ts` from src/lib/sector-content/products.ts).
// Only company identity (ticker, name, listed, role) is written here. The curated news in
// extracted.json is read by the app straight from the file (src/lib/sector-content/insights.ts),
// not from the database. Company figures are not written here either: they live only in the
// database and are written by scripts/refresh-financials.ts (first copied in by
// scripts/migrate-financials-to-db.ts).
// Sector/zone/3D geometry is static content in products.ts (see the comment atop
// prisma/schema.prisma for why).
// Run with: npm run db:seed
import { syntheticTicker } from "../src/lib/slugify.js";
import { databaseLabel, scriptPrisma } from "../scripts/db";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = scriptPrisma();

type Extracted = {
  sectors: Array<{
    key: string;
    suppliers: Record<string, { name: string; listed: boolean; role: string; f?: { ticker: string } }>;
  }>;
};

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "seed-source/extracted.json"), "utf8");
  const data: Extracted = JSON.parse(raw);
  console.log(`Seeding ${databaseLabel()}`);

  for (const sector of data.sectors) {
    console.log(`Seeding companies for sector: ${sector.key}`);

    for (const sup of Object.values(sector.suppliers)) {
      const ticker = sup.f?.ticker ?? syntheticTicker(sup.name);
      const identity = { name: sup.name, role: sup.role };
      await prisma.company.upsert({
        where: { ticker },
        create: { ticker, listed: sup.listed, ...identity },
        update: identity,
      });
    }
  }

  const companyCount = await prisma.company.count();
  console.log(`Done. ${companyCount} companies seeded across ${data.sectors.length} sectors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
