import { getCompanyPage, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "Company supply-chain profile on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listCompanyPages().map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) return renderOgCard({ kicker: "Company", title: "NextResearch" });
  const f = c.supplier.f;
  const stats = [];
  if (f?.mcap) stats.push({ label: "Market cap", value: f.mcap.replace("Rs ", "₹") });
  if (f?.kpi?.[3] != null) stats.push({ label: "ROCE", value: `${f.kpi[3]}%` });
  stats.push({ label: "Sectors", value: String(new Set(c.appearances.map((a) => a.sectorSlug)).size) });
  return renderOgCard({
    kicker: `NSE: ${c.ticker}`,
    title: c.name,
    subtitle: primaryAppearance(c).role,
    chips: [...new Set(c.appearances.map((a) => a.zoneLabel))],
    stats,
  });
}
