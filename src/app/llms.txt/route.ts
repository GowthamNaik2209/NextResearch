import { listSectors } from "@/lib/sector-content";
import { listCompanyPages, primaryAppearance, sectorCompanyCounts } from "@/lib/sector-content/companies";
import { buildDeck } from "@/lib/sector-content/reports";
import { dataAsOf } from "@/lib/sector-content/insights";
import { ensureFinancials } from "@/lib/financials/load";
import { companyWhere, sentence } from "@/lib/faq";
import { ideaCatalog } from "@/lib/baskets/ideas";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain-text map of the site for AI assistants and answer engines - what
// NextResearch is, every industry, policy and company page with one line each, and how fresh the
// figures are. Built from the same content as the sitemap, so it never drifts from the pages.
export const revalidate = 900;

const GROUPS = [
  { category: "index", heading: "Market indices" },
  { category: "sector", heading: "Industries (supply-chain maps)" },
  { category: "policy", heading: "Government policies (supply-chain maps)" },
] as const;

export async function GET() {
  await ensureFinancials();
  const sectors = listSectors().filter((s) => !s.muted);
  const companies = listCompanyPages().sort((a, b) => a.name.localeCompare(b.name));
  const indices = sectors.filter((s) => s.category === "index");
  const themes = sectors.length - indices.length;
  const out: string[] = [
    `# ${SITE_NAME}`,
    "",
    // The description opens with the tagline's own words; joined, they would say it twice.
    `> ${SITE_TAGLINE}: ${SITE_DESCRIPTION.replace(/^Thematic research on India in one place: /, "")}`,
    "",
    `Coverage: ${themes} industries and policies${indices.length ? `, plus the ${indices.map((s) => s.name).join(" and ")}` : ""}; ${companies.length} NSE-listed companies, each placed in the supply-chain layer(s) it serves. Company figures (market cap, price, P/E, ROCE, ROE, five years of revenue and profit) are one snapshot as of ${dataAsOf()}, refreshed after each trading day. For information only, not investment advice.`,
  ];
  for (const g of GROUPS) {
    const list = sectors.filter((s) => (s.category ?? "sector") === g.category);
    if (!list.length) continue;
    out.push("", `## ${g.heading}`, "");
    for (const s of list) out.push(`- [${s.name}](${SITE_URL}/sector/${s.slug}): ${s.tagline}. ${sectorCompanyCounts(s).listed} listed companies across ${s.zones.length} ${g.category === "index" ? "industries" : "layers"}.`);
  }
  const reports = sectors.filter((s) => buildDeck(s.slug));
  if (reports.length) {
    out.push("", "## Research reports", "");
    for (const s of reports) out.push(`- [${s.name}: research report](${SITE_URL}/docs/${s.slug}): a 10-slide report with its primary sources.`);
  }
  out.push("", "## Stock baskets", "");
  out.push(`- [Build a basket](${SITE_URL}/baskets): mix stocks from any covered industry or policy, backtested against the Nifty 50, with Bear, Base and Bull projections.`);
  for (const s of sectors)
    out.push(
      s.category === "index"
        ? `- [${s.name} basket](${SITE_URL}/baskets/industry/${s.slug}): today's ${s.name} stocks as one basket, held over the period and compared with the index itself.`
        : `- [${s.name} basket](${SITE_URL}/baskets/industry/${s.slug}): all ${sectorCompanyCounts(s).listed} listed ${s.name} stocks as one basket, backtested against the Nifty 50.`,
    );
  out.push("", "## Rule-based baskets (re-ranked daily)", "");
  for (const i of ideaCatalog()) out.push(`- [${i.title}](${SITE_URL}/baskets/ideas/${i.id}): ${sentence(i.blurb)}`);
  out.push(
    "",
    "## Methods and guides",
    "",
    `- [How basket projections are worked out](${SITE_URL}/baskets/projections): Bear, Base and Bull 1- and 2-year ranges from a market-implied return (RBI repo rate plus beta times India's equity risk premium) and each stock's volatility, with out-of-sample checks.`,
    `- [Trend and P/E in context](${SITE_URL}/baskets/signals): a stock's past-year return ranked among covered stocks, and today's P/E against its own history and its industry's median.`,
    `- [Technical indicators guide](${SITE_URL}/signals/indicators): what each indicator in the signal backtest (moving averages, RSI, MACD and others) measures, how it is worked out and where it misleads.`,
  );
  out.push("", "## Companies", "");
  for (const c of companies) {
    const p = primaryAppearance(c);
    const where = companyWhere(c, p, (a) => indices.some((s) => s.slug === a.sectorSlug));
    out.push(`- [${c.name} (NSE: ${c.ticker})](${SITE_URL}/company/${c.slug}): ${where}. ${where.startsWith("In ") ? `In ${p.sectorName}: ` : ""}${sentence(p.role)}`);
  }
  out.push(
    "",
    "## Optional",
    "",
    `- [Analysis: every industry, policy and IPO deep dive, report and basket chart](${SITE_URL}/docs)`,
    `- [All companies A-Z](${SITE_URL}/companies)`,
    `- [Companies in several supply chains](${SITE_URL}/connections)`,
    `- [Stock baskets, backtested against the Nifty 50](${SITE_URL}/baskets)`,
    `- [Upcoming IPO prospectus summaries](${SITE_URL}/ipos)`,
    `- [Industry and company news](${SITE_URL}/updates)`,
    `- [FII and DII flows](${SITE_URL}/updates?view=flows): daily foreign and domestic institutional cash flows, FII index-futures positioning, sector flows, quarterly stake changes and bulk and block deals.`,
    `- [Signal backtests](${SITE_URL}/signals) (free account, tablet or computer): test a technical rule on any covered stock or a saved basket, save it and get an email when it fires.`,
    "",
  );
  return new Response(out.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
