import type { SectorReport } from "./types";

export const transmission: SectorReport = {
  slug: "transmission",
  title: "India Power Transmission & Grid",
  subtitle: "Towers, transformers, HVDC and smart meters behind a ₹9L Cr grid build-out",
  asOf: "Nov 2026",

  stance: {
    label: "Positive: capex upcycle",
    tone: "pos",
    line: "Grid spend has to roughly double to meet the 2032 plan; equipment makers hold the scarce capacity, while EPC margins and utility returns stay thin and rate-sensitive.",
  },
  keyStats: [
    { label: "NEP transmission outlay to 2032", value: "₹9.15L Cr", sub: "central + state (PIB, Oct 2024)" },
    { label: "Lines added, H1 FY27", value: "6,108 ckm", sub: "vs 2,411 ckm in H1 FY26 (CEA)" },
    { label: "Capex needed a year, FY26-FY31", value: "~₹81,000 Cr", sub: "vs ~₹45-48k Cr recently (CareEdge)" },
    { label: "RDSS smart meters installed", value: "5.73 crore", sub: "of 20.33 crore sanctioned, Jun 2026 (MoP)" },
  ],
  thesis: [
    {
      title: "Equipment is the bottleneck - and the profit pool",
      body: "Transformers, GIS and HVDC terminals have long lead times worldwide. Indian makers have record backlogs, rising exports and wider margins, and are all adding capacity for FY27-FY28.",
    },
    {
      title: "Awards are catching up with the plan",
      body: "After a weak FY25 (8,830 ckm added), line additions doubled in H1 FY27 and ~₹2.6L Cr of ISTS schemes are still to be bid. Towers, conductors and EPC follow the award cycle within months.",
    },
    {
      title: "Utilities and InvITs: steady, but bid returns are thin",
      body: "POWERGRID and AESL earn 35-year fixed tariffs on a fast-growing asset base, but TBCB competition keeps returns modest and valuations track interest rates. Smart meters and power markets carry their own policy risk.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Line additions more than double",
      body: "CEA data showed 1,807 ckm of 220 kV+ lines added in September 2026 and 6,108 ckm in H1 FY27, against 2,411 ckm a year earlier. The FY27 target is 16,554 ckm, 36% above FY26's 12,139 ckm.",
      impact: "pos",
      tag: "Capex",
    },
    {
      date: "Sep 2026",
      title: "Second ±800 kV HVDC terminal order",
      body: "POWERGRID awarded GE Vernova T&D India the 6 GW LCC converter terminals for the Barmer-II (Rajasthan) to South Kalamb (Maharashtra) link, after BHEL-Hitachi Energy's Khavda-Nagpur award in Nov 2024.",
      impact: "pos",
      tag: "HVDC",
    },
    {
      date: "Aug 2026",
      title: "Supreme Court declines to stop market coupling",
      body: "At the turn of Jul-Aug 2026 the court declined to intervene in or stay CERC's plan to pool bids across power exchanges, saying it was not the appropriate stage; IEX can challenge the rules once they are notified. APTEL had declined to set aside CERC's direction on 13 Feb 2026.",
      impact: "neg",
      tag: "Markets",
    },
    {
      date: "Jul 2026",
      title: "ISTS waiver steps down to 50%",
      body: "Wind and solar projects commissioned from 1 Jul 2026 pay 50% of inter-state transmission charges (25% in the previous year), rising to 100% from Jul 2028 under the Power Ministry's waiver phase-out order. Crisil estimated ~26 GW of projects are affected by the sunset.",
      impact: "neutral",
      tag: "Policy",
    },
    {
      date: "Jun 2026",
      title: "Anti-dumping probe on CRGO steel",
      body: "DGTR opened an investigation (22 Jun) into CRGO and amorphous-steel imports from China, Japan, Korea and Russia on JSW JFE's complaint. GTRI warned duties would raise transformer costs, since India imports most of its CRGO.",
      impact: "neg",
      tag: "Materials",
    },
    {
      date: "Apr 2026",
      title: "Capex has to nearly double",
      body: "In a note published in early Apr 2026 (data as of Jan 2026), CareEdge estimated ~₹2.22L Cr of TBCB projects under implementation (82 schemes, fewer than half on schedule) and said meeting the plan needs ~₹81,000 Cr of transmission capex a year over FY26-FY31.",
      impact: "pos",
      tag: "Pipeline",
    },
  ],

  overview: {
    headline: "Line additions peaked at 16.8k ckm in FY21, fell to 8.8k in FY25 and recovered to 12.1k in FY26; CEA targets 16.6k for FY27",
    narrative: [
      "India's grid has to connect 500 GW of non-fossil capacity by 2030 and a projected 458 GW peak demand by FY32. The National Electricity Plan (Transmission) plans to take the 220 kV+ network from ~4.85 lakh ckm (2024) to ~6.48 lakh ckm and transformation capacity from ~1,251 GVA to ~2,342 GVA by 2032.",
      "Most new inter-state lines are bid out under tariff-based competitive bidding (TBCB): POWERGRID and Adani Energy Solutions win most of them, buy equipment and EPC, and earn a fixed tariff for 35 years. Renewable zones in Rajasthan, Gujarat and Ladakh need long HVDC corridors.",
      "The constraint has moved from money to hardware: transformers, GIS, HVDC terminals and CRGO steel are short worldwide. That lets equipment makers earn more, while EPC firms and utilities absorb delays, commodity swings and right-of-way problems.",
    ],
    chart: {
      title: "Transmission lines added (220 kV and above)",
      unit: "'000 ckm",
      source: "CEA (via T&D India); FY27 is the CEA target",
      points: [
        { label: "FY20", value: 11.7 },
        { label: "FY21", value: 16.8 },
        { label: "FY22", value: 14.9 },
        { label: "FY23", value: 14.6 },
        { label: "FY24", value: 14.2 },
        { label: "FY25", value: 8.8 },
        { label: "FY26", value: 12.1 },
        { label: "FY27T", value: 16.6, projected: true },
      ],
    },
    snapshot: [
      { label: "Inter-regional capacity, 2024 to 2032 (NEP)", value: "119 GW to 168 GW", tone: "pos" },
      { label: "Transformation capacity, 2024 to 2032 (NEP)", value: "~1,251 to ~2,342 GVA", tone: "pos" },
      { label: "ISTS capex envisaged / under implementation", value: "₹4.86L Cr / ₹2.22L Cr (CareEdge)", tone: "neutral" },
      { label: "CRGO steel imported (GTRI)", value: "~90% of need", tone: "neg" },
      { label: "Large-transformer lead times vs 2019 (BNEF)", value: "more than doubled", tone: "neg" },
      { label: "RDSS sunset", value: "Mar 2028", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Metals & CRGO", zoneIds: ["materials"], margin: "Commodity; CRGO at a premium", moat: "medium", note: "Aluminium and copper follow LME prices; CRGO is short and mostly imported, so its few suppliers have pricing power." },
    { stage: "Lines & cables", zoneIds: ["towers", "conductors", "cables"], margin: "6-10% EBITDA EPC; more for HTLS/EHV", moat: "low", note: "Biggest slice of capex by value; fixed-price contracts and right-of-way decide returns." },
    { stage: "Substation equipment", zoneIds: ["transformers", "switchgear"], margin: "Mid-teens+ EBITDA at the cycle peak", moat: "high", note: "Long lead times and few qualified 400-765 kV makers; margins are cyclical as capacity arrives." },
    { stage: "HVDC & FACTS", zoneIds: ["hvdc"], margin: "Lumpy; technology-owner margins", moat: "high", note: "Only a handful of global technology owners; each terminal order is several thousand crore." },
    { stage: "Smart metering", zoneIds: ["metering"], margin: "Mid-teens manufacturing; AMISP annuity", moat: "medium", note: "Deadline-driven RDSS volumes; AMISP returns depend on discom payments." },
    { stage: "Utilities, markets & finance", zoneIds: ["transcos", "markets"], margin: "15.5% regulated RoE; thinner on TBCB", moat: "high", note: "35-year availability-based tariffs; exchanges earn high margins but face market coupling." },
  ],

  drivers: [
    { title: "Renewable evacuation", metric: "500 GW non-fossil by 2030", body: "Solar and wind zones sit far from demand, so every gigawatt needs new lines, pooling substations and HVDC corridors." },
    { title: "Peak demand growth", metric: "458 GW by FY32 (NEP)", body: "Cooling, industry, data centres and EVs lift peak load; inter-regional capacity has to grow from 119 GW to 168 GW." },
    { title: "Global equipment shortage", metric: "Lead times >2x since 2019", body: "US and European utilities are short of large transformers (BNEF), pulling Indian exports and supporting prices." },
    { title: "Smart-meter deadline", metric: "~14.6 crore meters to go", body: "RDSS's Mar 2028 sunset compresses most of the remaining installs into FY27-FY28." },
  ],
  mix: {
    title: "POWERGRID works in hand by route, Jun 2026",
    source: "POWERGRID Q1 FY27 investor material (via PL Capital)",
    slices: [
      { label: "TBCB (bid) projects", value: 83 },
      { label: "Regulated (RTM) projects", value: 14 },
      { label: "Other business", value: 3 },
    ],
  },

  pestle: {
    political: [
      { point: "The NEP, green energy corridors and RDSS give the grid unusually clear, multi-year central support.", impact: "pos" },
      { point: "State discoms' finances and political resistance to prepaid meters can slow distribution reforms.", impact: "neg" },
    ],
    economic: [
      { point: "Capex has to roughly double to ~₹81,000 Cr a year, filling equipment and EPC order books (CareEdge).", impact: "pos" },
      { point: "Utilities and InvITs are rate-sensitive; higher yields cut what bid-fixed tariffs are worth.", impact: "neutral" },
    ],
    social: [
      { point: "Right-of-way compensation disputes with farmers and forest communities delay many lines.", impact: "neg" },
      { point: "Reliable supply and loss reduction (AT&C) improve service, supporting tariff and meter reforms.", impact: "pos" },
    ],
    technological: [
      { point: "HVDC, HTLS reconductoring, GIS and STATCOMs let the grid carry more renewable power per corridor.", impact: "pos" },
      { point: "HVDC and EHV technology sits with a few global groups, limiting local competition and bargaining power.", impact: "neutral" },
    ],
    legal: [
      { point: "CERC's market-coupling plan survived challenges at APTEL (Feb 2026) and the Supreme Court (Jul-Aug 2026).", impact: "neg" },
      { point: "BIS certification and a possible anti-dumping duty on CRGO add cost and supply risk for transformer makers.", impact: "neg" },
    ],
    environmental: [
      { point: "The grid is the enabler of India's 2070 net-zero path: every renewable addition needs transmission.", impact: "pos" },
      { point: "Forest and wildlife clearances (e.g. Great Indian Bustard habitats in Rajasthan) force costly undergrounding or rerouting.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "hitachiEnergy", tier: "core", why: "Broadest grid-equipment maker in India - transformers, GIS, HVDC - with a record backlog." },
    { key: "powerGrid", tier: "core", why: "Owns most of the inter-state grid and wins the largest share of new TBCB projects." },
    { key: "gevtd", tier: "core", why: "Transformers, GIS and now a ±800 kV HVDC terminal order from POWERGRID." },
    { key: "taril", tier: "direct", why: "Pure-play power-transformer maker nearly doubling capacity in FY27." },
    { key: "siemensEnergy", tier: "direct", why: "Adding ~30,000 MVA of large power transformer capacity, with HVDC access via its parent." },
    { key: "adaniEnSol", tier: "direct", why: "Largest private transco with a big under-construction book plus smart meters." },
    { key: "kpil", tier: "direct", why: "Record EPC order book with T&D its largest business, at home and abroad." },
    { key: "kec", tier: "direct", why: "Global tower and line EPC leader; T&D is the core of its order book." },
    { key: "apar", tier: "direct", why: "Largest conductor maker, gaining from HTLS reconductoring and exports." },
    { key: "genus", tier: "indirect", why: "Largest smart-meter maker and AMISP - an RDSS deadline play rather than a transmission one." },
  ],

  companyNews: [
    { key: "adaniEnSol", date: "Oct 2026", development: "Q2 FY27 (22 Oct): network of 29,739 ckm and an under-construction pipeline of ~₹87,000 Cr (up from ~₹71,800 Cr in Jun); smart-meter order book still 24.6 million meters.", impact: "The largest private transco keeps scaling, with leverage and governance as the watch points.", tone: "neutral" },
    { key: "gevtd", date: "Sep 2026", development: "Won POWERGRID's ±800 kV, 6 GW LCC HVDC terminals for the Barmer-II to South Kalamb link as lowest bidder.", impact: "A second Indian HVDC supplier with a flagship order; HVDC is no longer a one-company niche.", tone: "pos" },
    { key: "hitachiEnergy", date: "Aug 2026", development: "Order backlog hit a record ₹32,222 Cr at 30 Jun 2026; Q1 FY27 revenue rose ~69% and profit more than doubled.", impact: "Shows equipment makers are converting the backlog into earnings at better margins.", tone: "pos" },
    { key: "powerGrid", date: "Aug 2026", development: "Q1 FY27 works in hand ~₹1.75L Cr (83% TBCB); capitalisation roughly tripled year on year; FY27 capex guidance held at ~₹37,000 Cr.", impact: "The grid's largest buyer is spending at a record pace, feeding the whole supply chain.", tone: "pos" },
    { key: "genus", date: "Aug 2026", development: "Q1 FY27 revenue rose ~45%; executable order book ~₹24,000 Cr at end-Jun 2026.", impact: "RDSS installs are accelerating ahead of the Mar 2028 deadline.", tone: "pos" },
    { key: "kpil", date: "Jul 2026", development: "Order book reached a record ₹66,607 Cr at end-Jun 2026, with T&D the largest segment.", impact: "Line EPC demand is strong; the question is margin, not volume.", tone: "pos" },
  ],

  risks: [
    { risk: "Equipment shortages (transformers, HVDC, CRGO) delay commissioning", mitigant: "Capacity expansions by all major makers; POWERGRID bulk-buying to secure slots", severity: "high" },
    { risk: "Right-of-way, forest and wildlife clearances stall lines", mitigant: "Higher land compensation norms, HTLS reconductoring of existing corridors, undergrounding", severity: "high" },
    { risk: "Transformer and EPC margins fall as capacity overshoots", mitigant: "Long backlogs lock in pricing for 1-2 years; export diversification", severity: "medium" },
    { risk: "Policy slippage: RDSS extension, market coupling, ISTS charge changes", mitigant: "Multi-year central funding and CERC consultation processes give notice", severity: "medium" },
  ],
  outlook: {
    bull: "ISTS awards keep pace with the NEP, exports stay strong as the US shortage lasts, and equipment margins hold while capacity ramps.",
    base: "Awards and line additions recover toward the FY27 target, equipment makers grow fast but margins plateau by FY28, and utilities compound their asset base at modest returns.",
    bear: "Right-of-way and equipment delays push commissioning out, transformer capacity overshoots as exports cool, and higher rates and market coupling weigh on utilities and IEX.",
  },
  reading: [
    { title: "National Electricity Plan (Transmission) launched", source: "Press Information Bureau (Ministry of Power)", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2064751", year: "2024" },
    { title: "Approved inter-state transmission (ISTS) schemes", source: "Central Transmission Utility of India (CTUIL)", url: "https://www.ctuil.in/ists-schemes" },
    { title: "ISTS waiver sunset casts shadow on 26 GW of renewable projects", source: "Crisil Ratings", url: "https://www.crisilratings.com/en/home/newsroom/press-releases/2025/07/ists-waiver-sunset-casts-shadow-on-26-gw-of-renewable-projects.html", year: "2025" },
    { title: "Revamped Distribution Sector Scheme (RDSS)", source: "Ministry of Power", url: "https://rdss.powermin.gov.in/" },
  ],
};
