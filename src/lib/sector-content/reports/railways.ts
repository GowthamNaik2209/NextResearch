import type { SectorReport } from "./types";

export const railways: SectorReport = {
  slug: "railways",
  title: "India Railways & Rolling Stock",
  subtitle: "A state-funded capex cycle shifting from track to trains, safety and signalling",
  asOf: "Oct 2026",

  stance: {
    label: "Steady, budget-led",
    tone: "neutral",
    line: "Capex is near a record but no longer rising fast; value is moving from civil EPC and wagons to trainsets, Kavach and components.",
  },
  keyStats: [
    { label: "Railway capex, FY26 BE", value: "~₹2.65L Cr", sub: "approx. 4x FY14 levels" },
    { label: "Broad-gauge electrified", value: "~99%", sub: "of the BG network" },
    { label: "Freight loading, FY25", value: "~1.6 bn t", sub: "second only to China" },
    { label: "Kavach coverage", value: "<5%", sub: "of ~69,000 route km, approx." },
  ],
  thesis: [
    {
      title: "The spend is large and sticky",
      body: "Rail capex has run at ~₹2.4-2.65L Cr a year since FY24, funded almost entirely by the Centre. It is a policy priority that has survived fiscal tightening.",
    },
    {
      title: "The mix is shifting to trains and safety",
      body: "With electrification done and the DFCs largely complete, incremental money goes to Vande Bharat trainsets, metro coaches, Kavach and station redevelopment.",
    },
    {
      title: "Execution and order flow, not demand, set returns",
      body: "Wagon and EPC players saw revenue fall in FY26 as order inflow slowed. Margins depend on L1 tender pricing, so selectivity matters more than sector beta.",
    },
  ],

  developments: [
    {
      date: "Jan 2026",
      title: "First Vande Bharat sleeper enters service",
      body: "The BEML-built sleeper rake began commercial runs after 2025 trials, opening the long-haul overnight segment to semi-high-speed trainsets.",
      impact: "pos",
      tag: "Rolling stock",
    },
    {
      date: "2025-26",
      title: "Wagon and EPC order inflow slows",
      body: "Fresh wagon tenders thinned and civil awards were spread out, pulling FY26 revenue lower at wagon makers and rail EPC PSUs.",
      impact: "neg",
      tag: "Orders",
    },
    {
      date: "Jul 2025",
      title: "Passenger fares rationalised",
      body: "Indian Railways raised mail/express and AC fares by 1-2 paise/km, its first broad fare increase in about five years.",
      impact: "pos",
      tag: "Pricing",
    },
    {
      date: "Jun 2025",
      title: "Kashmir rail link and Chenab bridge opened",
      body: "The USBRL project, including the world's highest rail arch bridge, connected the Kashmir valley to the national network.",
      impact: "pos",
      tag: "Infrastructure",
    },
    {
      date: "Mar 2025",
      title: "Freight loading crosses 1.6 bn tonnes",
      body: "FY25 loading reached ~1,617 MT, led by coal, iron ore and containers, though rail's modal share is still ~27-28%.",
      impact: "neutral",
      tag: "Freight",
    },
    {
      date: "Jul 2024",
      title: "Kavach 4.0 approved by RDSO",
      body: "The upgraded train-protection spec cleared the way for large rollout tenders on the Delhi-Mumbai and Delhi-Howrah trunk routes.",
      impact: "pos",
      tag: "Safety",
    },
  ],

  overview: {
    narrative: [
      "Indian Railways runs ~69,000 route km, carries ~700 crore passengers and ~1.6 bn tonnes of freight a year, and earns ~₹2.6-2.7L Cr in traffic receipts.",
      "Capex has risen roughly four-fold in a decade, almost all from gross budgetary support; IRFC funds rolling stock, while RVNL, IRCON and private EPC firms build lines.",
      "Operating ratio stays ~98%, so the system relies on the Budget. The next leg is trainsets, metro rolling stock (~1,000 km operational across ~20 cities) and Kavach.",
    ],
    chart: {
      title: "Indian Railways capital expenditure",
      unit: "₹ '000 Cr",
      source: "Union Budget / Ministry of Railways, FY28-30 NextResearch estimates",
      points: [
        { label: "FY20", value: 148 },
        { label: "FY22", value: 190 },
        { label: "FY23", value: 204 },
        { label: "FY24", value: 240 },
        { label: "FY25", value: 252 },
        { label: "FY26BE", value: 265 },
        { label: "FY28P", value: 290, projected: true },
        { label: "FY30P", value: 320, projected: true },
      ],
    },
    snapshot: [
      { label: "Capex growth, FY24-26", value: "~5% CAGR", tone: "neutral" },
      { label: "Operating ratio", value: "~98%", tone: "neg" },
      { label: "Rail share of freight", value: "~27%", tone: "neg" },
      { label: "Vande Bharat services", value: "~150+", tone: "pos" },
      { label: "Kavach route km live", value: "~2,000-3,000", tone: "neutral" },
      { label: "Metro network", value: "~1,000 km", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Wheels, bogies & bearings", zoneIds: ["bogies"], margin: "15-20% EBITDA", moat: "medium", note: "Forged wheels long imported; Titagarh-RKFL plant localises them." },
    { stage: "Traction & braking", zoneIds: ["traction", "braking"], margin: "12-20% EBITDA", moat: "high", note: "Propulsion and brake systems need RDSO approval and long track records." },
    { stage: "Signalling & Kavach", zoneIds: ["signaling"], margin: "20-30% EBITDA", moat: "high", note: "Only a handful of approved Kavach vendors; highest margins in the chain." },
    { stage: "Trainset & wagon integration", zoneIds: ["rolling_stock"], margin: "8-13% EBITDA", moat: "medium", note: "L1 tenders and long maintenance contracts; scale and execution decide returns." },
    { stage: "Track, civil & electrification EPC", zoneIds: ["epc"], margin: "5-10% EBITDA", moat: "low", note: "Largest spend pool but crowded bidding keeps margins thin." },
    { stage: "Financing, ticketing & digital", zoneIds: ["psu"], margin: "Annuity-like", moat: "high", note: "IRFC leasing and IRCTC ticketing are monopolies with regulated returns." },
  ],

  drivers: [
    { title: "Record budget support", metric: "~₹2.5L Cr+", body: "Gross budgetary support funds nearly all rail capex, insulating spend from Railways' thin operating surplus." },
    { title: "Trainset upgrade", metric: "Vande Bharat + sleeper", body: "Orders for chair-car, sleeper and Amrit Bharat trains replace ageing ICF coaches with higher-content trainsets." },
    { title: "Safety mandate", metric: "Kavach 4.0", body: "Train-protection rollout across trunk routes after recent accidents gives signalling vendors a multi-year pipeline." },
    { title: "Urban metro build-out", metric: "~1,000 km live", body: "Metro projects under construction in a dozen-plus cities drive coach, signalling and civil orders." },
  ],
  mix: {
    title: "Indian Railways revenue mix, FY25 (approx.)",
    source: "Ministry of Railways budget documents",
    slices: [
      { label: "Freight", value: 65 },
      { label: "Passenger", value: 28 },
      { label: "Other coaching & sundry", value: 7 },
    ],
  },

  pestle: {
    political: [
      { point: "Rail modernisation and Make in India rolling stock are flagship central priorities with cross-party support.", impact: "pos" },
      { point: "Fares are politically sensitive, keeping passenger losses and dependence on the Budget high.", impact: "neg" },
    ],
    economic: [
      { point: "Freight growth tracks coal, steel and cement output, which remains healthy.", impact: "pos" },
      { point: "Fiscal consolidation caps how much faster rail capex can grow from here.", impact: "neg" },
    ],
    social: [
      { point: "Rising incomes lift demand for AC and premium trains; waitlists stay long on key routes.", impact: "pos" },
      { point: "High-profile accidents raise public pressure for safety spending.", impact: "neutral" },
    ],
    technological: [
      { point: "IGBT propulsion, aluminium trainsets and Kavach raise per-train electronic content.", impact: "pos" },
      { point: "Global OEMs (Alstom, Siemens, Stadler) compete hard on technology for metro and high-speed contracts.", impact: "neutral" },
    ],
    legal: [
      { point: "RDSO approvals and vendor lists create high entry barriers for safety-critical parts.", impact: "pos" },
      { point: "L1 tendering and price-variation clauses can squeeze margins on fixed-price orders.", impact: "neg" },
    ],
    environmental: [
      { point: "Near-full electrification and a net-zero-by-2030 goal favour rail over road freight.", impact: "pos" },
      { point: "Electrified traction still runs on a coal-heavy grid until renewables scale.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "titagarh", tier: "core", why: "Vande Bharat sleeper (with BHEL), metro coaches and wagons; forged-wheel JV with RKFL." },
    { key: "beml", tier: "core", why: "Built the first Vande Bharat sleeper; major metro coach supplier." },
    { key: "hblengineering", tier: "core", why: "Approved Kavach vendor; signalling and train electronics now a large share of revenue." },
    { key: "siemenschain", tier: "direct", why: "Electric locomotives, metro trainsets and signalling; large 9,000 HP loco order." },
    { key: "kernex", tier: "direct", why: "Kavach-class train protection is the core business; revenue scaling rapidly." },
    { key: "jupiterwagons", tier: "direct", why: "Wagons, brakes and wheels; most exposed to the wagon order cycle." },
    { key: "ramkrishnaforgings", tier: "direct", why: "Consortium partner for IR's forged wheel plant." },
    { key: "rvnl", tier: "direct", why: "Largest rail EPC PSU; benefits from line doubling and new-line awards." },
    { key: "irfc", tier: "indirect", why: "Funds rolling stock and projects on lease; growth tied to extra-budgetary borrowing." },
    { key: "irctc", tier: "indirect", why: "Ticketing and catering monopoly that gains from higher passenger volumes and fares." },
  ],

  companyNews: [
    { key: "beml", date: "Jan 2026", development: "First Vande Bharat sleeper rake entered commercial service.", impact: "Validates a domestic sleeper trainset and opens a larger long-haul fleet order pipeline.", tone: "pos" },
    { key: "jupiterwagons", date: "FY26", development: "Revenue fell as wagon deliveries slowed with thinner fresh tenders.", impact: "Shows how cyclical wagon demand is once the post-COVID ordering wave fades.", tone: "neg" },
    { key: "hblengineering", date: "FY26", development: "Profit roughly tripled on Kavach execution.", impact: "Kavach is now a meaningful profit pool for approved signalling vendors.", tone: "pos" },
    { key: "titagarh", date: "2025-26", development: "Vande Bharat sleeper and metro programmes ramped while wagon volumes dipped.", impact: "Mix shift toward passenger trainsets is the key earnings swing factor.", tone: "neutral" },
    { key: "rvnl", date: "FY26", development: "Profit fell as legacy nomination work tapered and competitive bids took over.", impact: "Rail EPC margins are compressing as more work moves to open tendering.", tone: "neg" },
    { key: "kernex", date: "FY26", development: "Revenue more than doubled on Kavach orders.", impact: "Adds vendor capacity needed for a faster national Kavach rollout.", tone: "pos" },
  ],

  risks: [
    { risk: "Rail capex plateaus or is cut in a tight Budget", mitigant: "Safety and trainset spend are priority lines; extra-budgetary funding via IRFC", severity: "high" },
    { risk: "Aggressive L1 bidding compresses margins", mitigant: "Selective bidding; higher-margin signalling and component work", severity: "medium" },
    { risk: "Lumpy order awards cause revenue volatility", mitigant: "Large multi-year trainset and maintenance contracts", severity: "medium" },
    { risk: "Supply bottlenecks in wheels and propulsion", mitigant: "Domestic forged wheel plant; localised IGBT and bogie capacity", severity: "low" },
  ],
  outlook: {
    bull: "Capex climbs past ₹3L Cr by FY28 with large sleeper, metro and Kavach orders lifting both volumes and margins.",
    base: "Capex grows ~5-6% a year; trainset, signalling and component makers outgrow EPC and wagon players.",
    bear: "Budget support flattens, order inflow stays thin and L1 pricing erodes margins across the chain.",
  },
  reading: [
    { title: "The Future of Rail", source: "International Energy Agency", url: "https://www.iea.org/reports/the-future-of-rail", year: "2019" },
    { title: "Indian Railways industry report", source: "IBEF", url: "https://www.ibef.org/industry/indian-railways" },
    { title: "Ministry of Railways portal", source: "Government of India", url: "https://indianrailways.gov.in/" },
    { title: "Union Budget documents", source: "Ministry of Finance", url: "https://www.indiabudget.gov.in/" },
    { title: "Research Designs & Standards Organisation", source: "RDSO, Ministry of Railways", url: "https://rdso.indianrailways.gov.in/" },
  ],
};
