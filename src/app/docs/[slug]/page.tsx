import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BackLink } from "@/components/BackLink";
import { OpenReportButton } from "@/components/research/OpenReport";
import { getSector, listSectorSlugs } from "@/lib/sector-content";
import { getResearchForSector } from "@/lib/sector-content/docs";
import { buildDeck } from "@/lib/sector-content/reports";
import { NOT_FOUND_METADATA, SITE_URL, midSentence, shareMeta } from "@/lib/site";
import { ensureFinancials } from "@/lib/financials/load";
import { JsonLd, breadcrumbLd, webPageLd } from "@/components/JsonLd";

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
    ...shareMeta({ title: `${sector.name}: research report`, line: "A 10-slide report, with its sources.", path: `/docs/${slug}`, type: "article", image: null }),
  };
}

export default async function SectorDocsPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  const deck = buildDeck(slug);
  // An index without a deck (the Nifty 50) has no report page; its reading list is on its overview.
  if (!deck && sector.category === "index") notFound();
  // The deck's own reading list first, then any hub links it does not already include.
  const seen = new Set(deck?.report.reading.map((l) => l.url));
  const links = [...(deck?.report.reading ?? []), ...getResearchForSector(slug).filter((l) => !seen.has(l.url))];
  const isPolicy = sector.category === "policy";

  return (
    <>
      <SiteHeader />
      {/* The site-wide 6xl container keeps the left edge in line with the header; the reading column stays narrow. */}
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-5 pt-6 pb-14 sm:py-14 [&>*]:max-w-3xl">
        <div>
          <BackLink scope="docs" href="/docs" label="All reports" className="tap-target text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent" />
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
              Read curated report
            </OpenReportButton>
          </section>
        )}

        {/* The report in brief, as text: the slides open in a viewer, so without this the page's HTML
            held only the title and links, with nothing for search engines or AI assistants to read. */}
        {deck && (
          <section aria-labelledby="brief-h" className="flex flex-col gap-4">
            <h2 id="brief-h" className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              The report in brief
            </h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {deck.report.keyStats.map((k) => (
                <div key={k.label} className="rounded-xl border border-line bg-panel p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{k.label}</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-ink">{k.value}</dd>
                  {k.sub && <dd className="mt-0.5 text-[11px] text-ink-soft">{k.sub}</dd>}
                </div>
              ))}
            </dl>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-ink">
              {deck.report.thesis.map((t) => (
                <li key={t.title}>
                  <h3 className="inline font-semibold">{t.title}.</h3> <span className="text-ink-soft">{t.body}</span>
                </li>
              ))}
            </ol>
            <details className="group rounded-xl border border-line bg-panel px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                Drivers, risks and outlook
                <span aria-hidden className="text-lg leading-none font-semibold text-accent transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-3 flex flex-col gap-4 text-sm leading-relaxed">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Growth drivers</h3>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {deck.report.drivers.map((d) => (
                      <li key={d.title}>
                        <span className="font-semibold text-ink">{d.title}</span> <span className="font-mono text-xs text-accent">{d.metric}</span>
                        <span className="block text-ink-soft">{d.body}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Risks</h3>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {deck.report.risks.map((r) => (
                      <li key={r.risk}>
                        <span className="font-semibold text-ink">{r.risk}</span>
                        <span className="block text-ink-soft">Mitigant: {r.mitigant}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Outlook</h3>
                  <dl className="mt-1.5 grid gap-x-3 gap-y-1 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <dt className="font-semibold text-pos">Bull</dt>
                    <dd className="text-ink-soft">{deck.report.outlook.bull}</dd>
                    <dt className="font-semibold text-ink">Base</dt>
                    <dd className="text-ink-soft">{deck.report.outlook.base}</dd>
                    <dt className="font-semibold text-danger">Bear</dt>
                    <dd className="text-ink-soft">{deck.report.outlook.bear}</dd>
                  </dl>
                </div>
              </div>
            </details>
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
        <JsonLd
          graph={[
            breadcrumbLd([
              ["Analysis", "/docs"],
              [`${sector.name}: research report`, `/docs/${slug}`],
            ]),
            deck
              ? {
                  "@type": "Report",
                  headline: deck.report.title,
                  alternativeHeadline: deck.report.subtitle,
                  abstract: deck.report.thesis.map((t) => `${t.title}. ${t.body}`).join(" "),
                  url: `${SITE_URL}/docs/${slug}`,
                  about: { "@type": "Thing", name: sector.name, url: `${SITE_URL}/sector/${slug}` },
                  inLanguage: "en-IN",
                  author: { "@id": `${SITE_URL}/#org` },
                  publisher: { "@id": `${SITE_URL}/#org` },
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                  citation: links.map((l) => ({ "@type": "CreativeWork", name: l.title, url: l.url, publisher: { "@type": "Organization", name: l.source } })),
                }
              : webPageLd({ path: `/docs/${slug}`, name: `${sector.name}: further reading` }),
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
