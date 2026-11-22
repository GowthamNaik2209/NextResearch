# Wave 2: IT Services & GCCs, Automobiles, Chemicals & Agrochem

Wave 2 added three industries to NextResearch. All three are live (unmuted) on branch `claude/industries-wave-2`. Content date for the write-ups is 18 Nov 2026.

| Industry | Source file | Layers | Zones | Companies | Listed | Unlisted |
|---|---|---|---|---|---|---|
| IT Services & GCCs | `src/lib/sector-content/sectors/itservices.ts` (+ `itservices.extras.ts`) | Services Firms, Engineering & Products, Operations & GCCs, Talent & Workspace | 12 | 78 | 57 | 21 |
| Automobiles | `src/lib/sector-content/sectors/autos.ts` (+ `autos.extras.ts`) | Vehicle Makers, Systems & Modules, Engine & Driveline, Tyres & Aftermarket | 13 | 80 | 68 | 12 |
| Chemicals & Agrochem | `src/lib/sector-content/sectors/chemicals.ts` (+ `chemicals.extras.ts`) | Farm Inputs, Specialty Chemicals, Commodity Chemicals, Feedstock & Logistics | 13 | 81 | 77 | 4 |

A company can sit in more than one zone (for example HCL Technologies is a high link in large IT services and a medium link in IT infrastructure, and Mahindra & Mahindra is in cars, trucks and tractors), so zone rows add up to more than the company count.

How to read the maps: "(unlisted)" means no stock-exchange listing, so no price or figures (this includes foreign-listed names such as Accenture, Cognizant, Freshworks and Sify, which have no Indian listing). "[enabler]" marks how the company relates to the zone; unmarked names are operators. In Automobiles and the Chemicals feedstock zone, parts, tyre, battery, oil and feedstock makers are direct suppliers and are left unmarked; the one other supplier link is Netweb in IT infrastructure.

## 1. Company-to-zone map

### IT Services & GCCs

| Layer | Zone | Companies |
|---|---|---|
| Services Firms | Large IT services | Tata Consultancy Services (TCS); Infosys (INFY); HCL Technologies (HCLTECH); Wipro (WIPRO); Tech Mahindra (TECHM); LTM (LTM); Accenture (India operations) (unlisted); Cognizant (India operations) (unlisted) |
| Services Firms | Mid-tier IT services | Persistent Systems (PERSISTENT); Coforge (COFORGE); Mphasis (MPHASIS); Hexaware Technologies (HEXT); Birlasoft (BSOFT); Zensar Technologies (ZENSARTECH); Sonata Software (SONATSOFTW); Mastek (MASTEK); Happiest Minds Technologies (HAPPSTMNDS) |
| Services Firms | Data, analytics & AI services | Fractal Analytics (FRACTAL); Latent View Analytics (LATENTVIEW); Tiger Analytics (unlisted); Mu Sigma (unlisted) |
| Services Firms | IT infrastructure & network services | Black Box (BBOX); Allied Digital Services (ADSL); Dynacons Systems & Solutions (DSSL); HCL Technologies (HCLTECH); Sify Technologies (unlisted); Netweb Technologies India (NETWEB) [supplier] |
| Engineering & Products | Engineering R&D services | L&T Technology Services (LTTS); Tata Technologies (TATATECH); KPIT Technologies (KPITTECH); Tata Elxsi (TATAELXSI); Cyient (CYIENT); Sasken Technologies (SASKEN); Expleo Solutions (EXPLEOSOL); QuEST Global (unlisted) |
| Engineering & Products | Software products & SaaS | Oracle Financial Services Software (OFSS); Intellect Design Arena (INTELLECT); Nucleus Software Exports (NUCLEUS); Newgen Software Technologies (NEWGEN); Ramco Systems (RAMCOSYS); Quick Heal Technologies (QUICKHEAL); C. E. Info Systems (MapmyIndia) (MAPMYINDIA); Zoho (unlisted); Tally Solutions (unlisted); Freshworks (unlisted) |
| Operations & GCCs | BPM & knowledge services | Firstsource Solutions (FSL); eClerx Services (ECLERX); Hinduja Global Solutions (HGS); Datamatics Global Services (DATAMATICS); Digitide Solutions (DIGITIDE); Alldigi Tech (ALLDIGI); Teleperformance India (unlisted) |
| Operations & GCCs | Healthcare operations & revenue-cycle services | Sagility (SAGILITY); Inventurus Knowledge Solutions (IKS); Firstsource Solutions (FSL); Omega Healthcare Management Services (unlisted); AGS Health (unlisted) |
| Operations & GCCs | Global capability centres | JPMorgan Chase (India GCC) (unlisted); Walmart Global Tech India (unlisted); Goldman Sachs (India GCC) (unlisted); Target in India (unlisted); Bosch Global Software Technologies (unlisted); ANSR (unlisted) [enabler]; Smartworks Coworking Spaces (SMARTWORKS) [enabler]; IndiQube Spaces (INDIQUBE) [enabler] |
| Talent & Workspace | Tech staffing & hiring | Info Edge (India) (NAUKRI) [enabler]; TeamLease Services (TEAMLEASE); Quess Corp (QUESS) |
| Talent & Workspace | Flexible & managed offices | Awfis Space Solutions (AWFIS); Smartworks Coworking Spaces (SMARTWORKS); IndiQube Spaces (INDIQUBE); WeWork India Management (WEWORK); Table Space (unlisted); Embassy Office Parks REIT (EMBASSY) [enabler]; Knowledge Realty Trust (KRT) [enabler]; Mindspace Business Parks REIT (MINDSPACE) [enabler]; Brookfield India Real Estate Trust (BIRET) [enabler] |
| Talent & Workspace | Training & skilling | NIIT Learning Systems (NIITMTS); NIIT (NIITLTD); Aptech (APTECHT); upGrad (unlisted); Simplilearn (unlisted) |

