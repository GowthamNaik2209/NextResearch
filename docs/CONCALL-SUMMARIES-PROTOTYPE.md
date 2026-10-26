# Earnings-call summaries: prototype

Generated 2026-10-26 16:25 UTC by `npx tsx scripts/concall-prototype.ts` --no-llm. Local, read-only: no database writes, nothing deployed.
Model: `claude-opus-5-5` (adaptive thinking, effort medium, structured JSON output). Prices used: $4 / $20 per million input / output tokens.

## Result

- Companies: 5 (Pharma, Defence); summarised: 0.
- Checks: none run (no summaries).

| Ticker | Industry | Filing found via | Pages | Status | Input tok | Output tok | Cost | Time |
|---|---|---|---|---|---|---|---|---|
| SUNPHARMA | Pharma | BSE | 21 | text only | - | - | - | - |
| CIPLA | Pharma | BSE | 19 | text only | - | - | - | - |
| LUPIN | Pharma | BSE | 18 | text only | - | - | - | - |
| HAL | Defence | NSE | 19 | text only | - | - | - | - |
| BEL | Defence | BSE | 21 | text only | - | - | - | - |

## Industry roll-ups

### Pharma

_Not produced: skipped (--no-llm)_

### Defence

_Not produced: skipped (--no-llm)_

## Company summaries

Each item carries the quote it rests on and its page. ⚠️ marks items the text check could not confirm.

### SUNPHARMA · Sun Pharmaceutical Industries (Pharma)

