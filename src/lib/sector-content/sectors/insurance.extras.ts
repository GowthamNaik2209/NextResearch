// Insurance: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.insurance) and ../docs.ts (SECTOR_DOCS.insurance).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const INSURANCE_SCENARIOS: Scenario[] = [
  {
    id: "protection-boom",
    title: "Protection and retail health take off",
    blurb: "GST-free policies and new foreign capital pull millions into term and health cover",
    story:
      "Individual life and health policies have been GST-free since 22 Sep 2025, and since Dec 2025 foreign owners may hold 100% of an insurer. If cheaper cover and new capital turn into a lasting rise in term and retail-health buying - helped by bank cross-sell and online comparison - insurers sell more of their most profitable products. Bank-promoted life insurers and focused health insurers gain most; marketplaces earn more commissions; TPAs process more claims. Insurers must still hold persistency and claims ratios as volumes rise.",
    effect: "tailwind",
    impacts: [
      S("life_bank", 3, "Protection is the highest-value product; bank branches sell it at low cost"),
      S("health", 3, "Retail health is the profit pool of non-life insurance"),
      S("digital_brokers", 2, "Term and health are the core of online insurance sales"),
      S("bancassurance", 2, "More commission and a more valuable insurance stake"),
      S("life_lic", 1, "Agency-led insurers gain too, but LIC's mix is savings-heavy"),
      S("tpa_claims", 1, "More health policies mean more claims to process"),
    ],
    stocks: [
      { key: "starHealth", severity: 3, why: "The largest retail health book" },
      { key: "pbFintech", severity: 2, why: "Leads online term and health sales" },
    ],
  },
  {
    id: "distribution-squeeze",
    title: "Distribution gets squeezed",
    blurb: "Bima Sugam goes live and IRDAI tightens commission and mis-selling rules",
    story:
      "Bima Sugam, the industry's public marketplace, was expected to launch around Nov 2026 (IRDAI chair, Sep 2026), starting with motor. If it gains traction for simple term, health and motor covers, and IRDAI keeps tightening the expense-of-management cap and mis-selling rules, the money insurers pay to sell a policy falls. Insurers keep more of each premium; online brokers, agent platforms and banks earn less per sale. Insurers with captive bank branches hold share; marketplaces must lean on advice and renewals.",
    effect: "headwind",
    impacts: [
      S("digital_brokers", 3, "Take rates on simple covers fall when customers can buy on a public platform"),
      S("bancassurance", 2, "Lower commission and tighter rules on selling to depositors"),
      S("life_bank", 1, "Lower acquisition cost helps margins", "tailwind"),
      S("health", 1, "Cheaper distribution for retail health", "tailwind"),
      S("regulator", 2, "Bima Sugam becomes the default public rail", "tailwind"),
    ],
    stocks: [
      { key: "pbFintech", severity: 3, why: "Most exposed to a public comparison platform" },
      { key: "turtlemint", severity: 2, why: "Agent-platform commissions are thin already" },
    ],
  },
  {
    id: "motor-cat-losses",
    title: "Motor claims and floods hit general insurers",
    blurb: "Third-party claims rise faster than premiums while floods add catastrophe losses",
    story:
      "The Supreme Court's Jun 2026 ruling on compensation for homemakers raises motor third-party awards, while the third-party premium - set by the Centre with IRDAI - waits for its first revision in years. Q2 FY27 floods added catastrophe losses for ICICI Lombard and Go Digit (company disclosures), and GIC Re described Gujarat flood claims on its results call. If both persist, combined ratios rise across the industry; the state-owned insurers, already short of underwriting profit and capital, are hit hardest, and reinsurers pay a share of the floods. A premium revision would reverse much of it.",
    effect: "headwind",
    impacts: [
      S("general", 3, "Motor third-party and property losses lift combined ratios"),
      S("reinsurance", 2, "Reinsurers pay their share of catastrophe claims"),
      S("holdcos", 1, "Promoters may need to add capital to stretched insurers"),
      S("health", 1, "Standalone health insurers have no motor book", "tailwind"),
      S("regulator", 1, "Pressure to notify a third-party premium revision"),
    ],
    stocks: [
      { key: "newIndia", severity: 3, why: "Largest motor and property book with the least capital headroom" },
      { key: "goDigit", severity: 2, why: "Motor-heavy private insurer" },
      { key: "gicRe", severity: 2, why: "Statutory share of every policy brings catastrophe losses" },
    ],
  },
  {
    id: "capital-rules-reset",
    title: "Risk-based solvency and composite licences",
    blurb: "IRDAI moves to risk-based capital and notifies composite licences under the 2025 Act",
    story:
      "IRDAI has consulted on replacing today's fixed solvency formula with risk-based capital, and the Dec 2025 amendment allows composite licences (life and non-life in one insurer) once rules are notified. Risk-based capital would free capital for low-risk protection books and ask more of insurers with guarantees, catastrophe exposure or volatile investments. Composite licences would let large groups sell all lines through one insurer. Well-capitalised groups and focused protection writers gain; thin-capital insurers may need fresh equity.",
    effect: "tailwind",
    impacts: [
      S("life_bank", 2, "Protection-heavy books may need less capital"),
      S("life_lic", 1, "Guaranteed savings books may need more"),
      S("general", 2, "Catastrophe-exposed and thin-capital insurers face higher requirements", "headwind"),
      S("holdcos", 2, "Strong promoters fund growth; weak ones face capital calls"),
      S("regulator", 3, "The biggest change to capital rules in two decades"),
    ],
  },
];

export const INSURANCE_DOCS: ResearchLink[] = [
  { title: "Insurance 2.0: Parliament passes the Insurance Amendment Bill, 2025 (100% FDI, composite licences)", source: "Khaitan & Co ERGO (Dec 2025)", url: "https://www.khaitanco.com/sites/default/files/2025-12/ERGO%20-%20Insurance%202.0%20-%20Parliament%20passes%20Insurance%20Amendment%20Bill,%202025%20-%2018%20December%202025.pdf" },
  { title: "Nifty Insurance index factsheet - the listed insurers and their weights", source: "NSE Indices (Oct 2026)", url: "https://niftyindices.com/Factsheet/Factsheet_Nifty_Insurance.pdf" },
  { title: "HDFC Life H1 FY2027 investor presentation - VNB, embedded value, channel mix, persistency", source: "HDFC Life (Oct 2026)", url: "https://www.hdfclife.com/content/dam/hdfclifeinsurancecompany/about-us/pdf/investor-relations/financial-information/investor-presentation/HDFC-Life-H1-FY2027-Investor-Presentation.pdf" },
  { title: "ICICI Lombard Q2 FY2027 press release and presentation - combined ratio on n and 1/n bases, catastrophe losses", source: "ICICI Lombard via NSE (Oct 2026)", url: "https://nsearchives.nseindia.com/corporate/ICICIGI_14102026192138_Press_Release_and_Investor_Presentation.pdf" },
];
