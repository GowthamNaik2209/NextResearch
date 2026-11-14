# SOP: building a new module (industry, policy or index)

The standard procedure every new industry, policy or index follows, and the extension of an existing
one. A module is **done only when every gate below is green**. Gate 6b (SEO and AEO) applies to every
new feature or page as well, module or not. The how-to for each step is in
[PLAYBOOK.md](PLAYBOOK.md) (sections 1-4); this page is the order and the gates.

## Roles

| Role | Owns | Never touches |
| --- | --- | --- |
| Lead | contracts, every shared file (`products.ts`, `sectors/load.ts`, `scenarios.ts`, `docs.ts`, `reports/index.ts`, `benchmarks.ts`, `live/news.ts`, app pages, components), the database, git | another role's files |
| Industry consultant (one per module) | `sectors/<slug>.ts` or `policies/<slug>.ts`, its `.extras.ts`, `reports/<slug>.ts`, a notes file for the lead | models, shared files, the database |
| 3D model author (one per module) | `models/<slug>.ts` | everything else |
| News-matcher owner | `live/news.ts`, `live/news.test.ts` | content, models |
| Coverage checker | `coverage.test.ts`, `scripts/check-coverage.ts` | content, models |
| Neutral reviewer (fresh agent) | nothing; reports observed problems only | every file |

## Gate 1 - Contract (lead, before anyone starts)

- Slug, icon, name, category, 4 `layerNames`, every zone id with its `layer`, the integrator zone.
- Placeholder files registered in `products.ts` (site order) and `sectors/load.ts`, `muted: true`,
  stub extras/report wired into `scenarios.ts`, `docs.ts`, `reports/index.ts`.
- Overlap check against every live module: no duplicate zones; shared companies are linked by the
  same ticker (that is what `/connections` shows), never re-created.
- Green when: `npx tsc --noEmit` and `npm run validate:content` pass with the stubs.

## Gate 2 - Content and research (consultant)

- Investor-lens zones, 2-6 companies each, listed and important unlisted; one supplier key per company.
- Every listed company is `co("TICKER")`: no figures typed in prose. Tickers checked live on NSE.
- "Why now" (`whyNow`) and "What this is" (`thesisSummary`): at most 3 bullets each, one short line
  apiece (about 90 characters). Detail belongs in zones and the deck, not the page header.
- 3-4 scenarios, 2-4 reading links (each opened), the 10-slide deck with sourced, dated figures.
- Notes for the lead: new tickers, screenOut candidates, news-matcher entries, benchmark, cross-sector links, open questions.
- Green when: `validate:content` and `npx tsx scripts/check-report.ts <slug>` pass.

## Gate 3 - 3D model (model author)

