// Power Transmission & Grid: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.transmission) and ../docs.ts (SECTOR_DOCS.transmission).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const TRANSMISSION_SCENARIOS: Scenario[] = [
  {
    id: "tbcb-award-surge",
    title: "ISTS awards speed up",
    blurb: "The NEP pipeline is bid out over the next 3-4 years",
    story:
      "About ₹2.64L Cr of inter-state schemes were still in planning or bidding in Jan 2026 (CareEdge), and POWERGRID expects the plan to be awarded over the next three to four years. If PFC and REC consulting run bids at that pace, utilities book record wins and place orders for towers, conductors, transformers and HVDC terminals. Equipment makers with spare capacity and EPC firms with balance sheets gain most; utilities' earnings rise only once lines are charged.",
    effect: "tailwind",
    impacts: [
      S("transcos", 3, "Record wins add to the asset base and future tariffs"),
      S("towers", 3, "Line EPC orders follow each award within months"),
      S("transformers", 3, "Every new substation needs power transformers and reactors"),
      S("conductors", 2, "Conductor volumes track ckm awarded"),
      S("switchgear", 2, "New bays and GIS substations"),
      S("hvdc", 2, "Bulk renewable corridors use HVDC"),
      S("markets", 1, "Bid-process fees and transmission lending for PFC and REC"),
      S("materials", 1, "More aluminium, copper and CRGO demand"),
    ],
  },
  {
    id: "crgo-duty",
    title: "Anti-dumping duty on CRGO",
    blurb: "DGTR's probe ends with duties on imported electrical steel",
    story:
      "India imports most of its CRGO electrical steel, and DGTR opened an anti-dumping case on imports from China, Japan, Korea and Russia in Jun 2026 after a complaint by JSW JFE, the only domestic maker. If duties are imposed before JSW JFE's new capacity arrives (from FY28), transformer makers pay more for the core steel. Those with price-variation clauses pass it on; fixed-price orders and smaller makers take the hit, and grid projects cost more.",
    effect: "headwind",
    impacts: [
      S("transformers", 3, "CRGO is the core of every transformer; fixed-price orders lose margin"),
      S("hvdc", 1, "Converter transformers cost more"),
      S("transcos", 1, "Higher equipment cost on projects already bid"),
      S("materials", 2, "The domestic CRGO maker and processors gain pricing", "tailwind"),
    ],
    stocks: [{ key: "jswSteel", severity: 1, effect: "tailwind", why: "Its CRGO joint venture gains pricing, though CRGO is tiny next to its steel business" }],
  },
  {
    id: "transformer-glut",
    title: "Transformer capacity overshoots",
    blurb: "Announced expansions land just as export demand cools",
    story:
      "Nearly every transformer maker is adding capacity in FY27-FY28 (Hitachi Energy, Siemens Energy, TARIL, CG Power and others). If US and European shortages ease as their own factories expand - Rystad expects peak lead times to ease within a year - Indian makers lose export orders while new domestic lines come on. Pricing and margins, which have widened since FY24, would fall back toward pre-shortage levels. Utilities and EPC firms benefit from cheaper, faster equipment.",
    effect: "headwind",
    impacts: [
      S("transformers", 3, "Margins at a cyclical peak are the first to compress"),
      S("switchgear", 1, "Same buyers, more competition"),
      S("hvdc", 1, "Converter-transformer pricing softens"),
      S("transcos", 2, "Cheaper, faster equipment helps commissioning", "tailwind"),
      S("towers", 1, "EPC firms buy equipment for turnkey jobs at lower cost", "tailwind"),
    ],
  },
  {
    id: "rdss-extension",
    title: "RDSS deadline slips",
    blurb: "The smart-meter scheme is extended beyond Mar 2028",
    story:
      "Only about 28% of sanctioned smart meters were installed by Jun 2026. If the Centre extends RDSS past its Mar 2028 sunset, the deadline rush fades: AMISPs and meter makers spread installs over more years, revenue arrives later and working capital stays tied up. The total opportunity is unchanged, but the timing and discom payment discipline matter more.",
    effect: "headwind",
    impacts: [
      S("metering", 3, "Installs and AMISP revenue pushed out"),
      S("markets", 1, "Slower loss reduction for discoms that borrow from PFC and REC"),
      S("transcos", 1, "AESL's smart-meter book ramps slower"),
    ],
  },
];

export const TRANSMISSION_DOCS: ResearchLink[] = [
  { title: "National Electricity Plan (Transmission) launched: ₹9.15L Cr to 2032", source: "Press Information Bureau (Ministry of Power)", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2064751" },
  { title: "Approved inter-state transmission (ISTS) schemes", source: "Central Transmission Utility of India (CTUIL)", url: "https://www.ctuil.in/ists-schemes" },
  { title: "ISTS schemes by route: regulated (RTM) and bidding (TBCB)", source: "Central Transmission Utility of India (CTUIL)", url: "https://www.ctuil.in/rtmtbcb" },
  { title: "Revamped Distribution Sector Scheme (RDSS)", source: "Ministry of Power", url: "https://rdss.powermin.gov.in/" },
];
