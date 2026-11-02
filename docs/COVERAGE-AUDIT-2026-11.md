# Coverage audit - 2 Nov 2026

Which companies are missing from which layer and industry, and where the wiring drops them. No content
or data was changed; this is the gap list to work from.

**Ticker check.** ✓ = quoted live on NSE today (Yahoo, 2 Nov 2026), checked during this audit. Unmarked
listed names are long-standing listings whose symbols were not re-checked - run them through
`refresh-financials.ts --add` (dry run) before use. Sources for each claim are in the research notes.

## 0. How the surfaces connect (why one gap shows everywhere)

The sector content files (`src/lib/sector-content/sectors/*.ts`, `policies/*.ts`) are the **only**
universe. Explorer, sector page, `/companies`, company pages, stock pop-up (allowlist =
`findSupplierByTicker`), search, ideas screens, baskets (industry, rule-based, projections),
`/updates` news and FII/DII stake changes + deals by industry, `/connections`, the price store and
shareholding all derive from it. A company missing from a zone is missing from all of them; adding it
to a zone (plus `--add` and the news matcher) is what makes it show up everywhere.

Current state: 16 sectors, 312 unique listed tickers, 79 unlisted records. Every content ticker has a
tracked company row (none missing, none untracked); `validate:content` passes.

## 1. Wiring / data gaps (not about which companies)

