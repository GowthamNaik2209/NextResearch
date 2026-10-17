# Playbook

Step-by-step recipes for the work that keeps coming back, and what went wrong last time.
[ARCHITECTURE.md](ARCHITECTURE.md) explains how the pieces fit; this file is *how to do things*
without repeating old mistakes. Written after adding Real Estate and Pharma and the full
phone/desktop QA pass that followed (Oct 2026).

## 1. Add a new industry (sector)

A sector is done only when **every** surface knows about it: landing card and stats, search,
idea screens, `/updates`, `/connections`, `/companies`, company pages, the stock pop-up
footprint, `/docs` deck, sitemap - and the explorer on phone and desktop.

### 1.1 Fix the contract first, then work in parallel

Content (companies, write-ups, financials) and geometry (the 3D model) are separate jobs. Agree
the contract up front so they can run at the same time:

- **Slug, icon, name, `layerNames`** (usually 4: outside -> inside, e.g. Skyline / Construction /
  Building Systems / Land & Capital).
- **Zone ids and each zone's `layer`** - the layer where that system is visibly represented.
  Group zones so every layer has some (a layer with no systems shows every phone tag).
- **A model stub** `src/lib/sector-content/models/<slug>.ts` exporting `<SLUG>_ANCHORS`
  (`{ zoneId: { pos, side } }`), `<SLUG>_VIEWS` and `build<Slug>()`. Zones reference
  `pos: <SLUG>_ANCHORS.<id>.pos, side: <SLUG>_ANCHORS.<id>.side` and `views: <SLUG>_VIEWS`, so the
  model author moves anchors without touching products.ts.
- **A temporary `muted: true` stub sector** in products.ts so `/sector/<slug>/explore` renders
  immediately for the 3D author. The content author replaces it and removes `muted`.
- **Placeholders** in shared files (`scenarios.ts`, `docs.ts`, `reports/index.ts`) so parallel
  edits never collide; remove every placeholder/marker comment before committing.

### 1.2 Content (investor lens)

- Map the real value chain: inputs -> manufacturing/build -> integrators -> distribution/finance.
  For each zone write `roleInSystem`, `whyItMatters`, `valuePoolDescription`, `bottlenecks`,
  `keyDrivers`, `keyRisks`, `investorMetrics`, `relatedComponents`; group zones into 4-6
  `domains`; set `integratorZoneId` (+ `integratorHeading`/`integratorBlurb` when "assembles the
  finished product" doesn't fit, e.g. developers, drugmakers, chipmakers).
- **Companies:** 2-6 per zone, listed and important unlisted (`listed:false` + `notes`). Supplier
  `role`, `strengths` and `risks` must be specific to *this* chain (pre-sales, occupancy, USFDA
  status, US/India mix...), never generic, and must not mention internal keys.
- **Financials are real or null.** Read each listed company's Screener.in page (consolidated,
  falling back to standalone): FY22-FY26 revenue and net profit, mcap, price, P/E, book value,
  dividend yield, ROCE, ROE, face value, 52-week range, 1/3/5-year price CAGR. Unknown -> `null`
  with the reason in `note`; rev and np null in the same years. Put "Price/valuation as of
  DD Mon YYYY" in the note (it becomes the company's `asOf`).
- **One `FIN` entry per ticker.** Search `FIN["TICKER"]` first; reuse with `co("TICKER", note)`.
  If another sector inlined the same ticker, move it into `FIN`. One-off-dominated latest year ->
  `FIN["X"].screenOut = true`.
- Use one supplier key per company within a sector, referenced from several zones with different
  `exposureType`/`exposureStrength`. Link genuine cross-sector companies (L&T, Polycab...) -
  that is what `/connections` shows.
- Lenders and other enablers: mark `exposureType: "enabler"` so they don't inflate sector revenue
  or crowd the news feed (centrality).
- **Also author:** 3-4 scenarios, 2-4 reading links (load each URL), and the 10-slide deck
  `reports/<slug>.ts` (sourced industry figures; dated, verified developments).

### 1.3 Wire-up checklist

1. `npx tsc --noEmit`, `npx eslint src scripts`, `npm test`, `npm run validate:content`,
   `npx tsx scripts/check-report.ts <slug>`.
2. **News matcher** (`src/lib/live/news.ts`), for every new company name:
   - `GENERIC`: words that don't identify a company ("pharma", "realty", "cement").
   - `GROUP`: family names that several listed companies share ("aarti", "finolex", "bosch").
   - `ALIASES`: the short names headlines use ("Sun Pharma", "Lodha", "Torrent Pharma").
   - `OTHER_COMPANIES`: look-alikes we don't cover ("SBI Life", "Zydus Wellness").
   - `WORD_TICKERS`: tickers that are ordinary words (EMBASSY).
   - `NOT_ABOUT`: sibling businesses that share a name (TMPV vs Tata Motors CV).

   Add a test in `news.test.ts` for each tricky case.
3. Marketing copy that lists sectors: `lib/site.ts`, `app/opengraph-image.tsx`,
   `app/docs/page.tsx`, `app/companies/page.tsx`.
