# NextResearch

Fund-level research for India's public markets: pick a sector, explore its supply
chain as a 3D model, deep-dive into any company's financials. See
`/Users/gowtham/.claude/plans/breezy-booping-spindle.md` for the design this
implements and the step-by-step build order.

## Status (end of Step 2 — foundation)

- Next.js (App Router) + TypeScript + Tailwind, Postgres via Prisma, Supabase Auth.
- All 7 sectors from the original artifact ported: static 3D content
  (`src/lib/sector-content/products.ts`) + 169 companies seeded into the database
  (financials, KPIs, curated news) from `prisma/seed-source/extracted.json`.
- Sector picker (`/`), the 3D explorer (`/sector/[slug]`) with live company data
  fetched per click, email/password + Google login (`/login`, `/signup`).
- Not yet built: the standalone company research page (`/company/[ticker]`),
  watchlist, billing/paywall — see the plan file's Steps 3–5.

**Known gap, by design:** the seeded data only has 5yr revenue/net-profit, one KPI
snapshot, 52-week price range, and curated news for ~25 flagship names — not full
3-statement line items or daily price history (no data vendor is wired up yet; see
the plan file's "Data reality" note). The schema and UI are already built for the
full version so swapping in a real vendor later is a data change, not a rebuild.

## First-time setup

```bash
npm install
```

You need a Supabase project for auth (and, for anything beyond local dev, for
Postgres too). See `SETUP.md` for exact steps. Without it, the app still runs and
renders — sign-in just won't work.

```bash
cp .env.example .env.local   # then fill in Supabase values
# DATABASE_URL goes in .env (Prisma only reads that file, not .env.local) — either
# point it at your Supabase project's Postgres, or run a local scratch DB:
npx prisma dev
```

Then apply the schema and load the seed data:

```bash
npx prisma migrate dev
npm run db:seed
```

## Run it

```bash
npm run dev
```

Open http://localhost:3000.

## Regenerating the seed data

If the original artifact changes, re-extract and re-seed:

```bash
npm run db:extract   # prisma/seed-source/extracted.json from artifact-data-slice.js
npm run db:seed
```

`prisma/seed-source/artifact-data-slice.js` is the data-only slice of the artifact
(zones/suppliers/financials — no DOM/three.js engine code); replace it if a newer
artifact iteration exists, then re-run the two commands above.
