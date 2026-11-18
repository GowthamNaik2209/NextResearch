# Eight new industries + lender/insurer metrics - design

Date: 18 Nov 2026. Status: draft for the owner's approval.

## Intent

People should find most stocks they look for on the platform. Today 280 of the Nifty 500 stocks
(56%) sit in an industry; a stock outside every industry has no pop-up, basket, news, FII/DII view
or `/connections` entry. This work adds eight industries built **in the same depth as the existing
22** (full value chains, deck, scenarios, 3D explorer, every surface), which takes Nifty 500
coverage to about 83%. Because banks, NBFCs and insurers can't be judged on margin and ROCE, a
lender/insurer treatment is built first and read by every screen.

## Goals

- Eight live industries, each passing every gate in `docs/SOP-NEW-MODULE.md` (Gates 1-7):
  1. **Banks & NBFCs** (`banks`) - private, PSU and small-finance banks, NBFCs, HFCs, MFIs, infra
     lenders (REC, PFC, IRFC, IREDA, HUDCO), credit bureaus and lending enablers.
  2. **Insurance** (`insurance`) - life, general, health, reinsurance, brokers and aggregators.
  3. **IT Services & GCCs** (`itservices`) - IT services, ER&D, product/SaaS, BPM, plus a GCC
     layer of listed enablers (staffing, flex offices, office REITs) with the major unlisted GCCs.
  4. **Automobiles** (`autos`) - two-wheelers, cars, CVs, tractors, and their ICE components.
  5. **FMCG** (`fmcg`) - food, personal care, home care, beverages, tobacco, dairy, distribution.
  6. **Retail & Consumer Brands** (`consumerbrands`) - durables, apparel and footwear, jewellery,
     QSR, retail chains, alco-bev.
  7. **Chemicals & Agrochem** (`chemicals`) - specialty and commodity chemicals, agrochem,
     fertilisers, seeds.
  8. **Hotels & Travel** (`hotels`) - hotels, travel platforms, airlines, cruises and leisure.
- **Every company mapped.** Each Nifty 500 stock whose NSE industry falls inside an industry above
  is placed in a zone, or listed in that industry's notes with the reason it is left out. Important
  smaller listed names and major unlisted players are added too (2-6 per zone, more where the
  zone is genuinely crowded, as today).
- **Lender/insurer metrics everywhere** (see below), built before the first wave.
- A repeatable **Nifty 500 coverage report** so "how much can people find" is a number we track.

## Non-goals

- Oil & gas, metals, cement, logistics, textiles, media: the next round (towards ~95%), not this one.
- No light or placeholder industries: depth is not traded for speed.
- No new data provider in this round unless the owner approves one (see open questions).

## Anti-goals (failure even if it "works")

- A bank or insurer showing an operating margin or ROCE as if it meant something, anywhere.
- A lender silently missing from a screen. Exclusions are named rules (coverage test), never skips.
- Duplicate zones or duplicate company records: a company in several chains is one ticker, linked.
- Generic company write-ups ("leading player with strong brand") instead of chain-specific roles.
- Typed-in figures. Every listed company is `co("TICKER")`; figures live only in the company table.
- Big-cap bank/FMCG headlines drowning out build-theme news on `/updates`.

## Constraints

- All existing rules in `docs/SOP-NEW-MODULE.md`, `docs/PLAYBOOK.md` and the owner's standing
  preferences: covered-companies wording, one i button per panel, accent-border buttons, phone
  behaviour of explorer and pools, SEO/AEO gate 6b, outliers kept out of screens via `screenOut`.
- Production and staging share one live database: every write (`--add`, prices, shareholding,
  seed, schema migration) needs the owner's go-ahead, in batches the owner can check.
- Release: each wave to `staging` and checked on the Vercel preview; `main` only on the owner's
  word via a merged PR.
- The daily Screener refresh must still finish with ~500 more companies (chunked run, lease).

## Approaches considered

- **A. Waves (chosen by the owner).** Lender/insurer groundwork first, then three waves of 2-3
  industries, each through every gate to staging before the next starts. Smaller reviews, database
  writes in checkable batches, look-alike company names (HDFC, ICICI, SBI, Bajaj, Tata, Mahindra,
  Kotak, Aditya Birla) sorted one group at a time.
