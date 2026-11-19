import type { SectorReport } from "./types";

export const itservices: SectorReport = {
  slug: "itservices",
  title: "India IT Services & GCCs",
  subtitle: "Who earns from the technology work India sells to the world - from the large services firms and specialists to the GCCs, staffing, offices and training around them",
  asOf: "Nov 2026",

  stance: {
    label: "Slow growth, shifting work",
    tone: "neutral",
    line: "The large services firms are growing at low single digits as AI cuts the work in each contract, while GCCs, engineering R&D and healthcare operations keep growing - and pull offices, staffing and skilling with them.",
  },
  keyStats: [
    { label: "India tech industry revenue, FY26E", value: "$315 bn", sub: "up 6.1%; exports $246 bn (Nasscom, Feb 2026)" },
    { label: "Global capability centres, FY26", value: "2,117", sub: "2.36 mn people, $98.4 bn revenue (Nasscom-Zinnov, May 2026)" },
    { label: "AI revenue, FY26E", value: "$10-12 bn", sub: "first Nasscom estimate; 2 mn+ people trained in AI" },
    { label: "Infosys FY27 growth guidance", value: "1-2%", sub: "constant currency, cut from 1.5-3% in Oct 2026" },
  ],
  thesis: [
    {
      title: "The large firms win deals but sell less work per deal",
      body: "TCS booked $9.6 bn and Infosys $5.2 bn of new contracts in Jul-Sep 2026, yet TCS grew 0.5% in the quarter and Infosys cut its FY27 guidance to 1-2%. Clients are signing cost-cutting deals and asking for AI savings to be passed on, so revenue lags bookings.",
    },
    {
      title: "Growth has moved to GCCs, engineering and healthcare operations",
      body: "India's GCCs grew from $64.6 bn of revenue in FY24 to $98.4 bn in FY26, and Nasscom calls GCCs and engineering R&D ($63 bn) the industry's growth engines. US healthcare administration is the fastest-growing operations niche, led by newly listed Sagility and IKS.",
    },
    {
      title: "Talent and workspace follow the hiring",
      body: "Net hiring was only 2.3% in FY26, but GCCs took nearly 40% of new flexible-office seats and average deals doubled from 2023 to 2025. Flexible-office operators, staffing firms and Naukri earn from where people are hired, not from which company bills them.",
    },
  ],

  developments: [
    {
      date: "Oct 2026",
      title: "Weak quarter at the large firms; Infosys cuts guidance",
      body: "TCS grew 0.5% quarter on quarter in constant currency in Jul-Sep 2026 but booked $9.6 bn of deals and put annualised AI revenue above $3.1 bn. Infosys cut FY27 growth guidance to 1-2% with $5.2 bn of large deals; HCLTech's bookings rose 27% to about $3.3 bn.",
      impact: "neg",
      tag: "Results",
    },
    {
      date: "Jun 2026",
      title: "US court strikes down the $100,000 H-1B fee",
      body: "A federal judge in Boston ruled the fee on new H-1B petitions unlawful in a case brought by 20 state attorneys general (8 Jun 2026); an appeals court refused to pause the ruling in July. The administration is appealing.",
      impact: "pos",
      tag: "Visas",
    },
    {
      date: "May 2026",
      title: "GCCs reach $98.4 bn of revenue",
      body: "The Nasscom-Zinnov GCC Landscape report counted 2,117 GCCs with 3,728 units and about 2.36 million employees in FY26, with revenue of $98.4 bn against $64.6 bn in FY24 - close to the $100 bn once expected by 2030.",
      impact: "pos",
      tag: "GCCs",
    },
    {
      date: "Apr 2026",
      title: "Coforge closes Encora; LTIMindtree becomes LTM",
      body: "Coforge completed its purchase of Encora (a deal of about $2.35 bn) on 23 Apr 2026, paying mostly in new shares plus a $550 mn loan. LTIMindtree's name changed to LTM Limited on 17 Apr 2026 (NSE symbol LTM).",
      impact: "neutral",
      tag: "Deals",
    },
    {
      date: "Feb 2026",
      title: "Industry at $315 bn; IT shares sell off on AI fears",
      body: "Nasscom put FY26 tech revenue at $315 bn (up 6.1%) on 24 Feb. The Nifty IT index fell 5.5% on 12 Feb on AI-disruption fears and touched a 30-month low on 24 Feb. Fractal listed on 16 Feb, and OpenAI was named the first customer of TCS's HyperVault data centres (100 MW).",
      impact: "neg",
      tag: "Industry",
    },
    {
      date: "Jan 2026",
      title: "Labour codes cost the top six about ₹5,400 Cr",
      body: "The four labour codes in force since Nov 2025 changed gratuity and leave calculations; TCS (₹2,128 Cr), Infosys (₹1,289 Cr) and the other large firms took one-time charges in Oct-Dec 2025 results.",
      impact: "neg",
      tag: "Costs",
    },
  ],

  overview: {
    headline: "IT services is close to half of India's $315 bn tech industry; engineering R&D and BPM are the next largest (FY26E)",
    narrative: [
      "India's tech industry earns about $315 bn a year (FY26 estimate), most of it exported: services firms build and run software for global clients, engineering firms design products for carmakers and aircraft makers, operations firms run back offices and US healthcare billing, and a small product industry sells its own software.",
      "Around them, more than 2,100 global companies run their own capability centres in India, competing with the services firms for work and people - and buying offices, staffing and training from the same suppliers.",
      "Growth has slowed to low single digits at the largest firms as clients push for AI savings, while GCCs, engineering R&D and healthcare operations keep growing. For investors the question is who earns from the work that AI creates and from where hiring still happens.",
    ],
    chart: {
      title: "India tech industry revenue by segment, FY26 estimate",
      unit: "$ bn",
      source: "Nasscom Annual Strategic Review 2026 (24 Feb 2026)",
      kind: "categories",
      points: [
        { label: "IT services", value: 149 },
        { label: "Engineering R&D", value: 63 },
        { label: "BPM", value: 59 },
        { label: "Software products", value: 23 },
        { label: "Hardware", value: 21 },
      ],
    },
    snapshot: [
      { label: "Net headcount growth, FY26 (Nasscom)", value: "about 2.3%", tone: "neg" },
      { label: "TCS employees, 30 Sep 2026", value: "598,056", tone: "neutral" },
      { label: "TCS deal bookings, Jul-Sep 2026", value: "$9.6 bn", tone: "pos" },
      { label: "GCC revenue, FY24 to FY26 (Nasscom-Zinnov)", value: "$64.6 bn to $98.4 bn", tone: "pos" },
      { label: "Flexible-office stock, early 2026 (Construction World)", value: "over 100 mn sq ft", tone: "pos" },
      { label: "Labour-code one-off, top six firms, Q3 FY26", value: "about ₹5,400 Cr", tone: "neg" },
    ],
  },

  valueChain: [
    { stage: "Services firms", zoneIds: ["tier1", "midtier"], margin: "Billing over Indian delivery cost; scale and offshore mix set margins", moat: "medium", note: "Client relationships and scale win the big deals; AI is cutting the work each deal needs." },
    { stage: "Specialist services", zoneIds: ["data_ai", "infra_services"], margin: "Higher pricing for AI skills; thin margins on hardware-heavy infrastructure", moat: "medium", note: "AI specialists gain from deployment work; infrastructure follows data-centre building." },
    { stage: "Engineering & products", zoneIds: ["erd", "saas_products"], margin: "Highest revenue per employee; licences and subscriptions recur", moat: "high", note: "Domain knowledge and owned software are hard to copy, but tied to clients' R&D and banks' budgets." },
    { stage: "Operations", zoneIds: ["bpm", "healthcare_ops"], margin: "Per-seat or per-transaction pricing; outcome pricing earns more", moat: "medium", note: "Healthcare billing is sticky and growing; seat-based customer service is most exposed to AI." },
    { stage: "GCCs", zoneIds: ["gccs"], margin: "Cost centres; value shows up in parents and suppliers", moat: "low", note: "Mostly unlisted; the demand signal for offices, staffing and training." },
    { stage: "Talent & workspace", zoneIds: ["staffing", "flex_workspace", "skilling"], margin: "Thin staffing spreads; seat rents over lease costs; portal subscriptions", moat: "low", note: "Earns from hiring wherever it happens; first to feel a hiring freeze." },
  ],

  drivers: [
    { title: "AI deployment", metric: "$10-12 bn AI revenue (FY26E)", body: "Nasscom's first AI revenue estimate; TCS put annualised AI revenue above $3.1 bn and Infosys at 10.5% of revenue (Jul-Sep 2026). AI creates deployment work but cuts effort in older contracts." },
    { title: "GCC expansion", metric: "$98.4 bn GCC revenue (FY26)", body: "2,117 GCCs employ about 2.36 million people (Nasscom-Zinnov). Each new centre needs offices, hiring and training, and competes with services firms for work." },
    { title: "Cost-cutting deals", metric: "$5.2 bn Infosys large deals (Q2 FY27)", body: "Clients consolidate vendors and sign long cost-takeout contracts, including mega deals above $1-2 bn - strong bookings even while revenue growth is slow." },
    { title: "Engineering R&D", metric: "$63 bn ER&D revenue (FY26E)", body: "Software-defined vehicles, aircraft programmes and device redesign move engineering to India through ER&D vendors and engineering GCCs." },
  ],
  mix: {
    title: "India tech industry revenue by market, FY26 estimate",
    source: "Nasscom Annual Strategic Review 2026: $246 bn exports of $315 bn total; domestic is the difference",
    slices: [
      { label: "Exports", value: 78.1 },
      { label: "Domestic", value: 21.9 },
    ],
  },

  pestle: {
    political: [
      { point: "US visa policy is the swing factor: the $100,000 H-1B fee was struck down in Jun 2026 but is under appeal.", impact: "neg" },
      { point: "Several states (Karnataka, Gujarat and others) court GCCs with dedicated policies and incentives.", impact: "pos" },
    ],
    economic: [
      { point: "US and European client budgets set demand; discretionary projects are the first cut in a slowdown.", impact: "neg" },
      { point: "A weaker rupee raises rupee revenue and margins on dollar contracts.", impact: "pos" },
    ],
    social: [
      { point: "Net hiring slowed to about 2.3% in FY26, fewer entry-level jobs for graduates.", impact: "neg" },
      { point: "More than 2 million professionals trained in AI in FY26 (Nasscom), widening India's AI talent pool.", impact: "pos" },
    ],
    technological: [
      { point: "AI deployment, data and cloud work is the industry's new growth area ($10-12 bn in FY26).", impact: "pos" },
      { point: "AI coding, testing and agent tools cut the effort - and revenue - in maintenance and BPM contracts.", impact: "neg" },
    ],
    legal: [
      { point: "The labour codes (Nov 2025) raised gratuity and leave costs, a one-off of about ₹5,400 Cr for the top six.", impact: "neg" },
      { point: "India's data-protection rules and client data laws abroad raise compliance work and costs.", impact: "neutral" },
    ],
    environmental: [
      { point: "AI data centres need large power and water (TCS plans up to 1 GW in Hyderabad).", impact: "neutral" },
      { point: "Global clients ask vendors for emissions data and targets in large contracts.", impact: "neutral" },
    ],
  },

  beneficiaries: [
    { key: "tcs", tier: "core", why: "Largest firm with the biggest deal bookings and AI revenue, plus an AI data-centre business." },
    { key: "infy", tier: "core", why: "Strong large-deal wins and rising AI share, though FY27 guidance is low." },
    { key: "hcltech", tier: "core", why: "Bookings up 27% on the year; software products and infrastructure add resilience." },
    { key: "persistent", tier: "direct", why: "Product-engineering specialist that has outgrown the large firms." },
    { key: "coforge", tier: "direct", why: "Insurance and travel specialist scaling up through the Encora purchase." },
    { key: "iks", tier: "direct", why: "High-margin US physician revenue-cycle work, a growing operations niche." },
    { key: "kpit", tier: "direct", why: "Vehicle-software leader in engineering R&D." },
    { key: "fractal", tier: "indirect", why: "Largest listed AI and analytics specialist; gains from deployment work." },
    { key: "smartworks", tier: "indirect", why: "Managed campuses for GCC teams; earns from GCC hiring." },
    { key: "infoEdge", tier: "indirect", why: "Naukri listings rise and fall with tech hiring." },
  ],

  companyNews: [
    { key: "tcs", date: "Oct 2026", development: "Jul-Sep 2026: revenue ₹73,188 Cr, 0.5% constant-currency growth on the quarter, $9.6 bn of deals, annualised AI revenue above $3.1 bn; headcount 598,056.", impact: "Shows the pattern of the industry: strong bookings and AI work, slow revenue growth.", tone: "neutral" },
    { key: "infy", date: "Oct 2026", development: "Cut FY27 constant-currency growth guidance to 1-2% from 1.5-3%, kept 20-22% margin guidance; large deals of $5.2 bn including a mega deal above $2 bn.", impact: "Sets low expectations for the large firms into FY28.", tone: "neg" },
    { key: "hcltech", date: "Oct 2026", development: "Jul-Sep 2026: revenue ₹35,620 Cr, up 11.5% on the year; new bookings about $3.3 bn, up 27%.", impact: "Grew faster than TCS and Infosys this quarter.", tone: "pos" },
    { key: "coforge", date: "Apr 2026", development: "Closed the purchase of Encora (a deal of about $2.35 bn), issuing about 9.4 crore shares to the sellers and taking a $550 mn loan; Encora consolidated from 1 May 2026.", impact: "Makes Coforge a firm of about $2.5 bn in revenue, with acquired and organic growth now mixed.", tone: "neutral" },
    { key: "ltm", date: "Apr 2026", development: "LTIMindtree's name changed to LTM Limited on 17 Apr 2026; the NSE symbol is LTM.", impact: "Name change only; the business and L&T ownership are unchanged.", tone: "neutral" },
    { key: "fractal", date: "Feb 2026", development: "Listed on 16 Feb 2026 after a ₹2,834 Cr IPO priced at ₹900 a share; opened slightly below the issue price.", impact: "First large pure-play AI and analytics listing in India.", tone: "neutral" },
  ],

  risks: [
    { risk: "AI cuts billable effort faster than it creates new work, lowering revenue per contract", mitigant: "Firms are building AI platforms, outcome pricing and deployment practices; AI revenue already $10-12 bn", severity: "high" },
    { risk: "US visa costs or a tax on outsourcing raise delivery costs", mitigant: "H-1B fee struck down in Jun 2026 (under appeal); most work is already offshore", severity: "medium" },
    { risk: "US and European clients freeze discretionary spending", mitigant: "Cost-cutting deals and run-and-maintain work continue; a weaker rupee cushions margins", severity: "medium" },
    { risk: "GCCs take work and people in-house from services firms", mitigant: "Services firms win set-up and specialist work for new GCCs", severity: "medium" },
  ],
  outlook: {
    bull: "AI deployment work grows faster than it cannibalises older contracts, bookings turn into revenue in FY28, the H-1B fee stays struck down and GCC hiring keeps filling offices.",
    base: "The large firms grow at low single digits with steady margins, mid-tier specialists and healthcare operations grow faster, and GCCs keep expanding - offices and staffing follow GCC hiring.",
    bear: "AI deflation deepens, US clients cut budgets and the visa fee returns on appeal - revenue falls at smaller firms and BPM, hiring freezes hit staffing, offices and training.",
  },
  reading: [
    { title: "Nasscom Annual Strategic Review 2026 press release", source: "Nasscom", url: "https://nasscom.in/sites/default/files/media_pdf/Nasscom%20SR%20Press%20release.pdf", year: "2026" },
    { title: "India's GCC story hits its 2030 target four years early", source: "Business Today (Nasscom-Zinnov GCC Landscape FY26)", url: "https://www.businesstoday.in/technology/news/story/the-big-boom-how-indias-gcc-story-hits-2030-target-4-years-early-530265-2026-05-07", year: "2026" },
    { title: "TCS Q2 FY27: net profit ₹13,884 Cr, revenue ₹73,188 Cr", source: "Free Press Journal", url: "https://www.freepressjournal.in/business/tcs-net-profit-up-025-to-13884-crore-in-q2-fy27-revenue-rises-to-73188-crore", year: "2026" },
    { title: "Infosys Q2 revenue edges up but trims full-year outlook", source: "Staffing Industry Analysts", url: "https://www.staffingindustry.com/news/global-daily-news/infosys-q2-revenue-edges-up-but-trims-full-year-revenue-outlook", year: "2026" },
    { title: "Coforge announces the closure of the Encora acquisition", source: "Coforge", url: "https://news.coforge.com/newsroom/press-release/coforge-announces-the-successful-closure-of-the-encora-acquisition", year: "2026" },
    { title: "CIOs get temporary relief as US court blocks $100,000 H-1B fee", source: "CIO", url: "https://www.cio.com/article/4182847/cios-get-temporary-relief-as-us-court-blocks-100000-h-1b-fee.html", year: "2026" },
  ],
};