Source: BSE, filed 2026-08-06 · Announcement under Regulation 30 (LODR)-Earnings Call Transcript · [filing](https://www.bseindia.com/xml-data/corpfiling/AttachLive/34be7c92-1d9f-4010-ba30-2344c959bc5e.pdf) · 21 pages

_Text extracted; summary skipped (--no-llm)._

### CIPLA · Cipla (Pharma)

Source: BSE, filed 2026-07-27 · Announcement under Regulation 30 (LODR)-Earnings Call Transcript · [filing](https://www.bseindia.com/xml-data/corpfiling/AttachLive/a036a014-e0e9-4194-9a9e-9d44134da589.pdf) · 19 pages

_Text extracted; summary skipped (--no-llm)._

### LUPIN · Lupin (Pharma)

Source: BSE, filed 2026-08-12 · Announcement under Regulation 30 (LODR)-Earnings Call Transcript · [filing](https://www.bseindia.com/xml-data/corpfiling/AttachLive/fad86f0c-56cb-47d9-bd30-274370377ef3.pdf) · 18 pages

_Text extracted; summary skipped (--no-llm)._

### HAL · Hindustan Aeronautics (Defence)

Source: NSE, filed 22-May-2026 11:23:29 · Hindustan Aeronautics Limited has informed the Exchange about Transcript · [filing](https://nsearchives.nseindia.com/corporate/HAL_22052026111701_Transcript_May15-2026-signed.pdf) · 19 pages

_Text extracted; summary skipped (--no-llm)._

### BEL · Bharat Electronics (Defence)

Source: BSE, filed 2026-07-28 · Announcement under Regulation 30 (LODR)-Earnings Call Transcript · [filing](https://www.bseindia.com/xml-data/corpfiling/AttachLive/d2a747a3-664c-4c5d-9373-fcddc0d2a3ae.pdf) · 21 pages

_Text extracted; summary skipped (--no-llm)._

## How filings were fetched, and what failed

- **SUNPHARMA**: BSE announcements ✓ (Announcement under Regulation 30 (LODR)-Earnings Call Transcript) → download PDF ✓ (509 KB)
- **CIPLA**: cached filing ✓ (BSE 2026-07-27)
- **LUPIN**: BSE announcements ✓ (Announcement under Regulation 30 (LODR)-Earnings Call Transcript) → download PDF ✓ (3163 KB)
- **HAL**: cached filing ✓ (NSE 22-May-2026 11:23:29) → freshness ✗ (latest transcript filed 22-May-2026: no call filed for the latest quarter)
- **BEL**: cached filing ✓ (BSE 2026-07-28)

Failure cases seen:

- None in this run.

## Proposed storage

```prisma
// One row per company per call: our own summary and a link to the filing (never the transcript).
model ConcallSummary {
  id           String   @id @default(cuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  fiscalYear   Int      // 2027 for FY27
  quarter      Int      // 1-4
  callDate     DateTime?
  exchange     String   // "BSE" | "NSE"
  filingUrl    String   // the exchange attachment, shown as the source link
  filingDate   DateTime
  pdfSha256    String   // re-summarise only when the filing changes
  tone         String   // positive | cautiously positive | neutral | cautious | negative
  toneNote     String
  // Guidance / demand / risks / initiatives / key Q&A, each item with { quote, page } -
  // the shape the prototype writes (SUMMARY_SCHEMA in scripts/concall-prototype.ts).
  summary      Json
  checksPassed Int      // items whose quote and numbers were found in the PDF text
  checksTotal  Int
  model        String   // e.g. claude-opus-5-5
  promptVer    String   // bump when SUMMARY_SYSTEM / schema change
  inputTokens  Int
  outputTokens Int
  costUsd      Decimal
  status       String   @default("ok") // ok | scanned | missing | failed
  guidance     ConcallGuidance[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([companyId, fiscalYear, quarter])
  @@index([fiscalYear, quarter])
}

// Guidance pulled out as rows so it can be checked against FinancialSnapshot when the year's
// figures land (guidance vs delivery), and compared across an industry.
model ConcallGuidance {
  id         String         @id @default(cuid())
  summaryId  String
  summary    ConcallSummary @relation(fields: [summaryId], references: [id], onDelete: Cascade)
  metric     String         // revenue | margin | capex | order book | other
  targetYear Int?           // the FY the guidance is for, when stated
  low        Decimal?       // parsed range (%, or Rs crore), null when only directional
  high       Decimal?
  unit       String?        // "%", "Rs cr", "$ mn"
  statement  String
  quote      String
  page       Int
  delivered  Decimal?       // filled from FinancialSnapshot once the year closes
  verdict    String?        // met | missed | beat | pending

  @@index([metric, targetYear])
}

// Industry roll-ups are cheap to regenerate from the company rows; store them so pages load fast.
model ConcallRollup {
  id          String   @id @default(cuid())
  sectorSlug  String   // sector-content slug (pharma, defenceproc, ...)
  fiscalYear  Int
  quarter     Int
  rollup      Json     // headline, demand_themes, guidance_comparison, shared_risks, divergences, tone_mix
  companies   String[] // tickers that fed it
  model       String
  costUsd     Decimal
  createdAt   DateTime @default(now())

  @@unique([sectorSlug, fiscalYear, quarter])
}
```

`Company` gains `bseCode String?` (BSE scrip code) and `concalls ConcallSummary[]`. The scrip code is
what the BSE announcements endpoint keys on; NSE uses the ticker we already store.

## Notes for the production version

- **Getting filings.** BSE's `api.bseindia.com` announcements JSON and NSE's `/api/corporate-announcements`
  both sit behind Akamai bot protection and refuse plain scripted requests (the run above logs the
  response). Getting around that with browser imitation is not something we should build on. Options, in
  order of preference: a licensed data feed (BSE/NSE corporate-announcement feeds, or a vendor that
  redistributes filings); the companies' own investor-relations pages (most large caps post the
  transcript PDF there too, and IR pages do not block); or a manually triggered fetch per quarter.
  The SEBI LODR filing deadline (transcript within 5 working days of the call) gives a predictable
  window to look in.
- **Scrip codes.** `Company` has no BSE scrip code yet; the five used here are hard-coded in the script.
  Adding `bseCode` needs a one-off mapping (BSE's scrip master CSV), which is a DB write: ask first.
- **Scanned PDFs.** Detected by characters per page (< 300); those need OCR or Claude's own PDF input
  (send the PDF as a document block, which reads page images, at a higher token cost per page).
- **Presentations vs transcripts.** Some companies file the investor presentation under a similar
  heading; the script flags PDFs with no Q&A markers.
- **Guidance vs delivery.** Guidance items are kept with metric + period so they can be lined up
  against `FinancialSnapshot` revenue once the year closes (ConcallGuidance.delivered / verdict).
- **Cost levers.** Batch API halves the price and suits a nightly job; transcripts are 20-40 pages
  so a call is roughly 15-30k input tokens.
