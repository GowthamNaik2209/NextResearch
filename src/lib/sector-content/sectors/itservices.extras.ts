// IT Services & GCCs: what-if scenarios and the curated reading list.
// Wired into ../scenarios.ts (SCENARIOS.itservices) and ../docs.ts (SECTOR_DOCS.itservices).
import type { Scenario, ScenarioImpact } from "../scenarios";
import type { ResearchLink } from "../docs";

const S = (zone: string, severity: 1 | 2 | 3, why: string, effect?: "headwind" | "tailwind"): ScenarioImpact => ({ zone, severity, why, effect });

export const ITSERVICES_SCENARIOS: Scenario[] = [
  {
    id: "ai-shrinks-the-work",
    title: "AI shrinks the billable work",
    blurb: "Clients use AI to cut the people each contract needs and ask for the savings back",
    story:
      "In Feb 2026 Indian IT shares sold off hard on fears that new AI coding and agent tools would replace services work, and by Oct 2026 Infosys had cut its FY27 growth guidance to 1-2% while TCS grew 0.5% in the quarter. If AI keeps lowering the effort needed for coding, testing, support and back-office processes faster than it creates new projects, revenue per contract falls at renewal even when firms keep the client. Firms that sell outcomes and their own platforms hold up best; testing, maintenance and seat-based BPM work shrink first, and fewer entry-level hires hit staffing and training firms. Data and AI specialists gain work building and running the new systems.",
    effect: "headwind",
    impacts: [
      S("tier1", 2, "Renewals priced lower as clients pass on AI savings; deal volumes stay but value per deal falls"),
      S("midtier", 2, "Testing and maintenance, a large share of smaller firms' work, are the easiest to automate"),
      S("bpm", 3, "Voice, chat and document work is where AI agents replace seats fastest"),
      S("healthcare_ops", 2, "AI coding and scribing tools cut billable effort per claim"),
      S("data_ai", 2, "Clients need data platforms and AI engineering to deploy the tools", "tailwind"),
      S("staffing", 2, "Fewer entry-level and contract hires at services firms"),
      S("skilling", 1, "Retraining budgets rise even as fresher hiring falls", "tailwind"),
    ],
    stocks: [
      { key: "fractal", severity: 2, effect: "tailwind", why: "Pure-play AI and analytics firm that builds the systems" },
      { key: "fsl", severity: 2, why: "Large voice and collections book exposed to AI agents" },
      { key: "infy", severity: 1, why: "Guidance already cut to 1-2% for FY27" },
    ],
  },
  {
    id: "us-offshoring-curbs",
    title: "US raises the cost of offshoring",
    blurb: "The $100,000 H-1B fee is revived on appeal, or Congress taxes outsourcing",
    story:
      "A US federal court in Boston struck down the $100,000 fee on new H-1B petitions on 8 Jun 2026, and an appeals court refused to pause that ruling in July; the administration is appealing. If a higher court revives the fee, or a tax on payments for offshore services becomes law, Indian firms pay more to send people onshore and US clients face higher costs on Indian contracts. Firms would hire more locally in the US and push even more work offshore, which helps Indian delivery centres, GCCs and offices, while margins at the services firms take the hit.",
    effect: "headwind",
    impacts: [
      S("tier1", 3, "Higher onshore costs and possible tax on offshore payments squeeze margins"),
      S("midtier", 2, "Smaller firms rely more on visas for onshore staff"),
      S("erd", 1, "Some engineering work needs on-site staff at client plants"),
      S("gccs", 2, "Global companies move more work into their own India centres", "tailwind"),
      S("flex_workspace", 1, "More offshore hiring lifts India seat demand", "tailwind"),
      S("staffing", 1, "US hiring shifts to local staff; Indian hiring holds"),
    ],
    stocks: [
      { key: "smartworks", severity: 1, effect: "tailwind", why: "GCC-heavy managed campuses gain from offshore hiring" },
    ],
  },
  {
    id: "gcc-boom-continues",
    title: "The GCC boom keeps running",
    blurb: "Hundreds more global companies open or expand India centres each year",
    story:
      "India had 2,117 GCCs with about 2.36 million people and $98.4 bn of revenue in FY26, up from $64.6 bn in FY24 (Nasscom-Zinnov, May 2026), and GCCs took nearly 40% of new flexible-office seats in recent quarters. If growth continues at this pace, demand for Grade A offices, managed campuses, specialist staffing and AI retraining keeps rising, and Naukri's job listings follow. Services firms gain set-up and specialist work for new centres but lose some long-running contracts as parents bring work in-house.",
    effect: "tailwind",
    impacts: [
      S("gccs", 3, "New centres and larger mandates for existing ones"),
      S("flex_workspace", 3, "GCCs are the largest buyers of managed-office seats"),
      S("staffing", 2, "Specialist hiring for new centres"),
      S("skilling", 1, "AI and cloud retraining for GCC staff"),
      S("erd", 1, "Engineering GCCs compete with ER&D vendors but also hire them to start up", "headwind"),
      S("tier1", 1, "Some run-and-maintain work moves in-house to clients' GCCs", "headwind"),
    ],
    stocks: [
      { key: "smartworks", severity: 2, why: "Large campuses built for GCC teams" },
      { key: "indiqube", severity: 2, why: "Bengaluru-heavy managed offices for GCCs and tech firms" },
      { key: "infoEdge", severity: 1, why: "Naukri listings rise with GCC hiring" },
    ],
  },
  {
    id: "us-spending-slowdown",
    title: "US clients cut technology budgets",
    blurb: "A US slowdown makes banks, retailers and tech companies freeze discretionary projects",
    story:
      "Most of India's $246 bn of FY26 tech exports (Nasscom estimate) is earned from US and European clients. If a US slowdown makes banks, retailers and tech companies freeze new projects, discretionary work stops first while cost-cutting deals continue - so large firms with big run-and-maintain books hold up better than mid-tier firms, engineering R&D vendors and analytics specialists. A weaker rupee would soften the hit to margins. Hiring freezes would follow, hitting staffing, offices and training.",
    effect: "headwind",
    impacts: [
      S("midtier", 3, "Discretionary digital projects are the first to be paused"),
      S("erd", 2, "Carmakers and tech companies cut R&D budgets"),
      S("data_ai", 2, "Analytics projects at consumer and tech clients deferred"),
      S("tier1", 2, "Slower growth, partly offset by cost-cutting deals and a weaker rupee"),
      S("saas_products", 1, "Banks delay new software purchases"),
      S("staffing", 2, "Hiring freezes at services firms"),
      S("flex_workspace", 1, "Expansion plans paused; occupancy dips"),
    ],
  },
];

export const ITSERVICES_DOCS: ResearchLink[] = [
  { title: "Nasscom Annual Strategic Review 2026 - India's tech industry at $315 bn in FY26", source: "Nasscom (24 Feb 2026)", url: "https://nasscom.in/sites/default/files/media_pdf/Nasscom%20SR%20Press%20release.pdf" },
  { title: "India's GCC story hits its 2030 target four years early (Nasscom-Zinnov GCC Landscape FY26)", source: "Business Today (7 May 2026)", url: "https://www.businesstoday.in/technology/news/story/the-big-boom-how-indias-gcc-story-hits-2030-target-4-years-early-530265-2026-05-07" },
  { title: "CIOs get temporary relief as US court blocks $100,000 H-1B fee", source: "CIO (9 Jun 2026)", url: "https://www.cio.com/article/4182847/cios-get-temporary-relief-as-us-court-blocks-100000-h-1b-fee.html" },
  { title: "Infosys Q2 revenue edges up but trims full-year revenue outlook", source: "Staffing Industry Analysts (Oct 2026)", url: "https://www.staffingindustry.com/news/global-daily-news/infosys-q2-revenue-edges-up-but-trims-full-year-revenue-outlook" },
];
