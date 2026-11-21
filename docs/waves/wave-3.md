# Wave 3: FMCG, Retail & Consumer Brands

Wave 3 added two industries to NextResearch. Both are live (unmuted) on branch `claude/industries-wave-3`. Content date for the write-ups is 20 Nov 2026.

| Industry | Source file | Layers | Zones | Companies | Listed | Unlisted |
|---|---|---|---|---|---|---|
| FMCG | `src/lib/sector-content/sectors/fmcg.ts` (+ `fmcg.extras.ts`) | Farm & Staples, Food & Drink Brands, Home & Personal Care, Packs & Shelf | 12 | 78 | 67 | 11 |
| Retail & Consumer Brands | `src/lib/sector-content/sectors/consumerbrands.ts` (+ `consumerbrands.extras.ts`) | Home & Appliances, Wear & Adorn, Stores & Eating Out, Drinks & Leisure | 11 | 97 | 93 | 4 |

A company can sit in more than one zone (for example Hindustan Unilever is an operator in FMCG majors and a medium link in soft drinks, personal care and home care, and Eternal is an enabler in quick commerce, restaurants and cinemas), so zone rows add up to more than the company count. The counts include the side links added by the missing-players audit (the consultant notes list 68 and 70 companies from before it).

How to read the maps: "(unlisted)" means no stock-exchange listing, so no price or figures. "[enabler]", "[direct supplier]", "[indirect supplier]" and "[emerging entrant]" mark how the company relates to the zone; unmarked names are operators. "(medium)" and "(low)" mark side links with less exposure to the zone; unmarked links are high.

## 1. Company-to-zone map

### FMCG

