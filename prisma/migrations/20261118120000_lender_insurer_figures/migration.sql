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
