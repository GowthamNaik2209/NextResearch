// The lender and insurer blocks of the company table (./query.ts): a lender's figures from the lender
// columns of its KpiSnapshot (./lender.ts, written by ./write.ts) and each insurer's latest
// hand-kept InsurerMetric row (./insurer.ts).
//
// Both are read separately from the main query, which names only the columns every database has.
// A database behind the schema (migration 20261118120000 not applied: no lender columns, no
// InsurerMetric table) gives no blocks - lenders and insurers then show `lender: null` /
// `insurer: null` - instead of failing the table. Any other failure fails the read like the rest
// of the table (it is retried, and a running server keeps its installed copy, ./load.ts).
import type { PrismaClient } from "@/generated/prisma/client";
import { insurerFreshness, priceToEmbeddedValue, type InsurerFigures } from "./insurer";
import type { LenderFigures } from "./lender";

type Num = { toString(): string } | number | null;
const num = (v: Num): number | null => (v == null ? null : Number(v.toString()));

/** The lender columns of a KpiSnapshot, as read. */
export type LenderCols = {
  gnpa: Num;
  nnpa: Num;
  finMargin: Num;
  totalAssets: Num;
  totalAssetsPrev: Num;
  deposits: Num;
  depositsPrev: Num;
  npaQuarter: string | null;
  lenderNetProfit: Num;
  bsYear: string | null;
  finMarginYear: string | null;
};

/** The inverse of ./write.ts lenderColumns. */
export function lenderFromColumns(c: LenderCols): LenderFigures {
  const deposits: [number | null, number | null] = [num(c.deposits), num(c.depositsPrev)];
  return {
    gnpa: num(c.gnpa),
    nnpa: num(c.nnpa),
    finMargin: num(c.finMargin),
    finMarginYear: c.finMarginYear,
    netProfit: num(c.lenderNetProfit),
    totalAssets: [num(c.totalAssets), num(c.totalAssetsPrev)],
    // No Deposits row (an NBFC) was stored as two nulls.
    deposits: deposits.some((d) => d != null) ? deposits : null,
    bsYear: c.bsYear,
    quarter: c.npaQuarter,
  };
}

// The schema is ahead of the database: a column (P2022) or a table (P2021) not created yet.
const NOT_MIGRATED = /P2021|P2022|(column|table|relation) .* does not exist/i;
const warned = new Set<string>();
function notMigrated(e: unknown, what: string): boolean {
  if (!NOT_MIGRATED.test(`${(e as { code?: string }).code ?? ""} ${String(e)}`)) return false;
  if (!warned.has(what)) console.warn(`company table: no ${what} yet (migration 20261118120000 not applied) - shown as none`);
  warned.add(what);
  return true;
}

/** The lender figures on the given snapshots (the lenders' own), by company id. */
export async function readLenderFigures(prisma: PrismaClient, snapshots: { companyId: string; asOf: Date }[]): Promise<Map<string, LenderFigures>> {
  if (!snapshots.length) return new Map();
  const byDay = new Map<number, string[]>();
  for (const s of snapshots) byDay.set(s.asOf.getTime(), [...(byDay.get(s.asOf.getTime()) ?? []), s.companyId]);
  try {
    const rows = await prisma.kpiSnapshot.findMany({
      where: { OR: [...byDay].map(([t, ids]) => ({ asOf: new Date(t), companyId: { in: ids } })) },
      select: {
        companyId: true, gnpa: true, nnpa: true, finMargin: true, totalAssets: true, totalAssetsPrev: true, deposits: true,
        depositsPrev: true, npaQuarter: true, lenderNetProfit: true, bsYear: true, finMarginYear: true,
      },
    });
    return new Map(rows.map(({ companyId, ...c }) => [companyId, lenderFromColumns(c)]));
  } catch (e) {
    if (notMigrated(e, "lender columns")) return new Map();
    throw e;
  }
}

/** One InsurerMetric row, as read. */
export type InsurerMetricRow = {
  companyId: string;
  periodEnd: Date;
  period: string;
  vnbMargin: Num;
  embeddedValueCr: Num;
  combinedRatio: Num;
  solvencyRatio: Num;
  sourceUrl: string;
};

/** Each insurer's latest quarter, by company id. */
export async function readInsurerRows(prisma: PrismaClient, companyIds: string[]): Promise<Map<string, InsurerMetricRow>> {
  if (!companyIds.length) return new Map();
  try {
    // A few rows per insurer (one a quarter): all are read and the latest kept.
    const rows: InsurerMetricRow[] = await prisma.insurerMetric.findMany({
      where: { companyId: { in: companyIds } },
      select: { companyId: true, periodEnd: true, period: true, vnbMargin: true, embeddedValueCr: true, combinedRatio: true, solvencyRatio: true, sourceUrl: true },
    });
    const latest = new Map<string, InsurerMetricRow>();
    for (const r of rows) {
      const had = latest.get(r.companyId);
      if (!had || r.periodEnd > had.periodEnd) latest.set(r.companyId, r);
    }
    return latest;
  } catch (e) {
    if (notMigrated(e, "InsurerMetric table")) return new Map();
    throw e;
  }
}

/** An insurer's block: P/EV from the snapshot's market cap, freshness against the snapshot day. */
export function insurerFiguresFrom(r: InsurerMetricRow, mcap: string | null | undefined, today: Date): InsurerFigures {
  return {
    period: r.period,
    periodEnd: r.periodEnd.toISOString().slice(0, 10),
    vnbMargin: num(r.vnbMargin),
    pev: priceToEmbeddedValue(mcap, num(r.embeddedValueCr)),
    combinedRatio: num(r.combinedRatio),
    solvency: num(r.solvencyRatio),
    sourceUrl: r.sourceUrl,
    fresh: insurerFreshness(r.periodEnd, today),
  };
}
