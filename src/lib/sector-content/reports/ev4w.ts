import type { SectorReport } from "./types";

export const ev4w: SectorReport = {
  slug: "ev4w",
  title: "India Electric Passenger Vehicles",
  subtitle: "From import-heavy assembly to a localized EV component stack",
  asOf: "Oct 2026",

  stance: {
    label: "Structural tailwind",
    tone: "pos",
    line: "Volumes are small but compounding; value accrues first to suppliers localizing cells, motors and power electronics.",
  },
  keyStats: [
    { label: "e-PV sales, FY26", value: "~2.0 lakh", sub: "units, approx. (Vahan)" },
    { label: "EV share of car sales", value: "~4.5%", sub: "up from ~1% in FY23" },
    { label: "Battery share of EV cost", value: "35-40%", sub: "largest single BOM item" },
    { label: "Cells imported", value: ">90%", sub: "domestic giga-plants ramping" },
  ],
  thesis: [
    {
      title: "Penetration is crossing the S-curve knee",
      body: "e-PV volumes grew ~11x from FY22 to FY26 (doubling roughly every 14 months) as model choice widened from 3-4 nameplates to 25+, and battery packs got ~40% cheaper.",
    },
    {
      title: "Localization is the profit pool",
      body: "Cells, magnets and power semiconductors are mostly imported today. PLI-ACC, the rare-earth magnet scheme and SPMEPCI push that value onshore to listed component makers.",
    },
    {
      title: "Incumbent suppliers retool, not get replaced",
      body: "Harness, forging, casting and thermal suppliers re-use existing lines for EV platforms at higher content per vehicle - EV harness and thermal content is 2-3x an ICE car.",
    },
  ],

  developments: [
    {
      date: "2026",
      title: "Mass-market EV launches widen choice",
      body: "Maruti's e Vitara, Tata's Harrier.ev and Mahindra's XEV/BE line-up put credible EVs in the Rs 15-30 lakh SUV band where Indian demand is concentrated.",
      impact: "pos",
      tag: "Demand",
    },
    {
      date: "Nov 2025",
      title: "Rs 7,280 Cr rare-earth magnet scheme",
      body: "Cabinet approved incentives for ~6,000 tpa of integrated sintered rare-earth permanent magnet capacity, after China's April 2025 export licensing disrupted motor supply.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Sep 2025",
      title: "GST 2.0 narrows the EV price gap",
      body: "Small petrol/diesel cars moved from 28% (+cess) to 18% GST while EVs stay at 5% - the tax advantage shrinks in the entry segment.",
      impact: "neg",
      tag: "Tax",
    },
    {
      date: "Jul-Aug 2025",
      title: "Tesla and VinFast enter India",
      body: "Tesla opened showrooms with imported Model Ys; VinFast commissioned its Thoothukudi assembly plant. Global entrants raise the competitive bar on software and price.",
      impact: "neutral",
      tag: "Competition",
    },
    {
      date: "Jun 2025",
      title: "SPMEPCI guidelines notified",
      body: "Global OEMs committing Rs 4,150 Cr+ of local investment may import CBUs at 15% duty (vs 70-110%) with localization targets of 25% in 3 years and 50% in 5.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Apr 2025",
      title: "China curbs rare-earth exports",
      body: "Licensing on seven rare earths and magnets stalled traction-motor shipments for months - the clearest proof of single-source risk in the EV stack.",
      impact: "neg",
      tag: "Supply chain",
    },
  ],

  overview: {
    narrative: [
      "India sells ~4.4-4.5 million passenger vehicles a year; electric cars are still a small slice but the fastest-growing one, led by compact and mid-size SUVs rather than hatchbacks.",
      "Unlike China, India's EV policy is now production-led rather than subsidy-led: PM E-DRIVE (Rs 10,900 Cr) funds buses, two/three-wheelers and charging, while cars get support through PLI-Auto, PLI-ACC and lower GST.",
      "The binding constraints are upstream - cells, magnets and power chips - plus public fast-charging density outside the top metros.",
    ],
    chart: {
      title: "Electric passenger-vehicle sales in India",
      unit: "'000 units",
      source: "Vahan / SIAM; FY28P and FY30P are NextResearch estimates",
      points: [
        { label: "FY22", value: 18 },
        { label: "FY23", value: 48 },
        { label: "FY24", value: 90 },
        { label: "FY25", value: 107 },
        { label: "FY26", value: 200 },
        { label: "FY28P", value: 420, projected: true },
        { label: "FY30P", value: 700, projected: true },
      ],
    },
    snapshot: [
      { label: "e-PV volume growth, FY26", value: "~85%", tone: "pos" },
      { label: "Public charging points", value: "~30,000", tone: "neutral" },
      { label: "Li-ion pack cost fall, 2020-25", value: "~40%", tone: "pos" },
      { label: "GST on EVs vs small ICE", value: "5% vs 18%", tone: "neutral" },
      { label: "Cell import dependence", value: ">90%", tone: "neg" },
      { label: "PLI-ACC capacity awarded", value: "40 of 50 GWh", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Materials & magnets", zoneIds: ["magnets"], margin: "Thin today", moat: "high", note: "Rare-earth processing is China-dominated; India is building first scale capacity." },
    { stage: "Cells & battery packs", zoneIds: ["battery", "bms"], margin: "8-12% EBITDA", moat: "high", note: "Largest cost pool; scale and chemistry know-how decide winners." },
    { stage: "Drivetrain & electronics", zoneIds: ["motor", "power_elec", "thermal"], margin: "15-25% EBITDA", moat: "medium", note: "Motors, inverters, e-axles - where listed suppliers already earn the best margins." },
    { stage: "Body, harness & precision parts", zoneIds: ["harness", "chassis", "cluster"], margin: "10-15% EBITDA", moat: "medium", note: "Incumbents retool existing lines; higher content per EV." },
    { stage: "Vehicle OEMs", zoneIds: ["oem"], margin: "Low/negative on EVs", moat: "medium", note: "EV programmes still sub-scale; profitability tied to localization." },
    { stage: "Charging & energy", zoneIds: ["charging"], margin: "Early, utilization-led", moat: "low", note: "Asset-heavy; returns depend on fleet growth and site utilization." },
  ],

  drivers: [
    { title: "Falling battery costs", metric: "~$100/kWh", body: "LFP pack prices near $100/kWh bring EV total cost of ownership below petrol within 3-4 years for typical urban use." },
    { title: "Model availability", metric: "25+ models", body: "From 3-4 credible nameplates in FY21 to 25+ across price bands, including Maruti, Hyundai, Mahindra and Tata SUVs." },
    { title: "Fleet & ride-hailing", metric: "~15% of e-PV", body: "Commercial fleets and cab aggregators electrify first on running-cost savings, giving base-load volume." },
    { title: "Production-linked incentives", metric: "Rs 44,000 Cr+", body: "PLI-Auto (Rs 25,938 Cr) and PLI-ACC (Rs 18,100 Cr) reward domestic value addition rather than vehicle sales." },
  ],
  mix: {
    title: "e-PV market share by OEM, FY26 (approx.)",
    source: "Vahan registrations",
    slices: [
      { label: "Tata Motors", value: 40 },
      { label: "JSW MG", value: 29 },
      { label: "Mahindra", value: 19 },
      { label: "Others", value: 12 },
    ],
  },

  pestle: {
    political: [
      { point: "Clear national push for EV manufacturing (PLI-Auto, PLI-ACC, SPMEPCI) with bipartisan state-level support.", impact: "pos" },
      { point: "Dependence on China for cells and rare earths makes supply exposed to geopolitics.", impact: "neg" },
    ],
    economic: [
      { point: "Lower running cost (~Rs 1-1.5/km vs Rs 6-7/km petrol) drives fleet and high-usage adoption.", impact: "pos" },
      { point: "GST 2.0 cut on small ICE cars narrows the EV upfront-price advantage.", impact: "neg" },
    ],
    social: [
      { point: "Urban buyers' preference for SUVs matches where EV launches are concentrated.", impact: "pos" },
      { point: "Range anxiety and resale-value uncertainty still deter first-time buyers.", impact: "neg" },
    ],
    technological: [
      { point: "LFP and cell-to-pack designs cut cost; sodium-ion is an emerging magnet-free/lithium-light option.", impact: "pos" },
      { point: "Software-defined vehicles shift value to electronics and software - a gap for traditional suppliers.", impact: "neutral" },
    ],
    legal: [
      { point: "CAFE III norms (from FY28) tighten fleet CO2 limits, pushing OEMs to sell more EVs.", impact: "pos" },
      { point: "Localization (DVA) audits under PLI and SPMEPCI create compliance risk for importers.", impact: "neutral" },
    ],
    environmental: [
      { point: "Grid still ~70% coal-fired, but well-to-wheel emissions fall as renewables scale.", impact: "neutral" },
      { point: "Battery recycling rules (EPR under Battery Waste Management Rules) create a circular-material industry.", impact: "pos" },
    ],
  },

  beneficiaries: [
    { key: "tmpv", tier: "core", why: "EV market leader; Nexon/Punch/Curvv/Harrier.ev on dedicated acti.ev platform." },
    { key: "mm", tier: "core", why: "Born-electric BE/XEV SUVs on INGLO platform; fastest share gainer." },
    { key: "sonablw", tier: "direct", why: "Traction motors and differential assemblies; EV is the majority of revenue." },
    { key: "unominda", tier: "direct", why: "EV controllers, chargers and motors with JV partners; broad content per car." },
    { key: "msumi", tier: "direct", why: "~40% of India's harness market; high-voltage harness content per EV is ~2x ICE." },
    { key: "exide", tier: "direct", why: "12 GWh Li-ion cell plant in Bengaluru; first large domestic cell maker." },
    { key: "amararaja", tier: "direct", why: "16 GWh giga-corridor in Telangana for cells and packs." },
    { key: "tataPowerEV", tier: "indirect", why: "One of India's largest public/captive charging networks." },
    { key: "kpit", tier: "indirect", why: "Powertrain, BMS and software-defined-vehicle software for global OEMs." },
    { key: "subros", tier: "indirect", why: "Battery thermal management and EV HVAC systems." },
  ],

  companyNews: [
    { key: "tmpv", date: "Oct 2025", development: "Demerged and listed as a standalone passenger-vehicle company (incl. JLR).", impact: "A pure-play listed EV leader makes India's EV volume story directly investable.", tone: "pos" },
    { key: "mm", date: "2025", development: "BE 6 / XEV 9e ramped; XEV 9S added on the INGLO skateboard.", impact: "Second scale EV platform intensifies price competition and lifts supplier volumes.", tone: "pos" },
    { key: "exide", date: "2025-26", development: "Commissioned first phase of its Bengaluru Li-ion cell giga-factory.", impact: "First meaningful domestic cell supply - reduces import dependence for packs.", tone: "pos" },
    { key: "sonablw", date: "2025", development: "Magnet supply disruption forced alternate sourcing and magnet-light motor work.", impact: "Shows rare-earth risk sits with motor makers first; accelerates localization.", tone: "neg" },
    { key: "amararaja", date: "2025-26", development: "Building out cell lines under its Telangana giga-corridor and LFP technology licences.", impact: "Second domestic cell source; competition should lower pack costs.", tone: "pos" },
    { key: "tataPowerEV", date: "2025-26", development: "Expanded public and captive charging footprint across highways and cities.", impact: "Charging density is a gating factor for adoption beyond metros.", tone: "pos" },
  ],

  risks: [
    { risk: "Rare-earth / cell supply shock from China", mitigant: "Magnet scheme, PLI-ACC giga-plants, magnet-free motor designs", severity: "high" },
    { risk: "Price war erodes OEM and supplier margins", mitigant: "Localization lowers cost; scale players gain share", severity: "medium" },
    { risk: "Slow charging build-out outside metros", mitigant: "PM E-DRIVE Rs 2,000 Cr for chargers; OEM-led networks", severity: "medium" },
    { risk: "PLI-ACC delays leave cells imported for longer", mitigant: "Penalty clauses; private projects outside PLI", severity: "medium" },
  ],
  outlook: {
    bull: "Penetration reaches 12-15% by FY30 as sub-Rs 10 lakh EVs arrive and cell localization cuts pack cost below $80/kWh.",
    base: "Penetration of ~8-10% by FY30 (~6-7 lakh units/yr) with suppliers localizing motors, harnesses and packs.",
    bear: "Tax parity with small ICE cars and supply shocks stall penetration around 5-6%.",
  },
  reading: [
    { title: "Global EV Outlook 2025", source: "International Energy Agency", url: "https://www.iea.org/reports/global-ev-outlook-2025", year: "2025" },
    { title: "Automotive & Assembly insights", source: "McKinsey & Company", url: "https://www.mckinsey.com/industries/automotive-and-assembly/our-insights" },
    { title: "PM E-DRIVE scheme", source: "Ministry of Heavy Industries", url: "https://heavyindustries.gov.in/" },
    { title: "Electric vehicles topic hub", source: "International Energy Agency", url: "https://www.iea.org/topics/electric-vehicles" },
  ],
};
