-- Institutional money for the FII / DII view on /updates (src/lib/flows). Additive only: four new tables
-- and two enums; nothing existing changes, and code that predates them is unaffected.

-- CreateEnum
CREATE TYPE "DealKind" AS ENUM ('BULK', 'BLOCK');

-- CreateEnum
CREATE TYPE "DealSide" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "Shareholding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quarter" DATE NOT NULL,
    "promoters" DOUBLE PRECISION,
    "fii" DOUBLE PRECISION,
    "dii" DOUBLE PRECISION,
    "government" DOUBLE PRECISION,
    "public" DOUBLE PRECISION,
    "others" DOUBLE PRECISION,
    "shareholders" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shareholding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketFlowDay" (
    "day" DATE NOT NULL,
    "fiiBuyCr" DOUBLE PRECISION,
    "fiiSellCr" DOUBLE PRECISION,
    "fiiNetCr" DOUBLE PRECISION,
    "diiBuyCr" DOUBLE PRECISION,
    "diiSellCr" DOUBLE PRECISION,
    "diiNetCr" DOUBLE PRECISION,
    "fiiIdxFutLong" INTEGER,
    "fiiIdxFutShort" INTEGER,
    "diiIdxFutLong" INTEGER,
    "diiIdxFutShort" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketFlowDay_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "SectorFpiFlow" (
    "id" TEXT NOT NULL,
    "periodEnd" DATE NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "netEquityCr" DOUBLE PRECISION NOT NULL,
    "aucEquityCr" DOUBLE PRECISION,

    CONSTRAINT "SectorFpiFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkDeal" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" "DealKind" NOT NULL,
    "symbol" TEXT NOT NULL,
    "securityName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "side" "DealSide" NOT NULL,
    "quantity" BIGINT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BulkDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shareholding_companyId_quarter_key" ON "Shareholding"("companyId", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "SectorFpiFlow_periodEnd_sector_key" ON "SectorFpiFlow"("periodEnd", "sector");

-- CreateIndex
CREATE INDEX "BulkDeal_day_idx" ON "BulkDeal"("day");

-- CreateIndex
CREATE INDEX "BulkDeal_symbol_day_idx" ON "BulkDeal"("symbol", "day");

-- AddForeignKey
ALTER TABLE "Shareholding" ADD CONSTRAINT "Shareholding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

