import { notFound } from "next/navigation";
import { getSector, listSectorSlugs, tickerForSupplier } from "@/lib/sector-content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const alt = "Sector supply-chain map on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  await ensureFinancials();
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  const listed = new Set(Object.values(sector.suppliers).filter((s) => s.listed).map(tickerForSupplier));
  return renderOgCard({
    kicker: sector.category === "policy" ? "Policy map" : sector.category === "index" ? "Index heatmap" : "Supply-chain map",
    title: sector.name,
    stats: [
      { label: sector.category === "index" ? "Industries" : "Layers", value: String(sector.zones.length) },
      { label: "Listed companies", value: String(listed.size) },
    ],
  });
}
