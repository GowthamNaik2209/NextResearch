// Hospitals & Healthcare: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.hospitals) and ../docs.ts (SECTOR_DOCS.hospitals).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const HOSPITALS_SCENARIOS: Scenario[] = [
  {
    id: "medicine-margin-cap",
    title: "Court caps hospital medicine mark-ups",
    blurb: "The Supreme Court orders a uniform margin on medicines sold in hospitals",
    story:
      "The Supreme Court reserved its order on 27 Oct 2026 after criticising mark-ups of up to ten times on cancer drugs and, on 29 Sep, floating a uniform 16% margin on medicines. If it orders a cap on medicines and consumables sold to admitted patients, hospitals lose a slice of each inpatient bill. Brokers expect chains to offset much of it by repricing procedure packages, so the hit is largest for oncology-heavy and cash-heavy hospitals and smallest for those paid mostly by fixed government or insurer packages. Retail pharmacies selling at MRP could face the same logic later.",
    effect: "headwind",
    impacts: [
      S("chains", 3, "In-house pharmacy and consumables are a meaningful part of inpatient bills"),
      S("specialty", 3, "Cancer drugs were the court's main example; oncology chains are most exposed"),
      S("pharmacy", 2, "Hospital pharmacy margins cut; retail chains watch for a wider MRP rule"),
      S("consumables", 1, "Hospitals push suppliers for lower prices"),
      S("devices", 1, "Device and implant margins may be next (the PIL also seeks device caps)"),
      S("insurers", 1, "Lower bills ease claims inflation", "tailwind"),
    ],
  },
  {
    id: "bed-glut",
    title: "Too many new beds in the same cities",
    blurb: "Listed chains open thousands of beds in NCR, Bengaluru, Hyderabad and Pune at once",
    story:
      "Every large chain is adding beds through FY28, often in the same metro micro-markets. If demand grows slower than supply, occupancy falls, doctors' fees rise as chains compete for surgeons, and new hospitals take longer to break even. Mature, high-occupancy hospitals and chains in under-served states are better placed; equipment and consumable makers still get their orders.",
    effect: "headwind",
    impacts: [
      S("chains", 3, "Occupancy and margins fall while new beds ramp up"),
      S("specialty", 1, "Multi-specialty chains push into oncology and mother & child to fill beds"),
      S("devices", 1, "Equipment orders already placed still ship", "tailwind"),
      S("insurers", 1, "More hospital choice strengthens insurers' hand on rates", "tailwind"),
    ],
  },
  {
    id: "insurance-boom",
    title: "Retail health insurance keeps surging",
    blurb: "GST-free premiums and IRDAI reforms push retail health cover deep into tier-2 towns",
    story:
      "Health premiums grew ~15% in FY26 after individual policies became GST-free in Sep 2025. If retail cover keeps spreading to tier-2 and tier-3 families, more patients can afford private hospitals and planned surgery, and the paying mix shifts from cash and slow government schemes to insurers who pay on time. Chains in smaller cities and specialty networks gain the most; insurers grow premium but must hold claims ratios as hospitals lift prices.",
    effect: "tailwind",
    impacts: [
      S("insurers", 3, "Premium growth and new retail customers"),
      S("chains", 2, "More insured patients and better payer mix, especially in tier-2 cities"),
      S("specialty", 2, "Insurance now covers more day-care and specialty procedures"),
      S("diagnostics", 1, "OPD and wellness riders bring more tests"),
      S("healthtech", 2, "Online distribution (Policybazaar) and claims platforms gain volume"),
    ],
  },
  {
    id: "scheme-rate-hike",
    title: "Government schemes pay more and pay faster",
    blurb: "PM-JAY and state schemes follow CGHS with higher package rates and quicker payment",
    story:
      "CGHS revised rates for ~2,000 procedures from Oct 2025, the first full revision in about 15 years, and brokers expected 4-8% revenue gains for scheme-heavy chains. If PM-JAY (13 crore+ admissions so far) and state schemes also raise package rates and cut payment delays, private hospitals in tier-2 and tier-3 cities become much more profitable and more of them join the schemes. PPP diagnostics operators paid by states benefit from faster payment too.",
    effect: "tailwind",
    impacts: [
      S("chains", 3, "Scheme-heavy chains (Yatharth, Park, Paras, Fortis, Narayana) gain revenue and margin"),
      S("imaging", 2, "PPP diagnostics operators get paid faster by states"),
      S("diagnostics", 1, "Scheme tests and PPP labs gain"),
      S("insurers", 1, "Some state schemes are run through insurers"),
      S("consumables", 1, "More scheme surgeries mean more consumables"),
    ],
  },
];

export const HOSPITALS_DOCS: ResearchLink[] = [
  { title: "Hospitals: 6-8% ARPOB rise to support 13-15% revenue growth in FY2027", source: "ICRA (Jul 2026)", url: "https://www.icra.in/Research/ViewResearchReport/7044" },
  { title: "Ayushman Bharat PM-JAY dashboard and scheme details", source: "National Health Authority", url: "https://nha.gov.in/PM-JAY" },
  { title: "Handbook of Indian insurance statistics", source: "IRDAI", url: "https://irdai.gov.in/handbook-of-indian-insurance" },
  { title: "Healthcare industry in India", source: "IBEF", url: "https://www.ibef.org/industry/healthcare-india" },
];