Unlisted (21): Accenture and Cognizant (India operations; NYSE and Nasdaq listed), Tiger Analytics, Mu Sigma, Sify (Nasdaq listed), QuEST Global, Zoho, Tally, Freshworks (Nasdaq listed), Teleperformance India, Omega Healthcare, AGS Health, the GCC operators (JPMorgan Chase, Walmart Global Tech, Goldman Sachs, Target in India, Bosch Global Software Technologies), ANSR, Table Space, upGrad and Simplilearn.

### Automobiles

| Layer | Zone | Companies |
|---|---|---|
| Vehicle Makers | Two-wheelers | Hero MotoCorp (HEROMOTOCO); Bajaj Auto (BAJAJ-AUTO); TVS Motor (TVSMOTOR); Eicher Motors (EICHERMOT); Honda Motorcycle & Scooter India (unlisted); Ather Energy (ATHERENERG); Ola Electric (OLAELEC) |
| Vehicle Makers | Cars & utility vehicles | Maruti Suzuki India (MARUTI); Mahindra & Mahindra (M&M); Tata Motors Passenger Vehicles (TMPV); Hyundai Motor India (HYUNDAI); Toyota Kirloskar Motor (unlisted); Kia India (unlisted); JSW MG Motor India (unlisted) |
| Vehicle Makers | Trucks, buses & vans | Tata Motors (commercial vehicles) (TMCV); Ashok Leyland (ASHOKLEY); Eicher Motors (EICHERMOT); Mahindra & Mahindra (M&M); Force Motors (FORCEMOT); SML Mahindra (SMLMAH); Daimler India Commercial Vehicles (unlisted); Atul Auto (ATULAUTO) |
| Vehicle Makers | Tractors & farm equipment | Mahindra & Mahindra (M&M); Escorts Kubota (ESCORTS); TAFE (Tractors and Farm Equipment) (unlisted); International Tractors (Sonalika) (unlisted); VST Tillers Tractors (VSTTILLERS) |
| Systems & Modules | Lighting, switches & body electricals | UNO Minda (UNOMINDA); Minda Corporation (MINDACORP); Lumax Industries (LUMAXIND); Lumax Auto Technologies (LUMAXTECH); Varroc Engineering (VARROC); Fiem Industries (FIEMIND); Sandhar Technologies (SANDHAR) |
| Systems & Modules | Brakes, suspension & steering | ZF Commercial Vehicle Control Systems India (ZFCVINDIA); Endurance Technologies (ENDURANCE); Gabriel India (GABRIEL); Rane (Madras) (RML); JTEKT India (JTEKTINDIA); ASK Automotive (ASKAUTOLTD); Jamna Auto Industries (JAMNAAUTO); Suprajit Engineering (SUPRAJIT); Brakes India (unlisted) |
| Systems & Modules | Modules, interiors, glass & frames | Samvardhana Motherson International (MOTHERSON); Asahi India Glass (ASAHIINDIA); Belrise Industries (BELRISE); Steel Strips Wheels (SSWL); Wheels India (WHEELS); Tata AutoComp Systems (unlisted) |
| Engine & Driveline | Engine components | SPR Auto Technologies (SHRIPISTON); Sansera Engineering (SANSERA); CIE Automotive India (CIEINDIA); Federal-Mogul Goetze (India) (FMGOETZE); Bharat Forge (BHARATFORG); Ramkrishna Forgings (RKFORGE) |
| Engine & Driveline | Fuel injection & emission control | Bosch (BOSCHLTD); Tenneco Clean Air India (TENNIND); Sharda Motor Industries (SHARDAMOTR); Delphi-TVS Technologies (unlisted) |
| Engine & Driveline | Gears, bearings, chains & axles | Schaeffler India (SCHAEFFLER); Tube Investments of India (TIINDIA); Sona BLW Precision Forgings (SONACOMS); Timken India (TIMKEN); SKF India (SKFINDIA); Automotive Axles (AUTOAXLES); GNA Axles (GNA); Rolex Rings (ROLEXRINGS) |
| Tyres & Aftermarket | Tyres | MRF (MRF); Apollo Tyres (APOLLOTYRE); CEAT (CEATLTD); JK Tyre & Industries (JKTYRE); Balkrishna Industries (BALKRISIND); TVS Srichakra (TVSSRICHAK); Goodyear India (GOODYEAR) |
| Tyres & Aftermarket | Replacement batteries & lubricants | Exide Industries (EXIDEIND); Amara Raja Energy & Mobility (ARE&M); Castrol India (CASTROLIND); Gulf Oil Lubricants India (GULFOILLUB) |
| Tyres & Aftermarket | Dealers & used vehicles | Landmark Cars (LANDMARK); Popular Vehicles and Services (PVSL); CarTrade Tech (CARTRADE) [enabler]; Cars24 (unlisted); Spinny (unlisted) |

