import type { SectorReport } from "./types";

export const chemicals: SectorReport = {
  slug: "chemicals",
  title: "India Chemicals & Agrochem",
  subtitle: "Who makes India's chemicals and farm inputs, and who earns on them - from refiners and terminals through commodity and specialty chemistry to crop protection, fertilisers and seeds",
  asOf: "Nov 2026",

  stance: {
    label: "Split cycle: shortage winners, farm-input losers",
    tone: "neutral",
    line: "The Gulf closure has lifted Indian makers with their own feedstock chains (phenol, fluorine, pyridine) while squeezing fertiliser margins, and a weak monsoon plus global destocking keep agrochem under pressure.",
  },
  keyStats: [
    { label: "Strait of Hormuz", value: "Closed since Mar 2026", sub: "2 transits on 15 Nov 2026 vs about 85 a day before the war (IMF PortWatch)" },
    { label: "P&K subsidy, rabi 2026-27", value: "₹62,370 Cr", sub: "about 64% above rabi 2025-26 (Cabinet, 11 Nov 2026)" },
    { label: "2026 monsoon rainfall", value: "12.6% below normal", sub: "weakest since 2015 (IMD, Jun-Sep)" },
    { label: "Fertiliser subsidy, FY27 budget", value: "₹1.71L Cr", sub: "₹1.86L Cr revised for FY26; budgeted before the Gulf closure" },
  ],
  thesis: [
    {
      title: "Own chemistry wins when Asia is short",
      body: "Asian crackers and chemical plants depend on Gulf naphtha and gas. With the Strait of Hormuz shut since Mar 2026, Indian makers with integrated chains - phenol and acetone, benzene derivatives, pyridines, fluorine - sold more at better spreads: Deepak Nitrite's Sep 2026 quarter profit was 3.3 times a year earlier and Navin Fluorine's rose 82%.",
    },
    {
      title: "Fertiliser makers carry the Gulf shock",
      body: "India's urea plants run on imported LNG, about 86% of it from West Asia, and phosphate makers import their acid, ammonia and sulphur. Gas cuts in Mar 2026 dropped urea output by about 30%, and in the Sep 2026 quarter Coromandel's and Paradeep's profits fell sharply as costs ran ahead of subsidy rates.",
    },
    {
      title: "Agrochem is still in a down-cycle",
      body: "Global crop-protection companies are destocking while patents expire and Chinese generics cut prices, and the 2026 monsoon was the weakest since 2015. PI Industries' agchem exports fell 18% and Sumitomo Chemical India's 23% in the Sep 2026 quarter. Recovery needs both a normal monsoon and innovators restocking.",
    },
  ],

  developments: [
    {
      date: "Nov 2026",
      title: "Cabinet raises the rabi fertiliser subsidy",
      body: "On 11 Nov 2026 the Cabinet approved nutrient-based subsidy rates for rabi 2026-27 (1 Oct 2026 to 31 Mar 2027) with an outlay of about ₹62,370 Cr, ₹24,417 Cr more than a year earlier, citing global prices of urea, DAP and sulphur.",
      impact: "pos",
      tag: "Subsidy",
    },
    {
      date: "Nov 2026",
      title: "Sep-quarter results split the industry",
      body: "Phenol, benzene, pyridine and fluorine makers reported record quarters (Deepak Nitrite profit up 235%, Aarti 59%, Navin 82%, Jubilant Ingrevia EBITDA 51%), while agrochem exporters and phosphate makers fell (PI Industries' agchem exports down 18%, Coromandel profit down 34%).",
      impact: "neutral",
      tag: "Results",
    },
    {
      date: "Oct 2026",
      title: "Monsoon ends 12.6% below normal",
      body: "IMD's June-September rainfall was 759.4 mm against a normal of 868.6 mm, the weakest since 2015. South peninsular and east India were about a quarter short, and reservoirs held about 70% of capacity versus 79% a year earlier going into rabi.",
      impact: "neg",
      tag: "Monsoon",
    },
    {
      date: "May 2026",
      title: "Gas to urea plants restored, imports stepped up",
      body: "By 2 May the petroleum ministry had raised gas allocations to fertiliser plants to about 98% of their six-month average, after March cuts. India tendered for about 1.7 MT of urea in late May to cover the kharif shortfall.",
      impact: "neutral",
      tag: "Fertilisers",
    },
    {
      date: "Mar 2026",
      title: "Hormuz closure cuts gas, naphtha and urea",
      body: "After the 28 Feb strikes on Iran, shipping through the Strait of Hormuz stopped. GAIL, IOC and BPCL cut gas to fertiliser units on Qatar contracts, urea output fell by about 30% in March (FAO), and Asian crackers short of Gulf naphtha cut runs. DGTR also opened an anti-dumping case on phenol imports on 20 Mar 2026.",
      impact: "neg",
      tag: "Feedstock",
    },
    {
      date: "Feb 2026",
      title: "US tariff on Indian goods cut to 18%",
      body: "The India-US interim trade framework announced on 6 Feb 2026 lowered the US reciprocal tariff on most Indian goods, including organic chemicals, to 18% and removed the extra 25% penalty linked to Russian oil.",
      impact: "pos",
      tag: "Trade",
    },
  ],

  overview: {
    headline: "Fertiliser subsidy was budgeted at ₹1.71L Cr for FY27 - before the Gulf closure raised import costs",
    narrative: [
      "India's chemical chain has four layers: refiners, gas companies and terminals that supply and move the base molecules; commodity makers of soda ash, caustic soda, polymers and nitrates; specialty makers of intermediates, fluorochemicals, pigments, adhesives and contract molecules; and the crop-protection, fertiliser and seed companies that sell to farmers.",
      "Two shocks hit in 2026. The Strait of Hormuz closed in March, cutting Gulf LNG, naphtha, LPG, urea and sulphur, which helped Indian specialty makers with their own chains but raised fertiliser costs. Then the monsoon ended 12.6% short, the weakest since 2015, hurting crop-protection and seed sales.",
      "The government absorbs much of the farm-input shock through the fertiliser subsidy, so its size each season decides fertiliser makers' margins; elsewhere, spreads against Chinese prices decide who earns.",
    ],
    chart: {
      title: "Union fertiliser subsidy (urea plus nutrient-based), by fiscal year",
      unit: "₹ thousand crore",
      source: "Lok Sabha unstarred question 2229 (1 Aug 2025) for FY22-FY25 disbursed; Union Budget 2026-27 for FY26 revised and FY27 budget estimates",
      kind: "series",
      points: [
        { label: "FY22", value: 157.6 },
        { label: "FY23", value: 254.8 },
        { label: "FY24", value: 195.4 },
        { label: "FY25", value: 177.1 },
        { label: "FY26RE", value: 186.5 },
        { label: "FY27BE", value: 170.8, projected: true },
      ],
    },
    snapshot: [
      { label: "Urea made in India, share of consumption (Outlook Business, May 2026)", value: "about 75%", tone: "neutral" },
      { label: "Fertiliser plants' LNG from West Asia (Outlook Business, May 2026)", value: "about 86%", tone: "neg" },
      { label: "Urea output lost in Mar 2026 (FAO)", value: "about 0.8 MT, nearly 30%", tone: "neg" },
      { label: "Kharif area sown by early Sep 2026 (DSIJ)", value: "about 98% of normal", tone: "pos" },
      { label: "Reservoir storage, late Sep 2026 (DSIJ)", value: "about 70%, vs 79% a year earlier", tone: "neg" },
      { label: "HFC production freeze under the Kigali Amendment", value: "2028, on a 2024-26 baseline", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Feedstock & logistics", zoneIds: ["feedstock", "terminals"], margin: "Refining and gas margins; steady terminal fees", moat: "high", note: "Refiners and gas companies set the cost base; Gulf supply is the swing factor in 2026." },
    { stage: "Commodity chemicals", zoneIds: ["chlor_alkali", "petchem", "explosives"], margin: "Spread over feedstock and power", moat: "low", note: "Scale, captive power and own feedstock decide who earns; prices follow China and the Gulf." },
    { stage: "Specialty intermediates & fluorine", zoneIds: ["intermediates", "fluorochem", "carbon_colour"], margin: "Above-commodity spreads when Asia is short", moat: "medium", note: "Own processes and integrated chains protect margins; Chinese dumping is the main threat." },
    { stage: "Contract & consumer chemistry", zoneIds: ["custom_synthesis", "consumer_specialty"], margin: "Highest margins in the chain", moat: "high", note: "Innovator contracts and consumer brands are hard to copy; contract work is cyclical with innovators' stocks." },
    { stage: "Farm inputs", zoneIds: ["crop_protection", "fertilisers", "seeds"], margin: "Brands earn well; fertilisers earn a regulated return", moat: "medium", note: "Monsoon, subsidy rates and channel inventory drive returns." },
  ],

  drivers: [
    { title: "Gulf feedstock shock", metric: "Hormuz closed since Mar 2026", body: "Gulf LNG, naphtha, LPG, urea and sulphur are short; Asian rivals cut output, Indian integrated makers gained share and fertiliser costs rose." },
    { title: "Monsoon and farm demand", metric: "12.6% rainfall deficit", body: "The weakest monsoon since 2015 cut crop-protection volumes and raised channel stock; rabi depends on reservoirs that are below last year." },
    { title: "China's export pricing", metric: "DGTR phenol case, Mar 2026", body: "Chinese overcapacity set Indian spreads in 2023-25; anti-dumping duties and the 2026 supply squeeze have lifted them for now." },
    { title: "Fertiliser subsidy", metric: "₹62,370 Cr for rabi 2026-27", body: "The nutrient-based subsidy decides whether phosphate makers' margins recover from the Sep 2026 squeeze; urea makers earn a regulated return." },
  ],
  mix: {
    title: "Where India's urea comes from (annual consumption about 40 MT)",
    source: "Outlook Business, 5 May 2026",
    slices: [
      { label: "Made in India", value: 75 },
      { label: "Imported", value: 25 },
    ],
  },

  pestle: {
    political: [
      { point: "The Centre raised the rabi 2026-27 P&K subsidy by about 64% to shield farmers from global prices.", impact: "pos" },
      { point: "War in the Gulf and the Hormuz closure leave India's gas and fertiliser imports hostage to diplomacy.", impact: "neg" },
    ],
    economic: [
      { point: "Asian supply cuts lifted Indian specialty spreads and the rupee's fall helps exporters.", impact: "pos" },
      { point: "LNG, ammonia, sulphur and VAM costs rose faster than many makers could pass on.", impact: "neg" },
    ],
    social: [
      { point: "Farm labour shortages push farmers toward herbicides and hybrid seeds.", impact: "pos" },
      { point: "A weak monsoon cuts rural incomes and farm-input spending.", impact: "neg" },
    ],
    technological: [
      { point: "Catalytic and continuous processes give Indian makers a cost edge in niche molecules.", impact: "pos" },
      { point: "Fluorine, nitration and chlorination are hazardous; plant accidents still happen.", impact: "neg" },
    ],
    legal: [
      { point: "DGTR anti-dumping duties protect phenol, PVC and other chains against cheap imports.", impact: "pos" },
      { point: "Pesticide bans, EU PFAS rules and the 2028 HFC freeze constrain some products.", impact: "neutral" },
    ],
    environmental: [
      { point: "Green ammonia contracts for fertiliser plants reduce LNG dependence over time.", impact: "pos" },
      { point: "Effluent rules in Gujarat and Maharashtra clusters delay expansions.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "deepakNitrite", tier: "core", why: "Largest Indian phenol and acetone maker; gains most while Asian supply is short." },
    { key: "aarti", tier: "core", why: "Benzene-chain leader with new capacity commissioned in Sep 2026." },
    { key: "navinfluor", tier: "core", why: "Firm refrigerant prices and new HFC capacity before the 2028 freeze." },
    { key: "srf", tier: "direct", why: "Refrigerants, fluoropolymers and innovator chemistry in one company." },
    { key: "jubilantIngrevia", tier: "direct", why: "Pyridine leader with record revenue and wider margins in 2026." },
    { key: "clean", tier: "direct", why: "Own catalytic processes and a new HALS business growing exports." },
    { key: "solar", tier: "direct", why: "Mining explosives leader that grows with coal and infrastructure." },
    { key: "pidilite", tier: "indirect", why: "Brand pricing power and double-digit volume growth despite input costs." },
    { key: "chambal", tier: "indirect", why: "Regulated urea return is protected; gains if gas supply normalises." },
    { key: "piind", tier: "indirect", why: "Largest custom-synthesis exporter; first to recover when innovators restock." },
  ],

  companyNews: [
    { key: "deepakNitrite", date: "Oct 2026", development: "Q2 FY27 profit rose 235% to about ₹398 Cr on revenue of ₹3,076 Cr, with EBITDA margin at 21% from 12%, led by phenolics.", impact: "Shows how much Indian phenol makers gain while Asian supply is short.", tone: "pos" },
    { key: "navinfluor", date: "Nov 2026", development: "Q2 FY27 profit rose about 82% to ₹269 Cr on firm HFC prices; HFC capacity equal to 15,000 t a year of R-32 is due in Q3 FY27.", impact: "Indian fluorine makers are adding refrigerant capacity before the 2028 Kigali freeze.", tone: "pos" },
    { key: "piind", date: "Nov 2026", development: "Q2 FY27 revenue fell 9% to ₹1,702 Cr and adjusted profit about 70% to ₹122 Cr; agchem exports fell 18% while domestic agri and pharma grew 19-20%.", impact: "Custom synthesis for global innovators is still in a down-cycle.", tone: "neg" },
    { key: "coromandel", date: "Oct 2026", development: "Q2 FY27 revenue rose 6% to ₹10,348 Cr but profit fell about 34% to ₹523 Cr as raw-material costs outran subsidies; phosphatic market share rose to 19%.", impact: "Phosphate makers' margins hinge on subsidy rates keeping pace with costs.", tone: "neg" },
    { key: "upl", date: "Nov 2026", development: "Q2 FY27 revenue slipped 1% to ₹11,860 Cr while EBITDA rose 5%; Advanta agreed to buy Egypt's Misr Hytech Seed for about $110 mn and FY27 guidance was kept.", impact: "Seeds are carrying the group while crop protection is weak.", tone: "neutral" },
    { key: "tataChem", date: "Oct 2026", development: "India revenue rose 8% in Q2 FY27, but weak overseas soda ash prices pushed the consolidated result to a loss.", impact: "Global soda ash oversupply is the main drag on commodity chemicals.", tone: "neg" },
  ],

  risks: [
    { risk: "The Hormuz closure lasts into 2027, keeping LNG, ammonia and sulphur short and costly", mitigant: "Higher subsidy rates, urea import tenders and non-Gulf LNG contracts", severity: "high" },
    { risk: "Chinese overcapacity floods markets once feedstock returns, collapsing spreads again", mitigant: "Anti-dumping duties, innovator contracts and own-process cost advantages", severity: "high" },
    { risk: "A second weak monsoon in 2027 hits crop protection, seeds and fertiliser volumes", mitigant: "Export and contract businesses; subsidised fertiliser prices hold demand", severity: "medium" },
    { risk: "Plant fires, explosions or gas leaks in hazardous chemistry", mitigant: "Insurance and multi-site operations at larger makers", severity: "medium" },
  ],
  outlook: {
    bull: "The Gulf reopens slowly enough that Indian makers keep the share they won in 2026, innovators restock, and a normal 2027 monsoon revives farm inputs.",
    base: "Spreads ease as Asian supply returns in 2027, fertiliser margins recover with subsidy support, and agrochem exports bottom out through FY27 before improving.",
    bear: "The closure drags on while China dumps surplus once its plants restart, a second weak monsoon hits farm demand, and subsidy delays stretch fertiliser makers' balance sheets.",
  },
  reading: [
    { title: "Government approves Nutrient Based Subsidy for Rabi 2026-27", source: "News On AIR", url: "https://newsonair.gov.in/govt-approves-nutrient-based-subsidy-for-rabi-2026-27-to-ensure-affordable-fertilisers-for-farmers/", year: "2026" },
    { title: "Strait to farms: West Asia war hits fertiliser supply", source: "Outlook Business", url: "https://www.outlookbusiness.com/economy-and-policy/strait-to-farms-west-asia-war-hits-fertiliser-supplycan-india-look-beyond", year: "2026" },
    { title: "India's 2026 monsoon ends 12.6% deficient, weakest since 2015", source: "DSIJ", url: "https://insights.dsij.in/dsijarticledetail/indias-2026-monsoon-ends-126-deficient-weakest-since-2015-59820", year: "2026" },
    { title: "US and India interim trade agreement: 18% tariff", source: "India Briefing", url: "https://www.india-briefing.com/news/us-india-interim-trade-agreement-18-percent-tariff-42514.html/", year: "2026" },
    { title: "2026 Iran war fuel crisis", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/2026_Iran_war_fuel_crisis", year: "2026" },
  ],
};
