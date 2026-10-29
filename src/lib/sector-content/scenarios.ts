// "What if" shocks per sector. A scenario names the layers (zones) it would touch and
// how hard, and the explorer lights those layers up in 3D and ranks the listed
// companies that sit in them. This is a structured reading of the authored supply
// chain, not a forecast: severity is an editorial judgement of how directly a layer
// is exposed, and the ranking multiplies it by each company's authored exposure
// strength in that layer. Nothing here predicts prices or is a recommendation.
//
// Zone ids must exist in the sector (checked by `npm run validate:content`).
import { companyLinkExposure, companyLinkKey, parseCrore, tickerForSupplier, type ExposureStrength, type SectorDef } from "./core";
import { SEMICON2_SCENARIOS } from "./policies/semicon2.extras";
import { RAREEARTH_SCENARIOS } from "./policies/rareearth.extras";
import { DEFENCEPROC_SCENARIOS } from "./policies/defenceproc.extras";
import { ECMS_SCENARIOS } from "./policies/ecms.extras";
import { NIFTY50_SCENARIOS, NIFTY50_SCENARIO_SECTIONS } from "./indices/nifty50.extras";

export type Severity = 1 | 2 | 3; // 3 = directly hit / directly helped
export type ScenarioEffect = "headwind" | "tailwind";

export type ScenarioImpact = { zone: string; severity: Severity; effect?: ScenarioEffect; why: string };

/** One company hit differently from its zone (the Nifty 50's NSE groups mix winners and losers: ONGC vs IndiGo under a crude spike). `key` is its supplier key in the sector. */
export type StockImpact = { key: string; severity: Severity; effect?: ScenarioEffect; why: string };

/**
 * A real past stretch that played out like the scenario, from the stored daily history (the Nifty
 * 50 keeps it back to 2000): the explorer shows each stock's actual move between the two days.
 */
export type ScenarioEpisode = { label: string; from: string; to: string; note: string };

/** A heading the explorer groups its scenarios under (the Nifty 50's macro drivers). */
export type ScenarioSection = { id: string; title: string };

export type Scenario = {
  id: string;
  title: string;
  /** One line shown on the button. */
  blurb: string;
  /** What happens and why it propagates, in plain language. */
  story: string;
  /** Default effect for impacts that do not set their own. */
  effect: ScenarioEffect;
  impacts: ScenarioImpact[];
  /** Its heading in the scenario list, when the sector groups them (SCENARIO_SECTIONS). */
  section?: string;
  /** Companies that move differently from their zone. */
  stocks?: StockImpact[];
  /** "Last time this happened". */
  episode?: ScenarioEpisode;
};

const S = (zone: string, severity: Severity, why: string, effect?: ScenarioEffect): ScenarioImpact => ({ zone, severity, why, effect });