Unlisted (12): Honda Motorcycle & Scooter India, Toyota Kirloskar Motor, Kia India, JSW MG Motor India, Daimler India Commercial Vehicles, TAFE, International Tractors (Sonalika), Brakes India, Tata AutoComp Systems, Delphi-TVS Technologies, Cars24 and Spinny. No lender or insurer is placed; vehicle financiers are named in zone text only (they live in Banks & NBFCs).

### Chemicals & Agrochem

| Layer | Zone | Companies |
|---|---|---|
| Farm Inputs | Crop protection brands | UPL (UPL); Sumitomo Chemical India (SUMICHEM); Bayer CropScience (BAYERCROP); PI Industries (PIIND); Dhanuka Agritech (DHANUKA); Rallis India (RALLIS); Insecticides (India) (INSECTICID); Sharda Cropchem (SHARDACROP); Coromandel International (COROMANDEL); NACL Industries (NACLIND); Godrej Agrovet (GODREJAGRO); Bharat Rasayan (BHARATRAS) |
| Farm Inputs | Fertilisers | Chambal Fertilisers & Chemicals (CHAMBLFERT); Coromandel International (COROMANDEL); Paradeep Phosphates (PARADEEP); IFFCO (Indian Farmers Fertiliser Cooperative) (unlisted); Fertilisers and Chemicals Travancore (FACT); Rashtriya Chemicals and Fertilizers (RCF); National Fertilizers (NFL); Gujarat State Fertilizers & Chemicals (GSFC); Gujarat Narmada Valley Fertilizers & Chemicals (GNFC); Deepak Fertilisers & Petrochemicals (DEEPAKFERT) |
| Farm Inputs | Seeds & crop nutrition | Kaveri Seed Company (KSCL); Mahyco (Maharashtra Hybrid Seeds) (unlisted); UPL (UPL); Bayer CropScience (BAYERCROP); Rallis India (RALLIS); Aries Agro (ARIES); Coromandel International (COROMANDEL) |
| Specialty Chemicals | Custom synthesis for global innovators | PI Industries (PIIND); Aether Industries (AETHER); Anupam Rasayan India (ANURAS); SRF (SRF); Navin Fluorine International (NAVINFLUOR); Tatva Chintan Pharma Chem (TATVA); Hikal (HIKAL); Jubilant Ingrevia (JUBLINGREA) |
| Specialty Chemicals | Fluorochemicals & refrigerants | SRF (SRF); Navin Fluorine International (NAVINFLUOR); Gujarat Fluorochemicals (FLUOROCHEM); Stallion India Fluorochemicals (STALLION) |
| Specialty Chemicals | Aromatics, amines & specialty intermediates | Aarti Industries (AARTIIND); Deepak Nitrite (DEEPAKNTR); Atul (ATUL); Clean Science and Technology (CLEAN); Jubilant Ingrevia (JUBLINGREA); Vinati Organics (VINATIORGA); Alkyl Amines Chemicals (ALKYLAMINE); Balaji Amines (BALAMINES); Laxmi Organic Industries (LXCHEM); Neogen Chemicals (NEOGEN) |
| Specialty Chemicals | Adhesives, aroma & personal-care chemicals | Pidilite Industries (PIDILITIND); Privi Speciality Chemicals (PRIVISCL); Galaxy Surfactants (GALAXYSURF); Fine Organic Industries (FINEORG); S H Kelkar and Company (SHK); Rossari Biotech (ROSSARI); Godrej Industries (GODREJIND) |
| Specialty Chemicals | Carbon black, rubber & colour chemicals | PCBL Chemical (PCBL); Himadri Speciality Chemical (HSCL); NOCIL (NOCIL); Sudarshan Chemical Industries (SUDARSCHEM); Bodal Chemicals (BODALCHEM) |
| Commodity Chemicals | Soda ash & chlor-alkali | Tata Chemicals (TATACHEM); Nirma (unlisted); GHCL (GHCL); DCM Shriram (DCMSHRIRAM); Gujarat Alkalies and Chemicals (GUJALKALI); Epigral (EPIGRAL); Grasim Industries (GRASIM); Archean Chemical Industries (ACI) |
| Commodity Chemicals | Petrochemicals, polymers & solvents | Reliance Industries (RELIANCE); Haldia Petrochemicals (unlisted); Chemplast Sanmar (CHEMPLASTS); Supreme Petrochem (SPLPETRO); IG Petrochemicals (IGPL); Thirumalai Chemicals (TIRUMALCHM); GAIL (India) (GAIL) |
| Commodity Chemicals | Industrial explosives & nitrates | Solar Industries India (SOLARINDS); Deepak Fertilisers & Petrochemicals (DEEPAKFERT); GOCL Corporation (GOCLCORP); Premier Explosives (PREMEXPLN); Gujarat Narmada Valley Fertilizers & Chemicals (GNFC) |
| Feedstock & Logistics | Feedstock: refiners & gas | Reliance Industries (RELIANCE); Indian Oil Corporation (IOC); Bharat Petroleum (BPCL); Hindustan Petroleum (HINDPETRO); Oil and Natural Gas Corporation (ONGC); GAIL (India) (GAIL); Petronet LNG (PETRONET) |
| Feedstock & Logistics | Chemical terminals & logistics | Aegis Logistics (AEGISLOG); Aegis Vopak Terminals (AEGISVOPAK); Adani Ports and SEZ (ADANIPORTS) [enabler]; Great Eastern Shipping (GESHIP) [enabler] |

