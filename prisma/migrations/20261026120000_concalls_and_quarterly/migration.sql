-- Earnings-call history and quarterly results (src/lib/concalls, src/lib/financials/quarterly.ts).
-- Additive only: seven new tables and one nullable Company column; nothing existing changes.

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "bseCode" TEXT;

-- CreateTable
CREATE TABLE "QuarterlyResult" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "periodEnd" DATE NOT NULL,
    "basis" TEXT NOT NULL,
    "revenueCr" DECIMAL(65,30),
    "expensesCr" DECIMAL(65,30),
    "operatingProfitCr" DECIMAL(65,30),
    "opmPct" DECIMAL(65,30),
    "otherIncomeCr" DECIMAL(65,30),
    "depreciationCr" DECIMAL(65,30),
    "interestCr" DECIMAL(65,30),
    "pbtCr" DECIMAL(65,30),
    "netProfitCr" DECIMAL(65,30),
    "epsRs" DECIMAL(65,30),
    "source" TEXT NOT NULL DEFAULT 'screener',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterlyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallFiling" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL,
    "fiscalYear" INTEGER,
    "quarter" INTEGER,
    "pdfSha256" TEXT,
    "pages" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'found',
    "error" TEXT,
    "batchId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcallFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallSummary" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "callDate" DATE,
    "tone" TEXT NOT NULL,
    "toneNote" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "checksPassed" INTEGER NOT NULL,
    "checksTotal" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcallSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallGuidance" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "periodKind" TEXT NOT NULL,
    "targetFiscalYear" INTEGER,
    "targetQuarter" INTEGER,
    "low" DECIMAL(65,30),
    "high" DECIMAL(65,30),
    "unit" TEXT,
    "direction" TEXT,
    "statement" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "actual" DECIMAL(65,30),
    "actualNote" TEXT,
    "verdict" TEXT,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "ConcallGuidance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallDigest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "throughKey" INTEGER NOT NULL,
    "digest" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "costUsd" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcallDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallRollup" (
    "id" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "rollup" JSONB NOT NULL,
    "companies" TEXT[],
    "model" TEXT NOT NULL,
    "costUsd" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcallRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcallRun" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "found" INTEGER NOT NULL DEFAULT 0,
    "batched" INTEGER NOT NULL DEFAULT 0,
    "summarised" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcallRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyResult_companyId_fiscalYear_quarter_key" ON "QuarterlyResult"("companyId", "fiscalYear", "quarter");

-- CreateIndex
CREATE INDEX "ConcallFiling_companyId_filedAt_idx" ON "ConcallFiling"("companyId", "filedAt");

-- CreateIndex
CREATE INDEX "ConcallFiling_status_idx" ON "ConcallFiling"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConcallFiling_exchange_exchangeId_key" ON "ConcallFiling"("exchange", "exchangeId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcallSummary_filingId_key" ON "ConcallSummary"("filingId");

-- CreateIndex
CREATE INDEX "ConcallSummary_companyId_fiscalYear_quarter_idx" ON "ConcallSummary"("companyId", "fiscalYear", "quarter");

-- CreateIndex
CREATE INDEX "ConcallGuidance_companyId_metric_targetFiscalYear_idx" ON "ConcallGuidance"("companyId", "metric", "targetFiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "ConcallDigest_companyId_scope_key" ON "ConcallDigest"("companyId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "ConcallRollup_sectorSlug_fiscalYear_quarter_key" ON "ConcallRollup"("sectorSlug", "fiscalYear", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "ConcallRun_day_key" ON "ConcallRun"("day");

-- AddForeignKey
ALTER TABLE "QuarterlyResult" ADD CONSTRAINT "QuarterlyResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallFiling" ADD CONSTRAINT "ConcallFiling_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallSummary" ADD CONSTRAINT "ConcallSummary_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "ConcallFiling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallSummary" ADD CONSTRAINT "ConcallSummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallGuidance" ADD CONSTRAINT "ConcallGuidance_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "ConcallSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallGuidance" ADD CONSTRAINT "ConcallGuidance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcallDigest" ADD CONSTRAINT "ConcallDigest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

