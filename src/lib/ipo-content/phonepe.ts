import type { IpoReport } from "./types";

// PhonePe Ltd. Figures from the UDRHP-I dated 21 Jan 2026 unless a field names another source;
// FY26 numbers come from the audited annual accounts as reported in Jul 2026. Status to 25 Nov 2026
// (IPO restart reported by Reuters and Kotak Neo; the company has not confirmed dates or size).
export const phonepe: IpoReport = {
  slug: "phonepe",
  name: "PhonePe",
  legalName: "PhonePe Limited",
  icon: "PPE",
  sectorLabel: "Digital payments & fintech",
  tagline: "Walmart-controlled UPI leader with ~47% of volumes; a restart of its offer-for-sale IPO is reported",
  asOf: "Nov 2026",

  status: {
    stage: "approved",
    label: "SEBI approved · restart reported",
    detail:
      "SEBI issued final observations on the confidential draft in Jan 2026 and the UDRHP-I was filed on 21 Jan; PhonePe paused the IPO on 16 Mar 2026 citing volatile markets. On 25 Nov 2026 Reuters reported that it has restarted preparations for a Jan-Mar 2027 listing at US$12-15bn, and Kotak Neo that updated papers would follow the December-quarter results; the company has not confirmed dates, size or valuation. Reports put SEBI's nod at 20 Jan, while the UDRHP cites an observation letter dated 8 Jan.",
  },
  timeline: [
    { date: "23 Sep 2025", event: "Confidential pre-filed DRHP submitted to SEBI", done: true },
    { date: "8 Jan 2026", event: "SEBI final observation letter (per the UDRHP)", done: true },
    { date: "21 Jan 2026", event: "UDRHP-I filed: OFS of 5.07 crore shares, no fresh issue", done: true },
    { date: "16 Mar 2026", event: "IPO paused on market volatility", done: true },
    { date: "13 Oct 2026", event: "UPI merchant fee start deferred; date to be notified", done: true },
    { date: "25 Nov 2026", event: "IPO preparations restarted (Reuters, Kotak Neo; reported)", done: true },
    { date: "Jan-Feb 2027", event: "Updated papers expected after December-quarter results (Kotak Neo, reported)", done: false },
    { date: "Jan-Mar 2027", event: "Targeted listing window (Reuters, reported; unconfirmed)", done: false },
  ],

  issue: {
    size: "OFS of 5.07 crore shares as filed; ₹15,000-18,000 Cr reported for the revived issue (Kotak Neo, 25 Nov 2026)",
    totalCr: null,
    freshCr: 0,
    ofsCr: null,
    ofsShares: "5.07 crore shares (50,660,446), ~9.8% of fully diluted equity",
    priceBand: null,
    lotSize: null,
    faceValue: "₹1",
    valuation: "US$12-15bn targeted per Reuters (25 Nov 2026), ~₹1.14-1.43L Cr at ~₹95/US$; the ~₹1.28L Cr midpoint is used for the peer chart. Not a company figure. Earlier reports: ~US$10bn (Inc42, Sep 2026), US$9-10.5bn (Mar 2026)",
    valuationCr: 128000,
    reservation: "QIB at least 75% · NII up to 15% · Retail up to 10% (Reg 6(2), loss-making issuer)",
    exchanges: "NSE, BSE",
    leadManagers: [
      "Kotak Mahindra Capital",
      "Axis Capital",
      "J.P. Morgan India",
      "Goldman Sachs (India) Securities",
      "Citigroup Global Markets India",
      "Jefferies India",
      "Morgan Stanley India",
      "JM Financial",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Dominant franchise, thin monetisation",
    tone: "neutral",
    line: "PhonePe owns India's payment habit (65.8 crore registered users, ~47% of UPI volume) but earns little per transaction; the deferred UPI merchant fee, lending distribution and the 30% volume cap decide what that scale is worth.",
  },
  keyStats: [
    { label: "Revenue from operations, FY25", value: "₹7,115 Cr", sub: "+40.5%; FY26 ₹7,921 Cr (+11.5%)" },
    { label: "Adjusted EBITDA, FY25", value: "₹1,477 Cr", sub: "20.8% margin; H1 FY26 6.5%" },
    { label: "UPI volume share, Sep 2025", value: "46.85%", sub: "NPCI; 47.07% in Apr 2026" },
    { label: "Offer for sale", value: "5.07 crore shares", sub: "as filed; Walmart sells ~9%, keeps control" },
  ],
  thesis: [
    {
      title: "India's largest payments franchise comes to market",
      body: "PhonePe has led customer-initiated UPI every month since Dec 2020 and processed ₹132.7L Cr of customer payments in FY25. No listed Indian company offers the same reach.",
    },
    {
      title: "Payments are the funnel; distribution is the profit pool",
      body: "Lending and insurance distribution rose from 1% of revenue in FY23 to 11.6% in H1 FY26, and merchant payments to 30.8%. A 0.4% UPI merchant fee (MDR) on payments above ₹2,000, announced in Sep 2026, would add a direct way to earn from payments once it starts; NPCI deferred it on 13 Oct and no start date had been notified by late Nov 2026.",
    },
    {
      title: "Mostly an exit, not a capital raise",
      body: "As filed, all proceeds go to Walmart, Microsoft and Tiger Global; a ₹3,000-5,000 Cr fresh issue is reported for the revived IPO (Kotak Neo, 25 Nov 2026) but not confirmed. Pricing will hinge on how investors treat ~₹2,400 Cr of yearly ESOP costs and the NPCI 30% market-share cap.",
    },
  ],

  business: {
    narrative: [
      "PhonePe runs a UPI app used for person-to-person transfers, bill payments and recharges (Consumer Payments), a merchant acceptance network of QR codes and SmartSpeaker devices (Merchant Payments), and distribution of loans and insurance for banks, NBFCs and insurers. It is also building Share.Market (broking and mutual funds) and Indus Appstore.",
      "UPI itself is free to users and was largely free to merchants, so revenue comes from bill-payment fees, merchant devices and subscriptions, government incentives, and commissions on financial products. Two lines were lost in FY26: rent payments by card were stopped and real-money gaming was banned in Aug 2025.",
    ],
    segments: [
      {
        title: "Consumer Payments",
        metric: "₹2,200 Cr, H1 FY26 (56% of revenue)",
        body: "UPI P2P and P2M, bill payments and recharges; 30.1 crore monthly active users and 5,340 crore customer transactions in H1 FY26.",
      },
      {
        title: "Merchant Payments",
        metric: "₹1,206 Cr, H1 FY26 (31%)",
        body: "QR acceptance, SmartSpeakers and payment gateway for 4.7 crore merchants; ₹8.5L Cr merchant TPV in H1 FY26.",
      },
      {
        title: "Lending & Insurance Distribution",
        metric: "₹453 Cr, H1 FY26 (12%)",
        body: "Loans sourced for banks and NBFCs and insurance sold as a broker; more than doubled YoY and the main margin lever.",
      },
      {
        title: "New Platforms",
        metric: "₹60 Cr, H1 FY26 (1.5%)",
        body: "Share.Market stock broking and Indus Appstore; the Pincode shopping app was shut after Sep 2025.",
      },
    ],
    mix: {
      title: "Revenue from operations, H1 FY26",
      source: "UDRHP-I (six months to 30 Sep 2025)",
      slices: [
        { label: "Consumer Payments", value: 56.1 },
        { label: "Merchant Payments", value: 30.8 },
        { label: "Lending & Insurance Distribution", value: 11.6 },
        { label: "New Platforms", value: 1.5 },
      ],
    },
  },

  industry: {
    narrative: [
      "UPI is India's default way to pay. Volumes rose from 46 billion transactions in FY22 to 242 billion in FY26, worth ₹314L Cr; Redseer (in the UDRHP) says UPI made up 87% of consumer payment value in FY25 and expects digital consumer payments to grow 15-18% a year to FY30.",
      "The market is a near-duopoly: in Apr 2026 PhonePe had 47.1% of UPI volume, Google Pay 33.5% and Paytm 8.1%. NPCI's proposed 30% cap per app has been deferred to 31 Dec 2026. A 0.4% merchant fee (MDR) on UPI payments above ₹2,000 was announced for 15 Oct 2026 but deferred on 13 Oct, with no start date notified by late Nov (a Jan 2027 start has been reported as under consideration); about 96% of merchant payments would stay free.",
    ],
    chart: {
      title: "UPI transactions",
      unit: "bn transactions",
      source: "NPCI data via Ministry of Finance reply in Lok Sabha (Jul 2026)",
      points: [
        { label: "FY22", value: 46.0 },
        { label: "FY23", value: 83.7 },
        { label: "FY24", value: 131.1 },
        { label: "FY25", value: 185.9 },
        { label: "FY26", value: 241.6 },
      ],
    },
    snapshot: [
      { label: "UPI value, FY26", value: "₹314L Cr (+21%)", tone: "pos" },
      { label: "UPI volume share, Apr 2026", value: "PhonePe 47.1% · Google Pay 33.5% · Paytm 8.1%" },
      { label: "NPCI volume cap", value: "30% per app; deferred to 31 Dec 2026", tone: "neg" },
      { label: "UPI merchant fee (MDR), announced Sep 2026", value: "0.4% above ₹2,000, cap ₹300; deferred, start date not notified", tone: "neutral" },
      { label: "Digital consumer payments growth", value: "15-18% CAGR to FY30 (Redseer)" },
    ],
  },

  financials: {
    source: "Restated consolidated financial information, UDRHP-I (21 Jan 2026); EBITDA is Adjusted EBITDA (before ESOP costs and other income)",
    years: [
      { label: "FY23", revenue: 2914, ebitda: -375, pat: -2796 },
      { label: "FY24", revenue: 5064, ebitda: 652, pat: -1996 },
      { label: "FY25", revenue: 7115, ebitda: 1477, pat: -1727 },
      { label: "H1 FY26", revenue: 3918, ebitda: 254, pat: -1444, partial: true },
    ],
    note: "Reported losses are driven by non-cash ESOP charges (₹2,283 Cr in FY25, ₹2,391 Cr in FY26). H1 FY26 margins fell after the rent-payment exit and the Aug 2025 gaming ban. Audited FY26 (not yet in an offer document): revenue ₹7,921 Cr and a loss of ₹2,792 Cr after a ₹685 Cr Indus Appstore impairment and Pincode losses; adjusted EBITDA for FY26 is not yet disclosed.",
  },

  kpi: {
    title: "Life-till-date registered users",
    unit: "crore",
    source: "UDRHP-I KPIs",
    points: [
      { label: "FY23", value: 45.5 },
      { label: "FY24", value: 53.5 },
      { label: "FY25", value: 61.8 },
      { label: "Sep 2025", value: 65.8 },
    ],
  },
  ratios: [
    { label: "Adjusted EBITDA margin", value: "20.8% FY25 · 6.5% H1 FY26", tone: "neg" },
    { label: "Restated RoNW, FY25", value: "-18.4%", tone: "neg" },
    { label: "Net worth, Sep 2025", value: "₹9,539 Cr" },
    { label: "Borrowings", value: "Nil", tone: "pos" },
    { label: "Customer TPV, FY25", value: "₹132.7L Cr (+32%)", tone: "pos" },
    { label: "Merchant TPV, FY25", value: "₹15.0L Cr" },
    { label: "Monthly active users, Sep 2025", value: "30.1 crore" },
    { label: "ESOP expense, FY26", value: "₹2,391 Cr (non-cash)" },
  ],

  useOfProceeds: [],
  proceedsNote:
    "As filed in the UDRHP-I, a pure offer for sale: PhonePe receives nothing, and selling shareholders get the proceeds after their share of offer expenses and taxes; the stated objects are listing benefits and visibility. Kotak Neo reported on 25 Nov 2026 that the revived issue of ₹15,000-18,000 Cr may pair an OFS of ₹12,000-13,000 Cr with a fresh issue of ₹3,000-5,000 Cr; the company has not confirmed this, and any fresh-issue objects would appear only in updated papers. PhonePe has raised over US$2.3bn privately and reports no borrowings.",
  shareholding: [
    { holder: "Walmart (WM Digital Commerce Holdings)", pct: 71.77 },
    { holder: "General Atlantic", pct: 8.98 },
    { holder: "Headstand Pte (ex-Flipkart Payments)", pct: 5.73 },
    { holder: "Sameer Nigam (co-founder, CEO)", pct: 2.55 },
    { holder: "Rahul Chari (co-founder, CTO)", pct: 2.55 },
    { holder: "3State Ventures", pct: 1.03 },
    { holder: "Microsoft", pct: 0.71 },
    { holder: "Tiger Global", pct: 0.2 },
    { holder: "Others (Ribbit, TVS, employees and other investors)", pct: 6.48 },
  ],
  sellers: [
    { name: "Walmart (WM Digital Commerce)", detail: "Up to 4.59 crore shares; stays majority owner" },
    { name: "Microsoft Global Finance", detail: "Up to 36.8 lakh shares; full exit" },
    { name: "Tiger Global PIP 9-1", detail: "Up to 10.4 lakh shares; full exit" },
  ],

  peers: [
    { name: "One 97 Communications (Paytm)", ticker: "PAYTM", note: "Closest listed peer: UPI app, merchant devices, lending distribution" },
    { name: "PB Fintech (Policybazaar)", ticker: "POLICYBZR", note: "Insurance and credit distribution benchmark" },
    { name: "Bajaj Finance", ticker: "BAJFINANCE", note: "Consumer lender; a partner and a competitor for credit customers" },
    { name: "Angel One", ticker: "ANGELONE", note: "Benchmark for Share.Market broking" },
  ],
  valuationNote:
    "At the reported US$12-15bn (~₹1.14-1.43L Cr; Reuters, 25 Nov 2026, not a company figure), PhonePe would be valued at ~16-20x FY25 revenue of ₹7,115 Cr, the last full year in the offer document (~14-18x audited FY26 revenue of ₹7,921 Cr). Compare that with the listed peers' multiples in the peer table below.",

  strengths: [
    {
      title: "Scale and habit",
      body: "65.8 crore registered users, 15.6 crore daily active users and 4.7 crore merchants; UPI leader every month since Dec 2020.",
    },
    {
      title: "Diversifying revenue",
      body: "Merchant payments rose from 15% of revenue in FY23 to 31% in H1 FY26, and lending and insurance distribution from 1% to 12%.",
    },
    {
      title: "Owned, low-cost technology",
      body: "Its own data centres (~₹3,373 Cr invested since 2016) keep server cost near ₹0.06 per transaction, per the company.",
    },
    {
      title: "Strong balance sheet and backer",
      body: "No borrowings, ₹9,539 Cr net worth and Walmart as controlling shareholder after the IPO.",
    },
  ],
  risks: [
    {
      risk: "NPCI's 30% UPI volume cap (deferred to 31 Dec 2026) could restrict onboarding new users at ~47% share.",
      mitigant: "The deadline has been extended several times, and the SOP says existing users would not be affected.",
      severity: "high",
    },
    {
      risk: "Policy-driven revenue: UPI pricing, MDR rules and government incentives are set by NPCI and the government.",
      mitigant: "A 0.4% merchant fee on larger UPI payments has been announced (deferred, start date not yet notified), and distribution revenue is less policy-dependent.",
      severity: "medium",
    },
    {
      risk: "Reported losses persist (FY26 ₹2,792 Cr) because of large ESOP charges and write-offs.",
      mitigant: "Adjusted EBITDA has been positive since FY24, and the company put FY26 normalised loss at ₹1,377 Cr.",
      severity: "medium",
    },
    {
      risk: "Revenue growth slowed to 11.5% in FY26 after the gaming ban and the rent-payment exit.",
      mitigant: "Lending and insurance distribution more than doubled in H1 FY26 and merchant revenue grew 60%.",
      severity: "medium",
    },
    {
      risk: "Competition from Google Pay (~34% share) and fintech apps such as Paytm, Navi and CRED, and bank apps.",
      mitigant: "NPCI data show its share steady at 46.7-47.1% between Sep 2025 and Apr 2026.",
      severity: "low",
    },
  ],

  outlook: {
    bull: "Markets steady, PhonePe refiles after the December-quarter results, the UPI merchant fee starts, and it and lending lift adjusted EBITDA margins back above 20%, and the IPO prices at the top of the reported US$12-15bn range.",
    base: "Updated papers in early 2027 and a Jan-Mar 2027 listing in the lower half of the reported US$12-15bn range, mostly an OFS with Walmart selling ~9%, and reported losses narrowing slowly.",
    bear: "NPCI enforces the 30% cap, MDR revenue proves small, and volatile markets push the listing beyond the approval window or force a valuation below the reported range.",
  },
  sources: [
    { title: "PhonePe Limited - UDRHP-I (21 Jan 2026)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jan-2026/phonepe-limited-udrhp-i_99285.html", year: "2026" },
    { title: "PhonePe files updated DRHP for OFS-only IPO", source: "Inc42", url: "https://inc42.com/buzz/phonepe-files-updated-drhp-for-ofs-only-ipo/", year: "2026" },
    { title: "Walmart-backed PhonePe shelves IPO as global tensions rattle markets", source: "TechCrunch", url: "https://techcrunch.com/2026/03/16/walmart-backed-phonepe-shelves-ipo-as-global-tensions-rattle-markets/", year: "2026" },
    { title: "IPO-bound PhonePe posts Rs 2,792 Cr loss in FY26, revenue up 11.5%", source: "Inc42", url: "https://inc42.com/buzz/ipo-bound-phonepe-posts-%E2%82%B92792-cr-loss-in-fy26-revenue-up-11-5-yoy/", year: "2026" },
    { title: "PhonePe prepares to restart IPO process amid improving market conditions", source: "Business Standard (Reuters, 25 Nov 2026)", url: "https://business-standard.com/markets/ipo/phonepe-prepares-to-restart-ipo-process-amid-improving-market-conditions-126112500725_1.html", year: "2026" },
    { title: "UPI transaction value reaches Rs 314 lakh crore in FY26", source: "Outlook Money", url: "https://www.outlookmoney.com/banking/upi-transaction-value-reaches-rs-314-lakh-crore-in-fy26-govt-says-in-lok-sabha", year: "2026" },
    { title: "UPI in April: PhonePe tightens grip with over 47% market share", source: "Inc42", url: "https://inc42.com/buzz/upi-in-april-phonepe-tightens-grip-with-over-47-market-share/", year: "2026" },
    { title: "Walmart-owned PhonePe revives IPO plans, eyes US$12-15bn valuation and FY27 listing", source: "Kotak Neo (25 Nov 2026)", url: "https://kotakneo.com/news/ipos/walmart-owned-phonepe-revives-ipo-plans-eyes-12-15-billion-valuation-and-fy27-listing", year: "2026" },
  ],
};
