// Nifty 50: what-if scenarios and the curated reading list.
// Impacts reference the index's 15 NSE industry zones (see ./nifty50.ts).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const NIFTY50_SCENARIOS: Scenario[] = [
  {
    id: "rbi-cuts",
    title: "RBI cuts rates further",
    blurb: "Lower policy rates and easier liquidity through 2027",
    story:
      "If inflation stays low and the RBI keeps cutting, loans get cheaper for households and companies. Credit growth picks up and rate-sensitive buying (cars, homes, durables) follows. Banks lend more but their margins narrow at first, because loan rates reset faster than deposit rates; NBFCs, which borrow in the market, gain more. Regulated utilities and capex plays benefit from cheaper funding.",
    effect: "tailwind",
    impacts: [
      S("fin", 3, "NBFCs' funding costs fall; banks gain volume but margins dip first"),
      S("auto", 2, "Cheaper vehicle loans"),
      S("durables", 2, "Home upgrades and discretionary spend"),
      S("constmat", 2, "Housing demand for cement"),
      S("construction", 1, "Cheaper project finance"),
      S("consvc", 1, "Growth stocks rerate when rates fall"),
      S("power", 1, "Lower borrowing costs on large capex"),
    ],
  },
  {
    id: "crude-spike",
    title: "Crude oil spikes",
    blurb: "Brent jumps on a Middle East supply shock",
    story:
      "India imports most of its oil, so a sharp rise in crude widens the trade deficit, weakens the rupee and lifts inflation, which delays rate cuts. Airlines, paint makers and carmakers face higher costs. ONGC earns more per barrel (unless the government taxes the windfall), and IT and pharma exporters gain from a weaker rupee.",
    effect: "headwind",
    impacts: [
      S("oilgas", 2, "Producers gain on price; refining and windfall-tax risk offset", "tailwind"),
      S("services", 3, "Jet fuel is the airline's biggest cost"),
      S("durables", 2, "Paint raw materials are crude-linked"),
      S("auto", 2, "Fuel costs and inflation hurt demand"),
      S("fmcg", 1, "Packaging and freight costs rise"),
      S("fin", 2, "Higher inflation delays rate cuts; FPI outflows"),
      S("it", 1, "Weaker rupee lifts margins", "tailwind"),
      S("health", 1, "Weaker rupee helps US earnings", "tailwind"),
    ],
  },
  {
    id: "us-tech-slowdown",
    title: "US tech spending slows",
    blurb: "A US slowdown, new tariffs or visa curbs hit outsourcing budgets",
    story:
      "If US companies cut IT budgets - because of a slowdown, new tariffs on services, or higher H-1B and onshore staffing costs - Indian IT firms see fewer new deals and slower growth. AI-led price cuts on existing work add to the pressure. The rupee may weaken, partly cushioning margins. Pharma faces its own tariff risk in the same environment.",
    effect: "headwind",
    impacts: [
      S("it", 3, "Fewer deals, slower growth and higher onshore costs"),
      S("health", 2, "US tariff or pricing risk on drug exports"),
      S("auto", 1, "JLR and export volumes exposed to US demand"),
      S("metals", 1, "Weaker global demand for metals"),
      S("fin", 1, "Domestic lenders largely insulated; FPI flows may slow"),
    ],
  },
  {
    id: "rural-boom",
    title: "Strong monsoon lifts rural demand",
    blurb: "A good monsoon and higher farm incomes into FY28",
    story:
      "A strong monsoon raises farm output and incomes. Rural households buy more tractors, two-wheelers, entry cars and everyday goods; lenders to small businesses and vehicle owners see better repayments. Food inflation eases, giving the RBI room to cut. Hydro and lower cooling demand can soften power demand and coal offtake.",
    effect: "tailwind",
    impacts: [
      S("fmcg", 3, "Rural volume growth for staples"),
      S("auto", 3, "Tractors, two-wheelers and entry cars"),
      S("fin", 2, "Better repayments for rural and vehicle lenders"),
      S("durables", 1, "Spillover into discretionary spend"),
      S("constmat", 1, "Rural housing demand"),
      S("power", 1, "Cooler, wetter months lower power demand", "headwind"),
      S("oilgas", 1, "Less coal needed when hydro runs strong", "headwind"),
    ],
  },
];

export const NIFTY50_DOCS: ResearchLink[] = [
  { title: "Nifty 50 index: constituents, returns and data", source: "NSE Indices", url: "https://www.niftyindices.com/indices/equity/broad-based-indices/nifty--50" },
  { title: "Nifty 50 factsheet (sector weights, top constituents)", source: "NSE Indices", url: "https://www.niftyindices.com/Factsheet/ind_nifty50.pdf" },
  { title: "Methodology for NIFTY equity indices", source: "NSE Indices", url: "https://www.niftyindices.com/Methodology/Method_NIFTY_Equity_Indices.pdf" },
  { title: "Nifty 50 live market watch", source: "National Stock Exchange of India", url: "https://www.nseindia.com/products-services/indices-nifty50-index" },
];
