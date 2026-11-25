import type { IpoReport } from "./types";

// Monomark Engineering (India) Ltd. Figures from the RHP dated 21 Nov 2026 (restated consolidated,
// on the BRLM Holani Consultants' site) unless a field names another source; price band, lot and
// dates as reported by Chittorgarh and Kotak Neo (Nov 2026).
export const monomarkEngineering: IpoReport = {
  slug: "monomark-engineering",
  name: "Monomark Engineering",
  legalName: "Monomark Engineering (India) Limited",
  icon: "MEI",
  sectorLabel: "Industrial O&M & engineering services",
  tagline: "A Chittorgarh-based plant operations and maintenance contractor, mostly for Vedanta group metal plants, raising ₹175.5 Cr for working capital",
  asOf: "Nov 2026",

  status: {
    stage: "upcoming",
    label: "Opens 2 Dec",
    detail:
      "SEBI cleared the DRHP on 4 Sep 2026 and the RHP is dated 21 Nov 2026. The ₹175.5 Cr all-fresh issue (₹60-65 band) takes anchor bids on 1 Dec, is open from 2 to 4 Dec, with allotment on 7 Dec and listing on NSE and BSE planned for 9 Dec 2026. It is a mainboard issue, not SME.",
  },
  timeline: [
    { date: "30 Mar 2026", event: "DRHP filed with SEBI, BSE and NSE for 2.70 crore fresh shares", done: true },
    { date: "4 Sep 2026", event: "SEBI observations received", done: true },
    { date: "21 Nov 2026", event: "RHP filed; price band later set at ₹60-65, lot of 225 shares", done: true },
    { date: "1 Dec 2026", event: "Anchor investor bidding", done: false },
    { date: "2 Dec 2026", event: "Issue opens", done: false },
    { date: "4 Dec 2026", event: "Issue closes", done: false },
    { date: "7 Dec 2026", event: "Basis of allotment finalised", done: false },
    { date: "9 Dec 2026", event: "Listing on NSE and BSE (tentative)", done: false },
  ],

  issue: {
    size: "₹175.50 Cr at the ₹65 upper band (2.70 crore fresh shares)",
    totalCr: 175.5,
    freshCr: 175.5,
    ofsCr: 0,
    priceBand: "₹60 - 65",
    lotSize: "225 shares (₹14,625 at the upper band)",
    faceValue: "₹10",
    valuation: "~₹624 Cr post-issue market cap at ₹65 (9,60,41,200 shares); ~₹576 Cr at ₹60",
    valuationCr: 624,
    reservation: "QIB up to 50% · NII at least 15% · Retail at least 35% (Regulation 6(1) issue)",
    exchanges: "BSE, NSE",
    leadManagers: ["Holani Consultants"],
    registrar: "Bigshare Services",
  },

  stance: {
    label: "Steady contracts, one customer group",
    tone: "neutral",
    line: "Revenue has grown ~20% a year on multi-year plant contracts, but about 78% of it comes from the Vedanta group, margins are thin and Q1 FY27 was weak; at ~24x FY26 earnings after the issue, the price assumes those contracts keep renewing.",
  },
  keyStats: [
    { label: "Issue size", value: "₹175.5 Cr", sub: "All fresh issue at ₹60-65; no offer for sale" },
    { label: "Valuation at upper band", value: "~₹624 Cr", sub: "~24x FY26 PAT and ~1.1x FY26 revenue, post-issue" },
    { label: "Revenue, FY26", value: "₹561.9 Cr", sub: "+18.3% YoY; PAT ₹25.9 Cr (+42%)" },
    { label: "Unexecuted order book, Sep 2026", value: "₹1,762 Cr", sub: "~3.1x FY26 revenue; 28 ongoing projects" },
  ],
  thesis: [
    {
      title: "Multi-year plant contracts with a metals major",
      body: "Monomark has worked for Hindustan Zinc since 2010. O&M contracts run two to five years, and O&M rose from 64% of revenue in FY24 to 80% in FY26. The ₹1,762 Cr unexecuted order book (Sep 2026) is about three years of FY26 revenue.",
    },
    {
      title: "Growing fast, earning thin margins",
      body: "Revenue grew from ₹390 Cr in FY24 to ₹562 Cr in FY26, about 20% a year, and PAT from ₹14.8 Cr to ₹25.9 Cr. But this is a labour-heavy service: EBITDA margin is ~8-9% and PAT margin 4.6%, so small cost or pricing changes move profit a lot.",
    },
    {
      title: "An IPO to fund working capital, not an exit",
      body: "₹120 Cr of the ₹175.5 Cr raised goes to working capital, which banks fund today (58% of the FY26 gap). Nobody sells shares; the promoter family's stake falls from 91.4% to 65.7% through dilution alone.",
    },
  ],

  business: {
    narrative: [
      "Monomark Engineering, set up in 2005 in Chittorgarh, Rajasthan, runs and maintains parts of large industrial plants for their owners. In its biggest line, production-linked O&M, the client owns the plant and supplies the raw material, while Monomark's crews run the machines and are paid per unit of output, with a minimum volume.",
      "It also erects and commissions plant equipment (project execution) and fabricates metal components at a 4,000 MT a year plant in Kapasan, Chittorgarh. A fleet of 232 owned vehicles and machines (forklifts, cranes, excavators, hydras) and about 6,800 staff (Jun 2026) support the work.",
      "The customer base is narrow. Vedanta group companies, led by Hindustan Zinc, paid ₹437.5 Cr or 77.9% of FY26 revenue; metals clients as a whole were 83.7%. Three quarters of revenue comes from Rajasthan, and a UAE subsidiary serves a Vedanta unit in Fujairah.",
    ],
    segments: [
      { title: "Industrial operations and maintenance (O&M)", metric: "80.1% of FY26 revenue", body: "₹450 Cr in FY26, of which ₹286 Cr was production-linked (running plant sections for output-based fees) and ₹164 Cr plant maintenance. 21 O&M projects were ongoing in Sep 2026." },
      { title: "Industrial project execution", metric: "16.9% of FY26 revenue", body: "Full EPC jobs or on-site fabrication, erection and commissioning of equipment supplied by OEMs. Revenue fell to ₹95 Cr in FY26 from ₹129 Cr in FY25; 7 projects were ongoing." },
      { title: "Metal fabrication", metric: "22% plant utilisation, FY26", body: "Sheet-metal and structural components for OEMs from the 4,000 MT Kapasan plant. Output fell from 2,812 MT in FY24 to 888 MT in FY26 and revenue to ₹13 Cr, as work shifted to O&M." },
      { title: "Order book", metric: "₹1,762 Cr unexecuted, Sep 2026", body: "₹1,696 Cr of it is O&M and ₹65 Cr project work. New contracts won rose to ₹500 Cr in FY26; most work is won directly from clients rather than through tenders." },
      { title: "Vedanta group dependence", metric: "77.9% of FY26 revenue", body: "Hindustan Zinc alone was 35.4% of FY26 revenue and 41.3% in Q1 FY27; the top ten customers were 91.2%. Adani, Aditya Birla, Shree Cement and L&T group firms make up much of the rest." },
    ],
    mix: {
      title: "Share of FY26 revenue from operations by segment",
      source: "RHP (21 Nov 2026), Our Business - segment-wise revenue",
      slices: [
        { label: "Industrial O&M services", value: 80.14 },
        { label: "Industrial project execution", value: 16.89 },
        { label: "Metal fabrication", value: 2.32 },
        { label: "Job work and trading", value: 0.65 },
      ],
    },
  },

  industry: {
    narrative: [
      "Dun & Bradstreet, in the report commissioned for the IPO, sizes India's industrial O&M services market at about US$3.46 Bn in FY26, up from US$2.74 Bn in FY22 (6% a year), and expects US$4.76 Bn by FY31 (6.6% a year). Power, oil and gas, metals, cement and process plants are the main buyers.",
      "Demand rises as ageing plants need more upkeep and as companies outsource work that needs skilled crews and safety compliance. Cement makers alone plan about ₹1.2 lakh Cr of capex over FY26-28. The market is fragmented, with many small contractors competing on price, while large engineering groups such as L&T lead in project execution.",
    ],
    chart: {
      title: "India industrial O&M services market",
      unit: "US$ Bn",
      source: "D&B report in the Monomark Engineering RHP (FY26 estimated, FY28 and FY31 forecast)",
      points: [
        { label: "FY22", value: 2.74 },
        { label: "FY23", value: 2.89 },
        { label: "FY24", value: 3.06 },
        { label: "FY25", value: 3.25 },
        { label: "FY26E", value: 3.46, projected: true },
        { label: "FY28F", value: 3.92, projected: true },
        { label: "FY31F", value: 4.76, projected: true },
      ],
    },
    snapshot: [
      { label: "O&M market growth, FY26-31F (D&B)", value: "6.6% CAGR", tone: "pos" },
      { label: "O&M market size, FY31F", value: "US$4.76 Bn", tone: "neutral" },
      { label: "Cement capex planned, FY26-28", value: "~₹1.2 lakh Cr", tone: "pos" },
      { label: "India installed power capacity, Mar 2026", value: "532.7 GW", tone: "neutral" },
      { label: "Market structure", value: "Fragmented; price competition", tone: "neg" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements (21 Nov 2026), Holani Consultants; cross-checked with Chittorgarh",
    years: [
      { label: "FY24", revenue: 390, ebitda: 31.9, pat: 14.8 },
      { label: "FY25", revenue: 475, ebitda: 39.3, pat: 18.2 },
      { label: "FY26", revenue: 562, ebitda: 48.7, pat: 25.9 },
      { label: "Q1 FY27", revenue: 142, ebitda: 7.7, pat: 3.0, partial: true },
    ],
    note: "Revenue grew at ~20% a year over FY24-26 and PAT at ~32%, while EBITDA margin rose only from 8.2% to 8.7%. Q1 FY27 margin fell to 5.4%; the RHP says the first quarter is usually weakest because clients schedule annual plant shutdowns. Aggregators such as Chittorgarh show total income (₹564.7 Cr in FY26), not revenue from operations.",
  },

  kpi: {
    title: "Value of new contracts won",
    unit: "₹ Cr",
    source: "RHP operational KPIs (auditor-certified)",
    points: [
      { label: "FY24", value: 331.5 },
      { label: "FY25", value: 422.9 },
      { label: "FY26", value: 499.9 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "8.67% (5.41% in Q1 FY27)", tone: "neutral" },
    { label: "PAT margin, FY26", value: "4.61% (2.12% in Q1 FY27)", tone: "neutral" },
    { label: "RoE, FY26 (on average equity)", value: "27.3%", tone: "pos" },
    { label: "RoCE, FY26", value: "21.5%", tone: "pos" },
    { label: "Net worth, Jun 2026", value: "₹119.3 Cr (₹22.6 Cr raised privately in Jul 2025)", tone: "neutral" },
    { label: "Total borrowings, Jun 2026", value: "₹92.1 Cr (~0.77x equity)", tone: "neutral" },
    { label: "Operating cash flow, FY26", value: "₹8.1 Cr vs ₹25.9 Cr PAT", tone: "neg" },
    { label: "Contingent liabilities, Jun 2026", value: "₹56.5 Cr (47% of net worth)", tone: "neg" },
  ],

  useOfProceeds: [
    { label: "Incremental working capital (₹82.5 Cr in FY27, ₹37.5 Cr in FY28)", valueCr: 120 },
    { label: "General corporate purposes and issue expenses (balance at the upper band)", valueCr: 55.5 },
  ],
  proceedsNote:
    "All ₹175.5 Cr is a fresh issue, so the money goes to the company. ₹120 Cr funds working capital, which banks fund today. The RHP leaves the general-corporate amount and issue expenses blank until pricing; general corporate purposes cannot exceed 25% of gross proceeds. A ₹22.6 Cr private placement at ₹38 a share to 31 investors (Jul 2025) came before the IPO.",
  shareholding: [
    { holder: "Narendra Chordia (promoter)", pct: 45.62 },
    { holder: "Meena Chordia (promoter)", pct: 30.42 },
    { holder: "Nitesh Chordia (promoter)", pct: 8.64 },
    { holder: "Gaurav Chordia (promoter)", pct: 6.69 },
    { holder: "Private placement investors (31, Jul 2025)", pct: 8.63 },
  ],
  sellers: [],

  peers: [
    { name: "Thermax", ticker: "THERMAX", note: "Listed peer named in the RHP; energy and environment equipment with plant services and outsourced utilities for metals and cement." },
    { name: "Larsen & Toubro", ticker: "LT", note: "Leader in industrial EPC and mechanical construction per the RHP's industry report; far larger and more diversified." },
    { name: "KEC International", ticker: "KEC", note: "Named in the RHP's industry report for steel fabrication; an EPC contractor with similarly thin margins." },
    { name: "Quess Corp", ticker: "QUESS", note: "Manpower-led outsourced services; the closest listed model for a labour-heavy contract business." },
  ],
  valuationNote:
    "At ~24x FY26 earnings after the issue (~17x on the pre-issue share count), Monomark is priced below Thermax and L&T on P/E but above KEC and Quess, which run similar thin-margin, contract-led models. On sales (~1.1x) it sits between the contractors and the larger engineering groups (see the table). The offer document also names Power Mech Projects, Thejo Engineering and ANI Integrated Services as peers.",

  strengths: [
    { title: "One contractor across the plant's life", body: "It offers plant operation and maintenance, project erection and metal fabrication together, so a client can use one vendor instead of several." },
    { title: "Long, repeat relationships", body: "Hindustan Zinc has been a client since 2010, and 87-94% of yearly revenue in FY24-26 came from clients billed the year before." },
    { title: "Own fleet and large workforce", body: "232 owned vehicles and machines and about 6,800 staff let it mobilise crews quickly instead of depending on hired equipment." },
    { title: "Visible order book", body: "₹1,762 Cr of unexecuted orders in Sep 2026, mostly multi-year O&M contracts, with ISO 9001, 14001 and 45001 certifications." },
  ],
  risks: [
    { risk: "Customer concentration: the Vedanta group paid 77.9% of FY26 revenue (Hindustan Zinc 35.4%), the top ten customers 91.2%, and Rajasthan 75%", mitigant: "A 16-year relationship and multi-year contracts; some Hindustan Zinc contracts guarantee 90% of the allotted annual volume", severity: "high" },
    { risk: "Thin, fixed-price margins: contract rates are mostly fixed for the term while wages are 56% of FY26 expenses; Q1 FY27 EBITDA margin fell to 5.4%", mitigant: "The first quarter is seasonally weak due to clients' annual shutdowns, per the RHP", severity: "medium" },
    { risk: "Cash conversion: operating cash flow was ₹8.1 Cr against ₹25.9 Cr PAT in FY26, and unbilled revenue jumped to 43% of Q1 FY27 revenue", mitigant: "₹120 Cr of the issue funds working capital and reduces reliance on bank lines", severity: "medium" },
    { risk: "Workforce and safety: one fatal accident in FY26, ~91% attrition among project staff and a ₹20.3 Cr unfunded gratuity liability (Jun 2026)", mitigant: "Workmen's compensation cover of ₹273 Cr and ISO 45001 safety certification", severity: "medium" },
    { risk: "Contingent liabilities of ₹56.5 Cr (47% of net worth) and a fabrication plant running at 22% of capacity", mitigant: "Fabrication is now only ~2% of revenue, so idle capacity weighs little on profit", severity: "low" },
  ],

  outlook: {
    bull: "Vedanta group contracts renew and new clients such as Adani Ports scale up, the order book converts at 20%+ growth, and working-capital funding lifts margins back toward 9%, making the issue price look modest.",
    base: "Revenue grows in the mid-teens as the order book is billed, margins stay around 8%, and the stock trades in line with small contract-led service peers.",
    bear: "A Vedanta or Hindustan Zinc contract is cut or re-priced, wage costs outrun fixed rates, and receivables stretch, so earnings fall and a ~24x multiple compresses quickly.",
  },
  sources: [
    { title: "Monomark Engineering (India) Limited - Red Herring Prospectus (21 Nov 2026)", source: "Holani Consultants (BRLM)", url: "https://www.holaniconsultants.co.in/download/ipo/RHP%20Monomark.pdf", year: "2026" },
    { title: "Monomark Engineering - addendum to the DRHP dated 30 Mar 2026", source: "SEBI", url: "https://www.sebi.gov.in/sebi_data/commondocs/sep-2026/Monomark%20Engineering%20-%20ADRHP_p.pdf", year: "2026" },
    { title: "Monomark Engineering (India) IPO dates, price band, financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/monomark-engineering-ipo/2972/", year: "2026" },
    { title: "Monomark Engineering India IPO details", source: "Kotak Neo", url: "https://www.kotakneo.com/ipo/monomark-engineering-india-ipo/", year: "2026" },
    { title: "SEBI clears Monomark Engineering, RKB Global IPOs", source: "Kotak Neo", url: "https://www.kotakneo.com/news/regulations/sebi-clears-monomark-engineering-rkb-global-ipos/", year: "2026" },
    { title: "Monomark Engineering (India) Limited files DRHP with BSE, NSE", source: "The Tribune", url: "https://www.tribuneindia.com/news/business/monomark-engineering-india-limited-files-drhp-with-bse-nse/", year: "2026" },
    { title: "Upcoming IPOs: Monomark Engineering, 2-4 Dec, ₹60-65, mainboard", source: "IPO Watch", url: "https://ipowatch.in/?p=138932", year: "2026" },
  ],
};
