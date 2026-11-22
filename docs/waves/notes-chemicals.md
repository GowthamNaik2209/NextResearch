# Notes for the lead: Chemicals & Agrochem (`chemicals`)

Content date 19 Nov 2026. Files: `src/lib/sector-content/sectors/chemicals.ts`, `sectors/chemicals.extras.ts`,
`reports/chemicals.ts`. `muted` removed; `npm run validate:content` and `npx tsx scripts/check-report.ts chemicals`
pass. `financials.test` fails until the tickers below are added.

13 zones, 81 companies: 77 listed, 4 unlisted (IFFCO, Mahyco, Nirma, Haldia Petrochemicals).
Every ticker was checked against NSE's live equity list (`EQUITY_L.csv`, fetched 19 Nov 2026).

## Needs --add (55 tickers not in the company table on 19 Nov 2026)

```
AARTIIND AEGISLOG AEGISVOPAK AETHER ALKYLAMINE ANURAS ARIES ATUL BALAMINES BAYERCROP BHARATRAS BODALCHEM
CHAMBLFERT CHEMPLASTS CLEAN DCMSHRIRAM DEEPAKFERT DEEPAKNTR DHANUKA EPIGRAL FACT FINEORG GALAXYSURF GESHIP
GHCL GOCLCORP GODREJAGRO GODREJIND GSFC GUJALKALI IGPL INSECTICID JUBLINGREA KSCL LXCHEM NACLIND NFL NOCIL
PETRONET PIDILITIND PIIND PRIVISCL RALLIS RCF ROSSARI SHARDACROP SHK SPLPETRO STALLION SUDARSCHEM SUMICHEM
TATACHEM TATVA TIRUMALCHM UPL
```

Possible screenOut / financialsNote candidates: TATACHEM (consolidated loss in Q2 FY27 from overseas soda ash),
GODREJIND and DCMSHRIRAM (group figures, chemicals one segment), GOCLCORP (land/property gains in results),
AEGISVOPAK and STALLION (listed 2025, short price history).

## Company-to-zone map

| Layer | Zone | Companies |
|---|---|---|
| Farm Inputs | Crop protection brands | UPL; Sumitomo Chemical India; Bayer CropScience; PI Industries (medium); Dhanuka; Rallis; Insecticides India; Sharda Cropchem; Coromandel (medium); NACL Industries (medium); Godrej Agrovet (low); Bharat Rasayan (supplier, medium) |
| Farm Inputs | Fertilisers | Chambal; Coromandel; Paradeep; IFFCO (unlisted); FACT; RCF; NFL; GSFC; GNFC (medium); Deepak Fertilisers (medium) |
| Farm Inputs | Seeds & crop nutrition | Kaveri Seed; Mahyco (unlisted); UPL/Advanta (medium); Bayer CropScience (medium); Rallis (medium); Aries Agro (medium); Coromandel (low) |
| Specialty | Custom synthesis | PI Industries; Aether; Anupam Rasayan; SRF (medium); Navin Fluorine (medium); Tatva Chintan (medium); Hikal (medium); Jubilant Ingrevia (low) |
| Specialty | Fluorochemicals & refrigerants | SRF; Navin Fluorine; Gujarat Fluorochemicals; Stallion (medium) |
| Specialty | Intermediates (integrator) | Aarti; Deepak Nitrite; Atul; Clean Science; Jubilant Ingrevia; Vinati; Alkyl Amines; Balaji Amines; Laxmi Organic; Neogen (medium) |
| Specialty | Adhesives, aroma & personal care | Pidilite; Privi; Galaxy; Fine Organic; S H Kelkar (medium); Rossari (medium); Godrej Industries (medium) |
| Specialty | Carbon black, rubber & colour | PCBL; Himadri; NOCIL; Sudarshan; Bodal (medium) |
| Commodity | Soda ash & chlor-alkali | Tata Chemicals; Nirma (unlisted); GHCL; DCM Shriram; Gujarat Alkalies; Epigral; Grasim (medium); Archean (medium) |
| Commodity | Petrochemicals, polymers & solvents | Reliance; Haldia Petrochemicals (unlisted); Chemplast Sanmar; Supreme Petrochem; IG Petrochemicals; Thirumalai; GAIL (medium) |
| Commodity | Industrial explosives & nitrates | Solar Industries; Deepak Fertilisers; GOCL (medium); Premier Explosives (medium); GNFC (medium) |
| Feedstock | Refiners & gas | Reliance; IOC; BPCL (medium); HPCL (medium); ONGC (medium); GAIL; Petronet LNG (all direct suppliers) |
| Feedstock | Terminals & logistics | Aegis Logistics; Aegis Vopak; Adani Ports (enabler, low); Great Eastern Shipping (enabler, low) |

