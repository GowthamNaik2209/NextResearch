# Architecture

A map of how NextResearch fits together, so you can change it without surprises. For setup and
commands see the [README](../README.md).

## The big picture

```
 authored content (git)                    live data (fetched server-side, cached)
 ───────────────────────                   ─────────────────────────────────────────
 sector-content/products.ts   ──┐          Yahoo Finance (yahoo-finance2)  quote, price history
   zones, suppliers, 3D scene   │          Screener.in (HTML parse)        ratios, growth,
 prisma/seed-source/            │                                          shareholding, P&L,
   extracted.json (figures,     │                                          industry medians
   fallback news)               │          Google News RSS                 latest headlines
                                │                         │
                                ▼                         ▼
                  src/lib/sector-content/*        src/lib/live/*  ──►  /api/stock/[ticker][/chart]
                  (typed facade + derived         (cache, parsers)            │
                   numbers: stats, insights)                                  ▼
                                │                                    components/stock/*
                                └────────────► pages & components ◄──────────┘
```

Two rules shape most decisions:

1. **Live when possible, seed when not.** Every live source can fail (rate limits, markup
   changes, outages). The UI always renders from the seed figures first and overlays live data
   on top (`components/stock/merge.ts`), labelling what is live vs cached. Never make a screen
   depend on a live fetch succeeding.
2. **Server fetches third parties, the browser never does.** The browser only talks to our own
   `/api/stock/*` routes. Those routes only serve tickers present in our sector content
   (`findSupplierByTicker` is the allowlist), so they are not an open proxy.

## Data layers

### Authored sector content - `src/lib/sector-content/`

- `products.ts` - the big authored file (3D geometry + zones + suppliers for each sector).
  `@ts-nocheck` on purpose: it is scene content ported from the original artifact, not app
  data. **Do not import it from client components** (it is large); import *types* only.
- `index.ts` - the typed facade (`SectorDef`, `SectorZone`, `SectorSupplier`,
  `SupplierFinancials`) and lookups (`getSector`, `listSectors`, `findSupplierByTicker`).
- `exposure.ts` - cross-sector footprint (same ticker joined across sectors; also returned by `/api/stock/[ticker]` as `footprint`). `scenarios.ts` - authored "what if" shocks per sector (zone severity + headwind/tailwind) and the ranking of exposed companies; the explorer lights the zones via `controller.setImpact`. Zone ids are checked by `validate:content`.
- `stats.ts` - landing numbers and the search index; `insights.ts` - per-sector medians, the
  rule-based "idea" screens, and the news feed; `docs.ts` - the curated reading list.
- `SupplierFinancials` (`supplier.f`) holds the seed figures (5-year revenue, KPIs, price CAGR,
  52-week range). They are an *as of* snapshot (`DATA_AS_OF`) - the offline fallback.

### Live data - `src/lib/live/`

| File | Source | Used for | Cache |
| --- | --- | --- | --- |
| `yahoo.ts` | Yahoo Finance via `yahoo-finance2` | quote (~15 min delayed on NSE), price history, fallback fundamentals | 1 min quote, 5-60 min charts |
| `screener-company.ts` + `screener-ratios.ts` | Screener.in HTML | ratios, growth, shareholding, annual P&L, **industry median** (peers table footer) | 6 h |
| `news.ts` | Google News RSS | latest headlines per company, the platform/sector feed and watchlist news; curated seed headlines are the fallback | 15 min (Next data cache + in-process) |
| `cache.ts` | - | in-memory TTL cache with in-flight de-duplication; failed (null) loads are only remembered ~1 min | - |

News headlines are filtered to ones that are actually *about* the company (`isAbout`) and exclude
price-prediction pages and "stocks to watch/buy" tip lists. Aggregated feeds query the largest
companies per sector (bounded upstream requests); `<NewsFeed>` streams them behind a Suspense
skeleton so pages never wait on the news fetch.

Screener has no public API: we parse its HTML (one page + the peers table per company,
cached). It rate-limits bursts and the markup can change - the parsers are covered by tests
against saved fixtures in `lib/live/__fixtures__/`. If Screener is unreachable the Fundamentals
tab falls back to Yahoo's partial data and says so; if both fail it shows seed figures.

### Database (Postgres via Prisma)

Used for **users and the watchlist** (`Profile`, `Watchlist`). The `Company`, `FinancialSnapshot`,
`KpiSnapshot`, ... tables are seeded from `extracted.json` and the watchlist reads a company's
last price from them (`priceAtAdd`), but **no page reads company data from the DB any more** -
the stock UI is DB-free by design, which is why it works with an empty database.

## Routes

| Route | Type | Notes |
| --- | --- | --- |
| `/` | server | Landing page, composed of `components/landing/*` |
| `/sector/[slug]` | server | Sector overview; company cards open the stock pop-up directly |
| `/sector/[slug]/explore` | server shell + client | 3D explorer; deep links via `?zone=&company=` |
| `/updates`, `/docs`, `/docs/[slug]` | server | Live news feed (filter `?sector=`); reading list: 10-slide research deck per sector in a pop-up (`?report=<slug>` opens one) |
| `/connections` | server | Companies present in 2+ supply chains, ranked by footprint (`sector-content/exposure.ts`) |
| `/watchlist` | server | Auth required; rows open the stock pop-up |
| `/login`, `/signup`, `/auth/callback` | server | Supabase auth |
| `/api/stock/[ticker]` | route | `{ quote, fundamentals, news, newsLive }`, `s-maxage=300` |
| `/api/stock/[ticker]/chart?range=1M\|6M\|1Y\|3Y\|MAX` | route | price history |
| `/api/watchlist` | route | GET/POST/DELETE, Supabase session required |

