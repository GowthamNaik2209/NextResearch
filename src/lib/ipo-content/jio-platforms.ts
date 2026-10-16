import type { IpoReport } from "./types";

export const jioPlatforms: IpoReport = {
  slug: "jio-platforms",
  name: "Jio Platforms",
  legalName: "Jio Platforms Limited",
  icon: "JIO",
  sectorLabel: "Telecom & digital services",
  sectorSlug: "telecom5g",
  tagline: "India's largest mobile operator lists at ~Rs 10.3 lakh crore to cut telecom debt",
  asOf: "Oct 2026",

  status: {
    stage: "upcoming",
    label: "Opens 21 Oct",
    detail:
      "RHP dated 14 Oct 2026 (posted on SEBI 15 Oct) fixes the band at Rs 1,065-1,119; anchor book on 19 Oct, subscription 21-23 Oct, allotment 26 Oct and listing on BSE and NSE expected 28 Oct (Chittorgarh; Outlook Money reports 29 Oct).",
  },
  timeline: [
    { date: "19 Jun 2026", event: "DRHP filed with SEBI", done: true },
    { date: "28 Aug 2026", event: "SEBI observation letter received", done: true },
    { date: "14 Oct 2026", event: "RHP filed with RoC Gujarat; band Rs 1,065-1,119", done: true },
    { date: "19 Oct 2026", event: "Anchor investor bidding", done: false },
    { date: "21 Oct 2026", event: "Issue opens", done: false },
    { date: "23 Oct 2026", event: "Issue closes", done: false },
    { date: "26 Oct 2026", event: "Basis of allotment (tentative)", done: false },
    { date: "28 Oct 2026", event: "Listing on BSE and NSE (tentative)", done: false },
  ],

  issue: {
    size: "Rs 30,213 Cr (at upper band)",
    totalCr: 30213,
    freshCr: 30213,
    ofsCr: 0,
    priceBand: "Rs 1,065 - 1,119",
    lotSize: "12 shares (Rs 13,428 at upper band)",
    faceValue: "Rs 10",
    valuation: "~Rs 10.3 lakh Cr post-issue market cap at the upper band (9,20,90,30,830 shares)",
    valuationCr: 1030491,
    reservation:
      "QIB 50% · NII 15% · Retail 35% of the net offer; plus up to Rs 500 Cr for employees (Rs 54 discount) and up to Rs 2,500 Cr for RIL shareholders",
    exchanges: "BSE, NSE",
    leadManagers: [
      "Kotak Mahindra Capital",
      "Morgan Stanley India",
      "BofA Securities India",
      "Goldman Sachs (India) Securities",
      "JP Morgan India",
      "Citigroup Global Markets India",
      "SBI Capital Markets",
      "Axis Capital",
      "ICICI Securities",
      "JM Financial",
      "HSBC Securities & Capital Markets (India)",
      "Jefferies India",
      "BNP Paribas",
      "CLSA India",
      "UBS Securities India",
      "HDFC Bank",
      "IIFL Capital Services",
      "DAM Capital Advisors",
      "360 One WAM",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Scale at a full price",
    tone: "neutral",
    line: "A highly profitable market leader whose IPO mostly repays debt; at ~33x FY26 earnings it is priced close to Bharti Airtel, so returns hinge on tariff hikes and new revenue lines rather than a listing discount.",
  },
  keyStats: [
    { label: "Issue size", value: "Rs 30,213 Cr", sub: "all fresh shares; India's largest IPO" },
    { label: "Valuation at upper band", value: "~Rs 10.3 lakh Cr", sub: "~33x FY26 EPS of Rs 33.62" },
    { label: "Revenue, FY26", value: "Rs 1,46,885 Cr", sub: "+14.6% YoY; EBITDA margin 51.9%" },
    { label: "Customers, Jun 2026", value: "533.3 mn", sub: "RJIL; ARPU ~Rs 214 (Q4 FY26 exit)" },
  ],
  thesis: [
    {
      title: "The cash engine of India's mobile market",
      body: "Jio earned Rs 76,255 Cr of EBITDA and Rs 30,049 Cr of profit in FY26 on Rs 1.47 lakh Cr of revenue. Operating cash flow of Rs 77,556 Cr now comfortably covers capex, so the 5G build-out phase is giving way to free cash flow.",
    },
    {
      title: "Tariffs, not subscribers, drive the next leg",
      body: "With ~39% of India's mobile users already on its network, growth comes from ARPU (Rs 182 in FY24 to ~Rs 214 by FY26 exit), home broadband (13 mn+ AirFiber homes) and enterprise/AI services, not from adding phones.",
    },
    {
      title: "A clean, debt-reduction IPO",
      body: "There is no offer for sale: Rs 27,500 Cr of the proceeds prepays borrowings of Reliance Jio Infocomm. Existing investors such as Meta, Google, KKR and PIF are not selling in this issue, and Reliance stays in control at ~64.5% post-issue.",
    },
  ],

  business: {
    narrative: [
      "Jio Platforms is Reliance Industries' digital holding company. Almost all of its earnings come from Reliance Jio Infocomm (RJIL), the mobile and broadband operator that had 533.3 mn customers in India at 30 Jun 2026. RJIL contributed 87.7% of FY26 revenue, 94.9% of EBITDA and 93.8% of profit.",
      "The rest of the group is a set of digital, enterprise and technology businesses - home and fixed-wireless broadband, enterprise connectivity and cloud, devices and apps - plus an AI-infrastructure push centred on a planned 120 MW first phase at Jamnagar.",
      "The model is high fixed cost and high operating leverage: spectrum and network are largely built, so each tariff increase or extra GB sold drops mostly into EBITDA, which is why margin rose from 50.1% in FY25 to 51.9% in FY26.",
    ],
    segments: [
      { title: "Mobile connectivity (RJIL)", metric: "533.3 mn customers", body: "Prepaid and postpaid 4G/5G mobile services; India's largest operator by subscribers, with ARPU of ~Rs 214 at FY26 exit and 42.3 GB monthly data per user." },
      { title: "5G network", metric: "268 mn 5G users", body: "Standalone 5G users at Mar 2026 after 77 mn additions in FY26; 5G traffic is now monetised through higher-priced plans rather than free unlimited offers." },
      { title: "Home broadband (AirFiber & fibre)", metric: "13 mn+ homes", body: "Fixed-wireless AirFiber and JioFiber connections; the DRHP frames an addressable footprint of ~100 mn homes, a longer runway than mobile." },
      { title: "Enterprise, digital & AI", metric: "12.3% of revenue", body: "Non-RJIL subsidiaries covering enterprise connectivity, cloud, devices, platforms and the Jamnagar AI data-centre plan (first 120 MW phase targeted for end-2026)." },
    ],
    mix: {
      title: "Share of FY26 revenue from operations",
      source: "RHP via TaxGuru (RJIL share of consolidated revenue)",
      slices: [
        { label: "Reliance Jio Infocomm (mobile and broadband)", value: 87.7 },
        { label: "Other subsidiaries (digital, enterprise, devices)", value: 12.3 },
      ],
    },
  },

  industry: {
    narrative: [
      "India is a three-private-player mobile market: Jio and Airtel together hold roughly 77% of mobile subscribers, Vodafone Idea is shrinking in relative terms, and BSNL/MTNL hold ~7%. TRAI counted 1,312 mn wireless subscribers in Aug 2026.",
      "Data use keeps compounding - wireless traffic grew 24.7% in FY26 to ~285 exabytes - but price per GB fell 10.6% to Rs 8.02, so revenue growth depends on tariff increases and moving users to higher plans. Industry wireless ARPU rose only 3.6% to Rs 181 in FY26.",
    ],
    chart: {
      title: "India wireless data traffic",
      unit: "exabytes",
      source: "TRAI annual performance reports (FY24 and FY26 editions), via tele.net.in and TelecomTalk; exabytes per fiscal year",
      points: [
        { label: "FY23", value: 160.1 },
        { label: "FY24", value: 194.8 },
        { label: "FY25", value: 228.8 },
        { label: "FY26", value: 285.4 },
      ],
    },
    snapshot: [
      { label: "Wireless subscribers, Aug 2026 (TRAI)", value: "1,312 mn", tone: "neutral" },
      { label: "Jio mobile subscribers, Aug 2026 (TRAI)", value: "508.4 mn (~39%)", tone: "pos" },
      { label: "Airtel mobile subscribers, Aug 2026 (TRAI)", value: "491.6 mn (~38%)", tone: "neutral" },
      { label: "Industry wireless ARPU, FY26 (TRAI)", value: "Rs 180.73, +3.6%", tone: "neutral" },
      { label: "Revenue per GB, FY26 (TRAI)", value: "Rs 8.02, -10.6%", tone: "neg" },
      { label: "Broadband subscribers, Mar 2026 (TRAI)", value: "1,066 mn, +12.9%", tone: "pos" },
    ],
  },

  financials: {
    source: "RHP/DRHP restated consolidated statements, via TaxGuru, 5paisa and Chittorgarh",
    years: [
      { label: "FY24", revenue: 109558, ebitda: 54959, pat: 21423 },
      { label: "FY25", revenue: 128218, ebitda: 64170, pat: 26109 },
      { label: "FY26", revenue: 146885, ebitda: 76255, pat: 30049 },
      { label: "Q1 FY27", revenue: 39173, ebitda: 20865, pat: 7764, partial: true },
    ],
    note: "Revenue grew ~16% a year over FY24-26 and PAT ~18%; Q1 FY27 revenue rose 11.8% YoY. Chittorgarh's table shows PAT incl. minorities (Rs 30,053 Cr FY26) and total income (Rs 1,49,759 Cr), slightly different from the revenue-from-operations and PAT figures used here.",
  },

  kpi: {
    title: "Jio (RJIL) customer base",
    unit: "mn customers",
    source: "RIL Q4 FY24 results (IndiaInfoline); RHP/DRHP via 5paisa and TaxGuru",
    points: [
      { label: "Mar 2024", value: 481.8 },
      { label: "Mar 2025", value: 488.2 },
      { label: "Mar 2026", value: 524.4 },
      { label: "Jun 2026", value: 533.3 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "51.9%", tone: "pos" },
    { label: "PAT margin, FY26", value: "20.5%", tone: "pos" },
    { label: "RoNW, FY26", value: "9.4%", tone: "neutral" },
    { label: "Net worth, Jun 2026", value: "Rs 3,41,779 Cr", tone: "neutral" },
    { label: "Total borrowings, Jun 2026", value: "Rs 61,372 Cr (Rs 70,781 Cr Mar 2026)", tone: "neutral" },
    { label: "Basic EPS, FY26", value: "Rs 33.62", tone: "neutral" },
    { label: "P/E at upper band (FY26)", value: "~33.3x", tone: "neutral" },
    { label: "P/B at upper band", value: "~3.0x", tone: "neutral" },
  ],

  useOfProceeds: [{ label: "Prepay borrowings of Reliance Jio Infocomm", valueCr: 27500 }],
  proceedsNote:
    "All Rs 30,213 Cr (at the upper band) is fresh capital; Rs 27,500 Cr goes to prepaying RJIL debt and the balance, after issue expenses, to general corporate purposes. Prepayment would cut borrowings of Rs 61,372 Cr (Jun 2026) by close to half and lower interest cost. No existing shareholder sells; Reliance's stake falls from 66.43% to about 64.48% through dilution.",
  shareholding: [
    { holder: "Reliance Industries (promoter)", pct: 66.43 },
    { holder: "Meta (Jaadhu Holdings)", pct: 9.98 },
    { holder: "Google International", pct: 7.73 },
    { holder: "PIF, KKR, Vista (2.31% each)", pct: 6.93 },
    { holder: "Silver Lake, Mubadala, General Atlantic, ADIA, TPG", pct: 7.16 },
    { holder: "Other investors", pct: 1.77 },
  ],
  sellers: [],

  peers: [
    { name: "Bharti Airtel", ticker: "BHARTIARTL", mcapCr: 1190312, revenueCr: 220049, pe: 38.1, note: "Closest peer; larger revenue base incl. Africa, higher ARPU. Screener, 16 Oct 2026, TTM." },
    { name: "Vodafone Idea", ticker: "IDEA", mcapCr: 135861, revenueCr: 45539, pe: null, note: "Loss-making No. 3 operator; P/E not meaningful. Screener, 16 Oct 2026, TTM." },
    { name: "Bharti Hexacom", ticker: "BHARTIHEXA", mcapCr: 81142, revenueCr: 9601, pe: 43.9, note: "Airtel's listed North-East/Rajasthan circle operator. Screener, 16 Oct 2026, TTM." },
    { name: "Indus Towers", ticker: "INDUSTOWER", mcapCr: 101360, revenueCr: 32867, pe: 14.2, note: "Tower infrastructure supplier to all operators. Screener, 16 Oct 2026, TTM." },
  ],
  valuationNote:
    "At ~Rs 10.3 lakh Cr Jio is valued at ~33x FY26 earnings and ~7x FY26 revenue, versus Bharti Airtel at 38x trailing earnings and ~5.4x trailing revenue: a modest P/E discount to Airtel but a higher sales multiple, reflecting Jio's higher margin and smaller non-India exposure.",

  strengths: [
    { title: "Market leadership at scale", body: "India's largest operator with 533 mn customers and the largest 5G base, giving it the lowest cost per GB and pricing leadership in tariff rounds." },
    { title: "High and rising margins", body: "EBITDA margin of ~52% and PAT of Rs 30,049 Cr in FY26, with operating leverage as the network is already built out." },
    { title: "Self-funding cash flow", body: "FY26 operating cash flow of Rs 77,556 Cr against investing outflow of Rs 43,591 Cr; the IPO further de-levers RJIL." },
    { title: "Reliance ecosystem and strategic investors", body: "Distribution through Reliance retail, plus long-term partners Meta and Google, support new services in broadband, enterprise and AI." },
  ],
  risks: [
    { risk: "Telecom licences and spectrum: loss or costly renewal, plus regulatory changes on pricing and auctions", mitigant: "Spectrum holdings are long-dated and Jio has been a large, consistent bidder in auctions", severity: "high" },
    { risk: "Competition and tariff discipline: a price war or delayed tariff hikes would stall ARPU growth", mitigant: "Market is consolidated into two strong private players; recent hikes have held", severity: "medium" },
    { risk: "Related-party dependence on Reliance group entities, including prepaid distribution and shared services", mitigant: "Arrangements are disclosed in the RHP and governed by related-party approval rules after listing", severity: "medium" },
    { risk: "Concentration: RJIL produced 94.9% of FY26 EBITDA, so any network outage, cyberattack or supplier problem hits group earnings directly", mitigant: "Pan-India redundant network; non-RJIL businesses are growing", severity: "medium" },
    { risk: "Heavy capex for 5G, broadband and AI data centres could eat into free cash flow", mitigant: "Operating cash flow of Rs 77,556 Cr in FY26 funds capex internally", severity: "low" },
  ],

  outlook: {
    bull: "Two more tariff rounds lift ARPU towards Airtel's level, home broadband and enterprise/AI scale up, and debt prepayment lifts EPS - earnings compound 15%+ a year and the stock re-rates toward Airtel's multiple.",
    base: "Revenue grows ~12-14% a year on ARPU and broadband, margins hold near 52%, and the stock tracks earnings from a valuation already close to Airtel's.",
    bear: "Tariff hikes stall under regulatory or competitive pressure, AI/data-centre capex rises, and a ~Rs 10 lakh Cr valuation leaves little room - the stock de-rates toward the sector median.",
  },
  sources: [
    { title: "Jio Platforms Limited - RHP (abridged prospectus)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/oct-2026/jio-platforms-limited-rhp_105274.html", year: "2026" },
    { title: "Jio Platforms IPO: RHP filing, fresh shares, FY26 financials and risks", source: "TaxGuru", url: "https://taxguru.in/finance/ipo/jio-platforms-ipo-sebi-rhp-filing-27-crore-fresh-shares-fy26-financials-risks.html", year: "2026" },
    { title: "Jio Platforms IPO date, price, issue details", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/jio-platforms-ipo/3152/", year: "2026" },
    { title: "Jio Platforms IPO: price band Rs 1,065-1,119, valuation Rs 10.3 lakh crore", source: "Outlook Money", url: "https://www.outlookmoney.com/invest/jio-platforms-ipo-price-band-dates-valuation-lot-size", year: "2026" },
    { title: "Jio Platforms files RHP for IPO of up to 27 crore shares", source: "Business Today", url: "https://www.businesstoday.in/markets/ipo-corner/story/jio-platforms-files-rhp-for-ipo-of-up-to-27-crore-shares-issue-to-open-on-october-21-561644-2026-10-14", year: "2026" },
    { title: "Jio Platforms IPO DRHP: key investor takeaways", source: "5paisa", url: "https://www.5paisa.com/blog/jio-platforms-ipo-drhp-key-takeaways", year: "2026" },
    { title: "Revenue per GB drops in FY26: TRAI performance report", source: "TelecomTalk", url: "https://telecomtalk.info/revenue-per-gb-data-drops-fy26-trai/1012551/", year: "2026" },
    { title: "Bharti Airtel consolidated financials", source: "Screener", url: "https://www.screener.in/company/BHARTIARTL/consolidated/", year: "2026" },
  ],
};
