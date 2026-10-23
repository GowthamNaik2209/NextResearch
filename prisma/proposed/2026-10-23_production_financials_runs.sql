-- PRODUCTION COPY - NOT APPLIED. Migration 20261023120000_financials_runs_and_picked_from, for
-- production's Supabase project: paste the whole file into the Supabase SQL editor (Database > SQL
-- editor) and run it once, when main carrying this migration is deployed.
--
-- What it does (additive only - nothing is dropped or rewritten):
--   * enum "FinancialsRunStatus" and table "FinancialsRun": the automatic daily refresh of the
--     company figures (src/lib/financials/refresh.ts), and one seeded PUBLISHED row holding the site
--     to the date its figures are on now, until the first automatic run publishes;
--   * nullable column "BasketItem"."pickedFrom" (the industry a basket stock was picked from);
--   * the matching row in "_prisma_migrations", so `prisma migrate status` / `migrate deploy` see the
--     migration as applied and never try to run it again.
--
-- Timing: run it right when main is deployed - ideally just BEFORE promoting the deployment, and no
-- later than right after. Code from before this migration ignores the new table and column, so
-- running it early is harmless. Code from after it reads "BasketItem"."pickedFrom" on every basket
-- query, so baskets fail to load until the column exists. (The company figures alone tolerate a
-- missing FinancialsRun table: they fall back to each company's latest snapshot.)
--
-- Idempotent: every statement checks first, so running it twice, or on a database where
-- `prisma migrate deploy` already applied the migration (e.g. one Supabase project shared with
-- staging), changes nothing the second time.
--
-- Afterwards: set CRON_SECRET in Vercel (Production and Preview) so the daily cron backstop
-- (/api/financials/refresh, 19:00 IST weekdays) is authorised. See docs/ARCHITECTURE.md
-- ("Company figures").

BEGIN;

DO $$ BEGIN
  CREATE TYPE "FinancialsRunStatus" AS ENUM ('RUNNING', 'PUBLISHED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "BasketItem" ADD COLUMN IF NOT EXISTS "pickedFrom" TEXT;

CREATE TABLE IF NOT EXISTS "FinancialsRun" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "FinancialsRun_snapshotDate_key" ON "FinancialsRun"("snapshotDate");

-- The date most tracked companies' latest snapshots share, recorded as published (no-op when a run
-- is already recorded, or on an empty database).
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
WHERE NOT EXISTS (SELECT 1 FROM "FinancialsRun")
ON CONFLICT ("snapshotDate") DO NOTHING;

-- Prisma's record of the migration (checksum = sha256 of prisma/migrations/20261023120000_financials_runs_and_picked_from/migration.sql).
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
SELECT gen_random_uuid()::text, 'ca4d565cbaeb64cc44ecf6eefefab809c895ac095da321c426ee2ca4d53a27ce', now(), '20261023120000_financials_runs_and_picked_from', NULL, NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20261023120000_financials_runs_and_picked_from');

COMMIT;
