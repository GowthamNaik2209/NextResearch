import { getSector, listSectorSlugs, tickerForSupplier } from "@/lib/sector-content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "Sector supply-chain map on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return renderOgCard({ kicker: "Sector", title: "NextResearch" });
  const listed = new Set(Object.values(sector.suppliers).filter((s) => s.listed).map(tickerForSupplier));
  return renderOgCard({
    kicker: sector.category === "policy" ? "Policy map" : "Supply-chain map",
    title: sector.name,
    subtitle: sector.tagline,
    chips: sector.zones.slice(0, 5).map((z) => z.label),
    stats: [
      { label: "Layers", value: String(sector.zones.length) },
      { label: "Listed companies", value: String(listed.size) },
    ],
  });
}
