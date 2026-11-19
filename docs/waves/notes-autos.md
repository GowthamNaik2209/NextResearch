# Automobiles (`autos`) - consultant notes for the lead (Gate 2, 19 Nov 2026)

Files filled: `src/lib/sector-content/sectors/autos.ts`, `sectors/autos.extras.ts`, `reports/autos.ts`.
`muted: true` removed after the checks below passed (contract: consultant unmutes when validate:content and
check-report are green). Re-add it if you'd rather unmute after the data batch.

Checks: `npx tsx scripts/check-report.ts autos` (report OK), `npm run validate:content` (28 sectors, no problems,
both muted and unmuted), `npx tsc --noEmit`, eslint on the three files. `financials.test` will fail for the new
tickers until the data batch runs (expected).

## Shape

- 13 zones exactly as contracted (ids, layers, domains, order, `A.<id>` anchors untouched). Zone `desc` lightly
  widened to name added companies; labels unchanged.
- 80 supplier keys: **68 listed** (all `co("TICKER")`, no typed figures) and **12 unlisted**.
- 4 scenarios, 4 reading links (all opened 19 Nov 2026), 10-slide deck with 6 reading links.
- Exposure types: vehicle makers and dealers `operator`; parts, tyre, battery and oil makers `direct_supplier`;
  CarTrade `enabler`/medium (marketplace). No lender or insurer placed; vehicle financiers are text only.

## Company-to-zone map

| Zone | Companies |
| --- | --- |
| two_wheelers | Hero MotoCorp (HEROMOTOCO), Bajaj Auto (BAJAJ-AUTO), TVS Motor (TVSMOTOR), Eicher Motors (EICHERMOT), Honda Motorcycle & Scooter India (unlisted), Ather Energy (ATHERENERG), Ola Electric (OLAELEC, low) |
| passenger_vehicles | Maruti (MARUTI), Mahindra (M&M), TMPV, Hyundai (HYUNDAI), Toyota Kirloskar Motor (unlisted), Kia India (unlisted), JSW MG Motor India (unlisted, low) |
| commercial_vehicles | Tata Motors CV (TMCV), Ashok Leyland (ASHOKLEY), Eicher (VECV, medium), M&M (pickups/SML, medium), Force Motors (FORCEMOT), SML Mahindra (SMLMAH), Daimler India CV (unlisted), Atul Auto (ATULAUTO, low) |
| tractors | M&M, Escorts Kubota (ESCORTS), TAFE (unlisted), International Tractors / Sonalika (unlisted), VST Tillers (VSTTILLERS) |
| body_electricals | UNO Minda, Minda Corp, Lumax Industries (LUMAXIND), Lumax Auto Tech (LUMAXTECH), Varroc (VARROC), Fiem (FIEMIND), Sandhar (SANDHAR) |
| chassis_systems | ZF CV Control Systems (ZFCVINDIA), Endurance, Gabriel (GABRIEL), Rane (Madras) (RML), JTEKT India (JTEKTINDIA), ASK Automotive (ASKAUTOLTD), Jamna Auto (JAMNAAUTO), Suprajit (SUPRAJIT), Brakes India (unlisted) |
| modules_interiors | Motherson, Asahi India Glass, Belrise (BELRISE), Steel Strips Wheels (SSWL), Wheels India (WHEELS), Tata AutoComp (unlisted, same name as ev4w) |
| engine_parts | SPR Auto Technologies (SHRIPISTON), Sansera (SANSERA), CIE Automotive (CIEINDIA), Federal-Mogul Goetze (FMGOETZE), Bharat Forge (medium), Ramkrishna Forgings (low) |
| emissions_fuel | Bosch (BOSCHLTD), Tenneco Clean Air (TENNIND), Sharda Motor (SHARDAMOTR), Delphi-TVS (unlisted) |
| driveline | Schaeffler, Tube Investments (TIINDIA), Sona BLW, Timken, SKF India (SKFINDIA), Automotive Axles (AUTOAXLES), GNA Axles (GNA), Rolex Rings (ROLEXRINGS, low) |
| tyres | MRF, Apollo (APOLLOTYRE), CEAT (CEATLTD), JK Tyre (JKTYRE), Balkrishna (BALKRISIND), TVS Srichakra (TVSSRICHAK), Goodyear India (GOODYEAR) |
| replacement | Exide, Amara Raja (ARE&M), Castrol India (CASTROLIND), Gulf Oil Lubricants (GULFOILLUB) |
| dealers | Landmark Cars (LANDMARK), Popular Vehicles (PVSL), CarTrade (enabler), Cars24 (unlisted), Spinny (unlisted) |