export const SCENARIOS: Record<string, Scenario[]> = {
  ev4w: [
    {
      id: "rare-earth-curbs",
      title: "Rare-earth export curbs",
      blurb: "China restricts magnet and rare-earth exports",
      story:
        "Traction motors rely on neodymium-based permanent magnets, and most magnet supply is processed in China. A curb hits magnets first, then the motor and e-axle makers who cannot substitute quickly, and finally vehicle output.",
      effect: "headwind",
      impacts: [
        S("magnets", 3, "Direct: the material being restricted"),
        S("motor", 3, "Permanent-magnet motors need the magnets; redesign takes quarters"),
        S("power_elec", 1, "Indirect: some drive electronics are co-designed with the motor"),
        S("oem", 2, "Output at risk if motor supply stalls"),
      ],
    },
    {
      id: "cell-price-drop",
      title: "Battery cell prices fall sharply",
      blurb: "Cell costs drop 20%+ on global overcapacity",
      story:
        "Cells are the largest cost in an EV. Cheaper cells lift vehicle margins and affordability and pull demand forward, but squeeze domestic cell makers and anyone whose pitch is import substitution.",
      effect: "tailwind",
      impacts: [
        S("oem", 3, "Lower bill of materials, faster price parity with petrol cars"),
        S("charging", 2, "More vehicles on the road lifts charging demand"),
        S("battery", 2, "Volume up but pricing pressure and inventory risk", "headwind"),
        S("bms", 1, "More packs shipped"),
      ],
    },
    {
      id: "ev-subsidy-cut",
      title: "EV purchase incentives withdrawn",
      blurb: "Demand incentives end earlier than planned",
      story:
        "Early-stage EV demand is price-sensitive. Withdrawing incentives hits OEM volumes first and propagates upstream to every layer whose revenue is tied to vehicle units.",
      effect: "headwind",
      impacts: [
        S("oem", 3, "Unit volumes and mix are the first to react"),
        S("battery", 2, "Pack volumes follow vehicle volumes"),
        S("motor", 2, "Volume-linked"),
        S("power_elec", 2, "Volume-linked"),
        S("charging", 2, "Slower fleet growth slows charger roll-out"),
        S("chassis", 1, "Mostly ICE-agnostic, so only a small share is affected"),
      ],
    },
  ],
  semiconductors: [
    {
      id: "fab-delay",
      title: "Domestic fab ramp slips a year",
      blurb: "First India fab timelines slip",
      story:
        "Fab-linked suppliers (gases, chemicals, cleanroom builds) book revenue as a plant is commissioned and runs. A slip pushes out their order books while packaging, which is less dependent on a local fab, is relatively insulated.",
      effect: "headwind",
      impacts: [
        S("wafer_fab", 3, "The slipping asset itself"),
        S("gases", 3, "Consumption starts only when the fab runs"),
        S("chemicals", 3, "Same: tied to fab throughput"),
        S("cleanroom_utilities", 2, "Construction milestones move right"),
        S("atmp", 1, "Can run on imported wafers; mostly insulated"),
      ],
    },
    {
      id: "china-plus-one-electronics",
      title: "China+1 shift accelerates",
      blurb: "More global electronics assembly moves to India",
      story:
        "Assembly and test come before fabrication in any new electronics hub. Faster relocation lifts EMS and packaging first, then the design and enabling layers around them.",
      effect: "tailwind",
      impacts: [
        S("ems_downstream", 3, "Assembly contracts land first"),
        S("atmp", 3, "Packaging and test follow assembly"),
        S("design_services", 2, "More local design wins"),
        S("cleanroom_utilities", 1, "Facility build-out demand"),
      ],
    },
    {
      id: "specialty-gas-shortage",
      title: "Specialty gas shortage",
      blurb: "Neon / helium-class supply disruption",
      story:
        "Fabs consume small volumes of very pure specialty gases and have little ability to substitute. A shortage constrains the whole front-end even though the gas line itself is a small cost.",
      effect: "headwind",
      impacts: [
        S("gases", 3, "Direct"),
        S("wafer_fab", 3, "Cannot run lithography or etch without them"),
        S("atmp", 1, "Limited dependence"),
      ],
    },
  ],
  datacenter: [
    {
      id: "ai-capex-surge",
      title: "AI capacity build-out accelerates",
      blurb: "Hyperscalers double India capacity plans",
      story:
        "AI racks draw several times the power of conventional racks, so a build-out pulls power, cooling and compute together, with the biggest incremental spend in electrical and thermal infrastructure.",
      effect: "tailwind",
      impacts: [
        S("transformers", 3, "Power density drives grid and switchgear orders"),
        S("cooling", 3, "High-density racks need liquid and precision cooling"),
        S("power_backup", 3, "Uptime requires UPS and backup scale-up"),
        S("compute", 2, "Server and GPU demand, though largely imported"),
        S("operators", 2, "Capacity to fill, but capital-intensive"),
        S("cabling", 2, "Higher cable counts per hall"),
        S("networking", 2, "More interconnect"),
      ],
    },
    {
      id: "grid-power-shortfall",
      title: "Grid power availability tightens",
      blurb: "Connection delays and tariff spikes",
      story:
        "Power is the binding constraint for new halls. Delays slow operator go-lives and push builders toward self-generation and backup, helping some equipment makers while hurting capacity ramp.",
      effect: "headwind",
      impacts: [
        S("operators", 3, "Go-live dates and margins both exposed"),
        S("transformers", 1, "Orders continue, but project timing slips"),
        S("power_backup", 2, "More on-site generation and storage", "tailwind"),
        S("cooling", 1, "Commissioning delayed"),
      ],
    },
    {
      id: "copper-spike",
      title: "Copper price spike",
      blurb: "Copper up 30% in a year",
      story:
        "Copper is the dominant input for cables and a large one in transformers and busbars. Firms with pass-through clauses cope; fixed-price order books absorb the hit.",
      effect: "headwind",
      impacts: [
        S("cabling", 3, "Copper is most of the cost of a power cable"),
        S("transformers", 2, "Windings are copper"),
        S("power_backup", 1, "Smaller input share"),
      ],
    },
  ],
  railways: [
    {
      id: "kavach-rollout",
      title: "Kavach rollout is fast-tracked",
      blurb: "Network-wide train-protection mandate",
      story:
        "Kavach needs trackside equipment, onboard units and installation crews. A faster rollout pulls orders through signalling and electronics suppliers and the EPC contractors that install them.",
      effect: "tailwind",
      impacts: [
        S("signaling", 3, "Core of the programme"),
        S("epc", 2, "Installation and trackside works"),
        S("psu", 1, "Tendering and digital infrastructure"),
      ],
    },
    {
      id: "vande-bharat-scale",
      title: "Vande Bharat order scale-up",
      blurb: "Large new train-set orders are placed",
      story:
        "Train-set orders flow to integrators first and then to the bogie, traction, braking and interior suppliers they source from, usually 12-24 months later.",
      effect: "tailwind",
      impacts: [
        S("rolling_stock", 3, "Order winners and builders"),
        S("traction", 2, "Propulsion packages per set"),
        S("bogies", 2, "Bogies, wheels and axles"),
        S("braking", 2, "Braking and auxiliaries"),
      ],
    },
    {
      id: "railway-capex-cut",
      title: "Railway capex budget trimmed",
      blurb: "Budget outlay falls 15%",
      story:
        "Railway suppliers are heavily tied to one customer. A capex cut lands first on project contractors and tendered orders, and with a lag on equipment makers.",
      effect: "headwind",
      impacts: [
        S("epc", 3, "Project awards and billing slow first"),
        S("rolling_stock", 2, "New orders delayed"),
        S("psu", 2, "Government-linked revenue pool shrinks"),
        S("signaling", 2, "Tender timing"),
        S("traction", 1, "Lagged"),
        S("bogies", 1, "Lagged"),
        S("braking", 1, "Lagged"),
      ],
    },
  ],
  naval: [
    {
      id: "indigenisation-push",
      title: "Defence indigenisation tightened",
      blurb: "More categories ruled import-banned",
      story:
        "Positive indigenisation lists steer procurement to domestic firms. Platform builders and system suppliers with in-house design benefit most; import-dependent integrators must localise.",
      effect: "tailwind",
      impacts: [
        S("shipyard", 3, "Domestic build mandated"),
        S("combat", 2, "Domestic weapons and ammunition"),
        S("electronics", 2, "Sensors and radar localisation"),
        S("propulsion", 2, "Engines and gearboxes localised"),
        S("hull", 1, "Domestic steel already used"),
      ],
    },
    {
      id: "steel-spike",
      title: "Special-steel input shock",
      blurb: "Naval-grade steel supply tightens",
      story:
        "Warships use specialised plate and alloy supplied by very few mills. A supply shock delays hull blocks and then everything integrated on top of them.",
      effect: "headwind",
      impacts: [
        S("hull", 3, "Direct"),
        S("shipyard", 2, "Schedules slip with block delivery"),
        S("components", 1, "Indirect"),
      ],
    },
    {
      id: "export-orders",
      title: "Defence export orders gather pace",
      blurb: "Foreign navies order Indian-built ships and systems",
      story:
        "Export orders add volume beyond the domestic programme, helping yards and the electronics and component suppliers who are exportable in their own right.",
      effect: "tailwind",
      impacts: [
        S("shipyard", 3, "Lead contractors"),
        S("electronics", 2, "Exportable systems"),
        S("combat", 2, "Exportable weapons"),
        S("components", 2, "Volume pull-through"),
      ],
    },
  ],
  aerospace: [
    {
      id: "engine-supply-delay",
      title: "Aero-engine supply delay",
      blurb: "Imported engines slip for key platforms",
      story:
        "Airframes can be built without engines but not delivered. A delay holds up integrators and any supplier paid on delivery, while component makers feeding engines elsewhere are less exposed.",
      effect: "headwind",
      impacts: [
        S("integration", 3, "Delivery milestones slip"),
        S("engine", 2, "Hot-section and engine parts volumes"),
        S("mro", 1, "Support schedule moves"),
      ],
    },
    {
      id: "commercial-aircraft-boom",
      title: "Global aircraft build rate rises",
      blurb: "Boeing and Airbus production ramps",
      story:
        "Indian aerostructure and forging suppliers sit in global supply chains. A higher build rate lifts their order books directly, with MRO following as fleets grow.",
      effect: "tailwind",
      impacts: [
        S("structures", 3, "Aerostructure and machining volumes"),
        S("forgings", 3, "Titanium and special-alloy forgings"),
        S("landing_gear", 2, "Actuation and gear packages"),
        S("engine", 2, "Engine part programmes"),
        S("mro", 2, "Larger fleet to service"),
      ],
    },
    {
      id: "titanium-shock",
      title: "Titanium and special-alloy shortage",
      blurb: "Sanctions tighten alloy supply",
      story:
        "Aerospace forgings depend on a thin set of titanium and nickel-alloy sources. A shortage constrains forgings first and every machined part made from them.",
      effect: "headwind",
      impacts: [
        S("forgings", 3, "Direct"),
        S("structures", 2, "Machined parts depend on the stock"),
        S("engine", 2, "Hot-section alloys"),
        S("landing_gear", 2, "High-strength forgings"),
      ],
    },
  ],
  telecom5g: [
    {
      id: "5g-capex-cut",
      title: "Operators cut 5G capex",
      blurb: "Rollout slows as ARPU lags",
      story:
        "Operator capex is the demand source for everything upstream. A cut hits equipment and tower installation first, and then the fiber and EPC layers that lay the network.",
      effect: "headwind",
      impacts: [
        S("ran", 3, "Equipment orders are discretionary"),
        S("epc", 3, "Installation volumes"),
        S("towers", 2, "Tenancy additions slow"),
        S("antennas", 2, "RF volumes"),
        S("fiber", 2, "Backhaul build slows"),
        S("ems", 1, "Some equipment assembly"),
        S("operators", 1, "Cash relief, but slower network quality gains", "tailwind"),
      ],
    },
    {
      id: "domestic-gear-mandate",
      title: "Trusted-source and domestic equipment push",
      blurb: "Procurement favours Indian-made gear",
      story:
        "A preference for domestic and trusted-source equipment moves share from foreign vendors to local manufacturers, helping local equipment, EMS and RF makers.",
      effect: "tailwind",
      impacts: [
        S("ran", 3, "Local equipment makers gain share"),
        S("ems", 3, "Contract manufacturing for that gear"),
        S("antennas", 2, "Local RF and microwave"),
        S("fiber", 1, "Already largely domestic"),
      ],
    },
    {
      id: "tariff-hike",
      title: "Mobile tariff hike",
      blurb: "Industry raises tariffs 15-20%",
      story:
        "Higher ARPU improves operator cash flows and the case for network investment, which flows down to towers and equipment with a lag.",
      effect: "tailwind",
      impacts: [
        S("operators", 3, "Revenue per user rises directly"),
        S("towers", 2, "Stronger tenant credit and capex"),
        S("ran", 1, "Capex follows with a lag"),
        S("fiber", 1, "Lagged"),
      ],
    },
  ],
  energy: [
    {
      id: "coal-supply-squeeze",
      title: "Coal supply tightens",
      blurb: "Stock shortages and rake delays hit plants",
      story:
        "Thermal plants run only as well as their coal supply. A squeeze cuts plant load factors for gencos first, shifts some demand onto renewables and hydro, and leaves equipment makers' order books mostly untouched in the near term.",
      effect: "headwind",
      impacts: [
        S("thermal_gencos", 3, "Plant load factors and merchant margins fall directly"),
        S("thermal_equip", 1, "Order books are slower-moving; effect is on sentiment and future ordering"),
        S("hydro_gencos", 2, "Flexible hydro is dispatched harder and earns more", "tailwind"),
        S("solar_developers", 1, "More generation demand shifts to them", "tailwind"),
      ],
    },
    {
      id: "evening-peak-record",
      title: "Evening peak demand hits a record",
      blurb: "Peak load outruns solar-heavy supply",
      story:
        "Solar fades just as demand peaks. Dispatchable sources and storage are what close the gap, so the layers that can deliver power after sunset become the scarce ones.",
      effect: "tailwind",
      impacts: [
        S("thermal_gencos", 3, "Dispatchable coal and gas fill the evening gap"),
        S("storage_integrators", 3, "Storage that shifts solar into the evening is the scarce asset"),
        S("hydro_gencos", 2, "Peaking and pumped-storage capacity"),
        S("storage_equip", 2, "Cell and pack demand pulls through"),
        S("solar_developers", 1, "Strong demand but their output is mid-day"),
      ],
    },
    {
      id: "renewable-auction-surge",
      title: "Renewable auctions accelerate",
      blurb: "Tender volumes jump to record levels",
      story:
        "More awarded capacity flows first to developers, then to the equipment and EPC suppliers who build it over the next 12-24 months, with storage-linked hybrids pulling in the storage layer. New thermal ordering loses relative share.",
      effect: "tailwind",
      impacts: [
        S("solar_developers", 3, "Win and finance the capacity"),
        S("wind_developers", 3, "Win and finance the capacity"),
        S("solar_equip", 3, "Module, inverter and EPC orders follow"),
        S("wind_equip", 2, "Turbine orders follow"),
        S("storage_equip", 2, "Hybrid and firm-power tenders require storage"),
        S("thermal_equip", 1, "Relative share of new capacity falls", "headwind"),
      ],
    },
    {
      id: "grid-curtailment",
      title: "Transmission lags renewable build",
      blurb: "Projects wait for grid connectivity; output is curtailed",
      story:
        "Capacity that cannot reach the grid earns nothing. Developers face delayed revenue and curtailment, equipment suppliers see billing slip, and storage placed near the bottleneck becomes more valuable.",
      effect: "headwind",
      impacts: [
        S("solar_developers", 3, "Stranded or curtailed output hits revenue"),
        S("wind_developers", 3, "Same exposure"),
        S("solar_equip", 2, "Commissioning and billing milestones slip"),
        S("wind_equip", 1, "Commissioning milestones slip"),
        S("storage_integrators", 2, "Co-located storage can absorb curtailed output", "tailwind"),
      ],
    },
  ],
  solarmodules: [
    {
      id: "almm-cells",
      title: "ALMM extended to cells",
      blurb: "Approved-list rule covers cells, not just modules",
      story:
        "Extending the approved-manufacturer list to cells shifts value from module assembly, which relies on imported cells, to cell makers and the wafer layers feeding them.",
      effect: "tailwind",
      impacts: [
        S("cells", 3, "Mandated domestic cell demand"),
        S("polywafer", 2, "Upstream pull for wafers"),
        S("glass_eva", 1, "Volume pull-through"),
        S("modules", 2, "Assemblers without cell capacity face higher costs", "headwind"),
      ],
    },
    {
      id: "chinese-cell-price-collapse",
      title: "Imported cell and module prices collapse",
      blurb: "Global oversupply cuts prices 25%",
      story:
        "Cheap imports squeeze domestic manufacturers that lack scale and help developers whose cost is mostly modules.",
      effect: "headwind",
      impacts: [
        S("cells", 3, "Margins compress"),
        S("modules", 3, "Price pressure on domestic modules"),
        S("polywafer", 2, "Same, at higher capital cost"),
        S("epc", 2, "Lower project costs", "tailwind"),
      ],
    },
    {
      id: "transmission-delays",
      title: "Grid evacuation delays",
      blurb: "Transmission lags solar commissioning",
      story:
        "Completed projects cannot sell power without grid access. Delays slow commissioning and the bills of EPCs and inverter suppliers, and reduce new module orders.",
      effect: "headwind",
      impacts: [
        S("epc", 3, "Delayed completion and billing"),
        S("inverters", 2, "Installation timing"),
        S("mounting", 2, "Installation timing"),
        S("modules", 1, "Demand timing"),
      ],
    },
  ],
  realestate: [
    {
      id: "rate-tightening",
      title: "Rates keep rising",
      blurb: "RBI hikes again; home-loan rates up ~50 bp",
      story:
        "The RBI raised the repo rate to 5.50% in October 2026 and shifted to 'calibrated tightening'. Further hikes pass through to repo-linked home loans within a quarter, raising EMIs and cutting what buyers can borrow. Mid-income and affordable housing feel it first; luxury buyers less so. Lenders reprice loans faster than deposits at first, but growth and asset quality soften. Landlords see cap rates and REIT yields drift up.",
      effect: "headwind",
      impacts: [
        S("residential", 3, "Higher EMIs slow bookings, especially in the sub-₹1 Cr segment"),
        S("finance", 2, "Slower disbursements and more stress in affordable loans; repo-linked loans reprice up quickly"),
        S("sales", 2, "Fewer transactions mean less brokerage and fewer portal leads"),
        S("land", 2, "Developers slow land buying and new joint-development deals"),
        S("office", 1, "Higher bond yields make REIT units less attractive and lift cap rates"),
        S("retail", 1, "Same valuation pressure on mall REITs; footfall barely affected"),
        S("finishes", 1, "Fewer handovers and home upgrades two to three years out"),
      ],
    },
    {
      id: "inventory-overhang",
      title: "Unsold homes pile up",
      blurb: "Launches keep outrunning sales for a year",
      story:
        "In Q3 2026 launches across the top seven cities rose 18% while sales grew 3%, and unsold stock rose to about 6.3 lakh homes (ANAROCK). If that continues, developers cut launches and offer discounts or easy payment plans. Construction and material orders follow with a lag, and lenders slow construction finance. Big branded developers with low debt can keep selling; smaller, leveraged ones get squeezed.",
      effect: "headwind",
      impacts: [
        S("residential", 3, "Price cuts, slower collections and deferred launches"),
        S("land", 2, "Land deals and approvals for new phases are pushed back"),
        S("epc", 2, "Fewer new residential contracts; slower billing on running ones"),
        S("cement", 2, "Housing is the largest end-use of cement"),
        S("steel", 1, "Less rebar and structural tube demand from new towers"),
        S("finance", 2, "Construction-finance books shrink; developer loans need closer watching"),
        S("sales", 1, "Brokers get more mandates but lower conversion"),
      ],
    },
    {
      id: "gcc-office-boom",
      title: "GCC office leasing keeps booming",
      blurb: "Global capability centres take 30+ msf a year",
      story:
        "Global capability centres (GCCs) took about 42% of India's office leasing in Jan-Sep 2026 (CBRE). If that pace holds, office vacancy falls, rents and re-leasing spreads rise, and REITs and developers start new office towers. Fit-outs pull in HVAC, lifts, cabling and electrical work, and new office jobs support housing and mall demand in the same areas.",
      effect: "tailwind",
      impacts: [
        S("office", 3, "Higher occupancy, rent growth and new building for office REITs and landlords"),
        S("epc", 2, "More commercial tower and fit-out contracts"),
        S("hvac_lifts", 2, "Central air-conditioning, chillers and high-speed lifts for Grade A offices"),
        S("electricals", 2, "Cabling, switchgear and data cabling for fit-outs"),
        S("residential", 1, "Office hiring supports mid-to-premium home demand nearby"),
        S("retail", 1, "More office workers lift mall footfall and spending"),
        S("land", 1, "Commercial land near IT corridors gains value"),
      ],
    },
    {
      id: "input-cost-spike",
      title: "Fuel and building-material costs spike",
      blurb: "Petcoke, coking coal, copper and PVC jump 20%",
      story:
        "West Asia conflict keeps oil, petcoke and coal prices high. Cement and steel makers face higher fuel and power costs and cannot pass them all on while demand is soft. Fixed-price builders absorb the hit until escalation clauses kick in. Pipe and wire makers usually pass on resin and copper costs, but dealers destock while prices are volatile. Developers' construction costs rise by a few percent, which hurts mid-income projects most.",
      effect: "headwind",
      impacts: [
        S("cement", 3, "Fuel and power are a large share of cement cost; EBITDA per tonne falls"),
        S("epc", 3, "Fixed-price contracts absorb cost increases until escalation applies"),
        S("steel", 2, "Coking-coal costs squeeze margins unless rebar prices follow"),
        S("residential", 2, "Construction cost per sq ft rises; mid-income margins narrow"),
        S("plumbing", 1, "PVC resin swings cause dealer destocking and inventory losses"),
        S("electricals", 1, "Copper pass-through holds margins but slows volumes"),
        S("finishes", 1, "Gas-fired tile kilns and crude-linked paint inputs cost more"),
      ],
    },
  ],
  pharma: [
    {
      id: "us-generic-tariffs",
      title: "US tariffs hit generic imports",
      blurb: "The 100% generic tariff from Aug 2028 is applied with no India carve-out",
      story:
        "Generic medicines are exempt today, but the US has set a clock: 0% until July 2028, then 100%, then 200% for companies that do not make in the US. Indian generic exporters cannot pass a tariff that size through on low-margin pills, so US profits shrink or move to US plants. India-focused branded companies and domestic chains are insulated, and API makers face weaker captive demand from their US-exposed customers.",
      effect: "headwind",
      impacts: [
        S("generics", 3, "US oral-solid and complex generics made in India lose their cost edge"),
        S("injectables", 3, "US sterile products made in India face the same duty"),
        S("api", 2, "Indian formulators cut volumes or move sourcing closer to US plants"),
        S("ksm", 1, "Second-order: lower API volumes"),
        S("specialty", 1, "Patented imports already face Section 232 duties unless onshored"),
        S("domestic", 1, "Exporters may push harder into India, raising competition", "headwind"),
        S("cdmo", 1, "Some innovator supply chains shift to the US; India CDMOs with US sites gain", "tailwind"),
      ],
    },
    {
      id: "usfda-inspection-wave",
      title: "USFDA inspection wave",
      blurb: "A run of OAIs and warning letters across Indian plants",
      story:
        "A surge of unannounced USFDA inspections ends in several Official Action Indicated classifications and warning letters. Affected sites cannot win new approvals, launches slip and remediation costs rise - sterile injectable plants are hit hardest. Compliant peers and contract manufacturers with clean records pick up share and transfer work.",
      effect: "headwind",
      impacts: [
        S("injectables", 3, "Sterile sites carry the most observations (aseptic, data integrity)"),
        S("generics", 3, "OAI/WL plants cannot get new ANDA approvals"),
        S("api", 2, "API sites inspected alongside; DMF reviews delayed"),
        S("cdmo", 1, "Innovators audit Indian vendors harder"),
        S("domestic", 1, "India branded sales unaffected; exporters may divert supply home", "tailwind"),
      ],
    },
    {
      id: "china-ksm-curbs",
      title: "China curbs KSM and API exports",
      blurb: "Supply of key starting materials from China is disrupted",
      story:
        "Most of India's imports of many critical KSMs and intermediates come from China. An export curb, plant shutdowns or a price spike there squeezes Indian API makers first, then formulators with thin margins and price-controlled products. Indian KSM makers and PLI plants suddenly have pricing power.",
      effect: "headwind",
      impacts: [
        S("api", 3, "Input shortages and margin squeeze for non-integrated API makers"),
        S("ksm", 3, "Domestic KSM and PLI plants gain volumes and pricing", "tailwind"),
        S("generics", 2, "Formulation costs rise; supply disruptions for some molecules"),
        S("domestic", 2, "NLEM price caps stop cost pass-through on essential drugs"),
        S("packaging", 1, "Some excipient and chemical inputs are also China-sourced"),
      ],
    },
    {
      id: "biosecure-shift",
      title: "BIOSECURE moves work to India",
      blurb: "US innovators move CDMO and research work away from Chinese vendors",
      story:
        "The BIOSECURE Act (Dec 2025) restricts US federal contracting with 'biotechnology companies of concern'. As implementing rules land, Western pharma and biotech move discovery, development and commercial manufacturing to non-Chinese vendors. Indian CRDMOs with compliant capacity win new molecules; peptide, ADC and biologics capacity is in shortest supply.",
      effect: "tailwind",
      impacts: [
        S("cdmo", 3, "New RFPs and multi-year supply contracts"),
        S("api", 2, "Innovator intermediates and complex APIs sourced from India"),
        S("biologics", 2, "Biologics and ADC manufacturing demand"),
        S("injectables", 1, "Fill-finish work follows drug-substance moves"),
        S("ksm", 1, "Upstream intermediates follow"),
      ],
    },
  ],
  semicon2: SEMICON2_SCENARIOS,
  rareearth: RAREEARTH_SCENARIOS,
  defenceproc: DEFENCEPROC_SCENARIOS,
  ecms: ECMS_SCENARIOS,
  nifty50: NIFTY50_SCENARIOS,
};

