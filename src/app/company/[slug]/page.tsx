import Link from "next/link";
import { ScrollX } from "@/components/ScrollX";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WatchlistButton } from "@/components/sector-explorer/WatchlistButton";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { getCompanyPage, listCompanyPages, primaryAppearance, type CompanyPage } from "@/lib/sector-content/companies";
import { getSector } from "@/lib/sector-content";
import { NOT_FOUND_METADATA, SITE_URL, jsonLd, shareMeta } from "@/lib/site";
import { FaqSection } from "@/components/FaqSection";
import { companyFaq, companyWhere, faqJsonLd } from "@/lib/faq";
import { isoDay } from "@/lib/financials/rows";
import { dataAsOf } from "@/lib/sector-content/insights";
import { ensureFinancials } from "@/lib/financials/load";
import { FISCAL_YEARS } from "@/lib/financials/rows";
import { croreShort, inr, pct } from "@/lib/format";
import { fmtPrice, fmtYield, mergeStats } from "@/components/stock/merge";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

// One indexable, server-rendered page per listed company: where it sits in each sector's
// supply chain, who it sits next to, and the seed financials. The live numbers stay in the
// stock pop-up (opened from here); this page is the crawlable summary that links into it.

const FY_LABELS = FISCAL_YEARS.map((y) => `FY${String(y).slice(-2)}`);
// Table cells: Indian grouping with the typographic minus for a loss year.
const crCell = (v: number | null | undefined) => (v != null && v < 0 ? `−${inr(-v)}` : inr(v));
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
// An index (the Nifty 50) is membership, not a place in a supply chain: shown in its own section.
const inIndex = (a: { sectorSlug: string }) => getSector(a.sectorSlug)?.category === "index";

