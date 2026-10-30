// solarmodules: zones, suppliers, camera views and the 3D build hook for this sector, moved verbatim
// out of products.ts so the browser explorer downloads only the sector it shows (see
// ./load.ts). Type-checked by inference only (SectorDef in ../core.ts is the shape it follows);
// npm run validate:content guards the zone/company graph.
import { buildSolarmodules } from "../models/solarmodules";
import { ASOF, co } from "./shared";

 // ======================================================================
 // POLICY FLOWS
 // Same shape as a PRODUCTS.* sector (zones/suppliers/build/views) but entered
 // from the landing page's "Policy" tab instead of "Sector" - the story is "this
 // government/regulatory move creates this winner set of stocks" rather than
 // "this industry has this supply chain". See sector-content/core.ts's
 // `category` field and research/ThemeCards.tsx for how the two tabs are filtered.
 // ======================================================================

 const solarmodules = {
 id: "solarmodules", icon: "SL", name: "Solar Module Manufacturing (ALMM)",
 tagline: "The ALMM policy stack: polysilicon to panel - India's domestic solar push",
 category: "policy",
 headerTitle: "SOLAR MODULE ANATOMY",
 headerSub: "The ALMM policy stack - who makes India's solar cells, modules and the balance of system around them",
 whyNow: [
  "ALMM lets government-linked (and more private) solar projects buy only from approved Indian makers.",
  "That turns a buying rule into years of orders for a few Indian cell and module makers.",
  "Without it, cheap Chinese panels would make that capacity uneconomic.",
 ],
 thesisSummary: [
  "ALMM doesn't create solar demand (renewable targets do); it decides who supplies it.",
  "Module makers benefit directly; cell makers too, now that ALMM List-II covers cells (Jun 2026).",
  "Polysilicon, wafers, glass, EVA, mounts and inverters still lean on imports.",
 ],
 featuredSignals: ["ALMM list additions/removals (MNRE)", "Domestic cell capacity added under ALMM List-II (mandated since Jun 2026)", "Announced/commissioned GW of cell and module capacity vs. targets", "Imported vs. domestic module pricing spread", "PM Surya Ghar and utility-scale tender volumes specifying ALMM-listed supply"],
 dataStatus: "demo",
 integratorZoneId: "modules",
 layerNames: ["Site","Cells & Wafers","Modules & Racking","Power & Grid"],
 shellMaxOpacity: 0.5, exoBaseOpacity: 0.55,
 defaultView: "overview",
 views: [
 {id:"overview", label:"Overview", pos:[8.5,5.5,8.5], target:[0,0.4,0], narration:"Welcome to the solar module manufacturing stack - the policy is the Approved List of Models and Manufacturers, or ALMM, and this is the physical stack of companies it runs through: raw materials, cells, modules, and the balance of system that turns a panel into a working power plant."},
 {id:"fab", label:"Fab", layer:1, pos:[-6.8,2.4,6.2], target:[-3.6,0.5,1.2], narration:"The manufacturing building - this is where polysilicon wafers become solar cells, and cells become finished modules. ALMM's core rule applies right here: only modules made in a facility like this one, on MNRE's approved list, can supply government-linked solar tenders."},
 {id:"array", label:"Panel Array", layer:2, pos:[2.5,3.2,6.5], target:[1.2,0.3,0], narration:"Rows of deployed modules on their mounting structure - the finished product of the module layer, and the visible end of the ALMM-covered supply chain."},
 {id:"power", label:"Power Yard", layer:3, pos:[7.6,3.2,-3.6], target:[4.6,0.5,-0.2], narration:"Inverters and the grid-interconnect yard - this converts the DC power the panels generate into AC power the grid can use, and it's the layer ALMM does NOT cover, so it's still mostly import-dependent."},
 {id:"top", label:"Top", pos:[0.1,11,0.1], target:[0,0.3,0], narration:"From above - the fab building, the deployed array, and the power yard that connects it all to the grid."}
 ],
 domains: [
 {id:"upstream_materials", title:"Upstream Materials", shortTitle:"Materials", description:"Polysilicon, wafers, glass, EVA and backsheet - the inputs ALMM does not yet mandate be domestic, and where China still dominates.", color:"#9C6B30", relatedDomains:["cell_module_mfg"]},
 {id:"cell_module_mfg", title:"Cell & Module Manufacturing", shortTitle:"Cells & Modules", description:"Where ALMM's procurement rule actually bites - cells (mandated since Jun 2026) and modules (mandated earlier) made at MNRE-approved domestic facilities.", color:"#2E86AB", relatedDomains:["upstream_materials","balance_of_system"]},
 {id:"balance_of_system", title:"Balance of System", shortTitle:"BOS", description:"Mounting structures and inverters that turn a stack of modules into a working solar plant - not covered by ALMM, and the inverter layer in particular is still import-heavy.", color:"#D96C2B", relatedDomains:["cell_module_mfg","deployment"]},
 {id:"deployment", title:"EPC & Deployment", shortTitle:"Deployment", description:"The developers and EPC contractors who build and own the plants ALMM-listed modules go into.", color:"#3D5A80", relatedDomains:["balance_of_system"]}
 ],
 zones: [
 {id:"polywafer", color:"#9C6B30", label:"Polysilicon, Ingots & Wafers", pos:[-5.05,0.35,3], side:"left", layer:1, desc:"The upstream feedstock chain - polysilicon refined into ingots, then sliced into wafers. India has almost no domestic capacity here today.",
 domainId:"upstream_materials", displayOrder:1, dataStatus:"demo",
 roleInSystem:"The furthest-upstream layer - metallurgical-grade silicon refined into solar-grade polysilicon, then grown into ingots and sliced into wafers that feed cell manufacturing.",
 whyItMatters:"This is the single biggest domestic capacity gap in the entire Indian solar stack - without it, every ALMM-listed cell and module maker is still importing its core raw material, mostly from China.",
 valuePoolDescription:"Globally, polysilicon and wafer production is capital-intensive and currently oversupplied out of China at prices Indian greenfield capacity struggles to match without policy support - so the value pool sits almost entirely offshore today.",
 bottlenecks:["Zero operating domestic polysilicon capacity as of Oct 2026 - announced projects are pre-commissioning", "Wafer-slicing is a distinct, equipment-heavy process not yet localised either", "Capital intensity and multi-year lead times versus faster-moving downstream policy timelines"],
 keyDrivers:["Government push to extend ALMM-style rules upstream over time", "PLI and customs-duty support for backward integration", "Large conglomerates announcing integrated polysilicon-to-module complexes"],
 keyRisks:["Entirely import-dependent today - a genuine, unresolved structural gap", "Announced domestic capacity is pre-revenue and multi-year out", "Global polysilicon oversupply/price crashes could strand new domestic capacity economically"],
 investorMetrics:["Polysilicon/wafer capacity commissioning milestones vs. announced targets", "Import-substitution progress (domestic vs. imported wafer cost)", "Policy signals on extending ALMM-style mandates upstream"],
 relatedComponents:["cells","glass_eva"],
 suppliers:[{key:"relNewEnergy", exposureType:"emerging_entrant", exposureStrength:"medium"}, {key:"adanient", exposureType:"emerging_entrant", exposureStrength:"low"}]},

 {id:"glass_eva", color:"#C99A2E", label:"Solar Glass, EVA & Backsheet", pos:[-4.45,0.4,2], side:"left", layer:2, desc:"The encapsulation materials that protect cells inside a finished module - low-iron solar glass, EVA film and backsheet.",
 domainId:"upstream_materials", displayOrder:2, dataStatus:"demo",
 roleInSystem:"Encapsulates and protects the delicate solar cells inside a finished module - low-iron tempered glass on the front, EVA film bonding the layers, and a backsheet sealing the rear.",
 whyItMatters:"A module is only as durable as its encapsulation - glass and EVA/backsheet quality directly determine a panel's 25-year degradation and warranty performance.",
 valuePoolDescription:"Solar glass is a capital-intensive, scale-driven business prone to Chinese oversupply/dumping cycles that repeatedly squeeze domestic makers' margins; EVA/backsheet is more chemically specialised and still mostly import-dependent.",
 bottlenecks:["Domestic solar glass capacity is thin and has been repeatedly undercut by cheap Chinese imports", "EVA resin and backsheet films are largely imported inputs even for domestic converters", "Anti-dumping duty cycles create stop-start investment incentives"],
 keyDrivers:["Module manufacturing capacity growth pulling through glass/EVA demand", "Anti-dumping and safeguard duties on Chinese solar glass", "ALMM-driven module localisation indirectly supporting domestic input demand"],
 keyRisks:["Chinese oversupply/dumping has repeatedly pressured domestic solar glass economics", "Thin, cyclical margins typical of glass manufacturing", "EVA/backsheet conversion still leans on imported resin and films"],
 investorMetrics:["Capacity utilisation at domestic glass lines", "Anti-dumping duty renewal/removal decisions", "Import share of EVA/backsheet by value"],
 relatedComponents:["polywafer","modules"],
 suppliers:[{key:"borosilRenew", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"renewsys", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"cells", color:"#2E86AB", label:"Solar Cell Manufacturing", pos:[-4,0.45,-0.25], side:"left", layer:1, desc:"Converts silicon wafers into photovoltaic cells - the layer ALMM List-II has covered since Jun 2026.",
 domainId:"cell_module_mfg", displayOrder:3, dataStatus:"demo",
 roleInSystem:"Converts silicon wafers into photovoltaic cells through diffusion, texturing and metallisation - the electrical heart of a solar panel, assembled into modules in the next layer.",
 whyItMatters:"Cell manufacturing is where ALMM's domestic-sourcing mandate has applied alongside modules since Jun 2026 (List-II) - India still assembles far more module capacity than it has matching domestic cell capacity, so domestic cells are the tight link in the chain.",
 valuePoolDescription:"Cell manufacturing carries a meaningfully higher technology and capital-intensity moat than module assembly, so the small set of players with both cell and module capacity capture more of the value chain than module-only assemblers.",
 bottlenecks:["Domestic cell capacity is well behind domestic module assembly capacity - a persistent cells-to-modules capacity gap", "Technology transitions (PERC to TOPCon to HJT) risk stranding capacity built on an older cell architecture", "Equipment for cell lines is largely imported from China"],
 keyDrivers:["ALMM List-II cell mandate (in force since Jun 2026)", "PLI (Production Linked Incentive) support for integrated cell-to-module capacity", "Rising module demand outstripping existing domestic cell supply"],
 keyRisks:["Cell technology shifts (TOPCon/HJT) could strand capacity built on older architectures", "Cell-making equipment is itself mostly imported, so backward integration only partly reduces import dependence", "Execution risk on large, newly-announced capacity ramps"],
 investorMetrics:["Domestic cell capacity commissioned vs. announced GW targets", "Cell technology mix (PERC vs. TOPCon/HJT) of new capacity", "Cell self-sufficiency ratio versus module assembly capacity"],
 relatedComponents:["polywafer","modules"],
 suppliers:[{key:"premierEnergies", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"websol", exposureType:"direct_supplier", exposureStrength:"high"}, {key:"waaree", exposureType:"direct_supplier", exposureStrength:"medium"}]},

 {id:"modules", color:"#1E9E76", label:"Solar Module Assembly", pos:[-3.6,0.35,1.32], side:"top", layer:2, desc:"Where cells, glass, EVA and backsheet come together into a finished, frame-and-junction-box-ready solar panel - ALMM's core, already-mandated layer.",
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

 {id:"mounting", color:"#64748B", label:"Mounting, Trackers & BOS Cabling", pos:[1.68,0.22,1.37], side:"right", layer:2, desc:"The racking, fixed-tilt structures and trackers that hold modules at the right angle to the sun, and the balance-of-system (BOS) cabling that links them - mostly fragmented, local supply, not ALMM-covered.",
 domainId:"balance_of_system", displayOrder:5, dataStatus:"demo",
 roleInSystem:"The steel racking, fixed-tilt structures and (on larger utility sites) single-axis trackers that physically hold modules at the correct angle and, for trackers, follow the sun through the day.",
 whyItMatters:"Mounting design affects both installation cost and long-run energy yield (trackers can lift output 10-20% over fixed-tilt) - it's a smaller-ticket layer than modules but still a real EPC cost line.",
 valuePoolDescription:"Fixed-tilt structural steel is a largely commoditised, regionally fragmented fabrication business; trackers are a higher-value, more specialised sub-segment where fewer domestic players compete.",
 bottlenecks:["Highly fragmented - most fixed-tilt structure fabrication is local/unlisted, not a few scaled national players", "Steel input-cost volatility feeding directly into structure costs", "Tracker technology and controls are still often imported or licensed"],
 keyDrivers:["Utility-scale solar capacity additions overall", "Shift toward trackers on larger sites for yield improvement", "Domestic steel availability and pricing"],
 keyRisks:["Not ALMM-covered - no policy-driven domestic-sourcing advantage at this layer", "Fragmented, commoditised, low-margin fixed-tilt segment for most players", "Steel price pass-through risk"],
 investorMetrics:["Order book tied to utility-scale project pipeline", "Tracker vs. fixed-tilt mix", "Margin trend amid steel price swings"],
 relatedComponents:["modules","inverters"],
 suppliers:[{key:"aparInds", exposureType:"indirect_supplier", exposureStrength:"low"}]},

 {id:"inverters", color:"#7A5CC7", label:"Power Conditioning & Inverters", pos:[3.42,0.4,-2.1], side:"right", layer:3, desc:"String and central inverters that convert the DC power modules generate into grid-usable AC - not ALMM-covered, and still import-heavy.",
 domainId:"balance_of_system", displayOrder:6, dataStatus:"demo",
 roleInSystem:"Converts the DC electricity solar modules generate into AC power the grid can use - string inverters for rooftop/commercial sites, central inverters for utility-scale plants.",
 whyItMatters:"Unlike modules, inverters sit entirely outside ALMM's domestic-sourcing mandate - this is the layer of the solar stack India is most structurally import-dependent on, dominated by Chinese and other foreign suppliers.",
 valuePoolDescription:"Inverter technology and software carry a real engineering moat versus commoditised structural steel, but most of that value pool today sits with global players rather than Indian manufacturers.",
 bottlenecks:["No ALMM-style domestic-sourcing mandate exists for inverters, unlike cells and modules", "Power-electronics component sourcing (semiconductors, capacitors) is itself import-dependent", "Few scaled, India-listed pure-play solar inverter manufacturers"],
 keyDrivers:["Utility-scale and rooftop solar capacity growth overall", "Potential future policy extension of domestic-content rules to inverters", "Broader power-electronics PLI schemes that could indirectly support this layer"],
 keyRisks:["Structurally import-dependent layer with no policy tailwind comparable to ALMM's module mandate", "Exposure for listed Indian names is usually a small, blended slice of a much larger diversified power-electronics business", "Competition from scaled global inverter makers with deeper R&D budgets"],
 investorMetrics:["Domestic inverter capacity/revenue, where disclosed separately", "Any policy signal extending domestic-content rules to inverters", "Import share of inverters by value"],
 relatedComponents:["mounting","epc"],
 suppliers:[{key:"cgpowerSolar", exposureType:"indirect_supplier", exposureStrength:"low"}]},

 {id:"epc", color:"#3D5A80", label:"EPC & Project Developers", pos:[4.4,0.55,-2.55], side:"bottom", layer:0, desc:"The engineering-procurement-construction contractors and independent power producers who build and own the solar plants ALMM-listed modules go into.",
 domainId:"deployment", displayOrder:7, dataStatus:"demo",
 roleInSystem:"Designs, builds and in many cases owns/operates the finished solar plant - the commercial layer that actually purchases ALMM-listed modules at scale and turns them into contracted power.",
 whyItMatters:"EPC and developer order books are the real-world demand signal for everything upstream - their project pipeline determines how much ALMM-listed module capacity actually gets utilised.",
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
 adanient: {name:"Adani Enterprises", listed:true, role:"Solar cell, module and (planned) polysilicon manufacturing via Mundra Solar PV, part of its new-energy incubation portfolio", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's largest integrated solar cell-and-module operations (Mundra Solar PV) with group-level balance sheet support for backward integration"], risks:["Solar manufacturing is one of several incubating new-energy businesses inside a large, diversified Adani Enterprises - not separately disclosed", "Group-level financing/governance scrutiny has periodically pressured Adani group stock sentiment"], f:co("ADANIENT")},
 borosilRenew: {name:"Borosil Renewables", listed:true, role:"India's primary domestic solar glass manufacturer", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest and most established domestic solar glass producer, with first-mover scale in a thin-margin, capital-intensive business"], risks:["Repeated Chinese solar-glass oversupply/dumping cycles have pressured margins and utilisation", "Revenue and profitability are volatile year to year, tied to anti-dumping duty cycles and global glass pricing"], f:co("BORORENEW")},
 renewsys: {name:"RenewSys India", listed:false, role:"EVA encapsulant films and solar backsheet manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["One of a small number of established domestic EVA/backsheet converters supplying India's module manufacturers directly"], risks:["Unlisted - no audited public financials; figures here are not available", "Still reliant on imported EVA resin and backsheet base films as inputs"], notes:["Privately held, Mumbai-based; part of the ENPEE Group","One of India's few scaled domestic EVA film and backsheet manufacturers","No public market data - not listed"]},
 premierEnergies: {name:"Premier Energies", listed:true, role:"Integrated solar cell and module manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["One of a small number of Indian manufacturers with integrated cell-and-module capacity, capturing more of the value chain than module-only assemblers"], risks:["Listed Sept 2024, so its multi-year financial track record as a listed company is short", "Cell and module capacity additions across the industry are running ahead of demand, risking pricing pressure"], f:co("PREMIERENE")},
 websol: {name:"Websol Energy System", listed:true, role:"Solar cell manufacturing", dataStatus:"demo", sourceDate:ASOF, strengths:["Early, established solar cell manufacturing base positioned to benefit now that ALMM List-II covers cells (Jun 2026)"], risks:["Small-cap with thinner trading liquidity and capital base than the larger integrated players", "Revenue scale is a fraction of the larger integrated cell-and-module makers"], f:co("WEBELSOLAR")},
 waaree: {name:"Waaree Energies", listed:true, role:"India's largest solar module manufacturer, expanding into cells and polysilicon", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest solar module manufacturer by capacity, with a growing order book and an expanding export business to the US"], risks:["Listed Oct 2024, so its multi-year financial track record as a listed company is short", "Industry-wide module capacity additions are running ahead of demand, risking margin pressure even for the market leader"], f:co("WAAREEENER")},
 vikramSolar: {name:"Vikram Solar", listed:true, role:"Solar module maker (listed Aug 2025), expanding into cells", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, long-running module manufacturer with meaningful export relationships"], risks:["Industry-wide module capacity additions are running ahead of demand, risking price pressure", "Expansion into cells adds execution risk on a new, more capital-intensive process"], notes:["Kolkata-based; one of India's longer-established solar module manufacturers"], f:co("VIKRAMSOLR")},
 insolation: {name:"Insolation Energy", listed:true, role:"Solar module manufacturing, small-cap", dataStatus:"demo", sourceDate:ASOF, strengths:["Smaller, nimbler ALMM-listed module maker that has scaled rapidly off a low base alongside the broader industry capacity build-out"], risks:["Small-cap with thin trading history and a much smaller capacity base than the market-leading integrated players", "Revenue growth off a low base can reverse quickly if industry pricing turns"], f:co("INA")},
 aparInds: {name:"Apar Industries", listed:true, role:"Conductors and specialty solar cabling for mounting/BOS, alongside its core transformer and conductor business", dataStatus:"demo", sourceDate:ASOF, strengths:["Established, diversified conductors and cabling manufacturer with the scale to supply BOS cabling as utility-scale solar capacity grows"], risks:["Solar BOS cabling is a small slice of a much larger diversified conductors, cables and transformer-oil business - not separately disclosed"], f:co("APARINDS")},
 cgpowerSolar: {name:"CG Power and Industrial Solutions", listed:true, role:"Power electronics and transformers relevant to solar inverter/interconnect equipment", dataStatus:"demo", sourceDate:ASOF, strengths:["Post-turnaround power electronics and transformer manufacturer with the engineering base to expand into solar-specific power-conditioning equipment"], risks:["Solar-specific inverter/power-conditioning revenue is a small, undisclosed slice of a much larger diversified industrial and power-systems business"], f:co("CGPOWER")},
 sterlingWilson: {name:"Sterling and Wilson Renewable Energy", listed:true, role:"Pure-play solar EPC contractor", dataStatus:"demo", sourceDate:ASOF, strengths:["India's largest pure-play solar EPC contractor by track record, with a rebuilt order book"], risks:["History of financial stress and governance concerns, and FY26 slipped back to a net loss - the recovery is not yet secure", "Project-based EPC revenue is lumpy and execution-risk-heavy"], f:co("SWSOLAR","Recovering from a prior period of financial stress; FY26 slipped back to a net loss")},
 kpiGreen: {name:"KPI Green Energy", listed:true, role:"Solar EPC contractor and independent power producer (IPP)", dataStatus:"demo", sourceDate:ASOF, strengths:["Dual EPC-plus-IPP model gives both project-based construction revenue and recurring contracted power-sale revenue from its own operating assets"], risks:["Smaller-cap with a concentrated Gujarat project base relative to larger national developers", "EPC revenue recognition can be lumpy quarter to quarter"], f:co("KPIGREEN")},
 adaniGreen: {name:"Adani Green Energy", listed:true, role:"Independent power producer - one of India's largest renewable (solar + wind) generation portfolios", dataStatus:"demo", sourceDate:ASOF, strengths:["One of India's largest contracted renewable generation portfolios by operating capacity, with long-dated PPAs underpinning revenue visibility"], risks:["High leverage funding its aggressive capacity build-out", "Group-level financing/governance scrutiny has periodically pressured Adani group stock sentiment"], f:co("ADANIGREEN")},
 tataPowerSolar: {name:"Tata Power", listed:true, role:"Solar EPC, rooftop (Tata Power Solar) and utility-scale generation, alongside its core T&D and conventional generation business", dataStatus:"demo", sourceDate:ASOF, strengths:["Tata Power Solar's established EPC and rooftop brand plus the parent's large power-generation balance sheet back the solar build-out"], risks:["Solar EPC/generation is one segment within a much larger diversified T&D, renewable and conventional power generation business - not separately disclosed"], f:co("TATAPOWER")}
 },
 // Simple, legible geometric scene (not a ported hand-sculpted model like the
 // car/data-centre builds): a fab building, deployed panel rows on racking,
 // and a power yard - enough to anchor each zone's callout without needing
 // bespoke per-part geometry for a brand-new sector built in one pass.
 // Geometry lives in ./models/solarmodules.ts.
 build: function(ctx: Parameters<typeof buildSolarmodules>[0]){ return buildSolarmodules(ctx); }
 };

export default solarmodules;
