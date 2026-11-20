# Retail & Consumer Brands (`consumerbrands`) - consultant notes for the lead (Gate 2, 20 Nov 2026)

Files filled: `src/lib/sector-content/sectors/consumerbrands.ts`, `sectors/consumerbrands.extras.ts`,
`reports/consumerbrands.ts`. `muted: true` and `basketCoreOnly: true` kept (lead unmutes).

Checks run 20 Nov 2026: `npm run validate:content` (30 sectors, no problems - also clean with `muted` flipped to
false temporarily, so the completeness gate passes), `npx tsx scripts/check-report.ts consumerbrands` (report OK),
`npx tsc --noEmit -p .`, eslint on the three files.

## Shape

- 11 zones exactly as contracted (ids, layers, domains, order, integrator `retail_chains`, `A.<id>` anchors untouched).
- 70 supplier keys: **66 listed** (all `co("TICKER")`, no typed company figures) and **4 unlisted**
  (Samsung India Electronics, Reliance Retail, Pernod Ricard India, Cinépolis India).
- 4 scenarios, 4 reading links (all four opened 20 Nov 2026), 10-slide deck with 6 reading links.
- Exposure types: brands, chains, restaurants, liquor makers and cinemas `operator`; spinners and garment exporters
  `direct_supplier`; Dixon and Amber `indirect_supplier`/low; Eternal and Swiggy `enabler`/low; Phoenix `enabler`/low.
  No side link is `high`.

## Zone -> company map

| Zone | Companies |
| --- | --- |
| large_appliances | LG Electronics India (LGEINDIA), Whirlpool of India (WHIRLPOOL), Voltas (VOLTAS, medium), Blue Star (BLUESTARCO, medium), IFB Industries (IFBIND, medium), Samsung India Electronics (unlisted), Dixon (DIXON, indirect low), Amber (AMBER, indirect low) |
| small_appliances | Crompton (CROMPTON), Havells (HAVELLS, medium), V-Guard (VGUARD, medium), Bajaj Electricals (BAJAJELEC), Orient Electric (ORIENTELEC), TTK Prestige (TTKPRESTIG), Hawkins (HAWKINCOOK, medium), Symphony (SYMPHONY, medium) |
| home_living | Welspun Living (WELSPUNLIV), Trident (TRIDENT, medium), Sheela Foam (SFL), Wakefit (WAKEFIT), Nilkamal (NILKAMAL, medium) |
| apparel_brands | Page Industries (PAGEIND), ABLBL (ABLBL), Arvind Fashions (ARVINDFASN), Raymond Lifestyle (RAYMONDLSL, medium), Go Fashion (GOCOLORS, medium), ABFRL (ABFRL, medium) |
| textile_makers | K.P.R. Mill (KPRMILL), Vardhman (VTL), Trident (TRIDENT), Arvind (ARVIND), Gokaldas Exports (GOKEX) |
| footwear | Bata (BATAINDIA), Metro Brands (METROBRAND), Relaxo (RELAXO), Campus (CAMPUS), Redtape (REDTAPE, medium) |
| jewellery | Titan (TITAN), Kalyan (KALYANKJIL), Thangamayil (THANGAMAYL), Senco (SENCO), PN Gadgil (PNGJL, medium), BlueStone (BLUESTONE, medium), Ethos (ETHOSLTD, medium) |
| retail_chains (integrator) | Trent (TRENT), Vishal Mega Mart (VMM), ABFRL (ABFRL), V-Mart (VMART), Shoppers Stop (SHOPERSTOP), DMart (DMART, medium), Reliance Retail (unlisted) |
| qsr | Jubilant FoodWorks (JUBLFOOD), Devyani (DEVYANI), Sapphire Foods (SAPPHIRE), Westlife (WESTLIFE), Restaurant Brands Asia (RBA, medium), Eternal (enabler low), Swiggy (enabler low) |
| alcobev | United Spirits (UNITDSPR), United Breweries (UBL), Radico Khaitan (RADICO), Allied Blenders (ABDL), Tilaknagar (TI), Globus Spirits (GLOBUSSPR, medium), Som Distilleries (SDBL, medium), Sula Vineyards (SULA, medium), Pernod Ricard India (unlisted) |
| cinemas | PVR INOX (PVRINOX), Cinépolis India (unlisted, medium), Wonderla (WONDERLA, medium), Imagicaa (IMAGICAA, medium), Phoenix Mills (PHOENIXLTD, enabler low) |

