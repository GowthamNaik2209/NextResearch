import type { IpoReport } from "./types";

// Foodlink F&B Holdings (India): RHP dated 19 Nov 2026 (on the BRLM Equirus's site), DRHP dated 27 Jun 2025,
// SEBI final observation letter 28 Nov 2025. Issue 26-30 Nov 2026, allotment 1 Dec, listing 3 Dec (tentative).
// Financials FY24-FY26 and H1 FY27 (six months to 30 Sep 2026) are the RHP's restated consolidated figures;
// revenue is revenue from operations (aggregators such as Chittorgarh show total income).
export const foodlink: IpoReport = {
  slug: "foodlink",
  name: "Foodlink F&B Holdings",
  legalName: "Foodlink F&B Holdings (India) Limited",
  icon: "FLK",
  sectorLabel: "Restaurants, catering & food services",
  sectorSlug: "consumerbrands",
  tagline: "A Mumbai luxury wedding and event caterer that also runs banquets and China Bistro restaurants, asking ~₹1,191 Cr",
  asOf: "Nov 2026",

  status: {
    stage: "upcoming",
    label: "Opens 26 Nov",
    detail:
      "The ₹360.76 Cr issue (price band ₹181-191, lot of 78 shares) is open for bids from 26 to 30 Nov 2026, with allotment on 1 Dec and listing on NSE and BSE expected on 3 Dec; the anchor book is on 25 Nov.",
  },
  timeline: [
    { date: "27 Jun 2025", event: "DRHP filed with SEBI (₹160 Cr fresh + 1.20 crore-share OFS)", done: true },
    { date: "28 Nov 2025", event: "SEBI final observation letter received", done: true },
    { date: "19 Nov 2026", event: "RHP filed: fresh issue raised to ₹192 Cr, OFS cut to 88.35 lakh shares; price band ₹181-191", done: true },
    { date: "25 Nov 2026", event: "Anchor bidding day", done: false },
    { date: "26 Nov 2026", event: "Issue opens", done: false },
    { date: "30 Nov 2026", event: "Issue closes", done: false },
    { date: "1 Dec 2026", event: "Basis of allotment", done: false },
    { date: "3 Dec 2026", event: "Listing on NSE and BSE (expected)", done: false },
  ],

  issue: {
    size: "₹360.76 Cr at the upper band",
    totalCr: 360.76,
    freshCr: 192,
    ofsCr: 168.76,
    ofsShares: "88.35 lakh shares",
    priceBand: "₹181 - 191",
    lotSize: "78 shares (₹14,898 at the upper band)",
    faceValue: "₹2",
    valuation: "~₹1,191 Cr post-issue market cap at the ₹191 upper band (6,23,50,956 shares)",
    valuationCr: 1191,
    reservation: "QIB 75% · NII 15% · Retail 10% (the company has not met SEBI's profit-track-record test, so at least 75% must go to institutions)",
    exchanges: "BSE, NSE",
    leadManagers: ["Equirus Capital", "JM Financial"],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Seasonal caterer at a full price",
    tone: "neutral",
    line: "Revenue grew ~23% a year over FY24-26 and EBITDA more than doubled, but the business is lumpy (two thirds of sales come in the October-March wedding season), lost money in FY24 and in H1 FY27, and faces open tax proceedings; at ~41x FY26 earnings the price leaves little room, though it is about half what pre-IPO investors paid in 2025.",
  },
  keyStats: [
    { label: "Issue size", value: "₹360.76 Cr", sub: "₹192 Cr fresh + ₹168.76 Cr offer for sale" },
    { label: "Valuation at upper band", value: "~₹1,191 Cr", sub: "~41x FY26 profit; ~2.1x FY26 revenue (post-issue)" },
    { label: "Revenue, FY26", value: "₹567.5 Cr", sub: "+25.9% YoY; profit ₹29.1 Cr (₹14.3 Cr in FY25)" },
    { label: "Loss, H1 FY27", value: "₹16.2 Cr", sub: "Seasonally weak half; UAE unit hit by regional conflict" },
  ],
  thesis: [
    {
      title: "Weddings and big events drive the business",
      body: "Events catering was 52.9% of FY26 revenue across 1,092 events, and Frost & Sullivan, in the report commissioned for the IPO, ranks Foodlink first by FY25 revenue among organised luxury caterers. It puts India's organised catering market at ₹1.60L Cr in FY26, growing 15.3% a year to FY30.",
    },
    {
      title: "Banquets are smoothing out the seasons",
      body: "Banquets and exclusive F&B contracts rose from 11.4% of revenue in FY24 to 22.5% in FY26 (25.4% in H1 FY27), helped by Jade Banquets in Mumbai, Ahmedabad and Delhi and multi-year venue mandates at a Delhi convention centre, Penang and Gurugram. Operating venues doubled from 3 to 6.",
    },
    {
      title: "The fresh money mostly builds new venues",
      body: "₹113.7 Cr of the ₹192 Cr fresh issue funds two banquets (Rajasthan and Bengaluru), a central kitchen in Rajasthan and four restaurants in Dubai and Abu Dhabi, and ₹21 Cr repays debt. None of the sites has been picked yet; the ₹168.76 Cr OFS goes to the selling shareholders.",
    },
  ],

  business: {
    narrative: [
      "Foodlink is a Mumbai-based luxury food services company built by promoter Sanjay Vazirani over three decades; the catering, banquet and restaurant operations were moved into this company from Foodlink Services (India) through a demerger. It has operations in India, the UAE, the UK and Malaysia, and caters for weddings and events abroad, so 26.3% of FY26 revenue came from outside India.",
      "It runs three businesses: events catering for weddings, sports and corporate events (it can serve over 30,000 guests at one event); 28 casual-dining restaurants and cloud kitchens under China Bistro, India Bistro, Glocal and Art of Dum (15 in India, 13 in the UAE); and banquets plus exclusive F&B contracts at convention venues. Seven central kitchens (six in India, one in Dubai) cook for all three, with capacity of over 100,000 meals a day.",
      "Demand is seasonal: the October-March wedding season gave 67.2% of FY26 revenue, so first-half results are weak. Clients range from film actors, cricketers' families and wealthy families to corporates such as Hardcastle Restaurants (McDonald's franchisee for West and South India), Zee Entertainment and Greenply.",
    ],
    segments: [
      { title: "Events catering", metric: "₹300.1 Cr · 52.9% of FY26 revenue", body: "Luxury weddings, sports and corporate events in India and abroad; 1,092 events in FY26 (911 in FY24). Storage hubs in Mumbai and Dubai support destination weddings." },
      { title: "Casual dining & cloud kitchens", metric: "₹137.2 Cr · 24.2% of FY26 revenue", body: "14 China Bistro restaurants plus India Bistro, Glocal and Art of Dum (1 restaurant, 11 cloud kitchens). Underperformers are closed quickly: 4 restaurants and 2 cloud kitchens shut in H1 FY27." },
      { title: "Banquets & integrated F&B", metric: "₹127.8 Cr · 22.5% of FY26 revenue", body: "Jade Banquets in Mumbai, Ahmedabad and New Delhi (over 242,000 sq ft), and exclusive F&B rights at a Delhi convention centre (10 years from Oct 2023), Penang (from Sep 2025) and Gurugram (from Nov 2025)." },
      { title: "Central kitchens", metric: "7 kitchens · 100,000+ meals a day", body: "A hub-and-spoke set-up in Mumbai, Ahmedabad, Mohali, Hyderabad, Jaipur, New Delhi and Dubai that serves all three businesses; one more is planned in Rajasthan from the IPO money." },
    ],
    mix: {
      title: "Share of FY26 revenue from operations by business",
      source: "RHP (19 Nov 2026), Our Business",
      slices: [
        { label: "Events catering", value: 52.89 },
        { label: "Casual dining & cloud kitchens", value: 24.17 },
        { label: "Banquets & integrated F&B", value: 22.51 },
        { label: "Other operating revenue", value: 0.43 },
      ],
    },
  },

  industry: {
    narrative: [
      "Frost & Sullivan, in the report commissioned for the IPO, sizes India's foodservice market (excluding catering) at ~₹8.3L Cr in FY26, rising to ~₹12.9L Cr by FY30. Catering is a separate ~₹2.6L Cr market, of which the organised (GST-registered) part is ₹1.60L Cr and is forecast to reach ₹2.84L Cr by FY30.",
      "Weddings make up 80-83% of catering spend, and luxury and ultra-luxury weddings alone spent ₹38,700-82,350 Cr on catering in FY26. Among restaurant formats, casual dining is the largest organised segment and cloud kitchens the fastest-growing. The RHP says no listed company in India or abroad has the same mix of businesses.",
    ],
    chart: {
      title: "India organised catering market",
      unit: "₹ lakh Cr",
      source: "Frost & Sullivan report in the Foodlink RHP (FY26 is an estimate, FY30 a forecast)",
      points: [
        { label: "FY25", value: 1.39 },
        { label: "FY26E", value: 1.6, projected: true },
        { label: "FY30P", value: 2.84, projected: true },
      ],
    },
    snapshot: [
      { label: "Organised catering growth, FY26-30P", value: "15.3% CAGR", tone: "pos" },
      { label: "Weddings' share of catering market", value: "80-83%", tone: "neutral" },
      { label: "Luxury + ultra-luxury wedding catering, FY26", value: "₹38,700-82,350 Cr", tone: "neutral" },
      { label: "Casual dining market, FY26 → FY30P", value: "₹1.45L Cr → ₹2.08L Cr (9.3% CAGR)", tone: "pos" },
      { label: "Cloud kitchen market, FY26 → FY30P", value: "₹7,080 Cr → ₹17,250 Cr (24.9% CAGR)", tone: "pos" },
    ],
  },

  financials: {
    source: "RHP restated consolidated financial information (19 Nov 2026); EBITDA as defined in the RHP (excludes other income)",
    years: [
      { label: "FY24", revenue: 377.2, ebitda: 30.6, pat: -15.4 },
      { label: "FY25", revenue: 450.9, ebitda: 61.4, pat: 14.3 },
      { label: "FY26", revenue: 567.5, ebitda: 78.4, pat: 29.1 },
      { label: "H1 FY27", revenue: 219.8, ebitda: 16.2, pat: -16.2, partial: true },
    ],
    note: "Revenue grew at a 22.7% CAGR over FY24-26 and the EBITDA margin rose from 8.1% to 13.8%. The first half is the off-season (H1 was 32.8% of FY26 revenue), and H1 FY27 also carried losses at the UAE restaurant subsidiary as regional conflict hit spending, so it swung to a ₹16.2 Cr loss on ₹26.5 Cr of depreciation and amortisation.",
  },

  kpi: {
    title: "Events catered (events catering + banquets and F&B venues)",
    unit: "events",
    source: "RHP KPI table (FY24-FY26)",
    points: [
      { label: "FY24", value: 1569 },
      { label: "FY25", value: 2032 },
      { label: "FY26", value: 2181 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "13.82% (7.35% in H1 FY27; 8.12% in FY24)", tone: "neutral" },
    { label: "RoNW, FY26", value: "17.35% (-7.25% in H1 FY27, not annualised)", tone: "neutral" },
    { label: "Net worth, Sep 2026", value: "₹216.0 Cr", tone: "neutral" },
    { label: "Borrowings, Sep 2026", value: "₹22.4 Cr (0.10x equity); lease liabilities ₹97.1 Cr", tone: "pos" },
    { label: "Cash and equivalents, Sep 2026", value: "₹23.4 Cr", tone: "neutral" },
    { label: "Revenue from outside India, FY26", value: "26.3% (₹149.1 Cr)", tone: "neutral" },
    { label: "Diluted EPS, FY26", value: "₹5.48 (~35x at the upper band, pre-issue shares)", tone: "neutral" },
  ],

  useOfProceeds: [
    { label: "Invest in UAE subsidiary FGRCS for four new restaurants (Dubai, Abu Dhabi)", valueCr: 50.81 },
    { label: "Two new banquets (Rajasthan and Bengaluru)", valueCr: 41.5 },
    { label: "One new central kitchen (Rajasthan)", valueCr: 21.4 },
    { label: "Repay or prepay borrowings of the company and FGRCS", valueCr: 21.0 },
  ],
  proceedsNote:
    "Of the ₹192 Cr fresh issue, ₹134.7 Cr has named uses; the rest, after issue expenses, is for general corporate purposes (capped at 25% of gross proceeds). Debt repayment is planned in FY27 and the capex in FY28; sites for the kitchen, banquets and restaurants are not yet identified. The ₹168.76 Cr OFS goes to the selling shareholders. Between Mar and May 2025 the company raised about ₹100 Cr by placing 27.5 lakh shares at ₹363 each.",
  shareholding: [
    { holder: "Sanjay Manohar Vazirani (promoter)", pct: 49.5 },
    { holder: "Promoter group (Trans Global Hotels LLP, Ankita Chugh, Shlok Vazirani)", pct: 13.9 },
    { holder: "Arpit Khandelwal (investor)", pct: 11.15 },
    { holder: "V'Ocean Investments", pct: 7.02 },
    { holder: "Other investors and public", pct: 18.43 },
  ],
  sellers: [
    { name: "Sanjay Manohar Vazirani (promoter)", detail: "22.86 lakh shares (~₹43.7 Cr at ₹191); average cost ₹0.19 a share. Promoter and group holding falls from 63.4% to ~47.7% after the issue (at the upper band)." },
    { name: "Arpit Khandelwal", detail: "18.32 lakh shares (~₹35.0 Cr); average cost ₹102.93 a share." },
    { name: "V'Ocean Investments", detail: "16.87 lakh shares (~₹32.2 Cr); average cost ₹75.54 a share." },
    { name: "Trans Global Hotels LLP (promoter group)", detail: "7.03 lakh shares; average cost ₹0.24 a share." },
    { name: "Ankita Chugh (promoter group)", detail: "4.13 lakh shares; negligible cost." },
    { name: "Other investors", detail: "Smaller blocks from Aarkay Investments, Oaks Asset Management, Welspun Group Master Trust, Aarin Capital and Bona Terra Greenhouses, mostly at ₹75.54 a share." },
  ],

  peers: [
    { name: "Travel Food Services", ticker: "TRAVELFOOD", note: "Listed food and lounge operator at airports; the closest food-services business, though built on concessions rather than events." },
    { name: "United Foodbrands (Barbeque Nation)", ticker: "UFBL", note: "Listed casual-dining chain, the nearest match to Foodlink's restaurant arm." },
    { name: "Jubilant FoodWorks", ticker: "JUBLFOOD", note: "Largest listed restaurant company; a benchmark for restaurant economics." },
    { name: "Devyani International", ticker: "DEVYANI", note: "Multi-brand restaurant operator in India and abroad." },
    { name: "IRCTC", ticker: "IRCTC", note: "Large-volume catering for Indian Railways; a catering benchmark, though a state-backed franchise." },
  ],
  valuationNote:
    "At ₹191 (~₹1,191 Cr after the issue) Foodlink asks ~41x FY26 profit and ~2.1x FY26 revenue. The RHP names no listed peer, so the table is a loose guide: on sales Foodlink is priced below Travel Food Services, IRCTC, Jubilant and Devyani and above Barbeque Nation's owner, while on earnings it sits above IRCTC and Travel Food Services, and several restaurant peers are loss-making.",

  strengths: [
    { title: "Scale in luxury catering", body: "Frost & Sullivan ranks it the largest organised luxury caterer by FY25 revenue; it has served 30,000 guests at a single event and runs multiple events at once across cities and countries." },
    { title: "Three businesses that share kitchens", body: "Events, banquets and restaurants draw on the same seven central kitchens, and the year-round banquet and restaurant income partly offsets the wedding season." },
    { title: "Reach beyond India", body: "Over a quarter of revenue comes from outside India, from 13 UAE outlets, a Dubai kitchen and storage hubs, and events catered in countries such as Italy, Turkey and Qatar." },
    { title: "Light debt", body: "Borrowings were ₹22.4 Cr against a net worth of ₹216 Cr in Sep 2026, and ₹21 Cr of the fresh issue repays debt." },
  ],
  risks: [
    { risk: "Seasonal and uneven profits: two thirds of revenue comes in October-March, and the company lost ₹15.4 Cr in FY24 and ₹16.2 Cr in H1 FY27", mitigant: "Banquets and restaurants run year-round and rose to over half of H1 FY27 revenue", severity: "high" },
    { risk: "Open tax matters: an income-tax search in Dec 2025 (₹1.06 Cr cash seized; the tax department's reassessment of past years is still pending) and a GST search in Aug 2023; the auditors drew special attention to both in their report", mitigant: "The GST notice of ₹23.3 Cr ended in a confirmed demand of ₹0.41 Cr plus interest and penalty, which is under appeal; no income-tax order yet", severity: "high" },
    { risk: "Restaurant churn and the UAE: 11 outlets shut in FY25 and 6 in H1 FY27, and the UAE subsidiary lost money in FY26 and H1 FY27 amid regional conflict, yet four more UAE restaurants are planned", mitigant: "Loss-making outlets are closed quickly and the UAE adds geographic spread", severity: "medium" },
    { risk: "Execution on the IPO capex: no sites chosen and no orders placed for the kitchen, banquets or restaurants, with spending planned for FY28", mitigant: "Vendor quotations are in hand and a monitoring agency (Crisil Ratings) tracks use of the proceeds", severity: "medium" },
    { risk: "Valuation: ~41x FY26 profit after a loss-making half, with promoter shares bought at under ₹1", mitigant: "The band is about 47% below the ₹363 a share paid by investors in the 2025 placement", severity: "medium" },
  ],

  outlook: {
    bull: "Wedding and event demand stays strong, the new banquets and venue contracts fill up, the UAE restaurants recover, and margins hold near 14%, so earnings grow fast enough to bring the multiple down within two to three years.",
    base: "Revenue grows in the high teens with lumpy half-years, margins stay around 12-14%, the tax matters close without large demands, and the stock tracks earnings rather than re-rating.",
    bear: "A weak wedding season or tax demands hit profits, new sites take longer to find and ramp up, and UAE losses persist, leaving a thinly traded small cap exposed to a de-rating.",
  },
  sources: [
    { title: "Foodlink F&B Holdings (India) Limited - Red Herring Prospectus (19 Nov 2026)", source: "Equirus Capital (BRLM)", url: "https://s3.ap-south-1.amazonaws.com/cms.equirus.tech/Foodlink_F_and_B_Holdings_India_Limited_Red_Herring_Prospectus_95e7e3e3b7.pdf", year: "2026" },
    { title: "Foodlink F&B Holdings (India) IPO date, price, issue details and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/foodlink-fb-ipo/2493/", year: "2026" },
    { title: "Foodlink F&B Holdings IPO price band set at ₹181-191 per share; lot size and key dates", source: "Upstox", url: "https://upstox.com/news/market-news/ipo/foodlink-f-and-b-holdings-ipo-price-band-set-at-181-191-per-share-check-lot-size-and-key-dates/article-203832/", year: "2026" },
    { title: "Foodlink F&B Holdings files DRHP with SEBI for IPO", source: "IIFL (India Infoline)", url: "https://www.indiainfoline.com/news/business/foodlink-fb-holdings-files-drhp-with-sebi-for-ipo", year: "2025" },
  ],
};