| Layer | Zone | Companies |
|---|---|---|
| Farm & Staples | Edible oils, rice & packaged staples | AWL Agri Business (AWL); Patanjali Foods (PATANJALI); LT Foods (LTFOODS); KRBL (KRBL); Gokul Agro Resources (GOKULAGRO) (medium); Tata Consumer Products (TATACONSUM) (medium); ITC (ITC) (medium); Marico (MARICO) (low) |
| Farm & Staples | Sugar, ethanol & sweeteners | Balrampur Chini Mills (BALRAMCHIN); EID Parry (India) (EIDPARRY); Triveni Engineering & Industries (TRIVENI); Dhampur Sugar Mills (DHAMPURSUG); Bajaj Hindusthan Sugar (BAJAJHIND) (medium); DCM Shriram (DCMSHRIRAM) (low); Shree Renuka Sugars (RENUKA); Dalmia Bharat Sugar (DALMIASUG) (medium); Praj Industries (PRAJIND) [enabler] (medium) |
| Farm & Staples | Dairy, poultry & seafood | Hatsun Agro Product (HATSUN); Heritage Foods (HERITGFOOD); Parag Milk Foods (PARAGMILK); Dodla Dairy (DODLA); Avanti Feeds (AVANTIFEED); Venky's (India) (VENKEYS) (medium); Godrej Agrovet (GODREJAGRO) (medium); Amul (GCMMF) (unlisted) |
| Food & Drink Brands | Biscuits, snacks & packaged foods | Britannia Industries (BRITANNIA); Nestle India (NESTLEIND); Zydus Wellness (ZYDUSWELL); Bikaji Foods International (BIKAJI); Mrs. Bectors Food Specialities (BECTORFOOD); Kwality Wall's (India) (KWIL) (medium); ITC (ITC) (medium); Haldiram's (unlisted); Mondelez India (unlisted); Orkla India (ORKLA) |
| Food & Drink Brands | Soft drinks, tea & coffee | Varun Beverages (VBL); Tata Consumer Products (TATACONSUM); CCL Products (India) (CCL); Hindustan Coca-Cola Beverages (unlisted); Reliance Consumer Products (unlisted) [emerging entrant]; Hindustan Unilever (HINDUNILVR) (medium); Nestle India (NESTLEIND) (medium); Dabur India (DABUR) (low) |
| Food & Drink Brands | Cigarettes & tobacco | ITC (ITC); Godfrey Phillips India (GODFRYPHLP); VST Industries (VSTIND) |
| Home & Personal Care | FMCG majors | Hindustan Unilever (HINDUNILVR); Dabur India (DABUR); Marico (MARICO); Godrej Consumer Products (GODREJCP); Colgate-Palmolive (India) (COLPAL); Nestle India (NESTLEIND) (medium); ITC (ITC) (medium) |
| Home & Personal Care | Personal care, beauty & grooming | Gillette India (GILLETTE); Emami (EMAMILTD); Honasa Consumer (HONASA); Cupid (CUPID); Procter & Gamble Hygiene and Health Care (PGHH); Bajaj Consumer Care (BAJAJCON); L'Oreal India (unlisted); FSN E-Commerce Ventures (Nykaa) (NYKAA) [enabler] (low); Hindustan Unilever (HINDUNILVR) (medium); Colgate-Palmolive (India) (COLPAL) (medium); Dabur India (DABUR) (medium); Marico (MARICO) (medium); Godrej Consumer Products (GODREJCP) (medium) |
| Home & Personal Care | Home care, hygiene & stationery | Jyothy Labs (JYOTHYLAB); DOMS Industries (DOMS); Flair Writing Industries (FLAIR); Reckitt India (unlisted); Hindustan Unilever (HINDUNILVR) (medium); Godrej Consumer Products (GODREJCP) (medium); Procter & Gamble Hygiene and Health Care (PGHH) (medium); Cello World (CELLO) (medium); Eveready Industries (EVEREADY) (medium) |
| Packs & Shelf | Flavours, fragrances & contract makers | Hindustan Foods (HNDFDS); S H Kelkar and Company (SHK) [direct supplier]; Galaxy Surfactants (GALAXYSURF) [direct supplier] (medium); Manorama Industries (MANORAMA) [direct supplier] (medium); Fine Organic Industries (FINEORG) [direct supplier] (medium); Privi Speciality Chemicals (PRIVISCL) [direct supplier] (low) |
| Packs & Shelf | Packs, tubes, bottles & labels | EPL (EPL) [direct supplier]; UFLEX (UFLEX) [direct supplier] (medium); Huhtamaki India (HUHTAMAKI) [direct supplier] (medium); TCPL Packaging (TCPLPACK) [direct supplier] (medium); AGI Greenpac (AGI) [indirect supplier] (medium); Mold-Tek Packaging (MOLDTKPAC) [indirect supplier] (medium) |
| Packs & Shelf | Distributors, modern trade & quick commerce | Avenue Supermarts (DMart) (DMART) [enabler] (medium); Reliance Retail (unlisted) [enabler] (medium); Eternal (Zomato, Blinkit) (ETERNAL) [enabler] (low); Swiggy (SWIGGY) [enabler] (low); Zepto (unlisted) [enabler] (low); Udaan (unlisted) [enabler] (low); Jumbotail (unlisted) [enabler] (low); Vishal Mega Mart (VMM) [enabler] (low) |

Unlisted (11): Amul (GCMMF), Haldiram's, Mondelez India, Hindustan Coca-Cola Beverages, Reliance Consumer Products (an emerging entrant), L'Oreal India, Reckitt India, Reliance Retail, Zepto, Udaan and Jumbotail.

### Retail & Consumer Brands

