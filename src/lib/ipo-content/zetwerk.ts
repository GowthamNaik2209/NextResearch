import type { IpoReport } from "./types";

export const zetwerk: IpoReport = {
  slug: "zetwerk",
  name: "Zetwerk",
  legalName: "Zetwerk Manufacturing Businesses Limited",
  icon: "ZET",
  sectorLabel: "Contract manufacturing & industrial supply",
  tagline: "An asset-light manufacturing platform raises Rs 5,012 Cr at ~Rs 25,583 Cr, still loss-making",
  asOf: "Oct 2026",

  status: {
    stage: "open",
    label: "Open till 19 Oct",
    detail:
      "Bidding opened 15 Oct after a Rs 2,251 Cr anchor book; the issue was 0.31x subscribed at the end of day 2 (QIB 0.37x, retail 0.36x, NII 0.16x, per BSE data via Inc42). It closes Mon 19 Oct, with allotment on 21 Oct and listing on BSE and NSE expected 23 Oct.",
  },
  timeline: [
    { date: "Mar 2026", event: "Confidential pre-filing of the draft offer document with SEBI", done: true },
    { date: "9 Jul 2026", event: "SEBI final observation letter", done: true },
    { date: "14 Aug 2026", event: "UDRHP-I made public (Rs 2,600 Cr fresh + 9.68 crore-share OFS)", done: true },
    { date: "11 Oct 2026", event: "RHP filed; fresh issue raised to Rs 2,830 Cr, OFS to 14.45 crore shares", done: true },
    { date: "14 Oct 2026", event: "Anchor book: Rs 2,251 Cr", done: true },
    { date: "15 Oct 2026", event: "Issue opens", done: true },
    { date: "19 Oct 2026", event: "Issue closes; allotment 21 Oct (tentative)", done: false },
    { date: "23 Oct 2026", event: "Listing on BSE and NSE (tentative)", done: false },
  ],

  issue: {
    size: "Rs 5,012 Cr (at upper band)",
    totalCr: 5012,
    freshCr: 2830,
    ofsCr: 2182,
    ofsShares: "14.45 crore shares",
    priceBand: "Rs 143 - 151",
    lotSize: "99 shares (Rs 14,949 at upper band)",
    faceValue: "Rs 1",
    valuation: "~Rs 25,583 Cr post-issue market cap at the upper band (169.43 crore shares)",
    valuationCr: 25583,
    reservation: "QIB 75% · NII 15% · Retail 10% of the net offer; plus 7 lakh shares for employees at a Rs 14 discount",
    exchanges: "BSE, NSE",
    leadManagers: [
      "Kotak Mahindra Capital",
      "Morgan Stanley India",
      "Goldman Sachs (India) Securities",
      "Avendus Capital",
      "JM Financial",
      "HSBC Securities & Capital Markets (India)",
      "Pantomath Capital Advisors",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Scale without profits yet",
    tone: "neutral",
    line: "Revenue and the manufacturing order book are growing fast, but adjusted EBITDA margin is under 3%, operating cash flow is negative and the group still reports losses; ~1.6x sales is cheap only if margins rise from here.",
  },
  keyStats: [
    { label: "Issue size", value: "Rs 5,012 Cr", sub: "Rs 2,830 Cr fresh + Rs 2,182 Cr offer for sale" },
    { label: "Valuation at upper band", value: "~Rs 25,583 Cr", sub: "~1.6x FY26 revenue; ~61x FY26 adj. EBITDA" },
    { label: "Revenue, FY26", value: "Rs 15,913 Cr", sub: "+40.4% YoY; adj. EBITDA margin 2.65%" },
    { label: "Manufacturing order book", value: "Rs 13,062 Cr", sub: "Jun 2026; Rs 6,170 Cr at Mar 2024" },
  ],
  thesis: [
    {
      title: "A manufacturing platform at Rs 15,900 Cr scale",
      body: "Zetwerk takes orders for custom industrial goods and routes them to a network of third-party suppliers and its own plants in India, the US and Mexico. FY26 revenue from continuing operations rose 40.4% to Rs 15,913 Cr and Q1 FY27 grew 55.4%.",
    },
    {
      title: "Energy products are the growth engine",
      body: "Energy products (solar structures, transformers and power equipment) grew 87% to Rs 6,508 Cr in FY26 and are ~69% of manufacturing revenue; the manufacturing order book doubled from Rs 6,170 Cr (Mar 2024) to Rs 13,062 Cr (Jun 2026).",
    },
    {
      title: "A clean-up IPO",
      body: "Rs 2,160 Cr of the fresh issue repays debt at the company and nine subsidiaries, against Rs 1,942 Cr of borrowings at Jun 2026; the loss-making civil infrastructure business has been classified as discontinued and put up for sale.",
    },
  ],

  business: {
    narrative: [
      "Zetwerk, which began operations in 2018 under founders Amrit Pratik Acharya and Srinath Ramakkrushnan, sells custom manufactured goods as a principal: it contracts with the customer, designs or sources the part, and has it made by third-party suppliers or in its own facilities, coordinated through its Zetwerk OS software. It has cumulatively delivered goods worth Rs 74,374 Cr of GMV.",
      "It reports two continuing segments. The Manufacturing Business (59% of FY26 revenue) makes energy products, precision components and capital goods, with a 6.0% segment EBITDA margin. The Ecosystem Business (Terra91, ~41%) trades industrial commodities such as steel, aluminium, copper, zinc and bitumen at thin margins.",
      "Most revenue is domestic (82.5% India in FY26); the US contributed 14.3%, down from 21.5% in FY24 after US tariffs on Indian solar piles hit orders. The civil infrastructure works segment (water pipelines, rail track) was discontinued in FY26 and is being sold.",
    ],
    segments: [
      { title: "Energy products", metric: "Rs 6,508 Cr FY26 revenue", body: "Solar module mounting structures, transformers and transmission and power equipment; +87% in FY26 and the largest part of the order book." },
      { title: "Precision products", metric: "Rs 1,397 Cr FY26 revenue", body: "High-tolerance components and electronics sub-assemblies for consumer electronics, automotive and aerospace customers." },
      { title: "Capital goods", metric: "Rs 1,464 Cr FY26 revenue", body: "Heavy fabricated equipment and industrial machinery for oil and gas, chemicals, metals and mining projects." },
      { title: "Ecosystem Business (Terra91)", metric: "~Rs 6,539 Cr FY26 revenue", body: "Sale of industrial commodities - ferrous and non-ferrous metals, petrochemicals and bitumen - to manufacturers; high volume, low margin." },
      { title: "Civil infrastructure (discontinued)", metric: "Rs 642 Cr FY26 loss", body: "Water pipeline and rail-track construction, shut and put up for sale in 2026; it carried a Rs 453 Cr impairment and further bad-debt provisions in Q1 FY27." },
    ],
    mix: {
      title: "Share of FY26 revenue from continuing operations",
      source: "RHP (11 Oct 2026), KPI table; Ecosystem derived as total less Manufacturing segment revenue",
      slices: [
        { label: "Commodities trading (Ecosystem business)", value: 41.1 },
        { label: "Energy products", value: 40.9 },
        { label: "Capital goods", value: 9.2 },
        { label: "Precision products", value: 8.8 },
      ],
    },
  },

  industry: {
    narrative: [
      "The Redseer report commissioned for the RHP sizes India's manufacturing procurement of durable goods (production equipment plus materials consumed by end-use industries) at Rs 17.4 lakh Cr in FY26, up from Rs 9.4 lakh Cr in FY21, and projects Rs 37.5-42.6 lakh Cr by FY31. The US market is three times larger but growing far more slowly.",
      "Growth is led by electrical equipment, consumer electronics and energy and power equipment, helped by PLI schemes, the China+1 shift and grid and renewable investment. The RHP states there is no listed company in India or abroad with the same model, so the nearest comparables are EMS, solar and transmission-equipment makers.",
    ],
    chart: {
      title: "India's manufacturing procurement of durable goods",
      unit: "Rs lakh Cr",
      source: "Redseer report in the Zetwerk RHP (Exhibit 11): FY21, FY26 and FY31P (midpoint of Rs 37.5-42.6 lakh Cr); the RHP gives no other years",
      points: [
        { label: "FY21", value: 9.42 },
        { label: "FY26", value: 17.37 },
        { label: "FY31P", value: 40.06, projected: true },
      ],
    },
    snapshot: [
      { label: "India durable-goods procurement, FY21-26", value: "~13% CAGR", tone: "pos" },
      { label: "India durable-goods procurement, FY31P", value: "Rs 37.5-42.6 lakh Cr", tone: "pos" },
      { label: "US durable-goods procurement, FY26", value: "Rs 53.1 lakh Cr, ~3% CAGR", tone: "neutral" },
      { label: "Manufacturing FDI into India, FY25", value: "Rs 1.62 lakh Cr, +18%", tone: "pos" },
      { label: "Listed peers with the same model (per RHP)", value: "None in India or globally", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated statements, continuing operations (SEBI, 11 Oct 2026); EBITDA is the RHP's adjusted EBITDA",
    years: [
      { label: "FY24", revenue: 12364, ebitda: 97, pat: -918 },
      { label: "FY25", revenue: 11332, ebitda: 323, pat: -371 },
      { label: "FY26", revenue: 15913, ebitda: 421, pat: -1606 },
      { label: "Q1 FY27", revenue: 4118, ebitda: 103, pat: -733, partial: true },
    ],
    note: "EBITDA is adjusted (before share-based pay and exceptional items). PAT includes the discontinued civil infrastructure business (FY26 loss Rs 642 Cr) and a Rs 836 Cr non-cash FY26 charge on share-conversion ratios; the continuing-operations loss before exceptional items and tax fell from Rs 427 Cr in FY24 to Rs 81 Cr in FY26. Chittorgarh shows total income (Rs 16,101 Cr in FY26), not revenue from operations.",
  },

  kpi: {
    title: "Manufacturing order book",
    unit: "Rs Cr",
    source: "RHP KPI table; Business Today (UDRHP-I) for Mar 2024 and Mar 2026",
    points: [
      { label: "Mar 2024", value: 6170 },
      { label: "Mar 2025", value: 8629 },
      { label: "Mar 2026", value: 12370 },
      { label: "Jun 2026", value: 13062 },
    ],
  },
  ratios: [
    { label: "Gross margin, FY26", value: "12.1% (7.7% in FY24)", tone: "neutral" },
    { label: "Adjusted EBITDA margin, FY26", value: "2.65% (2.51% in Q1 FY27)", tone: "neg" },
    { label: "Manufacturing segment EBITDA margin, FY26", value: "6.0%", tone: "neutral" },
    { label: "Operating cash flow, FY26", value: "-Rs 682 Cr (-Rs 506 Cr in Q1 FY27)", tone: "neg" },
    { label: "Net worth, Jun 2026", value: "Rs 4,094 Cr", tone: "neutral" },
    { label: "Total borrowings, Jun 2026", value: "Rs 1,942 Cr", tone: "neutral" },
    { label: "Top 10 customers, FY26", value: "35.9% of revenue", tone: "neg" },
    { label: "Price / sales at upper band (FY26)", value: "~1.6x", tone: "pos" },
  ],

  useOfProceeds: [
    { label: "Repay or prepay borrowings of Zetwerk", valueCr: 1300 },
    { label: "Invest in nine subsidiaries to repay their borrowings", valueCr: 860 },
  ],
  proceedsNote:
    "Rs 2,160 Cr of the Rs 2,830 Cr fresh issue repays debt in FY27. The balance, after issue expenses, funds unidentified acquisitions and general corporate purposes (together capped at 35% of gross proceeds). The Rs 2,182 Cr OFS goes to selling shareholders, not the company.",
  shareholding: [
    { holder: "Greenoaks Capital funds", pct: 19.62 },
    { holder: "Founders Amrit Acharya & Srinath Ramakkrushnan (promoters)", pct: 15.86 },
    { holder: "Peak XV Partners", pct: 12.11 },
    { holder: "Lightspeed funds", pct: 9.85 },
    { holder: "Accel India V", pct: 7.72 },
    { holder: "D1 Capital Partners", pct: 5.21 },
    { holder: "Promoter group (Creovate, family trusts)", pct: 4.8 },
    { holder: "Other investors, employees and ESOPs", pct: 24.83 },
  ],
  sellers: [
    { name: "Lightspeed (three funds)", detail: "2.83 crore shares, ~Rs 427 Cr at the upper band" },
    { name: "Peak XV Partners (two funds)", detail: "2.34 crore shares, ~Rs 353 Cr" },
    { name: "Creovate Innovation (promoter group)", detail: "2.30 crore shares, ~Rs 347 Cr" },
    { name: "Founders Amrit Pratik Acharya and Srinath Ramakkrushnan", detail: "1.42 crore shares each, ~Rs 215 Cr each; promoters fall to ~11% post-issue" },
    { name: "Kae Capital Fund II", detail: "1.26 crore shares, ~Rs 190 Cr" },
    { name: "Accel India V and other sellers", detail: "Accel 1.20 crore shares (~Rs 181 Cr); other selling shareholders 1.68 crore shares (~Rs 254 Cr), taking the OFS to 14.45 crore shares" },
  ],

  peers: [
    { name: "Dixon Technologies", ticker: "DIXON", mcapCr: 75342, revenueCr: 51585, pe: 40.1, note: "Largest listed EMS company; benchmark for precision and electronics. Screener, 16 Oct 2026, TTM." },
    { name: "Waaree Energies", ticker: "WAAREEENER", mcapCr: 73898, revenueCr: 30043, pe: 18.4, note: "Solar module maker; comparable to the energy-products business. Screener, 16 Oct 2026, TTM." },
    { name: "Kaynes Technology India", ticker: "KAYNES", mcapCr: 22089, revenueCr: 3899, pe: 63.6, note: "EMS and precision electronics for industrial and aerospace customers. Screener, 16 Oct 2026, TTM." },
    { name: "Skipper", ticker: "SKIPPER", mcapCr: 6424, revenueCr: 5609, pe: 27.6, note: "Transmission towers and engineering products. Screener, 16 Oct 2026, TTM." },
  ],
  valuationNote:
    "At ~Rs 25,583 Cr Zetwerk is valued at ~1.6x FY26 revenue, between Dixon (~1.5x) and Waaree (~2.5x) and far below Kaynes (~5.7x), but it has no earnings to put on a P/E and ~41% of revenue is low-margin commodity trading; on adjusted EBITDA the multiple is ~61x.",

  strengths: [
    { title: "Asset-light, multi-sector platform", body: "A network of third-party suppliers plus 20+ own facilities lets Zetwerk take orders across energy, electronics, aerospace and capital goods without building every plant itself." },
    { title: "Growing order book", body: "Manufacturing order book of Rs 13,062 Cr at Jun 2026, about 1.4x FY26 manufacturing revenue, with new orders of Rs 15,393 Cr in FY26." },
    { title: "Technology layer (Zetwerk OS)", body: "Proprietary software that runs supplier matching, quality control and order tracking across a network of 10,000+ suppliers." },
    { title: "Exposure to India's capex and energy build-out", body: "Energy products ride solar and grid investment, and the China+1 shift brings global buyers to Indian suppliers; 1,802 customers in FY26." },
  ],
  risks: [
    { risk: "Continuing losses and negative operating cash flow in every period shown (FY26 -Rs 682 Cr), with the discontinued civil business still taking provisions", mitigant: "Rs 2,160 Cr of debt repayment and the exit from civil infrastructure", severity: "high" },
    { risk: "Thin margins: 2.65% adjusted EBITDA margin, with ~41% of revenue from commodity trading exposed to metal-price swings", mitigant: "Manufacturing segment earns ~6% EBITDA and its share is rising", severity: "high" },
    { risk: "Dependence on third-party suppliers for quality, capacity and timely delivery", mitigant: "Zetwerk OS quality controls and a mix of owned facilities", severity: "medium" },
    { risk: "Customer concentration: top 10 customers were 35.9% of FY26 revenue", mitigant: "Customer base widened to 1,802 in FY26", severity: "medium" },
    { risk: "US trade policy: tariffs on Indian solar piles cut FY25 orders, and the US is 14.3% of revenue", mitigant: "New contracts allow tariffs to be passed through; India share rose to 82.5%", severity: "medium" },
  ],

  outlook: {
    bull: "The energy order book converts at 6%+ segment margins, the commodity share shrinks, debt repayment cuts interest, and the company turns profitable by FY28 - the stock re-rates toward EMS multiples.",
    base: "Revenue grows 25-30% a year but group margins stay in low single digits; the stock tracks order wins and the pace at which losses narrow.",
    bear: "Commodity swings, supplier problems or more civil-business write-offs keep losses high and cash burn continues, pushing the stock below the IPO price with little earnings support.",
  },
  sources: [
    { title: "Zetwerk Manufacturing Businesses Limited - RHP", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/oct-2026/zetwerk-manufacturing-businesses-limited-rhp_105195.html", year: "2026" },
    { title: "Zetwerk IPO date, price, issue details and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/zetwerk-ipo/3091/", year: "2026" },
    { title: "Zetwerk IPO subscribed 27% on day 2 so far", source: "Inc42", url: "https://inc42.com/buzz/zetwerk-ipo-subscribed-27-on-day-2-so-far-qib-retail-portions-booked-32-each/", year: "2026" },
    { title: "Zetwerk files updated IPO papers with SEBI for Rs 2,600 crore fresh issue", source: "Business Today", url: "https://www.businesstoday.in/markets/ipo-corner/story/zetwerk-files-updated-ipo-papers-with-sebi-for-rs-2600-crore-fresh-issue-549165-2026-08-14", year: "2026" },
    { title: "Dixon Technologies consolidated financials", source: "Screener", url: "https://www.screener.in/company/DIXON/consolidated/", year: "2026" },
    { title: "Waaree Energies consolidated financials", source: "Screener", url: "https://www.screener.in/company/WAAREEENER/consolidated/", year: "2026" },
    { title: "Kaynes Technology consolidated financials", source: "Screener", url: "https://www.screener.in/company/KAYNES/consolidated/", year: "2026" },
  ],
};
