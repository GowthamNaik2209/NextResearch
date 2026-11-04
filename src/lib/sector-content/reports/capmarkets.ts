import type { SectorReport } from "./types";

export const capmarkets: SectorReport = {
  slug: "capmarkets",
  title: "India Capital Markets",
  subtitle: "Exchanges, depositories, registrars, fund houses, brokers and wealth managers - the toll roads on India's savings",
  asOf: "Nov 2026",

  stance: {
    label: "Positive on plumbing, cautious on F&O",
    tone: "neutral",
    line: "SIP flows and new investors keep growing the steady layers (registrars, depositories, AMCs); options-linked earnings at exchanges and brokers stay hostage to SEBI and tax changes.",
  },
  keyStats: [
    { label: "Mutual-fund AUM, Sep 2026", value: "₹82.6L Cr", sub: "₹73.7L Cr at Mar 2026 (AMFI)" },
    { label: "Monthly SIP inflow, Sep 2026", value: "₹32,490 Cr", sub: "record; ~10 crore SIP accounts (AMFI)" },
    { label: "Demat accounts, Jul 2026", value: "~23.4 crore", sub: "11.4 crore in Mar 2023 (CDSL, NSDL)" },
    { label: "Options trading volumes, FY26", value: "down ~50%", sub: "after SEBI's F&O curbs (SEBI annual report)" },
  ],
  thesis: [
    {
      title: "Household savings are moving into markets",
      body: "Demat accounts doubled in three years and SIPs are a ₹32,000 Cr-a-month habit. AMCs, registrars and depositories earn a share of every rupee and every account - a steady, compounding fee stream.",
    },
    {
      title: "Options made the boom - and are now being cut back",
      body: "Equity options drove exchange and discount-broker profits in FY23-FY25. SEBI's curbs from Nov 2024 and the higher STT from Apr 2026 have reset volumes; BSE's Sensex options have taken about a third of premium turnover from NSE.",
    },
    {
      title: "Near-monopolies, now almost all listed",
      body: "NSE (Sep 2026), SBI Funds (Jul 2026), ICICI Prudential AMC, Groww, NSDL and Canara Robeco all listed in 2025-26. Investors can now own nearly every toll booth: two depositories, two registrars, three exchanges.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "SIPs hit a record as debt funds bleed",
      body: "AMFI's September data showed SIP inflows of ₹32,490 Cr and equity net inflows near ₹38,300 Cr, while industry AUM fell 5.1% to ₹82.6L Cr on large debt-fund outflows at quarter-end.",
      impact: "pos",
      tag: "Flows",
    },
    {
      date: "Sep 2026",
      title: "NSE lists after a ~₹22,562 Cr offer for sale",
      body: "NSE's IPO, a pure offer for sale by 23 shareholders, was priced at the top of its band and listed on BSE on 24 Sep 2026. Its options premium share had fallen to ~68% in Q1 FY27 from ~97% in FY24 (RHP).",
      impact: "neutral",
      tag: "Listing",
    },
    {
      date: "Jul 2026",
      title: "SBI Funds lists; RBI broker-funding rules start",
      body: "India's largest AMC listed on 21 Jul 2026 after a ~42-times-subscribed OFS. From 1 Jul, RBI's capital-market exposure rules require fuller collateral for bank guarantees to brokers and bar bank funding of proprietary trading.",
      impact: "neutral",
      tag: "Regulation",
    },
    {
      date: "Apr 2026",
      title: "Higher STT and new SEBI fund rules take effect",
      body: "STT on futures rose to 0.05% (from 0.02%) and on options premium to 0.15% (from 0.1%). SEBI's new mutual-fund regulations split expense ratios into a base fee, brokerage and levies, and halved the brokerage schemes may pay (cash 6 bps, derivatives 2 bps).",
      impact: "neg",
      tag: "Policy",
    },
    {
      date: "Feb 2026",
      title: "Budget surprises with an F&O tax hike",
      body: "Union Budget 2026-27 raised STT on derivatives from 1 Apr 2026. SEBI's chair later said no further F&O curbs were being considered for now and weekly expiry days would stay unchanged.",
      impact: "neg",
      tag: "Tax",
    },
    {
      date: "Jul 2025",
      title: "SEBI's Jane Street order",
      body: "SEBI barred Jane Street and impounded ~₹4,844 Cr over alleged Bank Nifty manipulation. The firm deposited the amount and is contesting the order at SAT (hearings continuing in Oct 2026); the case showed how much options volume a few large traders supplied.",
      impact: "neg",
      tag: "Enforcement",
    },
  ],

  overview: {
    headline: "Mutual-fund assets grew ~19% a year from FY21 to Sep 2026, to ₹82.6L Cr, with no down year",
    narrative: [
      "India's capital-markets chain earns small fees on very large flows: a management fee on ₹82L Cr of fund assets, a charge on every trade, a fee for every demat account and fund transaction. Most of these businesses need little capital and pay out much of their profit.",
      "Returns differ by layer. Exchanges, depositories and registrars are regulated duopolies with very high margins. AMCs and wealth managers compound with assets but face SEBI fee cuts. Brokers and investment banks are the most cyclical.",
      "The swing factor is regulation of derivatives. SEBI's 2024-26 rules and higher STT cut options volumes sharply, shifting growth toward cash equities, SIPs, commodities (MCX) and fee-based wealth.",
    ],
    chart: {
      title: "Mutual-fund industry AUM (March-end; latest Sep 2026)",
      unit: "₹ lakh crore",
      source: "AMFI monthly data",
      points: [
        { label: "FY21", value: 31.4 },
        { label: "FY22", value: 37.6 },
        { label: "FY23", value: 39.4 },
        { label: "FY24", value: 53.4 },
        { label: "FY25", value: 65.7 },
        { label: "FY26", value: 73.7 },
        { label: "Sep 26", value: 82.6 },
      ],
    },
    snapshot: [
      { label: "SIP assets share of MF AUM, Sep 2026 (AMFI)", value: "21.6%", tone: "pos" },
      { label: "NSE options premium share, Q1 FY27 (NSE RHP)", value: "~68%, from ~97% in FY24", tone: "neg" },
      { label: "CAMS share of MF AUM serviced, Q2 FY27", value: "~67% (KFin the rest)", tone: "neutral" },
      { label: "Demat accounts by depository, Jul 2026", value: "CDSL ~18.8 Cr, NSDL ~4.6 Cr", tone: "neutral" },
      { label: "STT on options premium from Apr 2026", value: "0.15% (was 0.1%)", tone: "neg" },
      { label: "Individual F&O traders who lost money, FY26 (SEBI study, Aug 2026)", value: "87.7%", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Fund management", zoneIds: ["amc"], margin: "High operating margins on equity AUM", moat: "medium", note: "Scale and brand win SIP flows; SEBI's falling expense slabs are the cap." },
    { stage: "Distribution & wealth", zoneIds: ["distribution", "wealth"], margin: "Trail and advisory fees on AUM", moat: "medium", note: "Relationships matter for HNIs and small towns; direct plans erode the cheap end." },
    { stage: "Broking & banking", zoneIds: ["brokers", "ibanking"], margin: "Volume-linked, cyclical", moat: "low", note: "Price competition and F&O rules swing earnings; margin-funding books add steadier income." },
    { stage: "Exchanges & ratings", zoneIds: ["exchanges", "ratings"], margin: "Very high for exchanges", moat: "high", note: "Network effects in liquidity; ratings are an issuer-paid oligopoly." },
    { stage: "Depositories & registrars", zoneIds: ["depositories", "registrars"], margin: "High, utility-like", moat: "high", note: "Two players each, regulated pricing, long contracts and near-zero switching." },
  ],

  drivers: [
    { title: "SIP habit", metric: "₹32,490 Cr a month", body: "Record SIP inflows in Sep 2026 (AMFI) keep equity AUM growing through market dips, feeding AMCs, registrars and distributors." },
    { title: "New investors", metric: "~23.4 crore demat accounts", body: "Accounts doubled from Mar 2023 to Jul 2026; each one pays depositories and brokers, and smaller towns are the fastest-growing source." },
    { title: "Primary markets", metric: "NSE, SBI Funds, ICICI Pru AMC listed", body: "A deep IPO pipeline feeds bankers, listing fees, registrar allotments and new wealth for private-wealth firms." },
    { title: "Commodity options", metric: "MCX options turnover tripled", body: "Bullion options lifted MCX's Q1 FY27 options turnover more than threefold year on year - growth outside SEBI's equity F&O curbs." },
  ],
  mix: {
    title: "Demat accounts by depository, Jul 2026",
    source: "CDSL and NSDL data via industry reports (Asianet Newsable, Aug 2026)",
    slices: [
      { label: "CDSL", value: 80 },
      { label: "NSDL", value: 20 },
    ],
  },

  pestle: {
    political: [
      { point: "Government wants household savings in financial assets and keeps listing state-linked firms (SBI Funds, NSE's shareholders, LIC).", impact: "pos" },
      { point: "Derivatives are politically sensitive: the 2026 Budget raised STT to cool retail F&O.", impact: "neg" },
    ],
    economic: [
      { point: "Rising incomes and the shift from gold, property and deposits grow AUM and accounts.", impact: "pos" },
      { point: "Fees are a share of market value, so earnings fall with markets (debt outflows cut AUM 5% in Sep 2026).", impact: "neg" },
    ],
    social: [
      { point: "SIP investing has become a mass habit, including in smaller towns.", impact: "pos" },
      { point: "SEBI studies show ~9 in 10 individual F&O traders lose money - pressure to restrict speculation continues.", impact: "neg" },
    ],
    technological: [
      { point: "App-based brokers and UPI-linked payments cut the cost of onboarding to near zero.", impact: "pos" },
      { point: "Outages and cyber incidents on expiry days carry SEBI penalties and reputational damage.", impact: "neg" },
    ],
    legal: [
      { point: "SEBI sets expiry days, lot sizes, expense ratios and depository charges - one circular can reprice a business.", impact: "neg" },
      { point: "New SEBI mutual-fund regulations (Apr 2026) add transparency but cut brokerage caps.", impact: "neutral" },
    ],
    environmental: [
      { point: "ESG ratings and disclosures (BRSR) create new work for raters and data providers.", impact: "pos" },
      { point: "Few direct environmental risks in an asset-light, office-based industry.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "cams", tier: "core", why: "Services about two-thirds of fund AUM; grows with SIPs without capital or market-share fights." },
    { key: "cdsl", tier: "core", why: "Holds about four in five demat accounts - every new investor adds to its base." },
    { key: "hdfcAmc", tier: "core", why: "Equity-heavy, high-margin fund house with a long payout record." },
    { key: "nse", tier: "core", why: "Owner of India's main trading venue, clearing house and Nifty indices." },
    { key: "kfin", tier: "direct", why: "Second fund registrar and leading issuer registrar; gains from new AMCs and IPOs." },
    { key: "sbiFunds", tier: "direct", why: "Largest AMC with SBI's branch network behind it." },
    { key: "mcx", tier: "direct", why: "Commodity-options growth sits outside equity F&O curbs." },
    { key: "three60One", tier: "direct", why: "Largest listed private-wealth platform; shifting to recurring fees." },
    { key: "groww", tier: "indirect", why: "Largest broker and direct-SIP platform, but F&O-sensitive." },
    { key: "bse", tier: "indirect", why: "Won a third of options premium - and is the most exposed to further curbs." },
  ],

  companyNews: [
    { key: "angelOne", date: "Oct 2026", development: "Q2 FY27 profit rose ~58% YoY to ₹335 Cr; client base ~4 crore, but orders fell ~10% QoQ and its retail equity turnover share slipped ~0.5 pt to ~19.7%.", impact: "Broker profits recovered from the curbs, but order growth has stalled.", tone: "neutral" },
    { key: "cams", date: "Oct 2026", development: "Q2 FY27 revenue rose ~10% and profit ~14% as serviced AUM reached ~₹58L Cr; share of industry AUM slipped to ~67%.", impact: "Registrar growth tracks AUM, slowed by telescopic pricing.", tone: "neutral" },
    { key: "hdfcAmc", date: "Oct 2026", development: "Q2 FY27 profit grew ~4% YoY to ~₹750 Cr on ~14% revenue growth; quarterly AUM share steady at ~11%.", impact: "Shows how fee-yield pressure and costs slow AMC profit even as AUM grows.", tone: "neutral" },
    { key: "nse", date: "Sep 2026", development: "Listed on BSE on 24 Sep 2026 after a ₹22,561.57 Cr pure offer for sale, priced at the top of the band.", impact: "Completes the listing of India's core market infrastructure; NSE receives no new money.", tone: "neutral" },
    { key: "mcx", date: "Aug 2026", development: "Q1 FY27 profit roughly doubled YoY to ~₹413 Cr; options notional turnover more than tripled on bullion contracts.", impact: "Commodity options are the fastest-growing exchange revenue in India.", tone: "pos" },
    { key: "sbiFunds", date: "Jul 2026", development: "Listed on 21 Jul 2026 at a ~7% premium after a ~42-times-subscribed OFS by SBI and Amundi; slipped below the issue price within weeks.", impact: "Gives investors the industry's largest AMC, at a valuation the market questioned.", tone: "neutral" },
  ],

  risks: [
    { risk: "Further F&O restrictions or tax increases", mitigant: "Growth in cash equities, SIPs, commodities and listing/data income", severity: "high" },
    { risk: "Prolonged equity bear market", mitigant: "Sticky SIP books, annual issuer and account fees, ratings income", severity: "high" },
    { risk: "SEBI fee cuts (expense ratios, depository and registrar charges)", mitigant: "Scale benefits and volume growth offset lower yields", severity: "medium" },
    { risk: "Concentration of volumes in a few large traders, and outages", mitigant: "Surveillance upgrades, wider retail and institutional base", severity: "medium" },
  ],
  outlook: {
    bull: "SIPs keep compounding above ₹30,000 Cr a month, markets rise, options volumes stabilise under the new rules and the IPO pipeline stays full - every layer grows together.",
    base: "AUM-linked layers (AMCs, registrars, wealth) grow mid-teens; depositories grow with accounts; exchange and broker earnings move with options volumes, now flat to modestly growing.",
    bear: "A long market fall cuts AUM and stops SIPs while SEBI tightens F&O again and trims fund fees - fee yields and volumes fall at the same time.",
  },
  reading: [
    { title: "Monthly mutual-fund data: AUM, SIP flows, folios", source: "AMFI", url: "https://www.amfiindia.com/research-information/amfi-monthly", year: "2026" },
    { title: "Market Pulse: monthly review of investors, volumes and market structure", source: "National Stock Exchange of India", url: "https://www.nseindia.com/research/publications-reports-nse-market-pulse", year: "2026" },
    { title: "SEBI reports and studies (F&O trader profitability)", source: "SEBI", url: "https://www.sebi.gov.in/reports-and-statistics/reports.html", year: "2026" },
    { title: "Net losses of individual F&O traders widened in FY25", source: "Business Standard", url: "https://www.business-standard.com/markets/news/net-losses-of-traders-in-fo-widens-in-fy25-sebi-study-125070701221_1.html", year: "2025" },
  ],
};
