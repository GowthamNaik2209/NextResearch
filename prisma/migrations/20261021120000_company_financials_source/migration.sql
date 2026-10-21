-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "financialsNote" TEXT,
ADD COLUMN     "screenOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tracked" BOOLEAN NOT NULL DEFAULT false;

