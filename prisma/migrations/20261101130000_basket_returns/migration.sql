-- Stored basket figures per period (src/lib/baskets/basket-returns.ts). Additive only: one new
-- table; nothing existing changes, and code that predates it is unaffected.

-- CreateTable
CREATE TABLE "BasketReturn" (
    "slug" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "ret" DOUBLE PRECISION NOT NULL,
    "maxDd" DOUBLE PRECISION NOT NULL,
    "vs" DOUBLE PRECISION,
    "asOf" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasketReturn_pkey" PRIMARY KEY ("slug","period")
);
