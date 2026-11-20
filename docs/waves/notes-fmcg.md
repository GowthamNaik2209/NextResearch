# Notes for the lead: FMCG (`fmcg`)

Content date 20 Nov 2026. Files: `src/lib/sector-content/sectors/fmcg.ts`, `sectors/fmcg.extras.ts`,
`reports/fmcg.ts`. `muted: true` and `basketCoreOnly: true` kept. `npm run validate:content` passes (also with
`muted` flipped off locally to run the live-sector checks, then restored), `npx tsx scripts/check-report.ts fmcg`
reports OK, `npx tsc --noEmit -p .` is clean.

12 zones, 68 company records: 57 listed, 11 unlisted (Amul (GCMMF), Haldiram's, Mondelez India, Hindustan
Coca-Cola Beverages, Reliance Consumer Products, L'Oreal India, Reckitt India, Reliance Retail, Zepto, Udaan,
Jumbotail). Every ticker was checked against NSE's live `EQUITY_L.csv`
and the must-place list against `ind_nifty500list.csv` (both fetched 20 Nov 2026).

## Needs --add (tickers not in prisma/seed-source/extracted.json on 20 Nov 2026)

```
AWL PATANJALI LTFOODS KRBL GOKULAGRO BALRAMCHIN EIDPARRY TRIVENI BAJAJHIND DHAMPURSUG AVANTIFEED HATSUN
HERITGFOOD PARAGMILK DODLA VENKEYS BRITANNIA ZYDUSWELL BIKAJI BECTORFOOD KWIL VBL CCL GODFRYPHLP VSTIND DABUR
MARICO GODREJCP COLPAL GILLETTE EMAMILTD HONASA CUPID PGHH BAJAJCON DOMS JYOTHYLAB FLAIR HNDFDS MANORAMA EPL
UFLEX HUHTAMAKI AGI MOLDTKPAC
```

Already in the table: HINDUNILVR, ITC, NESTLEIND, TATACONSUM, NYKAA, DMART, ETERNAL, SWIGGY, GODREJAGRO, SHK, GALAXYSURF, TCPLPACK.

## Zone -> company map

| Layer | Zone | Companies |
|---|---|---|
| Farm & Staples | Edible oils, rice & staples | AWL Agri Business; Patanjali Foods; LT Foods; KRBL; Gokul Agro (medium); Tata Consumer (medium) |
| Farm & Staples | Sugar, ethanol & sweeteners | Balrampur Chini; EID Parry; Triveni; Dhampur Sugar; Bajaj Hindusthan (medium) |
| Farm & Staples | Dairy, poultry & seafood | Hatsun; Heritage; Parag; Dodla; Avanti Feeds; Venky's (medium); Godrej Agrovet (medium, chemicals key `godrejAgrovet`); Amul (unlisted) |
| Food & Drink | Biscuits, snacks & packaged foods | Britannia; Nestle India (nifty50 key `nestleind`); Zydus Wellness; Bikaji; Mrs Bectors; Kwality Wall's (medium); ITC (medium); Haldiram's, Mondelez India (unlisted) |
| Food & Drink | Soft drinks, tea & coffee | Varun Beverages; Tata Consumer (`tataconsum`); CCL Products; Hindustan Coca-Cola Beverages (unlisted); Reliance Consumer Products (unlisted, emerging entrant) |
| Food & Drink | Cigarettes & tobacco | ITC (`itc`); Godfrey Phillips; VST Industries |
| Home & Personal Care | FMCG majors (integrator) | Hindustan Unilever (`hindunilvr`); Dabur; Marico; Godrej Consumer; Colgate-Palmolive; Nestle (medium); ITC (medium) |
| Home & Personal Care | Personal care, beauty & grooming | Gillette India; Emami; Honasa; Cupid; P&G Hygiene; Bajaj Consumer; L'Oreal India (unlisted); Nykaa (enabler, low, consumerinternet key `nykaa`) |
| Home & Personal Care | Home care, hygiene & stationery | Jyothy Labs; DOMS; Flair; Reckitt India (unlisted); HUL (medium); Godrej Consumer (medium); P&G Hygiene (medium) |
| Packs & Shelf | Flavours, fragrances & contract makers | Hindustan Foods; S H Kelkar (direct supplier, chemicals key `shKelkar`); Galaxy Surfactants (direct supplier, medium, chemicals key `galaxy`); Manorama Industries (direct supplier, medium) |
| Packs & Shelf | Packs, tubes, bottles & labels | EPL; UFLEX (medium); Huhtamaki India (medium); TCPL Packaging (medium, pliacc key `tcpl`) - direct suppliers; AGI Greenpac, Mold-Tek (indirect suppliers, medium) |
| Packs & Shelf | Distributors, modern trade & quick commerce | DMart (enabler, medium); Reliance Retail (unlisted, enabler, medium); Eternal, Swiggy (enablers, low); Zepto, Udaan, Jumbotail (unlisted enablers, low) |