Linked existing keys reused (same ticker, same key): `bajajauto`, `eichermot`, `maruti`, `mm`, `tmpv` (nifty50);
`tvs`, `ola` (rareearth); `hyundai` (pliacc); `ashok` (defenceproc); `unominda`, `mindaCorp`, `endurance`,
`motherson`, `bharatforge`, `ramkrishna`, `sonablw`, `exide`, `amararaja`, `tataautocomp` (ev4w);
`asahiGlass` (realestate); `schaefflerindia`, `timken` (railways); `cartrade` (consumerinternet).

## Must-place check (19 Nifty 500 symbols) - all placed

HEROMOTOCO, ATHERENERG, TMCV, FORCEMOT, ESCORTS, ZFCVINDIA, GABRIEL, BELRISE, SHRIPISTON, SANSERA, CIEINDIA,
BOSCHLTD, TENNIND, TIINDIA, MRF, APOLLOTYRE, CEATLTD, JKTYRE, BALKRISIND. Optional CASTROLIND placed too.

## Needs --add (46 tickers; read-only query of "Company", 19 Nov 2026)

Every ticker below was checked trading on NSE on 19 Nov 2026 (Yahoo chart API, `.NS`).

- Missing from the table (45): APOLLOTYRE, ASKAUTOLTD, ATHERENERG, ATULAUTO, AUTOAXLES, BALKRISIND, BELRISE,
  BOSCHLTD, CASTROLIND, CEATLTD, CIEINDIA, FIEMIND, FMGOETZE, FORCEMOT, GABRIEL, GNA, GOODYEAR, GULFOILLUB,
  HEROMOTOCO, JAMNAAUTO, JKTYRE, JTEKTINDIA, LANDMARK, LUMAXIND, LUMAXTECH, MRF, PVSL, RML, ROLEXRINGS, SANDHAR,
  SANSERA, SHARDAMOTR, SHRIPISTON, SKFINDIA, SMLMAH, SSWL, SUPRAJIT, TENNIND, TIINDIA, TMCV, TVSSRICHAK, VARROC,
  VSTTILLERS, WHEELS, ZFCVINDIA.
- In the table but `tracked=false` (1): ESCORTS (row "Escorts Kubota Ltd" from an older seed) - needs `--add` or
  tracked=true.
- Already tracked (22): BAJAJ-AUTO, TVSMOTOR, EICHERMOT, OLAELEC, MARUTI, M&M, TMPV, HYUNDAI, ASHOKLEY, UNOMINDA,
  MINDACORP, ENDURANCE, MOTHERSON, ASAHIINDIA, BHARATFORG, RKFORGE, SCHAEFFLER, TIMKEN, SONACOMS, EXIDEIND,
  ARE&M, CARTRADE.

## Ticker and name facts checked

- **TMCV** trades as "Tata Motors Limited" on NSE (the CV company took the old name; demerger effective 1 Oct 2025,
  listed 12 Nov 2025). Content name "Tata Motors (commercial vehicles)". The old TATAMOTORS ticker is gone.
- **SHRIPISTON** = SPR Auto Technologies (renamed from Shriram Pistons & Rings, MCA certificate 2 Apr 2026; ticker kept).
- **SMLMAH** is SML Mahindra's NSE symbol (renamed from SML Isuzu 8 Oct 2025; SMLISUZU/SMLMAHINDRA return nothing).
- **RML** (Rane (Madras)) used instead of the contract's RANEHOLDIN: Rane Brake Lining and Rane Engine Valve merged
  into RML (effective 7 Apr 2025), so RML is the operating company; RANEHOLDIN (holding company) named in the note.
