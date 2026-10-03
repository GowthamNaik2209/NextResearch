import Link from "next/link";
import { notFound } from "next/navigation";
import {
  companyLinkExposure,
  companyLinkKey,
  getSector,
  listSectorSlugs,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  EXPOSURE_STRENGTH_LABEL,
  type ExposureStrength,
  type ExposureType,
} from "@/lib/sector-content";
import { SiteHeader } from "@/components/SiteHeader";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import { GUIDED_TOUR_ENABLED } from "@/lib/feature-flags";

export function generateStaticParams() {
  return listSectorSlugs().map((slug) => ({ slug }));
}

export default async function SectorOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
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

  // One company can sit in several zones (e.g. a conglomerate's DC arm vs. its
  // unrelated core business) with a different exposure each time — this builds
  // the company -> zones index the "Find companies" section needs, the inverse
  // of the zone -> companies link zones already carry.
  const zonesByCompany = new Map<
    string,
    { zoneId: string; zoneLabel: string; zoneColor: string; exposureType?: ExposureType; exposureStrength?: ExposureStrength }[]
  >();
  for (const zone of sector.zones) {
    for (const link of zone.suppliers) {
      const key = companyLinkKey(link);
      const exposure = companyLinkExposure(link);
      const list = zonesByCompany.get(key) ?? [];
      list.push({ zoneId: zone.id, zoneLabel: zone.label, zoneColor: zone.color, ...exposure });
      zonesByCompany.set(key, list);
    }
  }
  const companies = Object.entries(sector.suppliers);

  // The zone representing final assembly/integration (e.g. ev4w's "oem" zone
  // is Mahindra/Tata Motors) — surfaced as its own section instead of being
  // buried one click inside the 3D explorer like every other component.
  const integratorZone = sector.integratorZoneId
    ? sector.zones.find((z) => z.id === sector.integratorZoneId)
    : undefined;
  const integratorCompanies = (integratorZone?.suppliers ?? []).map((link) => {
    const key = companyLinkKey(link);
    return { key, company: sector.suppliers[key] };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-5 py-14">
        <div>
          <Link href="/" className="text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-accent">
            &larr; All sectors
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-sm font-bold text-accent">
                {sector.icon}
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-ink">{sector.name}</h1>
                <p className="mt-1 text-sm text-ink-soft">{sector.tagline}</p>
              </div>
            </div>
            {sector.dataStatus && (
              <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber">
                {sector.dataStatus === "demo" ? "From publicly available information" : sector.dataStatus}
              </span>
            )}
          </div>
        </div>

        {(sector.thesisSummary || sector.whyNow) && (
          <section className="grid gap-5 sm:grid-cols-2">
            {sector.thesisSummary && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">What this is</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink">{sector.thesisSummary}</p>
              </div>
            )}
            {sector.whyNow && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Why now</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink">{sector.whyNow}</p>
              </div>
            )}
          </section>
        )}

        {sector.featuredSignals && sector.featuredSignals.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">What to watch</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {sector.featuredSignals.map((signal) => (
                <span key={signal} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-xs text-ink-soft">
                  {signal}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Entry choices: the map is the primary path in; companies/bottlenecks stay
            sections on this same page rather than separate modes — a filtered list
            and a bullet list don't need their own route for a slice this size — but
            every other row item below now deep-links into the explorer with the
            right zone/company preselected via ?zone=/&company=. */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel-2 p-5">
          <Link
            href={`/sector/${sector.slug}/explore`}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
          >
            Explore the map &rarr;
          </Link>
          {GUIDED_TOUR_ENABLED && (
            <Link
              href={`/sector/${sector.slug}/explore?tour=1`}
              className="rounded-lg border border-line px-4 py-2.5 text-sm text-ink-soft hover:border-accent hover:text-ink"
            >
              Start guided tour
            </Link>
          )}
          <a href="#companies" className="rounded-lg border border-line px-4 py-2.5 text-sm text-ink-soft hover:border-accent hover:text-ink">
            Find companies
          </a>
          {hasBottlenecks && (
            <a
              href="#bottlenecks"
              className="rounded-lg border border-line px-4 py-2.5 text-sm text-ink-soft hover:border-accent hover:text-ink"
            >
              Explore bottlenecks
            </a>
          )}
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
            {domains.length > 0 ? "Major areas" : "Inside this sector"}
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            {domains.length > 0
              ? "The map groups the anatomy into these areas before you drop into individual components."
              : "The 3D map lets you click into each of these components for supplier and financial detail."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(domains.length > 0 ? domains : sector.zones).map((item) => {
              const zoneId = "title" in item ? firstZoneIdByDomain.get(item.id) : item.id;
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
              return zoneId ? (
                <Link key={item.id} href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(zoneId)}`} className="block">
                  {card}
                </Link>
              ) : (
                <div key={item.id}>{card}</div>
              );
            })}
          </div>

          {integratorZone && integratorCompanies.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-panel-2 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                End manufacturers &amp; integrators
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                The companies that assemble the finished product from everything else in this sector &mdash;{" "}
                {integratorZone.label.toLowerCase()}.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {integratorCompanies.map(({ key, company }) => {
                  const ticker = company.listed ? tickerForSupplier(company) : null;
                  return (
                    <div key={key} className="rounded-xl border border-line bg-panel p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-ink">
                          {company.name}
                          {ticker && <WatchlistButton ticker={ticker} />}
                        </h4>
                        <span
                          className={
                            "flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
                            (company.listed ? "bg-accent/15 text-accent" : "bg-amber/15 text-amber")
                          }
                        >
                          {company.listed ? "Listed" : "Unlisted"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{company.role}</p>
                      <Link
                        href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(integratorZone.id)}&company=${encodeURIComponent(key)}`}
                        className="mt-2 inline-block text-[11px] text-accent hover:underline"
                      >
                        View in the map &rarr;
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {hasBottlenecks && (
          <section id="bottlenecks">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Potential bottlenecks</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {bottlenecks.map((item) => (
                <li key={item.text}>
                  <Link
                    href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(item.zoneId)}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-line bg-panel p-3 text-sm leading-relaxed text-ink hover:border-accent"
                  >
                    <span>{item.text}</span>
                    <span
                      className="flex flex-none items-center gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-wide text-ink-soft"
                      style={{ marginTop: 2 }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.zoneColor }} />
                      {item.zoneLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="companies">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Companies in this sector</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {companies.map(([key, company]) => {
              const zones = zonesByCompany.get(key) ?? [];
              const ticker = company.listed ? tickerForSupplier(company) : null;
              return (
                <div key={key} className="rounded-xl border border-line bg-panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {company.name}
                      {ticker && <WatchlistButton ticker={ticker} />}
                    </h3>
                    <span
                      className={
                        "flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide " +
                        (company.listed ? "bg-accent/15 text-accent" : "bg-amber/15 text-amber")
                      }
                    >
                      {company.listed ? "Listed" : "Unlisted"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{company.role}</p>
                  {zones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {zones.map((z) => (
                        <Link
                          key={z.zoneId}
                          href={`/sector/${sector.slug}/explore?zone=${encodeURIComponent(z.zoneId)}&company=${encodeURIComponent(key)}`}
                          className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-soft hover:border-accent hover:text-ink"
                          title={z.exposureType ? EXPOSURE_TYPE_LABEL[z.exposureType] : undefined}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: z.zoneColor }} />
                          {z.zoneLabel}
                          {z.exposureType && (
                            <span className="text-ink-soft/70">
                              &middot; {EXPOSURE_TYPE_LABEL[z.exposureType]}
                              {z.exposureStrength ? ` (${EXPOSURE_STRENGTH_LABEL[z.exposureStrength]})` : ""}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
