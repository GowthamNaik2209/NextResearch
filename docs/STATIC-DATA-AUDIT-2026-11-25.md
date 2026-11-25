# Static data audit - 25 Nov 2026

Read-only check of everything hand-authored or snapshotted: industry decks and sector/policy text, IPO
decks, the company table, index lists and market constants. Nothing was changed. Paths are relative
to `src/lib/sector-content/` unless they start with `src/`, `data/` or `scripts/`.
"Unconfirmed" = sources disagree or no primary source found.

## 0. Automated checks - all pass

| Check | Result |
|---|---|
| `npm run validate:content` | No integrity problems across 30 sectors |
| `scripts/check-report.ts` (all 29 decks) | All OK |
| `scripts/check-ipo.ts` | All 8 decks OK |
| `scripts/check-coverage.ts` | 0 unexplained gaps in 873 listed tickers; no stale baskets or benchmarks |
| `scripts/check-index-coverage.ts` | Nifty 500: 475/500 (95%) |

## 1. Stock data (company table, read-only queries)

Healthy: 872/873 KPI snapshots dated 25 Nov 2026; FY26 figures for 867; Sep 2026 shareholding for
835+; prices topped up to 25 Nov for 882 series.

| Item | Detail |
|---|---|
| DIGIFIBRE | KPI snapshot stuck at 20 Oct, no price (BSE-only InvIT; known W6) |
| Lender NPAs a quarter+ old | `npaQuarter` still Jun 2026 for SUNDARMFIN, SATIN, CGCL, HDBFS, APTUS, REPCOHOME, UGROCAP; Mar 2026 for CHOLAHLDNG; **Dec 2025 for IFCI**. 70 others are Sep 2026 |
| No FY26 | SPICEJET (also shareholding stuck at Mar 2026), ENRIN, KWIL ("FY26 not on Screener" - worth a recheck), BAGMANE, IGIL, SIEMENS (explained by notes) |
| Off-cycle shareholding rows | 27 tickers have Oct/Nov 2026 rows (e.g. JIOFIN, PERSISTENT, OLAELEC, a `2026-11-30` "quarter"). The FII/DII view already ignores non-quarter months (`src/lib/flows/query.ts:344`), so harmless there |
| Orphan price series | `BARBEQUE` and `ORKLA` keys stopped at 20 Nov; content uses UFBL / ORKLAINDIA. Housekeeping |
| `data/insurer-metrics.json` | 11/13 at Sep 2026. **NIACL and GICRE still Q1 FY27 (Jun 2026)**: NIACL Q2 CR 156.2%, solvency 1.61x (secondary source); GICRE solvency 4.18, Q2 CR unconfirmed |

## 2. Market constants and index lists

