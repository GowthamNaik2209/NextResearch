import type { SectorReport } from "./types";

export const semiconductors: SectorReport = {
  slug: "semiconductors",
  title: "India Semiconductors",
  subtitle: "From a pure chip importer to a first wave of fabs and OSAT plants",
  asOf: "Nov 2026",

  stance: {
    label: "Early build-out",
    tone: "pos",
    line: "Chip output is still tiny; near-term value accrues to OSAT, materials, utilities and design-services suppliers getting qualified first.",
  },
  keyStats: [
    { label: "India chip demand, 2024", value: "~$45-50 bn", sub: "approx. (IESA / Counterpoint)" },
    { label: "ISM first-phase outlay", value: "₹76,000 Cr", sub: "approved Dec 2021" },
    { label: "Approved fab/OSAT projects", value: "12", sub: ">₹1.64L Cr; 5 producing (ISM)" },
    { label: "Chips imported", value: ">90%", sub: "first local packaging ramping" },
  ],
  thesis: [
    {
      title: "Packaging comes before wafers",
      body: "Eleven of the 12 approved projects are OSAT/ATMP, compound-semiconductor or display units that ramp in 2-3 years, while the Tata-PSMC Dholera fab is guided to mid-2028.",
    },
    {
      title: "Incentives de-risk the capex",
      body: "Under Semicon 1.0 the Centre funded 50% of project cost and states added 20-25%, so promoters carried only a fraction of capex. Semicon 2.0 (Jul 2026) pays 25-40% by plant type, so newer projects carry more of their own cost.",
    },
    {
      title: "Picks and shovels earn first",
      body: "Gases, ultra-pure chemicals and water, cleanroom HVAC and design services get paid during construction and qualification, years before fab utilisation matters.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Tata's Assam chip plant starts pilot production",
      body: "Tata Electronics completed its first cleanroom at Jagiroad and began pilot runs at partial capacity; commercial production is expected around Dec 2026-Jan 2027 (Assam Tribune). Planned output is 48 million chips a day.",
      impact: "pos",
      tag: "OSAT",
    },
    {
      date: "Sep 2026",
      title: "Five Semicon 1.0 plants now in production",
      body: "On 17 Sep, at SEMICON India, the Prime Minister launched commercial production at CDIL (Mohali) and Suchi Semicon (Surat), joining Micron, Kaynes and CG Semi - five of the 12 approved units (ISM / MeitY).",
      impact: "pos",
      tag: "Milestone",
    },
    {
      date: "Jul 2026",
      title: "CG Semi plant opens; Semicon 2.0 approved",
      body: "The Prime Minister inaugurated CG Semi's ₹7,600 Cr chip-packaging plant at Sanand on 4 Jul. On 15 Jul the Cabinet approved Semicon 2.0 (₹1.27L Cr) to fund fabs, packaging, equipment, materials and design, at 25-40% of capex against 50% under Semicon 1.0.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Mar 2026",
      title: "Kaynes Semicon starts commercial production",
      body: "Kaynes' Sanand OSAT became India's second operating chip-packaging plant after Micron, making power modules for autos and industry.",
      impact: "pos",
      tag: "Capacity",
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
      title: "Approvals reach ten projects",
      body: "After India Chip's (HCL-Foxconn) ~₹3,700 Cr display-driver OSAT at Jewar in May, Cabinet cleared ~₹4,600 Cr of units incl. SiCSem's silicon-carbide fab in Odisha and OSATs in Punjab and Andhra Pradesh, taking the tally to ten.",
      impact: "pos",
      tag: "Policy",
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
      source: "IESA / Counterpoint estimates to 2024; 2030P = NITI Aayog projection (~US$90bn, May 2026); 2026P and 2028P are NextResearch estimates",
      points: [
        { label: "2021", value: 27 },
        { label: "2022", value: 33 },
        { label: "2023", value: 38 },
        { label: "2024", value: 45 },
        { label: "2026P", value: 55, projected: true },
        { label: "2028P", value: 70, projected: true },
        { label: "2030P", value: 90, projected: true },
      ],
    },
    snapshot: [
      { label: "Demand growth, 2024-30P", value: "~12% CAGR", tone: "pos" },
      { label: "Central support, Semicon 1.0 / Semicon 2.0", value: "50% / 25-40% of capex", tone: "pos" },
      { label: "Commercial fabs operating", value: "0 (Dholera guided mid-2028)", tone: "neg" },
      { label: "Share of global chip designers", value: "~20%", tone: "pos" },
      { label: "Chip import dependence", value: ">90%", tone: "neg" },
      { label: "ISM outlay committed", value: "Nearly all", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Chip design & IP", zoneIds: ["design_services"], margin: "15-20% EBITDA", moat: "medium", note: "India's existing strength; services today, product IP still rare." },
    { stage: "Gases & chemicals", zoneIds: ["gases", "chemicals"], margin: "20-30% EBITDA", moat: "high", note: "Purity qualification is slow, sticky and pays for decades." },
    { stage: "Cleanroom & utilities", zoneIds: ["cleanroom_utilities"], margin: "8-12% EBITDA", moat: "medium", note: "HVAC, ultra-pure water and power - project revenue during construction." },
    { stage: "Wafer fabrication", zoneIds: ["wafer_fab"], margin: "Loss-making in ramp", moat: "high", note: "Mature nodes (28-110nm) first; returns hinge on utilisation and yields." },
    { stage: "OSAT / ATMP", zoneIds: ["atmp"], margin: "15-25% EBITDA at scale", moat: "medium", note: "Most near-term capacity; lower capex and faster ramp than fabs." },
    { stage: "EMS & system integration", zoneIds: ["ems_downstream"], margin: "3-8% EBITDA", moat: "low", note: "Captive demand for local chips; scale-driven, thin margins." },
  ],

  drivers: [
    { title: "Fiscal incentives", metric: "25-50% central", body: "Semicon 1.0 paid 50% pari-passu (states added 20-25%); Semicon 2.0 pays 40% for silicon fabs down to 25% for legacy packaging (notified Aug 2026). State top-ups still make India a cheap place to build a fab or OSAT." },
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
      { point: "Global chip cycles and pricing set utilisation; a downturn hurts sub-scale new entrants first.", impact: "neg" },
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
    { key: "cgpower", tier: "core", why: "Sanand OSAT JV with Renesas and Stars; main plant inaugurated Jul 2026." },
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
    { key: "cgpower", date: "Jul 2026", development: "The Prime Minister inaugurated CG Semi's ₹7,600 Cr Sanand chip-packaging plant on 4 Jul, a year after its pilot line.", impact: "A listed company now runs an operating Indian chip plant; ramp-up losses are the near-term cost.", tone: "pos" },
    { key: "kaynes", date: "Mar 2026", development: "Kaynes Semicon began commercial production at its ₹3,307 Cr Sanand OSAT (approved Sep 2024).", impact: "Gives listed investors a second operating OSAT, integrated with EMS; the test now is utilisation.", tone: "pos" },
    { key: "dixon", date: "2025-26", development: "Expanded into display and camera modules via JVs under component incentives.", impact: "Deepens local component demand that future Indian chips can serve.", tone: "pos" },
    { key: "moschip", date: "2025-26", development: "Grew design-services revenue strongly with larger ASIC and embedded programmes.", impact: "Shows India's design layer monetising ahead of manufacturing.", tone: "pos" },
    { key: "spelsemi", date: "2025-26", development: "Revenue stayed small and losses persisted as large new OSATs came up.", impact: "Scale and customer qualification matter more than being first.", tone: "neg" },
  ],

  risks: [
    { risk: "Fab execution and yield delays", mitigant: "Experienced partners (PSMC, Renesas); milestone-linked subsidy", severity: "high" },
    { risk: "Global chip downcycle hits new-plant utilisation", mitigant: "Mature-node and auto/industrial focus; captive local demand", severity: "medium" },
    { risk: "Water, power and materials gaps at clusters", mitigant: "State-built utilities; local gas and chemical capacity", severity: "medium" },
    { risk: "Semicon 2.0 support is slower or smaller than hoped", mitigant: "₹1.27L Cr Semicon 2.0 approved Jul 2026; strong state-level competition", severity: "medium" },
  ],
  outlook: {
    bull: "Dholera fab ramps on time, OSATs fill up with global customers and India meets ~15-20% of its chip demand locally by 2030.",
    base: "OSATs ramp through FY27-28 and the first fab starts around 2028; local supply stays under 10% of demand by 2030.",
    bear: "Fab delays and a chip downcycle leave plants under-utilised; India remains mainly an importer and packager.",
  },
  reading: [
    { title: "India Semiconductor Mission", source: "Ministry of Electronics & IT", url: "https://ism.gov.in/" },
    { title: "Electronics and semiconductor policy", source: "Ministry of Electronics & IT", url: "https://www.meity.gov.in/" },
    { title: "Semiconductor Industry Outlook", source: "Deloitte Insights", url: "https://www.deloitte.com/us/en/insights/industry/technology/technology-media-telecom-outlooks/semiconductor-industry-outlook.html" },
    { title: "Industry research and reports", source: "India Electronics & Semiconductor Association", url: "https://www.iesaonline.org/" },
    { title: "Future of India's Semiconductor Industry (roadmap to 2035)", source: "NITI Aayog, May 2026", url: "https://www.niti.gov.in/index.php/node/2328" },
    { title: "Global semiconductor market forecasts", source: "World Semiconductor Trade Statistics", url: "https://www.wsts.org/" },
  ],
};
