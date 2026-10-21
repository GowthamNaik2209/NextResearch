// The one query for the company table, so the app (./load.ts), the scripts and the tests read it
// the same way: every tracked company with its latest KpiSnapshot and FY22-FY26 revenue/profit.
import type { PrismaClient } from "@/generated/prisma/client";
import type { SupplierFinancials } from "@/lib/sector-content";
import { FISCAL_YEARS, rowToFinancials } from "./rows";

export async function readCompanyTable(prisma: PrismaClient): Promise<Record<string, SupplierFinancials>> {
  const rows = await prisma.company.findMany({
    where: { tracked: true },
    orderBy: { ticker: "asc" },
    select: {
      ticker: true,
      screenerSlug: true,
      externalId: true,
      financialsNote: true,
      screenOut: true,
      kpis: { orderBy: { asOf: "desc" }, take: 1 },
      financials: { where: { year: { in: [...FISCAL_YEARS] } }, select: { year: true, revenueCr: true, netProfitCr: true } },
    },
  });
  return Object.fromEntries(rows.map((r) => [r.ticker, rowToFinancials(r)]));
}