Unlisted (4): IFFCO and Mahyco (farm inputs), Nirma (soda ash) and Haldia Petrochemicals (petrochemicals).

## 2. Left-out names and why

Sources: `docs/waves/notes-itservices.md`, `notes-autos.md` and `notes-chemicals.md`.

### IT Services & GCCs

All 16 must-place Nifty 500 symbols are placed.

| Names | Why left out |
|---|---|
| AFFLE, TANLA, ROUTE, RATEGAIN | Ad-tech and messaging platforms; they belong to Consumer Internet (`adtech`) |
| MOSCHIP | Semiconductor design modules; belongs to the semiconductor industries |
| CIGNITITEC | Last NSE quote May 2026 (absorbed by Coforge); mentioned in Coforge's role only |
| Bluspring | Facility management (demerged from Quess), not part of this chain |

### Automobiles

All 19 must-place Nifty 500 symbols are placed (plus the optional CASTROLIND).

| Names | Why left out |
|---|---|
| MSUMI, SUBROS, PRICOLLTD, SUNDRMFAST, CRAFTSMAN | Stay in EV & 4W Components (harness, thermal, cluster, forgings); mentioned in zone text only |
| JBMA, OLECTRA | E-buses stay in EV & 4W Components only |
| ACE | Capital goods round |
| SHRIRAMFIN, CHOLAFIN, M&MFIN and other vehicle financiers | Live in Banks & NBFCs; named in the dealers zone text only |
| RANEHOLDIN | Holding company; Rane (Madras) (RML) is placed as the operating company |
| SKFINDUS | Industrial bearings, not auto (SKFINDIA is the automotive company) |
| HEROMOTORS, MUNJALSHOW, HITECHGEAR, BANCOINDIA, UCAL, SETCO, Talbros, Harita Seating | Small, or not verified as trading (TALBROS, HARITASEAT and TIDEWATER returned no NSE quote); candidates for a later pass |
| Suzuki Motorcycle India, Piaggio India, John Deere India, CNH India, Renault/Nissan, Skoda-VW India | Unlisted; room in zones but not essential |

