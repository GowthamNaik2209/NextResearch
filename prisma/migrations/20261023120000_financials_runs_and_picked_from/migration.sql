-- Automatic refresh of the company table, and where a basket stock was picked from. Additive only:
-- a new enum and table, one nullable column, and one data row; code that predates them is unaffected.

-- CreateEnum
CREATE TYPE "FinancialsRunStatus" AS ENUM ('RUNNING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "BasketItem" ADD COLUMN     "pickedFrom" TEXT;

-- CreateTable
CREATE TABLE "FinancialsRun" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "status" "FinancialsRunStatus" NOT NULL DEFAULT 'RUNNING',
    "done" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "failed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "leaseUntil" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialsRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialsRun_snapshotDate_key" ON "FinancialsRun"("snapshotDate");

-- Data: record the date the site's figures are on as published, so the app keeps showing one date
-- until the first automatic run publishes. That is the date most tracked companies' latest snapshots
-- share (not simply the newest: a hand run that stopped part-way leaves a few newer snapshots, which
-- stay hidden until a run for their date publishes). No-op on an empty database.
INSERT INTO "FinancialsRun" ("id", "snapshotDate", "status", "publishedAt")
SELECT 'seed-' || to_char(d, 'YYYYMMDD'), d, 'PUBLISHED', CURRENT_TIMESTAMP
FROM (
  SELECT latest AS d
  FROM (
    SELECT max(k."asOf") AS latest
    FROM "KpiSnapshot" k JOIN "Company" c ON c."id" = k."companyId"
    WHERE c."tracked"
    GROUP BY k."companyId"
  ) per_company
  GROUP BY latest
  ORDER BY count(*) DESC, latest DESC
  LIMIT 1
) common
ON CONFLICT ("snapshotDate") DO NOTHING;
