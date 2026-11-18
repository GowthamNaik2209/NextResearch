import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@/generated/prisma/client";
import { insurerFiguresFrom, lenderFromColumns, readInsurerRows, readLenderFigures } from "./blocks";
import { rowToFinancials, type CompanyFinRow } from "./rows";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const AS_OF = day("2026-11-17");

const cols = {
  companyId: "c1", gnpa: 1.2, nnpa: 0.3, finMargin: 12, totalAssets: 1100, totalAssetsPrev: 900, deposits: 880, depositsPrev: 800,
  npaQuarter: "Sep 2026", lenderNetProfit: 100, bsYear: "Mar 2026", finMarginYear: "Mar 2026",
};

// A stand-in for the Prisma client: only the two reads the blocks make.
function fakePrisma(kpi: () => Promise<unknown[]>, insurer: () => Promise<unknown[]> = async () => []) {
  const calls: unknown[] = [];
  const prisma = {
    kpiSnapshot: { findMany: (a: unknown) => (calls.push(a), kpi()) },
    insurerMetric: { findMany: (a: unknown) => (calls.push(a), insurer()) },
  } as unknown as PrismaClient;
  return { prisma, calls };
}

test("lender columns read back into the lender block", () => {
  assert.deepEqual(lenderFromColumns(cols), {
    gnpa: 1.2, nnpa: 0.3, finMargin: 12, finMarginYear: "Mar 2026", netProfit: 100,
    totalAssets: [1100, 900], deposits: [880, 800], bsYear: "Mar 2026", quarter: "Sep 2026",
  });
  assert.equal(lenderFromColumns({ ...cols, deposits: null, depositsPrev: null }).deposits, null);
});

test("lender figures are read for the lenders' own snapshots", async () => {
  const { prisma, calls } = fakePrisma(async () => [cols]);
  const got = await readLenderFigures(prisma, [{ companyId: "c1", asOf: AS_OF }]);
  assert.equal(got.get("c1")?.netProfit, 100);
  assert.equal(calls.length, 1);
  assert.equal((await readLenderFigures(prisma, [])).size, 0);
  assert.equal(calls.length, 1, "no lenders, no query");
});

test("before the migration (no lender columns) the read gives no lender figures instead of failing", async () => {
  for (const e of [
    Object.assign(new Error("The column `KpiSnapshot.gnpa` does not exist in the current database."), { code: "P2022" }),
    new Error('column "gnpa" does not exist'),
  ]) {
    const { prisma } = fakePrisma(async () => { throw e; });
    assert.equal((await readLenderFigures(prisma, [{ companyId: "c1", asOf: AS_OF }])).size, 0);
  }
  // Any other failure still fails the table (it is retried; the installed copy is kept).
  const { prisma } = fakePrisma(async () => { throw Object.assign(new Error("Timed out"), { code: "P1008" }); });
  await assert.rejects(readLenderFigures(prisma, [{ companyId: "c1", asOf: AS_OF }]), /Timed out/);
});

const insurerRow = (periodEnd: string, period: string) => ({
  companyId: "i1", periodEnd: day(periodEnd), period, vnbMargin: 25.5, embeddedValueCr: 50000, combinedRatio: null, solvencyRatio: 1.9,
  sourceUrl: "https://example.com/q.pdf",
});

test("each insurer's latest quarter is kept; no InsurerMetric table yet gives none", async () => {
  const { prisma } = fakePrisma(async () => [], async () => [insurerRow("2026-06-30", "Q1 FY27"), insurerRow("2026-09-30", "Q2 FY27")]);
  assert.equal((await readInsurerRows(prisma, ["i1"])).get("i1")?.period, "Q2 FY27");
  const missing = fakePrisma(async () => [], async () => { throw Object.assign(new Error("The table `public.InsurerMetric` does not exist in the current database."), { code: "P2021" }); });
  assert.equal((await readInsurerRows(missing.prisma, ["i1"])).size, 0);
  const down = fakePrisma(async () => [], async () => { throw new Error("Connection terminated"); });
  await assert.rejects(readInsurerRows(down.prisma, ["i1"]), /Connection terminated/);
});

test("insurer figures carry P/EV from the market cap and freshness against the snapshot day", () => {
  const f = insurerFiguresFrom(insurerRow("2026-09-30", "Q2 FY27"), "Rs 1,00,000 Cr", AS_OF);
  assert.deepEqual(f, {
    period: "Q2 FY27", periodEnd: "2026-09-30", vnbMargin: 25.5, pev: 2, combinedRatio: null, solvency: 1.9,
    sourceUrl: "https://example.com/q.pdf", fresh: "fresh",
  });
  assert.equal(insurerFiguresFrom(insurerRow("2026-03-31", "Q4 FY26"), null, AS_OF).fresh, "stale");
});

const row = (ticker: string): CompanyFinRow => ({
  ticker, screenerSlug: null, externalId: null, financialsNote: null, screenOut: false, financials: [],
  kpis: [{ asOf: AS_OF, price: 100, marketCap: "Rs 1,00,000 Cr", pe: null, bookValue: null, divYield: null, roce: null, roe: null, faceValue: null, low52w: null, high52w: null, cagr1y: null, cagr3y: null, cagr5y: null }],
});

test("every row carries its kind; the lender block only on lenders, the insurer block only on insurers", () => {
  const op = rowToFinancials(row("TCS"), { lender: lenderFromColumns(cols), insurer: insurerRow("2026-09-30", "Q2 FY27") });
  assert.equal(op.kind, "operating");
  assert.ok(!("lender" in op) && !("insurer" in op));

  const bank = rowToFinancials(row("HDFCBANK"), { lender: lenderFromColumns(cols) });
  assert.equal(bank.kind, "lender");
  assert.equal(bank.lender?.roa, 10);
  assert.ok(!("insurer" in bank));
  // A lender with no block read (columns not there yet, or not refreshed) shows none.
  assert.equal(rowToFinancials(row("HDFCBANK")).lender, null);

  const life = rowToFinancials(row("HDFCLIFE"), { insurer: insurerRow("2026-09-30", "Q2 FY27") });
  assert.equal(life.kind, "insurer");
  assert.equal(life.insurer?.pev, 2);
  assert.ok(!("lender" in life));
  assert.equal(rowToFinancials(row("HDFCLIFE")).insurer, null);
});

test("a lender's or insurer's ROCE is not a number on the row, so no surface can show one; other figures stay", () => {
  const withKpis = (ticker: string): CompanyFinRow => {
    const r = row(ticker);
    return { ...r, kpis: [{ ...r.kpis[0], pe: 18, bookValue: 600, roce: 7.5, roe: 16.4 }] };
  };
  for (const t of ["HDFCBANK", "RECLTD", "HDFCLIFE", "ICICIGI"]) {
    const f = rowToFinancials(withKpis(t));
    assert.equal(f.kpi?.[3], null, t);
    assert.equal(f.kpi?.[0], 18, `${t} P/E`);
    assert.equal(f.kpi?.[4], 16.4, `${t} ROE`);
  }
  assert.equal(rowToFinancials(withKpis("TCS")).kpi?.[3], 7.5);
});
