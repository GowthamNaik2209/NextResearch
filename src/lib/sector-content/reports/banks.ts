import type { SectorReport } from "./types";

export const banks: SectorReport = {
  slug: "banks",
  title: "India Banks & NBFCs",
  subtitle: "Who makes India's credit, who funds it and who earns on it - from gold and vehicle lenders to the large banks, state lenders and the RBI rails underneath",
  asOf: "Nov 2026",

  stance: {
    label: "Strong credit cycle, rising rates",
    tone: "neutral",
    line: "Credit is growing at its fastest in years and bad loans are at a multi-decade low, but deposits lag loans and RBI has started raising rates - funding cost now decides who earns most.",
  },
  keyStats: [
    { label: "Bank credit, 31 Oct 2026", value: "₹231.8L Cr", sub: "up 19.5% a year; deposits ₹282.5L Cr, up 16.9% (RBI, scheduled commercial banks)" },
    { label: "Non-food credit growth, Sep 2026", value: "19.1%", sub: "11.2% a year earlier (RBI sectoral data)" },
    { label: "Banks' gross NPA ratio, Mar 2026", value: "1.8%", sub: "11.6% in Mar 2018 (RBI FSR)" },
    { label: "Repo rate", value: "5.50%", sub: "raised 25 bps on 7 Oct 2026 (RBI MPC)" },
  ],
  thesis: [
    {
      title: "The cheapest deposits win",
      body: "Banks with a large share of current and savings deposits fund themselves below everyone else and set the price of credit for the whole chain. With loans growing faster than deposits, that advantage widens: the five large banks hold close to half of the system and lend on to NBFCs, HFCs and MFIs.",
    },
    {
      title: "Niche lenders earn more per loan, and feel shocks first",
      body: "Gold, vehicle, small-business and affordable-housing NBFCs earn higher yields by knowing borrowers banks avoid. But they borrow from banks and bond markets, so RBI's Oct 2026 hike reaches their funding cost first, and unsecured and microfinance books are where defaults start.",
    },
    {
      title: "Clean balance sheets and new owners",
      body: "Banks' bad-loan ratio fell from 11.6% in Mar 2018 to 1.8% in Mar 2026, and capital is at a multi-decade high (17.7%). Foreign banks and funds are buying in - MUFG, Emirates NBD, SMBC, Blackstone, IHC, Fairfax - giving mid-size lenders capital and a valuation floor.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Bank credit growth reaches 19%",
      body: "RBI's sectoral data for the fortnight to 30 Sep 2026 showed non-food credit up 19.1% a year (11.2% a year earlier): services 28.3%, industry 19.5%, agriculture 19.5% and personal loans 17.3%, with NBFCs named among the drivers of services credit.",
      impact: "pos",
      tag: "Credit",
    },
    {
      date: "Oct 2026",
      title: "Cabinet clears IDBI Bank sale to Fairfax",
      body: "On 14 Oct 2026 the Cabinet approved selling 60.72% of IDBI Bank (30.48% government, 30.24% LIC) to a Fairfax company for ₹52,878 Cr. RBI approval and an open offer are pending; the government expects to close in FY27.",
      impact: "neutral",
      tag: "Ownership",
    },
    {
      date: "Oct 2026",
      title: "RBI raises the repo rate to 5.50%",
      body: "The MPC voted 6-0 on 7 Oct 2026 to raise the repo rate 25 bps and changed its stance to 'calibrated tightening', projecting CPI inflation of 6.0% in Q3 and 5.7% in Q4 FY27. SDF is 5.25% and MSF 5.75%.",
      impact: "neg",
      tag: "Rates",
    },
    {
      date: "Jun 2026",
      title: "Bad loans at a multi-decade low; Emirates NBD completes RBL",
      body: "RBI's June FSR put banks' gross NPA ratio at 1.8% and capital adequacy at 17.7% for Mar 2026, with NBFCs' GNPA at 2.4%. On 18 Jun, Emirates NBD completed its ~$2.75 bn investment for 60% of RBL Bank - the largest foreign investment in Indian banking.",
      impact: "pos",
      tag: "Asset quality",
    },
    {
      date: "May 2026",
      title: "IHC takes control of Sammaan; Kissht lists",
      body: "Abu Dhabi's IHC became promoter and controlling shareholder of Sammaan Capital (ex-Indiabulls Housing) on 15 May 2026. App-based lender Kissht (OnEMI Technology) listed on 8 May after a ₹926 Cr IPO.",
      impact: "pos",
      tag: "Capital",
    },
    {
      date: "Apr 2026",
      title: "MUFG completes 20% of Shriram Finance",
      body: "MUFG Bank invested ₹39,618 Cr for 20% of Shriram Finance through a preferential issue. The same month Bain Capital completed its open offer and took joint control of Manappuram Finance.",
      impact: "pos",
      tag: "Ownership",
    },
  ],

  overview: {
    headline: "Banks' bad-loan ratio fell from 11.6% in Mar 2018 to 1.8% in Mar 2026, a multi-decade low",
    narrative: [
      "India's credit system runs through four layers: specialist NBFCs that reach borrowers banks skip (gold, vehicles, micro-loans, small business, affordable homes), deposit-taking banks that fund most of the system, group and state lenders with big balance sheets but no retail deposits, and the RBI, refinancers, bureaus and payment rails underneath.",
      "The 2015-18 bad-loan crisis, mostly corporate loans at public-sector banks, was cleaned up through recapitalisation, insolvency and write-offs. By Mar 2026 banks' gross NPA ratio was 1.8% and capital 17.7%, and RBI's baseline stress test sees GNPA only edging up to 1.9% by Mar 2028.",
      "That clean slate is now funding fast growth - credit up about 19.5% a year in late 2026 - while deposits grow slower and RBI has started raising rates. The question for investors is less about bad loans and more about who has the cheapest, stickiest funding.",
    ],
    chart: {
      title: "Scheduled commercial banks' gross NPA ratio, March-end (each as first reported in the next FSR)",
      unit: "% of gross advances",
      source: "RBI Financial Stability Report, ch. II (SCB asset quality): Jun 2018, Jul 2020, Jul 2021, Jun 2022, Jun 2023, Jun 2024, Jun 2025 and Jun 2026 editions",
      kind: "series",
      points: [
        { label: "FY18", value: 11.6 },
        { label: "FY20", value: 8.5 },
        { label: "FY21", value: 7.5 },
        { label: "FY22", value: 5.9 },
        { label: "FY23", value: 3.9 },
        { label: "FY24", value: 2.8 },
        { label: "FY25", value: 2.3 },
        { label: "FY26", value: 1.8 },
      ],
    },
    snapshot: [
      { label: "Banks' capital adequacy (CRAR), Mar 2026 (RBI FSR)", value: "17.7%; CET1 15.3%", tone: "pos" },
      { label: "Baseline stress-test GNPA, Mar 2028 (RBI FSR)", value: "1.9%", tone: "pos" },
      { label: "NBFCs' gross NPA and CRAR, Mar 2026 (RBI FSR)", value: "2.4%; 22.3%", tone: "pos" },
      { label: "Bank credit vs deposit growth, 31 Oct 2026 (RBI)", value: "19.5% vs 16.9%", tone: "neg" },
      { label: "Microfinance overdues 31-90 days, Dec 2025 (MFIN)", value: "1.6%, from 3.2%", tone: "pos" },
      { label: "Repo rate after the 7 Oct 2026 hike (RBI)", value: "5.50%", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Specialist lenders", zoneIds: ["consumer_credit", "vehicle_finance", "gold_loans", "microfinance", "msme_lending"], margin: "Highest yields, highest credit costs", moat: "medium", note: "Know-your-borrower and local collection win niches; funding cost and credit cycles decide returns." },
    { stage: "Home finance", zoneIds: ["affordable_housing", "prime_housing"], margin: "Thin spreads in prime, wider in affordable", moat: "medium", note: "Banks set the price of prime home loans; affordable HFCs earn more by underwriting informal incomes." },
    { stage: "Deposit-taking banks", zoneIds: ["large_banks", "psu_banks", "midsize_private", "sfb"], margin: "Spread over the cheapest funding in the system", moat: "high", note: "Current and savings deposits are the moat; the five large banks fund much of the rest of the chain." },
    { stage: "Groups & state lenders", zoneIds: ["diversified_nbfc", "infra_lenders"], margin: "Narrow spreads, very low costs", moat: "medium", note: "Group or sovereign backing lowers funding cost; state lenders grow with government capex." },
    { stage: "Rails & regulators", zoneIds: ["oversight", "credit_rails"], margin: "Fee and licence income, no credit risk", moat: "high", note: "Bureaus, UPI and mandates, POS EMI and core-banking software earn on every loan; RBI sets the rules." },
  ],

  drivers: [
    { title: "Credit demand", metric: "19.1% non-food credit growth", body: "Services (28.3%), industry and agriculture (19.5% each) and personal loans (17.3%) all grew fast in the year to Sep 2026 (RBI), with NBFCs borrowing heavily from banks." },
    { title: "Clean balance sheets", metric: "1.8% gross NPA", body: "Banks' bad-loan ratio is at a multi-decade low and capital at 17.7% (RBI FSR, Mar 2026), freeing capital to lend and keeping credit costs low." },
    { title: "Funding squeeze", metric: "Deposits 16.9% vs credit 19.5%", body: "Loans are outgrowing deposits, with the gap widening to 2.6 points (RBI, 31 Oct 2026) as rates rise - banks with strong current and savings accounts gain; bond-funded NBFCs pay more." },
    { title: "Foreign capital", metric: "~$2.75 bn for 60% of RBL", body: "Emirates NBD, MUFG (₹39,618 Cr for 20% of Shriram), SMBC, Blackstone, IHC and Fairfax are bringing capital and lower funding costs to mid-size lenders." },
  ],
  mix: {
    title: "Microfinance portfolio by lender type, 31 Dec 2025",
    source: "MFIN Micrometer Q3 FY26 (press release, 6 Mar 2026)",
    slices: [
      { label: "NBFC-MFIs", value: 42.1 },
      { label: "Banks", value: 26.7 },
      { label: "SFBs and other NBFCs", value: 31.2 },
    ],
  },

  pestle: {
    political: [
      { point: "The government is selling IDBI Bank and allowing large foreign stakes in private banks and NBFCs.", impact: "pos" },
      { point: "Public-sector banks still carry policy lending (farm, scheme targets) and may face further mergers.", impact: "neutral" },
    ],
    economic: [
      { point: "Credit growth near 19% and GDP growth projected at 7.1% for FY27 (RBI) support loan demand.", impact: "pos" },
      { point: "Inflation above 5% led RBI to hike to 5.50%; deposits lag loans, raising funding costs.", impact: "neg" },
    ],
    social: [
      { point: "Rising incomes and formalisation bring first-time borrowers in smaller towns into formal credit.", impact: "pos" },
      { point: "Over-borrowing in microfinance and small personal loans hurt low-income households in 2023-25.", impact: "neg" },
    ],
    technological: [
      { point: "UPI, e-mandates, account aggregators and bureau data make instant, low-cost lending possible.", impact: "pos" },
      { point: "Outages, fraud and app-lending abuse draw RBI action (curbs on onboarding, digital-lending rules).", impact: "neg" },
    ],
    legal: [
      { point: "RBI's scale-based NBFC rules and gold-lending directions bring NBFCs closer to bank-like standards.", impact: "neutral" },
      { point: "One RBI order - a risk-weight change or a lending embargo - can reprice a segment overnight.", impact: "neg" },
    ],
    environmental: [
      { point: "Renewable and green-hydrogen lending (IREDA, PFC, REC) grows with India's energy transition.", impact: "pos" },
      { point: "Weak monsoons and climate events hit rural, farm and microfinance repayments.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "hdfcBank", tier: "core", why: "Largest private deposit base and home-loan book; gains when funding is scarce." },
    { key: "icicibank", tier: "core", why: "Strong deposits and low credit costs across retail and business banking." },
    { key: "sbi", tier: "core", why: "Largest bank by deposits and loans; repo-linked book and cheapest funding." },
    { key: "kotak", tier: "direct", why: "High capital and affluent deposit base, with growth unlocked after RBI's curbs ended." },
    { key: "bajfinance", tier: "direct", why: "Scale leader in consumer credit, but NBFC funding feels rate hikes." },
    { key: "shriramfin", tier: "direct", why: "Used-vehicle and MSME leader with MUFG capital lowering funding costs." },
    { key: "muthootFinance", tier: "direct", why: "Gold-loan leader that gains when unsecured lending turns risky." },
    { key: "auBank", tier: "indirect", why: "Largest SFB on the path to a universal bank licence." },
    { key: "pfc", tier: "indirect", why: "Grows with power and renewable capex at near-sovereign funding cost." },
  ],

  companyNews: [
    { key: "idbiBank", date: "Oct 2026", development: "Cabinet approved the sale of 60.72% to a Fairfax company for ₹52,878 Cr at ₹81 a share; RBI approval and an open offer follow, with completion targeted in FY27.", impact: "The biggest privatisation of a bank yet; Fairfax would control two Indian banks with CSB.", tone: "neutral" },
    { key: "rblBank", date: "Jun 2026", development: "Emirates NBD completed its ~$2.75 bn primary investment for 60% of RBL Bank and the mandatory open offer.", impact: "First majority purchase of a profitable Indian bank by a foreign bank; sets a precedent for others.", tone: "pos" },
    { key: "sammaan", date: "May 2026", development: "IHC, through Avenir Investment, became promoter and controlling shareholder after a ~₹8,850 Cr investment and open offer.", impact: "Foreign strategic capital rescuing a legacy wholesale lender.", tone: "pos" },
    { key: "kissht", date: "May 2026", development: "OnEMI Technology (Kissht) listed on 8 May 2026 after a ₹926 Cr IPO priced at ₹162-171, opening above the issue price.", impact: "Adds a listed app-based small-loan lender - the riskiest slice of consumer credit.", tone: "neutral" },
    { key: "shriramfin", date: "Apr 2026", development: "MUFG Bank completed a ₹39,618 Cr preferential investment for 20% at ₹840.93 a share.", impact: "Largest foreign investment in an Indian NBFC; lowers its capital and funding cost.", tone: "pos" },
    { key: "manappuram", date: "Apr 2026", development: "Bain Capital completed its preferential investment (Mar) and ₹236-a-share open offer (Apr), taking joint control with the founders after RBI approval.", impact: "Private equity backing the gold-loan model.", tone: "pos" },
  ],

  risks: [
    { risk: "Rate hikes and a deposit squeeze raise funding costs, hitting NBFCs and HFCs first", mitigant: "Repo-linked bank loans re-price up; strong NBFCs have AAA ratings and group backing", severity: "high" },
    { risk: "Unsecured and microfinance defaults return after fast personal-loan growth", mitigant: "MFIN guardrails, RBI's 2023 risk-weight tools, shift to secured loans", severity: "high" },
    { risk: "Regulatory shocks: risk-weight changes, embargoes on lenders, ownership limits", mitigant: "High system capital (17.7%) and diversified lenders", severity: "medium" },
    { risk: "Corporate and infrastructure stress as the capex cycle peaks", mitigant: "Bad loans at a multi-decade low; insolvency code and ARCs for resolution", severity: "medium" },
  ],
  outlook: {
    bull: "Credit keeps growing in the high teens, RBI stops after one or two hikes, bad loans stay near lows and foreign capital keeps re-rating mid-size banks and NBFCs.",
    base: "Credit growth eases toward the mid-teens as rates rise; large banks with strong deposits hold returns, NBFC spreads narrow for a few quarters and credit costs drift up from very low levels.",
    bear: "Rates rise further while deposits lag, unsecured and microfinance defaults return and RBI tightens rules again - NBFCs and SFBs take the losses and lending slows.",
  },
  reading: [
    { title: "Financial Stability Report, June 2026", source: "Reserve Bank of India", url: "https://rbi.org.in/scripts/PublicationReportDetails.aspx?ID=1325", year: "2026" },
    { title: "Sectoral Deployment of Bank Credit - September 2026", source: "Reserve Bank of India", url: "https://rbi.org.in/SCRIPTs/BS_PressReleaseDisplay.aspx?prid=63891", year: "2026" },
    { title: "Minutes of the MPC meeting, October 2026", source: "Reserve Bank of India", url: "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63839", year: "2026" },
    { title: "Scheduled Banks' Statement of Position in India as on 31 Oct 2026", source: "Reserve Bank of India", url: "https://rbi.org.in/Scripts/BS_StatisticsDisplay.aspx?Id=562", year: "2026" },
    { title: "Micrometer Q3 FY26 press release", source: "Microfinance Industry Network (MFIN)", url: "https://mfinindia.org/assets/upload_image/news/pdf/Micrometer%20Q3%20FY%2025-26%20Press%20Release.pdf", year: "2026" },
  ],
};
