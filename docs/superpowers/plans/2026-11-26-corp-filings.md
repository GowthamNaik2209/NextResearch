# Corporate Filings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Material NSE corporate filings as a `Filings` view on /updates (theme dropdown + type chips) and a `News | Filings` toggle on /watchlist.

**Architecture:** A pure parser/classifier (`src/lib/filings/classify.ts`) plus a fetcher (`src/lib/live/filings.ts`) that reads NSE's announcements API, keeps covered companies' material filings and caches the small result in-process for 15 min. A `FilingsFeed` server component renders them in the news list's look. URL state: `/updates?view=filings&type=<chip>`, `/watchlist?feed=filings`.

**Tech Stack:** Next.js app router (server components), TypeScript, `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-26-corp-filings-design.md`

## Global Constraints

- NSE only; `https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=DD-MM-YYYY&to_date=DD-MM-YYYY[&symbol=X]`.
- Bare request first; on 401/403 load `https://www.nseindia.com/` for cookies and retry once (same as `src/lib/flows/nse.ts`). Never throw; null on failure.
- Updates: last 7 days, latest 30 shown. Watchlist: last 30 days, latest 20 shown.
- Cache 15 min via `cached()` from `src/lib/live/cache.ts` (not Next's fetch cache: the raw response is several MB).
- Chips, in order: All, Results, Orders, Deals & stakes, Payouts, Ratings, Management, Other. Query values: `results`, `orders`, `deals`, `payouts`, `ratings`, `management`, `other`.
- Companies: same pool as news — all themes = `listCompanyMetrics()`; one theme = `sectorCompanyMetrics(slug)`; both filtered to `centrality >= CORE_CENTRALITY`.
- Buttons/chips/segments use `border-btn` (accent border); one InfoTip per section.
- Copy says "covered companies", never "our companies".

## Review Focus

1. NSE refuses (403 from Vercel) → page shows the "unavailable" line with an NSE link, never a crash or blank box. (Task 2 test: fetcher returns null on non-JSON body.)
2. A filing whose `voiceSummary` is empty/"null" → falls back to `attchmntText`; boilerplate "has informed the Exchange about X" stays readable. (Task 1 test.)
3. "General Updates"/"Updates" filings with no material keyword are dropped; with one, kept as Other. (Task 1 test.)
4. A chip with zero filings is shown greyed and not a link (as tone chips do). (Task 3 visual check.)
5. A stock removed from the watchlist mid-session: the Filings toggle disappears with the news section (WatchlistNewsGate wraps both). (Task 4 visual check.)

---

### Task 1: Classifier and parser

**Files:**
- Create: `src/lib/filings/classify.ts`, `src/lib/filings/classify.test.ts`, `src/lib/filings/__fixtures__/nse-announcements.json` (a trimmed real response: ~15 rows across types)

**Interfaces — Produces:**
- `type FilingType = "results" | "orders" | "deals" | "payouts" | "ratings" | "management" | "other"`
- `const FILING_TYPES: { type: FilingType; label: string }[]` (chip order/labels above)
- `type Filing = { ticker: string; company: string; type: FilingType; subject: string; summary: string; url: string; ts: number }`
- `classifyFiling(desc: string, text: string): FilingType | null` (null = not material)
- `parseAnnouncements(json: unknown): Filing[]` — `ts` from `sort_date` ("YYYY-MM-DD HH:mm:ss", IST → UTC ms), `subject` = `desc`, `summary` = `voiceSummary` unless empty/"null", else `attchmntText`; drops rows with no symbol, no URL, or non-material type; returns newest first.

- [ ] Tests: `classifyFiling("Bagging/Receiving of orders/contracts","…")==="orders"`; `("Copy of Newspaper Publication","…")===null`; `("Analysts/Institutional Investor Meet/Con. Call Updates","…")===null`; `("Outcome of Board Meeting","…approved the unaudited financial results…")==="results"`; `("Outcome of Board Meeting","…appointment of director…")==="other"`; `("General Updates","…received a letter of award…")==="other"`; `("General Updates","…change in registered office…")===null`; `("Credit Rating- Revision","")==="ratings"`; `parseAnnouncements(fixture)` keeps only material rows, newest first, IST timestamp correct (`"2026-11-26 20:39:57"` → `Date.UTC(2026,10,26,15,9,57)`), summary falls back when `voiceSummary` is null.
- [ ] Run `npx tsx --test src/lib/filings/classify.test.ts` → fail, implement, → pass.
- [ ] Commit.

### Task 2: Fetcher

**Files:** Create `src/lib/live/filings.ts`, `src/lib/live/filings.test.ts`

**Interfaces — Consumes:** Task 1. **Produces:**
- `type FilingItem = Filing & { sectorSlug: string; sectorName: string }`
- `type FilingsResult = { items: FilingItem[]; live: boolean }` (`live:false` = NSE didn't answer)
- `getLatestFilings({ sectorSlug?: string; type?: FilingType; limit?: number }): Promise<FilingsResult & { counts: Record<FilingType, number> }>` — one market-wide 7-day call (cache key `filings:market:<from>`), filtered to the company pool; counts over the pool before the type filter.
- `getFilingsForTickers(tickers: string[], limit?: number): Promise<FilingsResult>` — per-symbol 30-day calls, pool of 4, each cached 15 min (`filings:sym:<T>`); sector = `primarySector(ticker)`.
- `nseRange(days: number, now?: Date): { from: string; to: string }` (DD-MM-YYYY, IST day).

- [ ] Tests: `nseRange(7, new Date("2026-11-26T20:00:00Z"))` → `{from:"20-11-2026", to:"27-11-2026"}` (IST date already 27th); `parseAnnouncements("<html>Access Denied")` path → fetch helper `readJson` returns null for non-JSON text.
- [ ] Implement; run tests; commit.

### Task 3: Updates Filings view

**Files:**
- Create: `src/components/FilingsFeed.tsx` (Suspense + skeleton like NewsFeed), `src/components/FilingsList.tsx` (row: company StockLink, theme link when `showSector`, `NewsTime`; type tag pill in place of the tone light; summary as body text; "Filing PDF ↗" link + NSE subject on the source line), `src/app/updates/TypeChips.tsx`
- Modify: `src/app/updates/controls.ts` (`UpdatesView = "news" | "filings" | "flows"`, `type?: FilingType` in state, `?view=filings`, `?type=` only on filings), `ViewSwitch.tsx` (News | Filings | FII / DII), `page.tsx` (render; `generateMetadata` for `view=filings`: title "Corporate filings: results, orders and deals from covered companies", canonical `/updates?view=filings`; JsonLd CollectionPage), `IndustrySelect.tsx` / `PeriodSelect.tsx` if they build hrefs with view.

**FilingsFeed props:** `{ sectorSlug?: string; tickers?: string[]; type?: FilingType; limit: number; showSector?: boolean; twoColumns?: boolean; listClassName?: string; header?: (counts) => ReactNode; emptyText?: string }`.

Footer line: live → "Material filings from NSE, refreshed every 15 minutes."; not live → "NSE filings are unavailable right now — see them on nseindia.com." (link `https://www.nseindia.com/companies-listing/corporate-filings-announcements`).

TypeChips InfoTip ("What counts as a filing here"): "Announcements covered companies made to NSE in the last 7 days, keeping results, orders, deals, payouts, ratings and management changes. Routine notices (call schedules, newspaper copies, trading-window dates) are left out. The summary is NSE's own; open the PDF for the full filing."

- [ ] Implement; `npx tsc --noEmit`; check in browser (desktop + 375 px): switch fits, chips link and grey out at 0, theme dropdown keeps `view=filings`.
- [ ] Commit.

### Task 4: Watchlist toggle

**Files:** Create `src/app/watchlist/FeedToggle.tsx` (two Link segments, `?feed=filings` / none, `scroll={false}`); modify `src/app/watchlist/page.tsx` (read `searchParams.feed`; heading "News on your stocks" / "Filings by your stocks"; subline "Headlines on the companies you saved." / "Material NSE announcements from the last 30 days."; toggle at the heading row's right; `FilingsFeed tickers={watched} limit={20} showSector={false} listClassName={NEWS_BOX}`).

- [ ] Implement; tsc; browser check phone + desktop; commit.

### Task 5: SEO + docs

**Files:** `src/app/sitemap.ts` (+ `/updates?view=filings`), `src/app/llms.txt/route.ts` (+ line), `src/app/seo.test.ts` (assert both), `docs/ARCHITECTURE.md` if it lists live sources.

- [ ] `npm test -- --test-concurrency=1` subset: `npx tsx --test src/app/seo.test.ts src/lib/filings/*.test.ts src/lib/live/filings.test.ts` → pass; `npx tsc --noEmit`; `npx eslint` on changed files. Commit.
