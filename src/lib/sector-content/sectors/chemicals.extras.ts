// Chemicals & Agrochem: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.chemicals) and ../docs.ts (SECTOR_DOCS.chemicals).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const CHEMICALS_SCENARIOS: Scenario[] = [
  {
    id: "hormuz-reopens",
    title: "Hormuz shipping returns to normal",
    blurb: "Gulf LNG, naphtha, LPG and urea cargoes flow again and feedstock prices fall back",
    story:
      "Since early Mar 2026 shipping through the Strait of Hormuz has been severely disrupted - traffic was still about 65% below pre-war levels in mid-Nov 2026 (UKMTO) and Qatar's LNG sailings about 30% of normal - cutting Qatar's LNG, Gulf naphtha and LPG, and the Gulf's urea and sulphur exports. If traffic returns to normal, gas returns to Indian urea plants, phosphate makers pay less for ammonia and sulphur, and the government's fertiliser subsidy bill falls. But Asian crackers and Chinese chemical plants that cut output for lack of feedstock restart, so the shortage premium that lifted Indian phenol, amine and polymer spreads in 2026 fades. Terminals and LPG distributors see volumes return.",
    effect: "tailwind",
    impacts: [
      S("fertilisers", 3, "Gas and raw-material costs fall faster than subsidy rates"),
      S("feedstock", 2, "LNG and crude flow normally; fewer supply cuts to customers"),
      S("terminals", 2, "LPG and liquid import volumes recover"),
      S("explosives", 1, "Cheaper ammonia lowers ammonium nitrate costs"),
      S("intermediates", 2, "Asian rivals restart; the 2026 shortage premium on spreads fades", "headwind"),
      S("petchem", 2, "Asian crackers restart and polymer spreads narrow", "headwind"),
      S("consumer_specialty", 1, "Lower VAM and crude-linked input costs lift margins"),
    ],
    stocks: [
      { key: "deepakNitrite", severity: 2, effect: "headwind", why: "Phenol spreads that drove its record 2026 quarters normalise" },
      { key: "coromandel", severity: 2, effect: "tailwind", why: "Phosphoric acid, ammonia and sulphur costs ease" },
      { key: "pidilite", severity: 1, effect: "tailwind", why: "VAM costs fall back" },
    ],
  },
  {
    id: "china-dumping",
    title: "China floods the market again",
    blurb: "Chinese plants run hard into weak demand and export chemicals below Indian costs",
    story:
      "In 2023-25 Chinese overcapacity pushed prices of amines, phenol, rubber chemicals, dyes, soda ash and agrochem generics far below Indian costs, and Indian specialty chemical profits fell for two years. If China's demand stays weak once feedstock returns, its plants export the surplus again. Indian makers of commodity-like intermediates lose most; companies with their own processes, long innovator contracts or brands hold up. Cheaper inputs help formulators and consumer chemical brands. Anti-dumping duties (DGTR cases) soften the blow but take months.",
    effect: "headwind",
    impacts: [
      S("intermediates", 3, "Amine, phenol and benzene-chain spreads collapse"),
      S("carbon_colour", 2, "Rubber chemicals, dyes and pigments face cheaper imports"),
      S("chlor_alkali", 2, "Soda ash and caustic prices follow Chinese exports down"),
      S("crop_protection", 2, "Generic export prices fall; Indian formulators get cheaper technicals"),
      S("petchem", 2, "PVC and polymer imports undercut local makers"),
      S("consumer_specialty", 1, "Cheaper inputs lift margins of brands", "tailwind"),
      S("custom_synthesis", 1, "Contracted innovator work is less exposed than generics"),
    ],
    stocks: [
      { key: "alkylAmines", severity: 3, why: "Amines are among the first products China dumps" },
      { key: "nocil", severity: 2, why: "Rubber chemicals compete with Chinese and Korean imports" },
      { key: "pidilite", severity: 1, effect: "tailwind", why: "Lower input costs" },
    ],
  },
  {
    id: "second-weak-monsoon",
    title: "A second weak monsoon",
    blurb: "El Niño stretches into 2027 and the next monsoon also falls short",
    story:
      "The 2026 monsoon ended 12.6% below normal (IMD), the weakest since 2015, with south India and the east hit hardest and reservoirs below average going into rabi. If El Niño persists and the 2027 monsoon also fails, farmers cut spending on crop protection and seeds, dealers return unsold stock, and receivables stretch. Fertiliser demand falls less because it is subsidised, but sales volumes slip. Companies selling mainly to Indian farmers are hit hardest; those exporting or doing contract work are less exposed.",
    effect: "headwind",
    impacts: [
      S("crop_protection", 3, "Lower pest pressure and farm spending; channel stock returns"),
      S("seeds", 3, "Lower sowing and seed returns"),
      S("fertilisers", 2, "Lower volumes, though prices are capped and subsidised"),
      S("custom_synthesis", 1, "Export contracts with innovators are largely unaffected"),
    ],
    stocks: [
      { key: "dhanuka", severity: 3, why: "Sells only to Indian farmers" },
      { key: "kaveriSeed", severity: 2, why: "Seed sales and returns depend on sowing" },
      { key: "sumitomo", severity: 2, why: "Q2 FY27 volumes already fell after the 2026 monsoon" },
    ],
  },
  {
    id: "innovators-restock",
    title: "Global agrochem innovators restock",
    blurb: "Destocking ends and global crop-protection companies place new orders",
    story:
      "Global crop-protection companies cut inventories through 2023-26 while patents expired and Chinese generics took share, and PI Industries' agchem exports fell 18% in the Sep 2026 quarter. If farm incomes abroad recover and new molecules launch, innovators restock and place new multi-year orders, preferably outside China. Indian custom-synthesis makers fill idle capacity, which lifts margins quickly because their plants are already built; generic exporters also see volumes return.",
    effect: "tailwind",
    impacts: [
      S("custom_synthesis", 3, "Idle capacity fills with innovator orders"),
      S("crop_protection", 2, "Generic export volumes and prices recover"),
      S("fluorochem", 1, "Fluorinated agro intermediates pick up"),
      S("intermediates", 1, "More demand for agro intermediates"),
    ],
    stocks: [
      { key: "piind", severity: 3, why: "Largest custom-synthesis exporter to agrochem innovators" },
      { key: "upl", severity: 2, why: "Global generic volumes recover" },
      { key: "anupam", severity: 2, why: "Contract work for Japanese and European innovators" },
    ],
  },
];

