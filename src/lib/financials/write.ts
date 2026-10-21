// Writes one company's figures to the database: the Company's figure fields, a KpiSnapshot dated
// `asOf` and the FY22-FY26 revenue/profit rows. Used by the scripts that maintain the company table
// (scripts/refresh-financials.ts); takes the Prisma client so it runs outside Next.
import type { PrismaClient } from "@/generated/prisma/client";
import type { SupplierFinancials } from "@/lib/sector-content";
import { FISCAL_YEARS, financialsToRows } from "./rows";

type Identity = { name: string; listed?: boolean; role?: string };

export async function writeFinancials(
  prisma: PrismaClient,
  f: SupplierFinancials,
  asOf: Date,
  opts: { identity: Identity; history?: boolean },
) {
  const rows = financialsToRows(f, asOf);
  // No Trendlyne pair given (a new company from --add): keep whatever the row already has.
  const update = f.tl ? rows.company : { ...rows.company, screenerSlug: undefined, externalId: undefined };
  const company = await prisma.company.upsert({
    where: { ticker: f.ticker },
    create: { ticker: f.ticker, name: opts.identity.name, listed: opts.identity.listed ?? true, role: opts.identity.role ?? "", notes: [], ...rows.company },
    update,
  });
  await prisma.kpiSnapshot.upsert({
    where: { companyId_asOf: { companyId: company.id, asOf } },
    create: { companyId: company.id, ...rows.kpi },
    update: rows.kpi,
  });
  // Revenue/profit history is curated: replaced only when asked (a new company, or --fix-history).
  if (opts.history === false) return;
  for (const year of FISCAL_YEARS) {
    const y = rows.years.find((r) => r.year === year);
    if (!y) {
      await prisma.financialSnapshot.deleteMany({ where: { companyId: company.id, year } });
      continue;
    }
    await prisma.financialSnapshot.upsert({
      where: { companyId_year: { companyId: company.id, year } },
      create: { companyId: company.id, ...y },
      update: { revenueCr: y.revenueCr, netProfitCr: y.netProfitCr },
    });
  }
}
