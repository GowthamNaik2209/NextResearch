import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OpenReportButton } from "@/components/research/OpenReport";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { getResearchForSector } from "@/lib/sector-content/docs";
import { buildDeck } from "@/lib/sector-content/reports";
import { NOT_FOUND_METADATA, midSentence } from "@/lib/site";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export async function generateStaticParams() {
  await ensureFinancials();
  return listSectorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await ensureFinancials();
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) return NOT_FOUND_METADATA;
  const deck = buildDeck(slug);
  const title = `${deck?.report.title ?? sector.name} — research report`;
  return {
    title,
    description: `Curated research on ${midSentence(sector.name)} in India: a 10-slide report plus the primary sources behind it. ${sector.tagline}.`,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: { title, url: `/docs/${slug}`, type: "article" },
  };
}

export default async function SectorDocsPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
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
      {/* The site-wide 6xl container keeps the left edge in line with the header; the reading column stays narrow. */}
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-5 py-14 [&>*]:max-w-3xl">
        <div>
          <Link href="/docs" className="tap-target text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent">
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
          <p className="mt-2 text-sm text-ink-soft">{deck ? deck.report.subtitle : `Curated research and reporting on ${midSentence(sector.name)}.`}</p>
        </div>

        {deck && (
          <section className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-panel p-5 sm:flex-row sm:items-center">
            {/* Stacked on phones: side by side, the button squeezed the summary into a ~90px column. */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{isPolicy ? "Policy report" : "Industry report"} · {deck.report.asOf}</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{deck.report.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{deck.report.stance.line}</p>
            </div>
            <OpenReportButton slug={deck.slug} className="flex-none whitespace-nowrap rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
              Read curated report &rarr;
            </OpenReportButton>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">Further reading</h2>
          {links.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel p-4 text-sm text-ink-soft">No curated links for this theme yet.</p>
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
