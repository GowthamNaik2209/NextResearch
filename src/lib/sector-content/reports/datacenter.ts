import type { SectorReport } from "./types";

export const datacenter: SectorReport = {
  slug: "datacenter",
  title: "India Data Centres & AI Infrastructure",
  subtitle: "From colocation for Indian enterprises to gigawatt AI campuses",
  asOf: "Oct 2026",

  stance: {
    label: "Structural tailwind",
    tone: "pos",
    line: "Capacity is set to roughly triple by 2030; electrical, cooling and backup suppliers book orders well before any AI revenue shows up.",
  },
  keyStats: [
    { label: "Installed IT capacity, 2025", value: "~1.4 GW", sub: "approx., industry estimates" },
    { label: "Projected capacity, 2030", value: "~4-5 GW", sub: "incl. announced AI campuses" },
    { label: "Build cost per MW", value: "₹45-60 Cr", sub: "approx., shell + electricals + cooling" },
    { label: "Share in Mumbai", value: "~50%", sub: "Chennai a distant second" },
  ],
  thesis: [
    {
      title: "Data is generated here, stored elsewhere",
      body: "India produces ~20% of the world's data but hosts only ~3% of global data-centre capacity. Localisation rules, cheap mobile data and AI close that gap.",
    },
    {
      title: "Hyperscalers have committed real money",
      body: "Google, Microsoft and Amazon have together pledged over $65 bn for India cloud and AI through 2030, alongside Reliance, Adani, TCS and Airtel campuses.",
    },
    {
      title: "Picks-and-shovels earn first",
      body: "Roughly half of every rupee of build cost goes to electrical, cooling and backup gear - transformers, switchgear, gensets, UPS and cables made by listed Indian firms.",
    },
  ],

  developments: [
    {
      date: "Feb 2026",
      title: "India AI Impact Summit in New Delhi",
      body: "The first Global South AI summit drew fresh compute and data-centre announcements and put sovereign AI capacity at the centre of policy.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Dec 2025",
      title: "Microsoft and Amazon scale up India pledges",
      body: "Microsoft announced ~$17.5 bn for India cloud and AI, and Amazon ~$35 bn across its India businesses by 2030, including AWS regions.",
      impact: "pos",
      tag: "Demand",
    },
    {
      date: "Nov 2025",
      title: "DPDP Rules notified",
      body: "Rules under the Digital Personal Data Protection Act were notified with a phased roll-out, firming up compliance needs that favour onshore hosting.",
      impact: "neutral",
      tag: "Regulation",
    },
    {
      date: "Oct 2025",
      title: "Google's $15 bn AI hub in Visakhapatnam",
      body: "A gigawatt-scale campus with AdaniConneX and Airtel, plus a subsea cable landing - Google's largest investment in India.",
      impact: "pos",
      tag: "Investment",
    },
    {
      date: "Oct 2025",
      title: "TCS plans a 1 GW AI data centre",
      body: "TCS announced HyperVault, a ~1 GW AI data-centre business, signalling IT services firms moving into physical infrastructure.",
      impact: "pos",
      tag: "Investment",
    },
    {
      date: "Mar 2024",
      title: "IndiaAI Mission approved",
      body: "Cabinet cleared ₹10,372 Cr over five years; subsidised GPU tenders have since empanelled 30,000+ GPUs with Indian cloud providers.",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "India's data-centre base was built for enterprise colocation, banking and telecom. Cloud adoption, UPI-scale digital services and video lifted it past ~1 GW by 2024, and AI is now pulling in larger, denser campuses.",
      "Policy is supportive: infrastructure status (2022), state data-centre policies with power and land incentives, data-localisation rules and IndiaAI GPU subsidies.",
      "The binding constraints are reliable green power, grid connections, water for cooling and imported GPUs - not demand.",
    ],
    chart: {
      title: "Installed data-centre IT capacity in India",
      unit: "MW",
      source: "JLL / CBRE / Colliers industry estimates, 2027-30 NextResearch estimates",
      points: [
        { label: "2020", value: 500 },
        { label: "2022", value: 750 },
        { label: "2024", value: 1050 },
        { label: "2025", value: 1400 },
        { label: "2027P", value: 2400, projected: true },
        { label: "2030P", value: 4500, projected: true },
      ],
    },
    snapshot: [
      { label: "Capacity growth, 2025", value: "~30%", tone: "pos" },
      { label: "Rack density, AI halls", value: "30-100+ kW", tone: "neutral" },
      { label: "Power cost share of opex", value: "~40-60%", tone: "neg" },
      { label: "Typical PUE, new builds", value: "~1.4-1.5", tone: "neutral" },
      { label: "Infrastructure status", value: "Since 2022", tone: "pos" },
      { label: "GPU import dependence", value: "~100%", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Grid, transformers & switchgear", zoneIds: ["transformers"], margin: "12-20% EBITDA", moat: "high", note: "Long lead times and capacity shortages give pricing power to scaled makers." },
    { stage: "Backup power", zoneIds: ["power_backup"], margin: "15-20% EBITDA", moat: "medium", note: "Gensets, UPS and battery banks; uptime certification keeps vendor lists short." },
    { stage: "Cooling", zoneIds: ["cooling"], margin: "8-12% EBITDA", moat: "medium", note: "Shift from air to liquid cooling for AI racks favours technology partners." },
    { stage: "Cabling & fibre", zoneIds: ["cabling", "networking"], margin: "10-14% EBITDA", moat: "low", note: "Volume business; power cable demand rises with every MW, fibre with interconnects." },
    { stage: "Compute & distribution", zoneIds: ["compute"], margin: "Low single digit to ~15%", moat: "medium", note: "GPUs are imported; local value is server assembly, integration and distribution." },
    { stage: "Operators & landlords", zoneIds: ["operators"], margin: "40-50% EBITDA", moat: "high", note: "Land, power and hyperscaler contracts; capital-heavy with long paybacks." },
  ],

  drivers: [
    { title: "Cloud and AI workloads", metric: "$65 bn+ pledged", body: "Hyperscaler commitments to 2030 anchor multi-hundred-MW campuses in Mumbai, Chennai, Hyderabad and Vizag." },
    { title: "Data localisation", metric: "DPDP + RBI", body: "Payment-data rules and the DPDP Act push banks, fintechs and government data onshore." },
    { title: "Sovereign AI compute", metric: "30,000+ GPUs", body: "IndiaAI subsidised GPU capacity creates demand for high-density, liquid-cooled halls with Indian operators." },
    { title: "Data consumption", metric: "~25-30 GB/user/month", body: "Among the world's highest mobile data use drives content, OTT and edge capacity needs." },
  ],
  mix: {
    title: "Data-centre capacity by city, 2025 (approx.)",
    source: "JLL / CBRE India data-centre reports",
    slices: [
      { label: "Mumbai", value: 50 },
      { label: "Chennai", value: 20 },
      { label: "Delhi NCR", value: 10 },
      { label: "Hyderabad", value: 8 },
      { label: "Others", value: 12 },
    ],
  },

  pestle: {
    political: [
      { point: "Centre and states (Maharashtra, Tamil Nadu, Telangana, UP, Andhra) compete with land, power and stamp-duty incentives.", impact: "pos" },
      { point: "US export controls on advanced AI chips can cap GPU allocations to India.", impact: "neg" },
    ],
    economic: [
      { point: "Lower land and labour costs than Singapore make India a regional hub candidate.", impact: "pos" },
      { point: "High capex per MW and long paybacks make operators sensitive to interest rates.", impact: "neg" },
    ],
    social: [
      { point: "800 mn+ internet users and UPI-scale digital services create domestic base-load demand.", impact: "pos" },
      { point: "Local opposition over water and power use is emerging around large campuses.", impact: "neg" },
    ],
    technological: [
      { point: "AI racks at 30-100+ kW move cooling to liquid and direct-to-chip, raising content per MW.", impact: "pos" },
      { point: "Rapid GPU generations shorten hardware life and raise obsolescence risk for compute owners.", impact: "neutral" },
    ],
    legal: [
      { point: "DPDP Act and sectoral localisation rules (RBI, SEBI, IRDAI) favour onshore hosting.", impact: "pos" },
      { point: "Cross-border data transfer rules can still change, affecting hyperscaler planning.", impact: "neutral" },
    ],
    environmental: [
      { point: "Open access and green tariffs let operators contract solar-wind round-the-clock power.", impact: "pos" },
      { point: "Grid is still coal-heavy and cooling is water-intensive in stressed cities like Chennai.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "bhartiairtel", tier: "core", why: "Owns Nxtra, among India's largest DC operators; partner on Google's Vizag hub." },
    { key: "netweb", tier: "core", why: "Indian-designed AI/HPC servers and GPU systems for sovereign and enterprise AI." },
    { key: "hitachiEnergy", tier: "direct", why: "Power transformers, HV switchgear and grid links for DC substations." },
    { key: "cgpower", tier: "direct", why: "Transformers and switchgear for DC electrical yards; expanding capacity." },
    { key: "cummins", tier: "direct", why: "Market leader in high-horsepower gensets used for DC backup." },
    { key: "abbIndia", tier: "direct", why: "UPS, LV/MV switchgear, drives and automation across DC power and cooling." },
    { key: "schneiderElec", tier: "direct", why: "Power distribution and electrical infrastructure for DC halls." },
    { key: "bluestar", tier: "indirect", why: "Precision air conditioning and chillers for data-centre halls." },
    { key: "kei", tier: "indirect", why: "HV and LV power cables; data centres a growing institutional segment." },
    { key: "sterliteTech", tier: "indirect", why: "Largest Indian optical fibre maker; DC interconnect and cabling solutions." },
  ],

  companyNews: [
    { key: "bhartiairtel", date: "Oct 2025", development: "Airtel's Nxtra named a partner on Google's $15 bn Visakhapatnam AI hub.", impact: "Puts an Indian operator inside a gigawatt hyperscaler build.", tone: "pos" },
    { key: "netweb", date: "2025", development: "Won large sovereign AI infrastructure orders and launched Blackwell-based servers made in India.", impact: "Shows local server assembly can capture part of the AI compute spend.", tone: "pos" },
    { key: "hitachiEnergy", date: "2024-26", development: "Executing a ~₹2,000 Cr capacity expansion in transformers and grid equipment.", impact: "Eases transformer lead times that gate new DC grid connections.", tone: "pos" },
    { key: "cummins", date: "2025-26", development: "Data-centre gensets remain a key driver of high-horsepower power-gen demand.", impact: "Backup power scales directly with MW added.", tone: "pos" },
    { key: "kei", date: "2025-26", development: "Commissioning a greenfield cable plant at Sanand to add HV and EHV capacity.", impact: "More domestic EHV cable supply for campus grid connections.", tone: "pos" },
    { key: "sterliteTech", date: "2025", development: "Demerged its global services arm to focus on optical networking and DC connectivity.", impact: "A cleaner listed play on fibre demand from data centres.", tone: "neutral" },
  ],

  risks: [
    { risk: "Power and grid-connection delays", mitigant: "Captive renewables, open access and state DC policies with dedicated substations", severity: "high" },
    { risk: "AI capex cycle slows globally", mitigant: "Localisation and enterprise cloud provide base-load demand", severity: "medium" },
    { risk: "GPU access limited by export controls", mitigant: "India's tier status and government-to-government AI deals", severity: "medium" },
    { risk: "Oversupply in Mumbai compresses rentals", mitigant: "Pre-leasing to hyperscalers; expansion into new cities", severity: "low" },
  ],
  outlook: {
    bull: "Capacity passes ~6 GW by 2030 as India becomes a regional AI hub and liquid-cooled campuses multiply.",
    base: "Capacity reaches ~4-4.5 GW by 2030, with steady orders for transformers, gensets, cooling and cables.",
    bear: "Power constraints and a global AI pullback hold capacity near ~3 GW by 2030.",
  },
  reading: [
    { title: "Energy and AI", source: "International Energy Agency", url: "https://www.iea.org/reports/energy-and-ai", year: "2025" },
    { title: "IndiaAI Mission", source: "Ministry of Electronics & IT", url: "https://indiaai.gov.in/" },
    { title: "Ministry of Electronics & IT", source: "Government of India", url: "https://www.meity.gov.in/" },
    { title: "India real estate insights incl. data centres", source: "JLL", url: "https://www.jll.com/en-in/insights" },
  ],
};
