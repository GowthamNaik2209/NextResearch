# Wave 1: Banks & NBFCs, Insurance, Hotels & Travel

Wave 1 added three industries to NextResearch. All three are live (unmuted) on branch `claude/industries-wave-1`. Content date for the write-ups is 18 Nov 2026.

| Industry | Source file | Layers | Zones | Companies | Listed | Unlisted |
|---|---|---|---|---|---|---|
| Banks & NBFCs | `src/lib/sector-content/sectors/banks.ts` | Specialist Lenders, Banks, Groups & State Lenders, Rails & Regulators | 15 | 104 | 96 | 8 |
| Insurance | `src/lib/sector-content/sectors/insurance.ts` | Distribution, Insurers, Claims & Reinsurance, Capital & Regulation | 10 | 47 | 27 | 20 |
| Hotels & Travel | `src/lib/sector-content/sectors/hotels.ts` | Hotels & Stays, Leisure & Holidays, Getting There, Booking & Capital | 11 | 44 | 30 | 14 |

A company can sit in more than one zone (for example Shriram Finance is a high link in vehicle finance and a medium link in small-business loans), so zone rows add up to more than the company count.

How to read the maps: "(unlisted)" means no stock-exchange listing, so no price or figures. "[enabler]", "[owner]" and "[new entrant]" mark how the company relates to the zone; unmarked names are operators. Companies that are listed but have an enabler role (for example a bank in the insurance chain) are marked the same way.

## 1. Company-to-zone map

### Banks & NBFCs

