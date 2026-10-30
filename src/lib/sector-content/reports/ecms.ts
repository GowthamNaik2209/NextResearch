import type { SectorReport } from "./types";

export const ecms: SectorReport = {
  slug: "ecms",
  title: "India Electronic Components (ECMS)",
  subtitle: "From assembling phones to making what goes inside them",
  asOf: "Oct 2026",

  stance: {
    label: "Positive, execution-heavy",
    tone: "pos",
    line: "Approvals have beaten the investment and production targets (jobs still lag); the next 18 months decide whether the PCB, module and laminate plants run full and profitably.",
  },
  keyStats: [
    { label: "ECMS outlay", value: "₹40,000 Cr", sub: "up from ₹22,919 Cr (Budget 2026-27)" },
    { label: "Approved investment", value: "₹69,548 Cr", sub: "106 projects by 17 Aug 2026 (MeitY)" },
    { label: "Expected production", value: "₹5.34L Cr", sub: "vs ₹4.57L Cr target (MeitY)" },
    { label: "Component imports, FY26", value: "~US$40bn", sub: "of which ICs ~US$30bn (CRISIL)" },
  ],
  thesis: [
    {
      title: "Assembly built the base; components are the profit pool",
      body: "India makes ~₹6.27L Cr of phones a year but adds only ~18-20% of their value. ECMS pays 1-10% of extra sales or 25% of capex to make boards, modules, enclosures, passives and materials here.",
    },
    {
      title: "Listed EMS firms are integrating backwards",
      body: "Kaynes (₹3,280 Cr across HDI, PCB, laminate, camera), Amber (₹4,200 Cr of PCB plants), Syrma and Dixon (camera and display JVs) turn from assemblers into component makers - with higher margins if yields come through.",
    },
    {
      title: "Materials and equipment are the second wave",
      body: "Capacitor film (SRF), electrolyte additives (Acutaas), acetylene black (PCBL), laminate (Wipro, Kaynes) and machine tools (Jyoti CNC) are now approved - smaller today, but they sell to every plant that follows.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "States stack incentives on top of ECMS",
      body: "Uttar Pradesh's electronics component policy lets ECMS-approved units claim a matching state incentive, with combined central and state support capped at 100% of eligible capital investment.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "17 Aug 2026",
      title: "Fifth tranche: 31 projects, ₹7,877 Cr",
      body: "Included India's first acetylene black (PCBL) and electrolyte additives (Acutaas), Jyoti CNC's ₹1,021 Cr capital-goods plan and a ₹1,033 Cr Wipro laminate expansion. Totals reached 106 projects and ₹69,548 Cr; 38 projects are producing.",
      impact: "pos",
      tag: "Approvals",
    },
    {
      date: "Mar 2026",
      title: "Fourth tranche brings first SMD passives",
      body: "29 projects worth ₹7,104 Cr, including tantalum polymer capacitors, Lohum's ₹700 Cr rare-earth magnet project (approved, not yet built; MeitY called it India's first magnet plant starting from rare-earth oxides) and Dixon's ₹1,100 Cr display-module plant. Dixon's HKC display JV cleared Press Note 3 on 9 Mar.",
      impact: "pos",
      tag: "Approvals",
    },
    {
      date: "Feb 2026",
      title: "Budget lifts the outlay to ₹40,000 Cr",
      body: "Union Budget 2026-27 raised ECMS from ₹22,919 Cr after applications (249 received) and approvals ran well ahead of the original investment target.",
      impact: "pos",
      tag: "Budget",
    },
    {
      date: "2 Jan 2026",
      title: "Third tranche: ₹41,863 Cr in one go",
      body: "22 projects including Samsung Display, Foxconn (Yuzhan), Tata Electronics and Motherson enclosures, Hindalco extrusions, AT&S and Ascent-K PCBs, ATL cells and Wipro laminate.",
      impact: "pos",
      tag: "Approvals",
    },
    {
      date: "27 Oct 2025",
      title: "First seven projects approved",
      body: "₹5,532 Cr for Kaynes Circuits (HDI and multi-layer PCB, laminate, camera modules), Syrma (multi-layer PCB), Ascent Circuits (multi-layer PCB) and SRF (capacitor film).",
      impact: "pos",
      tag: "Approvals",
    },
  ],

  overview: {
    narrative: [
      "The Electronics Component Manufacturing Scheme was approved by the Cabinet on 28 Mar 2025 and notified on 8 Apr 2025. It runs FY26-FY32 (six years plus an optional gestation year) and pays three ways: a turnover-linked incentive on extra sales, a 25% capex subsidy, or a hybrid of both for priority parts like HDI boards and SMD passives.",
      "Windows for modules, boards and passives closed on 30 Sep 2025; the supply-chain and capital-equipment window stays open until 30 Apr 2027. One percentage point of the turnover rate (five of the 25% capex) is withheld unless employment targets are met.",
      "Approvals now exceed the scheme's investment (₹59,350 Cr) and production targets, but employment (74,628 vs 91,600) lags, and most big plants are still starting up.",
    ],
    chart: {
      title: "ECMS approved investment, cumulative",
      unit: "₹ '000 Cr",
      source: "MeitY / PIB tranche announcements (Oct 2025 - Aug 2026)",
      points: [
        { label: "Oct 25", value: 5.5 },
        { label: "Nov 25", value: 12.7 },
        { label: "Jan 26", value: 54.6 },
        { label: "Mar 26", value: 61.7 },
        { label: "Aug 26", value: 69.5 },
      ],
    },
    snapshot: [
      { label: "Projects approved (17 Aug 2026)", value: "106 in 15 states", tone: "pos" },
      { label: "Projects in production", value: "38 (16 under construction)", tone: "neutral" },
      { label: "Direct jobs approved vs target", value: "74,628 vs 91,600", tone: "neg" },
      { label: "Phone production, FY26", value: "~₹6.27L Cr", tone: "pos" },
      { label: "Domestic value addition (GTRI)", value: "~18-20%", tone: "neg" },
      { label: "Capital-equipment window closes", value: "30 Apr 2027", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Materials & passives", zoneIds: ["laminate", "passives", "cellmat"], margin: "Specialty chemicals earn well (Acutaas ~27% net, FY26); commodity carbon thin (PCBL ~2%)", moat: "high", note: "Global oligopolies in laminate and MLCCs; Indian entry via materials and film. Paid as a 25% capex subsidy." },
    { stage: "Bare boards (PCB, HDI)", zoneIds: ["mlb", "hdi"], margin: "Not yet reported - plants ramping", moat: "high", note: "Capital- and know-how-heavy; HDI gets 25% capex plus 4-8% of extra sales. Risk of many fabs starting at once." },
    { stage: "Modules (camera, display)", zoneIds: ["camera", "display"], margin: "Thin; set by phone brands", moat: "medium", note: "High volume, Chinese/Korean technology partners, 1-5% turnover incentive." },
    { stage: "Enclosures & equipment", zoneIds: ["enclosures", "capgoods"], margin: "Machine-tool ~16% net (Jyoti CNC, FY26)", moat: "medium", note: "Precision machining for phones and laptops; Indian machine tools chase the capex wave." },
    { stage: "EMS assembly", zoneIds: ["ems"], margin: "~3-10% net (Dixon 3.4%, Kaynes 10%, FY26)", moat: "low", note: "Scale and customers; backward integration is how assemblers lift margins." },
  ],

  drivers: [
    { title: "Phone and laptop assembly", metric: "₹6.27L Cr phones, FY26", body: "Every phone assembled here is a customer for local enclosures, HDI boards, camera and display modules and cells." },
    { title: "Component demand", metric: "US$240bn by 2030 (CII)", body: "CII sees India's demand for components and sub-assemblies rising from ~US$45.5bn to US$240bn by 2030 if electronics output reaches US$500bn." },
    { title: "Incentive design", metric: "1-10% of extra sales / 25% capex", body: "Paid only on delivered incremental sales or capex, with an employment-linked slice - money follows real production." },
    { title: "China+1 sourcing", metric: "~US$40bn imports, FY26", body: "Brands want non-China supply for US and European markets; import substitution is a large, visible pool." },
  ],
  mix: {
    title: "ECMS approved investment by tranche",
    source: "MeitY / PIB (₹69,548 Cr total, to 17 Aug 2026)",
    slices: [
      { label: "Oct 2025 (7 projects)", value: 8 },
      { label: "Nov 2025 (17 projects)", value: 10 },
      { label: "Jan 2026 (22 projects)", value: 60 },
      { label: "Mar 2026 (29 projects)", value: 10 },
      { label: "Aug 2026 (31 projects)", value: 11 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong central and state backing: outlay nearly doubled, and states (UP, AP, Tamil Nadu) add their own incentives.", impact: "pos" },
      { point: "Press Note 3 gates Chinese partners, slowing module JVs that depend on Chinese technology.", impact: "neg" },
    ],
    economic: [
      { point: "~US$40bn of component imports a year is a large, visible substitution pool.", impact: "pos" },
      { point: "Many fabs and module plants start at once; low early utilisation and Chinese pricing can squeeze margins.", impact: "neg" },
    ],
    social: [
      { point: "~74,600 direct jobs approved so far, concentrated in Tamil Nadu, Karnataka, UP and Andhra Pradesh.", impact: "pos" },
      { point: "Shortage of experienced PCB, clean-room and process engineers.", impact: "neg" },
    ],
    technological: [
      { point: "First Indian HDI, laminate, SMD passives and battery-material plants - real capability building.", impact: "pos" },
      { point: "Most know-how is licensed from Korean, Chinese, Japanese or European partners.", impact: "neutral" },
    ],
    legal: [
      { point: "Incentives paid only on certified incremental sales or capex; claims due within nine months of the year end.", impact: "neutral" },
      { point: "Missing employment targets cuts the incentive (1 point of turnover rate, 5 points of capex).", impact: "neg" },
    ],
    environmental: [
      { point: "PCB plating and etching are water- and chemical-intensive; effluent permits can delay plants.", impact: "neg" },
      { point: "Local supply shortens logistics chains for brands with supply-chain emission goals.", impact: "pos" },
    ],
  },

  beneficiaries: [
    { key: "kaynes", tier: "core", why: "Broadest ECMS footprint (HDI, multi-layer PCB, laminate, camera modules: ₹3,280 Cr) - but under accounting scrutiny." },
    { key: "amber", tier: "core", why: "Ascent Circuits and the Ascent-K HDI JV make it the largest listed PCB bet (~₹4,200 Cr)." },
    { key: "syrma", tier: "core", why: "Multi-layer PCB fab in Andhra Pradesh plus camera modules and coils." },
    { key: "dixon", tier: "core", why: "Camera, display and optical-transceiver JVs feed its own phone and TV assembly." },
    { key: "acutaas", tier: "direct", why: "Electrolyte additives approved; battery chemicals already in commercial supply." },
    { key: "jyoticnc", tier: "direct", why: "Largest capital-equipment approval; enclosure plants need thousands of machines." },
    { key: "srf", tier: "direct", why: "Capacitor-grade polypropylene film line commissioned May 2026." },
    { key: "pcbl", tier: "indirect", why: "Acetylene black for Li-ion cells - a new line beside its carbon-black core." },
    { key: "motherson", tier: "indirect", why: "Phone and IT-hardware enclosures; small vs its auto business." },
    { key: "mindacorp", tier: "indirect", why: "Automotive TFT display modules via Minda Instruments." },
  ],

  companyNews: [
    { key: "kaynes", date: "Aug 2026", development: "In Aug 2026 Kaynes said its Chennai PCB plant would go live within about a month; start-up not yet confirmed as of Oct 2026.", impact: "The first large ECMS board fab to start - a test of yields and customer uptake.", tone: "pos" },
    { key: "acutaas", date: "Aug 2026", development: "ECMS approval for its Jhagadia electrolyte-additives plant: ₹119 Cr eligible investment, up to 25% incentive through FY31.", impact: "Chemicals companies join the electronics supply chain via battery materials.", tone: "pos" },
    { key: "amber", date: "Jun 2026", development: "Broke ground on the Ascent-K HDI/flex PCB plant near Jewar and signed a cooperation pact with Germany's Schweizer Electronic.", impact: "Shows HDI capacity moving from approval to construction with European know-how.", tone: "pos" },
    { key: "srf", date: "May 2026", development: "Commissioned phase 1 of its capacitor-grade BOPP film line at Indore (~₹277 Cr).", impact: "First local supply of the dielectric film inside film capacitors.", tone: "pos" },
    { key: "dixon", date: "Mar 2026", development: "HKC display-module JV cleared under Press Note 3 (9 Mar) and Dixon Display got ECMS approval (30 Mar).", impact: "Unlocks the template for Chinese-partnered module plants.", tone: "pos" },
    { key: "kaynes", date: "Dec 2025", development: "Kotak Institutional Equities flagged accounting and disclosure inconsistencies in the FY25 annual report; the company disputed them.", impact: "Governance scrutiny now sits alongside the sector's highest-profile ECMS growth story.", tone: "neg" },
  ],

  risks: [
    { risk: "Plants start late or run at low utilisation (too many PCB fabs at once)", mitigant: "Turnover incentives reward volume; export customers and EMS captive demand", severity: "high" },
    { risk: "Dependence on Chinese partners and Press Note 3 approvals", mitigant: "Korean, Japanese and European partners for boards and laminate; minority Chinese stakes", severity: "medium" },
    { risk: "Governance and accounting questions in fast-growing EMS names", mitigant: "Investor and auditor scrutiny; independent broker reviews", severity: "medium" },
    { risk: "Employment targets missed, cutting incentives", mitigant: "Only a slice (1 point / 5 points) is employment-linked", severity: "low" },
  ],
  outlook: {
    bull: "PCB, HDI, laminate and module plants ramp on schedule, phone exports keep surging, and EMS margins rise as in-house components replace imports.",
    base: "Most approved plants start between now and FY28 with a year of start-up losses; incentives flow from FY27-FY28 and a handful of listed leaders capture most of the value.",
    bear: "Fabs start together into weak demand, Chinese pricing undercuts them, and JV approvals stall - leaving under-used capacity and delayed incentive claims.",
  },
  reading: [
    { title: "ECMS portal: guidelines and notifications", source: "MeitY", url: "https://ecms.meity.gov.in/" },
    { title: "Guidelines and portal launch for ECMS", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2124620" },
    { title: "First batch of seven ECMS projects approved", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2182986" },
    { title: "ECMS 2025: incentives and eligibility", source: "India Briefing", url: "https://www.india-briefing.com/news/ecms-2025-application-incentives-eligibility-37134.html/" },
    { title: "Industry reports", source: "India Cellular & Electronics Association (ICEA)", url: "https://www.icea.org.in/" },
  ],
};
