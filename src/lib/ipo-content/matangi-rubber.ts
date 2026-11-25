import type { IpoReport } from "./types";

// Matangi Rubber Ltd. Issue terms and restated consolidated FY24-FY26 + Q1 FY27 figures from the RHP
// (Nov 2026) as summarised by Chittorgarh, Kotak Neo and Trendlyne; business mix, shareholding and
// sellers from the DRHP (25 May 2026). FY24 is standalone (the MG Industries subsidiary was bought in
// Oct 2024). Status as of 25 Nov 2026.
export const matangiRubber: IpoReport = {
  slug: "matangi-rubber",
  name: "Matangi Rubber",
  legalName: "Matangi Rubber Limited",
  icon: "MR",
  sectorLabel: "Tyres & rubber products",
  sectorSlug: "autos",
  tagline: "A tyre-flap and tube maker whose largest customer is JK Tyre, raising ₹125 Cr at a ~₹492 Cr valuation",
  asOf: "Nov 2026",

  status: {
    stage: "upcoming",
    label: "Opens 1 Dec",
    detail:
      "The RHP is filed with a ₹163-172 price band: anchor bidding on 30 Nov, the issue is open 1-3 Dec, allotment is on 4 Dec and the shares list on NSE and BSE on 8 Dec 2026. Anchor and subscription figures are not out yet.",
  },
  timeline: [
    { date: "Dec 2025", event: "An earlier BSE SME plan (37.1 lakh-share fresh issue) got exchange approval but was not launched", done: true },
    { date: "25 May 2026", event: "Mainboard DRHP filed with SEBI: 57.6 lakh fresh shares + 15.2 lakh-share OFS", done: true },
    { date: "28 Sep 2026", event: "SEBI observations received", done: true },
    { date: "Nov 2026", event: "RHP filed; price band ₹163-172, lot of 87 shares", done: true },
    { date: "30 Nov 2026", event: "Anchor book bidding", done: false },
    { date: "1 Dec 2026", event: "Issue opens", done: false },
    { date: "3 Dec 2026", event: "Issue closes; allotment on 4 Dec", done: false },
    { date: "8 Dec 2026", event: "Listing on NSE and BSE", done: false },
  ],

  issue: {
    size: "₹125.16 Cr (at the ₹172 upper band)",
    totalCr: 125.16,
    freshCr: 99.1,
    ofsCr: 26.06,
    ofsShares: "15,15,150 shares",
    priceBand: "₹163 - 172",
    lotSize: "87 shares (₹14,964)",
    faceValue: "₹10",
    valuation: "~₹492 Cr post-issue market cap at the ₹172 upper band (2,86,17,281 shares)",
    valuationCr: 492,
    reservation: "QIB up to 50% · NII at least 15% · Retail at least 35%",
    exchanges: "BSE, NSE",
    leadManagers: ["Sarthi Capital Advisors"],
    registrar: "Bigshare Services",
  },

  stance: {
    label: "Small, high-margin, one big customer",
    tone: "neutral",
    line: "Margins and returns are far above listed tyre makers and the price is ~22x FY26 earnings, but one customer gives about 60% of revenue, cash generation has lagged profits, and two new plants are still to be built.",
  },
  keyStats: [
    { label: "Issue size", value: "₹125.16 Cr", sub: "₹99.10 Cr fresh + ₹26.06 Cr offer for sale" },
    { label: "Valuation at upper band", value: "~₹492 Cr", sub: "~22x FY26 PAT; ~3.8x FY26 revenue" },
    { label: "Revenue, FY26", value: "₹129.8 Cr", sub: "+28.1% YoY; PAT ₹22.3 Cr" },
    { label: "Largest customer", value: "59.6% of revenue", sub: "Top 10 customers 96.0% (RHP)" },
  ],
  thesis: [
    {
      title: "A supplier to tyre makers, not a tyre brand",
      body: "In the nine months to Dec 2025, 75.3% of revenue came from making tyre flaps under contract, mainly for JK Tyre, and 20.9% from job work for other companies. Own-brand tubes and two- and three-wheeler tyres were about 1%.",
    },
    {
      title: "Margins jumped as the mix changed",
      body: "EBITDA margin rose from 11.5% in FY24 to 30.5% in FY25 and was 27.0% in FY26. Job work, where the client supplies the rubber, cut material costs from 71% of revenue in FY23 to 44% in FY25, and the MG Industries subsidiary was added from Oct 2024.",
    },
    {
      title: "An IPO for debt and two new plants",
      body: "₹45 Cr of the ₹99 Cr fresh issue repays loans, against borrowings of ₹107 Cr at Jun 2026. Another ₹27.5 Cr builds a rubber recycling plant and a solid tyre plant at Bhind, Madhya Pradesh. The ₹26 Cr OFS goes to the sellers.",
    },
  ],

  business: {
    narrative: [
      "Matangi Rubber, set up in 2004 and run by promoter and CMD Mohit Gupta, makes tyre flaps, tyre tubes, rubber compounds and two- and three-wheeler tyres. Flaps and tubes go mostly into truck, bus and other commercial-vehicle tyres. It had 285 employees at Jun 2026.",
      "It runs five plants: two at Selaqui (Dehradun, Uttarakhand), two at Bhind (Madhya Pradesh) and one at Gummidipoondi (near Chennai). Most of the work is done for large tyre makers, either making products in their name or converting rubber they supply. Uttarakhand, Rajasthan and Madhya Pradesh gave 85.5% of revenue.",
      "The company is now trying to sell its own products. Tube production at Selaqui started on 16 Dec 2025 and two- and three-wheeler tyres at Bhind on 27 Dec 2025. The IPO also funds a recycled-rubber plant (~3,910 tonnes a year) and a solid tyre plant (~603 tonnes a year), both due in 2027.",
    ],
    segments: [
      { title: "Contract manufacturing", metric: "75.3% of 9M FY26 revenue", body: "Tyre flaps made to a client's design and brand, mainly for JK Tyre & Industries; its share was 96.6% in FY23 and 86.2% in FY25." },
      { title: "Job work", metric: "20.9% of 9M FY26 revenue", body: "Converting rubber that principal companies supply into finished parts. Revenue is only the conversion fee, so material costs are low; the share was 2.8% in FY23." },
      { title: "Own tubes and tyres", metric: "1.1% of 9M FY26 revenue", body: "Own-brand tyre tubes and two- and three-wheeler tyres, the segment that started production in Dec 2025 and the main growth bet beside the new plants." },
      { title: "Compounds, trading and services", metric: "~2.7% of 9M FY26 revenue", body: "Rubber compounds, occasional trading of rubber materials and support services to JK Tyre." },
      { title: "New Bhind plants", metric: "₹27.5 Cr from the IPO", body: "A recycled-rubber plant (₹19.06 Cr) and a solid tyre plant (₹8.44 Cr), aimed at demand from India's rules on waste-tyre recycling. Neither project has been appraised by a bank." },
    ],
    mix: {
      title: "Share of revenue from operations by business model, 9M FY26 (Apr-Dec 2025)",
      source: "DRHP (25 May 2026), via IPO Guru and Kotak Neo",
      slices: [
        { label: "Contract manufacturing", value: 75.31 },
        { label: "Job work", value: 20.92 },
        { label: "Own manufacturing and sales", value: 1.12 },
        { label: "Trading and services", value: 2.65 },
      ],
    },
  },

  industry: {
    narrative: [
      "Matangi's demand follows the tyre makers it supplies. ICRA (30 Sep 2026) expects domestic tyre demand to grow 5-7% in FY27, led by steady replacement buying, while a spike in raw-material costs on higher crude prices is expected to cut tyre makers' operating margins by about 200 bps.",
      "Natural rubber, Matangi's main input, is used mostly by tyre makers. India used 14.27 lakh tonnes in FY26, about 64% of it in auto tyres, and produced only 9.05 lakh tonnes, so imports fill the gap. Imports of ready-mixed (compounded) rubber jumped from 2.45 to 3.49 lakh tonnes, more competition for local compound makers.",
    ],
    chart: {
      title: "Natural rubber used in India (all uses)",
      unit: "lakh tonnes",
      source: "Rubber Board, via Tyre Trends (Oct 2024, May 2026)",
      points: [
        { label: "FY24", value: 14.16 },
        { label: "FY25", value: 14.1 },
        { label: "FY26", value: 14.27 },
      ],
    },
    snapshot: [
      { label: "Domestic tyre demand growth, FY27E (ICRA)", value: "5-7%", tone: "pos" },
      { label: "Tyre makers' operating margin, FY27E (ICRA)", value: "~200 bps lower YoY", tone: "neg" },
      { label: "Auto tyres' share of natural rubber use, FY26", value: "~64% (auto tyre use down 4.0%)", tone: "neutral" },
      { label: "Natural rubber production, FY26", value: "9.05 lakh tonnes (+3.4%)", tone: "neutral" },
      { label: "Compounded rubber imports, FY26", value: "3.49 lakh tonnes (2.45 in FY25)", tone: "neg" },
      { label: "Tyre imports, Q1 FY27 (ICRA)", value: "+22% YoY, under 5% of demand", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements (FY24 standalone), via Chittorgarh, Kotak Neo and Trendlyne",
    years: [
      { label: "FY24", revenue: 90.1, ebitda: 10.4, pat: 4.8 },
      { label: "FY25", revenue: 101.3, ebitda: 30.9, pat: 20.0 },
      { label: "FY26", revenue: 129.8, ebitda: 35.1, pat: 22.3 },
      { label: "Q1 FY27", revenue: 47.7, ebitda: 10.7, pat: 6.4, partial: true },
    ],
    note: "Revenue grew at a 20% CAGR over FY24-26, but FY24 is standalone, so part of the FY25 jump comes from adding the MG Industries subsidiary (bought Oct 2024); FY25 also had ~₹5 Cr of other income. Q1 FY27 revenue was already 37% of FY26's full year, at a lower 22.4% EBITDA margin.",
  },

  kpi: {
    title: "EBITDA margin on revenue from operations",
    unit: "%",
    source: "RHP via Chittorgarh and Angel One",
    points: [
      { label: "FY24", value: 11.52 },
      { label: "FY25", value: 30.49 },
      { label: "FY26", value: 27.02 },
      { label: "Q1 FY27", value: 22.43 },
    ],
  },
  ratios: [
    { label: "PAT margin on total income, FY26", value: "16.9% (13.4% in Q1 FY27)", tone: "pos" },
    { label: "RoNW, FY26", value: "21.0% (32.0% in FY25)", tone: "pos" },
    { label: "ROCE, FY26", value: "15.4%", tone: "neutral" },
    { label: "Net worth, Jun 2026", value: "₹134.1 Cr", tone: "neutral" },
    { label: "Total borrowings, Jun 2026", value: "₹107.0 Cr (debt / equity 0.80x)", tone: "neg" },
    { label: "Cash from operations, FY26", value: "₹3.3 Cr vs PAT ₹22.3 Cr", tone: "neg" },
    { label: "EPS, FY26 (pre-issue shares)", value: "₹9.77 (~17.6x at upper band)", tone: "neutral" },
    { label: "Price to book, Jun 2026 (pre-issue)", value: "~2.9x at upper band", tone: "neutral" },
  ],

  useOfProceeds: [
    { label: "Repay or prepay certain loans", valueCr: 45 },
    { label: "Rubber recycling plant at Bhind, Madhya Pradesh", valueCr: 19.06 },
    { label: "Solid tyre plant at Bhind, Madhya Pradesh", valueCr: 8.44 },
  ],
  proceedsNote:
    "Of the ₹99.10 Cr fresh issue, ₹72.50 Cr has named uses; the rest, after issue expenses, is for general corporate purposes (capped at 25% of gross proceeds). The ₹26.06 Cr OFS goes to the sellers, mostly promoter entity Vandana Rubber & Chemicals. Promoter holding falls from 81.11% to 60.01%.",
  shareholding: [
    { holder: "Radhika Gupta (promoter)", pct: 43.15 },
    { holder: "Mohit Gupta (promoter, CMD)", pct: 14.02 },
    { holder: "Manju Gupta (promoter)", pct: 12.01 },
    { holder: "Vandana Rubber & Chemicals (promoter)", pct: 11.93 },
    { holder: "Other shareholders", pct: 18.89 },
  ],
  sellers: [
    { name: "Vandana Rubber & Chemicals (promoter)", detail: "13.63 lakh shares, ~₹23.44 Cr at the upper band; most of the OFS." },
    { name: "Anju Khanna", detail: "60,000 shares, ~₹1.03 Cr." },
    { name: "Priyanka Khanna", detail: "60,000 shares, ~₹1.03 Cr." },
    { name: "Pratyush Handa", detail: "30,000 shares, ~₹0.52 Cr." },
    { name: "Radhika Gupta (promoter)", detail: "2,150 shares, ~₹0.04 Cr." },
  ],

  peers: [
    { name: "CEAT", ticker: "CEATLTD", note: "Named in the offer document's peer set; a full-range tyre maker many times Matangi's size." },
    { name: "TVS Srichakra", ticker: "TVSSRICHAK", note: "Named in the offer document's peer set; two- and three-wheeler tyre specialist, the market Matangi's own tyres target." },
    { name: "Tolins Tyres", ticker: "TOLINS", note: "Named in the offer document's peer set; a small Kerala maker of tyres and tread rubber, the closest in size to Matangi." },
    { name: "JK Tyre & Industries", ticker: "JKTYRE", note: "Not an offer-document peer but Matangi's key customer; its truck and bus tyre volumes drive flap orders." },
  ],
  valuationNote:
    "At the ₹172 upper band Matangi is valued at ~22x FY26 earnings (~19x on annualised Q1 FY27 profit, per Chittorgarh) and ~3.8x FY26 revenue. Its margins and returns are well above those of the listed tyre makers in the table, but those companies sell their own brands and are not like-for-like. Tolins Tyres, the offer-document peer closest in size, trades well below Matangi on both earnings and sales (see the table).",

  strengths: [
    { title: "Long relationship with JK Tyre", body: "A long-standing supplier of tyre flaps and parts to a large tyre maker, with an agreement that covers contract manufacturing and support services." },
    { title: "Plants near customers", body: "Five plants in Uttarakhand, Madhya Pradesh and Tamil Nadu sit close to the tyre plants they supply, which helps on freight and delivery times." },
    { title: "Three ways to earn", body: "Contract manufacturing, job work and own-brand sales let it work with clients that supply their own rubber or want finished goods." },
    { title: "Returns above listed tyre makers", body: "EBITDA margin of 27% and RoNW of 21% in FY26, with profit up from ₹4.8 Cr in FY24 to ₹22.3 Cr in FY26." },
  ],
  risks: [
    { risk: "Customer concentration: the largest customer gave 59.6% of revenue and the top 10 gave 96.0%; losing or repricing one contract would hit results hard", mitigant: "A long relationship and a written agreement with JK Tyre; new own-brand products widen the base", severity: "high" },
    { risk: "Weak cash conversion: FY26 cash from operations was ₹3.3 Cr against ₹22.3 Cr of profit, and investing outflows were negative in every year shown", mitigant: "₹45 Cr of the fresh issue cuts debt, and Q1 FY27 operating cash flow was ₹6.3 Cr", severity: "medium" },
    { risk: "Execution on new plants: the Bhind recycling and solid tyre projects are greenfield, not appraised by a bank, and new tyre and tube lines are still small", mitigant: "Small projects (₹27.5 Cr) against a ₹134 Cr net worth", severity: "medium" },
    { risk: "Raw-material swings: natural rubber, synthetic rubber and carbon black prices move with crude, and top 10 suppliers are ~74% of purchases", mitigant: "Job work uses client-supplied rubber, which limits exposure on that part", severity: "medium" },
    { risk: "Regional and legal exposure: 85.5% of revenue comes from three states, and there are pending tax and civil cases plus past delays in paying statutory dues", mitigant: "Plants in three states; amounts in the material cases are small against net worth", severity: "low" },
  ],

  outlook: {
    bull: "Own tubes and two- and three-wheeler tyres ramp up, the recycling and solid tyre plants start on time in 2027, the customer base widens, and margins stay in the mid-20s, so earnings grow into a higher multiple.",
    base: "Revenue grows with the new lines while JK Tyre stays the anchor customer, margins settle in the low-to-mid 20s, and debt falls after the IPO, leaving the valuation near where it lists.",
    bear: "The main customer cuts or reprices contract work, rubber costs squeeze margins, and new plants run late or below capacity, so cash flow stays weak and the stock de-rates.",
  },
  sources: [
    { title: "Matangi Rubber Limited - Red Herring Prospectus", source: "Matangi Rubber (company site)", url: "https://matangirubber.com/wp-content/uploads/2026/11/Matangi_Red-Herring-Prospectus.pdf", year: "2026" },
    { title: "Matangi Rubber IPO: dates, price band, issue details and restated financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/matangi-rubber-ipo/3136/", year: "2026" },
    { title: "Matangi Rubber IPO details, financials and risks", source: "Kotak Neo", url: "https://www.kotakneo.com/ipo/matangi-rubber-ltd-ipo/", year: "2026" },
    { title: "Matangi Rubber IPO gets SEBI nod for 72.76 lakh-share issue", source: "Kotak Neo", url: "https://www.kotakneo.com/news/ipos/matangi-rubber-ipo-sebi-nod-72-76-lakh-share-issue/", year: "2026" },
    { title: "Matangi Rubber Ltd IPO: quarterly and annual financials", source: "Trendlyne", url: "https://trendlyne.com/ipo/detail/2454/matangi-rubber-ltd/", year: "2026" },
    { title: "Matangi Rubber IPO: DRHP analysis", source: "Equity Research India", url: "https://www.equityresearchindia.com/post/matangi-rubber-ipo-dhrp-analysis", year: "2026" },
    { title: "Rising raw material costs to weigh on tyre industry profitability in FY2027", source: "ICRA", url: "https://www.icra.in/Research/ViewResearchReport/rising-raw-material-costs-to-weigh-on-tyre-industry-profitability-in-fy2027/7142", year: "2026" },
    { title: "Rubber Board panel reports 3.4% rise in India's natural rubber production", source: "Tyre Trends", url: "https://www.tyre-trends.com/materials/rubber-board-panel-reports-3-4-rise-in-indias-natural-rubber-production/", year: "2026" },
  ],
};
