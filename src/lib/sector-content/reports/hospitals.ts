import type { SectorReport } from "./types";

export const hospitals: SectorReport = {
  slug: "hospitals",
  title: "India Hospitals & Healthcare",
  subtitle: "Beds, labs, medtech and the payers behind them - a market moving to insurance and listed chains",
  asOf: "Nov 2026",

  stance: {
    label: "Positive, with a regulatory overhang",
    tone: "pos",
    line: "Demand, insurance and bed scarcity support double-digit growth for listed chains; the pending Supreme Court order on medicine mark-ups and a wave of new beds are the things to watch.",
  },
  keyStats: [
    { label: "Healthcare delivery market, FY25", value: "~₹7L Cr", sub: "10-12% CAGR to FY30 (Crisil)" },
    { label: "Health insurance premium, FY26", value: "~₹1.37L Cr", sub: "up from ~₹1.17L Cr in FY25 (General Insurance Council)" },
    { label: "Beds per 10,000 people", value: "~16", sub: "~14 outside metros (Crisil, FY26)" },
    { label: "PM-JAY hospital admissions", value: "13.25 crore", sub: "worth ₹2.03L Cr, to Aug 2026 (NHA)" },
  ],
  thesis: [
    {
      title: "Scarce beds, rising acuity",
      body: "India has about 16 beds per 10,000 people and listed chains hold only about a fifth of the market. Chains that fill beds and raise ARPOB with complex care earn 25%+ margins on mature hospitals.",
    },
    {
      title: "Insurance is becoming the main payer",
      body: "Health premiums grew ~17% in FY26 after retail policies became GST-free, and CGHS rates were revised for the first time in ~15 years. More patients can pay, and payments are steadier - but payers also push back on prices.",
    },
    {
      title: "Supply and regulation are the tests",
      body: "Listed chains are adding beds at a record pace, often in the same cities, while the Supreme Court weighs a cap on hospital medicine mark-ups. Occupancy, ramp-up and pricing freedom will separate winners.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Paras Healthcare lists",
      body: "The ₹1,450 Cr IPO listed on 28 Oct at ₹720 on NSE (PARASHLTH), about 4% above the ₹693 issue price - adding a Bihar and north India chain to the listed set.",
      impact: "neutral",
      tag: "Listing",
    },
    {
      date: "Oct 2026",
      title: "Supreme Court reserves order on medicine mark-ups",
      body: "On 27 Oct the bench criticised mark-ups of up to ten times on cancer drugs and asked why the 30% trade-margin cap on them is not wider, then reserved its order (HDFC Securities). Hospital stocks had fallen sharply on 30 Sep, the day after the court floated a uniform 16% margin.",
      impact: "neg",
      tag: "Regulation",
    },
    {
      date: "Aug 2026",
      title: "Manipal Hospitals lists",
      body: "Manipal Health Enterprises listed on 5 Aug after a ₹9,275 Cr IPO (subscribed ~4.9x); most of the ~₹8,000 Cr fresh issue repays group borrowings, and part buys out minority holders in Sahyadri Hospitals.",
      impact: "pos",
      tag: "Listing",
    },
    {
      date: "Jul 2026",
      title: "ICRA sees 13-15% hospital revenue growth in FY27",
      body: "ICRA expects strong demand and a 6-8% rise in ARPOB to drive 13-15% revenue growth for its hospital sample in FY2027 and 15-17% in FY2028.",
      impact: "pos",
      tag: "Outlook",
    },
    {
      date: "Jul 2026",
      title: "Aster and Quality Care merge",
      body: "Aster DM Healthcare's merger with Blackstone-backed Quality Care India (CARE Hospitals, KIMSHEALTH, Evercare) took effect on 1 Jul, creating one of India's three largest chains with a 15,000-bed target for FY30.",
      impact: "pos",
      tag: "Consolidation",
    },
    {
      date: "Oct 2025",
      title: "CGHS rates revised after ~15 years",
      body: "The Centre revised rates for nearly 2,000 procedures from 13 Oct 2025, with a premium for super-specialty and accredited hospitals. Nuvama estimated 4-8% revenue gains for scheme-heavy chains.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "Crisil sizes India's healthcare delivery market at ~₹7L Cr in FY25, growing 10-12% a year to ₹11.2-12.2L Cr by FY30; inpatient care is 71-72% of the value. Listed chains hold about a fifth of it, so consolidation still has a long way to run.",
      "The chain links hospitals to specialty networks, pharmacies, labs and scanners, the medtech companies that equip them, and the insurers and government schemes that pay. Insurance and schemes now pay most private inpatient bills.",
      "The next two years are about filling the beds being built, holding pricing as insurers and courts push back, and integrating a wave of mergers and new listings (Manipal, Aster-Quality Care, Paras, Apollo Healthtech).",
    ],
    chart: {
      title: "India health insurance premium",
      unit: "₹ '000 Cr",
      source: "IRDAI annual reports (FY20-FY24); General Insurance Council via Business Standard and Cafemutual (FY25-FY26)",
      points: [
        { label: "FY20", value: 51.6 },
        { label: "FY21", value: 58.6 },
        { label: "FY22", value: 73.6 },
        { label: "FY23", value: 90.7 },
        { label: "FY24", value: 107.7 },
        { label: "FY25", value: 117 },
        { label: "FY26", value: 137 },
      ],
    },
    snapshot: [
      { label: "Delivery market growth, FY25-30 (Crisil)", value: "10-12% CAGR", tone: "pos" },
      { label: "Listed chains' share of market (Crisil)", value: "~20%", tone: "pos" },
      { label: "Hospital ARPOB growth, FY27E (ICRA)", value: "6-8%", tone: "pos" },
      { label: "Health share of non-life premium, FY26", value: "~41%", tone: "pos" },
      { label: "GST on individual health policies", value: "Nil since 22 Sep 2025", tone: "pos" },
      { label: "Hospital medicine mark-up case", value: "Order reserved (27 Oct 2026)", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Medtech & consumables", zoneIds: ["devices", "consumables"], margin: "15-30% EBITDA", moat: "medium", note: "Global majors dominate high-end equipment; Indian makers lead in disposables and gain in implants." },
    { stage: "Labs & imaging", zoneIds: ["diagnostics", "imaging"], margin: "20-30% EBITDA", moat: "medium", note: "Asset-light labs earn high returns but face price wars; imaging is capital-heavy but sticky." },
    { stage: "Hospital chains", zoneIds: ["chains"], margin: "20-30% EBITDA (mature)", moat: "high", note: "Land, doctors and brand are hard to copy; new hospitals lose money for 2-3 years." },
    { stage: "Specialty networks", zoneIds: ["specialty"], margin: "18-28% EBITDA", moat: "medium", note: "Repeatable formats scale fast; more cash-paid and doctor-dependent." },
    { stage: "Pharmacy", zoneIds: ["pharmacy"], margin: "3-9% EBITDA (retail)", moat: "low", note: "Thin-margin scale game outside hospitals; hospital pharmacy margins are under court scrutiny." },
    { stage: "Payers & platforms", zoneIds: ["insurers", "healthtech"], margin: "Combined ratio ~95-105%", moat: "medium", note: "Retail health insurance is profitable for focused players; platforms are mostly pre-profit." },
  ],

  drivers: [
    { title: "Bed scarcity", metric: "~16 beds / 10,000", body: "Far below global norms, especially outside metros, so well-run new hospitals still fill up - the question is how fast." },
    { title: "Insurance penetration", metric: "~17% premium growth, FY26", body: "GST-free retail policies and employer cover widen the paying base and shift bills away from cash and slow schemes." },
    { title: "Government schemes", metric: "13.25 crore admissions", body: "PM-JAY (extended to everyone 70+ in Oct 2024) and the revised CGHS rates bring paying volume to private hospitals." },
    { title: "Higher acuity", metric: "ARPOB +6-8% (ICRA)", body: "Oncology, transplants, robotic surgery and medical tourism raise revenue per bed faster than inflation." },
  ],
  mix: {
    title: "Who pays: payor mix of India's largest chain (Manipal), FY26",
    source: "Manipal Health Enterprises RHP (Jul 2026), via ICICI Direct",
    slices: [
      { label: "Insurers and TPAs", value: 50 },
      { label: "Cash (out of pocket)", value: 30 },
      { label: "Government schemes & others", value: 20 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong policy push on access: PM-JAY for the poor and all 70+ citizens, revised CGHS rates, Ayushman Bharat Digital Mission.", impact: "pos" },
      { point: "Healthcare prices are politically sensitive; states and courts can cap procedures, medicines and consumables.", impact: "neg" },
    ],
    economic: [
      { point: "Rising incomes and insurance shift spending to private hospitals; delivery market growing 10-12% a year.", impact: "pos" },
      { point: "Heavy bed additions and acquisition prices raise capex and leverage; new hospitals dilute returns for years.", impact: "neutral" },
    ],
    social: [
      { point: "Ageing and chronic disease (diabetes, cancer, heart disease) raise demand for complex care.", impact: "pos" },
      { point: "Affordability and trust in private hospital billing remain public concerns.", impact: "neg" },
    ],
    technological: [
      { point: "Robotic surgery, advanced radiation and genomics lift acuity and ARPOB.", impact: "pos" },
      { point: "Digital health IDs and the National Health Claims Exchange can speed cashless claims.", impact: "pos" },
    ],
    legal: [
      { point: "Supreme Court case on hospital medicine mark-ups (Kishan Chand Jain), order reserved Oct 2026.", impact: "neg" },
      { point: "NPPA price caps on stents and knee implants; Clinical Establishments Act rate-setting powers.", impact: "neg" },
    ],
    environmental: [
      { point: "Biomedical-waste and emission norms add operating cost.", impact: "neutral" },
      { point: "Heatwaves, air pollution and vector-borne disease raise seasonal admissions.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "apolloHosp", tier: "core", why: "Largest chain plus pharmacy, diagnostics and digital; HealthCo demerger targeted for Q4 FY27." },
    { key: "maxHealth", tier: "core", why: "Highest-occupancy large chain with brownfield bed growth and rising international patients." },
    { key: "manipal", tier: "core", why: "Largest bed network (~13,000 licensed beds), with room to add capacity on existing campuses." },
    { key: "fortis", tier: "core", why: "Margin recovery, bolt-on acquisitions and a CGHS beneficiary; owns Agilus labs." },
    { key: "medanta", tier: "direct", why: "High-acuity brand expanding into under-served north and east India." },
    { key: "narayana", tier: "direct", why: "Low-cost, high-volume model plus dollar and sterling earnings and its own insurance arm." },
    { key: "asterDm", tier: "direct", why: "Merger with Quality Care creates a top-three chain in south and central India." },
    { key: "starHealth", tier: "indirect", why: "Largest standalone health insurer; grows as retail cover spreads." },
    { key: "lalPath", tier: "indirect", why: "Asset-light lab leader that grows with testing volumes and preventive health." },
    { key: "polyMedicure", tier: "indirect", why: "Indian medtech leader whose disposables grow with every admission." },
  ],

  companyNews: [
    { key: "maxHealth", date: "Oct 2026", development: "Q2 FY27 gross revenue rose ~20% and network profit ~10% on higher bed occupancy, with international patient revenue up 33%.", impact: "Shows demand holding up even as new beds open.", tone: "pos" },
    { key: "starHealth", date: "Oct 2026", development: "Q2 FY27 gross written premium grew 19% with an underwriting profit - the fifth straight quarter of improvement.", impact: "A healthier main retail insurer supports insurance-led demand for hospitals.", tone: "pos" },
    { key: "manipal", date: "Aug 2026", development: "Listed on 5 Aug after a ₹9,275 Cr IPO; most of the fresh money repays group borrowings.", impact: "Sets a new valuation reference for hospital chains and adds the largest bed network to the listed set.", tone: "pos" },
    { key: "asterDm", date: "Jul 2026", development: "Merger with Quality Care India took effect on 1 Jul; renamed Aster DM Quality Care.", impact: "Consolidation among large chains is accelerating with private-equity owners.", tone: "pos" },
    { key: "fortis", date: "Dec 2025", development: "Agreed to buy People Tree Hospital, Bengaluru (125 beds, room for 300+) for ₹430 Cr.", impact: "Chains keep buying regional hospitals rather than only building new ones.", tone: "neutral" },
    { key: "narayana", date: "Nov 2025", development: "Completed the £188.78m acquisition of the UK's Practice Plus Group Hospitals.", impact: "First large overseas buy by an Indian chain; adds sterling earnings and NHS-funded volumes.", tone: "neutral" },
  ],

  risks: [
    { risk: "Supreme Court or NPPA cap on hospital medicine and consumable margins", mitigant: "Repricing of procedure packages; brokers expect much of the hit to be offset", severity: "high" },
    { risk: "Too many new beds in the same metro markets", mitigant: "Brownfield additions on proven campuses; expansion into under-served states", severity: "medium" },
    { risk: "Insurer and government pushback on rates and slow scheme payments", mitigant: "Higher insured share; CGHS revision; NABH accreditation premiums", severity: "medium" },
    { risk: "Doctor and nurse shortages raising costs", mitigant: "Training programmes, nursing colleges and hub-and-spoke networks", severity: "medium" },
  ],
  outlook: {
    bull: "Insurance keeps spreading, the court's order is mild, and new beds fill quickly - listed chains compound revenue at mid-to-high teens with rising margins.",
    base: "Revenue grows 13-15% (ICRA) on 6-8% ARPOB growth; new-bed drag and some pricing curbs hold margins roughly flat while consolidation continues.",
    bear: "A hard cap on medicine and consumable margins plus a glut of new metro beds cut occupancy and margins, and valuations de-rate.",
  },
  reading: [
    { title: "Hospitals: strong demand and 6-8% ARPOB rise to support 13-15% revenue growth in FY2027", source: "ICRA", url: "https://www.icra.in/Research/ViewResearchReport/7044", year: "2026" },
    { title: "Manipal Health Enterprises RHP (industry chapter by Crisil)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jul-2026/manipal-health-enterprises-limited-rhp_103034.html", year: "2026" },
    { title: "Ayushman Bharat PM-JAY", source: "National Health Authority", url: "https://nha.gov.in/PM-JAY" },
    { title: "Handbook of Indian insurance statistics", source: "IRDAI", url: "https://irdai.gov.in/handbook-of-indian-insurance" },
    { title: "Healthcare industry in India", source: "IBEF", url: "https://www.ibef.org/industry/healthcare-india" },
  ],
};
