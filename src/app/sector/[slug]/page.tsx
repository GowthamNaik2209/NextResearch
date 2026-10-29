import Link from "next/link";
import { notFound } from "next/navigation";
import {
  companyLinkKey,
  getSector,
  listSectorSlugs,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  EXPOSURE_STRENGTH_LABEL,
} from "@/lib/sector-content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { OpenReportButton } from "@/components/research/OpenReport";
import { buildDeck } from "@/lib/sector-content/reports";
import { GUIDED_TOUR_ENABLED } from "@/lib/feature-flags";
import { companySlug, sectorCompanies, sectorCompanyCounts } from "@/lib/sector-content/companies";
import { NOT_FOUND_METADATA, SITE_URL, jsonLd, midSentence } from "@/lib/site";
import type { Metadata } from "next";
import { Points } from "@/components/Points";
import { IndustryActions, type HeatStock } from "@/components/charts/IndustryHeatmap";
import { actionClass } from "@/components/charts/action-class";
import { getIndustryBasket } from "@/lib/baskets/industry";
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
  const { listed } = sectorCompanyCounts(sector);
  const title = `${sector.name} stocks in India: supply chain map & ${listed} listed companies`;
  const description = `${sector.tagline}. ${sector.thesisSummary?.join(" ") ?? ""}`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/sector/${slug}` },
    openGraph: { title, description, url: `/sector/${slug}`, type: "article" },
  };
}

export default async function SectorOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();

  const domains = sector.domains ?? [];
  // First zone belonging to each domain, in authored order — what a domain card
  // deep-links into, since a domain itself has no single 3D anchor of its own.
  const firstZoneIdByDomain = new Map<string, string>();
  for (const z of sector.zones) {
    if (z.domainId && !firstZoneIdByDomain.has(z.domainId)) firstZoneIdByDomain.set(z.domainId, z.id);
  }

  // Bottlenecks and key drivers are authored per-zone (the component closest to
  // that specific risk) — this page rolls them up to industry level, deduped by
  // text, keeping the first zone attribution so each one can still link back to
  // where it came from.
  const bottlenecks: { text: string; zoneId: string; zoneLabel: string; zoneColor: string }[] = [];
  const seenBottlenecks = new Set<string>();
  for (const z of sector.zones) {
    for (const text of z.bottlenecks ?? []) {
      if (seenBottlenecks.has(text)) continue;
      seenBottlenecks.add(text);
      bottlenecks.push({ text, zoneId: z.id, zoneLabel: z.label, zoneColor: z.color });
    }
  }
  const hasBottlenecks = bottlenecks.length > 0;

  // One card per company: a company listed under two keys for two roles in this sector (HAL as
  // prime and as MRO shop) is merged, with every layer it sits in as a chip.
  const companies = sectorCompanies(sector);
  const listedCompanies = companies.filter((c) => c.supplier.listed && c.supplier.f?.ticker);

  // The zone representing final assembly/integration (e.g. ev4w's "oem" zone
  // is Mahindra/Tata Motors) — surfaced as its own section instead of being
  // buried one click inside the 3D explorer like every other component.
  const integratorZone = sector.integratorZoneId
    ? sector.zones.find((z) => z.id === sector.integratorZoneId)
    : undefined;
  const integratorCompanies = (integratorZone?.suppliers ?? [])
    .map((link) => {
      const key = companyLinkKey(link);
      return { key, company: sector.suppliers[key] };
    })
    .filter((x, i, all) => x.company && all.findIndex((y) => tickerForSupplier(y.company) === tickerForSupplier(x.company)) === i);

  // The end manufacturers have their own section above, so the full list below skips them
  // (it used to show each of them twice) and points back up instead.
  const integratorTickers = new Set(integratorCompanies.map(({ company }) => tickerForSupplier(company)));
  const otherCompanies = companies.filter((c) => !integratorTickers.has(c.ticker));
  const integratorsShown = companies.length - otherCompanies.length;

  const deck = buildDeck(sector.slug);
  // The heatmap's stocks: the industry basket's, grouped in the map's layer order.
  const zoneOrder = new Map(sector.zones.map((z, i) => [z.label, i]));
  const heatStocks: HeatStock[] = (sector.muted ? [] : (getIndustryBasket(sector.slug)?.stocks ?? []))
    .map((s) => ({ ticker: s.ticker, name: s.name, layer: s.layer, mcapCr: s.mcapCr }))
    .sort((a, b) => (zoneOrder.get(a.layer) ?? 99) - (zoneOrder.get(b.layer) ?? 99) || (b.mcapCr ?? -1) - (a.mcapCr ?? -1));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-5 pt-6 pb-14 sm:gap-12 sm:py-14">
        <div>
          <Link href="/docs" className="tap-target text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent">
            &larr; All deep dives
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:mt-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-xs font-bold text-accent sm:h-11 sm:w-11 sm:text-sm">
                {sector.icon}
              </div>
              <div>
                <h1 className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">{sector.name}</h1>
                <p className="mt-1 text-sm text-ink-soft">{sector.tagline}</p>
              </div>
            </div>
            {sector.dataStatus && (
              <span
                className={
                  sector.dataStatus === "demo"
                    ? "text-[11px] text-ink-soft sm:mt-1"
                    : "rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-ink"
                }
              >
                {sector.dataStatus === "demo" ? "From publicly available information" : sector.dataStatus}
              </span>
            )}
          </div>
        </div>

        {/* Entry choices come first, right under the header — the map is the
            primary path in, so it shouldn't require scrolling past the
            narrative sections to reach. Companies/bottlenecks stay sections on
            this same page rather than separate modes, deep-linking into the
            explorer with the right zone/company preselected via ?zone=/&company=. */}
        <IndustryActions slug={sector.slug} name={sector.name} stocks={heatStocks} basketHref={sector.muted ? null : `/baskets/industry/${sector.slug}`}>
          <Link href={`/sector/${sector.slug}/explore`} className={actionClass(true)}>
            <span className="sm:hidden">3D map</span>
            <span className="hidden sm:inline">Explore the map &rarr;</span>
          </Link>
          {GUIDED_TOUR_ENABLED && (
            <Link href={`/sector/${sector.slug}/explore?tour=1`} className={actionClass(false)}>
              <span className="sm:hidden">Tour</span>
              <span className="hidden sm:inline">Start guided tour</span>
            </Link>
          )}
          {deck && (
            <OpenReportButton slug={deck.slug} className={actionClass(false)}>
              <span className="sm:hidden">Report</span>
              <span className="hidden sm:inline">Read curated report</span>
            </OpenReportButton>
          )}
          <a href="#companies" className={actionClass(false)}>
            <span className="sm:hidden">Companies</span>
            <span className="hidden sm:inline">Find companies</span>
          </a>
          {!sector.muted && (
            <Link href={`/baskets/industry/${sector.slug}`} className={actionClass(false)}>
              <span className="sm:hidden">Basket</span>
              <span className="hidden sm:inline">{sector.category === "policy" ? "Open policy basket" : "Open industry basket"}</span>
            </Link>
          )}
          {hasBottlenecks && (
            <a href="#bottlenecks" className={actionClass(false)}>
              <span className="sm:hidden">Bottlenecks</span>
              <span className="hidden sm:inline">Explore bottlenecks</span>
            </a>
          )}
        </IndustryActions>

        {(!!sector.thesisSummary?.length || !!sector.whyNow?.length) && (
          <section className="grid gap-5 sm:grid-cols-2">
            {!!sector.thesisSummary?.length && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">What this is</h2>
                <Points items={sector.thesisSummary} className="mt-2" />
              </div>
            )}
            {!!sector.whyNow?.length && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Why now</h2>
                <Points items={sector.whyNow} className="mt-2" />
              </div>
            )}
          </section>
        )}

        {sector.featuredSignals && sector.featuredSignals.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">What to watch</h2>
            {/* Plain text, not pills: bordered chips read as buttons, and these aren't links. */}
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink">
              {sector.featuredSignals.map((signal) => (
                <li key={signal} className="flex items-baseline gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 flex-none translate-y-[-1px] rounded-full bg-accent" />
                  {signal}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
            {domains.length > 0 ? "Major areas" : "Inside this theme"}
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            {domains.length > 0
              ? "The map groups the anatomy into these areas before you drop into individual components."
              : "The 3D map lets you click into each of these components for supplier and financial detail."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(domains.length > 0 ? domains : sector.zones).map((item) => {
              const zoneId = "title" in item ? (item.leadZoneId ?? firstZoneIdByDomain.get(item.id)) : item.id;
              const card = (
                <div className="h-full rounded-xl border border-line bg-panel p-4 transition hover:border-accent">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: item.color }} />
                    <h3 className="text-sm font-semibold text-ink">{"title" in item ? item.title : item.label}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    {"description" in item ? item.description : item.desc}
                  </p>
                </div>
              );
              // Every card opens the map, like its neighbours: on its first component when the
              // area has one mapped, else on the whole model.
              const href = zoneId ? `/sector/${sector.slug}/explore?zone=${encodeURIComponent(zoneId)}` : `/sector/${sector.slug}/explore`;
              return (
                <Link key={item.id} href={href} className="block">
                  {card}
                </Link>
              );
            })}
          </div>

          {integratorZone && integratorCompanies.length > 0 && (
            <div id="integrators" className="mt-6 scroll-mt-20 rounded-2xl border border-line bg-panel-2 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                {sector.integratorHeading ?? <>End manufacturers &amp; integrators</>}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                {sector.integratorBlurb ?? (
                  <>
                    The companies that assemble the finished product from everything else in this chain &mdash;{" "}
                    {midSentence(integratorZone.label)}.
                  </>
                )}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {integratorCompanies.map(({ key, company }) => {
                  const ticker = company.listed ? tickerForSupplier(company) : null;
                  return (
                    <OpenStockCard key={key} ticker={tickerForSupplier(company)} supplier={company} className="rounded-xl border border-line bg-panel p-4 transition hover:border-accent">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-ink">
                          {company.name}
                          {ticker && <WatchlistButton ticker={ticker} name={company.name} />}
                        </h4>
                        <span
                          className={
                            "flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
                            (company.listed ? "bg-accent/15 text-accent" : "bg-amber/15 text-amber-ink")
                          }
                        >
                          {company.listed ? "Listed" : "Unlisted"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{company.role}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4">
                        <Link
                          href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(integratorZone.id)}&company=${encodeURIComponent(key)}`}
                          className="tap-y inline-block text-[11px] text-accent hover:underline"
                        >
                          View in the map &rarr;
                        </Link>
                        {ticker && (
                          <Link href={`/company/${companySlug(ticker)}`} className="tap-y inline-block text-[11px] font-semibold text-accent hover:underline">
                            Company page &rarr;
                          </Link>
                        )}
                      </div>
                    </OpenStockCard>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {hasBottlenecks && (
          <section id="bottlenecks" className="scroll-mt-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Potential bottlenecks</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {bottlenecks.map((item) => (
                <li key={item.text}>
                  <Link
                    href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(item.zoneId)}`}
                    className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 rounded-lg border border-line bg-panel p-3 text-sm leading-relaxed text-ink hover:border-accent"
                  >
                    <span>{item.text}</span>
                    {/* flex-wrap on the parent lets this badge drop to its own line instead of
                        forcing horizontal overflow when a long zone label (e.g. "Instrument
                        cluster & interior electronics") can't fit next to the bottleneck text
                        on a narrow screen. The badge text itself also isn't nowrap (some zone
                        labels, e.g. "Railway PSU Ecosystem: Financing, Ticketing & Digital
                        Platforms", are wider than a phone screen on their own) — only the dot+
                        label gap is kept from breaking awkwardly via the dot's own flex-none. */}
                    <span
                      className="flex max-w-full items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-soft"
                      style={{ marginTop: 2 }}
                    >
                      <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: item.zoneColor }} />
                      {item.zoneLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="companies" className="scroll-mt-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Companies in this theme</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {companies.length} companies, {listedCompanies.length} listed.
            {integratorsShown > 0 && (
              <>
                {" "}
                The {integratorsShown} {sector.integratorHeading ? midSentence(sector.integratorHeading) : "end manufacturers & integrators"} are{" "}
                <a href="#integrators" className="text-accent hover:underline">
                  listed above
                </a>
                .
              </>
            )}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {otherCompanies.map(({ key, ticker: cardTicker, supplier: company, roles, zones }) => {
              const ticker = company.listed ? cardTicker : null;
              // A tap anywhere on the card opens the stock pop-up (one action for the whole card);
              // the company page is the separate, labelled link at the bottom.
              return (
                <OpenStockCard key={key} ticker={cardTicker} supplier={company} className="flex flex-col rounded-xl border border-line bg-panel p-4 transition hover:border-accent">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {company.name}
                      {ticker && <WatchlistButton ticker={ticker} name={company.name} />}
                    </h3>
                    <span
                      className={
                        "flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
                        (company.listed ? "bg-accent/15 text-accent" : "bg-amber/15 text-amber-ink")
                      }
                    >
                      {company.listed ? "Listed" : "Unlisted"}
                    </span>
                  </div>
                  {roles.map((role) => (
                    <p key={role} className="mt-1 text-xs leading-relaxed text-ink-soft">
                      {role}
                    </p>
                  ))}
                  {zones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pointer-coarse:gap-y-4">
                      {zones.map((z) => (
                        <Link
                          key={z.zoneId}
                          href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(z.zoneId)}&company=${encodeURIComponent(z.companyKey)}`}
                          className="tap-y flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-soft hover:border-accent hover:text-ink"
                          title={z.exposureType ? EXPOSURE_TYPE_LABEL[z.exposureType] : undefined}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: z.zoneColor }} />
                          {z.zoneLabel}
                          {z.exposureType && (
                            <span>
                              &middot; {EXPOSURE_TYPE_LABEL[z.exposureType]}
                              {z.exposureStrength ? ` (${EXPOSURE_STRENGTH_LABEL[z.exposureStrength]})` : ""}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                  {ticker && (
                    <Link href={`/company/${companySlug(ticker)}`} className="tap-y mt-3 self-start text-[11px] font-semibold text-accent hover:underline">
                      Company page &rarr;
                    </Link>
                  )}
                </OpenStockCard>
              );
            })}
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Analysis", item: `${SITE_URL}/docs` },
                    { "@type": "ListItem", position: 2, name: sector.name, item: `${SITE_URL}/sector/${sector.slug}` },
                  ],
                },
                {
                  "@type": "ItemList",
                  name: `Listed companies in India's ${sector.name} supply chain`,
                  itemListElement: listedCompanies.map((c, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: c.supplier.name,
                    url: `${SITE_URL}/company/${companySlug(c.ticker)}`,
                  })),
                },
              ],
            }),
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