4. `npx tsx prisma/extract-source-data.ts`, then (with the user's go-ahead) `npm run db:seed`.
   Afterwards compare DB tickers with content tickers; orphaned rows from ticker renames can be
   deleted once no watchlist uses them.
5. Run the QA routine (section 3).

## 1b. Add or refresh an upcoming IPO

1. Create `src/lib/ipo-content/<slug>.ts` exporting an `IpoReport` (`types.ts` documents every
   field) and add it to `IPOS` in `index.ts`.
2. Read the offer document itself (SEBI "Public Issues" filings or the exchange), then dated
   reporting for status, price band and dates. Restated consolidated figures only; unknown ->
   `null`. Cross-check issue size and financials in two sources; never include grey-market premium.
3. `status.stage` drives the order and chip: `open` / `upcoming` (dates fixed) / `approved`
   (SEBI observation received) / `filed`. Update `status`, `timeline` and `issue` as the IPO moves;
   once it lists, remove it from `IPOS` (its company can then join a sector).
4. Peers use NSE tickers; a ticker we already cover opens the stock pop-up from the deck.
5. `npx tsx scripts/check-ipo.ts <slug>`, `npm test`, then open the deck on phone and desktop.

## 2. Build or change a 3D model

- Procedural only (no external assets), using `models/kit.ts`. Quality bar: `ev4w.ts`,
  `energy.ts`, `datacenter.ts` - PBR materials, instanced repeats, merged small parts, ~150 draw
  calls.
- Materials go into `layerMats()` buckets; `applyLevel(v)` crossfades them (`tri()`/`smoothstep`)
  and ghosts context rather than hiding it. Each anchor sits **on** the part it labels and that
  part is visible at the zone's `layer`.
- Balance callout rails (3-4 per side) to avoid leader-line crossings from the default view.
- Views: 5-7, `overview` first. A view about one layer sets `layer` (it peels the model to it).
- Keep the scene compact (about +/-5 units); the engine fits default/top views to the stage, but
  very wide plinths still get small on phones.
- Verify every layer and every view in light and dark, at 375 px and 1440 px, with the tab in
  front (see the gotchas below).

## 3. QA and release routine

The bar the user set: **no omissions**. Before anything goes to `staging`:

1. **Checks:** types, lint (`src scripts`), tests, `validate:content`, every touched deck, and a
   production build.
2. **Neutral review by a fresh agent.** Give it URLs, viewports and what to inspect, never your
   own opinion of what's right. It reports observed problems only. Coverage:
   - Viewports: phone 360/375/390, tablet 768, desktop 1280/1440/1920.
   - Light and dark.
   - All sectors' overview pages and explorers.
   - The landing page, search, ideas, the stock pop-up (all tabs), `/docs` decks (every slide of
     the touched ones), `/connections`, `/updates`, `/companies`, company pages, login/signup,
     watchlist redirect, 404, sitemap/robots/OG images.
   - The console on every page.
3. Fix everything. For large batches, split by **file ownership** (explorer / live data + pop-up /
   pages + content) so parallel fixers never edit the same file.
4. **Final regression pass** that re-checks each earlier finding by number (FIXED / NOT FIXED /
   REGRESSED) plus a fresh sweep, then fix the leftovers and verify them yourself.
5. Commit to `staging` (leave `.claude/launch.json` out), push, then `staging` -> `main` via PR.

## 4. Gotchas we hit (and how to avoid them)

| Symptom | Cause | Avoid it by |
| --- | --- | --- |
| Dev server 500s with `JSON.parse ... position 760` after a build | `next build` and `next dev` share `.next/` | Stop the dev server, `rm -rf .next`, build, `rm -rf .next`, restart |
| 3D screenshots stale/blank, "0 fps" | The browser pane only renders the **fronted** tab | One tester drives 3D at a time; `tabs_select` before screenshots; judge the settled state |
| Theme flips mid-test | `nr-theme` in localStorage is shared by every tab | Set `document.documentElement.dataset.theme` directly when testing |
| REIT price "live" but from 2024 | Yahoo's plain `.NS` symbol is frozen after the move to the RR series | `isFreshQuote` + the `.NS`/`-RR.NS`/`-SM.NS`/`.BO` fallback chain |
| Fundamentals tab shows bare "%" | Empty consolidated template on Screener | `isUsablePage` -> standalone; drop empty sections |
| Same company twice on a sector page | Two supplier keys share a ticker | Count and list by ticker (`sectorCompanies`) |
| Sector revenue/news dominated by banks | Side-exposed mega-caps | `exposureType: "enabler"`; centrality |
| One earnings story five times in a feed | Several outlets, different wording | `sameStory` dedupe |
| Netflix "Lupin" tagged to the drugmaker | Single-word company names | `NOT_BUSINESS` filter + tests |
| Seed died after ~10 minutes | Remote pooler drops connections | The seed's retry extension; re-running is safe |
| `npm run lint` fails on unrelated files | It scans the ignored `media/` folder and old worktrees | Lint `src scripts` |
| Callouts pointing at the wrong part in other camera views | Markers off-screen still drew labels | Off-screen callouts are hidden; set `layer` on layer-specific views |
| Deep-linked system cropped the model on phones | Focus measured mid-animation | `focusZone` judges from the camera's destination and pans sideways only when needed |
| A sub-agent stopped by mistake can't be resumed | Stopped agents are final | Relaunch with the same brief (keep briefs in the conversation) |
