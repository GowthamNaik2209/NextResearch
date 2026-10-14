// "What if" shocks per sector. A scenario names the layers (zones) it would touch and
// how hard, and the explorer lights those layers up in 3D and ranks the listed
// companies that sit in them. This is a structured reading of the authored supply
// chain, not a forecast: severity is an editorial judgement of how directly a layer
// is exposed, and the ranking multiplies it by each company's authored exposure
// strength in that layer. Nothing here predicts prices or is a recommendation.
//
// Zone ids must exist in the sector (checked by `npm run validate:content`).
import { companyLinkExposure, companyLinkKey, tickerForSupplier, type ExposureStrength, type SectorDef } from "./index";

export type Severity = 1 | 2 | 3; // 3 = directly hit / directly helped
export type ScenarioEffect = "headwind" | "tailwind";

export type ScenarioImpact = { zone: string; severity: Severity; effect?: ScenarioEffect; why: string };

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
};

export function listScenarios(slug: string): Scenario[] {
  return SCENARIOS[slug] ?? [];
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
  return [...best.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
