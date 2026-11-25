// Automobiles: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.autos) and ../docs.ts (SECTOR_DOCS.autos).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const AUTOS_SCENARIOS: Scenario[] = [
  {
    id: "commodity-squeeze",
    title: "Metal and rubber prices stay high",
    blurb: "Steel, aluminium, copper and rubber stay expensive and makers can't reprice fast enough",
    story:
      "Conflict in West Asia pushed up crude, aluminium, copper and rubber in 2026: Maruti's Q2 FY27 standalone profit fell 26.9% despite record volumes, Hyundai's margin dropped in Q1, and CEAT says it needs a 7-8% price rise. If costs stay high, carmakers and tyre makers keep raising prices in steps, and the ones selling cheaper vehicles to price-sensitive buyers feel it most. Battery and oil brands with strong replacement demand pass costs on more easily.",
    effect: "headwind",
    impacts: [
      S("passenger_vehicles", 3, "Raw materials are most of a car's cost; price rises lag"),
      S("tyres", 3, "Rubber and crude-linked inputs are most of a tyre's cost"),
      S("two_wheelers", 2, "Aluminium and steel costs; entry-bike buyers resist price rises"),
      S("modules_interiors", 2, "Steel and aluminium frames and wheels; pass-through comes a quarter late"),
      S("body_electricals", 1, "Copper and resin costs, partly passed on"),
      S("replacement", 1, "Strong brands pass lead and base-oil costs to buyers"),
    ],
  },
  {
    id: "weak-monsoon",
    title: "A weak monsoon hits rural buyers",
    blurb: "Poor rains cut farm income, tractors and entry bikes",
    story:
      "Mahindra cut its FY27 tractor outlook to flat in Nov 2026 after uneven rains, a year after the industry first sold more than 10 lakh tractors. If the next monsoon also disappoints, farm income falls and buyers delay tractors, entry motorcycles and small trucks. Suppliers that depend on these segments (tractor wheels and axles, two-wheeler chains and brakes) follow, while city-led SUV demand holds up.",
    effect: "headwind",
    impacts: [
      S("tractors", 3, "Tractor demand tracks farm income and rural credit"),
      S("two_wheelers", 2, "Entry motorcycles are rural purchases"),
      S("commercial_vehicles", 1, "Small trucks and pickups carry farm produce"),
      S("replacement", 1, "Tractor and bike owners delay oil and battery changes"),
      S("tyres", 1, "Farm and two-wheeler tyre replacement slows"),
    ],
  },
  {
    id: "cafe3-hybrids-evs",
    title: "CAFE III pushes hybrids and EVs",
    blurb: "Stricter fuel rules from April 2027 shift the car mix away from plain petrol and diesel",
    story:
      "CAFE III, notified on 30 Sep 2026, tightens each carmaker's average CO2 limit every year from Apr 2027 to 2032 and gives EVs triple credit and strong hybrids 1.6x. Carmakers respond with more CNG, hybrids and EVs and fewer large diesel engines. Over time that removes demand for pistons, injectors and exhausts on the cars that go electric, while electronics, steering, brakes, bearings and tyres stay on every car.",
    effect: "headwind",
    impacts: [
      S("passenger_vehicles", 2, "Costlier hybrids and EVs, credit purchases or fines for laggards"),
      S("engine_parts", 2, "Fewer engines per car sold over time"),
      S("emissions_fuel", 1, "Hybrids and CNG still need injection and after-treatment; EVs don't"),
      S("body_electricals", 2, "More electronics, sensors and LED content per car", "tailwind"),
      S("driveline", 1, "EV gears, differentials and bearings replace some engine parts", "tailwind"),
      S("replacement", 1, "EVs need far less engine oil"),
    ],
  },
  {
    id: "trade-deals-open-exports",
    title: "Trade deals could cut tariffs on Indian parts",
    blurb: "The US framework and the India-EU FTA promise lower duties on auto parts",
    story:
      "The US-India framework of 6 Feb 2026 promised a lower-duty quota (0-18%) for many Indian auto parts that now pay the 25% US tariff on imported auto parts; it had not been put in place by late Nov 2026, as far as reported, and parts are outside the separate 10% US duty on other Indian goods. The India-EU FTA (concluded 27 Jan 2026) removes duties on car parts over 5-10 years. If both take effect, exporters of forgings, gears, bearings, cables and off-highway tyres win share from Chinese and European suppliers. The EU deal also lets up to 2.5 lakh European cars a year in at falling duties, a small headwind for premium carmakers.",
    effect: "tailwind",
    impacts: [
      S("driveline", 3, "Gears, axle shafts, bearings and rings are largely exported"),
      S("engine_parts", 2, "Crankshafts and forgings sold to US and European engine makers"),
      S("tyres", 2, "Off-highway and truck tyre exports to the US and Europe"),
      S("chassis_systems", 1, "Cables, brakes and suspension parts exported"),
      S("passenger_vehicles", 1, "Cheaper European imports in the premium segment", "headwind"),
    ],
  },
];

export const AUTOS_DOCS: ResearchLink[] = [
  { title: "Auto industry hits 7-year peak in FY26 as all segments log record sales", source: "Autocar Professional, SIAM data (14 Apr 2026)", url: "https://www.autocarpro.in/news/auto-industry-hits-7-year-peak-in-fy26-as-all-segments-log-record-sales-132106" },
  { title: "Government notifies CAFE III norms: EVs get 3x credit, credit trading allowed", source: "Autocar Professional (30 Sep 2026)", url: "https://www.autocarpro.in/news/government-notifies-cafe-iii-norms-evs-get-3x-credit-credit-trading-allowed-134984" },
  { title: "Tractor retail sales rise 3.10% to 79,285 units in October", source: "Autocar Professional, FADA data (6 Nov 2026)", url: "https://www.autocarpro.in/analysis-sales/tractor-retail-sales-rise-310-percent-to-79285-units-in-october-fada-135779" },
  { title: "Tata Motors sets Iveco stake at 96.25%, moves ahead with squeeze-out", source: "Autocar Professional (9 Nov 2026)", url: "https://www.autocarpro.in/news/tata-motors-sets-iveco-stake-at-9625-percent-moves-ahead-with-squeeze-out-135838" },
];