| Item | Status |
|---|---|
| `src/lib/baskets/projection.ts` rf 5.50% (7 Oct 2026) | Correct. Next MPC decision **4 Dec 2026** |
| erp 7.08% (Jan 2026) | **Stale** - Damodaran July 2026: India total ERP **6.92%** (CRP 2.72%, MMP 4.20%) |
| `src/lib/brief/key-dates.ts` | **Missing RBI MPC decision 4 Dec 2026** (in the brief's 14-day window now). Fed entry dated 9 Dec though it lands 10 Dec IST (minor) |
| `data/nifty500.csv` | Identical to the live file (Sep 2026 review included) |
| Nifty 50 constituents | Match live list (BSE in, WIPRO out) |
| `indices/nifty50.extras.ts:30`, `nifty50.ts:62,252` | "RBI cuts rates further" / rate-cut framing - wrong after the Oct hike |
| `benchmarks.ts` | All 18 Yahoo symbols live. Header says telecom has no index - Nifty Telecommunications and Nifty Hospitals launched Jun 2026, but no Yahoo history yet, so can't be wired |
| `NEWS_ASOF` in `products.ts` | "25 Sep 2026" - two months old |
| Marketing counts | Derived from the registry, none hard-coded |

## 3. IPO decks

| Deck | Problem |
|---|---|
| **oyo** | Fresh issue **halved to ₹3,350 Cr** (Oct addendum), debt repayment ~₹2,500 Cr; ET reports Jan-Mar 2027 at ₹20-22k Cr valuation vs deck's US$7-8bn - size, use of proceeds, valuation maths and scenarios all wrong |
| **phonepe** | IPO restarted (Reuters/BS, 25 Nov): Jan-Mar 2027, US$12-15bn (deck ~US$10bn); refile after Dec-quarter results; a ₹3-5k Cr fresh issue reported (deck says pure OFS) |
| zepto | Still holds (on hold, Feb-May 2027). Minor date differences between sources |
| zetwerk | NSE listing price ₹159.25, not ₹159.20; premium ~5.5% not 5.4% (lines 19, 29) |
| nse | "21 Oct anchor lock-in" milestone still `done: false` and listed as upcoming in status + risk row |
| jio-platforms, manipal-hospitals, paras-healthcare | Verified correct |

### Mainboard issues now / next (for the owner to pick from)

| Company | Industry | Dates | Band | Size ₹ Cr |
|---|---|---|---|---|
| Mahanadi Coalfields | Coal (Coal India unit) | closed 23 Nov; lists **27 Nov** | ₹129-136 | 8,981 (all OFS) |
| Crystal Crop Protection | Agrochemicals | closed; lists **26 Nov** | ₹259-272 | 455 |
| Foodlink F&B | Catering / QSR | 26-30 Nov; lists 3 Dec | ₹181-191 | 361 |
| Integris Medtech | Medical devices | 27 Nov-1 Dec (unconfirmed) | not out | ₹600 fresh + OFS |
| Matangi Rubber | Tyres/rubber | 1-3 Dec | ₹163-172 | 125 |
| Monomark Engineering | Industrial O&M | 2-4 Dec | ₹60-65 | 176 |
| Encube Ethicals | Pharma | 3-7 Dec (unconfirmed) | not out | 3,000 (OFS) |

Big pipeline (₹1,000 Cr+, SEBI nod or DRHP Sep-Nov): Razorpay (nod 3 Nov), MakeMyTrip India (nod 6
Nov), Sembcorp Green Infra (₹3,750 Cr, nod 13 Nov), Sagar Defence (nod 4 Nov), Encube (nod 4 Nov),
Inox Clean Energy (₹10,000 Cr DRHP), Hindustan Coca-Cola (~₹9,500-10,000 Cr DRHP), JSW One
(₹3,054 Cr DRHP), South Eastern Coalfields (DRHP), NLC India Renewables (DRHP), Spinny (confidential).

### Listings since 1 Sep not covered on the platform

Only 5 of 47 mainboard listings since 1 Sep are covered (KARAMTARA, NSE, ZETWERK, JPL, PARASHLTH).
Candidates that fit an existing industry:

| Ticker | Company | Size ₹ Cr | Likely home |
|---|---|---|---|
| BONFIG | Bonfiglioli Transmissions | 2,534 | autos / capital goods (gearboxes) |
| ELEVATE | Elevate Campuses | 2,100 | realestate (student housing) |
| TONBO | Tonbo Imaging | ~1,266 | aerospace / defenceproc (electro-optics) |
| RENTOMOJO | Rentomojo | 1,256 | consumerinternet |
| EDELALTS | EAAA India Alternatives | 1,200 | capmarkets (AMC/alternatives) |
| MONEYVIEW | Moneyview | 1,092 | banks (fintech lender) |
| KANOHAR | Kanohar Electricals | 1,056 | transmission (transformers) |
| HEROMOTORS | Hero Motors | 1,000 | autos / ev4w (components) |
| MPIMANIPAL | Manipal Payment & Identity | 805 | consumerinternet / banks (cards) |
| HDFIRE | HD Fire Protect | 712 | realestate (building systems) |
| VARMORA | Varmora Granito | 708 | realestate (tiles) |
| FUSIONCX | Fusion CX | 702 | itservices (BPO) |
| SFCTECH | SFC Environmental | 668 | energy / greenh2? (waste-water) - weak fit |
| ORIENTCABL | Orient Cables | 552 | telecom5g (fiber/cables) |
| PRASOLCHEM | Prasol Chemicals | 500 | chemicals |
| SMT | Sahajanand Medical Tech | 475 | hospitals (devices) |
| ACEVECTOR | Acevector (Snapdeal) | 420 | consumerinternet |
| GLASSWALL | Glass Wall Systems | 428 | realestate (façades) |

Coming this week: Mahanadi Coalfields (27 Nov) -> energy; Crystal Crop (26 Nov) -> chemicals (agro).
Nifty 500 names still in no module: AIAENG, ACE, CPPLUS, CARBORUNIV, ELECON, GPIL, GRAPHITE,
JINDALSAW, KSB, RHIM, TEGA, USHAMART, WELCORP, JSL, LLOYDSME, NSLNISP, SARDAEN, ATGL, BHARATCOAL,
IGL, MGL, SWANCORP, IRB, PFOCUS, MMTC.

## 4. Industry decks and sector text

### High impact

| Slug | file:line | Problem -> correction |
|---|---|---|
| solarmodules | reports/solarmodules.ts:17, 23, 96 | FY26 solar added "~35-38 GW" -> **44.6 GW** (MNRE record) |
| solarmodules | :82, :15 | "~130 GW installed" -> ~150 GW (Mar 2026); ALMM ">100 GW" -> ~170 GW |
| solarmodules | :51-53, 155, 182 | US AD/CVD shown as a petition -> finalised 11 Sep (AD 123%, CVD 126%), ITC injury 14 Oct |
| solarmodules | :127 | Mix FY25 -> FY26 (rooftop 8.71 GW, KUSUM 7.67 GW) |
| energy | reports/energy.ts:15, 96 | FY26 capacity "~515 GW" -> ~533 GW (CEA, Mar 2026) |
| energy | :18, :27, :101, :126-133 | Peak "250 GW+" -> 270.8 GW (21 May 2026); solar "30 GW+/yr" -> 44.6 GW in FY26; solar "Mar 2025 ~106 GW" + mix -> Mar 2026 (150 GW) |
| rareearth | reports/rareearth.ts:74, 106, 119; policies/rareearth.ts:28, 40, 185; extras:10, 12 | "China pause runs to 10 Nov 2026" -> extended 9 Nov to **10 Jan 2027** |
| rareearth | reports/rareearth.ts:16, 39, 52-53, 84, 101, 122; policies:214; extras:59 | "56 of 88 blocks" -> 64 of 100 after 8 tranches; 9th tranche (20 blocks) launched 5 Nov |
| railways | reports/railways.ts:12, 15, 23, 96-98, 102 | Ignores Budget 2026-27: FY27 BE capex **₹2.93L Cr** (record, +10.5%); "no longer rising fast" and FY28P below FY27 BE |
| semiconductors | reports/semiconductors.ts:27, 102, 120 | "Centre funds ~50%" -> 50% under ISM 1.0, 25-40% under Semicon 2.0 |
| semiconductors | :97 vs semicon2.ts:121 | 2030 demand US$105bn vs ~US$90bn - pick one |
| consumerinternet | reports:12, 83, 103, 190; sectors:18, 133; extras:30 | UPI MDR "starts after Diwali" -> no start date notified as of late Nov (Jan 2027 floated) |
| telecom5g | sectors/telecom5g.ts:170 | Airtel "largest listed telco by market cap" - lead swaps with Jio; drop the claim |
| telecom5g | :174 | Jio "track record only days old" -> a month now |
| chemicals / fmcg | chemicals:15, 23; fmcg:27, 122 | "Hormuz closed since Mar 2026" -> "severely disrupted" (partial recovery; unconfirmed) |
| chemicals / consumerbrands | chemicals:73; consumerbrands:74, 183-188; consumerbrands.extras:54 | US tariff "18%" / "15%" -> struck down / lapsed 24 Jul; 10% Section 301 duty since |

### Medium / low

| Slug | file:line | Problem -> correction |
|---|---|---|
| ecms | reports/ecms.ts:16-17, 91-99, 124-130 | "106 projects, ₹69,548 Cr" -> +12 approvals on 6 Nov (~118, ~₹77k Cr; unconfirmed totals) |
| ecms | policies/ecms.ts:57, 117, 178, 192 | Motherson / Wipro plants "due Oct-Nov 2026" - no start found |
| greenh2 | policies/greenh2.ts:31, 105; extras:14 | "Tranche I factories due from Aug 2026" - missed; Reliance now says 2027 |
| autos | reports/autos.ts:53, 178; sectors/autos.ts:219 | Iveco 89.42% -> final 96.25%, squeeze-out under way |
| datacenter | reports/datacenter.ts:15, 16, 94-96, 192-194 | 2025 ~1.4 GW -> ~1.6-1.75 GW (H1 2026); 2030 4-5 GW below consensus (JLL 6 GW by 2029); Budget 2026 tax holiday missing |
| aerospace | reports/aerospace.ts:59-65, 96 | Tejas Mk1A update (first squadron by Mar 2027); private share 23% vs defenceproc 24% |
| ev4w | reports/ev4w.ts:129-132 | Mix -> FY26 actual Tata 39.2 / MG 26.4 / Mahindra 21.2 / others 13.2 |
| naval | reports/naval.ts:72-75, 177, 126-128, 142 | P-75I now awaiting CCS after MoF nod; mix FY26 BE vs FY27 BE; capital outlay +21.8% not ~10% |
| pharma | reports/pharma.ts:97 | "FY26P" marked projected - it's an actual |
| pliacc | reports/pliacc.ts:60; policies/pliacc.ts:22, 29 | Grid-storage round: 22 bids received, award pending |
| insurance | sectors/insurance.ts:162; extras:34 | Bima Sugam "expected Nov 2026" - not live (unconfirmed) |
| hospitals | sectors/hospitals.extras.ts:44 | Premiums "~15%" vs deck's ~17% |
| realestate | sectors/realestate.ts:253 | Ambuja "with Sanghi, Penna" - both merged in 2026 |
| capmarkets | reports/capmarkets.ts:74, 15-16 | Jane Street SAT order reserved (unconfirmed); Oct AMFI data out |
| banks | reports/banks.ts:15, 107, 124, 127-134 | Credit/deposit to 31 Oct (19.26% / 16.76%); MFIN Mar 2026 edition |
| nifty50 | see section 2 | Rate-cut framing |

Nothing material: defenceproc, hotels, itservices, transmission, semicon2. No hard-coded market cap,
P/E or price for a listed company anywhere in deck or sector text.

### Still open from COVERAGE-AUDIT-2026-11.md

Elgi in railways/braking (weak fit); MIC Electronics in telecom5g/ems; NFTDC linked as an enabler in
rareearth; Olectra/JBM in ev4w/oem without a relabel; HCL-Foxconn named differently in
semiconductors vs semicon2. Everything else in sections 1-2 is fixed.
