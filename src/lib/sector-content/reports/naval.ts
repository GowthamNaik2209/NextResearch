import type { SectorReport } from "./types";

export const naval: SectorReport = {
  slug: "naval",
  title: "India Naval Shipbuilding",
  subtitle: "A decade-long warship and submarine build-out moving onshore",
  asOf: "Oct 2026",

  stance: {
    label: "Structural tailwind",
    tone: "pos",
    line: "Order books are deep and visible; the next leg depends on P-75I and corvette awards, while stock valuations already price much of it.",
  },
  keyStats: [
    { label: "Ships under construction", value: "~60", sub: "in Indian yards (Navy, 2025)" },
    { label: "Defence production, FY25", value: "₹1.51L Cr", sub: "record; ~18% YoY (MoD)" },
    { label: "Defence exports, FY25", value: "₹23,622 Cr", sub: "up ~12% YoY (MoD)" },
    { label: "Navy fleet goal", value: "175-200 ships", sub: "by ~2035, from ~140 today" },
  ],
  thesis: [
    {
      title: "Multi-year order visibility",
      body: "Frigates, destroyers, corvettes, submarines and support ships are on order or in the pipeline, giving listed yards order books of roughly 4-8x annual revenue.",
    },
    {
      title: "Indigenization moves value onshore",
      body: "Positive indigenization lists and 'Buy (Indian-IDDM)' rules push hull steel, sensors, weapons and machinery to domestic suppliers, not just final assembly.",
    },
    {
      title: "Execution, not demand, is the constraint",
      body: "Dry-dock capacity, skilled labour and imported propulsion decide delivery pace. Yards investing in docks and private partners widen the bottleneck.",
    },
  ],

  developments: [
    {
      date: "Sep 2025",
      title: "₹69,725 Cr shipbuilding package",
      body: "Cabinet approved financial assistance, a ₹25,000 Cr Maritime Development Fund and a cluster-development scheme to scale Indian yards and docks.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Aug 2025",
      title: "Two P-17A frigates commissioned together",
      body: "INS Udaygiri (MDL) and INS Himgiri (GRSE) were commissioned on the same day - the first time ships from two Indian yards entered service together.",
      impact: "pos",
      tag: "Execution",
    },
    {
      date: "Jul 2025",
      title: "DAC clears ~₹1.05L Cr of AoNs",
      body: "Approvals included mine countermeasure vessels, naval surface-to-air missiles and autonomous underwater vessels, all under indigenous categories.",
      impact: "pos",
      tag: "Orders",
    },
    {
      date: "Apr 2025",
      title: "26 Rafale-M deal signed with France",
      body: "The ~₹63,000 Cr government-to-government deal for carrier fighters includes local manufacturing and MRO work for Indian suppliers.",
      impact: "neutral",
      tag: "Procurement",
    },
    {
      date: "Jan 2025",
      title: "Three frontline combatants commissioned",
      body: "Destroyer INS Surat, frigate INS Nilgiri and Scorpene submarine INS Vaghsheer, all built at Mazagon Dock, entered service on one day.",
      impact: "pos",
      tag: "Execution",
    },
    {
      date: "Jan 2025",
      title: "MDL-TKMS picked for P-75I talks",
      body: "MoD moved to negotiate the six-submarine AIP programme (approx. ₹70,000 Cr+) with Mazagon Dock and Germany's TKMS after the rival bid was found non-compliant.",
      impact: "pos",
      tag: "Submarines",
    },
  ],

  overview: {
    narrative: [
      "The Navy has shifted from a buyer's to a builder's navy: nearly all ships on order are being built in India, at four defence PSU yards plus private yards led by L&T.",
      "Spending is lumpy and long-cycle - a frigate takes 6-8 years from contract to delivery - so revenue tracks contracts signed years earlier, smoothing near-term volatility.",
      "Gaps remain in gas turbines, submarine AIP, and some weapons and sensors, which are still imported or licence-built; these are the next indigenization targets.",
    ],
    chart: {
      title: "India defence production (all segments)",
      unit: "₹ '000 Cr",
      source: "Ministry of Defence / DDP; FY29P is the government target",
      points: [
        { label: "FY20", value: 79 },
        { label: "FY21", value: 85 },
        { label: "FY22", value: 95 },
        { label: "FY23", value: 109 },
        { label: "FY24", value: 127 },
        { label: "FY25", value: 151 },
        { label: "FY29P", value: 300, projected: true },
      ],
    },
    snapshot: [
      { label: "Defence capital outlay, FY26 BE", value: "~₹1.80L Cr", tone: "pos" },
      { label: "Share of capital buys from India", value: "~75%", tone: "pos" },
      { label: "Typical frigate build time", value: "6-8 years", tone: "neutral" },
      { label: "Listed shipyard order books", value: "~4-8x revenue", tone: "pos" },
      { label: "Gas-turbine propulsion", value: "Mostly imported", tone: "neg" },
      { label: "Export orders share", value: "Small, rising", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Hull steel & special alloys", zoneIds: ["hull"], margin: "10-15% EBITDA", moat: "high", note: "Warship-grade DMR steel and titanium/maraging alloys have few qualified makers." },
    { stage: "Propulsion & machinery", zoneIds: ["propulsion", "components"], margin: "10-15% EBITDA", moat: "medium", note: "Gas turbines still imported; gensets, gearboxes, pumps and HVAC are localizing." },
    { stage: "Weapons & ammunition", zoneIds: ["combat"], margin: "15-25% EBITDA", moat: "high", note: "Missiles, torpedoes and explosives sit with a handful of licensed producers." },
    { stage: "Sensors & electronics", zoneIds: ["electronics"], margin: "20-30% EBITDA", moat: "high", note: "Radars, sonars, EW and combat management - the richest profit pool per ship." },
    { stage: "Shipyards & integration", zoneIds: ["shipyard"], margin: "10-20% EBITDA", moat: "high", note: "Few yards can build warships; margins improve as legacy fixed-price contracts roll off." },
  ],

  drivers: [
    { title: "Fleet expansion", metric: "175-200 ships", body: "Navy targets a larger fleet by ~2035 to cover the Indian Ocean, replacing ageing frigates, minesweepers and submarines." },
    { title: "Submarine programmes", metric: "₹70,000 Cr+", body: "P-75I conventional submarines and follow-on Scorpenes are among the largest single shipbuilding contracts in the pipeline." },
    { title: "Indigenization rules", metric: "~75% domestic", body: "A rising share of the capital acquisition budget is earmarked for Indian industry, with positive lists banning imports of many items." },
    { title: "Exports & commercial", metric: "₹23,622 Cr", body: "Defence exports and the commercial shipbuilding push give yards a second order stream beyond the Indian Navy." },
  ],
  mix: {
    title: "Union defence budget split, FY26 BE (approx.)",
    source: "Ministry of Defence / Union Budget 2025-26",
    slices: [
      { label: "Revenue (incl. pay)", value: 46 },
      { label: "Capital outlay", value: 26 },
      { label: "Pensions", value: 24 },
      { label: "Civil organisations", value: 4 },
    ],
  },

  pestle: {
    political: [
      { point: "Indian Ocean security and China's naval build-up keep shipbuilding a bipartisan priority.", impact: "pos" },
      { point: "Large awards hinge on government decisions that can slip by years.", impact: "neg" },
    ],
    economic: [
      { point: "Capital outlay rising ~10% a year gives steady funding for multi-year contracts.", impact: "pos" },
      { point: "Fixed-price contracts expose yards to steel, labour and currency overruns.", impact: "neg" },
    ],
    social: [
      { point: "Shipyards create large skilled-job clusters in Mumbai, Kochi, Kolkata and Visakhapatnam.", impact: "pos" },
      { point: "Shortage of experienced welders, fitters and naval architects limits ramp-up.", impact: "neg" },
    ],
    technological: [
      { point: "Indigenous radars, sonars and combat systems now ship on new frontline platforms.", impact: "pos" },
      { point: "Gas turbines, AIP and some weapons still depend on foreign partners.", impact: "neg" },
    ],
    legal: [
      { point: "DAP 'Buy (Indian-IDDM)' preference and positive indigenization lists favour local suppliers.", impact: "pos" },
      { point: "Offset and transfer-of-technology terms add contract complexity and delays.", impact: "neutral" },
    ],
    environmental: [
      { point: "Navy is trialling cleaner propulsion and greener ship designs.", impact: "neutral" },
      { point: "Coastal yard expansion needs environmental and coastal-zone clearances.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "mazagondock", tier: "core", why: "Largest warship yard; destroyers, frigates, Scorpenes and the P-75I lead bidder." },
    { key: "grse", tier: "core", why: "Frigates, ASW corvettes and survey vessels; fast-growing order book." },
    { key: "cochinshipyard", tier: "core", why: "Built INS Vikrant; ASW shallow-water craft plus commercial and repair business." },
    { key: "bel_naval", tier: "direct", why: "Radars, sonars, EW and combat management systems on almost every new warship." },
    { key: "lt_naval", tier: "direct", why: "Leading private warship builder at Kattupalli; also weapons and systems integration." },
    { key: "bdl", tier: "direct", why: "Naval missiles and the Varunastra heavyweight torpedo." },
    { key: "sail", tier: "indirect", why: "Sole domestic producer of DMR-249 warship-grade steel plate." },
    { key: "midhani", tier: "indirect", why: "Titanium and special alloys for submarine and missile applications." },
    { key: "datapatterns", tier: "indirect", why: "Radar and EW electronics for naval platforms." },
    { key: "astramicrowave", tier: "indirect", why: "RF and T/R modules for naval radar subsystems." },
  ],

  companyNews: [
    { key: "mazagondock", date: "Jan 2025", development: "Selected with TKMS for P-75I negotiations; delivered the sixth Scorpene, INS Vaghsheer.", impact: "Keeps India's submarine build base at one yard and anchors the next decade of orders.", tone: "pos" },
    { key: "grse", date: "Aug 2025", development: "INS Himgiri, its first P-17A stealth frigate, was commissioned.", impact: "Proves a second yard can deliver frontline frigates, widening Navy capacity.", tone: "pos" },
    { key: "lt_naval", date: "Jan 2025", development: "L&T-Navantia bid for P-75I was reported non-compliant.", impact: "Private yards stay second-tier on submarines for now.", tone: "neg" },
    { key: "cochinshipyard", date: "2025", development: "Signed a cooperation pact with Korea's HD Hyundai on shipbuilding and design.", impact: "Brings large-yard know-how that can lift capacity and productivity.", tone: "pos" },
    { key: "bharatforge_naval", date: "2025", development: "Won a ₹425 Cr MoD contract for 12 Indian Navy turbine generators.", impact: "Shows ship machinery shifting from imports to Indian private suppliers.", tone: "pos" },
  ],

  risks: [
    { risk: "Delays in large awards such as P-75I", mitigant: "Existing order books cover several years of revenue", severity: "high" },
    { risk: "Cost overruns on fixed-price contracts", mitigant: "Price-variation clauses and better project controls", severity: "medium" },
    { risk: "Dependence on imported propulsion and weapons", mitigant: "Licence production and indigenous turbine and AIP programmes", severity: "medium" },
    { risk: "Valuations run ahead of execution", mitigant: "Earnings growth from order conversion", severity: "medium" },
  ],
  outlook: {
    bull: "P-75I, next-generation corvettes and more destroyers are signed by FY28, with exports adding a second growth stream.",
    base: "Steady delivery of existing orders with 1-2 large awards a year; yard revenues grow ~15% a year.",
    bear: "Major awards slip and fixed-price overruns hit margins, flattening growth after current deliveries.",
  },
  reading: [
    { title: "Indian Navy official site", source: "Indian Navy", url: "https://www.indiannavy.gov.in/" },
    { title: "Ministry of Defence", source: "Government of India", url: "https://www.mod.gov.in/" },
    { title: "Department of Defence Production", source: "Ministry of Defence", url: "https://www.ddpmod.gov.in/" },
    { title: "Trends in World Military Expenditure, 2024", source: "SIPRI", url: "https://www.sipri.org/publications/2025/sipri-fact-sheets/trends-world-military-expenditure-2024", year: "2025" },
    { title: "Arms Transfers Database", source: "SIPRI", url: "https://www.sipri.org/databases/armstransfers" },
  ],
};
