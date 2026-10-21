// Electronic Components (ECMS): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.ecms) and ../docs.ts (SECTOR_DOCS.ecms).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const ECMS_SCENARIOS: Scenario[] = [
  {
    id: "ecms-reopen",
    title: "ECMS reopens with the bigger budget",
    blurb: "The Rs 40,000 crore outlay funds a fresh application window",
    story:
      "Budget 2026-27 lifted ECMS from Rs 22,919 crore to Rs 40,000 crore after approvals overshot the investment target. If MeitY reopens Segments A-C (modules, boards, passives) with the extra money, a second wave of PCB, HDI and module plants gets funded. Companies that already have approved plants gain scale and customers first; materials and equipment makers see a bigger capex wave behind them.",
    effect: "tailwind",
    impacts: [
      S("hdi", 3, "HDI/flex is the priority hybrid segment and the biggest gap"),
      S("mlb", 2, "More board fabs - also more competition for the first movers", "tailwind"),
      S("camera", 2, "Second wave of module projects"),
      S("display", 2, "Room for more display-module makers"),
      S("laminate", 2, "More fabs need local laminate"),
      S("capgoods", 2, "Every new plant buys machines"),
      S("ems", 1, "Cheaper local parts over time"),
    ],
  },
  {
    id: "pn3-block",
    title: "Chinese JV approvals stall",
    blurb: "Press Note 3 clearances for Chinese partners slow or stop",
    story:
      "Many camera and display-module projects rely on Chinese technology partners (HKC, Q Tech) that need Press Note 3 approval for any Chinese investment. If a border flare-up or policy shift freezes these approvals, module plants that depend on them slip by quarters, and phone makers keep importing modules. Board fabs with Korean, European or Japanese partners are less affected.",
    effect: "headwind",
    impacts: [
      S("display", 3, "Dixon's HKC JV and others depend on Chinese know-how"),
      S("camera", 3, "Camera-module JVs (Q Tech) face the same gate"),
      S("ems", 2, "Assemblers keep importing modules; margins stay thin"),
      S("cellmat", 1, "Some materials projects use Chinese technology transfer"),
      S("hdi", 1, "Korean/European-partnered fabs gain relative appeal", "tailwind"),
    ],
  },
  {
    id: "pcb-glut",
    title: "Too many PCB fabs at once",
    blurb: "A dozen new board plants start up in FY27-FY28 into a still-small market",
    story:
      "ECMS has approved dozens of PCB projects that all start production within roughly two years. If phone and industrial demand for local boards grows slower than capacity, utilisation stays low, prices fall and start-up losses linger. Turnover-linked incentives only pay on extra sales, so slow ramps also delay the subsidy. Laminate and chemical suppliers see slower orders.",
    effect: "headwind",
    impacts: [
      S("mlb", 3, "Low utilisation and price competition"),
      S("hdi", 2, "Fewer players, but qualification-gated ramps"),
      S("laminate", 2, "New laminate plants depend on fab volumes"),
      S("capgoods", 1, "Second-phase equipment orders deferred"),
      S("ems", 1, "Cheaper local boards help assemblers' margins", "tailwind"),
    ],
  },
  {
    id: "phone-export-boom",
    title: "Phone exports keep surging",
    blurb: "US tariff gaps and China+1 push India's phone output much higher",
    story:
      "If Apple, Samsung and others keep moving phone assembly to India for US and European markets, volumes for every part inside the phone rise. Enclosures, HDI boards, camera and display modules and device cells - the core ECMS segments - get anchor customers, and component plants fill faster.",
    effect: "tailwind",
    impacts: [
      S("enclosures", 3, "iPhone-class enclosures scale with assembly"),
      S("hdi", 3, "Every phone needs an HDI mainboard"),
      S("camera", 3, "Module demand rises with handset volume"),
      S("display", 2, "Display modules follow phone volumes"),
      S("cellmat", 2, "Device cells and their materials"),
      S("ems", 2, "Assembly volumes and backward integration"),
      S("passives", 1, "Hundreds of passives per phone"),
    ],
  },
];

export const ECMS_DOCS: ResearchLink[] = [
  { title: "ECMS portal: guidelines, notifications and applications", source: "Ministry of Electronics and IT (MeitY)", url: "https://ecms.meity.gov.in/" },
  { title: "First batch of seven ECMS projects approved (Oct 2025)", source: "Press Information Bureau", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2182986" },
  { title: "ECMS 2025: incentives and eligibility explained", source: "India Briefing (Dezan Shira & Associates)", url: "https://www.india-briefing.com/news/ecms-2025-application-incentives-eligibility-37134.html/" },
  { title: "Industry reports on electronics manufacturing", source: "India Cellular & Electronics Association (ICEA)", url: "https://www.icea.org.in/" },
];