### Chemicals & Agrochem

All 17 must-place Nifty 500 symbols are placed except SWANCORP; the other Nifty 500 "Chemicals" name not placed is LINDEINDIA.

| Names | Why left out |
|---|---|
| SWANCORP | Shipbuilding, defence, textiles, real estate and a stalled LNG terminal; its only chemical link is a Jan 2026 order for six chemical tankers. The "Chemicals" label is legacy. Better placed in Naval Shipbuilding or a later oil & gas industry |
| LINDEINDIA | Industrial gases, which are kept out of this industry (covered in the semiconductor and hospital industries) |
| MRPL | A refiner; left for the oil & gas round |
| ACUTAAS, IOLCP, AARTIPHARM | Pharma-only; stay in Pharma, ECMS and PLI-ACC |
| Tanfac | BSE-only; mentioned in Anupam Rasayan's role, not linked |

## 3. Coverage

- Nifty 500 coverage went from 340/500 (68%) after Wave 1 to 397/500 (79%) after Wave 2.
- Still missing from the Wave 2 groups: SWANCORP (chemicals).
- `check-coverage` reports 0 unexplained gaps across 695 covered companies.
- 142 new companies were added to the database. Figures snapshot: 18 Nov 2026.
- Prices: 143 series refreshed.
- Shareholding: 1,384 company-quarters.
- Basket returns were refreshed.
- The seed now holds 887 companies across 28 industries.

## 4. Calls made