Shared keys reused exactly: coromandel, paradeep, gnfc, iffco (same name), navinfluor, srf, fluorochem, vinati, pcbl,
himadri, grasim, reliance, solar (defenceproc key), ioc, bpcl, gail, hpcl, ongc, adaniports (nifty50 key), hikal,
archean, neogen, premier (defenceproc key; naval uses `premierexplosives`).

## Nifty 500 coverage

All 17 must-place symbols are placed except SWANCORP. Nifty 500 "Chemicals" not placed: SWANCORP, LINDEINDIA.

| Symbol | Why left out |
|---|---|
| SWANCORP | Swan Corp (ex-Swan Energy, renamed Jul 2025) is shipbuilding, defence, textiles, real estate and a stalled Jafrabad LNG terminal; its only chemical link is a Jan 2026 order for six chemical tankers at Swan Defence and Heavy Industries. The NSE "Chemicals" label is legacy. Better placed in Naval Shipbuilding (commercial/defence yard) or a later oil & gas module. |
| LINDEINDIA | Industrial gases; the contract keeps gases out of this module (semiconductors/semicon2 `gases`, hospitals). Mentioned in text only by the contract; not linked. |

Optional names placed: GODREJIND (oleochemicals), AEGISLOG, AEGISVOPAK. Not placed: MRPL (refiner, Nifty 500 Oil Gas,
left for the oil & gas round); ACUTAAS, IOLCP, AARTIPHARM (pharma-only, stay in Pharma/ECMS/PLI-ACC).

## Calls made

- Hikal linked with its pharma key `hikal` for crop-protection CDMO only (it is not pharma-only: crop protection is a large segment).
- Archean (`archean`, semicon2) placed in chlor-alkali as a marine-chemicals (bromine, salt) maker, medium.
- Solar Industries linked by defenceproc key `solar` for mining explosives; defence covered there.
- "SUPPETRO" in the contract does not exist on NSE; Supreme Petrochem is SPLPETRO (placed).
- Tanfac (fluorine, Anupam subsidiary) is BSE-only; mentioned in Anupam's role, not linked.

## For the lead

- **News matcher (live/news.ts):** GROUP "aarti" (Aarti Industries vs Aarti Pharmalabs vs Aarti Drugs/Surfactants),
  "deepak" (Deepak Nitrite vs Deepak Fertilisers), "godrej" (Godrej Industries vs Godrej Agrovet/Consumer/Properties),
  "jubilant" (Ingrevia vs Pharmova vs FoodWorks), "tata" (Tata Chemicals vs Rallis), "gujarat" (GNFC, GSFC, Gujarat
  Alkalies, Gujarat Fluorochemicals), "aegis" (Logistics vs Vopak), "sumitomo" (Indian arm vs Japanese parent),
  "bayer" (CropScience vs Bayer AG). ALIASES: "PI Inds", "Navin", "GFL" (also GFL Ltd, a different listed company),
  "Clean Science", "Fevicol" -> Pidilite, "Advanta" -> UPL, "IDL Explosives" -> GOCL, "Deepak Phenolics" -> Deepak
  Nitrite. WORD_TICKERS: CLEAN, ATUL, FACT, ARIES. OTHER_COMPANIES: "Sumitomo Chemical" (Japan), "Bayer AG", "Linde plc",
  "Vopak" (Royal Vopak), "Aarti Drugs", "Aarti Surfactants".
- **Benchmark:** Nifty Chemicals has no liquid ETF that I know of; check a chemicals ETF/index fund with 1+ year of
  Yahoo history, otherwise NO_BENCHMARK with that reason.
- **Model:** rails follow zone order as in the contract; 12 companies in crop protection and 10 in fertilisers and
  intermediates make long callout lists (fine per Wave 1 ruling).
- **Overlap:** Swan Defence's chemical-tanker order could be noted in the Naval module.

## Sources used (opened 19 Nov 2026)

News On AIR (rabi NBS, 11 Nov 2026); Outlook Business (fertiliser supply, 5 May 2026); DSIJ (monsoon, 3 Oct 2026);
India Briefing (India-US interim deal, Feb 2026); Wikipedia "2026 Iran war fuel crisis"; Lok Sabha UQ 2229 (1 Aug 2025,
subsidy disbursed FY22-FY25, via search). Company Q2 FY27 figures in the deck's companyNews are from results coverage
(Indian Chemical News, investywise, multibagg, agribusinessglobal) and should be spot-checked against exchange filings.