| Layer | Zone | Companies |
|---|---|---|
| Specialist Lenders | Consumer loans & credit cards | Bajaj Finance (BAJFINANCE); SBI Cards and Payment Services (SBICARD); HDB Financial Services (HDBFS); Poonawalla Fincorp (POONAWALLA); OnEMI Technology Solutions (Kissht) (KISSHT); One 97 Communications (Paytm) (PAYTM) [enabler] |
| Specialist Lenders | Vehicle & equipment finance | Shriram Finance (SHRIRAMFIN); Cholamandalam Investment and Finance (CHOLAFIN); Mahindra & Mahindra Financial Services (M&MFIN); Sundaram Finance (SUNDARMFIN); Tata Capital (TATACAP); HDB Financial Services (HDBFS) |
| Specialist Lenders | Gold loans | Muthoot Finance (MUTHOOTFIN); Manappuram Finance (MANAPPURAM); IIFL Finance (IIFL); CSB Bank (CSBBANK) |
| Specialist Lenders | Microfinance | CreditAccess Grameen (CREDITACC); Spandana Sphoorty Financial (SPANDANA); Fusion Finance (FUSION); Satin Creditcare Network (SATIN); Muthoot Microfin (MUTHOOTMF); Bandhan Bank (BANDHANBNK) |
| Specialist Lenders | Small-business & property-backed loans | Five-Star Business Finance (FIVESTAR); Capri Global Capital (CGCL); SBFC Finance (SBFC); UGRO Capital (UGROCAP); MAS Financial Services (MASFIN); Shriram Finance (SHRIRAMFIN); Cholamandalam Investment and Finance (CHOLAFIN); IIFL Finance (IIFL) |
| Specialist Lenders | Affordable housing finance | Aadhar Housing Finance (AADHARHFC); Aavas Financiers (AAVAS); Home First Finance Company India (HOMEFIRST); Aptus Value Housing Finance (APTUS); India Shelter Finance (INDIASHLTR); Repco Home Finance (REPCOHOME) |
| Banks | Large banks | HDFC Bank (HDFCBANK); ICICI Bank (ICICIBANK); State Bank of India (SBIN); Axis Bank (AXISBANK); Kotak Mahindra Bank (KOTAKBANK) |
| Banks | Public-sector banks | Bank of Baroda (BANKBARODA); Punjab National Bank (PNB); Canara Bank (CANBK); Union Bank of India (UNIONBANK); Indian Bank (INDIANB); Bank of India (BANKINDIA); Bank of Maharashtra (MAHABANK); Central Bank of India (CENTRALBK); Indian Overseas Bank (IOB); UCO Bank (UCOBANK); Punjab & Sind Bank (PSB) |
| Banks | Mid-size & regional private banks | IndusInd Bank (INDUSINDBK); IDFC First Bank (IDFCFIRSTB); Yes Bank (YESBANK); Federal Bank (FEDERALBNK); RBL Bank (RBLBANK); IDBI Bank (IDBI); Bandhan Bank (BANDHANBNK); City Union Bank (CUB); Karur Vysya Bank (KARURVYSYA); Jammu and Kashmir Bank (J&KBANK); Tamilnad Mercantile Bank (TMB); Karnataka Bank (KTKBANK); South Indian Bank (SOUTHBANK); DCB Bank (DCBBANK); CSB Bank (CSBBANK) |
| Banks | Small finance & payments banks | AU Small Finance Bank (AUBANK); Equitas Small Finance Bank (EQUITASBNK); Ujjivan Small Finance Bank (UJJIVANSFB); Jana Small Finance Bank (JSFB); Utkarsh Small Finance Bank (UTKARSHBNK); Suryoday Small Finance Bank (SURYODAY); ESAF Small Finance Bank (ESAFSFB); Capital Small Finance Bank (CAPITALSFB); Fino Payments Bank (FINOPB) [enabler] |
| Groups & State Lenders | Diversified NBFCs & holding companies | Tata Capital (TATACAP); L&T Finance (LTF); Aditya Birla Capital (ABCAPITAL); Piramal Finance (PIRAMALFIN); Sammaan Capital (SAMMAANCAP); Jio Financial Services (JIOFIN); Authum Investment & Infrastructure (AIIL) [enabler]; Bajaj Finserv (BAJAJFINSV); Bajaj Holdings & Investment (BAJAJHLDNG) [owner]; Cholamandalam Financial Holdings (CHOLAHLDNG) [owner] |
| Groups & State Lenders | Prime housing finance | Bajaj Housing Finance (BAJAJHFL); LIC Housing Finance (LICHSGFIN); PNB Housing Finance (PNBHOUSING); Can Fin Homes (CANFINHOME); HDFC Bank (HDFCBANK); State Bank of India (SBIN); Sammaan Capital (SAMMAANCAP) |
| Groups & State Lenders | State infrastructure lenders | Power Finance Corporation (PFC); REC (RECLTD); Indian Railway Finance Corporation (IRFC); Indian Renewable Energy Development Agency (IREDA); Housing and Urban Development Corporation (HUDCO); IFCI (IFCI) |
| Rails & Regulators | Regulator, refinancers & resolution | Reserve Bank of India (unlisted); NABARD (unlisted) [enabler]; SIDBI (unlisted) [enabler]; National Housing Bank (unlisted) [enabler]; NaBFID (unlisted) [enabler]; National Asset Reconstruction Company (unlisted) [enabler]; Edelweiss Financial Services (EDELWEISS) [enabler] |
| Rails & Regulators | Bureaus, payments & lending software | TransUnion CIBIL (unlisted) [enabler]; NPCI (unlisted) [enabler]; Pine Labs (PINELABS) [enabler]; One 97 Communications (Paytm) (PAYTM) [enabler]; Oracle Financial Services Software (OFSS) [enabler]; Nucleus Software Exports (NUCLEUS) [enabler]; Intellect Design Arena (INTELLECT) [enabler]; Tata Consultancy Services (TCS) [enabler]; Infosys (INFY) [enabler] |

Unlisted (8): RBI, NABARD, SIDBI, NHB, NaBFID, NARCL (regulators, refinancers and the bad-loan buyer) and TransUnion CIBIL, NPCI (rails).

### Insurance

