-- PROPOSAL - NOT APPLIED. Database cleanup drafted on 22 Oct 2026 (backend audit).
--
-- This file is deliberately outside prisma/migrations so `prisma migrate` never sees it as pending
-- or applied. Nothing here has been run. There is ONE Supabase project shared by staging and
-- production, so every statement below changes live data.
--
-- BEFORE RUNNING ANY SECTION:
--   * Take a backup first (Supabase dashboard > Database > Backups, or
--     `pg_dump "$DIRECT_URL" --format=custom --file=nextresearch-YYYY-MM-DD.dump`).
--   * Run each section on its own, in the SQL editor or psql over the direct / session connection
--     (port 5432), not the transaction pooler.
--   * Deploy the code that no longer models these tables/columns (prisma/schema.prisma as of this
--     date) to staging AND production first; the old code still selects some of these columns
--     (e.g. Company.dataStatus, Company.notes), and would fail once they are gone.
--   * After applying, record it so Prisma's history matches the database: either turn the parts you
--     applied into a migration (`prisma migrate diff --from-migrations prisma/migrations
--     --to-schema prisma/schema.prisma --script` should then print nothing for them) and
--     `prisma migrate resolve --applied <name>`, or run `prisma migrate dev --create-only` on a
--     scratch database and mark it applied here.


-- ---------------------------------------------------------------------------------------------
-- 1. Unused tables and enums
-- Prerequisite: none of these is read or written by any code (checked 22 Oct 2026: src, scripts,
-- prisma). NewsLink's curated news is read by the app from prisma/seed-source/extracted.json, not
-- from this table. Subscription is empty unless payments were wired since (check the count first).
-- Take a backup first.
-- ---------------------------------------------------------------------------------------------
BEGIN;
-- SELECT count(*) FROM "Subscription";  -- expect 0
DROP TABLE IF EXISTS "FinancialStatementLine";
DROP TABLE IF EXISTS "PriceSnapshot";
DROP TABLE IF EXISTS "NewsLink";
DROP TABLE IF EXISTS "Subscription";
DROP TYPE IF EXISTS "StatementType";
DROP TYPE IF EXISTS "SubscriptionPlan";
DROP TYPE IF EXISTS "SubscriptionStatus";
COMMIT;


-- ---------------------------------------------------------------------------------------------
-- 2. Unused columns
-- Prerequisite: the code deployed everywhere no longer selects them (see the top). All are nullable
-- or have a default, so the current code already inserts without them. Take a backup first.
-- ---------------------------------------------------------------------------------------------
BEGIN;
ALTER TABLE "Company" DROP COLUMN IF EXISTS "dataStatus";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "sectorSlugs";
ALTER TABLE "KpiSnapshot" DROP COLUMN IF EXISTS "note";
DROP TYPE IF EXISTS "DataStatus";
COMMIT;


-- ---------------------------------------------------------------------------------------------
-- 3. A default for Company.role
-- Company.role is NOT NULL with no default, so every insert must name it (the schema still models
-- it for that reason). With a default the column can later be dropped from the Prisma schema, or
-- left as an optional label. Safe to run at any time. Take a backup first.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE "Company" ALTER COLUMN "role" SET DEFAULT '';


-- ---------------------------------------------------------------------------------------------
-- 4. Lock the public schema to the app's own connection (Row Level Security)
-- Supabase exposes the public schema through its REST/GraphQL API to the `anon` and `authenticated`
-- roles (the anon key is in the browser bundle). The app never reads data that way: every query goes
-- through Prisma as the `postgres` role, which owns these tables and so bypasses RLS. Enabling RLS
-- with no policies, and revoking the API roles' grants, closes that door without affecting the app.
-- Prerequisites:
--   * DATABASE_URL's user is `postgres` (or `postgres.<project-ref>` on the pooler) - check before
--     running; a non-owner role would be locked out too.
--   * No code uses supabase-js `.from(...)` / `.rpc(...)` for these tables (true on 22 Oct 2026:
--     supabase-js is used for auth only).
-- Take a backup first.
-- ---------------------------------------------------------------------------------------------
BEGIN;
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
-- Tables, sequences and functions created later (new migrations, run as postgres) start closed too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
COMMIT;
-- Note: a migration that adds a table later should also `ENABLE ROW LEVEL SECURITY` on it.


-- ---------------------------------------------------------------------------------------------
-- 5. Optional: index Watchlist(companyId)
-- The unique (userId, companyId) index serves "a user's watchlist"; deleting or renaming a Company
-- (the cascade to Watchlist) scans the table without this one. Only worth it once Watchlist is
-- large. CONCURRENTLY avoids locking the table but can't run inside a transaction block.
-- Take a backup first.
-- ---------------------------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Watchlist_companyId_idx" ON "Watchlist" ("companyId");
-- If applied, add `@@index([companyId])` to model Watchlist in prisma/schema.prisma.


-- ---------------------------------------------------------------------------------------------
-- 6. KpiSnapshot retention
-- Every refresh run adds one snapshot per company; the app reads only the latest. This keeps, per
-- company, the latest snapshot plus the last snapshot of each calendar month (a monthly history),
-- and deletes the rest.
-- Prerequisites: nothing reads older snapshots (true on 22 Oct 2026: src/lib/financials/query.ts
-- reads the latest only); run it after a refresh has completed, not during one. Preview with the
-- SELECT first. Take a backup first.
-- ---------------------------------------------------------------------------------------------
-- Preview: how many rows would go.
-- WITH ranked AS (
--   SELECT "id",
--          row_number() OVER (PARTITION BY "companyId" ORDER BY "asOf" DESC) AS latest_rank,
--          row_number() OVER (PARTITION BY "companyId", date_trunc('month', "asOf") ORDER BY "asOf" DESC) AS month_rank
--   FROM "KpiSnapshot"
-- )
-- SELECT count(*) FROM ranked WHERE latest_rank > 1 AND month_rank > 1;
BEGIN;
WITH ranked AS (
  SELECT "id",
         row_number() OVER (PARTITION BY "companyId" ORDER BY "asOf" DESC) AS latest_rank,
         row_number() OVER (PARTITION BY "companyId", date_trunc('month', "asOf") ORDER BY "asOf" DESC) AS month_rank
  FROM "KpiSnapshot"
)
DELETE FROM "KpiSnapshot" k
USING ranked r
WHERE k."id" = r."id" AND r.latest_rank > 1 AND r.month_rank > 1;
COMMIT;
