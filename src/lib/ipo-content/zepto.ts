import type { IpoReport } from "./types";

// Zepto Ltd (formerly Kiranakart Technologies). Figures from the UDRHP-I dated 8 Jun 2026 (abridged
// prospectus on SEBI) unless a field names another source. Status as reported to mid-Oct 2026.
export const zepto: IpoReport = {
  slug: "zepto",
  name: "Zepto",
  legalName: "Zepto Limited",
  icon: "ZPT",
  sectorLabel: "Quick commerce",
  tagline: "India's #2 quick-commerce app by orders, doubling revenue but still burning cash",
  asOf: "Oct 2026",

  status: {
    stage: "approved",
    label: "SEBI approved · on hold",
    detail:
      "SEBI's observations came in May 2026 and the UDRHP-I was filed on 8 Jun, but on 1 Aug Zepto announced it would list in two to three quarters and raise ~Rs 1,000 Cr pre-IPO instead (first reported on 30 Jul); reports point to a Feb-May 2027 listing, with the approval reportedly valid until Nov 2027. Reports differ on the exact observation date (most trackers say 8 May) and no RHP or price band exists yet.",
  },
  timeline: [
    { date: "Dec 2025", event: "Confidential pre-filing of the draft prospectus with SEBI", done: true },
    { date: "May 2026", event: "SEBI final observations (8 May per IPO trackers)", done: true },
    { date: "8 Jun 2026", event: "UDRHP-I filed: Rs 8,010 Cr fresh issue + OFS of 11.35 crore shares", done: true },
    { date: "1 Aug 2026", event: "IPO deferred; ~Rs 1,000 Cr pre-IPO placement at ~US$4.5bn", done: true },
    { date: "Feb-May 2027", event: "Reported listing window (RHP with updated financials needed first)", done: false },
    { date: "Nov 2027", event: "SEBI approval reportedly lapses if the issue has not opened", done: false },
  ],

  issue: {
    size: "Rs 8,010 Cr fresh + OFS of 11.35 crore shares",
    totalCr: null,
    freshCr: 8010,
    ofsCr: null,
    ofsShares: "11.35 crore shares (113,466,566)",
    priceBand: null,
    lotSize: null,
    faceValue: "Rs 5",
    valuation: "~US$4.5bn (~Rs 42,750 Cr at ~Rs 95/US$, 94.92 on 16 Oct 2026) in the reported Aug 2026 pre-IPO round; down from US$7bn in Oct 2025",
    valuationCr: 42750,
    reservation: "QIB at least 75% · NII up to 15% · Retail up to 10% (Reg 6(2), loss-making issuer)",
    exchanges: "NSE, BSE",
    leadManagers: [
      "Axis Capital",
      "Morgan Stanley India",
      "Goldman Sachs (India) Securities",
      "Motilal Oswal Investment Advisors",
      "HSBC Securities and Capital Markets (India)",
      "JM Financial",
      "IIFL Capital Services",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Growth story, pricing is the test",
    tone: "neutral",
    line: "Orders and revenue doubled in FY26 and losses per order nearly halved, but the business still burned Rs 4,330 Cr of free cash and the private mark has already fallen ~35% from US$7bn.",
  },
  keyStats: [
    { label: "Revenue from operations, FY26", value: "Rs 22,624 Cr", sub: "+104% YoY (UDRHP)" },
    { label: "Restated loss, FY26", value: "Rs 5,905 Cr", sub: "vs Rs 4,700 Cr in FY25" },
    { label: "Orders, FY26", value: "64 crore", sub: "~119.5% CAGR FY24-26" },
    { label: "Dark stores, Mar 2026", value: "1,139", sub: "plus 75 warehouses, all leased" },
  ],
  thesis: [
    {
      title: "The first pure-play quick-commerce listing",
      body: "Blinkit and Instamart sit inside Eternal and Swiggy alongside food delivery. Zepto would be the only listed company whose results are 100% quick commerce, making it the cleanest read on the category's unit economics.",
    },
    {
      title: "Unit economics are improving fast",
      body: "Adjusted EBITDA loss per order fell from Rs 136 in FY25 to Rs 79 in FY26 as orders per store per day rose, and ad income grew to 7.8% of order value. The question is whether this reaches breakeven before cash runs thin.",
    },
    {
      title: "A valuation reset already under way",
      body: "Domestic funds reportedly valued Zepto at US$2.5-3.5bn against the US$7bn private mark; the company chose a ~US$4.5bn pre-IPO round over a cut-price listing. Where the RHP prices it will be the real signal.",
    },
  ],

  business: {
    narrative: [
      "Zepto runs a 10-minute delivery app: users order from third-party Merchant Partners, who fulfil from 1,139 dark stores that Zepto operates, and Delivery Partners carry the last mile. It also sells advertising to brands and runs supply-chain services that buy from brands and sell to wholesalers and retailers.",
      "The model is about density. More orders per store spread rent, staff and rider costs; average daily orders per store rose from 1,325 in FY24 to 1,677 in FY26 (2,140 in the Mar 2026 quarter). Zepto reports a single operating segment, so newer lines such as Zepto Cafe and pharmacy are not broken out.",
    ],
    segments: [
      {
        title: "Quick-commerce marketplace",
        metric: "Rs 24,816 Cr NRV, FY26",
        body: "Groceries, fresh produce and general merchandise from 1,139 dark stores in 66 cities; 64 crore orders and 4.8 crore annual transacting users in FY26.",
      },
      {
        title: "Advertising",
        metric: "Rs 1,636 Cr revenue, FY26",
        body: "Brand ads on the app grew 151% in FY26 to 7.8% of order value (1.1% in FY24), the highest-margin line in the mix.",
      },
      {
        title: "Supply chain & distribution",
        metric: "Within sale of goods",
        body: "Buys from brands and sells to wholesalers and retailers on a non-exclusive basis; this is a big part of reported 'sale of goods' revenue and runs at thin margins.",
      },
      {
        title: "Zepto Cafe & new lines",
        metric: "Not separately disclosed",
        body: "Cafe (hot food and beverages), private labels such as Relish and Daily Good, Zepto Atom data insights and a pharmacy pilot; none is reported on its own.",
      },
    ],
    mix: {
      title: "Revenue from operations, FY26",
      source: "UDRHP-I via Inc42 (sale of goods Rs 17,588 Cr; sale of services Rs 5,022 Cr)",
      slices: [
        { label: "Goods sold, including supply-chain sales", value: 77.8 },
        { label: "Services: commissions, delivery fees and ads", value: 22.2 },
      ],
    },
  },

  industry: {
    narrative: [
      "Quick commerce is the fastest-growing slice of Indian online retail. Redseer's report in the UDRHP sizes it at ~Rs 96,300 Cr (US$11.3bn) in CY2025, up from ~Rs 13,300 Cr in CY2022, and about 13% of online retail GMV; it projects Rs 5.1-7.1 lakh Cr by CY2030.",
      "Three players dominate: by orders in the Mar 2026 quarter Blinkit had ~46%, Zepto ~35% and Instamart ~19%. Flipkart Minutes (1,000+ micro-fulfilment centres) and Amazon Now are now spending to catch up, while the CCI is examining deep-discounting complaints from distributors.",
    ],
    chart: {
      title: "India quick-commerce GMV",
      unit: "Rs lakh Cr",
      source: "Redseer report in the Zepto UDRHP-I (Fig. 17a): CY22 ~Rs 13,300 Cr, CY24 US$4.9bn at Redseer's Rs 85/US$, CY25 ~Rs 96,300 Cr; CY30P is the midpoint of Rs 5.1-7.1 lakh Cr",
      points: [
        { label: "CY22", value: 0.13 },
        { label: "CY24", value: 0.42 },
        { label: "CY25", value: 0.96 },
        { label: "CY30P", value: 6.1, projected: true },
      ],
    },
    snapshot: [
      { label: "Market size, CY2025", value: "~Rs 96,300 Cr (US$11.3bn at Rs 85/US$), Redseer in UDRHP" },
      { label: "Projected size, CY2030", value: "Rs 5.1-7.1 lakh Cr", tone: "pos" },
      { label: "Share of online retail GMV", value: "~13% in CY2025, 26-30% by CY2030" },
      { label: "Order share, Q4 FY26", value: "Blinkit ~46% · Zepto ~35% · Instamart ~19%" },
      { label: "New entrants", value: "Flipkart Minutes (1,000+ centres), Amazon Now", tone: "neg" },
      { label: "Regulatory", value: "CCI inquiry into discounting; distributors oppose QC IPOs", tone: "neg" },
    ],
  },

  financials: {
    source: "Restated consolidated financial information, UDRHP-I (8 Jun 2026); EBITDA is the company's Adjusted EBITDA",
    years: [
      { label: "FY24", revenue: 4455, ebitda: -1125, pat: -1215 },
      { label: "FY25", revenue: 11110, ebitda: -4522, pat: -4700 },
      { label: "FY26", revenue: 22624, ebitda: -5042, pat: -5905 },
    ],
    note: "Adjusted EBITDA adds back ESOP costs but excludes other income; reported EBITDA was -Rs 1,029 Cr, -Rs 4,154 Cr and -Rs 4,746 Cr. Commentators link part of the FY25 revenue jump to a Jan 2025 change in how Zepto books goods sold, so revenue growth is not a clean proxy for order growth. The quarterly loss eased from ~Rs 1,832 Cr in Q4 FY25 to ~Rs 1,539 Cr in Q4 FY26.",
  },

  kpi: {
    title: "Net Receivables Value (order value incl. ads and fees)",
    unit: "Rs Cr",
    source: "UDRHP-I KPIs",
    points: [
      { label: "FY24", value: 5232 },
      { label: "FY25", value: 12704 },
      { label: "FY26", value: 24816 },
    ],
  },
  ratios: [
    { label: "Adjusted EBITDA / NRV, FY26", value: "-20.3% (FY25: -35.6%)", tone: "neg" },
    { label: "Adjusted EBITDA per order, FY26", value: "-Rs 79 (FY25: -Rs 136)" },
    { label: "Free cash flow, FY26", value: "-Rs 4,330 Cr (FY25: -Rs 5,332 Cr)", tone: "neg" },
    { label: "Cash & investments, Mar 2026", value: "Rs 5,681 Cr; no borrowings" },
    { label: "Net worth, Mar 2026", value: "Rs 3,560 Cr" },
    { label: "RoNW, FY26", value: "-165.9%", tone: "neg" },
    { label: "Orders per store per day, FY26", value: "1,677 (FY24: 1,325)", tone: "pos" },
    { label: "Annual transacting users, FY26", value: "4.8 crore (+25%)" },
  ],

  useOfProceeds: [
    { label: "Lease rentals of existing dark stores", valueCr: 1735 },
    { label: "New dark stores in existing and new cities", valueCr: 1629 },
    { label: "Technology and cloud infrastructure", valueCr: 1325 },
    { label: "Brand marketing via subsidiary Zepto Marketplace", valueCr: 520 },
  ],
  proceedsNote:
    "The four named objects total Rs 5,209 Cr, deployed over several years after listing. The balance (~Rs 2,800 Cr) goes to unidentified acquisitions (capped at 10% of the fresh issue) and general corporate purposes (capped at 25%), amounts to be fixed at pricing. Any pre-IPO placement (up to Rs 1,602 Cr allowed; ~Rs 1,000 Cr reportedly raised in Aug 2026) reduces the fresh issue. OFS money goes to the selling investors.",
  shareholding: [
    { holder: "Promoters & promoter group (founders, Lazarus & Vohra trusts)", pct: 19.56 },
    { holder: "Nexus Venture Partners", pct: 13.12 },
    { holder: "Glade Brook", pct: 7.73 },
    { holder: "Employee stock option trust", pct: 7.46 },
    { holder: "StepStone", pct: 7.34 },
    { holder: "LGF Scale entities", pct: 5.58 },
    { holder: "Y Combinator (YCC20)", pct: 5.03 },
    { holder: "General Catalyst (Bear Coast)", pct: 2.33 },
    { holder: "Other investors", pct: 31.85 },
  ],
  sellers: [
    { name: "Nexus Ventures VI", detail: "Up to 5.74 crore shares (avg cost Rs 3.91)" },
    { name: "Nexus Ventures VII", detail: "Up to 3.04 crore shares (avg cost Rs 23.65)" },
    { name: "Razor Ventures Zepto", detail: "Up to 0.94 crore shares" },
    { name: "Contrary ZEP Holdings", detail: "Up to 0.78 crore shares" },
    { name: "Kaiser Foundation Hospitals", detail: "Up to 0.44 crore shares" },
    { name: "Kaiser Permanente Group Trust", detail: "Up to 0.42 crore shares" },
  ],

  peers: [
    { name: "Eternal (Blinkit)", ticker: "ETERNAL", note: "Blinkit is the quick-commerce leader; group profitable on food delivery" },
    { name: "Swiggy (Instamart)", ticker: "SWIGGY", note: "Loss-making; Instamart is the #3 player" },
    { name: "Avenue Supermarts (DMart)", ticker: "DMART", note: "Offline grocery benchmark; profitable, low-cost model" },
  ],
  valuationNote:
    "At the ~Rs 42,750 Cr pre-IPO mark Zepto trades at ~1.9x FY26 revenue, below Swiggy and Eternal on sales (see the table), both of which also own profitable or scaled food-delivery arms.",

  strengths: [
    {
      title: "Fastest order growth in the category",
      body: "Orders grew ~119.5% a year from FY24 to FY26, the fastest among scaled players per Redseer, lifting Zepto's order share to ~35%.",
    },
    {
      title: "Density is starting to pay",
      body: "Orders per dark store per day climbed to 2,140 in Q4 FY26, and the company says cost per order has fallen line by line as volumes scaled.",
    },
    {
      title: "Ads and new lines add margin",
      body: "Advertising rose to Rs 1,636 Cr and 7.8% of order value in FY26; Cafe, private labels and data products add higher-margin revenue on the same stores.",
    },
    {
      title: "Debt-free with a cash cushion",
      body: "Rs 5,681 Cr of cash and investments and no borrowings at Mar 2026, topped up by ~Rs 1,000 Cr pre-IPO in Aug 2026.",
    },
  ],
  risks: [
    {
      risk: "Losses and negative operating cash flow every year since 2021; FY26 restated loss Rs 5,905 Cr.",
      mitigant: "Loss per order has nearly halved and Q4 FY26 adjusted EBITDA loss was ~Rs 59 per order.",
      severity: "high",
    },
    {
      risk: "Competition from Blinkit, Instamart, Flipkart Minutes and Amazon Now could restart a discount and dark-store race.",
      mitigant: "Zepto has the #2 order share and an 'everyday low prices' positioning; the fresh issue funds store expansion.",
      severity: "high",
    },
    {
      risk: "Cash runway: reports put quarterly burn at ~Rs 700 Cr with limited runway before the IPO.",
      mitigant: "Pre-IPO placement closed in Aug 2026 and the fresh issue would add up to Rs 8,010 Cr.",
      severity: "medium",
    },
    {
      risk: "Regulatory: ED summons to both founders under FEMA (Apr 2026), a CCI inquiry into pricing, and distributor complaints.",
      mitigant: "The company says the founders have appeared and filed documents; no penalty is disclosed.",
      severity: "medium",
    },
    {
      risk: "All 1,139 dark stores and 75 warehouses are leased, and ~Rs 1,735 Cr of proceeds is earmarked for rent.",
      mitigant: "Leasing keeps capex light and lets the network shift as demand moves.",
      severity: "low",
    },
  ],

  outlook: {
    bull: "Order density keeps rising, adjusted EBITDA turns positive within FY28, and the IPO prices near the pre-IPO mark with room for a re-rating toward Swiggy and Eternal multiples.",
    base: "Listing in H1 2027 at a valuation close to the ~US$4.5bn pre-IPO round, with losses narrowing but cash burn still visible for several quarters.",
    bear: "Amazon and Flipkart escalate spending, burn stays near Rs 700 Cr a quarter, and the IPO is pushed close to the Nov 2027 deadline or priced below the private round.",
  },
  sources: [
    { title: "Zepto Limited - UDRHP-I (8 Jun 2026)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jun-2026/zepto-limited-udrhp1_101929.html", year: "2026" },
    { title: "Zepto files UDRHP for IPO: ED summons to promoters disclosed", source: "Business Today", url: "https://www.businesstoday.in/amp/markets/ipo-corner/story/zepto-files-udrhp-for-ipo-ed-summons-to-promoters-disclosed-key-details-you-should-know-535685-2026-06-09", year: "2026" },
    { title: "Zepto FY26: Loss jumps 26% YoY to Rs 5,905 Cr, revenue doubles", source: "Inc42", url: "https://inc42.com/buzz/zepto-fy26-loss-jumps-26-yoy-to-%E2%82%B95905-cr-revenue-doubles/", year: "2026" },
    { title: "Why Zepto chose to delay its IPO instead of cutting valuation", source: "Forbes India", url: "https://www.forbesindia.com/article/news/deep-dive/why-zeptos-ipo-ambitions-hit-a-valuation-reality-check/2996648/1", year: "2026" },
    { title: "Zepto eyes listing in 2 to 3 quarters; announces pre-IPO placement", source: "Storyboard18", url: "https://www.storyboard18.com/brand-marketing/zepto-eyes-listing-in-2-to-3-quarters-announces-pre-ipo-equity-placement-106344.htm", year: "2026" },
    { title: "Think Quick Commerce: unlocking the US$90bn opportunity", source: "Redseer", url: "https://redseer.com/reports/think-quick-commerce-unlocking-the-90bn-opportunity/", year: "2026" },
    { title: "A 10-minute parcel comes for Dalal Street", source: "Zerodha Daily Brief", url: "https://thedailybrief.zerodha.com/p/a-10-minute-parcel-comes-for-dalal", year: "2026" },
    { title: "Eternal Ltd consolidated financials", source: "Screener.in", url: "https://www.screener.in/company/ETERNAL/consolidated/", year: "2026" },
  ],
};
