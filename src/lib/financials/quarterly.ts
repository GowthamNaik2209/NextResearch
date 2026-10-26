// Quarterly results from Screener (QuarterlyResult in prisma/schema.prisma). STUB: signatures are the
// contract the concall daily job relies on; the implementation is being written.
import type { PrismaClient } from "@/generated/prisma/client";

export type QuarterlyRow = {
  fiscalYear: number;
  quarter: 1 | 2 | 3 | 4;
  periodEnd: Date;
  revenueCr: number | null;
  expensesCr: number | null;
  operatingProfitCr: number | null;
  opmPct: number | null;
  otherIncomeCr: number | null;
  depreciationCr: number | null;
  interestCr: number | null;
  pbtCr: number | null;
  netProfitCr: number | null;
  epsRs: number | null;
};

export type QuarterlyFetch = { basis: "consolidated" | "standalone"; bseCode: string | null; rows: QuarterlyRow[] };

/** Read one company's quarterly table (and BSE scrip code) from its Screener page. No DB access. */
export async function fetchQuarterly(ticker: string, financialsNote: string | null): Promise<QuarterlyFetch> {
  void ticker;
  void financialsNote;
  throw new Error("not implemented");
}

/** Fetch + upsert QuarterlyResult rows and set Company.bseCode when it was null. */
export async function refreshCompanyQuarterly(
  prisma: PrismaClient,
  company: { id: string; ticker: string; financialsNote: string | null; bseCode: string | null },
): Promise<{ written: number; bseCode: string | null; basis: string }> {
  void prisma;
  void company;
  throw new Error("not implemented");
}
