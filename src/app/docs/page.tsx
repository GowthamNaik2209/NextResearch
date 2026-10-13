import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { listSectors } from "@/lib/sector-content";
import { getResearchForSector } from "@/lib/sector-content/docs";

export default function DocsPage() {
  const sectors = listSectors().filter((s) => !s.muted);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Docs &amp; research</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Curated reading from first-class sources — McKinsey, the IEA, trade bodies and other
            industry research — organized by sector, for anyone who wants to go deeper than the
            maps and financials here.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => {
            const count = getResearchForSector(sector.slug).length;
            return (
              <Link
                key={sector.slug}
                href={`/docs/${sector.slug}`}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
                  {sector.icon}
                </div>
                <h3 className="font-display text-sm font-semibold text-ink">{sector.name}</h3>
                <p className="text-xs text-ink-soft">
                  {count} {count === 1 ? "link" : "links"}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
