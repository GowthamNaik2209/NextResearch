import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { getCompanyPage, listCompanyPages, primaryAppearance } from "@/lib/sector-content/companies";
import { NOT_FOUND_METADATA, SITE_URL, jsonLd } from "@/lib/site";
import { dataAsOf } from "@/lib/sector-content/insights";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

// One indexable, server-rendered page per listed company: where it sits in each sector's
// supply chain, who it sits next to, and the seed financials. The live numbers stay in the
// stock pop-up (opened from here); this page is the crawlable summary that links into it.

const FISCAL_YEARS = ["FY22", "FY23", "FY24", "FY25", "FY26"];
const inr = (v: number) => `₹${v.toLocaleString("en-IN")} Cr`;
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
// Phones show the latest three years so the table never needs a sideways swipe.
const PHONE_YEARS = 3;

export async function generateStaticParams() {
  await ensureFinancials();
  return listCompanyPages().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await ensureFinancials();
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) return NOT_FOUND_METADATA;
  const sectors = [...new Set(c.appearances.map((a) => a.sectorName))];
  const layers = [...new Set(c.appearances.map((a) => a.zoneLabel))];
  const title = `${c.name} (${c.ticker}): supply chain role, peers & financials`;
  const description = `Where ${c.name} sits in India's ${listJoin(sectors)} supply chain${sectors.length > 1 ? "s" : ""} - ${layers
    .slice(0, 3)
    .join(", ")}. ${primaryAppearance(c).role}. Peers, revenue and profit trend.`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/company/${slug}` },
    openGraph: { title, description, url: `/company/${slug}`, type: "article" },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) notFound();
  const { supplier, appearances } = c;
  const f = supplier.f;
  const kpi = f?.kpi ?? [];
  const sectorNames = [...new Set(appearances.map((a) => a.sectorName))];
  const multiSector = sectorNames.length > 1;
  // The supplier record (role, strengths, risks) is the one from the company's strongest link
  // (companies.ts), and multi-sector companies get a line naming every sector they appear in.
  const primary = primaryAppearance(c);
  const asOf = f?.asOf ?? supplier.sourceDate ?? dataAsOf();

  const stats = [
    { label: "Market cap", value: f?.mcap?.replace("Rs ", "₹") },
    { label: "Price", value: f?.price?.replace("Rs ", "₹") },
    { label: "P/E", value: kpi[0] != null ? `${kpi[0]}x` : undefined },
    { label: "ROCE", value: kpi[3] != null ? `${kpi[3]}%` : undefined },
    { label: "ROE", value: kpi[4] != null ? `${kpi[4]}%` : undefined },
    { label: "Dividend yield", value: kpi[2] != null ? `${kpi[2]}%` : undefined },
  ].filter((s): s is { label: string; value: string } => !!s.value);

  const rev = f?.rev ?? [];
  const np = f?.np ?? [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-5 py-14">
        <div>
          <nav className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <Link href="/companies" className="tap-y hover:text-accent">
              Companies
            </Link>{" "}
            {!multiSector && (
              <>
                /{" "}
                <Link href={`/sector/${appearances[0].sectorSlug}`} className="tap-y hover:text-accent">
                  {appearances[0].sectorName}
                </Link>
              </>
            )}
          </nav>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">
                {c.name} <span className="font-mono text-lg font-semibold text-ink-soft">{c.ticker}</span>
                <WatchlistButton ticker={c.ticker} name={c.name} />
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {multiSector ? `${primary.sectorName}: ${primary.role}` : primary.role}
              </p>
              {multiSector && (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  Mapped in {sectorNames.length} themes: {listJoin(sectorNames)}.
                </p>
              )}
            </div>
            {supplier.dataStatus && (
              <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-ink">
                {supplier.dataStatus === "demo" ? "From publicly available information" : supplier.dataStatus}
              </span>
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-line bg-panel p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">{s.label}</p>
                  <p className="mt-1 whitespace-nowrap font-mono text-base font-semibold text-ink sm:text-lg">{s.value}</p>
                </div>
              ))}
            </div>
            {/* These are the seed snapshot, not live - say so, since the live card one click below will differ. */}
            <p className="mt-2 text-xs text-ink-soft">
              Snapshot as of {asOf}. Open the live card below for current figures.
            </p>
          </section>
        )}

        <OpenStockCard
          ticker={c.ticker}
          supplier={supplier}
          className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel-2 p-5 transition hover:border-accent"
        >
          <div>
            <p className="text-sm font-semibold text-ink">Live price, chart and full financials</p>
            <p className="mt-1 text-xs text-ink-soft">Opens the company card with current market data and statements.</p>
          </div>
          <span className="flex-none rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">Open &rarr;</span>
        </OpenStockCard>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">Where {c.name} sits in the supply chain</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {c.name} appears in {appearances.length} supply-chain layer{appearances.length > 1 ? "s" : ""}{" "}
            {multiSector ? `across ${sectorNames.length} themes: ${listJoin(sectorNames)}` : `in one theme, ${sectorNames[0]}`}.
          </p>
          <div className="mt-5 flex flex-col gap-4">
            {appearances.map((a) => (
              <div key={`${a.sectorSlug}:${a.zoneId}`} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    <Link href={`/sector/${a.sectorSlug}`} className="tap-y hover:text-accent hover:underline">
                      {a.sectorName}
                    </Link>{" "}
                    <span className="text-ink-soft">&rsaquo; {a.zoneLabel}</span>
                  </h3>
                  {a.exposure && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {a.exposure}
                    </span>
                  )}
                </div>
                {(a.role !== primary.role || multiSector) && <p className="mt-2 text-sm text-ink-soft">{a.role}</p>}
                {a.peers.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Other companies in this layer</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 pointer-coarse:gap-y-4">
                      {a.peers.map((p) =>
                        p.slug ? (
                          <Link
                            key={p.name}
                            href={`/company/${p.slug}`}
                            className="tap-y rounded-full border border-line px-2.5 py-0.5 text-xs text-ink hover:border-accent hover:text-accent"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <span key={p.name} className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-ink-soft">
                            {p.name} (unlisted)
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
                <Link
                  href={`/sector/${a.sectorSlug}/explore?zone=${encodeURIComponent(a.zoneId)}&company=${encodeURIComponent(a.companyKey)}`}
                  className="tap-y mt-4 inline-block text-xs font-semibold text-accent hover:underline pointer-coarse:mt-5"
                >
                  View in the 3D map &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>

        {rev.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-ink">Revenue and profit</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-[10px] uppercase tracking-widest text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 text-left sm:px-4">₹ Cr</th>
                    {FISCAL_YEARS.map((y, i) => (
                      <th key={y} className={"px-3 py-2 text-right sm:px-4 " + (i < FISCAL_YEARS.length - PHONE_YEARS ? "hidden sm:table-cell" : "")}>
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {[
                    { label: "Revenue", vals: rev },
                    { label: "Net profit", vals: np },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-line">
                      <td className="px-3 py-2 font-sans text-ink-soft sm:px-4">{row.label}</td>
                      {FISCAL_YEARS.map((y, i) => (
                        <td key={y} className={"px-3 py-2 text-right text-ink sm:px-4 " + (i < FISCAL_YEARS.length - PHONE_YEARS ? "hidden sm:table-cell" : "")}>
                          {row.vals[i] != null ? row.vals[i]!.toLocaleString("en-IN") : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rev[rev.length - 1] != null && (
              <p className="mt-2 text-xs text-ink-soft">
                Latest-year revenue {inr(rev[rev.length - 1]!)} ({FISCAL_YEARS[FISCAL_YEARS.length - 1]}, company-wide).
                <span className="sm:hidden"> Wider screens show FY22 onwards.</span>
              </p>
            )}
          </section>
        )}

        {((supplier.strengths?.length ?? 0) > 0 || (supplier.risks?.length ?? 0) > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {supplier.strengths && supplier.strengths.length > 0 && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-pos">Strengths{multiSector ? ` · in ${primary.sectorName}` : ""}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink">
                  {supplier.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {supplier.risks && supplier.risks.length > 0 && (
              <div className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-danger">Risks{multiSector ? ` · in ${primary.sectorName}` : ""}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink">
                  {supplier.risks.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Corporation",
                  name: c.name,
                  tickerSymbol: c.ticker,
                  description: primary.role,
                  url: `${SITE_URL}/company/${slug}`,
                },
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Companies", item: `${SITE_URL}/companies` },
                    ...(multiSector
                      ? []
                      : [{ "@type": "ListItem", position: 2, name: appearances[0].sectorName, item: `${SITE_URL}/sector/${appearances[0].sectorSlug}` }]),
                    { "@type": "ListItem", position: multiSector ? 2 : 3, name: c.name, item: `${SITE_URL}/company/${slug}` },
                  ],
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