Linked existing keys reused (same key, same ticker): `voltas`, `bluestar`, `havells`, `phoenix` (realestate);
`dixon`, `amber` (ecms); `titan`, `trent` (nifty50); `dmart`, `eternal`, `swiggy` (consumerinternet);
`wonderla`, `imagicaa` (hotels); `samsung` (semicon2, unlisted, same name "Samsung India Electronics").
Each has its own role text for this chain.

## Must-place check - all 19 placed

The contract says 18 but its list has 19 (6 Consumer Durables + 5 Textiles + 3 Consumer Services + 4 alco-bev + PVRINOX);
`check-index-coverage.ts` on 20 Nov 2026 confirms the 19: BATAINDIA, CROMPTON, KALYANKJIL, LGEINDIA, THANGAMAYL,
WHIRLPOOL, KPRMILL, PAGEIND, TRIDENT, VTL, WELSPUNLIV, DEVYANI, JUBLFOOD, VMM, ABDL, RADICO, UBL, UNITDSPR, PVRINOX.
None left out. Once unmuted, Consumer Durables 16/16, Textiles 5/5, Consumer Services 23/23.

## Needs `refresh-financials.ts --add` (53 tickers; read-only query of "Company", 20 Nov 2026)

Every ticker below returned a live NSE quote on 20 Nov 2026 (Yahoo chart API, `.NS`), with the current name.

- Missing from the table (53):
  LGEINDIA, WHIRLPOOL, IFBIND, CROMPTON, VGUARD, BAJAJELEC, TTKPRESTIG, HAWKINCOOK, SYMPHONY, ORIENTELEC, WELSPUNLIV,
  SFL, NILKAMAL, WAKEFIT, PAGEIND, ABLBL, ABFRL, ARVINDFASN, GOKEX, GOCOLORS, KPRMILL, TRIDENT, VTL, ARVIND, BATAINDIA,
  METROBRAND, RELAXO, CAMPUS, KALYANKJIL, THANGAMAYL, SENCO, PNGJL, BLUESTONE, ETHOSLTD, VMM, VMART, SHOPERSTOP,
  JUBLFOOD, DEVYANI, WESTLIFE, SAPPHIRE, RBA, UNITDSPR, UBL, RADICO, ABDL, TI, GLOBUSSPR, SDBL, PVRINOX,
  RAYMONDLSL, REDTAPE, SULA.
- Already tracked: VOLTAS, BLUESTARCO, DIXON, AMBER, HAVELLS, TITAN, TRENT, DMART, PHOENIXLTD, WONDERLA, ETERNAL,
  SWIGGY, IMAGICAA (13).

## Ticker and name facts checked (NSE names, 20 Nov 2026)

- LGEINDIA "LG Electronics India Limited" (listed 14 Oct 2025). VMM "Vishal Mega Mart Limited" (listed 18 Dec 2024).
  ABDL "Allied Blenders and Distillers Limited" (listed 2 Jul 2024). ABLBL "Aditya Birla Lifestyle Brands Limited"
  (demerged from ABFRL, listed Jun 2025). WAKEFIT "Wakefit Innovations Limited" (listed 15 Dec 2025 - the contract
  said "check listing": it is listed). BLUESTONE listed Aug 2025; PNGJL Sep 2024.
- TI = Tilaknagar Industries (bought Imperial Blue from Pernod Ricard India, completed 1 Dec 2025, ₹3,442 Cr + €28m deferred).
- SFL = Sheela Foam; GOCOLORS = Go Fashion (India); SHOPERSTOP (one P); HAWKINCOOK; TTKPRESTIG.
- Not trading / not found on Yahoo: KEWALKIRAN, BARBEQUE (Barbeque Nation), STYLEBAAM (Baazar Style) - not used.

## Left out, and why

