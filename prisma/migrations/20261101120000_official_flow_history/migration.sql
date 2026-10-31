-- Official confirmed FII/DII history for the FII / DII view's longer periods (src/lib/flows). Additive only:
-- three nullable columns on MarketFlowDay; nothing existing changes.

-- AlterTable
ALTER TABLE "MarketFlowDay" ADD COLUMN     "diiNsdlNetCr" DOUBLE PRECISION,
ADD COLUMN     "fpiNsdlNetCr" DOUBLE PRECISION,
ADD COLUMN     "mfSebiNetCr" DOUBLE PRECISION;