| Layer | Zone | Companies |
|---|---|---|
| Home & Appliances | ACs, refrigerators & washing machines | LG Electronics India (LGEINDIA); Whirlpool of India (WHIRLPOOL); Voltas (VOLTAS) (medium); Blue Star (BLUESTARCO) (medium); IFB Industries (IFBIND) (medium); Samsung India Electronics (unlisted); Dixon Technologies (DIXON) [indirect supplier] (low); Amber Enterprises India (AMBER) [indirect supplier] (low); Havells India (HAVELLS) (medium); Bosch Home Comfort India (BOSCH-HCIL) (medium); PG Electroplast (PGEL) [indirect supplier] (medium); EPACK Durable (EPACK) [indirect supplier] (low) |
| Home & Appliances | Fans, lighting & kitchen appliances | Crompton Greaves Consumer Electricals (CROMPTON); Havells India (HAVELLS) (medium); V-Guard Industries (VGUARD) (medium); Bajaj Electricals (BAJAJELEC); Orient Electric (ORIENTELEC); TTK Prestige (TTKPRESTIG); Hawkins Cookers (HAWKINCOOK) (medium); Symphony (SYMPHONY) (medium); Polycab India (POLYCAB) (low); RR Kabel (RRKABEL) (low); Stove Kraft (STOVEKRAFT) (medium); Surya Roshni (SURYAROSNI) (low) |
| Home & Appliances | Home textiles, mattresses & furniture | Welspun Living (WELSPUNLIV); Trident (TRIDENT) (medium); Sheela Foam (SFL); Wakefit Innovations (WAKEFIT); Nilkamal (NILKAMAL) (medium); Indo Count Industries (ICIL); Himatsingka Seide (HIMATSEIDE) (medium); Cello World (CELLO) (low) |
| Wear & Adorn | Apparel & innerwear brands | Page Industries (PAGEIND); Aditya Birla Lifestyle Brands (ABLBL); Arvind Fashions (ARVINDFASN); Raymond Lifestyle (RAYMONDLSL) (medium); Go Fashion (India) (GOCOLORS) (medium); Aditya Birla Fashion and Retail (ABFRL) (medium); Vedant Fashions (MANYAVAR); Kewal Kiran Clothing (KKCL) (medium); Dollar Industries (DOLLAR) (medium); Lux Industries (LUXIND) (medium); Rupa & Company (RUPA) (medium) |
| Wear & Adorn | Yarn, fabric & garment makers | K.P.R. Mill (KPRMILL) [direct supplier]; Vardhman Textiles (VTL) [direct supplier]; Trident (TRIDENT) [direct supplier]; Arvind (ARVIND) [direct supplier]; Gokaldas Exports (GOKEX) [direct supplier]; Siyaram Silk Mills (SIYSIL) [direct supplier] (medium); Pearl Global Industries (PGIL) [direct supplier] (medium) |
| Wear & Adorn | Footwear | Bata India (BATAINDIA); Metro Brands (METROBRAND); Relaxo Footwears (RELAXO); Campus Activewear (CAMPUS); Redtape (REDTAPE) (medium) |
| Wear & Adorn | Jewellery & watches | Titan Company (TITAN); Kalyan Jewellers India (KALYANKJIL); Thangamayil Jewellery (THANGAMAYL); Senco Gold (SENCO); P N Gadgil Jewellers (PNGJL) (medium); BlueStone Jewellery and Lifestyle (BLUESTONE) (medium); Ethos (ETHOSLTD) (medium); Rajesh Exports (RAJESHEXPO) [indirect supplier] (medium); International Gemological Institute (IGIL) [enabler] (medium); Sky Gold and Diamonds (SKYGOLD) [indirect supplier] (medium) |
| Stores & Eating Out | Fashion, value & department stores | Trent (TRENT); Vishal Mega Mart (VMM); Aditya Birla Fashion and Retail (ABFRL); V-Mart Retail (VMART); Shoppers Stop (SHOPERSTOP); Avenue Supermarts (DMart) (DMART) (medium); Reliance Retail (unlisted); Lenskart Solutions (LENSKART) (low); Electronics Mart India (EMIL) (medium); V2 Retail (V2RETAIL) (medium) |
| Stores & Eating Out | Restaurants & QSR chains | Jubilant FoodWorks (JUBLFOOD); Devyani International (DEVYANI); Sapphire Foods India (SAPPHIRE); Westlife Foodworld (WESTLIFE); Restaurant Brands Asia (RBA) (medium); Eternal (Zomato, Blinkit) (ETERNAL) [enabler] (low); Swiggy (SWIGGY) [enabler] (low); Travel Food Services (TRAVELFOOD) (low); United Foodbrands (Barbeque Nation) (BARBEQUE) (medium) |
| Drinks & Leisure | Spirits & beer | United Spirits (UNITDSPR); United Breweries (UBL); Radico Khaitan (RADICO); Allied Blenders and Distillers (ABDL); Tilaknagar Industries (TI); Globus Spirits (GLOBUSSPR) (medium); Som Distilleries & Breweries (SDBL) (medium); Sula Vineyards (SULA) (medium); Pernod Ricard India (unlisted); Piccadily Agro Industries (PICCADIL) (medium) |
| Drinks & Leisure | Cinemas, malls & leisure | PVR INOX (PVRINOX); Cinépolis India (unlisted) (medium); Wonderla Holidays (WONDERLA) (medium); Imagicaaworld Entertainment (IMAGICAA) (medium); The Phoenix Mills (PHOENIXLTD) [enabler] (low); Nexus Select Trust (NXST) [enabler] (low); Eternal (Zomato, Blinkit) (ETERNAL) [enabler] (low) |