| Layer | Zone | Companies |
|---|---|---|
| Distribution | Bank partners (bancassurance) | State Bank of India (SBIN) [enabler]; HDFC Bank (HDFCBANK) [enabler]; ICICI Bank (ICICIBANK) [enabler]; Axis Bank (AXISBANK) [enabler]; Kotak Mahindra Bank (KOTAKBANK) [enabler]; Canara Bank (CANBK) [enabler] |
| Distribution | Online marketplaces & brokers | PB Fintech (PolicyBazaar, Paisabazaar) (POLICYBZR) [enabler]; Turtlemint Fintech Solutions (TURTLEMINT) [enabler]; InsuranceDekho (unlisted) [enabler]; Prudent Corporate Advisory Services (PRUDENT) [enabler] |
| Insurers | Bank-promoted life insurers | HDFC Life Insurance (HDFCLIFE); SBI Life Insurance (SBILIFE); ICICI Life Insurance (ICICILIFE); Max Financial Services (Axis Max Life) (MFSL); Canara HSBC Life Insurance (CANHLIFE); IndiaFirst Life Insurance (unlisted) |
| Insurers | LIC and group-owned life insurers | Life Insurance Corporation of India (LICI); Bajaj Life Insurance (unlisted); Tata AIA Life Insurance (unlisted); Aditya Birla Sun Life Insurance (unlisted); Kotak Mahindra Life Insurance (unlisted); PNB MetLife India Insurance (unlisted); Bajaj Finserv (BAJAJFINSV) [owner] |
| Insurers | Multi-line general insurers | ICICI Lombard General Insurance (ICICIGI); New India Assurance (NIACL); Go Digit General Insurance (GODIGIT); Bajaj General Insurance (unlisted); HDFC ERGO General Insurance (unlisted); Tata AIG General Insurance (unlisted) |
| Insurers | Standalone health insurers | Star Health and Allied Insurance (STARHEALTH); Niva Bupa Health Insurance (NIVABUPA); Care Health Insurance (unlisted); Aditya Birla Health Insurance (unlisted); ManipalCigna Health Insurance (unlisted); ICICI Lombard General Insurance (ICICIGI); New India Assurance (NIACL) |
| Claims & Reinsurance | Reinsurers | General Insurance Corporation of India (GIC Re) (GICRE); Allianz Jio Reinsurance (unlisted) [new entrant]; Munich Re (India branch) (unlisted); Swiss Re (India branch) (unlisted) |
| Claims & Reinsurance | TPAs & claims rails | Medi Assist Healthcare Services (MEDIASSIST) [enabler]; Health Insurance TPA of India (unlisted) [enabler] |
| Capital & Regulation | Insurance holding companies & promoters | Bajaj Finserv (BAJAJFINSV) [enabler]; Bajaj Holdings & Investment (BAJAJHLDNG) [enabler]; Aditya Birla Capital (ABCAPITAL) [enabler]; Religare Enterprises (RELIGARE) [enabler]; ICICI Bank (ICICIBANK) [enabler]; Jio Financial Services (JIOFIN) [enabler] |
| Capital & Regulation | Regulator & public rails | IRDAI (Insurance Regulatory and Development Authority of India) (unlisted) [enabler]; Bima Sugam India Federation (unlisted) [enabler]; National Health Claims Exchange (NHCX) (unlisted) [enabler] |

Unlisted (20): most private life, general and health insurers (IndiaFirst Life, Bajaj Life, Tata AIA Life, Aditya Birla Sun Life, Kotak Life, PNB MetLife, Bajaj General, HDFC ERGO, Tata AIG, Care Health, Aditya Birla Health, ManipalCigna), the foreign reinsurer branches and Allianz Jio Re, InsuranceDekho, HITPA, and the public rails (IRDAI, Bima Sugam, NHCX). Their figures come from the hand-kept insurer table, not from price data.

### Hotels & Travel

