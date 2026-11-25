import type { IpoReport } from "./types";

// Mahanadi Coalfields Ltd (MCL), a wholly owned Coal India subsidiary. Financials, KPIs, customer
// shares and risk factors from the RHP dated 13 Nov 2026 (abridged prospectus on SEBI, restated
// consolidated, ₹ million converted to ₹ Cr). Issue dates, band, anchor book and the final-day
// subscription (23 Nov 2026, 5:54 pm) from Chittorgarh, cross-checked with InCred Money and Goodreturns.
export const mahanadiCoalfields: IpoReport = {
  slug: "mahanadi-coalfields",
  name: "Mahanadi Coalfields",
  legalName: "Mahanadi Coalfields Limited",
  icon: "MCL",
  sectorLabel: "Coal mining & energy",
  sectorSlug: "energy",
  tagline: "India's largest single coal producer, with 10% sold by parent Coal India at ~8.4x FY26 earnings",
  asOf: "Nov 2026",

  status: {
    stage: "upcoming",
    label: "Closed · lists 27 Nov",
    detail:
      "Bidding closed on 23 Nov with the book covered 1.52x (QIB 4.95x, NII 0.66x, retail 0.48x, employees 0.22x, Coal India shareholders 0.56x) after a ₹2,295 Cr anchor book at ₹136; institutions carried the issue while the retail and shareholder quotas were not filled. Allotment is due on 25 Nov and the shares are set to list on NSE and BSE on 27 Nov 2026.",
  },
  timeline: [
    { date: "1 Sep 2026", event: "DRHP filed with SEBI, NSE and BSE: OFS of up to 66.18 crore shares by Coal India", done: true },
    { date: "13 Nov 2026", event: "RHP filed; price band of ₹129-136 announced days later", done: true },
    { date: "18 Nov 2026", event: "Anchor book: ₹2,295 Cr at ₹136 from 53 investors (mutual funds ~53%)", done: true },
    { date: "19 Nov 2026", event: "Issue opens", done: true },
    { date: "23 Nov 2026", event: "Issue closes: 1.52x overall, QIB 4.95x, NII 0.66x, retail 0.48x", done: true },
    { date: "25 Nov 2026", event: "Basis of allotment", done: false },
    { date: "27 Nov 2026", event: "Listing on NSE and BSE", done: false },
  ],

  issue: {
    size: "₹8,981 Cr at the ₹136 upper band (all offer for sale)",
    totalCr: 8981,
    freshCr: 0,
    ofsCr: 8981,
    ofsShares: "66.18 crore shares (661,836,300), 10% of the company",
    priceBand: "₹129 - 136",
    lotSize: "110 shares (₹14,960 at ₹136)",
    faceValue: "₹2",
    valuation: "~₹90,010 Cr market cap at the ₹136 upper band (661.84 crore shares; no new shares are issued)",
    valuationCr: 90010,
    reservation: "Net offer: QIB 50% · NII 15% · Retail 35%; plus 5% for employees (₹6 discount) and 10% for Coal India shareholders",
    exchanges: "NSE, BSE",
    leadManagers: [
      "SBI Capital Markets",
      "Axis Capital",
      "BOB Capital Markets",
      "IDBI Capital Markets & Securities",
      "IIFL Capital Services",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Cash-rich coal miner, little growth",
    tone: "neutral",
    line: "At ~8.4x FY26 earnings and with almost no debt, MCL is priced at a modest premium to Coal India on earnings and a larger one on sales (see the peer table); the catch is that revenue and profit have drifted lower since FY24 and the IPO raises no money for the company.",
  },
  keyStats: [
    { label: "Issue size", value: "₹8,981 Cr", sub: "All offer for sale by Coal India (10% stake)" },
    { label: "Valuation at upper band", value: "~₹90,010 Cr", sub: "~8.4x FY26 EPS; ~4.2x Mar 2026 book" },
    { label: "Revenue, FY26", value: "₹30,550 Cr", sub: "-1.7% a year since FY24; PAT ₹10,698 Cr" },
    { label: "Coal produced, FY26", value: "218.3 MT", sub: "21% of India's output; ~45 years of reserves" },
  ],
  thesis: [
    {
      title: "The biggest, lowest-cost coal mine operator in India",
      body: "MCL produced 218.3 MT in FY26, 21% of India's coal and about 28% of Coal India's. Almost all of it (99.85%) comes from mechanised opencast mines, and the RHP says it had the highest EBITDA and profit margins among Indian coal producers in FY26.",
    },
    {
      title: "Profits are high but have not grown",
      body: "Revenue slipped from ₹31,634 Cr in FY24 to ₹30,550 Cr in FY26 and profit from ₹11,842 Cr to ₹10,698 Cr as the average price it got per tonne softened. In H1 FY27 output fell 9% but sales from stockpiles rose 8%, lifting revenue 9% and profit 7%.",
    },
    {
      title: "A parent's partial exit, not a capital raise",
      body: "Coal India sells 10% and keeps 90%; MCL gets no money. Investors get direct exposure to a debt-free miner (₹2.76 Cr of borrowings in Sep 2026) that generated ₹12,478 Cr of operating cash in FY26.",
    },
  ],

  business: {
    narrative: [
      "MCL mines non-coking (thermal) coal in the Talcher and Ib Valley coalfields of Odisha, the state with India's largest coal resource (106.76 billion tonnes). It ran 17 mines at Jun 2026, 14 opencast and 3 underground, and had audited reserves of 9,840 MT, enough for about 45 years at the FY26 output rate.",
      "Raw non-coking coal made up 97.4% of FY26 product sales; the rest is washed and other coal. Thermal power plants (state and central generators and independent producers) bought 68.6% of FY26 sales, and government-owned power companies alone were 44.8% of revenue. The top 10 customers gave 55.9% of revenue, and most coal moves by rail.",
      "The company was carved out of South Eastern Coalfields in 1992 and has Miniratna status, a government label that lets a profitable state-owned company make some investments without ministry approval. Its promoters are Coal India and the President of India through the Ministry of Coal; its senior executives are seconded from Coal India.",
    ],
    segments: [
      { title: "Opencast mining", metric: "99.85% of FY26 output", body: "Fourteen of 17 mines are opencast, worked with about 70 surface miners; FY26 stripping ratio was 1.50 cubic metres of overburden per tonne of coal." },
      { title: "Coal for power plants", metric: "68.6% of FY26 product sales", body: "Sold mostly under long-term fuel supply agreements to state, central and private generators; FSA coal was 82% of FY26 product sales (IndMoney's reading of the RHP)." },
      { title: "Non-power buyers", metric: "~31% of FY26 product sales", body: "Cement, sponge iron and other industrial buyers; MCL sold to customers in 16 states in FY26." },
      { title: "Washed coal", metric: "Ib Valley washery, 10 MTPA", body: "Washed (cleaned) coal is a small part of sales today (raw coal is 97.4%); the RHP's strategy is to grow it to widen the customer base." },
      { title: "Reserves and expansion", metric: "9,840 MT reserves", body: "Plans to expand existing mines, open new ones, add silos and rail links, and explore coal gasification, renewables and other minerals." },
    ],
    mix: {
      title: "Share of FY26 sale of products by buyer",
      source: "RHP (abridged prospectus, 13 Nov 2026), risk factors",
      slices: [
        { label: "Thermal power (state, central, IPPs)", value: 68.62 },
        { label: "All other buyers (cement, sponge iron, others)", value: 31.38 },
      ],
    },
  },

  industry: {
    narrative: [
      "Coal produced about 70% of India's electricity in FY26 (CRISIL, in the RHP), and power demand also pulls in steel and cement. India mined a record 1,047.5 MT in FY25, up 5%, then a provisional 1,040.8 MT in FY26, down 0.6%; the Ministry of Coal's goal is 1.5 billion tonnes by FY30.",
      "The growth is shifting away from Coal India: captive and commercial mines, which belong to power, steel and private miners, produced 210.5 MT in FY26, up 10%. Coal resources sit mainly in Odisha, Jharkhand and Chhattisgarh, out of an estimated 411.5 billion tonnes nationally.",
    ],
    chart: {
      title: "India's coal production",
      unit: "Million tonnes",
      source: "Ministry of Coal (Annual Report 2025-26; FY23-24 via PIB, reported by The Tribune; FY26 provisional, Monthly Coal Statistics Mar 2026); FY30 is the ministry's goal, not a forecast",
      points: [
        { label: "FY23", value: 893.2 },
        { label: "FY24", value: 997.8 },
        { label: "FY25", value: 1047.5 },
        { label: "FY26", value: 1040.8 },
        { label: "FY30 goal", value: 1500, projected: true },
      ],
    },
    snapshot: [
      { label: "Coal's share of power generation, FY26", value: "~70%", tone: "neutral" },
      { label: "India coal output, FY26 (provisional)", value: "1,040.8 MT (-0.6%; record 1,047.5 MT in FY25)", tone: "neutral" },
      { label: "Captive & commercial mines, FY26", value: "210.5 MT (+10.2%)", tone: "neutral" },
      { label: "MCL share of Coal India output, FY26", value: "28.4%", tone: "neutral" },
      { label: "Odisha coal resource, Apr 2026", value: "106.8 Bt (largest state)", tone: "pos" },
      { label: "Ministry production goal, FY30", value: "1.5 billion tonnes", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements (abridged prospectus on SEBI, 13 Nov 2026); EBITDA here includes other income; matches Chittorgarh's EBITDA and PAT",
    years: [
      { label: "FY24", revenue: 31634, ebitda: 16637, pat: 11842 },
      { label: "FY25", revenue: 31353, ebitda: 15331, pat: 10825 },
      { label: "FY26", revenue: 30550, ebitda: 16085, pat: 10698 },
      { label: "H1 FY27", revenue: 16093, ebitda: 7464, pat: 4881, partial: true },
    ],
    note: "Revenue from operations fell 1.7% a year over FY24-26 and PAT 5.0% a year as the average selling price per tonne softened. EBITDA in this chart includes other income (~₹3,350 Cr in FY26), which puts it at 52.6% of FY26 revenue; without other income the operating EBITDA margin was 41.7% (see the ratios). Chittorgarh and others show total income of ₹33,899 Cr; H1 FY27 revenue rose 9.3% and PAT 6.7% on higher offtake.",
  },

  kpi: {
    title: "Coal production",
    unit: "Million tonnes",
    source: "RHP KPI table (H1 FY27: 87.5 MT vs 96.5 MT in H1 FY26)",
    points: [
      { label: "FY24", value: 206.1 },
      { label: "FY25", value: 225.17 },
      { label: "FY26", value: 218.31 },
    ],
  },
  ratios: [
    { label: "Operating EBITDA margin (excl. other income), FY26", value: "41.7% (46.4% in FY24)", tone: "neutral" },
    { label: "PAT margin on total income, FY26", value: "31.6% (28.5% in H1 FY27)", tone: "pos" },
    { label: "Return on net worth, FY26", value: "53.8% (80.6% in FY24)", tone: "pos" },
    { label: "Return on capital employed, FY26", value: "73.3%", tone: "pos" },
    { label: "Net worth, Sep 2026", value: "₹22,400 Cr (₹33.84 a share)", tone: "neutral" },
    { label: "Borrowings, Sep 2026", value: "₹2.76 Cr (effectively debt-free)", tone: "pos" },
    { label: "Contingent liabilities, Sep 2026", value: "55.9% of net worth", tone: "neg" },
    { label: "EPS, FY26", value: "₹16.13 (~8.4x at ₹136)", tone: "neutral" },
  ],

  useOfProceeds: [],
  proceedsNote:
    "This is a pure offer for sale: all ₹8,981 Cr goes to Coal India, after issue expenses (estimated at ₹106 Cr) that the seller bears. MCL receives nothing; the RHP lists listing benefits (visibility and a market for the shares) as the only other object. No new shares are issued, so the share count stays at 661.84 crore.",
  shareholding: [
    { holder: "Coal India Ltd, stake it keeps after the issue (incl. six nominee holders)", pct: 90 },
    { holder: "Coal India Ltd, stake sold to the public in this offer", pct: 10 },
  ],
  sellers: [
    { name: "Coal India Ltd (promoter)", detail: "Sells 66.18 crore shares (10%); average cost ₹0.26 a share after the split; keeps 90% after the issue." },
  ],

  peers: [
    { name: "Coal India", ticker: "COALINDIA", note: "Parent and seller; the RHP's main listed peer, mining coal through several subsidiaries." },
    { name: "NMDC", ticker: "NMDC", note: "State-run iron-ore miner the RHP names as a listed mining peer." },
    { name: "NLC India", ticker: "NLCINDIA", note: "State-run lignite and coal miner that also generates power, with coal blocks in Odisha." },
    { name: "Gujarat Mineral Development Corporation", ticker: "GMDCLTD", note: "State-run lignite and minerals miner in Gujarat." },
    { name: "Central Mine Planning & Design Institute", ticker: "CMPDI", note: "Listed sister Coal India subsidiary that plans and designs mines." },
  ],
  valuationNote:
    "At ₹136 MCL is priced at ~8.4x FY26 earnings (~9.2x on annualised H1 FY27): a modest premium to Coal India on earnings and a larger one on sales (see the peer table), and a higher price-to-book, which its much higher return on equity helps explain. Buyers are paying a little more for MCL's lower costs and higher margins, even though all its mines are in one state.",

  strengths: [
    { title: "Scale and long reserve life", body: "India's largest single coal producer, with 21% of domestic output in FY26 and reserves for about 45 years at the current rate." },
    { title: "Low-cost, mechanised mines", body: "Nearly all output is from opencast mines in two large coalfields, and the RHP says MCL had the best EBITDA and profit margins among Indian coal producers in FY26." },
    { title: "Rail-led logistics", body: "Coal moves mainly by rail with port links, which cuts customers' freight costs and dependence on road transport." },
    { title: "Coal India's backing", body: "Support from the world's largest coal producer, long-standing contracts with power utilities and customers in 16 states." },
  ],
  risks: [
    { risk: "Dependence on coal-fired power: thermal plants bought 68.6% of FY26 product sales, and raw non-coking coal is 97% of what MCL sells", mitigant: "Coal still makes ~70% of India's power and most sales are under long-term supply agreements", severity: "high" },
    { risk: "No profit growth: PAT fell from ₹11,842 Cr in FY24 to ₹10,698 Cr in FY26, and H1 FY27 production dropped 9%", mitigant: "H1 FY27 offtake, revenue and profit rose as stockpiles were sold", severity: "medium" },
    { risk: "Contingent liabilities of ₹12,513 Cr (55.9% of net worth) and ~₹11,813 Cr of claims in cases against the company, not provided for", mitigant: "Most of the cases against MCL are tax (111) or regulatory (52) proceedings; the balance sheet carries almost no debt", severity: "medium" },
    { risk: "Control by Coal India and the government: strategy, executive secondments and possible conflicts with sister subsidiaries", mitigant: "The same parentage brings scale, contracts and support", severity: "medium" },
    { risk: "All mines in Odisha and heavy use of contractors (top 10 were 60% of FY26 contract costs); mining is hazardous and insurance cover is below industry standards", mitigant: "Two large coalfields and rail evacuation spread operational risk", severity: "medium" },
  ],

  outlook: {
    bull: "Power demand keeps coal burn high, output returns to growth as new mines and rail links come up, and strong cash flows on a debt-free balance sheet support payouts while the stock re-rates toward the market.",
    base: "Volumes and profits stay roughly flat around FY26 levels, cash keeps building, and the stock trades in a band close to Coal India's earnings multiple.",
    bear: "Renewables and captive mines eat into demand for Coal India coal, selling prices per tonne keep falling, and a contingent liability turns into a large payout, cutting earnings for a single-state miner.",
  },
  sources: [
    { title: "Mahanadi Coalfields Limited - RHP and abridged prospectus (13 Nov 2026)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/nov-2026/mahanadi-coalfields-limited-rhp_105777.html", year: "2026" },
    { title: "Mahanadi Coalfields IPO dates, price, subscription and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/mahanadi-coalfields-ipo/3247/", year: "2026" },
    { title: "Mahanadi Coalfields IPO subscription status (QIB, NII, retail and quotas)", source: "InCred Money", url: "https://www.incredmoney.com/blog/?p=15648", year: "2026" },
    { title: "Mahanadi Coalfields IPO raises ₹2,295 crore from anchor investors", source: "Goodreturns", url: "https://www.goodreturns.in/news/mahanadi-coalfields-ipo-raises-rs-2295-crore-anchor-investors-011-1548073.html", year: "2026" },
    { title: "Mahanadi Coalfields IPO review", source: "IndMoney", url: "https://www.indmoney.com/blog/ipo/mahanadi-coalfields-ipo-review", year: "2026" },
    { title: "Monthly Coal Statistics, March 2026 (provisional): FY26 all-India production", source: "Ministry of Coal", url: "https://coal.gov.in/sites/default/files/2026-04/msg-march26.pdf", year: "2026" },
    { title: "Annual Report 2025-26, chapter 2: the year at a glance", source: "Ministry of Coal", url: "https://www.coal.nic.in/sites/default/files/2026-02/chap2AnnualReport2026en.pdf", year: "2026" },
    { title: "India achieves record coal production of 997.83 MT in FY24, targets 1.5 BT by 2030", source: "The Tribune", url: "https://www.tribuneindia.com/news/business/india-achieves-record-coal-production-of-997-83-mt-in-fy24-targets-1-5-bt-by-2030", year: "2024" },
  ],
};
