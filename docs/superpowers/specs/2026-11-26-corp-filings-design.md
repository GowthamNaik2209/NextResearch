# Corporate filings on Watchlist and Updates — design

Date: 26 Nov 2026 · Status: awaiting owner approval

## Intent

Headlines tell you what the press thinks; exchange filings tell you what the company actually
disclosed (order wins, results, acquisitions, ratings, management changes). Investors on the
watchlist want both, side by side, without opening NSE. The Updates page gets the same view across
every covered company, filtered by the theme dropdown.

## Goals

- **Watchlist**: a `News | Filings` toggle on the "News on your stocks" section. Filings = the
  saved stocks' material NSE announcements, newest first.
- **Updates**: a third view in the switch, `News | Filings | FII / DII` (the current "Updates"
  segment is renamed "News" — it is the page's name too). The themes dropdown filters filings
  exactly as it filters news.
- **Material only**, with type chips to narrow further (owner's pick, 26 Nov 2026).
- Each row: company, theme (Updates, all-themes only), type tag, time; NSE's one-paragraph summary;
  a link to the filing PDF.

## Non-goals

- BSE filings (BSE refuses automated requests; BSE-only companies show none).
- Filings in the stock pop-up / company page, the morning brief, alerts. Possible follow-ups.
- Tone (Positive / Negative / Neutral) on filings. Filings carry no tone dot.
- A database table or cron. Live fetch + cache, like news.

## Anti-goals

- A wall of routine paperwork (con-call schedules, newspaper ad copies, trading-window notices).
  That is what "material only" prevents.
- Restating or interpreting a filing. We show NSE's own summary and the PDF, nothing invented.

## Source (verified 26 Nov 2026)

`https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=DD-MM-YYYY&to_date=DD-MM-YYYY`
answers JSON for every NSE company in the range: 705 rows for 1.5 days, 18,652 rows (16 MB) for 30
days. It answered without cookies from here; production reuses the flows module's bare-then-cookie
retry (`src/lib/flows/nse.ts`) because Akamai is stricter with cloud IPs.
Fields used: `symbol`, `desc` (type), `voiceSummary` (plain-English summary; fall back to
`attchmntText`), `attchmntFile` (PDF), `an_dt` / `sort_date` (time).
`&symbol=X` without a range returns the company's whole history (HAL: 683 rows back to 2018).

## Material filter and chips

NSE's `desc` maps to a chip; anything unmapped is dropped.

| Chip | NSE types |
|---|---|
| Results | Outcome of Board Meeting and Investor Presentation (when the text is about results), Integrated Filing- Financial, Clarification - Financial Results |
| Orders | Bagging/Receiving of orders/contracts, Awarding of order(s)/contract(s), Agreements, Arrangements for … tie up, Capacity addition, Commencement of commercial production/operations, Product launch |
| Deals & stakes | Acquisition, Sale or disposal, Amalgamation/Merger, Demerger, Scheme of Arrangement, Other Restructuring, Open Offer / Public Announcement-Open Offer, Disclosure under SEBI Takeover Regulations, Issue of Securities, Preferential issue, Rights Issue |
| Payouts | Dividend, Record Date, Buyback / Public Announcement - Buyback, Bonus, Stock split |
| Ratings | Credit Rating, Credit Rating- Revision / New / Others |
| Management | Change in Management, Appointment, Resignation of Director/KMP/SMP, Change in Director(s), Change in Auditors, Resignation of Statutory Auditor |
| Other | Disclosure of material issue, Action(s) taken/initiated or orders passed, Pendency of Litigation(s), Granting/…/suspension of key licenses, Disruption of Operations, Strikes/Lockouts, Fraud/Default/Arrest, Monthly Business Updates, Press Release, and "General Updates" / "Updates" only when the summary matches a material keyword (order, contract, acquisition, results, dividend, rating, plant, launch, approval) |

Dropped: con-call / analyst-meet schedules, newspaper publications, shareholder-meeting notices,
trading window, ESOP allotments, loss of share certificates, monitoring agency reports, Reg. 32
statements, address / name changes, spurt-in-volume and price-movement clarifications, and the rest.
The table lives in one module with a test, so tuning it is a one-file change.

## How it's built (my calls, correctable)

- `src/lib/live/filings.ts`: fetch, parse (pure, tested on a saved fixture), classify, filter to
  covered tickers. Returns `{ items, live }`; never throws.
- Updates: one market-wide call for the last 7 days, filtered to covered companies (and the theme's
  companies when one is picked), cached 15 min with the in-process `cached()` helper — the raw
  response is several MB, over Next's 2 MB fetch-cache item limit, so only the small filtered result
  is cached. Shows the latest 30, like news.
- Watchlist: last 30 days for the saved tickers (a market-wide range call, or per-symbol with a date
  range if NSE honours it — builder checks which is lighter).
- State in the URL so it links and works without JavaScript: `/updates?view=filings&type=orders`,
  `/watchlist?feed=filings`. Chips are links, like the tone chips.
- Row look reuses the news list (two columns on desktop, single on phones); type tag where the tone
  dot sits; "PDF" link opens NSE's file in a new tab.
- When NSE doesn't answer: an empty state saying filings are unavailable right now, with a link to
  the company's NSE announcements page. No curated fallback (filings can't be invented).
- One small i button on the Filings view explaining "material only" and the source (help rule:
  one per section).
- SEO gate 6b: `/updates?view=filings` gets its own title, description, canonical, JSON-LD
  (CollectionPage), sitemap entry and llms.txt line; `seo.test.ts` extended.
- Phones: the three-segment switch and the two-segment toggle must fit at 375 px; buttons use the
  accent border.

## Left to the builder

Exact copy for the empty state and i-button text; whether watchlist uses range or per-symbol calls;
chip order on phones (scrolls horizontally if needed).