## Frontend structure

- **Server vs client.** Pages are server components. Client components are the interactive
  islands: `HeroSearch`, `SectorBrowser`, `IdeasSection`, the explorer, and the stock pop-up.
  Props crossing the boundary must be plain data (the explorer re-looks-up its sector on the
  client because `SectorDef` carries functions).
- **Stock pop-up (`components/stock/`).** `StockModal` is the shell (portal, blur backdrop,
  Esc / ✕ / backdrop-click to close, tabs). It is opened from three places - the explorer panel
  (`SupplierDetail`), company cards and the watchlist (`OpenStockCard` -> `StockModalHost`). The
  tabs are `SummaryView`, `ChartView` (lightweight-charts, lazy-loaded), `NewsView`,
  `FundamentalsView`. `merge.ts` holds the live-over-seed rules.
- **3D explorer (`components/sector-explorer/`).** `SectorExplorer.tsx` is the React shell,
  `engine.ts` the imperative three.js engine it drives. `explorer.css` is **nested under
  `.nr-explorer`** (CSS nesting), so classes there only apply inside the explorer - code
  rendered through a portal (the stock pop-up) therefore uses Tailwind, not these classes.
- **Theming.** Colour tokens are CSS variables in `globals.css` (light is the default; dark via
  `data-theme="dark"` on `<html>`, set before paint by the inline script in `layout.tsx`).
  `explorer.css` mirrors the tokens because the explorer scopes its own copy - **change both
  together**. Use the semantic Tailwind colours (`bg-panel`, `text-ink`, `text-pos`, ...), never
  hex values.
- **Responsive.** Mobile-first breakpoints at 640 / 700 / 1000 / 1280 px. In the explorer on
  phones the Layers/Systems/Camera controls float over the stage and long write-ups collapse
  (see the phone block at the end of `explorer.css`).

## Conventions

- **Comments explain *why*** (constraints, gotchas, trade-offs) - the code shows what.
- **Add or unlock a sector / policy - complete the whole loop.** A sector is only done when every
  surface that lists companies knows about it. Checklist:
  1. Author it in `products.ts` (zones, suppliers with `f` figures, domains, `whyNow`,
     `thesisSummary`, `integratorZoneId`, exposure links, 3D model) and leave `muted` off.
  2. `scenarios.ts`: 3-4 "what if" shocks; `docs.ts`: reading links; `reports/<slug>.ts`: the research deck
     (register it in `reports/index.ts`; `npx tsx scripts/check-report.ts <slug>` checks one while authoring).
  3. `extracted.json` / `npm run db:extract` + `db:seed`, so every listed company has a `Company`
     row (the watchlist heart needs it) - and run the seed against staging/prod.
  4. Run `npm run validate:content` - it fails a live sector that lacks scenarios, reading links,
     an integrator zone or a thesis.
  5. Check by eye: landing card + stats, search, `/updates` chips, `/connections` (a company shared
     with another sector must show both), idea screens, `/docs`, the stock pop-up footprint, and the
     explorer on desktop *and* phone.
  Landing stats, search, news feed, ideas, connections and footprint all derive from the content
  (`!muted`), so nothing else should need a hand edit - if something does, that is a bug to fix.
- **Add a stock-pop-up tab:** add a view in `components/stock/`, register it in `StockModal`'s
  `TABS`, extend `StockTab` in `types.ts`.
- **Touching live data:** keep it behind `lib/live/` and the API routes; add/adjust a fixture
  test when a parser changes.
- **Before merging:** `npx tsc --noEmit && npm run lint && npm test && npm run validate:content`.
  Work lands on `staging` first, then `main` via PR.

## Known gaps / tech debt

- `SectorExplorer.tsx` (~700 lines) mixes layout, state and the zone panel - a candidate to
  split (rail / panel / header) next.
- `products.ts` is untyped (`@ts-nocheck`) authored content; `validate:content` is the only guard.
- Screener scraping is fragile and sits in a legal grey area (see the note in
  `screener-company.ts`); a licensed data vendor would replace `lib/live/screener-*`.
- Yahoo NSE quotes are ~15 minutes delayed; the UI says so. There is no streaming.
- News comes from Google News RSS (unofficial, headline + link only); the curated set in `extracted.json` is only the fallback. A licensed news API would be the upgrade path.
- The reading list (`/docs`) shows research decks from `sector-content/reports/` (authored industry text; company
  figures pulled from the supplier seed data) viewed in `components/research/ResearchDeck.tsx`.
- No CI: tests/lint/types/build are run by hand (see the checklist above). A GitHub Action
  running them on PRs would be the highest-leverage next step.
- No end-to-end tests; the interactive flows were verified manually/headlessly.
