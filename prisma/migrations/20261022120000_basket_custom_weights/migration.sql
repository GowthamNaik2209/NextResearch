-- Custom basket weighting. Additive only: a new flag (default false) and a nullable per-item
-- weight, so code that predates them keeps reading and writing baskets unchanged.

-- AlterTable
ALTER TABLE "Basket" ADD COLUMN     "customWeighting" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BasketItem" ADD COLUMN     "weight" DOUBLE PRECISION;
