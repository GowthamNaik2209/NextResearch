import type { IpoReport } from "./types";

// Manipal Health Enterprises: RHP dated 23 Jul 2026 (SEBI, posted 24 Jul), DRHP filed 23 Mar 2026.
// The issue ran 29-31 Jul 2026 and the shares listed on 5 Aug 2026 (NSE: MANIPALHOS, BSE: 544847).
// Financials FY24-FY26 are the RHP's restated consolidated figures (as tabulated by ICICI Direct);
// Q1 FY27 is the company's first post-listing result (BSE filing, 20 Aug 2026).
export const manipalHospitals: IpoReport = {
  slug: "manipal-hospitals",
  name: "Manipal Hospitals",
  legalName: "Manipal Health Enterprises Limited",
  icon: "MHE",
  sectorLabel: "Hospitals & healthcare delivery",
  tagline: "India's largest hospital network by beds, now listed after a ₹9,275 Cr IPO",
  asOf: "Oct 2026",

  status: {
    stage: "listed",
    label: "Listed 5 Aug",
    detail:
      "The ₹9,275 Cr issue was subscribed ~4.9x (QIB 8.25x, NII 1.02x) and listed at ₹652 on NSE, 10.5% above the ₹590 issue price; the deck now tracks the post-listing story (debt paydown, Sahyadri integration, new-bed ramp-up).",
  },
  timeline: [
    { date: "23 Mar 2026", event: "DRHP filed with SEBI (₹8,000 Cr fresh + 4.32 crore-share OFS)", done: true },
    { date: "Jul 2026", event: "SEBI observations received (reported early July)", done: true },
    { date: "23 Jul 2026", event: "RHP filed; price band ₹560-590, OFS cut to 2.16 crore shares", done: true },
    { date: "28 Jul 2026", event: "Anchor book", done: true },
    { date: "29-31 Jul 2026", event: "Issue open; subscribed ~4.9x", done: true },
    { date: "5 Aug 2026", event: "Listed on NSE and BSE at ₹652 (NSE)", done: true },
    { date: "20 Aug 2026", event: "First results as a listed company (Q1 FY27)", done: true },
  ],

  issue: {
    size: "₹9,275 Cr",
    totalCr: 9275.22,
    freshCr: 8000,
    ofsCr: 1275.22,
    ofsShares: "2.16 crore shares",
    priceBand: "₹560-590 (priced at ₹590)",
    lotSize: "25 shares (₹14,750 at the upper band)",
    faceValue: "₹2",
    valuation: "~₹77,607 Cr market cap at the upper band",
    valuationCr: 77607,
    reservation: "QIB 75% · NII 15% · Retail 10%",
    exchanges: "NSE, BSE",
    leadManagers: [
      "Kotak Mahindra Capital",
      "Axis Capital",
      "J.P. Morgan India",
      "Goldman Sachs (India) Securities",
      "Jefferies India",
      "DBS Bank",
      "UBS Securities India",
    ],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Listed: execution story",
    tone: "neutral",
    line: "Scale and specialty mix are best-in-class, but the stock trades at a premium to listed peers while leverage, Sahyadri integration and new-bed ramp-up weigh on near-term margins.",
  },
  keyStats: [
    { label: "Issue size", value: "₹9,275 Cr", sub: "₹8,000 Cr fresh + ₹1,275 Cr OFS" },
    { label: "Licensed beds", value: "13,037", sub: "49 hospitals, 14 states/UTs (Mar 2026)" },
    { label: "Revenue, FY26", value: "₹10,336 Cr", sub: "+25.4% YoY (RHP)" },
    { label: "Listing vs issue", value: "+10.5%", sub: "₹652 on NSE vs ₹590" },
  ],
  thesis: [
    {
      title: "The largest bed network in Indian private healthcare",
      body: "13,037 licensed beds across 49 hospitals make Manipal the largest pan-India multispecialty chain by beds and No. 2 by revenue (Crisil, in the RHP). It leads in Bengaluru, Kolkata and Pune and has a 2,426-bed pipeline over 4-5 years.",
    },
    {
      title: "Growth has been bought as much as built",
      body: "Revenue grew ~29% a year over FY24-26, helped by the Medica (FY25) and Sahyadri (Oct 2025) acquisitions. That lifted net debt to ~3.7x EBITDA in FY26, which the IPO money is meant to bring down.",
    },
    {
      title: "The biggest healthcare listing sets a new reference point",
      body: "At ~₹84,500 Cr, Manipal is now the second-most valuable listed hospital chain after Apollo. Its multiple sits well above Apollo, Max and Fortis, so delivery on occupancy and ARPOB will decide the re-rating.",
    },
  ],

  business: {
    narrative: [
      "Manipal runs a hub-and-spoke network of multispecialty hospitals offering everything from outpatient consults to transplants and robotic surgery. About 64% of gross inpatient revenue comes from high-acuity 'CONGO-R' specialties (cardiac, oncology, neuro, gastro, ortho, renal).",
      "The network is split between owned hospitals and operate-and-manage (O&M) contracts: of 13,140 licensed beds in Jun 2026, 9,355 were owned and 3,785 under O&M, and only ~7,164 were operational. Filling those beds is the main earnings lever.",
      "Temasek (through Sheares Healthcare) and the Pai family are the anchor owners, with TPG, Novo and others as investors. Promoters held 81.9% before the issue and 72.1% after it.",
    ],
    segments: [
      { title: "Karnataka", metric: "6,404 licensed beds · 46% of FY26 revenue", body: "19 hospitals including 12 in Bengaluru; the original home market and still the profit engine, though its revenue share fell from 60% in FY24." },
      { title: "Maharashtra & Goa", metric: "13 hospitals · ₹503 Cr revenue in Q1 FY27", body: "Transformed by the Sahyadri acquisition (Pune); revenue nearly 4x year on year as acquired beds were added." },
      { title: "East India", metric: "2,887 licensed beds", body: "10 hospitals in West Bengal, Odisha, Jharkhand and Sikkim from the AMRI and Medica deals; Manipal leads Kolkata by bed capacity." },
      { title: "Rest of India", metric: "1,558 licensed beds · 72% occupancy (Q1 FY27)", body: "7 hospitals including Delhi NCR, Jaipur, Vijayawada and Patiala; the best-occupied region and a target for bolt-on acquisitions." },
    ],
    mix: {
      title: "Payor mix, FY26",
      source: "RHP via ICICI Direct IPO note (Jul 2026)",
      slices: [
        { label: "Insurers and TPAs", value: 50 },
        { label: "Cash", value: 30 },
        { label: "Government & others", value: 20 },
      ],
    },
  },

  industry: {
    narrative: [
      "India's healthcare delivery market was about ₹7L Cr in FY25 and is projected by Crisil (in the RHP) to grow 10-12% a year to ₹11.2-12.2L Cr by FY30, with inpatient care at ~71-72% of value.",
      "The market is still fragmented: large private chains hold only ~20% share, and India has ~16 beds per 10,000 people (~14 outside metros). ICRA expects 34,000+ beds to be added over FY26-30, so supply competition in metros is rising.",
    ],
    chart: {
      title: "India healthcare delivery market",
      unit: "₹ lakh Cr",
      source: "Crisil report in the Manipal RHP (Figure 9); FY26E and FY30P are midpoints of ₹7.6-7.8 and ₹11.2-12.2L Cr",
      points: [
        { label: "FY20", value: 4.4 },
        { label: "FY25", value: 7.0 },
        { label: "FY26E", value: 7.7, projected: true },
        { label: "FY30P", value: 11.7, projected: true },
      ],
    },
    snapshot: [
      { label: "Market growth, FY25-30 (Crisil)", value: "10-12% CAGR", tone: "pos" },
      { label: "Large private chains' share, FY26", value: "~20%", tone: "pos" },
      { label: "Beds per 10,000 people, FY26", value: "~16 national, ~14 non-metro", tone: "pos" },
      { label: "Inpatient share of market value", value: "71-72%", tone: "neutral" },
      { label: "Listed peers' valuations", value: "See the peer table", tone: "neutral" },
    ],
  },

  financials: {
    source: "RHP restated consolidated (FY24-FY26, via ICICI Direct IPO note); Q1 FY27 from company results filed with BSE on 20 Aug 2026",
    years: [
      { label: "FY24", revenue: 6171.6, ebitda: 1683.1, pat: 533.2 },
      { label: "FY25", revenue: 8242.3, ebitda: 2126.5, pat: 1081.7 },
      { label: "FY26", revenue: 10335.8, ebitda: 2611.2, pat: 916.5 },
      { label: "Q1 FY27", revenue: 3090.6, ebitda: 749.0, pat: 243.4, partial: true },
    ],
    note: "FY26 PAT fell 15% as finance costs rose to ₹864 Cr after the Sahyadri acquisition was funded with NCDs; FY25 PAT also included a lower tax charge. Q1 FY27 EBITDA is the company's pre-ESOP measure (the RHP FY26 figure of ₹2,611 Cr is after ₹33 Cr of ESOP cost), and Q1 PAT carries ₹89 Cr of post-tax Sahyadri NCD interest.",
  },

  kpi: {
    title: "Operational beds",
    unit: "beds",
    source: "RHP (FY24-FY26, via ICICI Direct); Q1 FY27 investor presentation (BSE, Aug 2026)",
    points: [
      { label: "FY24", value: 4055 },
      { label: "FY25", value: 5179 },
      { label: "FY26", value: 6227 },
      { label: "Jun 2026", value: 7164 },
    ],
  },
  ratios: [
    { label: "EBITDA margin, FY26", value: "25.3% (27.3% in FY24)", tone: "neutral" },
    { label: "PAT margin, FY26", value: "8.9% (13.1% in FY25)", tone: "neg" },
    { label: "Occupancy, FY26 / Q1 FY27", value: "64.5% / 65.0%", tone: "neutral" },
    { label: "ARPOB, FY26", value: "₹68,938/day (+8.9%)", tone: "pos" },
    { label: "RoE, FY26", value: "11.5%", tone: "neutral" },
    { label: "Net worth, Mar 2026", value: "₹8,428 Cr", tone: "neutral" },
    { label: "Total debt, Mar 2026", value: "₹12,863 Cr", tone: "neg" },
    { label: "Net debt / EBITDA", value: "3.7x FY26 (incl. leases); 2.8x Jun 2026 post-IPO", tone: "neg" },
  ],

  useOfProceeds: [
    { label: "Repay borrowings of subsidiary Manipal Hospitals", valueCr: 5552.76 },
    { label: "General corporate purposes and issue expenses (balance)", valueCr: 1873.24 },
    { label: "Acquire the minority stake in Sahyadri Hospitals", valueCr: 574 },
  ],
  proceedsNote:
    "Debt repayment is the main use. The RHP figure of ₹5,552.76 Cr (FundsIndia) is higher than the ₹5,378 Cr in the DRHP and in some news reports. The balance shown is derived as ₹8,000 Cr less the two named objects; general corporate purposes are capped at 25% of the gross fresh issue. The ₹1,275 Cr OFS went to the selling shareholders.",
  shareholding: [
    { holder: "Promoter group (Temasek entities, Pai family)", pct: 81.9 },
    { holder: "Public and other shareholders", pct: 18.1 },
  ],
  sellers: [
    { name: "Imperius Healthcare Investments", detail: "Promoter selling shareholder" },
    { name: "Manipal Education and Medical Group India", detail: "Promoter selling shareholder (Pai family)" },
    { name: "TPG SG Magazine", detail: "Investor selling shareholder" },
    { name: "Seventy Second Investment Company", detail: "Investor selling shareholder" },
    { name: "Novo Holdings Invest Asia", detail: "Investor selling shareholder" },
    { name: "Ammar Sdn Bhd, Phoenix Bear Investments", detail: "Investor selling shareholders; total OFS 2.16 crore shares" },
  ],

  peers: [
    { name: "Apollo Hospitals Enterprise", ticker: "APOLLOHOSP", note: "Largest by revenue; pharmacy and digital add scale beyond hospitals" },
    { name: "Max Healthcare Institute", ticker: "MAXHEALTH", note: "North India focus; highest occupancy and ARPOB among peers" },
    { name: "Fortis Healthcare", ticker: "FORTIS", note: "Pan-India network plus Agilus diagnostics" },
    { name: "Narayana Health", ticker: "NH", note: "Value-focused model; Cayman Islands and UK operations" },
    { name: "Medanta (Global Health)", ticker: "MEDANTA", note: "Gurugram-led, high-acuity, expanding in north and east" },
  ],
  valuationNote:
    "At ₹590, the IPO valued Manipal at ~₹77,600 Cr, about 76-85x FY26 earnings and ~35x EV/EBITDA, against 66-75x for Apollo, Max and Fortis at the time (FundsIndia, ICICI Direct, Angel One). Since listing it has traded at a premium to the listed peers in the table.",

  strengths: [
    { title: "Unmatched bed scale and metro leadership", body: "Largest pan-India network by beds and the only private chain leading three metros (Bengaluru, Kolkata, Pune) by bed capacity, per Crisil." },
    { title: "High-acuity specialty mix", body: "CONGO-R specialties are ~64-65% of gross inpatient revenue; oncology and ortho inpatient revenue grew 62% and 49% in Q1 FY27." },
    { title: "Proven acquire-and-integrate playbook", body: "Columbia Asia, AMRI, Medica and now Sahyadri have been folded in with standard protocols; Sahyadri EBITDA grew ~19% year on year in Q1 FY27." },
    { title: "Spare capacity to fill", body: "Only ~7,164 of 13,140 licensed beds were operational in Jun 2026, plus a 2,426-bed pipeline (~80% greenfield), giving a long runway without new deals." },
  ],
  risks: [
    { risk: "Karnataka concentration: ~46% of FY26 revenue came from one state.", mitigant: "Share is falling fast (60% in FY24) as Sahyadri, East India and NCR grow.", severity: "medium" },
    { risk: "High leverage after the Sahyadri deal; FY26 net debt ~3.7x EBITDA and finance costs of ₹864 Cr.", mitigant: "IPO proceeds repay ~₹5,550 Cr; net debt fell to ~2.8x EBITDA by Jun 2026.", severity: "high" },
    { risk: "Integration and margin dilution from acquisitions and new hospitals (Q1 FY27 EBITDA margin 24.2% vs 26.5%).", mitigant: "Ex-Sahyadri margin was 25.0% and Sahyadri ARPOB is rising (+14.7% YoY).", severity: "medium" },
    { risk: "Valuation leaves little room for error: the stock trades at a premium to listed peers.", mitigant: "Earnings should rise as NCD interest falls away and new beds mature.", severity: "high" },
    { risk: "Clinical negligence claims and regulatory price controls on procedures and consumables.", mitigant: "41 NABH-accredited hospitals and insurance cover; payor mix is half insurance.", severity: "low" },
  ],

  outlook: {
    bull: "Debt paydown and Sahyadri synergies lift PAT sharply in FY27-28, occupancy moves toward 70% and ARPOB keeps rising high single digits, supporting the premium multiple.",
    base: "Revenue grows ~18-22% a year with margins near 25% as new beds ramp up; the stock tracks earnings growth while trading at a premium to peers.",
    bear: "Slow ramp-up of new and acquired beds, rising metro competition and insurer pushback on pricing keep margins under 24% and the multiple de-rates toward peers.",
  },

  sources: [
    { title: "Manipal Health Enterprises Limited - RHP", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jul-2026/manipal-health-enterprises-limited-rhp_103034.html", year: "2026" },
    { title: "Q1 FY27 press release and investor presentation", source: "BSE filing", url: "https://www.bseindia.com/xml-data/corpfiling/AttachHis/45674301-f507-4057-8016-d4c60e08b7c9.pdf", year: "2026" },
    { title: "IPO Review: Manipal Health Enterprises", source: "ICICI Direct", url: "https://ipowatch.in/wp-content/uploads/2026/07/icici-direct_manipal-health-enterprises-ltd_ipo-note.pdf", year: "2026" },
    { title: "Manipal Hospitals IPO sets price band at Rs 560-590", source: "Upstox News", url: "https://upstox.com/news/market-news/ipo/manipal-hospitals-ipo-sets-price-band-at-560-to-590-per-share-check-lot-size-and-key-dates/article-197486/", year: "2026" },
    { title: "Manipal Health Enterprises IPO note", source: "FundsIndia", url: "https://fundsindia.com/blog/equities/manipal-health-enterprises-ipo-note-equity-research-desk/35018", year: "2026" },
    { title: "Manipal Health files DRHP: key details and financials", source: "Kotak Neo", url: "https://www.kotakneo.com/news/market-news/temasek-backed-manipal-health-ipo-drhp-details/", year: "2026" },
    { title: "Manipal Health Enterprises share price and ratios", source: "Screener.in", url: "https://www.screener.in/company/MANIPALHOS/consolidated/", year: "2026" },
  ],
};