| Names | Why |
| --- | --- |
| SUNTV, ZEEL, PFOCUS | Contract: broadcasters/media not in this wave |
| NYKAA, Eternal/Swiggy as platforms, online-first fashion | Stay in Consumer Internet (Eternal, Swiggy linked here only as low enablers) |
| Malls (other than Phoenix link), HVAC projects, electricals | Stay in Real Estate (Voltas, Blue Star, Havells re-linked as consumer brands, medium) |
| HONASA, EMAMILTD, personal care; FMCG's Nykaa link | FMCG module |
| SAFARI (luggage), CELLO (houseware), LUXIND (innerwear), Rupa, Dollar, Kewal Kiran, Khadim, Liberty, Barbeque Nation, Speciality Restaurants, Sapphire's Sri Lanka arm | Room in zones; not essential this pass. SAFARI, CELLO, LUXIND verified live on NSE (20 Nov 2026) if the lead wants them |
| Haier India, Godrej Appliances, Panasonic, Daikin India, Hitachi (Johnson Controls) | Unlisted / part of other groups; Samsung chosen as the one unlisted appliance name |

## screenOut (one-off year) candidates

- TITAN, KALYANKJIL: FY27 includes inventory gains from the 13 May 2026 gold-duty rise (Titan ₹536 Cr in Q2 FY27;
  Kalyan ₹73 Cr exceptional gain). FY27 is not yet the latest full year - watch at year end.
- ABFRL / ABLBL: FY26 is the demerger year (ABLBL listed Jun 2025) - growth not like-for-like.
- DEVYANI / SAPPHIRE: merger (share swap 177:100) will restate Devyani and delist Sapphire once effective.
- TI (Tilaknagar): FY26/FY27 include the Imperial Blue acquisition (from 1 Dec 2025) - growth not like-for-like.
- KPRMILL, VTL: Q2 FY27 margins lifted by low-cost cotton inventory (trading gain) - not a one-off accounting item, flag only.
- RAYMONDLSL: FY25 demerger year. REDTAPE: demerged from Mirza International (2023).
- WELSPUNLIV: FY26 profit depressed by US tariff year; FY27 rebound (13-fold Q2 profit) - flag only.
- LGEINDIA, WAKEFIT, BLUESTONE: IPO-year effects.

## News-matcher entries / look-alikes (for the news.ts owner)

- **Titan**: "Tanishq", "CaratLane"; NOT_ABOUT "Titan" (submersible/moon) unless "Titan Company"/"Tanishq".
- **Kalyan**: "Kalyan Jewellers" vs Kalyan (city) and Kalyani group; never bare "Kalyan".
- **Trent**: "Zudio", "Westside"; Trent is a common surname/river - require "Trent Ltd"/"Zudio"/"Westside".
- **VMM**: "Vishal Mega Mart" - "Vishal" alone is a first name. **V-Mart** vs Vishal Mega Mart - keep separate.
- **Bata**: word ticker risk (BATAINDIA); "Bata India". **Metro Brands** vs Metro Cash & Carry / Delhi Metro; require "Metro Brands"/"Mochi".
- **Campus**: require "Campus Activewear"/"Campus shoes". **Redtape**: "Red Tape" is also a common phrase - require company context.
- **Page Industries**: "Jockey India"; NOT_ABOUT global Jockey International news. **Raymond Lifestyle** vs Raymond Ltd (realty/engineering) - GROUP "raymond".
- **Aditya Birla**: GROUP - ABLBL ("Louis Philippe", "Van Heusen", "Allen Solly", "Peter England"), ABFRL ("Pantaloons", "TCNS"), plus Grasim, Hindalco, AB Capital etc.
- **Arvind**: ARVIND vs ARVINDFASN vs Arvind SmartSpaces - GROUP "arvind". **Trident**: also Trident Hotels (Oberoi/EIH) - NOT_ABOUT.
- **Welspun**: GROUP - Welspun Living vs Welspun Corp, Welspun Enterprises. **Vardhman**: VTL vs Vardhman Special Steels.
- **Crompton**: CROMPTON (Crompton Greaves Consumer) vs CG Power (formerly Crompton Greaves). **Havells/Lloyd**.
- **Bajaj Electricals** vs Bajaj Auto/Finance/Consumer Care - GROUP "bajaj". **Orient Electric** vs Orient Cement/Orient Paper.
- **LG**: "LG Electronics India" vs LG Chem, LG Energy, global LG; **Whirlpool**: "Whirlpool of India" vs Whirlpool Corp (parent stake-sale news is relevant).
- **Symphony**: word ticker (orchestras). **Hawkins**: surname. **Wakefit** distinctive. **Nilkamal** distinctive.
- **United Spirits**: "Diageo India", "McDowell's"; **United Breweries**: "Kingfisher beer" vs Kingfisher Airlines; GROUP "united".
- **Radico**: "Magic Moments". **ABDL**: "Officer's Choice", "Allied Blenders". **TI**: word ticker - "Tilaknagar", "Imperial Blue", "Mansion House".
- **Sula**: "Sula Vineyards". **SDBL**: "Som Distilleries". **Globus Spirits**.
- **Jubilant FoodWorks**: "Domino's India" vs Jubilant Pharmova, Jubilant Ingrevia - GROUP "jubilant". Global Domino's Pizza Inc. NOT_ABOUT.
- **Devyani/Sapphire**: "KFC India", "Pizza Hut India"; global Yum! news NOT_ABOUT. **Westlife**: "McDonald's India (West and South)" vs Westlife the band. **RBA**: "Burger King India".
- **PVR INOX**: "PVR", "INOX" vs INOX Wind, INOX Green, INOX India, Gujarat Fluorochemicals (INOXGFL group) - NOT_ABOUT pairs.
- **Senco Gold**, **PN Gadgil** (vs PNG gas), **BlueStone**, **Ethos** (word), **Thangamayil**.

