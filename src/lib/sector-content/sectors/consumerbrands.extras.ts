// Retail & Consumer Brands: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.consumerbrands) and ../docs.ts (SECTOR_DOCS.consumerbrands).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const CONSUMERBRANDS_SCENARIOS: Scenario[] = [
  {
    id: "gold-eases-weddings",
    title: "Gold eases into the wedding season",
    blurb: "Lower gold prices bring buyers back for weight, not just value",
    story:
      "Gold fell 6.3% in October 2026 and further into November, and domestic discounts narrowed to about US$5/oz as festive buying picked up (WGC, 17 Nov 2026). If prices stay lower through the winter wedding season, buyers who traded down to lighter pieces buy more grams again, and chains with franchise showrooms and gold-saving schemes (Titan, Kalyan, Senco) add volume on top of value. The flip side: jewellers that booked inventory gains from the May 2026 duty rise to 15% see those gains shrink, and regional plain-gold sellers earn thin making charges either way.",
    effect: "tailwind",
    impacts: [
      S("jewellery", 3, "Grams per buyer rise; studded and wedding sets recover"),
      S("retail_chains", 1, "Wedding shopping lifts ethnic wear and footwear in the same trips"),
      S("apparel_brands", 1, "Ethnic and wedding labels (Tasva, Raymond suiting) sell more"),
    ],
  },
  {
    id: "state-excise-squeeze",
    title: "Another big state raises liquor excise",
    blurb: "A Maharashtra-style duty hike or price freeze in a large state",
    story:
      "Maharashtra raised IMFL excise from 3x to 4.5x of declared cost in Jun 2025 and created a cheaper state-made category; United Spirits' mass brands fell about 23% in Q2 FY27 as Maharashtra and Karnataka policy bit. If another large state (Karnataka, Tamil Nadu, Andhra Pradesh) raises duty or freezes prices, mass whisky and brandy volumes fall first while prestige brands hold up better. Beer and wine are often spared, and grain-spirit suppliers lose volume from brand owners.",
    effect: "headwind",
    impacts: [
      S("alcobev", 3, "State excise sets shelf prices; mass whisky is most price-sensitive"),
      S("qsr", 1, "Bar-and-dining spend falls in the affected state"),
      S("cinemas", 1, "Leisure budgets tighten in the affected state"),
    ],
  },
  {
    id: "hot-summer-cooling",
    title: "Another hot summer meets local compressors",
    blurb: "Heatwaves lift AC, cooler and fan sales as compressor capacity comes onshore",
    story:
      "A hot 2026 summer lifted room-AC volumes about 15% in Q1 FY27 (ICRA) on top of the GST cut to 18%. If summer 2027 is hot again, AC, cooler and fan makers sell through their stock without discounts. LG's Sri City compressor plant (from Q3 FY27) and the PLI scheme reduce dependence on imported compressors before the BIS import allowance ends in Mar 2027; brands that still import heavily face supply limits at the peak.",
    effect: "tailwind",
    impacts: [
      S("large_appliances", 3, "Room ACs and refrigerators sell most in a hot summer"),
      S("small_appliances", 2, "Fans and air coolers sell with the heat"),
      S("retail_chains", 1, "Electronics chains (Reliance Digital) and hypermarkets sell more cooling"),
      S("cinemas", 1, "Air-conditioned malls and cinemas draw more daytime visitors"),
    ],
  },
  {
    id: "trade-deals-textiles",
    title: "US and UK deals reopen textile orders",
    blurb: "Lower US tariffs and duty-free UK access bring garment and towel orders back to India",
    story:
      "US duties on Indian textiles and most other goods fell from 2025's 50% to 18% under the Feb 2026 interim framework and, after the US Supreme Court struck down those tariffs and a temporary 10% surcharge lapsed, to a 10% US duty under a trade-investigation law (Section 301) from 24 Jul 2026, which covers about 55% of India's US exports (textiles got no exemption), and the India-UK FTA (15 Jul 2026) removed UK duties of about 12% on textiles and up to 16% on leather shoes. If the US rate is locked in a final deal, global retailers move more towel, sheet and garment programmes from China and Bangladesh to India's integrated mills. The same FTA halves the duty on Scotch, helping Diageo's imported brands and making bottled Scotch a tougher rival for Indian premium whisky.",
    effect: "tailwind",
    impacts: [
      S("textile_makers", 3, "Garment exporters and spinners gain US and UK orders"),
      S("home_living", 3, "Towels and sheets are mostly sold to US and UK retailers"),
      S("footwear", 1, "Leather shoes enter the UK duty-free"),
      S("alcobev", 1, "Cheaper bottled Scotch competes with Indian premium whisky", "headwind"),
    ],
  },
];

export const CONSUMERBRANDS_DOCS: ResearchLink[] = [
  { title: "Gold Demand Trends: India Focus Q3 2026", source: "World Gold Council (3 Nov 2026)", url: "https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-india-focus-q3-2026" },
  { title: "India gold market update: Gold demand gets festive boost", source: "World Gold Council (17 Nov 2026)", url: "https://www.gold.org/goldhub/gold-focus/2026/11/india-gold-market-update-gold-demand-gets-festive-boost" },
  { title: "The India Box Office Report: Jan-Jun 2026", source: "Ormax Media (17 Jul 2026)", url: "https://www.ormaxmedia.com/stories/the-india-box-office-report-jan-jun-2026.html" },
  { title: "UK-India FTA goes live today: From whisky to premium cars, what gets cheaper and which Indian sectors gain", source: "Business Today (15 Jul 2026)", url: "https://www.businesstoday.in/latest/economy/story/uk-india-fta-goes-live-today-from-whisky-to-premium-cars-what-gets-cheaper-and-which-indian-sectors-gain-542803-2026-07-15" },
  { title: "Here's breaking down the Section 301 tariffs", source: "Business Today (24 Jul 2026)", url: "https://www.businesstoday.in/india/story/heres-breaking-down-the-section-301-tariffs-545110-2026-07-24" },
];
