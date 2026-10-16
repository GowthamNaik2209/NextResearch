import type { IpoReport } from "./types";

// PRISM (formerly Oravel Stays, OYO's parent): confidential pre-filing Dec 2025, SEBI observations
// Jun 2026, UDRHP-I filed 30 Jun 2026. No RHP, price band or dates as of mid-Oct 2026.
// FY23-FY25 and 9M FY26 figures are from the UDRHP-I (as reported); FY26 is from the company's
// annual report as reported by Inc42 (Aug 2026), not yet from an offer document.
export const oyo: IpoReport = {
  slug: "oyo",
  name: "OYO (PRISM)",
  legalName: "PRISM Limited (formerly Oravel Stays Limited)",
  icon: "OYO",
  sectorLabel: "Travel tech & hospitality platforms",
  tagline: "Asset-light hotel and homes platform, now profitable, raising Rs 6,650 Cr to cut debt",
  asOf: "Oct 2026",

  status: {
    stage: "approved",
    label: "SEBI approved",
    detail:
      "SEBI cleared the confidential filing in early June 2026 (reported 2 Jun; one report cites a 5 Jun observation letter) and the UDRHP-I was filed on 30 Jun; no RHP, price band or issue dates had been announced by mid-Oct 2026, after an August-September window floated in some reports passed.",
  },
  timeline: [
    { date: "20 Dec 2025", event: "Shareholders approve Rs 6,650 Cr fresh issue", done: true },
    { date: "Dec 2025", event: "Confidential pre-filing of DRHP with SEBI", done: true },
    { date: "2 Jun 2026", event: "SEBI observations received (reported)", done: true },
    { date: "30 Jun 2026", event: "UDRHP-I filed publicly; 21-day comment period", done: true },
    { date: "Jul 2026", event: "Institutional roadshow begins", done: true },
    { date: "Aug 2026", event: "FY26 results: PAT Rs 994 Cr in annual report", done: true },
    { date: "Pending", event: "RHP, price band and issue dates", done: false },
  ],

  issue: {
    size: "Up to Rs 6,650 Cr (fresh issue)",
    totalCr: 6650,
    freshCr: 6650,
    ofsCr: 0,
    priceBand: null,
    lotSize: null,
    faceValue: null,
    valuation: "Reported US$7-8bn expected valuation (sources cited by Business Standard and Entrackr), ~Rs 66,500-76,000 Cr at ~Rs 95/US$; not a company figure",
    valuationCr: null,
    reservation: null,
    exchanges: "NSE, BSE",
    leadManagers: [
      "Axis Capital",
      "Citigroup Global Markets India",
      "Goldman Sachs (India) Securities",
      "ICICI Securities",
      "SBI Capital Markets",
      "JM Financial",
      "InCred Capital",
      "Intensive Fiscal Services",
    ],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Turnaround, priced later",
    tone: "neutral",
    line: "The business is now profitable and far more global, but profit quality (tax credits), US concentration and legal overhangs need weighing once a price band is set.",
  },
  keyStats: [
    { label: "Fresh issue", value: "Rs 6,650 Cr", sub: "no OFS; up to Rs 1,330 Cr pre-IPO placement" },
    { label: "Revenue, FY26", value: "Rs 9,358 Cr", sub: "+50% YoY (annual report, via Inc42)" },
    { label: "Gross booking value, FY26", value: "Rs 30,683 Cr", sub: "+88.5%, G6 full year" },
    { label: "Global storefronts", value: "2.94 lakh", sub: "Dec 2025 (UDRHP-I)" },
  ],
  thesis: [
    {
      title: "From cash-burning aggregator to profitable platform",
      body: "After a Rs 1,287 Cr loss in FY23, PRISM has reported profits for three years running, reaching Rs 994 Cr in FY26. Part of that is a ~Rs 595-678 Cr deferred-tax credit, so operating profit is the cleaner signal.",
    },
    {
      title: "Now mostly a US and Europe business run from India",
      body: "The Dec 2024 purchase of G6 Hospitality (Motel 6, Studio 6) made the US 52% of 9M FY26 bookings; over 80% of revenue comes from outside India while ~76% of staff sit in India.",
    },
    {
      title: "IPO money goes mainly to debt",
      body: "Rs 4,987.5 Cr of the Rs 6,650 Cr is earmarked to repay borrowings at Oravel Stays Singapore. Lower interest (FY25 finance cost ~Rs 959 Cr) is the most direct route to higher reported profit.",
    },
  ],

  business: {
    narrative: [
      "PRISM does not own hotels. It signs up independent hotel and home owners ('patrons'), gives them OYO's software, brands and demand, and earns commissions, franchise fees and subscriptions. Brands include OYO, Townhouse, Sunday, Palette, Motel 6, Studio 6, Belvilla and DanCenter.",
      "Bookings are increasingly direct: ~67-68% of demand comes through its own apps and sites, supported by the OYO Wizard (19 million members) and My6 (7.4 million) loyalty programmes, which keeps online-travel-agency commissions down.",
      "SoftBank's Vision Fund is the largest shareholder (~40%) and founder Ritesh Agarwal controls ~27% directly and through RA Hospitality. No existing shareholder is selling in the IPO.",
    ],
    segments: [
      { title: "Hotels (ex-G6)", metric: "GBV Rs 10,939 Cr, FY26 (+36.5%)", body: "22,769 hotel storefronts across India, Southeast Asia, the UK and the Middle East, including 1,573 company-serviced premium hotels in India (Dec 2025)." },
      { title: "G6 Hospitality (US)", metric: "GBV Rs 14,107 Cr, FY26", body: "Motel 6 and Studio 6, bought in Dec 2024; a franchise-led economy lodging chain that now drives the largest share of bookings." },
      { title: "Homes (Europe & Australia)", metric: "GBV Rs 5,447 Cr, FY26 (+19.4%)", body: "1.38 lakh managed vacation and short-stay homes under Belvilla, DanCenter, Checkmyguest and MadeComfy." },
      { title: "Listings", metric: "1.45 lakh listings (Dec 2025)", body: "A subscription model in Europe where property owners pay a fixed fee to be listed; small in bookings but adds to storefront count." },
    ],
    mix: {
      title: "Revenue from operations by stream, 9M FY26",
      source: "UDRHP-I risk factor 2 (nine months to 31 Dec 2025, revenue Rs 6,941 Cr); other operating revenue derived as the balance",
      slices: [
        { label: "Accommodation sold on its own account", value: 54.91 },
        { label: "Booking commissions and franchise royalties", value: 31.91 },
        { label: "Other operating revenue", value: 13.18 },
      ],
    },
  },

  industry: {
    narrative: [
      "The 1Lattice report in the UDRHP-I sizes India's hospitality market at Rs 4.1 lakh crore (US$47.8bn) in CY25, growing 12.4% a year to Rs 7.4 lakh crore by CY30. India is under-served: ~590,000 room nights per million people versus ~3.77 million in the US.",
      "PRISM ranks first in India by hotel storefronts, but most of its bookings are now in the mature US economy-lodging and European vacation-rental markets, where growth comes from taking share rather than market expansion.",
    ],
    chart: {
      title: "India hospitality market",
      unit: "Rs lakh Cr",
      source: "1Lattice report in the PRISM UDRHP-I (CY22 Rs 2.9 trillion, CY25 Rs 4.1 trillion, CY30P Rs 7.4 trillion)",
      points: [
        { label: "CY22", value: 2.9 },
        { label: "CY25", value: 4.1 },
        { label: "CY30P", value: 7.4, projected: true },
      ],
    },
    snapshot: [
      { label: "India hospitality growth, CY25-30 (1Lattice)", value: "12.4% CAGR", tone: "pos" },
      { label: "Room nights per million people, CY25", value: "India ~0.59 mn vs US ~3.77 mn", tone: "pos" },
      { label: "PRISM rank in India by hotel storefronts", value: "No. 1 (1Lattice)", tone: "pos" },
      { label: "Gross profit / GBV, 9M FY26", value: "PRISM 18.4% vs MakeMyTrip 7.4%", tone: "pos" },
      { label: "US share of PRISM GBV, 9M FY26", value: "52.4%", tone: "neutral" },
    ],
  },

  financials: {
    source: "UDRHP-I restated consolidated (FY23-FY25, as reported by IPOCentral/Upstox); FY26 from annual report via Inc42 (Aug 2026)",
    years: [
      { label: "FY23", revenue: 5463.95, ebitda: -324.41, pat: -1286.52 },
      { label: "FY24", revenue: 5388.79, ebitda: 1279.98, pat: 229.58 },
      { label: "FY25", revenue: 6252.83, ebitda: 953.43, pat: 244.82 },
      { label: "FY26", revenue: 9358, ebitda: 2594, pat: 994.2 },
    ],
    note: "FY26 is not yet from an offer document and its EBITDA may be on a different basis (another report puts FY25 at Rs 1,083.5 Cr against the UDRHP's Rs 953 Cr). FY26 PAT includes a deferred-tax credit reported as Rs 595 Cr (Inc42) or Rs 678 Cr (other reports); FY25 also had a ~Rs 734 Cr tax credit.",
  },

  kpi: {
    title: "Global gross booking value",
    unit: "Rs Cr",
    source: "UDRHP-I (FY23-FY25, as reported by IPOCentral); FY26 annual report via Inc42",
    points: [
      { label: "FY23", value: 10175.68 },
      { label: "FY24", value: 10587.24 },
      { label: "FY25", value: 16278.78 },
      { label: "FY26", value: 30683 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "~27.7% of revenue", tone: "pos" },
    { label: "PAT margin, FY26", value: "~10.6% (incl. tax credit)", tone: "neutral" },
    { label: "Gross profit / GBV", value: "19.2% FY25; 18.4% 9M FY26", tone: "pos" },
    { label: "Net leverage (UDRHP-I)", value: "2.6x", tone: "neg" },
    { label: "Moody's rating", value: "B2, stable", tone: "neg" },
    { label: "Direct demand share", value: "~67.6% of bookings", tone: "pos" },
    { label: "Repeat customers", value: "61.8% of room nights", tone: "pos" },
  ],

  useOfProceeds: [
    { label: "Repay or prepay borrowings of Oravel Stays Singapore", valueCr: 4987.5 },
    { label: "General corporate purposes (balance)", valueCr: 1662.5 },
  ],
  proceedsNote:
    "The issue is entirely fresh, so all money goes to the company. A pre-IPO placement of up to Rs 1,330 Cr, if done, would reduce the fresh issue by the same amount. General corporate purposes are shown as the balance; the UDRHP-I mentions R&D, possible acquisitions and working capital.",
  shareholding: [
    { holder: "SoftBank (SVF India Holdings)", pct: 40.04 },
    { holder: "Ritesh Agarwal (direct + RA Hospitality)", pct: 26.71 },
    { holder: "Oravel Employee Welfare Trust", pct: 5.38 },
    { holder: "Other named investors (Patient Capital, Lightspeed, Airbnb, Peak XV, Khazanah entity and others)", pct: 15.25 },
    { holder: "Other shareholders", pct: 12.62 },
  ],
  sellers: [],

  peers: [
    { name: "Indian Hotels (Taj)", ticker: "INDHOTEL", mcapCr: 110119, revenueCr: 9987, pe: 56.7, note: "Largest listed hotel company; owns and manages, upscale focus" },
    { name: "Lemon Tree Hotels", ticker: "LEMONTREE", mcapCr: 8978, revenueCr: 1473, pe: 35.1, note: "Midscale and economy chain; growing management contracts" },
    { name: "Chalet Hotels", ticker: "CHALET", mcapCr: 18683, revenueCr: 2387, pe: 34.9, note: "Owner of branded upscale hotels plus commercial real estate" },
    { name: "EIH (Oberoi)", ticker: "EIHOTEL", mcapCr: 18895, revenueCr: 3023, pe: 26.0, note: "Luxury owner-operator" },
    { name: "Yatra Online", ticker: "YATRA", mcapCr: 1505, revenueCr: 985, pe: 43.7, note: "Online travel agency; closest listed platform peer in India" },
  ],
  valuationNote:
    "At the reported US$7-8bn (~Rs 66,500-76,000 Cr at ~Rs 95/US$; the rupee closed at 94.92 on 16 Oct 2026), PRISM would be priced at roughly 7-8x FY26 revenue and ~67-76x FY26 reported PAT (higher excluding the tax credit), versus ~11x sales for Indian Hotels and 26-57x P/E for listed hotel owners. Peers are asset-heavy hotel owners, so they are only a partial comparison. Peer figures are Screener, Oct 2026 (revenue trailing twelve months to Jun 2026).",

  strengths: [
    { title: "Global scale with an asset-light model", body: "About 2.94 lakh storefronts in 35+ countries without owning real estate, so growth needs little capital beyond technology and sales." },
    { title: "Higher take than travel agents", body: "Acting as operator, franchisor and software provider, PRISM keeps ~18-19% of GBV as gross profit, versus ~7% for MakeMyTrip (1Lattice)." },
    { title: "Cheap direct demand", body: "Loyalty programmes and own apps bring ~68% of demand directly, and ~62% of room nights come from repeat guests." },
    { title: "India cost base, Western prices", body: "About 76% of employees are in India while most revenue is earned in the US and Europe, which supports operating leverage." },
  ],
  risks: [
    { risk: "Profit quality: FY25 and FY26 PAT were lifted by large deferred-tax credits, and interest costs remain heavy.", mitigant: "IPO proceeds repay ~Rs 4,988 Cr of debt; EBITDA more than doubled in FY26.", severity: "high" },
    { risk: "US concentration through G6, including human-trafficking lawsuits against motel operators.", mitigant: "G6 is franchise-led; homes and India hotels diversify bookings.", severity: "medium" },
    { risk: "Zostel dispute could force PRISM to transfer up to ~7% of its shares.", mitigant: "Matter is still in courts; disclosed as a contingent risk.", severity: "medium" },
    { risk: "Possible CCI antitrust penalty in India and a tax dispute involving SoftBank.", mitigant: "Disclosed in the offer document; outcomes not yet determined.", severity: "medium" },
    { risk: "Past governance and patron disputes, and a third listing attempt after 2021 and 2023.", mitigant: "Board with independent directors (including ex-SEBI chairman Ajay Tyagi) and three profitable years.", severity: "low" },
  ],

  outlook: {
    bull: "Debt repayment and G6 margin gains push FY27 operating profit well above FY26, premium India hotels keep growing 30%+, and the market values PRISM as a global hospitality platform.",
    base: "The IPO prices near the reported US$7-8bn, GBV growth slows to ~20% as G6 laps its first full year, and reported profit rises mainly from lower interest.",
    bear: "US travel softens, litigation or the Zostel matter dents equity, and without tax credits earnings look thin for the valuation, delaying the issue again or forcing a lower price.",
  },

  sources: [
    { title: "Oravel Stays Limited (PRISM) - UDRHP-I", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jun-2026/oravel-stays-limited-udrhp-i_102455.html", year: "2026" },
    { title: "OYO IPO: all you need to know from the UDRHP", source: "IPOCentral (summary of PRISM UDRHP-I)", url: "https://ipocentral.in/oyo-ipo-all-you-need-to-know-from-udrhp/", year: "2026" },
    { title: "OYO parent Prism files updated DRHP, seeks Rs 6,650 crore via fresh issue", source: "Upstox News", url: "https://upstox.com/news/market-news/ipo/oyo-parent-prism-files-updated-drhp-for-ipo-seeks-6-650-crore-via-fresh-issue/article-196091/", year: "2026" },
    { title: "OYO parent PRISM receives SEBI approval for IPO", source: "Entrackr", url: "https://entrackr.com/news/oyo-parent-prism-receives-sebi-approval-for-ipo-11900579", year: "2026" },
    { title: "OYO parent PRISM's FY26 profit rises 4x to Rs 994 Cr", source: "Inc42", url: "https://inc42.com/buzz/oyo-parent-prisms-fy26-profit-skyrockets-4x-yoy-to-%e2%82%b9994-cr/", year: "2026" },
    { title: "OYO's third stab at IPO", source: "Inc42", url: "https://inc42.com/buzz/oyos-third-stab-at-ipo-funding-slips-in-h1-2026-more/", year: "2026" },
    { title: "OYO parent Prism IPO gets SEBI nod; valuation cut", source: "NiftyTrader", url: "https://www.niftytrader.in/markets/oyo-parent-prism-ipo-gets-sebi-nod-6650-cr/", year: "2026" },
    { title: "Indian Hotels share price and ratios", source: "Screener.in", url: "https://www.screener.in/company/INDHOTEL/consolidated/", year: "2026" },
  ],
};
