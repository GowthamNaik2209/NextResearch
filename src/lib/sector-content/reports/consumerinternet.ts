import type { SectorReport } from "./types";

export const consumerinternet: SectorReport = {
  slug: "consumerinternet",
  title: "India Consumer Internet",
  subtitle: "Food delivery, quick commerce, marketplaces and payments after the 2025-26 IPO wave",
  asOf: "Nov 2026",

  stance: {
    label: "Constructive, pick by margin",
    tone: "neutral",
    line: "Order volumes are compounding and the leaders now make money, but quick commerce is a funded price war and payments earn little until UPI's new merchant fee on larger payments starts after Diwali.",
  },
  keyStats: [
    { label: "E-retail GMV, 2025", value: "US$65-66bn", sub: "+19-21% (Bain & Flipkart, Apr 2026)" },
    { label: "Online shoppers, 2025", value: "290-300 mn", sub: "~30% of internet users (Bain)" },
    { label: "Quick-commerce GMV, 2025", value: "US$10-11bn", sub: "~16-17% of e-retail (Bain & Flipkart)" },
    { label: "UPI payments, Sep 2026", value: "24.07 bn", sub: "+23% YoY (NPCI)" },
  ],
  thesis: [
    {
      title: "Food delivery pays for quick commerce",
      body: "Zomato and Swiggy's food arms are profitable duopoly businesses growing high-teens to ~20%. Their cash funds dark stores, where Blinkit has just turned profitable and Instamart, Zepto, Flipkart Minutes and Amazon Now are still spending.",
    },
    {
      title: "Density and ads decide margins",
      body: "A dark store or rider earns once it is busy: more orders per store, more SKUs and brand ads (4-8% of order value) turn losses into profit. Owning inventory, as Blinkit and soon Instamart do, adds a retail margin on top.",
    },
    {
      title: "The pipes grow with volume",
      body: "Every order needs a payment, a parcel and usually an ad or a message. Logistics, payment and ad-tech companies grow with the app economy whoever wins the storefront fight - but their margins depend on rules (UPI's new merchant fee, gig-worker levies) they do not control.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Blinkit profitable, Instamart's losses peak",
      body: "Eternal's Q2 FY27 letter showed Blinkit's net order value up ~79% with positive adjusted EBITDA, now bigger than food delivery. Swiggy's Instamart loss widened but management says it peaked, with an owned-inventory model starting mid-Q3.",
      impact: "pos",
      tag: "Quick commerce",
    },
    {
      date: "Oct 2026",
      title: "UPI merchant fee announced, start pushed to after Diwali",
      body: "On 15 Sep the Finance Ministry and NPCI announced a 0.4% MDR on person-to-merchant UPI payments above ₹2,000, capped at ₹300 and paid by merchants; consumers and small merchants stay exempt. On 13 Oct NPCI deferred the 15 Oct start to after Diwali, on a date to be notified.",
      impact: "pos",
      tag: "Policy",
    },
    {
      date: "Oct 2026",
      title: "UPI hits 24 billion payments a month",
      body: "NPCI data showed 24.07 billion UPI transactions in September 2026, up 23% YoY, and ~140.5 billion in H1 FY27 (+23%). Most payments stay free even after the new fee, which covers only larger merchant payments.",
      impact: "pos",
      tag: "Payments",
    },
    {
      date: "Aug 2026",
      title: "Zepto defers its IPO; Shiprocket lists",
      body: "Zepto put its IPO on hold in late July, turning to a ~₹1,000 Cr pre-IPO round and a listing up to three quarters later; Shiprocket listed on 19 Aug at a premium. Earlier 2026 listings included Shadowfax (Jan); PhonePe's IPO paused in March.",
      impact: "neutral",
      tag: "Capital markets",
    },
    {
      date: "May 2026",
      title: "Online gaming law takes effect",
      body: "The Promotion and Regulation of Online Gaming Act, 2025 and its 2026 rules came into force on 1 May: online money games are banned, esports and social games need registration, and banks must block payments to unregistered games. Challenges are pending in the Supreme Court.",
      impact: "neg",
      tag: "Regulation",
    },
    {
      date: "Apr 2026",
      title: "E-retail crosses US$65bn",
      body: "Bain and Flipkart's How India Shops Online 2026 put 2025 e-retail GMV at US$65-66bn (+19-21%) with 290-300 million shoppers, and projects US$170-180bn by 2030; quick commerce was US$10-11bn.",
      impact: "pos",
      tag: "Demand",
    },
  ],

  overview: {
    narrative: [
      "India has ~290-300 million online shoppers, but they are only about 30% of internet users, so growth still comes mostly from new buyers in smaller cities. E-retail grows ~20% a year; quick commerce more than doubled in 2025.",
      "Profits sit unevenly: classifieds (Naukri, IndiaMART) and vertical brands (Lenskart) earn high margins; food delivery is a thin-margin profitable duopoly; quick commerce and horizontal e-commerce are still in a funded land grab; payments carry huge volume at almost no fee until UPI's new charge on larger merchant payments starts.",
      "Swiggy's Nov 2024 listing and the 2025-26 IPO wave (Lenskart, Meesho, Urban Company, Pine Labs, PhysicsWallah, Shadowfax, Shiprocket) gave investors a wide listed menu; Zepto, PhonePe and Flipkart are the big names still to come.",
    ],
    chart: {
      title: "UPI transactions per year",
      unit: "billion",
      source: "NPCI product statistics (FY = April-March)",
      points: [
        { label: "FY21", value: 22.3 },
        { label: "FY22", value: 46.0 },
        { label: "FY23", value: 83.7 },
        { label: "FY24", value: 131.1 },
        { label: "FY25", value: 185.8 },
        { label: "FY26", value: 218.6 },
      ],
    },
    snapshot: [
      { label: "E-retail GMV, 2030 projection (Bain)", value: "US$170-180bn", tone: "pos" },
      { label: "Quick-commerce order share, FY26 (Zepto UDRHP)", value: "Blinkit ~47% · Zepto ~33% · Instamart ~21%" },
      { label: "UPI volume, H1 FY27 (NPCI)", value: "~140.5 bn, +23%", tone: "pos" },
      { label: "UPI merchant fee (announced 15 Sep 2026)", value: "0.4% above ₹2,000, cap ₹300; starts after Diwali", tone: "pos" },
      { label: "Gig-worker levy (Code on Social Security)", value: "1-2% of turnover; rate not yet notified", tone: "neg" },
      { label: "Real-money gaming", value: "Banned; Act in force from 1 May 2026", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Ad, messaging & seller tech", zoneIds: ["adtech"], margin: "20%+ EBITDA ads/SaaS; 10-15% SMS", moat: "medium", note: "Sells to every app; SMS is shrinking as traffic moves to WhatsApp and RCS." },
    { stage: "Payments", zoneIds: ["payments"], margin: "Near zero on UPI; 10%+ on devices & credit", moat: "medium", note: "Huge volume with almost no merchant fee until the 0.4% charge on larger payments starts; money is made on soundboxes, EMI and loan distribution." },
    { stage: "Logistics", zoneIds: ["logistics"], margin: "Mid-single-digit EBITDA", moat: "low", note: "Scale and hub utilisation decide profit; large shippers also run their own fleets." },
    { stage: "Dark stores", zoneIds: ["quickcommerce"], margin: "-2% to +1% of GOV", moat: "medium", note: "Density, ads and owned inventory lift margins; new entrants keep discounts high." },
    { stage: "Storefront apps", zoneIds: ["foodtech", "ecommerce", "travel", "gaming"], margin: "~5% of NOV food; 20%+ vertical brands", moat: "high", note: "Owning the customer and the habit; take rates rise with ads and fees." },
    { stage: "Classifieds & services", zoneIds: ["classifieds"], margin: "35-50%+ operating for leaders", moat: "high", note: "Network effects and upfront subscriptions make No. 1 portals hard to displace." },
  ],

  drivers: [
    { title: "New online shoppers", metric: "290-300 mn, ~30% of users", body: "Most growth is still first-time buyers in tier-2/3 India on cheap phones - Meesho's and ixigo's core users." },
    { title: "Quick commerce", metric: "US$10-11bn GMV, 2025", body: "Groceries, then beauty, electronics and pharmacy move to 10-minute delivery; Bain projects US$65-70bn by 2030." },
    { title: "Ads on every app", metric: "Up to ~8% of order value", body: "Brands pay for shelf space inside apps; ad income is the highest-margin line for marketplaces and quick commerce." },
    { title: "UPI everywhere", metric: "~24 bn payments a month", body: "Payments under ₹2,000 stay free and instant, widening the market for small-ticket orders; credit on UPI is the next money-maker for fintechs." },
  ],
  mix: {
    title: "Quick-commerce orders by platform, FY26",
    source: "Order counts in Zepto's UDRHP-I (Jun 2026), share of the three leaders; excludes Flipkart Minutes and Amazon Now",
    slices: [
      { label: "Blinkit (Eternal)", value: 46.6 },
      { label: "Zepto", value: 32.5 },
      { label: "Instamart (Swiggy)", value: 20.9 },
    ],
  },

  pestle: {
    political: [
      { point: "Digital public infrastructure (UPI, ONDC, Aadhaar) lowers the cost of serving new users.", impact: "pos" },
      { point: "Small-trader and distributor lobbies push for curbs on dark stores and deep discounts.", impact: "neg" },
    ],
    economic: [
      { point: "E-retail grows ~20% a year and the Sep 2025 GST cuts lifted consumer spending.", impact: "pos" },
      { point: "Funded discounting by Flipkart and Amazon delays breakeven for listed quick-commerce players.", impact: "neg" },
    ],
    social: [
      { point: "Young, urban users have made 10-minute delivery a habit; tier-2 cities are following.", impact: "pos" },
      { point: "Gig-worker pay, safety and heat-wave protests keep platform labour in the spotlight.", impact: "neg" },
    ],
    technological: [
      { point: "AI search, recommendations and agents raise conversion and cut support costs.", impact: "pos" },
      { point: "Privacy changes by Google and Apple make ad targeting harder for ad-tech firms.", impact: "neutral" },
    ],
    legal: [
      { point: "The Online Gaming Act, 2025 bans money games; the DPDP Act adds data-consent duties.", impact: "neg" },
      { point: "FDI rules stop foreign-owned marketplaces from holding inventory - an edge for Indian-owned platforms.", impact: "neutral" },
    ],
    environmental: [
      { point: "Electric two-wheelers cut rider fuel costs and help platforms' emissions targets.", impact: "pos" },
      { point: "Packaging waste from small, frequent orders draws extended-producer-responsibility rules.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "eternal", tier: "core", why: "Leader in both quick commerce (Blinkit, now profitable) and food delivery." },
    { key: "swiggy", tier: "core", why: "The No. 2 food app plus Instamart; the most leverage to Instamart turning the corner." },
    { key: "meesho", tier: "direct", why: "Widest reach among value shoppers in smaller towns; free cash flow turned positive in Q2 FY27." },
    { key: "lenskart", tier: "direct", why: "Profitable, vertically integrated digital-first brand growing in India and abroad." },
    { key: "nykaa", tier: "direct", why: "Beauty leader with own brands and stores; exposed to quick-commerce competition." },
    { key: "paytm", tier: "direct", why: "Largest listed payments business; the main listed gainer from UPI's new merchant fee." },
    { key: "delhivery", tier: "direct", why: "Largest independent parcel network after the Ecom Express buyout." },
    { key: "ixigo", tier: "indirect", why: "Mass-market travel app riding train, flight and bus bookings in smaller cities." },
    { key: "shadowfax", tier: "indirect", why: "Last-mile riders for quick commerce, food and marketplaces." },
    { key: "affle", tier: "indirect", why: "Performance ads paid per conversion, sold to apps across the sector." },
  ],

  companyNews: [
    { key: "delhivery", date: "Oct 2026", development: "Q2 FY27 express parcel volume rose ~32% to ~325 million shipments and net profit was ~₹41 Cr against a loss a year earlier, with Ecom Express integration costs largely behind it.", impact: "Consolidation in e-commerce logistics is paying off for the largest independent network.", tone: "pos" },
    { key: "meesho", date: "Oct 2026", development: "Q2 FY27 NMV grew ~23% and contribution margin rose to 6.0%; free cash flow turned positive, though order growth slowed to 17% on sale timing.", impact: "Shows a zero-commission, ad-funded marketplace can generate cash.", tone: "pos" },
    { key: "paytm", date: "Oct 2026", development: "Q2 FY27 profit rose about ten-fold to ~₹225 Cr; revenue grew ~28% and EBITDA margin crossed 10%.", impact: "Payments turned profitable before any UPI merchant fee, through devices, subscriptions and credit distribution.", tone: "pos" },
    { key: "swiggy", date: "Oct 2026", development: "Q2 FY27 consolidated loss narrowed to ~₹922 Cr, but Instamart's adjusted EBITDA loss widened to ~₹895 Cr; the shares fell sharply after results.", impact: "Investors are pricing in a longer, costlier quick-commerce race.", tone: "neg" },
    { key: "eternal", date: "Oct 2026", development: "Q2 FY27 Blinkit NOV rose ~79% to ~₹20,940 Cr with positive adjusted EBITDA; 308 stores added to 2,751.", impact: "The first proof that a scaled Indian quick-commerce business can make money.", tone: "pos" },
    { key: "nazara", date: "Aug 2026", development: "Posted a Q1 FY27 net loss after further write-downs on its PokerBaazi parent stake; founder Nitish Mittersain stepped down as CEO.", impact: "The real-money gaming ban has wiped out listed exposure to cash games.", tone: "neg" },
  ],

  risks: [
    { risk: "Quick-commerce price war funded by Flipkart and Amazon", mitigant: "Density and ad income at the leaders; owned-inventory margins; strong cash balances after QIPs", severity: "high" },
    { risk: "Gig-worker levy and state welfare fees raise rider costs", mitigant: "Pass-through via platform and delivery fees; levy capped at 5% of worker payouts", severity: "medium" },
    { risk: "UPI merchant fee delayed or diluted, and market-share caps hit large apps", mitigant: "Revenue from devices, EMI, loan distribution and subscriptions", severity: "medium" },
    { risk: "Regulatory action on dark stores, discounting or data use", mitigant: "Compliance programmes and engagement through industry bodies; CCI processes take years", severity: "medium" },
  ],
  outlook: {
    bull: "Blinkit's margins keep rising, Instamart breaks even in FY28, discounting eases once Flipkart lists, and the 0.4% UPI fee on larger merchant payments starts soon after Diwali and lifts payment margins.",
    base: "Order volumes grow 20%+ a year; food delivery and classifieds compound profits while quick commerce stays near breakeven at the leaders and loss-making for the rest.",
    bear: "Flipkart and Amazon outspend everyone for years, a 2% gig levy and state fees cut margins, and regulators restrict dark stores and deep discounts.",
  },
  reading: [
    { title: "How India Shops Online 2026", source: "Bain & Company and Flipkart", url: "https://www.bain.com/insights/how-india-shops-online-2026/", year: "2026" },
    { title: "UPI product statistics", source: "National Payments Corporation of India", url: "https://www.npci.org.in/what-we-do/upi/product-statistics" },
    { title: "Promotion and Regulation of Online Gaming Rules, 2026", source: "National e-Governance Division (MeitY)", url: "https://negd.gov.in/press_release/promotion-and-regulation-of-online-gaming-rules-2026/", year: "2026" },
    { title: "Indian listed new-age tech company tracker", source: "Inc42", url: "https://inc42.com/features/indian-listed-new-age-tech-company-tracker-market-cap-revenue-more/" },
  ],
};
