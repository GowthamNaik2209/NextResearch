// @ts-nocheck
// Static 3D "anatomy" content, ported verbatim from the original NextResearch
// artifact (only the data/geometry section — the DOM/three.js "ENGINE" that used
// to follow this in the artifact now lives in SectorExplorer.tsx instead, driven
// by React). Deliberately NOT typed strictly: this is authored 3D-scene content
// (materials, meshes, camera rigs), not application data, and it's cheap to keep
// byte-for-byte portable from future artifact iterations rather than retyped.
//
// PRODUCTS[key].suppliers[...].f (revenue/KPI/news figures baked in at authoring
// time) is a fallback ONLY — company financials/KPIs/news are otherwise served
// live from the database (src/lib/companies.ts) so there's a single source of
// truth for anything that should actually refresh. NEWS here is unused by the
// app (superseded by the NewsLink table) and kept only because `fin()` and other
// definitions below reference module-level state that's simplest left intact.
var ASOF = "25 Sep 2026";
 var SRC = "Screener.in (consolidated financials)";
 function fin(rev, np, mcap, price, ticker, note, cagr, range, tl, kpi){ return {rev:rev, np:np, mcap:mcap, price:price, ticker:ticker, note:note||null, cagr:cagr||null, range:range||null, tl:tl||null, kpi:kpi||null}; }
 // kpi = [Stock P/E, Book Value (Rs), Dividend Yield %, ROCE %, ROE %, Face Value (Rs)] - Screener.in top-summary fields, null entries render as "n/a"

 // ======================================================================
 // NEWS COVERAGE
 // Curated: 2-3 dated headlines with source + link, hand-researched for the
 // ~25 flagship listed names (top names by market cap across the 7 products).
 // Every OTHER listed supplier still gets the live-link buttons below (no
 // curated headlines needed) - see the "Recent news coverage" block in
 // renderSupplierDetail(). Keyed by ticker (f.ticker).
 // ======================================================================
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
 // raycasting) is shared engine code below and works for any product that
 // follows this contract.
 // ======================================================================
 var PRODUCTS = {};

 PRODUCTS.ev4w = {
 id: "ev4w", icon: "EV", name: "Electric 4-Wheeler",
 tagline: "India EV passenger car supply chain",
 headerTitle: "EV ANATOMY",
 headerSub: "Explore the technology stack inside an electric vehicle - India supply-chain edition",
 layerNames: ["Shell","Exoskeleton","Technology","Powertrain"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "exterior",
 views: [
 {id:"exterior", label:"Exterior", pos:[4.6,2.4,5.2], target:[0,0.55,0]},
 {id:"side", label:"Side", pos:[0.1,1.1,6.2], target:[0,0.6,0]},
 {id:"front", label:"Front", pos:[6.0,1.3,0.05], target:[0.5,0.55,0]},
 {id:"rear", label:"Rear", pos:[-6.0,1.3,0.05], target:[-0.5,0.55,0]},
 {id:"top", label:"Top", pos:[0.05,7.5,0.05], target:[0,0.3,0]},
 {id:"under", label:"Under", pos:[0.05,-1.4,3.6], target:[0,0.1,0]},
 {id:"interior", label:"Interior", pos:[0.55,0.95,0.35], target:[1.3,0.85,0]}
 ],
 zones: [
 {id:"battery", color:"#2E86AB", label:"Battery pack & cells", pos:[-0.1,0.18,0.55], side:"left", desc:"The cell chemistry and pack that store the car's energy - the flat 'skateboard' under the floor.", suppliers:["exide","amararaja","log9"], deepDive:true},
 {id:"motor", color:"#D96C2B", label:"Electric motor & e-axle", pos:[-1.45,0.34,0.5], side:"left", desc:"Converts stored electricity into torque at the wheels; increasingly an integrated e-axle unit.", suppliers:["bharatforge","sonablw"]},
 {id:"power_elec", color:"#7A5CC7", label:"Power electronics", pos:[-1.05,0.62,0.5], side:"left", desc:"Inverter, onboard charger and DC-DC converter that manage current between battery and motor.", suppliers:["unominda","vecmocon","mindaCorp"]},
 {id:"bms", color:"#1E9E76", label:"BMS & embedded software", pos:[0.3,0.34,0.55], side:"right", desc:"Battery management logic and the embedded software stitching powertrain, safety and cockpit systems together.", suppliers:["kpit","tataelxsi"]},
 {id:"harness", color:"#C6403D", label:"Wiring harness & connectors", pos:[0.55,0.7,0.35], side:"right", desc:"The nervous system of the car - low- and high-voltage cabling connecting every module, routed as real 3D looms.", suppliers:["motherson","rico","msumi"]},
 {id:"thermal", color:"#4C6EF5", label:"Thermal management", pos:[1.75,0.55,0.5], side:"right", desc:"Keeps the battery and cabin in their working temperature range - critical for range and battery life.", suppliers:["subros"]},
 {id:"chassis", color:"#64748B", label:"Forgings, castings & precision parts", pos:[1.45,0.2,0.75], side:"top", desc:"Machined and forged structural and driveline components - hubs, shafts, housings, subframes.", suppliers:["sundram","craftsman","ramkrishna","tataautocomp","endurance"]},
 {id:"cluster", color:"#B5179E", label:"Instrument cluster & interior electronics", pos:[1.05,0.95,0.35], side:"top", desc:"Digital driver display and interior sensing electronics.", suppliers:["pricol"]},
 {id:"charging", color:"#C99A2E", label:"Charging system", pos:[-1.95,0.55,0.9], side:"bottom", desc:"The car's charge port and the AC/DC chargers it plugs into.", suppliers:["exicom","servotech","tataPowerEV"]},
 {id:"magnets", color:"#9C6B30", label:"Rare-earth magnets & materials", pos:[-1.45,0.34,-0.5], side:"bottom", desc:"Permanent magnets inside the traction motor - a strategic chokepoint given import dependence on China.", suppliers:["midwest"]},
 {id:"oem", color:"#3D5A80", label:"Vehicle OEMs & Assembly", pos:[0.05,1.35,0], side:"top", desc:"The vehicle manufacturers that design, assemble and badge the finished EV - from mass-market passenger cars to electric buses.", suppliers:["tmpv","mm","jbmAuto","olectra"]}
 ],
 suppliers: {
 motherson: {name:"Samvardhana Motherson International", listed:true, role:"Wiring harnesses, modules, mirrors, cockpits", f:fin([63536,78701,98692,113663,126104],[1182,1670,3020,4146,4086],"Rs 1,74,575 Cr","Rs 166","MOTHERSON",null,[57,37,15],[101,173],[878,"samvardhana-motherson-international-ltd"],[38.3,38.8,0.36,13.4,11.2,1.00])},
 unominda: {name:"UNO Minda", listed:true, role:"EV powertrain electronics, controllers, switches", f:fin([8313,11236,14031,16775,19658],[413,700,925,1021,1284],"Rs 70,336 Cr","Rs 1,218","UNOMINDA",null,[-4,27,27],[994,1382],[864,"uno-minda-ltd"],[57.5,118,0.22,19.6,19.3,2.00])},
 sonablw: {name:"Sona BLW Precision Forgings", listed:true, role:"BEV traction motors, differential gears, e-axle systems", f:fin([1918,2448,2892,3226,4124],[354,388,484,580,646],"Rs 51,459 Cr","Rs 824","SONACOMS",null,[103,12,8],[402,844],[547977,"sona-blw-precision-forgings-ltd"],[70.8,96.2,0.41,14.2,11.3,10.0])},
 bharatforge: {name:"Bharat Forge", listed:true, role:"e-Axles and EV powertrain via Kalyani Powertrain", f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 97,925 Cr","Rs 2,005","BHARATFORG",null,[70,23,21],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 endurance: {name:"Endurance Technologies", listed:true, role:"Precision castings, suspension, EV-ready component lines", f:fin([5697,6768,7871,8846,10640],[382,409,588,679,734],"Rs 37,236 Cr","Rs 2,646","ENDURANCE",null,[-3,18,11],[2143,3075],[4797,"endurance-technologies-ltd"],[37.8,486,0.43,17.8,14.9,10.0])},
 exide: {name:"Exide Industries", listed:true, role:"Li-ion cells and packs via Exide Energy Solutions", f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,023 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain",[8,18,19],[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 amararaja: {name:"Amara Raja Energy & Mobility", listed:true, role:"Li-ion cells via Amara Raja Advanced Cell Technologies", f:fin([8696,10390,11260,null,null],[511,731,906,null,null],"Rs 18,568 Cr","Rs 1,014","ARE&M","FY25-FY26 not yet reflected in the source at fetch time",[-19,7,1],[670,1023],[68,"amara-raja-energy-mobility-ltd"],[18.5,446,1.34,13.4,8.26,1.00])},
 kpit: {name:"KPIT Technologies", listed:true, role:"Embedded software for EV powertrain and BMS integration", f:fin([2432,3365,4872,5842,6455],[276,387,599,840,637],"Rs 14,239 Cr","Rs 519","KPITTECH",null,[-57,-23,8],[508,1285],[141324,"kpit-technologies-ltd"],[22.8,129,1.44,26.3,20.9,10.0])},
 tataelxsi: {name:"Tata Elxsi", listed:true, role:"EV software design, ADAS and cockpit electronics", f:fin([2471,3145,3552,3729,3757],[550,755,792,785,628],"Rs 19,856 Cr","Rs 3,187","TATAELXSI",null,[-40,-24,-11],[3144,5950],[1358,"tata-elxsi-ltd"],[195,45.5,2.35,60.0,39.3,10.0])},
 rico: {name:"Rico Auto Industries", listed:false, role:"Precision machined components and wiring assemblies", notes:["Privately held, Gurugram-based; long-time Maruti Suzuki and Honda supplier","Diversifying machining lines toward EV transmission and motor housings","No public market data - not listed"]},
 subros: {name:"Subros", listed:true, role:"HVAC and battery thermal management systems", f:fin([2239,2806,3071,3368,3756],[33,48,98,150,166],"Rs 4,703 Cr","Rs 721","SUBROS",null,[-36,22,16],[621,1214],[1302,"subros-ltd"],[27.4,191,0.42,19.2,14.5,2.00])},
 pricol: {name:"Pricol", listed:true, role:"Instrument clusters and sensors", f:fin([1523,1928,2255,2529,3096],[43,113,131,142,207],"Rs 9,256 Cr","Rs 759","PRICOLLTD",null,[43,33,53],[500,823],[1072,"pricol-ltd"],[34.6,103,0.26,24.5,21.8,1.00])},
 sundram: {name:"Sundram Fasteners", listed:true, role:"Precision fasteners and machined EV driveline components", f:fin([4902,5663,5666,5955,6289],[462,500,526,542,593],"Rs 24,786 Cr","Rs 1,179","SUNDRMFAST",null,[17,-2,5],[730,1347],[1313,"sundram-fasteners-ltd"],[39.9,203,0.68,17.6,14.9,1.00])},
 craftsman: {name:"Craftsman Automation", listed:true, role:"Aluminium die-casting and powertrain machining for EVs", f:fin([2217,3183,4452,5690,8069],[163,251,337,201,384],"Rs 28,092 Cr","Rs 10,735","CRAFTSMAN",null,[59,32,38],[6252,11999],[445359,"craftsman-automation-ltd"],[59.9,1368,0.10,13.9,12.5,5.00])},
 ramkrishna: {name:"Ramkrishna Forgings", listed:true, role:"Forged components, expanding into EV and CV driveline parts", f:fin([2320,3193,3705,4034,4238],[198,248,291,415,72],"Rs 12,814 Cr","Rs 704","RKFORGE","FY26 profit fell sharply on one-off items - verify before use",[31,3,28],[460,773],[1140,"ramkrishna-forgings-ltd"],[114,181,0.14,5.60,2.51,2.00])},
 tataautocomp: {name:"Tata AutoComp Systems", listed:false, role:"High-voltage EV components: battery packs, e-axles, motors", notes:["Privately held Tata group company (Tata Sons subsidiary)","Showcased EV and commercial-vehicle component lines at IAA Transportation 2026","No public market data - not listed"]},
 exicom: {name:"Exicom Tele-Systems", listed:true, role:"AC/DC EV chargers, 3.3kW-600kW", f:fin([null,null,null,null,895],[null,null,null,null,14],"Rs 2,239 Cr","Rs 161","EXICOM","Listed 2024; only FY26 annual figures available so far (TTM revenue ~Rs 981 Cr); currently loss-making so P/E is n/a",[8,null,null],[75.6,189],[2077200,"exicom-tele-systems-ltd"],[null,46.8,0.00,-14.7,-40.8,10.0])},
 servotech: {name:"Servotech Power Systems", listed:true, role:"AC/DC EV chargers and lithium battery packs", f:fin([null,null,null,null,637],[null,null,null,null,36],"Rs 1,598 Cr","Rs 70.8","SERVOTECH","Small-cap, thin trading history - only latest annual figures available",[-43,-3,97],[57.5,142],[87778,"servotech-power-systems-ltd"],[42.7,12.8,0.03,12.8,12.8,1.00])},
 vecmocon: {name:"Vecmocon Technologies", listed:false, role:"Battery management systems and motor controllers", notes:["Privately held, Delhi-NCR based; backed by Aavishkaar Capital and other VCs","Core base is 2- and 3-wheeler EVs, expanding controller work toward light EVs","No public market data - not listed"]},
 log9: {name:"Log9 Materials", listed:false, role:"Li-ion cell chemistry (fast-charge cells) and pack engineering", notes:["Privately held, Bengaluru-based; Amara Raja holds a strategic stake","Known for RapidX fast-charging cell chemistry, mainly 2W/3W and energy storage today","No public market data - not listed"]},
 midwest: {name:"Midwest Advanced Materials", listed:false, role:"Rare-earth permanent magnets for traction motors", notes:["Privately held, Hyderabad-based; announced a ~Rs 1,000 Cr plan for domestic magnet capacity (2025)","Targets India's near-total reliance on Chinese rare-earth magnets for EV motors","No public market data - not listed"]},
 tmpv: {name:"Tata Motors Passenger Vehicles", listed:true, role:"PV/EV OEM - Nexon EV, Punch EV, Tiago EV, Curvv EV (plus JLR under the same listed entity)", f:fin([278454,345967,434016,366094,335582],[-11309,2690,31807,28149,82645],"Rs 1,06,973 Cr","Rs 290","TMPV","Post-Oct2025 demerger from Tata Motors Ltd; retains JLR+India PV/EV business; FY26 PAT includes a large exceptional/demerger-related gain, not run-rate",null,[288,447],[1362,"tata-motors-passenger-vehicles-ltd"],[107,304,1.03,2.73,75.7,2.00])},
 mm: {name:"Mahindra & Mahindra", listed:true, role:"SUV/PV OEM with dedicated EV lineup (BE 6, XEV 9e) plus EV tractors and 3-wheelers", f:fin([90171,121362,139078,159211,198639],[7253,11374,12270,14073,18622],"Rs 4,21,190 Cr","Rs 3,404","M&M",null,null,[2896,3840],[807,"mahindra-mahindra-ltd"],[22.0,749,0.97,15.1,20.3,5.00])},
 jbmAuto: {name:"JBM Auto", listed:true, role:"Electric buses and EV commercial vehicles - ~30-35% share of India's e-bus segment", f:fin([3193,3857,5009,5472,6088],[156,125,194,215,238],"Rs 13,873 Cr","Rs 587","JBMA",null,null,[477,738],[667,"jbm-auto-ltd"],[60.3,65.0,0.14,15.1,15.7,1.00])},
 olectra: {name:"Olectra Greentech", listed:true, role:"Electric bus manufacturer, legacy BYD technology-sharing origins", f:fin([593,1091,1154,1802,2312],[35,67,79,139,180],"Rs 9,909 Cr","Rs 1,207","OLECTRA",null,null,[867,1595],[484,"olectra-greentech-ltd"],[55.8,150,0.05,21.0,15.6,4.00])},
 msumi: {name:"Motherson Sumi Wiring India", listed:true, role:"Wiring harnesses for EV and ICE vehicles - ~40% share of the Indian harness market", f:fin([5635,7068,8327,9319,11478],[411,487,638,606,625],"Rs 22,740 Cr","Rs 34.3","MSUMI",null,null,[34.2,53.6],[856676,"motherson-sumi-wiring-india-ltd"],[36.2,3.26,1.69,38.9,32.4,1.00])},
 mindaCorp: {name:"Minda Corporation", listed:true, role:"Auto electronics and components incl. EV-specific sensors, controllers and switches", f:fin([2976,4300,4651,5056,6185],[192,284,227,255,358],"Rs 16,230 Cr","Rs 679","MINDACORP",null,null,[468,769],[863,"minda-corporation-ltd"],[40.3,110,0.21,12.7,14.7,2.00])},
 tataPowerEV: {name:"Tata Power", listed:true, role:"EV charging infrastructure (EZ Charge network) alongside its renewable/conventional power generation business", f:fin([42816,55109,61449,65478,62429],[2156,3810,4280,4775,5118],"Rs 1,17,429 Cr","Rs 368","TATAPOWER",null,null,[342,465],[1364,"tata-power-company-ltd"],[30.0,124,0.68,10.5,10.2,1.00])}
 },
 deepDive: {
 zoneId: "battery", buttonLabel: "Pack -> Modules -> Cells", stageCount: 3,
 entryCamera: {pos:[-0.1,1.1,1.9], target:[-0.1,0.16,0]},
 breadcrumbTrail: function(stage){
 return ["Vehicle","Powertrain","Battery"].concat(stage===0?["Battery pack"]:stage===1?["Modules"]:["Cells"]);
 },
 applyStage: function(stage, refs){
 if (stage===0){ refs.batteryPack.visible=true; refs.modulesGroup.visible=false; refs.cellInstances.visible=false; }
 else if (stage===1){ refs.batteryPack.visible=false; refs.modulesGroup.visible=true; refs.cellInstances.visible=false; refs.moduleMeshes.forEach(function(m){ m.userData.targetX = m.userData.baseX + (m.userData.baseX)*0.35; }); }
 else { refs.batteryPack.visible=false; refs.modulesGroup.visible=true; refs.cellInstances.visible=true; }
 },
 exit: function(refs){
 refs.batteryPack.visible = true; refs.modulesGroup.visible = false; refs.cellInstances.visible = false;
 refs.moduleMeshes.forEach(function(m){ m.position.x = m.userData.baseX; });
 }
 },
 // Builds this product's own geometry into the generic groups the engine provides.
 // ctx: { THREE, layerGroups:[g0,g1,g2,g3], staticGroup }
 // returns: { applyLevel(v), spreadMeshes:[...], deep:{...refs for deepDive...} }
 build: function(ctx){
 var THREE = ctx.THREE;
 var bodyGroup = ctx.layerGroups[0], structGroup = ctx.layerGroups[1], techGroup = ctx.layerGroups[2], powerGroup = ctx.layerGroups[3];
 var wheelsGroup = ctx.staticGroup;

 var matBody = new THREE.MeshPhysicalMaterial({color:0xBFD2DE, metalness:0.15, roughness:0.12, clearcoat:1, clearcoatRoughness:0.08, transparent:true, opacity:0.32, side:THREE.DoubleSide, depthWrite:false});
 var matGlass = new THREE.MeshStandardMaterial({color:0x8fd8ea, metalness:0.2, roughness:0.05, transparent:true, opacity:0.55});
 var matWheel = new THREE.MeshStandardMaterial({color:0x14181e, metalness:0.4, roughness:0.6});
 var matHub = new THREE.MeshStandardMaterial({color:0x9aa4ae, metalness:0.8, roughness:0.25});
 var matLight = new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffe9c2, emissiveIntensity:0.8, transparent:true, opacity:1});
 var matTailLight = new THREE.MeshStandardMaterial({color:0x330000, emissive:0xff2a2a, emissiveIntensity:0.7, transparent:true, opacity:1});
 var matStruct = new THREE.MeshStandardMaterial({color:0x8a97a6, metalness:0.7, roughness:0.4, transparent:true, opacity:1});
 var matStructDark = new THREE.MeshStandardMaterial({color:0x4b5563, metalness:0.6, roughness:0.5, transparent:true, opacity:1});
 var matTech = new THREE.MeshStandardMaterial({color:0x2c3648, metalness:0.3, roughness:0.5, transparent:true, opacity:1});
 var matScreen = new THREE.MeshStandardMaterial({color:0x0a0e14, emissive:0x49d4c9, emissiveIntensity:0.6, transparent:true, opacity:1});
 var matHarness = new THREE.MeshStandardMaterial({color:0xE0715F, emissive:0x4a1a12, emissiveIntensity:0.3, transparent:true, opacity:1});
 var matBattery = new THREE.MeshStandardMaterial({color:0x2E86AB, metalness:0.3, roughness:0.45, transparent:true, opacity:1});
 var matModule = new THREE.MeshStandardMaterial({color:0x3aa0c9, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matCell = new THREE.MeshStandardMaterial({color:0x8fd8ea, metalness:0.5, roughness:0.3, emissive:0x123844, emissiveIntensity:0.4});
 var matMotor = new THREE.MeshStandardMaterial({color:0xD96C2B, metalness:0.5, roughness:0.35, transparent:true, opacity:1});
 var matMotorInner = new THREE.MeshStandardMaterial({color:0xffb27a, metalness:0.6, roughness:0.25, transparent:true, opacity:1});
 var matMagnet = new THREE.MeshStandardMaterial({color:0x9C6B30, metalness:0.6, roughness:0.3, transparent:true, opacity:1});

 function shapeFromPoints(pts){
 var s = new THREE.Shape();
 s.moveTo(pts[0][0], pts[0][1]);
 for (var i=1;i<pts.length;i++) s.lineTo(pts[i][0], pts[i][1]);
 s.closePath();
 return s;
 }

 var lowerPts = [[-2.15,0.06],[-2.15,0.17],[-1.86,0.40],[-1.55,0.58],[-1.18,0.66],[0.85,0.66],[1.35,0.50],[2.15,0.36],[2.55,0.15],[2.55,0.06]];
 var lowerGeo = new THREE.ExtrudeGeometry(shapeFromPoints(lowerPts), {depth:1.78, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3, curveSegments:12});
 lowerGeo.translate(0,0,-0.89);
 bodyGroup.add(new THREE.Mesh(lowerGeo, matBody));

 var glassPts = [[-1.18,0.66],[-0.96,0.92],[-0.55,1.06],[0.32,1.08],[0.72,0.94],[0.95,0.72],[0.85,0.66]];
 var glassGeo = new THREE.ExtrudeGeometry(shapeFromPoints(glassPts), {depth:1.62, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.02, bevelSegments:2, curveSegments:12});
 glassGeo.translate(0,0,-0.81);
 bodyGroup.add(new THREE.Mesh(glassGeo, matGlass));

 [1,-1].forEach(function(side){
 var m = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.08,0.06), matBody);
 m.position.set(0.62, 0.78, side*0.95);
 bodyGroup.add(m);
 });
 [1,-1].forEach(function(side){
 var hl = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.08,0.28), matLight);
 hl.position.set(2.48,0.32,side*0.55);
 bodyGroup.add(hl);
 var tl = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.3), matTailLight);
 tl.position.set(-2.1,0.40,side*0.55);
 bodyGroup.add(tl);
 });
 var chargeFlap = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.12,0.16), matStructDark);
 chargeFlap.position.set(-1.75,0.5,0.92);
 bodyGroup.add(chargeFlap);

 var wheelPos = [[1.45,0.34,0.88],[1.45,0.34,-0.88],[-1.45,0.34,0.88],[-1.45,0.34,-0.88]];
 wheelPos.forEach(function(p){
 var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.22,24), matWheel);
 tire.rotation.x = Math.PI/2; tire.position.set(p[0],p[1],p[2]);
 wheelsGroup.add(tire);
 var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.24,10), matHub);
 hub.rotation.x = Math.PI/2; hub.position.set(p[0],p[1],p[2]);
 wheelsGroup.add(hub);
 for (var i=0;i<6;i++){
 var a = i*Math.PI/3;
 var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.26,0.02), matHub);
 spoke.position.set(p[0]+Math.cos(a)*0.13, p[1]+Math.sin(a)*0.13, p[2]);
 spoke.rotation.z = a;
 wheelsGroup.add(spoke);
 }
 });

 var floorPan = new THREE.Mesh(new THREE.BoxGeometry(3.9,0.05,1.55), matStruct);
 floorPan.position.set(-0.05,0.12,0); structGroup.add(floorPan);
 var frontSub = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,1.5), matStructDark);
 frontSub.position.set(1.5,0.2,0); structGroup.add(frontSub);
 var rearSub = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,1.5), matStructDark);
 rearSub.position.set(-1.5,0.2,0); structGroup.add(rearSub);
 [0.8,0.86].forEach(function(z){
 [1,-1].forEach(function(sign){
 var sill = new THREE.Mesh(new THREE.BoxGeometry(3.4,0.09,0.08), matStruct);
 sill.position.set(-0.1,0.16,sign*z); structGroup.add(sill);
 });
 });
 [1.0,0.3,-0.6].forEach(function(x){
 var pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.9,0.06), matStruct);
 pillar.position.set(x,0.65,0.86); structGroup.add(pillar);
 var pillar2 = pillar.clone(); pillar2.position.z = -0.86; structGroup.add(pillar2);
 });
 wheelPos.forEach(function(p){
 var coil = new THREE.Mesh(new THREE.TorusGeometry(0.08,0.02,6,12), matStructDark);
 coil.rotation.x = Math.PI/2; coil.position.set(p[0], p[1]+0.28, p[2]*0.75);
 structGroup.add(coil);
 });

 var centralComputer = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.1,0.3), matTech);
 centralComputer.position.set(0.3,0.34,0); techGroup.add(centralComputer);
 var cluster = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.14,0.32), matScreen);
 cluster.position.set(1.05,0.92,0); techGroup.add(cluster);
 var touchscreen = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.32,0.2), matScreen);
 touchscreen.position.set(0.88,0.72,0.35); touchscreen.rotation.y = 0.5; techGroup.add(touchscreen);
 var frontCam = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.04,0.06), matTech);
 frontCam.position.set(1.28,1.18,0); techGroup.add(frontCam);
 var radar = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,0.14), matTech);
 radar.position.set(2.25,0.3,0); techGroup.add(radar);
 [1,-1].forEach(function(side){
 var spk = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.02,12), matTech);
 spk.rotation.x = Math.PI/2; spk.position.set(0.6,0.55,side*0.85); techGroup.add(spk);
 });
 function harnessTube(points, radius){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), matHarness);
 }
 techGroup.add(harnessTube([[-1.4,0.2,0],[-0.4,0.22,0.3],[0.3,0.32,0.2],[1.0,0.5,0],[1.2,0.9,0]], 0.015));
 techGroup.add(harnessTube([[0.3,0.32,0],[0.3,0.32,0.75],[1.0,0.55,0.85]], 0.012));
 techGroup.add(harnessTube([[0.3,0.32,0],[-0.8,0.3,0.6],[-1.7,0.4,0.6]], 0.012));

 var batteryPack = new THREE.Mesh(new THREE.BoxGeometry(3.05,0.24,1.62), matBattery);
 batteryPack.position.set(-0.15,0.16,0); powerGroup.add(batteryPack);

 var modulesGroup = new THREE.Group(); modulesGroup.visible = false;
 var MODULE_COUNT = 8; var moduleMeshes = [];
 for (var i=0;i<MODULE_COUNT;i++){
 var mg = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.22,1.5), matModule);
 mg.userData.baseX = -1.5 + i*0.38 + 0.19;
 mg.position.set(mg.userData.baseX, 0.16, 0);
 modulesGroup.add(mg); moduleMeshes.push(mg);
 }
 powerGroup.add(modulesGroup);

 var cellGeo = new THREE.CylinderGeometry(0.018,0.018,0.2,8);
 var CELLS_PER_MODULE = 12;
 var cellInstances = new THREE.InstancedMesh(cellGeo, matCell, MODULE_COUNT*CELLS_PER_MODULE);
 cellInstances.visible = false;
 var dummy = new THREE.Object3D(); var idx = 0;
 for (var mi=0; mi<MODULE_COUNT; mi++){
 for (var ci=0; ci<CELLS_PER_MODULE; ci++){
 var row = ci % 4, col = Math.floor(ci/4);
 dummy.position.set(-1.5 + mi*0.38 + 0.19, 0.16, -0.55 + row*0.37);
 dummy.rotation.set(Math.PI/2, 0, 0); dummy.updateMatrix();
 cellInstances.setMatrixAt(idx++, dummy.matrix);
 }
 }
 powerGroup.add(cellInstances);

 function buildMotor(x){
 var g = new THREE.Group();
 var housing = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.4,24), matMotor);
 housing.rotation.x = Math.PI/2; g.add(housing);
 var stator = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.42,20), matMotorInner);
 stator.rotation.x = Math.PI/2; g.add(stator);
 var rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.44,14), matMagnet);
 rotor.rotation.x = Math.PI/2; g.add(rotor);
 var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.1,8), matHub);
 shaft.rotation.x = Math.PI/2; g.add(shaft);
 g.position.set(x,0.34,0);
 return g;
 }
 powerGroup.add(buildMotor(-1.45));
 var inverter = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18,0.24), matMotor);
 inverter.position.set(-1.05,0.62,0.45); powerGroup.add(inverter);
 var onboardCharger = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.14,0.2), matMotor);
 onboardCharger.position.set(-1.75,0.5,0.5); powerGroup.add(onboardCharger);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 spreadMeshes: moduleMeshes,
 deep: { batteryPack: batteryPack, modulesGroup: modulesGroup, cellInstances: cellInstances, moduleMeshes: moduleMeshes },
 applyLevel: function(v){
 var bodyOp = clamp01(1 - v);
 var structOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v, 1);
 var techOp = triangle(v, 2);
 var powerOp = clamp01(v - 2);
 setOp(matBody, bodyOp * SHELL_MAX_OPACITY);
 [matGlass,matLight,matTailLight].forEach(function(m){ setOp(m, bodyOp); });
 [matStruct,matStructDark].forEach(function(m){ setOp(m, Math.max(structOp, powerOp*0.15)); });
 [matTech,matScreen,matHarness].forEach(function(m){ setOp(m, techOp); });
 [matBattery,matModule,matMotor,matMotorInner,matMagnet].forEach(function(m){ setOp(m, powerOp); });
 }
 };
 }
 };

 PRODUCTS.semiconductors = {
 id: "semiconductors", icon: "SC", name: "Semiconductors (Fab + ATMP)",
 tagline: "India's chip fab, OSAT/ATMP and materials supply chain",
 headerTitle: "SEMICONDUCTOR ANATOMY",
 headerSub: "Explore India's emerging semiconductor value chain - fabs, packaging, gases, chemicals and utilities",
 layerNames: ["Site","Utility Yard","Cleanroom","Process Equipment"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "campus",
 views: [
 {id:"campus", label:"Campus", pos:[9,5.5,9], target:[0,0.6,0]},
 {id:"fab", label:"Fab", pos:[1.5,2.2,6.5], target:[0,0.7,0]},
 {id:"top", label:"Top", pos:[0.1,11,0.1], target:[0,0.5,0]},
 {id:"utility_yard", label:"Utility Yard", pos:[0.5,3.2,-6.5], target:[0.8,0.6,-2.4]},
 {id:"atmp_annex", label:"ATMP", pos:[7,2.4,3.2], target:[4.1,0.6,0]},
 {id:"ems", label:"EMS Plant", pos:[-7,2.6,3.6], target:[-4.4,0.6,0.5]}
 ],
 zones: [
 {id:"wafer_fab", color:"#4C6EF5", label:"Wafer Fab (Front-end)", pos:[0,1.45,0], side:"top", desc:"India's first commercial wafer fabs - the ultra-clean facilities that turn raw silicon into patterned wafers.", suppliers:["tataelectronics","micronindia"]},
 {id:"atmp", color:"#D96C2B", label:"OSAT / ATMP", pos:[4.1,1.05,0], side:"right", desc:"Assembly, Test, Mark & Pack - takes finished wafers, dices them into die, and packages them into usable chips.", suppliers:["kaynes","cgpower","hclfoxconn","spelsemi"]},
 {id:"gases", color:"#1E9E76", label:"Specialty & Bulk Gases", pos:[2.6,0.9,-2.4], side:"left", desc:"Nitrogen, hydrogen and specialty process gases piped directly into the fab for deposition, etching and annealing.", suppliers:["linde"]},
 {id:"chemicals", color:"#7A5CC7", label:"Ultra-Pure & Specialty Chemicals", pos:[-1.5,0.7,-2.3], side:"left", desc:"Fluorochemicals and ultra-pure wet chemicals used in etching, cleaning and photoresist processes.", suppliers:["srf","fluorochem","navinfluor"]},
 {id:"cleanroom_utilities", color:"#C6403D", label:"Cleanroom, Utilities & Ultra-Pure Water", pos:[0.8,1.0,-2.7], side:"bottom", desc:"Precision HVAC, ultra-pure water treatment and utility systems that keep the cleanroom within microscopic tolerances.", suppliers:["bluestar","ionexchange","thermax"]},
 {id:"ems_downstream", color:"#C99A2E", label:"Downstream EMS & System Integration", pos:[-4.4,1.2,0.5], side:"bottom", desc:"PCB assembly and system integration plants that sit downstream of the chip and feed finished electronics makers.", suppliers:["syrma","dixon"]},
 {id:"design_services", color:"#E8871E", label:"Chip Design & Engineering Services", pos:[-2.8,2.0,-1.0], side:"left", desc:"Fabless design houses and engineering-services firms doing ASIC/SoC, VLSI and embedded chip design work for domestic and global clients.", suppliers:["moschip","asmtech"]}
 ],
 suppliers: {
 tataelectronics: {name:"Tata Electronics", listed:false, role:"India's first commercial wafer fab (Dholera) and an OSAT plant (Assam)", notes:["Wholly owned Tata Sons subsidiary - not separately listed","Dholera fab (with PSMC as technology partner) targets ~50,000 wafers/month at maturity","Also building an OSAT/ATMP plant in Jagiroad, Assam","No public market data - not listed"]},
 micronindia: {name:"Micron Semiconductor Technology India", listed:false, role:"OSAT/ATMP plant (assembly, test, mark, pack) at Sanand, Gujarat", notes:["Wholly owned Indian subsidiary of US-based Micron Technology (NASDAQ: MU)","First phase of the Sanand ATMP facility began production in 2025","No public market data in India - not listed on NSE/BSE"]},
 kaynes: {name:"Kaynes Technology India", listed:true, role:"OSAT/ATMP semiconductor plant (Sanand) plus PCB, EMS and system integration", f:fin([706,1126,1805,2722,3626],[42,95,183,293,364],"Rs 24,536 Cr","Rs 3,650","KAYNES",null,null,[2995,7705],[1124672,"kaynes-technology-india-ltd"],[70.6,708,0.00,12.7,8.69,10.0])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Semiconductor ATMP/OSAT JV (with Renesas & Stars Microelectronics) alongside its core power equipment business", f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER","Revenue/profit reflect CG Power's core electrical-equipment business; the Sanand ATMP JV is a newer, separately ramping unit",null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 hclfoxconn: {name:"HCL-Foxconn Semiconductor", listed:false, role:"Proposed OSAT plant (Jewar, Uttar Pradesh) for display driver chips", notes:["50:50 joint venture between HCL Group and Foxconn (Hon Hai)","Targets display-driver and power-management chips for consumer electronics","No public market data - not listed; JV entity is privately held"]},
 linde: {name:"Linde India", listed:true, role:"Industrial and specialty gases (nitrogen, hydrogen, specialty process gases) for fabs", f:fin([2112,null,2769,2485,2531],[507,null,434,455,549],"Rs 52,383 Cr","Rs 6,142","LINDEINDIA","FY23 figure unavailable due to a reporting period change (Dec-end to Mar-end transition)",null,[5653,8049],[791,"linde-india-ltd"],[95.9,500,0.07,18.2,13.6,10.0])},
 srf: {name:"SRF Limited", listed:true, role:"Fluorochemicals and specialty gases used in semiconductor etching and cleaning", f:fin([12434,14870,13139,14693,15787],[1889,2162,1336,1251,1835],"Rs 75,292 Cr","Rs 2,540","SRF",null,null,[2314,3239],[1283,"srf-ltd"],[33.6,474,0.35,14.6,14.3,10.0])},
 fluorochem: {name:"Gujarat Fluorochemicals", listed:true, role:"Fluoropolymers and ultra-pure fluorochemicals for semiconductor-grade applications", f:fin([3954,5685,4281,4737,4996],[776,1323,435,546,574],"Rs 48,789 Cr","Rs 4,441","FLUOROCHEM",null,null,[2917,4959],[169265,"gujarat-fluorochemicals-ltd"],[79.0,716,0.07,9.64,7.82,1.00])},
 bluestar: {name:"Blue Star", listed:true, role:"Precision cleanroom air-conditioning and HVAC for fabs and ATMP plants", f:fin([6064,7977,9685,11968,12402],[168,401,414,591,527],"Rs 32,179 Cr","Rs 1,565","BLUESTARCO",null,null,[1432,2033],[209,"blue-star-ltd"],[60.8,167,0.54,21.2,17.2,2.00])},
 ionexchange: {name:"Ion Exchange (India)", listed:true, role:"Ultra-pure water treatment systems for fab process use", f:fin([1577,1990,2348,2737,2915],[162,195,195,208,143],"Rs 6,162 Cr","Rs 420","IONEXCHANG",null,null,[312,486],[2050,"ion-exchange-india-ltd"],[56.0,91.3,0.30,14.2,12.0,1.00])},
 thermax: {name:"Thermax", listed:true, role:"Utilities - boilers, steam, power and cooling systems for fab campuses", f:fin([6128,8090,9323,10387,10774],[312,451,643,627,720],"Rs 41,076 Cr","Rs 3,447","THERMAX",null,null,[2743,5278],[1387,"thermax-ltd"],[74.6,466,0.41,13.9,10.6,2.00])},
 syrma: {name:"Syrma SGS Technology", listed:true, role:"PCB, EMS and downstream system integration adjacent to semiconductor packaging", f:fin([1267,2048,3154,3787,4819],[79,123,124,184,346],"Rs 33,410 Cr","Rs 1,733","SYRMA",null,null,[634,1804],[995074,"syrma-sgs-technology-ltd"],[90.0,148,0.09,16.8,14.0,10.0])},
 dixon: {name:"Dixon Technologies", listed:true, role:"Large-scale EMS; diversifying into components and semiconductor-adjacent manufacturing", f:fin([10697,12192,17691,38860,48873],[190,255,375,1233,1644],"Rs 81,907 Cr","Rs 13,390","DIXON",null,null,[9600,17640],[60393,"dixon-technologies-india-ltd"],[43.6,769,0.07,29.2,18.9,2.00])},
 spelsemi: {name:"SPEL Semiconductor", listed:true, role:"Semiconductor assembly, packaging and testing (OSAT) - India's only pure-play listed OSAT name", f:fin([9,11,12,8,6],[-13,-3,-17,-21,-24],"Rs 606 Cr","Rs 131","SPELS","BSE-only listing (no NSE ticker); persistently loss-making, small-cap, thin float",[-37,32,54],[123,221],[2745,"spel-semiconductor-ltd"],[null,0.66,0.00,0.06,-64.5,10.0])},
 moschip: {name:"MosChip Technologies", listed:true, role:"Fabless semiconductor design services - ASIC/SoC, VLSI, embedded and IP development", f:fin([148,198,294,467,585],[6,6,10,33,35],"Rs 3,983 Cr","Rs 204","MOSCHIP",null,[-15,32,38],[147,288],[3841,"moschip-technologies-ltd"],[125,21.1,0.00,11.0,11.0,2.0])},
 asmtech: {name:"ASM Technologies", listed:true, role:"Engineering & product-engineering services spanning embedded/VLSI semiconductor design alongside aerospace and industrial engineering", f:fin([192,220,202,289,529],[14,7,-7,25,61],"Rs 10,217 Cr","Rs 7,004","ASMTEC",null,[69,144,98],[2100,7248],[3131,"asm-technologies-ltd"],[140,210,0.24,27.0,25.5,10.0])},
 navinfluor: {name:"Navin Fluorine International", listed:true, role:"Specialty fluorochemicals incl. high-purity fluorinated/etching gases used in semiconductor fab cleaning and etch steps", f:fin([1453,2077,2065,2349,3314],[263,375,270,289,664],"Rs 44,051 Cr","Rs 8,584","NAVINFLUOR",null,[88,25,18],[4498,8950],[914,"navin-fluorine-international-ltd"],[55.4,775,0.18,21.0,19.6,2.0])}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var shellGroup = ctx.layerGroups[0], utilityGroup = ctx.layerGroups[1], cleanroomGroup = ctx.layerGroups[2], processGroup = ctx.layerGroups[3];

 var matShell = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.3, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matUtility = new THREE.MeshStandardMaterial({color:0x8a97a6, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matGasTank = new THREE.MeshStandardMaterial({color:0x3aa0c9, metalness:0.5, roughness:0.3, transparent:true, opacity:1});
 var matChemTank = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matPipe = new THREE.MeshStandardMaterial({color:0x6b7684, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matCleanroom = new THREE.MeshStandardMaterial({color:0x49D4C9, emissive:0x1c6b64, emissiveIntensity:0.5, metalness:0.1, roughness:0.3, transparent:true, opacity:1});
 var matFloor = new THREE.MeshStandardMaterial({color:0x2c3648, metalness:0.3, roughness:0.5, transparent:true, opacity:1});
 var matProcess = new THREE.MeshStandardMaterial({color:0xE3A33B, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matWafer = new THREE.MeshStandardMaterial({color:0xcfe6ee, metalness:0.7, roughness:0.2, transparent:true, opacity:1});

 var mainFab = new THREE.Mesh(new THREE.BoxGeometry(6,1.4,3.2), matShell);
 mainFab.position.set(0,0.7,0); shellGroup.add(mainFab);
 var atmpAnnex = new THREE.Mesh(new THREE.BoxGeometry(2.2,1.0,2.2), matShell);
 atmpAnnex.position.set(4.1,0.5,0); shellGroup.add(atmpAnnex);
 var emsBuilding = new THREE.Mesh(new THREE.BoxGeometry(1.8,1.1,1.6), matShell);
 emsBuilding.position.set(-4.4,0.55,0.5); shellGroup.add(emsBuilding);

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 var gasPositions = [[2.35,-2.4],[2.6,-2.55],[2.85,-2.4],[2.6,-2.25]];
 gasPositions.forEach(function(p){
 var tankMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,1.05,14), matGasTank);
 tankMesh.position.set(p[0],0.55,p[1]); utilityGroup.add(tankMesh);
 });
 tube([[2.6,1.0,-2.4],[2.6,1.15,-1.4],[3.0,1.15,0]], 0.045, matPipe, utilityGroup);

 var chemPositions = [[-1.8,-2.3],[-1.5,-2.35],[-1.2,-2.3]];
 chemPositions.forEach(function(p){
 var chemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.75,14), matChemTank);
 chemMesh.position.set(p[0],0.4,p[1]); utilityGroup.add(chemMesh);
 });
 tube([[-1.5,0.75,-2.3],[-1.5,1.1,-1.4],[-1.0,1.1,0]], 0.04, matPipe, utilityGroup);

 var ct1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.5,0.85,20), matUtility);
 ct1.position.set(0.55,0.45,-2.65); utilityGroup.add(ct1);
 var ct2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.44,0.7,20), matUtility);
 ct2.position.set(1.3,0.38,-2.6); utilityGroup.add(ct2);
 var waterPlant = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.6), matUtility);
 waterPlant.position.set(0.9,0.3,-3.15); utilityGroup.add(waterPlant);
 tube([[0.8,0.85,-2.7],[0.8,1.1,-1.4],[1.0,1.1,0]], 0.045, matPipe, utilityGroup);

 var roofRack = new THREE.Mesh(new THREE.BoxGeometry(5.6,0.08,0.3), matUtility);
 roofRack.position.set(0,1.44,-1.35); utilityGroup.add(roofRack);

 var cleanroomBox = new THREE.Mesh(new THREE.BoxGeometry(5.4,0.85,2.6), matCleanroom);
 cleanroomBox.position.set(0,0.62,0); cleanroomGroup.add(cleanroomBox);
 var raisedFloor = new THREE.Mesh(new THREE.BoxGeometry(5.2,0.04,2.4), matFloor);
 raisedFloor.position.set(0,0.22,0); cleanroomGroup.add(raisedFloor);

 var TOOL_COUNT = 6;
 for (var i=0;i<TOOL_COUNT;i++){
 var toolA = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.5,0.42), matProcess);
 toolA.position.set(-2.2 + i*0.85, 0.5, -0.7); processGroup.add(toolA);
 var toolB = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,0.4), matProcess);
 toolB.position.set(-2.2 + i*0.85, 0.46, 0.7); processGroup.add(toolB);
 }
 for (var w=0; w<5; w++){
 var foup = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.16,10), matWafer);
 foup.position.set(-1.6+w*0.5, 0.86, 0); processGroup.add(foup);
 }
 for (var a=0; a<4; a++){
 var station = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.32,0.3), matProcess);
 station.position.set(3.5+a*0.42, 0.4, 0); processGroup.add(station);
 }
 for (var e=0; e<3; e++){
 var emsLine = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.9), matProcess);
 emsLine.position.set(-4.4, 0.35, -0.35+e*0.35); processGroup.add(emsLine);
 }

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var utilOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var cleanOp = triangle(v,2);
 var procOp = clamp01(v-2);
 setOp(matShell, shellOp);
 [matUtility,matGasTank,matChemTank,matPipe].forEach(function(m){ setOp(m, Math.max(utilOp, procOp*0.15)); });
 [matCleanroom,matFloor].forEach(function(m){ setOp(m, cleanOp); });
 [matProcess,matWafer].forEach(function(m){ setOp(m, procOp); });
 }
 };
 }
 };

 PRODUCTS.datacenter = {
 id: "datacenter", icon: "DC", name: "Data Center / AI Infrastructure",
 tagline: "Servers, cooling, power backup and the physical AI buildout",
 headerTitle: "DATA CENTER ANATOMY",
 headerSub: "Explore the physical stack behind AI/cloud infrastructure - compute, cooling, power and the operators who run it",
 layerNames: ["Building","Site Infrastructure","White Space","Racks & Compute"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "campus",
 views: [
 {id:"campus", label:"Campus", pos:[9.5,5.5,9.5], target:[0,0.6,0]},
 {id:"whitespace", label:"White Space", pos:[0.2,2.4,5.5], target:[0,0.6,0]},
 {id:"top", label:"Top", pos:[0.1,11.5,0.1], target:[0,0.5,0]},
 {id:"cooling_yard", label:"Cooling Yard", pos:[6.5,3.2,-5.5], target:[3.2,0.6,-1.8]},
 {id:"power_yard", label:"Power Yard", pos:[-7.5,3.2,-3.5], target:[-3.2,0.6,0]},
 {id:"ops", label:"Ops / NOC", pos:[7.5,2.6,4.2], target:[4.6,0.5,2.2]}
 ],
 zones: [
 {id:"compute", color:"#4C6EF5", label:"Servers, GPUs & Compute", pos:[0,1.0,0], side:"top", desc:"Racks of servers and GPU/accelerator nodes - the actual compute that AI and cloud workloads run on.", suppliers:["netweb","redington","rashiPeripherals"]},
 {id:"cooling", color:"#1E9E76", label:"Cooling: CRAC, Chillers & Towers", pos:[3.2,1.0,-1.8], side:"right", desc:"Precision air conditioning, chillers and cooling towers that remove the heat dense racks generate.", suppliers:["voltas","bluestar"]},
 {id:"power_backup", color:"#D96C2B", label:"UPS & Diesel Backup Power", pos:[-3.2,0.75,-1.8], side:"left", desc:"Battery-backed UPS systems and diesel generators that keep the facility running through grid outages.", suppliers:["cummins","kirloskar","exide","amararaja","hblEngineering"]},
 {id:"transformers", color:"#7A5CC7", label:"Transformers & Switchgear", pos:[-3.2,0.85,1.8], side:"left", desc:"Steps grid power down to usable voltages and distributes it safely across the facility.", suppliers:["cgpower","taril","voltamp","schneiderElec","hitachiEnergy","abbIndia"]},
 {id:"cabling", color:"#C99A2E", label:"Structured & Power Cabling", pos:[1.8,0.25,1.6], side:"right", desc:"Power and structured data cabling that wires racks, PDUs and switches together across the white space.", suppliers:["polycab","kei","fincables","aparInds"]},
 {id:"operators", color:"#B5179E", label:"DC Operators & REIT Layer", pos:[4.6,0.85,2.2], side:"bottom", desc:"The companies that own and operate the physical data-centre campus and lease capacity to cloud and enterprise customers.", suppliers:["bhartiairtel","ctrls","sttgdc"]},
 {id:"networking", color:"#2A9134", label:"Fiber Backbone & Network Interconnect", pos:[-1.8,0.25,-1.6], side:"left", desc:"Optical fiber and networking equipment connecting the campus to the fiber backbone and other data centres for low-latency interconnect.", suppliers:["hfcl","sterliteTech"]}
 ],
 suppliers: {
 netweb: {name:"Netweb Technologies India", listed:true, role:"HPC/AI servers, GPU systems and data-centre compute hardware", f:fin([247,445,724,1149,2184],[22,47,76,114,206],"Rs 27,019 Cr","Rs 4,545","NETWEB",null,null,[2920,5813],[1544933,"netweb-technologies-india-ltd"],[104,127,0.07,37.5,32.8,2.00])},
 voltas: {name:"Voltas", listed:true, role:"Precision air conditioning and cooling for data-centre halls", f:fin([7934,9499,12481,15413,14244],[506,136,248,834,370],"Rs 37,000 Cr","Rs 1,118","VOLTAS",null,null,[1090,1582],[1500,"voltas-ltd"],[79.2,193,0.36,9.04,6.10,1.00])},
 bluestar: {name:"Blue Star", listed:true, role:"Precision air conditioning and cooling for data-centre halls", f:fin([6064,7977,9685,11968,12402],[168,401,414,591,527],"Rs 32,179 Cr","Rs 1,565","BLUESTARCO",null,null,[1432,2033],[209,"blue-star-ltd"],[60.8,167,0.54,21.2,17.2,2.00])},
 cummins: {name:"Cummins India", listed:true, role:"Diesel generator sets for data-centre power backup", f:fin([6171,7772,9000,10391,12143],[934,1228,1721,2000,2362],"Rs 1,37,075 Cr","Rs 4,945","CUMMINSIND",null,null,[3803,6143],[297,"cummins-india-ltd"],[56.2,306,1.33,39.5,30.2,2.00])},
 kirloskar: {name:"Kirloskar Oil Engines", listed:true, role:"Diesel and gas generator sets for data-centre backup power", f:fin([4022,5020,5898,6329,7701],[171,332,440,476,562],"Rs 31,100 Cr","Rs 2,137","KIRLOSENG",null,null,[866,2720],[745,"kirloskar-oil-engines-ltd"],[54.6,249,0.33,14.6,17.5,2.00])},
 exide: {name:"Exide Industries", listed:true, role:"Lead-acid and Li-ion battery banks for UPS backup power", f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,023 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain",null,[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 amararaja: {name:"Amara Raja Energy & Mobility", listed:true, role:"Lead-acid and Li-ion battery banks for UPS backup power", f:fin([8696,10390,11260,null,null],[511,731,906,null,null],"Rs 18,568 Cr","Rs 1,014","ARE&M","FY25-FY26 not yet reflected in the source at fetch time",null,[670,1023],[68,"amara-raja-energy-mobility-ltd"],[18.5,446,1.34,13.4,8.26,1.00])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Transformers and switchgear for data-centre electrical yards", f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER",null,null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 taril: {name:"Transformers & Rectifiers (India)", listed:true, role:"Power and distribution transformers for data-centre electrical yards", f:fin([1158,1396,1291,2017,2507],[14,42,47,216,272],"Rs 8,334 Cr","Rs 278","TARIL",null,null,[224,502],[1417,"transformers-rectifiers-india-ltd"],[32.2,50.5,0.09,23.3,19.1,1.00])},
 voltamp: {name:"Voltamp Transformers", listed:true, role:"Power transformers for industrial and data-centre electrical infrastructure", f:fin([1127,1385,1616,1934,2154],[133,200,307,325,305],"Rs 10,834 Cr","Rs 10,709","VOLTAMP",null,null,[6666,12863],[1499,"voltamp-transformers-ltd"],[34.2,1771,0.93,23.5,17.4,10.0])},
 polycab: {name:"Polycab India", listed:true, role:"Structured cabling and power cables for data-centre fit-outs", f:fin([12204,14108,18039,22408,28884],[917,1282,1803,2046,2708],"Rs 1,26,713 Cr","Rs 8,408","POLYCAB",null,null,[6660,10129],[139599,"polycab-india-ltd"],[44.2,798,0.56,33.2,23.0,10.0])},
 kei: {name:"KEI Industries", listed:true, role:"Power and structured cables for data-centre infrastructure", f:fin([5727,6912,8104,9736,11748],[376,477,581,696,918],"Rs 44,679 Cr","Rs 4,674","KEI",null,null,[3729,5931],[729,"kei-industries-ltd"],[44.8,697,0.10,20.0,14.7,2.00])},
 fincables: {name:"Finolex Cables", listed:true, role:"Power and communication cables for data-centre buildouts", f:fin([3768,4481,5014,5319,6321],[599,504,652,701,714],"Rs 22,343 Cr","Rs 1,461","FINCABLES",null,null,[701,1498],[416,"finolex-cables-ltd"],[27.9,398,0.62,16.0,12.3,2.00])},
 bhartiairtel: {name:"Bharti Airtel", listed:true, role:"Parent of Nxtra Data, one of India's largest data-centre operators", f:fin([116547,139145,149982,172985,210973],[8305,12287,8558,37481,33823],"Rs 11,14,378 Cr","Rs 1,785","BHARTIARTL","Diversified telecom group; Nxtra Data (its DC arm) is not separately listed, so figures are consolidated group-wide",null,[1740,2175],[187,"bharti-airtel-ltd"],[35.7,245,1.34,17.6,20.3,5.00])},
 ctrls: {name:"CtrlS Datacenters", listed:false, role:"Independent hyperscale data-centre operator (Tier IV certified)", notes:["Privately held, Hyderabad-based; one of India's largest independent DC operators","Backed by private equity investors including Actis","No public market data - not listed"]},
 sttgdc: {name:"STT GDC India", listed:false, role:"Data-centre operator - JV between ST Telemedia and Tata group companies", notes:["Joint venture of Singapore's ST Telemedia and Tata group entities","Operates hyperscale campuses across Mumbai, Chennai, Delhi-NCR and other cities","No public market data - not listed"]},
 schneiderElec: {name:"Schneider Electric Infrastructure", listed:true, role:"Power distribution and electrical infrastructure (switchgear, transformers) for DC power rooms", f:fin([1530,1777,2207,2637,2891],[28,124,172,268,213],"Rs 28,919 Cr","Rs 1,210","SCHNEIDER",null,[45,50,60],[572,1548],[1195,"schneider-electric-infrastructure-ltd"],[149,28.8,0.00,29.6,38.2,2.0])},
 hitachiEnergy: {name:"Hitachi Energy India", listed:true, role:"Power grid equipment (transformers, switchgear) for DC substations and grid interconnects", f:fin([4884,4469,5237,6385,8148],[203,94,164,384,988],"Rs 1,38,330 Cr","Rs 31,035","POWERINDIA",null,[62,96,68],[16104,38800],[202203,"hitachi-energy-india-ltd"],[116,1161,0.03,29.4,21.9,2.0])},
 abbIndia: {name:"ABB India", listed:true, role:"Electrical equipment, UPS, drives and automation for DC power and cooling systems", f:fin([6934,8568,10447,12188,13203],[520,1016,1242,1872,1668],"Rs 1,49,448 Cr","Rs 7,052","ABB","Reports Jan-Dec fiscal year",[36,19,31],[4638,7924],[17,"abb-india-ltd"],[97.0,441,0.56,29.9,22.4,2.0])},
 aparInds: {name:"Apar Industries", listed:true, role:"Power cables, conductors and transformers for DC campus grid connectivity", f:fin([9317,14336,16153,18581,22902],[257,638,825,821,977],"Rs 74,432 Cr","Rs 17,776","APARINDS",null,[113,48,94],[6800,19269],[88,"apar-industries-ltd"],[61.8,1343,0.34,31.8,20.3,10.0])},
 hblEngineering: {name:"HBL Engineering", listed:true, role:"Batteries and UPS power backup systems for DC power continuity", f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Renamed from HBL Power Systems (ticker HBLPOWER -> HBLENGINE); also has rail-signalling and defense-electronics segments beyond batteries/UPS",[-4,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.0])},
 redington: {name:"Redington", listed:true, role:"Large-scale IT hardware distribution incl. servers and DC equipment", f:fin([62644,79377,89346,99334,119162],[1315,1439,1239,1821,1284],"Rs 31,838 Cr","Rs 407","REDINGTON",null,[54,39,23],[191,420],[1120,"redington-ltd"],[17.7,130,1.47,18.4,16.9,2.0])},
 rashiPeripherals: {name:"Rashi Peripherals", listed:true, role:"IT hardware distribution incl. servers and DC equipment", f:fin([9313,9454,11095,13773,15827],[183,123,144,210,282],"Rs 5,930 Cr","Rs 893","RPTECH","Recently listed (IPO Feb 2024) - only 1Y stock CAGR available",[183,null,null],[313,968],[1992194,"rashi-peripherals-ltd"],[18.6,307,0.22,17.0,14.7,5.0])},
 hfcl: {name:"HFCL", listed:true, role:"Optical fiber and telecom/DC networking equipment (OFC, routers)", f:fin([4727,4743,4465,4065,4949],[326,318,338,173,329],"Rs 32,337 Cr","Rs 211","HFCL",null,[193,41,24],[59.8,257],[543,"hfcl-ltd"],[56.5,32.0,0.09,10.8,6.98,1.0])},
 sterliteTech: {name:"Sterlite Technologies", listed:true, role:"Optical fiber and OFC data networking - largest OFC maker in India", f:fin([5437,6925,4083,3996,4745],[45,127,-57,-123,56],"Rs 43,037 Cr","Rs 837","STLTECH","FY24-25 net losses reflect OFC industry pricing downcycle; FY26 returned to profit",[615,94,32],[84.6,912],[1299,"sterlite-technologies-ltd"],[182,46.5,0.00,7.65,1.24,2.0])}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var shellGroup = ctx.layerGroups[0], siteGroup = ctx.layerGroups[1], whiteSpaceGroup = ctx.layerGroups[2], rackGroup = ctx.layerGroups[3];

 var matShell = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.35, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matSite = new THREE.MeshStandardMaterial({color:0x8a97a6, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matCooling = new THREE.MeshStandardMaterial({color:0x3aa0c9, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matGenset = new THREE.MeshStandardMaterial({color:0xD96C2B, metalness:0.4, roughness:0.4, transparent:true, opacity:1});
 var matElectrical = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matWhiteSpace = new THREE.MeshStandardMaterial({color:0x2c3648, metalness:0.3, roughness:0.5, transparent:true, opacity:1});
 var matRack = new THREE.MeshStandardMaterial({color:0x14181e, metalness:0.5, roughness:0.5, transparent:true, opacity:1});
 var matRackLed = new THREE.MeshStandardMaterial({color:0x49D4C9, emissive:0x49D4C9, emissiveIntensity:0.9, transparent:true, opacity:1});
 var matCable = new THREE.MeshStandardMaterial({color:0xC99A2E, metalness:0.3, roughness:0.4, transparent:true, opacity:1});

 var mainBldg = new THREE.Mesh(new THREE.BoxGeometry(5,1.2,3), matShell);
 mainBldg.position.set(0,0.6,0); shellGroup.add(mainBldg);
 var opsBldg = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,1.2), matShell);
 opsBldg.position.set(4.6,0.4,2.2); shellGroup.add(opsBldg);

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 [-0.35,0.35].forEach(function(dx){
 var chiller = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.9), matCooling);
 chiller.position.set(3.2+dx, 0.4, -1.6); siteGroup.add(chiller);
 });
 var tower1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.46,0.85,20), matCooling);
 tower1.position.set(3.0,0.42,-2.2); siteGroup.add(tower1);
 var tower2 = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.4,0.7,20), matCooling);
 tower2.position.set(3.7,0.38,-2.1); siteGroup.add(tower2);
 tube([[3.2,0.85,-1.9],[3.2,1.1,-1.0],[2.0,1.1,0]], 0.05, matSite, siteGroup);

 [-0.6,0,0.6].forEach(function(dx){
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,1.1), matGenset);
 genset.position.set(-3.2+dx, 0.32, -1.8); siteGroup.add(genset);
 var exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,8), matSite);
 exhaust.position.set(-3.2+dx, 0.75, -1.8); siteGroup.add(exhaust);
 });

 var xfmr1 = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.6,0.9), matElectrical);
 xfmr1.position.set(-3.4,0.35,1.6); siteGroup.add(xfmr1);
 var xfmr2 = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.55,0.8), matElectrical);
 xfmr2.position.set(-2.6,0.32,1.9); siteGroup.add(xfmr2);
 var switchgear = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.7,0.35), matElectrical);
 switchgear.position.set(-3.2,0.4,2.35); siteGroup.add(switchgear);
 tube([[-3.2,0.85,1.8],[-3.2,1.1,1.0],[-2.0,1.1,0]], 0.045, matSite, siteGroup);

 for (var r=0;r<3;r++){
 var crac = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.5), matCooling);
 crac.position.set(-1.5+r*1.5, 1.28, 0.6); siteGroup.add(crac);
 }
 var noc = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.1,0.7), matSite);
 noc.position.set(4.6,0.85,2.2); siteGroup.add(noc);

 var raisedFloor = new THREE.Mesh(new THREE.BoxGeometry(4.6,0.05,2.6), matWhiteSpace);
 raisedFloor.position.set(0,0.2,0); whiteSpaceGroup.add(raisedFloor);
 for (var tz=-1; tz<=1; tz++){
 var tray = new THREE.Mesh(new THREE.BoxGeometry(4.4,0.03,0.06), matCable);
 tray.position.set(0, 1.05, tz*0.8); whiteSpaceGroup.add(tray);
 }
 tube([[1.8,0.25,1.5],[1.8,0.4,0.9],[1.0,0.4,0]], 0.035, matCable, whiteSpaceGroup);

 var rows = 4, perRow = 6;
 for (var row=0; row<rows; row++){
 for (var c=0; c<perRow; c++){
 var rack = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.85,0.55), matRack);
 rack.position.set(-1.9 + c*0.7, 0.62, -0.9 + row*0.6); rackGroup.add(rack);
 var led = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.7,0.04), matRackLed);
 led.position.set(-1.9 + c*0.7 + 0.12, 0.62, -0.9 + row*0.6 + 0.26); rackGroup.add(led);
 }
 }

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var siteOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var wsOp = triangle(v,2);
 var rackOp = clamp01(v-2);
 setOp(matShell, shellOp);
 [matSite,matCooling,matGenset,matElectrical].forEach(function(m){ setOp(m, Math.max(siteOp, rackOp*0.15)); });
 [matWhiteSpace,matCable].forEach(function(m){ setOp(m, wsOp); });
 [matRack,matRackLed].forEach(function(m){ setOp(m, rackOp); });
 }
 };
 }
 };


 PRODUCTS.railways = {
 id: "railways", icon: "RL", name: "Railways / Vande Bharat & Metro Rolling Stock",
 tagline: "Bogies, traction, signaling, braking and coach fabrication - India's rail 'Make in India' story",
 headerTitle: "RAILWAYS ANATOMY",
 headerSub: "Explore the Vande Bharat / metro rolling-stock value chain - coach fabrication, bogies, traction, signaling and braking",
 layerNames: ["Track & Corridor","Underframe & Bogies","Traction & Braking","Coach Body & Cab Electronics"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "trackside",
 views: [
 {id:"trackside", label:"Trackside", pos:[9.7,3.6,7.5], target:[-1.4,0.6,0]},
 {id:"platform", label:"Platform", pos:[2.25,1.8,6.74], target:[0,0.55,0]},
 {id:"top", label:"Top", pos:[-1.4,9.5,0.1], target:[-1.4,0.5,0]},
 {id:"cab", label:"Driver's Cab", pos:[-5.2,1.6,2.2], target:[-2.9,0.85,0]},
 {id:"underframe", label:"Underframe", pos:[-0.4,0.9,4.3], target:[-1.4,0.3,0]}
 ],
 zones: [
 {id:"rolling_stock", color:"#4C6EF5", label:"Rolling Stock Integration & Coach Fabrication", pos:[0,1.0,0], side:"top", desc:"Complete trainset/coach assembly - the OEMs that fabricate and integrate Vande Bharat, metro and freight rolling stock.", suppliers:["titagarh","texmaco","beml","jupiterwagons","stoneindia"]},
 {id:"bogies", color:"#D96C2B", label:"Bogies, Wheels, Axles & Bearings", pos:[-1.2,0.2,0.32], side:"bottom", desc:"Forged wheelsets, axles, bogie frames and bearings that carry and guide each coach along the track.", suppliers:["ramkrishnaforgings","bharatforge","timken","nrbbearings","schaefflerindia"]},
 {id:"traction", color:"#7A5CC7", label:"Traction Propulsion, Motors & Power Electronics", pos:[0,1.85,0], side:"top", desc:"Pantograph, traction motors and power-electronic converters that draw overhead power and drive the wheels.", suppliers:["bhel","siemenschain","abbindia","cgpower","hirect"]},
 {id:"signaling", color:"#1E9E76", label:"Signaling, Train Control (Kavach) & Onboard Electronics", pos:[-2.9,1.0,0.35], side:"left", desc:"Kavach/ETCS train-protection electronics, interlocking and cab signaling that keep trains safely spaced.", suppliers:["kernex","quadrantfuturetek","hblengineering","micelectronics"]},
 {id:"braking", color:"#C9315C", label:"Braking Systems & Auxiliary Coach Systems", pos:[1.2,0.2,-0.32], side:"bottom", desc:"Air-brake systems, couplers and onboard batteries/lighting that keep the train stoppable and liveable.", suppliers:["escortskubota","stoneindia","hblengineering","elgiequip"]},
 {id:"epc", color:"#8B5E34", label:"Railway EPC, Track & Electrification Contractors", pos:[3.6,1.0,0.9], side:"right", desc:"New lines, doubling, track-laying and overhead electrification contractors that build the corridor itself.", suppliers:["rvnl","ircon","kalpataru","kec","salasar","afcons","cemindia","jkil"]},
 {id:"psu", color:"#B5179E", label:"Railway PSU Ecosystem: Financing, Ticketing & Digital Infra", pos:[4.6,0.85,-1.2], side:"right", desc:"The PSU layer that finances rolling stock, sells tickets and runs the digital/telecom backbone for Indian Railways.", suppliers:["irfc","irctc","railtel","rites","concor"]}
 ],
 suppliers: {
 titagarh: {name:"Titagarh Rail Systems", listed:true, role:"Vande Bharat/metro coaches, EMUs, freight wagons, forged wheels", f:fin([1468,2780,3853,3868,3186],[-1,126,286,87,123],"Rs 11,078 Cr","Rs 823","TITAGARH",null,[-6,1,54],[569,971],[1434,"titagarh-rail-systems-ltd"],[57.0,182,0.12,10.9,6.78,2.00])},
 texmaco: {name:"Texmaco Rail & Engineering", listed:true, role:"Freight wagons, steel/cast components and rail EPC (absorbed Kalindee Rail Nirman)", f:fin([null,null,3503,5107,4377],[null,null,113,249,194],"Rs 5,113 Cr","Rs 126","TEXRAIL","FY22-FY23 not reliably retrieved; part of Adventz/Texmaco Group",[-9,-1,32],[78,143],[1380,"texmaco-rail-engineering-ltd"],[23.6,58.4,0.60,11.2,7.30,1.00])},
 beml: {name:"BEML Ltd", listed:true, role:"Metro coaches (Bengaluru/Kolkata/Chennai), diesel & electric locomotives", f:fin([4337,3899,4054,4022,4351],[129,158,282,293,141],"Rs 16,962 Cr","Rs 2,036","BEML","Govt Mini-Ratna PSU; Rail & Metro is one of three verticals alongside Defence and Mining",[-3.2,null,null],[1355,2277],[176,"beml-ltd"],[95.0,352,0.84,7.66,4.78,5.00])},
 jupiterwagons: {name:"Jupiter Wagons Ltd", listed:true, role:"Freight wagons, containers and braking systems", f:fin([1178,2068,3644,3963,2916],[50,121,331,380,166],"Rs 9,690 Cr","Rs 227","JWL","Fastest-growing wagon maker; diversifying into EV bus bodies and braking systems",[-33,-12,48],[224,358],[245,"jupiter-wagons-ltd"],[54.5,69.7,0.44,9.14,6.37,10.0])},
 stoneindia: {name:"Stone India Ltd", listed:true, role:"Legacy railway coupler, brake-valve & signaling-equipment maker (Kolkata)", f:fin([null,null,null,null,null],[null,null,null,null,null],null,null,"STONEINDIA","Screener's cached page only showed data through FY16; current financials need direct verification from exchange filings before use",null,null,[2880,"stone-india-ltd"],null)},
 ramkrishnaforgings: {name:"Ramkrishna Forgings", listed:true, role:"Forged wheels/axles - consortium (with Titagarh) for IR's 80,000-wheels/yr plant", f:fin([2320,3193,3705,4034,4238],[198,248,291,415,72],"Rs 13,073 Cr","Rs 704","RKFORGE",null,[32,3,27],[460,773],[1140,"ramkrishna-forgings-ltd"],[114,181,0.14,5.60,2.51,2.00])},
 bharatforge: {name:"Bharat Forge Ltd", listed:true, role:"Forged rail/loco engine & running-gear components (dedicated Rail business line)", f:fin([10461,12910,15682,15123,16812],[-127,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Kalyani Group flagship; rail-specific revenue not separately disclosed from consolidated figures",null,[1179,2295],null,[97.2,200,0.42,12.6,12.0,2.00])},
 timken: {name:"Timken India", listed:true, role:"Tapered roller and other bearings, including railway axle-box bearings", f:fin([null,null,null,3197,3478],[null,null,null,462,415],"Rs 24,116 Cr","Rs 3,206","TIMKEN","Not rail-exclusive - bearings sold across industrial end-markets",[7,1,13],[2800,3925],[1399,"timken-india-ltd"],[56.6,387,0.08,19.0,14.3,10.0])},
 nrbbearings: {name:"NRB Bearings", listed:true, role:"Needle-roller and other bearings across auto/industrial/rail", f:fin([null,1057,1094,1199,1335],[null,96,242,82,146],"Rs 5,183 Cr","Rs 535","NRBBEARING","Predominantly auto-component bearings; rail exposure is a minor, unquantified slice",[91,24,30],[213,549],[956,"nrb-bearings-ltd"],[34.7,99.3,1.49,18.4,15.6,2.00])},
 schaefflerindia: {name:"Schaeffler India", listed:true, role:"Bearings (INA/FAG brands) - industrial segment includes rail", f:fin([6867,7251,8232,9686,null],[879,899,939,1150,null],"Rs 62,642 Cr","Rs 4,008","SCHAEFFLER","Calendar-year (Dec) reporting; rail is a small piece of the diversified Industrial segment",[0,7,22],[3518,4468],[406,"schaeffler-india-ltd"],[50.0,393,0.87,27.3,20.2,2.00])},
 bhel: {name:"BHEL", listed:true, role:"Electric locomotives, traction motors/alternators, propulsion equipment (Bhopal)", f:fin([null,23365,23893,28339,33782],[null,654,282,534,1600],"Rs 1,45,881 Cr","Rs 419","BHEL","Govt Maharatna; rail traction/loco meaningful but not majority of a power-equipment business",[81.4,49,47],[230,447],[189,"bharat-heavy-electricals-ltd"],[60.0,75.1,0.33,9.14,6.23,2.00])},
 siemenschain: {name:"Siemens Ltd", listed:true, role:"Rail Mobility division - e-locomotives, metro trainsets, bogie plant (Aurangabad)", f:fin([13198,16138,19554,15146,null],[1089,1543,1962,2718,null],"Rs 1,38,068 Cr","Rs 3,877","SIEMENS","Fiscal year ends September; Mobility is one of several segments alongside Energy and Digital Industries",[25,22,26],[2826,4149],[1237,"siemens-ltd"],[91.8,389,0.46,21.4,19.2,2.00])},
 abbindia: {name:"ABB India", listed:true, role:"Traction transformers & equipment for Indian Railways/Alstom-built locomotives", f:fin([null,null,null,12188,13203],[null,null,null,1872,1668],"Rs 1,49,448 Cr","Rs 7,052","ABB",null,[36.3,19,31],[4638,7924],[17,"abb-india-ltd"],[97.0,441,0.56,29.9,22.4,17.0])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Motors, transformers, confirmed Vande Bharat component orders", f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER","Rail is a growing but non-disclosed sub-slice",null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 hirect: {name:"Hirect Ltd", listed:true, role:"Power-electronic converters/rectifiers and railway transformation equipment", f:fin([null,null,518,655,999],[null,null,13,37,39],"Rs 4,301 Cr","Rs 1,213","HIRECT","Small-cap; formerly Hind Rectifiers, renamed to Hirect Ltd",[43,93,66],[565,1400],null,[110,60.7,0.12,18.8,25.2,2.00])},
 kernex: {name:"Kernex Microsystems (India)", listed:true, role:"Anti-collision device (ACD)/Kavach-class train-protection systems", f:fin([7,4,20,190,430],[-17,-20,-27,50,88],"Rs 2,846 Cr","Rs 1,694","KERNEX","Explosive revenue/profit inflection FY24-FY26, directly tied to Kavach rollout orders",[56.2,57,88],[850,2586],[731,"kernex-microsystems-india-ltd"],[14.9,148,0.00,47.8,43.5,10.0])},
 quadrantfuturetek: {name:"Quadrant Future Tek Ltd", listed:true, role:"Train Control & Signalling (Kavach, electronic interlocking, digital axle counters)", f:fin([null,null,151,150,153],[null,null,12,-20,-43],"Rs 2,190 Cr","Rs 548","QUADFUTURE","Recently IPO'd (Jan 2025); currently loss-making with elevated working-capital days - high-risk/early-stage name",[-15.5,-15.4,null],[249,560],[2897925,"quadrant-future-tek-ltd"],[null,64.5,0.00,-15.5,-15.4,10.0])},
 hblengineering: {name:"HBL Engineering Ltd", listed:true, role:"Kavach/train-protection electronics, signaling, train lighting & onboard batteries", f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Renamed from HBL Power Systems, reflecting pivot toward Kavach/defence electronics",[-3.55,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.00])},
 micelectronics: {name:"MIC Electronics", listed:true, role:"LED passenger-information display systems, station displays (RDSO/RCF-approved)", f:fin([null,23,55,95,191],[null,0,62,10,-13],"Rs 1,071 Cr","Rs 36.1","MICEL","Small-cap, volatile earnings; on BSE's Long-Term ASM surveillance stage as of Dec 2024",null,[30.0,61.6],[861,"mic-electronics-ltd"],[null,8.97,0.00,8.67,-5.76,2.00])},
 escortskubota: {name:"Escorts Kubota Ltd", listed:true, role:"Dedicated Railway Equipment segment: air-brake systems, couplers, suspension", f:fin([7283,8429,9804,10244,11540],[736,637,1077,1265,2394],"Rs 31,949 Cr","Rs 2,856","ESCORTS","Company-wide figures span Agri Machinery, Construction Equipment and Railway Equipment (~11% of revenue)",[-19,-4,14],[2700,3999],[387,"escorts-kubota-ltd"],[22.4,1106,1.16,13.9,18.7,10.0])},
 rvnl: {name:"Rail Vikas Nigam Ltd", listed:true, role:"Flagship railway-project EPC PSU - new lines, doubling, electrification, metro/bridge works", f:fin([19382,20282,21879,19923,20412],[1110,1342,1551,1278,871],"Rs 43,160 Cr","Rs 207","RVNL","Govt Navratna PSU under Ministry of Railways",[-39,7,47],[195,401],[139596,"rail-vikas-nigam-ltd"],[48.0,47.1,0.83,10.8,9.02,10.0])},
 ircon: {name:"Ircon International Ltd", listed:true, role:"Rail EPC (domestic + international), electrification, bridges", f:fin([7380,10368,12514,10760,9071],[592,765,930,728,592],"Rs 9,965 Cr","Rs 106","IRCON","Miniratna PSU; revenue has declined the last two years",null,[105,186],[109297,"ircon-international-ltd"],[19.0,70.6,1.79,9.27,8.19,2.00])},
 kalpataru: {name:"Kalpataru Projects International Ltd", listed:true, role:"Diversified EPC incl. a Railways vertical, alongside power T&D and pipelines", f:fin([null,16361,19626,22316,27143],[null,435,516,567,1031],"Rs 23,758 Cr","Rs 1,391","KPIL","Railways is one of several verticals; company-wide, not rail-only, figures",null,[1007,1500],[712,"kalpataru-projects-international-ltd"],[21.4,455,0.79,18.3,13.7,10.0])},
 kec: {name:"KEC International Ltd", listed:true, role:"Power T&D + Railways + Civil + Urban Infra + Cables EPC", f:fin([13742,17282,19914,21847,23506],[332,176,347,571,606],"Rs 10,567 Cr","Rs 397","KEC","Railways is a named segment but not broken out numerically",null,[389,894],[727,"kec-international-ltd"],[17.6,231,1.39,16.5,11.4,2.00])},
 salasar: {name:"Salasar Techno Engineering", listed:true, role:"Galvanized steel structures - OHE electrification masts and railway over-bridges", f:fin([null,1005,1208,1447,1503],[null,40,53,19,18],"Rs 822 Cr","Rs 4.70","SALASAR","Small-cap; rail structures are one product line within a broader towers/EPC business",null,[4.66,11.5],[56821,"salasar-techno-engineering-ltd"],[60.0,4.77,0.00,8.13,2.13,1.00])},
 irfc: {name:"Indian Railway Finance Corporation", listed:true, role:"Financing arm - leases rolling stock and infrastructure assets to Indian Railways", f:fin([20299,23892,26650,27153,27285],[6090,6337,6412,6502,7009],"Rs 1,04,483 Cr","Rs 80.0","IRFC","NBFC structure - funds nearly all rolling-stock capex for Indian Railways",[-34,2,29],[78.1,137],[402503,"indian-railway-finance-corporation-ltd"],[14.5,43.4,2.63,5.64,12.8,10.0])},
 irctc: {name:"IRCTC", listed:true, role:"Online ticketing monopoly, catering, tourism/packages, Rail Neer", f:fin([null,3541,4260,4675,5215],[null,1006,1111,1315,1393],"Rs 36,696 Cr","Rs 459","IRCTC","Navratna PSU, near-monopoly on IR e-ticketing",[-35,-12,-10],[446,736],[167028,"indian-railway-catering-tourism-corporation-ltd"],[26.6,53.9,1.96,46.1,34.4,2.00])},
 railtel: {name:"RailTel Corporation of India", listed:true, role:"Nationwide railway telecom/fibre network, station Wi-Fi, cloud/data-centre services", f:fin([1522,1957,2568,3478,4277],[208,188,246,300,346],"Rs 8,349 Cr","Rs 260","RAILTEL","Miniratna PSU; FY25 profit milestone (~Rs 300 Cr) widely reported in press",[-31,6,15],[245,401],null,[22.5,70.5,1.25,22.8,17.1,10.0])},
 rites: {name:"RITES Ltd", listed:true, role:"Railway consultancy, design, rolling-stock export/leasing, project management", f:fin([2662,2628,2453,2196,2415],[539,571,495,424,454],"Rs 9,579 Cr","Rs 199","RITES","Navratna PSU; revenue has been gently declining over the shown period",null,[175,260],[92280,"rites-ltd"],[23.0,55.8,3.99,23.0,15.4,10.0])},
 afcons: {name:"Afcons Infrastructure", listed:true, role:"Railway and metro civil construction (EPC)", f:fin([11019,12637,13268,12548,11948],[358,411,450,487,251],"Rs 9,287 Cr","Rs 252","AFCONS","Listed Nov 2024 (IPO); 3Y/5Y stock price CAGR not applicable (insufficient trading history)",[-42,null,null],[225,479],null,[45.3,148,0.79,13.9,5.61,10.0])},
 cemindia: {name:"Cemindia Projects (fka ITD Cementation India)", listed:true, role:"Railway and metro civil construction (EPC)", f:fin([3809,5091,7718,9246,10061],[69,125,274,373,598],"Rs 21,597 Cr","Rs 1,257","CEMPRO","Renamed from ITD Cementation India Ltd to Cemindia Projects Ltd (ticker CEMPRO) in 2025 after Adani Group acquisition",[57,80,75],[481,1650],null,[35.9,140,0.24,32.8,27.8,1.00])},
 jkil: {name:"J Kumar Infraprojects", listed:true, role:"Metro and railway civil construction (EPC)", f:fin([null,4203,4879,5693,5723],[null,274,331,391,387],"Rs 3,583 Cr","Rs 474","JKIL","Consolidated P&L on Screener only available from FY2023 onward",[-24,4,21],[425,672],null,[9.21,445,0.84,18.4,12.4,5.00])},
 elgiequip: {name:"Elgi Equipments", listed:true, role:"Air compressors for railway braking and pneumatic systems", f:fin([2525,3041,3218,3510,3951],[178,371,312,350,430],"Rs 19,110 Cr","Rs 603","ELGIEQUIP",null,[24,6,24],[408,653],null,[41.2,70.4,0.45,22.1,19.0,1.00])},
 concor: {name:"Container Corporation of India", listed:true, role:"Rail freight/container logistics operator - runs container trains and ICDs under the Ministry of Railways", f:fin([7653,8169,8653,8887,9079],[1052,1173,1262,1293,1246],"Rs 35,149 Cr","Rs 462","CONCOR","Operator, not a rolling-stock/component supplier - included here for its centrality to the rail-freight ecosystem",[-12,-7,-4],[421,558],null,[28.3,170,1.86,12.6,9.81,5.00])}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var trackGroup = ctx.layerGroups[0], underframeGroup = ctx.layerGroups[1], tractionGroup = ctx.layerGroups[2], bodyGroup = ctx.layerGroups[3];

 var matTrack = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.4, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matBallast = new THREE.MeshStandardMaterial({color:0x6b6459, metalness:0.1, roughness:0.9, transparent:true, opacity:1});
 var matRail = new THREE.MeshStandardMaterial({color:0x8891a0, metalness:0.8, roughness:0.3, transparent:true, opacity:1});
 var matOHE = new THREE.MeshStandardMaterial({color:0x7c8794, metalness:0.7, roughness:0.4, transparent:true, opacity:1});
 var matPlatform = new THREE.MeshStandardMaterial({color:0xb8b0a2, metalness:0.1, roughness:0.8, transparent:true, opacity:1});
 var matUnderframe = new THREE.MeshStandardMaterial({color:0x4a5058, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matWheel = new THREE.MeshStandardMaterial({color:0x1b1e22, metalness:0.7, roughness:0.35, transparent:true, opacity:1});
 var matBrake = new THREE.MeshStandardMaterial({color:0xC9315C, metalness:0.4, roughness:0.4, transparent:true, opacity:1});
 var matTraction = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matPantograph = new THREE.MeshStandardMaterial({color:0xc7ccd4, metalness:0.7, roughness:0.3, transparent:true, opacity:1});
 var matBody = new THREE.MeshStandardMaterial({color:0xe7e9ee, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matBodyAccent = new THREE.MeshStandardMaterial({color:0xD96C2B, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matWindow = new THREE.MeshStandardMaterial({color:0x2a3542, metalness:0.5, roughness:0.2, transparent:true, opacity:1});
 var matSignal = new THREE.MeshStandardMaterial({color:0x1E9E76, emissive:0x1E9E76, emissiveIntensity:0.6, transparent:true, opacity:1});

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 // Track & corridor context
 var ballast = new THREE.Mesh(new THREE.BoxGeometry(9.6,0.1,1.1), matBallast);
 ballast.position.set(0.3,0.02,0); trackGroup.add(ballast);
 [-0.32,0.32].forEach(function(dz){
 var rail = new THREE.Mesh(new THREE.BoxGeometry(9.6,0.05,0.05), matRail);
 rail.position.set(0.3,0.08,dz); trackGroup.add(rail);
 });
 var oheMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,2.2,10), matOHE);
 oheMast.position.set(3.6,1.1,0.9); trackGroup.add(oheMast);
 var oheArm = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.04,0.04), matOHE);
 oheArm.position.set(3.1,2.05,0.45); trackGroup.add(oheArm);
 tube([[3.6,2.05,0.42],[0,2.0,0],[-3.5,1.95,0]], 0.015, matOHE, trackGroup);
 var platform = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.3,1.0), matPlatform);
 platform.position.set(4.6,0.15,-1.2); trackGroup.add(platform);
 var platformBoard = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.35,0.03), matPlatform);
 platformBoard.position.set(4.6,0.65,-1.55); trackGroup.add(platformBoard);

 // Underframe & bogies (three coaches + cab nose)
 var coachXs = [-2.9,-1.1,1.1,2.9];
 var underframe = new THREE.Mesh(new THREE.BoxGeometry(7.2,0.14,0.82), matUnderframe);
 underframe.position.set(0,0.32,0); underframeGroup.add(underframe);
 var battery = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.5), matUnderframe);
 battery.position.set(1.2,0.24,0.32); underframeGroup.add(battery);
 [-2.1,-0.1,2.0].forEach(function(bx){
 [-0.34,0.34].forEach(function(bz){
 var bogie = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.18,0.7), matUnderframe);
 bogie.position.set(bx,0.2,0); underframeGroup.add(bogie);
 [-0.2,0.2].forEach(function(wx){
 [-0.36,0.36].forEach(function(wz){
 var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.06,16), matWheel);
 wheel.rotation.z = Math.PI/2;
 wheel.position.set(bx+wx,0.18,wz); underframeGroup.add(wheel);
 });
 });
 var caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.16,0.28), matBrake);
 caliper.position.set(bx,0.18,bz*1.05); underframeGroup.add(caliper);
 });
 });

 // Traction & braking systems
 var pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.06,0.4), matPantograph);
 pantoBase.position.set(0,1.05,0); tractionGroup.add(pantoBase);
 tube([[0,1.05,0.1],[0.15,1.7,0.05],[0,2.0,0]], 0.02, matPantograph, tractionGroup);
 tube([[0,1.05,-0.1],[-0.15,1.7,-0.05],[0,2.0,0]], 0.02, matPantograph, tractionGroup);
 var converter = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.16,0.6), matTraction);
 converter.position.set(-1.1,0.22,-0.32); tractionGroup.add(converter);
 var tractionMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.35,14), matTraction);
 tractionMotor.rotation.z = Math.PI/2;
 tractionMotor.position.set(2.0,0.2,0.42); tractionGroup.add(tractionMotor);
 [-1.2,1.2].forEach(function(rx){
 var reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,10), matBrake);
 reservoir.rotation.x = Math.PI/2;
 reservoir.position.set(rx,0.34,0.2); tractionGroup.add(reservoir);
 });

 // Coach body & cab electronics
 coachXs.slice(0,3).forEach(function(cx, i){
 var coach = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.65,0.9), matBody);
 coach.position.set(-1.1+i*1.1,0.72,0); bodyGroup.add(coach);
 var band = new THREE.Mesh(new THREE.BoxGeometry(1.72,0.1,0.92), matBodyAccent);
 band.position.set(-1.1+i*1.1,0.42,0); bodyGroup.add(band);
 [-0.55,0,0.55].forEach(function(wx){
 var win1 = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.22,0.02), matWindow);
 win1.position.set(-1.1+i*1.1+wx,0.78,0.46); bodyGroup.add(win1);
 var win2 = win1.clone(); win2.position.z = -0.46; bodyGroup.add(win2);
 });
 });
 var nose = new THREE.Mesh(new THREE.ConeGeometry(0.5,1.0,4), matBody);
 nose.rotation.z = Math.PI/2; nose.rotation.y = Math.PI/4;
 nose.position.set(-3.2,0.72,0); bodyGroup.add(nose);
 var windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.3,0.7), matWindow);
 windshield.position.set(-3.55,0.85,0); bodyGroup.add(windshield);
 var kavachDome = new THREE.Mesh(new THREE.SphereGeometry(0.08,12,10), matSignal);
 kavachDome.position.set(-3.5,1.1,0); bodyGroup.add(kavachDome);
 var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.2,6), matSignal);
 antenna.position.set(-3.5,1.22,0); bodyGroup.add(antenna);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var underOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var tracOp = triangle(v,2);
 var bodyOp = clamp01(v-2);
 setOp(matTrack, shellOp);
 [matBallast,matRail,matOHE,matPlatform].forEach(function(m){ setOp(m, Math.max(shellOp, 0.35)); });
 [matUnderframe,matWheel,matBrake].forEach(function(m){ setOp(m, Math.max(underOp, bodyOp*0.15)); });
 [matTraction,matPantograph].forEach(function(m){ setOp(m, Math.max(tracOp, bodyOp*0.2)); });
 [matBody,matBodyAccent,matWindow].forEach(function(m){ setOp(m, Math.max(underOp, tracOp*0.15, bodyOp*0.15)); });
 setOp(matSignal, Math.max(tracOp*0.3, bodyOp));
 }
 };
 }
 };


 PRODUCTS.naval = {
 id: "naval", icon: "NV", name: "Naval Shipbuilding & Defense Shipyards",
 tagline: "Hull steel, propulsion, combat systems and the shipyards that build India's warships",
 headerTitle: "NAVAL SHIPBUILDING ANATOMY",
 headerSub: "Explore India's warship-building value chain - hull & steel, propulsion, weapons, electronics and shipyards",
 layerNames: ["Dry Dock & Hull","Propulsion & Machinery","Combat Systems & Weapons","Superstructure & Electronics"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "quarterdeck",
 views: [
 {id:"quarterdeck", label:"Quarterdeck", pos:[7.5,4.2,7.5], target:[0,0.8,0]},
 {id:"bridge", label:"Bridge", pos:[0.2,2.8,4.5], target:[1.0,1.6,0]},
 {id:"top", label:"Top", pos:[0.1,10.5,0.1], target:[0,0.7,0]},
 {id:"stern", label:"Stern / Propulsion", pos:[-6.5,2.0,3.5], target:[-2.6,0.6,0]},
 {id:"drydock", label:"Dry Dock", pos:[5.5,1.6,-4.5], target:[0,0.3,0]}
 ],
 zones: [
 {id:"shipyard", color:"#4C6EF5", label:"Warship & Submarine Construction (Shipyards)", pos:[0,1.0,0], side:"top", desc:"The shipyards that build and integrate complete frigates, destroyers, corvettes and submarines.", suppliers:["mazagondock","cochinshipyard","grse","lt_naval","titagarh_naval","hsl","gsl"]},
 {id:"hull", color:"#8B5E34", label:"Hull, Steel Plates & Structural Metallurgy", pos:[0,0.4,0.9], side:"bottom", desc:"Warship-grade steel plate, titanium and welding consumables that form the hull and pressure structures.", suppliers:["sail","midhani","adorwelding"]},
 {id:"propulsion", color:"#7A5CC7", label:"Marine Propulsion Systems & Engines", pos:[-2.6,0.6,0], side:"left", desc:"Main engines, gensets, turbines and turbine-generators that power the ship and its systems.", suppliers:["kirloskaroilengines","bhel_naval","bharatforge_naval","walchandnagar"]},
 {id:"combat", color:"#C9315C", label:"Combat Systems, Weapons, Explosives & Ammunition", pos:[0.4,1.5,0.5], side:"top", desc:"Missiles, torpedoes, naval guns and the warheads/explosives that arm the platform.", suppliers:["bdl","solarindustries","premierexplosives","zentechnologies"]},
 {id:"electronics", color:"#1E9E76", label:"Naval Electronics, Sensors, Radar & Sonar", pos:[1.2,2.3,0], side:"top", desc:"Combat management systems, radar, sonar and electronic warfare suites mounted on the mast and bridge.", suppliers:["bel_naval","datapatterns","astramicrowave","paras","apollomicro","dcxsystems","mtartech_naval","centum"]},
 {id:"components", color:"#C99A2E", label:"Specialty Marine Components", pos:[-1.0,0.35,-0.9], side:"bottom", desc:"Pumps, valves, batteries and deck machinery that keep the ship's systems running below decks.", suppliers:["kirloskarbrothers","kirloskarpneumatic","hblengineering_naval","azadengineering","knorrbremsenaval","kinecokaman_naval"]}
 ],
 suppliers: {
 mazagondock: {name:"Mazagon Dock Shipbuilders", listed:true, role:"India's largest warship builder - sole domestic yard for Scorpene submarines and major surface combatants", f:fin([4048,5733,7827,9467,11432],[514,611,1119,1937,2414],"Rs 88,727 Cr","Rs 2,200","MAZDOCK","Only listed pure-play submarine builder; monopoly-adjacent on P75 Scorpene follow-ons and P75I contention",null,[2057,2930],[305195,"mazagon-dock-shipbuilders-ltd"],[31.0,242,0.82,36.0,29.2,5.00])},
 cochinshipyard: {name:"Cochin Shipyard", listed:true, role:"Largest public shipyard - built India's indigenous aircraft carrier (IAC Vikrant), ASW corvettes", f:fin([3191,2365,3830,4820,5022],[564,305,783,827,717],"Rs 36,226 Cr","Rs 1,377","COCHINSHIP","Only Indian yard to have delivered a domestically-built aircraft carrier; also runs a ship-repair facility",null,[1187,1930],[57095,"cochin-shipyard-ltd"],[53.3,223,0.65,16.2,12.5,5.00])},
 grse: {name:"Garden Reach Shipbuilders & Engineers", listed:true, role:"Corvettes, frigates, survey vessels and fast patrol craft (Kolkata)", f:fin([1754,2561,3593,5076,7002],[190,228,357,527,748],"Rs 26,565 Cr","Rs 2,319","GRSE","Highest ROCE/ROE of the PSU shipyards; revenue grew ~6x in 5 years, largely export/ASW-craft driven",null,[1964,3339],[105874,"garden-reach-shipbuilders-engineers-ltd"],[33.2,229,0.85,42.8,31.6,10.0])},
 lt_naval: {name:"Larsen & Toubro", listed:true, role:"Only significant private-sector warship/submarine builder (Kattupalli shipyard, P-75I pressure hulls)", f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Defence & shipbuilding is a small single-digit % of L&T's total revenue - a conglomerate exposure line, not a pure-play",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 titagarh_naval: {name:"Titagarh Rail Systems", listed:true, role:"Owns Titagarh Naval Systems (Titagarh Shipyard, Kolkata) - Diving Support Craft, Bhishm-class tugboats", f:fin([1468,2780,3853,3868,3186],[-1,126,286,87,123],"Rs 11,078 Cr","Rs 823","TITAGARH","Naval shipbuilding is an emerging diversification, still small vs. its core rail rolling-stock business",[-6,1,54],[569,971],[1434,"titagarh-rail-systems-ltd"],[57.0,182,0.12,10.9,6.78,2.00])},
 sail: {name:"Steel Authority of India (SAIL)", listed:true, role:"Sole domestic producer of DMR-249A/B high-tensile warship-grade steel plate (Rourkela)", f:fin([103477,104448,105378,102479,110811],[12243,2177,3067,2372,3373],"Rs 76,415 Cr","Rs 185","SAIL","Effective monopoly on indigenous warship-grade steel; naval share of revenue not separately disclosed",null,[124,210],[1165,"steel-authority-of-india-sail-ltd"],[15.8,146,1.27,7.92,6.57,10.0])},
 midhani: {name:"Mishra Dhatu Nigam (Midhani)", listed:true, role:"Titanium alloys and maraging steel for submarine hulls and missile casings", f:fin([859,872,1073,1074,null],[177,156,92,111,null],"Rs 7,588 Cr","Rs 405","MIDHANI","Government-owned specialty metallurgy PSU, dedicated to defense/aerospace alloys",null,[267,482],[80900,"mishra-dhatu-nigam-ltd"],[56.2,81.8,0.21,11.3,8.92,10.0])},
 adorwelding: {name:"Ador Welding", listed:true, role:"Welding consumables/equipment used in shipyard hull fabrication", f:fin([661,null,1074,1123,1140],[45,null,86,60,82],"Rs 2,852 Cr","Rs 1,639","ADOR","General-industrial welding supplier, not naval-exclusive; shipyard is one of several end-markets",null,[848,1766],[31,"ador-welding-ltd"],[24.6,319,1.40,22.8,15.8,10.0])},
 kirloskaroilengines: {name:"Kirloskar Oil Engines", listed:true, role:"Marine/auxiliary diesel gensets alongside its larger industrial/agri engine business", f:fin([4022,5020,5898,6329,7701],[171,332,440,476,562],"Rs 31,100 Cr","Rs 2,137","KIRLOSENG",null,null,[866,2720],[745,"kirloskar-oil-engines-ltd"],[54.6,249,0.33,14.6,17.5,2.00])},
 bhel_naval: {name:"BHEL", listed:true, role:"Steam turbines, diesel gensets and turbo-alternators for Navy ships/frigates", f:fin([21211,23365,23893,28339,33782],[445,654,282,534,1600],"Rs 1,45,881 Cr","Rs 419","BHEL","Naval propulsion/turbine work is a small fraction of a power-equipment-dominated business",[81.4,49,47],[230,447],[189,"bharat-heavy-electricals-ltd"],[60.0,75.1,0.33,9.14,6.23,2.00])},
 bharatforge_naval: {name:"Bharat Forge", listed:true, role:"Won a Rs 425 Cr MoD contract for 12 Indian Navy turbine generators", f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Automotive forgings dominate revenue; naval turbine-generator order is a recent, small-scale entry point",null,[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 walchandnagar: {name:"Walchandnagar Industries", listed:true, role:"Specialized gearboxes/systems for shipyards and defense (also nuclear, space, sugar-machinery)", f:fin([299,322,302,259,275],[-38,20,-42,-86,-15],"Rs 1,433 Cr","Rs 211","WALCHANNAG","Chronic loss-maker with negative ROE; a distressed/turnaround situation, not a growth story",null,[131,316],[1509,"walchandnagar-industries-ltd"],[null,52.9,0.00,4.17,-4.41,2.00])},
 bdl: {name:"Bharat Dynamics", listed:true, role:"Government-owned guided-missile/torpedo maker - Varunastra heavyweight ASW torpedo, SAMs/ATGMs", f:fin([2817,2489,2369,3345,2442],[500,352,613,550,420],"Rs 43,600 Cr","Rs 1,270","BDL","Screener.in was gated for this name this session; figures cross-verified via stockanalysis.com - re-verify before publishing",null,[1086,1654],[80210,"bharat-dynamics-ltd"],null)},
 solarindustries: {name:"Solar Industries India", listed:true, role:"India's largest private explosives maker, diversifying into warheads, detonators and propellant systems", f:fin([3948,6918,6070,7540,9838],[455,811,875,1288,1737],"Rs 1,78,673 Cr","Rs 19,745","SOLARINDS","Commercial (mining) explosives are still the bulk of revenue; defense is the fastest-growing segment",null,[11641,22700],[1263,"solar-industries-india-ltd"],[89.7,694,0.06,38.1,32.6,2.00])},
 premierexplosives: {name:"Premier Explosives", listed:true, role:"Smaller explosives/detonator maker with ISRO and DRDO exposure", f:fin([199,202,272,417,388],[5,7,28,29,46],"Rs 3,658 Cr","Rs 680","PREMEXPLN",null,null,[378,830],[3116,"premier-explosives-ltd"],[106,53.8,0.07,23.0,18.8,2.00])},
 zentechnologies: {name:"Zen Technologies", listed:true, role:"Leading combat training-simulator maker incl. naval gunnery/damage-control simulators, anti-drone systems", f:fin([70,219,440,974,688],[3,50,130,299,218],"Rs 15,190 Cr","Rs 1,682","ZENTEC","Not a naval pure-play (spans all three services); revenue fell ~29% FY25-FY26 after a spike year",null,[1223,2044],[1580,"zen-technologies-ltd"],[83.6,209,0.06,16.2,10.7,1.00])},
 bel_naval: {name:"Bharat Electronics", listed:true, role:"Dominant defense electronics PSU - naval radars, sonar (HUMSA/USHUS), EW suites, combat management systems", f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL","Anchor tenant of naval electronics - best combination of scale and margin expansion in the sector",[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 datapatterns: {name:"Data Patterns (India)", listed:true, role:"Vertically-integrated defense/aerospace electronics - radars, EW, avionics, naval platform electronics", f:fin([310.9,null,null,708.4,924.8],[94.0,null,null,221.8,271.4],"Rs 24,606 Cr","Rs 4,418.80","DATAPATTNS","Screener.in was gated this session; FY23/FY24 actuals cross-verified via press releases/Groww and should be re-checked",null,[2131,5000],[755079,"data-patterns-india-ltd"],[91.83,310.08,0.23,null,15.63,2.00])},
 astramicrowave: {name:"Astra Microwave Products", listed:true, role:"RF/microwave and radar-subsystem specialist - T/R modules and RF front-ends for naval radar systems", f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,null,[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 paras: {name:"Paras Defence and Space Technologies", listed:true, role:"Optics, electro-optics, EW and space-systems maker with naval EW/optronics relevance", f:fin([183,222,254,365,477],[27,36,30,61,89],"Rs 10,646 Cr","Rs 1,321","PARAS",null,null,[580,1585],[665815,"paras-defence-and-space-technologies-ltd"],[115,90.0,0.08,17.2,12.4,5.00])},
 apollomicro: {name:"Apollo Micro Systems", listed:true, role:"Defense/aerospace embedded-electronics - avionics, torpedo/sonar-related electronics", f:fin([243,298,372,562,null],[15,19,31,56,null],"Rs 14,700 Cr","Rs 396","APOLLO","FY26 figure not yet reflected in the pulled table - refresh before publishing",[22,90,102],[180,467],[72727,"apollo-micro-systems-ltd"],[121,36.8,0.06,14.5,11.8,1.00])},
 dcxsystems: {name:"DCX Systems", listed:true, role:"System-integration and cable-harness assembly - tier-1/2 supplier into BEL and other primes", f:fin([1102,1254,1424,1084,743],[66,72,76,39,-8],"Rs 1,804 Cr","Rs 162","DCXINDIA","Revenue nearly halved and turned loss-making in FY26 - a deteriorating name despite a strong FY21-24 track record",[-37,-18,null],[153,260],[1099425,"dcx-systems-ltd"],[null,136,0.00,0.87,-0.53,2.00])},
 mtartech_naval: {name:"MTAR Technologies", listed:true, role:"Precision-engineered components primarily for space/nuclear/clean-energy, with a secondary defense component", f:fin([322,574,581,676,876],[61,103,56,53,94],"Rs 21,224 Cr","Rs 6,900","MTARTECH","More a space/nuclear/clean-energy precision-components story than a naval one specifically",null,[1824,8715],[436155,"mtar-technologies-ltd"],[156,267,0.00,15.1,12.4,10.0])},
 kirloskarbrothers: {name:"Kirloskar Brothers", listed:true, role:"India's largest pump maker - Marine & Defence vertical, supplied centrifugal pump systems for INS Taragiri", f:fin([3058,3730,4001,4492,4538],[94,236,350,419,377],"Rs 14,070 Cr","Rs 1,772","KIRLOSBROS","Confirmed direct naval pump-system supplier for INS Taragiri",null,[1333,2192],[744,"kirloskar-brothers-ltd"],[34.8,310,0.40,20.4,17.3,2.00])},
 kirloskarpneumatic: {name:"Kirloskar Pneumatic Company", listed:true, role:"Compressors, HVAC and air-conditioning systems for ships/submarines", f:fin([666,538,484,1640,1787],[62,49,37,211,254],"Rs 8,990 Cr","Rs 692","KIRLPNU","Revenue tripled FY24-FY25 - looks like a major new order/contract inflection",null,[478,1099],[2214,"kirloskar-pneumatic-company-ltd"],[34.2,96.1,0.87,29.6,22.6,1.00])},
 hblengineering_naval: {name:"HBL Engineering Ltd", listed:true, role:"Naval/submarine batteries alongside its now-dominant railway Kavach signalling business", f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Naval batteries are now a minority of a business increasingly driven by railway Kavach signalling",[-3.55,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.00])},
 azadengineering: {name:"Azad Engineering", listed:true, role:"Precision-forged/machined components for aerospace, energy and defense", f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD","Recent IPO (2024); primarily aerospace-engine and energy-turbine forgings - the weakest-evidenced naval linkage here",null,[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 hsl: {name:"Hindustan Shipyard Ltd", listed:false, role:"Government-owned (MoD) shipyard at Visakhapatnam - submarines, fleet support ships, submarine MRO", notes:["Under Project-75I contention for new-generation submarine construction","Also performs submarine MRO/life-extension work","No public market data - not listed"]},
 gsl: {name:"Goa Shipyard Ltd", listed:false, role:"Mini-ratna PSU shipyard - OPVs, fast patrol vessels, naval offshore support craft", notes:["Exports patrol vessels to friendly foreign navies","No public market data - not listed"]},
 knorrbremsenaval: {name:"Godrej & Boyce Mfg. Co.", listed:false, role:"Precision engineering conglomerate - Marine Solutions line (deck machinery, steering gear)", notes:["Also makes BrahMos airframe assemblies and precision defense components","No public market data - not listed"]},
 kinecokaman_naval: {name:"Kineco Kaman Composites (India)", listed:false, role:"Composite structures relevant to naval/defense platforms (JV between Kineco and US-based Kaman Aerospace)", notes:["Private JV; no public market data - not listed"]},
 centum: {name:"Centum Electronics", listed:true, role:"ESDM - RF/microwave modules, avionics and defense electronics; supplies naval sensor/electronics subsystems", f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Chronically weak/negative net profit and ROE despite revenue growth - priced on defense-electronics narrative, not current earnings",[83,52,58],[2044,5000],[251,"centum-electronics-ltd"],[81.1,233,0.10,25.5,-12.5,10.0])}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var dockGroup = ctx.layerGroups[0], propGroup = ctx.layerGroups[1], combatGroup = ctx.layerGroups[2], superGroup = ctx.layerGroups[3];

 var matDock = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.4, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matWater = new THREE.MeshStandardMaterial({color:0x2b4a5c, metalness:0.2, roughness:0.3, transparent:true, opacity:1});
 var matKeelBlock = new THREE.MeshStandardMaterial({color:0x6b6459, metalness:0.1, roughness:0.8, transparent:true, opacity:1});
 var matHull = new THREE.MeshStandardMaterial({color:0x7d8b99, metalness:0.5, roughness:0.4, transparent:true, opacity:1});
 var matHullPlate = new THREE.MeshStandardMaterial({color:0x8B5E34, metalness:0.4, roughness:0.5, transparent:true, opacity:1});
 var matProp = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.6, roughness:0.35, transparent:true, opacity:1});
 var matShaft = new THREE.MeshStandardMaterial({color:0xc7ccd4, metalness:0.7, roughness:0.3, transparent:true, opacity:1});
 var matGun = new THREE.MeshStandardMaterial({color:0xC9315C, metalness:0.4, roughness:0.4, transparent:true, opacity:1});
 var matMissile = new THREE.MeshStandardMaterial({color:0xC9315C, metalness:0.3, roughness:0.45, transparent:true, opacity:1});
 var matRadar = new THREE.MeshStandardMaterial({color:0x1E9E76, metalness:0.5, roughness:0.3, transparent:true, opacity:1});
 var matMast = new THREE.MeshStandardMaterial({color:0xc7ccd4, metalness:0.7, roughness:0.3, transparent:true, opacity:1});
 var matSuper = new THREE.MeshStandardMaterial({color:0xe7e9ee, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matDeck = new THREE.MeshStandardMaterial({color:0xC99A2E, metalness:0.4, roughness:0.4, transparent:true, opacity:1});

 function shapeFromPoints(pts){
 var s = new THREE.Shape();
 s.moveTo(pts[0][0], pts[0][1]);
 for (var i=1;i<pts.length;i++) s.lineTo(pts[i][0], pts[i][1]);
 s.closePath();
 return s;
 }

 // Dry dock context
 var waterline = new THREE.Mesh(new THREE.BoxGeometry(9,0.03,4), matWater);
 waterline.position.set(0,0.08,0); dockGroup.add(waterline);
 for (var kb=-2.5; kb<=2.5; kb+=1.25){
 var block = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.9), matKeelBlock);
 block.position.set(kb,0.02,0); dockGroup.add(block);
 }
 var dockWall = new THREE.Mesh(new THREE.BoxGeometry(9.2,0.6,0.2), matKeelBlock);
 dockWall.position.set(0,0.25,-2.3); dockGroup.add(dockWall);

 // Hull - lofted side-profile (flat waterline bottom, gentle sheer to a pointed bow, flat transom stern)
 // so the silhouette reads as an actual warship hull rather than a box with a cone stuck on the front.
 var hullPts = [
 [-3.3,0.18],[-3.3,0.52],[-1.6,0.60],[0.6,0.62],[2.1,0.58],[3.15,0.44],[3.7,0.28],[3.98,0.16],[3.7,0.10],[-3.3,0.10]
 ];
 var hullGeo = new THREE.ExtrudeGeometry(shapeFromPoints(hullPts), {depth:1.05, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3, curveSegments:10});
 hullGeo.translate(0,0,-0.525);
 var hullMesh = new THREE.Mesh(hullGeo, matHull);
 propGroup.add(hullMesh);
 var deckStripe = new THREE.Mesh(new THREE.BoxGeometry(6.9,0.04,1.07), matDeck);
 deckStripe.position.set(0.1,0.62,0); propGroup.add(deckStripe);
 [-0.5,0.5].forEach(function(dz){
 var plateSeam = new THREE.Mesh(new THREE.BoxGeometry(6.4,0.04,0.03), matHullPlate);
 plateSeam.position.set(0,0.34,dz); propGroup.add(plateSeam);
 });
 var waterlineStripe = new THREE.Mesh(new THREE.BoxGeometry(7.0,0.05,1.09), matHullPlate);
 waterlineStripe.position.set(0.1,0.15,0); propGroup.add(waterlineStripe);

 // Propulsion
 var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.9,10), matShaft);
 shaft.rotation.z = Math.PI/2; shaft.position.set(-3.2,0.4,0); propGroup.add(shaft);
 var propeller = new THREE.Mesh(new THREE.TorusGeometry(0.18,0.03,8,16), matProp);
 propeller.rotation.y = Math.PI/2; propeller.position.set(-3.6,0.4,0); propGroup.add(propeller);
 var engineRoom = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.4,0.8), matProp);
 engineRoom.position.set(-1.8,0.55,0); propGroup.add(engineRoom);
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.4), matProp);
 genset.position.set(-0.9,0.55,0.3); propGroup.add(genset);

 // Combat systems
 var gunTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.22,10), matGun);
 gunTurret.position.set(2.7,1.05,0); combatGroup.add(gunTurret);
 var gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.7,8), matGun);
 gunBarrel.rotation.z = Math.PI/2; gunBarrel.position.set(3.15,1.1,0); combatGroup.add(gunBarrel);
 [-0.3,0.3].forEach(function(mz){
 var missileCell = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.25,0.4), matMissile);
 missileCell.position.set(0.6,1.0,mz); combatGroup.add(missileCell);
 for (var mi=0;mi<2;mi++){
 var tube_ = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.3,8), matMissile);
 tube_.position.set(0.5+mi*0.2,1.16,mz); combatGroup.add(tube_);
 }
 });

 // Superstructure & electronics
 var bridge = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.7,0.95), matSuper);
 bridge.position.set(1.0,1.25,0); superGroup.add(bridge);
 var bridgeWindow = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.15,0.04), matDeck);
 bridgeWindow.position.set(1.0,1.5,0.48); superGroup.add(bridgeWindow);
 var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,1.1,10), matMast);
 mast.position.set(1.0,2.15,0); superGroup.add(mast);
 var radarDome = new THREE.Mesh(new THREE.SphereGeometry(0.18,14,12), matRadar);
 radarDome.position.set(1.0,2.75,0); superGroup.add(radarDome);
 var radarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.3,0.3), matRadar);
 radarPanel.position.set(1.18,2.15,0); superGroup.add(radarPanel);
 var funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.22,0.5,10), matSuper);
 funnel.position.set(-0.6,1.15,0); superGroup.add(funnel);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var propOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var combatOp = triangle(v,2);
 var superOp = clamp01(v-2);
 setOp(matDock, shellOp);
 [matWater,matKeelBlock].forEach(function(m){ setOp(m, Math.max(shellOp, 0.35)); });
 [matHull,matHullPlate,matProp,matShaft].forEach(function(m){ setOp(m, Math.max(propOp, combatOp*0.15, superOp*0.15)); });
 [matGun,matMissile].forEach(function(m){ setOp(m, Math.max(combatOp, superOp*0.2)); });
 [matSuper,matMast,matRadar,matDeck].forEach(function(m){ setOp(m, superOp); });
 }
 };
 }
 };


 PRODUCTS.aerospace = {
 id: "aerospace", icon: "AE", name: "Aerospace Component Manufacturing & MRO",
 tagline: "Forgings, composites, landing gear and engine components - and the MRO hangars that keep fleets flying",
 headerTitle: "AEROSPACE ANATOMY",
 headerSub: "Explore India's aerospace component and MRO value chain - forgings, structures, engines, avionics and hangars",
 layerNames: ["Hangar & Airframe Shell","Structure & Forgings","Engine & Landing Gear","Avionics & Cabin Systems"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "apron",
 views: [
 {id:"apron", label:"Apron", pos:[5.6,3.4,6.8], target:[0,0.7,0]},
 {id:"cockpit", label:"Cockpit", pos:[4.6,1.6,0.2], target:[3.0,1.1,0]},
 {id:"top", label:"Top", pos:[0.1,9.5,0.1], target:[0,0.7,0]},
 {id:"engine", label:"Engine Nacelle", pos:[-0.5,1.2,3.2], target:[-0.5,0.7,1.3]},
 {id:"gear", label:"Landing Gear", pos:[0.5,1.0,2.5], target:[0.3,0.3,0]}
 ],
 zones: [
 {id:"forgings", color:"#8B5E34", label:"Forgings, Castings & Special Alloys", pos:[1.6,0.85,0], side:"top", desc:"Structural and engine-grade forgings, investment castings and titanium/superalloys that feed the rest of the value chain.", suppliers:["bharatforge_aero","azadengineering_aero","ptcindustries","midhani_aero","jaykay"]},
 {id:"structures", color:"#4C6EF5", label:"Precision Machining, Composites & Aerostructures", pos:[0,0.75,0], side:"top", desc:"Machined structural parts, composite panels and aerostructure sub-assemblies such as doors and flap-tracks.", suppliers:["dynamatic","unimech","aequs","tanejaaerospace","sikainterplant","kinecokaman_aero","godrejaerospace","techeraengineering","apsisaerocom"]},
 {id:"landing_gear", color:"#C99A2E", label:"Landing Gear, Undercarriage & Actuation Systems", pos:[0.3,0.15,0], side:"bottom", desc:"Undercarriage struts, wheels/brakes and actuation systems - served almost entirely by unlisted MNC facilities in India.", suppliers:["dynamatic_gear","unimech_gear"]},
 {id:"engine", color:"#7A5CC7", label:"Aero-Engine Components & Hot-Section Parts", pos:[-0.5,0.55,1.3], side:"bottom", desc:"Turbine/compressor blades and hot-section forgings that go into jet engines and gas turbines.", suppliers:["mtartech_aero","azadengineering_aero2","bharatforge_aero2"]},
 {id:"avionics", color:"#1E9E76", label:"Avionics, Electronics, RF/Microwave & Mission Systems", pos:[3.0,1.1,0], side:"right", desc:"Radar, avionics, EW and mission electronics designed into the nose, cockpit and mission bays.", suppliers:["bel_aero","datapatterns_aero","astramicro_aero","apollomicro_aero","zentech_aero","cyientdlm","cyient","parasdefence","axiscades","rosselltechsys","dcxsystems_aero","avantel","centumelectronics_aero","digilogicsystems"]},
 {id:"mro", color:"#C9315C", label:"MRO Services (Airframe / Engine / Component)", pos:[-3.2,0.9,-2.0], side:"left", desc:"Hangars and repair lines that maintain, overhaul and life-extend aircraft, engines and components.", suppliers:["hal_mro","gmraerotechnic","tanejaaerospace_mro"]},
 {id:"integration", color:"#B5179E", label:"Systems Integration, Assembly EPC & Primes", pos:[0,1.4,-1.5], side:"left", desc:"The primes that integrate structures, engines and electronics into a complete flying platform.", suppliers:["hal_prime","bel_prime","bdl_aero","lt_aero","beml_aero","tasl","ideaforge","sigmaadvanced"]}
 ],
 suppliers: {
 bharatforge_aero: {name:"Bharat Forge", listed:true, role:"Dedicated Aerospace division - structural and engine forgings for global OEMs", f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Aerospace-specific revenue not broken out from consolidated figures",[70,23,22],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 azadengineering_aero: {name:"Azad Engineering", listed:true, role:"Precision-forged/machined turbine & compressor blades for aero engines (GE, Honeywell, Safran)", f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD",null,[75,null,null],[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 ptcindustries: {name:"PTC Industries", listed:true, role:"Titanium & superalloy investment castings - new 'Mihir' foundry for LCA Tejas and civil/defense programs", f:fin([179,219,257,308,603],[13,26,42,61,102],"Rs 32,699 Cr","Rs 21,810","PTCIL",null,[43,56,81],[14499,24143],[4156,"ptc-industries-ltd"],[260,1005,0.00,8.59,7.16,10.0])},
 midhani_aero: {name:"Mishra Dhatu Nigam (Midhani)", listed:true, role:"India's only domestic producer of titanium alloys & aerospace superalloys - sole/key supplier to HAL, ISRO, DRDO", f:fin([859,872,1073,1074,1209],[177,156,92,111,131],"Rs 7,588 Cr","Rs 405","MIDHANI","74% GoI-owned",[5,0,17],[267,482],[80900,"mishra-dhatu-nigam-ltd"],[56.2,81.8,0.21,11.3,8.92,10.0])},
 jaykay: {name:"Jaykay Enterprises", listed:true, role:"Legacy synthetics company pivoting into defense/aerospace additive manufacturing via 2025-26 acquisitions", f:fin([null,null,null,null,240],[null,null,null,null,216],"Rs 3,074 Cr","Rs 204","JAYKAY","FY26 net profit unusually close to revenue - likely includes a one-off/exceptional item; verify before use",null,[107,225],[2066,"jaykay-enterprises-ltd"],[75.4,45.7,0.00,4.76,3.56,1.00])},
 dynamatic: {name:"Dynamatic Technologies", listed:true, role:"Aerospace division machines structural parts/flap-track beams for Airbus A320, Boeing 787, GKN", f:fin([1253,1316,1429,1404,1621],[15,43,122,43,32],"Rs 8,933 Cr","Rs 13,153","DYNAMATECH",null,[90,49,35],[6716,13287],[351,"dynamatic-technologies-ltd"],[152,1251,0.08,10.2,6.67,10.0])},
 unimech: {name:"Unimech Aerospace and Manufacturing", listed:true, role:"Precision tooling, fasteners & complex machined aerostructure/engine parts for Airbus, Safran, Collins", f:fin([36,94,209,243,240],[3,23,58,83,63],"Rs 8,476 Cr","Rs 1,665","UNIMECH",null,[60,null,null],[695,1868],[2868825,"unimech-aerospace-and-manufacturing-ltd"],[118,145,0.00,11.2,7.96,5.00])},
 aequs: {name:"Aequs", listed:true, role:"Belagavi-based aerostructures manufacturer - assembles doors and machines parts for Airbus & Boeing", f:fin([null,812,965,925,1230],[null,-110,-14,-102,-113],"Rs 16,502 Cr","Rs 246","AEQUS","Aerospace order book crossed $1bn in Q1 FY27; recently IPO'd, currently loss-making",null,[113,275],[3346246,"aequs-ltd"],[null,22.2,0.00,1.69,-9.96,10.0])},
 tanejaaerospace: {name:"Taneja Aerospace and Aviation", listed:true, role:"Aerostructure component manufacturing at Hosur, TN", f:fin([31,32,30,41,40],[5,11,11,18,17],"Rs 880 Cr","Rs 345","TANAA",null,[-7,11,42],[190,415],[2893,"taneja-aerospace-aviation-ltd"],[46.0,60.6,0.72,15.6,11.4,5.00])},
 sikainterplant: {name:"Sika Interplant Systems", listed:true, role:"Engineering projects, interconnect solutions & electrical modules for Aerospace, Defence & Space", f:fin([98,60,106,148,211],[17,9,19,25,36],"Rs 2,216 Cr","Rs 1,045","SIKA","Indian Offset Partner status",[-13,78,52],[755,1359],null,[64.0,77.3,0.33,34.6,25.1,2.00])},
 dynamatic_gear: {name:"Dynamatic Technologies", listed:true, role:"Hydraulic gear pumps and actuation-adjacent machined parts feeding into landing-gear systems", f:fin([1253,1316,1429,1404,1621],[15,43,122,43,32],"Rs 8,933 Cr","Rs 13,153","DYNAMATECH","Cross-referenced from the Structures zone - no dedicated listed landing-gear pure-play found in India",[90,49,35],[6716,13287],[351,"dynamatic-technologies-ltd"],[152,1251,0.08,10.2,6.67,10.0])},
 unimech_gear: {name:"Unimech Aerospace and Manufacturing", listed:true, role:"Precision fasteners/tooling used in landing-gear assemblies", f:fin([36,94,209,243,240],[3,23,58,83,63],"Rs 8,476 Cr","Rs 1,665","UNIMECH","Cross-referenced from the Structures zone",[60,null,null],[695,1868],[2868825,"unimech-aerospace-and-manufacturing-ltd"],[118,145,0.00,11.2,7.96,5.00])},
 mtartech_aero: {name:"MTAR Technologies", listed:true, role:"Precision-engineered aero-engine/fuel-injection components (also LOX/LH2 space engine parts)", f:fin([322,574,581,676,876],[61,103,56,53,94],"Rs 21,224 Cr","Rs 6,900","MTARTECH","Supplier to Rafael, GE, Bloom Energy",[267,39,37],[1824,8715],[436155,"mtar-technologies-ltd"],[156,267,0.00,15.1,12.4,10.0])},
 azadengineering_aero2: {name:"Azad Engineering", listed:true, role:"Turbine/compressor blades are its core hot-section product (see Forgings zone)", f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD",null,[75,null,null],[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 bharatforge_aero2: {name:"Bharat Forge", listed:true, role:"Aerospace forgings division also supplies aero-engine forgings (see Forgings zone)", f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG",null,[70,23,22],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 bel_aero: {name:"Bharat Electronics", listed:true, role:"Largest defense-electronics PSU - avionics, radar, EW; JVs with Safran and Israel Aerospace Industries", f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL",null,[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 datapatterns_aero: {name:"Data Patterns (India)", listed:true, role:"Integrated defense & aerospace electronics; acquired ST Advanced Composites (2026) - aerostructures expansion", f:fin([311,453,520,708,925],[94,124,182,222,271],"Rs 24,738 Cr","Rs 4,419","DATAPATTNS",null,[66,28,null],[2131,5000],[755079,"data-patterns-india-ltd"],[91.5,310,0.23,21.9,15.2,2.00])},
 astramicro_aero: {name:"Astra Microwave Products", listed:true, role:"RF/microwave sub-systems for radar & avionics", f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,[55,57,53],[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 apollomicro_aero: {name:"Apollo Micro Systems", listed:true, role:"Mission-critical avionics/electro-mechanical sub-systems, missile & UAV electronics", f:fin([243,298,372,562,904],[15,19,31,56,107],"Rs 14,700 Cr","Rs 396","APOLLO",null,[22,90,102],[180,467],[72727,"apollo-micro-systems-ltd"],[121,36.8,0.06,14.5,11.8,1.00])},
 zentech_aero: {name:"Zen Technologies", listed:true, role:"Largest supplier of simulation/pilot & crew training systems, anti-drone systems", f:fin([70,219,440,974,688],[3,50,130,299,218],"Rs 15,190 Cr","Rs 1,682","ZENTEC",null,[12,30,52],[1223,2044],[1580,"zen-technologies-ltd"],[83.6,209,0.06,16.2,10.7,1.00])},
 cyientdlm: {name:"Cyient DLM", listed:true, role:"Electronics Manufacturing Services (EMS) for Aerospace & Defense integrated manufacturing", f:fin([null,832,1192,1520,1261],[null,32,61,68,73],"Rs 7,394 Cr","Rs 931","CYIENTDLM",null,[115,10,null],[265,1010],[1513580,"cyient-dlm-ltd"],[90.0,128,0.00,9.90,7.49,10.0])},
 cyient: {name:"Cyient Ltd", listed:true, role:"Engineering/design services - aerospace design-engineering (DET segment) for Airbus, Boeing, Safran", f:fin([4534,6016,7147,7360,7268],[522,514,703,648,463],"Rs 12,168 Cr","Rs 1,095","CYIENT",null,[-3,-14,2],[750,1226],[301,"cyient-ltd"],[29.9,511,1.46,12.3,8.61,5.00])},
 hal_mro: {name:"Hindustan Aeronautics", listed:true, role:"ROH (Repair, Overhaul & Maintenance) segment ~1/3 of revenue - India's largest MRO by revenue", f:fin([24620,26927,30381,30981,33089],[5080,5828,7621,8364,9116],"Rs 3,21,012 Cr","Rs 4,800","HAL","Almost entirely military-aircraft MRO",[1,36,48],[3479,5150],[80502,"hindustan-aeronautics-ltd"],[34.4,614,0.94,32.0,24.0,5.00])},
 gmraerotechnic: {name:"GMR Aero Technic", listed:false, role:"Third-party airframe MRO facility, part of GMR Hyderabad International Airport Ltd (GHIAL)", notes:["Based at Rajiv Gandhi International Airport, Hyderabad - part of the GMR Hyderabad Aviation SEZ / Aerospace & Industrial Park","GMR's SEZ has a confirmed lease (signed 2023) with Safran Aircraft Engines to build an engine-MRO facility on-site","No public market data - GMR Airports Infrastructure Ltd (listed parent) does not break out Aero Technic/MRO financials separately"]},
 tanejaaerospace_mro: {name:"Taneja Aerospace and Aviation", listed:true, role:"Civil MRO hangar at Hosur, TN, capable of Boeing 737/A320 servicing", f:fin([31,32,30,41,40],[5,11,11,18,17],"Rs 880 Cr","Rs 345","TANAA","Cross-referenced from the Structures zone - the most direct listed civil-MRO exposure in India",[-7,11,42],[190,415],[2893,"taneja-aerospace-aviation-ltd"],[46.0,60.6,0.72,15.6,11.4,5.00])},
 hal_prime: {name:"Hindustan Aeronautics", listed:true, role:"Final aircraft/helicopter assembly and integration (Tejas, Su-30, ALH Dhruv)", f:fin([24620,26927,30381,30981,33089],[5080,5828,7621,8364,9116],"Rs 3,21,012 Cr","Rs 4,800","HAL",null,[1,36,48],[3479,5150],[80502,"hindustan-aeronautics-ltd"],[34.4,614,0.94,32.0,24.0,5.00])},
 bel_prime: {name:"Bharat Electronics", listed:true, role:"Systems integration for avionics/mission systems across aircraft primes", f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL",null,[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 bdl_aero: {name:"Bharat Dynamics", listed:true, role:"Missile-systems integrator adjacent to aerospace primes (not an aircraft-component supplier per se)", f:fin([2817,2489,2369,3345,2442],[500,352,613,550,420],"Rs 41,788 Cr","Rs 1,140","BDL",null,[-24,31,43],[1086,1633],[80210,"bharat-dynamics-ltd"],[80.2,116,0.43,13.9,10.2,5.00])},
 lt_aero: {name:"Larsen & Toubro", listed:true, role:"Defense & aerospace is a small segment inside a giant diversified conglomerate", f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Group-wide figures, not aerospace-segment specific - strong caveat",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 beml_aero: {name:"BEML Ltd", listed:true, role:"Defence & Aerospace is a disclosed segment but minor vs. its core mining-equipment/rail business", f:fin([4337,3899,4054,4022,4351],[129,158,282,293,141],"Rs 16,962 Cr","Rs 2,036","BEML",null,[-3,21,29],[1355,2277],[176,"beml-ltd"],[95.0,352,0.84,7.66,4.78,5.00])},
 tasl: {name:"Tata Advanced Systems Ltd (TASL)", listed:false, role:"Airbus C-295 final assembly line JV (Vadodara), UAVs, aerostructures", notes:["Part of the Tata Group's defense/aerospace arm","No public market data - not listed"]},
 kinecokaman_aero: {name:"Kineco Kaman Composites (India)", listed:false, role:"Composite structures for BAE Systems, Airbus, Boeing, Bell (JV between Kineco and Kaman Aerospace)", notes:["Based in Goa","No public market data - not listed"]},
 godrejaerospace: {name:"Godrej Aerospace", listed:false, role:"Aerostructures, launch-vehicle/satellite hardware, missile subsystems (part of Godrej & Boyce)", notes:["No public market data - not listed"]},
 parasdefence: {name:"Paras Defence and Space Technologies", listed:true, role:"Optics, EO/IR sighting systems, space-grade optics and defense electronics", f:fin([183,222,254,365,477],[27,36,30,61,89],"Rs 10,646 Cr","Rs 1,321","PARAS",null,[90,53,null],[580,1585],[665815,"paras-defence-and-space-technologies-ltd"],[115,90.0,0.08,17.2,12.4,5.0])},
 axiscades: {name:"AXISCADES Technologies", listed:true, role:"Aerospace/defense engineering design services, avionics software and systems engineering outsourcing", f:fin([610,822,955,1031,1159],[23,-5,33,75,72],"Rs 8,048 Cr","Rs 1,892","AXISCADES",null,[15,57,92],[1061,2211],[141,"axiscades-technologies-ltd"],[245,171,0.00,15.4,11.5,5.0])},
 rosselltechsys: {name:"Rossell Techsys", listed:true, role:"Aerospace/defense interconnect and wire harness manufacturing, avionics panel repair/rework/MRO", f:fin([null,217,259,485,null],[null,11,7,21,null],"Rs 5,288 Cr","Rs 1,403","ROSSTECH","Only FY24-FY26 data available; demerged from Rossell India and listed in FY24",[92,null,null],[552,1530],null,[200,41.1,0.02,11.5,15.7,2.0])},
 dcxsystems_aero: {name:"DCX Systems", listed:true, role:"Aerospace/defense cable and wiring harness manufacturing, kitting and systems integration for defense OEMs", f:fin([1102,1254,1424,1084,743],[66,72,76,39,-8],"Rs 1,804 Cr","Rs 162","DCXINDIA","FY26 swung to a net loss; ROCE/ROE currently near-zero/negative",[-37,-18,null],[153,260],[1099425,"dcx-systems-ltd"],[null,136,0.00,0.87,-0.53,2.0])},
 avantel: {name:"Avantel", listed:true, role:"Defense/aerospace satellite communication systems, radar systems and network management software", f:fin([105,154,224,249,223],[18,27,53,56,15],"Rs 4,145 Cr","Rs 156","AVANTEL",null,[-13,28,64],[117,215],[3840,"avantel-ltd"],[241,12.7,0.13,9.63,5.29,2.0])},
 centumelectronics_aero: {name:"Centum Electronics", listed:true, role:"Aerospace/defense/space electronics subsystems and EMS manufacturing", f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Volatile profitability, net losses in 3 of last 5 years",[83,52,58],[2044,5000],[251,"centum-electronics-ltd"],[81.1,233,0.10,25.5,-12.5,10.0])},
 digilogicsystems: {name:"Digilogic Systems", listed:true, role:"Automated Test Equipment (ATE) systems, radar systems integration and support for defense/aerospace (BSE SME)", f:fin([40,56,52,72,77],[1,2,2,8,10],"Rs 494 Cr","Rs 171","DIGILOGIC",null,[null,null,null],[73.0,215],null,[50.0,37.3,0.00,18.6,14.0,2.0])},
 techeraengineering: {name:"TechEra Engineering (India)", listed:true, role:"Precision tooling, jigs/fixtures and automation systems for aerospace and defense manufacturing (NSE SME)", f:fin([null,null,null,null,48.5],[null,null,null,null,2.77],"Rs 267 Cr","Rs 162","TECHERA","NSE SME listing (2024 IPO); only FY26 full-year figures publicly available",[null,null,null],[128,326],[2663457,"techera-engineering-india-ltd"],[96.3,31.8,0.00,8.59,5.41,10.0])},
 apsisaerocom: {name:"Apsis Aerocom", listed:true, role:"Precision-machined components and assemblies for aerospace, defense and healthcare industries (NSE SME)", f:fin([null,null,null,null,30.65],[null,null,null,null,7.51],"Rs 737 Cr","Rs 612","APSISAERO","NSE SME, incorporated 2022; only FY26 full-year figures publicly available",[null,null,null],[147,625],[3449240,"apsis-aerocom-ltd"],[97.8,40.6,0.00,32.0,25.5,10.0])},
 ideaforge: {name:"ideaForge Technology", listed:true, role:"Unmanned Aircraft Systems (UAVs/drones) for defense and civil surveillance, systems integration", f:fin([159,186,314,161,226],[44,32,45,-62,-17],"Rs 3,629 Cr","Rs 730","IDEAFORGE","Sharp FY25 revenue/profit decline followed by partial FY26 recovery; still loss-making",[46,-7,null],[366,997],null,[923,138,0.00,-2.81,-3.34,10.0])},
 sigmaadvanced: {name:"Sigma Advanced Systems", listed:true, role:"Claims Tier-1 integrated aerospace and defence manufacturing (UK + India)", f:fin([52,2,0,107,492],[5,9,-13,-14,268],"Rs 17,967 Cr","Rs 946","SIGMAADV","CAUTION: 2026 reverse-merger conversion of former telecom-software shell Megasoft Ltd; FY22-25 figures are the legacy shell's numbers, not the aerospace business - do not treat pre-FY26 as organic history",[500,167,119],[139,987],[854,"sigma-advanced-systems-ltd"],[108,26.6,0.00,11.7,-4.03,10.0])}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var hangarGroup = ctx.layerGroups[0], structGroup = ctx.layerGroups[1], engineGroup = ctx.layerGroups[2], avioGroup = ctx.layerGroups[3];

 var matHangar = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.4, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matApron = new THREE.MeshStandardMaterial({color:0x6b6459, metalness:0.1, roughness:0.85, transparent:true, opacity:1});
 var matToolCart = new THREE.MeshStandardMaterial({color:0xC9315C, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matFuselage = new THREE.MeshStandardMaterial({color:0xe7e9ee, metalness:0.3, roughness:0.35, transparent:true, opacity:1});
 var matSpar = new THREE.MeshStandardMaterial({color:0x8B5E34, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matWing = new THREE.MeshStandardMaterial({color:0x4C6EF5, metalness:0.3, roughness:0.4, transparent:true, opacity:1});
 var matGear = new THREE.MeshStandardMaterial({color:0xC99A2E, metalness:0.6, roughness:0.35, transparent:true, opacity:1});
 var matWheel = new THREE.MeshStandardMaterial({color:0x1b1e22, metalness:0.5, roughness:0.5, transparent:true, opacity:1});
 var matNacelle = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.5, roughness:0.35, transparent:true, opacity:1});
 var matFan = new THREE.MeshStandardMaterial({color:0xc7ccd4, metalness:0.7, roughness:0.3, transparent:true, opacity:1});
 var matAvionics = new THREE.MeshStandardMaterial({color:0x1E9E76, emissive:0x1E9E76, emissiveIntensity:0.5, transparent:true, opacity:1});
 var matWindow = new THREE.MeshStandardMaterial({color:0x2a3542, metalness:0.5, roughness:0.2, transparent:true, opacity:1});

 // Hangar / apron context
 var apron = new THREE.Mesh(new THREE.BoxGeometry(9,0.05,7), matApron);
 apron.position.set(0,0.02,0); hangarGroup.add(apron);
 var hangarWall = new THREE.Mesh(new THREE.BoxGeometry(0.2,2.6,6), matApron);
 hangarWall.position.set(-3.6,1.3,-1.0); hangarGroup.add(hangarWall);
 var toolCart = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.35), matToolCart);
 toolCart.position.set(-3.0,0.3,-2.5); hangarGroup.add(toolCart);

 // Structure & forgings: fuselage barrel + wing spars
 var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,3.6,16), matFuselage);
 fuselage.rotation.z = Math.PI/2; fuselage.position.set(0,0.75,0); structGroup.add(fuselage);
 var nose = new THREE.Mesh(new THREE.ConeGeometry(0.42,0.9,16), matFuselage);
 nose.rotation.z = Math.PI/2; nose.position.set(2.25,0.75,0); structGroup.add(nose);
 var tailcone = new THREE.Mesh(new THREE.ConeGeometry(0.42,0.9,16), matFuselage);
 tailcone.rotation.z = -Math.PI/2; tailcone.position.set(-2.25,0.75,0); structGroup.add(tailcone);
 var wingSpar = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,3.4), matSpar);
 wingSpar.position.set(0,0.55,0); structGroup.add(wingSpar);
 var wing = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.06,3.6), matWing);
 wing.position.set(0,0.5,0); structGroup.add(wing);
 var tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,1.4), matWing);
 tailWing.position.set(-2.1,1.05,0); structGroup.add(tailWing);
 var fin_ = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.06), matWing);
 fin_.position.set(-2.1,1.35,0); structGroup.add(fin_);

 // Landing gear + engine nacelle
 [-0.5,0.5].forEach(function(gz){
 var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.5,8), matGear);
 strut.position.set(0.3,0.28,gz*1.2); engineGroup.add(strut);
 var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.1,14), matWheel);
 wheel.rotation.x = Math.PI/2; wheel.position.set(0.3,0.14,gz*1.2); engineGroup.add(wheel);
 });
 var noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,8), matGear);
 noseStrut.position.set(1.7,0.32,0); engineGroup.add(noseStrut);
 var noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.09,14), matWheel);
 noseWheel.rotation.x = Math.PI/2; noseWheel.position.set(1.7,0.14,0); engineGroup.add(noseWheel);

 [-1.2,1.2].forEach(function(ez){
 var nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.9,16), matNacelle);
 nacelle.rotation.z = Math.PI/2; nacelle.position.set(0.1,0.35,ez); engineGroup.add(nacelle);
 var fanFace = new THREE.Mesh(new THREE.CircleGeometry(0.2,16), matFan);
 fanFace.rotation.y = Math.PI/2; fanFace.position.set(0.55,0.35,ez); engineGroup.add(fanFace);
 });

 // Avionics & cabin systems
 var cockpitWindow = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.14,0.6), matWindow);
 cockpitWindow.position.set(2.0,0.95,0); avioGroup.add(cockpitWindow);
 [-0.9,-0.3,0.3,0.9].forEach(function(cx){
 var cabinWin = new THREE.Mesh(new THREE.CircleGeometry(0.08,10), matWindow);
 cabinWin.rotation.y = Math.PI/2; cabinWin.position.set(cx,0.85,0.42); avioGroup.add(cabinWin);
 });
 var radome = new THREE.Mesh(new THREE.ConeGeometry(0.3,0.5,12), matAvionics);
 radome.rotation.z = Math.PI/2; radome.position.set(2.55,0.75,0); avioGroup.add(radome);
 var antenna = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.06,0.25), matAvionics);
 antenna.position.set(0,1.0,0); avioGroup.add(antenna);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var structOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var engOp = triangle(v,2);
 var avioOp = clamp01(v-2);
 setOp(matHangar, shellOp);
 [matApron,matToolCart].forEach(function(m){ setOp(m, Math.max(shellOp, 0.35)); });
 [matFuselage,matSpar,matWing].forEach(function(m){ setOp(m, Math.max(structOp, engOp*0.15, avioOp*0.15)); });
 [matGear,matWheel,matNacelle,matFan].forEach(function(m){ setOp(m, Math.max(engOp, avioOp*0.2)); });
 [matAvionics,matWindow].forEach(function(m){ setOp(m, avioOp); });
 }
 };
 }
 };


 PRODUCTS.telecom5g = {
 id: "telecom5g", icon: "5G", name: "5G/6G Telecom Buildout",
 tagline: "Towers, small cells, antennas, fiber and the network gear behind India's mobile buildout",
 headerTitle: "5G/6G TELECOM ANATOMY",
 headerSub: "Explore India's telecom infrastructure buildout - towers, fiber, RAN equipment, antennas and power systems",
 layerNames: ["Ground & Fiber Duct","Tower Structure","Active Network Equipment","Antennas & Power Systems"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "streetside",
 views: [
 {id:"streetside", label:"Streetside", pos:[7.0,4.2,7.0], target:[0,1.6,0]},
 {id:"top", label:"Top", pos:[0.1,10.5,0.1], target:[0,1.6,0]},
 {id:"cabinet", label:"Equipment Cabinet", pos:[2.2,1.0,2.2], target:[1.2,0.6,1.2]},
 {id:"antennas", label:"Antenna Array", pos:[1.5,3.6,0.2], target:[0,3.0,0]},
 {id:"underground", label:"Fiber Duct", pos:[3.2,1.0,-2.5], target:[1.5,0.05,-1.0]}
 ],
 zones: [
 {id:"towers", color:"#4C6EF5", label:"Telecom Towers & Passive Infrastructure", pos:[0,1.8,0], side:"top", desc:"The lattice/monopole structures and passive infrastructure (incl. tower InvITs) leased to operators.", suppliers:["industowers","altiusinvit","digifibretrust","gtlinfra","suyogtelematics","skipper_telecom","salasar_telecom"]},
 {id:"fiber", color:"#8B5E34", label:"Optical Fiber & Cable Manufacturing", pos:[1.5,0.05,-1.0], side:"bottom", desc:"Glass fiber and OFC cables that carry backhaul and access traffic to and from the tower.", suppliers:["sterlitetech","hfcl_fiber","vindhyatelelinks","birlacable","finolexcables_telecom","akshoptifibre"]},
 {id:"ran", color:"#7A5CC7", label:"RAN, Active Network Equipment & Switching", pos:[1.2,0.6,1.2], side:"right", desc:"The base-station cabinet, packet-transport and routing gear that processes traffic at the site.", suppliers:["tejasnetworks","itilimited","frogcellsat","kronecomm"]},
 {id:"antennas", color:"#1E9E76", label:"Antennas, RF & Microwave Components", pos:[0,3.0,0], side:"top", desc:"Base-station antenna panels, RF front-end modules and microwave backhaul radios mounted on the tower.", suppliers:["astramicro_telecom","centumelectronics_telecom","bel_telecom","optiemus"]},
 {id:"epc", color:"#C99A2E", label:"Telecom EPC, Installation & Infrastructure Services", pos:[-1.5,1.0,1.5], side:"left", desc:"The turnkey design-build-install contractors that erect towers and lay fiber for operators.", suppliers:["lt_telecom","railtel_telecom","bondada","pacedigitek","sarteleventure"]},
 {id:"ems", color:"#C9315C", label:"Electronics Manufacturing Services (EMS)", pos:[2.0,1.3,-0.5], side:"right", desc:"Contract manufacturers assembling telecom PCBs, routers and RAN sub-assemblies for OEMs.", suppliers:["dixontech","kaynestech_telecom","avalontech","syrmasgs","micelectronics_telecom"]},
 {id:"power", color:"#D96C2B", label:"Power & Energy Systems for Towers", pos:[-0.9,0.4,0.9], side:"bottom", desc:"Backup batteries, diesel gensets and solar-hybrid power systems that keep sites running through outages.", suppliers:["hblpower_telecom","amararaja_telecom","exide_telecom","cummins_telecom"]},
 {id:"operators", color:"#B5179E", label:"Telecom Operators (Demand Side)", pos:[-2.4,0.5,-1.2], side:"left", desc:"The carriers whose capex programs drive demand across every other zone in this value chain.", suppliers:["bhartiairtel_op","vodafoneidea","bhartihexacom","tatacomm_op","reliance_jio","ttml","mtnl","rcom_legacy"]}
 ],
 suppliers: {
 industowers: {name:"Indus Towers", listed:true, role:"Largest listed independent tower company (Bharti Airtel controlling shareholder post Vodafone exit)", f:fin([27717,28382,28601,30123,32493],[6373,2040,6036,9932,7145],"Rs 98,839 Cr","Rs 374.65","INDUSTOWER",null,null,[338,482],[629,"indus-towers-ltd"],[13.8,150,3.74,19.5,18.6,10.0])},
 altiusinvit: {name:"Altius Telecom Infrastructure Trust", listed:true, role:"Tower InvIT - acquired American Tower Corp's India business (~Rs 13,288 Cr, Sept 2024), rebranded 'Elevar'", f:fin([9786,11100,12878,19454,24165],[547,797,1119,840,1107],"Rs 53,330 Cr","Rs 175","ALTIUSINVIT","FY26 is its first full year of integrated operations post the ATC India acquisition",null,[142,180],null,[42.2,37.6,2.30,8.60,8.07,150])},
 digifibretrust: {name:"Digital Fibre Infrastructure Trust", listed:true, role:"InvIT holding Reliance Jio's fiber network assets (sibling structure to Altius on the tower side)", f:fin([11712,15496,16729,18553,18568],[-2582,-1089,-808,-332,-273],null,null,"DIGIFIBRE","Illiquid; market cap/price not found in this research pass",null,null,null,[null,null,null,6.51,2.93,100])},
 gtlinfra: {name:"GTL Infrastructure", listed:true, role:"~26,000 towers across 22 telecom circles", f:fin([1463,1458,1372,1344,1372],[-1475,-1817,-681,-875,779],"Rs 1,435 Cr","Rs 1.12","GTLINFRA","Long-distressed independent tower co with negative net worth; FY26 return to profit may include one-offs",null,[0.96,1.67],null,[null,-4.07,0.00,null,null,10.0])},
 suyogtelematics: {name:"Suyog Telematics", listed:true, role:"Installs/commissions/services towers and OFC systems for telcos", f:fin([null,null,167,193,222],[null,null,63,41,63],"Rs 761 Cr","Rs 649","SUYOG",null,null,[525,921],null,[12.6,418,0.15,14.6,14.2,10.0])},
 sterlitetech: {name:"Sterlite Technologies", listed:true, role:"Pure-play optical fiber/cable and networking products maker", f:fin([5437,6925,4083,3996,4745],[45,127,-57,-123,56],"Rs 43,037 Cr","Rs 837","STLTECH","Demerged its Global Services Business into STL Networks (effective 31-Mar-2025); 52W range and P/E reflect a large re-rating, likely AI-datacenter fiber demand speculation - flag as a volatility outlier",null,[84.6,912],[1299,"sterlite-technologies-ltd"],[182,46.5,0.00,7.65,1.24,2.00])},
 hfcl_fiber: {name:"HFCL", listed:true, role:"Optical fiber/cable, telecom equipment (routers, 5G RAN components) and defense electronics", f:fin([4727,4743,4465,4065,4949],[326,318,338,173,329],"Rs 32,337 Cr","Rs 211.27","HFCL",null,null,[59.8,257],[543,"hfcl-ltd"],[56.5,32.0,0.09,10.8,6.98,1.00])},
 vindhyatelelinks: {name:"Vindhya Telelinks", listed:true, role:"Telecom/railway/solar/specialty cables and IP-1 fiber network investments (MP Birla Group)", f:fin([1324,2900,4088,4054,3593],[193,185,283,203,220],"Rs 3,223 Cr","Rs 2,720","VINDHYATEL",null,null,[960,2953],[1486,"vindhya-telelinks-ltd"],[13.7,3548,0.22,8.15,5.31,10.0])},
 birlacable: {name:"Birla Cable", listed:true, role:"OFC, copper telecom cables, structured copper and specialty cables", f:fin([null,792,686,662,771],[null,33,22,5,17],"Rs 1,086 Cr","Rs 362","BIRLACABLE",null,null,[104,419],null,[23.5,93.6,0.34,8.96,6.26,10.0])},
 finolexcables_telecom: {name:"Finolex Cables", listed:true, role:"Primarily electrical/building wires; communication cables (LAN/telecom copper) are a minority segment", f:fin([3768,4481,5014,5319,6321],[599,504,652,701,714],"Rs 22,343 Cr","Rs 1,461","FINCABLES","Partial/secondary exposure - electrical wires dominate revenue",null,[701,1498],[416,"finolex-cables-ltd"],[27.9,398,0.62,16.0,12.3,2.00])},
 akshoptifibre: {name:"Aksh Optifibre", listed:true, role:"Pure-play OFC maker in structural decline", f:fin([316,286,220,130,127],[0,-14,-71,-26,-13],"Rs 115 Cr","Rs 7.04","AKSHOPTFBR","Five straight years of shrinking revenue and losses - a distressed/turnaround-watch name",null,[3.81,9.06],null,[null,-0.79,0.00,-6.63,null,5.00])},
 tejasnetworks: {name:"Tejas Networks", listed:true, role:"Leading indigenous optical/packet-transport and RAN equipment maker (Tata Group-controlled, BSNL key customer)", f:fin([551,920,2471,8923,1103],[-63,-36,63,447,-909],"Rs 8,973 Cr","Rs 504","TEJASNET","The FY25-to-FY26 swing from Rs 8,923 Cr revenue/Rs 447 Cr profit to a Rs 909 Cr loss reflects lumpy government order-cycle recognition, not steady-state economics - single-year snapshots are misleading here",null,[294,645],[54898,"tejas-networks-ltd"],[null,165,0.50,-14.6,-26.8,10.0])},
 itilimited: {name:"ITI Limited", listed:true, role:"Govt PSU telecom equipment maker - GPON, telecom/defense electronics", f:fin([1861,1395,1264,3616,2184],[120,-360,-569,-215,293],"Rs 24,358 Cr","Rs 253","ITI","High debtor days (~486); market cap looks rich relative to revenue - likely PSU-rerating/speculative rather than fundamentals-driven",null,[233,373],null,[null,19.8,0.00,1.41,-8.86,10.0])},
 frogcellsat: {name:"Frog Innovations (Frog Cellsat)", listed:true, role:"In-building coverage (DAS/repeaters) and mobile network accessories for 2G-5G", f:fin([133,133,158,219,106],[15,15,16,24,-2],"Rs 400 Cr","Rs 257.65","FROG","Sharp FY25-to-FY26 revenue collapse (-52%) into a small loss - possible order-timing air-pocket",null,[124,305],null,[null,102,0.00,-1.91,-0.71,10.0])},
 kronecomm: {name:"ADC India Communications (Krone Communications)", listed:true, role:"Structured cabling and copper/fiber physical connectivity products for telecom/enterprise networks", f:fin([121,143,179,187,200],[8,8,21,24,19],"Rs 1,098 Cr","Rs 2,388","KRONECOMM","Debt-free; rising debtor days (66 to 82) is a mild working-capital flag",null,[1150,2678],null,[48.8,188,0.00,21.5,21.8,10.0])},
 astramicro_telecom: {name:"Astra Microwave Products", listed:true, role:"RF/microwave subsystems for defense and telecom", f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,[55,57,53],[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 centumelectronics_telecom: {name:"Centum Electronics", listed:true, role:"RF/microelectronics/space-grade electronics for defense and telecom", f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Loss-making in 3 of the last 5 years despite a very rich market cap - a valuation-vs-fundamentals disconnect",[83,52,58],[2044,5000],null,[81.1,233,0.10,25.5,-12.5,10.0])},
 bel_telecom: {name:"Bharat Electronics", listed:true, role:"Growing 5G/telecom RF-component business alongside its much larger defense-electronics base", f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL","Telecom/5G work is a smaller, strategically-notable slice of a much larger defense revenue base",[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 optiemus: {name:"Optiemus Infracom", listed:true, role:"Mobile handset distribution (Nokia/Samsung brands); Optiemus Electronics arm does EMS/antenna-adjacent manufacturing", f:fin([472,1174,1528,1890,1769],[-1,42,57,63,66],"Rs 5,133 Cr","Rs 569","OPTIEMUS","Partial exposure - core business is handset distribution, not antenna manufacturing",null,[288,851],null,[94.1,87.6,0.00,10.9,9.15,10.0])},
 lt_telecom: {name:"Larsen & Toubro", listed:true, role:"Telecom EPC/Smart World & Communication is one small division inside a giant infra/engineering conglomerate", f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Do not attribute company-level financials to telecom exposure - it is a minor, undisclosed segment",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 railtel_telecom: {name:"RailTel Corporation of India", listed:true, role:"Navratna PSU operating one of India's largest neutral telecom infrastructure networks along railway right-of-way", f:fin([1548,1964,null,null,null],[209,189,null,null,null],"Rs 8,349 Cr","Rs 260.15","RAILTEL","FY24-FY26 figures should be re-verified directly against annual reports - only FY22/FY23 and TTM (~Rs 2,225 Cr/Rs 215 Cr) were confirmed",null,[245,401],null,[22.5,53.7,1.25,16.2,12.0,10.0])},
 bondada: {name:"Bondada Engineering", listed:true, role:"EPC + O&M for telecom AND solar sites", f:fin([334,371,801,1571,2843],[10,18,46,113,211],"Rs 3,097 Cr","Rs 277.30","BONDADA","Solar is now ~79% of FY26 revenue - telecom exposure is a shrinking share of a fast-growing company",null,[215,503],null,[14.2,62.2,0.00,39.4,35.7,2.00])},
 pacedigitek: {name:"Pace Digitek", listed:true, role:"Telecom-infra EPC + solar; also designs/installs DC power systems and batteries for towers", f:fin([406,503,2434,2439,2641],[12,17,230,279,307],"Rs 3,591 Cr","Rs 166.35","PACEDIGITK","Sharp FY23-to-FY24 revenue step-up suggests a large contract/consolidation event worth verifying",null,[140,232],null,[12.0,102,0.00,21.4,17.6,2.00])},
 sarteleventure: {name:"Sar Televenture", listed:true, role:"Small EPC contractor for 4G/5G tower construction", f:fin([5,32,124,350,522],[0,1,16,47,72],"Rs 460 Cr","Rs 91.65","SARTELE","Explosive but early-stage revenue growth (5-yr CAGR ~256%) reflects a low base - treat growth rates cautiously",null,[72.4,265],null,[6.40,193,0.00,8.84,7.95,2.00])},
 dixontech: {name:"Dixon Technologies", listed:true, role:"India's largest listed EMS player; telecom/networking gear (routers, set-top boxes) is one of several segments", f:fin([10697,12192,17691,38860,48873],[190,255,375,1233,1644],"Rs 81,907 Cr","Rs 13,390","DIXON","Partial exposure - mobile-phone EMS dominates the FY25/FY26 revenue jump",null,[9600,17640],[60393,"dixon-technologies-india-ltd"],[43.6,769,0.07,29.2,18.9,2.00])},
 kaynestech_telecom: {name:"Kaynes Technology India", listed:true, role:"Diversified EMS (auto, industrial, telecom, medical) with telecom/networking as one vertical", f:fin([706,1126,1805,2722,3626],[42,95,183,293,364],"Rs 24,536 Cr","Rs 3,650","KAYNES",null,null,[2995,7705],[1124672,"kaynes-technology-india-ltd"],[70.6,708,0.00,12.7,8.69,10.0])},
 avalontech: {name:"Avalon Technologies", listed:true, role:"EMS for industrials/telecom/clean-energy", f:fin([841,945,867,1098,1603],[67,52,28,63,113],"Rs 15,574 Cr","Rs 2,328","AVALON",null,null,[777,2620],null,[117,108,0.00,19.3,16.5,2.00])},
 syrmasgs: {name:"Syrma SGS Technology", listed:true, role:"Broad EMS/ODM including telecom & networking modules", f:fin([1267,2048,3154,3787,4819],[79,123,124,184,346],"Rs 33,410 Cr","Rs 1,733","SYRMA","Strong FY26 profit inflection (+88% YoY) alongside a 40% 5-yr revenue CAGR",null,[634,1804],null,[90.0,148,0.09,16.8,14.0,10.0])},
 micelectronics_telecom: {name:"MIC Electronics", listed:true, role:"LED lighting/display systems and telecom equipment (also railway and EV-charging electronics)", f:fin([45,23,55,95,191],[3,0,62,10,-13],"Rs 1,071 Cr","Rs 36.10","MICEL","Extremely volatile earnings; FY24's profit spike on modest revenue looks like a one-off gain",null,[30.0,61.6],[861,"mic-electronics-ltd"],[null,8.97,0.00,8.67,-5.76,2.00])},
 hblpower_telecom: {name:"HBL Power Systems", listed:true, role:"Telecom/industrial batteries, including 20,000+ installations for the BharatNet Wi-Fi project", f:fin([1236,1369,null,null,null],[94,98,null,null,null],"Rs 12,984 Cr","Rs 468","HBLPOWER","FY24-FY26 figures need direct re-verification from company filings; TTM (~Rs 2,026 Cr/Rs 234 Cr) implies a strong recent ramp",null,[99.8,612],[526,"hbl-power-systems-ltd"],[54.8,38.2,0.10,13.7,10.7,1.00])},
 amararaja_telecom: {name:"Amara Raja Energy & Mobility", listed:true, role:"Industrial/automotive battery major; telecom/UPS backup batteries are part of its industrial segment", f:fin([8697,10392,11708,12846,13814],[513,731,934,945,896],"Rs 14,495 Cr","Rs 792","ARE&M","Partial exposure - automotive batteries dominate group revenue",null,[670,1023],null,[19.8,442,1.34,12.2,7.18,1.00])},
 exide_telecom: {name:"Exide Industries", listed:true, role:"Automotive/industrial battery major; telecom/industrial UPS batteries are a minority segment", f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,010 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain; partial exposure - automotive dominates",null,[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 cummins_telecom: {name:"Cummins India", listed:true, role:"Leading listed diesel-genset/engine maker; DG sets are widely used for tower backup power", f:fin([6171,7772,9000,10391,12143],[934,1228,1721,2000,2362],"Rs 1,37,075 Cr","Rs 4,945","CUMMINSIND","Indirect exposure - telecom-specific DG revenue is not separately disclosed",null,[3803,6143],[297,"cummins-india-ltd"],[56.2,306,1.33,39.5,30.2,2.00])},
 bhartiairtel_op: {name:"Bharti Airtel", listed:true, role:"India's largest listed telco by market cap", f:fin([116547,139145,149982,172985,210973],[8305,12287,8558,37481,33823],"Rs 11,14,378 Cr","Rs 1,785","BHARTIARTL","FY25's profit jump reflects a large one-off/deferred-tax-related gain, per common analyst commentary",null,[1740,2175],[187,"bharti-airtel-ltd"],[35.7,245,1.34,17.6,20.3,5.00])},
 vodafoneidea: {name:"Vodafone Idea", listed:true, role:"Third major private telco, historically loss-making with negative net worth", f:fin([38516,42177,42652,43572,44873],[-28245,-29301,-31238,-27384,34552],"Rs 1,54,497 Cr","Rs 14.26","IDEA","Returned to a large reported profit in FY26 substantially via other-income/one-offs (likely AGR-relief or conversion accounting) - not a fundamental turnaround",null,[8.02,15.8],[589,"vodafone-idea-ltd"],[null,-3.30,0.00,-1.72,null,10.0])},
 bhartihexacom: {name:"Bharti Hexacom", listed:true, role:"Bharti Airtel subsidiary (listed 2024) - second-largest wireless operator in Rajasthan and Northeast circles", f:fin([5405,6579,7089,8548,9354],[1675,549,504,1494,1733],"Rs 74,090 Cr","Rs 1,481.80","BHARTIHEXA","Operating margins above 50% in recent quarters",null,[1430,1956],null,[40.1,143,1.21,21.4,26.0,5.00])},
 tatacomm_op: {name:"Tata Communications", listed:true, role:"Global enterprise/wholesale connectivity and data-centre operator rather than a retail mobile carrier", f:fin([16725,17838,20969,23109,24803],[1485,1801,970,1837,997],"Rs 47,510 Cr","Rs 1,666.50","TATACOMM","Volatile net profit likely reflects data-centre business (STT GDC) divestment/accounting effects",null,[1322,2110],[1357,"tata-communications-ltd"],[45.7,121,1.05,14.6,32.6,10.0])},
 reliance_jio: {name:"Jio Platforms (Reliance Jio Infocomm)", listed:false, role:"India's largest telco by subscribers - wholly-owned unlisted subsidiary of listed Reliance Industries", notes:["Reliance Industries (listed parent, RELIANCE) FY22-26 consolidated revenue/net profit: Rs 6,94,673/67,845 Cr to Rs 10,55,780/95,754 Cr - RIL is a diversified conglomerate (O2C, retail, digital services) and does not separately disclose Jio's standalone P&L","Developed an indigenous O-RAN-based 5G core/RAN technology stack in-house","BSNL (wholly Govt-owned, unlisted) is the other major operator, using Tejas Networks/ITI/C-DOT indigenous stack for its own 4G/5G rollout"]},
 skipper_telecom: {name:"Skipper Ltd", listed:true, role:"Galvanized lattice steel towers, monopoles and tower structures for telecom and power transmission", f:fin([1707,1980,3282,4624,5553],[25,36,82,149,213],"Rs 6,225 Cr","Rs 551","SKIPPER",null,[8,37,48],[300,617],[1728,"skipper-ltd"],[26.8,132,0.02,23.6,16.6,1.0])},
 salasar_telecom: {name:"Salasar Techno Engineering", listed:true, role:"Telecom tower and steel structure fabrication, galvanizing, monopoles for telcos and power T&D", f:fin([719,1005,1208,1447,1503],[31,40,53,19,18],"Rs 822 Cr","Rs 4.70","SALASAR",null,[-48,-23,-4],[4.66,11.5],[56821,"salasar-techno-engineering-ltd"],[60.0,4.77,0.00,8.13,2.13,1.0])},
 ttml: {name:"Tata Teleservices (Maharashtra)", listed:true, role:"Tata group telecom circle operator (Maharashtra & Goa) - enterprise/fixed-line and data services since exiting retail mobile in 2019", f:fin([1094,1106,1192,1308,1160],[-1215,-1145,-1228,-1275,-215],"Rs 6,733 Cr","Rs 34.4","TTML","Standalone financials (no material subsidiaries)",[-38,-29,0],[30.1,60.1],[1423,"tata-teleservices-maharashtra-ltd"],[null,-2.87,0.00,-12.7,null,10.0])},
 mtnl: {name:"Mahanagar Telephone Nigam (MTNL)", listed:true, role:"PSU telecom operator (Delhi & Mumbai circles) - fixed-line, mobile and broadband services", f:fin([1388,1149,935,799,1130],[-2461,-2603,-2915,-3268,-3328],"Rs 1,487 Cr","Rs 23.6","MTNL",null,[-45,-10,5],[20.3,44.7],[888,"mahanagar-telephone-nigam-ltd"],[null,-476,0.00,-9.32,null,10.0])},
 rcom_legacy: {name:"Reliance Communications (RCOM)", listed:false, role:"Legacy/defunct telecom operator - historical relevance to India's pre-2019 tower/telecom ecosystem", notes:["In Corporate Insolvency Resolution Process (CIRP) under India's IBC since June 2019; NCLAT has since pushed the company toward liquidation","A resolution professional, not the board, runs the company; recent filings carry auditor qualifications","Trading status is unreliable/thinly-traded (reported suspensions on some platforms, sub-Re-1 trade-to-trade quotes on others) - no dependable current market data, shown here as a footnote only, not an active supply-chain entry"]}
 },
 build: function(ctx){
 var THREE = ctx.THREE;
 var groundGroup = ctx.layerGroups[0], towerGroup = ctx.layerGroups[1], activeGroup = ctx.layerGroups[2], antennaGroup = ctx.layerGroups[3];

 var matGroundShell = new THREE.MeshPhysicalMaterial({color:0x9FB3C8, metalness:0.1, roughness:0.4, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false});
 var matGround = new THREE.MeshStandardMaterial({color:0x6b6459, metalness:0.1, roughness:0.85, transparent:true, opacity:1});
 var matDuct = new THREE.MeshStandardMaterial({color:0x8B5E34, metalness:0.3, roughness:0.6, transparent:true, opacity:1});
 var matFiberCore = new THREE.MeshStandardMaterial({color:0xC99A2E, emissive:0xC99A2E, emissiveIntensity:0.4, transparent:true, opacity:1});
 var matTowerLeg = new THREE.MeshStandardMaterial({color:0x4C6EF5, metalness:0.6, roughness:0.35, transparent:true, opacity:1});
 var matFence = new THREE.MeshStandardMaterial({color:0x8891a0, metalness:0.4, roughness:0.6, transparent:true, opacity:1});
 var matCabinet = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.4, roughness:0.4, transparent:true, opacity:1});
 var matRRU = new THREE.MeshStandardMaterial({color:0x1E9E76, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matAntennaPanel = new THREE.MeshStandardMaterial({color:0x1E9E76, metalness:0.5, roughness:0.3, transparent:true, opacity:1});
 var matBattery = new THREE.MeshStandardMaterial({color:0xD96C2B, metalness:0.4, roughness:0.4, transparent:true, opacity:1});
 var matSolar = new THREE.MeshStandardMaterial({color:0x2a3542, metalness:0.6, roughness:0.2, transparent:true, opacity:1});

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 // Ground & fiber duct context
 var ground = new THREE.Mesh(new THREE.BoxGeometry(8,0.05,8), matGround);
 ground.position.set(0,0.02,0); groundGroup.add(ground);
 var duct = new THREE.Mesh(new THREE.BoxGeometry(3.2,0.1,0.3), matDuct);
 duct.position.set(1.5,0.05,-1.0); groundGroup.add(duct);
 tube([[3.1,0.08,-1.0],[1.5,0.08,-1.0],[0,0.08,0]], 0.02, matFiberCore, groundGroup);
 var fenceBase = new THREE.Mesh(new THREE.TorusGeometry(1.6,0.02,6,24), matFence);
 fenceBase.rotation.x = Math.PI/2; fenceBase.position.set(0,0.02,0); groundGroup.add(fenceBase);

 // Tower structure (simple lattice via 4 legs + cross braces)
 var legPositions = [[-0.35,-0.35],[0.35,-0.35],[-0.35,0.35],[0.35,0.35]];
 legPositions.forEach(function(lp){
 var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.04,3.6,8), matTowerLeg);
 leg.position.set(lp[0],1.8,lp[1]); towerGroup.add(leg);
 });
 for (var lvl=0.6; lvl<3.4; lvl+=0.7){
 var brace1 = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.02,0.02), matTowerLeg);
 brace1.position.set(0,lvl,-0.35); towerGroup.add(brace1);
 var brace2 = brace1.clone(); brace2.position.z = 0.35; towerGroup.add(brace2);
 var brace3 = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.75), matTowerLeg);
 brace3.position.set(-0.35,lvl,0); towerGroup.add(brace3);
 var brace4 = brace3.clone(); brace4.position.x = 0.35; towerGroup.add(brace4);
 }
 var compound = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.02,1.6), matFence);
 compound.position.set(0,0.06,0); towerGroup.add(compound);

 // Active network equipment: cabinet + RRUs
 var cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.85,0.4), matCabinet);
 cabinet.position.set(1.2,0.42,1.2); activeGroup.add(cabinet);
 var cabinetVent = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.1,0.42), matCabinet);
 cabinetVent.position.set(1.2,0.82,1.2); activeGroup.add(cabinetVent);
 [-0.15,0.15].forEach(function(rx){
 var rru = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.3,0.1), matRRU);
 rru.position.set(rx,2.9,-0.35); activeGroup.add(rru);
 });
 tube([[1.2,0.85,1.2],[0.6,1.5,0.6],[0,2.9,0]], 0.02, matCabinet, activeGroup);

 // Antennas & power systems
 [0,Math.PI*2/3,Math.PI*4/3].forEach(function(ang){
 var panel = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.55,0.18), matAntennaPanel);
 panel.position.set(Math.sin(ang)*0.45, 3.55, Math.cos(ang)*0.45);
 panel.rotation.y = ang;
 antennaGroup.add(panel);
 });
 var microwaveDish = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.05,16), matAntennaPanel);
 microwaveDish.rotation.z = Math.PI/2; microwaveDish.position.set(0.4,3.0,0.2); antennaGroup.add(microwaveDish);
 var battery = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.35,0.35), matBattery);
 battery.position.set(-0.9,0.18,0.9); antennaGroup.add(battery);
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.35), matBattery);
 genset.position.set(-0.9,0.15,1.4); antennaGroup.add(genset);
 var solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.03,0.4), matSolar);
 solarPanel.rotation.x = -0.3;
 solarPanel.position.set(-1.3,0.55,0.5); antennaGroup.add(solarPanel);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var towerOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var activeOp = triangle(v,2);
 var antennaOp = clamp01(v-2);
 setOp(matGroundShell, shellOp);
 [matGround,matDuct,matFiberCore,matFence].forEach(function(m){ setOp(m, Math.max(shellOp, 0.35)); });
 [matTowerLeg].forEach(function(m){ setOp(m, Math.max(towerOp, activeOp*0.15, antennaOp*0.15)); });
 [matCabinet,matRRU].forEach(function(m){ setOp(m, Math.max(activeOp, antennaOp*0.2)); });
 [matAntennaPanel,matBattery,matSolar].forEach(function(m){ setOp(m, antennaOp); });
 }
 };
 }
 };


 PRODUCTS._comingSoon = [
 {icon:"PH", name:"Smartphone", tagline:"Display, SoC, camera module & battery supply chain"},
 {icon:"LT", name:"Laptop", tagline:"Panel, battery, chipset & chassis supply chain"},
 {icon:"SL", name:"Solar module", tagline:"Cells, wafers, inverters & BOS supply chain"}
 ];

export { PRODUCTS, NEWS, ASOF, SRC, NEWS_ASOF };