## Benchmark

- Contract: Nifty India Consumption. Not checked (lead owns benchmarks.ts).

## Shared-file requests

- None required. `Reliance Retail` is introduced here as an unlisted name; if FMCG's consultant also uses it in
  `distribution`, both must use the exact name **"Reliance Retail"**.
- `primarySector()` may now pick Retail & Consumer Brands for TITAN and TRENT (nifty50) and VOLTAS/HAVELLS - check pop-ups.
- Marketing copy listing sectors (`lib/site.ts`, OG image, `/docs`, `/companies`) to add "Retail & Consumer Brands".

## Facts to recheck at Gate 7 (secondary sources: aggregators, not filings)

- Q2 FY27 figures from aggregator summaries (investywise, multibagg, sovrenn, lapaasvoice): Titan jewellery growth
  (sources say 19-24%; content says "about 21%"), Thangamayil margin drop, KPR Mill profit (+58%, ₹345 Cr), Vardhman
  (+91%), Trident (~₹176 Cr), Westlife small loss, PVR INOX ATP ₹298 / SPH ₹153 / footfalls 4.6 crore (written as
  "reported"), United Spirits popular -23% (one source flagged possible H1/Q2 mix-up), Devyani KFC SSSG 4.4% (single source).
- US tariff on Indian goods: 25% -> 18% (Feb 2026 framework), then a 15% all-country tariff - current rate not confirmed
  from an official source; content says "later moved to a 15% all-country tariff".
- Box office 2022 (₹10,637 Cr) is from the Ormax 2022 report, not opened in this pass (2023-2025 verified on Ormax pages).
- RBA's Indonesia business (still owned? sale talks were reported) - written as "plus a Burger King business in Indonesia".
- Whirlpool parent's stake ("about 40%", Jun 2026) and sale talks (Sep 2026) - unconfirmed deal.
- "Fewer than one in ten homes owns a room AC" - widely cited industry estimate, no single dated source.
- Devyani-Sapphire CCI approval (exchange4media, 7 Nov 2026) - page returned 403 when opened; from search snippets.
- Gokaldas "duty-free under AGOA when in force" - AGOA lapsed Sep 2025; renewal status not checked.

## Sources used (all accessed 20 Nov 2026)

WGC India Focus Q3 2026 and 17 Nov 2026 update (gold.org); Ormax 2025 annual and Jan-Jun 2026 reports; Business Today
on the UK FTA (15 Jul 2026); ABLBL Q2 FY27 press release (adityabirla.com); GST Council press release Sep 2025;
company Q2 FY27 coverage via Kotak Neo, Free Press Journal, exchange4media, Business Standard, Indian Television,
Outlook Business, The Week/PTI; ICRA consumer-durables note (Q1 FY27 RAC volumes); BIS/DPIIT compressor QCO amendment
(2026) and news on the Mar 2027 extension; Business Today/Angel One on the May 2026 gold duty rise; Tilaknagar
completion (The Week/PTI, 1 Dec 2025); Wakefit listing (NSE circular, Business Standard, 15 Dec 2025).
