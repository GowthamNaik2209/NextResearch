// Battery Storage (PLI-ACC): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.pliacc) and ../docs.ts (SECTOR_DOCS.pliacc).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const PLIACC_SCENARIOS: Scenario[] = [
  {
    id: "pliacc-components-scheme",
    title: "Battery-components PLI approved",
    blurb: "The reported ~₹13,000 Cr scheme for cathode, anode, electrolyte and foil goes ahead",
    story:
      "Reports in Aug 2026 put a proposed scheme at roughly ₹13,000 Cr, heading to the Expenditure Finance Committee (not yet approved), to support cathode and anode active materials, electrolyte, copper foil and separators. If it is approved, the materials makers now at pilot or first-plant stage (Himadri, Gujarat Fluorochemicals, HEG's TACC, Epsilon, Neogen, TCPL) get capital support for scale, and cell plants find it easier to reach the PLI-ACC's 60% local value-addition target.",
    effect: "tailwind",
    impacts: [
      S("cathode", 3, "The biggest materials gap and the largest share of cell cost"),
      S("anode", 3, "Graphite anode plants (TACC, Epsilon) get funded scale-up"),
      S("electrolyte", 2, "Salts and binders already in early supply"),
      S("foil", 2, "Copper foil and separators are named in the reported scheme"),
      S("cells", 2, "Local materials make the 60% value-addition target reachable"),
    ],
  },
  {
    id: "pliacc-china-tech-squeeze",
    title: "China tightens battery tech and materials exports",
    blurb: "Curbs on LFP know-how, equipment, cathode and graphite widen",
    story:
      "China already restricts the export of LFP cathode and lithium-processing technology and licenses graphite exports. If it widens curbs to cell-making equipment, technicians or finished cathode and anode, Indian cell plants that rely on Chinese know-how slow down (JSW has already paused its cell plans for lack of an LFP partner). Imported cells may also get dearer, which helps BESS and EV buyers only once local cells are running. Domestic materials makers gain pricing and urgency.",
    effect: "headwind",
    impacts: [
      S("cells", 3, "Technology and equipment access is the main gating factor"),
      S("bess", 2, "Developers face pricier or slower container supply"),
      S("evofftake", 2, "Imported cell costs and supply risk rise"),
      S("packs", 2, "Pack makers assemble imported cells"),
      S("cathode", 2, "Local cathode becomes more valuable", "tailwind"),
      S("anode", 2, "Non-Chinese graphite anode in demand", "tailwind"),
    ],
  },
  {
    id: "pliacc-bess-boom",
    title: "Grid storage tenders keep surging",
    blurb: "VGF-backed BESS awards and solar-plus-storage rules pull cell demand forward",
    story:
      "With ₹5,400 Cr of VGF for 30 GWh, transmission-charge waivers for storage commissioned by Jun 2028, and CEA advice to pair solar with storage, BESS tenders could keep running at record pace. Developers and container makers fill order books first; the 10 GWh grid-storage PLI tranche and Reliance's, Amara Raja's and Waaree's LFP plans give local cells a large anchor market.",
    effect: "tailwind",
    impacts: [
      S("bess", 3, "Direct: more contracted storage"),
      S("packs", 3, "Container and integration volumes"),
      S("cells", 2, "LFP cell plants aimed at storage find buyers"),
      S("cathode", 1, "LFP cathode demand grows with storage"),
      S("foil", 1, "Foil volumes follow cell output"),
    ],
  },
  {
    id: "pliacc-awardees-falter",
    title: "PLI-ACC awards are cancelled or cut",
    blurb: "MHI enforces penalties and takes back capacity from laggards",
    story:
      "All three original awardees missed the Dec 2024 milestone. MHI gave Ola revised timelines in Aug 2026 (12 GWh by Jul 2027, 20 GWh by end-FY28), while Reliance and Rajesh Exports carry accrued penalties and MHI is reviewing Rajesh Exports' award after SEBI's Jun 2026 interim order. If the ministry cancels or cuts awards (or Ola misses its new targets), incentive money is re-tendered and the timeline for 50 GWh of local cells slips again. Non-awardees building anyway - Exide, Amara Raja, Agratas, Waaree - could win the freed capacity, while EV and BESS buyers keep importing for longer.",
    effect: "headwind",
    impacts: [
      S("cells", 3, "Awardees lose incentives; local capacity slips"),
      S("evofftake", 1, "Imports continue longer"),
      S("bess", 1, "Local cells for storage arrive later"),
      S("cathode", 1, "Materials demand pushed out"),
      S("electrolyte", 1, "Domestic offtake delayed; exports unaffected"),
    ],
    stocks: [
      { key: "exide", severity: 2, effect: "tailwind", why: "Running plant could bid for freed capacity" },
      { key: "amararaja", severity: 1, effect: "tailwind", why: "Has said it will bid for PLI capacity" },
    ],
  },
];

export const PLIACC_DOCS: ResearchLink[] = [
  { title: "PLI scheme: National Programme on ACC Battery Storage", source: "Ministry of Heavy Industries", url: "https://heavyindustries.gov.in/pli-scheme-national-programme-advanced-chemistry-cell-acc-battery-storage" },
  { title: "Assessing India's ACC PLI scheme (Jan 2026)", source: "IEEFA and JMK Research", url: "https://ieefa.org/sites/default/files/2026-01/Assessing%20India's%20ACC%20PLI%20scheme.pdf" },
  { title: "VGF scheme expands to 30 GWh of standalone BESS", source: "JMK Research", url: "https://jmkresearch.com/vgf-scheme-expands-to-support-30-gwh-of-new-standalone-bess-development-in-india/" },
  { title: "India has failed to build a battery-cell ecosystem: can a new PLI change this? (Oct 2026)", source: "Business Today", url: "https://www.businesstoday.in/auto/story/bt-big-story-india-has-failed-to-build-an-ecosystem-of-battery-cells-can-a-new-pli-change-this-562898-2026-10-22" },
];
