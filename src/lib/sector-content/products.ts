// @ts-nocheck
// The registry of every sector and policy, assembled from one module per sector
// (./sectors/<slug>.ts: zones, suppliers, camera views, build hook; geometry in ./models/<slug>.ts),
// plus the curated NEWS. Server code reads it through ./index.ts (getSector, listSectors...);
// prisma/extract-source-data.ts reads it directly. The browser explorer never imports this file:
// it loads its one sector through ./sectors/load.ts, so a page downloads only its own sector.
// Order here is the site's sector order (and the tie-break for a company's home sector).
//
// Deliberately NOT typed strictly: authored 3D-scene content ported from the original NextResearch
// artifact (materials, meshes, camera rigs), kept portable rather than retyped. No company
// figures live in the content: a supplier's `f` is co(ticker, sectorNote) (./sectors/shared.ts), a
// placeholder that src/lib/financials/store.ts fills from the company table in the database. Add
// or refresh a company's figures with scripts/refresh-financials.ts, never in these files.
// NEWS here is unused by the app (curated headlines are read from
// prisma/seed-source/extracted.json by ./insights.ts) and kept for the extract script.
import ev4w from "./sectors/ev4w";
import semiconductors from "./sectors/semiconductors";
import datacenter from "./sectors/datacenter";
import railways from "./sectors/railways";
import naval from "./sectors/naval";
import aerospace from "./sectors/aerospace";
import telecom5g from "./sectors/telecom5g";
import solarmodules from "./sectors/solarmodules";
import energy from "./sectors/energy";
import realestate from "./sectors/realestate";
import pharma from "./sectors/pharma";
import semicon2 from "./sectors/semicon2";
import rareearth from "./sectors/rareearth";
import defenceproc from "./sectors/defenceproc";
import ecms from "./sectors/ecms";
import { ASOF, SRC } from "./sectors/shared";

 // ======================================================================
 // NEWS COVERAGE
 // Curated: 2-3 dated headlines with source + link for a set of flagship listed
 // names, keyed by ticker (f.ticker). Read by the site from extracted.json (see the
 // header); the live news feed (src/lib/live/news.ts) covers every other company.
 // ======================================================================
 // When these headlines were last curated - deliberately separate from ASOF (the
 // date of the authored supplier text), as the two are refreshed independently.
 var NEWS_ASOF = "25 Sep 2026";
 var NEWS = {
 "M&M": {items:[
 {date:"Nov 2025", headline:"Q2 FY26 results: net profit rises 28% YoY to Rs 3,673 crore, revenue up 22%", source:"Zee Business", url:"https://www.zeebiz.com/companies/news-mahindra-mahindra-q2-fy26-results-net-profit-rises-28-yoy-to-rs-3673-crore-revenue-up-22-check-details-382470"},
 {date:"May 2026", headline:"M&M Q4 FY26 and full-year FY26 results", source:"Mahindra press release", url:"https://www.mahindra.com/news-room/press-release/en/m-and-m-results-q4-f26-and-fy26"}
 ]},
 MOTHERSON: {items:[
 {date:"21 Sep 2026", headline:"Motherson arm gets nod to acquire 50.1% stake in Rotary Connectors for Rs 500 crore", source:"Business Standard", url:"https://www.business-standard.com/amp/companies/news/samvardhana-motherson-s-arm-gets-nod-to-acquire-50-1-in-rotary-for-500-cr-126092100645_1.html"},
 {date:"17 Jun 2026", headline:"Board approves acquisition of majority stake in a Chinese entity", source:"Business Standard", url:"https://www.business-standard.com/amp/markets/capital-market-news/board-of-samvardhana-motherson-approves-acquisition-of-majority-stake-in-chinese-entity-126061700447_1.html"},
 {date:"Jul 2026", headline:"Set to complete acquisition of Nexans autoelectric assets", source:"Business Upturn", url:"https://businessupturn.com/business/samvardhana-motherson-international-to-complete-acquisition-of-nexans-autoelectric-assets-in-july-2026/"}
 ]},
 TMPV: {items:[
 {date:"Mar 2026", headline:"TMPV to increase prices of its passenger vehicles from 1 April 2026", source:"Tata Motors press release", url:"https://cars.tatamotors.com/article/press-release/tmpv-to-increase-prices-of-its-passenger-vehicles-from-1st-april-2026.html"},
 {date:"May 2026", headline:"TMPV consolidated Q4 FY26 results", source:"Tata Motors press release", url:"https://cars.tatamotors.com/article/press-release/tmpv-consolidated-q4fy26-results.html"},
 {date:"Jul 2026", headline:"TMPV Q1 FY27 sales", source:"Tata Motors press release", url:"https://tata.cars/article/press-release/tmpv-q1-fy27-sales.html"}
 ]},
 BHARATFORG: {items:[
 {date:"18 Sep 2026", headline:"Shares gain 4% as Rs 2,000 crore QIP opens", source:"Business Today", url:"https://www.businesstoday.in/markets/stocks/story/bharat-forge-shares-rise-as-rs-2000-crore-qip-opens-556383-2026-09-18"},
 {date:"16 Sep 2026", headline:"Stocks in focus ahead of Rs 2,000 crore QIP launch", source:"HDFC Sky", url:"https://hdfcsky.com/news/stocks-to-watch-today-wednesday-september-16-2026-aurobindo-pharma-welspun-enterprises-bharat-forge-nbcc-saatvik-green-energy"}
 ]},
 UNOMINDA: {items:[
 {date:"4 Aug 2026", headline:"Minda Onkyo stake raised to 99% after buying remaining 19%", source:"ScanX", url:"https://scanx.trade/stock-market-news/companies/uno-minda-raises-minda-onkyo-india-stake-to-99-after-buying-19/46982449"},
 {date:"2026", headline:"Completes acquisition of remaining stake in EV subsidiary", source:"Autocar Professional", url:"https://www.autocarpro.in/news/uno-minda-completes-acquisition-of-remaining-stake-in-ev-subsidiary-127258"},
 {date:"2026", headline:"Q1 net profit at Rs 3 billion; board greenlights Minda Onkyo merger", source:"Sahi News", url:"https://www.sahi.com/news/uno-minda-reports-q1-net-profit-of-3b-greenlights-minda-onkyo-merger-2829-PE1_COR"}
 ]},
 CGPOWER: {items:[
 {date:"2026", headline:"Secures largest-ever Rs 900 crore order for a US data-center project (Tallgrass)", source:"India Infoline", url:"https://www.indiainfoline.com/news/companies/cg-power-secures-largest-ever-900-crore-order-for-project-in-the-us"},
 {date:"May 2026", headline:"Reports record FY26 revenue and profit; order book surges 59%", source:"Whalesbook", url:"https://www.whalesbook.com/corporate-news/English/industrial-goodsservices/CG-Power-Reports-Record-FY26-Revenue-and-Profit-Order-Book-Surges-59percent/69fb0893d27867b982d35c82"}
 ]},
 DIXON: {items:[
 {date:"17 Jun 2026", headline:"Shares gain on reports govt likely to clear Dixon-Vivo JV deal", source:"India TV News", url:"https://www.indiatvnews.com/business/markets/dixon-technologies-shares-gain-amid-reports-that-govt-likely-to-clear-dixon-vivo-jv-deal-this-month-2026-06-17-1045139"},
 {date:"2026", headline:"Dixon-Vivo JV deal nears completion; Q3 revenue expected to reflect it", source:"Whalesbook", url:"https://www.whalesbook.com/news/English/technology/Dixon-Technologies-Vivo-JV-Deal-Nears-Completion-Q3-Revenue-Expected/6a786e5e738044f4397b722a"}
 ]},
 SRF: {items:[
 {date:"May 2026", headline:"Q4 FY26 profit up 11%; Rs 2,300 crore Odisha capex approved", source:"Multibagg", url:"https://www.multibagg.ai/market-pulse/articles/srf-q4fy26-profit-odisha-capex-cmotq7cnuinslo50jqsnksbwr"},
 {date:"2026", headline:"Board approves Rs 604 crore capex for four new plants and expansion", source:"Indian Chemical News", url:"https://www.indianchemicalnews.com/chemical/srf-board-approves-rs-604-cr-capex-for-four-new-plants-expansion-15303"}
 ]},
 BHARTIARTL: {items:[
 {date:"25 Jun 2026", headline:"Jio's proposal to repurpose 26GHz spectrum faces Airtel pushback", source:"Business Standard", url:"https://www.business-standard.com/amp/industry/news/jio-s-26ghz-spectrum-proposal-for-wifi-broadband-faces-airtel-pushback-126062501317_1.html"}
 ]},
 ABB: {items:[
 {date:"Jul 2026", headline:"Record orders, robust revenue and resilient profitability in Q2 CY2026", source:"ABB Newsroom", url:"https://new.abb.com/news/detail/137777/record-orders-robust-revenue-and-resilient-profitability-in-q2-cy2026"},
 {date:"2026", headline:"Secures major traction order for Mumbai Metro expansion", source:"ABB Newsroom", url:"https://new.abb.com/news/detail/132918/abb-secures-major-traction-order-for-mumbai-metro-expansion"},
 {date:"Apr 2026", headline:"Posts solid start to CY2026 with strong order momentum in Q1", source:"ABB Newsroom", url:"https://new.abb.com/news/detail/135616/abb-india-posts-solid-start-to-cy2026-with-strong-order-momentum-in-first-jan-mar-quarter"}
 ]},
 CUMMINSIND: {items:[
 {date:"May 2026", headline:"Results for the quarter and year ended 31 March 2026", source:"Cummins press release", url:"https://www.cummins.com/en-na/news/releases/2026/05/27/cummins-india-limited-results-quarter-and-year-ended-march-31-2026"},
 {date:"2026", headline:"Posts Q1 FY26 PAT higher by 40% at Rs 589 crore", source:"Indian Chemical News", url:"https://www.indianchemicalnews.com/general/cummins-india-posts-q1-fy26-pat-higher-by-40-at-rs-589-cr-27052"}
 ]},
 BHEL: {items:[
 {date:"2026", headline:"Wins Rs 21,000 crore power project contract", source:"Sahi News", url:"https://www.sahi.com/news/bhel-wins-21-000-crore-power-project-contract-strengthening-infrastructure-order-book-936-PE1_CORP"},
 {date:"2026", headline:"Registers strong revenue growth in FY 2025-26", source:"BHEL press release", url:"https://www.bhel.com/bhel-registers-strong-revenue-growth-fy-2025-26"},
 {date:"16 Jul 2026", headline:"Board to review Q1 results, following Rs 1.6 lakh crore order book", source:"Sahi News", url:"https://www.sahi.com/news/bhel-board-to-review-q1-results-on-july-16-following-1-6-lakh-cr-order-book-936-PE1_CORP"}
 ]},
 SIEMENS: {items:[
 {date:"2026", headline:"Bags Rs 263 crore order from RVNL for rail infrastructure projects", source:"Sahi News", url:"https://www.sahi.com/news/siemens-bags-263-crore-order-from-rvnl-for-rail-infrastructure-projects-263-PE1_CORP"},
 {date:"2026", headline:"Bags Rs 1,825 crore internal order for critical rail components", source:"Whalesbook", url:"https://www.whalesbook.com/corporate-news/English/industrial-goodsservices/Siemens-Ltd-Bags-indian-rupee1825-Cr-Internal-Order-for-Critical-Rail-Components/69f3552508235f0c2a21721e"}
 ]},
 IRFC: {items:[
 {date:"9 Mar 2026", headline:"Board declares 2nd interim FY26 dividend of Rs 1.05/share, ~Rs 1,372 crore total", source:"Secretary, DIPAM", url:"https://x.com/SecyDIPAM/status/2031015805174079991"},
 {date:"Mar 2026", headline:"Declares interim dividend and approves Rs 70,000 crore market borrowing plan", source:"Angel One", url:"https://www.angelone.in/news/stocks/irfc-share-price-in-focus-declares-1-05-interim-dividend-and-approves-70-000-crore-market-borrowing-plan"}
 ]},
 RVNL: {items:[
 {date:"7 Sep 2026", headline:"Shares gain 2% after Rs 903 crore SJVN Thermal order win", source:"Business Today", url:"https://www.businesstoday.in/markets/stocks/story/rvnl-shares-gain-2-after-rs-903-crore-sjvn-thermal-order-win-key-details-553547-2026-09-07"},
 {date:"Jun 2026", headline:"Bags Rs 968 crore bridge order", source:"HDFC Sky", url:"https://hdfcsky.com/news/market-preview-june-18-2026-rvnl-bags-rs-968-crore-bridge-order-lupin-launches-us-generic-hfcl-wins-bharatnet-deal-fila-trims-doms-stake-and-bosch-home-comfort-ofs-set-to-keep-markets-busy-on-t"},
 {date:"2026", headline:"Wins Rs 1,002 crore in orders, boosting pipeline", source:"Multibagg", url:"https://www.multibagg.ai/market-pulse/articles/rvnl-wins-1000-crore-orders-cmra79ga1lf1loi0ivy4nueiz"}
 ]},
 LT: {items:[
 {date:"2026", headline:"Wins order from Department of Atomic Energy, Government of India", source:"Capital Market", url:"https://capitalmarket.com/markets/news/results-announcements/larsen-and-toubro-wins-order-from-department-of-atomic-energy-govt-of-india/1679252"},
 {date:"May 2026", headline:"Reports record order inflows of Rs 4,35,590 crore in FY26; recurring PAT up 18% to Rs 17,238 crore", source:"ScanX", url:"https://scanx.trade/stock-market-news/companies/larsen-toubro-reports-record-order-inflows-of-4-35-590-crore-in-fy26-recurring-pat-rises-18-to-17-238-crore/39545101"},
 {date:"2026", headline:"Secures ultra-mega order for a strategic offshore development project in the Middle East", source:"Reuters via TradingView", url:"https://www.tradingview.com/news/reuters.com,2026:newsml_FWN44B2QU:0-larsen-and-toubro-secures-ultra-mega-order-for-strategic-offshore-development-project-in-the-middle-east/"}
 ]},
 BEL: {items:[
 {date:"18 Sep 2026", headline:"Wins additional orders worth Rs 648 crore", source:"Business Today", url:"https://www.businesstoday.in/markets/stocks/story/bharat-electronics-reports-additional-orders-worth-rs-648-crore-check-stock-reaction-556370-2026-09-18"},
 {date:"2026", headline:"Wins Rs 1,081 crore new order, boosting defense revenue visibility", source:"Sahi News", url:"https://www.sahi.com/news/bharat-electronics-wins-1-081-crore-new-order-boosting-defense-revenue-visibility-928-PE1_CORP"},
 {date:"2026", headline:"Wins Rs 6,795 crore in new defence orders", source:"Whalesbook", url:"https://www.whalesbook.com/corporate-news/English/industrial-goodsservices/Bharat-Electronics-Wins-indian-rupee6795-Crore-in-New-Defence-Orders/69cbf5673f30946a723a5094"}
 ]},
 MAZDOCK: {items:[
 {date:"8 Sep 2026", headline:"Secures Rs 118 crore order from MSETCL", source:"Power Line Magazine", url:"https://powerline.net.in/2026/09/08/mazagon-dock-shipbuilders-secures-rs-1-18-billion-order-from-msetcl/"},
 {date:"Apr 2026", headline:"Majority control on Colombo Dockyard - a win for maritime India", source:"The Week", url:"https://www.theweek.in/news/maritime/2026/04/13/shipbuilding-deal-mdl-cdplc-colombo.html"},
 {date:"2026", headline:"Reports Rs 18,218 crore order book; net profit up", source:"Whalesbook", url:"https://www.whalesbook.com/corporate-news/English/aerospace-defense/Mazagon-Dock-Reports-Rs-18218-Crore-Order-Book-Net-Profit-Up/6ab3929af2017017ae7110aa"}
 ]},
 SOLARINDS: {items:[
 {date:"2026", headline:"Secures Rs 1,076 crore contract, boosting defense and mining order book", source:"Sahi News", url:"https://www.sahi.com/news/solar-industries-india-secures-1076-crore-contract-boosting-defense-and-mining-order-book-3485-PE1_COR"},
 {date:"2026", headline:"Rs 21,300 crore order book boost", source:"Defence News", url:"https://defence.newsd.in/industry/rs-21300-crore-order-book-boost-for-solar-industries-india"}
 ]},
 HAL: {items:[
 {date:"May 2026", headline:"Posts Rs 32,250 crore FY26 revenue; order book rises to Rs 2.54 lakh crore", source:"PSU Watch", url:"https://psuwatch.com/defencewatch/hal-posts-rs-32250-crore-revenue-in-fy26-order-book-rises-to-rs-254-lakh-crore"},
 {date:"2026", headline:"Delivers triple indigenous platforms as order book hits Rs 2.5 lakh crore", source:"Whalesbook", url:"https://www.whalesbook.com/news/English/aerospace-defense/HAL-Delivers-Triple-Indigenous-Platforms-as-Order-Book-Hits-indian-rupee25-Lakh-Crore/6aa825a175fe79b492e6b70b"}
 ]},
 PTCIL: {items:[
 {date:"Jul 2026", headline:"Bags order from Gun Factory Kanpur for artillery components", source:"Business Standard", url:"https://www.business-standard.com/companies/news/ptc-industries-defence-order-ptc-industries-wins-gun-factory-kanpur-order-for-artillery-components-126072400897_1.html"},
 {date:"2026", headline:"Secures order from BrahMos Aerospace for a strategic metallic airframe system", source:"Reuters via TradingView", url:"https://www.tradingview.com/news/reuters.com,2026:newsml_FWN43I21E:0-ptc-industries-ltd-secures-order-from-brahmos-aerospace-for-strategic-major-metallic-airframe-system-and-integration/"}
 ]},
 MTARTECH: {items:[
 {date:"2026", headline:"Hits record high after securing Rs 2,278 crore order from a global entity; shares up ~200% in 2026", source:"Upstox", url:"https://upstox.com/news/market-news/stocks/mtar-technologies-hits-record-high-after-securing-2-278-crore-from-global-entity-shares-up-200-in-2026/article-193676/"},
 {date:"2026", headline:"Share price hits record high after Rs 467 crore order win", source:"Meyka", url:"https://meyka.com/blog/mtar-technologies-share-price-hits-record-high-after-%E2%82%B9467-crore-order-win-in-2026/"}
 ]},
 IDEA: {items:[
 {date:"25 Sep 2026", headline:"Shares rise after introducing free international roaming", source:"Business Today", url:"https://www.businesstoday.in/markets/stocks/story/vodafone-idea-shares-rise-after-introducing-free-international-roaming-557832-2026-09-25"},
 {date:"10 Sep 2026", headline:"SBI-led group said to lend $3.5 billion to Vodafone Idea", source:"Bloomberg", url:"https://www.bloomberg.com/news/articles/2026-09-10/sbi-led-group-said-to-provide-3-5-billion-debt-to-vodafone-idea"}
 ]},
 INDUSTOWER: {items:[
 {date:"May 2026", headline:"Q4 FY26 results: revenue Rs 8,101 crore, up 4.8%; Rs 14 dividend announced", source:"ScanX", url:"https://scanx.trade/stock-market-news/companies/indus-towers-reports-q4-net-profit-growth-to-18-billion-board-recommends-14-final-dividend/39146688"},
 {date:"2026", headline:"AGM approves FY26 financials, dividend and director reappointments", source:"ScanX", url:"https://scanx.trade/stock-market-news/companies/indus-towers-fy26-results-revenue-up-8-pat-down-28/48708607"}
 ]},
 TATACOMM: {items:[
 {date:"2026", headline:"Revenue jumps, but margin pressure trims analyst targets", source:"Whalesbook", url:"https://www.whalesbook.com/news/English/telecom/Tata-Communications-Revenue-Jumps-But-Margin-Pressure-Trims-Analyst-Targets/69e9ba53bca97ee106a4bbe5"},
 {date:"31 Oct 2026", headline:"Company Secretary Zubin Patel to resign effective 31 October 2026", source:"ScanX", url:"https://scanx.trade/stock-market-news/companies/tata-communications-cs-zubin-patel-resigns-effective-oct-31-2026/51887887"}
 ]}
 };


 // ======================================================================
 // PRODUCT REGISTRY
 // Each product supplies: metadata, zones (clickable component anchors),
 // suppliers (financial data), camera views, an optional deep-dive, and a
 // build(ctx) function that constructs its own 3D geometry into the
 // generic layer groups the engine hands it. Everything else (layer
 // crossfade, callouts, mobile labels, financial panel, explode/section,
 // raycasting) is shared engine code (src/components/sector-explorer/engine.ts)
 // and works for any product that follows this contract. A new sector also needs
 // its loader line in ./sectors/load.ts (validate:content checks the two match).
 // ======================================================================
 var PRODUCTS = { ev4w, semiconductors, datacenter, railways, naval, aerospace, telecom5g, solarmodules, energy, realestate, pharma, semicon2, rareearth, defenceproc, ecms };

 PRODUCTS._comingSoon = [
 {icon:"PH", name:"Smartphone", tagline:"Display, SoC, camera module & battery supply chain"},
 {icon:"LT", name:"Laptop", tagline:"Panel, battery, chipset & chassis supply chain"},
 {icon:"BA", name:"Battery storage (PLI-ACC)", tagline:"Cell gigafactories benefiting from the Advanced Chemistry Cell PLI scheme", category:"policy"},
 {icon:"H2", name:"Green Hydrogen Mission", tagline:"Electrolyser makers and green ammonia/steel offtakers benefiting from the National Green Hydrogen Mission", category:"policy"},
 {icon:"CM", name:"Critical Minerals Mission", tagline:"Lithium, cobalt and rare-earth processors benefiting from the National Critical Mineral Mission", category:"policy"}
 ];

export { PRODUCTS, NEWS, ASOF, SRC, NEWS_ASOF };
