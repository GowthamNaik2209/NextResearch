import type { IpoReport } from "./types";

export const crystalCropProtection: IpoReport = {
  slug: "crystal-crop-protection",
  name: "Crystal Crop Protection",
  legalName: "Crystal Crop Protection Limited",
  icon: "CCP",
  sectorLabel: "Crop protection & seeds",
  sectorSlug: "chemicals",
  tagline: "A Delhi-based maker of farm chemicals and hybrid seeds that grew by buying brands from global companies, priced at up to ~₹4,438 Cr",
  asOf: "Nov 2026",

  status: {
    stage: "upcoming",
    label: "Closed · lists 26 Nov",
    detail:
      "Bidding closed on 20 Nov 2026 with the ₹455.49 Cr issue subscribed 17.68x (QIB 15.81x, NII 39.16x, retail 9.71x) after a ₹135.96 Cr anchor book at ₹272; allotment was finalised on 23 Nov and the shares are due to list on NSE (CRYSTALCP) and BSE on 26 Nov 2026.",
  },
  timeline: [
    { date: "Dec 2025", event: "DRHP filed: ₹600 Cr fresh issue plus an offer for sale by the promoter and IFC", done: true },
    { date: "May 2026", event: "SEBI observations received; deal signed to buy FMC India for $252 million", done: true },
    { date: "12 Nov 2026", event: "RHP filed at ₹259-272; fresh issue cut to ₹355 Cr after an ₹84 Cr pre-IPO placement", done: true },
    { date: "17 Nov 2026", event: "Anchor book: ₹135.96 Cr at ₹272", done: true },
    { date: "18 Nov 2026", event: "Issue opens", done: true },
    { date: "20 Nov 2026", event: "Issue closes: 17.68x overall (QIB 15.81x, NII 39.16x, retail 9.71x)", done: true },
    { date: "23 Nov 2026", event: "Allotment finalised", done: true },
    { date: "26 Nov 2026", event: "Listing on NSE and BSE", done: false },
  ],

  issue: {
    size: "₹455.49 Cr (at the ₹272 upper band)",
    totalCr: 455.49,
    freshCr: 354.77,
    ofsCr: 100.71,
    ofsShares: "37.03 lakh shares",
    priceBand: "₹259 - 272",
    lotSize: "55 shares (₹14,960)",
    faceValue: "₹10",
    valuation: "~₹4,438 Cr post-issue market cap at the ₹272 upper band (16,31,68,280 shares)",
    valuationCr: 4438,
    reservation: "QIB 50% · NII 15% · Retail 35% (plus 1,01,215 employee shares at a ₹25 discount)",
    exchanges: "BSE, NSE",
    leadManagers: ["IIFL Capital Services", "DAM Capital Advisors", "Motilal Oswal Investment Advisors"],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Improving business, full price on earnings",
    tone: "neutral",
    line: "Margins and the dealer network have grown fast and the price is modest on sales and book, but at ~24.6x FY26 diluted EPS it costs more than most RHP peers on earnings while return on equity is only ~8%, and a pending FMC India purchase larger than the IPO still has to be paid for.",
  },
  keyStats: [
    { label: "Issue size", value: "₹455.49 Cr", sub: "₹354.77 Cr fresh + ₹100.71 Cr offer for sale; subscribed 17.68x" },
    { label: "Valuation at upper band", value: "~₹4,438 Cr", sub: "~24.6x FY26 diluted EPS; ~1.4x FY26 revenue" },
    { label: "Revenue, FY26", value: "₹3,152 Cr", sub: "+17.2% YoY; PAT ₹144.9 Cr (+22.4%)" },
    { label: "Active distributors, Jun 2026", value: "14,717", sub: "23 states and 4 UTs; 8,992 in FY24" },
  ],
  thesis: [
    {
      title: "A buyer of global brands",
      body: "Since 2016 Crystal has bought Indian brands from BASF (Bavistin), Syngenta (Tilt, Proclaim), FMC (Furadan), Dow (Dursban) and Bayer (cotton, pearl millet and mustard seeds); these earned ₹642 Cr in FY26, about a fifth of revenue. In May 2026 it agreed to buy FMC India itself for $252 million.",
    },
    {
      title: "Margins are rising",
      body: "Gross margin rose from 31.1% in FY24 to 38.5% in FY26 and EBITDA margin from 9.4% to 14.5%, as branded products and seeds grew faster than bulk sales. PAT grew ~29% a year over FY24-26, from ₹87 Cr to ₹145 Cr.",
    },
    {
      title: "An IPO that mostly cuts debt",
      body: "₹270 Cr of the ₹355 Cr fresh issue repays borrowings of the company and its Saffire subsidiary, against ₹952 Cr of borrowings at Jun 2026. The offer for sale is small (₹101 Cr), and the promoter family keeps ~76% after the issue.",
    },
  ],

  business: {
    narrative: [
      "Crystal Crop Protection, founded in 1994 by Nand Kishore Aggarwal and now run by his son Ankur Aggarwal, sells insecticides, herbicides, fungicides, natural crop solutions (bio-stimulants, plant growth regulators, micronutrients) and hybrid seeds to Indian farmers. 95% of FY26 revenue came from India.",
      "About 69% of FY26 sales were branded products sold through 13,952 active distributors (B2C); the other 31% went to other companies in bulk or abroad (B2B). It runs six crop protection plants (including technical-grade units at Dahej in Gujarat and Nagpur), three seed processing units and an R&D centre at Sonipat.",
      "Seeds are the faster-growing arm: branded seed sales rose from ₹327 Cr in FY24 to ₹528 Cr in FY26, and in the kharif-heavy April-June 2026 quarter seeds were half of branded sales. Crystal says it holds 20-22% of India's pearl millet seed market by volume.",
    ],
    segments: [
      { title: "Crystal-brand crop protection", metric: "₹1,297 Cr · 61% of FY26 branded sales", body: "Herbicides, fungicides, insecticides and natural crop solutions under the Crystal and GreenAg names, including acquired brands such as Bavistin, Tilt, Proclaim and Furadan." },
      { title: "Saffire (value brands)", metric: "₹292 Cr · 14% of FY26 branded sales", body: "A subsidiary that sells lower-priced crop protection products through its own dealer network; revenue roughly doubled from ₹142 Cr in FY24." },
      { title: "Branded seeds", metric: "₹528 Cr · 25% of FY26 branded sales", body: "111 field-crop hybrids (cotton, mustard, pearl millet, maize, wheat, rice) and vegetable and flower seeds from the I&B Seeds purchase in Oct 2024." },
      { title: "B2B and exports", metric: "₹939 Cr · 31% of FY26 sales", body: "Bulk technicals and formulations sold to other agrochemical companies in India and abroad, mainly to Bangladesh, Nepal and Indonesia; lower margin than the branded business." },
      { title: "Pending: FMC India", metric: "$252 million deal", body: "Signed 7 May 2026 and cleared by the Competition Commission on 29 Sep 2026, but not completed at the RHP date; brings a licence to FMC's India brands and preferred access to its new molecules." },
    ],
    mix: {
      title: "Share of FY26 revenue from sales by channel",
      source: "RHP (12 Nov 2026), B2B and B2C revenue split",
      slices: [
        { label: "Branded crop protection (B2C)", value: 52.01 },
        { label: "Branded seeds (B2C)", value: 17.27 },
        { label: "Bulk crop protection and exports (B2B)", value: 29.03 },
        { label: "Bulk seeds (B2B)", value: 1.69 },
      ],
    },
  },

  industry: {
    narrative: [
      "Frost & Sullivan, in the report commissioned for the RHP, puts the global crop protection market at USD 77 bn in CY2025, rising to USD 95 bn by CY2030; India makes up about 12% of global demand. India's branded market for the three main product types (insecticides, herbicides, fungicides) is about USD 5.1 bn in FY26 and is forecast to reach ~USD 7.7 bn by FY31, with herbicides growing fastest.",
      "Demand follows the monsoon and the kharif and rabi sowing seasons, so one weak year can hit volumes and dealer collections; the 2026 monsoon ended 12.6% below normal (IMD). Indian makers also depend on China for raw materials and compete with Chinese generics on price.",
    ],
    chart: {
      title: "India branded crop protection market (insecticides + herbicides + fungicides)",
      unit: "USD bn",
      source: "Frost & Sullivan report in the Crystal Crop Protection RHP; sum of its three product-type charts (FY31 is a forecast)",
      points: [
        { label: "FY21", value: 4.0 },
        { label: "FY26", value: 5.1 },
        { label: "FY31P", value: 7.7, projected: true },
      ],
    },
    snapshot: [
      { label: "Global crop protection market, CY2025", value: "USD 77 bn (USD 95 bn by CY2030)", tone: "neutral" },
      { label: "India's share of global crop protection demand", value: "~12%", tone: "neutral" },
      { label: "India herbicide market growth, FY26-31P", value: "11.05% CAGR", tone: "pos" },
      { label: "India seed market, FY26E", value: "USD 4.3 bn (USD 6.0 bn by FY31)", tone: "pos" },
      { label: "Crystal's seed share by volume, FY26", value: "Pearl millet 20-22% · mustard 6-7%", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements (SEBI, 12 Nov 2026), revenue from operations",
    years: [
      { label: "FY24", revenue: 2230, ebitda: 209, pat: 87 },
      { label: "FY25", revenue: 2691, ebitda: 315, pat: 118 },
      { label: "FY26", revenue: 3152, ebitda: 456, pat: 145 },
      { label: "Q1 FY27", revenue: 1197, ebitda: 242, pat: 136, partial: true },
    ],
    note: "Revenue grew at an 18.9% CAGR over FY24-26. FY26 EBITDA is after a ₹20.9 Cr fair-value loss on IFC's convertible debentures (15.1% margin before it). The April-June quarter is the kharif peak, so Q1 FY27 profit (₹136 Cr) is almost a full year's FY26 profit and should not be annualised; aggregators often show total income instead of revenue from operations.",
  },

  kpi: {
    title: "Active distributors",
    unit: "count",
    source: "RHP KPI table (active since 1 Apr 2023, at each year or period end)",
    points: [
      { label: "FY24", value: 8992 },
      { label: "FY25", value: 12581 },
      { label: "FY26", value: 13952 },
      { label: "Q1 FY27", value: 14717 },
    ],
  },
  ratios: [
    { label: "Gross margin, FY26", value: "38.5% (31.1% in FY24)", tone: "pos" },
    { label: "EBITDA margin, FY26", value: "14.5% (9.4% in FY24)", tone: "pos" },
    { label: "Return on equity, FY26", value: "7.94% (8.31% in FY25)", tone: "neg" },
    { label: "ROCE, FY26", value: "16.06%", tone: "neutral" },
    { label: "Net working capital, FY26", value: "139 days (174 in FY24)", tone: "neutral" },
    { label: "Total borrowings, Jun 2026", value: "₹952 Cr; net debt / equity 0.41x", tone: "neg" },
    { label: "Net worth, Jun 2026", value: "₹2,174 Cr (NAV ₹170.57 a share)", tone: "neutral" },
    { label: "EPS, FY26", value: "₹11.43 basic / ₹11.06 diluted (~24.6x at ₹272)", tone: "neutral" },
  ],

  useOfProceeds: [
    { label: "Repay or prepay borrowings of Crystal Crop Protection", valueCr: 247.94 },
    { label: "Invest in subsidiary Saffire Crop Science to repay its debt", valueCr: 22.06 },
  ],
  proceedsNote:
    "The rest of the ₹355 Cr fresh issue, after issue expenses, goes to unnamed acquisitions, strategic initiatives and general corporate purposes (capped together at 35% of gross proceeds). The FMC India purchase is not among the named objects and needs separate funding. The ₹101 Cr offer for sale goes to promoter Ankur Aggarwal, not the company; an ₹84.29 Cr pre-IPO placement (mainly WhiteOak Capital) at ₹272.07 a share was already used to repay debt.",
  shareholding: [
    { holder: "Promoters (Nand Kishore, Ankur and Komal Aggarwal, family trust)", pct: 80.19 },
    { holder: "Other promoter group", pct: 4.73 },
    { holder: "IFC and IFC Emerging Asia Fund", pct: 8.29 },
    { holder: "Employees welfare trust", pct: 4.73 },
    { holder: "WhiteOak Capital funds", pct: 1.47 },
    { holder: "Others", pct: 0.59 },
  ],
  sellers: [
    { name: "Ankur Aggarwal (promoter, chairman and MD)", detail: "37.03 lakh shares, ~₹100.71 Cr at ₹272; average cost ₹23.51 a share. Promoter group holding falls from 84.92% to 75.85%." },
    { name: "IFC (dropped)", detail: "Was to sell in the DRHP offer for sale, but is not a seller in the final issue; its convertible debentures turned into shares on 22 Oct 2026 at ~₹241 a share." },
  ],

  peers: [
    { name: "Bayer CropScience", ticker: "BAYERCROP", note: "Largest multinational crop protection and seed seller in India; RHP peer." },
    { name: "Sumitomo Chemical India", ticker: "SUMICHEM", note: "Japanese-parent crop protection firm of similar revenue; RHP peer." },
    { name: "Rallis India", ticker: "RALLIS", note: "Tata group mix of crop protection and seeds, closest in business mix; RHP peer." },
    { name: "Dhanuka Agritech", ticker: "DHANUKA", note: "Domestic branded formulator using in-licensed molecules; RHP peer." },
    { name: "Kaveri Seed Company", ticker: "KSCL", note: "Hybrid seed company, a benchmark for Crystal's seeds arm; RHP peer." },
    { name: "Insecticides India", ticker: "INSECTICID", note: "Domestic branded formulator of similar size; not in the RHP peer set." },
  ],
  valuationNote:
    "At ₹272 (~₹4,438 Cr) Crystal is valued at ~24.6x FY26 diluted EPS (~30.6x FY26 profit on post-issue shares), above the RHP peer average and above Dhanuka, Rallis and Kaveri on earnings, but at ~1.4x revenue and ~1.7x book it is cheaper than most of them on sales and book because its margins and return on equity are lower (see the table). Annualising the seasonal Q1 FY27 profit, as some reports do, makes it look far cheaper than it is.",

  strengths: [
    { title: "Wide farm reach", body: "14,717 active distributors, 729 sales staff and 36 distribution centres across 23 states and four union territories, built up from 8,992 distributors in FY24." },
    { title: "Proven brand buyer", body: "Acquired brands from BASF, Syngenta, FMC, Dow and Bayer have kept growing after purchase, and partnerships with Bayer, Corteva and Battelle-Mitsui add new molecules; 19.6% of FY26 branded revenue came from products launched in the last four years." },
    { title: "Two farm inputs, two seasons", body: "Crop protection plus hybrid seeds across kharif and rabi crops spreads weather risk; Crystal is a leading pearl millet seed seller and holds Bayer's Bollgard II cotton licence and BASF's Clearfield mustard technology." },
    { title: "Own manufacturing", body: "Technical-grade plants at Dahej and Nagpur and formulation units in Jammu, Sonipat and Gujarat let it make many of its own active ingredients rather than only repack bought ones." },
  ],
  risks: [
    { risk: "The FMC India purchase ($252 million, ~₹2,375 Cr) is larger than the IPO and Crystal's own net worth, still needed funding at the RHP date, and must be integrated", mitigant: "Cleared by the Competition Commission; brings FMC's India brands, a supply deal and access to new molecules", severity: "high" },
    { risk: "Weather and seasonality: demand depends on the monsoon (2026 was weak), and herbicides for paddy and cereals were 37% of FY26 crop protection revenue", mitigant: "Seeds and sales across both kharif and rabi seasons spread the risk", severity: "medium" },
    { risk: "Heavy working capital and imports: dealers get up to 180 days' credit, and China supplied 41.8% of FY26 raw material costs", mitigant: "Net working capital fell from 174 days in FY24 to 139 in FY26", severity: "medium" },
    { risk: "Litigation of ₹341.95 Cr (16.8% of Mar 2026 net worth), including a CBI chargesheet over an export licence deal naming ex-employees and a consultant, and ₹75.53 Cr of Foreign Trade Policy proceedings", mitigant: "The company is contesting the cases; the Foreign Trade Policy amount is 3.7% of Mar 2026 net worth", severity: "medium" },
    { risk: "Low returns for the price: return on equity of ~8% against a P/E above most RHP peers", mitigant: "Debt repayment and rising margins could lift returns if growth holds", severity: "medium" },
  ],

  outlook: {
    bull: "FMC India closes on sensible funding terms and its brands lift margins and reach, seeds keep growing ~25% a year, and return on equity climbs toward peer levels, justifying a higher multiple.",
    base: "Revenue grows in the mid-teens with margins around 14-16%, the FMC deal adds scale but also debt, and the stock tracks earnings with swings around each monsoon.",
    bear: "A weak monsoon and Chinese price pressure hit volumes and collections while the FMC purchase is funded with heavy borrowing, leaving returns low and the stock exposed to a de-rating toward cheaper peers.",
  },
  sources: [
    { title: "Crystal Crop Protection Limited - RHP (12 Nov 2026) and abridged prospectus", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/nov-2026/crystal-crop-protection-limited-rhp_105734.html", year: "2026" },
    { title: "Crystal Crop Protection Limited - DRHP", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/dec-2025/crystal-crop-protection-limited-drhp_98530.html", year: "2025" },
    { title: "Crystal Crop Protection IPO dates, price, subscription and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/crystal-crop-protection-ipo/2813/", year: "2026" },
    { title: "Crystal Crop Protection raises ₹136 Cr from anchor investors ahead of IPO", source: "HDFC Sky (PTI)", url: "https://hdfcsky.com/news/crystal-crop-protection-raises-rs-136-cr-from-anchor-investors-ahead-of-ipo", year: "2026" },
    { title: "Crystal Crop Protection IPO subscription status", source: "m.Stock", url: "https://www.mstock.com/ipo/crystal-crop-protection-ltd/ipo1376", year: "2026" },
    { title: "FMC to sell India crop protection business to Crystal Crop for ₹2,375 Cr", source: "Indian Chemical News", url: "https://www.indianchemicalnews.com/chemical/fmc-to-sell-india-crop-protection-business-to-crystal-crop-for-rs-2375-cr-30332", year: "2026" },
    { title: "Crystal Crop Protection IPO priced above peer P/E average", source: "Multibagg", url: "https://www.multibagg.ai/market-pulse/articles/crystal-ipo-valuation-peer-premium-cmwkgpr5v000r2drxvsyzlxz2", year: "2026" },
    { title: "Crystal Crop Protection IPO details", source: "Anand Rathi", url: "https://anandrathi.com/blog/crystal-crop-protection-ipo-details", year: "2026" },
  ],
};