export function listScenarios(slug: string): Scenario[] {
  return SCENARIOS[slug] ?? [];
}

/** The headings a sector groups its scenarios under, in order; none for a flat list. */
const SCENARIO_SECTIONS: Record<string, ScenarioSection[]> = {
  nifty50: NIFTY50_SCENARIO_SECTIONS,
};

export function listScenarioSections(slug: string): ScenarioSection[] {
  return SCENARIO_SECTIONS[slug] ?? [];
}

export type ScenarioZoneImpact = { zone: string; label: string; severity: Severity; effect: ScenarioEffect; why: string };

export type ScenarioCompany = {
  key: string;
  name: string;
  ticker: string;
  score: number;
  effect: ScenarioEffect;
  /** The layer that drives this company's score. */
  zoneId: string;
  zoneLabel: string;
  severity: Severity;
  strength?: ExposureStrength;
  /** Set when the scenario names this company itself (a StockImpact): why it moves. */
  why?: string;
};

const STRENGTH_POINTS: Record<ExposureStrength, number> = { high: 3, medium: 2, low: 1 };

export function scenarioZoneImpacts(sector: SectorDef, sc: Scenario): ScenarioZoneImpact[] {
  return sc.impacts
    .map((i) => {
      const z = sector.zones.find((x) => x.id === i.zone);
      return z ? { zone: i.zone, label: z.label, severity: i.severity, effect: i.effect ?? sc.effect, why: i.why } : null;
    })
    .filter((x): x is ScenarioZoneImpact => x !== null)
    .sort((a, b) => b.severity - a.severity);
}

