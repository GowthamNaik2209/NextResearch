import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listSectors } from "@/lib/sector-content";

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
            maps and financials here. <b className="font-semibold text-ink">Coming soon.</b>
          </p>
        </div>
        {/* Muted until the reading list launches: cards are not links (the per-sector pages
            still exist at /docs/[slug] and keep their curated links for when this is switched on). */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
            <div
              key={sector.slug}
              aria-disabled="true"
              className="flex cursor-not-allowed flex-col gap-2 rounded-2xl border border-line bg-panel p-5 opacity-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
                {sector.icon}
              </div>
              <h3 className="font-display text-sm font-semibold text-ink">{sector.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-wide text-accent">Coming soon</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
