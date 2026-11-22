import type { SectorReport } from "./types";

export const insurance: SectorReport = {
  slug: "insurance",
  title: "India Insurance",
  subtitle: "Life, general and health insurers, the banks and apps that sell for them, and the capital and rules behind them",
  asOf: "Nov 2026",

  stance: {
    label: "Positive on life and retail health, cautious on motor and PSU general insurers",
    tone: "pos",
    line: "Thin cover, GST-free individual policies and 100% FDI support long growth for protection and retail health; motor third-party claims, catastrophe losses and distribution rules are the things to watch.",
  },
  keyStats: [
    { label: "Insurance penetration, FY25", value: "3.7% of GDP", sub: "life 2.7%, non-life 1.0% (IRDAI annual report 2024-25)" },
    { label: "LIC share of first-year premium, H1 FY27", value: "58.77%", sub: "37.51% individual, 70.45% group (LIC, 5 Nov 2026)" },
    { label: "Health insurance premium, FY26", value: "~₹1.37L Cr", sub: "up about 15% (General Insurance Council)" },
    { label: "Foreign ownership cap", value: "100%", sub: "raised from 74% by the Act of 20 Dec 2025" },
  ],
  thesis: [
    {
      title: "A thin market with a long runway",
      body: "Premiums were 3.7% of GDP in FY25 (IRDAI), below the 4.2% peak of FY22 and far below the world average. GST-free individual policies (Sep 2025) and new foreign capital (Dec 2025) lower the cost of cover for the under-insured middle.",
    },
    {
      title: "Life insurers compound value, judged on VNB",
      body: "Private life insurers earned H1 FY27 VNB margins of about 21-28% (company disclosures); embedded value grew 12-17% in the year to Sep 2026 at ICICI Life and Axis Max Life. Bank branches sell most of their policies, so distribution reach and product mix decide who wins.",
    },
    {
      title: "General insurance lives on its combined ratio",
      body: "Private leaders run near 100% and earn their return on the float; motor third-party claims, floods and thin state-owned capital make the non-life side far more volatile. Combined-ratio bases differ by insurer, so compare like with like.",
    },
  ],

  developments: [
    {
      date: "Nov 2026",
      title: "LIC keeps 58.77% of first-year premium",
      body: "LIC's H1 FY27 results (5 Nov) showed its share of first-year premium at 58.77% - 37.51% in individual and 70.45% in group business - with embedded value of about ₹7.97L Cr.",
      impact: "neutral",
      tag: "Results",
    },
    {
      date: "Oct 2026",
      title: "ICICI Prudential Life becomes ICICI Life",
      body: "The ICICI Bank-controlled insurer reported H1 FY27 results as ICICI Life Insurance on 13 Oct, with VNB up 22.3% and embedded value up 12.2%; its NSE symbol changed from ICICIPRULI to ICICILIFE.",
      impact: "neutral",
      tag: "Corporate",
    },
    {
      date: "Oct 2026",
      title: "Floods and motor claims lift general insurers' ratios",
      body: "ICICI Lombard's Q2 FY27 combined ratio rose to 104.5% (n basis) from 103.9%, or 102.7% without catastrophe losses (company, 14 Oct). Motor third-party claims are rising after the Supreme Court's Jun 2026 ruling on homemaker compensation, while premiums await revision.",
      impact: "neg",
      tag: "Results",
    },
    {
      date: "Jun 2026",
      title: "Nifty Insurance index launched; Turtlemint lists",
      body: "NSE launched the Nifty Insurance index on 15 Jun with 11 listed insurers and intermediaries (factsheet), and agent-tech platform Turtlemint listed on 29 Jun - widening the listed insurance set.",
      impact: "pos",
      tag: "Market",
    },
    {
      date: "Jan 2026",
      title: "Allianz exits the Bajaj insurers",
      body: "Allianz completed the sale of 23% of Bajaj Life and Bajaj General to the Bajaj group on 8 Jan (Allianz), with the remaining 3% to follow by buyback; the insurers were renamed without Allianz in 2025.",
      impact: "neutral",
      tag: "Ownership",
    },
    {
      date: "Dec 2025",
      title: "Parliament allows 100% FDI in insurers",
      body: "The insurance laws amendment received assent on 20 Dec 2025: foreign ownership up to 100% (from 74%), one-time registration for intermediaries and a path to composite licences, which still await notification (Khaitan & Co).",
      impact: "pos",
      tag: "Policy",
    },
  ],

  overview: {
    narrative: [
      "India's insurers collected premiums worth 3.7% of GDP in FY25 (IRDAI) - 2.7% life and 1.0% non-life - well below global levels. LIC still writes most life business, while bank-promoted private insurers hold most of the listed value.",
      "The chain runs from the banks, agents and apps that sell policies, through life, general and health insurers that price and hold the risk, to the reinsurers and TPAs behind them and the promoters and regulator that fund and police them.",
      "The next two years turn on whether GST-free policies and new capital lift protection and retail-health buying, how far motor and catastrophe losses squeeze general insurers, and how IRDAI's capital and distribution rules land.",
    ],
    chart: {
      title: "Insurance penetration in India (premium as % of GDP)",
      unit: "% of GDP",
      source: "IRDAI annual reports, 2019-20 to 2024-25",
      points: [
        { label: "FY20", value: 3.76 },
        { label: "FY21", value: 4.2 },
        { label: "FY22", value: 4.2 },
        { label: "FY23", value: 4.0 },
        { label: "FY24", value: 3.7 },
        { label: "FY25", value: 3.7 },
      ],
    },
    snapshot: [
      { label: "Private life VNB margins, H1 FY27 (company)", value: "~21-28%", tone: "pos" },
      { label: "HDFC Life individual sales via banks, H1 FY27", value: "58%", tone: "neutral" },
      { label: "ICICI Lombard combined ratio, Q2 FY27 (n basis)", value: "104.5%", tone: "neg" },
      { label: "GST on individual life and health policies", value: "Nil since 22 Sep 2025", tone: "pos" },
      { label: "IRDAI minimum solvency ratio", value: "150%", tone: "neutral" },
      { label: "Composite licences", value: "Enabled, not yet notified", tone: "neutral" },
    ],
  },

  valueChain: [
    { stage: "Distribution", zoneIds: ["bancassurance", "digital_brokers"], margin: "Commission within IRDAI's expense cap", moat: "medium", note: "Bank branches are the cheapest channel and tied to their own insurers; online marketplaces lead in term and health." },
    { stage: "Life insurers", zoneIds: ["life_bank", "life_lic"], margin: "VNB margin ~21-28% (private, H1 FY27)", moat: "high", note: "Scale, bank partners and decades-long books are hard to copy; valued on embedded value." },
    { stage: "General & health insurers", zoneIds: ["general", "health"], margin: "Combined ratio ~98-105% (private leaders)", moat: "medium", note: "Retail health earns underwriting profit; motor and group lines rely on float income." },
    { stage: "Reinsurance", zoneIds: ["reinsurance"], margin: "Swings with catastrophe years", moat: "high", note: "GIC Re's statutory share anchors the market; private and foreign capacity is growing." },
    { stage: "Claims administration", zoneIds: ["tpa_claims"], margin: "Fee per policy or claim", moat: "low", note: "Scale and technology matter; insurers can take processing in-house." },
    { stage: "Capital & regulation", zoneIds: ["holdcos", "regulator"], margin: "Holding-company discount", moat: "medium", note: "Promoters fund solvency; IRDAI sets products, commissions and capital." },
  ],

  drivers: [
    { title: "Under-insurance", metric: "3.7% of GDP (FY25)", body: "Penetration has slipped since FY22's 4.2%; cheaper cover and digital sales aim at the uninsured middle class." },
    { title: "GST-free policies", metric: "0% from 22 Sep 2025", body: "Individual life and health premiums fell for buyers, lifting retail demand - though insurers lost input tax credit." },
    { title: "Bank distribution", metric: "58% of HDFC Life's sales", body: "Bank branches sell most private life policies, so the parent bank's reach sets each insurer's growth." },
    { title: "Capital and rules", metric: "100% FDI (Dec 2025)", body: "Foreign owners can now control insurers outright; risk-based solvency and composite licences are next." },
  ],
  mix: {
    title: "How a large private life insurer sells: HDFC Life individual APE by channel, H1 FY27",
    source: "HDFC Life H1 FY2027 investor presentation",
    slices: [
      { label: "Bancassurance", value: 58 },
      { label: "Agency", value: 18 },
      { label: "Non-bank alliances", value: 15 },
      { label: "Direct", value: 9 },
    ],
  },

  pestle: {
    political: [
      { point: "Government push for 'Insurance for All by 2047', 100% FDI and GST-free individual policies.", impact: "pos" },
      { point: "State ownership of LIC, New India, GIC Re and other PSU insurers ties pricing and capital to government decisions.", impact: "neutral" },
    ],
    economic: [
      { point: "Rising incomes, home and vehicle loans and employer cover widen the insured base.", impact: "pos" },
      { point: "Falling interest rates raise the cost of guarantees on savings policies; equity swings move ULIP sales.", impact: "neg" },
    ],
    social: [
      { point: "Ageing and medical inflation raise demand for health cover - and claims.", impact: "neutral" },
      { point: "Mis-selling of savings policies and claim rejections hurt trust.", impact: "neg" },
    ],
    technological: [
      { point: "Bima Sugam and online marketplaces lower the cost of selling simple covers.", impact: "pos" },
      { point: "The National Health Claims Exchange and AI claims checks can speed cashless claims and cut fraud.", impact: "pos" },
    ],
    legal: [
      { point: "Insurance laws amended Dec 2025: 100% FDI, one-time intermediary registration, composite licences pending notification.", impact: "pos" },
      { point: "Supreme Court's Jun 2026 homemaker-compensation ruling raises motor third-party awards.", impact: "neg" },
    ],
    environmental: [
      { point: "Floods and cyclones bring catastrophe losses to general insurers and reinsurers (Q2 FY27).", impact: "neg" },
      { point: "Climate risk raises demand for property, crop and parametric covers.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "hdfclife", tier: "core", why: "Large private life insurer with balanced products and many bank partners." },
    { key: "sbilife", tier: "core", why: "Lowest-cost distribution through SBI's branches and strong protection growth." },
    { key: "iciciLife", tier: "core", why: "Protection- and annuity-led VNB growth under ICICI Bank's control." },
    { key: "iciciLombard", tier: "core", why: "Largest private general insurer with a diversified book and strong capital." },
    { key: "maxFinancial", tier: "direct", why: "Holding company of Axis Max Life, growing VNB and embedded value fast." },
    { key: "lic", tier: "direct", why: "Market leader shifting its mix toward non-par and protection." },
    { key: "starHealth", tier: "direct", why: "Largest retail health insurer; gains most as retail health cover spreads." },
    { key: "pbFintech", tier: "indirect", why: "Online marketplace for term and health, earning more as retail buying grows." },
    { key: "mediAssist", tier: "indirect", why: "Largest TPA; claims volumes grow with group health cover." },
    { key: "gicRe", tier: "indirect", why: "National reinsurer taking a statutory share of every general policy." },
  ],

  companyNews: [
    { key: "lic", date: "Nov 2026", development: "H1 FY27: 58.77% of first-year premium, VNB margin 22.3% (net) and embedded value of ₹7,97,378 Cr (press release, 5 Nov).", impact: "LIC still sets the market's pace, but private insurers keep gaining in individual business.", tone: "neutral" },
    { key: "maxFinancial", date: "Oct 2026", development: "Axis Max Life's H1 FY27 VNB rose 21% to ₹1,180 Cr at a 25.4% margin; embedded value reached ₹31,437 Cr (investor presentation).", impact: "Shows mix shift to protection and annuity lifting value for agency-plus-banca insurers.", tone: "pos" },
    { key: "iciciLife", date: "Oct 2026", development: "Renamed ICICI Life; H1 FY27 VNB rose 22.3% to ₹1,283 Cr at a 26.0% margin, with solvency of 229.9% (company, 13 Oct).", impact: "Protection-led growth is lifting margins across bank-promoted life insurers.", tone: "pos" },
    { key: "sbilife", date: "Oct 2026", development: "H1 FY27 VNB margin of 27.9% and embedded value of ₹87,350 Cr (company filing, 27 Oct).", impact: "Low-cost bank distribution keeps the highest returns among large listed life insurers.", tone: "pos" },
    { key: "iciciLombard", date: "Oct 2026", development: "Q2 FY27 combined ratio of 104.5% (n basis), 102.7% excluding catastrophe losses; solvency 2.74x (company, 14 Oct).", impact: "Floods and motor claims weigh on even the strongest private general insurer.", tone: "neg" },
    { key: "hdfclife", date: "Oct 2026", development: "H1 FY27 VNB margin of 24.7% and embedded value of ₹66,461 Cr; 13th-month persistency fell to 83% from 86% (investor presentation).", impact: "Growth holds, but persistency is the metric to watch after the GST change.", tone: "neutral" },
  ],

  risks: [
    { risk: "Motor third-party claims outrun premiums that await a government revision", mitigant: "Third-party premium revision sought by insurers; tighter underwriting and own-damage pricing", severity: "high" },
    { risk: "Distribution rules (Bima Sugam, expense-of-management cap, mis-selling curbs) cut commissions and banca volumes", mitigant: "Lower acquisition cost for insurers; marketplaces lean on renewals and advice", severity: "medium" },
    { risk: "Catastrophe losses and thin capital at state-owned general insurers", mitigant: "Reinsurance protection; government capital support; risk-based solvency", severity: "medium" },
    { risk: "Persistency and margin pressure on life insurers after GST and surrender-value changes", mitigant: "Shift to protection and non-par products; repricing and commission redesign", severity: "medium" },
  ],
  outlook: {
    bull: "GST-free policies and new foreign capital lift protection and retail-health buying; life insurers hold VNB margins near today's range while embedded value keeps compounding in the teens, and a third-party premium revision repairs motor.",
    base: "Life new business grows in the low-to-mid teens with stable margins; retail health keeps growing faster than general insurance overall, while motor and catastrophe losses keep private general insurers near a 100-105% combined ratio.",
    bear: "Bima Sugam and IRDAI rules squeeze distribution, persistency slips after the GST change, and motor and flood losses force capital calls at state-owned insurers - valuations de-rate.",
  },
  reading: [
    { title: "Insurance 2.0: Parliament passes the Insurance Amendment Bill, 2025", source: "Khaitan & Co", url: "https://www.khaitanco.com/sites/default/files/2025-12/ERGO%20-%20Insurance%202.0%20-%20Parliament%20passes%20Insurance%20Amendment%20Bill,%202025%20-%2018%20December%202025.pdf", year: "2025" },
    { title: "Nifty Insurance index factsheet", source: "NSE Indices", url: "https://niftyindices.com/Factsheet/Factsheet_Nifty_Insurance.pdf", year: "2026" },
    { title: "HDFC Life H1 FY2027 investor presentation", source: "HDFC Life", url: "https://www.hdfclife.com/content/dam/hdfclifeinsurancecompany/about-us/pdf/investor-relations/financial-information/investor-presentation/HDFC-Life-H1-FY2027-Investor-Presentation.pdf", year: "2026" },
    { title: "ICICI Lombard Q2 FY2027 press release and investor presentation", source: "ICICI Lombard via NSE", url: "https://nsearchives.nseindia.com/corporate/ICICIGI_14102026192138_Press_Release_and_Investor_Presentation.pdf", year: "2026" },
    { title: "IRDAI annual reports", source: "IRDAI", url: "https://irdai.gov.in/annual-reports" },
  ],
};