// Listed companies in the touched layers, ranked by severity x exposure strength. A company
// in several touched layers keeps its single highest-scoring one, so the list is one row per company.
export function scenarioCompanies(sector: SectorDef, sc: Scenario): ScenarioCompany[] {
  const best = new Map<string, ScenarioCompany>();
  for (const imp of sc.impacts) {
    const zone = sector.zones.find((z) => z.id === imp.zone);
    if (!zone) continue;
    for (const link of zone.suppliers) {
      const key = companyLinkKey(link);
      const sup = sector.suppliers[key];
      if (!sup?.listed) continue;
      const strength = companyLinkExposure(link).exposureStrength;
      const score = imp.severity * (strength ? STRENGTH_POINTS[strength] : 2);
      const prev = best.get(key);
      if (!prev || score > prev.score) {
        best.set(key, {
          key,
          name: sup.name,
          ticker: tickerForSupplier(sup),
          score,
          effect: imp.effect ?? sc.effect,
          zoneId: zone.id,
          zoneLabel: zone.label,
          severity: imp.severity,
          strength,
        });
      }
    }
  }
  // A company the scenario names itself takes that reading over its zone's (scored as a high-exposure link).
  for (const st of sc.stocks ?? []) {
    const sup = sector.suppliers[st.key];
    const zone = sector.zones.find((z) => z.suppliers.some((l) => companyLinkKey(l) === st.key));
    if (!sup?.listed || !zone) continue;
    best.set(st.key, {
      key: st.key,
      name: sup.name,
      ticker: tickerForSupplier(sup),
      score: st.severity * STRENGTH_POINTS.high,
      effect: st.effect ?? sc.effect,
      zoneId: zone.id,
      zoneLabel: zone.label,
      severity: st.severity,
      why: st.why,
    });
  }
  // Ties (common where every company has the same exposure, as in the Nifty 50) go to the bigger company.
  const cap = (key: string) => parseCrore(sector.suppliers[key]?.f?.mcap) ?? -1;
  return [...best.values()].sort((a, b) => b.score - a.score || cap(b.key) - cap(a.key) || a.name.localeCompare(b.name));
}

