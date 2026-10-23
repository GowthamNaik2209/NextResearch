// For tests that check real company figures (screens, IPO peers, one snapshot date): installs the
// company table from DATABASE_URL (.env), read-only, exactly as the app does. There is no copy of
// the figures in the repo to test against; the database is the only one.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { readCompanyTable } from "./query";
import { installFinancials } from "./store";

let loaded: Promise<void> | null = null;

export function installFinancialsFromDatabase(): Promise<void> {
  loaded ??= (async () => {
    if (!process.env.DATABASE_URL) throw new Error("These tests read the company figures from the database: set DATABASE_URL (see .env.example)");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
      installFinancials(await readCompanyTable(prisma));
    } finally {
      await prisma.$disconnect();
    }
  })();
  return loaded;
}