Counts: 68 supplier records = 57 listed (including the 12 linked existing keys) + 11 unlisted.

Linked existing keys reused exactly: `nestleind`, `tataconsum`, `itc`, `hindunilvr` (nifty50); `nykaa`, `dmart`,
`eternal`, `swiggy` (consumerinternet); `godrejAgrovet`, `shKelkar`, `galaxy` (chemicals); `tcpl` (pliacc).
Unlisted names match existing records exactly: "Zepto" (consumerinternet), "Reliance Retail" (consumerbrands).

Side links are all medium or low (DMart, Reliance Retail medium; Eternal, Swiggy, Zepto, Udaan, Jumbotail, Nykaa
low; AGI and Mold-Tek indirect medium). Packaging and ingredient makers that sell mainly to FMCG are direct
suppliers, so they are in the basket and pools; AGI (liquor/beer glass) and Mold-Tek (paint/lubricant pails) are
indirect so they stay out.

## Nifty 500 coverage

All 20 must-place symbols are placed: AWL, AVANTIFEED, BALRAMCHIN, BRITANNIA, CCL, COLPAL, CUPID, DOMS, DABUR,
EIDPARRY, EMAMILTD, GILLETTE, GODFRYPHLP, GODREJCP, HONASA, LTFOODS, MARICO, PATANJALI, VBL, ZYDUSWELL. NSE's
Nifty 500 "FMCG" list on 20 Nov 2026 has 28 names: these 20, the four existing Nifty 50 names (HINDUNILVR, ITC,
NESTLEIND, TATACONSUM, all linked) and ABDL, RADICO, UBL, UNITDSPR (consumerbrands `alcobev`, not placed here).
None of the candidates (Hatsun, Bikaji, Jyothy, PGHH, EPL etc.) is in the Nifty 500 today.

Extra names not in the contract: KWIL (Kwality Wall's, demerged from HUL, now on NSE), MANORAMA (cocoa butter
equivalents), Galaxy and TCPL links, Zepto. Considered and left out: Apex Frozen Foods (APEX; Avanti covers
shrimp), Lotus Chocolate (LOTUSCHO, Reliance-controlled, tiny), ADF Foods, Gokul Refoils (GOKUL).

## ScreenOut / financialsNote candidates

- EIDPARRY: consolidated figures are mostly Coromandel International (fertilisers); note set in `co()`. Consider
  standalone figures or a stronger financialsNote.
- AVANTIFEED: Q2 FY27 includes a one-off ₹17 Cr charge for differential US anti-dumping duty (not latest-year
  dominant; just watch).
- DOMS: Q2 FY27 exceptional loss (warehouse flood, about ₹11 Cr); not year-dominating.
- LTFOODS: US tariff refund accounting pending (management, Oct 2026); may create a one-off later in FY27.
- ZYDUSWELL: FY26/FY27 growth is partly the Comfort Click acquisition (inorganic), not one-off.
- CUPID: revenue more than doubled on tenders; check FY26 isn't tender-dominated before rule-based screens.
- BAJAJHIND: history of debt restructuring; check for exceptional gains in FY26.
- KWIL: listed recently; short price history and no five-year standalone record.

## Facts that need a recheck (secondary sources)

