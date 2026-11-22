# Eight New Industries + Lender/Insurer Metrics - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Banks & NBFCs, Insurance, Hotels & Travel, IT Services & GCCs, Automobiles,
Chemicals & Agrochem, FMCG and Retail & Consumer Brands at the depth of the existing 22 industries,
after a lender/insurer treatment that every surface reads.

**Architecture:** Wave 0 adds a company *kind* (operating / lender / insurer, kept in code like the
existing REIT `trust` flag), lender figures parsed from the Screener page the refresh already reads,
hand-kept insurer figures in a new table, and kind-aware pop-up blocks, screens and pools. Waves 1-3
each add 2-3 industries through the unchanged SOP (contract -> content -> 3D model -> data -> wiring
-> coverage -> SEO -> review), with one consultant and one model author per industry in parallel.

**Tech Stack:** Next.js (repo's own version - read `node_modules/next/dist/docs/` before app code),
Prisma 7 + Postgres (Supabase, shared live DB), node:test via `npm test`, three.js explorer models.

**Spec:** `docs/superpowers/specs/2026-11-18-new-industries-design.md`

## Global Constraints

- Every SOP gate in `docs/SOP-NEW-MODULE.md` applies to every industry; `npm test`,
  `npm run validate:content`, `npx tsc --noEmit`, `npx eslint src scripts`, `check-report.ts`,
  `check-coverage.ts` green before a wave is pushed.
- Figures only in the database; every listed company is `co("TICKER")`; unknown -> null with reason.
- Live shared DB: migrations, `--add`, prices, shareholding, seed, insurer-figure writes each need
  the owner's go-ahead, asked in one batch per wave with the dry-run output.
- A bank or insurer never shows ROCE or net/operating margin as a number; it shows "Not meaningful
  for lenders" / "Not meaningful for insurers".
- Lender block fields: P/B, ROE, ROA, Gross NPA %, Net NPA %, Financing margin %, Deposit growth
  (banks), Balance-sheet growth. Never labelled NIM, CASA or loan growth.
- Insurer block fields: P/B, ROE, premium growth, VNB margin, embedded value (P/EV), combined
  ratio, solvency ratio - each hand-kept figure shown with its period and source.
- Copy: "covered companies", one i button per panel, accent borders on buttons/chips, no
  "what changed" copy on method pages.
- Release: wave branch -> `staging` push when the wave is complete -> a review session on that
  branch for the owner -> `main` only on the owner's word via merged PR, before the next wave lands
  on staging.

## Review Focus

1. A lender with no NPA rows on Screener (some NBFCs/HFCs, infra lenders) - block shows "-" with a
   reason, never 0. Test: `parseLenderFigures` on a page without NPA rows returns `gnpa: null`.
2. Holding companies tagged lender/insurer (Bajaj Finserv, Jio Financial) - pop-up must not show
   ROCE as a number. Test: coverage rule iterates every tagged ticker.
3. Stale hand-kept insurer figures (older than two quarters) - shown with their period and a
   "older figure" mark. Test: `insurerFreshness(periodEnd, today)` returns `"stale"` after 200 days.
4. A lender in a non-financial industry as an enabler (REC in energy) - the energy pools' margin must
   leave it out. Test: `groupValue` with a lender in the layer ignores it for `margin`/`roce`.
5. News look-alikes across waves (HDFC, ICICI, SBI, Bajaj, Tata, Mahindra, Kotak, Aditya Birla) - a
   headline about one group company never lands on a sibling. Test: one `news.test.ts` case per pair.

---

## Wave 0 - lender/insurer groundwork (branch `claude/industries-wave-0`)

### Task 0.1: Company kind

**Files:** Create `src/lib/financials/kinds.ts`, `src/lib/financials/kinds.test.ts`.

**Interfaces:**
- Produces: `export type CompanyKind = "operating" | "lender" | "insurer";`
  `export function companyKind(ticker: string): CompanyKind;`
  `export const LENDERS: readonly string[]; export const INSURERS: readonly string[];`

- [ ] Test: `companyKind("HDFCBANK") === "lender"`, `("BAJFINANCE") === "lender"`, `("REC") === "lender"`,
  `("HDFCLIFE") === "insurer"`, `("ICICIGI") === "insurer"`, `("TCS") === "operating"`; every
  ticker in `LENDERS`/`INSURERS` appears once across both lists.
- [ ] Run `npm test -- src/lib/financials/kinds.test.ts` -> FAIL.
- [ ] Implement with every lender/insurer already covered (scan `co("…")` tickers for banks, NBFCs,
  HFCs, MFIs, infra lenders, insurers; holding companies by where most profit comes from: BAJAJFINSV
  lender, JIOFIN lender, SBILIFE/HDFCLIFE insurer). Waves 1-3 extend the lists.
- [ ] Run -> PASS. Commit.

### Task 0.2: Lender figures from the Screener page

**Files:** Create `src/lib/financials/lender.ts`, `lender.test.ts`,
`src/lib/financials/__fixtures__/screener-bank.html` (trimmed: P&L, quarters, balance sheet tables
only), `screener-nbfc-no-npa.html`. Modify `refresh.ts` (`Snap`, `fetchSnapshot`), `write.ts`,
`prisma/schema.prisma` + migration `prisma/migrations/20261118120000_lender_figures`.

**Interfaces:**
- Produces: `export type LenderFigures = { gnpa: number|null; nnpa: number|null; finMargin: number|null; totalAssets: [number|null, number|null]; deposits: [number|null, number|null] | null; quarter: string|null };`
  `export function parseLenderFigures(html: string): LenderFigures | null;` (null when the page has no
  "Financing Profit" row, i.e. not a lender layout).
- `Snap.lender?: LenderFigures`; KpiSnapshot gains `gnpa, nnpa, finMargin, totalAssets, totalAssetsPrev, deposits, depositsPrev, npaQuarter` (all nullable).

- [ ] Tests: bank fixture -> gnpa/nnpa equal the latest quarter column, finMargin the latest annual,
  totalAssets/deposits the last two annual columns; NBFC fixture -> `gnpa: null`, `deposits: null`;
  an operating-company page -> `null`.
- [ ] FAIL -> implement (reuse the table-row extraction style of `revenueRow`) -> PASS.
- [ ] Wire into `fetchSnapshot` only when `companyKind(ticker) === "lender"`; persist in `write.ts`.
- [ ] Migration SQL written; **not applied** until the owner's go-ahead (batch with Task 0.6).
- [ ] Commit.

### Task 0.3: Insurer figures table

**Files:** schema + same migration (`InsurerMetric`), create `src/lib/financials/insurer.ts`,
`insurer.test.ts`, `scripts/insurer-metrics.ts`, `data/insurer-metrics.json` (empty array in Wave 0).

**Interfaces:**
- `model InsurerMetric { id, companyId, periodEnd DateTime, period String /* "Q2 FY27" */, vnbMargin Decimal?, embeddedValueCr Decimal?, combinedRatio Decimal?, solvencyRatio Decimal?, sourceUrl String, readOn DateTime, @@unique([companyId, periodEnd]) }`
- `export type InsurerFigures = { period: string; periodEnd: string; vnbMargin: number|null; pev: number|null; combinedRatio: number|null; solvency: number|null; sourceUrl: string; fresh: "fresh"|"stale" };`
- `export function insurerFreshness(periodEnd: Date, today: Date): "fresh" | "stale"` (stale > 200 days).
- `scripts/insurer-metrics.ts`: reads the JSON, dry run prints rows, `--apply` upserts.

- [ ] Tests for freshness (199 -> fresh, 201 -> stale) and P/EV = mcap / embedded value.
- [ ] FAIL -> implement -> PASS. Commit.

### Task 0.4: SupplierFinancials carries kind and the blocks

**Files:** Modify `sector-content/core.ts` (`SupplierFinancials`), `financials/rows.ts`,
`financials/load.ts`, `financials/key-ratios.ts` (+ tests).

**Interfaces:**
- `SupplierFinancials.kind?: CompanyKind; lender?: LenderRatios | null; insurer?: InsurerFigures | null;`
- `export type LenderRatios = { roa: number|null; gnpa: number|null; nnpa: number|null; finMargin: number|null; depositGrowth: number|null; bsGrowth: number|null; quarter: string|null };`
- `export function lenderRatios(f: SupplierFinancials): LenderRatios | null` in `key-ratios.ts`
  (ROA = latest np / average of the two total-assets figures × 100).
- `keyRatios(f)` returns `netMargin: null` and new `notMeaningful: ("netMargin"|"roce")[]` for
  lenders and insurers.

- [ ] Tests: ROA for np 100, assets 900/1100 = 10%; bank `keyRatios` -> `netMargin null`,
  `notMeaningful` = both; operating unchanged.
- [ ] FAIL -> implement -> PASS. Commit.

### Task 0.5: Every surface reads the kind

**Files:** Modify `components/stock/{SummaryView,FundamentalsView,ratio-tiles,merge}.tsx|ts`,
`components/sector-explorer/SupplierDetail.tsx`, `components/research/slides.tsx`,
`components/ipo/IpoSlides.tsx` (peer tables), `app/company/[slug]` page, `app/api/stock/[ticker]/route.ts`;
create `components/stock/LenderBlock.tsx`, `InsurerBlock.tsx`.
`baskets/kpi-screens.ts`, `baskets/ideas.ts`, `baskets/ideas-data.ts`, `baskets/pools.ts`,
`baskets/pools-data.ts`, `components/charts/IndustryPools.tsx`, `coverage.test.ts`.

**Interfaces:**
- `KpiStock.kind?: CompanyKind`; ROCE/margin screens (`compounders`, `garp`, `wideningMargins`,
  "Highest ROCE") skip `kind !== "operating"` the way they skip `trust`.
- New screen `qualityLenders(stocks)`: ROE ≥ 15, Net NPA ≤ 1, mcap ≥ `KPI_MIN_MCAP_CR`, ranked by
  ROE desc, `KPI_LIST_N` names; rule text states the thresholds.
- New screen `insurerValue(stocks)`: life insurers with VNB margin ≥ 20 (fresh figures only), ranked
  by P/EV asc.
- `PoolMetricId` gains `"pb" | "roe" | "roa" | "gnpa" | "nnpa" | "vnb" | "combined" | "solvency"`;
  `companyValue` returns null for `margin`/`roce` on lenders/insurers; `poolMetricsFor(p: IndustryPools): PoolMetric[]`
  offers the lender set when any company is a lender, the insurer set when any is an insurer.
- Pop-up: the usual tiles, ROCE/margin tiles show "Not meaningful for lenders/insurers"; then
  `LenderBlock` / `InsurerBlock` (one i button for the block).

- [ ] Tests: `qualityLenders` threshold edges (ROE 15 in, 14.9 out; NNPA 1.0 in, 1.01 out);
  `groupValue` ignores a lender for margin (Review Focus 4); `poolMetricsFor` sets.
- [ ] Coverage test: (a) no tagged ticker yields a numeric ROCE or net margin from `keyRatios` or
  `companyValue`; (b) every tagged ticker is in the universe of `qualityLenders`/`insurerValue` or a
  price-based screen; named rules for ROCE/margin screens.
- [ ] FAIL -> implement -> PASS. UI checked in the preview (pop-up for HDFCBANK, HDFCLIFE, TCS) at
  375 and 1440, light and dark. Commit.

### Task 0.6: Nifty 500 coverage report

**Files:** Create `scripts/check-index-coverage.ts`, `data/nifty500.csv` (NSE's published list).
- Output: per NSE industry `covered/total`, the missing symbols, and the total line
  `Nifty 500 coverage: N/500 (P%)`. Read-only. Run -> `280/500`-ish today. Commit.

### Task 0.7: Data, release

- [ ] Ask the owner once: apply migration; refresh lender figures for tagged tickers (dry run shown).
- [ ] After go-ahead: apply, refresh, `check-coverage.ts` clean.
- [ ] Gate 7 neutral review (fresh agent) -> fixes -> regression pass.
- [ ] Merge to `staging`, push, check Vercel preview; open a review session on the wave branch;
  hand over. `main` on the owner's word.

---

## Waves 1-3 - the per-industry recipe

| Wave | Branch | Industries (slug) |
|---|---|---|
| 1 | `claude/industries-wave-1` | `banks`, `insurance`, `hotels` |
| 2 | `claude/industries-wave-2` | `itservices`, `autos`, `chemicals` |
| 3 | `claude/industries-wave-3` | `fmcg`, `consumerbrands` |

Each wave branches from the previous wave's branch, lands on staging only after the previous wave
is on `main`.

### Task W.1: Contract (lead)
- [ ] Run `check-index-coverage.ts`; list the Nifty 500 symbols each industry must place.
- [ ] Per industry: slug, icon, name, 4 `layerNames`, zones with layers, integrator zone, overlap
  check (shared tickers, no duplicate zones). Muted stubs registered in `products.ts` +
  `sectors/load.ts`; placeholders in `scenarios.ts`, `docs.ts`, `reports/index.ts`.
- [ ] `tsc` + `validate:content` green. Commit.

### Task W.2: Content (one consultant agent per industry, in parallel)
- [ ] Owns `sectors/<slug>.ts`, `<slug>.extras.ts`, `reports/<slug>.ts`, `docs/waves/notes-<slug>.md`.
- [ ] Every Nifty 500 symbol from W.1 placed or listed with a reason; plus important smaller and
  unlisted names; chain-specific roles/strengths/risks; scenarios, reading links, 10-slide deck.
- [ ] Wave 1 Insurance consultant also fills `data/insurer-metrics.json` (latest quarter per listed
  insurer, source URL each).
- [ ] `validate:content` + `check-report.ts <slug>` green.

### Task W.3: 3D model (one model author per industry, in parallel)
- [ ] Owns `models/<slug>.ts`; Gate 3 (anchors, 5-7 views, 0 crossings at 375/1440, light/dark).

### Task W.4: News matcher (one agent per wave)
- [ ] Owns `live/news.ts`, `news.test.ts`: entries for every new name; one test per look-alike pair.

### Task W.5: Wiring + data (lead)
- [ ] Extend `LENDERS`/`INSURERS`; `SECTOR_INDEX` or `NO_BENCHMARK`; marketing copy; sitemap/llms.txt
  via existing builders; landing tiles at the new count.
- [ ] One go-ahead batch: `refresh-financials.ts --add`, `refresh-prices.ts --only`,
  `backfill-shareholding.ts --only`, `insurer-metrics.ts --apply`, extract + seed.
- [ ] Remove `muted`. `npm test`, `check-coverage.ts`, `check-index-coverage.ts` (record the number).

### Task W.6: Review and release
- [ ] Gate 7 neutral review across phone/tablet/desktop, light/dark; fixes; regression pass.
- [ ] `docs/waves/wave-<n>.md`: company-to-zone map, left-out names with reasons, coverage number,
  calls made.
- [ ] Wave 1 only: add the quarterly insurer-figures task to `NextResearch Ops/tracked.json`.
- [ ] Merge to `staging`, push, Vercel preview checked; open a review session on the wave branch.
