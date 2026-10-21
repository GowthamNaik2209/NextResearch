import type { IpoReport } from "./types";

export const nse: IpoReport = {
  slug: "nse",
  name: "NSE",
  legalName: "National Stock Exchange of India Limited",
  icon: "NSE",
  sectorLabel: "Stock exchange & market infrastructure",
  tagline: "India's dominant exchange, now listed on BSE after a Rs 22,563 Cr pure OFS",
  asOf: "Oct 2026",

  status: {
    stage: "listed",
    label: "Listed 24 Sep",
    detail:
      "The IPO is complete: priced at Rs 1,785 (top of the Rs 1,700-1,785 band), subscribed 5.71x, and listed on BSE on 24 Sep 2026 at Rs 1,800; the size was cut from ~14.89 crore shares in the DRHP (reported as ~Rs 30,000 Cr) to 12.64 crore shares (Rs 22,563 Cr) in the RHP. Next watch-points are the anchor lock-in expiries on 21 Oct and 20 Dec 2026.",
  },
  timeline: [
    { date: "30 Jan 2026", event: "SEBI no-objection for the IPO", done: true },
    { date: "17 Jun 2026", event: "DRHP filed: OFS of up to 14.89 crore shares", done: true },
    { date: "4 Sep 2026", event: "SEBI observation letter reported (one report says 21 Aug)", done: true },
    { date: "11 Sep 2026", event: "RHP on SEBI site; 12.64 crore shares, band Rs 1,700-1,785", done: true },
    { date: "16 Sep 2026", event: "Anchor book: Rs 6,746 Cr", done: true },
    { date: "17-21 Sep 2026", event: "Subscription: 5.71x overall, QIB 12.68x", done: true },
    { date: "24 Sep 2026", event: "Listed on BSE at Rs 1,800 (+0.8%)", done: true },
    { date: "21 Oct 2026", event: "Lock-in ends for 50% of anchor shares", done: false },
  ],

  issue: {
    size: "Rs 22,563 Cr (final, pure OFS)",
    totalCr: 22563,
    freshCr: 0,
    ofsCr: 22563,
    ofsShares: "12.64 crore shares (DRHP: up to 14.89 crore)",
    priceBand: "Rs 1,700 - 1,785 (priced at Rs 1,785)",
    lotSize: "8 shares (Rs 14,280)",
    faceValue: "Rs 1",
    valuation: "Rs 4.42 lakh Cr market cap at the Rs 1,785 issue price (247.5 crore shares); ~Rs 4.33 lakh Cr at Rs 1,749 on 16 Oct 2026",
    valuationCr: 441788,
    reservation: "QIB 50% · NII 15% · Retail 35% of the net offer; employee portion with Rs 170 discount",
    exchanges: "BSE only (an exchange cannot list on itself)",
    leadManagers: [
      "Kotak Mahindra Capital",
      "Morgan Stanley India",
      "Citigroup Global Markets India",
      "JP Morgan India",
      "HSBC Securities & Capital Markets (India)",
      "JM Financial",
      "Axis Capital",
      "ICICI Securities",
      "HDFC Bank",
      "IIFL Capital Services",
      "Motilal Oswal Investment Advisors",
      "Nuvama Wealth Management",
      "Avendus Capital",
      "Anand Rathi Advisors",
      "DAM Capital Advisors",
      "Equirus Capital",
      "IDBI Capital Markets & Securities",
      "Pantomath Capital Advisors",
      "360 One WAM",
    ],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Quality franchise, flat debut",
    tone: "neutral",
    line: "A near-monopoly with 50%+ margins and ~33% RoE, but FY26 profit fell and its options share is sliding to BSE; the flat listing suggests the price already reflects the franchise.",
  },
  keyStats: [
    { label: "Issue size", value: "Rs 22,563 Cr", sub: "100% OFS; NSE receives nothing" },
    { label: "Market cap at issue price", value: "Rs 4.42 lakh Cr", sub: "~42.9x FY26 EPS of Rs 41.62" },
    { label: "Revenue from operations, FY26", value: "Rs 16,601 Cr", sub: "-3.1% YoY; PAT Rs 10,302 Cr (-15.5%)" },
    { label: "Equity options share, Q1 FY27", value: "68.5%", sub: "of premium turnover; 96.9% in FY24" },
  ],
  thesis: [
    {
      title: "Owner of India's trading toll road",
      body: "NSE handled 93% of cash-market turnover and 99.8% of equity futures in FY26, and is the world's largest derivatives exchange by contracts (51% global share). Every new demat account and SIP flows partly through its pipes.",
    },
    {
      title: "Options are the profit engine - and the pressure point",
      body: "Transaction charges were 78.7% of FY26 revenue and equity options alone 60.2%. SEBI's F&O curbs and BSE's revived Sensex options cut NSE's options premium share from 96.9% (FY24) to 68.5% (Q1 FY27).",
    },
    {
      title: "A pure exit, not a growth raise",
      body: "No fresh capital: SBI, insurers, and foreign holders such as CPPIB, Temasek's Aranda and Morgan Stanley sold. LIC, the largest holder at 10.7%, did not sell and bought more in the anchor book.",
    },
  ],

  business: {
    narrative: [
      "NSE runs India's largest stock exchange and its clearing corporation (NSE Clearing), along with index (Nifty), data and colocation businesses. It has no promoter; ownership is spread across Indian state-owned financial institutions and global investors.",
      "Revenue is driven by volumes: per-trade transaction charges made up 78.65% of FY26 revenue from operations, with equity options (charged on premium) contributing about 60%. Listing fees, data feeds, index licensing, colocation and clearing fees make up the rest, plus large treasury income on cash and investments.",
      "Costs are mostly fixed technology, staff and regulatory contributions, so operating EBITDA margins run at 65-80%. FY26 profit fell as SEBI's derivatives rules cut options volumes and a co-location settlement provision was booked.",
    ],
    segments: [
      { title: "Equity derivatives (options)", metric: "~Rs 9,996 Cr, 60.2% of revenue", body: "Index and stock options charged on premium; the largest and most regulation-sensitive revenue line. Market share 74.7% in FY26, 68.5% in Q1 FY27." },
      { title: "Equity futures", metric: "99.79% market share", body: "Near-total share of futures turnover (Rs 394 lakh Cr industry, FY26); about 8.3% of revenue." },
      { title: "Cash equities and other trading", metric: "92.99% cash share", body: "Cash market (Rs 261 lakh Cr turnover in FY26), currency, commodity, debt and mutual-fund platforms." },
      { title: "Listing, data, index and colocation", metric: "~21% of revenue", body: "3,005 listed entities, Nifty index licensing, market data feeds and colocation/connectivity - steadier, less volume-linked income." },
    ],
    mix: {
      title: "FY26 revenue from operations by source (approx.)",
      source: "RHP via Angel One and NiftyTrader; futures share and residual split are approximate",
      slices: [
        { label: "Transaction charges on equity options", value: 60.2 },
        { label: "Transaction charges on equity futures", value: 8.3 },
        { label: "Other transaction charges (cash, currency, debt)", value: 10.1 },
        { label: "Listing, data, index, colocation, clearing, other", value: 21.4 },
      ],
    },
  },

  industry: {
    narrative: [
      "India's investor base has roughly doubled in three years: demat accounts went from ~11.4 crore in Mar 2023 to ~22.4 crore by Mar 2026, and NSE's unique registered investors reached 13.24 crore by Jun 2026. Market cap of NSE-listed companies was Rs 474 lakh Cr at 30 Jun 2026.",
      "The RHP's industry report projects cash-market turnover growing 14-16% a year to Rs 473-507 lakh Cr by FY30. Derivatives are the swing factor: SEBI's 2024-25 risk-mitigation rules (fewer weekly expiries, larger lot sizes) and higher STT cut options notional volumes, while BSE has won share with its Sensex options.",
    ],
    chart: {
      title: "Demat accounts in India",
      unit: "crore accounts",
      source: "CDSL and NSDL data (March-end) via Business Standard and Outlook Money; FY26 = CDSL 18.0 Cr + NSDL 4.44 Cr",
      points: [
        { label: "FY23", value: 11.4 },
        { label: "FY24", value: 15.1 },
        { label: "FY25", value: 19.2 },
        { label: "FY26", value: 22.4 },
      ],
    },
    snapshot: [
      { label: "NSE cash-market share, FY26 (RHP)", value: "92.99%", tone: "pos" },
      { label: "NSE equity-futures share, FY26 (RHP)", value: "99.79%", tone: "pos" },
      { label: "NSE options premium share, FY24 to Q1 FY27 (RHP)", value: "96.9% to 68.5%", tone: "neg" },
      { label: "Unique registered investors, Jun 2026", value: "13.24 crore", tone: "pos" },
      { label: "Global equity-derivatives contracts share", value: "51.18%", tone: "pos" },
      { label: "Cash turnover forecast, FY30 (RHP industry report)", value: "Rs 473-507 lakh Cr", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements, via Kotak Neo, Angel One and Chittorgarh",
    years: [
      { label: "FY24", revenue: 14780, ebitda: null, pat: 8306 },
      { label: "FY25", revenue: 17141, ebitda: 12647, pat: 12188 },
      { label: "FY26", revenue: 16601, ebitda: 11098, pat: 10302 },
      { label: "Q1 FY27", revenue: 4560, ebitda: 3594, pat: 3120, partial: true },
    ],
    note: "EBITDA is operating EBITDA excluding other income (Angel One; FY25 derived from its stated -12.25% change, FY24 not found). Sources that include treasury income show far higher EBITDA (Rs 14,519-14,691 Cr in FY26). FY26 PAT includes a ~Rs 1,201 Cr gain on the NSDL stake sale and a Rs 1,391 Cr co-location settlement provision.",
  },

  kpi: {
    title: "NSE share of equity-options premium turnover",
    unit: "%",
    source: "RHP, via Multibagg and Angel One",
    points: [
      { label: "FY24", value: 96.86 },
      { label: "FY25", value: 87.43 },
      { label: "FY26", value: 74.71 },
      { label: "Q1 FY27", value: 68.48 },
    ],
  },
  ratios: [
    { label: "Operating EBITDA margin, FY26", value: "66.9% (78.8% in Q1 FY27)", tone: "pos" },
    { label: "PAT margin on total income, FY26", value: "~55%", tone: "pos" },
    { label: "RoE, FY26", value: "33.0%", tone: "pos" },
    { label: "Net worth, Jun 2026", value: "Rs 34,984 Cr", tone: "neutral" },
    { label: "Cash and equivalents, Mar 2026", value: "Rs 32,312 Cr", tone: "pos" },
    { label: "Diluted EPS, FY26", value: "Rs 41.62", tone: "neutral" },
    { label: "P/E at issue price (FY26)", value: "42.9x", tone: "neutral" },
    { label: "P/B at issue price (Mar 2026 NAV)", value: "~13.8x", tone: "neg" },
  ],

  useOfProceeds: [],
  proceedsNote:
    "Pure offer for sale: all Rs 22,563 Cr went to the 23 selling shareholders; NSE received no money and its share count (247.5 crore) is unchanged. The listing mainly gives existing holders an exit and a market price; NSE bore no new dilution.",
  shareholding: [
    { holder: "LIC", pct: 10.72 },
    { holder: "SBI and SBI Capital Markets", pct: 7.56 },
    { holder: "Aranda Investments (Temasek)", pct: 4.54 },
    { holder: "Stock Holding Corporation of India", pct: 4.44 },
    { holder: "Mahagony, PI Opportunities, Crown Capital, DVI, TIMF", pct: 11.73 },
    { holder: "Other institutions and individuals", pct: 61.01 },
  ],
  sellers: [
    { name: "State Bank of India", detail: "1.60 crore shares, ~Rs 2,850 Cr" },
    { name: "Canada Pension Plan Investment Board", detail: "1.19 crore shares, ~Rs 2,119 Cr" },
    { name: "Aranda Investments (Mauritius)", detail: "1.12 crore shares, ~Rs 2,007 Cr" },
    { name: "MS Strategic (Mauritius)", detail: "1.10 crore shares, ~Rs 1,963 Cr" },
    { name: "New India Assurance", detail: "1.05 crore shares, ~Rs 1,874 Cr" },
    { name: "SBI Capital Markets", detail: "0.88 crore shares, ~Rs 1,567 Cr" },
  ],

  peers: [
    { name: "BSE", ticker: "BSE", note: "Only other listed Indian equity exchange; gaining options share." },
    { name: "Multi Commodity Exchange", ticker: "MCX", note: "Commodity derivatives exchange." },
    { name: "CDSL", ticker: "CDSL", note: "Depository; benefits from the same retail investor growth." },
    { name: "CAMS", ticker: "CAMS", note: "Mutual-fund registrar and transfer agent." },
  ],
  valuationNote:
    "At the Rs 1,785 issue price NSE was valued at 42.9x FY26 diluted EPS of Rs 41.62 (35x on annualised Q1 FY27), below BSE's P/E (see the table) despite far larger scale and share. On 16 Oct 2026 it closed at Rs 1,749 (market cap Rs 4,32,989 Cr), which is ~42x the same FY26 EPS and ~41x trailing twelve-month profit to Jun 2026 (~Rs 10,500 Cr). Screener showed 47.1x that day; that figure implies trailing profit of only ~Rs 9,200 Cr, below reported FY26 PAT, so it is not comparable with the EPS-based multiples here.",

  strengths: [
    { title: "Dominant market share", body: "93% of cash equities and ~99.8% of equity futures, plus the world's largest derivatives franchise by contracts - network effects that are hard to dislodge." },
    { title: "Exceptional profitability", body: "Operating EBITDA margin of 67-79% and RoE of ~33% with no debt need; Rs 32,312 Cr of cash at Mar 2026." },
    { title: "Structural growth in investor participation", body: "Unique investors rose from 3.1 crore (Mar 2020) to 13.2 crore (Jun 2026), lifting cash volumes, listings and data income." },
    { title: "Diversified ecosystem", body: "Clearing, Nifty indices, data, colocation and listing businesses add less volume-linked revenue alongside trading." },
  ],
  risks: [
    { risk: "Dependence on equity options: 60% of revenue, exposed to SEBI curbs, STT changes and retail pull-back", mitigant: "Cash, futures and non-transaction revenue are growing; Q1 FY27 revenue still rose 13%", severity: "high" },
    { risk: "Loss of options share to BSE (96.9% in FY24 to 68.5% in Q1 FY27)", mitigant: "NSE still holds over two-thirds of premium and near-total futures share", severity: "high" },
    { risk: "Unresolved co-location and dark-fibre cases; proposed settlement of ~Rs 1,491 Cr and pending Supreme Court appeals", mitigant: "Rs 1,391 Cr already provided in FY26; settlement reportedly approved internally by SEBI", severity: "medium" },
    { risk: "Technology outages or cyber incidents at a systemically important exchange", mitigant: "Large tech spend and regulator-mandated resilience standards", severity: "medium" },
    { risk: "Share supply: anchor lock-ins end 21 Oct and 20 Dec 2026, and pre-IPO holders' 6-month lock-in ends in Mar 2027", mitigant: "Many large holders (e.g. LIC) are long-term institutions", severity: "low" },
  ],

  outlook: {
    bull: "Options volumes stabilise after the SEBI reset, NSE holds ~70% premium share, cash and listing income keep compounding with investor growth, and earnings resume 15%+ growth - supporting a premium to global exchanges.",
    base: "Revenue grows high-single to low-double digits as cash volumes rise but options share drifts lower; margins stay ~70% and the stock tracks earnings from ~40-45x.",
    bear: "Further derivatives curbs or a STT hike cut options volumes again, BSE keeps gaining share, and a large co-location settlement or outage hits sentiment - the multiple compresses toward 30x.",
  },
  sources: [
    { title: "National Stock Exchange of India Limited - RHP (abridged prospectus)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/sep-2026/national-stock-exchange-of-india-limited-rhp_104428.html", year: "2026" },
    { title: "NSE IPO: dates, sellers, financials, listing", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/nse-ipo/", year: "2026" },
    { title: "NSE IPO report: market position, financial performance", source: "Angel One", url: "https://www.angelone.in/news/research/nse-ipo-report-sep-11-2026-market-position-financial-performance-and-ipo-overview", year: "2026" },
    { title: "NSE IPO subscription, anchors and financials", source: "Kotak Neo", url: "https://www.kotakneo.com/ipo/nse-ipo/", year: "2026" },
    { title: "SEBI issues observation letter for Rs 30,000 crore NSE IPO", source: "The Hans India (IANS)", url: "https://www.thehansindia.com/business/sebi-issues-observation-letter-for-rs-30000-crore-nse-ipo-1118058", year: "2026" },
    { title: "NSE IPO DRHP 2026: valuation, risks", source: "Finnovate", url: "https://www.finnovate.in/learn/blog/nse-ipo-drhp-2026-valuation-analysis", year: "2026" },
    { title: "NSE top 10 shareholders ahead of IPO", source: "HDFC Sky", url: "https://hdfcsky.com/news/nse-ipo-top-10-stakeholders-revealed-as-12-64-crore-shares-go-on-sale", year: "2026" },
    { title: "National Stock Exchange of India - share price and financials", source: "Screener", url: "https://www.screener.in/company/544937/consolidated/", year: "2026" },
  ],
};