| Layer | Zone | Companies |
|---|---|---|
| Hotels & Stays | Luxury & upscale hotel chains | Indian Hotels Company (IHCL) (INDHOTEL); ITC Hotels (ITCHOTELS); EIH (Oberoi Hotels) (EIHOTEL); Leela Palaces Hotels & Resorts (formerly Schloss Bangalore) (THELEELA); EIH Associated Hotels (EIHAHOTELS) |
| Hotels & Stays | Midscale, economy & regional chains | Lemon Tree Hotels (LEMONTREE); Apeejay Surrendra Park Hotels (PARKHOTELS); Royal Orchid Hotels (ROHLTD); Sarovar Hotels (unlisted); Pride Hotels (unlisted) |
| Hotels & Stays | Budget franchise & stay platforms | PRISM (OYO) (unlisted); Indian Hotels Company (IHCL) (INDHOTEL); InterGlobe Hotels (unlisted); Treebo Hotels (unlisted); FabHotels (unlisted) |
| Leisure & Holidays | Tour operators, holiday ownership & rail tourism | Thomas Cook (India) (THOMASCOOK); Mahindra Holidays & Resorts India (MHRIL); IRCTC (IRCTC); Cordelia Cruises (unlisted) |
| Leisure & Holidays | Theme parks & leisure destinations | Wonderla Holidays (WONDERLA); Imagicaaworld Entertainment (IMAGICAA) |
| Getting There | Domestic airlines | InterGlobe Aviation (IndiGo) (INDIGO); Air India (unlisted); Akasa Air (unlisted); SpiceJet (SPICEJET) |
| Getting There | Airport operators | GMR Airports (GMRAIRPORT); Adani Enterprises (ADANIENT); Bangalore International Airport (unlisted); Noida International Airport (unlisted) |
| Getting There | Airport food, lounges & travel retail | Travel Food Services (TRAVELFOOD); Dreamfolks Services (DREAMFOLKS) [enabler] |
| Booking & Capital | Wholesale travel & hotel distribution | TBO Tek (TBOTEK); RateGain Travel Technologies (RATEGAIN) [enabler]; MakeMyTrip (unlisted) [enabler]; Le Travenues Technology (ixigo) (IXIGO) [enabler]; Yatra Online (YATRA) [enabler]; Easy Trip Planners (EaseMyTrip) (EASEMYTRIP) [enabler] |
| Booking & Capital | Visa outsourcing & travel forex | BLS International Services (BLS); VFS Global (unlisted); Thomas Cook (India) (THOMASCOOK) |
| Booking & Capital | Institutional hotel owners | Chalet Hotels (CHALET); Ventive Hospitality (VENTIVE); SAMHI Hotels (SAMHI); Juniper Hotels (JUNIPER); Brigade Hotel Ventures (BRIGHOTEL); Fleur Hotels (unlisted) |

Unlisted (14): Sarovar, Pride, OYO (PRISM), InterGlobe Hotels, Treebo, FabHotels, Cordelia Cruises, Air India, Akasa Air, Bangalore International Airport, Noida International Airport, MakeMyTrip (Nasdaq only), VFS Global and Fleur Hotels.

## 2. Left-out names and why

Sources: `.superpowers/sdd/2026-11-18-new-industries/` notes-*.md and wave1-research-*.md.

### Banks & NBFCs

32 Nifty 500 Financial Services names were left out on purpose (66 of 98 placed; checked by script against `data/nifty500.csv`).

| Names | Why left out |
|---|---|
| 360ONE, ABSLAMC, ANANDRATHI, ANGELONE, BSE, GROWW, CRISIL, CDSL, CAMS, HDFCAMC, ICICIAMC, JMFINANCIL, KFINTECH, MCX, MOTILALOFS, NAM-INDIA, NUVAMA, UTIAMC, POLICYBZR | Already in the Capital Markets industry (brokers, fund houses, exchanges, registrars, ratings) |
| CHOICEIN | A broker that belongs in Capital Markets but is not covered anywhere yet; flagged for that industry's owner |
| IEX | A power exchange; already in Power Transmission |
| CANHLIFE, GICRE, HDFCLIFE, ICICILIFE, ICICIGI, LICI, MFSL, SBILIFE, STARHEALTH, NIACL | Insurers; they live in the Insurance industry |
| TATAINVEST | Holds Tata-group shares and earns dividends and gains, not loan interest, so not a lender |
| DHANBANK, PAISALO, ARMANFIN | Very small |
| Annapurna Finance, SK Finance, Avanse, Navi, Belstar | Unlisted, IPO not done, or no price feed (SKFINANCE and AVANSE not found on Yahoo) |

### Insurance

| Names | Why left out |
|---|---|
| BANKBARODA, PNB, FEDERALBNK, BANKINDIA, UNIONBANK | Only minority or partner stakes in insurers, and the six bank-partner slots were already used (can go in zone notes) |
| INDUSINDBK | Does not own Reliance General or Reliance Nippon Life (those went to an unrelated Hinduja entity); kept out as a news look-alike hazard |
| LICHSGFIN | LIC subsidiary, but a housing lender already placed elsewhere, with no insurance role |
| IDBI | No longer an insurance promoter (exit date not re-verified) |
| ICICIAMC, HDFCAMC, SBICARD, TATACAP | Same groups as insurers but no insurance-carrier role |
| Acko, Kiwi General | Not listed; Acko IPO and InsuranceDekho filing are plans only (secondary sources) |

