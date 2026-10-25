-- The price store: daily bars for every mapped stock and benchmark (src/lib/prices). Additive only:
-- three new tables; nothing existing changes, and code that predates them is unaffected.

-- CreateTable
CREATE TABLE "PriceSeries" (
    "key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'NSE',
    "firstDay" DATE,
    "lastDay" DATE,
    "checkedDay" DATE,
    "fullAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSeries_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PriceBar" (
    "key" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,

    CONSTRAINT "PriceBar_pkey" PRIMARY KEY ("key","day")
);

-- CreateTable
CREATE TABLE "PriceRun" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "done" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "failed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "finishedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceRun_day_key" ON "PriceRun"("day");
