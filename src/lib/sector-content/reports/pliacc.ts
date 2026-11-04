import type { SectorReport } from "./types";

export const pliacc: SectorReport = {
  slug: "pliacc",
  title: "India Battery Storage (PLI-ACC)",
  subtitle: "Demand is booming; the cells, and the materials inside them, are still imported",
  asOf: "Nov 2026",

  stance: {
    label: "Mixed: strong demand, weak delivery",
    tone: "neutral",
    line: "EV and grid-storage demand is real and rising, but five years in the PLI has produced ~2.5 GWh of running cell capacity and no incentive payout; the winners will be whoever actually ramps cells and materials, award or not.",
  },
  keyStats: [
    { label: "PLI-ACC outlay", value: "₹18,100 Cr", sub: "for 50 GWh; approved May 2021 (MHI)" },
    { label: "Capacity awarded vs running", value: "40 GWh / ~2.5 GWh", sub: "only Ola's line runs, being expanded to ~6 GWh (Business Today, Oct 2026)" },
    { label: "Li-ion cell imports, FY26", value: "₹41,667 Cr", sub: "up 64%; ~84% from China (commerce ministry)" },
    { label: "BESS VGF, 2nd tranche", value: "₹5,400 Cr", sub: "for 30 GWh at ₹18 lakh/MWh (MoP, Jun 2025)" },
  ],
  thesis: [
    {
      title: "Demand is outrunning local supply",
      body: "Cell imports rose 64% in FY26 and 94% in Q1 FY27. EVs (~8% of cars, ~11% of two-wheelers) and VGF-backed grid storage both need cells India barely makes, so every new gigafactory has buyers waiting.",
    },
    {
      title: "The PLI has under-delivered; execution decides winners",
      body: "Ola, Reliance and Rajesh Exports all missed the Dec 2024 milestone; MHI reset Ola's timelines in Aug 2026, Reliance still carries accrued penalties and Rajesh Exports' award is under review after a SEBI order. Meanwhile non-awardees are building: Exide commissioned 6 GWh in Sep 2026, Amara Raja, Agratas and Waaree follow, and Reliance's 40 GWh phase is due in 2026.",
    },
    {
      title: "Materials are the next profit pool",
      body: "Cathode and anode are ~65% of cell cost and >90% Chinese-processed. Himadri, Gujarat Fluorochemicals, HEG's TACC, Neogen, Hindalco and TCPL are the first movers; a reported ~₹13,000 Cr components scheme, now heading to the EFC, would back them.",
    },
  ],

  developments: [
    {
      date: "23 Sep 2026",
      title: "Exide commissions its first 6 GWh cell phase",
      body: "Exide Energy Solutions finished commissioning Phase I of its 12 GWh plant at Devanahalli, Bengaluru - built without a PLI-ACC award and later than its end-FY26 target.",
      impact: "pos",
      tag: "Capacity",
    },
    {
      date: "Aug 2026",
      title: "JSW pauses cell plans; Amara Raja to bid",
      body: "JSW said (27 Aug) its cell plans are on hold for want of an LFP technology partner. Amara Raja, whose Gotion tie-up collapsed, said it will bid for the grid-storage PLI tranche; its customer qualification plant started in Jul 2026.",
      impact: "neg",
      tag: "Technology",
    },
    {
      date: "12 Aug 2026",
      title: "MHI resets Ola's PLI-ACC timelines",
      body: "MHI revised Ola's milestones: incentives of up to ₹7,240 Cr, paid quarterly, can now run through CY2031 against targets of 12 GWh by Jul 2027 and 20 GWh by end-FY28. Ola reversed its ₹57 Cr penalty provision; Reliance and Rajesh Exports still carry penalties MHI asked them to pay in Nov 2025.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "15 Jul 2026",
      title: "Last 10 GWh re-tendered for grid storage",
      body: "MHI issued a global RFP for 10 GWh of ACC capacity for grid-scale stationary storage: 1-4 GWh per bidder, 25% value addition in two years and 40% in five. Bids closed 13 Oct 2026.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Jun 2026",
      title: "Reliance: 40 GWh first phase due this year",
      body: "At its 49th AGM Reliance said its Jamnagar LFP cell and BESS gigafactory's 40 GWh first phase is on track for 2026 commissioning, with all equipment on site, and raised the target to 120 GWh a year.",
      impact: "pos",
      tag: "Capacity",
    },
    {
      date: "3 Jun 2026",
      title: "SEBI order puts Rajesh Exports' award in doubt",
      body: "A SEBI interim order alleged ~₹15.15 lakh Cr of overstated subsidiary revenue and fund diversion involving ACC Energy Storage, the arm holding its 5 GWh PLI-ACC award, and barred the company and its chairman from the market pending investigation. MHI said it is reviewing the award; the company denies the allegations.",
      impact: "neg",
      tag: "Enforcement",
    },
  ],

  overview: {
    narrative: [
      "The National Programme on Advanced Chemistry Cell Battery Storage was approved on 12 May 2021 with ₹18,100 Cr to pay a sales-linked incentive on 50 GWh of cells. Winners must invest ₹225 Cr per GWh within two years, reach 25% domestic value addition in two years and 60% in five, and are paid over a five-year performance period, originally 2025-2029 (Ola's window now runs through CY2031 after an Aug 2026 revision).",
      "The first round (2022) gave Ola 20 GWh, Reliance 5 GWh and Rajesh Exports 5 GWh; a 20 GWh award to Hyundai Global Motors was cancelled. A 2024 re-bid gave Reliance another 10 GWh, and the last 10 GWh was re-tendered in Jul 2026 for grid storage.",
      "Delivery has lagged: by Oct 2025 only 1.4 GWh was commissioned and no incentive paid (JMK/IEEFA). Grid storage is now the faster-moving demand: ₹5,400 Cr of VGF for 30 GWh, on top of 13.2 GWh in the first tranche, and CEA expects ~236 GWh of battery storage to be needed by FY32.",
    ],
    chart: {
      title: "India's lithium-ion cell imports",
      unit: "₹ '000 Cr",
      source: "Commerce ministry data via parliamentary replies (FY19-20), TradeStat via trade aggregator (FY24-25; FY24 derived from reported FY25 growth), Business Today (FY26)",
      points: [
        { label: "FY19", value: 8.6 },
        { label: "FY20", value: 8.8 },
        { label: "FY24", value: 24.3 },
        { label: "FY25", value: 25.5 },
        { label: "FY26", value: 41.7 },
      ],
    },
    snapshot: [
      { label: "PLI-ACC capacity awarded", value: "40 of 50 GWh", tone: "neutral" },
      { label: "Running PLI cell capacity", value: "~2.5 GWh (Ola; expanding to ~6)", tone: "neg" },
      { label: "PLI-ACC incentive paid", value: "Nil so far", tone: "neg" },
      { label: "Cell imports, Q1 FY27", value: "₹15,721 Cr (up 94%)", tone: "neg" },
      { label: "Battery storage needed by FY32 (CEA NEP)", value: "~236 GWh", tone: "pos" },
      { label: "Largest operating BESS", value: "3.37 GWh (Khavda)", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Active materials", zoneIds: ["cathode", "anode"], margin: "Not yet reported in India - plants pilot-to-first-scale", moat: "high", note: "~65% of cell cost; >90% processed in China. Process know-how and lithium/graphite sourcing are the moats." },
    { stage: "Electrolyte, foils & separators", zoneIds: ["electrolyte", "foil"], margin: "Specialty-chemical margins once qualified; still small", moat: "medium", note: "The one cell input already bought locally (electrolyte); Indian fluorochemical and aluminium majors lead." },
    { stage: "Cells", zoneIds: ["cells"], margin: "Start-up losses; Indian cells ~20-25% costlier than Chinese at first", moat: "high", note: "Scale, yield and technology access decide it; the PLI incentive is meant to bridge the cost gap." },
    { stage: "Packs & containers", zoneIds: ["packs"], margin: "Thin assembly margins", moat: "low", note: "Plenty of capacity assembling imported cells; value rises with BMS software and integration." },
    { stage: "Demand: EVs and grid storage", zoneIds: ["evofftake", "bess"], margin: "BESS: contracted 12-25 year payments; EVs: savings, not margin", moat: "medium", note: "Buyers keep the cost savings from local cells; storage developers earn annuity-like returns." },
  ],

  drivers: [
    { title: "Grid storage build-out", metric: "~236 GWh needed by FY32 (CEA)", body: "VGF for 30 GWh, transmission waivers to Jun 2028 and solar-plus-storage tenders make BESS the fastest-growing cell buyer." },
    { title: "EV adoption", metric: "~8% of cars, ~11% of 2Ws", body: "Every EV carries a pack worth a large share of its price; local cells cut currency and supply risk for vehicle makers." },
    { title: "Import substitution", metric: "₹41,667 Cr cell imports, FY26", body: "A large, visible pool, ~84% from China - and growing faster than local capacity." },
    { title: "Incentives and duty cuts", metric: "₹18,100 Cr PLI + nil duty on lithium salts", body: "Sales-linked PLI, ECMS support for materials, Budget 2026-27 duty cuts, and a reported ~₹13,000 Cr components scheme (heading to the EFC)." },
  ],
  mix: {
    title: "PLI-ACC's 50 GWh: who holds it",
    source: "MHI; Business Today (Oct 2026)",
    slices: [
      { label: "Ola Electric (20 GWh)", value: 40 },
      { label: "Reliance (15 GWh)", value: 30 },
      { label: "Rajesh Exports (5 GWh)", value: 10 },
      { label: "Grid-storage re-tender (10 GWh)", value: 20 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong policy stack: PLI-ACC, BESS VGF, ECMS for materials and Budget duty cuts.", impact: "pos" },
      { point: "Press Note 3 limits Chinese partners, while China restricts export of LFP know-how - a squeeze from both sides.", impact: "neg" },
    ],
    economic: [
      { point: "Cell imports of ₹41,667 Cr a year are a large substitution pool.", impact: "pos" },
      { point: "Chinese cell prices keep falling; Indian cells start ~20-25% costlier.", impact: "neg" },
    ],
    social: [
      { point: "EV adoption rising in two-wheelers and cars; storage helps keep evening power reliable.", impact: "pos" },
      { point: "Few experienced cell-process engineers; jobs created far below the scheme's projection.", impact: "neg" },
    ],
    technological: [
      { point: "First Indian cells (Ola 4680, Exide) and materials (Hindalco foil, GFL LiPF6) are now in production.", impact: "pos" },
      { point: "LFP technology access is the bottleneck (JSW paused; Amara Raja went in-house).", impact: "neg" },
    ],
    legal: [
      { point: "Penalties of 0.1% of performance security per day for missed milestones, adjusted against incentives.", impact: "neg" },
      { point: "Incentive paid only on certified sales meeting value-addition thresholds.", impact: "neutral" },
    ],
    environmental: [
      { point: "Storage lets more solar and wind reach the evening peak.", impact: "pos" },
      { point: "Battery fires and end-of-life batteries need safety rules and recycling (covered in the critical-minerals policy).", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "exide", tier: "core", why: "Second sizeable cell plant running (6 GWh commissioned Sep 2026), plus Hyundai-Kia localisation MoU." },
    { key: "amararaja", tier: "core", why: "Telangana Giga Corridor: 10 GWh BESS assembly and cells from 2027; bidding for the grid-storage tranche." },
    { key: "ola", tier: "core", why: "Only PLI-ACC awardee producing cells; MHI reset its timelines in Aug 2026 - it now needs 12 GWh by Jul 2027 to earn the incentive." },
    { key: "reliance", tier: "core", why: "15 GWh of PLI awards and a 40 GWh first phase due in 2026; small vs the group." },
    { key: "waaree", tier: "direct", why: "5.15 GWh BESS container plant running; 3.5-4 GWh cell line and a 16 GWh plant planned." },
    { key: "gfl", tier: "direct", why: "LiPF6 in commercial supply, PVDF qualified, LFP cathode line built." },
    { key: "himadri", tier: "direct", why: "First LFP cathode line due by Dec 2026; a 40,000 t Phase I targets full operations in FY29." },
    { key: "neogen", tier: "direct", why: "Lithium salts and electrolyte with four provisional global approvals." },
    { key: "acme", tier: "indirect", why: "~5 GWh of operating BESS - a large buyer of cells and containers." },
    { key: "hindalco", tier: "indirect", why: "India's first battery-grade aluminium foil plant; tiny vs the group." },
  ],

  companyNews: [
    { key: "indigrid", date: "Oct 2026", development: "Commissioned a 250 MW/500 MWh standalone BESS in Rajasthan with a 12-year NVVN contract - its third utility-scale battery.", impact: "Transmission InvITs are becoming storage owners - another buyer of cells and containers.", tone: "pos" },
    { key: "exide", date: "Sep 2026", development: "Exide Energy Solutions completed commissioning of Phase I (6 GWh) at Devanahalli on 23 Sep.", impact: "Shows cell plants can be built without the PLI - and gives Indian EV makers a second local source.", tone: "pos" },
    { key: "tcpl", date: "Aug 2026", development: "Board approved a ~₹125 Cr wet-process Li-ion separator plant (70 million m² a year, commercial output early 2028).", impact: "First move to localise separators, a fully imported cell input.", tone: "pos" },
    { key: "waaree", date: "Jul 2026", development: "Waaree Energy Storage Solutions commissioned a 5.15 GWh BESS container plant.", impact: "Solar-module makers are moving into storage assembly first, cells next.", tone: "pos" },
    { key: "adanigreen", date: "May 2026", development: "Reported 3.37 GWh of BESS commissioned at Khavda, after adding 1.37 GWh in Mar 2026.", impact: "Sets the scale for Indian grid storage - and the cell volumes local plants want to win.", tone: "pos" },
    { key: "ola", date: "Aug 2026", development: "MHI revised its PLI-ACC timelines on 12 Aug (up to ₹7,240 Cr, paid quarterly, through CY2031; 12 GWh by Jul 2027, 20 GWh by end-FY28) and Ola reversed its ₹57 Cr penalty provision; ~2.5 GWh runs, with expansion to ~6 GWh under way.", impact: "Lifts the penalty overhang, but the payout now hinges on a steep ramp from today's capacity.", tone: "neutral" },
  ],

  risks: [
    { risk: "Cell plants miss milestones and incentives never flow", mitigant: "Penalties adjusted against incentives; capacity re-tendered to builders", severity: "high" },
    { risk: "No access to LFP technology and equipment from China", mitigant: "Japanese/Korean licences (Agratas NMC), in-house R&D (Amara Raja, Ola), Chinese partner equity under Press Note 3", severity: "high" },
    { risk: "Chinese cell and material prices fall faster than Indian costs", mitigant: "PLI incentive, duty structure, local-content rules for storage and EVs", severity: "medium" },
    { risk: "Materials stay imported, capping value addition", mitigant: "Reported ~₹13,000 Cr components scheme (not yet approved); ECMS capex support", severity: "medium" },
  ],
  outlook: {
    bull: "Reliance, Exide, Amara Raja, Agratas and Waaree all ramp by FY28, the grid tranche is awarded, the components scheme passes, and local cathode, anode and foil reach scale - cell imports peak.",
    base: "A handful of plants (Ola, Exide, Reliance, Agratas) produce by 2027 with start-up losses; imports keep rising until FY28; materials makers grow from a small base and BESS developers keep importing most cells.",
    bear: "Technology curbs and Chinese price cuts stall new lines, awards are cut, and India stays an assembler of imported cells for EVs and grid storage.",
  },
  reading: [
    { title: "PLI scheme: National Programme on ACC Battery Storage", source: "Ministry of Heavy Industries", url: "https://heavyindustries.gov.in/pli-scheme-national-programme-advanced-chemistry-cell-acc-battery-storage" },
    { title: "Assessing India's ACC PLI scheme", source: "IEEFA and JMK Research", url: "https://ieefa.org/sites/default/files/2026-01/Assessing%20India's%20ACC%20PLI%20scheme.pdf", year: "2026" },
    { title: "Seven bids received in the 10 GWh PLI-ACC re-tender", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2018576", year: "2024" },
    { title: "VGF scheme expands to 30 GWh of standalone BESS", source: "JMK Research", url: "https://jmkresearch.com/vgf-scheme-expands-to-support-30-gwh-of-new-standalone-bess-development-in-india/", year: "2025" },
    { title: "India has failed to build a battery-cell ecosystem: can a new PLI change this?", source: "Business Today", url: "https://www.businesstoday.in/auto/story/bt-big-story-india-has-failed-to-build-an-ecosystem-of-battery-cells-can-a-new-pli-change-this-562898-2026-10-22", year: "2026" },
  ],
};
