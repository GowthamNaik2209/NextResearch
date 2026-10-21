import type { SectorReport } from "./types";

export const semicon2: SectorReport = {
  slug: "semicon2",
  title: "Semicon 2.0 + Mobile Phones (MPMS)",
  subtitle: "India's twin bets on chips and phone assembly, and who gets paid",
  asOf: "Oct 2026",

  stance: {
    label: "Positive, but early",
    tone: "pos",
    line: "MPMS gives phone assemblers five more years of incentives; Semicon 2.0's chip payoff is real but slow, and most of it sits in unlisted companies.",
  },
  keyStats: [
    { label: "Semicon 2.0 outlay", value: "Rs 1,27,500 Cr", sub: "Cabinet, 15 Jul 2026 (ISM)" },
    { label: "MPMS outlay", value: "Rs 62,500 Cr", sub: "FY27-FY31; notified 21 Aug 2026" },
    { label: "Smartphone exports, FY26", value: "~US$29bn", sub: "~75% iPhones (Commerce data, est.)" },
    { label: "Semicon 1.0 chip plants", value: "12 approved", sub: ">Rs 1.64 lakh Cr; 5 producing (ISM)" },
  ],
  thesis: [
    {
      title: "MPMS is the near-term money, for assemblers",
      body: "It pays 2.25-5% on phone sales, counted brand by brand, but only once a brand grows: it must sell Rs 5,000 crore more than in FY26 in FY27, and the hurdle rises by Rs 5,000 crore each year. So growth - mostly exports - decides who earns. Dixon and the iPhone assemblers (Foxconn, Tata Electronics) are first in line; brokerages see only a small margin lift, but volume stays in India.",
    },
    {
      title: "The 1.5% sourcing bonus links phones to chips",
      body: "Assemblers earn up to 1.5% more when key parts are localised for 25% of their phones. That pulls orders to Indian sub-assembly makers now (Kaynes, Syrma, Dixon's own module plants) and, as OSATs ramp, to chips packaged in India.",
    },
    {
      title: "Semicon 2.0 is a decade-long build",
      body: "It pays 25-40% of capital cost for fabs, chip packaging, tools and materials, plus design grants. Micron, Kaynes, CG Semi, CDIL and Suchi are producing; Tata's Dholera fab is guided to mid-2028. Listed exposure is thin: CG Power, Kaynes and a few suppliers.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Tata's Assam chip plant starts pilot production",
      body: "Tata Electronics completed its first cleanroom at Jagiroad and began pilot runs at about a quarter of capacity; commercial production is expected around Dec 2026-Jan 2027 (Assam Tribune). Planned output is 48 million chips a day.",
      impact: "pos",
      tag: "OSAT",
    },
    {
      date: "23 Sep 2026",
      title: "Five Semicon 1.0 plants now in production",
      body: "The Prime Minister launched commercial production at CDIL (Mohali) and Suchi Semicon (Surat), joining Micron, Kaynes and CG Semi - five of the 12 approved units (ISM).",
      impact: "pos",
      tag: "Chips",
    },
    {
      date: "17 Sep 2026",
      title: "SEMICON India: toolmakers commit",
      body: "Applied Materials announced a US$5bn, 10-year India plan including a 140-acre research park; L&T Semiconductor and Tata Electronics agreed to explore making and packaging L&T-designed chips in India.",
      impact: "pos",
      tag: "Equipment",
    },
    {
      date: "31 Aug 2026",
      title: "Semicon 2.0 notified",
      body: "Gazette notification for all six pillars (design, machines & materials, fabs, ATMP/OSAT, R&D, talent), with guidelines on 16 Sep. Applications are open for three years; support is paid over six years (ISM).",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "21 Aug 2026",
      title: "MPMS notified, two tracks",
      body: "Track 1 is open to makers with Rs 10,000 crore of FY26 turnover; each brand must then beat its FY26 sales by Rs 5,000 crore in FY27 (hurdle rising Rs 5,000 crore a year) and earns 2.25-5% on eligible sales; Track 2 (Indian brands, Rs 1,000 crore turnover) pays 5% plus 3% for design and R&D. Both get up to 1.5% for local sourcing.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "15 Jul 2026",
      title: "Cabinet clears both schemes",
      body: "Semicon 2.0 (Rs 1,27,500 crore) and MPMS (Rs 62,500 crore) were approved together. EMS stocks rallied the next day: Dixon rose 4-7%, Cyient DLM ~3%, Kaynes ~2%.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "India now makes about 99% of the phones it sells and has become the world's second-largest phone maker; smartphones were its largest single export category in 2025. But local value addition stayed near 18-19% under the smartphone PLI, against a 35-40% target - phones are assembled here from imported chips, screens and modules.",
      "The two schemes approved on 15 Jul 2026 attack that gap from both ends. MPMS keeps assembly growing and pays extra for local parts; Semicon 2.0 funds the chips themselves, from design to wafer fabs, packaging, equipment and materials. The adjacent ECMS scheme funds bare components (PCBs, camera and display modules).",
      "The money arrives at different speeds: MPMS claims can be filed quarterly from FY27, while most chip plants are still being built - only packaging plants are producing, and the first big fab is guided to 2028.",
    ],
    chart: {
      title: "India smartphone exports",
      unit: "US$ bn",
      source: "Commerce Ministry / ICEA; FY26E = ~US$29.4bn estimated from Commerce Ministry Apr-Feb (11-month) data (Business Today, 30 Apr 2026) - no official full-year figure found as of Oct 2026",
      points: [
        { label: "FY22", value: 5.7 },
        { label: "FY23", value: 11.1 },
        { label: "FY24", value: 15.6 },
        { label: "FY25", value: 24.1 },
        { label: "FY26E", value: 29.4 },
      ],
    },
    snapshot: [
      { label: "Mobile phone production, FY25", value: "Rs 5.45 lakh Cr (Economic Survey)", tone: "pos" },
      { label: "Smartphone exports, Q1 FY27", value: "US$9.84bn, +23% YoY", tone: "pos" },
      { label: "Local value addition under phone PLI", value: "~18-19% vs 35-40% target", tone: "neg" },
      { label: "MPMS max incentive (Track 1 / Track 2)", value: "6.5% / 9.5% of eligible sales", tone: "neutral" },
      { label: "Semicon 2.0 support, silicon fab", value: "40% of capex (min Rs 20,000 Cr)", tone: "pos" },
      { label: "First commercial wafer fab", value: "Tata-PSMC Dholera, guided mid-2028", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Chip design & IP", zoneIds: ["design"], margin: "10-20% services; higher for products", moat: "high", note: "Least capital-heavy; Indian listed exposure is mostly services, with product units at L&T and Cyient." },
    { stage: "Wafer fab, tools & gases", zoneIds: ["fab", "equipment", "gases"], margin: "Tools ~45-50% gross; gas contracts utility-like", moat: "high", note: "Fab owner is unlisted; listed upside is in gases and tool parts, years out." },
    { stage: "Packaging & test", zoneIds: ["osat", "advpack"], margin: "High single to low-teens EBIT at scale", moat: "medium", note: "Where India's chip output started; new plants lose money while they ramp and qualify customers." },
    { stage: "PCBA & sub-assemblies", zoneIds: ["subassy"], margin: "~6-12% EBITDA", moat: "medium", note: "The 1.5% MPMS sourcing bonus and ECMS pull work here; phone share of listed EMS revenue is still small." },
    { stage: "Phone assembly", zoneIds: ["phone_ems"], margin: "~3-5% EBITDA", moat: "low", note: "Scale and customer wins matter most; incentives are largely shared with brands." },
    { stage: "Brands & distribution", zoneIds: ["brands"], margin: "Brands keep most of the margin; distribution ~1-2% net", moat: "high", note: "Brands are mostly unlisted foreign subsidiaries; Track 2 targets Indian brands like Lava." },
  ],

  drivers: [
    { title: "MPMS incentives", metric: "Rs 62,500 Cr over 5 years", body: "2.25-5% on phone sales growth, up to 6.5% with local sourcing; Indian brands up to 9.5%." },
    { title: "Export programmes", metric: "~US$29bn in FY26", body: "iPhones are ~three-quarters of smartphone exports; exports are the only way most assemblers clear MPMS's rising Rs 5,000-crore-a-year growth hurdle." },
    { title: "Chip capex support", metric: "25-40% of capex", body: "Semicon 2.0 co-funds fabs (40%), compound fabs and advanced packaging (35%), legacy packaging (25%) and tools and materials (30%)." },
    { title: "Indian chip demand", metric: "~US$90bn by 2030", body: "NITI Aayog projects ~19% a year growth to about US$90bn by 2030 and over US$200bn by 2035." },
  ],
  mix: {
    title: "Semicon 1.0 approved investment by type (12 projects, ~Rs 1.64 lakh Cr)",
    source: "Cabinet approvals as reported by PIB/ISM; Crystal Matrix and Suchi counted together",
    slices: [
      { label: "Silicon wafer fab (Tata-PSMC)", value: 55.6 },
      { label: "Chip packaging & test (7 plants)", value: 39.5 },
      { label: "Compound fabs, displays & new packaging", value: 4.9 },
    ],
  },

  pestle: {
    political: [
      { point: "Both schemes have Cabinet backing through FY31, and states (Gujarat, Assam, UP, Odisha) add their own capital support.", impact: "pos" },
      { point: "Chinese-linked phone brands need approval for Indian equity partners (e.g. the Dixon-Vivo JV), slowing some deals.", impact: "neutral" },
    ],
    economic: [
      { point: "Exports have scaled fast (US$5.7bn in FY22 to ~US$29bn in FY26), giving assemblers volume to clear MPMS hurdles.", impact: "pos" },
      { point: "Indian smartphone demand fell sharply in May 2026 and memory chips are scarce, squeezing domestic volumes.", impact: "neg" },
    ],
    social: [
      { point: "MPMS targets ~60,000 direct jobs; chip plants need a new skilled workforce, which Semicon 2.0's talent pillar funds.", impact: "pos" },
      { point: "Skilled fab and cleanroom technicians are scarce, and new sites are far from big cities.", impact: "neg" },
    ],
    technological: [
      { point: "Indian plants start on mature nodes (55-90 nm fab, legacy and power packaging) where demand from cars and power electronics is steady.", impact: "neutral" },
      { point: "Process know-how is licensed from foreign partners (PSMC, Renesas, Clas-SiC), so learning curves are long.", impact: "neg" },
    ],
    legal: [
      { point: "MPMS counts sales brand by brand and applies a five-part Indian-brand test for Track 2, which limits who can claim.", impact: "neutral" },
      { point: "US export controls govern which chipmaking tools can be shipped to new fabs.", impact: "neg" },
    ],
    environmental: [
      { point: "Fabs use very large volumes of ultra-pure water and steady power; new sites must secure both.", impact: "neg" },
      { point: "Silicon-carbide and GaN chips made in India would support EVs, solar and efficient power conversion.", impact: "pos" },
    ],
  },

  beneficiaries: [
    { key: "dixon", tier: "core", why: "Largest Indian phone assembler and the clearest MPMS Track 1 beneficiary through its brand customers; building module plants for the sourcing bonus." },
    { key: "cgpower", tier: "core", why: "Owns most of CG Semi, whose Sanand chip-packaging plant was inaugurated in Jul 2026 - one of the few listed operating chip plants." },
    { key: "kaynes", tier: "core", why: "Runs an operating OSAT (Kaynes Semicon) and won the largest share of the first ECMS approvals - spans boards, components and chips." },
    { key: "amber", tier: "direct", why: "New phone-assembly deal with Oppo (8 million units in year one) would make it an MPMS player from FY28." },
    { key: "optiemus", tier: "direct", why: "Smartphone contract manufacturing (Ai+) doubled revenue in Q1 FY27; benefits through brand customers." },
    { key: "syrma", tier: "direct", why: "EMS and PCBA maker named by brokerages as a local-sourcing beneficiary." },
    { key: "linde", tier: "indirect", why: "Building on-site gas supply for Tata's Dholera fab (H2 2027) and a Sanand OSAT gas facility." },
    { key: "asmtec", tier: "indirect", why: "Engineering and precision parts for semiconductor-equipment makers - a listed play on tool localisation." },
    { key: "moschip", tier: "indirect", why: "Listed chip-design services company positioned for Semicon 2.0's design incentives." },
    { key: "archean", tier: "indirect", why: "Its subsidiary SiCSem is building India's first commercial silicon-carbide fab - a large, early-stage option." },
  ],

  companyNews: [
    { key: "lt", date: "Sep 2026", development: "L&T Semiconductor showed 40 products incl. a 1,200V SiC MOSFET and agreed with Tata Electronics to explore Indian fabrication and packaging.", impact: "An Indian fabless company lining up Indian manufacturing - the full loop Semicon 2.0 is meant to create.", tone: "pos" },
    { key: "dixon", date: "Aug 2026", development: "CLSA cut Dixon to Underperform after MPMS details, saying much of its sales may miss the hurdle without exports; JPMorgan stayed Overweight.", impact: "Shows MPMS rewards export growth, not domestic volume alone.", tone: "neutral" },
    { key: "cgpower", date: "Jul 2026", development: "The Prime Minister inaugurated CG Semi's Rs 7,600 crore chip-packaging plant at Sanand on 4 Jul 2026.", impact: "A listed company now runs an operating Indian chip plant; ramp-up losses are the near-term cost.", tone: "pos" },
    { key: "amber", date: "Jun 2026", development: "Signed to make smartphones for Oppo, OnePlus and Realme: trial production Q4 FY27, about 8 million phones in year one.", impact: "A new assembler entering phones ahead of MPMS widens the supplier base beyond Dixon.", tone: "pos" },
    { key: "archean", date: "May 2026", development: "Subsidiary SiCSem signed its fiscal-support agreement with the India Semiconductor Mission for the ~Rs 2,066 crore Odisha SiC fab.", impact: "First compound-semiconductor fab moves from approval to funded build.", tone: "pos" },
    { key: "kaynes", date: "Mar 2026", development: "Kaynes Semicon began commercial production at Sanand, India's second operating chip-packaging plant, making power modules for autos and industry.", impact: "Proof that Indian mid-caps can run OSATs; the test now is utilisation and customer wins.", tone: "pos" },
  ],

  risks: [
    { risk: "Brands miss MPMS's growth hurdle (Rs 5,000 crore over FY26 sales in FY27, rising Rs 5,000 crore a year) if exports stall or US tariffs hit", mitigant: "New anchor customers (Vivo JV, Oppo), Samsung flagship production in Noida", severity: "high" },
    { risk: "Chip-plant delays (Dholera already moved to mid-2028) and slow customer qualification", mitigant: "Foreign technology partners, six-year support tenure, OSATs starting first", severity: "high" },
    { risk: "Incentives passed through to brands, leaving assemblers' margins thin", mitigant: "Sourcing bonus and in-house modules let assemblers keep more", severity: "medium" },
    { risk: "Listed exposure stays small: most chip plants and brands are unlisted", mitigant: "Possible IPOs (Bharat FIH approved by SEBI) and listed suppliers scaling", severity: "medium" },
  ],
  outlook: {
    bull: "Exports keep growing 20%+, most big assemblers qualify for MPMS and the sourcing bonus, Tata Assam and Dholera run on time and Indian-packaged chips start going into Indian-made phones by FY28-FY29.",
    base: "MPMS keeps assembly and exports growing with a small margin lift; packaging plants ramp slowly with start-up losses; the first fab produces from 2028; listed winners are a handful of EMS and supplier names.",
    bear: "US tariffs or weak demand stall exports so assemblers miss the hurdle, chip projects slip further and the 'chip-to-phone' link stays mostly on paper.",
  },
  reading: [
    { title: "Semicon 2.0: scheme pillars, eligibility and fiscal support", source: "India Semiconductor Mission", url: "https://ism.gov.in/schemes/semicon2.0/" },
    { title: "Future of India's Semiconductor Industry (roadmap to 2035)", source: "NITI Aayog", url: "https://www.niti.gov.in/index.php/node/2328", year: "2026" },
    { title: "Government notifies Rs 62,500 crore Mobile Phone Manufacturing Scheme", source: "PIB (MeitY), 21 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2302098", year: "2026" },
    { title: "How India's Rs 62,500-crore MPMS works", source: "The Week", url: "https://www.theweek.in/news/biz-tech/2026/08/22/india-mobile-manufacturing-scheme-analysis.html", year: "2026" },
    { title: "India's iPhone exports cross Rs 2 trillion in FY26", source: "Business Today", url: "https://www.businesstoday.in/technology/story/india-iphone-exports-rs-2-trillion-fy26-top-branded-export-528219-2026-04-30", year: "2026" },
  ],
};
