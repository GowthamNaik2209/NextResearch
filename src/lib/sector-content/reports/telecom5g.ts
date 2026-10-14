import type { SectorReport } from "./types";

export const telecom5g: SectorReport = {
  slug: "telecom5g",
  title: "India 5G & Telecom Infrastructure",
  subtitle: "From a rollout sprint to a long densification and monetization cycle",
  asOf: "Oct 2026",

  stance: {
    label: "Mixed: monetize > build",
    tone: "neutral",
    line: "Coverage capex has peaked; value now shifts to operators raising ARPU and to towers, fiber and power that densification keeps pulling.",
  },
  keyStats: [
    { label: "5G subscribers, 2025", value: "~39 Cr", sub: "approx. (Ericsson Mobility Report)" },
    { label: "5G base stations", value: "~5 lakh", sub: "approx., DoT; among the fastest rollouts globally" },
    { label: "Wireless subscribers", value: "~116 Cr", sub: "TRAI; top two telcos hold ~75%" },
    { label: "Data use per user", value: "~25 GB", sub: "per month, approx.; among the highest globally" },
  ],
  thesis: [
    {
      title: "Capex peaked, densification continues",
      body: "Jio and Airtel built nationwide 5G in ~2 years (FY23-25). Spend now moves from new coverage to capacity sites, fiberization and small cells - steadier, but lower.",
    },
    {
      title: "Market is now a profitable duopoly-plus",
      body: "Tariff hikes in Dec 2021 and Jul 2024 (~11-25%) lifted ARPU toward Rs 200-250. Further hikes are the main lever for returns on 5G spend.",
    },
    {
      title: "Passive infra and fiber are the durable pools",
      body: "Towers, fiber backhaul and backup power scale with every site and tenancy. Equipment makers face lumpy orders and Nokia/Ericsson/Samsung competition.",
    },
  ],

  developments: [
    {
      date: "Late 2025",
      title: "AGR relief for Vodafone Idea",
      body: "After the Supreme Court let the government reconsider Vi's AGR dues, the Centre moved to restructure them, easing fears of a two-player market.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Sep 2025",
      title: "BSNL launches indigenous 4G stack",
      body: "BSNL switched on ~97,500 4G sites built on the TCS-Tejas-C-DOT stack, making India one of few countries with a home-grown telecom core and RAN.",
      impact: "pos",
      tag: "Make in India",
    },
    {
      date: "Jun-Jul 2025",
      title: "Starlink cleared for India",
      body: "SpaceX's Starlink received a GMPCS licence and IN-SPACe authorization; satellite spectrum will be assigned administratively, not auctioned.",
      impact: "neutral",
      tag: "Satcom",
    },
    {
      date: "Mar 2025",
      title: "Airtel and Jio tie up with SpaceX",
      body: "Both telcos signed deals to distribute Starlink equipment, positioning satellite broadband as a rural complement rather than a rival.",
      impact: "neutral",
      tag: "Competition",
    },
    {
      date: "Jul 2024",
      title: "Industry-wide tariff hikes",
      body: "Jio, Airtel and Vi raised mobile tariffs by ~11-25%, the largest hike in years and a direct boost to ARPU and operator cash flow.",
      impact: "pos",
      tag: "Pricing",
    },
    {
      date: "Jun 2024",
      title: "Muted spectrum auction",
      body: "The auction raised only ~Rs 11,300 Cr against ~Rs 96,000 Cr on offer, signalling operators already hold enough 5G spectrum.",
      impact: "neutral",
      tag: "Spectrum",
    },
  ],

  overview: {
    narrative: [
      "India is the world's second-largest telecom market, with ~116 Cr wireless users and very cheap data. Jio and Airtel dominate; Vi and state-run BSNL trail.",
      "5G launched in Oct 2022 and reached nearly every district within two years, largely on non-standalone (Airtel) and standalone (Jio) networks. Operator capex has since started to taper.",
      "The next leg is densification, fiber-to-the-site, fixed wireless access and enterprise use cases, while the Rs 12,195 Cr telecom PLI pushes equipment manufacturing onshore.",
    ],
    chart: {
      title: "5G subscriptions in India",
      unit: "million",
      source: "Ericsson Mobility Report, 2027-30 projections approx.",
      points: [
        { label: "2022", value: 10 },
        { label: "2023", value: 130 },
        { label: "2024", value: 290 },
        { label: "2025", value: 390 },
        { label: "2027P", value: 650, projected: true },
        { label: "2030P", value: 950, projected: true },
      ],
    },
    snapshot: [
      { label: "Blended ARPU, Airtel / Jio", value: "~Rs 250 / ~Rs 210", tone: "pos" },
      { label: "5G share of mobile subs, 2025", value: "~33%", tone: "pos" },
      { label: "Fiberized towers", value: "~40%", tone: "neg" },
      { label: "Telecom PLI outlay", value: "Rs 12,195 Cr", tone: "neutral" },
      { label: "BharatNet (amended) outlay", value: "Rs 1.39 lakh Cr", tone: "pos" },
      { label: "Vi balance-sheet stress", value: "High", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Fiber & cable", zoneIds: ["fiber"], margin: "10-18% EBITDA", moat: "medium", note: "Cyclical; global fiber prices and BharatNet orders drive utilization." },
    { stage: "Network equipment & components", zoneIds: ["ran", "antennas", "ems"], margin: "8-20% EBITDA", moat: "medium", note: "Global vendors dominate RAN; domestic players win on PLI and trusted-source rules." },
    { stage: "Towers & passive infra", zoneIds: ["towers"], margin: "~50% EBITDA", moat: "high", note: "Annuity-like rentals; tenancy additions drive incremental returns." },
    { stage: "Power systems", zoneIds: ["power"], margin: "10-15% EBITDA", moat: "medium", note: "Li-ion and solar hybrids replace diesel at sites; content rises with densification." },
    { stage: "EPC & installation", zoneIds: ["epc"], margin: "8-12% EBITDA", moat: "low", note: "Volume-driven and working-capital heavy; growth follows operator rollouts." },
    { stage: "Operators", zoneIds: ["operators"], margin: "~50% EBITDA (leaders)", moat: "high", note: "Spectrum and scale barriers; ARPU is the key profit lever." },
  ],

  drivers: [
    { title: "Data consumption", metric: "~25 GB/month", body: "Video and short-form content keep per-user data growing at a double-digit pace, forcing capacity additions." },
    { title: "ARPU repair", metric: "Rs 300 target", body: "Operators publicly target ~Rs 300 ARPU; each Rs 10 rise adds thousands of crore to industry EBITDA." },
    { title: "Fixed wireless & home broadband", metric: "~1 Cr+ FWA homes", body: "Jio AirFiber and Airtel Xstream AirFiber use 5G for home broadband, lifting network utilization." },
    { title: "Domestic manufacturing push", metric: "Rs 12,195 Cr PLI", body: "Telecom PLI and trusted-source rules favour local makers of fiber, routers, RAN and CPE gear." },
  ],
  mix: {
    title: "Wireless subscriber share by operator, 2025 (approx.)",
    source: "TRAI telecom subscription reports",
    slices: [
      { label: "Reliance Jio", value: 41 },
      { label: "Bharti Airtel", value: 34 },
      { label: "Vodafone Idea", value: 17 },
      { label: "BSNL / MTNL", value: 8 },
    ],
  },

  pestle: {
    political: [
      { point: "Strong state backing for indigenous telecom (BSNL 4G stack, Bharat 6G Vision, trusted-source rules).", impact: "pos" },
      { point: "Government is now Vi's largest shareholder, tying policy to the fate of the third operator.", impact: "neutral" },
    ],
    economic: [
      { point: "Tariff hikes and slowing capex lift operator free cash flow and tower tenancy economics.", impact: "pos" },
      { point: "Vi's weak balance sheet keeps receivable risk alive for towers and vendors.", impact: "neg" },
    ],
    social: [
      { point: "Young, video-heavy users drive some of the world's highest per-capita mobile data use.", impact: "pos" },
      { point: "Price-sensitive low-end users limit how fast tariffs can rise without SIM consolidation.", impact: "neg" },
    ],
    technological: [
      { point: "5G standalone, FWA and early 6G research open new revenue beyond voice and data packs.", impact: "pos" },
      { point: "Satellite broadband and Wi-Fi offload may cap rural tower demand over time.", impact: "neutral" },
    ],
    legal: [
      { point: "Telecommunications Act 2023 simplifies right-of-way and allows administrative satcom spectrum.", impact: "pos" },
      { point: "AGR and spectrum-dues litigation remain an overhang on smaller operators.", impact: "neg" },
    ],
    environmental: [
      { point: "Towers shifting from diesel to Li-ion and solar cut fuel cost and emissions.", impact: "pos" },
      { point: "Network power demand rises with densification, raising energy costs per site.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "bhartiairtel_op", tier: "core", why: "Highest ARPU among peers; first in line to gain from tariff hikes and premium 5G users." },
    { key: "industowers", tier: "core", why: "Largest tower company; earns rentals on every new 5G site and tenancy." },
    { key: "altiusinvit", tier: "core", why: "Second-largest tower portfolio after buying American Tower's India business." },
    { key: "hfcl_fiber", tier: "direct", why: "Optical fiber, cable and 5G transport gear; gains from fiberization and BharatNet." },
    { key: "sterlitetech", tier: "direct", why: "Pure-play optical fiber and cable maker; volumes tied to fiber-to-site and FTTH." },
    { key: "tejasnetworks", tier: "direct", why: "Indigenous RAN and optical transport maker; key supplier to BSNL's 4G/5G stack." },
    { key: "pacedigitek", tier: "direct", why: "Tower EPC plus DC power and battery systems for telecom sites." },
    { key: "bondada", tier: "indirect", why: "Telecom site EPC and O&M contractor; growth follows operator rollouts." },
    { key: "skipper_telecom", tier: "indirect", why: "Tower and monopole fabrication for new and densified sites." },
    { key: "syrmasgs", tier: "indirect", why: "EMS for telecom and networking modules under the PLI push." },
  ],

  companyNews: [
    { key: "vodafoneidea", date: "Late 2025", development: "Government moved to restructure AGR dues after a Supreme Court ruling allowed reconsideration.", impact: "Keeps a third operator alive, supporting tower tenancies and vendor receivables.", tone: "pos" },
    { key: "tejasnetworks", date: "FY26", development: "Revenue fell sharply as BSNL 4G equipment deliveries wound down after the Sep 2025 launch.", impact: "Shows how lumpy single-customer orders make domestic equipment earnings volatile.", tone: "neg" },
    { key: "bhartiairtel_op", date: "Mar 2025", development: "Signed a deal with SpaceX to distribute Starlink services and equipment.", impact: "Telcos co-opt satellite broadband for rural reach instead of competing with it.", tone: "neutral" },
    { key: "industowers", date: "2025", development: "Bharti Airtel raised its stake above 50%; Indus outlined expansion into select African markets.", impact: "Stronger parent backing; first step to diversify beyond India tenancies.", tone: "neutral" },
    { key: "altiusinvit", date: "Sep 2024", development: "Completed acquisition of American Tower's India tower business (~Rs 13,300 Cr equity value approx.).", impact: "Consolidates passive infra into two large players with InvIT-style yields.", tone: "pos" },
  ],

  risks: [
    { risk: "Vodafone Idea fails to fund capex or dues", mitigant: "Government equity stake and AGR restructuring; new fundraising", severity: "high" },
    { risk: "Operator capex keeps falling after 5G peak", mitigant: "Densification, fiberization and FWA keep a base level of spend", severity: "medium" },
    { risk: "Tariff hikes stall on political or competitive pressure", mitigant: "Two-player pricing discipline; data use keeps rising", severity: "medium" },
    { risk: "Satcom and Wi-Fi offload reduce rural tower need", mitigant: "Satellite capacity is costly and complements, not replaces, towers", severity: "low" },
  ],
  outlook: {
    bull: "ARPU passes Rs 300 by FY28 as 5G monetizes via FWA and enterprise, while Vi revives and adds tenancies across towers and fiber.",
    base: "Steady ARPU gains, flat-to-lower capex, and passive infra and fiber growing mid-to-high single digits through FY30P.",
    bear: "Vi weakens further, tariff hikes stall, and equipment makers face an order drought after the 5G and BSNL peaks.",
  },
  reading: [
    { title: "Telecom subscription reports", source: "Telecom Regulatory Authority of India", url: "https://www.trai.gov.in/release-publication/reports/telecom-subscriptions-reports" },
    { title: "PLI scheme for telecom and networking products", source: "Department of Telecommunications", url: "https://dot.gov.in/pli-scheme-telecom-networking-products" },
    { title: "Bharat 6G Alliance", source: "Bharat 6G Alliance", url: "https://www.bharat6galliance.com/" },
    { title: "Telecommunications industry in India", source: "IBEF", url: "https://www.ibef.org/industry/telecommunications" },
    { title: "Technology, Media and Telecom Predictions", source: "Deloitte Insights", url: "https://www2.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions.html" },
  ],
};
