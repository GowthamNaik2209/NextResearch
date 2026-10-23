// Defence Procurement (DAC approvals): what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.defenceproc) and ../docs.ts (SECTOR_DOCS.defenceproc).
import type { Scenario, ScenarioImpact, Severity, ScenarioEffect } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: Severity, why: string, effect?: ScenarioEffect): ScenarioImpact => ({ zone, severity, why, effect });

export const DEFENCEPROC_SCENARIOS: Scenario[] = [
  {
    id: "aon-to-contract",
    title: "Approvals convert to contracts faster",
    blurb: "DAP 2026 cuts the AoN-to-contract gap",
    story:
      "In FY26 the DAC approved ₹6.81L Cr of purchases but the MoD signed ₹2.28L Cr of contracts. If the new acquisition procedure (DAP 2026) and fewer trial rounds pull contracts forward, order books fill sooner - most for makers of electronics, missiles and ammunition, whose programmes are already proven.",
    effect: "tailwind",
    impacts: [
      S("radars_ew", 3, "Electronics contracts are mostly indigenous and already trialled - they convert first"),
      S("missiles", 3, "QRSAM, MRSAM and MPATGM approvals turn into BEL/BDL orders"),
      S("ammunition", 2, "Repeat orders, short trials"),
      S("vehicles", 2, "Sep 2026 approvals (HMV, Sarvatra, mine layers) move to tender"),
      S("subsystems", 2, "Primes place sub-system orders once their own contract is signed"),
      S("aircraft", 1, "Big aircraft deals are limited by engines, not paperwork"),
    ],
  },
  {
    id: "engine-delay",
    title: "Imported engine supply slips again",
    blurb: "GE F404 and other engine deliveries fall behind",
    story:
      "Aircraft are only delivered when their engines arrive. GE sent HAL 6 of 11 promised F404 engines in FY26. Another slip would push Tejas deliveries and revenue out again, and the same risk hangs over ship and vehicle programmes that use imported engines. It strengthens the case for Indian engine parts makers in the long run.",
    effect: "headwind",
    impacts: [
      S("aircraft", 3, "Airframes wait for engines; revenue recognised on delivery"),
      S("radars_ew", 1, "Radar and avionics shipments for the same aircraft are rescheduled"),
      S("aerostructures", 1, "Short-term volumes wait, but engine localisation becomes more urgent", "tailwind"),
      S("naval", 1, "Ships also depend on imported propulsion; marine gas turbine localisation helps over time"),
    ],
  },
  {
    id: "budget-squeeze",
    title: "Capital budget growth stalls",
    blurb: "FY28 capital outlay rises less than inflation",
    story:
      "The FY27 budget raised capital acquisition ~24% to ₹1.85L Cr. If fiscal pressure holds the next budget flat, the MoD can sign fewer new contracts and pays more slowly. Existing order books keep revenue going, but new orders and valuations - which assume fast growth - take the hit. Long-gestation platforms get deferred first.",
    effect: "headwind",
    impacts: [
      S("naval", 3, "Large new ship and submarine deals are easiest to defer"),
      S("aircraft", 2, "New fighter tranches and helicopters slip"),
      S("artillery", 2, "New gun programmes move right"),
      S("missiles", 1, "Air defence stays a priority after Operation Sindoor"),
      S("ammunition", 1, "Consumables are protected, but war-reserve top-ups slow"),
      S("materials", 1, "Volumes follow platform programmes with a lag"),
    ],
  },
  {
    id: "export-surge",
    title: "Defence exports hit the 2029 target early",
    blurb: "Exports pass ₹50,000 Cr a year",
    story:
      "Exports reached a record ₹38,424 Cr in FY26 (+63%). Wars in Europe and the Middle East keep demand for shells, rockets, guns and air-defence systems high. If exports pass the ₹50,000 Cr target early, makers with export-ready products earn more and depend less on Indian budget timing.",
    effect: "tailwind",
    impacts: [
      S("ammunition", 3, "Shells, rockets and explosives are the largest export lines"),
      S("artillery", 2, "Indian guns are already exported"),
      S("missiles", 2, "Air-defence and missile export deals with friendly countries"),
      S("naval", 1, "Patrol vessels and export ship orders"),
      S("aerostructures", 1, "Global engine and airframe parts orders"),
    ],
  },
];

export const DEFENCEPROC_DOCS: ResearchLink[] = [
  { title: "Defence in Union Budget 2026-27", source: "Press Information Bureau (Ministry of Defence)", url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202623778301.pdf" },
  { title: "Defence Acquisition Procedure (DAP 2020) and amendments", source: "Ministry of Defence", url: "https://www.mod.gov.in/dod/defence-procurement-procedure" },
  { title: "Ministry of Defence 2026-27 Budget Estimates: An Analysis", source: "MP-IDSA", url: "https://www.idsa.in/publisher/issuebrief/ministry-of-defence-2026-27-budget-estimates-an-analysis" },
  { title: "SRIJAN: items offered for indigenisation and Positive Indigenisation Lists", source: "Department of Defence Production", url: "https://srijandefence.gov.in/" },
];
