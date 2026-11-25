import type { SectorReport } from "./types";

export const consumerbrands: SectorReport = {
  slug: "consumerbrands",
  title: "India Retail & Consumer Brands",
  subtitle: "Appliances, clothes, shoes, jewellery, store chains, restaurants, liquor and cinemas - where households spend after essentials",
  asOf: "Nov 2026",

  stance: {
    label: "Positive on chains and premium brands, selective elsewhere",
    tone: "pos",
    line: "Lower GST on ACs and mass clothing, a hot summer and the 2026 trade deals helped volumes; gold duty, state excise and slower same-store growth decide who turns that into profit.",
  },
  keyStats: [
    { label: "Box office, 2025 (Ormax)", value: "₹13,395 Cr", sub: "record; average ticket ₹161, +20%, footfalls -6%" },
    { label: "Gold demand, Q3 2026 (WGC)", value: "162.5 t", sub: "-29% YoY; jewellery ~100 t, +33% QoQ" },
    { label: "Gold import duty", value: "15%", sub: "from 6% on 13 May 2026 (customs notification)" },
    { label: "Scotch duty under UK FTA", value: "75%", sub: "from 150% on 15 Jul 2026; 40% in ten years" },
  ],
  thesis: [
    {
      title: "Store growth is the engine",
      body: "Chains grow by opening stores in tier-2 to tier-4 towns and lifting same-store sales: Zudio passed 1,000 stores, Vishal Mega Mart runs 844 in 582 cities, Domino's added 88 in a quarter. Same-store growth slowed in Q2 FY27 partly because Diwali moved to November.",
    },
    {
      title: "Prices pass through, margins don't always",
      body: "Gold, cotton, copper and excise flow into shelf prices within weeks. Brands with pricing power (Tanishq, Jockey, premium whisky, premium beer) keep margin; plain-gold regional jewellers, mass whisky and value footwear absorb more of the shock.",
    },
    {
      title: "Policy reshapes every aisle",
      body: "GST 2.0 cut ACs to 18% and garments and shoes up to ₹2,500 to 5%; the gold duty rose to 15%; states set liquor excise; the UK FTA and a US duty far below 2025's (now 10%) reopened textile exports; BIS orders are moving compressor and footwear making into India.",
    },
  ],

  developments: [
    {
      date: "Nov 2026",
      title: "CCI clears the Devyani-Sapphire merger",
      body: "The Competition Commission approved the merger of Sapphire Foods into Devyani International (177 Devyani shares per 100 Sapphire), creating one KFC and Pizza Hut operator with nearly 3,000 stores.",
      impact: "pos",
      tag: "QSR",
    },
    {
      date: "Nov 2026",
      title: "Festive gold buying recovers as prices ease",
      body: "WGC: Dhanteras and Diwali demand was healthy, value sales up 15-25% at retailers with flat to slightly higher volumes; old-gold exchange made up 40-60% of sales; gold fell 6.3% in October.",
      impact: "pos",
      tag: "Jewellery",
    },
    {
      date: "Oct-Nov 2026",
      title: "Q2 FY27: Diwali timing softens store sales",
      body: "Diwali moved to November, so Vishal Mega Mart reported 5.4% same-store growth (about 9% adjusted) and ABLBL 5.3% like-for-like; Westlife (10.1%) and Domino's India (4.1%) improved.",
      impact: "neutral",
      tag: "Results",
    },
    {
      date: "Jul 2026",
      title: "US duty on Indian goods settles at 10%",
      body: "The Feb 2026 interim framework cut the US tariff on Indian goods from 25% to 18%, but the US Supreme Court struck down those tariffs that month, and a temporary 10% stopgap surcharge lapsed on 24 Jul 2026. Since then a 10% US duty under a trade-investigation law (Section 301), with no end date, applies on top of normal duties to about 55% of India's US exports (India's Commerce Ministry), and textiles won no exemption. Still far below 2025's 50%, it has kept export orders open; a full trade deal is unsigned.",
      impact: "neutral",
      tag: "Trade",
    },
    {
      date: "Jul 2026",
      title: "India-UK FTA comes into force",
      body: "From 15 Jul 2026 Scotch duty fell from 150% to 75% (40% over ten years), while UK duties of about 12% on Indian textiles and up to 16% on leather and footwear went to zero.",
      impact: "pos",
      tag: "Trade",
    },
    {
      date: "May 2026",
      title: "Gold import duty raised to 15%",
      body: "Customs notifications of 12 May 2026 raised the duty on gold from 6% to 15% to curb imports; jewellers holding stock booked one-time gains, while CRISIL warned of decade-low volumes for jewellery retailers.",
      impact: "neutral",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "This chain covers what Indian households buy once essentials are paid for: room ACs, fridges and fans; clothes, shoes and jewellery; meals at Domino's, KFC and McDonald's; whisky and beer; and cinema tickets. Most of it is still sold by unorganised shops and family jewellers, so listed brands and chains grow by taking share as well as with incomes.",
      "Store chains sit at the centre: Zudio, Westside, Vishal Mega Mart, Pantaloons and Reliance's Trends buy own-label goods from garment makers and sell at fixed low prices in small towns. Behind them sit apparel and footwear brands, spinning mills and garment exporters, and gold jewellers; around them, QSR franchisees, liquor makers selling state by state, and multiplexes.",
      "2026 brought big policy moves: GST 2.0 (Sep 2025) lowered prices of ACs and mass clothing and footwear, the gold duty went to 15% in May, the UK FTA came into force in July and US duties on most Indian consumer goods fell to 10%. Box-office takings hit a record in 2025 on higher ticket prices even as footfalls fell.",
    ],
    chart: {
      title: "India gross box office, calendar years",
      unit: "₹ crore",
      source: "Ormax Media annual box-office reports (2022-2025)",
      points: [
        { label: "2022", value: 10637 },
        { label: "2023", value: 12226 },
        { label: "2024", value: 11833 },
        { label: "2025", value: 13395 },
      ],
    },
    snapshot: [
      { label: "Room-AC volumes, Q1 FY27 (ICRA est.)", value: "about +15% YoY", tone: "pos" },
      { label: "GST on room ACs", value: "18% (from 28%, 22 Sep 2025)", tone: "pos" },
      { label: "Box office, Jan-Jun 2026 (Ormax)", value: "₹6,398 Cr, +10%", tone: "pos" },
      { label: "Gold demand outlook, 2026 (WGC)", value: "about 650 t, six-year low", tone: "neg" },
      { label: "Domino's India like-for-like, Q2 FY27", value: "+4.1%", tone: "neutral" },
      { label: "Vishal Mega Mart stores, 30 Sep 2026", value: "844 in 582 cities", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Yarn, fabric & garment makers", zoneIds: ["textile_makers", "home_living"], margin: "Swings with the cotton-yarn spread", moat: "low", note: "Integrated mills earn on cheap cotton stock and export access; order books follow US and UK tariffs." },
    { stage: "Appliance makers", zoneIds: ["large_appliances", "small_appliances"], margin: "8-12% EBITDA; seasonal", moat: "medium", note: "Brands, service networks and local compressor and motor supply; summer heat sets the year." },
    { stage: "Brands: apparel, footwear, jewellery", zoneIds: ["apparel_brands", "footwear", "jewellery"], margin: "Mid-teens EBITDA at leaders; jewellers 6-12%", moat: "high", note: "Trust (hallmarking, buy-back) and brand premium; licensed brands pay royalties." },
    { stage: "Store chains & restaurants", zoneIds: ["retail_chains", "qsr"], margin: "Store-level returns drive value", moat: "medium", note: "Same-store growth plus openings; own labels and own apps protect margin." },
    { stage: "Drinks & leisure", zoneIds: ["alcobev", "cinemas"], margin: "High on premium spirits and cinema food", moat: "high", note: "State licences and route-to-market for liquor; content and food spend for cinemas." },
  ],

  drivers: [
    { title: "Lower GST on mass goods", metric: "ACs 18%; garments and shoes ≤₹2,500 at 5%", body: "GST 2.0 (22 Sep 2025) cut the tax on ACs, dishwashers and everyday clothing and footwear, while pieces above ₹2,500 rose to 18%." },
    { title: "Store openings in small towns", metric: "Zudio 1,000+; Vishal 844 stores", body: "Value chains, jewellers' franchise showrooms and QSR franchisees open hundreds of stores a year in tier-2 to tier-4 towns." },
    { title: "Premiumisation", metric: "Radico prestige volumes +36% (Q2 FY27)", body: "Buyers trade up to premium whisky and beer, BLDC fans, sneakers, studded jewellery and recliner cinema seats." },
    { title: "Trade deals", metric: "UK duty-free textiles since 15 Jul 2026", body: "The UK FTA and lower US tariffs reopen orders for towels, sheets and garments; Scotch gets cheaper at home." },
  ],
  mix: {
    title: "What India's gold buyers bought, Q3 2026 (tonnes, % of total)",
    source: "World Gold Council, Gold Demand Trends India Focus Q3 2026 (3 Nov 2026)",
    slices: [
      { label: "Jewellery", value: 61.5 },
      { label: "Bars, coins and other investment", value: 38.5 },
    ],
  },

  pestle: {
    political: [
      { point: "GST 2.0 lowered tax on ACs and on clothing and footwear up to ₹2,500 from 22 Sep 2025.", impact: "pos" },
      { point: "States raise liquor excise to fund budgets (Maharashtra, Karnataka in 2025).", impact: "neg" },
    ],
    economic: [
      { point: "Gold import duty raised to 15% in May 2026; high prices cut grams bought.", impact: "neg" },
      { point: "Lower cotton bought earlier lifted spinners' Q2 FY27 margins; the gain fades as stocks are replaced.", impact: "neutral" },
    ],
    social: [
      { point: "Organised value fashion and QSR spread to tier-2 to tier-4 towns.", impact: "pos" },
      { point: "Fewer cinema visits but higher ticket and food spend per visit (Ormax 2025).", impact: "neutral" },
    ],
    technological: [
      { point: "Own apps carry more QSR delivery and fashion sales (ABLBL own e-commerce +70% in Q2 FY27).", impact: "pos" },
      { point: "BLDC fans and inverter ACs replace older models under BEE energy labels.", impact: "pos" },
    ],
    legal: [
      { point: "Mandatory six-digit HUID hallmarking favours organised jewellers.", impact: "pos" },
      { point: "BIS order allows only capped compressor imports until Mar 2027.", impact: "neutral" },
    ],
    environmental: [
      { point: "Hotter summers lift cooling-appliance demand.", impact: "pos" },
      { point: "Floods and heavy rain disrupt plants and park footfalls (Welspun's Vapi in Q2 FY27).", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "trent", tier: "core", why: "Zudio and Westside: the fastest store opener in fashion, with own labels." },
    { key: "titan", tier: "core", why: "Tanishq and CaratLane take share from family jewellers whatever the gold price." },
    { key: "vmm", tier: "core", why: "Value retail in 582 towns with own brands at about 72% of sales." },
    { key: "jubilant", tier: "core", why: "Domino's own-app delivery network and recovering like-for-like sales." },
    { key: "unitedspirits", tier: "direct", why: "Prestige spirits and imported Scotch gain from premiumisation and the UK FTA." },
    { key: "radico", tier: "direct", why: "Fastest growth in prestige volumes, backed by its own distilleries." },
    { key: "kalyan", tier: "direct", why: "Franchise-led showroom growth in a fragmented jewellery market." },
    { key: "lgeindia", tier: "direct", why: "Appliance leader localising compressors at Sri City." },
    { key: "pageind", tier: "indirect", why: "Jockey's pricing power in innerwear, with volumes still to recover." },
    { key: "welspunliv", tier: "indirect", why: "Towels and sheets for US and UK retailers as trade terms improve." },
  ],

  companyNews: [
    { key: "titan", date: "Nov 2026", development: "Q2 FY27 income rose 25% to ₹20,533 Cr; jewellery grew about 21%, watches about 30%; PBT included ₹536 Cr of customs-duty gains (adjusted PBT +18%).", impact: "Shows the duty rise padded jeweller profits while buyer growth stayed mid-single digit.", tone: "pos" },
    { key: "kalyan", date: "Nov 2026", development: "Q2 FY27 revenue rose 31% to ₹10,323 Cr and profit to ₹427 Cr including a ₹73 Cr exceptional gain; kept a 25% FY27 growth target.", impact: "National chains keep taking share even in a low-volume gold year.", tone: "pos" },
    { key: "trent", date: "Nov 2026", development: "Q2 FY27 standalone revenue rose 22.5% to ₹5,788 Cr; Zudio opened its 1,000th store; operating EBIT margin 11.6%.", impact: "Value fashion keeps outgrowing department stores and brands.", tone: "pos" },
    { key: "unitedspirits", date: "Oct 2026", development: "Q2 FY27 standalone sales rose 2.8%: prestige-and-above up about 6%, mass brands down about 23% on Maharashtra and Karnataka policy; profit down about 2%.", impact: "State excise moves can wipe out a year of mass-whisky growth.", tone: "neg" },
    { key: "jubilant", date: "Oct 2026", development: "Domino's India like-for-like rose 4.1% with delivery up 11.3%; 88 stores added to 2,601; revenue up 11.9% to ₹2,609 Cr.", impact: "QSR demand is recovering, led by delivery through own apps.", tone: "pos" },
    { key: "pvrinox", date: "Oct 2026", development: "Q2 FY27 average ticket price and food spend per head each rose about 14%, footfalls about 4% (reported).", impact: "Cinemas earn more per visitor even as visits grow slowly.", tone: "pos" },
  ],

  risks: [
    { risk: "Gold stays high or the duty rises again, cutting grams sold", mitigant: "Lighter designs, gold-exchange schemes and franchise growth", severity: "high" },
    { risk: "State excise hikes and price freezes on liquor", mitigant: "Premium mix and spread across many states", severity: "high" },
    { risk: "Same-store growth slows as chains open faster than demand", mitigant: "Openings in under-served towns; own-label margins", severity: "medium" },
    { risk: "The US raises its 10% duty or cotton spikes for textile makers", mitigant: "UK FTA access and integrated cotton-to-garment chains", severity: "medium" },
  ],
  outlook: {
    bull: "Gold eases, a hot summer and normal monsoon arrive, and the US deal is finalised: jewellery volumes recover, ACs sell through, textile exports grow double digits and chains' same-store growth returns to high single digits.",
    base: "Revenue grows low-to-mid teens on store openings and premium mix; same-store growth stays mid single digit; liquor and jewellery margins swing with excise and gold.",
    bear: "Gold spikes, more states raise excise, the summer is mild and US tariffs rise again: jewellery and mass spirits volumes fall, appliance stock piles up and value chains discount.",
  },
  reading: [
    { title: "Gold Demand Trends: India Focus Q3 2026", source: "World Gold Council", url: "https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-india-focus-q3-2026", year: "2026" },
    { title: "The Ormax Box Office Report 2025", source: "Ormax Media", url: "https://www.ormaxmedia.com/stories/the-ormax-box-office-report-2025.html", year: "2026" },
    { title: "The India Box Office Report: Jan-Jun 2026", source: "Ormax Media", url: "https://www.ormaxmedia.com/stories/the-india-box-office-report-jan-jun-2026.html", year: "2026" },
    { title: "Here's breaking down the Section 301 tariffs", source: "Business Today", url: "https://www.businesstoday.in/india/story/heres-breaking-down-the-section-301-tariffs-545110-2026-07-24", year: "2026" },
    { title: "UK-India FTA goes live today: what gets cheaper and which Indian sectors gain", source: "Business Today", url: "https://www.businesstoday.in/latest/economy/story/uk-india-fta-goes-live-today-from-whisky-to-premium-cars-what-gets-cheaper-and-which-indian-sectors-gain-542803-2026-07-15", year: "2026" },
    { title: "GST Council 56th meeting: rate changes", source: "Press Information Bureau / GST Council", url: "https://gstcouncil.gov.in/sites/default/files/2025-09/press_release_press_information_bureau.pdf", year: "2025" },
  ],
};