- One anchor per zone, on a part visible at that zone's layer; 3-4 callouts per rail, no crossings
  (rails follow the content's zone order - the lead reorders zones if the model asks).
- 5-7 views (`overview` first, `top` last) with narration; layers crossfade.
- Green when: every layer and view checked light and dark at 375 px and 1440 px (headless Chrome),
  `node scripts/check-crossings.mjs <slug>` reports 0 crossings in every view at both sizes, and
  `tsc` and eslint are clean.

## Gate 4 - Data (lead, live database: ask the user before any write)

1. `npx tsx scripts/refresh-financials.ts --add=<new tickers>` (dry run), read it, then `--apply`.
2. Set `Company.screenOut` for one-off dominated latest years (with the reason in `financialsNote`).
3. Price store: `npx tsx scripts/refresh-prices.ts` (status), then `--only=<new tickers> --apply`.
4. Shareholding: `npx tsx scripts/backfill-shareholding.ts --only=<new tickers>` (dry run), then `--apply`.
5. `npx tsx prisma/extract-source-data.ts`, then `npm run db:seed`.
- Green when: `npx tsx scripts/check-coverage.ts` reports no unexplained gaps.

## Gate 5 - Wiring (lead)

- News matcher entries and tests for every new company name (PLAYBOOK 1.3 step 2).
- `SECTOR_INDEX` benchmark (1+ year of history) or a written reason for none.
- Marketing copy that names sectors; IPO decks of companies that have since listed.
- Remove `muted` only after Gates 2-4 are green.

## Gate 6 - Every surface, every combination (automated)

`src/lib/sector-content/coverage.test.ts` (in `npm test`) checks every live module x every listed
company on every surface: stock pop-up, `/companies` and company pages, search, idea screens and
rule-based baskets, industry/policy basket and pool, basket picker, projections, `/connections`,
`/updates` news and FII/DII, Analysis deck and charts, landing card and stats, sitemap. A company
may be left out of a surface only by a named rule in the test (screenOut, too little price history,
enabler, unlisted), never silently. It runs over **all** modules, old and new, every time.
- Green when: `npm test` (serial if the pooler drops) and `check-coverage.ts` both pass.

## Gate 6b - SEO and AEO (lead; also for every new feature or page, not only modules)

Search engines and AI assistants (ChatGPT, Perplexity, Claude, Google AI Overviews) should find and
quote each new page the day it ships. For a new module **and for any new feature, page or view**:

- **Indexable or not, on purpose.** Public research pages are indexable; account, sign-in, unsubscribe
  and saved-by-link pages set `robots: { index: false }`. Never leave a public page noindex by default.
- **Metadata.** A specific `title` (what a person would search for), a `description` of one or two
  sentences, `alternates.canonical` (its own path; a view that is a page of its own, like
  `/updates?view=flows`, gets its own), and `shareMeta()` for link previews.
- **Text in the HTML.** What the page explains must be in the server-rendered HTML, not only in a
  pop-up, deck viewer or client-only component. A phone-only restriction hides by CSS (`sm:hidden` /
  `hidden sm:block`) rather than not rendering it (see `/signals/indicators`).
- **One `<h1>`**, holding the page's name only (no buttons or badges inside it).
- **Structured data** with `<JsonLd>` (`src/components/JsonLd.tsx`): `breadcrumbLd`, a `webPageLd` of
  the right type (`CollectionPage`, `TechArticle`; a research report's `Report` node is built by hand
  in `/docs/[slug]`), `itemListLd` for lists of companies or baskets (names only for items with no
  page of their own), and `faqJsonLd` for a visible `FaqSection`. Facts in FAQs must match the code.
- **Every listed URL resolves.** A sitemap or llms.txt URL never 404s on a quiet day (a rule-based
  basket with no stocks today shows an "empty today" page, not a 404).
- **Sitemap and llms.txt.** Add the route to `src/app/sitemap.ts` and a one-line entry to
  `src/app/llms.txt/route.ts`, built from the same source as the page (as `ideaCatalog()` is), never
  a hand-typed list. Update `SITE_DESCRIPTION` / layout keywords when the feature is a headline one.
- **Method pages** describe how it works now (no "what changed" copy).
- Green when: `src/app/seo.test.ts` (in `npm test`) passes; it fails for any page that is neither
  noindex nor has a canonical, `shareMeta`, structured data, a sitemap entry and an llms.txt line. The
  `<h1>`, HTML text and FAQ facts aren't machine-checked: the neutral review covers them. After release: fetch the live page, `/sitemap.xml` and `/llms.txt`, and
  check the title, canonical, `<h1>` and structured data are as intended.

## Gate 7 - Release

1. Checks: types, lint (`src scripts`), tests, `validate:content`, every touched deck, production build.
2. Neutral review by a fresh agent: phone 360/375/390, tablet 768, desktop 1280/1440/1920, light and
   dark, every touched page, explorer layer/view, deck slide, plus landing, search, ideas, baskets,
   pop-up tabs, `/connections`, `/updates`, `/companies`, the console on every page.
3. Fix everything, then a final regression pass that re-checks each finding by number.
4. Commit to `staging`, push, check the Vercel preview. `main` only on the user's word, via a merged PR.
