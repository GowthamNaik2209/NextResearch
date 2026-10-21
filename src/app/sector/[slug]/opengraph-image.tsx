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
  if (!sector) return renderOgCard({ kicker: "Sector", title: "NextResearch" });
  const listed = new Set(Object.values(sector.suppliers).filter((s) => s.listed).map(tickerForSupplier));
  return renderOgCard({
    kicker: sector.category === "policy" ? "Policy map" : "Supply-chain map",
    title: sector.name,
    subtitle: sector.tagline,
    // The value-chain areas when the sector has them (they cover the whole story, e.g. both the chips
    // and the phones of Semicon 2.0 + MPMS); otherwise its first systems.
    chips: (sector.domains?.length ? sector.domains.map((d) => d.title) : sector.zones.map((z) => z.label)).slice(0, 5),
    stats: [
      { label: "Layers", value: String(sector.zones.length) },
      { label: "Listed companies", value: String(listed.size) },
    ],
  });
}
