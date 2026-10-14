import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OpenReportButton } from "@/components/research/OpenReport";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { getResearchForSector } from "@/lib/sector-content/docs";
import { buildDeck } from "@/lib/sector-content/reports";

export function generateStaticParams() {
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function SectorDocsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  const deck = buildDeck(slug);
  // The deck's own reading list first, then any hub links it does not already include.
  const seen = new Set(deck?.report.reading.map((l) => l.url));
  const links = [...(deck?.report.reading ?? []), ...getResearchForSector(slug).filter((l) => !seen.has(l.url))];
  const isPolicy = sector.category === "policy";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-14">
        <div>
          <Link href="/docs" className="text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent">
            &larr; All reports
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
              {sector.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{sector.name}</p>
              <h1 className="font-display text-2xl font-bold text-ink">{deck?.report.title ?? sector.name}</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{deck ? deck.report.subtitle : `Curated research and reporting on ${sector.name.toLowerCase()}.`}</p>
        </div>

        {deck && (
          <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{isPolicy ? "Policy report" : "Industry report"} · {deck.report.asOf}</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{deck.report.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{deck.report.stance.line}</p>
            </div>
            <OpenReportButton deck={deck} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
              Open the 10-slide report &rarr;
            </OpenReportButton>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">Further reading</h2>
          {links.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">No curated links for this sector yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1 rounded-xl border border-line bg-panel p-4 transition hover:border-accent"
                  >
                    <span className="text-sm font-semibold text-ink">{link.title}</span>
                    <span className="text-xs text-ink-soft">{link.source} &#8599;</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
