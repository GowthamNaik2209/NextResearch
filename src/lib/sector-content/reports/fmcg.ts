import type { SectorReport } from "./types";

export const fmcg: SectorReport = {
  slug: "fmcg",
  title: "India FMCG",
  subtitle: "Who makes India's everyday packs and who earns on them - from edible oil, sugar and milk through food, drink, tobacco and home-care brands to the packs, distributors and apps that reach the shopper",
  asOf: "Nov 2026",

  stance: {
    label: "Volumes back, margins squeezed",
    tone: "neutral",
    line: "Sep-quarter volumes rebounded off the low 2025 GST-switch base, but crude-linked packs, palm oil, tea and milk are costlier, cigarettes carry a new excise and sugar mills lost most ethanol diversion.",
  },
  keyStats: [
    { label: "Online share of FMCG, top 8 metros", value: "about 21%", sub: "Apr-Jun 2026, led by quick commerce (NIQ)" },
    { label: "Crude palm oil basic duty", value: "5%", sub: "cut from 10% on 24 Sep 2026; about 11% with cess" },
    { label: "Cigarette tax from 1 Feb 2026", value: "40% GST + excise", sub: "excise of ₹2,050-8,500 per 1,000 sticks on top" },
    { label: "Sugar output, 2026-27 season", value: "about 29 MT", sub: "from 31.1 MT; 1 MT of imports allowed for Aug-Dec 2026 (Crisil)" },
  ],
  thesis: [
    {
      title: "Volumes are back, on a low base",
      body: "NIQ found FMCG volumes down 2% and rural volumes down 5% in Apr-Jun 2026 as crude and fertiliser costs rose. Then the Sep 2026 quarter, against a base hit by the Sep 2025 GST switch, brought the fastest growth in years: HUL's underlying volume grew 7% and sales 15%, Marico's India volume 10%, Britannia's about 13%, and Varun's India cases 22.5%.",
    },
    {
      title: "Costs come from crude, palm, tea and milk",
      body: "With the Gulf shut since Mar 2026, crude-linked packaging (PET, laminates) and LAB for detergents cost more, palm oil is firm, tea needed 8-10% price rises and milk rose ₹2-4 a litre in Nov 2026. Brands selling ₹5-10 packs pass costs through grammage and calibrated price rises with a lag, so EBITDA margins narrowed at HUL, Dabur, Colgate and Britannia even as sales grew. Marico, buying copra far below its peak, was the exception.",
    },
    {
      title: "Policy runs the farm and tobacco ends",
      body: "Edible-oil refiners live on customs duty (cut again on 24 Sep 2026), sugar mills on cane, quota and ethanol prices (diversion curbed for 2026-27), and cigarette makers on excise (40% GST plus a new excise from 1 Feb 2026, which cut ITC's cigarette net revenue 21% in the Sep 2026 quarter). These layers earn on policy calls more than on brands.",
    },
  ],

  developments: [
    {
      date: "Nov 2026",
      title: "Amul and Mother Dairy raise milk prices again",
      body: "Pouch-milk prices rose by ₹2-4 a litre from 12 Nov 2026, the second rise of the year after ₹2 on 14 May, citing farmer procurement, cattle feed and fuel costs.",
      impact: "neg",
      tag: "Dairy",
    },
    {
      date: "Nov 2026",
      title: "Crisil: ethanol curbs to cut sugar mills' margins",
      body: "On 9 Nov 2026 Crisil said sugar-based ethanol for the 2026-27 supply year is limited to C-heavy molasses, output will fall to about 29 MT, and rated mills' operating margins will drop 140-160 bps to about 6% in FY27. The cane FRP rose about 3% to ₹365 a quintal.",
      impact: "neg",
      tag: "Sugar",
    },
    {
      date: "Oct-Nov 2026",
      title: "Sep-quarter results: volumes up, margins down",
      body: "HUL (underlying volume 7%), Marico (India volume 10%), Godrej Consumer (8%), Dabur (5.5%) and Honasa (31%) grew volumes faster than in years, but crude-linked inputs, palm oil and tea narrowed margins at HUL, Dabur, Colgate and Varun Beverages.",
      impact: "pos",
      tag: "Results",
    },
    {
      date: "Sep 2026",
      title: "NIQ: Apr-Jun volumes fell 2%, rural 5%",
      body: "NIQ's report (28 Sep 2026) showed 68% of categories losing volume in Apr-Jun 2026, led by detergents, refined oils and toilet soaps, while modern trade volumes rose 17.5% and e-commerce 34.8%.",
      impact: "neg",
      tag: "Demand",
    },
    {
      date: "Sep 2026",
      title: "Edible-oil import duty cut before the festive season",
      body: "From 24 Sep 2026 the basic duty on crude palm and soybean oil fell to 5% from 10% (about 11% effective), crude sunflower oil to nil and refined oils to 27.5%, after vegetable oil prices rose nearly 20% in a year.",
      impact: "neutral",
      tag: "Duties",
    },
    {
      date: "Feb 2026",
      title: "Cigarettes move to 40% GST plus new excise",
      body: "From 1 Feb 2026 the GST compensation cess ended and cigarettes paid 40% GST plus a central excise of ₹2,050-8,500 per 1,000 sticks under the Central Excise (Amendment) Act, 2025; makers raised pack prices in steps through 2026.",
      impact: "neg",
      tag: "Tobacco",
    },
  ],

  overview: {
    headline: "Volumes rebounded in the Sep 2026 quarter on a low GST-switch base",
    narrative: [
      "India's FMCG chain has four layers: farm and commodity makers of edible oil, rice, sugar, milk and feed; food, drink and tobacco brands; the home and personal care majors that sell soap, shampoo, toothpaste and detergent; and the ingredient makers, packaging converters, distributors, supermarkets and quick-commerce apps that make and move the pack.",
      "Most volume still moves in ₹1-10 sachets and small packs through distributors to India's kiranas, so brands absorb cost changes by changing grams or taking small price rises. The GST cut to 5% on most packs (22 Sep 2025) disrupted the Sep 2025 quarter and set up the 2026 rebound.",
      "Two forces shape 2026: costs from the Gulf closure (crude-linked packs, detergent chemicals, palm oil) and the shift of metro shopping to quick commerce, which now sells a large share of brands' online volume and is squeezing distributors.",
    ],
    chart: {
      title: "Volume growth in the Sep 2026 quarter, by company (underlying or reported volume)",
      unit: "% year on year",
      source: "Company results and coverage, Oct-Nov 2026 (Honasa, Varun Beverages India, Britannia, Marico India, Godrej Consumer, HUL, Dabur India)",
      kind: "categories",
      points: [
        { label: "Honasa", value: 31.3 },
        { label: "Varun Beverages (India)", value: 22.5 },
        { label: "Britannia", value: 13 },
        { label: "Marico (India)", value: 10 },
        { label: "Godrej Consumer", value: 8 },
        { label: "Hindustan Unilever", value: 7 },
        { label: "Dabur (India)", value: 5.5 },
      ],
    },
    snapshot: [
      { label: "FMCG volume, Apr-Jun 2026 (NIQ)", value: "down 2%", tone: "neg" },
      { label: "Rural FMCG volume, Apr-Jun 2026 (NIQ)", value: "down 5%", tone: "neg" },
      { label: "Quick commerce share of online sales at Dabur, Britannia, Tata Consumer (early 2026)", value: "70-75%", tone: "pos" },
      { label: "India's edible oil imported", value: "nearly two-thirds", tone: "neutral" },
      { label: "2026 monsoon rainfall (IMD)", value: "12.6% below normal", tone: "neg" },
      { label: "Sugar minimum selling price", value: "₹31 a kg, unchanged since 2019", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Farm & commodities", zoneIds: ["staples", "sugar", "dairy_protein"], margin: "Thin spreads over crops, imports and set prices", moat: "low", note: "Duties, cane and milk prices and ethanol policy decide returns; brands in atta, rice and dairy earn more than bulk." },
    { stage: "Ingredients & packs", zoneIds: ["ingredients", "packaging"], margin: "Conversion margins; costs passed on with a lag", moat: "medium", note: "Fragrance formulas and tube or laminate approvals lock suppliers in; resin swings hit for a quarter or two." },
    { stage: "Food, drink & tobacco brands", zoneIds: ["foods", "beverages", "tobacco"], margin: "High; cigarettes the highest", moat: "high", note: "₹5-10 price-point franchises and rural reach; cigarette margins hinge on excise." },
    { stage: "Home & personal care", zoneIds: ["majors", "personal_care", "home_care"], margin: "Highest returns on capital in the chain", moat: "high", note: "Brands, distributor networks and sachet pricing; detergents most exposed to crude." },
    { stage: "Route to market", zoneIds: ["distribution"], margin: "Low single digits for distributors; apps earn margin plus ads", moat: "low", note: "Quick commerce and supermarkets take metro volume from distributors and kiranas." },
  ],

  drivers: [
    { title: "Rural recovery", metric: "Rural volume down 5% in Apr-Jun 2026 (NIQ)", body: "A weak 2026 monsoon and costly fertiliser hit farm incomes; the Sep-quarter rebound came on a low GST-switch base, so the 2027 monsoon decides whether it lasts." },
    { title: "Input costs", metric: "Gulf shut since Mar 2026", body: "Crude-linked packaging and detergent chemicals, palm oil, tea and milk rose; brands pass costs through grammage and calibrated price rises with a lag." },
    { title: "Quick commerce", metric: "About 21% of FMCG sales online in the top 8 metros", body: "Apps sell more premium packs and give brands data, but squeeze distributors and add trade spend; tier-2 cities are next." },
    { title: "Tax and duties", metric: "GST 5% on most packs since Sep 2025", body: "The GST cut lowered pack prices; the 40% rate on sugary drinks, new cigarette excise and edible-oil duty cuts move margins in their categories." },
  ],
  mix: {
    title: "Indian FMCG sales by segment",
    source: "NIQ, Apr-Jun 2026 (via Daily Pioneer, 28 Sep 2026)",
    slices: [
      { label: "Food", value: 64 },
      { label: "Home & personal care", value: 32 },
      { label: "Over-the-counter health", value: 5 },
    ],
  },

  pestle: {
    political: [
      { point: "GST on most food and personal-care packs fell to 5% in Sep 2025, lowering shelf prices.", impact: "pos" },
      { point: "Sugar, edible oil and ethanol remain policy-set: quotas, duties and administered prices change with little notice.", impact: "neutral" },
    ],
    economic: [
      { point: "Volumes rebounded in the Sep 2026 quarter on a low base, with urban premium packs growing fastest.", impact: "pos" },
      { point: "The Gulf closure keeps crude-linked packs, LAB and palm oil costly, narrowing margins.", impact: "neg" },
    ],
    social: [
      { point: "Metro shoppers move top-up buying to 10-minute apps and premium formats.", impact: "pos" },
      { point: "Rural shoppers trade down to smaller packs and loose staples when farm incomes fall.", impact: "neg" },
    ],
    technological: [
      { point: "Retailer-ordering apps and B2B platforms let brands reach kiranas directly with sell-out data.", impact: "pos" },
      { point: "App pricing undercuts distributors, forcing changes to the route-to-market model.", impact: "neutral" },
    ],
    legal: [
      { point: "Cigarettes pay 40% GST plus new excise since Feb 2026, encouraging smuggled brands.", impact: "neg" },
      { point: "Distributors have taken quick-commerce discounting to the Competition Commission.", impact: "neutral" },
    ],
    environmental: [
      { point: "Extended producer responsibility rules push recyclable laminates and recycled plastic in packs.", impact: "neutral" },
      { point: "A weak monsoon raises fodder, cane and milk costs and cuts rural demand.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "hindunilvr", tier: "core", why: "Widest kirana reach; volume growth in the Sep 2026 quarter was the fastest in 14 quarters." },
    { key: "britannia", tier: "core", why: "Leader in ₹5-10 biscuit packs with strong rural volume recovery." },
    { key: "marico", tier: "core", why: "Cheap copra and double-digit India volume growth." },
    { key: "nestleind", tier: "direct", why: "Volume-led growth in Maggi and coffee with the highest returns on capital." },
    { key: "vbl", tier: "direct", why: "Largest bottler; hot, dry weather and rural coolers lift volumes." },
    { key: "tataconsum", tier: "direct", why: "Salt leadership and fast-growing newer brands, with a quarter of domestic sales online." },
    { key: "honasa", tier: "direct", why: "Online-born beauty brands gaining from quick commerce and offline expansion." },
    { key: "hndfds", tier: "indirect", why: "Contract maker that gains when majors outsource capacity." },
    { key: "epl", tier: "indirect", why: "Toothpaste and cosmetic tubes for the majors worldwide." },
    { key: "awl", tier: "indirect", why: "Largest edible-oil seller adding atta, rice and pulses through the same reach." },
  ],

  companyNews: [
    { key: "hindunilvr", date: "Oct 2026", development: "Q2 FY27 underlying sales grew 15% and volume 7%, the fastest in 14 quarters; home care grew 22% while EBITDA margin narrowed about 140 bps on elevated input costs.", impact: "Majors' volumes are recovering, but costs are eating part of the gain.", tone: "pos" },
    { key: "itc", date: "Nov 2026", development: "Q2 FY27 standalone profit fell about 20%; cigarette gross revenue rose 78% but net revenue fell 21% after the new excise, while several food categories grew over 20%.", impact: "The 2026 tax change reset cigarette margins; foods carry growth.", tone: "neg" },
    { key: "vbl", date: "Oct 2026", development: "Jul-Sep 2026 volume rose 28.7%, with India up 22.5%; revenue rose about 33% but gross margin fell over 300 bps on packaging costs.", impact: "Weather drives volumes; crude-linked PET drives margins.", tone: "neutral" },
    { key: "marico", date: "Nov 2026", development: "Q2 FY27 revenue rose 13% and profit 31%; India volume grew 10% and EBITDA margin widened about 200 bps on copra far below its peak.", impact: "Shows how much a cheap key input lifts an FMCG margin.", tone: "pos" },
    { key: "britannia", date: "Nov 2026", development: "Q2 FY27 sales rose about 16% with volume up about 13% and a 3.5% price rise that covered only part of input inflation; profit rose about 11%.", impact: "₹5-10 food packs are growing again, but palm, wheat, sugar and milk costs cap margins.", tone: "pos" },
    { key: "balrampur", date: "Nov 2026", development: "Q2 FY27 sugar segment profit rose about 166% on higher prices, but distillery revenue fell about 20% with ethanol prices unrevised; its PLA bioplastic plant is due to start.", impact: "Sugar mills earn on sugar while ethanol policy holds distilleries back.", tone: "neutral" },
  ],

  risks: [
    { risk: "The Gulf closure lasts into 2027, keeping crude-linked packs, detergent chemicals and palm oil costly", mitigant: "Grammage cuts, calibrated price rises and duty cuts on edible oil", severity: "high" },
    { risk: "A second weak monsoon in 2027 pushes rural shoppers back to smaller packs and loose staples", mitigant: "Low unit price packs and welfare transfers; urban premium growth", severity: "medium" },
    { risk: "Quick-commerce discounting breaks the distributor model in metros faster than brands can rework it", mitigant: "New distributor terms, app-specific packs and direct-to-kirana ordering apps", severity: "medium" },
    { risk: "Another cigarette excise rise in the Feb 2027 Budget pushes smokers to smuggled brands", mitigant: "Stepped price rises, new variants and enforcement against smuggling", severity: "medium" },
  ],
  outlook: {
    bull: "Crude eases as the Gulf reopens, a normal 2027 monsoon lifts rural incomes and volume growth holds high single digits while margins recover.",
    base: "Volumes grow mid-single digits as the base normalises, calibrated price rises restore margins over FY27-28, and quick commerce keeps gaining metro share.",
    bear: "Costs stay high through 2027, a second weak monsoon hits rural demand, and channel conflict and another tobacco tax rise squeeze margins.",
  },
  reading: [
    { title: "HUL Q2 FY27 results: sales growth hits 14-quarter high, margins shrink", source: "Goodreturns", url: "https://www.goodreturns.in/news/hul-q2fy27-results-sales-growth-hits-14-quarter-high-margins-shrink-dividend-announced-1543541.html", year: "2026" },
    { title: "FMCG growth moderates in June quarter: NielsenIQ", source: "Daily Pioneer", url: "https://dailypioneer.com/news/fmcg-growth-moderates-in-june-quarter-nielseniq", year: "2026" },
    { title: "Government reduces edible oil import duty: crude palm and soybean oil cut to 5%", source: "Angel One", url: "https://www.angelone.in/news/market-updates/government-reduces-edible-oil-import-duty-crude-palm-and-soybean-oil-rate-cut-to-5", year: "2026" },
    { title: "Ethanol production curbs, higher cane costs to weigh on sugar mills' profitability", source: "KNN India (Crisil Ratings)", url: "https://knnindia.co.in/news/newsdetails/sectors/agri-food/ethanol-production-curbs-higher-cane-costs-to-weigh-on-sugar-mills-profitability-crisil-ratings", year: "2026" },
    { title: "ITC Q2 FY27 result: net profit drops 20%", source: "Upstox", url: "https://upstox.com/news/market-news/earnings/itc-q2-fy-27-result-net-profit-drops-20-yo-y-cigarette-business-sees-growth-sequentially/article-202841/", year: "2026" },
    { title: "Quick commerce drives up to 75% of online sales for leading FMCG companies", source: "Angel One", url: "https://www.angelone.in/news/market-updates/quick-commerce-drives-up-to-75-of-online-sales-for-leading-fmcg-companies", year: "2026" },
  ],
};
