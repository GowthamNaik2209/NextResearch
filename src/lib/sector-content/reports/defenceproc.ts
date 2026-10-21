// Defence Procurement (DAC approvals): 10-slide research deck.
import type { SectorReport } from "./types";

export const defenceproc: SectorReport = {
  slug: "defenceproc",
  title: "India Defence Procurement",
  subtitle: "From DAC approvals to signed orders - who builds what India's forces buy",
  asOf: "Oct 2026",

  stance: {
    label: "Positive, priced in",
    tone: "pos",
    line: "Record approvals and a 75% domestic budget reserve give Indian makers years of demand; the gap between approval and contract, engine supply and high valuations are the catch.",
  },
  keyStats: [
    { label: "DAC approvals (AoN), 2026 so far", value: "~Rs 7.6 lakh Cr", sub: "Feb, Mar, Jul and Sep meetings (MoD/PIB)" },
    { label: "Capital acquisition budget, FY27 BE", value: "Rs 1.85 lakh Cr", sub: "~24% above FY26 BE; 75% reserved for Indian industry (PIB)" },
    { label: "Contracts signed vs approved, FY26", value: "Rs 2.28 vs 6.81 lakh Cr", sub: "503 contracts; 109 AoNs (MoD)" },
    { label: "Defence production, FY26", value: "Rs 1.78 lakh Cr", sub: "+15.6%; private share ~24% (PIB)" },
  ],
  thesis: [
    {
      title: "Approvals are the start, not the order",
      body: "An Acceptance of Necessity (AoN) lets the services issue tenders; trials, negotiation and finance approval follow. The rules allow ~74-118 weeks to contract and big deals often take longer. Track contracts signed, not AoN headlines.",
    },
    {
      title: "Policy routes the money to Indian makers",
      body: "Buy (Indian-IDDM) is the top-priority category, 75% of the FY27 capital acquisition budget is reserved for domestic industry, and import-ban lists cover 5,400+ DPSU items. About 98% of the 7 Sep 2026 approvals are to be sourced in India.",
    },
    {
      title: "Electronics, missiles and ammunition convert fastest",
      body: "These programmes are already proven, mostly indigenous and repeat. Platforms (fighters, submarines) are bigger but slower, and depend on imported engines - GE delivered 6 of 11 promised F404 engines to HAL in FY26.",
    },
  ],

  developments: [
    {
      date: "7 Sep 2026",
      title: "DAC approves Rs 1.10 lakh crore, ~98% from Indian industry",
      body: "Army: CBRN recce vehicles, high-mobility vehicles, mine layers, Advanced Light Helicopters, trawl tanks, Sarvatra bridges. Navy: Arudhra radars and marine gas turbines (design, development, purchase). Air Force: upgrades plus a ground-based jammer and secure access cards.",
      impact: "pos",
      tag: "DAC",
    },
    {
      date: "18 Aug 2026",
      title: "Sixth Positive Indigenisation List notified",
      body: "The Department of Defence Production listed 405 more items (389 DPSU, 16 Coast Guard) worth ~Rs 3,070 crore that must be bought from Indian suppliers, on top of 5,012 items in the first five DPSU lists.",
      impact: "pos",
      tag: "Import ban",
    },
    {
      date: "3 Jul 2026",
      title: "DAC clears ~Rs 52,000 crore for air defence and drones",
      body: "AoNs for MRSAM, V-SHORADS, the man-portable anti-tank missile, an active protection system for tanks, jet-powered kamikaze drones and the AKASH TARANG anti-drone EW system; naval mines and shipborne drones; high-altitude pseudo-satellites for the IAF.",
      impact: "pos",
      tag: "DAC",
    },
    {
      date: "17 Jun 2026",
      title: "Defence production hits a record Rs 1.78 lakh crore",
      body: "FY26 output rose 15.6%. DPSUs and other PSUs made ~76%, private companies ~24% (an all-time high of ~Rs 42,000 crore). Exports also hit a record Rs 38,424 crore (+63%) in FY26.",
      impact: "pos",
      tag: "Industry",
    },
    {
      date: "2 Apr 2026",
      title: "FY26: Rs 6.81 lakh crore approved, Rs 2.28 lakh crore contracted",
      body: "The MoD signed 503 capital contracts and spent its full FY26 capital outlay of Rs 1.86 lakh crore (revised estimate, raised from Rs 1.80 lakh crore at budget; FY27 budgets Rs 2.19 lakh crore), while approvals (109 AoNs) were nearly four times FY25's Rs 1.76 lakh crore - a large pipeline still to be converted.",
      impact: "neutral",
      tag: "Contracts",
    },
    {
      date: "Feb 2026",
      title: "114 Rafale approval and draft DAP 2026",
      body: "On 12 Feb the DAC approved ~Rs 3.60 lakh crore including 114 Rafale fighters (about 90 to be built in India) and six P-8I aircraft. The draft Defence Acquisition Procedure 2026 (10 Feb) promises fewer categories and higher indigenous content; it was not yet notified as of Oct 2026.",
      impact: "neutral",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "India's capital purchases follow the Defence Acquisition Procedure (DAP 2020). The Defence Acquisition Council, chaired by the Defence Minister, grants an Acceptance of Necessity; the services then issue tenders, run trials, negotiate and seek finance or Cabinet approval before a contract is signed. Delivery then takes years.",
      "Policy has steadily tilted this money toward Indian makers: Buy (Indian-IDDM) - Indian-designed, developed and made with at least 50% indigenous content - is the top category, import-ban lists cover thousands of items, and 75% of the FY27 capital acquisition budget is ring-fenced for domestic industry.",
      "The result is record approvals (Rs 6.81 lakh crore in FY26) and record production (Rs 1.78 lakh crore), with the private sector's share slowly rising. The constraint has moved from demand to execution: trials, engines, supply chains and factory capacity.",
    ],
    chart: {
      title: "Indian defence production",
      unit: "Rs lakh crore",
      source: "MoD / PIB releases (latest revised figures); FY29T is the government's Rs 3 lakh crore production target",
      points: [
        { label: "FY21", value: 0.85 },
        { label: "FY22", value: 0.95 },
        { label: "FY23", value: 1.09 },
        { label: "FY24", value: 1.27 },
        { label: "FY25", value: 1.54 },
        { label: "FY26", value: 1.78 },
        { label: "FY29T", value: 3.0, projected: true },
      ],
    },
    snapshot: [
      { label: "MoD budget, FY27 (PIB)", value: "Rs 7.85 lakh Cr, +15.2%", tone: "pos" },
      { label: "Capital outlay, FY27", value: "Rs 2.19 lakh Cr (+21.8%)", tone: "pos" },
      { label: "Reserved for domestic industry, FY27", value: "Rs 1.39 lakh Cr (75%)", tone: "pos" },
      { label: "Contracts / approvals, FY26", value: "~33%", tone: "neg" },
      { label: "Defence exports, FY26", value: "Rs 38,424 Cr; target Rs 50,000 Cr by 2029", tone: "pos" },
      { label: "Acquisition procedure", value: "DAP 2020 (DAP 2026 in draft)", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Special materials & parts", zoneIds: ["materials", "aerostructures"], margin: "15-30% EBITDA", moat: "high", note: "Superalloys, titanium, forgings and engine parts; slow qualification protects incumbents." },
    { stage: "Electronics & sub-systems", zoneIds: ["radars_ew", "subsystems"], margin: "20-35% EBITDA", moat: "high", note: "Design-led radars, EW and avionics; the most indigenised and highest-margin slice." },
    { stage: "Ammunition & energetics", zoneIds: ["ammunition"], margin: "20-30% EBITDA", moat: "medium", note: "Consumable, repeat orders; integrated explosives makers earn the most." },
    { stage: "Missiles, drones & land systems", zoneIds: ["missiles", "drones", "artillery", "vehicles"], margin: "10-25% EBITDA", moat: "medium", note: "DRDO designs, production agencies build; private primes now win guns and vehicles." },
    { stage: "Aircraft & warships", zoneIds: ["aircraft", "naval"], margin: "10-30% EBITDA", moat: "high", note: "Largest orders and longest execution; near-monopoly primes, but engines and imports set the pace." },
  ],

  drivers: [
    { title: "Record approvals", metric: "Rs 6.81 lakh Cr AoN in FY26", body: "Nearly 4x FY25; 2026 rounds added ~Rs 7.6 lakh crore more, led by fighters, air defence and drones." },
    { title: "Domestic reserve", metric: "75% of capital acquisition", body: "Rs 1.39 lakh crore of the FY27 acquisition budget can only be spent with Indian industry." },
    { title: "Import bans", metric: "5,400+ DPSU items", body: "Six Positive Indigenisation Lists force primes to buy parts, sub-systems and spares in India." },
    { title: "Exports", metric: "Rs 38,424 Cr, +63% (FY26)", body: "Shells, rockets, guns and air defence sell abroad, smoothing Indian budget timing; target Rs 50,000 crore by 2029." },
  ],
  mix: {
    title: "Where the FY27 defence budget goes",
    source: "PIB, Defence in Union Budget 2026-27",
    slices: [
      { label: "Capital (new equipment)", value: 28 },
      { label: "Pay & allowances", value: 26.4 },
      { label: "Pensions", value: 21.8 },
      { label: "Operations & upkeep", value: 20.2 },
      { label: "Civil organisations", value: 3.6 },
    ],
  },

  pestle: {
    political: [
      { point: "Bipartisan push for self-reliance; Operation Sindoor (May 2025) raised the priority of air defence, drones and ammunition.", impact: "pos" },
      { point: "Big deals need Cabinet Committee on Security approval, which can take months (QRSAM, P75(I)).", impact: "neg" },
    ],
    economic: [
      { point: "Capital acquisition budget up ~24% to Rs 1.85 lakh crore in FY27 (BE), after the MoD spent its full Rs 1.86 lakh crore FY26 capital outlay.", impact: "pos" },
      { point: "Defence still competes with other spending; a flat budget would slow new contracts.", impact: "neg" },
    ],
    social: [
      { point: "Strong public support for domestic weapons after recent conflicts.", impact: "pos" },
      { point: "Shortage of skilled engineers and technicians for electronics, propulsion and precision manufacturing.", impact: "neg" },
    ],
    technological: [
      { point: "DRDO systems (Akash, Astra, QRSAM, Arudhra) are maturing into bulk production.", impact: "pos" },
      { point: "Engines, seekers, GaN chips and some propellant inputs remain imported.", impact: "neg" },
    ],
    legal: [
      { point: "DAP 2020 categories and indigenous-content thresholds (50%+ for IDDM) favour Indian-owned vendors.", impact: "pos" },
      { point: "DAP 2026 is still in draft, so rule changes are pending.", impact: "neutral" },
    ],
    environmental: [
      { point: "Explosives and propellant plants face strict safety licensing; accidents can shut capacity.", impact: "neg" },
      { point: "Firing ranges and test sites need land and clearances, which can slow trials.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "bel", tier: "core", why: "Production agency for radars, EW and air defence; >Rs 55,000 crore FY27 order guide incl. QRSAM." },
    { key: "hal", tier: "core", why: "Rs 2.54 lakh crore order book from fighter and helicopter approvals; growth limited by engines." },
    { key: "bdl", tier: "core", why: "Missile programmes from the 2026 approvals (MRSAM, MPATGM, Astra) land in its range." },
    { key: "solar", tier: "core", why: "Pinaka rockets, ammunition and loitering munitions; defence revenue guided up ~70% in FY27." },
    { key: "bharatforge", tier: "direct", why: "Private artillery leader (ATAGS 60%), Rs 11,196 crore defence order book." },
    { key: "mazdock", tier: "direct", why: "Preferred yard for the ~Rs 70,000 crore P75(I) submarines, awaiting Cabinet approval." },
    { key: "datapatterns", tier: "direct", why: "Design-led radar and EW electronics supplier to BEL, HAL and DRDO." },
    { key: "astra", tier: "direct", why: "RF sub-systems for radars; largest-ever HAL order for Uttam radar sub-systems." },
    { key: "beml", tier: "indirect", why: "Sarvatra bridge and military vehicles from the Sep 2026 AoN; defence is one of three businesses." },
    { key: "ptc", tier: "indirect", why: "Titanium and superalloy parts for missiles and artillery; small today, priced for growth." },
  ],

  companyNews: [
    { key: "hal", date: "Aug 2026", development: "Q1 FY27 profit rose ~15% on ~14% revenue growth; GE's F404 deliveries are picking up, with 4 a month planned for Oct-Dec 2026.", impact: "Faster engine deliveries ease the binding constraint on aircraft primes, which is engine supply rather than orders.", tone: "pos" },
    { key: "solar", date: "Aug 2026", development: "Defence revenue rose 123% YoY to Rs 933 crore in Q1 FY27; order book Rs 21,350 crore, ~Rs 18,000 crore of it defence.", impact: "Ammunition is converting fastest of any procurement line.", tone: "pos" },
    { key: "bharatforge", date: "Aug 2026", development: "Defence revenue +87.5% YoY in Q1 FY27; defence order book Rs 11,196 crore; KSSL margin up to 17.2%.", impact: "Private primes are scaling profitably in land systems.", tone: "pos" },
    { key: "astra", date: "Aug 2026", development: "Won its largest-ever order from HAL for Uttam AESA radar sub-systems, lifting the consolidated order book to ~Rs 4,300 crore.", impact: "Indian fighter radars move from development to production, pulling in private RF suppliers.", tone: "pos" },
    { key: "bel", date: "Jul 2026", development: "Q1 FY27 revenue rose ~25% but order inflow fell ~49% to ~Rs 3,750 crore; order book Rs 72,258 crore. Kept >Rs 55,000 crore FY27 inflow guidance including QRSAM.", impact: "Shows how much of the year's orders hang on one Cabinet approval.", tone: "neutral" },
    { key: "mazdock", date: "May 2026", development: "The ~Rs 70,000 crore P75(I) six-submarine deal with TKMS cleared the Finance Ministry and went to the Cabinet Committee on Security; still unsigned in Oct 2026.", impact: "A textbook case of the gap between approval and contract.", tone: "neutral" },
  ],

  risks: [
    { risk: "Approvals convert to contracts slowly (FY26: ~33% by value)", mitigant: "DAP 2026 simplification, fewer trial rounds, emergency and fast-track routes", severity: "high" },
    { risk: "Imported engines and components delay deliveries (GE F404)", mitigant: "Engine localisation (marine gas turbine AoN), dual sourcing, larger inventories", severity: "high" },
    { risk: "Valuations price in years of growth (many stocks above 50x P/E, a few above 300x)", mitigant: "Order books of 3-8 years of revenue give visibility, but not certainty", severity: "medium" },
    { risk: "Budget growth slows or shifts to revenue spending", mitigant: "75% domestic reserve, exports and repeat ammunition demand", severity: "medium" },
  ],
  outlook: {
    bull: "DAP 2026 shortens timelines, QRSAM, P75(I) and MRFA contracts are signed within FY27, engines arrive on schedule and exports pass Rs 50,000 crore early.",
    base: "Contracts keep running at ~Rs 2-2.5 lakh crore a year against much larger approvals; electronics, missiles and ammunition grow fastest, platforms grow at 10-15%.",
    bear: "Key contracts slip another year, engine and component shortages persist, and a flat budget stalls new orders while valuations de-rate.",
  },
  reading: [
    { title: "Defence in Union Budget 2026-27", source: "Press Information Bureau", url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202623778301.pdf", year: "2026" },
    { title: "Ministry of Defence 2026-27 Budget Estimates: An Analysis", source: "MP-IDSA", url: "https://www.idsa.in/publisher/issuebrief/ministry-of-defence-2026-27-budget-estimates-an-analysis", year: "2026" },
    { title: "Decoding Defence Acquisition Procedure 2020", source: "MP-IDSA", url: "https://idsa.in/publisher/issuebrief/decoding-defence-acquisition-procedure-2020" },
    { title: "Defence Acquisition Procedure", source: "Ministry of Defence", url: "https://www.mod.gov.in/dod/defence-procurement-procedure" },
    { title: "SRIJAN indigenisation portal", source: "Department of Defence Production", url: "https://srijandefence.gov.in/" },
  ],
};
