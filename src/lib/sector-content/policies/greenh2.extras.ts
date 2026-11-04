// Green Hydrogen Mission: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.greenh2) and ../docs.ts (SECTOR_DOCS.greenh2).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const GREENH2_SCENARIOS: Scenario[] = [
  {
    id: "greenh2-slip",
    title: "Plants miss their dates",
    blurb: "SIGHT factories and production plants slip by a year or more",
    story:
      "As of Jul 2026 no SIGHT-backed electrolyser factory or production plant was fully running, and only ₹292 Cr of the ₹19,744 Cr mission had been spent. If Tranche I factories (due from Aug 2026) and the first green ammonia plants slip another year, incentives stay unpaid, electrolyser makers sit on idle lines, and fertiliser and refinery buyers keep using grey hydrogen. Conglomerates barely notice; small pure plays feel it most.",
    effect: "headwind",
    impacts: [
      S("electrolysers", 3, "Factories built ahead of orders run far below capacity"),
      S("producers", 3, "Per-kg incentives start only when output starts"),
      S("bop", 2, "Equipment orders deferred"),
      S("power", 2, "Renewable capacity built for hydrogen waits for its buyer"),
      S("ammonia", 1, "Buyers keep importing ammonia; no harm to earnings"),
      S("refineries", 1, "Refiners stay on grey hydrogen"),
    ],
  },
  {
    id: "greenh2-exports",
    title: "Export contracts turn binding",
    blurb: "Japan, Korea and Germany sign firm, subsidy-backed ammonia deals",
    story:
      "Over 70% of India's contracted green hydrogen volume is for export. Reliance's Samsung C&T deal (Mar 2026), ACME's IHI deal (signed Jan 2024, certified for Japanese CfD support in Jul 2026) and AM Green's H2Global win (Sep 2026) are binding. If more European and Japanese buyers sign firm, priced contracts, export plants reach financial close, order electrolysers and power, and hub ports start building ammonia berths.",
    effect: "tailwind",
    impacts: [
      S("producers", 3, "Binding offtake unlocks project finance"),
      S("transport", 3, "Ports and tanks needed for ammonia exports"),
      S("power", 2, "Gigawatts of round-the-clock renewables per project"),
      S("electrolysers", 2, "Large stack orders - though some go to foreign makers"),
      S("bop", 2, "Compressors, water and ammonia-loop packages"),
      S("ammonia", 1, "Export plants also lower costs for domestic buyers"),
    ],
  },
  {
    id: "greenh2-mandate",
    title: "A green hydrogen purchase obligation",
    blurb: "Refiners and fertiliser makers must use a share of green hydrogen",
    story:
      "Today domestic demand comes only from voluntary PSU tenders. If the government notifies a consumption obligation (a small, rising share of hydrogen in refineries and fertiliser plants), demand jumps from tens of thousands to lakhs of tonnes a year. Producers and electrolyser makers gain a captive market; refiners and fertiliser makers pay more for hydrogen unless costs are passed through or subsidised.",
    effect: "tailwind",
    impacts: [
      S("producers", 3, "Guaranteed domestic demand at scale"),
      S("electrolysers", 3, "Domestic orders, with a local-manufacturing preference likely"),
      S("refineries", 2, "Higher hydrogen cost for refiners", "headwind"),
      S("ammonia", 2, "Higher input cost unless the fertiliser subsidy absorbs it", "headwind"),
      S("power", 2, "More round-the-clock renewables contracted"),
      S("steel", 1, "Sets a template a green-steel mandate could follow"),
    ],
  },
  {
    id: "greenh2-china-stacks",
    title: "Cheap Chinese electrolysers flood in",
    blurb: "Chinese stacks sell far below Indian and European prices",
    story:
      "China makes most of the world's electrolysers and has spare capacity. If producers are allowed to buy them freely, plant costs fall and green hydrogen gets cheaper - good for producers and their buyers. But Indian electrolyser factories built under SIGHT lose orders, and the manufacturing incentive goes partly unused.",
    effect: "headwind",
    impacts: [
      S("electrolysers", 3, "Indian factories undercut on price"),
      S("producers", 2, "Lower capex per tonne", "tailwind"),
      S("bop", 1, "Chinese packages may bundle balance of plant too"),
      S("ammonia", 1, "Cheaper green ammonia over time", "tailwind"),
      S("refineries", 1, "Lower prices in future tenders", "tailwind"),
    ],
  },
];

export const GREENH2_DOCS: ResearchLink[] = [
  { title: "National Green Hydrogen Mission: overview and documents", source: "Ministry of New and Renewable Energy (MNRE)", url: "https://mnre.gov.in/en/national-green-hydrogen-mission/" },
  { title: "Cabinet approves the National Green Hydrogen Mission (Jan 2023)", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1888547" },
  { title: "SECI completes renewable ammonia auction round", source: "Ammonia Energy Association", url: "https://ammoniaenergy.org/articles/seci-completes-renewable-ammonia-auction-round/" },
  { title: "SECI awards 450,000 tonnes under SIGHT Tranche II", source: "JMK Research", url: "https://jmkresearch.com/seci-awards-450000-mt-annual-capacity-under-sight-tranche-ii-for-green-hydrogen-production/" },
];
