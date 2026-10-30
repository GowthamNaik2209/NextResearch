import { notFound } from "next/navigation";
import { getSector, listSectorSlugs, tickerForSupplier } from "@/lib/sector-content";
import { buildDeck } from "@/lib/sector-content/reports";
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
  // Only where the report page exists (the Nifty 50 has none).
  if (!sector || !buildDeck(slug)) notFound();
  const listed = new Set(Object.values(sector.suppliers).filter((s) => s.listed).map(tickerForSupplier));
  return renderOgCard({
    kicker: "Curated report",
    title: sector.name,
    subtitle: "A 10-slide research report",
    stats: [
      { label: sector.category === "index" ? "Industries" : "Layers", value: String(sector.zones.length) },
      { label: "Listed companies", value: String(listed.size) },
    ],
  });
}
