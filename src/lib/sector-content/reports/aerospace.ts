import type { SectorReport } from "./types";

export const aerospace: SectorReport = {
  slug: "aerospace",
  title: "India Aerospace Components & MRO",
  subtitle: "From build-to-print subcontracting to qualified engine, structures and MRO capacity",
  asOf: "Oct 2026",

  stance: {
    label: "Structural tailwind",
    tone: "pos",
    line: "Defence indigenisation and global China+1 sourcing compound together; value accrues to qualified suppliers with long-cycle contracts.",
  },
  keyStats: [
    { label: "Defence production, FY26", value: "₹1.78L Cr", sub: "record; +15.6% YoY (MoD)" },
    { label: "Defence exports, FY26", value: "₹38,424 Cr", sub: "~63% YoY growth (MoD)" },
    { label: "Aircraft on order", value: "~1,700+", sub: "Indian airlines, approx." },
    { label: "Indian MRO spend sent abroad", value: "~85%", sub: "approx., engines and components" },
  ],
  thesis: [
    {
      title: "Two demand engines run at once",
      body: "Domestic programmes (Tejas Mk1A, LCH, C-295, engine co-production) and global OEM sourcing diversification both add orders to the same supplier base.",
    },
    {
      title: "Qualification is the moat",
      body: "Aero parts take 2-5 years to qualify and then run for decades on a platform. Suppliers already approved by Airbus, Safran, GE or Rolls-Royce earn sticky, rising share.",
    },
    {
      title: "MRO is the under-built profit pool",
      body: "India's fast-growing fleet still sends most engine and component work overseas. GST cuts and OEM-backed shops like Safran's LEAP facility start to onshore it.",
    },
  ],

  developments: [
    {
      date: "Nov 2025",
      title: "Safran opens LEAP engine MRO in Hyderabad",
      body: "Safran's large LEAP engine shop, inaugurated by the PM, is the first OEM-owned engine MRO in India and targets IndiGo and Air India's A320neo/737 MAX fleets.",
      impact: "pos",
      tag: "MRO",
    },
    {
      date: "Sep 2025",
      title: "HAL signs for 97 more Tejas Mk1A",
      body: "MoD contracted 97 LCA Mk1A jets worth ~₹62,000 Cr, taking Mk1A orders to 180 and extending visibility for HAL and its structures and electronics suppliers.",
      impact: "pos",
      tag: "Defence",
    },
    {
      date: "May 2025",
      title: "AMCA execution model approved",
      body: "The fifth-generation fighter programme opened to private-sector bids, alone or with partners, signalling a larger role for private primes beyond HAL.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "2025",
      title: "GE F404 engine deliveries lag",
      body: "Supply-chain delays at GE slowed engine deliveries for Tejas Mk1A, pushing HAL's induction schedule out by over a year.",
      impact: "neg",
      tag: "Supply chain",
    },
    {
      date: "Oct 2024",
      title: "C-295 final assembly line in Vadodara",
      body: "Tata-Airbus opened India's first private military aircraft FAL; 40 of 56 aircraft will be built locally, seeding a private aerostructures base.",
      impact: "pos",
      tag: "Manufacturing",
    },
  ],

  overview: {
    narrative: [
      "India's aerospace base spans materials (titanium, superalloys), forgings and castings, machined structures, engine parts, avionics and MRO, anchored by HAL as the main prime.",
      "Defence remains the larger demand pool, but civil work is rising fast: Airbus and Boeing each source roughly $1bn+ a year from India, and engine OEMs are qualifying Indian blade and casting makers.",
      "The gaps are upstream and downstream - aero-grade alloys, engine hot-section know-how and heavy engine MRO - where most value still sits outside India.",
    ],
    chart: {
      title: "India defence exports",
      unit: "₹ Cr",
      source: "Ministry of Defence (PIB); FY29P is the government's ₹50,000 Cr target",
      points: [
        { label: "FY20", value: 9115 },
        { label: "FY21", value: 8434 },
        { label: "FY22", value: 12815 },
        { label: "FY23", value: 15920 },
        { label: "FY24", value: 21083 },
        { label: "FY25", value: 23622 },
        { label: "FY26", value: 38424 },
        { label: "FY29P", value: 50000, projected: true },
      ],
    },
    snapshot: [
      { label: "Defence production CAGR, FY20-25", value: "~14%", tone: "pos" },
      { label: "Private share of defence output", value: "~23%", tone: "neutral" },
      { label: "Indian MRO market", value: "~$2-2.5bn", tone: "neutral" },
      { label: "GST on MRO services", value: "5%", tone: "pos" },
      { label: "Aero-engine localisation", value: "Low", tone: "neg" },
      { label: "Defence export target, FY29", value: "₹50,000 Cr", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Alloys, forgings & castings", zoneIds: ["forgings"], margin: "20-30% EBITDA", moat: "high", note: "Titanium and superalloy melting and casting are scarce, slow-to-qualify capabilities." },
    { stage: "Aerostructures & landing gear", zoneIds: ["structures", "landing_gear"], margin: "12-20% EBITDA", moat: "medium", note: "Build-to-print machining scales with OEM rates; margins rise with assembly content." },
    { stage: "Engine components", zoneIds: ["engine"], margin: "25-35% EBITDA", moat: "high", note: "Blades and hot-section parts carry the richest margins and longest approvals." },
    { stage: "Avionics & mission systems", zoneIds: ["avionics"], margin: "20-30% EBITDA", moat: "high", note: "IP-led electronics designed into platforms; indigenisation lists favour domestic players." },
    { stage: "Primes & integration", zoneIds: ["integration"], margin: "~25-30% EBITDA (HAL)", moat: "high", note: "Nominated primes hold multi-decade platform orders and pass work down the chain." },
    { stage: "MRO services", zoneIds: ["mro"], margin: "15-25% EBITDA", moat: "medium", note: "Annuity revenue over a 25-30 year aircraft life; engine MRO is the largest slice." },
  ],

  drivers: [
    { title: "Defence indigenisation", metric: "₹3L Cr", body: "FY29 production target, backed by positive indigenisation lists and ~75% of capital procurement reserved for domestic industry." },
    { title: "Airline fleet expansion", metric: "~1,700+ jets", body: "IndiGo and Air India order books will roughly double India's ~800-aircraft fleet over a decade, lifting MRO and spares demand." },
    { title: "Global China+1 sourcing", metric: "$1bn+ each", body: "Airbus and Boeing annual India sourcing keeps rising as OEMs de-risk supply chains and chase cost." },
    { title: "Engine localisation", metric: "F414 / AMCA", body: "GE-HAL F414 co-production and a future AMCA engine pull hot-section parts and special alloys onshore." },
  ],
  mix: {
    title: "India civil MRO spend by segment (approx.)",
    source: "Industry estimates (MoCA / FICCI), approx.",
    slices: [
      { label: "Engine", value: 45 },
      { label: "Components", value: 22 },
      { label: "Line maintenance", value: 18 },
      { label: "Airframe / heavy checks", value: 15 },
    ],
  },

  pestle: {
    political: [
      { point: "Atmanirbhar Bharat in defence, with import embargo lists and domestic-procurement reservation, directs orders to Indian firms.", impact: "pos" },
      { point: "Dependence on US and European engine OEMs exposes programmes to export controls and allocation decisions.", impact: "neg" },
    ],
    economic: [
      { point: "Labour-cost advantage of ~40-60% vs Western suppliers supports export-led machining and engineering.", impact: "pos" },
      { point: "Long qualification cycles tie up working capital before revenue scales.", impact: "neg" },
    ],
    social: [
      { point: "Large engineering talent pool feeds design services and precision manufacturing.", impact: "pos" },
      { point: "Shortage of licensed aircraft engineers and skilled machinists constrains MRO and shop-floor scaling.", impact: "neg" },
    ],
    technological: [
      { point: "Additive manufacturing and composites open new entry points for younger Indian suppliers.", impact: "pos" },
      { point: "Engine hot-section and single-crystal blade technology remain largely imported.", impact: "neg" },
    ],
    legal: [
      { point: "DAP 2020 and liberalised FDI (74% automatic route) ease JVs with global primes.", impact: "pos" },
      { point: "DGCA and OEM certification requirements add time and cost to new MRO capacity.", impact: "neutral" },
    ],
    environmental: [
      { point: "Fuel-efficient engines (LEAP, GTF) drive fleet renewal and new-engine MRO demand.", impact: "pos" },
      { point: "SAF mandates and CORSIA add cost pressure on airlines, a second-order demand risk.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "hal_prime", tier: "core", why: "India's main aircraft prime and largest MRO; Tejas, LCH and helicopter orders give multi-year visibility." },
    { key: "bel_aero", tier: "core", why: "Largest defence electronics PSU; radar, EW and avionics on most Indian platforms." },
    { key: "azadengineering_aero", tier: "direct", why: "Turbine and compressor blades for GE, Rolls-Royce, Siemens Energy and others under long contracts." },
    { key: "ptcindustries", tier: "direct", why: "Titanium and superalloy castings; new Lucknow aerospace foundry serves Safran and defence." },
    { key: "bharatforge_aero", tier: "direct", why: "Structural and engine forgings for global OEMs plus defence platforms." },
    { key: "datapatterns_aero", tier: "direct", why: "Radar, EW and avionics electronics with high in-house design content." },
    { key: "midhani_aero", tier: "direct", why: "Sole domestic titanium and superalloy producer for strategic programmes." },
    { key: "unimech", tier: "indirect", why: "Precision tooling and machined parts exported to aero OEMs and their tier-1s." },
    { key: "dynamatic", tier: "indirect", why: "Airbus and Boeing aerostructures supplier with growing assembly content." },
    { key: "mtartech_aero", tier: "indirect", why: "Precision engine and fuel-system components, plus space engine parts." },
  ],

  companyNews: [
    { key: "hal_prime", date: "Sep 2025", development: "Signed ~₹62,000 Cr contract for 97 Tejas Mk1A fighters.", impact: "Extends order book to well over ₹1.5L Cr and secures a decade of supplier work.", tone: "pos" },
    { key: "hal_prime", date: "Nov 2025", development: "Agreed with GE for 113 more F404 engines for Tejas Mk1A.", impact: "Removes a key engine-supply bottleneck for the expanded Tejas programme.", tone: "pos" },
    { key: "azadengineering_aero", date: "2025", development: "Added multi-year blade supply contracts with global aero and energy engine OEMs.", impact: "Shows Indian suppliers moving into hot-section parts, the highest-value engine work.", tone: "pos" },
    { key: "ptcindustries", date: "2025", development: "Ramped its Lucknow aerospace castings and titanium remelting complex.", impact: "Builds rare domestic capacity for aero-grade titanium and superalloy parts.", tone: "pos" },
    { key: "datapatterns_aero", date: "2026", development: "Acquired ST Advanced Composites to add aerostructure composites.", impact: "Signals electronics players broadening into structures for platform-level content.", tone: "pos" },
    { key: "aequs", date: "Dec 2025", development: "Listed on the exchanges after its IPO; aerostructures for Airbus, Boeing and Safran.", impact: "Expands the listed pool of pure-play aerospace suppliers, though still loss-making.", tone: "neutral" },
  ],

  risks: [
    { risk: "Engine and part supply delays from global OEMs", mitigant: "Engine co-production (F414), alternate sourcing, buffer inventory", severity: "high" },
    { risk: "Defence order slippage or budget reallocation", mitigant: "Multi-year contracts and export diversification", severity: "medium" },
    { risk: "Rich valuations price in flawless execution", mitigant: "Long order books; earnings growth catching up", severity: "medium" },
    { risk: "Customer concentration on a few OEMs or HAL", mitigant: "Broadening across civil, defence and energy end markets", severity: "medium" },
  ],
  outlook: {
    bull: "Defence output hits the ₹3L Cr FY29 target, an Indian engine programme starts, and engine MRO onshores at scale.",
    base: "Defence production grows ~12-15% a year and civil exports compound, with qualified suppliers growing revenue 20%+.",
    bear: "Engine supply delays and order slippages push programmes right, compressing returns on new capacity.",
  },
  reading: [
    { title: "Department of Defence Production", source: "Ministry of Defence", url: "https://www.ddpmod.gov.in/" },
    { title: "Civil aviation policy and MRO", source: "Ministry of Civil Aviation", url: "https://www.civilaviation.gov.in/" },
    { title: "Aerospace & defense industry insights", source: "Deloitte Insights", url: "https://www2.deloitte.com/us/en/insights/industry/aerospace-defense.html" },
    { title: "Industry reports and policy", source: "Society of Indian Defence Manufacturers", url: "https://www.sidm.in/" },
    { title: "Airline industry economics", source: "IATA", url: "https://www.iata.org/en/publications/economics/" },
  ],
};