| # | Gap | Effect |
|---|---|---|
| W1 | **Jio Platforms listed 28 Oct 2026 (NSE: JPL ✓)** but its IPO deck has no `ticker` and is still `upcoming`; telecom5g still has "Jio Platforms (unl)" | The automatic run skips the listing (no ticker), so no figures; the biggest telecom operator after Airtel shows as unlisted |
| W2 | **Zetwerk listed ~23 Oct (ZETWERK ✓), Manipal Hospitals (MANIPALHOS), NSE** are tracked from their decks but sit in **no sector** | No stock pop-up, no baskets, no stake changes or news on `/updates` |
| W3 | 19 IPO-peer tickers are tracked but in no sector (SWIGGY, DMART, ANGELONE, CAMS, CDSL, EIHOTEL, FORTIS, CHALET, POLICYBZR, INDHOTEL, JLHL, KIMS, LEMONTREE, MCX, NH, PAYTM, MEDANTA, YATHARTH, YATRA) | Fine for deck peer tables; no other surface. They belong in a future hospitals / capital markets / consumer-internet sector, not forced into the current ones |
| W4 | **Stone India (STONEINDIA)**: no quote on any symbol (delisted after insolvency, JWL is the resolution applicant); no price series, no shareholding, figures frozen | Dead row in railways/braking; remove it, or fold it into Jupiter Wagons |
| W5 | **Reliance Communications** shown "(unl)" but still listed (RCOM ✓, ₹0.82, in insolvency) | Wrong label (or drop it, given it's in insolvency) |
| W6 | DIGIFIBRE and ALTIUSINVIT are BSE-only InvITs; DIGIFIBRE has no price series | No charts or backtests for DIGIFIBRE |
| W7 | No shareholding rows for the REITs/InvITs (EMBASSY, KRT, MINDSPACE, BIRET, BAGMANE, NXST, ALTIUSINVIT, DIGIFIBRE) | Empty FII/DII stake view for them; needs a unitholding source or an "n/a" note |
| W8 | Price series on Screener closes only: APSISAERO, TECHERA | No OHLC/volume for them |
| W9 | No benchmark index for semiconductors, datacenter, telecom5g, solarmodules, semicon2, rareearth, ecms | Analysis charts say "no index" |
| W10 | Unlisted subsidiaries shown without their listed parent: Reliance New Energy -> RELIANCE, Midwest Advanced Materials (a *sister concern* of listed MIDWESTLTD, not a subsidiary - noted, not merged), SiCSem -> ACI, Exide Energy Solutions -> EXIDEIND | Investor can't act on them; link the parent the way Adani Enterprises is used |
| W11 | Orphan DB rows from earlier seeds (`UNLISTED_*`, `UNLISTED_vikram-solar`, ESCORTS) | Housekeeping only |

## 2. Wrong or stale entries in current zones

- **solarmodules/inverters:** CG Power is the only name and has no real solar-inverter business. Replace with UTLSOLAR ✓ (Fujiyama/UTL), SERVOTECH, WAAREEENER (inverter line started 2026).
- **railways/braking:** Stone India (see W4). Elgi Equipments is a weak fit (compressors).
- **aerospace/integration:** Sigma Advanced Systems (ex-Megasoft, renamed Feb 2026) is an engine/structural parts maker (Rolls-Royce contracts). Move it to engine + forgings.
- **aerospace/landing_gear:** Unimech is thin here; Aequs (A320/A350/787 landing-gear parts) belongs here.
- **ev4w/harness:** Rico Auto makes aluminium castings, not harnesses. Move it to chassis and put Minda Corp (a major harness maker) in harness.
- **ev4w/oem:** Olectra and JBM Auto are electric buses. Relabel the zone or move them out. Missing: Maruti (e-Vitara), Hyundai (HYUNDAI).
- **ev4w/battery:** Log9 Materials is in NCLT insolvency. Mark it distressed or drop it.
- ~~ecms/display: Minda Corp~~ and ~~semicon2/phone_ems: Amber~~ were checked and are right: Minda Instruments' TFT display approval (Aug 2026) and Amber's Oppo phone deal (Jun 2026) are both in the content with sources.
- **telecom5g/antennas:** Optiemus (phone EMS) belongs in ems. **ran:** ADC India (KRONECOMM) is passive connectivity and fits fiber better. **ems:** MIC Electronics is a weak fit.
- **realestate/electricals:** UltraTech is not yet material in wires. **finishes:** Astral's paints are small.
- **realestate/warehousing:** Horizon Industrial Parks is shown unlisted but **listed 24 Aug 2026 (HORIZONIND ✓)**.
- **pharma/ksm:** Vinati Organics is a weak fit (ibuprofen IBB is a small share of revenue).
- **rareearth/magnet_making:** L&T, Coal India and 20 Microns are REPM *bidders* (no award yet). Label them so. NFTDC is a government R&D centre, not investable.
- **Naming:** HCL-Foxconn is named differently in semiconductors and semicon2. PSMC is Tata's technology partner, not an Indian fab.
- **Corporate actions to reflect in notes:** J.B. Chemicals merged into Torrent Pharma (8 Jul 2026); ACC and Orient Cement merging into Ambuja (completion unconfirmed); Biocon absorbing Biocon Biologics; Apollo's pharmacy arm demerging into Apollo HealthTech (listing targeted Q4 FY27).

## 3. Missing listed companies - 2025-26 listings (highest priority)

These listed after the content was written, which is why they're absent (the CleanMax pattern).

| Sector / zone | Company | Ticker | Listed |
|---|---|---|---|
| solar epc, energy solar_developers | **Clean Max Enviro Energy Solutions** | CLEANMAX ✓ | 2 Mar 2026 |
| solar epc, energy wind/solar/storage | Juniper Green Energy | JNPR ✓ | 6 Aug 2026 |
| solar cells + modules, energy solar_equip | Emmvee Photovoltaic Power | EMMVEE ✓ | 18 Nov 2025 |
| solar modules | Saatvik Green Energy | SAATVIKGL ✓ | 26 Sep 2025 |
| solar inverters | Fujiyama Power Systems (UTL Solar) | UTLSOLAR ✓ | 20 Nov 2025 |
| solar mounting | Karamtara Engineering (solar ~79% of revenue) | KARAMTARA ✓ | 17 Sep 2026 |
| solar epc | Solarworld Energy Solutions | SOLARWORLD ✓ | 30 Sep 2025 |
| solar epc (solar pumps) | GK Energy | GKENERGY ✓ | 26 Sep 2025 |
| solar epc (solar pumps) | Oswal Pumps | OSWALPUMPS | 20 Jun 2025 |
| solar modules (SME) | Himalayan Solar | HIMALAYAN (SME) | 5 Oct 2026 |
| telecom fiber/epc | STL Networks (demerged from STL) | STLNETWORK ✓ | 4 Sep 2025 |
| telecom operators | **Jio Platforms** | JPL ✓ | 28 Oct 2026 |
| ev4w motor, power_elec, cluster | SEDEMAC Mechatronics | SEDEMAC ✓ | 11 Mar 2026 |
| ev4w motor (winding wire) | KSH International | symbol unverified | 23 Dec 2025 |
| ev4w motor (borderline, mostly 2W) | Hero Motors | HEROMOTORS ✓ | 23 Sep 2026 |
| ev4w chassis (borderline, mostly 2W) | Belrise Industries | BELRISE | 28 May 2025 |
| rareearth ev_2w | Ather Energy | ATHERENERG ✓ | 6 May 2025 |
| ecms ems/mlb, semicon2 phone_ems/subassy, aerospace, energy | **Zetwerk Manufacturing** | ZETWERK ✓ | ~23 Oct 2026 |
| ecms enclosures, semicon2 subassy, aerospace landing_gear/engine | Aequs (already in aerospace/structures) | AEQUS ✓ | 10 Dec 2025 |
| semiconductors + semicon2 gases | Ellenbarrie Industrial Gases | ELLEN ✓ | 1 Jul 2025 |
| datacenter power_backup | Powerica (gensets) | POWERICA ✓ | 2 Apr 2026 |
| datacenter power_backup | Prostarm Info Systems (UPS, Li packs) | PROSTARM ✓ | 3 Jun 2025 |
| datacenter transformers, energy (grid) | Atlanta Electricals | ATLANTAELE ✓ | 29 Sep 2025 |
| datacenter transformers, energy (grid) | Quality Power Electrical Equipments | QPOWER ✓ | 24 Feb 2025 |
| datacenter cabling + networking | Orient Cables (India) | ORIENTCABL ✓ | 5 Oct 2026 |
| datacenter transformers, energy thermal_equip | Siemens Energy India (already in energy) | ENRIN | 19 Jun 2025 |
| railways bogies (rail bearings) | SKF India (Industrial), demerged | SKFINDUS ✓ | 5 Dec 2025 |
| railways epc (PSC sleepers) | Vishal Nirmiti | VNL ✓ | 8 Oct 2026 |
| naval electronics, aerospace avionics, defenceproc subsystems | Tonbo Imaging | TONBO ✓ | 23 Oct 2026 |
| naval hull/components, defenceproc materials | Krishna Defence (moved to main board) | KRISHNADEF ✓ | 30 Dec 2025 |
| pharma domestic | Corona Remedies | CORONA ✓ | 15 Dec 2025 |
| pharma generics | Rubicon Research | RUBICON ✓ | 16 Oct 2025 |
| pharma api + injectables + cdmo | Symbiotec Pharmalab | SYMBIOTEC ✓ | 1 Sep 2026 |
| pharma injectables + biologics + cdmo | OneSource Specialty Pharma | ONESOURCE ✓ | 24 Jan 2025 |
| pharma injectables | Amanta Healthcare | AMANTA | 9 Sep 2025 |
| pharma packaging/excipients | Sudeep Pharma | SUDEEPPHRM | 28 Nov 2025 |
| pharma api | Viyash Scientific (ex-Sequent, renamed) | VIYASH | symbol changed 23 Jan 2026 |
| realestate residential | Kalpataru | KALPATARU ✓ | 1 Jul 2025 |
| realestate residential | Runwal Enterprises | RUNWALENTR ✓ | 5 Oct 2026 |
| realestate residential | Raymond Realty (demerged) | RAYMONDREL | 1 Jul 2025 |
| realestate residential | Sri Lotus Developers | LOTUSDEV | 6 Aug 2025 |
| realestate residential | Pranav Constructions, Veegaland Developers | PRANAV, VEEGALAND | Sep 2026 |
| realestate office (flex) | WeWork India | WEWORK ✓ | 10 Oct 2025 |
| realestate office (flex) | Smartworks, Indiqube | SMARTWORKS?, INDIQUBE? (symbols conflict) | Jul 2025 |
| realestate warehousing | Horizon Industrial Parks (fix the label) | HORIZONIND ✓ | 24 Aug 2026 |
| realestate cement | JSW Cement | JSWCEMENT ✓ | 14 Aug 2025 |
| realestate finishes | Varmora Granito, Euro Pratik Sales | VARMORA, EUROPRATIK | 2025-26 |
| realestate finance | Tata Capital | TATACAP ✓ | 13 Oct 2025 |
| aerospace/defenceproc/naval | Digilogic Systems (BSE SME 544684; already in aerospace, label as BSE) | DIGILOGIC | 28 Jan 2026 |

## 4. Missing listed companies - long-listed names (obvious omissions)

- **energy (thinnest sector, 19 companies):** thermal gencos Torrent Power, CESC, NLC India, Reliance Power, JP Power. Thermal equipment Power Mech, ISGEC, Triveni Turbine. Renewable IPPs ACMESOLAR ✓, NTPCGREEN ✓, plus JSWENERGY / KPIGREEN in the renewable zones. Wind Inox Green, K.P. Energy, Synergy Green. Hydro EPC Patel Engineering, HCC, Afcons. Adani Green and JSW Energy in hydro/PSP. Hitachi Energy in storage.
- **solarmodules:** Tata Power and Vikram Solar in cells too. Waaree Renewable Technologies (WAAREERTL ✓). Goodluck India (mounting). Alpex Solar (SME). Polycab/KEI for solar cable.
- **telecom5g:** HFCL in ran and epc. Kavveri Defence & Wireless. Exicom and Pace Digitek in tower power. Cyient DLM in ems. Kirloskar Oil Engines (DG sets). Polycab (OFC/BharatNet).
- **ev4w:** Bosch Ltd, Schaeffler, Varroc, Lumax Auto Tech, Tata Technologies, LTTS, Banco Products, Sansera, Happy Forgings, Gabriel, Maruti, Hyundai Motor India. Minda Corp in harness.
- **semiconductors / semicon2:** Tata Elxsi, LTTS, Sasken, Cyient (design). Kaynes and Cyient DLM in semiconductors/ems_downstream. VA Tech Wabag (ultra-pure water). Hind Rectifiers (power devices). RIR Power Electronics (BSE 517035, SiC fab). Archean in fab/advpack via SiCSem.
- **ecms:** PG Electroplast, Centum, Elin in ems. Himadri Speciality and Neogen in cell materials. Gujarat Fluorochemicals (LiPF6/PVDF). Shivalik Bimetal in passives.
- **datacenter:** E2E Networks (GPU cloud), Black Box (compute/integration). Siemens, GE Vernova T&D, Indo Tech, Shilchar, Havells (transformers/switchgear). RR Kabel, Universal Cables, D-Link (cabling). Tejas, Aksh, Birla Cable, RailTel (networking). Anant Raj, Techno Electric, Tata Communications, Reliance, Adani Enterprises (operators). Thermax (cooling).
- **railways:** Siemens in rolling_stock (locos, Vande Bharat sleeper), Hitachi Energy in traction, GPT Infraprojects in epc, Concord Control Systems (Kavach; BSE SME).
- **naval:** Swan Defence (SWANDEF ✓, Pipavav, the country's largest dry dock), NIBE (NIBE ✓, BrahMos canisters/launchers) in combat, Triveni Engineering (marine gearboxes), High Energy Batteries (BSE 504176).
- **aerospace:** Sansera (aero forgings), Kaynes, LMW (aerospace division), HAL in landing_gear/engine.
- **defenceproc:** NIBE (artillery, missiles), Swan Defence (naval), Force Motors and M&M (vehicles), HFCL (radars and fuzes), Tonbo, Centum, Rossell Techsys, Reliance Infrastructure (ammunition).
- **rareearth:** Hero MotoCorp (Vida) in ev_2w. MIDWESTLTD in magnet_making.
- **pharma:** Emcure, GSK Pharma, Pfizer, Sanofi (domestic). Strides, Marksans, Unichem (generics). Jubilant Pharmova, Gufic (injectables). Alivus, Supriya (API). Acutaas, Blue Jet, Hikal (KSM). Innova Captab (CDMO). Zota Health Care (Davaindia retail). Lupin in biologics. Natco in specialty.
- **realestate:** Puravankara, Sunteck, Keystone (Rustomjee), Max Estates, Arvind SmartSpaces, Kolte-Patil, Embassy Developments (EMBDL) in residential. Awfis in office. ACC, Ramco, Nuvoco in cement. Jindal Steel, Hi-Tech Pipes in steel. Apollo Pipes, Hindware in plumbing. RR Kabel in electricals. Pidilite, Kansai Nerolac, Indigo Paints, JSW Dulux (ex-Akzo, renamed Apr 2026), Grasim (Birla Opus), Somany, Greenlam in finishes. B.L. Kashyap in EPC. Can Fin Homes, Aptus, India Shelter, Sammaan Capital in finance.
- **nifty50:** matches the official list (Sep 2026 review: BSE in, Wipro out). Nothing missing.

## 5. Missing important unlisted companies (with IPO status)

- **Filed / approved IPOs to watch** (become listed gaps next): Avaada Electro (SEBI ok, ₹7,600 cr), Rayzon Solar (SEBI ok), Goldi Solar (pre-DRHP Oct 2026), Cosmic PV (DRHP), Vishakha Renewables (solar glass/EVA, DRHP 30 Sep 2026), Sembcorp Green Infra (DRHP), SAEL (SEBI ok), Inox Clean Energy (DRHP), Garuda Aerospace (SEBI ok, listing targeted Dec 2026), Anarock (DRHP Sep 2026), Truhome Finance (SEBI ok), Aragen Life Sciences (DRHP), Encube Ethicals (DRHP), Ekkaa Electronics and UKB Electronics (DRHP), Sify Infinit Spaces (approved, on hold), Altius Telecom InvIT (public-listing papers).
- **Big private players investors expect:** RAN vendors Nokia, Ericsson and Samsung Networks India, plus BSNL (telecom: the RAN zone has no unlisted majors at all). Medha Servo Drives, Alstom India, Knorr-Bremse, Wabtec, Hitachi Rail STS (railways). Alpha Design, Mahindra Aerostructures/Defence, Adani Defence, AIESL, Air Works, Goa and Hindustan Shipyard in defenceproc/naval, Armoured Vehicles Nigam (defence). Agratas (Tata cells), Exide Energy Solutions, JSW MG, BYD India, Delta Electronics India (ev4w). CDIL, Suchi Semicon, ASIP, Crystal Matrix (ISM-approved), Tessolve, Tokyo Electron, KLA (semis). Vertiv, NTT GDC, Nxtra, Yotta, Sify (data centres). Micro Labs, Macleods, MSN, Hetero, Enzene, PGP Glass (pharma). Tata Realty, Hiranandani, RMZ, TVS ILP, ESR, Schindler, Daikin (real estate). ReNew (Nasdaq-listed), Avaada, Greenko, Hero Future (energy). Indosol, Nextracker, Sungrow/Huawei/Solis (solar).

## 6. Structural gaps (segments with no zone)

- **energy:** no **transmission & grid** zone (POWERGRID, ADANIENSOL, KEC, KPIL, TRANSRAILL, GVT&D, POWERINDIA, ENRIN, ATLANTAELE, QPOWER, Mangal Electrical); no **nuclear** zone (NPCIL, L&T, BHEL, MTAR, Walchandnagar, HCC); no distribution/trading (IEX, PTC India, Torrent, CESC) or gas (GAIL, Petronet).
- **solarmodules:** no solar-pumps zone (GKENERGY, OSWALPUMPS, Shakti Pumps); no BOS cables/transformers zone.
- **telecom5g:** no satcom zone (Nelco); no link to data centres (Nxtra).
- **ecms:** no connectors & optical transceivers zone (TE, Amphenol, Rosenberger, Dixon Electroconnect, Zetwerk/Jabil SFP approvals).
- **No sector** for hospitals, capital markets or consumer internet, though the IPO decks already track MANIPALHOS, NSE and their peers (W2/W3).

## 7. Fixed so far (2 Nov 2026, uncommitted)

- Jio Platforms and Zetwerk IPO decks marked listed (issue prices ₹1,119 / ₹151, ticker JPL set); Jio shown as listed in telecom5g.
- Stone India folded into Jupiter Wagons (alias kept for old links); RCOM relabelled; Horizon Industrial Parks listed.
- solarmodules: CG Power out of inverters (UTL Solar, Servotech, Waaree in); Reliance shown via RIL; Tata Power, Emmvee, Vikram, Saatvik in cells; Emmvee, Saatvik, Tata Power in modules; Karamtara in mounting; CleanMax, Juniper, ACME, NTPC Green, Waaree RTL, Solarworld, GK Energy in EPC & developers.
- energy: the same listings in solar equipment, solar/wind developers and storage.
- ev4w: Rico to chassis, Minda Corp to harness, Maruti in OEMs, Log9 insolvency flagged. aerospace: Sigma to engine (Rolls-Royce contracts), Aequs in landing gear. telecom5g: HFCL in RAN, ADC India to fibre, Optiemus to EMS.
- News matcher entries + tests for the new names.
- Pending: `refresh-financials.ts --add` for the 13 new tickers (live DB), untracking STONEINDIA.
- Also noticed: Paras Healthcare's deck (listing 28 Oct per its timeline) has no ticker either.

## 8. Suggested order of work

1. Fix the stale/wrong entries (section 2) and W1/W4/W5: they misinform today.
2. Add the section-3 listings, solar and energy first (`--add` dry run, then apply with the go-ahead, since it writes to the live DB), plus news-matcher entries for each.
3. Section-4 omissions, sector by sector, energy first (thinnest coverage).
4. Section-6 structural zones (need model anchors; geometry work).
5. A recurring check: list each month's NSE/BSE mainboard listings against the content, so new IPOs like CleanMax get caught.
