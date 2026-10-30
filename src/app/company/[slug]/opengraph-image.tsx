import { notFound } from "next/navigation";
import { getCompanyPage, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { getSector } from "@/lib/sector-content";
import { chainThemes, companyWhere } from "@/lib/faq";
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
  if (!c) notFound();
  const f = c.supplier.f;
  const stats = [];
  // Same formatters as the company page, so the share card reads "₹1.69L Cr" like the page.
  const cap = croreFromLabel(f?.mcap);
  if (cap != null) stats.push({ label: "Market cap", value: croreShort(cap) });
  if (f?.kpi?.[3] != null) stats.push({ label: "ROCE", value: pct(f.kpi[3]) });
  const primary = primaryAppearance(c);
  const isIndex = (a: { sectorSlug: string }) => getSector(a.sectorSlug)?.category === "index";
  const themes = chainThemes(c, primary, isIndex).length;
  const where = themes > 1 ? `In ${themes} supply chains` : companyWhere(c, primary, isIndex);
  return renderOgCard({
    kicker: `NSE: ${c.ticker}`,
    title: c.name,
    // Where it sits, not what it does (the role sentence was the card's longest text); a layer name
    // too long for one line falls back to the theme alone.
    subtitle: where.length <= 60 ? where : primary.sectorName,
    stats,
  });
}