- **Benchmarks.** IT Services uses Nifty IT (new key `niftyit`, ^CNXIT). Automobiles reuses Nifty Auto (`niftyauto`, AUTOBEES.NS). Chemicals has no benchmark yet, because no chemicals index or ETF has a year of history; revisit in Jan 2027.
- **News matcher.** Wave 2 names and their look-alikes were added. Tata Motors demerged into TMCV (commercial vehicles) and TMPV (passenger vehicles), and headlines say "Tata Motors" for both, so the matcher handles the pair both ways. "Bosch Ltd" headlines count again (Bosch Global Software Technologies, unlisted, stays separate).
- **Tickers and names.** TMCV trades as "Tata Motors Limited" on NSE (demerger effective 1 Oct 2025). LTM is the new name of LTIMindtree (17 Apr 2026). SHRIPISTON is SPR Auto Technologies. SMLMAH is SML Mahindra. Rane (Madras) (RML) is placed instead of the holding company. SKFINDIA is automotive only since the 1 Oct 2025 demerger. Supreme Petrochem is SPLPETRO.
- **IT Services.** ALLDIGI sits in BPM, not infrastructure (it is the former Allsec, payroll and customer-experience outsourcing). DIGITIDE was added as Quess's demerged BPM arm. Foreign-listed names (Accenture, Cognizant, Freshworks, Sify) are unlisted with a note, as MakeMyTrip was in Wave 1. The GCC zone is unlisted operators plus enablers (SMARTWORKS, INDIQUBE) so it has listed names. The Coforge-Encora deal is written as about $2.35 bn. APTECHT is linked low because most of its training is not IT.
- **Automobiles.** Vehicle makers and dealers are operators; parts, tyre, battery and oil makers are direct suppliers; CarTrade is an enabler. TMCV and TMPV are separate companies in separate zones; Eicher (VECV) and M&M are also linked to trucks.
- **Chemicals.** Hikal is linked for its crop-protection business only. Archean is placed in chlor-alkali as a marine-chemicals maker. Solar Industries is linked for mining explosives (defence is covered elsewhere). Long zone lists (12 companies in crop protection, 10 in fertilisers and in intermediates) are fine, as in Wave 1.
- **Shared keys.** Companies that already sit in another industry reuse the same key, so the same company shows the same figures everywhere.
- **Operating-company figures.** Companies whose group figures include other segments (for example GODREJIND and DCMSHRIRAM) carry a note rather than a separate set of figures.
- **Reading and deck links.** Autos reading links and deck sources were opened on 19 Nov 2026.

## 5. Open items for review

- FACT (Fertilisers and Chemicals Travancore) has no latest-year figures yet; it fills in when Screener publishes them.
- Escorts: the FY26 profit jump may be one-off (railway-business sale, about 1,600 Cr, completed around Jun 2025); screen-out candidate.
- Other screen-out candidates from the consultants:
  - IT Services: COFORGE (Encora consolidated from 1 May 2026), QUESS (Digitide and Bluspring demerger), HGS (other-income swings), FRACTAL (listed Feb 2026), DIGITIDE (listed Jun 2025), flex-office operators WEWORK, SMARTWORKS and INDIQUBE (lease accounting), RAMCOSYS (loss-making history).
  - Chemicals: TATACHEM (consolidated loss from overseas soda ash), GOCLCORP (land and property gains), GODREJIND and DCMSHRIRAM (group figures, chemicals one segment).
  - Automobiles (watch, not yet a call): HEROMOTOCO one-time gain in Q2 FY27, TMCV and TMPV demerger year, SKFINDIA and RML restated bases, GABRIEL composite scheme, BELRISE, TENNIND and ATHERENERG IPO-year effects; OLAELEC is loss-making and flagged rather than screened.
- Figures from secondary sources to recheck: the Hormuz closure (since Mar 2026), monsoon rainfall at -12.6%, and the Q2 FY27 company numbers taken from news and results coverage (HCLTech revenue and bookings, TVS and Eicher growth, Hyundai Q1 FY27 margin, Chemicals deck company news). Also recheck: Infosys's earlier FY27 guidance range (1.5-3% against one report of 1.5-3.5%), the H-1B fee appeal status after Jul 2026, CEAT's Camso deal completion, Apollo's Enschede closure, the two-wheeler ABS mandate (only the Jun 2025 draft is confirmed) and the US auto-part tariffs awaiting notification.
- Carmakers' primary industry may now resolve to Automobiles (MARUTI, M&M, BAJAJ-AUTO, EICHERMOT, TMPV, HYUNDAI, ASHOKLEY and the EV & 4W component names); check the stock pop-ups.
- Marketing copy that lists industries (site description, OG image, docs and companies pages) needs "Automobiles" added.
