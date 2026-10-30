import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { SectorExplorer } from "@/components/sector-explorer/SectorExplorer";
import { getCurrentUser } from "@/lib/auth";
import { NOT_FOUND_METADATA, midSentence, shareMeta } from "@/lib/site";
import { ensureFinancials, financialsFor } from "@/lib/financials/load";

export async function generateStaticParams() {
  await ensureFinancials();
  return listSectorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await ensureFinancials();
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return NOT_FOUND_METADATA;
  if (sector.stage === "heatmap")
    return {
      title: `${sector.name} — interactive stock heatmap by industry`,
      description: `Every ${sector.name} stock as a heatmap, grouped by NSE industry, with what-if scenarios and each company's financials.`,
      alternates: { canonical: `/sector/${slug}` },
      ...shareMeta({ title: `${sector.name}: stock heatmap`, line: "Every stock by industry, with what-ifs.", path: `/sector/${slug}`, image: `/sector/${slug}/opengraph-image` }),
    };
  return {
    title: `${sector.name} — interactive 3D supply-chain explorer`,
    description: `Walk through India's ${midSentence(sector.name)} supply chain layer by layer in 3D and open any listed company's financials.`,
    // The overview page is the indexable version of this content; the explorer is a WebGL canvas.
    alternates: { canonical: `/sector/${slug}` },
    ...shareMeta({ title: `${sector.name}: 3D supply chain`, line: "Walk the chain layer by layer.", path: `/sector/${slug}`, image: `/sector/${slug}/opengraph-image` }),
  };
}

export default async function SectorExplorePage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  // Only the slug and the figures cross the server/client boundary — the sector object itself
  // (which carries three.js geometry-building functions) is looked up again inside
  // the client component, since functions can't be passed as React Server props. The figures
  // (from the database) fill its suppliers there.
  const sector = getSector(slug);
  if (!sector) notFound();
  const figures = await financialsFor(Object.values(sector.suppliers).flatMap((s) => (s.f ? [s.f.ticker] : [])));

  const user = await getCurrentUser();
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;

  // dvh, not vh: on phones 100vh is the viewport *without* the browser's address bar, so the page was
  // taller than the screen and scrolled a little, dragging the top bar around. Fixed + overflow-hidden
  // keeps the explorer pinned to the visible screen; it scrolls its own panels.
  return (
    <div className="fixed inset-x-0 top-0 flex h-dvh flex-col overflow-hidden">
      {/* SectorExplorer reads ?zone=/&company=/&tour= via useSearchParams for deep
          linking and the guided tour — Next requires a Suspense boundary around any
          client component that does, even one rendered from a static page like this. */}
      <Suspense fallback={<ExplorerLoading heatmap={sector.stage === "heatmap"} />}>
        <SectorExplorer slug={slug} figures={figures} userEmail={user?.email ?? null} displayName={displayName} />
      </Suspense>
    </div>
  );
}

// Shown until the explorer's script has loaded (useSearchParams makes it render on the client
// only, so the server sends just this). On a phone that can take a while; a blank screen read
// as broken.
function ExplorerLoading({ heatmap }: { heatmap: boolean }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center gap-2 bg-bg text-sm text-ink-soft">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
      {heatmap ? "Loading the heatmap…" : "Loading the 3D explorer…"}
    </div>
  );
}
