// Semicon 2.0 + Mobile Phones (MPMS): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.semicon2) and ../docs.ts (SECTOR_DOCS.semicon2).
import type { Scenario, ScenarioEffect, ScenarioImpact, Severity } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: Severity, why: string, effect?: ScenarioEffect): ScenarioImpact => ({ zone, severity, why, effect });

export const SEMICON2_SCENARIOS: Scenario[] = [
  {
    id: "us-phone-tariff",
    title: "US tariffs hit India-made phones",
    blurb: "A steep US duty on smartphones assembled in India",
    story:
      "The US took about 70% of India's smartphone exports in H1 FY26, mostly iPhones. A tariff would cut export volumes, and because MPMS pays only once a brand clears a rising growth hurdle (Rs 5,000 crore over FY26 sales in FY27, more each year), assemblers that rely on exports could miss the hurdle altogether - with knock-on effects for the sub-assembly makers and chip packagers counting on that volume.",
    effect: "headwind",
    impacts: [
      S("phone_ems", 3, "Export volumes and MPMS eligibility both at risk"),
      S("brands", 3, "Apple's India export programme is the main exposure"),
      S("subassy", 2, "Fewer phones means fewer local sub-assemblies"),
      S("osat", 1, "Slower pull for Indian-packaged chips in phones"),
    ],
  },
  {
    id: "sourcing-bonus-bites",
    title: "Local sourcing reaches 25% of phones",
    blurb: "Assemblers qualify for the full 1.5% MPMS sourcing bonus",
    story:
      "MPMS pays up to 1.5% extra when key components and sub-assemblies are localised for at least 25% of the phones an assembler makes. Once big assemblers cross that line, they have a reason to buy Indian PCBA, chargers, batteries and display/camera modules - and later Indian-packaged chips - even at a small price premium.",
    effect: "tailwind",
    impacts: [
      S("subassy", 3, "Direct new orders for locally made sub-assemblies"),
      S("phone_ems", 2, "Up to 1.5% extra incentive on eligible sales"),
      S("osat", 2, "Demand for chips packaged in India grows with local content"),
      S("design", 1, "Indian-designed chips gain a route into phones"),
    ],
  },
  {
    id: "fab-delay",
    title: "Dholera fab slips beyond 2028",
    blurb: "India's first commercial wafer fab is delayed again",
    story:
      "Commercial production at Tata-PSMC's Dholera fab is already guided to mid-2028, later than first promised. A further delay pushes out orders for gases, chemicals and local tool parts, and keeps Indian packaging plants dependent on imported wafers.",
    effect: "headwind",
    impacts: [
      S("fab", 3, "Revenue and know-how build-up pushed out"),
      S("gases", 2, "On-site gas plants built for the fab sit underused"),
      S("equipment", 2, "Local parts and service demand arrives later"),
      S("utilities", 1, "Fewer follow-on construction and utility packages"),
      S("osat", 1, "Wafers keep coming from abroad"),
    ],
  },
  {
    id: "memory-squeeze",
    title: "Global memory-chip shortage deepens",
    blurb: "DRAM and NAND prices spike, phones get dearer",
    story:
      "Memory is one of the costliest parts of a phone. A shortage raises phone prices and cuts volumes in a price-sensitive Indian market, squeezing assemblers' growth - while memory packagers such as Micron's Sanand plant run fuller.",
    effect: "headwind",
    impacts: [
      S("phone_ems", 3, "Higher bill of materials and weaker Indian demand"),
      S("brands", 2, "Price hikes or thinner margins on budget phones"),
      S("osat", 2, "Memory packaging lines run at higher utilisation", "tailwind"),
      S("subassy", 1, "Lower phone volumes reduce sub-assembly orders"),
    ],
  },
];

export const SEMICON2_DOCS: ResearchLink[] = [
  { title: "Semicon 2.0: scheme pillars, eligibility and fiscal support", source: "India Semiconductor Mission (MeitY)", url: "https://ism.gov.in/schemes/semicon2.0/" },
  { title: "Government notifies Rs 62,500 crore Mobile Phone Manufacturing Scheme", source: "PIB (MeitY), 21 Aug 2026", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2302098" },
  { title: "Future of India's Semiconductor Industry (roadmap to 2035)", source: "NITI Aayog", url: "https://www.niti.gov.in/index.php/node/2328" },
  { title: "How India's Rs 62,500-crore MPMS works", source: "The Week", url: "https://www.theweek.in/news/biz-tech/2026/08/22/india-mobile-manufacturing-scheme-analysis.html" },
];