- **SKFINDIA** is automotive-only since the 1 Oct 2025 demerger; SKF India (Industrial) trades as SKFINDUS (not placed).
- Ather listed 6 May 2025; Belrise 28 May 2025; Tenneco Clean Air India 19 Nov 2025; Hyundai 22 Oct 2024.

## Left out, and why

| Names | Why |
| --- | --- |
| MSUMI, SUBROS, PRICOLLTD, SUNDRMFAST, CRAFTSMAN | Contract: stay in ev4w (harness, thermal, cluster, forgings); mentioned in body_electricals text only |
| JBMA, OLECTRA | Contract: e-buses stay in ev4w only |
| ACE | Contract: capital-goods round |
| Vehicle financiers (SHRIRAMFIN, CHOLAFIN, M&MFIN...) | Live in Banks & NBFCs; dealers zone text names them only |
| RANEHOLDIN | Holding company; RML placed as the operating company |
| SKFINDUS | Industrial bearings, not auto |
| HEROMOTORS (Hero Motors, Munjal-family parts maker), MUNJALSHOW, HITECHGEAR, BANCOINDIA, UCAL, SETCO, Talbros, Harita Seating | Small or not verified as trading (TALBROS, HARITASEAT, TIDEWATER returned no NSE quote); candidates for a later pass |
| Unlisted: Suzuki Motorcycle India, Piaggio India, John Deere India, CNH India, Renault/Nissan, Skoda-VW India | Room in zones; not essential |

## News-matcher entries / look-alikes (for the news.ts owner)

- **TMCV vs TMPV**: TMCV's NSE name is "Tata Motors Limited"; headlines say "Tata Motors" for both. TMCV aliases:
  "Tata Motors CV", "Tata Motors commercial vehicles", "TML Commercial Vehicles", "Iveco" (since 30 Oct 2026).
  NOT_ABOUT pairs both ways (already partly in the PLAYBOOK example).
- **Hero**: HEROMOTOCO "Hero MotoCorp", "Vida"; NOT_ABOUT "Hero Motors" (HEROMOTORS, Munjal family parts maker),
  "Hero FinCorp", "Hero Electric", "Hero Future Energies". GROUP "hero".
- **Bajaj**: BAJAJ-AUTO vs Bajaj Finance/Finserv/Holdings/Housing/Electricals/Consumer; require "Bajaj Auto"/"Chetak"/"KTM".
- **TVS**: TVSMOTOR vs TVS Srichakra (TVSSRICHAK), TVS Supply Chain, TVS Holdings, TVS Electronics; Wheels India,
  Brakes India, Delphi-TVS are TVS group. Require "TVS Motor"/"iQube"/"Norton" for TVSMOTOR; "TVS Srichakra"/"Eurogrip".
- **Mahindra**: GROUP "mahindra" - M&M vs SML Mahindra (SMLMAH), Mahindra Finance, Mahindra Holidays, Tech Mahindra,
  Mahindra Lifespaces, Mahindra Logistics. "Mahindra CIE" -> CIEINDIA. "Swaraj tractors" -> M&M (not Swaraj Engines).
- **Escorts**: "Escorts Kubota"/"Farmtrac"/"Powertrac"; NOT_ABOUT "Escorts Heart Institute" (Fortis hospital).
- **Lumax**: LUMAXIND "Lumax Industries" vs LUMAXTECH "Lumax Auto Technologies"; GROUP "lumax". **Minda**: UNO Minda
  vs Minda Corp (Spark Minda) - GROUP "minda".
