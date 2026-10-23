import { getCompanyPage, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { ensureFinancials } from "@/lib/financials/load";
import { croreShort, pct } from "@/lib/format";
import { croreFromLabel } from "@/components/stock/merge";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const alt = "Company supply-chain profile on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  await ensureFinancials();
  return listCompanyPages().map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) return renderOgCard({ kicker: "Company", title: "NextResearch" });
  const f = c.supplier.f;
  const stats = [];
  // Same formatters as the company page, so the share card reads "₹1.69L Cr" like the page.
  const cap = croreFromLabel(f?.mcap);
  if (cap != null) stats.push({ label: "Market cap", value: croreShort(cap) });
  if (f?.kpi?.[3] != null) stats.push({ label: "ROCE", value: pct(f.kpi[3]) });
  stats.push({ label: "Themes", value: String(new Set(c.appearances.map((a) => a.sectorSlug)).size) });
  return renderOgCard({
    kicker: `NSE: ${c.ticker}`,
    title: c.name,
    subtitle: primaryAppearance(c).role,
    chips: [...new Set(c.appearances.map((a) => a.zoneLabel))],
    stats,
  });
}
