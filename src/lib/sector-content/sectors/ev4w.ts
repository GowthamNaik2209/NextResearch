// ev4w: zones, suppliers, camera views and the 3D build hook for this sector, moved verbatim
// out of products.ts so the browser explorer downloads only the sector it shows (see
// ./load.ts). Type-checked by inference only (SectorDef in ../core.ts is the shape it follows);
// npm run validate:content guards the zone/company graph.
import { buildEv4w } from "../models/ev4w";
import { ASOF, co } from "./shared";

// The battery pack/module/cell objects buildEv4w hands the deep dive.
type DeepRefs = ReturnType<typeof buildEv4w>["deep"];

 const ev4w = {
 id: "ev4w", icon: "EV", name: "Electric 4-Wheeler",
 tagline: "India EV passenger car supply chain",
 headerTitle: "EV ANATOMY",
 headerSub: "Explore the technology stack inside an electric vehicle - India supply-chain edition",
 // --- Industry-level narrative (data-model upgrade, matching datacenter's pattern) ---
 whyNow: [
  "EV car sales are scaling fast as battery costs fall and model choice widens.",
  "New Indian cell factories are adding capacity.",
  "Spend is flowing through the whole component chain ahead of mass affordability.",
 ],
 thesisSummary: [
  "The race is to make in India what is mostly imported today: cells, magnets and power electronics.",
  "Established auto-component makers are retooling machining, wiring and thermal lines for EVs.",
 ],
 featuredSignals: ["New EV model launches and price points", "Domestic battery/cell gigafactory capacity announcements (PLI-ACC)", "Public charging network buildout and utilisation", "Rare-earth magnet import-substitution policy moves", "Monthly EV penetration (% of total PV sales)"],
 dataStatus: "demo",
 integratorZoneId: "oem",
 layerNames: ["Shell","Exoskeleton","Technology","Powertrain"],
 shellMaxOpacity: 1, exoBaseOpacity: 0.55,
 defaultView: "exterior",
 views: [
 {id:"exterior", label:"Exterior", pos:[4.6,2.4,5.2], target:[0,0.55,0]},
 {id:"side", label:"Side", pos:[0.1,1.1,6.2], target:[0,0.6,0]},
 {id:"front", label:"Front", pos:[6.0,1.3,0.05], target:[0.5,0.55,0]},
 {id:"rear", label:"Rear", pos:[-6.0,1.3,0.05], target:[-0.5,0.55,0]},
 {id:"top", label:"Top", pos:[0.05,7.5,0.05], target:[0,0.3,0]},
 {id:"under", label:"Under", pos:[0.05,-1.4,3.6], target:[0,0.1,0]},
 {id:"interior", label:"Interior", layer:0, pos:[-0.6,1.18,0.1], target:[0.9,0.82,0.2]}
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

 {id:"battery", color:"#2E86AB", label:"Battery pack & cells", pos:[-0.1,0.18,0.55], side:"left", layer:3, desc:"The cell chemistry and pack that store the car's energy - the flat 'skateboard' under the floor.", deepDive:true,
 domainId:"battery_energy", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The flat 'skateboard' pack under the floor that stores the vehicle's energy via lithium-ion cells and the modules/BMS wiring that bind them together.",
 whyItMatters:"Battery cost and chemistry are the single biggest lever on an EV's price and range, and the layer India is most dependent on imported cell technology for.",
 valuePoolDescription:"Cell chemistry and pack engineering carry the deepest margins and IP moat in the car, while legacy lead-acid makers entering Li-ion capture a smaller, more commoditised slice.",
 bottlenecks:["Domestic Li-ion cell manufacturing capacity is still nascent and import-dependent", "Cell chemistry and cathode material supply chains run largely through China", "Scaling gigafactory-grade quality control from pilot lines"],
 keyDrivers:["EV volume growth and rising battery pack sizes", "PLI incentives for domestic cell manufacturing (ACC scheme)", "Falling cell costs per kWh", "Shift from lead-acid incumbents into Li-ion"],
 keyRisks:["Import dependence on Chinese cells and cathode materials", "New entrants still pre-scale and unproven at volume", "Chemistry shifts (LFP vs NMC vs sodium-ion) could strand early capacity bets"],
 investorMetrics:["Gigafactory capacity ramp vs. announced targets", "Cost per kWh trend", "Revenue mix shift from legacy lead-acid to Li-ion"],
 relatedComponents:["bms","thermal","charging"],
 suppliers:[{key:"exide", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"amararaja", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"log9", exposureType:"direct_supplier", exposureStrength:"low"}]},

 {id:"motor", color:"#D96C2B", label:"Electric motor & e-axle", pos:[-1.45,0.34,0.5], side:"left", layer:3, desc:"Converts stored electricity into torque at the wheels; increasingly an integrated e-axle unit.",
 domainId:"powertrain_drive", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Converts stored electrical energy into mechanical torque at the wheels, increasingly packaged as a single integrated e-axle unit with the motor, gearbox and inverter together.",
 whyItMatters:"The motor and e-axle determine the car's performance and efficiency and are a key battleground for vertical integration among component makers.",
 valuePoolDescription:"e-Axle integrators capture higher value than standalone motor or gear suppliers by bundling motor, gearbox and power electronics into a single sourced unit.",
 bottlenecks:["Rare-earth magnet supply feeding directly into motor production", "Precision machining capacity for e-axle gear sets", "OEM qualification cycles slowing new supplier entry"],
 keyDrivers:["EV volume growth", "Shift toward integrated e-axle sourcing over discrete components", "Performance/efficiency competition among OEMs", "Localisation push to cut import content"],
 keyRisks:["Magnet and rare-earth input dependence flows through to this layer", "Customer concentration - e-axle wins tied to a handful of OEM platforms", "Capital-intensive tooling with long payback if volumes disappoint"],
 investorMetrics:["e-Axle order wins and platform awards", "Content-per-vehicle growth as integration deepens", "Capacity utilisation at new EV-dedicated lines"],
 relatedComponents:["power_elec","magnets","chassis"],
 suppliers:[{key:"bharatforge", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"sonablw", exposureType:"direct_supplier", exposureStrength:"high"}]},

 {id:"power_elec", color:"#7A5CC7", label:"Power electronics", pos:[-1.05,0.62,0.5], side:"left", layer:3, desc:"Inverter, onboard charger and DC-DC converter that manage current between battery and motor.",
 domainId:"powertrain_drive", displayOrder:3, dataStatus:"demo",
 roleInSystem:"The inverter, onboard charger and DC-DC converter that manage and convert current flowing between the battery and the motor.",
 whyItMatters:"Power electronics efficiency directly affects range and charging speed, and the layer is shifting fast toward silicon-carbide (SiC) semiconductors.",
 valuePoolDescription:"Controller and inverter makers earn higher per-unit value as power-electronics content rises with faster charging and higher-voltage architectures.",
 bottlenecks:["SiC/GaN power-semiconductor supply, almost entirely imported", "Thermal design constraints as power density rises", "Software/controls qualification taking longer than hardware"],
 keyDrivers:["Shift to 800V architectures needing new power electronics", "Faster-charging standards raising onboard-charger specs", "Rising EV penetration overall"],
 keyRisks:["Import dependence on power semiconductors", "Fragmented supplier base competing on price for commoditised controller hardware", "Technology transitions (SiC vs IGBT) could reset the supplier pecking order"],
 investorMetrics:["Content value per vehicle", "Design wins on 800V/SiC platforms", "Margin trend as mix shifts toward higher-value power electronics"],
 relatedComponents:["motor","battery","harness"],
 suppliers:[{key:"unominda", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"vecmocon", exposureType:"direct_supplier", exposureStrength:"low"}, {key:"mindaCorp", exposureType:"direct_supplier", exposureStrength:"low"}]},

 {id:"bms", color:"#1E9E76", label:"BMS & embedded software", pos:[0.3,0.34,0.55], side:"right", layer:2, desc:"Battery management logic and the embedded software stitching powertrain, safety and cockpit systems together.",
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

 {id:"harness", color:"#C6403D", label:"Wiring harness & connectors", pos:[0.55,0.78,0.35], side:"right", layer:2, desc:"The nervous system of the car - low- and high-voltage cabling connecting every module, routed as real 3D looms.",
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

 {id:"thermal", color:"#4C6EF5", label:"Thermal management", pos:[1.75,0.55,0.5], side:"right", layer:2, desc:"Keeps the battery and cabin in their working temperature range - critical for range and battery life.",
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

 {id:"chassis", color:"#64748B", label:"Forgings, castings & precision parts", pos:[1.45,0.2,0.75], side:"top", layer:1, desc:"Machined and forged structural and driveline components - hubs, shafts, housings, subframes.",
 domainId:"structure_thermal", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Machined and forged structural and driveline components - hubs, shafts, housings and subframes - that carry the vehicle's structural and dynamic loads.",
 whyItMatters:"These precision parts are structural - failure tolerances are tight, and EV-specific geometries (e-axle housings, battery subframes) are a growing share of the work.",
 valuePoolDescription:"Forging and machining specialists earn capital-intensive, scale-driven margins, with EV-specific component lines commanding a premium over legacy ICE driveline parts as volumes ramp.",
 bottlenecks:["Capital-intensive tooling and machining capacity additions", "Steel/aluminium input-cost volatility", "Qualification lead times for new EV-specific part geometries"],
 keyDrivers:["EV volume growth", "e-Axle and EV-specific component localisation", "Export demand from global OEMs sourcing from India"],
 keyRisks:["EV-specific revenue is often a minority, undisclosed slice of a much larger ICE driveline business", "Cyclical demand tied to both EV and broader auto production", "Input-cost pass-through risk on steel and aluminium"],
 investorMetrics:["EV-specific order book growth, where disclosed", "Capacity utilisation at new EV-dedicated lines", "Export mix vs. domestic OEM mix"],
 relatedComponents:["motor","thermal"],
 suppliers:[{key:"sundram", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"craftsman", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"ramkrishna", exposureType:"emerging_entrant", exposureStrength:"low"}, {key:"tataautocomp", exposureType:"direct_supplier", exposureStrength:"medium"}, {key:"endurance", exposureType:"direct_supplier", exposureStrength:"low"}]},

 {id:"cluster", color:"#B5179E", label:"Instrument cluster & interior electronics", pos:[1.05,1.00,0.35], side:"top", layer:2, desc:"Digital driver display and interior sensing electronics.",
 domainId:"vehicle_electronics", displayOrder:8, dataStatus:"demo",
 roleInSystem:"The digital driver display and interior sensing electronics that present vehicle, range and safety information to the driver.",
 whyItMatters:"EVs lean harder on digital clusters (range, charge state, regen) than ICE cars, making this a growing electronics-content layer rather than a mechanical gauge.",
 valuePoolDescription:"Cluster and sensor makers earn electronics-style margins that scale with digital content per vehicle, higher than the mechanical gauges they replace.",
 bottlenecks:["Display and semiconductor component sourcing", "Software integration with BMS/powertrain data feeds", "OEM design-cycle lead times for new cluster generations"],
 keyDrivers:["Shift from analog gauges to fully digital clusters", "Rising sensor content for safety and EV-specific readouts", "Cockpit digitisation trend across the industry"],
 keyRisks:["Customer concentration among a small number of OEM platforms", "Competition from larger tier-1 cockpit-electronics suppliers", "Component sourcing dependence on imported displays/semiconductors"],
 investorMetrics:["Digital cluster content value per vehicle", "New platform design wins", "Margin trend as mix shifts toward higher electronics content"],
 relatedComponents:["harness","bms"],
 suppliers:[{key:"pricol", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"charging", color:"#C99A2E", label:"Charging system", pos:[-2.05,0.55,0.9], side:"bottom", layer:3, desc:"The car's charge port and the AC/DC chargers it plugs into.",
 domainId:"battery_energy", displayOrder:9, dataStatus:"demo",
 roleInSystem:"The car's charge port and the AC/DC charging equipment it plugs into - the interface between the vehicle and the external charging network.",
 whyItMatters:"Charging infrastructure availability and speed are a top consumer concern and a direct constraint on EV adoption rates.",
 valuePoolDescription:"Charger makers and network operators earn equipment sales plus, increasingly, recurring network/service revenue as public charging scales.",
 bottlenecks:["Public charging network buildout lagging vehicle sales", "Grid capacity constraints at high-power charging sites", "Standards fragmentation across connector types and charging protocols"],
 keyDrivers:["EV parc growth driving charger demand", "Government push for public charging infrastructure", "Fast-charging adoption raising average charger power ratings"],
 keyRisks:["Small-cap charger makers are often loss-making or early-stage with thin trading history", "Network operators compete against each other and against OEM home-charging bundles", "Utilisation risk on public charging assets built ahead of demand"],
 investorMetrics:["Charger unit shipments and installed base growth", "Network utilisation rates", "Path to profitability for early-stage charger makers"],
 relatedComponents:["battery","power_elec"],
 suppliers:[{key:"exicom", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"servotech", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"tataPowerEV", exposureType:"operator", exposureStrength:"low"}]},

 {id:"magnets", color:"#9C6B30", label:"Rare-earth magnets & materials", pos:[-1.45,0.34,-0.5], side:"bottom", layer:3, desc:"Permanent magnets inside the traction motor - a strategic chokepoint given import dependence on China.",
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

 {id:"oem", color:"#3D5A80", label:"Vehicle OEMs & Assembly", pos:[0.05,1.45,0], side:"top", layer:0, desc:"The vehicle manufacturers that design, assemble and badge the finished EV - from mass-market passenger cars to electric buses.",
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
 motherson: {name:"Samvardhana Motherson International", listed:true, role:"Wiring harnesses, modules, mirrors, cockpits", dataStatus:"demo", sourceDate:ASOF, strengths:["Global scale and a highly diversified customer base across modules, mirrors and cockpits cushion any single product line"], risks:["Wiring harnesses are one of many product lines across a highly diversified global auto-components conglomerate"], f:co("MOTHERSON")},
 unominda: {name:"UNO Minda", listed:true, role:"EV powertrain electronics, controllers, switches", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified auto-electronics portfolio gives multiple cross-sell points for EV powertrain electronics across OEM customers"], risks:["EV powertrain electronics is one of several auto-electronics segments across a diversified UNO Minda portfolio"], f:co("UNOMINDA")},
 sonablw: {name:"Sona BLW Precision Forgings", listed:true, role:"BEV traction motors, differential gears, e-axle systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established early BEV motor and e-axle wins with several global EV OEM platforms"], risks:["Customer concentration - early BEV motor wins are concentrated among a handful of global EV OEM platforms"], f:co("SONACOMS")},
 bharatforge: {name:"Bharat Forge", listed:true, role:"e-Axles and EV powertrain via Kalyani Powertrain", dataStatus:"demo", sourceDate:ASOF, strengths:["Backed by Bharat Forge's large forgings and engineering balance sheet to fund the Kalyani Powertrain EV build-out"], risks:["EV powertrain exposure runs through a subsidiary (Kalyani Powertrain) - a small slice of a much larger diversified forgings business"], f:co("BHARATFORG")},
 endurance: {name:"Endurance Technologies", listed:true, role:"Precision castings, suspension, EV-ready component lines", dataStatus:"demo", sourceDate:ASOF, strengths:["Established precision-castings and suspension manufacturing base to build EV-ready component lines on"], risks:["EV-ready component lines are still a developing slice of a much larger precision-castings and suspension business for ICE vehicles"], f:co("ENDURANCE")},
 exide: {name:"Exide Industries", listed:true, role:"Li-ion cells and packs via Exide Energy Solutions", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-established battery brand and distribution network to lean on while scaling the Exide Energy Solutions Li-ion business"], risks:["Li-ion EV cell business sits in a separate subsidiary, still small relative to the core lead-acid battery business", "New entrant into cell manufacturing versus established Asian cell makers"], f:co("EXIDEIND")},
 amararaja: {name:"Amara Raja Energy & Mobility", listed:true, role:"Li-ion cells via Amara Raja Advanced Cell Technologies", dataStatus:"demo", sourceDate:ASOF, strengths:["Established lead-acid battery manufacturing and distribution base to lean on while scaling the Advanced Cell Technologies Li-ion business"], risks:["Li-ion EV cell business runs through a separate subsidiary (Amara Raja ACT), still small relative to the core lead-acid business"], f:co("ARE&M")},
 kpit: {name:"KPIT Technologies", listed:true, role:"Embedded software for EV powertrain and BMS integration", dataStatus:"demo", sourceDate:ASOF, strengths:["Specialist embedded-software engineering expertise serving multiple global OEM powertrain and BMS programs"], risks:["Revenue tied to global auto-engineering outsourcing demand, not just India EV volumes", "Customer concentration among a handful of large OEM engineering contracts"], f:co("KPITTECH")},
 tataelxsi: {name:"Tata Elxsi", listed:true, role:"EV software design, ADAS and cockpit electronics", dataStatus:"demo", sourceDate:ASOF, strengths:["Established design and engineering expertise spanning EV software, ADAS and cockpit electronics for global OEMs"], risks:["EV software design is one of several segments (ADAS, cockpit, media) - not separately disclosed", "Revenue tied to global OEM engineering-spend cycles"], f:co("TATAELXSI")},
 rico: {name:"Rico Auto Industries", listed:false, role:"Precision machined components and wiring assemblies", dataStatus:"demo", sourceDate:ASOF, strengths:["Long-standing supplier relationships with Maruti Suzuki and Honda, now diversifying machining lines toward EV components"], risks:["Customer concentration in a few OEMs (Maruti Suzuki, Honda)", "Historically an ICE-focused supplier still diversifying machining lines toward EV components"], notes:["NSE-listed (RICOAUTO); figures not yet loaded here","Gurugram-based; long-time Maruti Suzuki and Honda supplier","Diversifying machining lines toward EV transmission and motor housings"]},
 subros: {name:"Subros", listed:true, role:"HVAC and battery thermal management systems", dataStatus:"demo", sourceDate:ASOF, strengths:["Established automotive HVAC manufacturing base to extend into battery thermal management as EV volumes grow"], risks:["Battery thermal management is a growing but still-emerging segment within a broader automotive HVAC/AC business"], f:co("SUBROS")},
 pricol: {name:"Pricol", listed:true, role:"Instrument clusters and sensors", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified customer base spanning both ICE and EV vehicles gives steadier revenue as EV volumes scale"], risks:["Instrument clusters serve both ICE and EV vehicles - not an EV-exclusive revenue stream"], f:co("PRICOLLTD")},
 sundram: {name:"Sundram Fasteners", listed:true, role:"Precision fasteners and machined EV driveline components", dataStatus:"demo", sourceDate:ASOF, strengths:["Established fastener and machined-components manufacturing scale with a diversified customer base to support the EV driveline ramp"], risks:["EV driveline components are a growing but still minority slice of a much larger fastener and machined-components business"], f:co("SUNDRMFAST")},
 craftsman: {name:"Craftsman Automation", listed:true, role:"Aluminium die-casting and powertrain machining for EVs", dataStatus:"demo", sourceDate:ASOF, strengths:["Established die-casting and machining manufacturing scale from its legacy ICE business supports the EV powertrain ramp"], risks:["Die-casting and machining for EVs sits alongside a larger legacy ICE-component manufacturing base"], f:co("CRAFTSMAN")},
 ramkrishna: {name:"Ramkrishna Forgings", listed:true, role:"Forged components, expanding into EV and CV driveline parts", dataStatus:"demo", sourceDate:ASOF, strengths:["Established forgings manufacturing base provides a foothold for the expansion into EV and CV driveline parts"], risks:["Still in the early stages of expanding into EV/CV driveline parts from a core forgings business", "FY26 profit fell sharply on one-off items - treat FY26 figures with caution"], f:co("RKFORGE")},
 tataautocomp: {name:"Tata AutoComp Systems", listed:false, role:"High-voltage EV components: battery packs, e-axles, motors", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Sons backing and showcased battery pack, e-axle and motor component lines at IAA Transportation 2026"], risks:["Unlisted - no audited public financials; figures here are not available"], notes:["Privately held Tata group company (Tata Sons subsidiary)","Showcased EV and commercial-vehicle component lines at IAA Transportation 2026","No public market data - not listed"]},
 exicom: {name:"Exicom Tele-Systems", listed:true, role:"AC/DC EV chargers, 3.3kW-600kW", dataStatus:"demo", sourceDate:ASOF, strengths:["Broad AC/DC charger range spanning 3.3kW to 600kW covers both home and high-power public charging use cases"], risks:["Listed Mar 2024 - short financial track record", "Currently loss-making, so standard valuation multiples are not meaningful yet"], f:co("EXICOM")},
 servotech: {name:"Servotech Power Systems", listed:true, role:"AC/DC EV chargers and lithium battery packs", dataStatus:"demo", sourceDate:ASOF, strengths:["Diversified product line spanning AC/DC chargers and lithium battery packs gives more than one way to capture EV infrastructure demand"], risks:["Small-cap with thin trading history - limited multi-year financial disclosure", "Competes in a highly fragmented, price-competitive EV charger segment"], f:co("SERVOTECH")},
 vecmocon: {name:"Vecmocon Technologies", listed:false, role:"Battery management systems and motor controllers", dataStatus:"demo", sourceDate:ASOF, strengths:["Established BMS and motor-controller base in 2- and 3-wheeler EVs, backed by VC investors, as it expands toward four-wheelers"], risks:["Unlisted - no audited public financials; figures here are not available", "Core customer base today is 2- and 3-wheeler EVs - four-wheeler exposure is still expanding"], notes:["Privately held, Delhi-NCR based; backed by Aavishkaar Capital and other VCs","Core base is 2- and 3-wheeler EVs, expanding controller work toward light EVs","No public market data - not listed"]},
 log9: {name:"Log9 Materials", listed:false, role:"Li-ion cell chemistry (fast-charge cells) and pack engineering", dataStatus:"demo", sourceDate:ASOF, strengths:["Known RapidX fast-charging cell chemistry and a strategic stake from Amara Raja give it a base to expand into four-wheeler applications"], risks:["Unlisted - no audited public financials; figures here are not available", "Primarily focused on 2W/3W and energy storage today - four-wheeler car exposure is still emerging"], notes:["Privately held, Bengaluru-based; Amara Raja holds a strategic stake","Known for RapidX fast-charging cell chemistry, mainly 2W/3W and energy storage today","No public market data - not listed"]},
 midwest: {name:"Midwest Advanced Materials", listed:false, role:"Rare-earth permanent magnets for traction motors", dataStatus:"demo", sourceDate:ASOF, strengths:["Announced a ~₹1,000 Cr domestic magnet capacity plan directly targeting India's reliance on Chinese rare-earth magnet imports"], risks:["Unlisted and pre-scale - announced domestic magnet capacity is not yet operational at the scale needed to meaningfully displace Chinese imports"], notes:["Privately held, Hyderabad-based; announced a ~₹1,000 Cr plan for domestic magnet capacity (2025)","Targets India's near-total reliance on Chinese rare-earth magnets for EV motors","No public market data - not listed"]},
 tmpv: {name:"Tata Motors Passenger Vehicles", listed:true, role:"PV/EV OEM - Nexon EV, Punch EV, Tiago EV, Curvv EV (plus JLR under the same listed entity)", dataStatus:"demo", sourceDate:ASOF, strengths:["Broadest EV model lineup among Indian OEMs (Nexon, Punch, Tiago, Curvv EV) alongside JLR's global scale under the same entity"], risks:["EV models sit within a broader PV and JLR business under the same listed entity - EV-specific financials are not separately disclosed", "FY26 PAT includes a large exceptional/demerger-related gain, not representative of run-rate"], f:co("TMPV")},
 mm: {name:"Mahindra & Mahindra", listed:true, role:"SUV/PV OEM with dedicated EV lineup (BE 6, XEV 9e) plus EV tractors and 3-wheelers", dataStatus:"demo", sourceDate:ASOF, strengths:["EV exposure spans passenger SUVs (BE 6, XEV 9e), tractors and 3-wheelers, backed by a large diversified group balance sheet"], risks:["Dedicated EV lineup (BE 6, XEV 9e) is still a minority of a much larger diversified SUV/tractor/3-wheeler business"], f:co("M&M")},
 jbmAuto: {name:"JBM Auto", listed:true, role:"Electric buses and EV commercial vehicles - ~30-35% share of India's e-bus segment", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading ~30-35% share of India's electric bus segment"], risks:["Customer concentration among state transport undertakings and large fleet tenders for electric buses"], f:co("JBMA")},
 olectra: {name:"Olectra Greentech", listed:true, role:"Electric bus maker (MEIL group); its first e-buses were built with BYD technology", dataStatus:"demo", sourceDate:ASOF, strengths:["One of the largest electric-bus suppliers to state transport undertakings, with a large order book"], risks:["Earnings depend on lumpy state bus tenders and on transport undertakings paying on time"], f:co("OLECTRA")},
 msumi: {name:"Motherson Sumi Wiring India", listed:true, role:"Wiring harnesses for EV and ICE vehicles - ~40% share of the Indian harness market", dataStatus:"demo", sourceDate:ASOF, strengths:["Market-leading ~40% share of the Indian wiring harness market across both EV and ICE vehicles"], risks:["Revenue spans both EV and ICE harnesses - not purely an EV-only business even though harness-making itself is the core identity"], f:co("MSUMI")},
 mindaCorp: {name:"Minda Corporation", listed:true, role:"Auto electronics and components incl. EV-specific sensors, controllers and switches", dataStatus:"demo", sourceDate:ASOF, strengths:["Broad auto-electronics portfolio gives a wide base to cross-sell EV-specific sensors, controllers and switches"], risks:["EV-specific sensors/controllers are included within a much broader auto-electronics and components business, not separately disclosed"], f:co("MINDACORP")},
 tataPowerEV: {name:"Tata Power", listed:true, role:"EV charging infrastructure (EZ Charge network) alongside its renewable/conventional power generation business", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Power's large power-generation and distribution infrastructure and balance sheet back the EZ Charge network's buildout"], risks:["EV charging (EZ Charge) is a small, undisclosed slice of a much larger renewable and conventional power generation business"], f:co("TATAPOWER")}
 },
 deepDive: {
 zoneId: "battery", buttonLabel: "Pack -> Modules -> Cells", stageCount: 3,
 entryCamera: {pos:[-0.1,1.1,1.9], target:[-0.1,0.16,0]},
 breadcrumbTrail: function(stage: number){
 return ["Vehicle","Powertrain","Battery"].concat(stage===0?["Battery pack"]:stage===1?["Modules"]:["Cells"]);
 },
 applyStage: function(stage: number, refs: DeepRefs){
 if (stage===0){ refs.batteryPack.visible=true; refs.modulesGroup.visible=false; refs.cellInstances.visible=false; }
 else if (stage===1){ refs.batteryPack.visible=false; refs.modulesGroup.visible=true; refs.cellInstances.visible=false; refs.moduleMeshes.forEach(function(m){ m.userData.targetX = m.userData.baseX + (m.userData.baseX)*0.35; }); }
 else { refs.batteryPack.visible=false; refs.modulesGroup.visible=true; refs.cellInstances.visible=true; }
 },
 exit: function(refs: DeepRefs){
 refs.batteryPack.visible = true; refs.modulesGroup.visible = false; refs.cellInstances.visible = false;
 refs.moduleMeshes.forEach(function(m){ m.position.x = m.userData.baseX; });
 }
 },
 // Builds this product's own geometry into the generic groups the engine provides
 // (see ./models/ev4w.ts). ctx: { THREE, layerGroups:[g0,g1,g2,g3], staticGroup }
 // returns: { applyLevel(v), spreadMeshes:[...], deep:{...refs for deepDive...} }
 build: function(ctx: Parameters<typeof buildEv4w>[0]){ return buildEv4w(ctx, this); }
 };

export default ev4w;
