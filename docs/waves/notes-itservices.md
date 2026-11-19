# Notes for the lead: itservices (IT Services & GCCs), Wave 2 consultant

Written 19 Nov 2026. Files touched: `src/lib/sector-content/sectors/itservices.ts`,
`sectors/itservices.extras.ts`, `reports/itservices.ts`, this file. `muted: true` removed after
`validate:content` and `check-report` passed (the lead decides when it goes live; re-add `muted` if the
data batch is not run before the next commit).

## Checks (19 Nov 2026)

- `npx tsx scripts/check-report.ts itservices`: **itservices: report OK**
- `npm run validate:content`: **No integrity problems found across 28 sectors**
- `npx tsc --noEmit`: **clean** (no errors)
- `check-index-coverage --industry="Information Technology"`: **25/25** (with itservices unmuted)
- `financials.test.ts` will fail until the `--add` batch below runs. Nothing was typed to work around it.

## Counts

12 zones (contract ids, unchanged order). 78 companies: 57 listed + 21 unlisted. One supplier key per
company; multi-zone links reuse the key: HCLTECH (tier1, infra_services medium), FSL (bpm,
healthcare_ops medium), SMARTWORKS (flex_workspace, gccs enabler), INDIQUBE (flex_workspace, gccs
enabler low).

Existing keys reused as the contract says: `tcs`, `infy`, `hcltech`, `techm` (nifty50/banks), `kpit`,
`tataelxsi` (ev4w), `cyient` (aerospace/semicon2), `ofss`, `intellect`, `nucleus` (banks), `netweb`
(datacenter, direct_supplier low), `infoEdge` (realestate/consumerinternet, enabler), `embassyReit`,
`knowledgeReit`, `mindspaceReit`, `brookfieldReit` (realestate, enabler low).

## Must-place Nifty 500 symbols (16 of 16 placed)

WIPRO, LTM (tier1); PERSISTENT, COFORGE, MPHASIS, HEXT, BSOFT, ZENSARTECH (midtier); FRACTAL (data_ai);
BBOX (infra_services); LTTS, TATATECH (erd); FSL, ECLERX (bpm); SAGILITY, IKS (healthcare_ops).
LTM confirmed on NSE as "LTM Limited" (renamed from LTIMindtree, effective 17 Apr 2026, NSE circular
CML73700; F&O symbol LTIM -> LTM from 27 Feb 2026).

Not linked, as the contract says: AFFLE, TANLA, ROUTE, RATEGAIN (consumerinternet `adtech`); MOSCHIP
(semiconductor modules).

## Company-to-zone map

| Zone | Companies |
|---|---|
| Large IT services | TCS; INFY; HCLTECH; WIPRO; TECHM; LTM; Accenture (India operations) (unlisted, NYSE); Cognizant (India operations) (unlisted, Nasdaq) |
| Mid-tier IT services | PERSISTENT; COFORGE; MPHASIS; HEXT; BSOFT; ZENSARTECH; SONATSOFTW; MASTEK; HAPPSTMNDS |
| Data, analytics & AI | FRACTAL; LATENTVIEW; Tiger Analytics (unlisted); Mu Sigma (unlisted) |
| IT infrastructure & network | BBOX; ADSL (Allied Digital); DSSL (Dynacons); HCLTECH; Sify Technologies (unlisted, Nasdaq); NETWEB [direct supplier, low] |
| Engineering R&D | LTTS; TATATECH; KPITTECH; TATAELXSI; CYIENT; SASKEN; EXPLEOSOL; QuEST Global (unlisted) |
| Software products & SaaS | OFSS; INTELLECT; NUCLEUS; NEWGEN; RAMCOSYS; QUICKHEAL; MAPMYINDIA; Zoho, Tally (unlisted); Freshworks (unlisted, Nasdaq) |
| BPM & knowledge | FSL; ECLERX; HGS; DATAMATICS; DIGITIDE; ALLDIGI; Teleperformance India (unlisted) |
| Healthcare operations | SAGILITY; IKS; FSL; Omega Healthcare, AGS Health (unlisted) |
| GCCs | JPMorgan Chase, Walmart Global Tech, Goldman Sachs, Target in India, Bosch Global Software Technologies (all unlisted); ANSR (unlisted, enabler); SMARTWORKS, INDIQUBE [enabler] |
| Tech staffing & hiring | NAUKRI [enabler]; TEAMLEASE; QUESS |
| Flexible & managed offices | AWFIS; SMARTWORKS; INDIQUBE; WEWORK; Table Space (unlisted); EMBASSY, KRT, MINDSPACE, BIRET [enabler, low] |
| Training & skilling | NIITMTS; NIITLTD; APTECHT; upGrad, Simplilearn (unlisted) |

Every listed ticker was checked live on 19 Nov 2026 against the Yahoo `.NS` quote feed (the same feed the
price store uses); all returned a current NSE quote.

## Needs --add (41 tickers not yet in the company table)

`npx tsx scripts/refresh-financials.ts --add=` (dry run first):

WIPRO, LTM, PERSISTENT, COFORGE, MPHASIS, HEXT, BSOFT, ZENSARTECH, SONATSOFTW, MASTEK, HAPPSTMNDS,
FRACTAL, LATENTVIEW, BBOX, ADSL, DSSL, LTTS, TATATECH, SASKEN, EXPLEOSOL, NEWGEN, RAMCOSYS, QUICKHEAL,
MAPMYINDIA, FSL, ECLERX, HGS, DATAMATICS, DIGITIDE, ALLDIGI, SAGILITY, IKS, TEAMLEASE, QUESS, AWFIS,
SMARTWORKS, INDIQUBE, WEWORK, NIITMTS, NIITLTD, APTECHT