export type StockReading = { severity: Severity; effect: ScenarioEffect; why: string; own: boolean };

/** Every listed company's reading under a scenario: its own (StockImpact) when named, else its zone's; untouched ones are absent. */
export function scenarioStockReadings(sector: SectorDef, sc: Scenario): Map<string, StockReading> {
  const out = new Map<string, StockReading>();
  for (const imp of sc.impacts) {
    const zone = sector.zones.find((z) => z.id === imp.zone);
    for (const link of zone?.suppliers ?? []) {
      const key = companyLinkKey(link);
      const prev = out.get(key);
      if (!prev || imp.severity > prev.severity) out.set(key, { severity: imp.severity, effect: imp.effect ?? sc.effect, why: imp.why, own: false });
    }
  }
  for (const st of sc.stocks ?? []) out.set(st.key, { severity: st.severity, effect: st.effect ?? sc.effect, why: st.why, own: true });
  return out;
}

export type IndexSplit = {
  /** Shares of the listed companies' combined market cap, 0-100. */
  headwind: number;
  tailwind: number;
  untouched: number;
  /** Zones carrying the most market cap on each side, biggest first (up to three). */
  headwindLeads: string[];
  tailwindLeads: string[];
};

/** How much of the index (by market cap) a scenario leans against and for: an editorial reading weighted by size, not a forecast. */
export function scenarioIndexSplit(sector: SectorDef, sc: Scenario): IndexSplit | null {
  const readings = scenarioStockReadings(sector, sc);
  const side = { headwind: 0, tailwind: 0, untouched: 0 };
  const byZone = { headwind: new Map<string, number>(), tailwind: new Map<string, number>() };
  for (const z of sector.zones)
    for (const link of z.suppliers) {
      const key = companyLinkKey(link);
      const sup = sector.suppliers[key];
      const cap = sup?.listed ? parseCrore(sup.f?.mcap) : null;
      if (!cap) continue;
      const r = readings.get(key);
      if (!r) {
        side.untouched += cap;
        continue;
      }
      side[r.effect] += cap;
      byZone[r.effect].set(z.label, (byZone[r.effect].get(z.label) ?? 0) + cap);
    }
  const total = side.headwind + side.tailwind + side.untouched;
  if (!total) return null;
  const leads = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label);
  return {
    headwind: (side.headwind / total) * 100,
    tailwind: (side.tailwind / total) * 100,
    untouched: (side.untouched / total) * 100,
    headwindLeads: leads(byZone.headwind),
    tailwindLeads: leads(byZone.tailwind),
  };
}
