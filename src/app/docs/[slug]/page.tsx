import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { getResearchForSector } from "@/lib/sector-content/docs";

export function generateStaticParams() {
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function SectorDocsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  const links = getResearchForSector(slug);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-14">
        <div>
          <Link href="/docs" className="text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent">
            &larr; All sectors
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
              {sector.icon}
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">{sector.name}</h1>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Curated research and reporting on {sector.name.toLowerCase()}. <b className="font-semibold text-ink">Coming soon.</b>
          </p>
        </div>

        {links.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">
            No curated links for this sector yet — coming soon.
          </p>
        ) : (
          // Muted until the reading list launches: shown, but not clickable.
          <ul className="flex flex-col gap-3">
            {links.map((link) => (
              <li key={link.url}>
                <div aria-disabled="true" className="flex cursor-not-allowed flex-col gap-1 rounded-xl border border-line bg-panel p-4 opacity-50">
                  <span className="text-sm font-semibold text-ink">{link.title}</span>
                  <span className="text-xs text-ink-soft">{link.source} · coming soon</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