Already tracked in the table (16): TCS, INFY, HCLTECH, TECHM, NETWEB, KPITTECH, TATAELXSI, CYIENT, OFSS,
INTELLECT, NUCLEUS, NAUKRI, EMBASSY, KRT, MINDSPACE, BIRET (read-only query, 19 Nov 2026).

## Calls made (and why)

- **ALLDIGI placed in `bpm`, not `infra_services`** (contract candidate list). Alldigi Tech is the former
  Allsec Technologies: payroll/HR and customer-experience outsourcing, held within Digitide. It has no
  infrastructure-services business.
- **DIGITIDE added** (Quess's demerged BPM/tech arm, listed Jun 2025). Bluspring (facility management)
  left out: not part of this chain.
- **CIGNITITEC left out**: last NSE quote May 2026 (absorbed by Coforge); mentioned only in Coforge's role.
- **WEWORK, DSSL, ADSL, EXPLEOSOL, QUICKHEAL, MAPMYINDIA, APTECHT, RAMCOSYS** added so people can find
  them; all small except WEWORK and MAPMYINDIA. MAPMYINDIA is a software-product company (maps for
  carmakers); a later Auto or Consumer Internet owner may also want to link it by the same ticker.
- **APTECHT** is mostly non-IT training (animation, aviation); linked low with a sector note.
- **Foreign-listed names** (Accenture, Cognizant, Freshworks, Sify) are `listed:false` with a note,
  as Wave 1 did for MakeMyTrip.
- **GCC zone** is unlisted operators plus enablers; SMARTWORKS and INDIQUBE are linked as enablers so the
  zone has listed names (their clients are largely GCCs).
- **Coforge-Encora deal size**: Coforge's release calls the combined firm "US$2.5Bn"; the deal itself is
  reported at about $2.35 bn (Outlook Business, S&P Global). Content says "a deal of about $2.35 bn".

## screenOut candidates (one-offs that distort rule-based screens)

| Ticker | Reason |
| --- | --- |
| COFORGE | Encora consolidated from 1 May 2026 (about 9.4 crore new shares, $550 mn loan): FY27 growth mostly acquired |
| QUESS | Demerged Digitide and Bluspring (effective 31 Mar 2025): history before FY26 not comparable |
| HGS | Earnings swing on other income from the 2021 healthcare sale and loss-making media assets |
| FRACTAL | Listed 16 Feb 2026: under a year of prices |
| DIGITIDE | Listed Jun 2025: short history, demerger-restated |
| WEWORK, SMARTWORKS, INDIQUBE | Listed 2025; lease accounting (Ind AS 116) makes reported profit and ROCE unrepresentative |
| RAMCOSYS | Loss-making history |

## News matcher (live/news.ts, owner's file)

- `ALIASES`: "LTIMindtree", "LTI Mindtree" -> LTM; "Naukri" -> NAUKRI (already aka); "MapmyIndia" ->
  MAPMYINDIA; "IKS" -> IKS; "Hexaware" -> HEXT; "Black Box" -> BBOX; "Firstsource" -> FSL; "HGS" -> HGS.
- `GROUP`: "tata" (TCS, TATATECH, TATAELXSI, Tata Motors...), "l&t" / "larsen" (LTM, LTTS, LT),
  "hinduja" (HGS vs Hinduja's other companies and Sagility's past), "niit" (NIITMTS vs NIITLTD),
  "mahindra" (TECHM), "quess" (QUESS vs DIGITIDE), "bosch" (BOSCHLTD vs Bosch Global Software, unlisted).
- `WORD_TICKERS`: LTM, IKS, HGS, FSL are short; "Quick Heal" is a phrase; "Sagility", "Fractal" (word:
  fractal geometry), "Mastek" OK.
- `OTHER_COMPANIES` look-alikes: Accenture, Cognizant, Capgemini, Infosys BPM (subsidiary, maps to INFY),
  Wipro Consumer Care (not listed separately), "Black Box Corporation" (US subsidiary), "WeWork Inc" (US),
  "Mphasis" vs "Mphasis Blackstone deal", "Zensar" vs "RPG", Tata Technologies vs "Tata Tech" (alias).
- `NOT_ABOUT`: "Bosch Global Software Technologies" must not match BOSCHLTD.

## Benchmark (benchmarks.ts SECTOR_INDEX)

Nifty IT (^CNXIT) or an ETF tracking it (e.g. NIFTYBEES-style IT ETFs such as ITBEES.NS) - check a year
of Yahoo history first.

## Cross-sector links worth noting

- banks `credit_rails`: OFSS, INTELLECT, NUCLEUS, TCS, INFY (same keys).
- realestate `office`: the four REITs (linked here as landlords only).
- ev4w: KPIT, Tata Elxsi; aerospace/semicon2: Cyient; datacenter: Netweb (same keys).
- consumerinternet / realestate: Info Edge.
- TCS's HyperVault data-centre unit (OpenAI as first customer, Feb 2026) could later be linked in the
  Data Centre industry under the same `tcs` key.

## Open questions

- HCLTech Q2 FY27 figures (revenue ₹35,620 Cr, bookings about $3.3 bn) come from secondary reports; the
  company filing was not opened.
- Infosys's previous FY27 guidance is reported as 1.5-3% (Staffing Industry Analysts, 23 Oct 2026); one
  summary says 1.5-3.5%.
- H-1B fee appeal: status after Jul 2026 not found; content says "the government is appealing".
