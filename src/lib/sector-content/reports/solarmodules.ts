import type { SectorReport } from "./types";

export const solarmodules: SectorReport = {
  slug: "solarmodules",
  title: "India Solar Manufacturing & ALMM",
  subtitle: "How a procurement list is moving the solar value chain onshore",
  asOf: "Oct 2026",

  stance: {
    label: "Policy-led tailwind",
    tone: "pos",
    line: "ALMM does not create solar demand; it decides who supplies it. Value moved first to listed module makers and, since June 2026, to cell makers.",
  },
  keyStats: [
    { label: "ALMM module capacity", value: ">100 GW", sub: "enlisted, approx. (MNRE, 2025)" },
    { label: "ALMM List-II (cells)", value: "Jun 2026", sub: "domestic cells mandated" },
    { label: "Solar added, FY26", value: "~35-38 GW", sub: "approx., record year" },
    { label: "Wafer & polysilicon", value: ">90%", sub: "still imported, mostly China" },
  ],
  thesis: [
    {
      title: "A list, not a subsidy, redirects demand",
      body: "Government-linked, net-metered and open-access projects must buy ALMM-listed modules, so India's ~35 GW+ annual build flows to domestic factories regardless of Chinese prices.",
    },
    {
      title: "The profit pool moves upstream in phases",
      body: "Modules were listed first (2021); cells joined via List-II in June 2026 and wafers are proposed for 2028. Each step moves margin from assemblers to integrated players.",
    },
    {
      title: "Module oversupply, cell scarcity",
      body: "Listed module capacity far exceeds domestic demand while cell capacity lags. Integrated cell-plus-module makers earn the premium; pure assemblers face margin compression.",
    },
  ],

  developments: [
    {
      date: "Jun 2026",
      title: "ALMM List-II for cells takes effect",
      body: "Projects bid after the Aug 2025 cut-off must use modules made with ALMM-listed domestic cells, creating a captive market for Indian cell lines.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Aug 2025",
      title: "Wafers proposed for ALMM List-III",
      body: "MNRE signalled a third list for ingots and wafers from June 2028, extending the localisation push further upstream.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Jul 2025",
      title: "US anti-dumping case on Indian modules",
      body: "A US petition sought AD/CVD duties on solar cells and modules from India, Indonesia and Laos, clouding the export outlet for Indian makers.",
      impact: "neg",
      tag: "Trade",
    },
    {
      date: "Dec 2024",
      title: "MNRE notifies ALMM List-II",
      body: "The ALMM order was amended to add a separate list for solar cells, effective June 1, 2026 for government-linked and net-metered projects.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Apr 2024",
      title: "ALMM reinstated after a one-year pause",
      body: "Module ALMM, held in abeyance for FY24 to ease supply, was re-imposed from April 1, 2024, restoring the domestic sourcing mandate.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Feb 2024",
      title: "PM Surya Ghar rooftop scheme launched",
      body: "A ₹75,021 Cr scheme for 1 crore rooftop homes requires domestic (DCR) cells and modules, a large retail channel for listed makers.",
      impact: "pos",
      tag: "Demand",
    },
  ],

  overview: {
    narrative: [
      "India has ~130 GW of installed solar and targets 500 GW of non-fossil capacity by 2030, implying 40-50 GW of solar additions a year. Demand is set by targets and tenders, not by ALMM.",
      "ALMM, alongside 40% basic customs duty on modules and the ₹24,000 Cr PLI for high-efficiency modules, turned India from an importer of Chinese panels into a module-surplus market within four years.",
      "The gap is upstream: cell capacity is a fraction of module capacity, and polysilicon and wafers are almost entirely imported. List-II and List-III are designed to close it.",
    ],
    chart: {
      title: "Annual solar capacity additions in India",
      unit: "GW",
      source: "MNRE / CEA, FY26 approx., FY28-30 NextResearch estimates",
      points: [
        { label: "FY21", value: 5.5 },
        { label: "FY22", value: 13.9 },
        { label: "FY23", value: 12.8 },
        { label: "FY24", value: 15.0 },
        { label: "FY25", value: 23.8 },
        { label: "FY26", value: 36 },
        { label: "FY28P", value: 45, projected: true },
        { label: "FY30P", value: 50, projected: true },
      ],
    },
    snapshot: [
      { label: "BCD on modules / cells", value: "40% / 25%", tone: "neutral" },
      { label: "PLI for HE modules", value: "₹24,000 Cr", tone: "pos" },
      { label: "Module vs cell capacity", value: "~4-5x gap", tone: "neg" },
      { label: "Domestic module premium", value: "Narrowing", tone: "neg" },
      { label: "Cell ALMM mandate", value: "From Jun 2026", tone: "pos" },
      { label: "Wafer import dependence", value: ">90%", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Polysilicon, ingots & wafers", zoneIds: ["polywafer"], margin: "Nascent in India", moat: "high", note: "China holds >90% of global supply; Adani and Waaree are building the first Indian capacity." },
    { stage: "Glass, EVA & backsheet", zoneIds: ["glass_eva"], margin: "Cyclical, duty-dependent", moat: "medium", note: "Solar glass is protected by anti-dumping duties; few domestic producers." },
    { stage: "Solar cells", zoneIds: ["cells"], margin: "25-30%+ EBITDA", moat: "high", note: "The scarce, policy-protected layer once List-II applies; capex and yield know-how gate entry." },
    { stage: "Module assembly", zoneIds: ["modules"], margin: "10-15% EBITDA", moat: "low", note: "ALMM's first beneficiary, now crowded; margins hinge on cell integration." },
    { stage: "BOS: mounting, cables & inverters", zoneIds: ["mounting", "inverters"], margin: "10-15% EBITDA", moat: "medium", note: "Scales with installations rather than ALMM; inverters still largely imported." },
    { stage: "EPC & project developers", zoneIds: ["epc"], margin: "Thin EPC, steady IPP", moat: "medium", note: "Bear the cost of domestic modules; pass-through depends on tariff and tender terms." },
  ],

  drivers: [
    { title: "Mandated domestic sourcing", metric: "ALMM I + II", body: "Government-linked, rooftop and net-metered projects must buy listed modules, and from June 2026 listed cells." },
    { title: "Renewable build-out", metric: "500 GW by 2030", body: "The non-fossil target needs 40-50 GW of solar a year, set by SECI, NTPC and state tenders." },
    { title: "Rooftop and farm schemes", metric: "₹75,021 Cr", body: "PM Surya Ghar and PM-KUSUM require DCR modules, giving listed makers a retail and agri channel." },
    { title: "Production incentives and duties", metric: "₹24,000 Cr", body: "The high-efficiency module PLI and 40%/25% customs duties reward integrated capacity over imports." },
  ],
  mix: {
    title: "Solar capacity additions by segment, FY25 (approx.)",
    source: "MNRE / Mercom India Research",
    slices: [
      { label: "Utility-scale", value: 75 },
      { label: "Rooftop", value: 18 },
      { label: "Off-grid / KUSUM", value: 7 },
    ],
  },

  pestle: {
    political: [
      { point: "Atmanirbhar policy stack (ALMM, PLI, BCD) has stayed consistent across budgets and states.", impact: "pos" },
      { point: "Policy can be paused, as ALMM was in FY24, when supply shortages threaten targets.", impact: "neg" },
    ],
    economic: [
      { point: "Domestic cells cost more than Chinese imports, raising tariffs for DCR-bound projects.", impact: "neg" },
      { point: "Captive demand underwrites multi-GW factory capex and supports order books.", impact: "pos" },
    ],
    social: [
      { point: "Rooftop subsidies bring solar to households, broadening demand beyond utilities.", impact: "pos" },
      { point: "Factory build-out creates manufacturing jobs in Gujarat, Odisha, Telangana and Tamil Nadu.", impact: "pos" },
    ],
    technological: [
      { point: "Shift from PERC to TOPCon and heterojunction cells can strand older lines quickly.", impact: "neg" },
      { point: "New Indian cell lines are mostly TOPCon, close to global efficiency frontiers.", impact: "pos" },
    ],
    legal: [
      { point: "ALMM enlistment requires BIS certification and factory inspection, a real entry barrier.", impact: "pos" },
      { point: "US AD/CVD and forced-labour rules expose export-heavy makers to trade cases.", impact: "neg" },
    ],
    environmental: [
      { point: "Solar is central to India's net-zero 2070 path and coal displacement.", impact: "pos" },
      { point: "Module end-of-life waste is rising; e-waste rules now cover solar panels.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "waaree", tier: "core", why: "India's largest ALMM-listed module maker, adding cells, wafers and polysilicon." },
    { key: "premierEnergies", tier: "core", why: "Integrated cell and module maker; best placed for the List-II cell mandate." },
    { key: "adanient", tier: "core", why: "Mundra integrated plant spans polysilicon to modules; the most upstream Indian player." },
    { key: "websol", tier: "direct", why: "Pure-play cell maker; cell scarcity under List-II lifts pricing power." },
    { key: "insolation", tier: "direct", why: "Small-cap module maker riding rooftop and DCR demand." },
    { key: "borosilRenew", tier: "direct", why: "Main domestic solar-glass producer, protected by anti-dumping duties." },
    { key: "sterlingWilson", tier: "indirect", why: "Pure-play solar EPC; volumes rise with tender awards." },
    { key: "kpiGreen", tier: "indirect", why: "Gujarat EPC and IPP scaling solar and hybrid capacity." },
    { key: "aparInds", tier: "indirect", why: "Solar cables and conductors scale with installed GW." },
    { key: "tataPowerSolar", tier: "indirect", why: "Own cell and module plant in Tamil Nadu plus a large rooftop business." },
  ],

  companyNews: [
    { key: "waaree", date: "2025", development: "Commissioned its first cell plant at Chikhli, Gujarat (~5.4 GW).", impact: "The largest module maker becomes a large cell supplier ahead of List-II.", tone: "pos" },
    { key: "premierEnergies", date: "2025-26", development: "Expanding cell and module capacity toward ~10 GW cells with TOPCon lines.", impact: "Adds listed cell supply just as the cell mandate begins.", tone: "pos" },
    { key: "adanient", date: "2025-26", development: "Scaling the Mundra integrated plant toward ~10 GW across ingot to module.", impact: "Shows India can host polysilicon-to-module integration at scale.", tone: "pos" },
    { key: "tataPowerSolar", date: "2025", development: "Ramped its 4.3 GW cell and module plant in Tirunelveli.", impact: "Captive cells support DCR rooftop and EPC demand.", tone: "pos" },
    { key: "borosilRenew", date: "2024-25", development: "Anti-dumping duties on Chinese and Vietnamese solar glass after losses.", impact: "Trade protection is decisive for upstream materials economics.", tone: "neutral" },
    { key: "waaree", date: "Jul 2025", development: "Named in US anti-dumping petition on Indian modules.", impact: "Export upside to the US is at risk; domestic ALMM demand matters more.", tone: "neg" },
  ],

  risks: [
    { risk: "Module overcapacity compresses margins", mitigant: "Cell integration; List-II restricts competition to listed cells", severity: "high" },
    { risk: "Cell supply lags and ALMM II is diluted or deferred", mitigant: "Rapid cell capex; exemption cut-offs already fixed", severity: "medium" },
    { risk: "US trade action shuts the export outlet", mitigant: "US-based plants; redirect to domestic demand", severity: "medium" },
    { risk: "Technology shift strands PERC lines", mitigant: "New capacity largely TOPCon; upgrade capex", severity: "medium" },
  ],
  outlook: {
    bull: "List-II and List-III hold firm, cell capacity reaches ~60 GW+ by FY28 and integrated makers keep a durable premium.",
    base: "Cell mandate holds with tight supply into FY27; module margins normalise while cell makers earn the premium.",
    bear: "Overcapacity and diluted mandates erode domestic premiums; only the most integrated players earn returns.",
  },
  reading: [
    { title: "Approved List of Models and Manufacturers (ALMM)", source: "Ministry of New and Renewable Energy", url: "https://mnre.gov.in/en/approved-list-of-models-and-manufacturers-almm/" },
    { title: "Solar PV Global Supply Chains", source: "International Energy Agency", url: "https://www.iea.org/reports/solar-pv-global-supply-chains", year: "2022" },
    { title: "India solar market research", source: "Mercom India Research", url: "https://www.mercomindia.com/research" },
    { title: "Renewable energy research hub", source: "JMK Research & Analytics", url: "https://www.jmkresearch.com/" },
  ],
};