- B. All eight at once: ~20 agents, ~200 tickers in one write, one giant review; a single problem
  holds every industry. Rejected for risk.
- C. Breadth first (every missing stock with light content, deepen later): rejected, the owner wants
  the same depth as today.

## Plan of waves

| Wave | Industries | Why this order |
|---|---|---|
| 0 | Lender/insurer groundwork | Banks and Insurance can't ship without it |
| 1 | Banks & NBFCs, Insurance, Hotels & Travel | Largest gap (53 financial names); Hotels picks up already-tracked orphans (IHCL, Lemon Tree, Chalet, EIH, Yatra) |
| 2 | IT Services & GCCs, Automobiles, Chemicals & Agrochem | Standard metrics; Autos shares tickers with EV, Chemicals with Pharma |
| 3 | FMCG, Retail & Consumer Brands | Most overlap with existing modules (consumer internet, real estate finishes, Nifty 50) - done last when the overlap rules are proven |

Each wave ends on staging with the full Gate 7 neutral review and regression pass, then goes to
`main` on its own, on the owner's word via a merged PR, **before the next wave lands on staging**
(owner's decision; Wave 0 included). The next wave's content may be prepared on its own branch
meanwhile, but staging never holds two unreleased waves, so unrelated staging->main releases never
carry unapproved wave work.

## Wave 0 - lender/insurer treatment

**Tag.** A company-level kind on the company table: `operating` (default), `lender`, `insurer`
(schema migration; owner go-ahead). Set for every bank, NBFC, HFC, MFI and infra lender, and every
insurer, including those already on the platform (capital markets, Nifty 50, enablers in energy,
transmission, real estate).

**Data (checked on Screener 18 Nov 2026).** Bank and NBFC pages carry: Revenue (already read),
Financing Profit, **Financing Margin %**, **Gross NPA %** and **Net NPA %** (quarterly), Deposits
(banks), Borrowing, Total Assets, plus the usual book value and ROE. Insurer pages are laid out like
any company (Sales, OPM) and carry no insurance-specific figures. The refresh is extended to store
these, and the following are derived:

| Lenders (banks, NBFCs) | Source |
|---|---|
| P/B | price / book value (have both) |
| ROE | Screener (have) |
| ROA | net profit / average total assets |
| Gross NPA %, Net NPA % | latest quarter on Screener |
| Financing margin % | Screener |
| Deposit growth (banks), balance-sheet growth | year-on-year from the balance sheet |

| Insurers | Source |
|---|---|
| P/B, ROE | have |
| Premium/income growth | revenue history (label stated as Screener reports it) |
| VNB margin and embedded value (life), combined ratio (general/health), solvency ratio (all) | **Hand-kept** from each insurer's quarterly public disclosures (owner's decision) |

**Hand-kept insurer figures.** Stored in the database (never in content), one row per insurer per
quarter with the figure, the period, the source URL and the date read; shown with that period and
source. Unknown -> null with the reason. Collected for every listed insurer before Wave 1 passes
Gate 4. Upkeep: a quarterly task after results season, added to `NextResearch Ops/tracked.json`
with its since date; the pop-up and pools show the period so a stale figure is visible. Insurance
pools offer P/B, ROE, premium growth, VNB margin, combined ratio and solvency; an insurer screen
(e.g. lowest P/EV among life insurers with VNB margin above a stated threshold, thresholds on the
page) is the builder's to design.

NIM, CASA and loan-book growth are not on Screener; they are not shown under those names (no
proxies relabelled as NIM). Unknown -> null with the reason, as everywhere.

