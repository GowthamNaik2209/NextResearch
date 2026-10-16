import type { IpoReport } from "./types";

export const parasHealthcare: IpoReport = {
  slug: "paras-healthcare",
  name: "Paras Healthcare",
  legalName: "Paras Healthcare Limited",
  icon: "PH",
  sectorLabel: "Hospitals & healthcare services",
  tagline: "A North India and Bihar hospital chain lists at ~Rs 7,500 Cr after turning profitable in FY26",
  asOf: "Oct 2026",

  status: {
    stage: "upcoming",
    label: "Opens 21 Oct",
    detail:
      "Price band of Rs 660-693 fixed on 15 Oct (PTI via Free Press Journal); anchor book on 19 Oct, subscription 21-23 Oct, allotment 26 Oct and listing on BSE and NSE expected 28 Oct (Chittorgarh, tentative).",
  },
  timeline: [
    { date: "Jul 2024", event: "First DRHP filed (Rs 400 Cr fresh + OFS); SEBI nod Oct 2024, allowed to lapse", done: true },
    { date: "4 Jun 2026", event: "Fresh DRHP filed for up to Rs 1,800 Cr (Rs 500 Cr fresh + Rs 1,300 Cr OFS)", done: true },
    { date: "Aug 2026", event: "SEBI observations received (batch cleared 24-28 Aug)", done: true },
    { date: "15 Oct 2026", event: "Price band Rs 660-693 announced; issue cut to Rs 1,450 Cr", done: true },
    { date: "19 Oct 2026", event: "Anchor investor bidding", done: false },
    { date: "21 Oct 2026", event: "Issue opens", done: false },
    { date: "23 Oct 2026", event: "Issue closes; allotment 26 Oct (tentative)", done: false },
    { date: "28 Oct 2026", event: "Listing on BSE and NSE (tentative)", done: false },
  ],

  issue: {
    size: "Rs 1,450 Cr (at upper band)",
    totalCr: 1450,
    freshCr: 500,
    ofsCr: 950,
    ofsShares: "1.37 crore shares",
    priceBand: "Rs 660 - 693",
    lotSize: "21 shares (Rs 14,553 at upper band)",
    faceValue: "Rs 1",
    valuation: "~Rs 7,498 Cr post-issue market cap at the upper band (10,82,01,194 shares)",
    valuationCr: 7498,
    reservation: "QIB 75% · NII 15% · Retail 10% (Regulation 6(2) issue)",
    exchanges: "BSE, NSE",
    leadManagers: ["JM Financial", "BofA Securities India", "Nuvama Wealth Management"],
    registrar: "MUFG Intime India",
  },

  stance: {
    label: "Turnaround priced for recovery",
    tone: "neutral",
    line: "Occupancy and margins are rising fast after two loss years, but at ~160x FY26 earnings the price already assumes that the newer hospitals keep ramping up; on revenue it is cheaper than listed peers.",
  },
  keyStats: [
    { label: "Issue size", value: "Rs 1,450 Cr", sub: "Rs 500 Cr fresh + Rs 950 Cr offer for sale" },
    { label: "Valuation at upper band", value: "~Rs 7,498 Cr", sub: "~160x FY26 EPS; ~4.7x FY26 revenue" },
    { label: "Revenue, FY26", value: "Rs 1,606 Cr", sub: "+24.1% YoY; PAT Rs 43.8 Cr after two loss years" },
    { label: "Bed capacity, Jun 2026", value: "2,211 beds", sub: "8 hospitals; occupancy 69.7% in Q1 FY27" },
  ],
  thesis: [
    {
      title: "Occupancy is finally filling the beds",
      body: "Occupancy rose from 50.8% in FY25 to 61.8% in FY26 and 69.7% in Q1 FY27, which doubled EBITDA to Rs 336 Cr in FY26 (20.9% of revenue from operations vs 12.1% in FY25) and turned a Rs 58 Cr loss into a Rs 44 Cr profit.",
    },
    {
      title: "First mover in under-served regions",
      body: "Seven of eight hospitals sit outside Gurugram, in Patna, Darbhanga, Ranchi, Kanpur, Udaipur, Panchkula and Srinagar; tier-2 cities gave 68.2% of FY26 revenue, where corporate hospital competition is thinner than in metros.",
    },
    {
      title: "An IPO that cuts debt",
      body: "Rs 375 Cr of the Rs 500 Cr fresh issue repays borrowings of the company and its Srinagar subsidiary, against total borrowings of Rs 854 Cr at Mar 2026; the remaining Rs 950 Cr is an exit by the promoter and PE investor Commelina.",
    },
  ],

  business: {
    narrative: [
      "Paras Healthcare runs eight tertiary and quaternary care hospitals under the Paras Health brand, with 2,211 beds of planned capacity and 1,502 operational beds. The Gurugram flagship opened 20 years ago; the newest hospitals in Srinagar and Kanpur are three and two years old.",
      "Three quarters of revenue (74.7% in FY26) comes from six high-acuity specialties the company calls CONGOR: cardiac, oncology, neuro, gastro, orthopaedics and renal. Oncology alone is 21.6%. Government schemes and PSUs paid for 41.3% of FY26 revenue, self-pay 33.9% and insurers 24.8%.",
      "The model is capital-light by hospital-chain standards: six of the eight hospitals are on leased premises, five run on revenue-share or long-term leases and one is a public-private partnership. Two new hospitals (300 beds in Gurugram in FY27, 500 beds in Ludhiana in FY28) take capacity to 3,011 beds.",
    ],
    segments: [
      { title: "Gurugram flagship", metric: "235 beds · 83.9% occupancy", body: "The oldest and most mature hospital, with FY26 ARPOB of Rs 70,926 a day, about 1.5x the group average; the only hospital in a metro market." },
      { title: "Bihar and Jharkhand (Patna, Darbhanga, Ranchi)", metric: "565 operational beds", body: "Patna is the largest hospital (309 beds, 73.2% occupancy); Darbhanga runs at an ARPOB under Rs 20,000. Ranchi sits in a subsidiary that is still loss-making." },
      { title: "North India tier-2 (Panchkula, Udaipur, Kanpur, Srinagar)", metric: "702 operational beds", body: "Panchkula runs at 67.6% occupancy, but Srinagar (36.1%) and Kanpur (31.0%) are still ramping up, which is where most of the remaining operating leverage lies." },
      { title: "CONGOR specialties", metric: "74.7% of FY26 revenue", body: "Cardiac, oncology, neuro, gastro, orthopaedics and renal care; oncology is the largest at 21.6%. Surgeries rose to 39,687 in FY26 from 30,219 in FY24." },
      { title: "Expansion pipeline", metric: "+800 beds by FY28", body: "A 300-bed hospital in Gurugram (FY27) and a 500-bed hospital in Ludhiana (FY28), raising bed capacity to 3,011 by Mar 2028." },
    ],
    mix: {
      title: "Share of FY26 revenue from operations by payor",
      source: "DRHP (draft abridged prospectus, 4 Jun 2026), KPI table",
      slices: [
        { label: "Government schemes and PSUs", value: 41.28 },
        { label: "Self-pay", value: 33.88 },
        { label: "Insurers and TPAs", value: 24.84 },
      ],
    },
  },

  industry: {
    narrative: [
      "CRISIL, in the report commissioned for the DRHP, sizes India's healthcare delivery market at ~Rs 7.0 trillion in FY25 and Rs 7.6-7.8 trillion in FY26, growing 10-12% a year to Rs 11.2-12.2 trillion by FY30. In-patient care is 71-72% of the value.",
      "North India is expected to reach Rs 3.6-3.8 trillion by FY30, about a third of the national market, and Bihar plus Jharkhand Rs 0.4-0.5 trillion. Health-insurance penetration rose from 35% in FY19 to 41% in FY24, but government schemes such as PM-JAY remain a large payor in these states.",
    ],
    chart: {
      title: "India healthcare delivery market",
      unit: "Rs lakh Cr",
      source: "CRISIL report in the Paras Healthcare DRHP (FY26E and FY30P are mid-points of the ranges given)",
      points: [
        { label: "FY20", value: 4.4 },
        { label: "FY25", value: 7.0 },
        { label: "FY26E", value: 7.7, projected: true },
        { label: "FY30P", value: 11.7, projected: true },
      ],
    },
    snapshot: [
      { label: "Market growth, FY25-30P (CRISIL)", value: "10-12% CAGR", tone: "pos" },
      { label: "North India market, FY30P", value: "Rs 3.6-3.8 trillion", tone: "neutral" },
      { label: "Bihar + Jharkhand market, FY30P", value: "Rs 0.4-0.5 trillion", tone: "neutral" },
      { label: "In-patient share of market, FY25", value: "71-72%", tone: "neutral" },
      { label: "Health-insurance penetration, FY24", value: "41% (35% in FY19)", tone: "pos" },
    ],
  },

  financials: {
    source: "DRHP restated consolidated statements (SEBI, 4 Jun 2026); Q1 FY27 from the RHP via Chittorgarh and Abhinav Mishra's IPO note",
    years: [
      { label: "FY24", revenue: 1129, ebitda: 154, pat: -15 },
      { label: "FY25", revenue: 1294, ebitda: 156, pat: -58 },
      { label: "FY26", revenue: 1606, ebitda: 336, pat: 44 },
      { label: "Q1 FY27", revenue: 470, ebitda: 113, pat: 50, partial: true },
    ],
    note: "Revenue grew at a 19.3% CAGR over FY24-26 and EBITDA at 47.4% as newer hospitals filled up; Q1 FY27 revenue rose 27.7% YoY. Q1 FY27 PAT of Rs 49.7 Cr includes a Rs 16.2 Cr deferred-tax credit (Sushil Finance), and aggregators such as Chittorgarh show total income (Rs 1,628.8 Cr in FY26), not revenue from operations.",
  },

  kpi: {
    title: "Bed occupancy (operational beds)",
    unit: "%",
    source: "DRHP KPI table (FY24-FY26); RHP via Multibagg (Q1 FY27)",
    points: [
      { label: "FY24", value: 52.46 },
      { label: "FY25", value: 50.78 },
      { label: "FY26", value: 61.75 },
      { label: "Q1 FY27", value: 69.72 },
    ],
  },
  ratios: [
    { label: "EBITDA margin on revenue from operations, FY26", value: "20.9% (24.0% in Q1 FY27)", tone: "pos" },
    { label: "ARPOB, FY26", value: "Rs 47,398 / day (Rs 49,352 in Q1 FY27)", tone: "neutral" },
    { label: "RoNW, FY26", value: "12.98% (-18.73% in FY25)", tone: "neutral" },
    { label: "ROCE, FY26", value: "10.76%", tone: "neutral" },
    { label: "Net worth, Jun 2026", value: "Rs 445 Cr", tone: "neutral" },
    { label: "Total borrowings, Mar 2026", value: "Rs 854 Cr (excl. leases)", tone: "neg" },
    { label: "Debt / equity incl. leases, FY26", value: "3.53x (2.16x excl. leases)", tone: "neg" },
    { label: "Diluted EPS, FY26", value: "Rs 4.34 (~160x at upper band)", tone: "neutral" },
  ],

  useOfProceeds: [
    { label: "Prepay or repay borrowings of Paras Healthcare", valueCr: 320.9 },
    { label: "Invest in subsidiary PMHPL (Srinagar hospital) to repay its debt", valueCr: 54.1 },
  ],
  proceedsNote:
    "Of the Rs 500 Cr fresh issue, Rs 375 Cr goes to debt repayment; the balance, after issue expenses, is for general corporate purposes (capped at 25% of gross proceeds). The Rs 950 Cr OFS goes to the selling shareholders, not the company. No pre-IPO placement was done, so the share count is unchanged from the DRHP.",
  shareholding: [
    { holder: "Dr Dharminder Kumar Nagar (promoter)", pct: 72.8 },
    { holder: "Commelina Ltd (PE investor)", pct: 16.44 },
    { holder: "360 ONE funds", pct: 7.13 },
    { holder: "Axis New Opportunities AIF - Series II", pct: 3.63 },
  ],
  sellers: [
    { name: "Dr Dharminder Kumar Nagar (promoter)", detail: "Up to Rs 300 Cr; average cost Rs 2.35 a share. His stake falls from 72.8% to ~64% post-issue." },
    { name: "Commelina Ltd", detail: "Up to Rs 650 Cr (Rs 800 Cr in the DRHP); average cost Rs 114.15 a share; has a nominee director on the board." },
    { name: "360 ONE funds (dropped)", detail: "Were to sell Rs 200 Cr in the DRHP at a Rs 237 cost, but are not named as sellers in the final Rs 950 Cr OFS." },
  ],

  peers: [
    { name: "Max Healthcare Institute", ticker: "MAXHEALTH", mcapCr: 82448, revenueCr: 8712, pe: 55.1, note: "Largest listed North India chain; ~9.5x trailing sales. Screener, 16 Oct 2026, TTM." },
    { name: "Fortis Healthcare", ticker: "FORTIS", mcapCr: 55876, revenueCr: 9506, pe: 52.4, note: "Pan-India chain with a large NCR presence. Screener, 16 Oct 2026, TTM." },
    { name: "Krishna Institute of Medical Sciences", ticker: "KIMS", mcapCr: 28827, revenueCr: 4212, pe: 138, note: "Tier-2 focused multi-specialty chain in the South. Screener, 16 Oct 2026, TTM." },
    { name: "Yatharth Hospital & Trauma Care", ticker: "YATHARTH", mcapCr: 9558, revenueCr: 1334, pe: 52.8, note: "NCR and western UP chain of similar size. Screener, 16 Oct 2026, TTM." },
    { name: "Jupiter Life Line Hospitals", ticker: "JLHL", mcapCr: 8126, revenueCr: 1558, pe: 42.5, note: "Western India chain of similar revenue. Screener, 16 Oct 2026, TTM." },
  ],
  valuationNote:
    "At ~Rs 7,500 Cr Paras trades at ~4.7x FY26 revenue, below Jupiter (5.2x), Yatharth (7.2x) and Max (9.5x) on trailing sales, but at ~160x FY26 earnings versus a 42-55x range for most peers. Annualising the Q1 FY27 profit, which was helped by a tax credit, brings the post-issue P/E to ~38x (Chittorgarh).",

  strengths: [
    { title: "Early mover in North India, Bihar and Jharkhand", body: "Among the largest private providers in these regions, with hospitals in cities such as Patna, Darbhanga and Ranchi where few corporate chains operate." },
    { title: "High-acuity specialty mix", body: "CONGOR specialties make up ~75% of revenue and the network has 559 ICU beds, which supports higher revenue per bed than general care." },
    { title: "Capital-efficient expansion", body: "Leases, revenue-share deals and a PPP keep the gross block at Rs 7.6 Mn per bed of capacity, and the newer hospitals add revenue without a fresh land outlay." },
    { title: "Doctor-led management with a turnaround underway", body: "Promoter Dr Dharminder Kumar Nagar has been with the company since 2003; EBITDA more than doubled in FY26 as occupancy recovered." },
  ],
  risks: [
    { risk: "Losses at newer hospitals: the Ranchi and Plus Medicare (Srinagar) subsidiaries lost Rs 52 Cr in FY26, and the group lost money in FY24 and FY25", mitigant: "Losses are narrowing (Rs 87 Cr in FY24) and occupancy at newer sites is rising", severity: "high" },
    { risk: "Dependence on government schemes (41% of FY26 revenue), where empanelments have been suspended or restricted in the past and payments can be slow", mitigant: "Self-pay and insurance still make up ~59% of revenue", severity: "medium" },
    { risk: "Leverage: debt to equity of 3.53x including leases, and six of eight hospitals on leased premises", mitigant: "Rs 375 Cr of the fresh issue repays debt", severity: "medium" },
    { risk: "Staff attrition of 60% in FY26 (82% for nurses) and dependence on senior clinicians", mitigant: "Doctor-led management and retention programmes; attrition fell from 66.7% in FY25", severity: "medium" },
    { risk: "Valuation leaves little room: ~160x trailing earnings for a company that only turned profitable in FY26", mitigant: "Cheaper than peers on price-to-sales if margins keep expanding", severity: "medium" },
  ],

  outlook: {
    bull: "Occupancy at Srinagar, Kanpur and Ranchi climbs toward the group average, the Gurugram and Ludhiana hospitals open on time, and margins move toward the mid-20s, bringing earnings in line with the price within two to three years.",
    base: "Revenue grows ~18-20% a year as new beds open, margins hold around 21-24%, and the stock re-rates slowly as profits catch up with a full valuation.",
    bear: "New hospitals take longer to fill, government-scheme receivables stretch, and expansion capex keeps debt high, leaving the stock exposed to a de-rating toward peer earnings multiples.",
  },
  sources: [
    { title: "Paras Healthcare Limited - RHP and abridged prospectus", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/oct-2026/paras-healthcare-limited-rhp_105284.html", year: "2026" },
    { title: "Paras Healthcare Limited - DRHP (4 Jun 2026)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/jun-2026/paras-healthcare-limited-drhp_102187.html", year: "2026" },
    { title: "Paras Healthcare IPO date, price, issue details and financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/paras-healthcare-ipo/2256/", year: "2026" },
    { title: "Paras Healthcare Rs 1,450-crore IPO opens October 21 at Rs 660-693 price band", source: "Free Press Journal (PTI)", url: "https://www.freepressjournal.in/amp/business/paras-healthcare-1450-crore-ipo-opens-october-21-at-660693-price-band-check-listing-date-issue-details", year: "2026" },
    { title: "Paras Healthcare Limited IPO note", source: "Sushil Finance", url: "https://www.sushilfinance.com/blogs/IPO-Note/Paras-Healthcare-Limited-IPO", year: "2026" },
    { title: "Paras Healthcare IPO: financials, valuation, risks", source: "Abhinav Mishra (Substack)", url: "https://abhinavmishra.substack.com/p/paras-healthcare-ipo-financials-valuation", year: "2026" },
    { title: "Paras Healthcare's government payers lead revenue mix (RHP)", source: "Multibagg", url: "https://www.multibagg.ai/market-pulse/articles/ipo/paras-healthcare-limited-government-payers-rhp-cmv9a2h5t000ad2q8o8deuca9", year: "2026" },
    { title: "Max Healthcare Institute consolidated financials", source: "Screener", url: "https://www.screener.in/company/MAXHEALTH/consolidated/", year: "2026" },
  ],
};
