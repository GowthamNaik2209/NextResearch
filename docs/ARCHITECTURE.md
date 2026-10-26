# Architecture

A map of how NextResearch fits together, so you can change it without surprises. For setup and
commands see the [README](../README.md); for step-by-step recipes (adding a sector, building a
3D model, the QA and release routine, and lessons learned) see the [Playbook](PLAYBOOK.md).

## The big picture

```
 authored content (git)                    live data (fetched server-side, cached)
 ───────────────────────                   ─────────────────────────────────────────
 sector-content/sectors/*.ts  ──┐          Yahoo Finance (yahoo-finance2)  quote, price history
   zones, suppliers (tickers),  │          Screener.in (HTML parse)        ratios, growth,
   3D scene                     │                                          shareholding, P&L,
 prisma/seed-source/            │                                          industry medians
   extracted.json (fallback     │          Google News RSS                 latest headlines
   news)                        │                         │
                                │                         │
 Postgres company table ────────┤  (src/lib/financials/: │
   figures per ticker, written  │   cached loader fills   │
   by refresh-financials.ts     │   every supplier.f)     │
                                ▼                         ▼
                  src/lib/sector-content/*        src/lib/live/*  ──►  /api/stock/[ticker][/chart]
                  (typed facade + derived         (cache, parsers)            │
                   numbers: stats, insights)                                  ▼
                                │                                    components/stock/*
                                └────────────► pages & components ◄──────────┘
```

Two rules shape most decisions:

1. **Live when possible, stored figures when not.** Every live source can fail (rate limits, markup
   changes, outages). The UI always renders from the company table's figures first and overlays live data
   on top (`components/stock/merge.ts`), labelling what is live vs cached. Never make a screen
   depend on a live fetch succeeding.
2. **Server fetches third parties, the browser never does.** The browser only talks to our own
   `/api/stock/*` routes. Those routes only serve tickers present in our sector content
   (`findSupplierByTicker` is the allowlist), so they are not an open proxy.

## Data layers

### Authored sector content - `src/lib/sector-content/`

- **One module per sector:** `sectors/<slug>.ts` (zones, suppliers, views, deep dive, the
  `build` hook) + `models/<slug>.ts` (geometry, `ANCHORS`/`VIEWS`). Policies keep their content in
  `policies/<slug>.ts` and `sectors/<slug>.ts` just binds it. `sectors/shared.ts` holds `co()`,
  `ASOF`, `SRC`. The industry modules type-check by inference (no `@ts-nocheck`); `SectorDef` is
  the shape and `validate:content` the guard for the graph.
