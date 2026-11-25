import type { IpoReport } from "./types";

// Encube Ethicals Ltd. Figures from the draft abridged prospectus filed with the DRHP dated 1 Aug 2026 and
// filed on 3 Aug (SEBI, restated consolidated) unless a field names another source. Status as reported to 25 Nov 2026:
// SEBI observations on 4 Nov 2026; no RHP, price band or dates yet. One tracker lists 3-7 Dec 2026, which
// no other source confirms, so the deck stays at "approved" until an RHP is filed.
export const encubeEthicals: IpoReport = {
  slug: "encube-ethicals",
  name: "Encube Ethicals",
  legalName: "Encube Ethicals Limited",
  icon: "ENC",
  sectorLabel: "Pharma formulations & CDMO",
  sectorSlug: "pharma",
  tagline: "A Mumbai maker of creams, gels and patches for the US and Europe, coming with a ₹3,000 Cr offer for sale",
  asOf: "Nov 2026",

  status: {
    stage: "approved",
    label: "SEBI approved",
    detail:
      "SEBI issued its observation letter on 4 Nov 2026, three months after the DRHP was filed, and the approval is valid for 12 months. The company has started investor meetings, but no RHP, price band or dates have been filed; one IPO tracker lists 3-7 Dec 2026, which no other source confirms.",
  },
  timeline: [
    { date: "3 Aug 2026", event: "DRHP (dated 1 Aug) filed with SEBI for a ₹3,000 Cr offer for sale (no fresh issue)", done: true },
    { date: "4 Nov 2026", event: "SEBI observation letter issued", done: true },
    { date: "Nov 2026", event: "Investor meetings under way; Bloomberg had flagged a late-November launch that has not come", done: true },
    { date: "Dec 2026", event: "RHP with price band and dates awaited; a 3-7 Dec window is unconfirmed", done: false },
    { date: "Nov 2027", event: "SEBI observation lapses if the issue has not opened", done: false },
  ],

  issue: {
    size: "₹3,000 Cr (all offer for sale)",
    totalCr: 3000,
    freshCr: 0,
    ofsCr: 3000,
    priceBand: null,
    lotSize: null,
    faceValue: "₹1",
    valuation: null,
    valuationCr: null,
    reservation: "QIB up to 50% · NII at least 15% · Retail at least 35% (the standard split for a company that meets SEBI's profit-track-record test); employee quota",
    exchanges: "BSE, NSE",
    leadManagers: ["JM Financial", "Axis Capital", "Kotak Mahindra Capital"],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Strong numbers, price still unknown",
    tone: "neutral",
    line: "Revenue grew 30% a year over FY24-26 and the EBITDA margin widened to 36%, but the whole issue is an exit by the founder and Quadria, the US brings in two-thirds of sales, and one plant in Goa makes 85% of revenue.",
  },
  keyStats: [
    { label: "Issue size", value: "₹3,000 Cr", sub: "All offer for sale; the company gets no money" },
    { label: "Revenue, FY26", value: "₹1,849 Cr", sub: "+37.5% YoY; 30.5% CAGR over FY24-26" },
    { label: "Profit, FY26", value: "₹437 Cr", sub: "+75% YoY; 23.6% of revenue" },
    { label: "Return on net worth, FY26", value: "25.2%", sub: "ROCE 32.3%; borrowings only 0.11x net worth" },
  ],
  thesis: [
    {
      title: "A fast-growing US topical generics business",
      body: "Global Generics revenue rose from ₹351 Cr in FY24 to ₹862 Cr in FY26, a 56.6% yearly growth rate, and is now the largest vertical. Encube had 57 US drug approvals (ANDAs) by Mar 2026, up from 30 two years earlier, and a pipeline of 43 more.",
    },
    {
      title: "Hard-to-make products sold mostly in regulated markets",
      body: "Creams, ointments, gels and skin patches are harder to copy than tablets. The Goa plant is approved by 11 regulators, including the USFDA, EU and Japan, and the contract-manufacturing arm serves 160+ drug companies in 50 countries.",
    },
    {
      title: "An exit, not a capital raise",
      body: "All ₹3,000 Cr goes to the sellers: founder Mehul Shah sells ₹2,000 Cr (his cost is ₹0.08 a share after bonuses) and Quadria Capital's Frontier Investment Holdings sells ₹1,000 Cr (cost ₹199.31). Low debt means the company does not need the money.",
    },
  ],

  business: {
    narrative: [
      "Encube Ethicals, founded in 1995 by Mehul Shah, makes topical and transdermal medicines: creams, ointments, gels, lotions, powders, sprays and skin patches. It sells to 50 countries, with the US alone giving 64.7% of FY26 revenue.",
      "It earns money three ways. It sells its own generic topicals in the US to wholesalers, buying groups and pharmacy chains. It develops and makes topicals for other drug companies under contract (CDMO). And in India it sells branded products, led by the Soframycin skin-care franchise.",
      "Production sits in two plants, in Goa and Indore, with 807 million units a year of filling and packing capacity; the Goa plant made 85% of FY26 revenue. Research runs from a USFDA-approved centre in Palava, Mumbai, with 228 staff.",
    ],
    segments: [
      { title: "Global Generics", metric: "₹862 Cr · +58.5% in FY26", body: "Own-label generic topicals sold in the US through its own front end; 51 ANDAs commercialised by Mar 2026, with expansion planned into the UK and Germany (25 dossiers in the pipeline)." },
      { title: "Global CDMO", metric: "₹783 Cr · +21.7% in FY26", body: "Develops and makes topicals for 160+ drug companies across 50 countries, with 550+ products. It was the largest vertical until FY25 and grew more slowly than generics." },
      { title: "India Branded Formulations", metric: "₹166 Cr · +25.8% in FY26", body: "Domestic branded and generic products led by Soframycin, revived with new formats such as powders and sprays; the company plans acquisitions and in-licensing here." },
      { title: "Manufacturing and R&D", metric: "807 Mn units capacity", body: "Two plants (Goa and Indore) and an R&D centre in Palava. Capital spending was ₹227 Cr in FY26 and R&D 7.4% of revenue." },
    ],
    mix: {
      title: "Share of FY26 revenue from operations by vertical",
      source: "Draft abridged prospectus (DRHP, 1 Aug 2026), segment table",
      slices: [
        { label: "Global Generics", value: 46.61 },
        { label: "Global CDMO", value: 42.34 },
        { label: "India Branded Formulations", value: 8.97 },
        { label: "Other operating revenue", value: 2.08 },
      ],
    },
  },

  industry: {
    narrative: [
      "Frost & Sullivan, in the report commissioned for the DRHP, sizes the global market for topical medicines at US$59bn in FY26, up from US$43bn in FY21, and expects US$86bn by FY31. Generics are 78% of it.",
      "Contract manufacturing of topicals was a US$5bn market in FY26, expected to reach US$8bn by FY31, growing faster than contract manufacturing as a whole as more drug companies outsource. India's own topical market is ₹14,500 Cr, expected to grow about 9% a year.",
    ],
    chart: {
      title: "Global topical medicines market",
      unit: "US$ bn",
      source: "Frost & Sullivan report in the Encube Ethicals DRHP (FY31F is a forecast)",
      points: [
        { label: "FY21", value: 43 },
        { label: "FY26", value: 59 },
        { label: "FY31F", value: 86, projected: true },
      ],
    },
    snapshot: [
      { label: "Global topical market growth, FY21-31F", value: "7.2% CAGR", tone: "pos" },
      { label: "Generics' share of the topical market, FY26", value: "78% (US$46bn)", tone: "neutral" },
      { label: "Topical CDMO market, FY26 to FY31F", value: "US$5bn to US$8bn", tone: "pos" },
      { label: "Topical CDMO vs all CDMO growth, FY16-31F", value: "8.0% vs 5.95% a year", tone: "pos" },
      { label: "India topical market, FY26 to FY31F", value: "₹14,500 Cr to ₹22,400 Cr (9.15% CAGR)", tone: "neutral" },
    ],
  },

  financials: {
    source: "DRHP restated consolidated statements (draft abridged prospectus, SEBI, 1 Aug 2026); cross-checked with Chittorgarh and Groww",
    years: [
      { label: "FY24", revenue: 1086, ebitda: 298, pat: 156 },
      { label: "FY25", revenue: 1345, ebitda: 452, pat: 250 },
      { label: "FY26", revenue: 1849, ebitda: 663, pat: 437 },
    ],
    note: "Revenue grew 30.5% a year over FY24-26 and EBITDA 49% a year as US generics scaled up; the EBITDA margin rose from 27.4% to 35.9%. EBITDA here excludes other income, and aggregators such as Chittorgarh show total income (₹1,911.8 Cr in FY26), not revenue from operations. No stub period is in the DRHP.",
  },

  kpi: {
    title: "US drug approvals (ANDAs), cumulative",
    unit: "approvals",
    source: "DRHP KPI table (draft abridged prospectus)",
    points: [
      { label: "FY24", value: 30 },
      { label: "FY25", value: 43 },
      { label: "FY26", value: 57 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "35.9% (27.4% in FY24)", tone: "pos" },
    { label: "Return on net worth, FY26", value: "25.21% (13.24% in FY24)", tone: "pos" },
    { label: "ROCE, FY26", value: "32.3%", tone: "pos" },
    { label: "Net worth, Mar 2026", value: "₹1,954 Cr", tone: "neutral" },
    { label: "Total borrowings, Mar 2026", value: "₹222 Cr (0.11x net worth)", tone: "pos" },
    { label: "Operating cash flow, FY26", value: "₹303 Cr (69% of profit)", tone: "neutral" },
    { label: "Net working capital, FY26", value: "143 days of revenue", tone: "neg" },
    { label: "Diluted EPS, FY26", value: "₹14.36 (NAV ₹64.29 a share)", tone: "neutral" },
  ],

  useOfProceeds: [],
  proceedsNote:
    "The issue is a pure offer for sale: the ₹3,000 Cr goes to the two selling shareholders after their share of issue costs, and Encube receives nothing. The DRHP gives listing benefits (visibility and a market for the shares) as the only object. The share count stays at 30.39 crore after the issue.",
  shareholding: [
    { holder: "Mehul Madhusudan Shah (promoter)", pct: 61.15 },
    { holder: "Other promoter group (Niti Shah, Mansi Kampani, Niloni Shah and others)", pct: 19.48 },
    { holder: "Frontier Investment Holdings (Quadria Capital)", pct: 15.02 },
    { holder: "Other shareholders and ESOPs", pct: 4.35 },
  ],
  sellers: [
    { name: "Mehul Madhusudan Shah (promoter)", detail: "Up to ₹2,000 Cr; weighted average cost ₹0.08 a share (most shares came through bonus issues or gifts). Founder, chairman and MD since 1995." },
    { name: "Frontier Investment Holdings (Quadria Capital)", detail: "Up to ₹1,000 Cr; weighted average cost ₹199.31 a share on a 15.02% stake; has a nominee director on the board." },
  ],

  peers: [
    { name: "Glenmark Pharmaceuticals", ticker: "GLENMARK", note: "Generics major with a large dermatology and topicals business." },
    { name: "Zydus Lifesciences", ticker: "ZYDUSLIFE", note: "Large US generics player that also sells topical and transdermal products." },
    { name: "Lupin", ticker: "LUPIN", note: "US-heavy generics major named in the DRHP's peer set." },
    { name: "Rubicon Research", ticker: "RUBICON", note: "Recently listed US specialty-generics maker closer to Encube's size." },
    { name: "OneSource Specialty Pharma", ticker: "ONESOURCE", note: "Listed CDMO, the nearest comparison for the contract arm." },
    { name: "Gland Pharma", ticker: "GLAND", note: "In the DRHP's peer set; it makes injectables rather than topicals, but like Encube's contract arm it sells mainly to other drug companies." },
  ],
  valuationNote:
    "With no price band yet, the issue's P/E is unknown. Encube's FY26 EBITDA margin and return on equity are higher than those of the large generic makers in the DRHP's peer set (see the table for their current multiples). In the year before the DRHP the highest price paid for its shares was ₹493.33 each, adjusted for split and bonus, which works out to about ₹15,000 Cr on today's share count; that is a reference point, not the issue price.",

  strengths: [
    { title: "Large, regulator-approved plants", body: "Filling capacity of 807 million units a year, which F&S puts at about 2.8x total US topical demand, in plants cleared by 11 regulators including the USFDA, EU GMP, Japan PMDA and Health Canada." },
    { title: "An R&D pipeline that turns into products", body: "73 US filings and 57 approvals by Mar 2026, with 14 approvals in FY26 alone; 228 people work in research." },
    { title: "Its own US sales front end", body: "It sells generics under its own name in the US, not only makes them for others, and that arm is now the largest; EBITDA before R&D rose from 38.5% of revenue in FY24 to 43.3% in FY26." },
    { title: "Long-standing customers that buy more each year", body: "160+ contract customers in 50 countries, with the company reporting a rising share of their spending; borrowings are low at 0.11x net worth." },
  ],
  risks: [
    { risk: "Concentration: the US gave 64.7% of FY26 revenue, the top five customers 42.8% and the top ten 59.7%", mitigant: "Customers span 50 countries, and the top-five share has stayed near 43% for three years", severity: "high" },
    { risk: "One plant does most of the work: Goa made 85.1% of FY26 revenue, so a bad USFDA inspection or shutdown there would hit sales hard", mitigant: "Goa holds 11 regulatory approvals, and Indore is a second site", severity: "high" },
    { risk: "US generic prices: more competitors on a topical product can cut prices quickly, and two verticals make up 89% of revenue", mitigant: "Topicals are harder to copy than tablets, and new approvals (14 in FY26) add products", severity: "medium" },
    { risk: "Cash lags profit: operating cash flow was ₹303 Cr against ₹437 Cr of profit in FY26, with working capital at 143 days of revenue", mitigant: "Borrowings are just ₹222 Cr, and FY26 capex was covered by operating cash flow", severity: "medium" },
    { risk: "A pure exit at an unknown price: insiders sell ₹3,000 Cr, the founder at a near-zero cost, and the company also faces 37 tax cases (about ₹113 Cr in all, with one civil case)", mitigant: "The promoter group holds 80.63% before the issue, and the RHP must set out the basis for the price", severity: "medium" },
  ],

  outlook: {
    bull: "US generics keep growing 30%+ as new approvals launch, the UK and Germany add a second front, CDMO demand stays strong, and the 36% margin holds, justifying a premium to generic majors.",
    base: "Growth slows to the high teens as the US base gets bigger, margins stay in the low-to-mid 30s, and the stock trades in line with specialty pharma peers once the price is set.",
    bear: "US price erosion or a regulatory issue at Goa hits the two big verticals at once, cash conversion stays weak, and the stock de-rates toward generic-major multiples after a full IPO price.",
  },
  sources: [
    { title: "Encube Ethicals Limited - DRHP and draft abridged prospectus", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/aug-2026/encube-ethicals-limited-drhp_103383.html", year: "2026" },
    { title: "Encube Ethicals IPO details, dates and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/encube-ethicals-ipo/3211/", year: "2026" },
    { title: "Encube Ethicals, MakeMyTrip (India) receive SEBI approval for IPOs", source: "Groww", url: "https://groww.in/blog/encube-ethicals-make-my-trip-india-receive-sebi-approval-for-ipos", year: "2026" },
    { title: "Encube Ethicals files DRHP with SEBI; eyes ₹3,000 Cr OFS issue", source: "Business Today", url: "https://www.businesstoday.in/markets/ipo-corner/story/encube-ethicals-filed-drhp-with-sebi-to-launch-ipo-eyes-rs-3000-crore-ofs-issue-546841-2026-08-03", year: "2026" },
    { title: "Quadria Capital-backed Encube Ethicals files DRHP for ₹3,000 Cr IPO", source: "Kotak Neo", url: "https://www.kotakneo.com/news/ipos/encube-ethicals-drhp-3000-crore-ipo-quadria-capital-pharma-2026/", year: "2026" },
    { title: "Encube Ethicals IPO gets SEBI nod", source: "INDmoney", url: "https://www.indmoney.com/blog/ipo/encube-ethicals-ipo-sebi-approval", year: "2026" },
    { title: "Encube Ethicals kicks off IPO meetings in Mumbai (Bloomberg)", source: "Finimize", url: "https://finimize.com/content/encube-ethicals-kicks-off-ipo-meetings-in-mumbai", year: "2026" },
    { title: "Encube Ethicals IPO review and peer comparison", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo-recommendation/encube-ethicals-ipo/3211/", year: "2026" },
  ],
};
