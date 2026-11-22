-- Lender figures on each day's KpiSnapshot (src/lib/financials/lender.ts), standalone basis: NPAs,
-- financing margin, net profit, total assets and deposits, and the periods they are for. Additive only: nullable columns, null for every company that is not a
-- lender; nothing existing changes.

-- AlterTable
ALTER TABLE "KpiSnapshot" ADD COLUMN     "gnpa" DECIMAL(65,30),
ADD COLUMN     "nnpa" DECIMAL(65,30),
ADD COLUMN     "finMargin" DECIMAL(65,30),
ADD COLUMN     "totalAssets" DECIMAL(65,30),
ADD COLUMN     "totalAssetsPrev" DECIMAL(65,30),
ADD COLUMN     "deposits" DECIMAL(65,30),
ADD COLUMN     "depositsPrev" DECIMAL(65,30),
ADD COLUMN     "npaQuarter" TEXT,
ADD COLUMN     "lenderNetProfit" DECIMAL(65,30),
ADD COLUMN     "bsYear" TEXT,
ADD COLUMN     "finMarginYear" TEXT;

-- Insurers' quarterly figures, kept by hand from public disclosures (data/insurer-metrics.json).
-- New table only; nothing existing changes.

-- CreateTable
CREATE TABLE "InsurerMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodEnd" DATE NOT NULL,
    "period" TEXT NOT NULL,
    "vnbMargin" DECIMAL(65,30),
    "embeddedValueCr" DECIMAL(65,30),
    "combinedRatio" DECIMAL(65,30),
    "solvencyRatio" DECIMAL(65,30),
    "sourceUrl" TEXT NOT NULL,
    "readOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsurerMetric_companyId_periodEnd_key" ON "InsurerMetric"("companyId", "periodEnd");

-- AddForeignKey
ALTER TABLE "InsurerMetric" ADD CONSTRAINT "InsurerMetric_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
