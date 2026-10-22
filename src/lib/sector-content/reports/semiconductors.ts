import type { SectorReport } from "./types";

export const semiconductors: SectorReport = {
  slug: "semiconductors",
  title: "India Semiconductors",
  subtitle: "From a pure chip importer to a first wave of fabs and OSAT plants",
  asOf: "Oct 2026",

  stance: {
    label: "Early build-out",
    tone: "pos",
    line: "Chip output is still tiny; near-term value accrues to OSAT, materials, utilities and design-services suppliers getting qualified first.",
  },
  keyStats: [
    { label: "India chip demand, 2024", value: "~$45-50 bn", sub: "approx. (IESA / Counterpoint)" },
    { label: "ISM first-phase outlay", value: "₹76,000 Cr", sub: "approved Dec 2021" },
    { label: "Approved fab/OSAT projects", value: "10", sub: "~₹1.6L Cr investment" },
    { label: "Chips imported", value: ">90%", sub: "first local packaging ramping" },
  ],
  thesis: [
    {
      title: "Packaging comes before wafers",
      body: "Nine of the ten approved projects are OSAT/ATMP or compound-semiconductor units that ramp in 2-3 years, while the Tata-PSMC Dholera fab is a 2027+ story.",
    },
    {
      title: "Incentives de-risk the capex",
      body: "The Centre funds ~50% of project cost and states add 20-25%, so promoters carry only a fraction of capex - turning plans into actual construction.",
    },
    {
      title: "Picks and shovels earn first",
      body: "Gases, ultra-pure chemicals and water, cleanroom HVAC and design services get paid during construction and qualification, years before fab utilization matters.",
    },
  ],

  developments: [
    {
      date: "2026",
      title: "ISM 2.0 on the policy agenda",
      body: "With the first-phase outlay nearly fully committed, the government has signalled a second phase aimed at more fabs, equipment and materials.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Sep 2025",
      title: "First India-made chips at Semicon India",
      body: "Pilot-line packaged chips from Sanand and ISRO-SCL's Vikram processor were showcased, marking the move from announcements to output.",
      impact: "pos",
      tag: "Milestone",
    },
    {
      date: "Aug 2025",
      title: "Four more projects approved",
      body: "Cabinet cleared ~₹4,600 Cr of units incl. SiCSem's silicon-carbide fab in Odisha and OSATs in Punjab and Andhra Pradesh, taking the tally to ten.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "May 2025",
      title: "HCL-Foxconn OSAT at Jewar",
      body: "A ~₹3,700 Cr display-driver chip unit near Noida Airport was approved, adding a north-India cluster.",
      impact: "pos",
      tag: "Capacity",
    },
    {
      date: "Mar 2025",
      title: "₹22,919 Cr components scheme",
      body: "The Electronics Component Manufacturing Scheme backs passive parts, PCBs and modules, deepening local demand next to the OSATs.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Feb 2024",
      title: "Tata fab and three OSATs cleared",
      body: "Cabinet approved Tata-PSMC's ₹91,000 Cr Dholera fab, Tata's Assam OSAT and the CG Power-Renesas OSAT at Sanand.",
      impact: "pos",
      tag: "Capacity",
    },
  ],

  overview: {
    narrative: [
      "India consumes roughly $45-50 bn of chips a year, almost all imported and mostly inside phones, PCs and consumer electronics assembled locally.",
      "The India Semiconductor Mission funds fabs, OSAT/ATMP, compound semiconductors and design (DLI scheme); Micron's Sanand ATMP was the anchor project in 2023.",
      "Binding constraints are ecosystem depth - equipment, specialty materials, reliable power and water - and the decade it takes to build process know-how.",
    ],
    chart: {
      title: "Semiconductor consumption in India",
      unit: "$ bn",
      source: "IESA / Counterpoint estimates, 2026-30 NextResearch projections",
      points: [
        { label: "2021", value: 27 },
        { label: "2022", value: 33 },
        { label: "2023", value: 38 },
        { label: "2024", value: 45 },
        { label: "2026P", value: 55, projected: true },
        { label: "2028P", value: 75, projected: true },
        { label: "2030P", value: 105, projected: true },
      ],
    },
    snapshot: [
      { label: "Demand growth, 2024-30P", value: "~14% CAGR", tone: "pos" },
      { label: "Central fiscal support", value: "~50% of capex", tone: "pos" },
      { label: "Commercial fabs operating", value: "0 (first by 2027P)", tone: "neg" },
      { label: "Share of global chip designers", value: "~20%", tone: "pos" },
      { label: "Chip import dependence", value: ">90%", tone: "neg" },
      { label: "ISM outlay committed", value: "Nearly all", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Chip design & IP", zoneIds: ["design_services"], margin: "15-20% EBITDA", moat: "medium", note: "India's existing strength; services today, product IP still rare." },
    { stage: "Gases & chemicals", zoneIds: ["gases", "chemicals"], margin: "20-30% EBITDA", moat: "high", note: "Purity qualification is slow, sticky and pays for decades." },
    { stage: "Cleanroom & utilities", zoneIds: ["cleanroom_utilities"], margin: "8-12% EBITDA", moat: "medium", note: "HVAC, ultra-pure water and power - project revenue during construction." },
    { stage: "Wafer fabrication", zoneIds: ["wafer_fab"], margin: "Loss-making in ramp", moat: "high", note: "Mature nodes (28-110nm) first; returns hinge on utilization and yields." },
    { stage: "OSAT / ATMP", zoneIds: ["atmp"], margin: "15-25% EBITDA at scale", moat: "medium", note: "Most near-term capacity; lower capex and faster ramp than fabs." },
    { stage: "EMS & system integration", zoneIds: ["ems_downstream"], margin: "3-8% EBITDA", moat: "low", note: "Captive demand for local chips; scale-driven, thin margins." },
  ],

  drivers: [
    { title: "Fiscal incentives", metric: "~70-75% of capex", body: "Central 50% pari-passu support plus state top-ups make India one of the cheapest places to build a fab or OSAT." },
    { title: "Local electronics demand", metric: "~₹11L Cr", body: "Electronics production (FY25, approx.) led by phones creates a captive buyer base for packaged chips." },
    { title: "China+1 supply chains", metric: "Mature nodes", body: "Auto, industrial and power customers want non-China capacity for legacy and power chips." },
    { title: "Design talent", metric: "~20% of designers", body: "Global chip firms already run large design centres in India, feeding fabless and services growth." },
  ],
  mix: {
    title: "India chip demand by end-use, 2024 (approx.)",
    source: "IESA / Counterpoint",
    slices: [
      { label: "Mobile & wearables", value: 38 },
      { label: "Computing & data", value: 20 },
      { label: "Automotive", value: 12 },
      { label: "Industrial & power", value: 12 },
      { label: "Consumer, telecom & other", value: 18 },
    ],
  },

  pestle: {
    political: [
      { point: "Semiconductors are a strategic priority with central and state incentives aligned across Gujarat, Assam, UP and Odisha.", impact: "pos" },
      { point: "US-China tech rivalry opens partner doors but exposes India to export-control spillovers.", impact: "neutral" },
    ],
    economic: [
      { point: "Subsidised capex and low labour cost help OSAT economics versus Southeast Asia.", impact: "pos" },
      { point: "Global chip cycles and pricing set utilization; a downturn hurts sub-scale new entrants first.", impact: "neg" },
    ],
    social: [
      { point: "Large engineering talent pool and design workforce support the ecosystem.", impact: "pos" },
      { point: "Shortage of experienced fab process and equipment engineers forces reliance on foreign partners.", impact: "neg" },
    ],
    technological: [
      { point: "Advanced packaging and compound semiconductors (SiC, GaN) let India skip leading-edge node races.", impact: "pos" },
      { point: "Partners like PSMC, Renesas and Micron own the process know-how; tech transfer is gradual.", impact: "neutral" },
    ],
    legal: [
      { point: "Project-specific approvals with milestone-linked disbursement enforce execution discipline.", impact: "neutral" },
      { point: "Foreign tech licences and export-control rules can restrict tool and IP access.", impact: "neg" },
    ],
    environmental: [
      { point: "Fabs need large volumes of ultra-pure water and steady power, testing state infrastructure.", impact: "neg" },
      { point: "Fluorinated process gases are potent greenhouse gases, requiring abatement and recycling.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "kaynes", tier: "core", why: "₹3,300 Cr Sanand OSAT with ISM support plus in-house EMS demand for its chips." },
    { key: "cgpower", tier: "core", why: "Sanand OSAT JV with Renesas and Stars; pilot line already shipping samples." },
    { key: "spelsemi", tier: "direct", why: "India's only listed legacy pure-play OSAT; small but a direct capacity proxy." },
    { key: "moschip", tier: "direct", why: "Fabless ASIC/SoC design services; benefits from DLI scheme and global outsourcing." },
    { key: "linde", tier: "direct", why: "Bulk and specialty gases - every fab and OSAT needs on-site supply." },
    { key: "srf", tier: "indirect", why: "Fluorochemical know-how extendable to electronic-grade etch and clean gases." },
    { key: "ionexchange", tier: "indirect", why: "Ultra-pure water systems, a must-have utility for fab and OSAT campuses." },
    { key: "bluestar", tier: "indirect", why: "Precision cleanroom HVAC for fab and ATMP construction." },
    { key: "dixon", tier: "indirect", why: "India's largest EMS; future anchor buyer of locally packaged chips." },
    { key: "asmtech", tier: "indirect", why: "Embedded and VLSI engineering services tied to semiconductor customers." },
  ],

  companyNews: [
    { key: "cgpower", date: "Aug 2025", development: "Inaugurated the pilot line at its Sanand OSAT, ahead of the main plant.", impact: "First listed company to produce packaged chips in India under ISM.", tone: "pos" },
    { key: "kaynes", date: "Sep 2024", development: "Cabinet approved its ₹3,307 Cr OSAT at Sanand; first chips followed in 2025-26.", impact: "Gives listed investors a second OSAT pure play integrated with EMS.", tone: "pos" },
    { key: "dixon", date: "2025-26", development: "Expanded into display and camera modules via JVs under component incentives.", impact: "Deepens local component demand that future Indian chips can serve.", tone: "pos" },
    { key: "moschip", date: "2025-26", development: "Grew design-services revenue strongly with larger ASIC and embedded programmes.", impact: "Shows India's design layer monetizing ahead of manufacturing.", tone: "pos" },
    { key: "spelsemi", date: "2025-26", development: "Revenue stayed small and losses persisted as large new OSATs came up.", impact: "Scale and customer qualification matter more than being first.", tone: "neg" },
  ],

  risks: [
    { risk: "Fab execution and yield delays", mitigant: "Experienced partners (PSMC, Renesas); milestone-linked subsidy", severity: "high" },
    { risk: "Global chip downcycle hits new-plant utilization", mitigant: "Mature-node and auto/industrial focus; captive local demand", severity: "medium" },
    { risk: "Water, power and materials gaps at clusters", mitigant: "State-built utilities; local gas and chemical capacity", severity: "medium" },
    { risk: "Incentive pause after ISM first phase", mitigant: "ISM 2.0 signalled; strong state-level competition", severity: "medium" },
  ],
  outlook: {
    bull: "Dholera fab ramps on time, OSATs fill up with global customers and India meets ~15-20% of its chip demand locally by 2030.",
    base: "OSATs ramp through FY27-28 and the first fab starts by 2027-28; local supply stays under 10% of demand by 2030.",
    bear: "Fab delays and a chip downcycle leave plants under-utilized; India remains mainly an importer and packager.",
  },
  reading: [
    { title: "India Semiconductor Mission", source: "Ministry of Electronics & IT", url: "https://ism.gov.in/" },
    { title: "Electronics and semiconductor policy", source: "Ministry of Electronics & IT", url: "https://www.meity.gov.in/" },
    { title: "Semiconductor Industry Outlook", source: "Deloitte Insights", url: "https://www.deloitte.com/us/en/insights/industry/technology/technology-media-telecom-outlooks/semiconductor-industry-outlook.html" },
    { title: "Industry research and reports", source: "India Electronics & Semiconductor Association", url: "https://www.iesaonline.org/" },
    { title: "Global semiconductor market forecasts", source: "World Semiconductor Trade Statistics", url: "https://www.wsts.org/" },
  ],
};
