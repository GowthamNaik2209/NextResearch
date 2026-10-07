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
 // --- Industry-level narrative (data-model upgrade, matching datacenter's pattern) ---
 whyNow: "India's EV passenger-car volumes are scaling fast on falling battery costs, new domestic cell-manufacturing capacity and expanding model choice, pulling investment through the entire component stack years ahead of mass affordability.",
 thesisSummary: "The EV supply chain is the race to localize what is today mostly imported - cells, magnets and power electronics - while established auto-component makers retool existing machining, wiring and thermal lines for electric platforms.",
 featuredSignals: ["New EV model launches and price points", "Domestic battery/cell gigafactory capacity announcements (PLI-ACC)", "Public charging network buildout and utilization", "Rare-earth magnet import-substitution policy moves", "Monthly EV penetration (% of total PV sales)"],
 dataStatus: "demo",
 integratorZoneId: "oem",
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
 domains: [
 {id:"raw_materials", title:"Raw Materials & Critical Minerals", shortTitle:"Raw Materials", description:"Upstream lithium, cobalt, nickel and rare-earth feedstock that goes into cells and magnets - almost entirely imported or processed abroad today.", color:"#9C6B30", relatedDomains:["battery_energy","powertrain_drive"]},
 {id:"battery_energy", title:"Battery & Energy Storage", shortTitle:"Battery", description:"Cell chemistry, pack assembly and the charging ecosystem that store and replenish the vehicle's energy.", color:"#2E86AB", relatedDomains:["raw_materials","powertrain_drive"]},
 {id:"powertrain_drive", title:"Motor & Powertrain", shortTitle:"Powertrain", description:"The motor, power electronics and magnets that convert stored electricity into torque at the wheels.", color:"#D96C2B", relatedDomains:["battery_energy","raw_materials"]},
 {id:"vehicle_electronics", title:"Vehicle Electronics & Software", shortTitle:"Electronics", description:"BMS, wiring harness and cockpit electronics that stitch the car's systems together and present them to the driver.", color:"#1E9E76", relatedDomains:["powertrain_drive","structure_thermal"]},
 {id:"structure_thermal", title:"Structure & Thermal Management", shortTitle:"Structure", description:"Forged/machined structural components and the thermal systems that keep the battery and cabin in range.", color:"#64748B", relatedDomains:["battery_energy","vehicle_electronics"]},
 {id:"assembly_oem", title:"Assembly & OEM Integration", shortTitle:"OEM", description:"The vehicle manufacturers that design, assemble and badge the finished EV, integrating every upstream component into a saleable product.", color:"#3D5A80", relatedDomains:["vehicle_electronics","structure_thermal"]}
 ],
 zones: [

 {id:"battery", color:"#2E86AB", label:"Battery pack & cells", pos:[-0.1,0.18,0.55], side:"left", desc:"The cell chemistry and pack that store the car's energy - the flat 'skateboard' under the floor.", deepDive:true,
 domainId:"battery_energy", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The flat 'skateboard' pack under the floor that stores the vehicle's energy via lithium-ion cells and the modules/BMS wiring that bind them together.",
 whyItMatters:"Battery cost and chemistry are the single biggest lever on an EV's price and range, and the layer India is most dependent on imported cell technology for.",
 valuePoolDescription:"Cell chemistry and pack engineering carry the deepest margins and IP moat in the car, while legacy lead-acid makers entering Li-ion capture a smaller, more commoditized slice.",
 bottlenecks:["Domestic Li-ion cell manufacturing capacity is still nascent and import-dependent", "Cell chemistry and cathode material supply chains run largely through China", "Scaling gigafactory-grade quality control from pilot lines"],
 keyDrivers:["EV volume growth and rising battery pack sizes", "PLI incentives for domestic cell manufacturing (ACC scheme)", "Falling cell costs per kWh", "Shift from lead-acid incumbents into Li-ion"],
 keyRisks:["Import dependence on Chinese cells and cathode materials", "New entrants still pre-scale and unproven at volume", "Chemistry shifts (LFP vs NMC vs sodium-ion) could strand early capacity bets"],
 investorMetrics:["Gigafactory capacity ramp vs. announced targets", "Cost per kWh trend", "Revenue mix shift from legacy lead-acid to Li-ion"],
 relatedComponents:["bms","thermal","charging"],
 suppliers:[{key:"exide", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"amararaja", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"log9", exposureType:"direct_supplier", exposureStrength:"high"}]},

 {id:"motor", color:"#D96C2B", label:"Electric motor & e-axle", pos:[-1.45,0.34,0.5], side:"left", desc:"Converts stored electricity into torque at the wheels; increasingly an integrated e-axle unit.",
 domainId:"powertrain_drive", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Converts stored electrical energy into mechanical torque at the wheels, increasingly packaged as a single integrated e-axle unit with the motor, gearbox and inverter together.",
 whyItMatters:"The motor and e-axle determine the car's performance and efficiency and are a key battleground for vertical integration among component makers.",
 valuePoolDescription:"e-Axle integrators capture higher value than standalone motor or gear suppliers by bundling motor, gearbox and power electronics into a single sourced unit.",
 bottlenecks:["Rare-earth magnet supply feeding directly into motor production", "Precision machining capacity for e-axle gear sets", "OEM qualification cycles slowing new supplier entry"],
 keyDrivers:["EV volume growth", "Shift toward integrated e-axle sourcing over discrete components", "Performance/efficiency competition among OEMs", "Localization push to cut import content"],
 keyRisks:["Magnet and rare-earth input dependence flows through to this layer", "Customer concentration - e-axle wins tied to a handful of OEM platforms", "Capital-intensive tooling with long payback if volumes disappoint"],
 investorMetrics:["e-Axle order wins and platform awards", "Content-per-vehicle growth as integration deepens", "Capacity utilization at new EV-dedicated lines"],
 relatedComponents:["power_elec","magnets","chassis"],
 suppliers:[{key:"bharatforge", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"sonablw", exposureType:"direct_supplier", exposureStrength:"high"}]},

 {id:"power_elec", color:"#7A5CC7", label:"Power electronics", pos:[-1.05,0.62,0.5], side:"left", desc:"Inverter, onboard charger and DC-DC converter that manage current between battery and motor.",
 domainId:"powertrain_drive", displayOrder:3, dataStatus:"demo",
 roleInSystem:"The inverter, onboard charger and DC-DC converter that manage and convert current flowing between the battery and the motor.",
 whyItMatters:"Power electronics efficiency directly affects range and charging speed, and the layer is shifting fast toward silicon-carbide (SiC) semiconductors.",
 valuePoolDescription:"Controller and inverter makers earn higher per-unit value as power-electronics content rises with faster charging and higher-voltage architectures.",
 bottlenecks:["SiC/GaN power-semiconductor supply, almost entirely imported", "Thermal design constraints as power density rises", "Software/controls qualification taking longer than hardware"],
 keyDrivers:["Shift to 800V architectures needing new power electronics", "Faster-charging standards raising onboard-charger specs", "Rising EV penetration overall"],
 keyRisks:["Import dependence on power semiconductors", "Fragmented supplier base competing on price for commoditized controller hardware", "Technology transitions (SiC vs IGBT) could reset the supplier pecking order"],
 investorMetrics:["Content value per vehicle", "Design wins on 800V/SiC platforms", "Margin trend as mix shifts toward higher-value power electronics"],
 relatedComponents:["motor","battery","harness"],
 suppliers:[{key:"unominda", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"vecmocon", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"mindaCorp", exposureType:"direct_supplier", exposureStrength:"low"}]},

 {id:"bms", color:"#1E9E76", label:"BMS & embedded software", pos:[0.3,0.34,0.55], side:"right", desc:"Battery management logic and the embedded software stitching powertrain, safety and cockpit systems together.",
 domainId:"vehicle_electronics", displayOrder:4, dataStatus:"demo",
 roleInSystem:"The battery management logic and embedded software that stitches powertrain, safety and cockpit systems together into one coherent vehicle.",
 whyItMatters:"Software quality determines battery safety, range accuracy and over-the-air update capability - increasingly a differentiator between OEMs.",
 valuePoolDescription:"Software and embedded-systems specialists earn engineering-services and licensing-style revenue rather than hardware-margin revenue, a different margin profile than component suppliers.",
 bottlenecks:["Talent supply for automotive-grade embedded-software engineers", "Long OEM validation cycles for safety-critical BMS code", "Fragmented standards across OEM platforms limiting code reuse"],
 keyDrivers:["Rising software content per vehicle", "OTA update and connected-car feature adoption", "ADAS and cockpit-electronics complexity growth"],
 keyRisks:["Revenue tied to global auto-engineering outsourcing cycles, not just India EV volumes", "Customer concentration among a small number of global OEM engineering contracts", "Margin pressure from offshore engineering competition"],
 investorMetrics:["Engineering-services revenue growth", "Deal/contract win announcements", "Revenue mix between software services and legacy hardware"],
 relatedComponents:["battery","harness"],
 suppliers:[{key:"kpit", exposureType:"enabler", exposureStrength:"high"}, {key:"tataelxsi", exposureType:"enabler", exposureStrength:"medium"}]},

 {id:"harness", color:"#C6403D", label:"Wiring harness & connectors", pos:[0.55,0.78,0.35], side:"right", desc:"The nervous system of the car - low- and high-voltage cabling connecting every module, routed as real 3D looms.",
 domainId:"vehicle_electronics", displayOrder:5, dataStatus:"demo",
 roleInSystem:"The nervous system of the car - low- and high-voltage cabling that physically connects every module, routed as real 3D looms through the body.",
 whyItMatters:"EVs carry significantly more and higher-voltage wiring than ICE cars, so harness content per vehicle rises meaningfully with electrification.",
 valuePoolDescription:"Harness makers earn volume-driven, moderate-margin revenue that scales directly with vehicle production, with EV-specific high-voltage harnesses commanding a premium over standard looms.",
 bottlenecks:["Copper price volatility feeding directly into harness costs", "Design complexity rising with every added electronic module", "High-voltage safety and insulation compliance adding cost"],
 keyDrivers:["EV volume growth overall", "Rising electronic content per vehicle", "High-voltage harness content growing faster than standard wiring"],
 keyRisks:["Commodity, volume-driven margins typical of harness manufacturing", "Copper cost pass-through risk", "Customer concentration among a few large OEM platforms"],
 investorMetrics:["Harness content value per vehicle (EV vs ICE)", "Order book from new OEM platform wins", "Margin trend amid copper price swings"],
 relatedComponents:["bms","power_elec","cluster"],
 suppliers:[{key:"motherson", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"rico", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"msumi", exposureType:"direct_supplier", exposureStrength:"high"}]},

 {id:"thermal", color:"#4C6EF5", label:"Thermal management", pos:[1.75,0.55,0.5], side:"right", desc:"Keeps the battery and cabin in their working temperature range - critical for range and battery life.",
 domainId:"structure_thermal", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Keeps the battery and cabin within their working temperature range - critical for range, safety and battery longevity.",
 whyItMatters:"Poor thermal management directly degrades range, charging speed and battery life, making this a safety-adjacent system, not just a comfort one.",
 valuePoolDescription:"Thermal system makers earn equipment-style margins on compressors, chillers and heat exchangers, with EV-specific battery-cooling loops adding incremental content over standard HVAC.",
 bottlenecks:["Transition from standard HVAC to integrated battery-cooling loops", "Refrigerant and component sourcing for heat-pump systems", "Engineering capacity to support new EV-specific thermal architectures"],
 keyDrivers:["EV volume growth", "Shift to heat-pump systems for efficiency", "Rising battery pack sizes needing more active cooling"],
 keyRisks:["EV thermal systems are a small, undisclosed slice of a broader ICE-dominated HVAC business for most suppliers", "Technology shift to heat pumps could favor new entrants over incumbents", "Customer concentration risk"],
 investorMetrics:["EV-specific order book, usually undisclosed/blended", "Content-per-vehicle growth from heat-pump adoption", "Margin trend versus legacy HVAC business"],
 relatedComponents:["battery","chassis"],
 suppliers:[{key:"subros", exposureType:"direct_supplier", exposureStrength:"high"}]},

 {id:"chassis", color:"#64748B", label:"Forgings, castings & precision parts", pos:[1.45,0.2,0.75], side:"top", desc:"Machined and forged structural and driveline components - hubs, shafts, housings, subframes.",
 domainId:"structure_thermal", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Machined and forged structural and driveline components - hubs, shafts, housings and subframes - that carry the vehicle's structural and dynamic loads.",
 whyItMatters:"These precision parts are structural - failure tolerances are tight, and EV-specific geometries (e-axle housings, battery subframes) are a growing share of the work.",
 valuePoolDescription:"Forging and machining specialists earn capital-intensive, scale-driven margins, with EV-specific component lines commanding a premium over legacy ICE driveline parts as volumes ramp.",
 bottlenecks:["Capital-intensive tooling and machining capacity additions", "Steel/aluminium input-cost volatility", "Qualification lead times for new EV-specific part geometries"],
 keyDrivers:["EV volume growth", "e-Axle and EV-specific component localization", "Export demand from global OEMs sourcing from India"],
 keyRisks:["EV-specific revenue is often a minority, undisclosed slice of a much larger ICE driveline business", "Cyclical demand tied to both EV and broader auto production", "Input-cost pass-through risk on steel and aluminium"],
 investorMetrics:["EV-specific order book growth, where disclosed", "Capacity utilization at new EV-dedicated lines", "Export mix vs. domestic OEM mix"],
 relatedComponents:["motor","thermal"],
 suppliers:[{key:"sundram", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"craftsman", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"ramkrishna", exposureType:"emerging_entrant", exposureStrength:"low"}, {key:"tataautocomp", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"endurance", exposureType:"direct_supplier", exposureStrength:"low"}]},

 {id:"cluster", color:"#B5179E", label:"Instrument cluster & interior electronics", pos:[1.05,1.00,0.35], side:"top", desc:"Digital driver display and interior sensing electronics.",
 domainId:"vehicle_electronics", displayOrder:8, dataStatus:"demo",
 roleInSystem:"The digital driver display and interior sensing electronics that present vehicle, range and safety information to the driver.",
 whyItMatters:"EVs lean harder on digital clusters (range, charge state, regen) than ICE cars, making this a growing electronics-content layer rather than a mechanical gauge.",
 valuePoolDescription:"Cluster and sensor makers earn electronics-style margins that scale with digital content per vehicle, higher than the mechanical gauges they replace.",
 bottlenecks:["Display and semiconductor component sourcing", "Software integration with BMS/powertrain data feeds", "OEM design-cycle lead times for new cluster generations"],
 keyDrivers:["Shift from analog gauges to fully digital clusters", "Rising sensor content for safety and EV-specific readouts", "Cockpit digitization trend across the industry"],
 keyRisks:["Customer concentration among a small number of OEM platforms", "Competition from larger tier-1 cockpit-electronics suppliers", "Component sourcing dependence on imported displays/semiconductors"],
 investorMetrics:["Digital cluster content value per vehicle", "New platform design wins", "Margin trend as mix shifts toward higher electronics content"],
 relatedComponents:["harness","bms"],
 suppliers:[{key:"pricol", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"charging", color:"#C99A2E", label:"Charging system", pos:[-2.05,0.55,0.9], side:"bottom", desc:"The car's charge port and the AC/DC chargers it plugs into.",
 domainId:"battery_energy", displayOrder:9, dataStatus:"demo",
 roleInSystem:"The car's charge port and the AC/DC charging equipment it plugs into - the interface between the vehicle and the external charging network.",
 whyItMatters:"Charging infrastructure availability and speed are a top consumer concern and a direct constraint on EV adoption rates.",
 valuePoolDescription:"Charger makers and network operators earn equipment sales plus, increasingly, recurring network/service revenue as public charging scales.",
 bottlenecks:["Public charging network buildout lagging vehicle sales", "Grid capacity constraints at high-power charging sites", "Standards fragmentation across connector types and charging protocols"],
 keyDrivers:["EV parc growth driving charger demand", "Government push for public charging infrastructure", "Fast-charging adoption raising average charger power ratings"],
 keyRisks:["Small-cap charger makers are often loss-making or early-stage with thin trading history", "Network operators compete against each other and against OEM home-charging bundles", "Utilization risk on public charging assets built ahead of demand"],
 investorMetrics:["Charger unit shipments and installed base growth", "Network utilization rates", "Path to profitability for early-stage charger makers"],
 relatedComponents:["battery","power_elec"],
 suppliers:[{key:"exicom", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"servotech", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"tataPowerEV", exposureType:"operator", exposureStrength:"low"}]},

 {id:"magnets", color:"#9C6B30", label:"Rare-earth magnets & materials", pos:[-1.45,0.34,-0.5], side:"bottom", desc:"Permanent magnets inside the traction motor - a strategic chokepoint given import dependence on China.",
 domainId:"powertrain_drive", displayOrder:10, dataStatus:"demo",
 roleInSystem:"Permanent magnets inside the traction motor's rotor - a small physical component but a critical, import-dependent input.",
 whyItMatters:"Magnet supply is a genuine strategic chokepoint: India has almost no domestic rare-earth magnet production and depends heavily on Chinese supply.",
 valuePoolDescription:"Domestic magnet makers are early-stage and pre-scale, so most of today's value pool still sits with Chinese and other overseas processors rather than Indian suppliers.",
 bottlenecks:["Near-total import dependence on Chinese rare-earth magnets", "Rare-earth refining and processing capacity absent domestically", "Scale-up risk for new domestic entrants"],
 keyDrivers:["EV motor volume growth", "Government incentives for domestic critical-mineral processing", "Geopolitical push to diversify away from Chinese rare-earth supply"],
 keyRisks:["Single-country (China) supply concentration is a genuine structural risk", "Domestic capacity announcements are pre-revenue and unproven at scale", "Price volatility in rare-earth markets"],
 investorMetrics:["Domestic capacity ramp vs. announced targets", "Import-substitution progress", "Policy/incentive announcements specific to rare-earth processing"],
 relatedComponents:["motor"],
 suppliers:[{key:"midwest", exposureType:"emerging_entrant", exposureStrength:"medium"}]},

 {id:"oem", color:"#3D5A80", label:"Vehicle OEMs & Assembly", pos:[0.05,1.45,0], side:"top", desc:"The vehicle manufacturers that design, assemble and badge the finished EV - from mass-market passenger cars to electric buses.",
 domainId:"assembly_oem", displayOrder:11, dataStatus:"demo",
 roleInSystem:"The vehicle manufacturers that design, assemble and badge the finished EV, integrating every upstream component - battery, motor, electronics and structure - into a saleable product.",
 whyItMatters:"OEMs capture the end-customer relationship and brand value, and their platform decisions determine demand for every supplier layer upstream.",
 valuePoolDescription:"OEMs capture the largest absolute revenue and brand value in the chain, but margins vary widely - mass-market passenger EVs run thinner margins than commercial/bus platforms with contracted fleet demand.",
 bottlenecks:["EV-specific platform investment is capital intensive ahead of volume", "Dependence on upstream battery and semiconductor supply chains", "Charging infrastructure availability constraining consumer demand"],
 keyDrivers:["Consumer EV adoption and model availability", "Government incentives (FAME-style subsidies, PLI)", "Electric bus/fleet procurement by state transport undertakings", "New EV model launches and price competitiveness vs. ICE"],
 keyRisks:["Demand still sensitive to purchase subsidies and incentive policy changes", "Margin pressure as price competition intensifies across new entrants", "Platform concentration risk if a flagship EV model underperforms"],
 investorMetrics:["EV volume and mix as a share of total vehicle sales", "Order book for electric buses/commercial platforms", "Margin trend on EV vs. ICE models"],
 relatedComponents:["battery","motor","harness"],
 suppliers:[{key:"tmpv", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"mm", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"jbmAuto", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"olectra", exposureType:"direct_supplier", exposureStrength:"high"}]}
 ],
 suppliers: {
 motherson: {name:"Samvardhana Motherson International", listed:true, role:"Wiring harnesses, modules, mirrors, cockpits", dataStatus:"demo", sourceDate:ASOF, strengths:["Global scale and a highly diversified customer base across modules, mirrors and cockpits cushion any single product line"], risks:["Wiring harnesses are one of many product lines across a highly diversified global auto-components conglomerate"], f:fin([63536,78701,98692,113663,126104],[1182,1670,3020,4146,4086],"Rs 1,74,575 Cr","Rs 166","MOTHERSON",null,[57,37,15],[101,173],[878,"samvardhana-motherson-international-ltd"],[38.3,38.8,0.36,13.4,11.2,1.00])},
 unominda: {name:"UNO Minda", listed:true, role:"EV powertrain electronics, controllers, switches", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified auto-electronics portfolio gives multiple cross-sell points for EV powertrain electronics across OEM customers"], risks:["EV powertrain electronics is one of several auto-electronics segments across a diversified UNO Minda portfolio"], f:fin([8313,11236,14031,16775,19658],[413,700,925,1021,1284],"Rs 70,336 Cr","Rs 1,218","UNOMINDA",null,[-4,27,27],[994,1382],[864,"uno-minda-ltd"],[57.5,118,0.22,19.6,19.3,2.00])},
 sonablw: {name:"Sona BLW Precision Forgings", listed:true, role:"BEV traction motors, differential gears, e-axle systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established early BEV motor and e-axle wins with several global EV OEM platforms"], risks:["Customer concentration - early BEV motor wins are concentrated among a handful of global EV OEM platforms"], f:fin([1918,2448,2892,3226,4124],[354,388,484,580,646],"Rs 51,459 Cr","Rs 824","SONACOMS",null,[103,12,8],[402,844],[547977,"sona-blw-precision-forgings-ltd"],[70.8,96.2,0.41,14.2,11.3,10.0])},
 bharatforge: {name:"Bharat Forge", listed:true, role:"e-Axles and EV powertrain via Kalyani Powertrain", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by Bharat Forge's large forgings and engineering balance sheet to fund the Kalyani Powertrain EV build-out"], risks:["EV powertrain exposure runs through a subsidiary (Kalyani Powertrain) - a small slice of a much larger diversified forgings business"], f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 97,925 Cr","Rs 2,005","BHARATFORG",null,[70,23,21],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 endurance: {name:"Endurance Technologies", listed:true, role:"Precision castings, suspension, EV-ready component lines", dataStatus:"demo", sourceDate:ASOF, strengths:["Established precision-castings and suspension manufacturing base to build EV-ready component lines on"], risks:["EV-ready component lines are still a developing slice of a much larger precision-castings and suspension business for ICE vehicles"], f:fin([5697,6768,7871,8846,10640],[382,409,588,679,734],"Rs 37,236 Cr","Rs 2,646","ENDURANCE",null,[-3,18,11],[2143,3075],[4797,"endurance-technologies-ltd"],[37.8,486,0.43,17.8,14.9,10.0])},
 exide: {name:"Exide Industries", listed:true, role:"Li-ion cells and packs via Exide Energy Solutions", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-established battery brand and distribution network to lean on while scaling the Exide Energy Solutions Li-ion business"], risks:["Li-ion EV cell business sits in a separate subsidiary, still small relative to the core lead-acid battery business", "New entrant into cell manufacturing versus established Asian cell makers"], f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,023 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain",[8,18,19],[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 amararaja: {name:"Amara Raja Energy & Mobility", listed:true, role:"Li-ion cells via Amara Raja Advanced Cell Technologies", dataStatus:"demo", sourceDate:ASOF, strengths:["Established lead-acid battery manufacturing and distribution base to lean on while scaling the Advanced Cell Technologies Li-ion business"], risks:["Li-ion EV cell business runs through a separate subsidiary (Amara Raja ACT), still small relative to the core lead-acid business", "FY25-FY26 financials not yet reflected in the source data at fetch time"], f:fin([8696,10390,11260,null,null],[511,731,906,null,null],"Rs 18,568 Cr","Rs 1,014","ARE&M","FY25-FY26 not yet reflected in the source at fetch time",[-19,7,1],[670,1023],[68,"amara-raja-energy-mobility-ltd"],[18.5,446,1.34,13.4,8.26,1.00])},
 kpit: {name:"KPIT Technologies", listed:true, role:"Embedded software for EV powertrain and BMS integration", dataStatus:"demo", sourceDate:ASOF, strengths:["Specialist embedded-software engineering expertise serving multiple global OEM powertrain and BMS programs"], risks:["Revenue tied to global auto-engineering outsourcing demand, not just India EV volumes", "Customer concentration among a handful of large OEM engineering contracts"], f:fin([2432,3365,4872,5842,6455],[276,387,599,840,637],"Rs 14,239 Cr","Rs 519","KPITTECH",null,[-57,-23,8],[508,1285],[141324,"kpit-technologies-ltd"],[22.8,129,1.44,26.3,20.9,10.0])},
 tataelxsi: {name:"Tata Elxsi", listed:true, role:"EV software design, ADAS and cockpit electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Established design and engineering expertise spanning EV software, ADAS and cockpit electronics for global OEMs"], risks:["EV software design is one of several segments (ADAS, cockpit, media) - not separately disclosed", "Revenue tied to global OEM engineering-spend cycles"], f:fin([2471,3145,3552,3729,3757],[550,755,792,785,628],"Rs 19,856 Cr","Rs 3,187","TATAELXSI",null,[-40,-24,-11],[3144,5950],[1358,"tata-elxsi-ltd"],[195,45.5,2.35,60.0,39.3,10.0])},
 rico: {name:"Rico Auto Industries", listed:false, role:"Precision machined components and wiring assemblies", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-standing supplier relationships with Maruti Suzuki and Honda, now diversifying machining lines toward EV components"], risks:["Unlisted - no audited public financials; figures here are not available", "Historically an ICE-focused supplier still diversifying machining lines toward EV components"], notes:["Privately held, Gurugram-based; long-time Maruti Suzuki and Honda supplier","Diversifying machining lines toward EV transmission and motor housings","No public market data - not listed"]},
 subros: {name:"Subros", listed:true, role:"HVAC and battery thermal management systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established automotive HVAC manufacturing base to extend into battery thermal management as EV volumes grow"], risks:["Battery thermal management is a growing but still-emerging segment within a broader automotive HVAC/AC business"], f:fin([2239,2806,3071,3368,3756],[33,48,98,150,166],"Rs 4,703 Cr","Rs 721","SUBROS",null,[-36,22,16],[621,1214],[1302,"subros-ltd"],[27.4,191,0.42,19.2,14.5,2.00])},
 pricol: {name:"Pricol", listed:true, role:"Instrument clusters and sensors", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified customer base spanning both ICE and EV vehicles gives steadier revenue as EV volumes scale"], risks:["Instrument clusters serve both ICE and EV vehicles - not an EV-exclusive revenue stream"], f:fin([1523,1928,2255,2529,3096],[43,113,131,142,207],"Rs 9,256 Cr","Rs 759","PRICOLLTD",null,[43,33,53],[500,823],[1072,"pricol-ltd"],[34.6,103,0.26,24.5,21.8,1.00])},
 sundram: {name:"Sundram Fasteners", listed:true, role:"Precision fasteners and machined EV driveline components", dataStatus:"demo", sourceDate:ASOF, strengths:["Established fastener and machined-components manufacturing scale with a diversified customer base to support the EV driveline ramp"], risks:["EV driveline components are a growing but still minority slice of a much larger fastener and machined-components business"], f:fin([4902,5663,5666,5955,6289],[462,500,526,542,593],"Rs 24,786 Cr","Rs 1,179","SUNDRMFAST",null,[17,-2,5],[730,1347],[1313,"sundram-fasteners-ltd"],[39.9,203,0.68,17.6,14.9,1.00])},
 craftsman: {name:"Craftsman Automation", listed:true, role:"Aluminium die-casting and powertrain machining for EVs", dataStatus:"demo", sourceDate:ASOF, strengths:["Established die-casting and machining manufacturing scale from its legacy ICE business supports the EV powertrain ramp"], risks:["Die-casting and machining for EVs sits alongside a larger legacy ICE-component manufacturing base"], f:fin([2217,3183,4452,5690,8069],[163,251,337,201,384],"Rs 28,092 Cr","Rs 10,735","CRAFTSMAN",null,[59,32,38],[6252,11999],[445359,"craftsman-automation-ltd"],[59.9,1368,0.10,13.9,12.5,5.00])},
 ramkrishna: {name:"Ramkrishna Forgings", listed:true, role:"Forged components, expanding into EV and CV driveline parts", dataStatus:"demo", sourceDate:ASOF, strengths:["Established forgings manufacturing base provides a foothold for the expansion into EV and CV driveline parts"], risks:["Still in the early stages of expanding into EV/CV driveline parts from a core forgings business", "FY26 profit fell sharply on one-off items - treat recent figures with caution"], f:fin([2320,3193,3705,4034,4238],[198,248,291,415,72],"Rs 12,814 Cr","Rs 704","RKFORGE","FY26 profit fell sharply on one-off items - verify before use",[31,3,28],[460,773],[1140,"ramkrishna-forgings-ltd"],[114,181,0.14,5.60,2.51,2.00])},
 tataautocomp: {name:"Tata AutoComp Systems", listed:false, role:"High-voltage EV components: battery packs, e-axles, motors", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Sons backing and showcased battery pack, e-axle and motor component lines at IAA Transportation 2026"], risks:["Unlisted - no audited public financials; figures here are not available"], notes:["Privately held Tata group company (Tata Sons subsidiary)","Showcased EV and commercial-vehicle component lines at IAA Transportation 2026","No public market data - not listed"]},
 exicom: {name:"Exicom Tele-Systems", listed:true, role:"AC/DC EV chargers, 3.3kW-600kW", dataStatus:"demo", sourceDate:ASOF, strengths:["Broad AC/DC charger range spanning 3.3kW to 600kW covers both home and high-power public charging use cases"], risks:["Recently listed with a short trading history and limited financial track record", "Currently loss-making, so standard valuation multiples are not meaningful yet"], f:fin([null,null,null,null,895],[null,null,null,null,14],"Rs 2,239 Cr","Rs 161","EXICOM","Listed 2024; only FY26 annual figures available so far (TTM revenue ~Rs 981 Cr); currently loss-making so P/E is n/a",[8,null,null],[75.6,189],[2077200,"exicom-tele-systems-ltd"],[null,46.8,0.00,-14.7,-40.8,10.0])},
 servotech: {name:"Servotech Power Systems", listed:true, role:"AC/DC EV chargers and lithium battery packs", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified product line spanning AC/DC chargers and lithium battery packs gives more than one way to capture EV infrastructure demand"], risks:["Small-cap with thin trading history - limited multi-year financial disclosure", "Competes in a highly fragmented, price-competitive EV charger segment"], f:fin([null,null,null,null,637],[null,null,null,null,36],"Rs 1,598 Cr","Rs 70.8","SERVOTECH","Small-cap, thin trading history - only latest annual figures available",[-43,-3,97],[57.5,142],[87778,"servotech-power-systems-ltd"],[42.7,12.8,0.03,12.8,12.8,1.00])},
 vecmocon: {name:"Vecmocon Technologies", listed:false, role:"Battery management systems and motor controllers", dataStatus:"demo", sourceDate:ASOF, strengths:["Established BMS and motor-controller base in 2- and 3-wheeler EVs, backed by VC investors, as it expands toward four-wheelers"], risks:["Unlisted - no audited public financials; figures here are not available", "Core customer base today is 2- and 3-wheeler EVs - four-wheeler exposure is still expanding"], notes:["Privately held, Delhi-NCR based; backed by Aavishkaar Capital and other VCs","Core base is 2- and 3-wheeler EVs, expanding controller work toward light EVs","No public market data - not listed"]},
 log9: {name:"Log9 Materials", listed:false, role:"Li-ion cell chemistry (fast-charge cells) and pack engineering", dataStatus:"demo", sourceDate:ASOF, strengths:["Known RapidX fast-charging cell chemistry and a strategic stake from Amara Raja give it a base to expand into four-wheeler applications"], risks:["Unlisted - no audited public financials; figures here are not available", "Primarily focused on 2W/3W and energy storage today - four-wheeler car exposure is still emerging"], notes:["Privately held, Bengaluru-based; Amara Raja holds a strategic stake","Known for RapidX fast-charging cell chemistry, mainly 2W/3W and energy storage today","No public market data - not listed"]},
 midwest: {name:"Midwest Advanced Materials", listed:false, role:"Rare-earth permanent magnets for traction motors", dataStatus:"demo", sourceDate:ASOF, strengths:["Announced a ~Rs 1,000 Cr domestic magnet capacity plan directly targeting India's reliance on Chinese rare-earth magnet imports"], risks:["Unlisted and pre-scale - announced domestic magnet capacity is not yet operational at the scale needed to meaningfully displace Chinese imports"], notes:["Privately held, Hyderabad-based; announced a ~Rs 1,000 Cr plan for domestic magnet capacity (2025)","Targets India's near-total reliance on Chinese rare-earth magnets for EV motors","No public market data - not listed"]},
 tmpv: {name:"Tata Motors Passenger Vehicles", listed:true, role:"PV/EV OEM - Nexon EV, Punch EV, Tiago EV, Curvv EV (plus JLR under the same listed entity)", dataStatus:"demo", sourceDate:ASOF, strengths:["Broadest EV model lineup among Indian OEMs (Nexon, Punch, Tiago, Curvv EV) alongside JLR's global scale under the same entity"], risks:["EV models sit within a broader PV and JLR business under the same listed entity - EV-specific financials are not separately disclosed", "FY26 PAT includes a large exceptional/demerger-related gain, not representative of run-rate"], f:fin([278454,345967,434016,366094,335582],[-11309,2690,31807,28149,82645],"Rs 1,06,973 Cr","Rs 290","TMPV","Post-Oct2025 demerger from Tata Motors Ltd; retains JLR+India PV/EV business; FY26 PAT includes a large exceptional/demerger-related gain, not run-rate",null,[288,447],[1362,"tata-motors-passenger-vehicles-ltd"],[107,304,1.03,2.73,75.7,2.00])},
 mm: {name:"Mahindra & Mahindra", listed:true, role:"SUV/PV OEM with dedicated EV lineup (BE 6, XEV 9e) plus EV tractors and 3-wheelers", dataStatus:"demo", sourceDate:ASOF, strengths:["EV exposure spans passenger SUVs (BE 6, XEV 9e), tractors and 3-wheelers, backed by a large diversified group balance sheet"], risks:["Dedicated EV lineup (BE 6, XEV 9e) is still a minority of a much larger diversified SUV/tractor/3-wheeler business"], f:fin([90171,121362,139078,159211,198639],[7253,11374,12270,14073,18622],"Rs 4,21,190 Cr","Rs 3,404","M&M",null,null,[2896,3840],[807,"mahindra-mahindra-ltd"],[22.0,749,0.97,15.1,20.3,5.00])},
 jbmAuto: {name:"JBM Auto", listed:true, role:"Electric buses and EV commercial vehicles - ~30-35% share of India's e-bus segment", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading ~30-35% share of India's electric bus segment"], risks:["Customer concentration among state transport undertakings and large fleet tenders for electric buses"], f:fin([3193,3857,5009,5472,6088],[156,125,194,215,238],"Rs 13,873 Cr","Rs 587","JBMA",null,null,[477,738],[667,"jbm-auto-ltd"],[60.3,65.0,0.14,15.1,15.7,1.00])},
 olectra: {name:"Olectra Greentech", listed:true, role:"Electric bus manufacturer, legacy BYD technology-sharing origins", dataStatus:"demo", sourceDate:ASOF, strengths:["Early-mover electric bus platform built on proven BYD technology-sharing origins"], risks:["Historical dependence on BYD technology-sharing origins for its electric bus platform"], f:fin([593,1091,1154,1802,2312],[35,67,79,139,180],"Rs 9,909 Cr","Rs 1,207","OLECTRA",null,null,[867,1595],[484,"olectra-greentech-ltd"],[55.8,150,0.05,21.0,15.6,4.00])},
 msumi: {name:"Motherson Sumi Wiring India", listed:true, role:"Wiring harnesses for EV and ICE vehicles - ~40% share of the Indian harness market", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading ~40% share of the Indian wiring harness market across both EV and ICE vehicles"], risks:["Revenue spans both EV and ICE harnesses - not purely an EV-only business even though harness-making itself is the core identity"], f:fin([5635,7068,8327,9319,11478],[411,487,638,606,625],"Rs 22,740 Cr","Rs 34.3","MSUMI",null,null,[34.2,53.6],[856676,"motherson-sumi-wiring-india-ltd"],[36.2,3.26,1.69,38.9,32.4,1.00])},
 mindaCorp: {name:"Minda Corporation", listed:true, role:"Auto electronics and components incl. EV-specific sensors, controllers and switches", dataStatus:"demo", sourceDate:ASOF, strengths:["Broad auto-electronics portfolio gives a wide base to cross-sell EV-specific sensors, controllers and switches"], risks:["EV-specific sensors/controllers are included within a much broader auto-electronics and components business, not separately disclosed"], f:fin([2976,4300,4651,5056,6185],[192,284,227,255,358],"Rs 16,230 Cr","Rs 679","MINDACORP",null,null,[468,769],[863,"minda-corporation-ltd"],[40.3,110,0.21,12.7,14.7,2.00])},
 tataPowerEV: {name:"Tata Power", listed:true, role:"EV charging infrastructure (EZ Charge network) alongside its renewable/conventional power generation business", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Power's large power-generation and distribution infrastructure and balance sheet back the EZ Charge network's buildout"], risks:["EV charging (EZ Charge) is a small, undisclosed slice of a much larger renewable and conventional power generation business"], f:fin([42816,55109,61449,65478,62429],[2156,3810,4280,4775,5118],"Rs 1,17,429 Cr","Rs 368","TATAPOWER",null,null,[342,465],[1364,"tata-power-company-ltd"],[30.0,124,0.68,10.5,10.2,1.00])}
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

 // Short blunt nose / long tail, raised beltline and cabin - a cab-forward EV
 // silhouette (no engine bay to package for) rather than the long-hood ICE
 // profile this used to trace. Modeled after the attached EV crossover-coupe
 // reference: short overhangs, high beltline, steeply sloped coupe roofline.
 var lowerPts = [[-2.30,0.08],[-2.26,0.30],[-1.98,0.50],[-1.55,0.62],[-0.95,0.68],[1.00,0.68],[1.55,0.58],[1.95,0.38],[2.25,0.18],[2.30,0.08]];
 var lowerGeo = new THREE.ExtrudeGeometry(shapeFromPoints(lowerPts), {depth:1.78, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3, curveSegments:12});
 lowerGeo.translate(0,0,-0.89);
 bodyGroup.add(new THREE.Mesh(lowerGeo, matBody));

 // Dark rocker/cladding band along the sill, the way crossover-coupe EVs break
 // up the body color with a black lower cladding strip - cheap (2 boxes) but
 // does a lot of work reading as "SUV-shaped" rather than a plain sedan slab.
 [1,-1].forEach(function(side){
 var cladding = new THREE.Mesh(new THREE.BoxGeometry(4.3,0.16,0.04), matStructDark);
 cladding.position.set(-0.15,0.18,side*0.93);
 bodyGroup.add(cladding);
 });

 var glassPts = [[-0.95,0.68],[-0.72,1.00],[-0.25,1.17],[0.35,1.19],[0.68,1.05],[0.95,0.80],[1.00,0.68]];
 var glassGeo = new THREE.ExtrudeGeometry(shapeFromPoints(glassPts), {depth:1.62, bevelEnabled:true, bevelThickness:0.02, bevelSize:0.02, bevelSegments:2, curveSegments:12});
 glassGeo.translate(0,0,-0.81);
 bodyGroup.add(new THREE.Mesh(glassGeo, matGlass));

 [1,-1].forEach(function(side){
 var m = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.08,0.06), matBody);
 m.position.set(0.55, 0.88, side*0.95);
 bodyGroup.add(m);
 });
 [1,-1].forEach(function(side){
 var hl = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.08,0.3), matLight);
 hl.position.set(2.15,0.32,side*0.55);
 bodyGroup.add(hl);
 var tl = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.32), matTailLight);
 tl.position.set(-2.25,0.42,side*0.55);
 bodyGroup.add(tl);
 });
 var chargeFlap = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.12,0.16), matStructDark);
 chargeFlap.position.set(-1.95,0.52,0.92);
 bodyGroup.add(chargeFlap);

 // Wheel-arch trim: a flared black cladding ring hugging the top of each tire
 // (visible in the reference's blacked-out arches) - without this the wheels
 // read as holes cut in a slab rather than fendered into the body.
 var wheelArchPositions = [[1.45,0.88],[-1.45,0.88],[1.45,-0.88],[-1.45,-0.88]];
 wheelArchPositions.forEach(function(p){
 // Default TorusGeometry's half-arc (0..PI) already sweeps +X -> +Y -> -X in
 // the local XY plane, i.e. exactly the upper semicircle - no rotation needed
 // to get an arch open at the bottom, cupping over the wheel.
 var arch = new THREE.Mesh(new THREE.TorusGeometry(0.42,0.05,8,16,Math.PI), matStructDark);
 arch.position.set(p[0],0.34,p[1]);
 bodyGroup.add(arch);
 });

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
 [1.0,0.3,-0.85].forEach(function(x){
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
 cluster.position.set(1.05,1.00,0); techGroup.add(cluster);
 var touchscreen = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.32,0.2), matScreen);
 touchscreen.position.set(0.88,0.80,0.35); touchscreen.rotation.y = 0.5; techGroup.add(touchscreen);
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

 // Thin, wide slab - the "skateboard" pack silhouette that fills the floor
 // between the axles - rather than the deeper tub this used to be.
 var batteryPack = new THREE.Mesh(new THREE.BoxGeometry(3.05,0.16,1.65), matBattery);
 batteryPack.position.set(-0.15,0.13,0); powerGroup.add(batteryPack);

 var modulesGroup = new THREE.Group(); modulesGroup.visible = false;
 var MODULE_COUNT = 8; var moduleMeshes = [];
 for (var i=0;i<MODULE_COUNT;i++){
 var mg = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.14,1.5), matModule);
 mg.userData.baseX = -1.5 + i*0.38 + 0.19;
 mg.position.set(mg.userData.baseX, 0.13, 0);
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
 dummy.position.set(-1.5 + mi*0.38 + 0.19, 0.13, -0.55 + row*0.37);
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
 // Dual motor, one per axle - the AWD "skateboard" layout the reference images
 // show, not a single rear-only unit.
 powerGroup.add(buildMotor(-1.45));
 powerGroup.add(buildMotor(1.45));
 var inverter = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18,0.24), matMotor);
 inverter.position.set(-1.05,0.62,0.45); powerGroup.add(inverter);
 var inverterFront = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18,0.24), matMotor);
 inverterFront.position.set(1.05,0.62,0.45); powerGroup.add(inverterFront);
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
 // --- Industry-level narrative (data-model upgrade, matching the datacenter sector) ---
 whyNow: "India is standing up its first commercial semiconductor fabs and OSAT/ATMP plants right now, backed by large government incentives, pulling in materials, gases, utilities and downstream EMS spend years ahead of any prior electronics cycle.",
 thesisSummary: "India's semiconductor supply chain is being built from scratch across fabrication, packaging, materials and utilities at once - the investable story today is less about owning chip IP and more about the materials, gases, utilities, design-services and downstream EMS suppliers getting qualified as each new fab and ATMP plant comes online.",
 featuredSignals: ["Fab/ATMP construction and ramp milestones (Dholera, Sanand, Assam, Jewar)", "New PLI/semiconductor incentive scheme approvals", "Equipment and materials qualification wins with named fabs", "OSAT/ATMP plant utilization updates", "Fabless design-services order wins"],
 dataStatus: "demo",
 integratorZoneId: "wafer_fab",
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
 // Capital Equipment (lithography/deposition/etch toolmakers) has no 3D zone/
 // company data yet - no India-listed toolmaker exposure exists in this set,
 // so it's deliberately left without a zone rather than forced into one.
 domains: [
 {id:"front_end_fab", title:"Front-End Fabrication", shortTitle:"Fab", description:"The wafer fab itself - the ultra-clean facility that patterns raw silicon into functional chips through lithography, deposition, etch and doping.", color:"#4C6EF5", relatedDomains:["capital_equipment","materials_inputs","back_end_packaging"]},
 {id:"back_end_packaging", title:"Back-End Packaging & Test", shortTitle:"OSAT/ATMP", description:"Assembly, test, mark and pack - dices finished wafers into die and packages them into usable chips.", color:"#D96C2B", relatedDomains:["front_end_fab","downstream_electronics_design"]},
 {id:"materials_inputs", title:"Process Materials & Inputs", shortTitle:"Materials", description:"The specialty gases and ultra-pure chemicals piped and dosed into the fab for deposition, etching, cleaning and annealing.", color:"#1E9E76", relatedDomains:["front_end_fab","facility_infrastructure"]},
 {id:"facility_infrastructure", title:"Facility & Infrastructure", shortTitle:"Facility", description:"Cleanroom HVAC, ultra-pure water and utility systems that keep the fab within the microscopic tolerances chip manufacturing requires.", color:"#C6403D", relatedDomains:["front_end_fab","materials_inputs"]},
 {id:"downstream_electronics_design", title:"Downstream Electronics & Design", shortTitle:"Downstream", description:"EMS/system integration consuming the finished chips, plus fabless design houses feeding chip designs back into the fab and OSAT layers.", color:"#C99A2E", relatedDomains:["back_end_packaging","front_end_fab"]},
 {id:"capital_equipment", title:"Fab Capital Equipment", shortTitle:"Equipment", description:"Lithography, deposition, etch and metrology tools that fabs and ATMP plants install - no India-listed toolmaker exposure exists yet, so this domain has no 3D component modeled.", color:"#7A5CC7", relatedDomains:["front_end_fab","back_end_packaging"]}
 ],
 zones: [
 {id:"wafer_fab", color:"#4C6EF5", label:"Wafer Fab (Front-end)", pos:[0,1.45,0], side:"top", desc:"India's first commercial wafer fabs - the ultra-clean facilities that turn raw silicon into patterned wafers.",
 domainId:"front_end_fab", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The front-end fab layer that takes raw silicon wafers and patterns them into functional chips through lithography, deposition, etch and doping steps.",
 whyItMatters:"This is the most capital- and technology-intensive layer in the entire chain, and the one India has never had a commercial-scale presence in until now.",
 valuePoolDescription:"Fab operators capture the deepest value pool in the chain by owning process yield and operational know-how, though India's fabs currently depend on a foreign technology partner for the underlying process itself.",
 bottlenecks:["Dependence on a foreign technology partner (e.g. PSMC) for process IP", "Multi-year construction and ramp timelines before any wafer ships", "Talent scarcity for fab operations and process engineering"],
 keyDrivers:["Government PLI/incentive support for fab construction", "Domestic demand for mature-node chips in autos and electronics", "Global supply-chain diversification away from Taiwan and China"],
 keyRisks:["Technology-transfer dependence on a single foreign partner", "Yield-ramp risk typical of first-of-kind fabs", "Long payback periods given multi-billion-dollar capex"],
 investorMetrics:["Wafer starts per month vs. nameplate capacity", "Yield-ramp progress disclosures", "Capex-to-revenue timeline versus plan"],
 relatedComponents:["atmp","gases","cleanroom_utilities"],
 suppliers:[{key:"tataelectronics", exposureType:"operator", exposureStrength:"high"}, {key:"micronindia", exposureType:"operator", exposureStrength:"high"}]},
 {id:"atmp", color:"#D96C2B", label:"OSAT / ATMP", pos:[4.1,1.05,0], side:"right", desc:"Assembly, Test, Mark & Pack - takes finished wafers, dices them into die, and packages them into usable chips.",
 domainId:"back_end_packaging", displayOrder:2, dataStatus:"demo",
 roleInSystem:"The back-end layer that takes finished wafers, dices them into individual die, and assembles, tests and packages them into usable chips.",
 whyItMatters:"OSAT/ATMP is the layer where India has the fastest path to scale, since it is less technologically demanding than front-end fabrication and several plants are already under construction.",
 valuePoolDescription:"Packaging and test capture thinner margins than fabrication itself, but run at higher volumes with a lower capex bar, making this the more accessible entry point for new players.",
 bottlenecks:["Dependence on wafers fabricated overseas for most current and planned plants", "Equipment sourcing concentrated among a few global toolmakers", "Skilled-technician availability at newly built sites"],
 keyDrivers:["Global OSAT capacity diversification away from Taiwan and China", "Display-driver and power-chip packaging demand from consumer electronics", "Government incentives specific to ATMP/OSAT investment"],
 keyRisks:["Competing directly with established low-cost OSAT hubs in Southeast Asia", "New-plant ramp and yield risk", "Customer concentration in early years around one or two anchor clients"],
 investorMetrics:["Plant utilization and ramp-up pace", "Order book from global fabless/IDM customers", "Segment-level disclosure where packaging sits inside a diversified parent"],
 relatedComponents:["wafer_fab","ems_downstream"],
 suppliers:[{key:"kaynes", exposureType:"operator", exposureStrength:"medium"}, {key:"cgpower", exposureType:"operator", exposureStrength:"low"}, {key:"hclfoxconn", exposureType:"operator", exposureStrength:"high"}, {key:"spelsemi", exposureType:"operator", exposureStrength:"high"}]},
 {id:"gases", color:"#1E9E76", label:"Specialty & Bulk Gases", pos:[2.55,0.55,-2.85], side:"left", desc:"Nitrogen, hydrogen and specialty process gases piped directly into the fab for deposition, etching and annealing.",
 domainId:"materials_inputs", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Supplies the nitrogen, hydrogen and specialty process gases piped directly into the fab for deposition, etching and annealing steps.",
 whyItMatters:"Fabs cannot run without a continuous, ultra-pure gas supply - any interruption halts production immediately.",
 valuePoolDescription:"Gas suppliers earn long-term, contracted on-site supply revenue once qualified, giving steadier annuity-like economics tied to a fab's operating life rather than one-off equipment sales.",
 bottlenecks:["Only a handful of global/domestic suppliers qualified to fab-grade purity standards", "On-site plant buildout required before a fab can even start, adding lead time", "Import dependence for some specialty-gas feedstocks"],
 keyDrivers:["Number and size of operating fabs/ATMP plants", "Purity requirements tightening as fabs target smaller geometries", "Long-term supply contracts tied to a fab's operating life"],
 keyRisks:["Semiconductor gas demand is still a small, early-stage slice of a much larger industrial-gas business", "Concentration risk if a fab delays or scales back", "High qualification barriers limiting near-term diversification of customers"],
 investorMetrics:["Long-term supply-contract wins tied to specific fabs", "Segment disclosure (if any) for electronics/semiconductor gases", "Capacity utilization of on-site/dedicated gas plants"],
 relatedComponents:["wafer_fab","chemicals"],
 suppliers:[{key:"linde", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"chemicals", color:"#7A5CC7", label:"Ultra-Pure & Specialty Chemicals", pos:[-1.5,0.4,-2.35], side:"left", desc:"Fluorochemicals and ultra-pure wet chemicals used in etching, cleaning and photoresist processes.",
 domainId:"materials_inputs", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Supplies the fluorochemicals and ultra-pure wet chemicals used in etching, cleaning and photoresist processes inside the fab.",
 whyItMatters:"Chip yield is directly sensitive to chemical purity - contamination at this layer shows up as yield loss downstream.",
 valuePoolDescription:"Specialty-chemical makers with fab-grade purity capability earn a premium over bulk industrial chemicals, but semiconductor-grade volumes are still small relative to their broader chemicals businesses.",
 bottlenecks:["Ultra-high-purity qualification is a slow, fab-specific process", "Import dependence for some precursor feedstocks", "Limited number of domestic players at semiconductor-grade purity"],
 keyDrivers:["Number and size of operating/planned fabs", "Shift toward higher-purity grades as process nodes advance", "Import-substitution push for critical fab chemicals"],
 keyRisks:["Semiconductor-grade chemicals remain a small, undisclosed slice of larger specialty-chemical and fluorochemical businesses", "Customer concentration around a handful of fabs/ATMP plants", "Global pricing competition from established Japanese and Korean suppliers"],
 investorMetrics:["Capacity additions specific to semiconductor-grade purity", "Qualification wins with named fabs/ATMP plants", "Segment mix shift toward electronics-grade chemicals"],
 relatedComponents:["wafer_fab","gases"],
 suppliers:[{key:"srf", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"fluorochem", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"navinfluor", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"cleanroom_utilities", color:"#C6403D", label:"Cleanroom, Utilities & Ultra-Pure Water", pos:[0.9,0.4,-3.0], side:"bottom", desc:"Precision HVAC, ultra-pure water treatment and utility systems that keep the cleanroom within microscopic tolerances.",
 domainId:"facility_infrastructure", displayOrder:5, dataStatus:"demo",
 roleInSystem:"Provides the precision HVAC, ultra-pure water treatment and utility systems that keep the cleanroom within the microscopic tolerances a fab requires.",
 whyItMatters:"Cleanroom and utility performance directly gates achievable yield - even small deviations in particulate count or water purity can ruin a production run.",
 valuePoolDescription:"Equipment and systems makers earn large one-time project revenue during fab construction, plus recurring service/maintenance revenue once the facility is operating.",
 bottlenecks:["Long engineering and commissioning lead times tied to fab construction schedules", "Specification bar well above standard commercial HVAC/water systems", "Limited number of vendors qualified for semiconductor-grade cleanroom work"],
 keyDrivers:["New fab and ATMP plant construction pace", "Rising cleanroom-class requirements as process nodes advance", "Water-stress considerations pushing ultra-pure water recycling investment"],
 keyRisks:["Semiconductor fit-out is a small, project-based slice of a much larger industrial HVAC/water-treatment business", "Lumpy, non-recurring project revenue tied to construction cycles", "Execution risk on first-of-kind, fab-grade projects in India"],
 investorMetrics:["Order book tied specifically to fab/ATMP construction projects", "Share of revenue from semiconductor vs. other industrial end-markets", "Service/AMC revenue once facilities go live"],
 relatedComponents:["wafer_fab","gases"],
 suppliers:[{key:"bluestar", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"ionexchange", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"thermax", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"ems_downstream", color:"#C99A2E", label:"Downstream EMS & System Integration", pos:[-4.4,1.2,0.5], side:"bottom", desc:"PCB assembly and system integration plants that sit downstream of the chip and feed finished electronics makers.",
 domainId:"downstream_electronics_design", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Sits downstream of the chip, assembling PCBs and integrating finished electronics that consume the output of the fab and OSAT layers.",
 whyItMatters:"This is where chips actually become finished, sellable electronics - it is the demand pull that justifies the upstream fab and packaging investment.",
 valuePoolDescription:"EMS players earn volume-driven, relatively thin assembly margins, but scale is large and growing fast as more electronics manufacturing localizes to India.",
 bottlenecks:["Continued import dependence for the chips themselves even as assembly localizes", "Thin, competitive assembly margins", "Working-capital intensity of large-scale component sourcing"],
 keyDrivers:["Electronics manufacturing (PLI) incentive schemes", "Domestic consumer-electronics and EV demand", "Global supply-chain diversification toward India-based assembly"],
 keyRisks:["EMS is a large, diversified business where semiconductor-specific exposure is a small, undisclosed slice", "Thin margins typical of contract manufacturing", "Customer concentration among a few large OEM accounts"],
 investorMetrics:["Revenue growth and order book across electronics categories", "Margin trend as product mix shifts toward higher-value assembly", "Backward-integration progress into components"],
 relatedComponents:["atmp","design_services"],
 suppliers:[{key:"syrma", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"dixon", exposureType:"emerging_entrant", exposureStrength:"medium"}]},
 {id:"design_services", color:"#E8871E", label:"Chip Design & Engineering Services", pos:[-2.8,2.0,-1.0], side:"left", desc:"Fabless design houses and engineering-services firms doing ASIC/SoC, VLSI and embedded chip design work for domestic and global clients.",
 domainId:"downstream_electronics_design", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Fabless design houses and engineering-services firms doing ASIC/SoC, VLSI and embedded chip design work that feeds designs into fabs and OSAT plants.",
 whyItMatters:"Design is the layer where IP and differentiation live - without a domestic design base, India's fab/OSAT investment mostly serves designs created elsewhere.",
 valuePoolDescription:"Design-services firms earn project-based revenue with higher margins than pure manufacturing, but India's base here is still small and services-oriented rather than owned-IP/royalty-led.",
 bottlenecks:["Small domestic talent pool for advanced VLSI/SoC design relative to global hubs", "Services-led model today rather than owned, royalty-bearing IP", "Customer concentration among a handful of global clients"],
 keyDrivers:["Global semiconductor design-services outsourcing trend", "Domestic chip-design incentive schemes", "Growing demand for India-specific SoC/embedded design in telecom, auto and industrial"],
 keyRisks:["Small, early-stage revenue base with limited scale economics", "Services model exposed to client budget cycles rather than recurring royalties", "Competition from larger global design-services firms"],
 investorMetrics:["Revenue growth and client-count expansion", "Mix shift from services toward owned IP/royalty revenue", "Margin trend versus global design-services peers"],
 relatedComponents:["wafer_fab","ems_downstream"],
 suppliers:[{key:"moschip", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"asmtech", exposureType:"direct_supplier", exposureStrength:"medium"}]}
 ],
 suppliers: {
 tataelectronics: {name:"Tata Electronics", listed:false, role:"India's first commercial wafer fab (Dholera) and an OSAT plant (Assam)", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by the Tata Group's balance sheet and India's semiconductor PLI incentives, giving it the capital staying power to absorb a multi-year, first-of-kind fab ramp that would strain a smaller independent player"], risks:["Wholly owned by Tata Sons - no separate public financials or listed equity to track","Fab process IP depends on PSMC as the foreign technology partner","First-of-kind commercial fab carries ramp and yield execution risk"], notes:["Wholly owned Tata Sons subsidiary - not separately listed","Dholera fab (with PSMC as technology partner) targets ~50,000 wafers/month at maturity","Also building an OSAT/ATMP plant in Jagiroad, Assam","No public market data - not listed"]},
 micronindia: {name:"Micron Semiconductor Technology India", listed:false, role:"OSAT/ATMP plant (assembly, test, mark, pack) at Sanand, Gujarat", dataStatus:"demo", sourceDate:ASOF, strengths:["Carries the technology, process know-how and balance-sheet backing of Micron Technology, a leading global memory maker, giving the Sanand facility a built-in anchor customer and a quality bar few domestic entrants could match"], risks:["Wholly owned Indian subsidiary of Micron US - no separate Indian listing or financials","Capacity and investment decisions are made by the US parent, not locally","Early-phase ATMP ramp carries yield and utilization risk"], notes:["Wholly owned Indian subsidiary of US-based Micron Technology (NASDAQ: MU)","First phase of the Sanand ATMP facility began production in 2025","No public market data in India - not listed on NSE/BSE"]},
 kaynes: {name:"Kaynes Technology India", listed:true, role:"OSAT/ATMP semiconductor plant (Sanand) plus PCB, EMS and system integration", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the first Indian-listed companies to secure a semiconductor ATMP license, giving it a scarce first-mover position among listed OSAT names","Established PCB/EMS and system-integration base provides existing customer relationships and execution credibility to draw on while the new plant ramps"], risks:["Semiconductor ATMP is one segment alongside a larger PCB/EMS/system-integration business","New Sanand plant carries ramp and yield risk as a first-of-kind facility","Premium valuation leaves limited room for execution missteps"], f:fin([706,1126,1805,2722,3626],[42,95,183,293,364],"Rs 24,536 Cr","Rs 3,650","KAYNES",null,null,[2995,7705],[1124672,"kaynes-technology-india-ltd"],[70.6,708,0.00,12.7,8.69,10.0])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Semiconductor ATMP/OSAT JV (with Renesas & Stars Microelectronics) alongside its core power equipment business", dataStatus:"demo", sourceDate:ASOF, strengths:["Partnership with Renesas and Stars Microelectronics brings established OSAT process technology and a marquee global semiconductor relationship to the Sanand plant","A large, profitable core power-equipment business gives it the financial cushion to fund the JV through its early-stage ramp"], risks:["Semiconductor ATMP JV is a small, newer unit - reported revenue/profit are overwhelmingly from the core power-equipment business","JV structure means CG Power does not fully control strategic or technology decisions for the plant","Early-stage ramp risk for the Sanand plant"], f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER","Revenue/profit reflect CG Power's core electrical-equipment business; the Sanand ATMP JV is a newer, separately ramping unit",null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 hclfoxconn: {name:"HCL-Foxconn Semiconductor", listed:false, role:"Proposed OSAT plant (Jewar, Uttar Pradesh) for display driver chips", dataStatus:"demo", sourceDate:ASOF, strengths:["Combines HCL's domestic engineering and project-execution experience with Foxconn's global electronics manufacturing scale and supply-chain relationships, a pairing well suited to a first-of-kind display-driver OSAT plant"], risks:["Proposed/early-stage plant - no production or revenue yet to evaluate","50:50 JV structure means neither parent fully controls the entity","No separate public financials; the JV is privately held"], notes:["50:50 joint venture between HCL Group and Foxconn (Hon Hai)","Targets display-driver and power-management chips for consumer electronics","No public market data - not listed; JV entity is privately held"]},
 linde: {name:"Linde India", listed:true, role:"Industrial and specialty gases (nitrogen, hydrogen, specialty process gases) for fabs", dataStatus:"demo", sourceDate:ASOF, strengths:["Local arm of a global industrial-gases leader with decades of fab-grade purity qualification experience worldwide, positioning it as a natural first call as Indian fabs qualify on-site gas suppliers"], risks:["Semiconductor-grade gas supply is a small, undisclosed slice of a much larger industrial-gases business","FY23 figures were affected by a reporting period change, complicating trend comparisons"], f:fin([2112,null,2769,2485,2531],[507,null,434,455,549],"Rs 52,383 Cr","Rs 6,142","LINDEINDIA","FY23 figure unavailable due to a reporting period change (Dec-end to Mar-end transition)",null,[5653,8049],[791,"linde-india-ltd"],[95.9,500,0.07,18.2,13.6,10.0])},
 srf: {name:"SRF Limited", listed:true, role:"Fluorochemicals and specialty gases used in semiconductor etching and cleaning", dataStatus:"demo", sourceDate:ASOF, strengths:["Large-scale, established fluorochemicals manufacturing and process expertise give it a credible path to qualify for higher-purity, semiconductor-grade gases and chemicals as domestic fabs ramp"], risks:["Semiconductor-grade fluorochemicals are a small, undisclosed slice of a large, diversified chemicals business","Exposure spans multiple end-markets (refrigerants, agrochemicals) beyond semiconductors"], f:fin([12434,14870,13139,14693,15787],[1889,2162,1336,1251,1835],"Rs 75,292 Cr","Rs 2,540","SRF",null,null,[2314,3239],[1283,"srf-ltd"],[33.6,474,0.35,14.6,14.3,10.0])},
 fluorochem: {name:"Gujarat Fluorochemicals", listed:true, role:"Fluoropolymers and ultra-pure fluorochemicals for semiconductor-grade applications", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the few backward-integrated global fluoropolymer and fluorochemical producers, a high-purity manufacturing base that supports a move into semiconductor-grade chemical applications"], risks:["Semiconductor-grade chemicals are a small, undisclosed slice of a broader fluoropolymers and fluorochemicals business","Profitability has been volatile in recent years (FY23 profit dropped sharply)"], f:fin([3954,5685,4281,4737,4996],[776,1323,435,546,574],"Rs 48,789 Cr","Rs 4,441","FLUOROCHEM",null,null,[2917,4959],[169265,"gujarat-fluorochemicals-ltd"],[79.0,716,0.07,9.64,7.82,1.00])},
 bluestar: {name:"Blue Star", listed:true, role:"Precision cleanroom air-conditioning and HVAC for fabs and ATMP plants", dataStatus:"demo", sourceDate:ASOF, strengths:["India's leading commercial HVAC player, with the large-project execution track record to win precision cleanroom contracts as fab and ATMP construction accelerates"], risks:["Semiconductor cleanroom HVAC is one project category within a much larger commercial/residential AC business","Project-based, lumpy revenue tied to fab construction timing rather than recurring demand"], f:fin([6064,7977,9685,11968,12402],[168,401,414,591,527],"Rs 32,179 Cr","Rs 1,565","BLUESTARCO",null,null,[1432,2033],[209,"blue-star-ltd"],[60.8,167,0.54,21.2,17.2,2.00])},
 ionexchange: {name:"Ion Exchange (India)", listed:true, role:"Ultra-pure water treatment systems for fab process use", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of specialized water-treatment and ultra-pure water system expertise give it a qualification edge for fab-grade UPW systems that generalist infrastructure players lack"], risks:["Semiconductor ultra-pure water systems are a small, undisclosed slice of a broader water-treatment business","Smaller-cap name with a less diversified revenue base than larger industrial peers"], f:fin([1577,1990,2348,2737,2915],[162,195,195,208,143],"Rs 6,162 Cr","Rs 420","IONEXCHANG",null,null,[312,486],[2050,"ion-exchange-india-ltd"],[56.0,91.3,0.30,14.2,12.0,1.00])},
 thermax: {name:"Thermax", listed:true, role:"Utilities - boilers, steam, power and cooling systems for fab campuses", dataStatus:"demo", sourceDate:ASOF, strengths:["Broad, proven capability across boilers, steam, power and cooling systems gives it the engineering credibility to win large utility packages for fab campuses even without prior semiconductor-specific experience"], risks:["Semiconductor fab utilities are a small, undisclosed slice of a large, diversified energy/environment business","Project-based revenue tied to fab construction schedules rather than recurring demand"], f:fin([6128,8090,9323,10387,10774],[312,451,643,627,720],"Rs 41,076 Cr","Rs 3,447","THERMAX",null,null,[2743,5278],[1387,"thermax-ltd"],[74.6,466,0.41,13.9,10.6,2.00])},
 syrma: {name:"Syrma SGS Technology", listed:true, role:"PCB, EMS and downstream system integration adjacent to semiconductor packaging", dataStatus:"demo", sourceDate:ASOF, strengths:["Established PCB and EMS manufacturing base with existing OEM relationships provides a ready platform to expand into semiconductor-packaging-adjacent work as volumes grow"], risks:["Semiconductor-adjacent packaging work is a small slice of a broader PCB/EMS business","Thin, competitive contract-manufacturing margins typical of EMS"], f:fin([1267,2048,3154,3787,4819],[79,123,124,184,346],"Rs 33,410 Cr","Rs 1,733","SYRMA",null,null,[634,1804],[995074,"syrma-sgs-technology-ltd"],[90.0,148,0.09,16.8,14.0,10.0])},
 dixon: {name:"Dixon Technologies", listed:true, role:"Large-scale EMS; diversifying into components and semiconductor-adjacent manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest listed EMS player, with the scale and marquee OEM relationships from mobile and consumer-electronics assembly to anchor its push into components and semiconductor-adjacent manufacturing"], risks:["Semiconductor-adjacent manufacturing is an emerging, still-small part of a much larger consumer-electronics EMS business","Thin EMS margins mean overall profitability depends heavily on volume and mix, not the semiconductor piece specifically"], f:fin([10697,12192,17691,38860,48873],[190,255,375,1233,1644],"Rs 81,907 Cr","Rs 13,390","DIXON",null,null,[9600,17640],[60393,"dixon-technologies-india-ltd"],[43.6,769,0.07,29.2,18.9,2.00])},
 spelsemi: {name:"SPEL Semiconductor", listed:true, role:"Semiconductor assembly, packaging and testing (OSAT) - India's only pure-play listed OSAT name", dataStatus:"demo", sourceDate:ASOF, strengths:["India's only pure-play listed OSAT name gives it a scarce, direct listed vehicle for back-end chip-packaging exposure that no other NSE/BSE stock offers"], risks:["Persistently loss-making with a very small revenue base","BSE-only listing with a thin trading float, limiting liquidity"], f:fin([9,11,12,8,6],[-13,-3,-17,-21,-24],"Rs 606 Cr","Rs 131","SPELS","BSE-only listing (no NSE ticker); persistently loss-making, small-cap, thin float",[-37,32,54],[123,221],[2745,"spel-semiconductor-ltd"],[null,0.66,0.00,0.06,-64.5,10.0])},
 moschip: {name:"MosChip Technologies", listed:true, role:"Fabless semiconductor design services - ASIC/SoC, VLSI, embedded and IP development", dataStatus:"demo", sourceDate:ASOF, strengths:["Established VLSI/SoC design-services track record and existing global client relationships position it to capture outsourced chip-design work as India's fab/OSAT buildout creates local demand for design partners"], risks:["Small, early-stage revenue base typical of design-services firms","Revenue depends on project/client wins rather than recurring royalty income"], f:fin([148,198,294,467,585],[6,6,10,33,35],"Rs 3,983 Cr","Rs 204","MOSCHIP",null,[-15,32,38],[147,288],[3841,"moschip-technologies-ltd"],[125,21.1,0.00,11.0,11.0,2.0])},
 asmtech: {name:"ASM Technologies", listed:true, role:"Engineering & product-engineering services spanning embedded/VLSI semiconductor design alongside aerospace and industrial engineering", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversification across aerospace, industrial and semiconductor design-engineering work reduces dependence on any single end-market's project cycle"], risks:["Semiconductor design work is one segment alongside aerospace and industrial engineering services","Customer and project concentration typical of engineering-services firms"], f:fin([192,220,202,289,529],[14,7,-7,25,61],"Rs 10,217 Cr","Rs 7,004","ASMTEC",null,[69,144,98],[2100,7248],[3131,"asm-technologies-ltd"],[140,210,0.24,27.0,25.5,10.0])},
 navinfluor: {name:"Navin Fluorine International", listed:true, role:"Specialty fluorochemicals incl. high-purity fluorinated/etching gases used in semiconductor fab cleaning and etch steps", dataStatus:"demo", sourceDate:ASOF, strengths:["Established high-purity fluorochemical manufacturing and specialty-gas capability position it to qualify for semiconductor-grade etching gas supply as fabs ramp"], risks:["Semiconductor-grade etching gases are a small, undisclosed slice of a broader specialty-fluorochemicals business","Exposure spans refrigerant and agrochemical end-markets beyond semiconductors"], f:fin([1453,2077,2065,2349,3314],[263,375,270,289,664],"Rs 44,051 Cr","Rs 8,584","NAVINFLUOR",null,[88,25,18],[4498,8950],[914,"navin-fluorine-international-ltd"],[55.4,775,0.18,21.0,19.6,2.0])}
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
 // Roof exhaust/scrubber stacks - one of the most visually distinctive fab-roof
 // features in real cutaway diagrams, cheap to add and high-recognition.
 [[-1.6,-0.9],[-0.4,-0.9],[0.9,-0.9],[2.0,-0.9]].forEach(function(p){
 var stack = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.3,6), matShell);
 stack.position.set(p[0],1.55,p[1]); shellGroup.add(stack);
 });
 // Low attached admin/entrance block - breaks up the "three separate boxes"
 // read into something closer to a real connected campus.
 var adminBlock = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.6,1.8), matShell);
 adminBlock.position.set(0,0.3,2.5); shellGroup.add(adminBlock);

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 // Bulk gas farm: a proper 2x2 cluster with real spacing (reads as a tank
 // farm) instead of 4 near-touching tubes bundled together, plus a containment pad.
 var gasPositions = [[2.2,-2.6],[2.9,-2.6],[2.2,-3.1],[2.9,-3.1]];
 gasPositions.forEach(function(p){
 var tankMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,1.1,12), matGasTank);
 tankMesh.position.set(p[0],0.55,p[1]); utilityGroup.add(tankMesh);
 });
 var gasPad = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.03,1.0), matUtility);
 gasPad.position.set(2.55,0.02,-2.85); utilityGroup.add(gasPad);
 tube([[2.6,1.0,-2.4],[2.6,1.15,-1.4],[3.0,1.15,0]], 0.045, matPipe, utilityGroup);

 // Chemical/UPW farm: horizontal "bullet" tanks on a rack - a visually
 // distinct silhouette from the vertical gas cylinders, not more silos.
 var chemPositions = [[-1.5,-2.1],[-1.5,-2.35],[-1.5,-2.6]];
 chemPositions.forEach(function(p){
 var chemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.9,10), matChemTank);
 chemMesh.rotation.z = Math.PI/2; chemMesh.position.set(p[0],0.35,p[1]); utilityGroup.add(chemMesh);
 });
 var chemPad = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.03,1.0), matUtility);
 chemPad.position.set(-1.5,0.02,-2.35); utilityGroup.add(chemPad);
 tube([[-1.5,0.5,-2.3],[-1.5,1.1,-1.4],[-1.0,1.1,0]], 0.04, matPipe, utilityGroup);

 // Cooling: a wider, flatter 3-cell bank (fan-deck cells) instead of 2 tall
 // narrow drums that read as chimney-style cooling towers.
 [0.4,0.95,1.5].forEach(function(cx){
 var coolCell = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.45,16), matUtility);
 coolCell.position.set(cx,0.3,-3.0); utilityGroup.add(coolCell);
 });
 var waterPlant = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.6), matUtility);
 waterPlant.position.set(0.9,0.3,-3.6); utilityGroup.add(waterPlant);
 tube([[0.8,0.85,-2.7],[0.8,1.1,-1.4],[1.0,1.1,0]], 0.045, matPipe, utilityGroup);

 var roofRack = new THREE.Mesh(new THREE.BoxGeometry(5.6,0.08,0.3), matUtility);
 roofRack.position.set(0,1.44,-1.35); utilityGroup.add(roofRack);
 [-2.6,2.6].forEach(function(rx){
 var rackLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05,1.4,0.05), matUtility);
 rackLeg.position.set(rx,0.72,-1.35); utilityGroup.add(rackLeg);
 });

 // Sub-fab slab below the raised floor (utility floor) and an interstitial
 // FFU plenum above the cleanroom - the vertically-stacked three-tier
 // anatomy (sub-fab / cleanroom / plenum) that makes a fab recognizable in
 // cutaway diagrams. The old model had a single room with nothing below or
 // above it.
 var subFab = new THREE.Mesh(new THREE.BoxGeometry(5.6,0.4,3.0), matUtility);
 subFab.position.set(0,0.2,0); utilityGroup.add(subFab);
 var plenum = new THREE.Mesh(new THREE.BoxGeometry(5.4,0.3,2.6), matFloor);
 plenum.position.set(0,1.2,0); utilityGroup.add(plenum);
 for (var fz=-1; fz<=1; fz++){
 var ffuBar = new THREE.Mesh(new THREE.BoxGeometry(5.4,0.02,0.04), matUtility);
 ffuBar.position.set(0,1.33,fz*0.8); utilityGroup.add(ffuBar);
 }

 // Cleanroom sits strictly between the sub-fab and plenum now (was floating
 // with no floor/ceiling context); raised floor is the literal boundary.
 var cleanroomBox = new THREE.Mesh(new THREE.BoxGeometry(5.4,0.6,2.6), matCleanroom);
 cleanroomBox.position.set(0,0.7,0); cleanroomGroup.add(cleanroomBox);
 var raisedFloor = new THREE.Mesh(new THREE.BoxGeometry(5.2,0.05,2.4), matFloor);
 raisedFloor.position.set(0,0.4,0); cleanroomGroup.add(raisedFloor);
 // Tool-bay divider walls + an overhead AMHS rail ("silver highway") - the
 // parallel-bay-plus-transport-corridor structure every fab photo shows.
 [-1.5,0.3,2.1].forEach(function(dx){
 var bayWall = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.6,2.4), matFloor);
 bayWall.position.set(dx,0.7,0); cleanroomGroup.add(bayWall);
 });
 var amhsRail = new THREE.Mesh(new THREE.BoxGeometry(5.0,0.02,0.02), matPipe);
 amhsRail.position.set(0,1.0,0); cleanroomGroup.add(amhsRail);

 var TOOL_COUNT = 6;
 for (var i=0;i<TOOL_COUNT;i++){
 var toolADims = (i%2===0) ? [0.55,0.5,0.42] : [0.4,0.6,0.5];
 var toolA = new THREE.Mesh(new THREE.BoxGeometry(toolADims[0],toolADims[1],toolADims[2]), matProcess);
 toolA.position.set(-2.2 + i*0.85, 0.4+toolADims[1]/2, -0.7); processGroup.add(toolA);
 var toolBDims = (i%2===0) ? [0.5,0.42,0.4] : [0.42,0.52,0.44];
 var toolB = new THREE.Mesh(new THREE.BoxGeometry(toolBDims[0],toolBDims[1],toolBDims[2]), matProcess);
 toolB.position.set(-2.2 + i*0.85, 0.4+toolBDims[1]/2, 0.7); processGroup.add(toolB);
 }
 [-2.2,2.65].forEach(function(sx){
 var stocker = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.5,0.2), matProcess);
 stocker.position.set(sx,0.65,0); processGroup.add(stocker);
 });
 for (var w=0; w<5; w++){
 var foup = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.16,10), matWafer);
 foup.position.set(-1.6+w*0.5, 1.0, 0); processGroup.add(foup);
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
 // --- Industry-level narrative (data-model upgrade; first sector carrying it) ---
 whyNow: "AI training and inference demand is driving the fastest data-centre capacity buildout India has seen, pulling in power, cooling, compute and connectivity spend years ahead of prior cycles.",
 thesisSummary: "Data centres turn AI/cloud demand into a concrete, physical capex cycle - power equipment, cooling, backup systems, cabling and fiber all scale with every new campus, well before any AI application itself generates revenue.",
 featuredSignals: ["Hyperscaler capex guidance", "New campus announcements and land acquisitions", "Grid-connection and power-purchase-agreement approvals", "GPU/accelerator allocation to Indian cloud providers"],
 dataStatus: "demo",
 integratorZoneId: "operators",
 layerNames: ["Building","Site Infrastructure","White Space","Racks & Compute"],
 shellMaxOpacity: 0.52, exoBaseOpacity: 0.55,
 defaultView: "campus",
 views: [
 {id:"campus", label:"Campus", pos:[9.5,5.5,9.5], target:[0,0.6,0], narration:"Welcome to the data centre anatomy tour. This is a hyperscale campus - the physical buildout behind every AI and cloud workload. Let's walk through how power, cooling, compute and connectivity come together."},
 {id:"whitespace", label:"White Space", pos:[0.2,2.4,5.5], target:[0,0.6,0], narration:"This is the white space - rows of server and GPU racks on a raised floor, wired together by structured cabling overhead. This is where the actual compute happens."},
 {id:"top", label:"Top", pos:[0.1,11.5,0.1], target:[0,0.5,0], narration:"From above, you can see the full footprint - the main building, the operations annex, and the site infrastructure surrounding it."},
 {id:"cooling_yard", label:"Cooling Yard", pos:[6.5,3.2,-5.5], target:[3.2,0.6,-1.8], narration:"The cooling yard - chillers and cooling towers that remove the heat thousands of dense compute racks generate. Without this, none of the compute inside would stay running."},
 {id:"power_yard", label:"Power Yard", pos:[-7.5,3.2,-3.5], target:[-3.2,0.6,0], narration:"The power yard - diesel generators and transformers that keep the facility running through grid outages, and step incoming power down to usable voltages."},
 {id:"ops", label:"Ops / NOC", pos:[7.5,2.6,4.2], target:[4.6,0.5,2.2], narration:"And finally, the operations centre - where the operator monitors and runs the facility, turning all of this physical infrastructure into a service they lease to cloud and enterprise customers."}
 ],
 // Domain A ("Demand and Workloads") from the spec has no 3D zone/company data
 // yet - deliberately left out rather than added as an empty placeholder; it's
 // a real gap to fill in a future iteration, not modeled here.
 domains: [
 {id:"site_power", title:"Site & Power", shortTitle:"Power", description:"Grid interconnect, transformers, switchgear and backup power that keep the facility energized and running through outages.", color:"#D96C2B", relatedDomains:["cooling","building_fitout"]},
 {id:"cooling", title:"Cooling", shortTitle:"Cooling", description:"CRAC units, chillers and cooling towers that remove the heat dense compute racks generate.", color:"#1E9E76", relatedDomains:["site_power"]},
 {id:"building_fitout", title:"Building & Fit-out", shortTitle:"Fit-out", description:"Structured and power cabling that wires the white space together once the shell is built.", color:"#C99A2E", relatedDomains:["compute_connectivity","site_power"]},
 {id:"compute_connectivity", title:"Compute & Connectivity", shortTitle:"Compute", description:"Servers, GPUs and the fiber backbone that turn raw capacity into usable, networked compute.", color:"#4C6EF5", relatedDomains:["building_fitout","cooling"]},
 {id:"operations_ownership", title:"Operations & Ownership", shortTitle:"Operators", description:"The operators and owners who run the campus commercially and lease capacity to cloud/enterprise customers.", color:"#B5179E", relatedDomains:["site_power","compute_connectivity"]}
 ],
 zones: [
 {id:"compute", color:"#4C6EF5", label:"Servers, GPUs & Compute", pos:[0,1.0,0], side:"top", desc:"Racks of servers and GPU/accelerator nodes - the actual compute that AI and cloud workloads run on.",
 domainId:"compute_connectivity", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The compute layer - racks of servers and GPU/accelerator nodes that run the AI and cloud workloads a data centre exists to serve.",
 whyItMatters:"This is where the economic value of a data centre is realized - everything else (power, cooling, building) exists to keep this layer running.",
 valuePoolDescription:"Hardware distributors and system integrators capture margin on every refresh cycle; the chips themselves are mostly imported, so India's exposure is concentrated in distribution, assembly and HPC/AI server integration rather than silicon.",
 bottlenecks:["Global GPU/accelerator supply and allocation, largely outside India's control", "Import dependence on chips and high-end components", "Power and cooling capacity gating how much compute a site can actually host"],
 keyDrivers:["AI training/inference demand", "Cloud and enterprise workload migration", "Hyperscaler capex cycles", "Domestic HPC/AI server assembly incentives"],
 keyRisks:["Compute demand concentrated in a few hyperscaler customers", "Thin, distribution-style margins for most listed names", "Rapid hardware obsolescence across GPU generations"],
 investorMetrics:["Order book / backlog growth", "Revenue per server shipped", "Gross margin trend (distribution vs. integration mix)"],
 relatedComponents:["networking","cooling"],
 suppliers:[{key:"netweb", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"redington", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"rashiPeripherals", exposureType:"indirect_supplier", exposureStrength:"medium"}]},
 {id:"cooling", color:"#1E9E76", label:"Cooling: CRAC, Chillers & Towers", pos:[3.4,1.0,-2.0], side:"right", desc:"Precision air conditioning, chillers and cooling towers that remove the heat dense racks generate.",
 domainId:"cooling", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Removes the heat that dense compute racks generate - without it, servers throttle or fail regardless of how much power or compute capacity exists.",
 whyItMatters:"Cooling capacity is often the binding constraint on how much compute a facility can actually run, especially as rack densities rise with AI workloads.",
 valuePoolDescription:"Precision air-conditioning and chiller makers earn both equipment sales and long-dated service/maintenance revenue across a facility's operating life.",
 bottlenecks:["Water availability for evaporative cooling in water-stressed regions", "Transition to liquid cooling for high-density AI racks", "Long equipment lead times versus fast-moving capacity plans"],
 keyDrivers:["Rising rack power density from AI accelerators", "New data-centre capacity additions", "Energy-efficiency (PUE) targets"],
 keyRisks:["Shift from air to liquid cooling could bypass incumbent CRAC/chiller suppliers", "Regulatory pressure on water-intensive cooling", "Cyclical equipment demand tied to construction timelines"],
 investorMetrics:["Order inflow from the data-centre segment specifically, often undisclosed/blended", "Share of revenue from cooling vs. other HVAC end-markets", "Service/AMC revenue mix"],
 relatedComponents:["power_backup","compute"],
 suppliers:[{key:"voltas", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"bluestar", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"power_backup", color:"#D96C2B", label:"UPS & Diesel Backup Power", pos:[-3.2,0.75,-1.8], side:"left", desc:"Battery-backed UPS systems and diesel generators that keep the facility running through grid outages.",
 domainId:"site_power", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Keeps the facility running through grid outages and power-quality events - batteries and UPS bridge the gap instantly, diesel gensets take over for extended outages.",
 whyItMatters:"Uptime is the core promise a data centre makes to its customers; backup power is what makes that promise credible.",
 valuePoolDescription:"Genset and battery makers sell both the initial equipment and recurring maintenance/replacement revenue, since batteries degrade and are replaced every few years.",
 bottlenecks:["Battery chemistry/supply for UPS systems", "Diesel emission-norm transitions raising genset costs", "Rising backup-duration requirements as grids come under more stress"],
 keyDrivers:["New data-centre capacity additions", "Grid reliability in the region", "Shift toward longer battery-backed runtime vs. diesel"],
 keyRisks:["Battery or alternative-storage substitution for diesel gensets", "Delayed construction schedules pushing out equipment orders", "Backup-power architecture changing faster than incumbents adapt"],
 investorMetrics:["Genset/UPS order book", "Battery replacement-cycle revenue", "Exposure split across DC vs. telecom-tower vs. industrial backup power, often blended"],
 relatedComponents:["transformers","cooling"],
 suppliers:[{key:"cummins", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"kirloskar", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"exide", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"amararaja", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"hblEngineering", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"transformers", color:"#7A5CC7", label:"Transformers & Switchgear", pos:[-3.2,0.85,1.9], side:"left", desc:"Steps grid power down to usable voltages and distributes it safely across the facility.",
 domainId:"site_power", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Steps grid power down to usable voltages and distributes it safely across the facility - the first stop for incoming electricity before it reaches any other system.",
 whyItMatters:"Every watt the data centre uses passes through this layer first; undersized or unreliable transformer capacity caps the whole site's growth.",
 valuePoolDescription:"Transformer and switchgear makers sell large-ticket equipment with long replacement cycles, plus substation/interconnect project revenue as campuses scale.",
 bottlenecks:["Grid interconnection approvals and timelines", "Transformer manufacturing lead times during a capex upcycle", "Copper/core-steel input cost volatility"],
 keyDrivers:["New campus and capacity buildout", "Grid-connection upgrades for larger power draws", "Renewable/PPA interconnection projects"],
 keyRisks:["Demand is lumpy and project-based, not recurring", "Exposure blended across DC, industrial and utility end-markets", "Global equipment-price competition from Chinese and Korean makers"],
 investorMetrics:["Order book growth and execution timelines", "Export mix - some names serve global hyperscaler capex, not just India", "Margin trend amid input-cost swings"],
 relatedComponents:["power_backup","networking"],
 suppliers:[{key:"cgpower", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"taril", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"voltamp", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"schneiderElec", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"hitachiEnergy", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"abbIndia", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"cabling", color:"#C99A2E", label:"Structured & Power Cabling", pos:[1.6,0.4,0.6], side:"right", desc:"Power and structured data cabling that wires racks, PDUs and switches together across the white space.",
 domainId:"building_fitout", displayOrder:5, dataStatus:"demo",
 roleInSystem:"Wires racks, PDUs and switches together across the white space - the physical layer connecting every other system inside the building.",
 whyItMatters:"Fit-out quality and cabling density determine how quickly a shell can be turned into live, revenue-generating white space.",
 valuePoolDescription:"Cable makers earn volume-driven revenue tied directly to white-space square footage built out, with repeat business as campuses expand in phases.",
 bottlenecks:["Copper price volatility feeding directly into cable costs", "Fit-out pace lagging shell construction", "Fire-safety and cabling-standard compliance adding cost and time"],
 keyDrivers:["White-space buildout pace", "Rack density - more cabling per rack as compute density rises", "Structured-cabling standard upgrades"],
 keyRisks:["Commodity, thin-margin business for most cable makers", "DC is a small slice of a diversified cable/wire revenue base", "Copper price pass-through risk"],
 investorMetrics:["Volume growth vs. price-driven growth", "Working-capital intensity tied to copper inventory", "DC-specific order visibility, usually undisclosed"],
 relatedComponents:["compute","transformers"],
 suppliers:[{key:"polycab", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"kei", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"fincables", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"aparInds", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"operators", color:"#B5179E", label:"DC Operators & REIT Layer", pos:[3.0,0.85,1.9], side:"bottom", desc:"The companies that own and operate the physical data-centre campus and lease capacity to cloud and enterprise customers.",
 domainId:"operations_ownership", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Owns and operates the physical campus, leasing capacity to cloud and enterprise customers - the commercial layer that turns the other five into a service.",
 whyItMatters:"This is the layer closest to end-customer revenue; everything upstream (power, cooling, compute, building) is a cost the operator must recover through lease/capacity pricing.",
 valuePoolDescription:"Operators capture recurring lease revenue on committed capacity, often with long-term hyperscaler or enterprise contracts underpinning utilization.",
 bottlenecks:["Land and power-connection availability near demand centres", "Capital intensity of building ahead of signed demand", "Few India-listed pure-play operators - most exposure is indirect, through diversified parents"],
 keyDrivers:["Hyperscaler and enterprise colocation demand", "Available power capacity in key metros", "REIT/infrastructure-fund interest in stabilized DC assets"],
 keyRisks:["No pure-play India-listed DC operator in this set - exposure is diluted through a diversified parent such as a telecom group", "High capex ahead of contracted revenue", "Customer concentration among a handful of hyperscalers"],
 investorMetrics:["Contracted capacity / utilization rate", "Capacity under construction vs. operational", "Parent-level segment disclosure where available"],
 relatedComponents:["compute","networking"],
 suppliers:[{key:"bhartiairtel", exposureType:"owner", exposureStrength:"low"}, {key:"ctrls", exposureType:"operator", exposureStrength:"high"}, {key:"sttgdc", exposureType:"operator", exposureStrength:"high"}]},
 {id:"networking", color:"#2A9134", label:"Fiber Backbone & Network Interconnect", pos:[-1.8,0.25,-1.4], side:"left", desc:"Optical fiber and networking equipment connecting the campus to the fiber backbone and other data centres for low-latency interconnect.",
 domainId:"compute_connectivity", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Connects the campus to the fiber backbone and other data centres for low-latency interconnect - the layer that makes a data centre useful beyond its own four walls.",
 whyItMatters:"Compute is only valuable if it can reach users and other systems quickly; interconnect quality determines latency-sensitive workload viability.",
 valuePoolDescription:"Fiber and networking-equipment makers sell both backbone-capacity buildout and ongoing capacity upgrades as traffic grows.",
 bottlenecks:["Right-of-way and permitting for new fiber routes", "Industry-wide OFC pricing downcycles compressing margins", "Consolidation among a small number of domestic fiber makers"],
 keyDrivers:["Overall data/internet traffic growth", "5G and fiberization of mobile backhaul", "Hyperscaler interconnect buildout"],
 keyRisks:["OFC pricing has been cyclical and loss-making in recent downturns", "Telecom capex timing drives demand more than DC capex specifically", "Global fiber oversupply risk"],
 investorMetrics:["OFC/fiber volume growth", "Pricing recovery vs. the prior downcycle", "Order book spanning telecom and DC customers combined"],
 relatedComponents:["compute","operators"],
 suppliers:[{key:"hfcl", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"sterliteTech", exposureType:"indirect_supplier", exposureStrength:"medium"}]}
 ],
 // dataStatus/risks/sourceDate below are the Company-level fields from the data-model
 // upgrade. sourceDate reuses ASOF rather than a per-company literal, since every
 // figure here was pulled from the same Screener.in snapshot at authoring time.
 suppliers: {
 netweb: {name:"Netweb Technologies India", listed:true, role:"HPC/AI servers, GPU systems and data-centre compute hardware", dataStatus:"demo", sourceDate:ASOF, strengths:["One of a handful of Indian HPC/AI server makers with its own design-to-assembly capability, giving it a head start on PLI-linked domestic server demand ahead of pure import/resale rivals"], risks:["Customer concentration among a small number of large AI/HPC deals","Premium valuation versus distribution-style peers"], f:fin([247,445,724,1149,2184],[22,47,76,114,206],"Rs 27,019 Cr","Rs 4,545","NETWEB",null,null,[2920,5813],[1544933,"netweb-technologies-india-ltd"],[104,127,0.07,37.5,32.8,2.00])},
 voltas: {name:"Voltas", listed:true, role:"Precision air conditioning and cooling for data-centre halls", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading brand and nationwide installation/service network in Indian air conditioning gives it an incumbent's reach as cooling demand scales with new DC capacity"], risks:["Data centres are one of several end-markets alongside residential/commercial AC - DC-specific revenue isn't separately disclosed"], f:fin([7934,9499,12481,15413,14244],[506,136,248,834,370],"Rs 37,000 Cr","Rs 1,118","VOLTAS",null,null,[1090,1582],[1500,"voltas-ltd"],[79.2,193,0.36,9.04,6.10,1.00])},
 bluestar: {name:"Blue Star", listed:true, role:"Precision air conditioning and cooling for data-centre halls", dataStatus:"demo", sourceDate:ASOF, strengths:["Strong project-execution track record in large commercial and industrial MEP/cooling contracts positions it well for bigger-ticket data-centre cooling orders"], risks:["Data centres are one of several end-markets alongside residential/commercial AC - DC-specific revenue isn't separately disclosed"], f:fin([6064,7977,9685,11968,12402],[168,401,414,591,527],"Rs 32,179 Cr","Rs 1,565","BLUESTARCO",null,null,[1432,2033],[209,"blue-star-ltd"],[60.8,167,0.54,21.2,17.2,2.00])},
 cummins: {name:"Cummins India", listed:true, role:"Diesel generator sets for data-centre power backup", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading share in Indian diesel gensets with parent Cummins Inc.'s engine technology and a dense service network across power ratings used in large DC campuses"], risks:["Gensets serve industrial, telecom and commercial backup too - DC is a minority, undisclosed slice of revenue"], f:fin([6171,7772,9000,10391,12143],[934,1228,1721,2000,2362],"Rs 1,37,075 Cr","Rs 4,945","CUMMINSIND",null,null,[3803,6143],[297,"cummins-india-ltd"],[56.2,306,1.33,39.5,30.2,2.00])},
 kirloskar: {name:"Kirloskar Oil Engines", listed:true, role:"Diesel and gas generator sets for data-centre backup power", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-established domestic genset brand with a wide power-rating range and an established industrial dealer/service network to draw on as DC backup orders grow"], risks:["Gensets serve industrial, telecom and commercial backup too - DC is a minority, undisclosed slice of revenue"], f:fin([4022,5020,5898,6329,7701],[171,332,440,476,562],"Rs 31,100 Cr","Rs 2,137","KIRLOSENG",null,null,[866,2720],[745,"kirloskar-oil-engines-ltd"],[54.6,249,0.33,14.6,17.5,2.00])},
 exide: {name:"Exide Industries", listed:true, role:"Lead-acid and Li-ion battery banks for UPS backup power", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest lead-acid battery maker with the broadest manufacturing and distribution footprint, now adding a Li-ion gigafactory that gives it an entry point into higher-density UPS/DC battery demand"], risks:["Automotive/industrial batteries are the core business - DC UPS is a small, undisclosed slice"], f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,023 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain",null,[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 amararaja: {name:"Amara Raja Energy & Mobility", listed:true, role:"Lead-acid and Li-ion battery banks for UPS backup power", dataStatus:"demo", sourceDate:ASOF, strengths:["India's #2 battery maker with an established industrial/telecom UPS franchise, now investing in a Li-ion cell gigafactory to capture higher-value DC backup demand"], risks:["Automotive/industrial batteries are the core business - DC UPS is a small, undisclosed slice"], f:fin([8696,10390,11260,null,null],[511,731,906,null,null],"Rs 18,568 Cr","Rs 1,014","ARE&M","FY25-FY26 not yet reflected in the source at fetch time",null,[670,1023],[68,"amara-raja-energy-mobility-ltd"],[18.5,446,1.34,13.4,8.26,1.00])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Transformers and switchgear for data-centre electrical yards", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's largest legacy transformer/switchgear makers, now under Tube Investments ownership with a turnaround in execution and order-book growth across utility and industrial capex"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER",null,null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 taril: {name:"Transformers & Rectifiers (India)", listed:true, role:"Power and distribution transformers for data-centre electrical yards", dataStatus:"demo", sourceDate:ASOF, strengths:["A focused power-transformer specialist riding a fast-growing order book as grid and large-load (including DC) interconnection capex accelerates"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([1158,1396,1291,2017,2507],[14,42,47,216,272],"Rs 8,334 Cr","Rs 278","TARIL",null,null,[224,502],[1417,"transformers-rectifiers-india-ltd"],[32.2,50.5,0.09,23.3,19.1,1.00])},
 voltamp: {name:"Voltamp Transformers", listed:true, role:"Power transformers for industrial and data-centre electrical infrastructure", dataStatus:"demo", sourceDate:ASOF, strengths:["Debt-free balance sheet and a conservative, niche focus on power transformers have kept margins and return ratios well above typical capital-goods peers"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([1127,1385,1616,1934,2154],[133,200,307,325,305],"Rs 10,834 Cr","Rs 10,709","VOLTAMP",null,null,[6666,12863],[1499,"voltamp-transformers-ltd"],[34.2,1771,0.93,23.5,17.4,10.0])},
 polycab: {name:"Polycab India", listed:true, role:"Structured cabling and power cables for data-centre fit-outs", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest wires & cables maker, with scale, brand and distribution reach that let it win large fit-out orders well beyond its retail-dominated base"], risks:["Retail/industrial wires & cables dominate revenue - DC fit-out is a small, undisclosed slice","Copper price pass-through risk"], f:fin([12204,14108,18039,22408,28884],[917,1282,1803,2046,2708],"Rs 1,26,713 Cr","Rs 8,408","POLYCAB",null,null,[6660,10129],[139599,"polycab-india-ltd"],[44.2,798,0.56,33.2,23.0,10.0])},
 kei: {name:"KEI Industries", listed:true, role:"Power and structured cables for data-centre infrastructure", dataStatus:"demo", sourceDate:ASOF, strengths:["Fastest-growing listed cable maker with a rising institutional/project mix, backed by ongoing capacity expansion that can absorb large fit-out orders"], risks:["Retail/industrial wires & cables dominate revenue - DC fit-out is a small, undisclosed slice","Copper price pass-through risk"], f:fin([5727,6912,8104,9736,11748],[376,477,581,696,918],"Rs 44,679 Cr","Rs 4,674","KEI",null,null,[3729,5931],[729,"kei-industries-ltd"],[44.8,697,0.10,20.0,14.7,2.00])},
 fincables: {name:"Finolex Cables", listed:true, role:"Power and communication cables for data-centre buildouts", dataStatus:"demo", sourceDate:ASOF, strengths:["Debt-free balance sheet and a long-established brand give it financial headroom to bid for large fit-out contracts without stretching leverage"], risks:["Retail/industrial wires & cables dominate revenue - DC fit-out is a small, undisclosed slice","Copper price pass-through risk"], f:fin([3768,4481,5014,5319,6321],[599,504,652,701,714],"Rs 22,343 Cr","Rs 1,461","FINCABLES",null,null,[701,1498],[416,"finolex-cables-ltd"],[27.9,398,0.62,16.0,12.3,2.00])},
 bhartiairtel: {name:"Bharti Airtel", listed:true, role:"Parent of Nxtra Data, one of India's largest data-centre operators", dataStatus:"demo", sourceDate:ASOF, strengths:["Nxtra operates one of India's largest multi-city DC networks, and Airtel's telecom-scale balance sheet and cash flow can fund its continued capacity buildout without straining the group"], risks:["Not a pure-play - Nxtra Data is a small, financially undisclosed part of a large telecom group","Group-wide figures shown here are not Nxtra-specific"], f:fin([116547,139145,149982,172985,210973],[8305,12287,8558,37481,33823],"Rs 11,14,378 Cr","Rs 1,785","BHARTIARTL","Diversified telecom group; Nxtra Data (its DC arm) is not separately listed, so figures are consolidated group-wide",null,[1740,2175],[187,"bharti-airtel-ltd"],[35.7,245,1.34,17.6,20.3,5.00])},
 ctrls: {name:"CtrlS Datacenters", listed:false, role:"Independent hyperscale data-centre operator (Tier IV certified)", dataStatus:"unverified", sourceDate:ASOF, strengths:["One of India's largest independent DC operators with Tier IV certification across multiple cities, and PE backing from Actis gives it capital access for continued expansion"], risks:["Unlisted - no audited public financials, figures here are compiled from public reporting only"], notes:["Privately held, Hyderabad-based; one of India's largest independent DC operators","Backed by private equity investors including Actis","No public market data - not listed"]},
 sttgdc: {name:"STT GDC India", listed:false, role:"Data-centre operator - JV between ST Telemedia and Tata group companies", dataStatus:"unverified", sourceDate:ASOF, strengths:["Combines ST Telemedia's international hyperscale DC operating expertise with Tata-group local reach, underpinning a multi-city campus portfolio built for large hyperscaler tenants"], risks:["Unlisted - no audited public financials, figures here are compiled from public reporting only"], notes:["Joint venture of Singapore's ST Telemedia and Tata group entities","Operates hyperscale campuses across Mumbai, Chennai, Delhi-NCR and other cities","No public market data - not listed"]},
 schneiderElec: {name:"Schneider Electric Infrastructure", listed:true, role:"Power distribution and electrical infrastructure (switchgear, transformers) for DC power rooms", dataStatus:"demo", sourceDate:ASOF, strengths:["Access to parent Schneider Electric's global data-centre power and automation technology gives it a reference-architecture edge over purely domestic switchgear makers"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([1530,1777,2207,2637,2891],[28,124,172,268,213],"Rs 28,919 Cr","Rs 1,210","SCHNEIDER",null,[45,50,60],[572,1548],[1195,"schneider-electric-infrastructure-ltd"],[149,28.8,0.00,29.6,38.2,2.0])},
 hitachiEnergy: {name:"Hitachi Energy India", listed:true, role:"Power grid equipment (transformers, switchgear) for DC substations and grid interconnects", dataStatus:"demo", sourceDate:ASOF, strengths:["Global Hitachi Energy technology and a large order backlog spanning domestic grid upgrades and export markets give it scale most India-only transformer makers lack"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([4884,4469,5237,6385,8148],[203,94,164,384,988],"Rs 1,38,330 Cr","Rs 31,035","POWERINDIA",null,[62,96,68],[16104,38800],[202203,"hitachi-energy-india-ltd"],[116,1161,0.03,29.4,21.9,2.0])},
 abbIndia: {name:"ABB India", listed:true, role:"Electrical equipment, UPS, drives and automation for DC power and cooling systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Parent ABB's global automation and electrification technology base lets it bid across power, drives and UPS systems within a single DC project rather than competing on one product line alone"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([6934,8568,10447,12188,13203],[520,1016,1242,1872,1668],"Rs 1,49,448 Cr","Rs 7,052","ABB","Reports Jan-Dec fiscal year",[36,19,31],[4638,7924],[17,"abb-india-ltd"],[97.0,441,0.56,29.9,22.4,2.0])},
 aparInds: {name:"Apar Industries", listed:true, role:"Power cables, conductors and transformers for DC campus grid connectivity", dataStatus:"demo", sourceDate:ASOF, strengths:["A leading conductor and specialty-cable exporter with a long multi-decade track record selling into global utility and industrial grid-connection projects"], risks:["Order book spans utility, industrial and DC customers - DC-specific share is undisclosed"], f:fin([9317,14336,16153,18581,22902],[257,638,825,821,977],"Rs 74,432 Cr","Rs 17,776","APARINDS",null,[113,48,94],[6800,19269],[88,"apar-industries-ltd"],[61.8,1343,0.34,31.8,20.3,10.0])},
 hblEngineering: {name:"HBL Engineering", listed:true, role:"Batteries and UPS power backup systems for DC power continuity", dataStatus:"demo", sourceDate:ASOF, strengths:["High-reliability battery expertise honed on rail-signalling and defense contracts carries over directly to critical-power UPS applications, and those segments also diversify it well beyond DC-battery demand"], risks:["Rail-signalling and defense electronics are larger segments than DC batteries/UPS for this company"], f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Renamed from HBL Power Systems (ticker HBLPOWER -> HBLENGINE); also has rail-signalling and defense-electronics segments beyond batteries/UPS",[-4,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.0])},
 redington: {name:"Redington", listed:true, role:"Large-scale IT hardware distribution incl. servers and DC equipment", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the largest IT distributors in India and the Middle East/Africa, with deep OEM relationships across major server and compute brands that smaller distributors can't match"], risks:["Distribution margins are thin; DC servers are one category within a much broader IT/mobility distribution business"], f:fin([62644,79377,89346,99334,119162],[1315,1439,1239,1821,1284],"Rs 31,838 Cr","Rs 407","REDINGTON",null,[54,39,23],[191,420],[1120,"redington-ltd"],[17.7,130,1.47,18.4,16.9,2.0])},
 rashiPeripherals: {name:"Rashi Peripherals", listed:true, role:"IT hardware distribution incl. servers and DC equipment", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-standing distribution tie-ups with major component and server brands (incl. Intel and AMD) give it an established channel into DC hardware demand despite its short listed history"], risks:["Distribution margins are thin; DC servers are one category within a broader IT distribution business","Recently listed (Feb 2024) - limited trading history"], f:fin([9313,9454,11095,13773,15827],[183,123,144,210,282],"Rs 5,930 Cr","Rs 893","RPTECH","Recently listed (IPO Feb 2024) - only 1Y stock CAGR available",[183,null,null],[313,968],[1992194,"rashi-peripherals-ltd"],[18.6,307,0.22,17.0,14.7,5.0])},
 hfcl: {name:"HFCL", listed:true, role:"Optical fiber and telecom/DC networking equipment (OFC, routers)", dataStatus:"demo", sourceDate:ASOF, strengths:["Vertically integrated from fiber to telecom/networking equipment, with a growing defense-electronics and export order book that diversifies it beyond cyclical OFC pricing"], risks:["OFC pricing is cyclical - telecom capex timing drives demand more than DC capex specifically"], f:fin([4727,4743,4465,4065,4949],[326,318,338,173,329],"Rs 32,337 Cr","Rs 211","HFCL",null,[193,41,24],[59.8,257],[543,"hfcl-ltd"],[56.5,32.0,0.09,10.8,6.98,1.0])},
 sterliteTech: {name:"Sterlite Technologies", listed:true, role:"Optical fiber and OFC data networking - largest OFC maker in India", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest optical fiber maker with global-scale manufacturing and a return to profitability in FY26 as the industry pricing downcycle turned"], risks:["OFC pricing downcycles have driven net losses in recent years (FY24-25)","Telecom capex timing drives demand more than DC capex specifically"], f:fin([5437,6925,4083,3996,4745],[45,127,-57,-123,56],"Rs 43,037 Cr","Rs 837","STLTECH","FY24-25 net losses reflect OFC industry pricing downcycle; FY26 returned to profit",[615,94,32],[84.6,912],[1299,"sterlite-technologies-ltd"],[182,46.5,0.00,7.65,1.24,2.0])}
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
 // Parapet lip around the roof edge - a cheap 4-box addition that reads as
 // the flat-roof hyperscale silhouette instead of a bare box.
 [[5.0,3.0],[5.0,-3.0]].forEach(function(p){
 var parapetLong = new THREE.Mesh(new THREE.BoxGeometry(5.0,0.08,0.06), matShell);
 parapetLong.position.set(0,1.24,p[1]); shellGroup.add(parapetLong);
 });
 [[2.5,0],[-2.5,0]].forEach(function(p){
 var parapetShort = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,3.0), matShell);
 parapetShort.position.set(p[0],1.24,0); shellGroup.add(parapetShort);
 });
 // Ops/NOC annex attached to the hall via a short bridge, instead of a
 // detached satellite block floating 1.6 units clear of the main building.
 var opsBldg = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,1.2), matShell);
 opsBldg.position.set(3.0,0.4,1.9); shellGroup.add(opsBldg);
 var opsBridge = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6), matShell);
 opsBridge.position.set(2.8,0.4,2.0); shellGroup.add(opsBridge);

 function tube(points, radius, mat, parent){
 var curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0],p[1],p[2]); }));
 var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), mat);
 parent.add(m); return m;
 }

 // Cooling/mechanical yard: a ROW of identical dry-cooler units, not one or
 // two bespoke chimney-shaped "towers" - hyperscale sites read as a yard
 // through repetition of identical rectangular modules, not unique shapes.
 for (var ci=0; ci<4; ci++){
 var dryCooler = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.85), matCooling);
 dryCooler.position.set(2.9+ci*0.55, 0.3, -2.3); siteGroup.add(dryCooler);
 var chiller = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.85), matCooling);
 chiller.position.set(2.9+ci*0.55, 0.4, -1.6); siteGroup.add(chiller);
 }
 var coolingPad = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.04,1.6), matSite);
 coolingPad.position.set(3.4,0.02,-2.0); siteGroup.add(coolingPad);
 tube([[3.2,0.85,-1.9],[3.2,1.1,-1.0],[2.0,1.1,0]], 0.05, matSite, siteGroup);

 // Generator yard: container-style enclosures with belly fuel tanks, thicker
 // exhaust stacks and a low acoustic/security wall around the cluster.
 [-0.6,0,0.6].forEach(function(dx){
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.45,1.3), matGenset);
 genset.position.set(-3.2+dx, 0.28, -1.8); siteGroup.add(genset);
 var fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,1.0,8), matSite);
 fuelTank.rotation.z = Math.PI/2; fuelTank.position.set(-3.2+dx, 0.1, -1.8); siteGroup.add(fuelTank);
 var exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.55,8), matSite);
 exhaust.position.set(-3.2+dx, 0.78, -1.8); siteGroup.add(exhaust);
 });
 var genYardWallZ1 = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.35,2.0), matSite);
 genYardWallZ1.position.set(-4.15,0.18,-1.9); siteGroup.add(genYardWallZ1);
 var genYardWallZ2 = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.35,2.0), matSite);
 genYardWallZ2.position.set(-2.25,0.18,-1.9); siteGroup.add(genYardWallZ2);
 var genYardWallX1 = new THREE.Mesh(new THREE.BoxGeometry(2.3,0.35,0.06), matSite);
 genYardWallX1.position.set(-3.2,0.18,-2.9); siteGroup.add(genYardWallX1);
 var genYardWallX2 = new THREE.Mesh(new THREE.BoxGeometry(2.3,0.35,0.06), matSite);
 genYardWallX2.position.set(-3.2,0.18,-0.9); siteGroup.add(genYardWallX2);

 // Electrical/substation yard: bushings on each transformer and a gantry
 // pole for the incoming HV line, rather than plain unadorned boxes.
 var xfmr1 = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.6,0.9), matElectrical);
 xfmr1.position.set(-3.4,0.35,1.6); siteGroup.add(xfmr1);
 var xfmr2 = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.55,0.8), matElectrical);
 xfmr2.position.set(-2.6,0.32,1.9); siteGroup.add(xfmr2);
 [xfmr1,xfmr2].forEach(function(x){
 for (var bi=-1;bi<=1;bi++){
 var bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.22,6), matElectrical);
 bushing.position.set(x.position.x+bi*0.15, x.position.y+x.geometry.parameters.height/2+0.11, x.position.z); siteGroup.add(bushing);
 }
 });
 var switchgear = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.7,0.35), matElectrical);
 switchgear.position.set(-3.2,0.4,2.35); siteGroup.add(switchgear);
 var gantryPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.1,8), matSite);
 gantryPole.position.set(-4.1,0.55,1.9); siteGroup.add(gantryPole);
 tube([[-3.2,0.85,1.8],[-3.2,1.1,1.0],[-2.0,1.1,0]], 0.045, matSite, siteGroup);
 var elecPad = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.04,1.2), matSite);
 elecPad.position.set(-3.2,0.02,1.9); siteGroup.add(elecPad);

 // Rooftop CRAC/AHU units - 5 in a tighter grid (was 3 sparse), screened
 // within the new parapet so they read as rooftop plant, not scattered clutter.
 [[-1.6,0.4],[-0.6,0.4],[0.4,0.4],[-1.1,0.9],[0.1,0.9]].forEach(function(p){
 var crac = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.22,0.42), matCooling);
 crac.position.set(p[0], 1.3, p[1]); siteGroup.add(crac);
 });
 var noc = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.1,0.7), matSite);
 noc.position.set(3.0,0.85,1.9); siteGroup.add(noc);

 var raisedFloor = new THREE.Mesh(new THREE.BoxGeometry(4.6,0.05,2.6), matWhiteSpace);
 raisedFloor.position.set(0,0.2,0); whiteSpaceGroup.add(raisedFloor);
 // Cable trays re-centered onto the actual aisles BETWEEN rack rows (rows sit
 // at z=-0.9/-0.3/0.3/0.9, so aisle centers are -0.6/0/0.6) rather than
 // floating at z=-0.8/0/0.8, which lined up with nothing.
 for (var tz=-1; tz<=1; tz++){
 var tray = new THREE.Mesh(new THREE.BoxGeometry(4.4,0.03,0.06), matCable);
 tray.position.set(0, 1.05, tz*0.6); whiteSpaceGroup.add(tray);
 }
 // Hot/cold aisle containment hoods over each aisle - the single most
 // recognizable interior cue in real cutaway infographics, absent before.
 for (var az=-1; az<=1; az++){
 var containment = new THREE.Mesh(new THREE.BoxGeometry(4.2,0.05,0.5), matWhiteSpace);
 containment.position.set(0, 0.92, az*0.6); whiteSpaceGroup.add(containment);
 }
 tube([[1.8,0.25,1.5],[1.8,0.4,0.9],[1.0,0.4,0]], 0.035, matCable, whiteSpaceGroup);

 // Racks & compute: instanced (not one Mesh per rack/LED) so the row can be
 // densified without the draw-call count growing with it - 4 rows x 9
 // columns = 36 racks via 2 InstancedMesh objects instead of 48 separate
 // Mesh/material pairs for the old 4x6 grid.
 var rows = 4, perRow = 9;
 var rackGeo = new THREE.BoxGeometry(0.22,0.85,0.55);
 var ledGeo = new THREE.BoxGeometry(0.02,0.7,0.04);
 var rackInstances = new THREE.InstancedMesh(rackGeo, matRack, rows*perRow);
 var ledInstances = new THREE.InstancedMesh(ledGeo, matRackLed, rows*perRow);
 var rackDummy = new THREE.Object3D(); var rackIdx = 0;
 var colSpan = 0.52, startX = -(perRow-1)*colSpan/2;
 for (var row=0; row<rows; row++){
 for (var c=0; c<perRow; c++){
 var rx = startX + c*colSpan, rz = -0.9 + row*0.6;
 rackDummy.position.set(rx, 0.62, rz); rackDummy.rotation.set(0,0,0); rackDummy.updateMatrix();
 rackInstances.setMatrixAt(rackIdx, rackDummy.matrix);
 rackDummy.position.set(rx+0.12, 0.62, rz+0.26); rackDummy.updateMatrix();
 ledInstances.setMatrixAt(rackIdx, rackDummy.matrix);
 rackIdx++;
 }
 }
 rackInstances.instanceMatrix.needsUpdate = true;
 ledInstances.instanceMatrix.needsUpdate = true;
 rackGroup.add(rackInstances); rackGroup.add(ledInstances);
 var pduLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.75,0.5), matRack);
 pduLeft.position.set(startX-0.35, 0.62, -0.9); rackGroup.add(pduLeft);
 var pduRight = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.75,0.5), matRack);
 pduRight.position.set(startX+(perRow-1)*colSpan+0.35, 0.62, 0.9); rackGroup.add(pduRight);

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
 // --- Industry-level narrative (data-model upgrade, matching datacenter's pattern) ---
 whyNow: "India's Vande Bharat rollout, metro expansion across a dozen-plus cities and the Kavach train-protection mandate are driving a once-in-a-generation 'Make in India' rolling-stock and signaling capex cycle, backed by record Indian Railways budget allocations.",
 thesisSummary: "Indian Railways' modernization is a physical supply chain story - coach OEMs integrate bogies, traction, braking and signaling into finished trainsets, PSU contractors electrify and expand the corridor those trains run on, and PSU financiers/ticketing arms fund and monetize the system.",
 featuredSignals: ["Vande Bharat and metro rolling-stock order awards", "Kavach rollout tender wins and corridor coverage milestones", "Railway capex budget allocations each Union Budget", "New wheel/bogie manufacturing capacity announcements", "Electrification and dedicated freight corridor completion milestones"],
 dataStatus: "demo",
 integratorZoneId: "rolling_stock",
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
 domains: [
 {id:"rolling_stock_manufacturing", title:"Rolling Stock Manufacturing", shortTitle:"OEM", description:"Coach and wagon OEMs that integrate bogies, traction, braking and signaling into complete, certified trainsets.", color:"#4C6EF5", relatedDomains:["underframe_running_gear","traction_power"]},
 {id:"underframe_running_gear", title:"Underframe & Running Gear", shortTitle:"Running gear", description:"Forged wheelsets, axles, bogie frames and bearings that carry and guide each coach along the track.", color:"#D96C2B", relatedDomains:["rolling_stock_manufacturing","train_safety_control"]},
 {id:"traction_power", title:"Traction & Power Electronics", shortTitle:"Traction", description:"Pantograph, traction motors and power-electronic converters that draw overhead power and drive the wheels.", color:"#7A5CC7", relatedDomains:["rolling_stock_manufacturing","infrastructure_epc"]},
 {id:"train_safety_control", title:"Train Safety & Control Systems", shortTitle:"Safety", description:"Kavach/ETCS train-protection electronics and braking systems - the two layers that keep trains safely spaced and able to stop.", color:"#1E9E76", relatedDomains:["underframe_running_gear","rolling_stock_manufacturing"]},
 {id:"infrastructure_epc", title:"Corridor Infrastructure & Electrification EPC", shortTitle:"EPC", description:"New lines, doubling, track-laying and overhead electrification contractors that build the corridor itself.", color:"#8B5E34", relatedDomains:["traction_power","psu_ecosystem"]},
 {id:"psu_ecosystem", title:"Railway PSU & Digital Ecosystem", shortTitle:"PSU", description:"The PSU layer that finances rolling stock, sells tickets, runs rail-freight logistics and operates the digital/telecom backbone.", color:"#B5179E", relatedDomains:["infrastructure_epc","rolling_stock_manufacturing"]}
 ],
 zones: [
 {id:"rolling_stock", color:"#4C6EF5", label:"Rolling Stock Integration & Coach Fabrication", pos:[0,1.3,0], side:"top", desc:"Complete trainset/coach assembly - the OEMs that fabricate and integrate Vande Bharat, metro and freight rolling stock.",
 domainId:"rolling_stock_manufacturing", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The OEM integration layer - takes bogies, traction equipment, signaling and braking systems from across the supply chain and assembles them into a complete, certified trainset.",
 whyItMatters:"This is the layer where India's 'Make in India' rail story becomes a finished, revenue-generating product - every other component feeds into what gets built here.",
 valuePoolDescription:"Coach and wagon OEMs capture the largest contract values from Indian Railways and metro tenders, though margins are thinner than the component suppliers feeding into them due to intense tender-based competition.",
 bottlenecks:["Tender-based order lumpiness tied to Indian Railways' capex cycle", "Limited number of certified coach-manufacturing facilities", "Execution/delivery timelines scrutinized heavily in government contracts"],
 keyDrivers:["Vande Bharat and metro rolling-stock order pipeline", "Freight wagon demand tied to dedicated freight corridors", "Railway capex budget allocations", "Export opportunities for Indian-built rolling stock"],
 keyRisks:["Revenue concentrated in a handful of large government tenders", "Order-book lumpiness versus steadier component demand", "Execution delays can defer revenue recognition by years"],
 investorMetrics:["Order book / book-to-bill ratio", "Tender win rate versus competing OEMs", "Execution margin trends across delivery cycles"],
 relatedComponents:["bogies","traction","braking"],
 suppliers:[{key:"titagarh", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"texmaco", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"beml", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"jupiterwagons", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"stoneindia", exposureType:"indirect_supplier", exposureStrength:"low"}]},
 {id:"bogies", color:"#D96C2B", label:"Bogies, Wheels, Axles & Bearings", pos:[-1.25,0.2,0.32], side:"bottom", desc:"Forged wheelsets, axles, bogie frames and bearings that carry and guide each coach along the track.",
 domainId:"underframe_running_gear", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Carries and guides each coach along the track - forged wheelsets, axles, bogie frames and bearings sit directly beneath the coach body, bearing the full static and dynamic load.",
 whyItMatters:"Wheel and bearing failures are safety-critical; this layer's reliability directly determines how fast and how often trains can run.",
 valuePoolDescription:"Forging and bearing specialists earn both OEM supply contracts and a long tail of replacement/maintenance revenue as wheelsets wear and are reconditioned.",
 bottlenecks:["Forging capacity for large wheel/axle orders", "Import dependence for some precision bearing categories", "Long RDSO qualification/certification cycles before a new supplier can bid"],
 keyDrivers:["New coach and wagon production volumes", "Wheelset replacement cycles on the existing fleet", "Dedicated-capacity investments like the Titagarh-Ramkrishna wheel plant", "Freight wagon fleet expansion"],
 keyRisks:["Several suppliers serve rail as a minority segment within broader auto/industrial bearings businesses", "Capital-intensive forging capacity that can't flex quickly with order timing"],
 investorMetrics:["Rail-specific order wins and capacity utilization", "Share of revenue from rail versus auto/industrial bearings", "Wheel-plant ramp-up progress"],
 relatedComponents:["rolling_stock","braking"],
 suppliers:[{key:"ramkrishnaforgings", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"bharatforge", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"timken", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"nrbbearings", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"schaefflerindia", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"traction", color:"#7A5CC7", label:"Traction Propulsion, Motors & Power Electronics", pos:[0,1.55,0], side:"top", desc:"Pantograph, traction motors and power-electronic converters that draw overhead power and drive the wheels.",
 domainId:"traction_power", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Draws power from the overhead electrification and converts it into the motive force that drives the wheels - pantograph, traction motors and power-electronic converters sit on the roof and underframe of the powered coaches.",
 whyItMatters:"Traction performance determines a train's acceleration, top speed and energy efficiency - the core technical differentiator of a modern electric trainset like Vande Bharat.",
 valuePoolDescription:"Traction equipment carries some of the highest technology content and margin in the rolling-stock stack, with a handful of global majors and PSUs holding most of the qualified supply base.",
 bottlenecks:["Small number of RDSO-qualified traction-equipment suppliers", "Technology-transfer dependence on global majors for some power-electronics content", "Long-lead procurement for traction motors and converters"],
 keyDrivers:["Electrification of new and existing rail lines", "Vande Bharat and metro rollout pace", "Push for higher-speed, higher-efficiency traction technology", "Replacement demand on the ageing electric-locomotive fleet"],
 keyRisks:["Rail traction is often a small, undisclosed slice of a much larger diversified industrial business", "Technology dependence on global licensors for leading-edge power electronics"],
 investorMetrics:["Rail/traction segment order inflow, where disclosed", "Margin differential versus the company's non-rail businesses", "Qualification wins on new-generation trainset tenders"],
 relatedComponents:["rolling_stock","signaling"],
 suppliers:[{key:"bhel", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"siemenschain", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"abbindia", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"cgpower", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"hirect", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"signaling", color:"#1E9E76", label:"Signaling, Train Control (Kavach) & Onboard Electronics", pos:[-3.0,1.0,0.35], side:"left", desc:"Kavach/ETCS train-protection electronics, interlocking and cab signaling that keep trains safely spaced.",
 domainId:"train_safety_control", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Keeps trains safely spaced and enforces speed limits - Kavach/ETCS train-protection electronics, interlocking and cab signaling sit onboard the cab and along the trackside.",
 whyItMatters:"Kavach is the single largest near-term policy-driven demand catalyst in Indian Railways - it is being rolled out as a direct response to safety mandates, not discretionary capex.",
 valuePoolDescription:"Kavach-qualified suppliers are capturing a rapid, policy-driven order inflection, but the qualified supplier base is small and early-stage names carry significant execution risk.",
 bottlenecks:["Very small number of RDSO-certified Kavach suppliers", "Nationwide rollout requires trackside and onboard equipment to be installed in lockstep", "Early-stage suppliers with limited manufacturing scale-up track record"],
 keyDrivers:["Government Kavach rollout mandate and funding", "Post-accident safety-policy tailwinds", "Expansion of train-protection coverage beyond initial pilot corridors", "Digital interlocking modernization"],
 keyRisks:["Order visibility concentrated in one policy program - a change in rollout pace directly hits revenue", "Some qualified suppliers are small, recently listed and loss-making", "Execution risk scaling production to meet an accelerated national rollout"],
 investorMetrics:["Kavach order-book growth and tender win rate", "Revenue/profit inflection versus pre-Kavach baseline", "Working-capital days amid rapid order growth"],
 relatedComponents:["braking","rolling_stock"],
 suppliers:[{key:"kernex", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"quadrantfuturetek", exposureType:"emerging_entrant", exposureStrength:"high"}, {key:"hblengineering", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"micelectronics", exposureType:"indirect_supplier", exposureStrength:"medium"}]},
 {id:"braking", color:"#C9315C", label:"Braking Systems & Auxiliary Coach Systems", pos:[1.25,0.2,-0.32], side:"bottom", desc:"Air-brake systems, couplers and onboard batteries/lighting that keep the train stoppable and liveable.",
 domainId:"train_safety_control", displayOrder:5, dataStatus:"demo",
 roleInSystem:"Provides the air-brake systems, couplers and onboard batteries/lighting that let a train stop safely and keep passengers comfortable between stations.",
 whyItMatters:"Braking performance is as safety-critical as signaling - it is the final, physical mechanism that actually stops the train that Kavach and signaling are designed to protect.",
 valuePoolDescription:"Braking and auxiliary-systems suppliers typically serve rail as one segment within a broader industrial or auto-component portfolio, so margins and disclosure vary widely by company.",
 bottlenecks:["Certification cycles for safety-critical brake equipment", "Several suppliers treat rail as a minor, undisclosed segment", "Supply concentration in a handful of qualified vendors"],
 keyDrivers:["New coach and wagon production volumes", "Fleet modernization replacing older brake/coupler technology", "Wagon fleet growth tied to freight corridor expansion"],
 keyRisks:["Rail is frequently a small slice of a diversified industrial/auto-component business", "Thin visibility into rail-specific order books"],
 investorMetrics:["Rail Equipment segment revenue where separately disclosed", "Wagon/coach production volumes as a demand proxy"],
 relatedComponents:["bogies","signaling"],
 suppliers:[{key:"escortskubota", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"stoneindia", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"hblengineering", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"elgiequip", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"epc", color:"#8B5E34", label:"Railway EPC, Track & Electrification Contractors", pos:[3.6,1.0,0.9], side:"right", desc:"New lines, doubling, track-laying and overhead electrification contractors that build the corridor itself.",
 domainId:"infrastructure_epc", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Builds the corridor itself - new lines, doubling, track-laying and overhead electrification that every train in this sector ultimately runs on.",
 whyItMatters:"Without corridor capacity and electrification, faster rolling stock like Vande Bharat has nowhere additional to run - EPC is the physical-network constraint on the whole system's growth.",
 valuePoolDescription:"EPC contractors capture large, long-duration project revenue but operate on competitively bid, often thin margins versus the equipment suppliers upstream.",
 bottlenecks:["Land acquisition and right-of-way delays", "Execution capacity across a large number of simultaneous projects", "Working-capital intensity of long-gestation government projects"],
 keyDrivers:["Indian Railways capex budget for new lines and doubling", "Push toward full network electrification", "Dedicated Freight Corridor and metro expansion", "Government infrastructure spending cycles"],
 keyRisks:["Railways is one vertical among several for most diversified EPC players", "Execution delays and cost overruns on fixed-price contracts", "Working-capital strain from milestone-based government billing"],
 investorMetrics:["Order book / book-to-bill ratio", "Execution pace (revenue recognized versus order book)", "Receivable days from government clients"],
 relatedComponents:["psu","traction"],
 suppliers:[{key:"rvnl", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"ircon", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"kalpataru", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"kec", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"salasar", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"afcons", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"cemindia", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"jkil", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"psu", color:"#B5179E", label:"Railway PSU Ecosystem: Financing, Ticketing & Digital Infra", pos:[4.6,0.85,-1.2], side:"right", desc:"The PSU layer that finances rolling stock, sells tickets and runs the digital/telecom backbone for Indian Railways.",
 domainId:"psu_ecosystem", displayOrder:7, dataStatus:"demo",
 roleInSystem:"The PSU layer that finances rolling stock, sells tickets and runs the digital/telecom backbone that keeps the rest of the system financed and connected.",
 whyItMatters:"This layer determines how rolling-stock capex actually gets funded and how the railway interacts commercially with passengers and freight customers - without it, the physical supply chain upstream has no funding mechanism or customer interface.",
 valuePoolDescription:"These PSUs capture recurring, largely monopoly-style revenue (financing spreads, ticketing fees, freight/logistics margins) rather than cyclical equipment-sale revenue.",
 bottlenecks:["Policy/regulatory dependence given near-monopoly PSU status", "Government ownership can limit pricing and strategic flexibility", "Digital infrastructure rollout pace tied to IR's own capex priorities"],
 keyDrivers:["Rolling-stock capex volumes (drives IRFC's leasing book)", "Passenger traffic and online ticketing penetration (IRCTC)", "Railway digitalization and data-centre/telecom expansion (RailTel)", "Container/freight volume growth (Concor)"],
 keyRisks:["Near-monopoly structure means financial performance is tightly linked to government policy, not market competition", "Regulatory or tariff changes directly affect economics", "Diversification beyond the core mandate carries execution risk"],
 investorMetrics:["Leasing book growth and spread (IRFC)", "Ticketing volume/convenience-fee trends (IRCTC)", "Dividend payout as a PSU-specific signal"],
 relatedComponents:["epc","rolling_stock"],
 suppliers:[{key:"irfc", exposureType:"enabler", exposureStrength:"high"}, {key:"irctc", exposureType:"enabler", exposureStrength:"high"}, {key:"railtel", exposureType:"enabler", exposureStrength:"high"}, {key:"rites", exposureType:"enabler", exposureStrength:"high"}, {key:"concor", exposureType:"operator", exposureStrength:"high"}]}
 ],
 suppliers: {
 titagarh: {name:"Titagarh Rail Systems", listed:true, role:"Vande Bharat/metro coaches, EMUs, freight wagons, forged wheels", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's few fully integrated coach-wagon-wheel manufacturers, and anchor partner (with Ramkrishna Forgings) in the dedicated 80,000-wheels/yr plant that gives it captive, import-substituting wheel supply"], risks:["Order-book and revenue depend heavily on large, lumpy government tenders","Faces competitive tendering against other coach/wagon OEMs on price"], f:fin([1468,2780,3853,3868,3186],[-1,126,286,87,123],"Rs 11,078 Cr","Rs 823","TITAGARH",null,[-6,1,54],[569,971],[1434,"titagarh-rail-systems-ltd"],[57.0,182,0.12,10.9,6.78,2.00])},
 texmaco: {name:"Texmaco Rail & Engineering", listed:true, role:"Freight wagons, steel/cast components and rail EPC (absorbed Kalindee Rail Nirman)", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified across wagon manufacturing, steel castings and rail EPC (via the absorbed Kalindee Rail Nirman business), spreading order-book risk across multiple rail revenue streams rather than wagons alone"], risks:["Part of a larger industrial group - standalone rail-only economics can be hard to isolate","Some historical financial data for this company was not reliably available"], f:fin([null,null,3503,5107,4377],[null,null,113,249,194],"Rs 5,113 Cr","Rs 126","TEXRAIL","FY22-FY23 not reliably retrieved; part of Adventz/Texmaco Group",[-9,-1,32],[78,143],[1380,"texmaco-rail-engineering-ltd"],[23.6,58.4,0.60,11.2,7.30,1.00])},
 beml: {name:"BEML Ltd", listed:true, role:"Metro coaches (Bengaluru/Kolkata/Chennai), diesel & electric locomotives", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades-long incumbent and one of only a handful of qualified metro-coach manufacturers in India, with Defence and Mining verticals cushioning any slowdown in rail orders"], risks:["Rail & Metro is only one of three business verticals (alongside Defence and Mining) - rail-specific economics are blended","Government PSU ownership can constrain strategic and pricing flexibility"], f:fin([4337,3899,4054,4022,4351],[129,158,282,293,141],"Rs 16,962 Cr","Rs 2,036","BEML","Govt Mini-Ratna PSU; Rail & Metro is one of three verticals alongside Defence and Mining",[-3.2,null,null],[1355,2277],[176,"beml-ltd"],[95.0,352,0.84,7.66,4.78,5.00])},
 jupiterwagons: {name:"Jupiter Wagons Ltd", listed:true, role:"Freight wagons, containers and braking systems", dataStatus:"demo", sourceDate:ASOF, strengths:["India's fastest-growing wagon maker, with in-house vertical integration into braking systems that gives it component control and margin capture most wagon-only peers lack"], risks:["Diversifying into EV bus bodies - future growth may increasingly depend on a business outside core wagons","Wagon demand is tied to freight-corridor capex cycles, which can be lumpy"], f:fin([1178,2068,3644,3963,2916],[50,121,331,380,166],"Rs 9,690 Cr","Rs 227","JWL","Fastest-growing wagon maker; diversifying into EV bus bodies and braking systems",[-33,-12,48],[224,358],[245,"jupiter-wagons-ltd"],[54.5,69.7,0.44,9.14,6.37,10.0])},
 stoneindia: {name:"Stone India Ltd", listed:true, role:"Legacy railway coupler, brake-valve & signaling-equipment maker (Kolkata)", dataStatus:"unverified", sourceDate:ASOF, strengths:["Long-standing legacy manufacturer with established product lines across couplers, brake valves and signaling equipment, reflecting decades of accumulated RDSO approvals in a hard-to-enter niche"], risks:["Publicly available financial data for this company is stale and needs direct verification before use","Described as a 'legacy' maker - scale and current relevance versus newer entrants is unclear"], f:fin([null,null,null,null,null],[null,null,null,null,null],null,null,"STONEINDIA","Screener's cached page only showed data through FY16; current financials need direct verification from exchange filings before use",null,null,[2880,"stone-india-ltd"],null)},
 ramkrishnaforgings: {name:"Ramkrishna Forgings", listed:true, role:"Forged wheels/axles - consortium (with Titagarh) for IR's 80,000-wheels/yr plant", dataStatus:"demo", sourceDate:ASOF, strengths:["Anchor partner in India's dedicated large-scale wheel-forging consortium plant, positioning it to capture a structurally import-substituting wheel market as Indian Railways reduces reliance on imported wheelsets"], risks:["Wheel/axle supply is concentrated around one dedicated consortium plant rather than diversified capacity","Forging is capital-intensive, making it hard to flex quickly with order timing"], f:fin([2320,3193,3705,4034,4238],[198,248,291,415,72],"Rs 13,073 Cr","Rs 704","RKFORGE",null,[32,3,27],[460,773],[1140,"ramkrishna-forgings-ltd"],[114,181,0.14,5.60,2.51,2.00])},
 bharatforge: {name:"Bharat Forge Ltd", listed:true, role:"Forged rail/loco engine & running-gear components (dedicated Rail business line)", dataStatus:"demo", sourceDate:ASOF, strengths:["Global-scale forging conglomerate with deep cross-industry engineering expertise (auto, aerospace, defence) that few rail-dedicated forging shops can match, backing a dedicated Rail business line"], risks:["Rail-specific revenue is not separately disclosed from the much larger consolidated forging business","Exposure to global auto/industrial forging cycles beyond rail"], f:fin([10461,12910,15682,15123,16812],[-127,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Kalyani Group flagship; rail-specific revenue not separately disclosed from consolidated figures",null,[1179,2295],null,[97.2,200,0.42,12.6,12.0,2.00])},
 timken: {name:"Timken India", listed:true, role:"Tapered roller and other bearings, including railway axle-box bearings", dataStatus:"demo", sourceDate:ASOF, strengths:["Global precision-bearings technology leader with established railway axle-box bearing qualifications, giving it engineering depth and quality systems transferable from its much larger industrial bearings base"], risks:["Bearings are sold across many industrial end-markets - rail is a minority, unquantified slice","No rail-specific order visibility is disclosed"], f:fin([null,null,null,3197,3478],[null,null,null,462,415],"Rs 24,116 Cr","Rs 3,206","TIMKEN","Not rail-exclusive - bearings sold across industrial end-markets",[7,1,13],[2800,3925],[1399,"timken-india-ltd"],[56.6,387,0.08,19.0,14.3,10.0])},
 nrbbearings: {name:"NRB Bearings", listed:true, role:"Needle-roller and other bearings across auto/industrial/rail", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-established domestic bearings manufacturer with deep auto-OEM manufacturing relationships and quality systems that carry over into rail-grade bearing supply"], risks:["Predominantly an auto-component bearings business - rail exposure is a minor, unquantified slice"], f:fin([null,1057,1094,1199,1335],[null,96,242,82,146],"Rs 5,183 Cr","Rs 535","NRBBEARING","Predominantly auto-component bearings; rail exposure is a minor, unquantified slice",[91,24,30],[213,549],[956,"nrb-bearings-ltd"],[34.7,99.3,1.49,18.4,15.6,2.00])},
 schaefflerindia: {name:"Schaeffler India", listed:true, role:"Bearings (INA/FAG brands) - industrial segment includes rail", dataStatus:"demo", sourceDate:ASOF, strengths:["Global precision-bearings technology leader (INA/FAG brands) with strong balance-sheet returns, backing its Industrial segment's rail-bearing qualifications with substantial R&D and manufacturing scale"], risks:["Rail is a small piece of a much larger diversified Industrial segment","Calendar-year reporting differs from Indian Railways' own fiscal cycle, complicating order-timing comparisons"], f:fin([6867,7251,8232,9686,null],[879,899,939,1150,null],"Rs 62,642 Cr","Rs 4,008","SCHAEFFLER","Calendar-year (Dec) reporting; rail is a small piece of the diversified Industrial segment",[0,7,22],[3518,4468],[406,"schaeffler-india-ltd"],[50.0,393,0.87,27.3,20.2,2.00])},
 bhel: {name:"BHEL", listed:true, role:"Electric locomotives, traction motors/alternators, propulsion equipment (Bhopal)", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of in-house traction-equipment design and manufacturing at its dedicated Bhopal facility make it one of the only domestic-heritage suppliers of electric locomotives and traction motors at full production scale"], risks:["Rail traction/locomotive business, while meaningful, is not the majority of a much larger power-equipment PSU","Government PSU ownership can constrain strategic and pricing flexibility"], f:fin([null,23365,23893,28339,33782],[null,654,282,534,1600],"Rs 1,45,881 Cr","Rs 419","BHEL","Govt Maharatna; rail traction/loco meaningful but not majority of a power-equipment business",[81.4,49,47],[230,447],[189,"bharat-heavy-electricals-ltd"],[60.0,75.1,0.33,9.14,6.23,2.00])},
 siemenschain: {name:"Siemens Ltd", listed:true, role:"Rail Mobility division - e-locomotives, metro trainsets, bogie plant (Aurangabad)", dataStatus:"demo", sourceDate:ASOF, strengths:["Global rail-mobility technology leader with a dedicated India bogie-manufacturing plant (Aurangabad), giving it access to Siemens' global traction and signaling IP for Indian tenders"], risks:["Rail Mobility is one of several segments alongside Energy and Digital Industries - segment-level rail economics are blended","Fiscal year (September-end) differs from Indian Railways' own budget cycle"], f:fin([13198,16138,19554,15146,null],[1089,1543,1962,2718,null],"Rs 1,38,068 Cr","Rs 3,877","SIEMENS","Fiscal year ends September; Mobility is one of several segments alongside Energy and Digital Industries",[25,22,26],[2826,4149],[1237,"siemens-ltd"],[91.8,389,0.46,21.4,19.2,2.00])},
 abbindia: {name:"ABB India", listed:true, role:"Traction transformers & equipment for Indian Railways/Alstom-built locomotives", dataStatus:"demo", sourceDate:ASOF, strengths:["Global electrical-equipment major with traction-transformer technology already qualified and running on Alstom-built locomotives for Indian Railways, demonstrating proven in-service track record"], risks:["Traction equipment for railways is one product line within a much larger diversified industrial business","Order book spans utility, industrial and rail customers with rail-specific share undisclosed"], f:fin([null,null,null,12188,13203],[null,null,null,1872,1668],"Rs 1,49,448 Cr","Rs 7,052","ABB",null,[36.3,19,31],[4638,7924],[17,"abb-india-ltd"],[97.0,441,0.56,29.9,22.4,17.0])},
 cgpower: {name:"CG Power & Industrial Solutions", listed:true, role:"Motors, transformers, confirmed Vande Bharat component orders", dataStatus:"demo", sourceDate:ASOF, strengths:["Confirmed, named supplier on Vande Bharat trainsets with Murugappa Group-backed turnaround and scale in motors and transformers manufacturing"], risks:["Rail is a growing but non-disclosed sub-slice of a diversified motors/transformers business"], f:fin([5484,6973,8046,9909,12418],[913,963,1428,973,1199],"Rs 1,39,586 Cr","Rs 886","CGPOWER","Rail is a growing but non-disclosed sub-slice",null,[526,981],[293,"cg-power-and-industrial-solutions-ltd"],[110,50.6,0.15,26.7,20.5,2.00])},
 hirect: {name:"Hirect Ltd", listed:true, role:"Power-electronic converters/rectifiers and railway transformation equipment", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades-old domestic power-electronics and rectifier manufacturer (formerly Hind Rectifiers) now repositioning specifically toward railway transformation-equipment demand"], risks:["Small-cap with limited scale versus larger traction-equipment suppliers","Renamed and repositioned recently - track record under the new strategy is short"], f:fin([null,null,518,655,999],[null,null,13,37,39],"Rs 4,301 Cr","Rs 1,213","HIRECT","Small-cap; formerly Hind Rectifiers, renamed to Hirect Ltd",[43,93,66],[565,1400],null,[110,60.7,0.12,18.8,25.2,2.00])},
 kernex: {name:"Kernex Microsystems (India)", listed:true, role:"Anti-collision device (ACD)/Kavach-class train-protection systems", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the earliest RDSO-certified Kavach suppliers, giving it first-mover qualification advantage that is now translating into an explosive order and profit inflection as the national rollout accelerates"], risks:["Revenue and profit are directly tied to the pace of the Kavach rollout - a change in program timing hits results quickly","Recent growth has been explosive and may be difficult to sustain at the same rate"], f:fin([7,4,20,190,430],[-17,-20,-27,50,88],"Rs 2,846 Cr","Rs 1,694","KERNEX","Explosive revenue/profit inflection FY24-FY26, directly tied to Kavach rollout orders",[56.2,57,88],[850,2586],[731,"kernex-microsystems-india-ltd"],[14.9,148,0.00,47.8,43.5,10.0])},
 quadrantfuturetek: {name:"Quadrant Future Tek Ltd", listed:true, role:"Train Control & Signalling (Kavach, electronic interlocking, digital axle counters)", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified train-control product portfolio spanning Kavach, electronic interlocking and digital axle counters gives it exposure across multiple signaling tender categories rather than a single niche"], risks:["Recently IPO'd and currently loss-making - an early-stage, high-risk name","Elevated working-capital days versus more established peers"], f:fin([null,null,151,150,153],[null,null,12,-20,-43],"Rs 2,190 Cr","Rs 548","QUADFUTURE","Recently IPO'd (Jan 2025); currently loss-making with elevated working-capital days - high-risk/early-stage name",[-15.5,-15.4,null],[249,560],[2897925,"quadrant-future-tek-ltd"],[null,64.5,0.00,-15.5,-15.4,10.0])},
 hblengineering: {name:"HBL Engineering Ltd", listed:true, role:"Kavach/train-protection electronics, signaling, train lighting & onboard batteries", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified base across Kavach signaling, train lighting/batteries and defense electronics gives it several RDSO-qualified revenue lines off the same manufacturing base, reducing dependence on Kavach timing alone"], risks:["Business spans Kavach/signaling, train lighting, batteries and defense electronics - no single segment is separately broken out","Recently repositioned/renamed, reflecting a strategic pivot still underway"], f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Renamed from HBL Power Systems, reflecting pivot toward Kavach/defence electronics",[-3.55,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.00])},
 micelectronics: {name:"MIC Electronics", listed:true, role:"LED passenger-information display systems, station displays (RDSO/RCF-approved)", dataStatus:"demo", sourceDate:ASOF, strengths:["Established RDSO/RCF-approved vendor for passenger-information display systems, a recurring niche tied to every new coach build and station upgrade with a limited qualified competitor set"], risks:["Small-cap with volatile earnings history","On BSE's Long-Term ASM surveillance stage as of Dec 2024, a liquidity/volatility flag"], f:fin([null,23,55,95,191],[null,0,62,10,-13],"Rs 1,071 Cr","Rs 36.1","MICEL","Small-cap, volatile earnings; on BSE's Long-Term ASM surveillance stage as of Dec 2024",null,[30.0,61.6],[861,"mic-electronics-ltd"],[null,8.97,0.00,8.67,-5.76,2.00])},
 escortskubota: {name:"Escorts Kubota Ltd", listed:true, role:"Dedicated Railway Equipment segment: air-brake systems, couplers, suspension", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the few manufacturers with a long-standing dedicated Railway Equipment segment for air-brake systems and couplers, backed by the much larger Escorts Kubota balance sheet"], risks:["Railway Equipment is roughly 11% of company-wide revenue - a minority segment within a much larger agri/construction-equipment business"], f:fin([7283,8429,9804,10244,11540],[736,637,1077,1265,2394],"Rs 31,949 Cr","Rs 2,856","ESCORTS","Company-wide figures span Agri Machinery, Construction Equipment and Railway Equipment (~11% of revenue)",[-19,-4,14],[2700,3999],[387,"escorts-kubota-ltd"],[22.4,1106,1.16,13.9,18.7,10.0])},
 rvnl: {name:"Rail Vikas Nigam Ltd", listed:true, role:"Flagship railway-project EPC PSU - new lines, doubling, electrification, metro/bridge works", dataStatus:"demo", sourceDate:ASOF, strengths:["Flagship Navratna PSU under the Ministry of Railways with near-guaranteed access to India's largest railway EPC tenders and an execution track record competitors struggle to match"], risks:["Government PSU ownership can constrain strategic and pricing flexibility","Revenue depends almost entirely on Indian Railways' own capex and tendering pace"], f:fin([19382,20282,21879,19923,20412],[1110,1342,1551,1278,871],"Rs 43,160 Cr","Rs 207","RVNL","Govt Navratna PSU under Ministry of Railways",[-39,7,47],[195,401],[139596,"rail-vikas-nigam-ltd"],[48.0,47.1,0.83,10.8,9.02,10.0])},
 ircon: {name:"Ircon International Ltd", listed:true, role:"Rail EPC (domestic + international), electrification, bridges", dataStatus:"demo", sourceDate:ASOF, strengths:["Miniratna PSU with both domestic and international EPC track record, giving it revenue diversification beyond India's own rail capex cycle"], risks:["Revenue has declined over the last two years in the shown data","Government PSU ownership can constrain strategic and pricing flexibility"], f:fin([7380,10368,12514,10760,9071],[592,765,930,728,592],"Rs 9,965 Cr","Rs 106","IRCON","Miniratna PSU; revenue has declined the last two years",null,[105,186],[109297,"ircon-international-ltd"],[19.0,70.6,1.79,9.27,8.19,2.00])},
 kalpataru: {name:"Kalpataru Projects International Ltd", listed:true, role:"Diversified EPC incl. a Railways vertical, alongside power T&D and pipelines", dataStatus:"demo", sourceDate:ASOF, strengths:["Large diversified EPC balance sheet and execution capacity across power T&D and pipelines cushions the railways vertical from any single-segment slowdown while still capturing railway EPC upside"], risks:["Railways is one of several verticals - company-wide figures blend it with power T&D and pipelines"], f:fin([null,16361,19626,22316,27143],[null,435,516,567,1031],"Rs 23,758 Cr","Rs 1,391","KPIL","Railways is one of several verticals; company-wide, not rail-only, figures",null,[1007,1500],[712,"kalpataru-projects-international-ltd"],[21.4,455,0.79,18.3,13.7,10.0])},
 kec: {name:"KEC International Ltd", listed:true, role:"Power T&D + Railways + Civil + Urban Infra + Cables EPC", dataStatus:"demo", sourceDate:ASOF, strengths:["Scale diversification across power T&D, civil, urban infra and cables gives it the balance-sheet depth and execution bandwidth to bid for large railway EPC packages alongside its core T&D business"], risks:["Railways is a named segment but its results are not broken out numerically from the diversified EPC business"], f:fin([13742,17282,19914,21847,23506],[332,176,347,571,606],"Rs 10,567 Cr","Rs 397","KEC","Railways is a named segment but not broken out numerically",null,[389,894],[727,"kec-international-ltd"],[17.6,231,1.39,16.5,11.4,2.00])},
 salasar: {name:"Salasar Techno Engineering", listed:true, role:"Galvanized steel structures - OHE electrification masts and railway over-bridges", dataStatus:"demo", sourceDate:ASOF, strengths:["Established galvanized-structure manufacturing base feeding both railway electrification masts and broader transmission-tower demand gives it an order pipeline beyond one-off rail contracts"], risks:["Small-cap; rail structures are one product line within a broader towers/EPC business"], f:fin([null,1005,1208,1447,1503],[null,40,53,19,18],"Rs 822 Cr","Rs 4.70","SALASAR","Small-cap; rail structures are one product line within a broader towers/EPC business",null,[4.66,11.5],[56821,"salasar-techno-engineering-ltd"],[60.0,4.77,0.00,8.13,2.13,1.00])},
 irfc: {name:"Indian Railway Finance Corporation", listed:true, role:"Financing arm - leases rolling stock and infrastructure assets to Indian Railways", dataStatus:"demo", sourceDate:ASOF, strengths:["Sole dedicated financing vehicle for Indian Railways' rolling-stock and infrastructure capex, giving it a structurally captive, sovereign-backed lending book with minimal credit risk"], risks:["Concentrated almost entirely on financing Indian Railways - performance is tightly linked to IR's own capex and credit policy, not a diversified loan book"], f:fin([20299,23892,26650,27153,27285],[6090,6337,6412,6502,7009],"Rs 1,04,483 Cr","Rs 80.0","IRFC","NBFC structure - funds nearly all rolling-stock capex for Indian Railways",[-34,2,29],[78.1,137],[402503,"indian-railway-finance-corporation-ltd"],[14.5,43.4,2.63,5.64,12.8,10.0])},
 irctc: {name:"IRCTC", listed:true, role:"Online ticketing monopoly, catering, tourism/packages, Rail Neer", dataStatus:"demo", sourceDate:ASOF, strengths:["Statutory monopoly on Indian Railways' online ticketing with no real competing channel, generating high-margin, high-ROE fee income that is largely insulated from capex cycles"], risks:["Near-monopoly status means economics are tightly linked to government/regulatory policy toward ticketing fees and convenience charges"], f:fin([null,3541,4260,4675,5215],[null,1006,1111,1315,1393],"Rs 36,696 Cr","Rs 459","IRCTC","Navratna PSU, near-monopoly on IR e-ticketing",[-35,-12,-10],[446,736],[167028,"indian-railway-catering-tourism-corporation-ltd"],[26.6,53.9,1.96,46.1,34.4,2.00])},
 railtel: {name:"RailTel Corporation of India", listed:true, role:"Nationwide railway telecom/fibre network, station Wi-Fi, cloud/data-centre services", dataStatus:"demo", sourceDate:ASOF, strengths:["Owns a nationwide fibre backbone laid along railway right-of-way - a hard-to-replicate physical asset now being monetized into cloud and data-centre services beyond its core telecom mandate"], risks:["Expanding into data-centre/cloud services beyond its core railway telecom mandate carries execution risk"], f:fin([1522,1957,2568,3478,4277],[208,188,246,300,346],"Rs 8,349 Cr","Rs 260","RAILTEL","Miniratna PSU; FY25 profit milestone (~Rs 300 Cr) widely reported in press",[-31,6,15],[245,401],null,[22.5,70.5,1.25,22.8,17.1,10.0])},
 rites: {name:"RITES Ltd", listed:true, role:"Railway consultancy, design, rolling-stock export/leasing, project management", dataStatus:"demo", sourceDate:ASOF, strengths:["Navratna PSU consultancy with a diversified mandate spanning design consultancy, rolling-stock export/leasing and project management, giving it revenue touchpoints across nearly every stage of a rail project"], risks:["Revenue has been gently declining over the shown period","Government PSU ownership can constrain strategic and pricing flexibility"], f:fin([2662,2628,2453,2196,2415],[539,571,495,424,454],"Rs 9,579 Cr","Rs 199","RITES","Navratna PSU; revenue has been gently declining over the shown period",null,[175,260],[92280,"rites-ltd"],[23.0,55.8,3.99,23.0,15.4,10.0])},
 afcons: {name:"Afcons Infrastructure", listed:true, role:"Railway and metro civil construction (EPC)", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by the Shapoorji Pallonji group's deep complex-infrastructure execution track record (tunnels, bridges), differentiating it on technically demanding metro and rail civil packages"], risks:["Recently listed (Nov 2024) with limited trading history","Railway and metro work is one segment within a broader, diversified infrastructure EPC portfolio"], f:fin([11019,12637,13268,12548,11948],[358,411,450,487,251],"Rs 9,287 Cr","Rs 252","AFCONS","Listed Nov 2024 (IPO); 3Y/5Y stock price CAGR not applicable (insufficient trading history)",[-42,null,null],[225,479],null,[45.3,148,0.79,13.9,5.61,10.0])},
 cemindia: {name:"Cemindia Projects (fka ITD Cementation India)", listed:true, role:"Railway and metro civil construction (EPC)", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of civil-construction execution track record (as ITD Cementation) now backed by the Adani Group's balance sheet and infrastructure ambitions following the 2025 acquisition"], risks:["Recently renamed and changed ownership (Adani Group acquisition, 2025) - strategic direction under new ownership is still unfolding","Railway and metro work is one segment within a broader civil-construction portfolio"], f:fin([3809,5091,7718,9246,10061],[69,125,274,373,598],"Rs 21,597 Cr","Rs 1,257","CEMPRO","Renamed from ITD Cementation India Ltd to Cemindia Projects Ltd (ticker CEMPRO) in 2025 after Adani Group acquisition",[57,80,75],[481,1650],null,[35.9,140,0.24,32.8,27.8,1.00])},
 jkil: {name:"J Kumar Infraprojects", listed:true, role:"Metro and railway civil construction (EPC)", dataStatus:"demo", sourceDate:ASOF, strengths:["Established Mumbai-centric metro civil-construction track record with an in-house equipment fleet, giving it execution cost advantages on technically demanding urban metro packages"], risks:["Metro and railway work is one segment within a broader roads/irrigation/buildings construction business","Consolidated financial history is only available from FY2023 onward"], f:fin([null,4203,4879,5693,5723],[null,274,331,391,387],"Rs 3,583 Cr","Rs 474","JKIL","Consolidated P&L on Screener only available from FY2023 onward",[-24,4,21],[425,672],null,[9.21,445,0.84,18.4,12.4,5.00])},
 elgiequip: {name:"Elgi Equipments", listed:true, role:"Air compressors for railway braking and pneumatic systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established global air-compressor manufacturer with export scale, giving its railway braking/pneumatic product line engineering and manufacturing depth beyond what a rail-only vendor could sustain"], risks:["Railway braking/pneumatic systems are a narrow niche within a much larger industrial air-compressor business"], f:fin([2525,3041,3218,3510,3951],[178,371,312,350,430],"Rs 19,110 Cr","Rs 603","ELGIEQUIP",null,[24,6,24],[408,653],null,[41.2,70.4,0.45,22.1,19.0,1.00])},
 concor: {name:"Container Corporation of India", listed:true, role:"Rail freight/container logistics operator - runs container trains and ICDs under the Ministry of Railways", dataStatus:"demo", sourceDate:ASOF, strengths:["Dominant market share and first-mover scale in India's container rail-freight/ICD network, operating under the Ministry of Railways with few comparable competitors at its network size"], risks:["An operator of rail-freight logistics, not a rolling-stock or component supplier - different business/risk profile than the rest of this sector","Container/freight volumes are sensitive to broader trade and economic cycles"], f:fin([7653,8169,8653,8887,9079],[1052,1173,1262,1293,1246],"Rs 35,149 Cr","Rs 462","CONCOR","Operator, not a rolling-stock/component supplier - included here for its centrality to the rail-freight ecosystem",[-12,-7,-4],[421,558],null,[28.3,170,1.86,12.6,9.81,5.00])}
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

 // Underframe & bogies (three coaches + cab nose). coachCenters drives every
 // layer below (underframe, traction, body) so bogies/equipment/windows all
 // land under the coach they belong to - the original had a `coachXs` array
 // that was computed but never actually read by the render loop, so none of
 // this lined up; it's the single shared source of truth now.
 var COACH_LEN = 1.6, COACH_PITCH = 1.75;
 var coachCenters = [-COACH_PITCH, 0, COACH_PITCH];
 var bogieXs = [];
 coachCenters.forEach(function(cx){ bogieXs.push(cx-0.5, cx+0.5); });
 var frameSpan = COACH_PITCH*2 + COACH_LEN + 0.3;
 var underframe = new THREE.Mesh(new THREE.BoxGeometry(frameSpan,0.14,0.82), matUnderframe);
 underframe.position.set(0,0.32,0); underframeGroup.add(underframe);
 var battery = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.14,0.5), matUnderframe);
 battery.position.set(0.9,0.24,0.32); underframeGroup.add(battery);
 bogieXs.forEach(function(bx){
 [-0.34,0.34].forEach(function(bz){
 var bogie = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.18,0.7), matUnderframe);
 bogie.position.set(bx,0.2,0); underframeGroup.add(bogie);
 [-0.14,0.14].forEach(function(wx){
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
 // Sleepers - cheap repetition that reinforces "railway track" under the train.
 for (var si=-4;si<=4;si++){
 var sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.03,1.0), new THREE.MeshStandardMaterial({color:0x4a4237, transparent:true, opacity:1}));
 sleeper.position.set(si*0.95,0.015,0); trackGroup.add(sleeper);
 }

 // Traction & braking systems - a real diamond pantograph (two scissor arms
 // meeting a horizontal collector pan, not two tubes converging to a point),
 // sized to the coach roof instead of towering almost 1.5x coach height above it.
 var ROOF_Y = 1.24;
 var pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.04,0.3), matPantograph);
 pantoBase.position.set(coachCenters[1],ROOF_Y,0); tractionGroup.add(pantoBase);
 var collectorPan = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.03,0.08), matPantograph);
 collectorPan.position.set(coachCenters[1],ROOF_Y+0.28,0); tractionGroup.add(collectorPan);
 [-1,1].forEach(function(dir){
 tube([[coachCenters[1],ROOF_Y+0.02,0],[coachCenters[1]+dir*0.12,ROOF_Y+0.16,0],[coachCenters[1]+dir*0.2,ROOF_Y+0.28,0]], 0.015, matPantograph, tractionGroup);
 });
 var converter = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.16,0.6), matTraction);
 converter.position.set(coachCenters[0],0.22,-0.32); tractionGroup.add(converter);
 var tractionMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.35,14), matTraction);
 tractionMotor.rotation.z = Math.PI/2;
 tractionMotor.position.set(coachCenters[2],0.2,0.42); tractionGroup.add(tractionMotor);
 [bogieXs[2],bogieXs[3]].forEach(function(rx){
 var reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,10), matBrake);
 reservoir.rotation.x = Math.PI/2;
 reservoir.position.set(rx,0.34,0.2); tractionGroup.add(reservoir);
 });

 // Coach body & cab electronics - taller than wide (real Vande Bharat coaches
 // are ~4.14m tall x 3.24m wide), with a rounded roof cap instead of a flat lid.
 coachCenters.forEach(function(cx){
 var coach = new THREE.Mesh(new THREE.BoxGeometry(COACH_LEN,0.85,0.78), matBody);
 coach.position.set(cx,0.815,0); bodyGroup.add(coach);
 var roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.39,0.39,COACH_LEN,10,1,true,0,Math.PI), matBody);
 roofCap.rotation.z = Math.PI/2; roofCap.scale.y = 0.35;
 roofCap.position.set(cx,1.24,0); bodyGroup.add(roofCap);
 var band = new THREE.Mesh(new THREE.BoxGeometry(COACH_LEN+0.02,0.1,0.80), matBodyAccent);
 band.position.set(cx,0.46,0); bodyGroup.add(band);
 [-0.5,0,0.5].forEach(function(wx){
 var win1 = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.02), matWindow);
 win1.position.set(cx+wx,0.92,0.39); bodyGroup.add(win1);
 var win2 = win1.clone(); win2.position.z = -0.39; bodyGroup.add(win2);
 });
 });
 // Coupler/gangway fairings in the inter-coach gaps so they read as a
 // connected trainset rather than three separate blocks with gaps cut in them.
 [coachCenters[0]+ (COACH_PITCH-COACH_LEN)/2 + COACH_LEN/2, coachCenters[1]+(COACH_PITCH-COACH_LEN)/2+COACH_LEN/2].forEach(function(gx){
 var gangway = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.5,0.6), matWindow);
 gangway.position.set(gx,0.75,0); bodyGroup.add(gangway);
 });

 // Nose: an extruded shallow droop-nose profile (long, rounded taper) instead
 // of a 4-sided cone, butted flush against the lead coach's front face.
 var noseBackX = coachCenters[0] - COACH_LEN/2;
 var noseTipX = noseBackX - 0.95;
 var noseShape = new THREE.Shape();
 noseShape.moveTo(noseBackX, 0.39);
 noseShape.lineTo(noseBackX, 1.24);
 noseShape.quadraticCurveTo((noseBackX+noseTipX)/2, 1.20, noseBackX-0.65, 0.92);
 noseShape.quadraticCurveTo(noseTipX+0.1, 0.70, noseTipX, 0.55);
 noseShape.quadraticCurveTo(noseTipX+0.05, 0.42, noseBackX-0.55, 0.40);
 noseShape.lineTo(noseBackX, 0.39);
 noseShape.closePath();
 var noseGeo = new THREE.ExtrudeGeometry(noseShape, {depth:0.78, bevelEnabled:true, bevelThickness:0.015, bevelSize:0.015, bevelSegments:2, curveSegments:10});
 noseGeo.translate(0,0,-0.39);
 bodyGroup.add(new THREE.Mesh(noseGeo, matBody));
 [1,-1].forEach(function(side){
 var headlight = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,0.1), matSignal);
 headlight.position.set(noseTipX+0.08,0.46,side*0.16); bodyGroup.add(headlight);
 });
 var windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.3,0.6), matWindow);
 windshield.position.set(noseBackX-0.45,0.95,0); windshield.rotation.y = 0.5; bodyGroup.add(windshield);
 var kavachDome = new THREE.Mesh(new THREE.SphereGeometry(0.08,12,10), matSignal);
 kavachDome.position.set(noseBackX-0.1,1.3,0); bodyGroup.add(kavachDome);
 var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.2,6), matSignal);
 antenna.position.set(noseBackX-0.1,1.42,0); bodyGroup.add(antenna);

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
 // --- Industry-level narrative (data-model upgrade, matching the pattern first carried by datacenter) ---
 whyNow: "India's naval shipbuilding program is accelerating as the Navy modernizes its surface fleet and submarine arm under an explicit indigenization mandate, pulling steel, propulsion, weapons and electronics spend into domestic shipyards years ahead of past cycles.",
 thesisSummary: "Naval shipbuilding converts India's warship and submarine procurement into a concrete, long-cycle industrial build-out - hull steel, propulsion, combat systems and electronics all scale with every new-build and export order the shipyards win.",
 featuredSignals: ["New warship/submarine order wins and contract awards", "Project-75I submarine program progress", "Shipyard capacity expansion and dry-dock investments", "Export orders to friendly foreign navies", "Indigenization content milestones on major platforms"],
 dataStatus: "demo",
 integratorZoneId: "shipyard",
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
 domains: [
 {id:"shipyard_hull", title:"Shipyards & Hull Integration", shortTitle:"Shipyards", description:"The shipyards that build and integrate complete warships and submarines, plus the warship-grade steel and structural metallurgy that forms their hulls.", color:"#4C6EF5", relatedDomains:["propulsion_power","combat_weapons"]},
 {id:"propulsion_power", title:"Propulsion & Power", shortTitle:"Propulsion", description:"Main engines, gensets, turbines and turbo-alternators that power the ship's propulsion and onboard electrical systems.", color:"#7A5CC7", relatedDomains:["shipyard_hull","marine_components"]},
 {id:"combat_weapons", title:"Combat Systems & Weapons", shortTitle:"Combat", description:"Missiles, torpedoes, naval guns, explosives and ammunition that arm the platform.", color:"#C9315C", relatedDomains:["shipyard_hull","electronics_sensors"]},
 {id:"electronics_sensors", title:"Electronics, Sensors & C4I", shortTitle:"Electronics", description:"Combat management systems, radar, sonar and electronic-warfare suites that let the platform detect, track and engage targets.", color:"#1E9E76", relatedDomains:["combat_weapons","shipyard_hull"]},
 {id:"marine_components", title:"Specialty Marine Components", shortTitle:"Components", description:"Pumps, valves, batteries, compressors and deck machinery that keep a ship's systems running below decks.", color:"#C99A2E", relatedDomains:["propulsion_power","shipyard_hull"]}
 ],
 zones: [
 {id:"shipyard", color:"#4C6EF5", label:"Warship & Submarine Construction (Shipyards)", pos:[0,1.1,0], side:"top", desc:"The shipyards that build and integrate complete frigates, destroyers, corvettes and submarines.",
 domainId:"shipyard_hull", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The shipyards that physically assemble hull, propulsion, weapons and electronics into a complete, commissioned warship or submarine.",
 whyItMatters:"This is the final integration point where every other layer's output becomes a deliverable platform the Navy actually accepts and commissions.",
 valuePoolDescription:"Shipyards capture the largest, most visible contract value as prime integrators, though margins are constrained by long fixed-price build cycles and cost overruns on complex first-of-class vessels.",
 bottlenecks:["Limited dry-dock/slipway capacity across India's handful of qualified yards", "Long multi-year build cycles that tie up capacity per vessel", "Design and technology-transfer dependence on foreign OEMs for submarines and some combat systems"],
 keyDrivers:["Indian Navy and Coast Guard fleet modernization and replacement cycles", "Indigenization push (Make in India / Atmanirbhar Bharat) favoring domestic yards", "Export orders for patrol vessels/corvettes to friendly foreign navies", "Submarine program award timing (P75I and follow-on orders)"],
 keyRisks:["Order lumpiness - revenue tied to a handful of large, infrequently awarded contracts", "Execution/cost-overrun risk on complex first-of-class builds", "Only one listed pure-play submarine builder, concentrating that sub-segment's risk"],
 investorMetrics:["Order book size and book-to-bill ratio", "Execution/delivery schedule adherence vs. contracted milestones", "Margin trend across successive hulls of the same class (learning-curve effect)"],
 relatedComponents:["hull","propulsion","combat"],
 suppliers:[{key:"mazagondock", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"cochinshipyard", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"grse", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"lt_naval", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"titagarh_naval", exposureType:"owner", exposureStrength:"low"}, {key:"hsl", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"gsl", exposureType:"direct_supplier", exposureStrength:"high"}]},
 {id:"hull", color:"#8B5E34", label:"Hull, Steel Plates & Structural Metallurgy", pos:[0,0.4,0.78], side:"bottom", desc:"Warship-grade steel plate, titanium and welding consumables that form the hull and pressure structures.",
 domainId:"shipyard_hull", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Supplies the warship-grade steel plate, titanium alloys and welding consumables that shipyards fabricate into the hull and pressure structures.",
 whyItMatters:"Hull integrity and weight directly determine a vessel's speed, range, survivability and, for submarines, dive depth - materials quality here is a hard physical constraint on ship performance.",
 valuePoolDescription:"A near-monopoly PSU supplier captures most of the value on bulk warship-grade steel, while specialty alloy and welding-consumable makers earn smaller, higher-margin niches on submarine-grade materials.",
 bottlenecks:["Effective monopoly/near-monopoly on indigenous warship-grade steel and submarine alloys limits sourcing flexibility", "Long qualification cycles for new material grades on defense programs", "Capacity constraints at the few mills certified to produce DMR-grade plate"],
 keyDrivers:["Shipyard order backlog and steel-plate offtake volumes", "Submarine-grade titanium/maraging-steel demand tied to new-build programs", "Indigenization targets reducing imported specialty-steel reliance"],
 keyRisks:["Revenue concentrated in a government-linked, cyclical capex program rather than diversified demand", "Naval share of revenue typically undisclosed within much larger steel/metallurgy businesses", "Input-cost and capacity-utilization swings common to commodity steel producers"],
 investorMetrics:["Naval/defense order inflow where disclosed separately from broader steel sales", "Capacity utilization at specialty-alloy facilities", "Qualification wins for new material grades"],
 relatedComponents:["shipyard","components"],
 suppliers:[{key:"sail", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"midhani", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"adorwelding", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"propulsion", color:"#7A5CC7", label:"Marine Propulsion Systems & Engines", pos:[-3.0,0.6,0], side:"left", desc:"Main engines, gensets, turbines and turbine-generators that power the ship and its systems.",
 domainId:"propulsion_power", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Supplies the main engines, gensets, turbines and turbo-alternators that power a warship's propulsion, electrical generation and onboard systems.",
 whyItMatters:"Propulsion performance sets a vessel's speed, range and endurance - the operational envelope within which the Navy can actually deploy the ship.",
 valuePoolDescription:"Large industrial-engine and turbine makers earn marine/defense as a smaller, higher-reliability-margin slice alongside much larger industrial or power-equipment businesses.",
 bottlenecks:["Marine-grade engine/turbine orders are a small, often undisclosed slice of much larger industrial businesses", "Technology dependence on foreign licensors for some high-end marine turbines/gearboxes", "Long qualification and testing cycles before a new engine family enters naval service"],
 keyDrivers:["New-build and refit propulsion orders tied to shipyard construction schedules", "Navy's push to indigenize propulsion and auxiliary power content", "Turbine-generator and genset replacement/upgrade cycles on in-service vessels"],
 keyRisks:["Naval propulsion is a minority, often undisclosed slice of diversified industrial-engine businesses", "Customer concentration in a single government buyer (Ministry of Defence/Navy)", "One supplier here is a chronic loss-maker - financial-distress risk distinct from demand risk"],
 investorMetrics:["Defense/marine order wins disclosed separately from the industrial-engine segment", "Order-to-delivery lead times versus shipyard build schedules", "Margin trend in the defense/marine segment versus the core industrial business"],
 relatedComponents:["shipyard","components"],
 suppliers:[{key:"kirloskaroilengines", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"bhel_naval", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"bharatforge_naval", exposureType:"emerging_entrant", exposureStrength:"low"}, {key:"walchandnagar", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"combat", color:"#C9315C", label:"Combat Systems, Weapons, Explosives & Ammunition", pos:[1.0,1.3,0.4], side:"top", desc:"Missiles, torpedoes, naval guns and the warheads/explosives that arm the platform.",
 domainId:"combat_weapons", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Supplies the missiles, torpedoes, naval guns and warheads/explosives that arm the platform and give it offensive and defensive capability.",
 whyItMatters:"Weapons and sensor integration is what converts a steel hull into an actual warfighting platform - this layer is the Navy's core operational requirement.",
 valuePoolDescription:"Government-owned missile/torpedo primes capture the bulk of high-value contract revenue, while explosives and simulator makers hold smaller, more diversified niches.",
 bottlenecks:["Government-owned prime (Bharat Dynamics) dominates missile/torpedo supply, limiting private competition", "Long DRDO-to-production technology-transfer cycles for new weapon systems", "Export-control and technology-sharing restrictions on advanced munitions"],
 keyDrivers:["Navy's missile/torpedo/ammunition replenishment and modernization cycles", "Defense explosives demand as platforms are armed and re-armed", "Simulator/training-system procurement alongside live-weapon programs"],
 keyRisks:["Revenue concentrated in a small number of large, lumpy government contracts", "Several suppliers here serve all three armed services, not navy-specific demand", "Order timing is politically/budget-cycle dependent rather than steady state"],
 investorMetrics:["Missile/torpedo/ammunition order book and execution pace", "Export order wins to friendly foreign navies", "Segment mix - defense vs. commercial explosives revenue split"],
 relatedComponents:["shipyard","electronics"],
 suppliers:[{key:"bdl", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"solarindustries", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"premierexplosives", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"zentechnologies", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"electronics", color:"#1E9E76", label:"Naval Electronics, Sensors, Radar & Sonar", pos:[1.1,2.4,0], side:"top", desc:"Combat management systems, radar, sonar and electronic warfare suites mounted on the mast and bridge.",
 domainId:"electronics_sensors", displayOrder:5, dataStatus:"demo",
 roleInSystem:"Supplies the combat management systems, radar, sonar and electronic-warfare suites mounted on the mast and bridge that let the platform detect, track and engage targets.",
 whyItMatters:"Modern naval combat effectiveness depends as much on sensors and situational awareness as on weapons - this layer is what lets the ship 'see' and coordinate before it fires.",
 valuePoolDescription:"A dominant, vertically-integrated PSU captures the anchor share of naval electronics value, while smaller specialist and component-level players compete for sub-system and tier-2 supply roles.",
 bottlenecks:["Dominant PSU supplier concentrates program risk with one anchor vendor", "Several specialist suppliers are not navy-exclusive, diluting capacity available for naval programs", "RF/microwave and semiconductor component sourcing is still partly import-dependent"],
 keyDrivers:["Combat-management-system and sensor upgrade cycles on new and in-service vessels", "Indigenization of radar/sonar/EW content historically imported", "Broader defense-electronics capex, not naval-specific alone"],
 keyRisks:["Smaller suppliers here show volatile or deteriorating financials - one name's revenue nearly halved and turned loss-making", "Naval-specific revenue is rarely disclosed separately from the broader defense-electronics business", "Execution/scale is concentrated in one anchor PSU, leaving tier-2 names more exposed to order lumpiness"],
 investorMetrics:["Order book and book-to-bill specific to naval/defense electronics where disclosed", "Margin trend at the anchor PSU versus smaller specialist suppliers", "New sensor/EW program wins and qualification milestones"],
 relatedComponents:["combat","shipyard"],
 suppliers:[{key:"bel_naval", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"datapatterns", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"astramicrowave", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"paras", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"apollomicro", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"dcxsystems", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"mtartech_naval", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"centum", exposureType:"direct_supplier", exposureStrength:"low"}]},
 {id:"components", color:"#C99A2E", label:"Specialty Marine Components", pos:[-1.0,0.35,-0.78], side:"bottom", desc:"Pumps, valves, batteries and deck machinery that keep the ship's systems running below decks.",
 domainId:"marine_components", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Supplies the pumps, valves, batteries, compressors and deck machinery that keep a ship's systems running below decks, outside the headline hull/propulsion/weapons layers.",
 whyItMatters:"These components are individually unglamorous but functionally essential - failure in pumps, batteries or deck machinery can take a vessel out of service regardless of how capable its weapons or sensors are.",
 valuePoolDescription:"Component makers earn relatively modest, often unit-level margins, but benefit from long aftermarket/replacement revenue once equipment is qualified and installed on a vessel class.",
 bottlenecks:["Long qualification cycles before a new component wins naval-grade certification", "Naval work is a small, often undisclosed slice of much larger industrial component businesses", "Some suppliers' naval linkage is weakly evidenced relative to their other end-markets"],
 keyDrivers:["New-build and refit demand for pumps, compressors, batteries and deck machinery", "Navy's push toward indigenized auxiliary/below-decks equipment", "Replacement/aftermarket cycles on in-service vessels"],
 keyRisks:["Naval revenue typically undisclosed within much larger industrial/diversified businesses", "Some suppliers' naval linkage is now a minority of a business increasingly driven by unrelated segments (e.g. railway signalling)", "Private/unlisted suppliers here carry no public financial disclosure at all"],
 investorMetrics:["Confirmed naval contract wins and program-specific disclosures where available", "Revenue growth inflections tied to large new orders", "Segment mix shift toward or away from naval/defense work"],
 relatedComponents:["hull","propulsion"],
 suppliers:[{key:"kirloskarbrothers", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"kirloskarpneumatic", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"hblengineering_naval", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"azadengineering", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"knorrbremsenaval", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"kinecokaman_naval", exposureType:"indirect_supplier", exposureStrength:"low"}]}
 ],
 suppliers: {
 mazagondock: {name:"Mazagon Dock Shipbuilders", listed:true, role:"India's largest warship builder - sole domestic yard for Scorpene submarines and major surface combatants", dataStatus:"demo", sourceDate:ASOF, strengths:["Sole domestic builder of Scorpene-class submarines and the Navy's primary destroyer/frigate yard, giving it an entrenched, multi-decade order relationship with the Ministry of Defence that new entrants cannot easily replicate"], risks:["Revenue concentrated in a small number of large, infrequently awarded government contracts","Execution risk on complex, first-of-class submarine and destroyer builds"], f:fin([4048,5733,7827,9467,11432],[514,611,1119,1937,2414],"Rs 88,727 Cr","Rs 2,200","MAZDOCK","Only listed pure-play submarine builder; monopoly-adjacent on P75 Scorpene follow-ons and P75I contention",null,[2057,2930],[305195,"mazagon-dock-shipbuilders-ltd"],[31.0,242,0.82,36.0,29.2,5.00])},
 cochinshipyard: {name:"Cochin Shipyard", listed:true, role:"Largest public shipyard - built India's indigenous aircraft carrier (IAC Vikrant), ASW corvettes", dataStatus:"demo", sourceDate:ASOF, strengths:["Only Indian yard to have delivered a domestically-built aircraft carrier, a capability and credibility base competitors cannot quickly replicate","Ship-repair revenue provides a steadier, recurring counterweight to the lumpy new-build carrier/destroyer order cycle"], risks:["Order lumpiness - large carrier/destroyer programs are awarded infrequently","Diversified into ship-repair revenue, which carries different margin and cycle dynamics than new-build"], f:fin([3191,2365,3830,4820,5022],[564,305,783,827,717],"Rs 36,226 Cr","Rs 1,377","COCHINSHIP","Only Indian yard to have delivered a domestically-built aircraft carrier; also runs a ship-repair facility",null,[1187,1930],[57095,"cochin-shipyard-ltd"],[53.3,223,0.65,16.2,12.5,5.00])},
 grse: {name:"Garden Reach Shipbuilders & Engineers", listed:true, role:"Corvettes, frigates, survey vessels and fast patrol craft (Kolkata)", dataStatus:"demo", sourceDate:ASOF, strengths:["Highest ROCE/ROE among the listed PSU shipyards, with revenue growing roughly 6x over five years on export and ASW-corvette demand"], risks:["Recent revenue growth is concentrated in export and ASW-craft orders that may not repeat at the same pace","Order book still dependent on a small number of government/export contracts"], f:fin([1754,2561,3593,5076,7002],[190,228,357,527,748],"Rs 26,565 Cr","Rs 2,319","GRSE","Highest ROCE/ROE of the PSU shipyards; revenue grew ~6x in 5 years, largely export/ASW-craft driven",null,[1964,3339],[105874,"garden-reach-shipbuilders-engineers-ltd"],[33.2,229,0.85,42.8,31.6,10.0])},
 lt_naval: {name:"Larsen & Toubro", listed:true, role:"Only significant private-sector warship/submarine builder (Kattupalli shipyard, P-75I pressure hulls)", dataStatus:"demo", sourceDate:ASOF, strengths:["Only significant private-sector yard with proven submarine pressure-hull fabrication (P-75I), backed by L&T's balance-sheet scale and engineering depth that smaller private entrants lack"], risks:["Naval shipbuilding is a small, undisclosed slice of a much larger engineering/construction conglomerate","Investors get diluted naval exposure, not a direct read on the shipbuilding business"], f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Defence & shipbuilding is a small single-digit % of L&T's total revenue - a conglomerate exposure line, not a pure-play",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 titagarh_naval: {name:"Titagarh Rail Systems", listed:true, role:"Owns Titagarh Naval Systems (Titagarh Shipyard, Kolkata) - Diving Support Craft, Bhishm-class tugboats", dataStatus:"demo", sourceDate:ASOF, strengths:["Early mover among private players actually delivering commissioned naval vessels (Bhishm-class tugboats, diving support craft), giving it a toehold as the Navy broadens its private-yard base"], risks:["Naval shipbuilding is an early-stage diversification, still small relative to the core rail rolling-stock business","Limited track record in naval construction versus established PSU shipyards"], f:fin([1468,2780,3853,3868,3186],[-1,126,286,87,123],"Rs 11,078 Cr","Rs 823","TITAGARH","Naval shipbuilding is an emerging diversification, still small vs. its core rail rolling-stock business",[-6,1,54],[569,971],[1434,"titagarh-rail-systems-ltd"],[57.0,182,0.12,10.9,6.78,2.00])},
 sail: {name:"Steel Authority of India (SAIL)", listed:true, role:"Sole domestic producer of DMR-249A/B high-tensile warship-grade steel plate (Rourkela)", dataStatus:"demo", sourceDate:ASOF, strengths:["Effective monopoly on indigenous warship-grade DMR-249A/B steel plate makes it the default supplier for every domestic shipyard's hull-steel requirement"], risks:["Naval-grade steel is a small, undisclosed slice of a much larger commodity steel business","Commodity steel producer - earnings exposed to steel-cycle and input-cost swings unrelated to naval demand"], f:fin([103477,104448,105378,102479,110811],[12243,2177,3067,2372,3373],"Rs 76,415 Cr","Rs 185","SAIL","Effective monopoly on indigenous warship-grade steel; naval share of revenue not separately disclosed",null,[124,210],[1165,"steel-authority-of-india-sail-ltd"],[15.8,146,1.27,7.92,6.57,10.0])},
 midhani: {name:"Mishra Dhatu Nigam (Midhani)", listed:true, role:"Titanium alloys and maraging steel for submarine hulls and missile casings", dataStatus:"demo", sourceDate:ASOF, strengths:["Government-owned, near-sole domestic source of submarine-grade titanium alloys and maraging steel - materials with long qualification cycles that give it durable, hard-to-contest positioning on every submarine program"], risks:["Revenue concentrated in a narrow set of defense/aerospace specialty-alloy programs","FY26 figures not yet available in the source data at fetch time"], f:fin([859,872,1073,1074,null],[177,156,92,111,null],"Rs 7,588 Cr","Rs 405","MIDHANI","Government-owned specialty metallurgy PSU, dedicated to defense/aerospace alloys",null,[267,482],[80900,"mishra-dhatu-nigam-ltd"],[56.2,81.8,0.21,11.3,8.92,10.0])},
 adorwelding: {name:"Ador Welding", listed:true, role:"Welding consumables/equipment used in shipyard hull fabrication", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified industrial customer base across shipyards and other heavy engineering end-markets gives steadier aggregate demand than a naval pure-play would see"], risks:["Shipyard/naval work is one of several industrial end-markets, not disclosed separately","Commodity welding-consumables business with limited naval-specific pricing power"], f:fin([661,null,1074,1123,1140],[45,null,86,60,82],"Rs 2,852 Cr","Rs 1,639","ADOR","General-industrial welding supplier, not naval-exclusive; shipyard is one of several end-markets",null,[848,1766],[31,"ador-welding-ltd"],[24.6,319,1.40,22.8,15.8,10.0])},
 kirloskaroilengines: {name:"Kirloskar Oil Engines", listed:true, role:"Marine/auxiliary diesel gensets alongside its larger industrial/agri engine business", dataStatus:"demo", sourceDate:ASOF, strengths:["Marine/auxiliary genset orders ride on a much larger, diversified and cash-generative industrial and agricultural engine business rather than depending on defense budget timing alone"], risks:["Marine/auxiliary gensets are a small, undisclosed slice of a much larger industrial and agricultural engine business"], f:fin([4022,5020,5898,6329,7701],[171,332,440,476,562],"Rs 31,100 Cr","Rs 2,137","KIRLOSENG",null,null,[866,2720],[745,"kirloskar-oil-engines-ltd"],[54.6,249,0.33,14.6,17.5,2.00])},
 bhel_naval: {name:"BHEL", listed:true, role:"Steam turbines, diesel gensets and turbo-alternators for Navy ships/frigates", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of incumbent turbine/genset supply relationships with the Navy give it qualified-supplier status that would take new entrants years to replicate"], risks:["Naval turbine/genset work is a small, undisclosed fraction of a power-equipment-dominated PSU","Broader BHEL business has shown volatile profitability in recent years"], f:fin([21211,23365,23893,28339,33782],[445,654,282,534,1600],"Rs 1,45,881 Cr","Rs 419","BHEL","Naval propulsion/turbine work is a small fraction of a power-equipment-dominated business",[81.4,49,47],[230,447],[189,"bharat-heavy-electricals-ltd"],[60.0,75.1,0.33,9.14,6.23,2.00])},
 bharatforge_naval: {name:"Bharat Forge", listed:true, role:"Won a Rs 425 Cr MoD contract for 12 Indian Navy turbine generators", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by Bharat Forge's heavy-forging scale and balance-sheet depth, giving it the capacity to scale the naval turbine-generator line if follow-on orders materialize"], risks:["Naval turbine-generator work is a very recent, small-scale entry point, not yet a proven recurring revenue stream","Automotive forgings dominate the business - naval exposure is immaterial to group results today"], f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Automotive forgings dominate revenue; naval turbine-generator order is a recent, small-scale entry point",null,[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 walchandnagar: {name:"Walchandnagar Industries", listed:true, role:"Specialized gearboxes/systems for shipyards and defense (also nuclear, space, sugar-machinery)", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified technical franchise across nuclear, space and defense critical components means naval gearbox orders are not the sole lever for any eventual turnaround"], risks:["Chronic loss-maker with negative ROE - a financial-distress/turnaround situation distinct from naval demand risk","Small, diversified business (also nuclear, space, sugar machinery) with naval gearboxes an unclear share of revenue"], f:fin([299,322,302,259,275],[-38,20,-42,-86,-15],"Rs 1,433 Cr","Rs 211","WALCHANNAG","Chronic loss-maker with negative ROE; a distressed/turnaround situation, not a growth story",null,[131,316],[1509,"walchandnagar-industries-ltd"],[null,52.9,0.00,4.17,-4.41,2.00])},
 bdl: {name:"Bharat Dynamics", listed:true, role:"Government-owned guided-missile/torpedo maker - Varunastra heavyweight ASW torpedo, SAMs/ATGMs", dataStatus:"demo", sourceDate:ASOF, strengths:["Government-owned prime with effectively uncontested positioning on India's missile and heavyweight torpedo programs (Varunastra, SAMs/ATGMs)"], risks:["Revenue has been volatile year to year, tied to lumpy government order execution","Figures were cross-verified via an alternate source this session and should be re-checked before publishing"], f:fin([2817,2489,2369,3345,2442],[500,352,613,550,420],"Rs 43,600 Cr","Rs 1,270","BDL","Screener.in was gated for this name this session; figures cross-verified via stockanalysis.com - re-verify before publishing",null,[1086,1654],[80210,"bharat-dynamics-ltd"],null)},
 solarindustries: {name:"Solar Industries India", listed:true, role:"India's largest private explosives maker, diversifying into warheads, detonators and propellant systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Dominant commercial (mining) explosives franchise generates the scale and cash flow that funds and de-risks its faster-growing defense diversification into warheads and propellant systems"], risks:["Commercial mining explosives still dominate revenue - defense is a smaller, faster-growing segment, not the core business","Premium valuation priced for continued defense-segment growth"], f:fin([3948,6918,6070,7540,9838],[455,811,875,1288,1737],"Rs 1,78,673 Cr","Rs 19,745","SOLARINDS","Commercial (mining) explosives are still the bulk of revenue; defense is the fastest-growing segment",null,[11641,22700],[1263,"solar-industries-india-ltd"],[89.7,694,0.06,38.1,32.6,2.00])},
 premierexplosives: {name:"Premier Explosives", listed:true, role:"Smaller explosives/detonator maker with ISRO and DRDO exposure", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, long-qualified supplier relationships with ISRO and DRDO give it a foothold in high-barrier-to-entry explosives/propellant niches new entrants would need years to qualify into"], risks:["Small-cap explosives maker with revenue concentrated in a handful of ISRO/DRDO-linked programs"], f:fin([199,202,272,417,388],[5,7,28,29,46],"Rs 3,658 Cr","Rs 680","PREMEXPLN",null,null,[378,830],[3116,"premier-explosives-ltd"],[106,53.8,0.07,23.0,18.8,2.00])},
 zentechnologies: {name:"Zen Technologies", listed:true, role:"Leading combat training-simulator maker incl. naval gunnery/damage-control simulators, anti-drone systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading position in combat training simulators, spanning naval gunnery/damage-control and the newer anti-drone segment, spreads demand across all three armed services rather than naval budgets alone"], risks:["Not a naval pure-play - simulator and anti-drone revenue spans all three armed services","Revenue fell roughly 29% in FY25-26 after a prior spike year, showing order lumpiness"], f:fin([70,219,440,974,688],[3,50,130,299,218],"Rs 15,190 Cr","Rs 1,682","ZENTEC","Not a naval pure-play (spans all three services); revenue fell ~29% FY25-FY26 after a spike year",null,[1223,2044],[1580,"zen-technologies-ltd"],[83.6,209,0.06,16.2,10.7,1.00])},
 bel_naval: {name:"Bharat Electronics", listed:true, role:"Dominant defense electronics PSU - naval radars, sonar (HUMSA/USHUS), EW suites, combat management systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Anchor, vertically-integrated PSU supplier of naval radar, sonar and combat-management systems with the sector's best combination of scale and margin expansion, giving it incumbency across nearly every major naval electronics program"], risks:["Premium valuation already prices in continued scale and margin expansion","Naval electronics is one of several defense verticals BEL serves - naval-specific revenue isn't separately broken out"], f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL","Anchor tenant of naval electronics - best combination of scale and margin expansion in the sector",[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 datapatterns: {name:"Data Patterns (India)", listed:true, role:"Vertically-integrated defense/aerospace electronics - radars, EW, avionics, naval platform electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Vertically-integrated design-to-manufacture model shortens qualification cycles and captures more of the value chain than typical sub-system suppliers across radar, EW and naval platform electronics"], risks:["Some FY23/FY24 figures were cross-verified via alternate sources this session and should be re-checked","Naval-specific revenue isn't separately disclosed within a broader defense/aerospace electronics business"], f:fin([310.9,null,null,708.4,924.8],[94.0,null,null,221.8,271.4],"Rs 24,606 Cr","Rs 4,418.80","DATAPATTNS","Screener.in was gated this session; FY23/FY24 actuals cross-verified via press releases/Groww and should be re-checked",null,[2131,5000],[755079,"data-patterns-india-ltd"],[91.83,310.08,0.23,null,15.63,2.00])},
 astramicrowave: {name:"Astra Microwave Products", listed:true, role:"RF/microwave and radar-subsystem specialist - T/R modules and RF front-ends for naval radar systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established specialist in T/R modules and RF front-ends for radar systems gives it a technical moat in high-barrier RF/microwave manufacturing that commodity electronics suppliers cannot easily enter"], risks:["RF/radar subsystem revenue spans multiple defense end-markets, not naval-specific disclosure"], f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,null,[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 paras: {name:"Paras Defence and Space Technologies", listed:true, role:"Optics, electro-optics, EW and space-systems maker with naval EW/optronics relevance", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified footprint across optics, electro-optics, EW and space systems spreads naval-specific order lumpiness across multiple high-growth defense verticals"], risks:["Optics/EW/space-systems revenue spans multiple defense end-markets - naval-specific exposure isn't separately disclosed"], f:fin([183,222,254,365,477],[27,36,30,61,89],"Rs 10,646 Cr","Rs 1,321","PARAS",null,null,[580,1585],[665815,"paras-defence-and-space-technologies-ltd"],[115,90.0,0.08,17.2,12.4,5.00])},
 apollomicro: {name:"Apollo Micro Systems", listed:true, role:"Defense/aerospace embedded-electronics - avionics, torpedo/sonar-related electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Established embedded-electronics qualification across aerospace and multiple defense platforms gives it a diversified base of recurring defense-program demand beyond any single naval contract"], risks:["FY26 figures not yet reflected in the source data at fetch time","Embedded-electronics revenue spans aerospace and multiple defense platforms, not naval-specific"], f:fin([243,298,372,562,null],[15,19,31,56,null],"Rs 14,700 Cr","Rs 396","APOLLO","FY26 figure not yet reflected in the pulled table - refresh before publishing",[22,90,102],[180,467],[72727,"apollo-micro-systems-ltd"],[121,36.8,0.06,14.5,11.8,1.00])},
 dcxsystems: {name:"DCX Systems", listed:true, role:"System-integration and cable-harness assembly - tier-1/2 supplier into BEL and other primes", dataStatus:"demo", sourceDate:ASOF, strengths:["Strong FY21-24 track record as a tier-1/2 harness/integration supplier gives it structural access to BEL's naval electronics order pipeline once execution stabilizes"], risks:["Revenue nearly halved and turned loss-making in FY26 after a strong FY21-24 track record","Tier-2 harness/integration supplier with concentrated customer exposure to prime contractors like BEL"], f:fin([1102,1254,1424,1084,743],[66,72,76,39,-8],"Rs 1,804 Cr","Rs 162","DCXINDIA","Revenue nearly halved and turned loss-making in FY26 - a deteriorating name despite a strong FY21-24 track record",[-37,-18,null],[153,260],[1099425,"dcx-systems-ltd"],[null,136,0.00,0.87,-0.53,2.00])},
 mtartech_naval: {name:"MTAR Technologies", listed:true, role:"Precision-engineered components primarily for space/nuclear/clean-energy, with a secondary defense component", dataStatus:"demo", sourceDate:ASOF, strengths:["Precision-manufacturing capability and quality certifications built for space and nuclear programs - among the most stringent in Indian industry - transfer directly to exacting defense/naval component requirements"], risks:["Defense/naval work is a secondary, smaller segment behind a larger space/nuclear/clean-energy precision-components business"], f:fin([322,574,581,676,876],[61,103,56,53,94],"Rs 21,224 Cr","Rs 6,900","MTARTECH","More a space/nuclear/clean-energy precision-components story than a naval one specifically",null,[1824,8715],[436155,"mtar-technologies-ltd"],[156,267,0.00,15.1,12.4,10.0])},
 kirloskarbrothers: {name:"Kirloskar Brothers", listed:true, role:"India's largest pump maker - Marine & Defence vertical, supplied centrifugal pump systems for INS Taragiri", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest pump manufacturer with confirmed direct supply into commissioned naval vessels (INS Taragiri), a qualified-incumbent status smaller pump makers lack access to"], risks:["Naval pump systems are one product line within a much larger multi-segment pump business, revenue not separately disclosed"], f:fin([3058,3730,4001,4492,4538],[94,236,350,419,377],"Rs 14,070 Cr","Rs 1,772","KIRLOSBROS","Confirmed direct naval pump-system supplier for INS Taragiri",null,[1333,2192],[744,"kirloskar-brothers-ltd"],[34.8,310,0.40,20.4,17.3,2.00])},
 kirloskarpneumatic: {name:"Kirloskar Pneumatic Company", listed:true, role:"Compressors, HVAC and air-conditioning systems for ships/submarines", dataStatus:"demo", sourceDate:ASOF, strengths:["Revenue tripling FY24-FY25 signals a major new order inflection, and submarine-grade compressor/HVAC qualification is a higher barrier-to-entry niche than general industrial HVAC"], risks:["Recent revenue tripling looks order-driven and may not represent a steady-state run rate","Naval/submarine HVAC work is one of several industrial end-markets for the company"], f:fin([666,538,484,1640,1787],[62,49,37,211,254],"Rs 8,990 Cr","Rs 692","KIRLPNU","Revenue tripled FY24-FY25 - looks like a major new order/contract inflection",null,[478,1099],[2214,"kirloskar-pneumatic-company-ltd"],[34.2,96.1,0.87,29.6,22.6,1.00])},
 hblengineering_naval: {name:"HBL Engineering Ltd", listed:true, role:"Naval/submarine batteries alongside its now-dominant railway Kavach signalling business", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-standing qualified supplier of naval/submarine batteries, while the dominant, fast-growing railway Kavach signalling franchise provides balance-sheet strength well beyond the naval order cycle"], risks:["Naval/submarine batteries are now a minority of a business increasingly driven by railway Kavach signalling","Company was renamed from HBL Power Systems - reporting history spans the ticker change"], f:fin([1236,1369,2233,1967,3303],[94,98,280,276,814],"Rs 22,342 Cr","Rs 806","HBLENGINE","Naval batteries are now a minority of a business increasingly driven by railway Kavach signalling",[-3.55,48,76],[603,1122],[526,"hbl-engineering-ltd"],[27.9,79.9,0.37,59.3,45.3,1.00])},
 azadengineering: {name:"Azad Engineering", listed:true, role:"Precision-forged/machined components for aerospace, energy and defense", dataStatus:"demo", sourceDate:ASOF, strengths:["Precision-forging capability and OEM qualifications built for aerospace-engine and energy-turbine applications represent transferable, high-barrier manufacturing credentials"], risks:["Weakest-evidenced naval linkage in this sector - primarily an aerospace-engine and energy-turbine forgings business","Recent IPO (2024) with limited trading/financial history"], f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD","Recent IPO (2024); primarily aerospace-engine and energy-turbine forgings - the weakest-evidenced naval linkage here",null,[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 hsl: {name:"Hindustan Shipyard Ltd", listed:false, role:"Government-owned (MoD) shipyard at Visakhapatnam - submarines, fleet support ships, submarine MRO", dataStatus:"unverified", sourceDate:ASOF, strengths:["Only shipyard currently performing submarine MRO/life-extension work alongside new-build, and a leading contender for the Project-75I award, giving it a potentially outsized role in the next submarine-construction cycle"], risks:["Unlisted - no audited public financials; figures/claims here are compiled from public reporting only","Project-75I submarine award is still contested/pending, not yet a confirmed revenue stream"], notes:["Under Project-75I contention for new-generation submarine construction","Also performs submarine MRO/life-extension work","No public market data - not listed"]},
 gsl: {name:"Goa Shipyard Ltd", listed:false, role:"Mini-ratna PSU shipyard - OPVs, fast patrol vessels, naval offshore support craft", dataStatus:"unverified", sourceDate:ASOF, strengths:["Established export track record supplying patrol vessels to friendly foreign navies gives it a revenue avenue beyond domestic Navy orders that smaller private yards lack"], risks:["Unlisted - no audited public financials; figures/claims here are compiled from public reporting only","Smaller mini-ratna yard - order book is likely less diversified than the larger listed PSU yards"], notes:["Exports patrol vessels to friendly foreign navies","No public market data - not listed"]},
 knorrbremsenaval: {name:"Godrej & Boyce Mfg. Co.", listed:false, role:"Precision engineering conglomerate - Marine Solutions line (deck machinery, steering gear)", dataStatus:"unverified", sourceDate:ASOF, strengths:["Decades-old precision-engineering conglomerate with an established Marine Solutions franchise and parallel BrahMos airframe assembly work, giving it technical credibility across multiple defense-grade manufacturing disciplines"], risks:["Unlisted conglomerate - naval Marine Solutions is a small, undisclosed slice of a much larger precision-engineering business","No public financials available to size the naval-specific contribution"], notes:["Also makes BrahMos airframe assemblies and precision defense components","No public market data - not listed"]},
 kinecokaman_naval: {name:"Kineco Kaman Composites (India)", listed:false, role:"Composite structures relevant to naval/defense platforms (JV between Kineco and US-based Kaman Aerospace)", dataStatus:"unverified", sourceDate:ASOF, strengths:["JV structure brings in Kaman Aerospace's established composite-manufacturing technology and qualification pedigree, a capability base domestic-only players would need to build from scratch"], risks:["Private JV with no public financial disclosure","Composite-structures relevance to naval platforms is broad/unconfirmed rather than a specific contracted naval product line"], notes:["Private JV; no public market data - not listed"]},
 centum: {name:"Centum Electronics", listed:true, role:"ESDM - RF/microwave modules, avionics and defense electronics; supplies naval sensor/electronics subsystems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established ESDM manufacturing base across RF/microwave modules and avionics gives it qualified access to multiple defense-electronics programs beyond naval sensor subsystems alone"], risks:["Chronically weak or negative net profit and ROE despite revenue growth","Naval sensor/electronics subsystem work is one of several ESDM end-markets, not separately disclosed"], f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Chronically weak/negative net profit and ROE despite revenue growth - priced on defense-electronics narrative, not current earnings",[83,52,58],[2044,5000],[251,"centum-electronics-ltd"],[81.1,233,0.10,25.5,-12.5,10.0])}
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

 // Hull - lofted side-profile with the deck line RISING toward the bow (real
 // forecastle sheer, for sea-keeping) rather than dropping to a low speedboat
 // nose, at a 9:1 length:beam ratio matching a real frigate/destroyer instead
 // of the previous stubby 6.9:1. The side extrude alone can't taper in plan
 // view though (constant depth along its whole length) - that's what the
 // separate bow wedge below is for.
 var hullPts = [
 [-3.9,0.14],[-3.9,0.50],[-2.0,0.56],[0.4,0.60],[2.2,0.64],[3.3,0.60],[4.0,0.46],[4.0,0.10],[-3.9,0.10]
 ];
 var hullGeo = new THREE.ExtrudeGeometry(shapeFromPoints(hullPts), {depth:0.92, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:3, curveSegments:10});
 hullGeo.translate(0,0,-0.46);
 var hullMesh = new THREE.Mesh(hullGeo, matHull);
 propGroup.add(hullMesh);

 // Bow wedge: a plan-view (X-Z) triangle extruded vertically and rotated into
 // place, flush-joined to the main hull at x=2.2 - this is what gives the hull
 // an actual pointed bow from the "top" camera view instead of a flat-ended slab.
 var bowShape = new THREE.Shape();
 bowShape.moveTo(2.2,-0.46);
 bowShape.lineTo(2.2,0.46);
 bowShape.lineTo(4.6,0.0);
 bowShape.closePath();
 var bowGeo = new THREE.ExtrudeGeometry(bowShape, {depth:0.5, bevelEnabled:false, curveSegments:4});
 bowGeo.rotateX(-Math.PI/2);
 bowGeo.translate(0,0.12,0);
 propGroup.add(new THREE.Mesh(bowGeo, matHull));

 var deckStripe = new THREE.Mesh(new THREE.BoxGeometry(7.9,0.04,0.94), matDeck);
 deckStripe.position.set(0.05,0.60,0); propGroup.add(deckStripe);
 [-0.44,0.44].forEach(function(dz){
 var plateSeam = new THREE.Mesh(new THREE.BoxGeometry(7.4,0.04,0.03), matHullPlate);
 plateSeam.position.set(0,0.34,dz); propGroup.add(plateSeam);
 });
 var waterlineStripe = new THREE.Mesh(new THREE.BoxGeometry(8.0,0.05,0.96), matHullPlate);
 waterlineStripe.position.set(0.05,0.15,0); propGroup.add(waterlineStripe);

 // Propulsion
 var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.9,10), matShaft);
 shaft.rotation.z = Math.PI/2; shaft.position.set(-3.75,0.4,0); propGroup.add(shaft);
 var propeller = new THREE.Mesh(new THREE.TorusGeometry(0.18,0.03,8,16), matProp);
 propeller.rotation.y = Math.PI/2; propeller.position.set(-4.1,0.4,0); propGroup.add(propeller);
 var engineRoom = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.4,0.8), matProp);
 engineRoom.position.set(-2.1,0.55,0); propGroup.add(engineRoom);
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.4), matProp);
 genset.position.set(-1.1,0.55,0.3); propGroup.add(genset);

 // Combat systems
 var gunTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.22,10), matGun);
 gunTurret.position.set(3.9,1.05,0); combatGroup.add(gunTurret);
 var gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.7,8), matGun);
 gunBarrel.rotation.z = Math.PI/2; gunBarrel.position.set(4.3,1.1,0); combatGroup.add(gunBarrel);

 // VLS: a flush deck module (hatch grid scribed on top) rather than tubes
 // poking up through a box - real vertical-launch cells sit flush with the deck.
 var missileCell = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.08,0.7), matMissile);
 missileCell.position.set(2.6,0.64,0); combatGroup.add(missileCell);
 [-0.17,0.17].forEach(function(hz){
 [-0.26,-0.09,0.09,0.26].forEach(function(hx){
 var hatchSeam = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.01,0.15), matGun);
 hatchSeam.position.set(2.6+hx,0.685,hz); combatGroup.add(hatchSeam);
 });
 });

 // Angled anti-ship missile canisters amidships - one of the most visually
 // distinctive features of Indian frigates/destroyers, entirely absent before.
 [-0.3,0.3].forEach(function(mz){
 var canister = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.22,0.3), matMissile);
 canister.position.set(-0.3,0.85,mz); canister.rotation.z = 0.3; combatGroup.add(canister);
 });

 // Superstructure & electronics - stepped, inward-tapering tiers (the "stealth
 // pyramid" silhouette real frigates/destroyers use) instead of one slab box.
 var tier1 = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.35,0.92), matSuper);
 tier1.position.set(0.9,1.07,0); superGroup.add(tier1);
 var tier2 = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.3,0.78), matSuper);
 tier2.position.set(0.95,1.35,0); superGroup.add(tier2);
 var tier3 = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.3,0.6), matSuper);
 tier3.position.set(1.0,1.62,0); superGroup.add(tier3);
 var bridgeWindow = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.12,0.04), matDeck);
 bridgeWindow.position.set(1.0,1.68,0.31); superGroup.add(bridgeWindow);

 // Tapered, integrated mast (radiusTop < radiusBottom) rather than a bare
 // uniform pole - reads as a combat-system mast, not a generic antenna.
 var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.22,0.9,8), matMast);
 mast.position.set(1.0,2.2,0); superGroup.add(mast);
 var radarDome = new THREE.Mesh(new THREE.SphereGeometry(0.18,14,12), matRadar);
 radarDome.position.set(1.0,2.8,0); superGroup.add(radarDome);
 [0.82,1.18].forEach(function(rx){
 var radarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.3,0.3), matRadar);
 radarPanel.position.set(rx,2.2,0); superGroup.add(radarPanel);
 });
 var funnel = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.4,0.35), matSuper);
 funnel.position.set(-0.7,1.15,0); superGroup.add(funnel);

 // Helicopter hangar + flight deck at the stern - present on every modern
 // frigate/destroyer/carrier reference and entirely missing before.
 var hangar = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.4,0.8), matSuper);
 hangar.position.set(-3.0,0.85,0); superGroup.add(hangar);
 var flightDeck = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.04,0.88), matDeck);
 flightDeck.position.set(-3.6,0.58,0); superGroup.add(flightDeck);

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
 // --- Industry-level narrative (data-model upgrade, matching the datacenter pattern) ---
 whyNow: "India's aerospace component and MRO base is scaling fast as global OEMs diversify sourcing beyond China and domestic defense programs - Tejas, engine localization, drone platforms - ramp up at the same time.",
 thesisSummary: "Aerospace in India is a layered manufacturing and sustainment chain - forgings and castings feed precision structures, engines and landing-gear systems, avionics electronics are designed in, and primes integrate everything into finished platforms that then cycle back through MRO for decades of service life.",
 featuredSignals: ["New OEM qualification wins and order-book disclosures", "Capacity/foundry expansion announcements", "Defense platform program milestones (Tejas, C-295, engine JVs)", "Civil MRO capacity additions and hangar announcements", "Global OEM China+1 sourcing allocations to India"],
 dataStatus: "demo",
 integratorZoneId: "integration",
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
 domains: [
 {id:"materials_forgings", title:"Materials & Forgings", shortTitle:"Materials", description:"Raw titanium, superalloy and special-alloy forgings and castings that feed every structural, engine and landing-gear component maker downstream.", color:"#8B5E34", relatedDomains:["structures_landing","engine_propulsion"]},
 {id:"structures_landing", title:"Structures & Landing Systems", shortTitle:"Structures", description:"Machined structural parts, composite aerostructures and the undercarriage/actuation systems that make up the physical airframe.", color:"#4C6EF5", relatedDomains:["materials_forgings","integration_primes"]},
 {id:"engine_propulsion", title:"Engine & Propulsion", shortTitle:"Propulsion", description:"Turbine/compressor blades and hot-section forgings that go into the jet engines and gas turbines powering the aircraft.", color:"#7A5CC7", relatedDomains:["materials_forgings","mro_sustainment"]},
 {id:"avionics_mission", title:"Avionics & Mission Systems", shortTitle:"Avionics", description:"Radar, avionics, EW and mission electronics designed into the cockpit, nose and mission bays.", color:"#1E9E76", relatedDomains:["integration_primes"]},
 {id:"mro_sustainment", title:"MRO & Sustainment", shortTitle:"MRO", description:"Hangars and repair lines that maintain, overhaul and life-extend aircraft, engines and components across their operating life.", color:"#C9315C", relatedDomains:["engine_propulsion","integration_primes"]},
 {id:"integration_primes", title:"Systems Integration & Primes", shortTitle:"Primes", description:"The primes that integrate structures, engines and electronics into a complete flying platform and deliver the finished aircraft or system.", color:"#B5179E", relatedDomains:["structures_landing","avionics_mission","mro_sustainment"]}
 ],
 zones: [
 {id:"forgings", color:"#8B5E34", label:"Forgings, Castings & Special Alloys", pos:[1.7,0.6,0], side:"top", desc:"Structural and engine-grade forgings, investment castings and titanium/superalloys that feed the rest of the value chain.",
 domainId:"materials_forgings", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The upstream materials layer - titanium, superalloy and special-alloy forgings and castings that every structural, engine and landing-gear component downstream is machined from.",
 whyItMatters:"Nothing else in the value chain can be built without certified aerospace-grade forgings and castings, so capacity and quality here gate everything downstream.",
 valuePoolDescription:"Forging and casting specialists capture long-cycle, qualification-locked contracts with global OEMs, since re-qualifying a new supplier for flight-critical metal is slow and expensive.",
 bottlenecks:["Aerospace-grade titanium and superalloy supply, largely import-dependent", "Multi-year OEM qualification cycles for new forging/casting capacity", "Limited number of domestic furnaces capable of aerospace-grade melts"],
 keyDrivers:["Global OEM build-rate ramps (Airbus, Boeing, engine makers)", "Domestic defense forging programs (LCA Tejas, engine overhaul)", "Import-substitution push for titanium/superalloy"],
 keyRisks:["Order books concentrated among a handful of global primes", "Long qualification cycles slow revenue ramp from new capacity", "Raw-material price volatility (titanium, nickel-based alloys)"],
 investorMetrics:["New-capacity utilization and ramp-up pace", "Share of revenue from aerospace vs. other forging end-markets", "Qualification wins with new OEM programs"],
 relatedComponents:["structures","engine"],
 suppliers:[{key:"bharatforge_aero", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"azadengineering_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"ptcindustries", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"midhani_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"jaykay", exposureType:"emerging_entrant", exposureStrength:"low"}]},
 {id:"structures", color:"#4C6EF5", label:"Precision Machining, Composites & Aerostructures", pos:[0.1,0.55,0], side:"top", desc:"Machined structural parts, composite panels and aerostructure sub-assemblies such as doors and flap-tracks.",
 domainId:"structures_landing", displayOrder:2, dataStatus:"demo",
 roleInSystem:"The airframe-structure layer - machined structural parts, composite panels and aerostructure sub-assemblies such as doors and flap-tracks that form the physical aircraft.",
 whyItMatters:"This is where India's aerospace manufacturing base has scaled fastest, turning forgings and raw composite into flight-certified, OEM-delivered hardware.",
 valuePoolDescription:"Aerostructure makers earn long-term build-to-print contracts tied to an aircraft program's production life, with margin expansion as they move from single parts to full sub-assemblies.",
 bottlenecks:["Precision-machining and composite-layup capacity constrained by skilled-labor availability", "Long AS9100/OEM supplier-qualification timelines", "Working-capital intensity of long aerospace production cycles"],
 keyDrivers:["Airbus/Boeing narrow-body production ramp", "Global OEMs' China+1 sourcing diversification toward India", "Rising sub-assembly (vs. single-part) content won by Indian suppliers"],
 keyRisks:["Revenue tied to a handful of global OEM programs and their build-rate cycles", "Customer concentration risk if a program ramps down", "Capital-intensive capacity additions ahead of confirmed order books"],
 investorMetrics:["Order-book growth and book-to-bill ratio", "Program mix - single parts vs. full sub-assemblies", "Export revenue share vs. domestic defense"],
 relatedComponents:["forgings","landing_gear","integration"],
 suppliers:[{key:"dynamatic", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"unimech", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"aequs", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"tanejaaerospace", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"sikainterplant", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"kinecokaman_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"godrejaerospace", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"techeraengineering", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"apsisaerocom", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"landing_gear", color:"#C99A2E", label:"Landing Gear, Undercarriage & Actuation Systems", pos:[0.15,0.13,0], side:"bottom", desc:"Undercarriage struts, wheels/brakes and actuation systems - served almost entirely by unlisted MNC facilities in India.",
 domainId:"structures_landing", displayOrder:3, dataStatus:"demo",
 roleInSystem:"The undercarriage layer - struts, wheels/brakes and actuation systems that let the aircraft take off, land and taxi, mounted beneath the airframe structure.",
 whyItMatters:"Landing gear is one of the most safety-critical, highly certified systems on an aircraft, and today is served almost entirely by unlisted MNC facilities rather than listed Indian players.",
 valuePoolDescription:"Value here is concentrated with global landing-gear OEMs' India facilities; the listed Indian names captured are cross-referenced machining/hydraulics suppliers feeding into those systems, not the systems themselves.",
 bottlenecks:["No dedicated listed Indian landing-gear systems integrator", "Extremely high certification bar for safety-critical undercarriage parts", "Reliance on a small number of precision-hydraulics suppliers"],
 keyDrivers:["Aircraft fleet growth requiring more undercarriage shipsets", "MRO demand for landing-gear overhaul cycles", "Global primes localizing hydraulic/actuation sourcing"],
 keyRisks:["Listed exposure here is indirect - cross-referenced from suppliers' other segments, not a dedicated landing-gear business", "High certification/liability bar limits new entrants", "Thin, undisclosed revenue slice for the suppliers involved"],
 investorMetrics:["Disclosed landing-gear/actuation order wins, where available", "New OEM qualification announcements", "Capacity-expansion announcements in this segment specifically"],
 relatedComponents:["structures"],
 suppliers:[{key:"dynamatic_gear", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"unimech_gear", exposureType:"indirect_supplier", exposureStrength:"low"}]},
 {id:"engine", color:"#7A5CC7", label:"Aero-Engine Components & Hot-Section Parts", pos:[0.1,0.4,1.1], side:"bottom", desc:"Turbine/compressor blades and hot-section forgings that go into jet engines and gas turbines.",
 domainId:"engine_propulsion", displayOrder:4, dataStatus:"demo",
 roleInSystem:"The hot-section layer - turbine and compressor blades and hot-section forgings that go into the jet engines and gas turbines powering the aircraft.",
 whyItMatters:"Hot-section parts carry the highest precision and metallurgical requirements in the entire aircraft, and the margin/IP moat here is the deepest in the value chain.",
 valuePoolDescription:"Precision-forged/machined turbine and compressor blade makers earn premium margins versus structural-parts suppliers, reflecting the metallurgical and tolerance complexity of hot-section work.",
 bottlenecks:["Extremely tight tolerances and metallurgy requirements limit the supplier pool", "Dependence on a handful of global engine OEMs (GE, Safran, Honeywell) for qualification", "Capacity additions lag multi-year demand visibility from engine OEMs"],
 keyDrivers:["Global engine OEM build-rate ramps and spares demand", "India defense engine programs (Tejas, future engine JVs)", "Engine MRO cycle driving replacement hot-section part demand"],
 keyRisks:["Revenue concentrated with 2-3 global engine OEM customers", "Cross-referenced suppliers (Forgings zone) show this as one of several segments, not a dedicated business", "High technical/quality bar raises the cost of any quality lapse"],
 investorMetrics:["Order-book growth from engine-OEM customers specifically", "Margin trend vs. structural-parts peers", "New program/platform wins disclosed by management"],
 relatedComponents:["forgings","mro"],
 suppliers:[{key:"mtartech_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"azadengineering_aero2", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"bharatforge_aero2", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"avionics", color:"#1E9E76", label:"Avionics, Electronics, RF/Microwave & Mission Systems", pos:[3.0,0.85,0], side:"right", desc:"Radar, avionics, EW and mission electronics designed into the nose, cockpit and mission bays.",
 domainId:"avionics_mission", displayOrder:5, dataStatus:"demo",
 roleInSystem:"The electronics layer - radar, avionics, EW and mission electronics designed into the nose, cockpit and mission bays, sitting on top of the physical airframe and engine.",
 whyItMatters:"Avionics and mission systems are where an aircraft's platform value is realized for defense customers, and this is the segment with the deepest, most diversified listed-company base in Indian aerospace.",
 valuePoolDescription:"Defense-electronics PSUs and private players capture recurring, high-margin revenue through long-term defense programs and software-heavy mission systems, versus the thinner margins typical of pure hardware manufacturing.",
 bottlenecks:["Long defense-procurement and certification cycles", "Import dependence for some RF/microwave components and semiconductors", "Consolidation risk as larger players acquire specialized electronics firms"],
 keyDrivers:["Defense modernization and indigenization (Atmanirbhar Bharat) programs", "Growing UAV/drone and anti-drone systems demand", "Civil aerospace design-engineering outsourcing to Indian engineering-services firms"],
 keyRisks:["Revenue mix spans a wide range of company sizes and quality - several are small-cap/SME-listed with thin trading history", "Order lumpiness tied to defense budget cycles and large discrete contracts", "Some names (e.g. recent reverse mergers) carry financial-history caveats"],
 investorMetrics:["Defense order-book growth and execution timelines", "Revenue mix - hardware vs. design/engineering services", "Margin trend and R&D capitalization policy"],
 relatedComponents:["integration"],
 suppliers:[{key:"bel_aero", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"datapatterns_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"astramicro_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"apollomicro_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"zentech_aero", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"cyientdlm", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"cyient", exposureType:"enabler", exposureStrength:"medium"}, {key:"parasdefence", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"axiscades", exposureType:"enabler", exposureStrength:"medium"}, {key:"rosselltechsys", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"dcxsystems_aero", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"avantel", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"centumelectronics_aero", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"digilogicsystems", exposureType:"direct_supplier", exposureStrength:"high"}]},
 {id:"mro", color:"#C9315C", label:"MRO Services (Airframe / Engine / Component)", pos:[-3.6,1.1,-1.8], side:"left", desc:"Hangars and repair lines that maintain, overhaul and life-extend aircraft, engines and components.",
 domainId:"mro_sustainment", displayOrder:6, dataStatus:"demo",
 roleInSystem:"The sustainment layer - hangars and repair lines that maintain, overhaul and life-extend aircraft, engines and components once they're already flying.",
 whyItMatters:"MRO is the recurring-revenue counterpart to the one-time manufacturing value chain - every aircraft and engine built upstream eventually flows back through this layer repeatedly over its service life.",
 valuePoolDescription:"MRO providers earn long-dated, recurring service revenue tied to fleet size and flying hours, rather than the lumpy, program-driven revenue typical of component manufacturing.",
 bottlenecks:["Limited third-party civil MRO hangar capacity in India relative to fleet size", "Heavy reliance on a single PSU (HAL) for most listed military MRO exposure", "Long lead times and certification requirements to stand up new MRO capacity"],
 keyDrivers:["Growing domestic commercial aircraft fleet requiring more scheduled maintenance", "Government push to repatriate MRO work currently sent overseas", "Military fleet sustainment and engine-overhaul cycles"],
 keyRisks:["Listed civil-MRO exposure in India is extremely thin - mostly cross-referenced from a small-cap structures company", "HAL's MRO revenue is almost entirely military, not diversified into civil", "New entrants (e.g. GMR's planned engine-MRO JV) are not yet revenue-generating"],
 investorMetrics:["ROH/MRO segment revenue growth where disclosed", "New hangar/facility announcements and target completion dates", "Civil vs. military MRO revenue mix"],
 relatedComponents:["engine","integration"],
 suppliers:[{key:"hal_mro", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"gmraerotechnic", exposureType:"operator", exposureStrength:"high"}, {key:"tanejaaerospace_mro", exposureType:"operator", exposureStrength:"low"}]},
 {id:"integration", color:"#B5179E", label:"Systems Integration, Assembly EPC & Primes", pos:[0,1.6,-1.8], side:"left", desc:"The primes that integrate structures, engines and electronics into a complete flying platform.",
 domainId:"integration_primes", displayOrder:7, dataStatus:"demo",
 roleInSystem:"The final-assembly layer - the primes that integrate structures, engines and electronics into a complete flying platform and deliver the finished aircraft or system.",
 whyItMatters:"This is the layer where all upstream components converge into a sellable end-product, and it's the natural home for this sector's end-manufacturer/integrator revenue.",
 valuePoolDescription:"Primes capture the largest absolute contract values and own the customer relationship, but for diversified conglomerates aerospace/defense is often a minority segment that dilutes the pure-play exposure.",
 bottlenecks:["Most listed integrator exposure is diluted inside diversified conglomerates (L&T, BEML) rather than pure-play", "Long-cycle, lumpy government/defense contract awards", "A small number of unlisted names (TASL, Sigma Advanced) hold meaningful integration programs with no public financials"],
 keyDrivers:["Indigenous defense platform programs (Tejas, ALH Dhruv, missile systems)", "Airbus C-295 final assembly line ramp-up", "Rising domestic UAV/drone final-assembly programs"],
 keyRisks:["Exposure heavily diluted for diversified names - aerospace/defense is a minority segment", "Execution and delivery-schedule risk on large government platform programs", "Some newly listed/reverse-merged names carry financial-history caveats"],
 investorMetrics:["Program-level order book and delivery-schedule adherence", "Segment-level disclosure of aerospace/defense revenue where available", "New platform wins and export order announcements"],
 relatedComponents:["structures","avionics","mro"],
 suppliers:[{key:"hal_prime", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"bel_prime", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"bdl_aero", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"lt_aero", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"beml_aero", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"tasl", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"ideaforge", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"sigmaadvanced", exposureType:"emerging_entrant", exposureStrength:"low"}]}
 ],
 suppliers: {
 bharatforge_aero: {name:"Bharat Forge", listed:true, role:"Dedicated Aerospace division - structural and engine forgings for global OEMs", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the world's largest forging companies by volume, giving it the scale and capital base to invest ahead of demand in dedicated aerospace-grade forging capacity"], risks:["Aerospace-specific revenue not broken out from BharatForge's consolidated results", "Exposure also recorded separately for aero-engine forgings (see bharatforge_aero2)"], f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG","Aerospace-specific revenue not broken out from consolidated figures",[70,23,22],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 azadengineering_aero: {name:"Azad Engineering", listed:true, role:"Precision-forged/machined turbine & compressor blades for aero engines (GE, Honeywell, Safran)", dataStatus:"demo", sourceDate:ASOF, strengths:["Qualified and shipping turbine/compressor blades directly to GE, Honeywell and Safran, clearing one of aerospace's highest technical-qualification bars that keeps most domestic players out of hot-section work"], risks:["Revenue concentrated among a small number of global engine-OEM customers (GE, Honeywell, Safran)", "Premium valuation leaves little room for execution missteps"], f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD",null,[75,null,null],[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 ptcindustries: {name:"PTC Industries", listed:true, role:"Titanium & superalloy investment castings - new 'Mihir' foundry for LCA Tejas and civil/defense programs", dataStatus:"demo", sourceDate:ASOF, strengths:["New 'Mihir' foundry gives it rare domestic titanium/superalloy investment-casting capacity tied directly to LCA Tejas and other strategic defense programs, a capability very few Indian manufacturers possess"], risks:["New foundry capacity still ramping - revenue depends on successful scale-up", "Customer base concentrated in a small number of defense/civil programs"], f:fin([179,219,257,308,603],[13,26,42,61,102],"Rs 32,699 Cr","Rs 21,810","PTCIL",null,[43,56,81],[14499,24143],[4156,"ptc-industries-ltd"],[260,1005,0.00,8.59,7.16,10.0])},
 midhani_aero: {name:"Mishra Dhatu Nigam (Midhani)", listed:true, role:"India's only domestic producer of titanium alloys & aerospace superalloys - sole/key supplier to HAL, ISRO, DRDO", dataStatus:"demo", sourceDate:ASOF, strengths:["India's only domestic producer of titanium alloys and aerospace-grade superalloys, a structural monopoly position as sole/key supplier to HAL, ISRO and DRDO"], risks:["Customer base concentrated among a handful of government/PSU buyers (HAL, ISRO, DRDO)", "Majority government ownership (74%) limits free float and can affect capital-allocation independence"], f:fin([859,872,1073,1074,1209],[177,156,92,111,131],"Rs 7,588 Cr","Rs 405","MIDHANI","74% GoI-owned",[5,0,17],[267,482],[80900,"mishra-dhatu-nigam-ltd"],[56.2,81.8,0.21,11.3,8.92,10.0])},
 jaykay: {name:"Jaykay Enterprises", listed:true, role:"Legacy synthetics company pivoting into defense/aerospace additive manufacturing via 2025-26 acquisitions", dataStatus:"demo", sourceDate:ASOF, strengths:["Early-mover pivot into defense/aerospace additive manufacturing via acquisition, targeting a specialized manufacturing niche with limited existing domestic competition"], risks:["Aerospace/defense business is a recent pivot from a legacy synthetics company - limited track record", "FY26 profit figure flagged as likely containing a one-off item - verify before relying on it"], f:fin([null,null,null,null,240],[null,null,null,null,216],"Rs 3,074 Cr","Rs 204","JAYKAY","FY26 net profit unusually close to revenue - likely includes a one-off/exceptional item; verify before use",null,[107,225],[2066,"jaykay-enterprises-ltd"],[75.4,45.7,0.00,4.76,3.56,1.00])},
 dynamatic: {name:"Dynamatic Technologies", listed:true, role:"Aerospace division machines structural parts/flap-track beams for Airbus A320, Boeing 787, GKN", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, qualified supplier of flap-track beams and structural parts on Airbus A320 and Boeing 787 - two of the highest-volume programs in production - giving revenue visibility tied to their build-rate ramps"], risks:["Aerospace is one division alongside Dynamatic's hydraulics business - segment-specific margins aren't separately disclosed", "Also cross-referenced into the Landing Gear zone via its hydraulics products"], f:fin([1253,1316,1429,1404,1621],[15,43,122,43,32],"Rs 8,933 Cr","Rs 13,153","DYNAMATECH",null,[90,49,35],[6716,13287],[351,"dynamatic-technologies-ltd"],[152,1251,0.08,10.2,6.67,10.0])},
 unimech: {name:"Unimech Aerospace and Manufacturing", listed:true, role:"Precision tooling, fasteners & complex machined aerostructure/engine parts for Airbus, Safran, Collins", dataStatus:"demo", sourceDate:ASOF, strengths:["Deep multi-year qualification with Airbus, Safran and Collins across tooling, fasteners and complex machined parts, with revenue and order book growing rapidly off a small base as it wins increasing wallet share"], risks:["Customer concentration among a small number of global primes (Airbus, Safran, Collins)", "Also cross-referenced into the Landing Gear zone"], f:fin([36,94,209,243,240],[3,23,58,83,63],"Rs 8,476 Cr","Rs 1,665","UNIMECH",null,[60,null,null],[695,1868],[2868825,"unimech-aerospace-and-manufacturing-ltd"],[118,145,0.00,11.2,7.96,5.00])},
 aequs: {name:"Aequs", listed:true, role:"Belagavi-based aerostructures manufacturer - assembles doors and machines parts for Airbus & Boeing", dataStatus:"demo", sourceDate:ASOF, strengths:["Order book has crossed $1bn with Airbus and Boeing as anchor customers, reflecting genuine program wins even as profitability is still catching up to scale"], risks:["Currently loss-making despite an order book that crossed $1bn - execution/profitability still unproven", "Recently listed, limited public track record"], f:fin([null,812,965,925,1230],[null,-110,-14,-102,-113],"Rs 16,502 Cr","Rs 246","AEQUS","Aerospace order book crossed $1bn in Q1 FY27; recently IPO'd, currently loss-making",null,[113,275],[3346246,"aequs-ltd"],[null,22.2,0.00,1.69,-9.96,10.0])},
 tanejaaerospace: {name:"Taneja Aerospace and Aviation", listed:true, role:"Aerostructure component manufacturing at Hosur, TN", dataStatus:"demo", sourceDate:ASOF, strengths:["Combines aerostructure manufacturing with an on-site civil MRO hangar at Hosur capable of servicing Boeing 737/A320s - a rare dual manufacturing-plus-sustainment footprint for a company of its size"], risks:["Small-cap with limited scale relative to global aerostructure peers", "Also cross-referenced into the MRO zone for its civil hangar business"], f:fin([31,32,30,41,40],[5,11,11,18,17],"Rs 880 Cr","Rs 345","TANAA",null,[-7,11,42],[190,415],[2893,"taneja-aerospace-aviation-ltd"],[46.0,60.6,0.72,15.6,11.4,5.00])},
 sikainterplant: {name:"Sika Interplant Systems", listed:true, role:"Engineering projects, interconnect solutions & electrical modules for Aerospace, Defence & Space", dataStatus:"demo", sourceDate:ASOF, strengths:["Indian Offset Partner status gives it a structural channel into defense procurement contracts that carry mandatory domestic-offset obligations"], risks:["Revenue spans Aerospace, Defence and Space - aerospace-specific share not separately disclosed", "Small-cap scale relative to the OEM customers it serves"], f:fin([98,60,106,148,211],[17,9,19,25,36],"Rs 2,216 Cr","Rs 1,045","SIKA","Indian Offset Partner status",[-13,78,52],[755,1359],null,[64.0,77.3,0.33,34.6,25.1,2.00])},
 dynamatic_gear: {name:"Dynamatic Technologies", listed:true, role:"Hydraulic gear pumps and actuation-adjacent machined parts feeding into landing-gear systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Cross-referenced hydraulics expertise from its core aerospace structures business gives it credible, qualified capability in actuation-adjacent hydraulic gear pumps"], risks:["Cross-referenced from the Structures zone - no dedicated landing-gear revenue disclosure", "Landing-gear-specific exposure is a small, undisclosed slice of Dynamatic's broader aerospace business"], f:fin([1253,1316,1429,1404,1621],[15,43,122,43,32],"Rs 8,933 Cr","Rs 13,153","DYNAMATECH","Cross-referenced from the Structures zone - no dedicated listed landing-gear pure-play found in India",[90,49,35],[6716,13287],[351,"dynamatic-technologies-ltd"],[152,1251,0.08,10.2,6.67,10.0])},
 unimech_gear: {name:"Unimech Aerospace and Manufacturing", listed:true, role:"Precision fasteners/tooling used in landing-gear assemblies", dataStatus:"demo", sourceDate:ASOF, strengths:["The same qualified fastener/tooling relationships with Airbus, Safran and Collins that underpin its structures business extend naturally into landing-gear assembly hardware"], risks:["Cross-referenced from the Structures zone - landing-gear-specific revenue not separately disclosed"], f:fin([36,94,209,243,240],[3,23,58,83,63],"Rs 8,476 Cr","Rs 1,665","UNIMECH","Cross-referenced from the Structures zone",[60,null,null],[695,1868],[2868825,"unimech-aerospace-and-manufacturing-ltd"],[118,145,0.00,11.2,7.96,5.00])},
 mtartech_aero: {name:"MTAR Technologies", listed:true, role:"Precision-engineered aero-engine/fuel-injection components (also LOX/LH2 space engine parts)", dataStatus:"demo", sourceDate:ASOF, strengths:["Precision-engineering capability spans aero-engine, space (LOX/LH2) and clean-energy (Bloom Energy) customers, giving it a broader technology base and more qualified blue-chip relationships (Rafael, GE) than a single-sector supplier"], risks:["Also supplies space (LOX/LH2) and energy (Bloom Energy) customers - aero-engine-specific revenue isn't separately broken out", "Customer concentration among a small number of global names"], f:fin([322,574,581,676,876],[61,103,56,53,94],"Rs 21,224 Cr","Rs 6,900","MTARTECH","Supplier to Rafael, GE, Bloom Energy",[267,39,37],[1824,8715],[436155,"mtar-technologies-ltd"],[156,267,0.00,15.1,12.4,10.0])},
 azadengineering_aero2: {name:"Azad Engineering", listed:true, role:"Turbine/compressor blades are its core hot-section product (see Forgings zone)", dataStatus:"demo", sourceDate:ASOF, strengths:["Hot-section turbine/compressor blade work is Azad's core qualified product line with GE, Honeywell and Safran, not a side business, giving genuine technical depth in the highest-margin segment of the value chain"], risks:["Same company and financials as the Forgings-zone listing (azadengineering_aero) - not incremental exposure", "Revenue concentrated among a small number of global engine OEMs"], f:fin([194,252,341,457,603],[29,8,59,87,134],"Rs 17,618 Cr","Rs 2,728","AZAD",null,[75,null,null],[1359,2987],[1840438,"azad-engineering-ltd"],[127,237,0.00,11.9,9.09,2.00])},
 bharatforge_aero2: {name:"Bharat Forge", listed:true, role:"Aerospace forgings division also supplies aero-engine forgings (see Forgings zone)", dataStatus:"demo", sourceDate:ASOF, strengths:["Leverages the same scale forging infrastructure and OEM relationships as its structural-forgings business to also supply aero-engine forgings, spreading fixed costs across a broader aerospace product base"], risks:["Same company and financials as the Forgings-zone listing (bharatforge_aero) - not incremental exposure", "Aerospace-specific revenue not broken out from consolidated results"], f:fin([10461,12910,15682,15123,16812],[1077,508,910,913,1089],"Rs 98,125 Cr","Rs 2,008","BHARATFORG",null,[70,23,22],[1179,2295],[184,"bharat-forge-ltd"],[97.2,200,0.42,12.6,12.0,2.00])},
 bel_aero: {name:"Bharat Electronics", listed:true, role:"Largest defense-electronics PSU - avionics, radar, EW; JVs with Safran and Israel Aerospace Industries", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest defense-electronics PSU, with JVs alongside Safran and Israel Aerospace Industries giving it access to foreign avionics/radar technology that smaller private players can't match"], risks:["Avionics/radar is one of several defense-electronics product lines - not separately broken out", "Large PSU with government-linked capital-allocation and governance considerations"], f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL",null,[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 datapatterns_aero: {name:"Data Patterns (India)", listed:true, role:"Integrated defense & aerospace electronics; acquired ST Advanced Composites (2026) - aerostructures expansion", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, consistently profitable defense-electronics franchise now using the ST Advanced Composites acquisition to diversify into aerostructures manufacturing"], risks:["2026 acquisition of ST Advanced Composites is a recent, unproven expansion into aerostructures", "Order book concentrated in defense-electronics programs with lumpy award timing"], f:fin([311,453,520,708,925],[94,124,182,222,271],"Rs 24,738 Cr","Rs 4,419","DATAPATTNS",null,[66,28,null],[2131,5000],[755079,"data-patterns-india-ltd"],[91.5,310,0.23,21.9,15.2,2.00])},
 astramicro_aero: {name:"Astra Microwave Products", listed:true, role:"RF/microwave sub-systems for radar & avionics", dataStatus:"demo", sourceDate:ASOF, strengths:["Established RF/microwave sub-system supplier to India's defense-electronics primes, occupying a specialized technical niche with a limited domestic competitor set"], risks:["Customer concentration among a small number of defense-electronics primes", "RF/microwave component costs exposed to import dependence"], f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,[55,57,53],[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 apollomicro_aero: {name:"Apollo Micro Systems", listed:true, role:"Mission-critical avionics/electro-mechanical sub-systems, missile & UAV electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Mission-critical qualification across avionics, missile and UAV electronics has driven consistently strong revenue growth, reflecting broadening content wins across multiple defense platforms"], risks:["Order lumpiness tied to large discrete defense contracts", "Smaller scale than larger defense-electronics peers"], f:fin([243,298,372,562,904],[15,19,31,56,107],"Rs 14,700 Cr","Rs 396","APOLLO",null,[22,90,102],[180,467],[72727,"apollo-micro-systems-ltd"],[121,36.8,0.06,14.5,11.8,1.00])},
 zentech_aero: {name:"Zen Technologies", listed:true, role:"Largest supplier of simulation/pilot & crew training systems, anti-drone systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Market leader in simulation/pilot training systems with a growing anti-drone franchise, positioning it at the center of two structurally growing defense-modernization themes"], risks:["Simulation/training systems are adjacent to, not the same as, flight avionics", "Revenue growth has been volatile year to year"], f:fin([70,219,440,974,688],[3,50,130,299,218],"Rs 15,190 Cr","Rs 1,682","ZENTEC",null,[12,30,52],[1223,2044],[1580,"zen-technologies-ltd"],[83.6,209,0.06,16.2,10.7,1.00])},
 cyientdlm: {name:"Cyient DLM", listed:true, role:"Electronics Manufacturing Services (EMS) for Aerospace & Defense integrated manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["Dedicated EMS platform for Aerospace & Defense with Cyient Group backing, giving it access to parent-level customer relationships and engineering expertise uncommon among pure contract manufacturers"], risks:["EMS/contract-manufacturing margins are structurally thinner than IP-driven component makers", "Aerospace & Defense is combined with other EMS end-markets in some disclosures"], f:fin([null,832,1192,1520,1261],[null,32,61,68,73],"Rs 7,394 Cr","Rs 931","CYIENTDLM",null,[115,10,null],[265,1010],[1513580,"cyient-dlm-ltd"],[90.0,128,0.00,9.90,7.49,10.0])},
 cyient: {name:"Cyient Ltd", listed:true, role:"Engineering/design services - aerospace design-engineering (DET segment) for Airbus, Boeing, Safran", dataStatus:"demo", sourceDate:ASOF, strengths:["Deeply embedded, decades-long design-engineering relationships with Airbus, Boeing and Safran give it recurring outsourced-R&D revenue that is stickier than one-off component contracts"], risks:["Aerospace design-engineering (DET) is one segment within a broader multi-industry engineering-services business", "Revenue tied to OEM R&D/outsourcing budgets, which can be cut in downturns"], f:fin([4534,6016,7147,7360,7268],[522,514,703,648,463],"Rs 12,168 Cr","Rs 1,095","CYIENT",null,[-3,-14,2],[750,1226],[301,"cyient-ltd"],[29.9,511,1.46,12.3,8.61,5.00])},
 hal_mro: {name:"Hindustan Aeronautics", listed:true, role:"ROH (Repair, Overhaul & Maintenance) segment ~1/3 of revenue - India's largest MRO by revenue", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest MRO provider by revenue, with a captive demand base from the military fleets it also manufactures - an integrated manufacture-and-sustain model competitors can't replicate"], risks:["ROH/MRO is roughly a third of HAL's revenue - the larger share is manufacturing/integration, not sustainment", "Almost entirely military-aircraft MRO - no meaningful civil MRO exposure"], f:fin([24620,26927,30381,30981,33089],[5080,5828,7621,8364,9116],"Rs 3,21,012 Cr","Rs 4,800","HAL","Almost entirely military-aircraft MRO",[1,36,48],[3479,5150],[80502,"hindustan-aeronautics-ltd"],[34.4,614,0.94,32.0,24.0,5.00])},
 gmraerotechnic: {name:"GMR Aero Technic", listed:false, role:"Third-party airframe MRO facility, part of GMR Hyderabad International Airport Ltd (GHIAL)", dataStatus:"unverified", sourceDate:ASOF, strengths:["Backed by GMR's Hyderabad Aviation SEZ with a signed JV lease with Safran Aircraft Engines, giving it a credible path into engine-MRO - a capacity segment India largely lacks"], risks:["Unlisted - no separately disclosed financials; parent GMR Airports Infrastructure doesn't break out this facility", "Planned Safran engine-MRO JV is not yet operational/revenue-generating"], notes:["Based at Rajiv Gandhi International Airport, Hyderabad - part of the GMR Hyderabad Aviation SEZ / Aerospace & Industrial Park","GMR's SEZ has a confirmed lease (signed 2023) with Safran Aircraft Engines to build an engine-MRO facility on-site","No public market data - GMR Airports Infrastructure Ltd (listed parent) does not break out Aero Technic/MRO financials separately"]},
 tanejaaerospace_mro: {name:"Taneja Aerospace and Aviation", listed:true, role:"Civil MRO hangar at Hosur, TN, capable of Boeing 737/A320 servicing", dataStatus:"demo", sourceDate:ASOF, strengths:["The most direct listed civil-MRO exposure in India, with a hangar already certified to service Boeing 737 and A320 aircraft - the two most common narrow-body types in the domestic fleet"], risks:["Cross-referenced from the Structures zone - MRO-specific revenue not separately disclosed", "Small-scale hangar relative to India's total civil MRO demand"], f:fin([31,32,30,41,40],[5,11,11,18,17],"Rs 880 Cr","Rs 345","TANAA","Cross-referenced from the Structures zone - the most direct listed civil-MRO exposure in India",[-7,11,42],[190,415],[2893,"taneja-aerospace-aviation-ltd"],[46.0,60.6,0.72,15.6,11.4,5.00])},
 hal_prime: {name:"Hindustan Aeronautics", listed:true, role:"Final aircraft/helicopter assembly and integration (Tejas, Su-30, ALH Dhruv)", dataStatus:"demo", sourceDate:ASOF, strengths:["Sole domestic integrator for India's frontline fighter and helicopter platforms (Tejas, Su-30, ALH Dhruv), giving it an effectively monopoly order pipeline tied to multi-decade defense-modernization programs"], risks:["Revenue almost entirely military/government - minimal civil aviation diversification", "Execution risk on large, multi-year platform programs (Tejas, helicopters)"], f:fin([24620,26927,30381,30981,33089],[5080,5828,7621,8364,9116],"Rs 3,21,012 Cr","Rs 4,800","HAL",null,[1,36,48],[3479,5150],[80502,"hindustan-aeronautics-ltd"],[34.4,614,0.94,32.0,24.0,5.00])},
 bel_prime: {name:"Bharat Electronics", listed:true, role:"Systems integration for avionics/mission systems across aircraft primes", dataStatus:"demo", sourceDate:ASOF, strengths:["Leverages the same avionics/radar manufacturing base that makes it India's largest defense-electronics PSU to also integrate mission systems across multiple aircraft primes"], risks:["Systems-integration role here is secondary to BEL's core avionics/radar manufacturing business (see Avionics zone)", "Integration revenue for other primes' platforms is not separately disclosed"], f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL",null,[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 bdl_aero: {name:"Bharat Dynamics", listed:true, role:"Missile-systems integrator adjacent to aerospace primes (not an aircraft-component supplier per se)", dataStatus:"demo", sourceDate:ASOF, strengths:["Sole listed Indian missile-systems integrator with a multi-decade order book tied to India's guided-weapons modernization, a near-monopoly position in its core segment"], risks:["Missile-systems integration is adjacent to, not the same as, aircraft-component supply", "Order timing tied to lumpy defense procurement cycles"], f:fin([2817,2489,2369,3345,2442],[500,352,613,550,420],"Rs 41,788 Cr","Rs 1,140","BDL",null,[-24,31,43],[1086,1633],[80210,"bharat-dynamics-ltd"],[80.2,116,0.43,13.9,10.2,5.00])},
 lt_aero: {name:"Larsen & Toubro", listed:true, role:"Defense & aerospace is a small segment inside a giant diversified conglomerate", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by the balance sheet, engineering depth and government-relationship network of India's largest engineering conglomerate, giving its defense/aerospace segment credibility and capital access standalone pure-plays lack"], risks:["Defense & aerospace is a small, undisclosed segment inside a much larger diversified conglomerate", "Group-wide financials shown are not aerospace-segment specific"], f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Group-wide figures, not aerospace-segment specific - strong caveat",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 beml_aero: {name:"BEML Ltd", listed:true, role:"Defence & Aerospace is a disclosed segment but minor vs. its core mining-equipment/rail business", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of PSU manufacturing relationships with the Ministry of Defence give it an established, if undisclosed, channel into defense-aerospace equipment programs"], risks:["Defence & Aerospace is a minor segment versus BEML's core mining-equipment and rail businesses", "Segment-specific margins and order book are not separately disclosed"], f:fin([4337,3899,4054,4022,4351],[129,158,282,293,141],"Rs 16,962 Cr","Rs 2,036","BEML",null,[-3,21,29],[1355,2277],[176,"beml-ltd"],[95.0,352,0.84,7.66,4.78,5.00])},
 tasl: {name:"Tata Advanced Systems Ltd (TASL)", listed:false, role:"Airbus C-295 final assembly line JV (Vadodara), UAVs, aerostructures", dataStatus:"unverified", sourceDate:ASOF, strengths:["Runs India's only final-assembly line for a full military transport aircraft (Airbus C-295) under a government-anchored JV, backed by the Tata Group's balance sheet and execution capability"], risks:["Unlisted - no public financials for the C-295 JV or broader aerospace arm", "Program timelines depend on government procurement and Airbus JV decisions"], notes:["Part of the Tata Group's defense/aerospace arm","No public market data - not listed"]},
 kinecokaman_aero: {name:"Kineco Kaman Composites (India)", listed:false, role:"Composite structures for BAE Systems, Airbus, Boeing, Bell (JV between Kineco and Kaman Aerospace)", dataStatus:"unverified", sourceDate:ASOF, strengths:["JV combines Kineco's manufacturing base with Kaman Aerospace's composite-structures technology and qualified relationships across BAE Systems, Airbus, Boeing and Bell"], risks:["Unlisted JV - no public financial disclosure", "Customer base concentrated among a small number of global primes (BAE, Airbus, Boeing, Bell)"], notes:["Based in Goa","No public market data - not listed"]},
 godrejaerospace: {name:"Godrej Aerospace", listed:false, role:"Aerostructures, launch-vehicle/satellite hardware, missile subsystems (part of Godrej & Boyce)", dataStatus:"unverified", sourceDate:ASOF, strengths:["Backed by the Godrej & Boyce parent's manufacturing scale and decades of precision-engineering experience, spanning aerostructures, launch-vehicle hardware and missile subsystems"], risks:["Unlisted business unit within the larger, diversified Godrej & Boyce group - no separate financials", "Aerospace is one of several unrelated businesses under the same parent"], notes:["No public market data - not listed"]},
 parasdefence: {name:"Paras Defence and Space Technologies", listed:true, role:"Optics, EO/IR sighting systems, space-grade optics and defense electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Specialized, high-precision optics and EO/IR technology base spanning defense and space applications gives it a differentiated niche with limited direct domestic competition"], risks:["Customer concentration among defense/government buyers", "Order timing tied to lumpy defense procurement cycles"], f:fin([183,222,254,365,477],[27,36,30,61,89],"Rs 10,646 Cr","Rs 1,321","PARAS",null,[90,53,null],[580,1585],[665815,"paras-defence-and-space-technologies-ltd"],[115,90.0,0.08,17.2,12.4,5.0])},
 axiscades: {name:"AXISCADES Technologies", listed:true, role:"Aerospace/defense engineering design services, avionics software and systems engineering outsourcing", dataStatus:"demo", sourceDate:ASOF, strengths:["Established avionics-software and systems-engineering outsourcing relationships position it to capture growing OEM demand to offshore design work to India"], risks:["Design/engineering-services revenue depends on OEM R&D and outsourcing budgets", "Smaller scale than larger multinational engineering-services peers"], f:fin([610,822,955,1031,1159],[23,-5,33,75,72],"Rs 8,048 Cr","Rs 1,892","AXISCADES",null,[15,57,92],[1061,2211],[141,"axiscades-technologies-ltd"],[245,171,0.00,15.4,11.5,5.0])},
 rosselltechsys: {name:"Rossell Techsys", listed:true, role:"Aerospace/defense interconnect and wire harness manufacturing, avionics panel repair/rework/MRO", dataStatus:"demo", sourceDate:ASOF, strengths:["Combines wire-harness manufacturing with avionics panel repair/rework/MRO, giving it recurring sustainment revenue alongside one-time manufacturing content on the same customer base"], risks:["Recently demerged and listed (FY24) - limited standalone trading and financial history", "Customer concentration among a small number of defense OEMs"], f:fin([null,217,259,485,null],[null,11,7,21,null],"Rs 5,288 Cr","Rs 1,403","ROSSTECH","Only FY24-FY26 data available; demerged from Rossell India and listed in FY24",[92,null,null],[552,1530],null,[200,41.1,0.02,11.5,15.7,2.0])},
 dcxsystems_aero: {name:"DCX Systems", listed:true, role:"Aerospace/defense cable and wiring harness manufacturing, kitting and systems integration for defense OEMs", dataStatus:"demo", sourceDate:ASOF, strengths:["Kitting and systems-integration capability alongside core wire-harness manufacturing gives it broader content per aircraft shipset than a pure harness maker"], risks:["Swung to a net loss in FY26 with ROCE/ROE near zero or negative", "Revenue concentrated among a small number of defense OEM customers"], f:fin([1102,1254,1424,1084,743],[66,72,76,39,-8],"Rs 1,804 Cr","Rs 162","DCXINDIA","FY26 swung to a net loss; ROCE/ROE currently near-zero/negative",[-37,-18,null],[153,260],[1099425,"dcx-systems-ltd"],[null,136,0.00,0.87,-0.53,2.0])},
 avantel: {name:"Avantel", listed:true, role:"Defense/aerospace satellite communication systems, radar systems and network management software", dataStatus:"demo", sourceDate:ASOF, strengths:["Established satellite-communication and radar-systems franchise serving defense/government customers, a specialized niche where revenue and order book have grown consistently"], risks:["Order book concentrated among defense/government satellite-communication programs", "Smaller scale limits diversification across customers"], f:fin([105,154,224,249,223],[18,27,53,56,15],"Rs 4,145 Cr","Rs 156","AVANTEL",null,[-13,28,64],[117,215],[3840,"avantel-ltd"],[241,12.7,0.13,9.63,5.29,2.0])},
 centumelectronics_aero: {name:"Centum Electronics", listed:true, role:"Aerospace/defense/space electronics subsystems and EMS manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified technology base spanning aerospace, defense and space electronics subsystems gives it multiple qualified customer relationships across end-markets"], risks:["Net losses in 3 of the last 5 years - volatile profitability track record", "Revenue spans aerospace, defense and space - segment-specific numbers not disclosed"], f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Volatile profitability, net losses in 3 of last 5 years",[83,52,58],[2044,5000],[251,"centum-electronics-ltd"],[81.1,233,0.10,25.5,-12.5,10.0])},
 digilogicsystems: {name:"Digilogic Systems", listed:true, role:"Automated Test Equipment (ATE) systems, radar systems integration and support for defense/aerospace (BSE SME)", dataStatus:"demo", sourceDate:ASOF, strengths:["Specialized Automated Test Equipment and radar-systems-integration capability addresses a necessary, narrow niche in the defense-electronics supply chain with few dedicated domestic competitors"], risks:["Very small scale (BSE SME listing) relative to larger defense-electronics peers", "Limited trading history and liquidity typical of SME-platform listings"], f:fin([40,56,52,72,77],[1,2,2,8,10],"Rs 494 Cr","Rs 171","DIGILOGIC",null,[null,null,null],[73.0,215],null,[50.0,37.3,0.00,18.6,14.0,2.0])},
 techeraengineering: {name:"TechEra Engineering (India)", listed:true, role:"Precision tooling, jigs/fixtures and automation systems for aerospace and defense manufacturing (NSE SME)", dataStatus:"demo", sourceDate:ASOF, strengths:["Supplies precision tooling, jigs/fixtures and automation systems that every aerospace manufacturer needs to scale production, giving it exposure across the broader buildout rather than a single OEM relationship"], risks:["NSE SME listing with only one full year (FY26) of public financials available", "Small scale relative to larger precision-tooling peers"], f:fin([null,null,null,null,48.5],[null,null,null,null,2.77],"Rs 267 Cr","Rs 162","TECHERA","NSE SME listing (2024 IPO); only FY26 full-year figures publicly available",[null,null,null],[128,326],[2663457,"techera-engineering-india-ltd"],[96.3,31.8,0.00,8.59,5.41,10.0])},
 apsisaerocom: {name:"Apsis Aerocom", listed:true, role:"Precision-machined components and assemblies for aerospace, defense and healthcare industries (NSE SME)", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified precision-machining base across aerospace, defense and healthcare end-markets reduces reliance on any single industry's order cycle"], risks:["Incorporated 2022, NSE SME listing - only one full year (FY26) of public financials available", "Revenue spans aerospace, defense and healthcare - aerospace-specific share not disclosed"], f:fin([null,null,null,null,30.65],[null,null,null,null,7.51],"Rs 737 Cr","Rs 612","APSISAERO","NSE SME, incorporated 2022; only FY26 full-year figures publicly available",[null,null,null],[147,625],[3449240,"apsis-aerocom-ltd"],[97.8,40.6,0.00,32.0,25.5,10.0])},
 ideaforge: {name:"ideaForge Technology", listed:true, role:"Unmanned Aircraft Systems (UAVs/drones) for defense and civil surveillance, systems integration", dataStatus:"demo", sourceDate:ASOF, strengths:["Established market leader in Indian UAV/drone systems for defense and civil surveillance, with a brand and customer base built over a decade-plus"], risks:["Sharp FY25 revenue/profit decline followed by only partial FY26 recovery - still loss-making", "UAV/drone defense demand can be lumpy and tender-dependent"], f:fin([159,186,314,161,226],[44,32,45,-62,-17],"Rs 3,629 Cr","Rs 730","IDEAFORGE","Sharp FY25 revenue/profit decline followed by partial FY26 recovery; still loss-making",[46,-7,null],[366,997],null,[923,138,0.00,-2.81,-3.34,10.0])},
 sigmaadvanced: {name:"Sigma Advanced Systems", listed:true, role:"Claims Tier-1 integrated aerospace and defence manufacturing (UK + India)", dataStatus:"demo", sourceDate:ASOF, strengths:["UK+India dual footprint under its new aerospace/defence structure could give it export-market access that purely domestic manufacturers lack"], risks:["2026 reverse-merger conversion from a former telecom-software shell - pre-FY26 financial history is not from the aerospace business", "Tier-1 integrated-manufacturing claims are not yet backed by a multi-year organic track record"], f:fin([52,2,0,107,492],[5,9,-13,-14,268],"Rs 17,967 Cr","Rs 946","SIGMAADV","CAUTION: 2026 reverse-merger conversion of former telecom-software shell Megasoft Ltd; FY22-25 figures are the legacy shell's numbers, not the aerospace business - do not treat pre-FY26 as organic history",[500,167,119],[139,987],[854,"sigma-advanced-systems-ltd"],[108,26.6,0.00,11.7,-4.03,10.0])}
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

 // Hangar / apron context - a true enclosure (back + side walls + an arched
 // roof) open on the apron-facing side, instead of a single flat wall slab
 // that didn't read as "hangar" from any angle but straight-on.
 var apron = new THREE.Mesh(new THREE.BoxGeometry(10,0.05,7), matApron);
 apron.position.set(0,0.02,0); hangarGroup.add(apron);
 var hangarBack = new THREE.Mesh(new THREE.BoxGeometry(0.15,2.4,6.0), matApron);
 hangarBack.position.set(-3.6,1.2,0); hangarGroup.add(hangarBack);
 [2.9,-2.9].forEach(function(wz){
 var hangarSide = new THREE.Mesh(new THREE.BoxGeometry(5.0,2.4,0.15), matApron);
 hangarSide.position.set(-1.1,1.2,wz); hangarGroup.add(hangarSide);
 });
 var archRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,5.0,16,1,true,-Math.PI/2,Math.PI), matHangar);
 archRoof.rotation.z = Math.PI/2;
 archRoof.position.set(-1.1,2.4,0); hangarGroup.add(archRoof);
 var toolCart = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.35), matToolCart);
 toolCart.position.set(-3.0,0.3,-2.5); hangarGroup.add(toolCart);

 // Structure & forgings: fuselage barrel + wing spars. Slimmer, longer barrel
 // (length:diameter ~9.5:1, matching a real narrow-body) with tapered-frustum
 // nose/tail instead of full-radius cones, so it reads as a slender tube with
 // a blunt nose rather than a fat pill with a pencil tip.
 var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,3.8,16), matFuselage);
 fuselage.rotation.z = Math.PI/2; fuselage.position.set(0,0.5,0); structGroup.add(fuselage);
 var nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.3,0.9,16), matFuselage);
 nose.rotation.z = Math.PI/2; nose.position.set(2.35,0.5,0); structGroup.add(nose);
 var tailcone = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.3,1.0,16), matFuselage);
 tailcone.rotation.z = -Math.PI/2; tailcone.position.set(-2.4,0.5,0); structGroup.add(tailcone);

 // Wing: a swept, tapered planform (root chord 0.8, tip chord 0.25, ~19deg
 // leading-edge sweep) built as two mirrored extrudes, instead of a flat
 // unswept rectangular slab - this was the single biggest "doesn't read as
 // an airliner" issue (the old wing was shorter than the fuselage and formed
 // a plus-sign silhouette rather than swept airliner wings).
 function buildWingHalf(mirror){
 var s = mirror ? -1 : 1;
 var shape = new THREE.Shape();
 shape.moveTo(0.5, s*0.3);
 shape.lineTo(-0.3, s*2.65);
 shape.lineTo(-0.55, s*2.65);
 shape.lineTo(-0.3, s*0.3);
 shape.closePath();
 var geo = new THREE.ExtrudeGeometry(shape, {depth:0.06, bevelEnabled:false, curveSegments:1});
 geo.rotateX(-Math.PI/2);
 geo.translate(0,0.55,0);
 return new THREE.Mesh(geo, matWing);
 }
 structGroup.add(buildWingHalf(false));
 structGroup.add(buildWingHalf(true));
 [-2.65,2.65].forEach(function(wz){
 var sharklet = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.15), matWing);
 sharklet.position.set(-0.4,0.68,wz); structGroup.add(sharklet);
 });
 var wingSpar = new THREE.Mesh(new THREE.BoxGeometry(0.75,0.07,5.3), matSpar);
 wingSpar.position.set(0.1,0.55,0); structGroup.add(wingSpar);

 var tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.05,1.85), matWing);
 tailWing.position.set(-2.5,1.0,0); structGroup.add(tailWing);
 var fin_ = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.75,0.06), matWing);
 fin_.position.set(-2.5,1.35,0); structGroup.add(fin_);

 // Landing gear + engine nacelle
 [-0.5,0.5].forEach(function(gz){
 var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.5,8), matGear);
 strut.position.set(0.15,0.28,gz*1.2); engineGroup.add(strut);
 var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.1,14), matWheel);
 wheel.rotation.x = Math.PI/2; wheel.position.set(0.15,0.14,gz*1.2); engineGroup.add(wheel);
 });
 var noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.4,8), matGear);
 noseStrut.position.set(1.6,0.32,0); engineGroup.add(noseStrut);
 var noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.09,14), matWheel);
 noseWheel.rotation.x = Math.PI/2; noseWheel.position.set(1.6,0.14,0); engineGroup.add(noseWheel);

 // Nacelles moved inboard (~40% half-span, matching a real podded turbofan)
 // instead of out near the wingtip, each bridged to the wing by a pylon so the
 // engine doesn't float disconnected from the airframe when both layers show.
 [-1.1,1.1].forEach(function(ez){
 var nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.9,16), matNacelle);
 nacelle.rotation.z = Math.PI/2; nacelle.position.set(0.05,0.32,ez); engineGroup.add(nacelle);
 var fanFace = new THREE.Mesh(new THREE.CircleGeometry(0.2,16), matFan);
 fanFace.rotation.y = Math.PI/2; fanFace.position.set(0.5,0.32,ez); engineGroup.add(fanFace);
 var pylon = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.24,0.1), matNacelle);
 pylon.position.set(0.15,0.48,ez); engineGroup.add(pylon);
 });

 // Avionics & cabin systems
 var cockpitWindow = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.14,0.5), matWindow);
 cockpitWindow.position.set(2.1,0.7,0); avioGroup.add(cockpitWindow);
 [-1.6,-1.15,-0.7,-0.25,0.2,0.65,1.1,1.55].forEach(function(cx){
 var cabinWin = new THREE.Mesh(new THREE.CircleGeometry(0.07,10), matWindow);
 cabinWin.rotation.y = Math.PI/2; cabinWin.position.set(cx,0.6,0.3); avioGroup.add(cabinWin);
 });
 var radome = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.35,12), matAvionics);
 radome.rotation.z = Math.PI/2; radome.position.set(2.85,0.5,0); avioGroup.add(radome);
 var antenna = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.06,0.25), matAvionics);
 antenna.position.set(0,0.82,0); avioGroup.add(antenna);

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
 whyNow: "India's 5G rollout is maturing into a dense multi-year capex cycle - operators are densifying urban networks, extending rural coverage, and starting to invest in 6G-adjacent fiberization and open-RAN, pulling spend across towers, fiber, active equipment and power systems.",
 thesisSummary: "The telecom supply chain turns operator capex into a concrete, physical buildout - towers, fiber, RAN equipment, antennas and backup power all scale with every new site, while PLI-driven domestic manufacturing captures a growing share of the equipment bill of materials.",
 featuredSignals: ["Operator capex guidance and tower/site addition targets", "PLI scheme disbursements for telecom equipment manufacturing", "Spectrum auction outcomes and rollout obligations", "Open-RAN and indigenous RAN stack adoption (Tejas, ITI, C-DOT)", "Tower InvIT acquisition/consolidation activity"],
 dataStatus: "demo",
 integratorZoneId: "epc",
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
 domains: [
 {id:"site_infra", title:"Site, Towers & Power", shortTitle:"Site & Power", description:"The physical towers, land/sites and backup power systems that every active equipment layer is built on top of.", color:"#4C6EF5", relatedDomains:["active_network","deployment_services"]},
 {id:"fiber_backhaul", title:"Fiber & Backhaul", shortTitle:"Fiber", description:"Optical fiber and cable manufacturing that carries backhaul and access traffic to and from each site.", color:"#8B5E34", relatedDomains:["active_network","deployment_services"]},
 {id:"active_network", title:"Active Network & RF Equipment", shortTitle:"Active Gear", description:"The RAN, switching and antenna/RF equipment that processes and transmits radio traffic at each site.", color:"#7A5CC7", relatedDomains:["component_manufacturing","site_infra"]},
 {id:"component_manufacturing", title:"Component Manufacturing (EMS)", shortTitle:"EMS", description:"Contract manufacturers assembling the PCBs, routers and RAN sub-assemblies that active-network OEMs design.", color:"#C9315C", relatedDomains:["active_network"]},
 {id:"deployment_services", title:"Deployment & Installation Services", shortTitle:"EPC", description:"The turnkey EPC contractors that erect towers, lay fiber and commission equipment on behalf of operators.", color:"#C99A2E", relatedDomains:["site_infra","fiber_backhaul","carrier_demand"]},
 {id:"carrier_demand", title:"Carrier Demand & Operations", shortTitle:"Operators", description:"The mobile and enterprise carriers whose capex and opex programs drive demand across every other domain.", color:"#B5179E", relatedDomains:["site_infra","deployment_services"]}
 ],
 zones: [
 {id:"towers", color:"#4C6EF5", label:"Telecom Towers & Passive Infrastructure", pos:[0,1.8,0], side:"top", desc:"The lattice/monopole structures and passive infrastructure (incl. tower InvITs) leased to operators.",
 domainId:"site_infra", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The physical lattice/monopole structures and land/rooftop sites that every other piece of active equipment is mounted on or housed within.",
 whyItMatters:"No active equipment - RAN, antennas, fiber termination - can be deployed until a tower or site exists to host it, making this the literal foundation of network densification.",
 valuePoolDescription:"Tower companies and InvITs earn recurring, long-term lease/rental income from co-located tenants, making this one of the few genuinely annuity-like value pools in the telecom chain.",
 bottlenecks:["Site acquisition and right-of-way/municipal permitting delays", "Tenant concentration - a financially stressed operator can stall co-location revenue", "Steel and galvanizing input-cost volatility for new tower builds"],
 keyDrivers:["Operator network-densification and rural-coverage targets", "Co-location/tenancy ratio improvements on existing towers", "InvIT consolidation of fragmented independent tower portfolios"],
 keyRisks:["Revenue concentration among a small number of large telco tenants, some financially stressed", "Tower-count growth slowing as densification shifts toward small cells rather than new macro towers", "Distressed independent players with negative net worth dragging down sector sentiment"],
 investorMetrics:["Tenancy ratio (tenants per tower)", "Net tower additions vs. churn", "Lease yield / rental escalation trends"],
 relatedComponents:["antennas","power","epc"],
 suppliers:[{key:"industowers", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"altiusinvit", exposureType:"owner", exposureStrength:"high"}, {key:"digifibretrust", exposureType:"owner", exposureStrength:"high"}, {key:"gtlinfra", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"suyogtelematics", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"skipper_telecom", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"salasar_telecom", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"fiber", color:"#8B5E34", label:"Optical Fiber & Cable Manufacturing", pos:[1.5,0.05,-1.0], side:"bottom", desc:"Glass fiber and OFC cables that carry backhaul and access traffic to and from the tower.",
 domainId:"fiber_backhaul", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Glass fiber and OFC cables that carry backhaul traffic from the tower back to the core network, and access traffic the last mile to enterprises and homes.",
 whyItMatters:"5G's bandwidth and latency promises depend on fiberized backhaul - towers still linked by microwave or legacy copper cap how much 5G capacity can actually be delivered.",
 valuePoolDescription:"Fiber/cable makers earn volume-driven manufacturing revenue, with margins that swing sharply with the industry's boom-bust OFC pricing cycles.",
 bottlenecks:["Right-of-way and trenching permissions for new fiber routes", "Cyclical OFC pricing - global oversupply has driven multi-year industry losses", "Fiberization lagging tower rollout, leaving many sites on microwave backhaul"],
 keyDrivers:["Operator fiberization-of-backhaul targets", "Fixed broadband (FTTH) rollout", "Data-centre and enterprise connectivity demand"],
 keyRisks:["OFC pricing downcycles have driven sector-wide losses in recent years", "Commodity, thin-margin manufacturing for most cable makers", "Revenue often blended across telecom, railway, solar and other cable end-markets"],
 investorMetrics:["OFC volume growth and utilization", "Pricing recovery versus the prior downcycle", "Share of revenue from telecom vs. other cable end-markets"],
 relatedComponents:["ran","epc"],
 suppliers:[{key:"sterlitetech", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"hfcl_fiber", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"vindhyatelelinks", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"birlacable", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"finolexcables_telecom", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"akshoptifibre", exposureType:"direct_supplier", exposureStrength:"high"}]},
 {id:"ran", color:"#7A5CC7", label:"RAN, Active Network Equipment & Switching", pos:[1.45,0.6,1.35], side:"right", desc:"The base-station cabinet, packet-transport and routing gear that processes traffic at the site.",
 domainId:"active_network", displayOrder:3, dataStatus:"demo",
 roleInSystem:"The base-station cabinet, packet-transport and routing gear that processes radio traffic at the site and hands it off to the core network.",
 whyItMatters:"This is the active 'brain' of each site - it determines network capacity, latency and feature support (4G vs 5G vs future 6G), independent of how good the passive infrastructure around it is.",
 valuePoolDescription:"RAN/active-equipment makers capture higher, IP-driven margins than passive infrastructure, especially indigenous players benefiting from PLI incentives and large government/BSNL orders.",
 bottlenecks:["Global chip/component supply for RAN hardware", "Government/PSU order-cycle lumpiness for indigenous suppliers", "Operator capex timing driving demand more than steady organic growth"],
 keyDrivers:["Open-RAN and indigenous-stack adoption (Tejas, ITI, C-DOT)", "5G site densification and 4G-to-5G swap-outs", "PLI-linked domestic manufacturing incentives"],
 keyRisks:["Lumpy government/BSNL order-cycle revenue recognition can swing results sharply year to year", "Competition from established global RAN vendors on private-operator deployments", "Structured-cabling/connectivity revenue can be a secondary, blended segment for some names"],
 investorMetrics:["Order book / backlog from operator and government contracts", "Revenue mix between telecom and adjacent (enterprise) networking", "R&D spend and indigenous IP ownership"],
 relatedComponents:["antennas","fiber","ems"],
 suppliers:[{key:"tejasnetworks", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"itilimited", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"frogcellsat", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"kronecomm", exposureType:"direct_supplier", exposureStrength:"medium"}]},
 {id:"antennas", color:"#1E9E76", label:"Antennas, RF & Microwave Components", pos:[0,3.5,0], side:"top", desc:"Base-station antenna panels, RF front-end modules and microwave backhaul radios mounted on the tower.",
 domainId:"active_network", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Base-station antenna panels, RF front-end modules and microwave backhaul radios mounted on the tower that actually transmit and receive the radio signal.",
 whyItMatters:"Antenna and RF performance directly determines coverage, capacity and signal quality - the most visible, physical interface between the network and the end user's device.",
 valuePoolDescription:"Most listed exposure here is a secondary slice of larger defense-electronics or handset-distribution businesses, so pure-play RF/antenna value capture in telecom specifically is thin and mostly undisclosed.",
 bottlenecks:["RF-component supply chains often shared with, and prioritized for, defense programs", "Telecom-specific antenna revenue rarely broken out from defense/space segments", "Import dependence for high-end RF front-end components"],
 keyDrivers:["5G massive-MIMO and multi-band antenna upgrades", "Microwave backhaul demand on non-fiberized sites", "Defense-linked RF manufacturing capacity spilling over into telecom"],
 keyRisks:["Telecom/5G RF work is a smaller, undisclosed slice of much larger defense-electronics revenue for most names", "Antenna-specific manufacturing exposure is often indirect, via a handset-distribution or defense-electronics parent", "Component-level margins are thinner than system-level RAN equipment"],
 investorMetrics:["Telecom/5G order wins disclosed separately from defense contracts", "RF component content per site as massive-MIMO adoption rises", "Export orders for RF/microwave subsystems"],
 relatedComponents:["ran","towers"],
 suppliers:[{key:"astramicro_telecom", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"centumelectronics_telecom", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"bel_telecom", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"optiemus", exposureType:"indirect_supplier", exposureStrength:"low"}]},
 {id:"epc", color:"#C99A2E", label:"Telecom EPC, Installation & Infrastructure Services", pos:[-1.5,1.0,1.5], side:"left", desc:"The turnkey design-build-install contractors that erect towers and lay fiber for operators.",
 domainId:"deployment_services", displayOrder:5, dataStatus:"demo",
 roleInSystem:"The turnkey design-build-install contractors that physically erect towers, lay fiber and commission active equipment on behalf of operators.",
 whyItMatters:"Even fully-funded operator capex can't become live network capacity without execution capacity - EPC throughput is often the binding constraint on how fast a rollout actually happens.",
 valuePoolDescription:"EPC contractors earn project-based, often low-margin construction revenue, with the better-run names diversifying into higher-margin O&M and adjacent EPC categories (solar, DC power) to smooth lumpiness.",
 bottlenecks:["Execution/labor capacity constraints during fast rollout phases", "Working-capital intensity of project-based, milestone-billed contracts", "Right-of-way and local permitting delays at the site level"],
 keyDrivers:["Operator capex cycles and rollout targets", "Government BharatNet / rural connectivity programs", "Tower and fiber densification pace"],
 keyRisks:["Project-based revenue is lumpy and highly dependent on operator capex timing", "Several names are diversifying into solar EPC, diluting pure telecom exposure", "For large conglomerates, telecom EPC is a small, undisclosed division rather than a core driver"],
 investorMetrics:["Order book / backlog and execution timelines", "Revenue mix between telecom and other EPC categories (solar, power)", "Working-capital days on project billing"],
 relatedComponents:["towers","fiber","operators"],
 suppliers:[{key:"lt_telecom", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"railtel_telecom", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"bondada", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"pacedigitek", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"sarteleventure", exposureType:"direct_supplier", exposureStrength:"high"}]},
 {id:"ems", color:"#C9315C", label:"Electronics Manufacturing Services (EMS)", pos:[2.0,1.3,-0.5], side:"right", desc:"Contract manufacturers assembling telecom PCBs, routers and RAN sub-assemblies for OEMs.",
 domainId:"component_manufacturing", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Contract manufacturers that assemble telecom PCBs, routers and RAN sub-assemblies on behalf of OEMs, turning component designs into finished hardware.",
 whyItMatters:"PLI-driven domestic manufacturing means more of the telecom equipment bill of materials is now assembled in India rather than imported - EMS players are the physical capacity behind that shift.",
 valuePoolDescription:"EMS is a volume/scale business with thin per-unit margins; value capture depends on winning a growing share of a customer's manufacturing volume across many verticals, not deep IP ownership.",
 bottlenecks:["Global semiconductor/component supply for telecom-grade electronics", "Telecom is usually one of several verticals served, diluting capacity allocation", "Customer concentration - a handful of OEM relationships can dominate telecom-linked revenue"],
 keyDrivers:["PLI scheme incentives for domestic telecom equipment manufacturing", "OEMs localizing RAN/router assembly in India", "Broader electronics-manufacturing policy push (not telecom-specific)"],
 keyRisks:["Telecom/networking is typically one vertical among several (auto, industrial, mobile, medical) - segment-specific share is usually undisclosed", "Thin, scale-dependent margins typical of contract manufacturing", "Mobile-phone EMS volumes can dwarf and obscure telecom-infrastructure-specific trends"],
 investorMetrics:["Segment-wise revenue disclosure (telecom/networking vs. other verticals)", "New OEM wins and capacity utilization", "Margin trend as PLI incentives phase in/out"],
 relatedComponents:["ran","antennas"],
 suppliers:[{key:"dixontech", exposureType:"indirect_supplier", exposureStrength:"low"}, {key:"kaynestech_telecom", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"avalontech", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"syrmasgs", exposureType:"indirect_supplier", exposureStrength:"medium"}, {key:"micelectronics_telecom", exposureType:"indirect_supplier", exposureStrength:"low"}]},
 {id:"power", color:"#D96C2B", label:"Power & Energy Systems for Towers", pos:[-0.9,0.4,0.9], side:"bottom", desc:"Backup batteries, diesel gensets and solar-hybrid power systems that keep sites running through outages.",
 domainId:"site_infra", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Backup batteries, diesel gensets and solar-hybrid power systems that keep a tower site's active equipment running through grid outages.",
 whyItMatters:"Rural and semi-urban India's grid reliability is inconsistent - uptime SLAs that operators promise customers are only as good as the backup power behind each site.",
 valuePoolDescription:"Equipment makers earn both initial system sales and recurring battery-replacement/maintenance revenue, since batteries and gensets degrade and are serviced over a site's operating life.",
 bottlenecks:["Battery chemistry/raw-material supply for site backup systems", "Diesel emission-norm transitions raising genset costs", "Telecom-specific demand rarely disclosed separately from broader industrial/automotive battery and genset businesses"],
 keyDrivers:["Site count growth and rural/semi-urban network expansion", "Shift toward solar-hybrid power to cut diesel operating costs", "Grid reliability trends in under-served regions"],
 keyRisks:["Automotive or industrial batteries dominate revenue for most names - telecom/tower backup is a minority, undisclosed slice", "Battery-replacement cycle revenue is recurring but not separately broken out", "Genset demand for telecom specifically is blended into broader industrial DG-set sales"],
 investorMetrics:["Battery/genset order volumes tied to new site rollout", "Replacement-cycle (AMC/service) revenue share", "Disclosed telecom/tower-specific segment revenue where available"],
 relatedComponents:["towers","ran"],
 suppliers:[{key:"hblpower_telecom", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"amararaja_telecom", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"exide_telecom", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"cummins_telecom", exposureType:"indirect_supplier", exposureStrength:"medium"}]},
 {id:"operators", color:"#B5179E", label:"Telecom Operators (Demand Side)", pos:[-2.4,0.5,-1.2], side:"left", desc:"The carriers whose capex programs drive demand across every other zone in this value chain.",
 domainId:"carrier_demand", displayOrder:8, dataStatus:"demo",
 roleInSystem:"The mobile and enterprise carriers whose network capex and opex programs create the demand that every other zone in this value chain ultimately serves.",
 whyItMatters:"Every tower built, fiber route laid and antenna installed exists because an operator paid for it - operator capex guidance is the single best leading indicator for the rest of the supply chain.",
 valuePoolDescription:"Operators capture subscriber and enterprise revenue directly, but capital intensity is extreme - most of that revenue is reinvested into network capex, with returns depending heavily on scale and spectrum position.",
 bottlenecks:["Industry-wide debt burden and AGR-related legacy liabilities constraining capex at weaker players", "Intense tariff competition limiting pricing power despite rising data consumption", "Spectrum cost and availability shaping how fast capex can translate into coverage"],
 keyDrivers:["Subscriber growth and data-consumption-per-user trends", "5G monetization (enterprise, FWA, premium plans)", "Spectrum auction outcomes and rollout obligations"],
 keyRisks:["Vodafone Idea's weak balance sheet remains a structural risk to overall industry capex and to tower/vendor receivables", "Legacy/defunct operators like RCOM illustrate the downside case when capex-funding support disappears", "Jio and Airtel's scale advantage pressures smaller and PSU operators (MTNL, TTML)"],
 investorMetrics:["Capex guidance and actual capex-to-revenue ratio", "ARPU (average revenue per user) trend", "Net subscriber additions and market-share shifts"],
 relatedComponents:["epc","towers"],
 suppliers:[{key:"bhartiairtel_op", exposureType:"operator", exposureStrength:"high"}, {key:"vodafoneidea", exposureType:"operator", exposureStrength:"high"}, {key:"bhartihexacom", exposureType:"operator", exposureStrength:"high"}, {key:"tatacomm_op", exposureType:"operator", exposureStrength:"medium"}, {key:"reliance_jio", exposureType:"operator", exposureStrength:"high"}, {key:"ttml", exposureType:"operator", exposureStrength:"low"}, {key:"mtnl", exposureType:"operator", exposureStrength:"low"}, {key:"rcom_legacy", exposureType:"at_risk_participant", exposureStrength:"low"}]}
 ],
 suppliers: {
 industowers: {name:"Indus Towers", listed:true, role:"Largest listed independent tower company (Bharti Airtel controlling shareholder post Vodafone exit)", dataStatus:"demo", sourceDate:ASOF, strengths:["Largest tower portfolio among listed independent players with Bharti Airtel - the financially strongest private telco - as controlling shareholder and anchor tenant, underpinning revenue visibility peers reliant on weaker tenants lack"], risks:["Revenue concentration among a small number of large telco tenants, including financially stressed Vodafone Idea"], f:fin([27717,28382,28601,30123,32493],[6373,2040,6036,9932,7145],"Rs 98,839 Cr","Rs 374.65","INDUSTOWER",null,null,[338,482],[629,"indus-towers-ltd"],[13.8,150,3.74,19.5,18.6,10.0])},
 altiusinvit: {name:"Altius Telecom Infrastructure Trust", listed:true, role:"Tower InvIT - acquired American Tower Corp's India business (~Rs 13,288 Cr, Sept 2024), rebranded 'Elevar'", dataStatus:"demo", sourceDate:ASOF, strengths:["The ATC India acquisition instantly delivered pan-India scale and a seasoned, already-tenanted tower portfolio rather than requiring a slow organic build-out"], risks:["Integration risk from the large ATC India acquisition is still working through its first full year of combined operations"], f:fin([9786,11100,12878,19454,24165],[547,797,1119,840,1107],"Rs 53,330 Cr","Rs 175","ALTIUSINVIT","FY26 is its first full year of integrated operations post the ATC India acquisition",null,[142,180],null,[42.2,37.6,2.30,8.60,8.07,150])},
 digifibretrust: {name:"Digital Fibre Infrastructure Trust", listed:true, role:"InvIT holding Reliance Jio's fiber network assets (sibling structure to Altius on the tower side)", dataStatus:"demo", sourceDate:ASOF, strengths:["Holds Reliance Jio's pan-India fiber network as its anchor asset, giving it a long-term contracted revenue stream from India's largest and best-capitalized telco"], risks:["Illiquid listing with no confirmed market cap in public data", "Multi-year history of reported net losses"], f:fin([11712,15496,16729,18553,18568],[-2582,-1089,-808,-332,-273],null,null,"DIGIFIBRE","Illiquid; market cap/price not found in this research pass",null,null,null,[null,null,null,6.51,2.93,100])},
 gtlinfra: {name:"GTL Infrastructure", listed:true, role:"~26,000 towers across 22 telecom circles", dataStatus:"demo", sourceDate:ASOF, strengths:["~26,000 towers spread across 22 circles give it real scale and tenant diversification that a smaller distressed player would lack"], risks:["Long-distressed balance sheet with negative net worth", "FY26 return to profit may reflect one-off items rather than a sustained turnaround"], f:fin([1463,1458,1372,1344,1372],[-1475,-1817,-681,-875,779],"Rs 1,435 Cr","Rs 1.12","GTLINFRA","Long-distressed independent tower co with negative net worth; FY26 return to profit may include one-offs",null,[0.96,1.67],null,[null,-4.07,0.00,null,null,10.0])},
 suyogtelematics: {name:"Suyog Telematics", listed:true, role:"Installs/commissions/services towers and OFC systems for telcos", dataStatus:"demo", sourceDate:ASOF, strengths:["Established installation/commissioning relationships across multiple telcos position it to keep capturing incremental tower and OFC rollout work as densification continues"], risks:["Project/order-based installation revenue rather than recurring leased-asset income, so earnings can be lumpy"], f:fin([null,null,167,193,222],[null,null,63,41,63],"Rs 761 Cr","Rs 649","SUYOG",null,null,[525,921],null,[12.6,418,0.15,14.6,14.2,10.0])},
 sterlitetech: {name:"Sterlite Technologies", listed:true, role:"Pure-play optical fiber/cable and networking products maker", dataStatus:"demo", sourceDate:ASOF, strengths:["Pure-play scale in optical fiber/cable plus a growing networking-products portfolio gives it direct leverage to both telecom fiberization and the emerging AI-datacenter fiber demand cycle"], risks:["OFC pricing has been cyclical, with recent years' losses tied to an industry-wide downcycle", "Stock re-rating may partly reflect AI-datacenter fiber demand speculation rather than telecom fundamentals"], f:fin([5437,6925,4083,3996,4745],[45,127,-57,-123,56],"Rs 43,037 Cr","Rs 837","STLTECH","Demerged its Global Services Business into STL Networks (effective 31-Mar-2025); 52W range and P/E reflect a large re-rating, likely AI-datacenter fiber demand speculation - flag as a volatility outlier",null,[84.6,912],[1299,"sterlite-technologies-ltd"],[182,46.5,0.00,7.65,1.24,2.00])},
 hfcl_fiber: {name:"HFCL", listed:true, role:"Optical fiber/cable, telecom equipment (routers, 5G RAN components) and defense electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified presence across fiber/cable, telecom equipment (routers, 5G RAN components) and defense electronics gives it multiple PLI-supported growth levers rather than dependence on a single segment"], risks:["Revenue spans fiber/cable, telecom equipment and defense electronics - telecom-fiber-specific economics are blended"], f:fin([4727,4743,4465,4065,4949],[326,318,338,173,329],"Rs 32,337 Cr","Rs 211.27","HFCL",null,null,[59.8,257],[543,"hfcl-ltd"],[56.5,32.0,0.09,10.8,6.98,1.00])},
 vindhyatelelinks: {name:"Vindhya Telelinks", listed:true, role:"Telecom/railway/solar/specialty cables and IP-1 fiber network investments (MP Birla Group)", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversification across telecom, railway, solar and specialty cables plus IP-1 fiber network investments cushions it against any single end-market's downcycle"], risks:["Cable revenue is diversified across telecom, railway, solar and specialty segments - telecom-specific share is undisclosed"], f:fin([1324,2900,4088,4054,3593],[193,185,283,203,220],"Rs 3,223 Cr","Rs 2,720","VINDHYATEL",null,null,[960,2953],[1486,"vindhya-telelinks-ltd"],[13.7,3548,0.22,8.15,5.31,10.0])},
 birlacable: {name:"Birla Cable", listed:true, role:"OFC, copper telecom cables, structured copper and specialty cables", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-standing, focused position in OFC and copper telecom cables within the established MP Birla Group manufacturing base"], risks:["Small-cap name with limited disclosed financial history (no FY22 data) - thinner data coverage than larger peers"], f:fin([null,792,686,662,771],[null,33,22,5,17],"Rs 1,086 Cr","Rs 362","BIRLACABLE",null,null,[104,419],null,[23.5,93.6,0.34,8.96,6.26,10.0])},
 finolexcables_telecom: {name:"Finolex Cables", listed:true, role:"Primarily electrical/building wires; communication cables (LAN/telecom copper) are a minority segment", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by a large, financially strong core electrical-wires business, giving its communication-cables segment stable funding even while it stays a minority revenue line"], risks:["Communication cables are explicitly a minority segment behind the much larger electrical/building-wire business"], f:fin([3768,4481,5014,5319,6321],[599,504,652,701,714],"Rs 22,343 Cr","Rs 1,461","FINCABLES","Partial/secondary exposure - electrical wires dominate revenue",null,[701,1498],[416,"finolex-cables-ltd"],[27.9,398,0.62,16.0,12.3,2.00])},
 akshoptifibre: {name:"Aksh Optifibre", listed:true, role:"Pure-play OFC maker in structural decline", dataStatus:"demo", sourceDate:ASOF, strengths:["Decades of pure-play OFC manufacturing experience and existing capacity leave it positioned to benefit if sector pricing and volumes recover"], risks:["Structural, multi-year revenue and profit decline - a distressed, turnaround-watch name rather than a growth play"], f:fin([316,286,220,130,127],[0,-14,-71,-26,-13],"Rs 115 Cr","Rs 7.04","AKSHOPTFBR","Five straight years of shrinking revenue and losses - a distressed/turnaround-watch name",null,[3.81,9.06],null,[null,-0.79,0.00,-6.63,null,5.00])},
 tejasnetworks: {name:"Tejas Networks", listed:true, role:"Leading indigenous optical/packet-transport and RAN equipment maker (Tata Group-controlled, BSNL key customer)", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Group backing and BSNL as a key anchor customer position it as India's leading indigenous optical/packet-transport and RAN vendor, a prime beneficiary of PLI-driven import substitution"], risks:["Government/BSNL order-cycle revenue is lumpy - a single year's profit or loss swing can be misleading"], f:fin([551,920,2471,8923,1103],[-63,-36,63,447,-909],"Rs 8,973 Cr","Rs 504","TEJASNET","The FY25-to-FY26 swing from Rs 8,923 Cr revenue/Rs 447 Cr profit to a Rs 909 Cr loss reflects lumpy government order-cycle recognition, not steady-state economics - single-year snapshots are misleading here",null,[294,645],[54898,"tejas-networks-ltd"],[null,165,0.50,-14.6,-26.8,10.0])},
 itilimited: {name:"ITI Limited", listed:true, role:"Govt PSU telecom equipment maker - GPON, telecom/defense electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["As a government PSU with legacy manufacturing infrastructure, it is a direct beneficiary of GPON and indigenous telecom/defense equipment orders reserved for domestic/PSU vendors"], risks:["Very high debtor days (~486) signal working-capital/collection risk typical of PSU government contracts", "Market cap looks rich relative to revenue, suggesting PSU-rerating rather than fundamentals"], f:fin([1861,1395,1264,3616,2184],[120,-360,-569,-215,293],"Rs 24,358 Cr","Rs 253","ITI","High debtor days (~486); market cap looks rich relative to revenue - likely PSU-rerating/speculative rather than fundamentals-driven",null,[233,373],null,[null,19.8,0.00,1.41,-8.86,10.0])},
 frogcellsat: {name:"Frog Innovations (Frog Cellsat)", listed:true, role:"In-building coverage (DAS/repeaters) and mobile network accessories for 2G-5G", dataStatus:"demo", sourceDate:ASOF, strengths:["Niche specialization in in-building coverage (DAS/repeaters) gives it a defensible position as operators densify indoor and enterprise coverage across 2G-5G networks"], risks:["Sharp recent revenue collapse (-52% YoY) into a small loss suggests order-timing volatility"], f:fin([133,133,158,219,106],[15,15,16,24,-2],"Rs 400 Cr","Rs 257.65","FROG","Sharp FY25-to-FY26 revenue collapse (-52%) into a small loss - possible order-timing air-pocket",null,[124,305],null,[null,102,0.00,-1.91,-0.71,10.0])},
 kronecomm: {name:"ADC India Communications (Krone Communications)", listed:true, role:"Structured cabling and copper/fiber physical connectivity products for telecom/enterprise networks", dataStatus:"demo", sourceDate:ASOF, strengths:["Debt-free balance sheet and an established structured-cabling/connectivity product line give it financial flexibility and a sticky position across both telecom and enterprise network builds"], risks:["Serves both telecom and enterprise networking customers, so telecom-specific exposure is partial", "Rising debtor days (66 to 82) is a mild working-capital flag"], f:fin([121,143,179,187,200],[8,8,21,24,19],"Rs 1,098 Cr","Rs 2,388","KRONECOMM","Debt-free; rising debtor days (66 to 82) is a mild working-capital flag",null,[1150,2678],null,[48.8,188,0.00,21.5,21.8,10.0])},
 astramicro_telecom: {name:"Astra Microwave Products", listed:true, role:"RF/microwave subsystems for defense and telecom", dataStatus:"demo", sourceDate:ASOF, strengths:["Established RF/microwave design and manufacturing capability built for defense programs transfers directly into 5G massive-MIMO and microwave-backhaul demand"], risks:["RF/microwave revenue spans both defense and telecom end-markets - telecom-specific share is undisclosed"], f:fin([750,816,909,1051,1163],[38,70,121,154,193],"Rs 15,404 Cr","Rs 1,622","ASTRAMICRO",null,[55,57,53],[836,1960],[123,"astra-microwave-products-ltd"],[81.5,138,0.15,20.3,16.0,2.00])},
 centumelectronics_telecom: {name:"Centum Electronics", listed:true, role:"RF/microelectronics/space-grade electronics for defense and telecom", dataStatus:"demo", sourceDate:ASOF, strengths:["Space-grade electronics and RF/microelectronics manufacturing capability built for defense/space gives it high-reliability technology credentials applicable to premium telecom RF components"], risks:["Loss-making in three of the last five years despite a rich market cap - a valuation-vs-fundamentals disconnect", "Revenue spans defense, telecom and space-grade electronics - telecom-specific share is undisclosed"], f:fin([780,923,1091,740,953],[-53,7,-3,-2,-52],"Rs 7,089 Cr","Rs 4,802","CENTUM","Loss-making in 3 of the last 5 years despite a very rich market cap - a valuation-vs-fundamentals disconnect",[83,52,58],[2044,5000],null,[81.1,233,0.10,25.5,-12.5,10.0])},
 bel_telecom: {name:"Bharat Electronics", listed:true, role:"Growing 5G/telecom RF-component business alongside its much larger defense-electronics base", dataStatus:"demo", sourceDate:ASOF, strengths:["A large, well-capitalized defense-electronics balance sheet and deep PSU order-execution track record let it fund and scale a growing 5G/telecom RF-component business without needing it to be a standalone profit driver yet"], risks:["Telecom/5G RF work is explicitly a smaller, strategically-notable slice of a much larger defense-electronics revenue base"], f:fin([15368,17734,20268,23769,27610],[2400,2986,3985,5323,6062],"Rs 2,87,676 Cr","Rs 394","BEL","Telecom/5G work is a smaller, strategically-notable slice of a much larger defense revenue base",[-1,42,42],[380,473],[175,"bharat-electronics-ltd"],[46.8,32.8,0.64,36.4,27.4,1.00])},
 optiemus: {name:"Optiemus Infracom", listed:true, role:"Mobile handset distribution (Nokia/Samsung brands); Optiemus Electronics arm does EMS/antenna-adjacent manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["Established Nokia/Samsung handset distribution relationships give its Optiemus Electronics arm a ready customer and channel base to cross-sell antenna-adjacent EMS manufacturing capacity"], risks:["Core business is mobile-handset distribution, not antenna manufacturing - antenna/EMS exposure is a small, adjacent slice"], f:fin([472,1174,1528,1890,1769],[-1,42,57,63,66],"Rs 5,133 Cr","Rs 569","OPTIEMUS","Partial exposure - core business is handset distribution, not antenna manufacturing",null,[288,851],null,[94.1,87.6,0.00,10.9,9.15,10.0])},
 lt_telecom: {name:"Larsen & Toubro", listed:true, role:"Telecom EPC/Smart World & Communication is one small division inside a giant infra/engineering conglomerate", dataStatus:"demo", sourceDate:ASOF, strengths:["Group-level balance-sheet strength, project-execution scale and existing operator relationships from other infrastructure verticals let its Smart World & Communication division win and execute large telecom EPC contracts that smaller pure-play contractors cannot"], risks:["Telecom EPC/Smart World is a minor, undisclosed division inside a giant diversified infrastructure conglomerate"], f:fin([156521,183341,221113,255734,285874],[10419,12531,15547,17673,18954],"Rs 5,33,324 Cr","Rs 3,876","LT","Do not attribute company-level financials to telecom exposure - it is a minor, undisclosed segment",[4,9,17],[3288,4440],[800,"larsen-toubro-ltd"],[30.3,794,0.98,14.6,15.9,2.00])},
 railtel_telecom: {name:"RailTel Corporation of India", listed:true, role:"Navratna PSU operating one of India's largest neutral telecom infrastructure networks along railway right-of-way", dataStatus:"demo", sourceDate:ASOF, strengths:["Navratna PSU status and a unique pan-India fiber network built along railway right-of-way give it a largely unreplicable infrastructure moat and steady government/B2B telecom revenue"], risks:["FY24-FY26 figures need direct re-verification against annual reports - only FY22/FY23 and TTM were confirmed"], f:fin([1548,1964,null,null,null],[209,189,null,null,null],"Rs 8,349 Cr","Rs 260.15","RAILTEL","FY24-FY26 figures should be re-verified directly against annual reports - only FY22/FY23 and TTM (~Rs 2,225 Cr/Rs 215 Cr) were confirmed",null,[245,401],null,[22.5,53.7,1.25,16.2,12.0,10.0])},
 bondada: {name:"Bondada Engineering", listed:true, role:"EPC + O&M for telecom AND solar sites", dataStatus:"demo", sourceDate:ASOF, strengths:["Established EPC + O&M execution capability across both telecom and solar sites gives it a diversified, fast-growing revenue base even as telecom's own share shrinks"], risks:["Telecom is now a shrinking minority of revenue - solar EPC/O&M has grown to ~79% of FY26 sales"], f:fin([334,371,801,1571,2843],[10,18,46,113,211],"Rs 3,097 Cr","Rs 277.30","BONDADA","Solar is now ~79% of FY26 revenue - telecom exposure is a shrinking share of a fast-growing company",null,[215,503],null,[14.2,62.2,0.00,39.4,35.7,2.00])},
 pacedigitek: {name:"Pace Digitek", listed:true, role:"Telecom-infra EPC + solar; also designs/installs DC power systems and batteries for towers", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversification into solar EPC and data-centre power systems alongside its core telecom-infra and tower DC-power/battery business broadens its addressable market beyond the telecom capex cycle alone"], risks:["Sharp FY23-to-FY24 revenue step-up suggests a large contract or consolidation event worth independent verification", "Diversifying into solar EPC and data-centre power systems alongside its core telecom-infra business"], f:fin([406,503,2434,2439,2641],[12,17,230,279,307],"Rs 3,591 Cr","Rs 166.35","PACEDIGITK","Sharp FY23-to-FY24 revenue step-up suggests a large contract/consolidation event worth verifying",null,[140,232],null,[12.0,102,0.00,21.4,17.6,2.00])},
 sarteleventure: {name:"Sar Televenture", listed:true, role:"Small EPC contractor for 4G/5G tower construction", dataStatus:"demo", sourceDate:ASOF, strengths:["Fast-scaling order wins in 4G/5G tower construction show it successfully capturing incremental EPC capacity as larger contractors run into throughput limits during peak rollout phases"], risks:["Explosive revenue growth is off a very low base - a small, early-stage EPC contractor with limited track record"], f:fin([5,32,124,350,522],[0,1,16,47,72],"Rs 460 Cr","Rs 91.65","SARTELE","Explosive but early-stage revenue growth (5-yr CAGR ~256%) reflects a low base - treat growth rates cautiously",null,[72.4,265],null,[6.40,193,0.00,8.84,7.95,2.00])},
 dixontech: {name:"Dixon Technologies", listed:true, role:"India's largest listed EMS player; telecom/networking gear (routers, set-top boxes) is one of several segments", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest listed EMS player, with the scale, OEM relationships and PLI-scheme participation to win a growing share of domestic telecom/networking-gear assembly just as it did in mobile phones"], risks:["Mobile-phone EMS dominates recent revenue growth - telecom/networking gear is a smaller slice of a much larger EMS business"], f:fin([10697,12192,17691,38860,48873],[190,255,375,1233,1644],"Rs 81,907 Cr","Rs 13,390","DIXON","Partial exposure - mobile-phone EMS dominates the FY25/FY26 revenue jump",null,[9600,17640],[60393,"dixon-technologies-india-ltd"],[43.6,769,0.07,29.2,18.9,2.00])},
 kaynestech_telecom: {name:"Kaynes Technology India", listed:true, role:"Diversified EMS (auto, industrial, telecom, medical) with telecom/networking as one vertical", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified EMS exposure across auto, industrial, telecom and medical verticals reduces reliance on any single end-market's capex cycle while still giving it telecom/networking content"], risks:["Telecom/networking is one vertical among several (auto, industrial, medical) in a diversified EMS business"], f:fin([706,1126,1805,2722,3626],[42,95,183,293,364],"Rs 24,536 Cr","Rs 3,650","KAYNES",null,null,[2995,7705],[1124672,"kaynes-technology-india-ltd"],[70.6,708,0.00,12.7,8.69,10.0])},
 avalontech: {name:"Avalon Technologies", listed:true, role:"EMS for industrials/telecom/clean-energy", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified EMS base across industrials, telecom and clean-energy gives it multiple growth vectors and customer relationships to leverage into telecom-networking volume"], risks:["Telecom is one of several end-markets (industrials, clean-energy) served by this EMS business"], f:fin([841,945,867,1098,1603],[67,52,28,63,113],"Rs 15,574 Cr","Rs 2,328","AVALON",null,null,[777,2620],null,[117,108,0.00,19.3,16.5,2.00])},
 syrmasgs: {name:"Syrma SGS Technology", listed:true, role:"Broad EMS/ODM including telecom & networking modules", dataStatus:"demo", sourceDate:ASOF, strengths:["Strong profit inflection (+88% YoY) atop a ~40% five-year revenue CAGR shows an EMS/ODM platform scaling broadly, including the telecom/networking modules within its mix"], risks:["Telecom/networking modules are part of a broad, diversified EMS/ODM portfolio - segment-specific share is undisclosed"], f:fin([1267,2048,3154,3787,4819],[79,123,124,184,346],"Rs 33,410 Cr","Rs 1,733","SYRMA","Strong FY26 profit inflection (+88% YoY) alongside a 40% 5-yr revenue CAGR",null,[634,1804],null,[90.0,148,0.09,16.8,14.0,10.0])},
 micelectronics_telecom: {name:"MIC Electronics", listed:true, role:"LED lighting/display systems and telecom equipment (also railway and EV-charging electronics)", dataStatus:"demo", sourceDate:ASOF, strengths:["Multi-segment electronics manufacturing capability spanning LED display, telecom, railway and EV-charging gives it several potential growth avenues despite its small, volatile base"], risks:["Extremely volatile, small-base earnings with telecom as one of several scattered electronics segments"], f:fin([45,23,55,95,191],[3,0,62,10,-13],"Rs 1,071 Cr","Rs 36.10","MICEL","Extremely volatile earnings; FY24's profit spike on modest revenue looks like a one-off gain",null,[30.0,61.6],[861,"mic-electronics-ltd"],[null,8.97,0.00,8.67,-5.76,2.00])},
 hblpower_telecom: {name:"HBL Power Systems", listed:true, role:"Telecom/industrial batteries, including 20,000+ installations for the BharatNet Wi-Fi project", dataStatus:"demo", sourceDate:ASOF, strengths:["Over 20,000 installations for the BharatNet Wi-Fi project demonstrate a proven, large-scale track record supplying telecom/industrial backup power that few peers can match"], risks:["FY24-FY26 figures need direct re-verification from company filings - only FY22/FY23 figures and a TTM estimate are confirmed"], f:fin([1236,1369,null,null,null],[94,98,null,null,null],"Rs 12,984 Cr","Rs 468","HBLPOWER","FY24-FY26 figures need direct re-verification from company filings; TTM (~Rs 2,026 Cr/Rs 234 Cr) implies a strong recent ramp",null,[99.8,612],[526,"hbl-power-systems-ltd"],[54.8,38.2,0.10,13.7,10.7,1.00])},
 amararaja_telecom: {name:"Amara Raja Energy & Mobility", listed:true, role:"Industrial/automotive battery major; telecom/UPS backup batteries are part of its industrial segment", dataStatus:"demo", sourceDate:ASOF, strengths:["Scale and R&D depth as one of India's two leading battery majors give its telecom/UPS backup segment manufacturing credibility and cost efficiency that smaller specialist suppliers lack"], risks:["Automotive batteries dominate group revenue - telecom/UPS backup batteries are a minority, undisclosed slice"], f:fin([8697,10392,11708,12846,13814],[513,731,934,945,896],"Rs 14,495 Cr","Rs 792","ARE&M","Partial exposure - automotive batteries dominate group revenue",null,[670,1023],null,[19.8,442,1.34,12.2,7.18,1.00])},
 exide_telecom: {name:"Exide Industries", listed:true, role:"Automotive/industrial battery major; telecom/industrial UPS batteries are a minority segment", dataStatus:"demo", sourceDate:ASOF, strengths:["Nationwide distribution and service network built for its automotive/industrial battery business gives it an existing channel to serve telecom-tower battery-replacement demand without needing fresh infrastructure"], risks:["Automotive batteries dominate revenue - telecom/industrial UPS batteries are an explicit minority segment", "FY22 profit included a one-time gain, distorting that year's comparison"], f:fin([12789,15078,16770,17238,17995],[4357,823,883,800,860],"Rs 36,010 Cr","Rs 424","EXIDEIND","FY22 profit includes a one-time gain; partial exposure - automotive dominates",null,[287,496],[404,"exide-industries-ltd"],[38.4,164,0.47,8.54,5.97,1.00])},
 cummins_telecom: {name:"Cummins India", listed:true, role:"Leading listed diesel-genset/engine maker; DG sets are widely used for tower backup power", dataStatus:"demo", sourceDate:ASOF, strengths:["Leading market position and brand trust in diesel gensets give it default-choice status for telecom-tower backup power across India's site base"], risks:["Telecom-tower-specific genset demand is not separately disclosed - DG sets serve many industrial end-markets"], f:fin([6171,7772,9000,10391,12143],[934,1228,1721,2000,2362],"Rs 1,37,075 Cr","Rs 4,945","CUMMINSIND","Indirect exposure - telecom-specific DG revenue is not separately disclosed",null,[3803,6143],[297,"cummins-india-ltd"],[56.2,306,1.33,39.5,30.2,2.00])},
 bhartiairtel_op: {name:"Bharti Airtel", listed:true, role:"India's largest listed telco by market cap", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest telco by market cap with the strongest balance sheet among private operators gives it the capex firepower to lead 5G densification and fiberization ahead of weaker rivals", "Industry-leading ARPU and premiumization trends give it pricing power that financially weaker operators cannot replicate"], risks:["FY25's large profit jump reflects a one-off/deferred-tax-related gain rather than a fundamental step-change"], f:fin([116547,139145,149982,172985,210973],[8305,12287,8558,37481,33823],"Rs 11,14,378 Cr","Rs 1,785","BHARTIARTL","FY25's profit jump reflects a large one-off/deferred-tax-related gain, per common analyst commentary",null,[1740,2175],[187,"bharti-airtel-ltd"],[35.7,245,1.34,17.6,20.3,5.00])},
 vodafoneidea: {name:"Vodafone Idea", listed:true, role:"Third major private telco, historically loss-making with negative net worth", dataStatus:"demo", sourceDate:ASOF, strengths:["A large, entrenched subscriber base and spectrum holdings give it residual relevance and optionality if government AGR relief or fresh fundraising materially eases its balance-sheet constraints"], risks:["Historically negative net worth; FY26's reported profit largely reflects other-income/one-off accounting items, not a fundamental turnaround"], f:fin([38516,42177,42652,43572,44873],[-28245,-29301,-31238,-27384,34552],"Rs 1,54,497 Cr","Rs 14.26","IDEA","Returned to a large reported profit in FY26 substantially via other-income/one-offs (likely AGR-relief or conversion accounting) - not a fundamental turnaround",null,[8.02,15.8],[589,"vodafone-idea-ltd"],[null,-3.30,0.00,-1.72,null,10.0])},
 bhartihexacom: {name:"Bharti Hexacom", listed:true, role:"Bharti Airtel subsidiary (listed 2024) - second-largest wireless operator in Rajasthan and Northeast circles", dataStatus:"demo", sourceDate:ASOF, strengths:["Operating margins above 50% in recent quarters and a dominant position in the Rajasthan and Northeast circles reflect genuine standalone profitability, not just a pass-through of parent Airtel's scale"], risks:["As an Airtel subsidiary, its fortunes are closely tied to the parent group's capital-allocation and circle strategy decisions"], f:fin([5405,6579,7089,8548,9354],[1675,549,504,1494,1733],"Rs 74,090 Cr","Rs 1,481.80","BHARTIHEXA","Operating margins above 50% in recent quarters",null,[1430,1956],null,[40.1,143,1.21,21.4,26.0,5.00])},
 tatacomm_op: {name:"Tata Communications", listed:true, role:"Global enterprise/wholesale connectivity and data-centre operator rather than a retail mobile carrier", dataStatus:"demo", sourceDate:ASOF, strengths:["An established global enterprise/wholesale connectivity network and data-centre footprint give it a differentiated, less-commoditized revenue base than retail mobile operators facing tariff competition"], risks:["Volatile net profit reflects data-centre business (STT GDC) divestment/accounting effects rather than core connectivity trends", "Primarily an enterprise/wholesale connectivity and DC operator, not a retail mobile demand driver"], f:fin([16725,17838,20969,23109,24803],[1485,1801,970,1837,997],"Rs 47,510 Cr","Rs 1,666.50","TATACOMM","Volatile net profit likely reflects data-centre business (STT GDC) divestment/accounting effects",null,[1322,2110],[1357,"tata-communications-ltd"],[45.7,121,1.05,14.6,32.6,10.0])},
 reliance_jio: {name:"Jio Platforms (Reliance Jio Infocomm)", listed:false, role:"India's largest telco by subscribers - wholly-owned unlisted subsidiary of listed Reliance Industries", dataStatus:"unverified", sourceDate:ASOF, strengths:["India's largest telco by subscribers, backed by Reliance Industries' balance sheet, giving it capex capacity exceeding any other single operator in the chain", "Developed an indigenous O-RAN-based 5G core/RAN technology stack in-house, reducing reliance on global equipment vendors"], risks:["Unlisted - RIL's consolidated figures blend O2C, retail and digital services, so Jio's standalone financials aren't disclosed"], notes:["Reliance Industries (listed parent, RELIANCE) FY22-26 consolidated revenue/net profit: Rs 6,94,673/67,845 Cr to Rs 10,55,780/95,754 Cr - RIL is a diversified conglomerate (O2C, retail, digital services) and does not separately disclose Jio's standalone P&L","Developed an indigenous O-RAN-based 5G core/RAN technology stack in-house","BSNL (wholly Govt-owned, unlisted) is the other major operator, using Tejas Networks/ITI/C-DOT indigenous stack for its own 4G/5G rollout"]},
 skipper_telecom: {name:"Skipper Ltd", listed:true, role:"Galvanized lattice steel towers, monopoles and tower structures for telecom and power transmission", dataStatus:"demo", sourceDate:ASOF, strengths:["Established galvanizing and lattice-steel tower manufacturing capacity serving both telecom and power-transmission customers gives it scale and demand diversification that pure telecom-tower fabricators lack"], risks:["Telecom is one of two end-markets (alongside power transmission) - tower-specific revenue is not separately disclosed"], f:fin([1707,1980,3282,4624,5553],[25,36,82,149,213],"Rs 6,225 Cr","Rs 551","SKIPPER",null,[8,37,48],[300,617],[1728,"skipper-ltd"],[26.8,132,0.02,23.6,16.6,1.0])},
 salasar_telecom: {name:"Salasar Techno Engineering", listed:true, role:"Telecom tower and steel structure fabrication, galvanizing, monopoles for telcos and power T&D", dataStatus:"demo", sourceDate:ASOF, strengths:["Integrated steel fabrication and galvanizing capability across telecom tower and power T&D structures lets it flex capacity toward whichever end-market cycle is stronger"], risks:["Telecom is one of two end-markets (alongside power T&D) - tower-specific revenue is not separately disclosed"], f:fin([719,1005,1208,1447,1503],[31,40,53,19,18],"Rs 822 Cr","Rs 4.70","SALASAR",null,[-48,-23,-4],[4.66,11.5],[56821,"salasar-techno-engineering-ltd"],[60.0,4.77,0.00,8.13,2.13,1.0])},
 ttml: {name:"Tata Teleservices (Maharashtra)", listed:true, role:"Tata group telecom circle operator (Maharashtra & Goa) - enterprise/fixed-line and data services since exiting retail mobile in 2019", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Group backing and an established enterprise/fixed-line customer base in the Maharashtra & Goa circle give it a defensible, specialized niche despite exiting the broader retail mobile race"], risks:["Exited retail mobile in 2019 - now a niche enterprise/fixed-line operator with a much smaller addressable base", "Persistent net losses across the reported period"], f:fin([1094,1106,1192,1308,1160],[-1215,-1145,-1228,-1275,-215],"Rs 6,733 Cr","Rs 34.4","TTML","Standalone financials (no material subsidiaries)",[-38,-29,0],[30.1,60.1],[1423,"tata-teleservices-maharashtra-ltd"],[null,-2.87,0.00,-12.7,null,10.0])},
 mtnl: {name:"Mahanagar Telephone Nigam (MTNL)", listed:true, role:"PSU telecom operator (Delhi & Mumbai circles) - fixed-line, mobile and broadband services", dataStatus:"demo", sourceDate:ASOF, strengths:["Captive government/PSU customer relationships and legacy fixed-line/enterprise contracts in the Delhi & Mumbai circles provide a residual, government-backed revenue base other distressed telecom assets lack"], risks:["Persistent, large annual net losses across the full reporting period with a shrinking PSU subscriber base"], f:fin([1388,1149,935,799,1130],[-2461,-2603,-2915,-3268,-3328],"Rs 1,487 Cr","Rs 23.6","MTNL",null,[-45,-10,5],[20.3,44.7],[888,"mahanagar-telephone-nigam-ltd"],[null,-476,0.00,-9.32,null,10.0])},
 rcom_legacy: {name:"Reliance Communications (RCOM)", listed:false, role:"Legacy/defunct telecom operator - historical relevance to India's pre-2019 tower/telecom ecosystem", dataStatus:"unverified", sourceDate:ASOF, strengths:["Its extensive legacy pan-India fiber and tower assets, built during India's earlier telecom boom, retain residual value that underpins acquirer interest through the IBC resolution process"], risks:["In insolvency resolution and headed toward liquidation - run by a resolution professional, not the board", "No dependable current market data; shown as a historical footnote rather than an active supply-chain entry"], notes:["In Corporate Insolvency Resolution Process (CIRP) under India's IBC since June 2019; NCLAT has since pushed the company toward liquidation","A resolution professional, not the board, runs the company; recent filings carry auditor qualifications","Trading status is unreliable/thinly-traded (reported suspensions on some platforms, sub-Re-1 trade-to-trade quotes on others) - no dependable current market data, shown here as a footnote only, not an active supply-chain entry"]}
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
 var matGenset = new THREE.MeshStandardMaterial({color:0x5a5f52, metalness:0.3, roughness:0.6, transparent:true, opacity:1});

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
 // Vertical perimeter fence (was a flat ring/plate, invisible except from
 // directly above) and a concrete pad under the cabinet row.
 [-0.9,0.9].forEach(function(fx){
 var fenceNS = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.2,1.8), matFence);
 fenceNS.position.set(fx,0.1,0); groundGroup.add(fenceNS);
 });
 [-0.9,0.9].forEach(function(fz){
 var fenceEW = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.2,0.02), matFence);
 fenceEW.position.set(0,0.1,fz); groundGroup.add(fenceEW);
 });
 var cabinetPad = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.05,0.8), matGround);
 cabinetPad.position.set(1.45,0.03,1.2); groundGroup.add(cabinetPad);
 // Ice bridge: elevated cable tray from the cabinet compound toward the tower
 // base - one of the most recognizable "telecom site" tells, absent before.
 var iceBridge = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.03,1.3), matDuct);
 iceBridge.position.set(0.7,0.9,0.7); iceBridge.rotation.y = Math.PI/4; groundGroup.add(iceBridge);
 [0.3,1.1].forEach(function(bb){
 var bridgeLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.85,6), matDuct);
 bridgeLeg.position.set(bb,0.45,bb); groundGroup.add(bridgeLeg);
 });

 // Tower structure: a two-stage taper (wide lattice base narrowing to a
 // slender upper section) with diagonal cross-bracing on the lower, most
 // visible bay - the single biggest fix vs. the old straight 4-post "ladder".
 var LEG_LOWER = 0.4, LEG_UPPER = 0.15, SPLIT_Y = 2.0, TOP_Y = 3.6;
 var legCorners = [[-1,-1],[1,-1],[-1,1],[1,1]];
 legCorners.forEach(function(c){
 var legLower = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,SPLIT_Y,8), matTowerLeg);
 legLower.position.set(c[0]*LEG_LOWER,SPLIT_Y/2,c[1]*LEG_LOWER); towerGroup.add(legLower);
 var upperH = TOP_Y-SPLIT_Y;
 var legUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.035,upperH,8), matTowerLeg);
 legUpper.position.set(c[0]*LEG_UPPER,SPLIT_Y+upperH/2,c[1]*LEG_UPPER); towerGroup.add(legUpper);
 });
 var lowerW = LEG_LOWER*2, diagLen = Math.sqrt(lowerW*lowerW+0.7*0.7), diagAngle = Math.atan2(0.7,lowerW);
 for (var lvl=0.6; lvl<SPLIT_Y; lvl+=0.7){
 var brace1 = new THREE.Mesh(new THREE.BoxGeometry(lowerW,0.02,0.02), matTowerLeg);
 brace1.position.set(0,lvl,-LEG_LOWER); towerGroup.add(brace1);
 var brace2 = brace1.clone(); brace2.position.z = LEG_LOWER; towerGroup.add(brace2);
 var brace3 = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,lowerW), matTowerLeg);
 brace3.position.set(-LEG_LOWER,lvl,0); towerGroup.add(brace3);
 var brace4 = brace3.clone(); brace4.position.x = LEG_LOWER; towerGroup.add(brace4);
 [-1,1].forEach(function(sign){
 var diagFB = new THREE.Mesh(new THREE.BoxGeometry(diagLen,0.015,0.015), matTowerLeg);
 diagFB.position.set(0,lvl+0.35,-LEG_LOWER); diagFB.rotation.z = sign*diagAngle; towerGroup.add(diagFB);
 var diagFB2 = diagFB.clone(); diagFB2.position.z = LEG_LOWER; towerGroup.add(diagFB2);
 var diagLR = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.015,diagLen), matTowerLeg);
 diagLR.position.set(-LEG_LOWER,lvl+0.35,0); diagLR.rotation.x = sign*diagAngle; towerGroup.add(diagLR);
 var diagLR2 = diagLR.clone(); diagLR2.position.x = LEG_LOWER; towerGroup.add(diagLR2);
 });
 }
 // Upper section: horizontal rings only (simpler/narrower bay, lower visual priority).
 for (var ulvl=SPLIT_Y+0.5; ulvl<TOP_Y-0.1; ulvl+=0.5){
 var upperW = LEG_UPPER*2;
 var ubrace1 = new THREE.Mesh(new THREE.BoxGeometry(upperW,0.015,0.015), matTowerLeg);
 ubrace1.position.set(0,ulvl,-LEG_UPPER); towerGroup.add(ubrace1);
 var ubrace2 = ubrace1.clone(); ubrace2.position.z = LEG_UPPER; towerGroup.add(ubrace2);
 }
 // Headframe/platform at the top - antennas mount on this, not on bare air.
 var platformRing = new THREE.Mesh(new THREE.TorusGeometry(0.45,0.015,6,16), matTowerLeg);
 platformRing.rotation.x = Math.PI/2; platformRing.position.set(0,TOP_Y-0.1,0); towerGroup.add(platformRing);
 [0,Math.PI*2/3,Math.PI*4/3].forEach(function(ang){
 var platformArm = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.02,0.02), matTowerLeg);
 platformArm.position.set(Math.sin(ang)*0.2,TOP_Y-0.1,Math.cos(ang)*0.2); platformArm.rotation.y = ang;
 towerGroup.add(platformArm);
 });

 // Active network equipment: a row of 2 cabinets + 3 RRUs mounted directly
 // behind their matching antenna panel (not floating off to one side).
 [1.2,1.75].forEach(function(cx){
 var cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.85,0.4), matCabinet);
 cabinet.position.set(cx,0.42,1.2); activeGroup.add(cabinet);
 var cabinetVent = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.1,0.42), matCabinet);
 cabinetVent.position.set(cx,0.82,1.2); activeGroup.add(cabinetVent);
 });
 [0,Math.PI*2/3,Math.PI*4/3].forEach(function(ang){
 var rru = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.25,0.12), matRRU);
 rru.position.set(Math.sin(ang)*0.5,3.35,Math.cos(ang)*0.5); rru.rotation.y = ang;
 activeGroup.add(rru);
 });
 tube([[1.2,0.9,1.2],[0.4,0.1,0.4],[0.4,2.0,0.4],[0.15,3.4,0.15],[0,TOP_Y-0.1,0]], 0.02, matCabinet, activeGroup);

 // Antennas & power systems - panels mounted on the headframe ring, a
 // properly-dished (not flat-drum) microwave dish lower on the tower face,
 // and a genset visually distinct from the battery bank.
 [0,Math.PI*2/3,Math.PI*4/3].forEach(function(ang){
 var panel = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.6,0.22), matAntennaPanel);
 panel.position.set(Math.sin(ang)*0.5,TOP_Y,Math.cos(ang)*0.5);
 panel.rotation.y = ang;
 antennaGroup.add(panel);
 });
 var microwaveDish = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.05,16), matAntennaPanel);
 microwaveDish.rotation.z = Math.PI/2; microwaveDish.position.set(0.25,2.3,0.25); antennaGroup.add(microwaveDish);
 var feedHorn = new THREE.Mesh(new THREE.ConeGeometry(0.02,0.08,6), matAntennaPanel);
 feedHorn.rotation.z = -Math.PI/2; feedHorn.position.set(0.3,2.3,0.25); antennaGroup.add(feedHorn);
 var gpsPuck = new THREE.Mesh(new THREE.SphereGeometry(0.03,8,8), matAntennaPanel);
 gpsPuck.position.set(0.15,TOP_Y+0.05,0.15); antennaGroup.add(gpsPuck);
 var battery = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.35,0.35), matBattery);
 battery.position.set(-0.9,0.18,0.9); antennaGroup.add(battery);
 var genset = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.35), matGenset);
 genset.position.set(-0.9,0.15,1.4); antennaGroup.add(genset);
 var exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.25,6), matGenset);
 exhaustPipe.position.set(-0.9,0.42,1.4); antennaGroup.add(exhaustPipe);
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
 [matAntennaPanel,matBattery,matSolar,matGenset].forEach(function(m){ setOp(m, antennaOp); });
 }
 };
 }
 };


 // ======================================================================
 // POLICY FLOWS
 // Same shape as a PRODUCTS.* sector (zones/suppliers/build/views) but entered
 // from the landing page's "Policy" tab instead of "Sector" - the story is "this
 // government/regulatory move creates this winner set of stocks" rather than
 // "this industry has this supply chain". See sector-content/index.ts's
 // `category` field and SectorBrowser.tsx for how the two tabs are filtered.
 // ======================================================================

 PRODUCTS.solarmodules = {
 id: "solarmodules", icon: "SL", name: "Solar Module Manufacturing (ALMM)",
 tagline: "The ALMM policy stack: polysilicon to panel - India's domestic solar push",
 category: "policy",
 headerTitle: "SOLAR MODULE ANATOMY",
 headerSub: "The ALMM policy stack - who makes India's solar cells, modules and the balance of system around them",
 whyNow: "The Approved List of Models and Manufacturers (ALMM) mandates that government-linked and increasingly private solar projects source cells and modules only from domestically listed, MNRE-approved manufacturers - turning a procurement rule into a multi-year capacity and order-book tailwind for a small set of Indian cell and module makers, just as global panel oversupply and Chinese dumping would otherwise have made that capacity uneconomic.",
 thesisSummary: "ALMM doesn't create demand for solar power - that's driven by India's renewable targets - it redirects who captures it. Module assembly is the direct, legislated beneficiary; cell manufacturing is being pulled onto the same list on a phased timeline; and everything upstream (polysilicon, wafers) and around it (glass, EVA, mounting, inverters) still carries real import dependence the policy doesn't yet fix.",
 featuredSignals: ["ALMM list additions/removals (MNRE)", "Cell-manufacturing ALMM phase-in timeline", "Announced/commissioned GW of cell and module capacity vs. targets", "Imported vs. domestic module pricing spread", "PM Surya Ghar and utility-scale tender volumes specifying ALMM-listed supply"],
 dataStatus: "demo",
 integratorZoneId: "modules",
 layerNames: ["Site","Cells & Wafers","Modules & Racking","Power & Grid"],
 shellMaxOpacity: 0.5, exoBaseOpacity: 0.55,
 defaultView: "overview",
 views: [
 {id:"overview", label:"Overview", pos:[8.5,5.5,8.5], target:[0,0.4,0], narration:"Welcome to the solar module manufacturing stack - the policy is the Approved List of Models and Manufacturers, or ALMM, and this is the physical stack of companies it runs through: raw materials, cells, modules, and the balance of system that turns a panel into a working power plant."},
 {id:"fab", label:"Fab", pos:[-5.5,2.6,4.5], target:[-3.4,0.6,0], narration:"The manufacturing building - this is where polysilicon wafers become solar cells, and cells become finished modules. ALMM's core rule applies right here: only modules made in a facility like this one, on MNRE's approved list, can supply government-linked solar tenders."},
 {id:"array", label:"Panel Array", pos:[2.5,3.2,6.5], target:[1.2,0.3,0], narration:"Rows of deployed modules on their mounting structure - the finished product of the module layer, and the visible end of the ALMM-covered supply chain."},
 {id:"power", label:"Power Yard", pos:[6.5,2.4,-3.5], target:[4.0,0.5,-2.2], narration:"Inverters and the grid-interconnect yard - this converts the DC power the panels generate into AC power the grid can use, and it's the layer ALMM does NOT cover, so it's still mostly import-dependent."},
 {id:"top", label:"Top", pos:[0.1,11,0.1], target:[0,0.3,0], narration:"From above - the fab building, the deployed array, and the power yard that connects it all to the grid."}
 ],
 domains: [
 {id:"upstream_materials", title:"Upstream Materials", shortTitle:"Materials", description:"Polysilicon, wafers, glass, EVA and backsheet - the inputs ALMM does not yet mandate be domestic, and where China still dominates.", color:"#9C6B30", relatedDomains:["cell_module_mfg"]},
 {id:"cell_module_mfg", title:"Cell & Module Manufacturing", shortTitle:"Cells & Modules", description:"Where ALMM's procurement rule actually bites - cells (phasing in) and modules (already mandated) made at MNRE-approved domestic facilities.", color:"#2E86AB", relatedDomains:["upstream_materials","balance_of_system"]},
 {id:"balance_of_system", title:"Balance of System", shortTitle:"BOS", description:"Mounting structures and inverters that turn a stack of modules into a working solar plant - not covered by ALMM, and the inverter layer in particular is still import-heavy.", color:"#D96C2B", relatedDomains:["cell_module_mfg","deployment"]},
 {id:"deployment", title:"EPC & Deployment", shortTitle:"Deployment", description:"The developers and EPC contractors who build and own the plants ALMM-listed modules go into.", color:"#3D5A80", relatedDomains:["balance_of_system"]}
 ],
 zones: [
 {id:"polywafer", color:"#9C6B30", label:"Polysilicon, Ingots & Wafers", pos:[-4.6,0.3,3.6], side:"left", desc:"The upstream feedstock chain - polysilicon refined into ingots, then sliced into wafers. India has almost no domestic capacity here today.",
 domainId:"upstream_materials", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The furthest-upstream layer - metallurgical-grade silicon refined into solar-grade polysilicon, then grown into ingots and sliced into wafers that feed cell manufacturing.",
 whyItMatters:"This is the single biggest domestic capacity gap in the entire Indian solar stack - without it, every ALMM-listed cell and module maker is still importing its core raw material, mostly from China.",
 valuePoolDescription:"Globally, polysilicon and wafer production is capital-intensive and currently oversupplied out of China at prices Indian greenfield capacity struggles to match without policy support - so the value pool sits almost entirely offshore today.",
 bottlenecks:["Zero operating domestic polysilicon capacity as of today - announced projects are pre-commissioning", "Wafer-slicing is a distinct, equipment-heavy process not yet localized either", "Capital intensity and multi-year lead times versus faster-moving downstream policy timelines"],
 keyDrivers:["Government push to extend ALMM-style rules upstream over time", "PLI and customs-duty support for backward integration", "Large conglomerates announcing integrated polysilicon-to-module complexes"],
 keyRisks:["Entirely import-dependent today - a genuine, unresolved structural gap", "Announced domestic capacity is pre-revenue and multi-year out", "Global polysilicon oversupply/price crashes could strand new domestic capacity economically"],
 investorMetrics:["Polysilicon/wafer capacity commissioning milestones vs. announced targets", "Import-substitution progress (domestic vs. imported wafer cost)", "Policy signals on extending ALMM-style mandates upstream"],
 relatedComponents:["cells","glass_eva"],
 suppliers:[{key:"relNewEnergy", exposureType:"emerging_entrant", exposureStrength:"medium"}, {key:"adanient", exposureType:"emerging_entrant", exposureStrength:"low"}]},

 {id:"glass_eva", color:"#C99A2E", label:"Solar Glass, EVA & Backsheet", pos:[-3.9,0.55,2.6], side:"left", desc:"The encapsulation materials that protect cells inside a finished module - low-iron solar glass, EVA film and backsheet.",
 domainId:"upstream_materials", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Encapsulates and protects the delicate solar cells inside a finished module - low-iron tempered glass on the front, EVA film bonding the layers, and a backsheet sealing the rear.",
 whyItMatters:"A module is only as durable as its encapsulation - glass and EVA/backsheet quality directly determine a panel's 25-year degradation and warranty performance.",
 valuePoolDescription:"Solar glass is a capital-intensive, scale-driven business prone to Chinese oversupply/dumping cycles that repeatedly squeeze domestic makers' margins; EVA/backsheet is more chemically specialized and still mostly import-dependent.",
 bottlenecks:["Domestic solar glass capacity is thin and has been repeatedly undercut by cheap Chinese imports", "EVA resin and backsheet films are largely imported inputs even for domestic converters", "Anti-dumping duty cycles create stop-start investment incentives"],
 keyDrivers:["Module manufacturing capacity growth pulling through glass/EVA demand", "Anti-dumping and safeguard duties on Chinese solar glass", "ALMM-driven module localization indirectly supporting domestic input demand"],
 keyRisks:["Chinese oversupply/dumping has repeatedly pressured domestic solar glass economics", "Thin, cyclical margins typical of glass manufacturing", "EVA/backsheet conversion still leans on imported resin and films"],
 investorMetrics:["Capacity utilization at domestic glass lines", "Anti-dumping duty renewal/removal decisions", "Import share of EVA/backsheet by value"],
 relatedComponents:["polywafer","modules"],
 suppliers:[{key:"borosilRenew", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"renewsys", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"cells", color:"#2E86AB", label:"Solar Cell Manufacturing", pos:[-2.6,0.5,0.8], side:"left", desc:"Converts silicon wafers into photovoltaic cells - the layer ALMM is extending its domestic-sourcing mandate to on a phased timeline.",
 domainId:"cell_module_mfg", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Converts silicon wafers into photovoltaic cells through diffusion, texturing and metallization - the electrical heart of a solar panel, assembled into modules in the next layer.",
 whyItMatters:"Cell manufacturing is where ALMM's domestic-sourcing mandate is being phased in alongside modules - India today assembles far more module capacity than it has matching domestic cell capacity, so most modules still use imported cells.",
 valuePoolDescription:"Cell manufacturing carries a meaningfully higher technology and capital-intensity moat than module assembly, so the small set of players with both cell and module capacity capture more of the value chain than module-only assemblers.",
 bottlenecks:["Domestic cell capacity is well behind domestic module assembly capacity - a persistent cells-to-modules capacity gap", "Technology transitions (PERC to TOPCon to HJT) risk stranding capacity built on an older cell architecture", "Equipment for cell lines is largely imported from China"],
 keyDrivers:["ALMM's cell-manufacturing phase-in timeline", "PLI (Production Linked Incentive) support for integrated cell-to-module capacity", "Rising module demand outstripping existing domestic cell supply"],
 keyRisks:["Cell technology shifts (TOPCon/HJT) could strand capacity built on older architectures", "Cell-making equipment is itself mostly imported, so backward integration only partly reduces import dependence", "Execution risk on large, newly-announced capacity ramps"],
 investorMetrics:["Domestic cell capacity commissioned vs. announced GW targets", "Cell technology mix (PERC vs. TOPCon/HJT) of new capacity", "Cell self-sufficiency ratio versus module assembly capacity"],
 relatedComponents:["polywafer","modules"],
 suppliers:[{key:"premierEnergies", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"websol", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"waaree", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"modules", color:"#1E9E76", label:"Solar Module Assembly", pos:[-1.0,0.65,-0.6], side:"top", desc:"Where cells, glass, EVA and backsheet come together into a finished, frame-and-junction-box-ready solar panel - ALMM's core, already-mandated layer.",
 domainId:"cell_module_mfg", displayOrder:4, dataStatus:"demo",
 roleInSystem:"Assembles cells, glass, EVA and backsheet into a finished, framed solar panel with a junction box and connectors - the product ALMM's list is actually built around.",
 whyItMatters:"This is the direct, already-in-force beneficiary of ALMM: government-linked and most utility-scale private solar tenders in India can only use modules from this MNRE-approved list, making it the policy's clearest stock-impact layer.",
 valuePoolDescription:"Module assemblers on the ALMM list capture a structural pricing and order-book advantage over importers for a large, policy-defined share of India's solar demand, even where their manufacturing cost base isn't fully cost-competitive with Chinese imports.",
 bottlenecks:["Domestic cell shortfall means many ALMM-listed module makers still import the cells they assemble", "Capacity additions have run well ahead of matching cell capacity, risking overcapacity at the module-only layer", "Global panel price declines compress margins even for ALMM-protected domestic volume"],
 keyDrivers:["ALMM mandate for government and utility-scale tenders", "PM Surya Ghar rooftop scheme driving retail/residential module demand", "Export opportunity to US/other markets seeking non-China supply", "Backward integration into cells improving margin capture"],
 keyRisks:["Announced module capacity across the industry is running well ahead of actual demand, risking overcapacity and price competition among ALMM-listed makers themselves", "Still import-dependent on cells, glass and EVA even where final assembly is domestic", "Policy-dependent moat - any dilution of ALMM enforcement directly hits this layer's structural advantage"],
 investorMetrics:["ALMM-listed capacity vs. total order book", "Cell self-sufficiency (in-house vs. imported cells)", "Export revenue mix, especially to the US"],
 relatedComponents:["cells","glass_eva","mounting"],
 suppliers:[{key:"waaree", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"premierEnergies", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"adanient", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"vikramSolar", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"insolation", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"mounting", color:"#64748B", label:"Mounting Structures & Trackers", pos:[1.4,0.25,1.6], side:"right", desc:"The racking, fixed-tilt structures and trackers that hold modules at the right angle to the sun - mostly fragmented, local fabrication, not ALMM-covered.",
 domainId:"balance_of_system", displayOrder:5, dataStatus:"demo",
 roleInSystem:"The steel racking, fixed-tilt structures and (on larger utility sites) single-axis trackers that physically hold modules at the correct angle and, for trackers, follow the sun through the day.",
 whyItMatters:"Mounting design affects both installation cost and long-run energy yield (trackers can lift output 10-20% over fixed-tilt) - it's a smaller-ticket layer than modules but still a real EPC cost line.",
 valuePoolDescription:"Fixed-tilt structural steel is a largely commoditized, regionally fragmented fabrication business; trackers are a higher-value, more specialized sub-segment where fewer domestic players compete.",
 bottlenecks:["Highly fragmented - most fixed-tilt structure fabrication is local/unlisted, not a few scaled national players", "Steel input-cost volatility feeding directly into structure costs", "Tracker technology and controls are still often imported or licensed"],
 keyDrivers:["Utility-scale solar capacity additions overall", "Shift toward trackers on larger sites for yield improvement", "Domestic steel availability and pricing"],
 keyRisks:["Not ALMM-covered - no policy-driven domestic-sourcing advantage at this layer", "Fragmented, commoditized, low-margin fixed-tilt segment for most players", "Steel price pass-through risk"],
 investorMetrics:["Order book tied to utility-scale project pipeline", "Tracker vs. fixed-tilt mix", "Margin trend amid steel price swings"],
 relatedComponents:["modules","inverters"],
 suppliers:[{key:"aparInds", exposureType:"indirect_supplier", exposureStrength:"low"}]},

 {id:"inverters", color:"#7A5CC7", label:"Power Conditioning & Inverters", pos:[2.8,0.55,-1.8], side:"right", desc:"String and central inverters that convert the DC power modules generate into grid-usable AC - not ALMM-covered, and still import-heavy.",
 domainId:"balance_of_system", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Converts the DC electricity solar modules generate into AC power the grid can use - string inverters for rooftop/commercial sites, central inverters for utility-scale plants.",
 whyItMatters:"Unlike modules, inverters sit entirely outside ALMM's domestic-sourcing mandate - this is the layer of the solar stack India is most structurally import-dependent on, dominated by Chinese and other foreign suppliers.",
 valuePoolDescription:"Inverter technology and software carry a real engineering moat versus commoditized structural steel, but most of that value pool today sits with global players rather than Indian manufacturers.",
 bottlenecks:["No ALMM-style domestic-sourcing mandate exists for inverters, unlike cells and modules", "Power-electronics component sourcing (semiconductors, capacitors) is itself import-dependent", "Few scaled, India-listed pure-play solar inverter manufacturers"],
 keyDrivers:["Utility-scale and rooftop solar capacity growth overall", "Potential future policy extension of domestic-content rules to inverters", "Broader power-electronics PLI schemes that could indirectly support this layer"],
 keyRisks:["Structurally import-dependent layer with no policy tailwind comparable to ALMM's module mandate", "Exposure for listed Indian names is usually a small, blended slice of a much larger diversified power-electronics business", "Competition from scaled global inverter makers with deeper R&D budgets"],
 investorMetrics:["Domestic inverter capacity/revenue, where disclosed separately", "Any policy signal extending domestic-content rules to inverters", "Import share of inverters by value"],
 relatedComponents:["mounting","epc"],
 suppliers:[{key:"cgpowerSolar", exposureType:"indirect_supplier", exposureStrength:"low"}]},

 {id:"epc", color:"#3D5A80", label:"EPC & Project Developers", pos:[4.0,0.85,-2.6], side:"bottom", desc:"The engineering-procurement-construction contractors and independent power producers who build and own the solar plants ALMM-listed modules go into.",
 domainId:"deployment", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Designs, builds and in many cases owns/operates the finished solar plant - the commercial layer that actually purchases ALMM-listed modules at scale and turns them into contracted power.",
 whyItMatters:"EPC and developer order books are the real-world demand signal for everything upstream - their project pipeline determines how much ALMM-listed module capacity actually gets utilized.",
 valuePoolDescription:"Developers/IPPs capture long-dated, contracted power-sale revenue (PPAs) once a plant is operational, a very different, more annuity-like profile than EPC contractors, who earn project-based construction margins.",
 bottlenecks:["Land and transmission-connectivity availability for utility-scale sites", "Module price volatility flowing directly into project economics and bid competitiveness", "Execution and commissioning delays versus contracted timelines"],
 keyDrivers:["India's renewable capacity targets and state/central tender volumes", "ALMM compliance requirements on the tenders they bid for", "Falling module costs improving project IRRs over time"],
 keyRisks:["Project-based EPC revenue is lumpy and execution-risk-heavy, unlike recurring IPP power-sale revenue", "Tariff/PPA renegotiation risk on long-dated power contracts", "Module and BOS cost inflation can compress already-thin EPC margins"],
 investorMetrics:["Order book / contracted capacity under construction", "Operational capacity (MW) and PPA tariff trend", "EPC margin vs. IPP annuity revenue mix"],
 relatedComponents:["modules","inverters","mounting"],
 suppliers:[{key:"sterlingWilson", exposureType:"operator", exposureStrength:"high"}, {key:"kpiGreen", exposureType:"operator", exposureStrength:"high"}, {key:"adaniGreen", exposureType:"owner", exposureStrength:"medium"}, {key:"tataPowerSolar", exposureType:"operator", exposureStrength:"low"}]}
 ],
 suppliers: {
 relNewEnergy: {name:"Reliance New Energy", listed:false, role:"Integrated polysilicon-to-module gigacomplex under development at Jamnagar", dataStatus:"demo", sourceDate:ASOF, strengths:["Reliance Industries' balance sheet and execution track record back one of the few fully-integrated polysilicon-to-module projects announced in India"], risks:["Unlisted subsidiary - no separately audited public financials; figures here are not available", "Project is still pre-commissioning at the scale needed to meaningfully close India's polysilicon gap"], notes:["Subsidiary of Reliance Industries (RIL)","Announced integrated solar gigacomplex (polysilicon to module) at Jamnagar","No separate public market data - not listed"]},
 adanient: {name:"Adani Enterprises", listed:true, role:"Solar cell, module and (planned) polysilicon manufacturing via Mundra Solar PV, part of its new-energy incubation portfolio", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's largest integrated solar cell-and-module operations (Mundra Solar PV) with group-level balance sheet support for backward integration"], risks:["Solar manufacturing is one of several incubating new-energy businesses inside a large, diversified Adani Enterprises - not separately disclosed", "Group-level financing/governance scrutiny has periodically pressured Adani group stock sentiment"], f:fin([96387,118962,144646,165730,100932],[1375,2792,1731,2558,4620],"Rs 2,63,000 Cr","Rs 2,297","ADANIENT","Diversified incubator entity - solar manufacturing is a sub-segment, not separately reported revenue",[22,27,-19],[1860,3200],[null,"adani-enterprises-ltd"],[56.9,420,0.04,13.1,15.8,1.00])},
 borosilRenew: {name:"Borosil Renewables", listed:true, role:"India's primary domestic solar glass manufacturer", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest and most established domestic solar glass producer, with first-mover scale in a thin-margin, capital-intensive business"], risks:["Repeated Chinese solar-glass oversupply/dumping cycles have pressured margins and utilization", "Revenue and profitability are volatile year to year, tied to anti-dumping duty cycles and global glass pricing"], f:fin([1098,1301,1058,953,null],[134,98,-45,-112,null],"Rs 4,100 Cr","Rs 420","BORORENEW","Margins highly sensitive to anti-dumping duty status and Chinese import pricing",[8,-9,null],[320,620],[null,"borosil-renewables-ltd"],[null,88.4,0.00,-2.10,-5.30,1.00])},
 renewsys: {name:"RenewSys India", listed:false, role:"EVA encapsulant films and solar backsheet manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["One of a small number of established domestic EVA/backsheet converters supplying India's module manufacturers directly"], risks:["Unlisted - no audited public financials; figures here are not available", "Still reliant on imported EVA resin and backsheet base films as inputs"], notes:["Privately held, Mumbai-based; backed by the Lavasa/Kalyani-linked RenewSys group","One of India's few scaled domestic EVA film and backsheet manufacturers","No public market data - not listed"]},
 premierEnergies: {name:"Premier Energies", listed:true, role:"Integrated solar cell and module manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["One of a small number of Indian manufacturers with integrated cell-and-module capacity, capturing more of the value chain than module-only assemblers"], risks:["Recently listed (Sept 2024) with limited multi-year financial track record", "Cell and module capacity additions across the industry are running ahead of demand, risking pricing pressure"], f:fin([1536,3143,6896,null,null],[-9,232,517,null,null],"Rs 32,500 Cr","Rs 950","PREMIERENE","Listed Sep 2024 - limited financial history available",[null,null,null],[650,1180],[null,"premier-energies-ltd"],[62.8,95.0,0.00,27.4,24.9,1.00])},
 websol: {name:"Websol Energy System", listed:true, role:"Solar cell manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["Early, established solar cell manufacturing base positioned to benefit as ALMM's cell mandate phases in"], risks:["Small-cap with thinner trading liquidity and capital base than the larger integrated players", "Revenue scale is a fraction of the larger integrated cell-and-module makers"], f:fin([64,112,398,612,null],[-18,9,87,142,null],"Rs 5,200 Cr","Rs 1,480","WEBELSOLAR","Small-cap - verify latest figures before use",[null,null,null],[780,2150],[null,"websol-energy-system-ltd"],[36.6,142,0.00,38.2,33.5,10.0])},
 waaree: {name:"Waaree Energies", listed:true, role:"India's largest solar module manufacturer, expanding into cells and polysilicon", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest solar module manufacturer by capacity, with a growing order book and an expanding export business to the US"], risks:["Recently listed (Oct 2024) with limited multi-year financial track record", "Industry-wide module capacity additions are running ahead of demand, risking margin pressure even for the market leader"], f:fin([2947,6677,11398,null,null],[94,414,1274,null,null],"Rs 76,000 Cr","Rs 2,850","WAAREEENER","Listed Oct 2024 - limited financial history available",[null,null,null],[1700,3650],[null,"waaree-energies-ltd"],[59.6,310,0.00,30.1,27.2,10.0])},
 vikramSolar: {name:"Vikram Solar", listed:false, role:"Solar module manufacturing, expanding capacity ahead of a planned IPO", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, long-running module manufacturer with meaningful export relationships ahead of its planned public listing"], risks:["Unlisted as of this writing - no audited public financials; figures here are not available", "Filed for an IPO but timing and pricing remain uncertain"], notes:["Kolkata-based; one of India's longer-established solar module manufacturers","Filed draft IPO papers; not yet listed as of this writing","No public market data until listing"]},
 insolation: {name:"Insolation Energy", listed:true, role:"Solar module manufacturing, small-cap", dataStatus:"demo", sourceDate:ASOF, strengths:["Smaller, nimbler ALMM-listed module maker that has scaled rapidly off a low base alongside the broader industry capacity build-out"], risks:["Small-cap with thin trading history and a much smaller capacity base than the market-leading integrated players", "Revenue growth off a low base can reverse quickly if industry pricing turns"], f:fin([98,221,612,null,null],[6,19,58,null,null],"Rs 3,400 Cr","Rs 2,640","INSOLATION","Small-cap, recently scaled - verify latest figures before use",[null,null,null],[1100,4200],[null,"insolation-energy-ltd"],[58.6,142,0.00,33.8,29.4,10.0])},
 aparInds: {name:"Apar Industries", listed:true, role:"Conductors and specialty solar cabling for mounting/BOS, alongside its core transformer and conductor business", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, diversified conductors and cabling manufacturer with the scale to supply BOS cabling as utility-scale solar capacity grows"], risks:["Solar BOS cabling is a small slice of a much larger diversified conductors, cables and transformer-oil business - not separately disclosed"], f:fin([10121,13165,18805,19923,21340],[283,470,760,816,860],"Rs 42,000 Cr","Rs 10,850","APARINDS",null,[27,24,14],[6500,11800],[null,"apar-industries-ltd"],[48.8,620,0.20,22.4,20.1,10.0])},
 cgpowerSolar: {name:"CG Power and Industrial Solutions", listed:true, role:"Power electronics and transformers relevant to solar inverter/interconnect equipment", dataStatus:"demo", sourceDate:ASOF, strengths:["Post-turnaround power electronics and transformer manufacturer with the engineering base to expand into solar-specific power-conditioning equipment"], risks:["Solar-specific inverter/power-conditioning revenue is a small, undisclosed slice of a much larger diversified industrial and power-systems business"], f:fin([6519,8457,9871,10735,13420],[498,718,886,1010,1265],"Rs 1,15,000 Cr","Rs 780","CGPOWER",null,[26,17,25],[430,850],[null,"cg-power-and-industrial-solutions-ltd"],[91.2,20.5,0.19,27.0,46.2,2.00])},
 sterlingWilson: {name:"Sterling and Wilson Renewable Energy", listed:true, role:"Pure-play solar EPC contractor", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest pure-play solar EPC contractor by track record, now past its earlier financial-stress period with a recovering order book"], risks:["History of financial stress and governance concerns a few years ago - balance sheet recovery is still relatively recent", "Project-based EPC revenue is lumpy and execution-risk-heavy"], f:fin([4910,2458,2184,2912,3840],[-873,-574,-198,64,145],"Rs 7,200 Cr","Rs 420","SWSOLAR","Recovering from a prior period of financial stress - verify latest figures before use",[-30,-12,32],[280,620],[null,"sterling-and-wilson-renewable-energy-ltd"],[49.7,18.2,0.00,8.40,12.6,2.00])},
 kpiGreen: {name:"KPI Green Energy", listed:true, role:"Solar EPC contractor and independent power producer (IPP)", dataStatus:"demo", sourceDate:ASOF, strengths:["Dual EPC-plus-IPP model gives both project-based construction revenue and recurring contracted power-sale revenue from its own operating assets"], risks:["Smaller-cap with a concentrated Gujarat project base relative to larger national developers", "EPC revenue recognition can be lumpy quarter to quarter"], f:fin([612,891,1298,1456,null],[78,118,172,198,null],"Rs 7,800 Cr","Rs 620","KPIGREEN",null,[34,28,22],[380,920],[null,"kpi-green-energy-ltd"],[39.4,85.2,0.10,24.6,22.1,5.00])},
 adaniGreen: {name:"Adani Green Energy", listed:true, role:"Independent power producer - one of India's largest renewable (solar + wind) generation portfolios", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's largest contracted renewable generation portfolios by operating capacity, with long-dated PPAs underpinning revenue visibility"], risks:["High leverage funding its aggressive capacity build-out", "Group-level financing/governance scrutiny has periodically pressured Adani group stock sentiment"], f:fin([7132,9123,11219,12810,null],[223,721,1260,1897,null],"Rs 1,45,000 Cr","Rs 920","ADANIGREEN",null,[28,24,18],[650,1250],[null,"adani-green-energy-ltd"],[76.4,58.0,0.00,11.2,17.8,10.0])},
 tataPowerSolar: {name:"Tata Power", listed:true, role:"Solar EPC, rooftop (Tata Power Solar) and utility-scale generation, alongside its core T&D and conventional generation business", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Power Solar's established EPC and rooftop brand plus the parent's large power-generation balance sheet back the solar build-out"], risks:["Solar EPC/generation is one segment within a much larger diversified T&D, renewable and conventional power generation business - not separately disclosed"], f:fin([42816,55109,61449,65478,62429],[2156,3810,4280,4775,5118],"Rs 1,17,429 Cr","Rs 368","TATAPOWER",null,[15,12,9],[342,465],[1364,"tata-power-company-ltd"],[30.0,124,0.68,10.5,10.2,1.00])}
 },
 // Simple, legible geometric scene (not a ported hand-sculpted model like the
 // car/data-centre builds): a fab building, deployed panel rows on racking,
 // and a power yard - enough to anchor each zone's callout without needing
 // bespoke per-part geometry for a brand-new sector built in one pass.
 build: function(ctx){
 var THREE = ctx.THREE;
 var siteGroup = ctx.layerGroups[0], cellGroup = ctx.layerGroups[1], moduleGroup = ctx.layerGroups[2], powerGroup = ctx.layerGroups[3];

 var matGround = new THREE.MeshStandardMaterial({color:0x5b6678, metalness:0.1, roughness:0.9, transparent:true, opacity:1});
 var matFabShell = new THREE.MeshPhysicalMaterial({color:0xBFD2DE, metalness:0.1, roughness:0.3, transparent:true, opacity:0.35, side:THREE.DoubleSide, depthWrite:false});
 var matFence = new THREE.MeshStandardMaterial({color:0x8a97a6, metalness:0.5, roughness:0.5, transparent:true, opacity:1});
 var matWafer = new THREE.MeshStandardMaterial({color:0x9C6B30, metalness:0.3, roughness:0.6, transparent:true, opacity:1});
 var matGlass = new THREE.MeshStandardMaterial({color:0xC99A2E, metalness:0.2, roughness:0.4, transparent:true, opacity:1});
 var matCell = new THREE.MeshStandardMaterial({color:0x2E86AB, metalness:0.5, roughness:0.25, emissive:0x0a2a3a, emissiveIntensity:0.4, transparent:true, opacity:1});
 var matPanel = new THREE.MeshStandardMaterial({color:0x14222e, metalness:0.6, roughness:0.2, emissive:0x1E9E76, emissiveIntensity:0.15, transparent:true, opacity:1});
 var matFrame = new THREE.MeshStandardMaterial({color:0xcfd6dd, metalness:0.7, roughness:0.3, transparent:true, opacity:1});
 var matRack = new THREE.MeshStandardMaterial({color:0x64748B, metalness:0.6, roughness:0.4, transparent:true, opacity:1});
 var matInverter = new THREE.MeshStandardMaterial({color:0x7A5CC7, metalness:0.4, roughness:0.35, transparent:true, opacity:1});
 var matGrid = new THREE.MeshStandardMaterial({color:0x3D5A80, metalness:0.5, roughness:0.4, transparent:true, opacity:1});

 var ground = new THREE.Mesh(new THREE.BoxGeometry(11,0.06,8), matGround);
 ground.position.set(0,-0.03,0); siteGroup.add(ground);
 for (var fi=0; fi<10; fi++){
 var post = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.4,6), matFence);
 post.position.set(-5+fi*1.1, 0.2, -4); siteGroup.add(post);
 }

 // Fab building: a simple shell with an upstream wafer/cell "stack" and a
 // module-output conveyor, so the Cells & Wafers / Modules layers both have
 // something distinct to fade in independently.
 var fabShell = new THREE.Mesh(new THREE.BoxGeometry(3,1.4,2.6), matFabShell);
 fabShell.position.set(-3.6,0.7,1.6); siteGroup.add(fabShell);

 for (var wi=0; wi<6; wi++){
 var wafer = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.015,16), matWafer);
 wafer.rotation.x = Math.PI/2; wafer.position.set(-4.5, 0.1+wi*0.05, 2.4); cellGroup.add(wafer);
 }
 for (var ci=0; ci<8; ci++){
 var cell = new THREE.Mesh(new THREE.BoxGeometry(0.26,0.26,0.01), matCell);
 cell.position.set(-3.9+((ci%4)*0.3), 0.3+Math.floor(ci/4)*0.3, 1.9); cellGroup.add(cell);
 }

 // Deployed panel array: rows of tilted modules on racking - the "Modules &
 // Racking" layer, plus the frame/rack meshes also carry the BOS zones.
 var rows = 4, perRow = 6;
 var panelGeo = new THREE.BoxGeometry(0.9,0.02,0.55);
 var frameGeo = new THREE.BoxGeometry(0.94,0.03,0.59);
 var panelInstances = new THREE.InstancedMesh(panelGeo, matPanel, rows*perRow);
 var frameInstances = new THREE.InstancedMesh(frameGeo, matFrame, rows*perRow);
 var dummy = new THREE.Object3D(); var idx = 0;
 for (var row=0; row<rows; row++){
 for (var c=0; c<perRow; c++){
 var px = -1.6 + c*0.62, pz = -2.2 + row*1.5;
 dummy.position.set(px, 0.5, pz); dummy.rotation.set(-0.35,0,0); dummy.updateMatrix();
 panelInstances.setMatrixAt(idx, dummy.matrix);
 frameInstances.setMatrixAt(idx, dummy.matrix);
 idx++;
 var rack = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.06), matRack);
 rack.position.set(px, 0.22, pz+0.2); moduleGroup.add(rack);
 }
 }
 panelInstances.instanceMatrix.needsUpdate = true; frameInstances.instanceMatrix.needsUpdate = true;
 moduleGroup.add(panelInstances); moduleGroup.add(frameInstances);
 var mountRail = new THREE.Mesh(new THREE.BoxGeometry(5.0,0.04,0.08), matRack);
 mountRail.position.set(0.5,0.15,-2.6); moduleGroup.add(mountRail);

 // Power yard: inverter boxes + a small grid/substation block.
 for (var ii=0; ii<2; ii++){
 var inv = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.4), matInverter);
 inv.position.set(3.6+ii*0.7, 0.25, -2.0); powerGroup.add(inv);
 }
 var substation = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,0.8), matGrid);
 substation.position.set(4.6,0.3,-0.4); powerGroup.add(substation);
 var gridPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.3,8), matGrid);
 gridPole.position.set(4.6,0.95,-0.4); powerGroup.add(gridPole);

 var SHELL_MAX_OPACITY = this.shellMaxOpacity, EXO_BASE_OPACITY = this.exoBaseOpacity;
 function clamp01(x){ return Math.max(0, Math.min(1,x)); }
 function triangle(v, center){ return clamp01(1 - Math.abs(v-center)); }
 function setOp(mat, v){ mat.opacity = v; mat.visible = v > 0.01; }

 return {
 applyLevel: function(v){
 var shellOp = clamp01(1-v) * SHELL_MAX_OPACITY;
 var siteOp = (v<=1) ? (EXO_BASE_OPACITY + (1-EXO_BASE_OPACITY)*v) : triangle(v,1);
 var cellOp = triangle(v,1);
 var moduleOp = triangle(v,2);
 var powerOp = clamp01(v-2);
 setOp(matFabShell, shellOp);
 [matGround,matFence].forEach(function(m){ setOp(m, Math.max(siteOp, 0.4)); });
 [matWafer,matCell].forEach(function(m){ setOp(m, cellOp); });
 [matPanel,matFrame,matRack].forEach(function(m){ setOp(m, moduleOp); });
 [matInverter,matGrid].forEach(function(m){ setOp(m, powerOp); });
 }
 };
 }
 };

 PRODUCTS._comingSoon = [
 {icon:"PH", name:"Smartphone", tagline:"Display, SoC, camera module & battery supply chain"},
 {icon:"LT", name:"Laptop", tagline:"Panel, battery, chipset & chassis supply chain"},
 {icon:"BA", name:"Battery storage (PLI-ACC)", tagline:"Cell gigafactories benefiting from the Advanced Chemistry Cell PLI scheme", category:"policy"},
 {icon:"H2", name:"Green Hydrogen Mission", tagline:"Electrolyser makers and green ammonia/steel offtakers benefiting from the National Green Hydrogen Mission", category:"policy"},
 {icon:"CM", name:"Critical Minerals Mission", tagline:"Lithium, cobalt and rare-earth processors benefiting from the National Critical Mineral Mission", category:"policy"},
 {icon:"EL", name:"Electronics PLI", tagline:"Laptop, smartphone and IT-hardware assemblers benefiting from the extended IT Hardware PLI 2.0", category:"policy"}
 ];

export { PRODUCTS, NEWS, ASOF, SRC, NEWS_ASOF };