- **Rane**: "Rane (Madras)"/"Rane Madras" -> RML; "Rane Holdings" -> not placed. **Sona Koyo** -> JTEKTINDIA (not Sona BLW).
- **Bosch**: "Bosch Ltd"/"Bosch India"; global Robert Bosch GmbH news is NOT_ABOUT unless India named (already a GROUP word).
- **Tenneco**: TENNIND "Tenneco Clean Air India" vs FMGOETZE (also Tenneco group); global Tenneco Inc. news is NOT_ABOUT.
- **Castrol**: "Castrol India"; BP/Stonepeak global deal headlines may need NOT_ABOUT unless "Castrol India".
- **Gulf Oil**: "Gulf Oil Lubricants"; NOT_ABOUT "Gulf Oil Corporation", "GOCL Corporation" and Gulf (region) news.
- **MRF**: word ticker (WORD_TICKERS?) - "MRF Tyres"; also "Madras Rubber Factory". **CEAT**: "CEAT Tyres".
- **Apollo**: APOLLOTYRE "Apollo Tyres" vs Apollo Hospitals, Apollo Micro Systems, Apollo Pipes; never bare "Apollo".
- **Goodyear**: "Goodyear India" vs global Goodyear Tire. **Wheels**: WHEELS is a word ticker - require "Wheels India".
- **Force Motors**: never bare "Force"; **Landmark Cars**: never bare "Landmark" (Landmark Group retail).
  **Popular Vehicles**: require full name. **GNA**: require "GNA Axles". **Gabriel**: "Gabriel India" (common first name).
- **Atul Auto** vs Atul Ltd (chemicals module); **Ather** vs Ather (no look-alike) fine; **Ola Electric** vs Ola (ANI Technologies, unlisted).
- **Jamna Auto**, **Suprajit**, **Sansera**, **Sandhar**, **Fiem**, **Varroc**, **Belrise** distinctive.

## Benchmark

- Nifty Auto index ETFs: e.g. AUTOBEES.NS (Nippon India ETF Nifty Auto) - not checked today; please confirm
  Yahoo history (1y+) when wiring `SECTOR_INDEX`.

## screenOut candidates (one-off years)

- HEROMOTOCO: Q2 FY27 includes a ₹397 Cr one-time gain (FY27, not the latest full year yet) - watch.
- TMCV, TMPV: FY26 is the demerger year (effective 1 Oct 2025); Iveco consolidates from Q3 FY27 - growth not like-for-like.
- SKFINDIA: FY26 reflects the industrial demerger (1 Oct 2025) - restated base.
- RML: FY26 includes the merged Rane Brake Lining and Rane Engine Valve (effective 7 Apr 2025) - not like-for-like vs FY25.
- GABRIEL: May 2026 composite scheme brings in JV stakes - FY27 restatement.
- ESCORTS: FY26 includes the railway-business sale (₹1,600 Cr, completed ~Jun 2025) - likely a one-off gain; check.
- BELRISE, TENNIND, ATHERENERG: IPO-year finance-cost and expense effects.
- OLAELEC: loss-making, collapsing share - not a one-off; flag rather than screen.

## Shared-file requests

- None required. Note for the lead: `primarySector()` may now pick Automobiles for MARUTI, M&M, BAJAJ-AUTO,
  EICHERMOT, TMPV, HYUNDAI, ASHOKLEY and the ev4w component names - intended, but check the pop-ups.
- Marketing copy listing sectors (`lib/site.ts`, OG image, `/docs`, `/companies`) to add "Automobiles" per PLAYBOOK 1.3.

## Facts to recheck at Gate 7 (secondary sources)

- TVS Q2 FY27 profit growth (~52%) and Eicher's "best-ever quarter" come from aggregators; content says only
  "sales rose 27%" (TVS, Autocar Pro) and Eicher's revenue/profit growth (Autocar Pro).
- Hyundai Q1 FY27 EBITDA margin 9.3% vs 13.3% (sahi.com, reported) - written as "reported".
- CEAT's Camso deal: written as "agreed in 2025"; completion not confirmed. Apollo's Enschede closure "by summer 2026"
  from the 2025 announcement; final closure not re-verified.
- Two-wheeler ABS mandate: only the Jun 2025 draft is confirmed; written as "proposed".
- US auto-part tariffs: the Feb 2026 framework's 0-18% duties await notification; written that way.
