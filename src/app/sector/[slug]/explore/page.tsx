import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { SectorExplorer } from "@/components/sector-explorer/SectorExplorer";
import { getCurrentUser } from "@/lib/auth";

export function generateStaticParams() {
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function SectorExplorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only the slug crosses the server/client boundary — the sector object itself
  // (which carries three.js geometry-building functions) is looked up again inside
  // the client component, since functions can't be passed as React Server props.
  if (!getSector(slug)) notFound();

  const user = await getCurrentUser();
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;

  return (
    <div className="flex h-screen flex-col">
      {/* SectorExplorer reads ?zone=/&company=/&tour= via useSearchParams for deep
          linking and the guided tour — Next requires a Suspense boundary around any
          client component that does, even one rendered from a static page like this. */}
      <Suspense fallback={null}>
        <SectorExplorer slug={slug} userEmail={user?.email ?? null} displayName={displayName} />
      </Suspense>
    </div>
  );
}