Unlisted (4): Samsung India Electronics, Reliance Retail, Pernod Ricard India and Cinépolis India.

## 2. Left-out names and why

Sources: `docs/waves/notes-fmcg.md` and `notes-consumerbrands.md`.

### FMCG

All 20 must-place Nifty 500 symbols are placed. The other Nifty 500 "FMCG" names are the four Nifty 50 names (HINDUNILVR, ITC, NESTLEIND, TATACONSUM, all linked) and ABDL, RADICO, UBL and UNITDSPR, which sit in Retail & Consumer Brands (spirits and beer).

| Names | Why left out |
|---|---|
| APEX (Apex Frozen Foods) | Avanti Feeds covers shrimp |
| LOTUSCHO (Lotus Chocolate) | Reliance-controlled and tiny |
| ADF Foods, GOKUL (Gokul Refoils) | Room in zones; not essential this pass |
| Coromandel International | EID Parry is linked to it by ownership only; Coromandel stays in Chemicals & Agrochem |

### Retail & Consumer Brands

All 19 must-place Nifty 500 symbols are placed (BATAINDIA, CROMPTON, KALYANKJIL, LGEINDIA, THANGAMAYL, WHIRLPOOL, KPRMILL, PAGEIND, TRIDENT, VTL, WELSPUNLIV, DEVYANI, JUBLFOOD, VMM, ABDL, RADICO, UBL, UNITDSPR, PVRINOX).

| Names | Why left out |
|---|---|
| SUNTV, ZEEL, PFOCUS | Broadcasters and media, not in this wave |
| NYKAA, online-first fashion | Stay in Consumer Internet (Eternal and Swiggy are linked here as low enablers) |
| Malls (other than the Phoenix link), HVAC projects | Stay in Real Estate (Voltas, Blue Star and Havells are linked as consumer brands) |
| HONASA, EMAMILTD, personal care | FMCG |
| SAFARI, CELLO, LUXIND, Rupa, Dollar, Kewal Kiran, Khadim, Liberty, Barbeque Nation, Speciality Restaurants | Room in zones when the notes were written; several (CELLO, LUXIND, Rupa, Dollar, Kewal Kiran, Barbeque Nation as United Foodbrands) were later linked by the audit |
| Haier India, Godrej Appliances, Panasonic, Daikin India, Hitachi (Johnson Controls) | Unlisted or part of other groups; Samsung is the one unlisted appliance name |

## 3. Coverage and data

- Nifty 500 coverage: 475/500 (95%) (final line of `npx tsx scripts/check-index-coverage.ts`).
- 98 Wave 3 companies were added to the database.
- A cross-deep-dive audit (`.superpowers/sdd/2026-11-18-new-industries/audit-missing-players.md`) added 212 missing links across 27 deep dives: 132 for companies already covered, plus 80 newly covered companies (cement, power, pharma, apparel, media and more).
- The seed now holds 1,077 companies across 30 industries.
- Ticker and name notes: Orkla India trades as ORKLAINDIA; United Foodbrands (formerly Barbeque-Nation) is NSE UFBL; JSW Dulux is the former Akzo Nobel India; EPACK (EPACK Durable) and ICIL (Indo Count Industries) are the tickers used in Retail & Consumer Brands.

