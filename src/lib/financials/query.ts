// The one query for the company table, so the app (./load.ts), the scripts and the tests read it
// the same way: every tracked company with its FY22-FY26 revenue/profit and ONE KpiSnapshot - its
// latest dated on or before the published date (./trading-day.ts publishedCutoff), so a refresh run
// that is still writing (./refresh.ts) never shows: every company switches together when it publishes.
import type { PrismaClient } from "@/generated/prisma/client";
import type { SupplierFinancials } from "@/lib/sector-content";
import { FISCAL_YEARS, rowToFinancials } from "./rows";
import { pickSnapshot, publishedCutoff } from "./trading-day";

let warnedNoRunsTable = false;

/** The newest snapshot date the app may show (null: no runs recorded, show each company's latest). */
export async function readPublishedCutoff(prisma: PrismaClient): Promise<Date | null> {
  try {
    const published = await prisma.financialsRun.findFirst({ where: { status: "PUBLISHED" }, orderBy: { snapshotDate: "desc" }, select: { snapshotDate: true } });
    if (published) return published.snapshotDate;
    const earliest = await prisma.financialsRun.findFirst({ orderBy: { snapshotDate: "asc" }, select: { snapshotDate: true } });
    return publishedCutoff(null, earliest?.snapshotDate ?? null);
  } catch (e) {
    // The FinancialsRun table not created yet (code deployed before its migration): no runs, as before.
    if ((e as { code?: string }).code !== "P2021") throw e;
    if (!warnedNoRunsTable) console.warn("company table: no FinancialsRun table yet (migration 20261023120000 not applied) - showing each company's latest snapshot");
    warnedNoRunsTable = true;
    return null;
  }
}

export async function readCompanyTableAt(prisma: PrismaClient, cutoff: Date | null): Promise<Record<string, SupplierFinancials>> {
  const rows = await prisma.company.findMany({
    where: { tracked: true },
    orderBy: { ticker: "asc" },
    select: {
      ticker: true,
      screenerSlug: true,
      externalId: true,
      financialsNote: true,
      screenOut: true,
      kpis: { where: cutoff ? { asOf: { lte: cutoff } } : undefined, orderBy: { asOf: "desc" }, take: 1 },
      financials: { where: { year: { in: [...FISCAL_YEARS] } }, select: { year: true, revenueCr: true, netProfitCr: true } },
      _count: { select: { kpis: true } },
    },
  });
  return Object.fromEntries(
    rows.flatMap((r) => {
      const k = pickSnapshot(r.kpis, cutoff);
      // Held to a published date, a company whose first snapshot is newer (an IPO a run is adding)
      // joins the table when that run publishes, with everyone else.
      if (!k && r._count.kpis > 0) return [];
      return [[r.ticker, rowToFinancials({ ...r, kpis: k ? [k] : [] })]];
    }),
  );
}

/** The table as the site shows it, with the published date it is held to. */
export async function readPublishedTable(prisma: PrismaClient): Promise<{ byTicker: Record<string, SupplierFinancials>; published: Date | null }> {
  const published = await readPublishedCutoff(prisma);
  return { byTicker: await readCompanyTableAt(prisma, published), published };
}

/** The table as the site shows it. */
export async function readCompanyTable(prisma: PrismaClient): Promise<Record<string, SupplierFinancials>> {
  return (await readPublishedTable(prisma)).byTicker;
}
