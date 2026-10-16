# NextResearch

Supply-chain research for India's public markets. Pick an industry or policy, explore its
supply chain as a 3D model, see which listed companies sit in each layer, and open any
company for live price, chart, fundamentals vs its industry, and news.

> Information and research only - nothing here is investment advice.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
three.js (3D explorer) · lightweight-charts · Supabase Auth · Postgres via Prisma 7.

> This repo targets a Next.js version with breaking changes from older docs - read
> `AGENTS.md` and the guides in `node_modules/next/dist/docs/` before touching framework code.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Browsing works with **no setup at all**: the landing page, sector pages, the 3D explorer and
the live stock data (Yahoo Finance + Screener.in, fetched server-side) need no database and no
keys. You only need the next step for **login and the watchlist**:

```bash
cp .env.example .env.local   # Supabase URL/key + site URL
# DATABASE_URL goes in .env (Prisma reads only .env), see SETUP.md
npx prisma migrate dev && npm run db:seed
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve the build |
| `npx eslint src scripts` | ESLint over the app (must be clean; `npm run lint` also scans the git-ignored `media/` folder) |
| `npm test` | Unit tests (Node's built-in runner via `tsx`) - parsers, merge rules, idea screens |
| `npm run validate:content` | Integrity checks over the authored sector content |
| `npm run db:migrate` / `db:seed` | Prisma migration / seed (writes to the shared live database - ask first) |
| `npx tsx prisma/extract-source-data.ts` | Regenerate `extracted.json` from `products.ts` |
| `npx tsx scripts/check-report.ts <slug>` | Check one research deck |

Before opening a PR: `npx tsc --noEmit && npx eslint src scripts && npm test && npm run validate:content`,
then `next build` and the QA routine in [docs/PLAYBOOK.md](docs/PLAYBOOK.md).

## Where things live

```
src/app/                    Routes (server components) + API routes
  api/stock/[ticker]/       Live quote + fundamentals + news, and /chart?range=
  api/watchlist/            Auth'd watchlist CRUD (Supabase + Prisma)
src/components/
  landing/                  Home-page sections (Hero, StatsStrip, FaqSection, ...)
  stock/                    The stock pop-up: Summary / Chart / News / Fundamentals
  sector-explorer/          3D explorer (React shell + three.js engine + CSS)
src/lib/
  sector-content/           The authored data layer (sectors, zones, suppliers) + derived numbers
  live/                     Server-side live data: Yahoo, Screener, cache
prisma/                     Schema, migrations, seed
docs/ARCHITECTURE.md        How the pieces fit - start here before a big change
docs/PLAYBOOK.md            Recipes: add a sector, build a 3D model, QA + release, lessons learned
```

**Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the data flow (what is live, what is
cached, what falls back to what), conventions, and known gaps.

## Refreshing the seed data

`prisma/seed-source/extracted.json` holds the extracted company figures and curated news. It is
read directly by the app (fallback figures, news feed) and loaded into Postgres by the seed:

```bash
npx tsx prisma/extract-source-data.ts   # products.ts -> extracted.json
npm run db:seed                         # shared live DB: get a go-ahead first
```

(`npm run db:extract` still points at the original one-off artifact extractor; don't use it.)

Deployment notes live in `vercel.json` / `SETUP.md`.