## 4. Calls made

- **Benchmarks.** FMCG uses Nifty FMCG (^CNXFMCG). Retail & Consumer Brands uses Nifty India Consumption (^CNXCONSUM).
- **Core-only baskets.** Both industries are core-only baskets, and the pools now carry every company on the map, with side links listed as low exposure (one tap to count). This applies to every core-only industry (Insurance and Chemicals too).
- **3D scenes.** FMCG is "field to kirana": a General Store hero on a winding road from fields and mills to the bazaar. Retail & Consumer Brands is a curved three-floor arcade cut open like a doll's house (appliances, apparel, shoes, jewellery, food court, cinema), with a textile mill and a distillery at its ends. Both were built under the Wave 3 rule against the plinth-and-ring-road template, with a blind check.
- **FMCG exposure.** Packaging and ingredient makers that sell mainly to FMCG (EPL, UFLEX, Huhtamaki, TCPL Packaging, SHK, Galaxy, Manorama) are direct suppliers; AGI Greenpac and Mold-Tek are indirect. Distributors, modern trade and quick-commerce platforms are enablers. Companies already in other industries reuse the same key, so they show the same figures everywhere.
- **Retail exposure.** Brands, chains, restaurants, liquor makers and cinemas are operators; spinners and garment exporters are direct suppliers; Dixon, Amber, PG Electroplast and EPACK are indirect suppliers; Eternal, Swiggy and Phoenix are enablers. The notes' "Reliance Retail" is one unlisted record shared by both industries.
- **Shared names.** "Reliance Retail" and "Zepto" use the exact names of their existing records.

## 5. Open items for review

- VISL and VOGL figures are nearly empty; check the basis.
- PRAJIND (Praj Industries) is not linked in green hydrogen because its electrolyser licence is unconfirmed.
- Rajesh Exports carries a SEBI interim order (3 Jun 2026).
- Screen-out candidates from the notes:
  - FMCG: EIDPARRY (consolidated figures are mostly Coromandel), CUPID (check FY26 is not tender-dominated), KWIL (short history, no five-year standalone record), BAJAJHIND (debt-restructuring history). Watch only: AVANTIFEED, DOMS, LTFOODS, ZYDUSWELL.
  - Retail & Consumer Brands: TITAN and KALYANKJIL (FY27 gold-duty inventory gains), ABFRL and ABLBL (demerger year), DEVYANI and SAPPHIRE (merger year), TI (Imperial Blue acquisition year). Flag only: KPRMILL, VTL, RAYMONDLSL, REDTAPE, WELSPUNLIV, LGEINDIA, WAKEFIT, BLUESTONE.
- Figures from secondary sources to recheck: Britannia Q2 FY27 volume growth, Tata Consumer tea price rise timing, Colgate and HUL margin falls, Emami gross-margin fall, Godfrey Phillips excise outgo, NIQ Apr-Jun 2026 figures, the kirana count and distributor margins, sugar MSP "unchanged since 2019", Gillette India's results calendar; for Retail, the aggregator Q2 FY27 company numbers (Titan, Thangamayil, KPR Mill, Vardhman, Trident, Westlife, PVR INOX, United Spirits, Devyani), the US tariff rate (15% all-country, not confirmed officially), box office 2022, RBA's Indonesia business, Whirlpool's parent stake sale, the Devyani-Sapphire CCI approval and AGOA renewal status.
- Primary industry may now resolve to Retail & Consumer Brands for TITAN, TRENT, VOLTAS and HAVELLS; check the stock pop-ups.
- Marketing copy that lists industries (site description, OG image, docs and companies pages) needs "FMCG" and "Retail & Consumer Brands" added.