- `products.ts` - the registry: imports every sector module in site order (also the tie-break
  for a company's home sector) plus the curated `NEWS` for the extract script.
- `core.ts` - types (`SectorDef`, `SectorZone`, `SectorSupplier`, `SupplierFinancials`) and pure
  helpers (link weights, labels, `tickerForSupplier`, `resolveSupplierKey`, `parseCrore`). **Client
  components import from here** (or `import type`), never from `index.ts`.
- `index.ts` - re-exports `core.ts` and adds the registry lookups (`getSector`, `listSectors`,
  `findSupplierByTicker`, `primaryLink`). It pulls in every sector, so it is for server code,
  scripts and tests.
- `sectors/load.ts` - the browser's loader: `loadSector(slug)` is one dynamic import per sector,
  so `/sector/<slug>/explore` downloads only its own sector (SectorExplorer reads it with
  `use()`). Its slug list must match `products.ts` (validate:content + `sector-load.test.ts`).
  A company in several sectors has one supplier record *per sector*; `findSupplierByTicker` (and
  `companies.ts` `primaryAppearance`) pick the record from its **strongest link** (`linkWeight`:
  high > medium > low, enablers/indirect lower), so the pop-up and company page describe it alike.
- **Financials live in one place per ticker: the company table in the database** (see "Company
  figures" below), never in the content files. Supplier rows say only `f: co("TICKER", "optional
  sector note")`; the loader fills that object with the ticker's figures and joins the company note
  with the sector note. A ticker the content names but the table lacks fails loudly (add it with
  `refresh-financials.ts --add`). Each company's `asOf` is the date of its latest snapshot, shown
  on company pages and the pop-up. `Company.screenOut` keeps a company whose latest year is
  dominated by a one-off (SPARC's FY26 voucher sale) out of the idea screens.
- **Zones carry `layer`** (index into `layerNames`): picking the zone peels the 3D model to the
  layer where that part is visible. Views may carry `layer` too ("Underground" -> Land & Capital).
  `validate:content` requires a valid `layer` on every zone of a live sector.
- `exposure.ts` - cross-sector footprint (same ticker joined across sectors; also returned by `/api/stock/[ticker]` as `footprint`). `scenarios.ts` - authored "what if" shocks per sector (zone severity + headwind/tailwind) and the ranking of exposed companies; the explorer lights the zones via `controller.setImpact`. Zone ids are checked by `validate:content`.
- `stats.ts` - landing numbers and the search index; `insights.ts` - per-sector medians, the
  rule-based "idea" screens, and the news feed; `docs.ts` - the curated reading list;
  `companies.ts` - company pages and `sectorCompanies()` (one card per *ticker* on a sector page).
- **One supplier record per company per sector**, linked from every zone it plays in (each link
  has its own `exposureType`/`exposureStrength`); validate:content fails a second record. A key
  retired by merging duplicates goes in the sector's `keyAliases` (old -> new), so old
  `?company=<key>` deep links still open the company (`resolveSupplierKey`). Aerospace's seven
  doubled companies and Energy's BHEL were merged this way in Oct 2026.
- **Centrality.** `CompanyMetrics.centrality` (0-1) is how central a sector is to a company (its
  strongest exposure there; enablers such as lenders are discounted). Sector revenue totals skip
  companies below `CORE_CENTRALITY`, and sector news feeds lead with core players - otherwise
  HDFC Bank/SBI dominate Real Estate's revenue and headlines.
- `SupplierFinancials` (`supplier.f`) holds the company table's figures (5-year revenue, KPIs,
  price CAGR, 52-week range). They are an *as of* snapshot (`dataAsOf()`) - the fallback under
  the live data.

### "Ask NextResearch" assistant - `src/lib/assistant/`

- A chat button in the bottom-right of every page (`components/AssistantWidget.tsx`, mounted in the
  root layout; hidden on the 3D explorer and the auth pages). Opening it shows 3-5 suggested
  questions for what the page is about: `contextKeyForPath` maps the page (and `?ipo=`, `?report=`,
  charts' `?sector=`) to `platform`, `ipos`, `sector:<slug>`, `company:<slug>` or `ipo:<slug>`, and
  `buildContext` writes the questions and their answers from the same content and `FIN` figures as
  every other page. New sectors, companies and IPOs get questions automatically.
- **AI layer, optional:** with `GROQ_API_KEY` set, `ai.ts` asks Groq's free tier (Llama 3.1 8B
  Instant) to reword an answer from its fact lines. The reply is dropped for the code-written answer
  if it contains a number not in the facts, advice wording, or fails/times out (free-tier limits
  included). Questions are a fixed list, so answers are cached per (context, question) in memory and
  at the CDN - model calls stay bounded however many people use it. Bump `PROMPT_VERSION` when the
  prompt changes.
- `assistant.test.ts` builds every context and fails on an empty, overlong or broken answer
  ("undefined", "NaN") or one whose numbers aren't in its own facts.
- **Adding a question:** add an `ask(id, question, answer, facts?)` to the context in `index.ts`.
  Every number in the answer must appear in its facts (the default facts are the answer itself).

### Upcoming IPOs - `src/lib/ipo-content/`

- One authored `IpoReport` per IPO (`<slug>.ts`, shape and field rules in `types.ts`): the DRHP/RHP
  summarised - issue split and timeline, business mix, restated financials, KPIs, use of
  proceeds, shareholding, peers, strengths/risks, sources (offer document first).
- `index.ts` registers them (`IPOS`), sorts by stage (open > upcoming > approved > filed) and
  builds the serializable `IpoDeck`; a peer whose NSE ticker we cover gets its supplier record,
  so the peer row opens the stock pop-up. `validate.ts` holds the shape rules
  (`npx tsx scripts/check-ipo.ts [slug]`, also run by `ipo-content.test.ts`).
- Shown by `components/ipo/*` (cards, `IpoSlides` - ten slides, `IpoDeckView`) inside the shared
  pop-up shell `components/research/Presentation.tsx`, which the sector decks use too. They
  appear in the landing page's third tab (Industries / Policies / IPOs), the reading list's IPOs
  tab, `/ipos`, and search.

### Live data - `src/lib/live/`

| File | Source | Used for | Cache |
| --- | --- | --- | --- |
| `yahoo.ts` | Yahoo Finance via `yahoo-finance2` | quote (~15 min delayed on NSE), price history, fallback fundamentals | 1 min quote, 5-60 min charts |
| `freshness.ts` | - | `isFreshQuote`: a quote older than `MAX_QUOTE_AGE_DAYS` (6) is rejected, here and in the client | - |
| `screener-company.ts` + `screener-ratios.ts` | Screener.in HTML | ratios, growth, shareholding, annual P&L, **industry median** (peers table footer) | 6 h |
| `news.ts` | Google News RSS | latest headlines per company, the platform/sector feed and watchlist news; curated seed headlines are the fallback | 15 min (Next data cache + in-process) |
| `cache.ts` | - | in-memory TTL cache with in-flight de-duplication; failed (null) loads are only remembered ~1 min | - |

**Yahoo symbols.** Plain `<T>.NS` can answer with a *frozen* price (REITs moved to NSE's RR
series in 2024; SME stocks trade in the SM series). Quotes therefore try `.NS`, `-RR.NS`,
`-SM.NS`, then `.BO` and accept the first *fresh* one; charts try `.NS`, `-SM.NS`, `.BO`. A few
tickers need an alias (e.g. KRONECOMM -> ADCINDIA.BO). Every call has a timeout, and the cache
never shares an in-flight load older than 30 s (a hung call once stalled a route for 100 s+).

**Screener basis.** Companies without consolidated accounts (Abbott India, Netweb) have an
*empty template* consolidated page; `isUsablePage` detects it and the standalone page is used,
labelled as such. Empty growth rows/tables are dropped; an industry median of 0 means "n/a".
REITs (`isReit`): P/E, ROE and dividend yield are shown as "n/m" with an explanation.

News headlines are filtered to ones that are actually *about* the company (`isAbout`) and exclude
price-prediction pages, "stocks to watch/buy" tip lists, quote/profile pages, multi-company
round-ups, target-price and auto-generated P/E blurbs, and entertainment that shares a name
(Netflix's "Lupin"). When adding companies, extend the matcher's word lists in `news.ts`:
`GENERIC` (words that don't identify a company: "pharma", "realty"), `GROUP` (family names
several listed companies share: "aarti", "finolex"), `ALIASES` (short names headlines use:
"Sun Pharma", "Lodha"), `OTHER_COMPANIES` (uncovered look-alikes: "SBI Life"), `WORD_TICKERS`
(tickers that are ordinary words: EMBASSY) and `NOT_ABOUT` (TMPV vs Tata Motors CV) - each with a
test in `news.test.ts`. Feeds keep one copy per story (`sameStory`: same company within ~36 h,
both earnings headlines or mostly the same words). Relative ages ("3h ago") are computed on the
client from `ts`, because the server responses are cached. Aggregated feeds query each sector's
core players first (`feedCompanies`, bounded upstream requests); `<NewsFeed>` streams them behind
a Suspense skeleton so pages never wait on the news fetch.

Screener has no public API: we parse its HTML (one page + the peers table per company,
cached). It rate-limits bursts and the markup can change - the parsers are covered by tests
against saved fixtures in `lib/live/__fixtures__/`. If Screener is unreachable the Fundamentals
tab falls back to Yahoo's partial data and says so; if both fail it shows the stored figures.

### Company figures - `src/lib/financials/` (Postgres)

Every listed company's price, market cap, ratios, 52-week range, price CAGR and FY22-FY26
revenue/profit live **only** in the database: `Company` (`tracked`, `financialsNote`, `screenOut`,
Trendlyne ids), its `KpiSnapshot`s (one per refresh day) and its `FinancialSnapshot` years.
**Owner rule: every company's figures are identical everywhere and share ONE snapshot date.**

- `query.ts` - the one query: tracked companies, FY rows, and per company its latest snapshot dated
  **on or before the published date** (the latest `PUBLISHED` `FinancialsRun`; with none, the day
  before the first run; with no runs at all, the latest). `rows.ts` converts rows <->
  `SupplierFinancials`; `trading-day.ts` holds the pure date rules (tested).
- `load.ts` (server) - `ensureFinancials()` reads that published table through `unstable_cache`
  (tag `financials`, shared by all instances, re-read in the background after 15 minutes) and
  installs it. A ticker the content names but the table lacks stays blank and is logged (and fails
  `financials.test.ts`), rather than taking pages down. **Every page, route handler, OG image and
  the sitemap awaits it first**, including `generateMetadata` / `generateStaticParams` that read
  sectors. Inside the Next server, `listSectors()`, `getSector()` and `findSupplierByTicker()`
  throw if nothing is installed, so a missed call fails the build instead of rendering blanks.
- `store.ts` (server and browser) - the installed table; fills every `co()` placeholder in place
  and bumps a version so derived caches (`memoByFinancials`: insights metrics, basket stocks)
  rebuild. Client components get figures as props (stock pop-ups, decks) or, for the 3D explorer,
  as a `figures` prop the explore page loads for its sector; the browser bundle carries none.
- `refresh.ts` (server, no Next imports) - reads a company from Screener.in and runs the daily
  refresh; `auto.ts` (app only) triggers it; `write.ts` writes one company in one transaction
  (retried whole on a dropped connection), so a crash never leaves half a company.
- Tests that check real figures read the table from `DATABASE_URL` (`test-db.ts`), read-only.

**Automatic refresh (since 23 Oct 2026).** Figures for NSE trading day D are due from 18:30 IST on
D (weekends and the NSE holidays in `trading-day.ts` skipped; add next year's list each December).
- *Trigger on visit:* each `ensureFinancials()` checks, in memory, whether the installed table's
  published date is behind the latest due day; if so it schedules one chunk with `after()` (never
  blocks or fails the page; at most one attempt per instance a minute; skipped during `next build`).
- *Chunk:* claims the day's `FinancialsRun` lease in one atomic `INSERT ... ON CONFLICT DO UPDATE
  ... WHERE leaseUntil IS NULL OR leaseUntil < now()` (refused while any run holds a live lease), so
  one chunk runs at a time across all instances. It snapshots the tracked companies that have no
  `KpiSnapshot` for D yet and are not in `failed`, two at a time with a 1s pause each, for ~40s
  (the cron: ~230s), saving progress after each company, then releases the lease. Screener
  answering 429/403/503 stops the chunk and holds the lease 15 minutes (back-off).
- *Publish:* when every company has been tried, the run is marked `PUBLISHED` and the `financials`
  tag is expired, so the whole site moves to D in one step (from a prerender, where Next refuses
  that, the 15-minute clock picks it up). A company Screener could not read (DIGIFIBRE,
  STONEINDIA) keeps its previous snapshot and its own date. More than max(5, 5%) misses and the run
  is marked `FAILED` instead: the site stays on the last published date and the next day retries.
- *New listings:* each run also includes every IPO deck whose live stage (`liveIpoStatus`) is
  `listed` by D and that names a `ticker` the table doesn't track: it is created/tracked with its
  full FY history (as `--add` does) and snapshotted in the same run. Until the run publishes it has
  no snapshot on or before the published date, so `query.ts` leaves it out and it appears with
  everyone else. A listed deck with no `ticker` is skipped and logged (symbols are never guessed).
- *History:* automatic runs write only `KpiSnapshot`s for companies already in the table. FY revenue/profit (`FinancialSnapshot`) is
  curated and changes only by hand (`--fix-history`, `--add`), so a run in progress can never change
  the history the site shows.
- *Backstop:* Vercel Cron calls `GET /api/financials/refresh` at 13:30 UTC (19:00 IST) on weekdays
  (`vercel.json`; crons run on production only), authorised by `Authorization: Bearer
  $CRON_SECRET`. Without `CRON_SECRET` the route refuses everything.
- *Env:* `CRON_SECRET` must be set in Vercel (Production and Preview). The visit trigger is on by
  default where `VERCEL_ENV` is `production` or `preview` and off elsewhere, so dev servers and
  tests never write to the shared database; `FINANCIALS_AUTO_REFRESH=1` forces it on,
  `=0` turns it and the cron route off.
- *Status:* `SELECT * FROM "FinancialsRun" ORDER BY "snapshotDate" DESC` shows each day's progress
  (`done`/`total`, `failed`, lease). A stuck run (lease past, never published) is taken over by the
  next chunk; an older unfinished run is marked `FAILED` when a newer day starts.

**By hand:** `npx tsx scripts/refresh-financials.ts` (dry run, history report), `--apply` (claims
today's run, waiting while a chunk holds the lease, writes everyone dated today in IST and publishes),
`--only A,B` (dry run with before/after), `--fix-history=A,B --apply`, `--add=T,...` (a new
company, dated at the published date so it shows at once). See Playbook 1.5.

### Price store - `src/lib/prices/`

Every company with a page and every benchmark keeps its last five years of daily bars (open, high,
low, close, volume) in the database (`PriceSeries`, `PriceBar`), so baskets don't fetch Yahoo on a
visit (a cold rule-based list or industry table used to fetch hundreds of histories and could run
past a function's 60 s).

- *Reads* (`store.ts`): the baskets (backtests, industry figures, rule-based lists, the projections'
  beta and volatility) read the store first and fall back to Yahoo when it can't serve: no series
  yet, the "All" range (not kept), or a last bar older than 6 days (the top-up has stopped). The
  stock pop-up's charts read Yahoo first (the day's live moves) and fall back to the store. Weekly
  bars for 3Y/5Y are rolled up from the daily ones the way Yahoo dates them (Monday). Daily ranges
  match the Yahoo charts point for point; weekly ones too, except a point or two in weeks with a
  weekend session, where Yahoo's weekly close disagrees with its own daily closes. Backtests from
  the store equal the Yahoo ones. Kept in memory 15 min per instance; a read slower than 8 s
  falls back to Yahoo.
- *Top-up* (`refresh.ts`): after 18:30 IST each trading day (as the company figures), one
  `PriceRun` per day holds a lease; each chunk fetches the series not yet checked for that day.
  A new series is fetched whole (Yahoo's symbol walk, else Screener's closes, but never because
  Yahoo was down); after that only the last two weeks. It is fetched whole again and replaced when
  those disagree with stored closes by more than 2%, when a day-to-day move tops 45% (a split Yahoo
  dates months from the drop), when it is on Screener's closes (Yahoo is asked again), and at least
  weekly. Bars after the day being topped up are never stored (no intraday price as a close).
  Least recently checked series go first; eight failures in a row stop the chunk (Yahoo down); a
  day missed is caught up by the next top-up. Vercel Cron calls
  `/api/prices/refresh` at 19:30 IST on weekdays (`CRON_SECRET`, as the financials cron;
  `PRICES_AUTO_REFRESH=0` turns it off).
- *By hand:* `npx tsx scripts/refresh-prices.ts` (status), `--apply` (the first fill, or catching
  up), `--only=LT,^NSEI --apply`. About 290 series x 1,250 bars: ~360k rows, ~50 MB.
- *Status:* `SELECT * FROM "PriceRun" ORDER BY day DESC`, and `"PriceSeries"."checkedDay"` per series.
- Before the tables exist (code deployed ahead of its migration) the reads skip the store and use Yahoo.

If the database is unreachable, an instance keeps serving the table it has installed (and the data
cache its last copy); a cold instance with neither cannot render pages until it is back. Run the
migration and the data copy together: with `tracked` rows missing, the table reads as empty.

### Database (Postgres via Prisma)

**Region.** The Supabase database (and its auth) is in Sydney (`ap-southeast-2`), so `vercel.json` runs
every function in `syd1` beside it: a page makes several database/auth round trips but the reader's
request crosses the distance once. (Per-route `preferredRegion` is deprecated in Next 16 and Vercel's
Node functions don't support it.) Moving the database to Mumbai would let both move back to `bom1`.

`prisma/schema.prisma` models exactly what the code uses:

| Table | Holds | Written by |
| --- | --- | --- |
| `Company` | ticker, name, listed, role, Trendlyne ids, `tracked`, `financialsNote`, `screenOut` | `db:seed` (identity), `write.ts` (figure fields) |
| `KpiSnapshot` | one dated price/valuation/ratio row per company per refresh (the app reads the latest on or before the published date) | `write.ts` |
| `FinancialSnapshot` | FY22-FY26 revenue/net profit, one row per year | `write.ts` (by hand only) |
| `FinancialsRun` | one automatic refresh per trading day: `snapshotDate`, `status` (RUNNING/PUBLISHED/FAILED), progress, lease | `refresh.ts` |
| `PriceSeries`, `PriceBar` | the price store: per stock/benchmark its source (Yahoo symbol or `screener`), first/last/checked day; daily OHLCV bars keyed by (key, day) | `prices/refresh.ts` |
| `PriceRun` | one price top-up per trading day: progress, failures, lease | `prices/refresh.ts` |
| `Profile` | mirror of a Supabase auth user (`ensureProfile`, on sign-in and before a watchlist or basket write) | app |
| `Watchlist` | user x company, `priceAtAdd` | `/api/watchlist` |
| `Basket`, `BasketItem` | a user's baskets; items keyed by ticker, with `priceAtAdd`, custom `weight` and `pickedFrom` (industry slug) | `/api/baskets` |

`npm run db:seed` writes company identity only (ticker, name, listed, role) from
`prisma/seed-source/extracted.json`; the curated news in that file is read by the app straight from
the file, not from the database. The watchlist's `priceAtAdd` is the live quote when the heart is
tapped, else the company table's price; the column is NOT NULL, so 0 means "unknown" and the
watchlist shows no move for it. A basket PATCH locks the basket row (`SELECT ... FOR UPDATE`) inside
one transaction, so two edits at once can't lose each other's weights.

**Still in the database but no longer modelled** (Prisma ignores them): the tables
`FinancialStatementLine`, `PriceSnapshot`, `NewsLink`, `Subscription` and their enums, and the
columns `Company.dataStatus`, `Company.notes`, `Company.sectorSlugs`, `KpiSnapshot.note`.
`Company.role` stays modelled because it is NOT NULL with no database default. The drops, a default
for `role`, Row Level Security for the public schema (closing the Supabase REST API's `anon` /
`authenticated` access; the app connects as `postgres` and is unaffected), an optional
`Watchlist(companyId)` index and a `KpiSnapshot` retention delete (latest plus one per month) are
drafted in **`prisma/proposed/2026-10-22_cleanup.sql` - not applied**. It sits outside
`prisma/migrations` on purpose; each section lists its prerequisites; take a backup first.

**Connections.** `src/lib/prisma.ts` gives each server instance a pool of at most 5 connections
that close after 10s idle, because on Vercel every instance has its own pool. Runtime
`DATABASE_URL` should be Supabase's transaction pooler (port 6543); the Prisma CLI (migrations)
reads `DIRECT_URL` (direct connection or session pooler, port 5432) and falls back to
`DATABASE_URL` when it is unset (`prisma7.config.ts`, `.env.example`). The scripts use
`scripts/db.ts` (retries on dropped connections).

There is **one Supabase project** (`DATABASE_URL` in `.env`), shared by staging and production, so
`npm run db:seed`, `refresh-financials.ts --apply`, migrations and the proposal file write to live
data - ask before running them. The seed is idempotent (upserts by ticker) and retries dropped
connections. A ticker rename (HBLPOWER -> HBLENGINE) leaves an orphaned row behind; delete it only
after checking no watchlist references it (children cascade).

## Routes

| Route | Type | Notes |
| --- | --- | --- |
| `/` | server | Landing page, composed of `components/landing/*` |
| `/sector/[slug]` | server | Sector overview; company cards open the stock pop-up directly |
| `/sector/[slug]/explore` | server shell + client | 3D explorer; deep links via `?zone=&company=&scenario=` |
| `/company/[slug]`, `/companies` | server | One indexable page per listed company; A-Z list |
| `/updates`, `/docs`, `/docs/[slug]` | server | Live news feed (filter `?sector=`); Analysis (nav label; route stays `/docs`): Reports view = 10-slide research deck per sector in a pop-up (`?report=<slug>` opens one); Charts view = `IndustryChartsView` (the industry basket's `BasketDetail`: its stocks vs the industry index and Nifty 50, rebased to % change; loaded only when opened) (`?view=charts&sector=<slug>`) |
| `/ipos` | server | Upcoming-IPO decks (`?ipo=<slug>` opens one; also works on `/` and `/docs`) |
| `/connections` | server | Companies present in 2+ supply chains, ranked by footprint (`sector-content/exposure.ts`) |
| `/watchlist` | server | Auth required; rows open the stock pop-up |
| `/login`, `/signup`, `/auth/callback` | server | Supabase auth |
| `/api/stock/[ticker]` | route | `{ quote, fundamentals, news, newsLive, footprint, return1y, seedAsOf }`, `s-maxage=300` |
| `/api/stock/[ticker]/chart?range=1M\|6M\|1Y\|3Y\|5Y\|MAX` | route | price history |
| `/api/benchmark/[id]/chart?range=...` | route | index history for the ids in `sector-content/benchmarks.ts` (Nifty 50, Sensex, sector indices; ETF stand-ins where Yahoo has no index history) |
| `/api/assistant?path=&qs=` / `?ctx=&q=` | route | The assistant's questions for a page (code-written answers) / one answer, AI-reworded when `GROQ_API_KEY` is set; both CDN-cached |
| `/api/watchlist` | route | GET (returns `signedIn`, always 200) / POST / DELETE; the heart checks GET first so signed-out taps show the prompt without a 401 |

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
  Behaviour to preserve:
  - One button per layer (`layerNames`); breadcrumb, active button and slider (`dom.slider`) stay
    in sync through `applyLevel`. Picking a zone sets `targetLevel = zone.layer`; moving to a
    layer where the selected zone isn't visible deselects it.
  - Up to 1000 px the explorer uses the phone layout: floating controls, a bottom sheet with
    peek/full heights, and phone tags (only the current layer's systems, max ~150 px, 8 px off
    the edges). The engine measures the sheet and shifts the projection (`setViewOffset`) so the
    picked system sits in the strip above it; it pans sideways only when needed so the model
    isn't cropped, judging from where the camera is *heading* (deep links select mid-animation).
  - Default and "top" views are pulled back until the whole model fits (`fit`); close-ups keep
    their authored framing. Callouts whose marker is off-screen are hidden.
  - Each model file (`sector-content/models/<slug>.ts`) owns its geometry, `applyLevel` crossfade
    (`layerMats()` buckets) and, for new sectors, exported `ANCHORS`/`VIEWS` that
    `sectors/<slug>.ts` references - so content and geometry can be authored in parallel.
  - **Render on demand** (`engine.ts` `invalidate()` / `animate()`): the loop runs every frame but
    only redraws while something moves - a camera flight, OrbitControls damping, a layer
    crossfade, marker easing, a hover/pick/scenario change, a resize or theme switch, or a change
    in the stage/sheet/label layout. An idle explorer draws nothing. A model with its own motion
    returns `animated: true` from `build()` (data-centre LEDs, energy's wind turbines) and keeps
    drawing. Anything new that changes the scene from outside the loop must call `invalidate()`.
- **Theming.** Colour tokens are CSS variables in `globals.css` (light is the default; dark via
  `data-theme="dark"` on `<html>`, set before paint by the inline script in `layout.tsx`).
  `explorer.css` mirrors the tokens because the explorer scopes its own copy - **change both
  together**. Use the semantic Tailwind colours (`bg-panel`, `text-ink`, `text-pos`, ...), never
  hex values.
- **Responsive.** Mobile-first breakpoints at 640 / 700 / 1000 / 1280 px. In the explorer on
  phones the Layers/Systems/Camera controls float over the stage and long write-ups collapse
  (see the phone block at the end of `explorer.css`). Site-wide: inputs are 16 px on phones (iOS
  zooms smaller ones), touch targets get a 40 px hit area via the `tap-target` utility in
  `globals.css`, and the header must fit at 360-390 px. The account button shows the user's name
  **only on the landing page** (bare avatar elsewhere).
- **Generated deck headlines** live in `components/research/headlines.ts` (pure functions, so all
  11 decks can be printed and read in one go): pluralise counts, never "and one other", describe
  balances accurately.
- **Inline scripts** (the pre-paint theme script) go through `components/InlineScript.tsx`; a raw
  `<script>` inside a server-rendered component logs a React warning on not-found routes.

## Conventions

- **Comments explain *why*** (constraints, gotchas, trade-offs) - the code shows what.
- **Add or unlock a sector / policy - complete the whole loop.** A sector is only done when every
  surface that lists companies knows about it. Checklist:
  1. Author it in `sectors/<slug>.ts` + `models/<slug>.ts`, registered in `products.ts` and
     `sectors/load.ts` (zones with `layer`, suppliers with `f: co(...)` - add new tickers'
     figures to the company table with `refresh-financials.ts --add`,
     domains, `whyNow`, `thesisSummary`, `integratorZoneId`, exposure links, 3D model) and leave
     `muted` off. The full recipe is in the [Playbook](PLAYBOOK.md).
  2. `scenarios.ts`: 3-4 "what if" shocks; `docs.ts`: reading links; `reports/<slug>.ts`: the research deck
     (register it in `reports/index.ts`; `npx tsx scripts/check-report.ts <slug>` checks one while authoring).
  3. `npm run db:extract` (regenerates `extracted.json`) + `npm run db:seed`, so every listed company has a `Company` row (the
     watchlist heart needs it). The seed hits the shared live DB - get a go-ahead first.
  4. Run `npm run validate:content` - it fails a live sector that lacks scenarios, reading links,
     an integrator zone, a thesis, or a valid `layer` on any zone/view.
  4b. Extend the news matcher for the new company names (see "Live data" above).
  5. Check by eye: landing card + stats, search, `/updates` chips, `/connections` (a company shared
     with another sector must show both), idea screens, `/docs`, the stock pop-up footprint, and the
     explorer on desktop *and* phone.
  Landing stats, search, news feed, ideas, connections, footprint and the assistant's questions all derive from the content
  (`!muted`), so nothing else should need a hand edit - if something does, that is a bug to fix.
- **Add a stock-pop-up tab:** add a view in `components/stock/`, register it in `StockModal`'s
  `TABS`, extend `StockTab` in `types.ts`.
- **Touching live data:** keep it behind `lib/live/` and the API routes; add/adjust a fixture
  test when a parser changes.
- **Before merging:** `npx tsc --noEmit && npx eslint src scripts && npm test && npm run validate:content`,
  `npx tsx scripts/check-report.ts <slug>` for touched decks, and `next build` (stop the dev
  server first - see the Playbook). `npm test` and `next build` read the company table, so they
  need `DATABASE_URL`. Then the QA routine in the Playbook. Work lands on `staging`
  first, then `main` via PR.

## Known gaps / tech debt

- `SectorExplorer.tsx` (~1,000 lines) and `engine.ts` mix layout, state and the zone panel - a
  candidate to split (rail / panel / header / camera framing) next.
- Energy's opening "Platform" layer has no systems of its own, so phones show all its tags there.
- DIGIFIBRE and STONEINDIA have no live quote source; they always show the stored figures.
- Sector modules type-check by inference, not against `SectorDef` (its `build` signature and the
  deep-dive fields don't fit a `satisfies` check yet); policies and `products.ts` are still
  `@ts-nocheck`. `validate:content` guards the graph.
- `scenarios.ts` (every sector's "what if" text) still ships whole with the explorer; splitting it
  per sector like the content would trim the explorer bundle a little further.
- Screener scraping is fragile and sits in a legal grey area (see the note in
  `screener-company.ts`); a licensed data vendor would replace `lib/live/screener-*`.
- Yahoo NSE quotes are ~15 minutes delayed; the UI says so. There is no streaming.
- News comes from Google News RSS (unofficial, headline + link only); the curated set in `extracted.json` is only the fallback. A licensed news API would be the upgrade path.
- The Analysis page (`/docs`) shows research decks from `sector-content/reports/` (authored industry text; company
  figures pulled from the supplier seed data) viewed in `components/research/ResearchDeck.tsx`.
- No CI: tests/lint/types/build are run by hand (see the checklist above). A GitHub Action
  running them on PRs would be the highest-leverage next step.
- No end-to-end tests; the interactive flows were verified manually/headlessly.
