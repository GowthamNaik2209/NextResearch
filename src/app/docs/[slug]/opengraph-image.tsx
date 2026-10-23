import { getSector, listSectorSlugs, tickerForSupplier } from "@/lib/sector-content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const alt = "Curated research report on NextResearch";
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
  if (!sector) return renderOgCard({ kicker: "Theme", title: "NextResearch" });
  const listed = new Set(Object.values(sector.suppliers).filter((s) => s.listed).map(tickerForSupplier));
  return renderOgCard({
    kicker: "Curated report",
    title: sector.name,
    subtitle: sector.tagline,
    chips: sector.zones.slice(0, 5).map((z) => z.label),
    stats: [
      { label: "Layers", value: String(sector.zones.length) },
      { label: "Listed companies", value: String(listed.size) },
    ],
  });
}