- Britannia Q2 FY27 volume growth "about 13%" (aggregators; Britannia's own release not seen).
- Tata Consumer tea price rise "8-10%" timing (sources differ).
- Colgate Q2 FY27 EBITDA margin fall "about 280 bps" and HUL's "about 140 bps" (aggregators).
- Emami's "400 of 520 bps" gross-margin fall (concall summary).
- Godfrey Phillips Q1 FY27 excise outgo ₹2,614 Cr vs ₹327 Cr (indmoney blog).
- NIQ Apr-Jun 2026 figures (via Daily Pioneer / Kotak Neo; NIQ's own page 404s). The "about 21% online share in the
  top eight metros" is NIQ via Daily Pioneer; a Whalesbook piece instead says "21% in top 52 metros" for quick
  commerce. I used the NIQ wording.
- Kirana count "1.2-1.3 crore" and distributor margins "a few per cent" are industry estimates, not a dated source.
- Sugar MSP ₹31/kg "unchanged since 2019": no 2026 revision found; ISMA was still asking for one in Nov 2026.
- Gillette India's results calendar: Q1 FY27 was the Apr-Jun 2026 quarter, so it may have moved to an April-March
  year; Sep 2026 quarter results not found yet.

## For the lead

- **News matcher (live/news.ts):** GROUP "godrej" (Consumer vs Agrovet vs Industries vs Properties), "tata"
  (Consumer vs Chemicals etc.), "bajaj" (Bajaj Consumer, Bajaj Hindusthan vs Bajaj Auto/Finance), "zydus" (Wellness
  vs Lifesciences), "reliance" (Reliance Consumer Products/Retail are unlisted), "dhampur" (Dhampur Sugar vs Dhampur
  Bio Organics), "heritage", "flair". ALIASES: "HUL", "Mamaearth" -> Honasa, "Fortune"/"Adani Wilmar" -> AWL,
  "Ruchi Soya" -> Patanjali Foods, "Daawat" -> LT Foods, "India Gate" -> KRBL, "Parachute"/"Saffola" -> Marico,
  "Marlboro" -> Godfrey Phillips (careful: Philip Morris), "Campa" -> unlisted, "Kwality Wall's" -> KWIL.
  WORD_TICKERS: CUPID, FLAIR, AGI, EPL, CCL, DOMS. OTHER_COMPANIES: "Patanjali Ayurved" (unlisted), "Procter &
  Gamble" (US parent), "Philip Morris", "Unilever plc", "Nestle SA", "Colgate-Palmolive Co" (US), "Coca-Cola",
  "PepsiCo", "Parle", "Mother Dairy".
- **Benchmark:** Nifty FMCG; NSE sector index history on Yahoo is usually short, so an ETF tracking Nifty FMCG
  (several AMCs run one) with `via` may be needed.
- **Cross-sector:** ITC is also paperboard/hotels (only foods and cigarettes here). EID Parry links to Coromandel
  (chemicals) through ownership; I did not link Coromandel here. AGI Greenpac sells mostly to liquor/beer, so it
  could also be linked from consumerbrands `alcobev` (indirect, low).
- **Model:** zone order is the contract's; the biggest callout lists are foods (9) and dairy_protein (8).

## Sources (opened 20 Nov 2026)

Goodreturns (HUL Q2 FY27, 28 Oct 2026); Upstox (ITC Q2 FY27, 2 Nov 2026); Angel One (edible-oil duty cut, 24 Sep
2026; quick commerce share of online sales, 27 May 2026); KNN India (Crisil on sugar mills, 9 Nov 2026); Daily
Pioneer (NIQ Apr-Jun 2026, 28 Sep 2026); Kotak Neo (NIQ June quarter); Whalesbook (FMCG Q2 FY27, 10 Oct 2026).
Via search results (not opened): Business Today and others on Amul/Mother Dairy price rises (14 May and 12 Nov
2026); ThePrint/Deccan Herald on the cigarette excise (Feb 2026); GST Council 56th meeting coverage (Sep 2025);
Marico, Dabur, GCPL, Britannia, Nestle, Tata Consumer, VBL, Colgate, Emami, Honasa, Patanjali, LT Foods, Avanti,
Balrampur, EID Parry, CCL, DOMS, Cupid, Zydus Wellness, Gillette Q1/Q2 FY27 coverage (Kotak Neo, Upstox,
investywise, multibagg, exchange4media, freepressjournal; spot-check against exchange filings).
