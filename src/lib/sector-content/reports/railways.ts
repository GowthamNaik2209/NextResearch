import type { SectorReport } from "./types";

export const railways: SectorReport = {
  slug: "railways",
  title: "India Railways & Rolling Stock",
  subtitle: "A state-funded capex cycle shifting from track to trains, safety and signalling",
  asOf: "Nov 2026",

  stance: {
    label: "Budget-led, rising again",
    tone: "neutral",
    line: "Capex was flat in FY26 but is budgeted at a record for FY27 (~10.5% higher); value is moving from civil EPC and wagons to trainsets, Kavach and components.",
  },
  keyStats: [
    { label: "Railway capex, FY27 BE", value: "~₹2.93L Cr", sub: "record; ~10.5% above FY26 RE (Union Budget, Feb 2026)" },
    { label: "Broad-gauge electrified", value: "~99%", sub: "of the BG network" },
    { label: "Freight loading, FY26", value: "~1.67 bn t", sub: "record, up ~3% on FY25; second only to China" },
    { label: "Kavach coverage", value: "<5%", sub: "of ~69,000 route km, approx." },
  ],
  thesis: [
    {
      title: "The spend is large and sticky",
      body: "Rail capex ran at ~₹2.6-2.7L Cr a year in FY24-26 and is budgeted at a record ~₹2.93L Cr for FY27, ~95% funded by the Centre. It is a policy priority that has survived fiscal tightening.",
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
      date: "Apr 2026",
      title: "Freight loading hits a record 1.67 bn tonnes",
      body: "Indian Railways loaded a record 1,670 MT of freight in FY26, up 3.25% on FY25 (Ministry of Railways, 1 Apr 2026), led by coal, iron ore and cement; rail's share of freight is still ~27%.",
      impact: "pos",
      tag: "Freight",
    },
    {
      date: "Feb 2026",
      title: "Budget lifts rail capex to a record ₹2.93L Cr",
      body: "Union Budget 2026-27 set FY27 rail capex at ₹2,93,030 Cr, ~10.5% above FY26 RE, with ~95% from budget support. It proposed seven high-speed rail corridors (~4,000 km, ~₹16L Cr of investment, linking cities such as Mumbai, Pune, Hyderabad, Bengaluru, Chennai and Varanasi) and a new east-west Dankuni-Surat dedicated freight corridor (PRS, Feb 2026).",
      impact: "pos",
      tag: "Budget",
    },
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
  ],

  overview: {
    narrative: [
      "Indian Railways runs ~69,000 route km, carries ~700 crore passengers and ~1.67 bn tonnes of freight a year (FY26), and earns ~₹2.6-2.7L Cr in traffic receipts.",
      "Capex has risen roughly four-fold in a decade, almost all from gross budgetary support; IRFC funds rolling stock, while RVNL, IRCON and private EPC firms build lines.",
      "Operating ratio stays ~98%, so the system relies on the Budget. The next leg is trainsets, metro rolling stock (~1,000 km operational across ~20 cities) and Kavach.",
    ],
    chart: {
      title: "Indian Railways capital expenditure (all sources)",
      unit: "₹ '000 Cr",
      source: "Union Budget / Ministry of Railways; FY24 Economic Survey 2024-25; FY25 actual, FY26 RE and FY27 BE from PRS (Feb 2026); FY28P and FY30P are NextResearch projections, not budget figures",
      points: [
        { label: "FY20", value: 148 },
        { label: "FY23", value: 204 },
        { label: "FY24", value: 262 },
        { label: "FY25", value: 269 },
        { label: "FY26RE", value: 265 },
        { label: "FY27BE", value: 293 },
        { label: "FY28P", value: 315, projected: true },
        { label: "FY30P", value: 360, projected: true },
      ],
    },
    snapshot: [
      { label: "Capex, FY27 BE vs FY26 RE", value: "+10.5%", tone: "pos" },
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
    { title: "Record budget support", metric: "~₹2.78L Cr (FY27 BE)", body: "Budget support funds ~95% of rail capex, insulating spend from Railways' thin operating surplus; it rises ~10% in FY27 after a flat FY26." },
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
    bull: "Capex climbs well past ₹3L Cr by FY28 as the high-speed and Dankuni-Surat freight corridors start drawing money, with large sleeper, metro and Kavach orders lifting both volumes and margins.",
    base: "Capex grows ~7% a year from the FY27 budget level; trainset, signalling and component makers outgrow EPC and wagon players.",
    bear: "Budget support flattens, order inflow stays thin and L1 pricing erodes margins across the chain.",
  },
  reading: [
    { title: "The Future of Rail", source: "International Energy Agency", url: "https://www.iea.org/reports/the-future-of-rail", year: "2019" },
    { title: "Indian Railways industry report", source: "IBEF", url: "https://www.ibef.org/industry/indian-railways" },
    { title: "Ministry of Railways portal", source: "Government of India", url: "https://indianrailways.gov.in/" },
    { title: "Union Budget documents", source: "Ministry of Finance", url: "https://www.indiabudget.gov.in/" },
    { title: "Demand for Grants 2026-27 Analysis: Railways", source: "PRS Legislative Research, Feb 2026", url: "https://prsindia.org/budgets/parliament/demand-for-grants-2026-27-analysis-railways" },
    { title: "Research Designs & Standards Organisation", source: "RDSO, Ministry of Railways", url: "https://rdso.indianrailways.gov.in/" },
  ],
};