export async function generateStaticParams() {
  await ensureFinancials();
  return listCompanyPages().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await ensureFinancials();
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) return NOT_FOUND_METADATA;
  const chains = c.appearances.filter((a) => !inIndex(a));
  const sectors = [...new Set(chains.map((a) => a.sectorName))];
  const layers = [...new Set(chains.map((a) => a.zoneLabel))];
  const indices = c.appearances.filter(inIndex);
  const title = chains.length ? `${c.name} (${c.ticker}): supply chain role, peers & financials` : `${c.name} (${c.ticker}): ${indices[0].sectorName} stock, peers & financials`;
  const description = (
    chains.length
      ? `Where ${c.name} sits in India's ${listJoin(sectors)} supply chain${sectors.length > 1 ? "s" : ""} - ${layers.slice(0, 3).join(", ")}. ${primaryAppearance(c).role}. Peers, revenue and profit trend.`
      : `${c.name} in the ${indices[0].sectorName}, under ${indices[0].zoneLabel}. ${primaryAppearance(c).role}. Peers, revenue and profit trend.`
  ).slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/company/${slug}` },
    ...shareMeta({
      title: `${c.name} (${c.ticker})`,
      line: companyWhere(c, primaryAppearance(c), inIndex),
      path: `/company/${slug}`,
      type: "article",
      image: null,
    }),
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const c = getCompanyPage(slug);
  if (!c) notFound();
  const { supplier } = c;
  const appearances = c.appearances.filter((a) => !inIndex(a));
  const indexAppearances = c.appearances.filter(inIndex);
  const f = supplier.f;
  // The same snapshot figures, through the same reader, as the stock pop-up (mergeStats).
  const s0 = mergeStats(f, null);
  const sectorNames = [...new Set(appearances.map((a) => a.sectorName))];
  const allThemes = [...new Set(c.appearances.map((a) => a.sectorName))];
  const multiSector = sectorNames.length > 1;
  // The supplier record (role, strengths, risks) is the one from the company's strongest link
  // (companies.ts), and multi-sector companies get a line naming every sector they appear in.
  const primary = primaryAppearance(c);
  const asOf = f?.asOf ?? supplier.sourceDate ?? dataAsOf();

  const stats = [
    { label: "Market cap", value: s0.marketCapCr != null ? croreShort(s0.marketCapCr) : undefined },
    { label: "Price", value: s0.snapshotPrice != null ? fmtPrice(s0.snapshotPrice) : undefined },
    { label: "P/E", value: s0.pe != null ? `${s0.pe.toFixed(1)}x` : undefined },
    { label: "ROCE", value: s0.roce != null ? pct(s0.roce) : undefined },
    { label: "ROE", value: s0.roe != null ? pct(s0.roe) : undefined },
    { label: "Dividend yield", value: s0.divYield != null ? fmtYield(s0.divYield) : undefined },
  ].filter((s): s is { label: string; value: string } => !!s.value);

  const faqs = companyFaq(c, primary, { asOf, stats }, inIndex);
  const rev = f?.rev ?? [];
  const np = f?.np ?? [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-5 pt-6 pb-14 sm:py-14 lg:max-w-page">
        <div>
          {/* Every company page: "Companies / <its primary theme>" (multi-theme companies used to
              drop the theme, so pages differed). */}
          <nav className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <Link href="/companies" className="tap-y hover:text-accent">
              Companies
            </Link>{" "}
            /{" "}
            <Link href={`/sector/${primary.sectorSlug}`} className="tap-y hover:text-accent">
              {primary.sectorName}
            </Link>
          </nav>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">
                {c.name} <span className="font-mono text-lg font-semibold text-ink-soft">{c.ticker}</span>
                {/* A space, not a margin, so the pill lines up with the name when it wraps on a phone. */}{" "}
                <span className="inline-flex align-middle">
                  <WatchlistButton ticker={c.ticker} name={c.name} variant="pill" />
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                {multiSector ? `${primary.sectorName}: ${primary.role}` : primary.role}
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
                Mapped in {allThemes.length} theme{allThemes.length > 1 ? "s" : ""}: {listJoin(allThemes)}.
              </p>
            </div>
            {supplier.dataStatus && (
              <span
                className={
                  supplier.dataStatus === "demo"
                    ? "text-[11px] text-ink-soft sm:mt-1"
                    : "rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-ink"
                }
              >
                {supplier.dataStatus === "demo" ? "From publicly available information" : supplier.dataStatus}
              </span>
            )}
          </div>
        </div>

        {/* From desktop width: the story on the left, the numbers and the live card in a side
            column that stays in view. Phones keep one column, numbers first. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <aside className="flex flex-col gap-10 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:gap-4 lg:self-start">
            {stats.length > 0 && (
              <section>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-2">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-line bg-panel p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">{s.label}</p>
                      <p className="mt-1 whitespace-nowrap font-mono text-base font-semibold text-ink sm:text-lg">{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* These are the seed snapshot, not live - say so, since the live card one click below will differ. */}
                <p className="mt-2 text-xs text-ink-soft">
                  Company snapshot as of {asOf}: the same figures in the live card, baskets and watchlist. The live card updates only the price
                  and chart.
                </p>
              </section>
            )}

            <OpenStockCard
              ticker={c.ticker}
              supplier={supplier}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel-2 p-5 transition hover:border-accent lg:flex-col lg:items-stretch"
            >
              <div>
                <p className="text-sm font-semibold text-ink">Live price, chart and full financials</p>
                <p className="mt-1 text-xs text-ink-soft">Opens the company card with the live price, chart, news and statements.</p>
              </div>
              <span className="flex-none rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-bg">Open &rarr;</span>
            </OpenStockCard>
          </aside>

          <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1">
            {appearances.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold text-ink">Where {c.name} sits in the supply chain</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {c.name} appears in {appearances.length} supply-chain layer{appearances.length > 1 ? "s" : ""}{" "}
                  {multiSector ? `across ${sectorNames.length} themes: ${listJoin(sectorNames)}` : `in one theme, ${sectorNames[0]}`}.
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {appearances.map((a) => (
                    <AppearanceCard key={`${a.sectorSlug}:${a.zoneId}`} a={a} showRole={a.role !== primary.role || multiSector} peersLabel="Other companies in this layer" linkLabel="View in the 3D map" />
                  ))}
                </div>
              </section>
            )}

            {indexAppearances.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold text-ink">Index membership</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {c.name} is in the {listJoin(indexAppearances.map((a) => `${a.sectorName} (NSE industry: ${a.zoneLabel})`))}.
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {indexAppearances.map((a) => (
                    <AppearanceCard key={`${a.sectorSlug}:${a.zoneId}`} a={a} showRole={false} peersLabel={`Other ${a.sectorName} stocks in this industry`} linkLabel="View on the heatmap" index />
                  ))}
                </div>
              </section>
            )}

            {rev.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold text-ink">Revenue and profit</h2>
                {/* Every year on a phone too: the years scroll sideways in the box (opening on the latest)
                    while the row names stay put. */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                  <ScrollX fade="from-bg" startAtEnd heldWidth="left-[6.75rem] sm:left-0">
                  <table className="w-full text-sm">
                    <thead className="bg-panel-2 text-[10px] uppercase tracking-widest text-ink-soft">
                      <tr>
                        <th className="sticky left-0 z-[1] w-[6.75rem] min-w-[6.75rem] bg-panel-2 px-3 py-2 text-left after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line sm:static sm:after:hidden sm:w-auto sm:min-w-0 sm:px-4">₹ Cr</th>
                        {FY_LABELS.map((y) => (
                          <th key={y} className="whitespace-nowrap px-3 py-2 text-right sm:px-4">
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
                          <td className="sticky left-0 z-[1] whitespace-nowrap bg-bg px-3 py-2 font-sans text-ink-soft after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line sm:static sm:after:hidden sm:px-4">{row.label}</td>
                          {FY_LABELS.map((y, i) => (
                            <td key={y} className="whitespace-nowrap px-3 py-2 text-right text-ink sm:px-4">
                              {crCell(row.vals[i])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </ScrollX>
                </div>
                {rev[rev.length - 1] != null && (
                  <p className="mt-2 text-xs text-ink-soft">
                    Latest-year revenue {croreShort(rev[rev.length - 1])} ({FY_LABELS[FY_LABELS.length - 1]}, company-wide).
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

            <FaqSection faqs={faqs} headingClassName="font-display text-xl font-bold text-ink" />
          </div>
        </div>

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
                  "@type": "WebPage",
                  url: `${SITE_URL}/company/${slug}`,
                  name: `${c.name} (${c.ticker})`,
                  ...(isoDay(asOf) ? { dateModified: isoDay(asOf) } : {}),
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                },
                ...(faqs.length ? [faqJsonLd(faqs)] : []),
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Companies", item: `${SITE_URL}/companies` },
                    { "@type": "ListItem", position: 2, name: primary.sectorName, item: `${SITE_URL}/sector/${primary.sectorSlug}` },
                    { "@type": "ListItem", position: 3, name: c.name, item: `${SITE_URL}/company/${slug}` },
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

// One place a company appears: a supply-chain layer (with its exposure) or an index's industry (without).
function AppearanceCard({ a, showRole, peersLabel, linkLabel, index = false }: { a: CompanyPage["appearances"][number]; showRole: boolean; peersLabel: string; linkLabel: string; index?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          <Link href={`/sector/${a.sectorSlug}`} className="tap-y hover:text-accent hover:underline">
            {a.sectorName}
          </Link>{" "}
          <span className="text-ink-soft">&rsaquo; {a.zoneLabel}</span>
        </h3>
        {a.exposure && !index && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">{a.exposure}</span>
        )}
      </div>
      {showRole && <p className="mt-2 text-sm text-ink-soft">{a.role}</p>}
      {a.peers.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">{peersLabel}</p>
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
        {linkLabel} &rarr;
      </Link>
    </div>
  );
}
