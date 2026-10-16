import type { SectorReport } from "./types";

export const realestate: SectorReport = {
  slug: "realestate",
  title: "India Real Estate",
  subtitle: "Housing is cooling after a long upcycle while offices, malls and REITs keep growing",
  asOf: "Oct 2026",

  stance: {
    label: "Mixed: rent-yielding up, housing cooling",
    tone: "neutral",
    line: "GCC-led office demand and mall spending support REITs and landlords. Housing volumes are flat to down, unsold stock is rising and rates have turned up, so the strongest listed developers keep winning share from the rest.",
  },
  keyStats: [
    { label: "Home sales, top 7 cities, 2025", value: "~3.96 lakh", sub: "-14% YoY in units, +6% in value (ANAROCK)" },
    { label: "Office leasing, Jan-Sep 2026", value: "66.4 msf", sub: "record; GCCs ~42% (CBRE)" },
    { label: "Unsold homes, Q3 2026", value: "~6.3 lakh", sub: "+12% YoY, top 7 cities (ANAROCK)" },
    { label: "RBI repo rate", value: "5.50%", sub: "hiked 25 bp on 7 Oct 2026, first hike since 2023" },
  ],
  thesis: [
    {
      title: "Big listed developers keep taking share",
      body: "Housing volumes fell 14% in 2025, but Godrej, Prestige, DLF and Lodha each booked Rs 20,000-34,000 Cr in FY26. Buyers and lenders prefer brands that deliver, and land deals are moving to the developers with cash.",
    },
    {
      title: "Offices and malls are the steadier profit pool",
      body: "GCCs keep office leasing at records, so REIT occupancy and rents are rising. Six listed REITs paid Rs 3,136 Cr in Q1 FY27 (Indian REITs Association), and SEBI now treats REIT units as equity, which widens the buyer base.",
    },
    {
      title: "Building materials follow handovers, not bookings",
      body: "Cement, steel, pipes, wires, tiles and paints are used 2-4 years after a home is sold. The 2022-24 sales boom is now reaching construction and fit-out, which supports volumes even as new bookings slow.",
    },
  ],

  developments: [
    {
      date: "7 Oct 2026",
      title: "RBI hikes repo rate to 5.50%",
      body: "Its first hike since February 2023, driven by high crude prices and a weak rupee; the stance moved to 'calibrated tightening'. Repo-linked home-loan rates will rise.",
      impact: "neg",
      tag: "Rates",
    },
    {
      date: "Oct 2026",
      title: "Office leasing hits a nine-month record",
      body: "CBRE counted 66.4 msf of office leasing in Jan-Sep 2026, up 8% YoY, with GCCs taking about 42%. Leasing by third-party IT services firms fell sharply (Knight Frank).",
      impact: "pos",
      tag: "Office",
    },
    {
      date: "Sep 2026",
      title: "Q3 home sales up 3%, launches up 18%",
      body: "ANAROCK counted ~1.0 lakh homes sold in the top seven cities in Jul-Sep 2026 against ~1.14 lakh launched. Unsold stock rose 12% to ~6.3 lakh homes, and prices rose 7% YoY.",
      impact: "neutral",
      tag: "Housing",
    },
    {
      date: "Jul 2026",
      title: "REITs become eligible for equity indices",
      body: "SEBI's rule treating REITs as equity for mutual funds took effect in January 2026, and index inclusion became possible from 1 July 2026. More domestic funds can now own REIT units.",
      impact: "pos",
      tag: "REITs",
    },
    {
      date: "May 2026",
      title: "Bagmane Prime Office REIT lists",
      body: "A Bengaluru office REIT listed, the sixth listed REIT after Knowledge Realty Trust in August 2025, India's largest office REIT by asset value.",
      impact: "pos",
      tag: "REITs",
    },
    {
      date: "Sep 2025",
      title: "GST on cement cut from 28% to 18%",
      body: "GST 2.0 lowered the tax on cement from 22 September 2025. ANAROCK estimates construction costs fall by up to 3-5%; GST on homes themselves is unchanged.",
      impact: "pos",
      tag: "Tax",
    },
  ],

  overview: {
    narrative: [
      "Indian real estate has two very different businesses. For-sale housing earns cash early: buyers pay in instalments while a tower is built, so bookings and collections matter more than reported profit. Rent-yielding offices, malls and warehouses earn steady rent and are increasingly held in REITs.",
      "Housing sales in the top seven cities peaked in 2023 and fell 14% in 2025 as prices rose faster than incomes, while sales value kept rising on a shift to premium homes. Offices are the opposite: GCCs pushed leasing to records and vacancy is falling in the main IT cities.",
      "Behind both sit contractors, cement, steel, pipes, wires, lifts, tiles and paints, which are used years after a sale, and the banks and housing finance companies that fund buyers and developers.",
    ],
    chart: {
      title: "Housing sales in India's top 7 cities",
      unit: "'000 units",
      source: "ANAROCK Research, calendar years (2024 and 2025 from ANAROCK's year-end releases)",
      points: [
        { label: "2019", value: 261 },
        { label: "2020", value: 138 },
        { label: "2021", value: 237 },
        { label: "2022", value: 365 },
        { label: "2023", value: 477 },
        { label: "2024", value: 460 },
        { label: "2025", value: 396 },
      ],
    },
    snapshot: [
      { label: "Avg home price growth, Q3 2026", value: "+7% YoY", tone: "neutral" },
      { label: "Homes launched vs sold, Q3 2026", value: "1.14 vs 1.00 lakh", tone: "neg" },
      { label: "REIT payouts, Q1 FY27 (6 REITs)", value: "Rs 3,136 Cr", tone: "pos" },
      { label: "Warehousing leasing, H1 2026", value: "36.8 msf, +15%", tone: "pos" },
      { label: "Cement output, FY26 (ICRA)", value: "491 MT, +8.6%", tone: "pos" },
      { label: "Rs 2-5 Cr home sales, 9M 2026", value: "+19% YoY", tone: "pos" },
    ],
  },

  valueChain: [
    { stage: "Land, approvals & capital", zoneIds: ["land", "finance"], margin: "Land is ~20-40% of project cost; HFC RoA ~2-2.5%", moat: "high", note: "Value is created when land is rezoned, approved or bought cheaply; low-cost funding is a moat for lenders." },
    { stage: "Residential developers & sales", zoneIds: ["residential", "sales"], margin: "~25-35% project EBITDA (listed leaders)", moat: "medium", note: "Brand and delivery record drive pricing and pre-sales; profit is booked on completion, years after the sale." },
    { stage: "Offices, malls & warehouses", zoneIds: ["office", "retail", "warehousing"], margin: "~75-85% NOI margin", moat: "high", note: "Prime locations are scarce; long leases with built-in rent increases; REITs pay out at least 90% of cash flow." },
    { stage: "Construction contractors", zoneIds: ["epc"], margin: "~8-12% EBITDA", moat: "low", note: "Fragmented and working-capital heavy; margins depend on escalation clauses and on-time client payments." },
    { stage: "Cement & steel", zoneIds: ["cement", "steel"], margin: "Cement ~Rs 900-1,200 EBITDA/t", moat: "medium", note: "Scale, limestone reserves and logistics decide cost; prices swing with regional supply." },
    { stage: "Building systems & finishes", zoneIds: ["plumbing", "electricals", "hvac_lifts", "finishes"], margin: "~10-20% EBITDA for branded leaders", moat: "high", note: "Brands and dealer and plumber networks hold share; demand follows handovers and home upgrades." },
  ],

  drivers: [
    { title: "Premium housing", metric: "Rs 2-5 Cr sales +19%", body: "Knight Frank counted 19% more sales in the Rs 2-5 Cr range in Jan-Sep 2026 while sub-Rs 50 lakh sales fell 14%. Listed developers focused on premium projects benefit most." },
    { title: "GCC office demand", metric: "~42% of leasing", body: "Global capability centres took about 42% of 9M 2026 office leasing (CBRE) and 81% of Embassy REIT's Q1 FY27 leasing, keeping vacancy falling in Bengaluru, Hyderabad and Pune." },
    { title: "REIT growth", metric: "Rs 3.17 lakh Cr AUM", body: "Six listed REITs held over Rs 3.17 lakh Cr of assets in Q1 FY27 (Indian REITs Association). Equity classification and index eligibility widen the buyer base for new listings." },
    { title: "Home loans", metric: "~Rs 37 lakh Cr", body: "Individual housing loans outstanding reached ~Rs 37 lakh Cr by Sep 2025 (NHB). Affordable HFC loan books grew 17% in FY26 (ICRA), but rising rates now slow the pace." },
  ],
  mix: {
    title: "Housing sales by city, Q3 2026 (top 7 cities, ~1.0 lakh units)",
    source: "ANAROCK Research",
    slices: [
      { label: "MMR", value: 32 },
      { label: "Bengaluru", value: 17 },
      { label: "Pune", value: 16 },
      { label: "Delhi-NCR", value: 14 },
      { label: "Hyderabad, Chennai & Kolkata", value: 21 },
    ],
  },

  pestle: {
    political: [
      { point: "Infrastructure spending (metros, expressways, airports) opens new housing and office areas around cities.", impact: "pos" },
      { point: "Approvals depend on state governments, and changes in state policy can stall projects for years.", impact: "neg" },
    ],
    economic: [
      { point: "GDP growth near 7% and GCC hiring support office demand and premium housing.", impact: "pos" },
      { point: "Repo hiked to 5.50% with oil above $100 and a weak rupee; EMIs rise and land costs stay high.", impact: "neg" },
    ],
    social: [
      { point: "Urbanisation, nuclear families and rising incomes keep long-run housing demand high.", impact: "pos" },
      { point: "Mid- and low-income buyers are being priced out; sub-Rs 50 lakh sales keep shrinking.", impact: "neg" },
    ],
    technological: [
      { point: "Precast, aluminium formwork and mechanised construction cut build times for large developers.", impact: "pos" },
      { point: "Portals and digital sales lower selling costs but make prices more transparent for buyers.", impact: "neutral" },
    ],
    legal: [
      { point: "RERA escrow and disclosure rules protect buyers and push business to established developers.", impact: "pos" },
      { point: "Land-title disputes, environmental cases and court-ordered construction bans can delay projects.", impact: "neg" },
    ],
    environmental: [
      { point: "Tenants and REIT investors prefer green-certified buildings, which earn higher rents.", impact: "pos" },
      { point: "Winter construction bans in Delhi-NCR, heatwaves and flooding disrupt work and raise costs.", impact: "neg" },
    ],
  },

  beneficiaries: [
    { key: "godrejProp", tier: "core", why: "Largest developer by bookings (Rs 34,171 Cr in FY26); guides Rs 39,000 Cr for FY27 across many cities." },
    { key: "prestige", tier: "core", why: "FY26 sales up 76% to Rs 30,024 Cr, plus a growing office, mall and hotel portfolio." },
    { key: "dlf", tier: "core", why: "Large Gurugram land bank with a net-cash developer arm and a large office and mall rental business." },
    { key: "embassyReit", tier: "core", why: "Bengaluru-heavy office REIT; GCCs took 81% of its Q1 FY27 leasing; guides ~10% DPU growth." },
    { key: "knowledgeReit", tier: "direct", why: "India's largest office REIT by asset value; Blackstone and Sattva sponsored." },
    { key: "phoenix", tier: "direct", why: "Leading mall owner; retail consumption grew 32% in Q1 FY27." },
    { key: "lodha", tier: "direct", why: "MMR and Pune leader with Rs 20,530 Cr FY26 pre-sales and a large Palava land bank." },
    { key: "ultratech", tier: "indirect", why: "Largest cement maker (~200 MTPA); housing is the biggest end-use." },
    { key: "bajajHfl", tier: "indirect", why: "Fast-growing HFC lending to homebuyers and, through lease-rental and construction loans, to developers." },
    { key: "kajaria", tier: "indirect", why: "Largest tile maker; demand follows home handovers and renovations." },
  ],

  companyNews: [
    { key: "dlf", date: "Jul 2026", development: "Q1 FY27 bookings fell to about Rs 657 Cr as launches were deferred; FY27 guidance kept at Rs 20,000 Cr.", impact: "Bookings are lumpy and depend on launches; even the largest developers are timing launches carefully in a slower market.", tone: "neg" },
    { key: "embassyReit", date: "Jul 2026", development: "Q1 FY27 NOI rose 17% to Rs 1,020 Cr; occupancy 93% by value; DPU Rs 6.31, up 9%.", impact: "Shows GCC demand reaching REIT rents and payouts.", tone: "pos" },
    { key: "phoenix", date: "Jul 2026", development: "Mall consumption rose 32% YoY to Rs 4,727 Cr in Q1 FY27; Mall of Asia, Bengaluru nearly doubled.", impact: "Spending at Grade A malls is growing well ahead of overall retail.", tone: "pos" },
    { key: "godrejProp", date: "May 2026", development: "Record FY26 bookings of Rs 34,171 Cr (+16%) and Rs 7,830 Cr operating cash flow; FY27 guidance of Rs 39,000 Cr.", impact: "Share keeps moving to large listed developers despite a weaker market.", tone: "pos" },
    { key: "lodha", date: "Apr 2026", development: "FY26 pre-sales rose 16% to Rs 20,530 Cr, slightly below its Rs 21,000 Cr target after March sales were deferred.", impact: "Even leaders missed targets; management shifted its focus to free cash flow.", tone: "neutral" },
    { key: "ultratech", date: "Jul 2026", development: "Q1 FY27 domestic cement volume rose 13% with EBITDA of Rs 1,214 a tonne; guided to higher fuel costs in Q2.", impact: "Construction volumes are strong, but fuel costs from the West Asia conflict cap margins.", tone: "neutral" },
  ],

  risks: [
    { risk: "Rising rates hit housing affordability", mitigant: "Premium buyers depend less on loans; developers can offer payment plans", severity: "high" },
    { risk: "Launches outrun sales and unsold stock rises", mitigant: "Listed leaders sell faster and have low debt; RERA limits fund diversion", severity: "medium" },
    { risk: "Weaker IT services hiring hurts office and housing demand", mitigant: "GCC and BFSI demand has replaced IT services as the main source of leasing", severity: "medium" },
    { risk: "Fuel and commodity price spike squeezes builders and cement makers", mitigant: "Escalation clauses, pass-through pricing and GST cut on cement", severity: "medium" },
  ],
  outlook: {
    bull: "Inflation eases and rates are cut again in 2027; housing volumes recover to 2024 levels, GCC leasing stays above 80 msf a year and new REIT listings follow.",
    base: "Housing volumes stay flat while value grows high single digits on premium mix; listed developers grow bookings 10-15% and REIT payouts grow ~8-10% a year.",
    bear: "Further rate hikes and a global slowdown cut housing sales 15-20%; unsold stock pushes discounts, and office demand slows as global firms hold back hiring.",
  },
  reading: [
    { title: "India Real Estate: Office and Residential Market, Jul-Sep 2026", source: "Knight Frank India", url: "https://www.knightfrank.co.in/research/india-real-estate-office-and-residential-market-jul-sep-2026-13038.aspx", year: "2026" },
    { title: "India Warehousing Market Report, H1 2026", source: "Knight Frank India", url: "https://www.knightfrank.co.in/research/india-warehousing-market-report-h1-2026-12992.aspx", year: "2026" },
    { title: "Research reports", source: "ANAROCK Research", url: "https://www.anarock.com/research/research-reports" },
    { title: "REIT industry data", source: "Indian REITs Association", url: "https://indianreitsassociation.com/" },
    { title: "Real estate industry in India", source: "IBEF", url: "https://www.ibef.org/industry/real-estate-india" },
  ],
};
