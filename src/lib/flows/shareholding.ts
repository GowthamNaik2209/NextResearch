// Writes a company's quarterly shareholding pattern (promoters, FII, DII, ...) to the Shareholding
// table. The daily company refresh (src/lib/financials/refresh.ts) already reads every tracked
// company's Screener page, whose quarterly table carries the last 12 quarters, so it stores them here
// on the way: no extra requests, and the first run fills the whole history. Takes the Prisma client
// so it runs outside Next.
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ShareholdingQuarter } from "./types";

export async function writeShareholding(prisma: PrismaClient, ticker: string, quarters: ShareholdingQuarter[]): Promise<number> {
  if (quarters.length === 0) return 0;
  const company = await prisma.company.findUnique({ where: { ticker }, select: { id: true } });
  if (!company) return 0;
  // All quarters in one statement: one round trip to the remote pooler instead of a dozen (the daily
  // refresh does this for every company, inside its time budget). Atomic, and safe to repeat.
  const rows = quarters.map(
    (q) =>
      Prisma.sql`(gen_random_uuid()::text, ${company.id}, ${q.quarter}::date, ${q.promoters}, ${q.fii}, ${q.dii}, ${q.government}, ${q.public}, ${q.others}, ${q.shareholders}, now())`,
  );
  await prisma.$executeRaw`
    INSERT INTO "Shareholding" ("id", "companyId", "quarter", "promoters", "fii", "dii", "government", "public", "others", "shareholders", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("companyId", "quarter") DO UPDATE SET
      "promoters" = EXCLUDED."promoters", "fii" = EXCLUDED."fii", "dii" = EXCLUDED."dii", "government" = EXCLUDED."government",
      "public" = EXCLUDED."public", "others" = EXCLUDED."others", "shareholders" = EXCLUDED."shareholders", "updatedAt" = now()`;
  return quarters.length;
}

/**
 * writeShareholding for the company refresh: a failure (the table not created yet, a dropped
 * connection) is logged once per run and never stops the company figures, which matter more.
 */
export function shareholdingWriter(prisma: PrismaClient, log: (msg: string) => void) {
  let warned = false;
  return async (ticker: string, quarters: ShareholdingQuarter[] | undefined) => {
    try {
      await writeShareholding(prisma, ticker, quarters ?? []);
    } catch (e) {
      if (!warned) log(`shareholding not saved (${ticker}): ${e instanceof Error ? e.message.trim().split("\n").at(-1) : e}`);
      warned = true;
    }
  };
}
