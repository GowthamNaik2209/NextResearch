// FMCG: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.fmcg) and ../docs.ts (SECTOR_DOCS.fmcg).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const FMCG_SCENARIOS: Scenario[] = [
  {
    id: "crude-palm-stay-high",
    title: "Crude and palm oil stay high",
    blurb: "The Gulf stays shut into 2027 and crude-linked packs and palm oil stay costly",
    story:
      "Since the Strait of Hormuz closed in Mar 2026, crude has traded high and the costs that follow it - PET and polyethylene for bottles and laminates, LAB for detergents, diesel for distribution trucks - have risen with it, while palm oil stays firm. FMCG brands sell most volume at fixed ₹5 and ₹10 price points, so they can only cut grams or raise prices in steps, and margins narrow first. Detergent and soap makers (LAB, palm), biscuit and snack makers (palm, packaging) and bottlers (PET) feel it most; packaging converters pass costs on a quarter or two late. Edible-oil refiners are the exception if duty cuts keep landed prices in check.",
    effect: "headwind",
    impacts: [
      S("home_care", 3, "LAB, soda ash and polymer packs set detergent costs"),
      S("majors", 2, "Gross margins narrow until calibrated price rises catch up"),
      S("foods", 2, "Palm oil and laminates squeeze ₹5-10 biscuit and snack packs"),
      S("beverages", 2, "PET resin and preforms cost more per case"),
      S("packaging", 1, "Resin rises passed on with a lag"),
      S("staples", 1, "Duty cuts cushion landed palm oil; volumes hold", "tailwind"),
    ],
    stocks: [
      { key: "jyothy", severity: 3, why: "Detergents and dishwash are most of its sales" },
      { key: "vbl", severity: 2, why: "Packaging cost already cut its Sep 2026 quarter gross margin" },
      { key: "marico", severity: 1, effect: "tailwind", why: "Copra, its main input, is far below its peak" },
    ],
  },
  {
    id: "second-weak-monsoon",
    title: "A second weak monsoon",
    blurb: "The 2027 monsoon also falls short and rural incomes stay squeezed",
    story:
      "The 2026 monsoon ended 12.6% below normal (IMD), the weakest since 2015, and NIQ found rural FMCG volumes down 5% in Apr-Jun 2026 as fertiliser and fuel costs rose. Sep-quarter results recovered on a low GST-switch base, but if the 2027 monsoon also fails, farm incomes fall again and rural shoppers buy smaller packs, switch to loose oil and atta, and delay discretionary items. Cane and milk supply shrink, so sugar and milk get dearer for food makers. Hot, dry weather sells more cold drinks and summer brands.",
    effect: "headwind",
    impacts: [
      S("majors", 3, "Rural volumes fall back; brands push smaller packs"),
      S("staples", 2, "Shoppers trade down to loose oil and chakki atta"),
      S("sugar", 2, "Lower cane yields; firmer sugar prices but less to crush"),
      S("dairy_protein", 2, "Fodder costs lift milk procurement prices"),
      S("foods", 2, "Milk and sugar inflation on top of weaker rural demand"),
      S("beverages", 1, "Hot, dry weather sells more cold drinks", "tailwind"),
    ],
    stocks: [
      { key: "dabur", severity: 2, why: "Large rural share across health and personal care" },
      { key: "emami", severity: 1, effect: "tailwind", why: "Cooling oils and talc sell more in long, hot summers" },
      { key: "balrampur", severity: 1, effect: "tailwind", why: "Short crops lift sugar realisations" },
    ],
  },
  {
    id: "quick-commerce-third",
    title: "Quick commerce takes a third of metro sales",
    blurb: "10-minute apps keep doubling and distributors in big cities shrink",
    story:
      "Online shopping, led by quick commerce, was already about a fifth of FMCG sales in the top eight metros by mid-2026 (NIQ), and 60-75% of online sales at several majors. If it reaches a third of metro sales, brands sell more premium and larger packs through apps, but pay more in trade margins and ads, and their metro distributors lose volume and quit - the federation of distributors has already gone to the Competition Commission. Supermarket chains lose top-up baskets. Brands built online, and packaging makers supplying app-specific packs, gain.",
    effect: "tailwind",
    impacts: [
      S("personal_care", 2, "Premium beauty and grooming sell well on apps"),
      S("foods", 1, "Premium and impulse packs gain; trade spend rises"),
      S("majors", 1, "Premium mix rises but trade margins and channel conflict cost more"),
      S("distribution", 3, "Metro distributors and supermarkets lose top-up baskets", "headwind"),
    ],
    stocks: [
      { key: "honasa", severity: 2, why: "Online-born brands win on the apps" },
      { key: "tataconsum", severity: 1, why: "E-commerce and quick commerce already 24% of domestic sales" },
      { key: "dmart", severity: 2, effect: "headwind", why: "Top-up grocery shifts from supermarkets to apps" },
    ],
  },
  {
    id: "ethanol-reset",
    title: "Ethanol prices revised and diversion restored",
    blurb: "The Centre raises ethanol prices and lets mills divert juice and B-heavy molasses again",
    story:
      "For the 2026-27 ethanol year, sugar-based ethanol was limited to C-heavy molasses and administered prices have not changed since 2022-23, while the cane FRP rose about 16% over the same years (distillers' association). Crisil expects rated mills' margins to fall to about 6% in FY27. If the Centre raises ethanol prices and restores juice and B-heavy diversion, idle distilleries fill, less sugar reaches the market and mills' earnings recover. Food and drink makers pay somewhat more for sugar as supply tightens.",
    effect: "tailwind",
    impacts: [
      S("sugar", 3, "Distilleries run full on juice and B-heavy molasses"),
      S("foods", 1, "Tighter sugar supply raises a key input", "headwind"),
      S("beverages", 1, "Sugar costs more for soft drinks", "headwind"),
    ],
    stocks: [
      { key: "balrampur", severity: 3, why: "Large distillery capacity idled by the curbs" },
      { key: "triveni", severity: 2, why: "Cane and grain distilleries" },
      { key: "dhampur", severity: 2, why: "Distillery-heavy mix in western Uttar Pradesh" },
    ],
  },
];

export const FMCG_DOCS: ResearchLink[] = [
  { title: "Hindustan Unilever Q2 FY27 results: sales growth hits 14-quarter high, margins shrink", source: "Goodreturns (28 Oct 2026)", url: "https://www.goodreturns.in/news/hul-q2fy27-results-sales-growth-hits-14-quarter-high-margins-shrink-dividend-announced-1543541.html" },
  { title: "Government reduces edible oil import duty: crude palm and soybean oil cut to 5%", source: "Angel One (24 Sep 2026)", url: "https://www.angelone.in/news/market-updates/government-reduces-edible-oil-import-duty-crude-palm-and-soybean-oil-rate-cut-to-5" },
  { title: "Ethanol production curbs, higher cane costs to weigh on sugar mills' profitability: Crisil Ratings", source: "KNN India (9 Nov 2026)", url: "https://knnindia.co.in/news/newsdetails/sectors/agri-food/ethanol-production-curbs-higher-cane-costs-to-weigh-on-sugar-mills-profitability-crisil-ratings" },
  { title: "ITC Q2 FY27 result: net profit drops 20% as the cigarette tax bites", source: "Upstox (2 Nov 2026)", url: "https://upstox.com/news/market-news/earnings/itc-q2-fy-27-result-net-profit-drops-20-yo-y-cigarette-business-sees-growth-sequentially/article-202841/" },
];
