import type { IpoReport } from "./types";

// Integris Medtech Ltd (formerly Integris Health). Figures from the DRHP dated 9 Oct 2025 (SEBI) unless a
// field names another source: restated consolidated FY23-FY25 and Q1 FY26 (Apr-Jun 2025). No FY26 audited
// figures are public yet; they will come with the RHP. The Oct 2026 revision of the issue (₹600 Cr fresh,
// OFS of 1.08 crore shares by Evercure only) is as reported by Chittorgarh and IndMoney (cross-checked).
// Dates and price band: some IPO sites report 27 Nov - 1 Dec 2026, but as of 25 Nov 2026 no RHP, exchange
// notice or price-band announcement confirms them, so the stage stays "approved".
export const integrisMedtech: IpoReport = {
  slug: "integris-medtech",
  name: "Integris Medtech",
  legalName: "Integris Medtech Limited",
  icon: "IMT",
  sectorLabel: "Medical devices & lab solutions",
  sectorSlug: "hospitals",
  tagline: "India's #2 coronary stent maker plus a Southeast Asian lab-supplies business, backed by Everstone",
  asOf: "Nov 2026",

  status: {
    stage: "approved",
    label: "SEBI approved",
    detail:
      "SEBI cleared the draft prospectus in Feb 2026 (13 Feb per IPO trackers), and in Oct 2026 the company cut the fresh issue to ₹600 Cr from ₹925 Cr and halved the offer for sale. Some IPO sites report bidding on 27 Nov-1 Dec 2026, but as of 25 Nov no RHP, price band or exchange notice confirms the dates, so treat them as unconfirmed.",
  },
  timeline: [
    { date: "9 Oct 2025", event: "DRHP filed: ₹925 Cr fresh issue + OFS of 2.17 crore shares by Everstone's Evercure and the two co-founders", done: true },
    { date: "Feb 2026", event: "SEBI observations received (13 Feb per IPO trackers)", done: true },
    { date: "Oct 2026", event: "Issue revised: fresh issue cut to ₹600 Cr, OFS halved to 1.08 crore shares, co-founders no longer selling", done: true },
    { date: "27 Nov-1 Dec 2026", event: "Bidding window reported by some IPO sites; not yet confirmed by an RHP or exchange notice", done: false },
    { date: "Feb 2027", event: "SEBI approval lapses if the issue has not opened within 12 months", done: false },
  ],

  issue: {
    size: "₹600 Cr fresh + OFS of 1.08 crore shares (price band not yet set)",
    totalCr: null,
    freshCr: 600,
    ofsCr: null,
    ofsShares: "1.08 crore shares (1,08,37,266)",
    priceBand: null,
    lotSize: null,
    faceValue: "₹1",
    valuation:
      "Not set until the price band. The only reference point: Everstone's Medicore got shares in a Jun 2025 share swap at ₹1,930.63 each, about ₹644 after the 2:1 bonus, which would value the 10.83 crore pre-issue shares at ~₹7,000 Cr (a related-party price, not the IPO price)",
    valuationCr: null,
    reservation: "QIB at least 75% · NII up to 15% · Retail up to 10% (the company has not met SEBI's profit-track-record test, so at least 75% must go to institutions)",
    exchanges: "NSE, BSE",
    leadManagers: ["ICICI Securities", "Axis Capital", "Citigroup Global Markets India", "IIFL Capital Services"],
    registrar: "KFin Technologies",
  },

  stance: {
    label: "Big platform, thin underlying profit",
    tone: "neutral",
    line: "Revenue grew 22.5% in FY25 and EBITDA margins widened to 16.3%, but most sales are third-party products, reported profit swings on one-off items, and the price band that decides the valuation is not out yet.",
  },
  keyStats: [
    { label: "Fresh issue", value: "₹600 Cr", sub: "+ OFS of 1.08 crore shares by Everstone's Evercure; band not yet set" },
    { label: "Revenue, FY25", value: "₹1,902 Cr", sub: "+22.5% YoY; ₹2,333 Cr pro forma with 2025 acquisitions" },
    { label: "EBITDA margin, FY25", value: "16.3%", sub: "12.3% in FY24; adjusted PAT ₹103 Cr" },
    { label: "India DES market share, FY25", value: "22%", sub: "#2 coronary stent maker by volume (Frost & Sullivan)" },
  ],
  thesis: [
    {
      title: "Two medtech businesses on one platform",
      body: "Lab solutions (instruments, reagents and services for diagnostic and research labs) made 65% of FY25 revenue and cardiovascular devices (stents, balloons, guidewires) 35%. Lab demand follows test volumes; stent demand follows heart procedures, many of them funded by schemes such as PM-JAY.",
    },
    {
      title: "Margins are widening",
      body: "EBITDA rose from ₹190 Cr in FY24 to ₹309 Cr in FY25, lifting the margin from 12.3% to 16.3% of revenue. Profit before one-off items (adjusted PAT) went from ₹21 Cr to ₹103 Cr.",
    },
    {
      title: "An IPO that mostly repays debt",
      body: "₹509.85 Cr of the ₹600 Cr fresh issue repays loans at subsidiaries, against group borrowings of ₹862.76 Cr at 31 Aug 2026. Net debt was 3.1x EBITDA in FY25, so the issue should cut interest costs.",
    },
  ],

  business: {
    narrative: [
      "Integris began in 2008 as a distributor of cardiology products, founded by Gurmit Singh Chugh and Punita Sharma. It now makes drug-eluting stents (Yukon, VIVO ISAR) and balloons in Dehradun, Hechingen (Germany) and Helmond (Netherlands), and diagnostic instruments and reagents in Chennai. Everstone Capital invested in 2019 and is now the majority owner; the group has completed 17 acquisitions in all.",
      "The larger half is lab solutions: it represents over 200 global brands, such as Euroimmun, Bio-Rad, bioMérieux and MGI, and sells and services their instruments and reagents to more than 9,500 labs in India and Southeast Asia, including Dr Lal PathLabs and Metropolis. That is why 82% of FY25 revenue came from traded goods; only 16% was from products it makes itself.",
      "Two thirds of revenue (64.9% in FY25) comes from outside India, mostly Singapore, Malaysia, Thailand, the Philippines and Vietnam. The DRHP calls it the largest scientific-lab solutions company in Southeast Asia (Frost & Sullivan).",
    ],
    segments: [
      { title: "Clinical diagnostics", metric: "₹681 Cr FY25 · +46% YoY", body: "Analyzers, reagent kits and consumables for pathology and hospital labs, mostly partner brands plus its own Chennai-made kits. The fastest-growing line; the group has grown partly by buying distributors in Southeast Asia." },
      { title: "Scientific lab solutions", metric: "₹560 Cr FY25 · +6.5% YoY", body: "Equipment, consumables, calibration (BioCal) and service for research, university and industrial labs, mainly in Singapore, Malaysia, Thailand and Vietnam." },
      { title: "Drug-eluting stents and balloons", metric: "₹344 Cr FY25 · +4.7% YoY", body: "Own-brand stents and drug-coated balloons; the first and only Indian maker with a US FDA-approved stent. The NPPA caps stent prices in India; this line grew 4.7% in FY25." },
      { title: "Other cardiovascular products", metric: "₹318 Cr FY25 · +36% YoY", body: "Guidewires, vascular-access products, imaging and lesion-assessment systems and other partner devices, sold to more than 2,000 hospitals and cath labs." },
    ],
    mix: {
      title: "Share of FY25 revenue from operations by business line",
      source: "DRHP (9 Oct 2025), KPI table, restated consolidated",
      slices: [
        { label: "Clinical diagnostics", value: 35.8 },
        { label: "Scientific lab solutions", value: 29.44 },
        { label: "DES and balloons", value: 18.06 },
        { label: "Other cardiovascular products", value: 16.7 },
      ],
    },
  },

  industry: {
    narrative: [
      "Frost & Sullivan, in the report commissioned for the DRHP, puts India's medtech market at US$13.3bn in 2019 and expects US$27.7bn by 2029; it grew 7.2% a year over 2019-24 and is forecast to grow 8.0% a year over 2024-29, faster than the Asia-Pacific region. Cardiovascular devices are among the fastest-growing parts: US$2.3bn in 2024, heading for US$4.3bn by 2029.",
      "In coronary stents, Indian makers such as Integris, Sahajanand Medical Technologies and Micro Life Sciences already hold about 60% of domestic volumes, and the NPPA caps stent prices. Southeast Asian lab markets grow with hospital and diagnostic-chain expansion, but there Integris mostly resells global brands.",
    ],
    chart: {
      title: "India interventional cardiology market",
      unit: "US$ Mn",
      source: "Frost & Sullivan report in the Integris Medtech DRHP (calendar years; 2029 is a forecast)",
      points: [
        { label: "2019", value: 291.4 },
        { label: "2024", value: 480.0 },
        { label: "2029F", value: 817.6, projected: true },
      ],
    },
    snapshot: [
      { label: "India medtech market, 2019 → 2029F", value: "US$13.3bn → US$27.7bn", tone: "pos" },
      { label: "India cardiovascular devices, 2024-29F", value: "13.5% CAGR to US$4.3bn", tone: "pos" },
      { label: "Indian makers' share of stent volumes", value: "~60%", tone: "pos" },
      { label: "US FDA-approved stents, share of India volumes (2024)", value: "30%", tone: "neutral" },
      { label: "Stent prices in India", value: "Capped by NPPA", tone: "neg" },
    ],
  },

  financials: {
    source: "DRHP (9 Oct 2025), restated consolidated financial information and KPI table; FY26 audited figures not yet public",
    years: [
      { label: "FY23", revenue: 1348.1, ebitda: 168.8, pat: -40.5 },
      { label: "FY24", revenue: 1553.4, ebitda: 190.5, pat: -4.9 },
      { label: "FY25", revenue: 1902.5, ebitda: 309.4, pat: 70.7 },
      { label: "Q1 FY26", revenue: 485.3, ebitda: 78.7, pat: 267.6, partial: true },
    ],
    note: "Revenue grew at an 18.8% CAGR over FY23-25. The FY23 and FY24 losses came from one-off write-offs and goodwill impairments (₹83 Cr and ₹26 Cr of exceptional items), and the Q1 FY26 profit is mostly a ₹239.6 Cr accounting gain when an associate became a subsidiary; profit before exceptional items was ₹31 Cr in that quarter. Aggregators often show total income (₹1,959.6 Cr in FY25), not revenue from operations.",
  },

  kpi: {
    title: "EBITDA margin on revenue from operations",
    unit: "%",
    source: "DRHP KPI table (restated consolidated)",
    points: [
      { label: "FY23", value: 12.52 },
      { label: "FY24", value: 12.26 },
      { label: "FY25", value: 16.26 },
      { label: "Q1 FY26", value: 16.22 },
    ],
  },
  ratios: [
    { label: "Gross margin, FY25", value: "43.95% (45.09% in Q1 FY26)", tone: "neutral" },
    { label: "ROCE, FY25", value: "14.51% (RoE 5.35%: profit over total equity of ₹1,321 Cr; 1.84% on SEBI-defined net worth)", tone: "neutral" },
    { label: "Net debt / EBITDA, FY25", value: "3.12x", tone: "neg" },
    { label: "Total borrowings", value: "₹793 Cr (Jun 2025); ₹863 Cr (31 Aug 2026)", tone: "neg" },
    { label: "Net working capital, FY25", value: "124 days (152 in Q1 FY26)", tone: "neg" },
    { label: "Goodwill, Jun 2025", value: "₹1,105 Cr of ₹4,020 Cr total assets", tone: "neutral" },
    { label: "Revenue from outside India, FY25", value: "64.9% (53.1% from Asia excl. India)", tone: "neutral" },
    { label: "Diluted EPS, FY25", value: "₹5.73 (₹27.61 in Q1 FY26 incl. a one-off gain)", tone: "neutral" },
  ],

  useOfProceeds: [
    { label: "Repay loans of step-down subsidiaries (CPC Diagnostics, Chemopharm and others)", valueCr: 415.98 },
    { label: "Repay loans of wholly owned subsidiaries (Translumina Therapeutics, Transhealth, HaleMed)", valueCr: 93.87 },
  ],
  proceedsNote:
    "Of the ₹600 Cr fresh issue, ₹509.85 Cr (about 85%) repays borrowings, accrued interest and prepayment penalties at subsidiaries; the rest, after issue expenses, is for general corporate purposes (capped at 25% of gross proceeds). The split is from the Oct 2026 revision as reported by Chittorgarh; the DRHP had earmarked ₹696.39 Cr for debt. The OFS money goes to Evercure, not the company.",
  shareholding: [
    { holder: "Medicore Holdings (Everstone, promoter)", pct: 33.93 },
    { holder: "Evercure Holdings (Everstone, promoter)", pct: 28.85 },
    { holder: "Co-founders Gurmit Singh Chugh and Punita Sharma (promoters)", pct: 20.46 },
    { holder: "Other investors (RT Heptagon, Mukul Agrawal and others) and ESOPs", pct: 16.76 },
  ],
  sellers: [
    { name: "Evercure Holdings (Everstone Capital)", detail: "Sole seller: 1,08,37,266 shares, down from 1,51,74,251 in the DRHP; average cost ₹203.43 a share." },
    { name: "Gurmit Singh Chugh and Punita Sharma (withdrawn)", detail: "Were to sell 32.5 lakh shares each in the DRHP; no longer selling after the Oct 2026 revision." },
  ],

  peers: [
    { name: "Poly Medicure", ticker: "POLYMED", note: "Named in the DRHP's peer set; an own-brand maker of vascular-access and other disposables." },
    { name: "Laxmi Dental", ticker: "LAXMIDENTL", note: "Named in the DRHP's peer set; an Indian dental-devices maker." },
    { name: "Tarsons Products", ticker: "TARSONS", note: "Lab plasticware maker for research and diagnostic labs; closest listed match for scientific lab solutions." },
    { name: "Entero Healthcare Solutions", ticker: "ENTERO", note: "Healthcare products distributor; a reference for the traded-goods model behind most of the lab business." },
  ],
  valuationNote:
    "With no price band there is no IPO multiple yet. The DRHP itself says it has no listed peer of similar size and model: Poly Medicure and Laxmi Dental make their own products and earn higher margins than Integris, while most Integris revenue is resold partner brands, closer to a distributor such as Entero. The Jun 2025 share-swap reference (~₹7,000 Cr) would be about 100x FY25 reported earnings but under 4x FY25 revenue; see the peer table for the listed companies' current figures.",

  strengths: [
    { title: "A leading Indian stent maker with evidence", body: "India's #2 coronary stent maker by volume with a 22% share of drug-eluting stents, the only Indian company with a US FDA-approved stent, and two stent platforms backed by 10-year clinical data." },
    { title: "Spread across products and countries", body: "Lab and heart businesses, sold in India and more than 65 other markets; no single product line makes up more than about a third of revenue." },
    { title: "Scale in Southeast Asian labs", body: "Rated the largest scientific-lab solutions company in Southeast Asia, serving over 9,500 labs with 152 service engineers, which makes it a sticky partner for global brands entering the region." },
    { title: "Acquisition track record and a large sponsor", body: "Seventeen acquisitions under Everstone, including German and Dutch device makers, gave it technology and access to European hospitals." },
  ],
  risks: [
    { risk: "Profits are thin and noisy: losses in FY23 and FY24, and most of the Q1 FY26 profit is a ₹239.6 Cr one-off accounting gain", mitigant: "Profit before one-off items rose to ₹103 Cr in FY25 and EBITDA margins widened", severity: "high" },
    { risk: "About 82% of FY25 revenue came from traded goods; losing a major distribution agreement (e.g. a large diagnostics brand) would hit sales", mitigant: "More than 200 partner brands, plus own manufacturing in cardiovascular devices", severity: "high" },
    { risk: "Acquisition-led growth: goodwill of ₹1,105 Cr and past impairments (Artic GmbH, a CPC Diagnostics unit) show deals can disappoint", mitigant: "Recent buys are bolt-ons in markets it already serves", severity: "medium" },
    { risk: "Debt and working capital: net debt 3.1x EBITDA in FY25 and working capital of 124-152 days", mitigant: "₹509.85 Cr of the fresh issue repays debt", severity: "medium" },
    { risk: "Regulation: NPPA price caps on stents, product recalls (8 in FY23, 2 in FY25) and approvals in many countries; 65% of revenue is overseas, so currency moves matter", mitigant: "Plants hold CE and ISO 13485 certification; revenue spread over many markets", severity: "medium" },
  ],

  outlook: {
    bull: "Lab solutions keep growing in India and Southeast Asia, own-brand stents and balloons gain share abroad, debt repayment lifts profits sharply, and the issue is priced below what the earnings recovery implies.",
    base: "Revenue grows in the high teens, EBITDA margins hold around 16-18%, and lower interest costs turn the margin gains into steadier reported profits, with the price band deciding how much of that is already paid for.",
    bear: "A key distribution partner leaves or a large acquisition disappoints, stent price caps tighten, and with thin underlying profit the stock trades on a high earnings multiple that leaves little room for error.",
  },
  sources: [
    { title: "Integris Medtech Limited - DRHP (9 Oct 2025)", source: "SEBI", url: "https://www.sebi.gov.in/filings/public-issues/oct-2025/integris-medtech-limited_97342.html", year: "2025" },
    { title: "Integris Medtech IPO: dates, issue details, financials", source: "Chittorgarh", url: "https://www.chittorgarh.com/ipo/integris-medtech-ipo/2774/", year: "2026" },
    { title: "Integris Medtech IPO size cut: fresh issue and debt repayment", source: "IndMoney", url: "https://www.indmoney.com/blog/ipo/integris-medtech-ipo-fresh-issue-cut-debt-repayment", year: "2026" },
    { title: "Integris Medtech IPO: fresh issue cut to ₹600 crore", source: "IPO Market", url: "https://www.ipomarket.in/news/integris-medtech-ipo-2026-fresh-issue-cut-600-crore-date-price-review", year: "2026" },
    { title: "Integris Medtech gets SEBI nod for ₹925 Cr IPO", source: "Digital Health News", url: "https://www.digitalhealthnews.com/integris-medtech-secures-sebi-approval-for-ipo-plans-inr-925-cr-fundraise-to-fuel-global-expansion", year: "2026" },
    { title: "Everstone-backed Integris Medtech files DRHP with SEBI", source: "BioSpectrum India", url: "https://www.biospectrumindia.com/news/86/26795/everstone-capital-backed-integris-medtech-files-drhp-with-sebi-for-ipo.html", year: "2025" },
  ],
};