**Surfaces.**
- **Stock pop-up and company pages:** the same metrics as every other company (owner's decision),
  plus a banking block for lenders (and an insurer block for insurers) with the figures above.
  Where a standard metric is not meaningful (ROCE and operating margin for a lender) it shows a
  short "not meaningful for lenders" note instead of a number.
- **Idea screens and rule-based baskets:** ROCE- and margin-based rules skip lenders and insurers
  through a named rule in `coverage.test.ts`; add a lender screen ("quality lenders": ROE 15%+ and
  Net NPA 1% or less, thresholds stated on the page) so lenders are on at least one screen.
- **Industry pools:** for lenders/insurers, margin and ROCE are left out of the layer figures; pools
  in Banks & NBFCs and Insurance offer P/B, ROE, ROA, Gross and Net NPA alongside revenue, profit,
  market cap, growth and P/E.
- **Explorer company panel, sector page, decks:** same rule as the pop-up.
- **Coverage test:** fails if any lender/insurer shows ROCE or operating margin as a number on any
  surface, and if any lender or insurer is outside the universe of every screen that can rank it.
  *Lead's call:* "on a screen" means "in the ranked universe of at least one screen", the same
  meaning the test uses for every other company today, not "listed on a screen today" (a threshold
  screen like quality lenders will leave many lenders off on a given day). Insurers stay in the
  price-based screens (gainers, near 52-week high, turnarounds) and are excluded from ROCE/margin
  screens by named rule.
- **"Margin"** in pools and the widening-margins screen is the platform's net margin; it is left out
  for lenders and insurers. Screener's OPM % row is not shown for insurers. *(Lead's call.)*
- **Mixed holding companies** (Bajaj Finserv, Aditya Birla Capital, Jio Financial...) get their kind
  at the value-chain checkpoint, by where most of their profit comes from. *(Lead's call.)*

## Per-industry work (every wave)

Exactly the existing SOP: contract (slug, icon, name, 4 `layerNames`, zones with layers, integrator
zone, placeholders), content and research, 3D model, data, wiring (news matcher, `SECTOR_INDEX`,
marketing copy, IPO decks), every-surface coverage, SEO/AEO, release. Two additions for this round:

1. **Value-chain map in the wave review.** The lead builds each industry end to end without a
   mid-wave stop (owner's decision). The company-to-zone map and the Nifty 500 names left out (with
   reasons) are written to `docs/waves/wave-<n>.md` and handed over with the wave.
2. **Overlap rule.** A company already in another module is linked by the same ticker with its own
   role for this chain; zones never duplicate an existing module's zone (EV's carmakers and
   components, Pharma's KSMs, consumer internet's quick commerce, real estate's paints).

## Agents (per wave)

Contract-first, file ownership as in the SOP:
- Lead (this session): contracts, shared files, database, git, the value-chain checkpoint.
- One industry consultant per industry (content, extras, deck, notes).
- One 3D model author per industry.
- One news-matcher owner for the wave (look-alike groups are the main risk this round).
- One coverage checker (coverage test, `check-coverage.ts`, Nifty 500 report).
- A fresh neutral reviewer for Gate 7, then a regression pass.

Wave 0 runs with the lead plus one engineer agent for the surfaces and the coverage checker.

## Nifty 500 coverage report

A read-only script that takes NSE's published Nifty 500 list and prints, per NSE industry, which
symbols are in a live module and which are not, with the total. Run at the start and end of every
wave; the end-of-wave number is reported to the owner.

## Success

- All eight industries live on `main` (after the owner's word), every SOP gate green.
- Nifty 500 coverage about 83% or better, every leftover in a target industry named with its reason.
- No lender or insurer shows a meaningless ROCE or margin anywhere; every lender is on a screen.

## Left to the builder

- Zone design within each industry (subject to the checkpoint), icons, 3D scene concepts.
- Exact storage of the new lender figures (columns vs a separate table) and the refresh parsing.
- Benchmarks per industry (e.g. Nifty Bank, Financial Services, IT, Auto, FMCG, Consumption via an
  ETF with 1+ year of Yahoo history), or a named `NO_BENCHMARK` reason.
- Landing heatmap/tiles layout at ~30 industries, provided equal tiles and the phone period
  dropdown stay.
- News-feed balance: keeping centrality/enabler rules so big caps don't crowd build themes.

## Owner's decisions (18 Nov 2026)

- Build in waves (approach A).
- Stock pop-up: the same metrics as every other company, plus banking-specific (and insurer) metrics.
- Same depth as existing industries; value chains map every company.
- Insurer figures kept by hand from quarterly disclosures.
- Each wave to `main` separately.
- The lead completes each wave on its own and pushes it to `staging` as it finishes; for each finished
  wave the lead opens a separate review session on that wave's branch, where the owner discusses it
  while checking. The next wave proceeds meanwhile on its own branch. Database writes the SOP lists
  still get the owner's go-ahead (live shared database).