export const CHEMICALS_DOCS: ResearchLink[] = [
  { title: "Government approves Nutrient Based Subsidy for Rabi 2026-27", source: "News On AIR (11 Nov 2026)", url: "https://newsonair.gov.in/govt-approves-nutrient-based-subsidy-for-rabi-2026-27-to-ensure-affordable-fertilisers-for-farmers/" },
  { title: "Strait to farms: West Asia war hits fertiliser supply - can India look beyond?", source: "Outlook Business (5 May 2026)", url: "https://www.outlookbusiness.com/economy-and-policy/strait-to-farms-west-asia-war-hits-fertiliser-supplycan-india-look-beyond" },
  { title: "India's 2026 monsoon ends 12.6% deficient, weakest since 2015", source: "DSIJ (3 Oct 2026)", url: "https://insights.dsij.in/dsijarticledetail/indias-2026-monsoon-ends-126-deficient-weakest-since-2015-59820" },
  { title: "Here's breaking down the Section 301 tariffs", source: "Business Today (24 Jul 2026)", url: "https://www.businesstoday.in/india/story/heres-breaking-down-the-section-301-tariffs-545110-2026-07-24" },
  { title: "Gulf oil exports recover as Hormuz shipping struggles", source: "gCaptain (13 Nov 2026)", url: "https://gcaptain.com/gulf-oil-exports-recover-as-hormuz-shipping-struggles/" },
];