### Hotels & Travel

| Names | Why left out |
|---|---|
| DEVYANI, JUBLFOOD | Restaurant franchisees; belong to a later Retail & Consumer Brands module |
| VMM | Value retail; same later module |
| DMART, ETERNAL, SWIGGY, NYKAA, FIRSTCRY, LENSKART, MEESHO, CARTRADE, INDIAMART, NAUKRI, URBANCO, PWL, TRENT | Not travel (already covered elsewhere) |
| ORIENTHOT, TAJGVK, KAMATHOTEL, SAYAJIHOTL, ASIANHOTNR | Micro-caps with low float; Oriental Hotels and TajGVK are mentioned in IHCL notes only |
| Suba Hotels | NSE SME listing, too small |
| BLSE (BLS E-Services) | Banking correspondent and assisted e-services, not travel; kept only as a news look-alike |
| JNPR (Juniper Green Energy) | Unrelated to Juniper Hotels; kept out of the news matcher |

## 3. Coverage

- Nifty 500 coverage went from 280/500 (56%) before the waves to 340/500 (68%) after Wave 1.
- `check-coverage` reports 0 unexplained gaps across 553 covered companies.
- 101 companies were added to the database on 19 Nov 2026. Figures snapshot: 18 Nov 2026.
- Prices: 104 of 104 series fetched with 0 failures (101 companies plus 3 benchmarks).
- Shareholding: 101 of 101 companies (1,408 company-quarters).

## 4. Calls made

Rulings taken during the build, in plain words (from progress.md):

- **Working method.** Consultants, model authors and the news matcher worked in one worktree on separate files and did not commit. The lead committed after each gate, which avoids git index clashes. The cost is that the lead must check file ownership before each commit.
- **Hotels channel exposure.** Companies that sell or distribute hotel rooms count as enablers, not operators. In insurance, PB Fintech uses the key `pbFintech`.
- **Soft facts.** Pride Hotels' SEBI approval and the InterGlobe Hotels merger appear only as "reported (source, date)" because they come from press, not filings. No start date is given for Noida airport because sources conflict. INDHOTEL, EIHOTEL, LEMONTREE and CHALET were already tracked from IPO peer decks.
- **Bajaj Holdings.** BAJAJHLDNG stays a lender (linked as owner, medium). INTELLECT is kept as a rails link. Long zone lists are fine.
- **Insurance consultant rulings.** RELIGARE counts as an insurer kind. STARHEALTH figures come from its own filing where possible. NIACL and GIC Re Q1 FY27 rows come from their own disclosures.
- **Unmuting early.** Banks, Insurance and Hotels were unmuted before the price fetch, because the price store only reads unmuted modules. No cost; gates 2 to 4 were otherwise green.

Other decisions:

- **Insurance has no benchmark.** The only candidate ETF (INSUREIETF) has under 1 year of history, and the standard needs 1 year or more. Revisit in Aug 2027.
- **Benchmarks.** Banks use BANKBEES.NS (Nifty Bank) and PSUBNKBEES.NS (PSU Bank). Hotels use MOTOUR.NS (Nifty India Tourism, about 17 months of history, thin volume but acceptable).
- **Operating financials.** FINOPB (Fino Payments Bank cannot lend), OFSS (a software maker) and EDELWEISS (holding company, standalone figures) use operating-company figures, not lender figures.
- **SBI.** State Bank of India's primary industry is now Banks & NBFCs.
- **Insurer figures.** Insurer metrics (VNB margin, embedded value, combined ratio, solvency) are hand-kept quarterly in `data/insurer-metrics.json` (12 rows) and tracked on the Ops dashboard.
- **Missing latest-year figures.** HDBFS, SBFC, UCOBANK and SPICEJET have no latest-year figures on Screener yet. They will fill in when Screener publishes them.
