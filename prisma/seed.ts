// Populates the database from prisma/seed-source/extracted.json (produced by
// `npx tsx prisma/extract-source-data.ts` from src/lib/sector-content/products.ts).
// Only company identity (name, role, which sectors list it) and the curated news are
// written here. Company figures are not: they live only in the database and are written by
// scripts/refresh-financials.ts (and were first copied in by scripts/migrate-financials-to-db.ts).
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
    suppliers: Record<string, { name: string; listed: boolean; role: string; notes?: string[]; f?: { ticker: string } }>;
  }>;
  news: Record<string, { items: Array<{ date: string; headline: string; source: string; url: string }> }>;
};

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "seed-source/extracted.json"), "utf8");
  const data: Extracted = JSON.parse(raw);
  console.log(`Seeding ${databaseLabel()}`);

  // Real ticker -> Company id, so the NEWS object (keyed by real ticker) can find the
  // same company row seeded while walking each sector's suppliers dict.
  const companyIdByRealTicker = new Map<string, string>();
  // Which sector slugs referenced a given ticker, accumulated across sectors so a
  // company that appears in multiple ecosystems (e.g. Motherson) lists them all.
  const sectorSlugsByTicker = new Map<string, Set<string>>();

  for (const sector of data.sectors) {
    console.log(`Seeding companies for sector: ${sector.key}`);

    for (const sup of Object.values(sector.suppliers)) {
      const ticker = sup.f?.ticker ?? syntheticTicker(sup.name);
      if (!sectorSlugsByTicker.has(ticker)) sectorSlugsByTicker.set(ticker, new Set());
      sectorSlugsByTicker.get(ticker)!.add(sector.key);

      const identity = {
        name: sup.name,
        role: sup.role,
        notes: sup.notes ?? [],
        sectorSlugs: [...sectorSlugsByTicker.get(ticker)!],
      };
      const company = await prisma.company.upsert({
        where: { ticker },
        create: { ticker, listed: sup.listed, ...identity },
        update: identity,
      });
      companyIdByRealTicker.set(ticker, company.id);
    }
  }

  // Curated news, keyed by real ticker.
  for (const [ticker, entry] of Object.entries(data.news)) {
    const companyId = companyIdByRealTicker.get(ticker);
    if (!companyId) {
      console.warn(`News ticker "${ticker}" has no matching seeded company — skipped.`);
      continue;
    }
    await prisma.newsLink.deleteMany({ where: { companyId } });
    for (const item of entry.items) {
      await prisma.newsLink.create({
        data: { companyId, date: item.date, headline: item.headline, source: item.source, url: item.url },
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
