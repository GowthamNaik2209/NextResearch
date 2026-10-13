import Link from "next/link";
import { listSectors, listComingSoonSectors, tickerForSupplier } from "@/lib/sector-content";
import { buildSearchIndex, getPlatformStats } from "@/lib/sector-content/stats";
import { SiteHeader } from "@/components/SiteHeader";
import { SectorBrowser } from "@/components/SectorBrowser";
import { HeroSearch } from "@/components/HeroSearch";
import { IdeasSection } from "@/components/IdeasSection";
import { NewsList } from "@/components/NewsList";
import { DATA_AS_OF, buildIdeas, listNews, sectorNumbers } from "@/lib/sector-content/insights";

const FAQ = [
  {
    q: "Is NextResearch giving buy or sell recommendations?",
    a: "No. We map industries and the companies in them so you can see where the opportunity and the risks sit. Everything here is for information and research only — it is not investment advice, and you should do your own diligence or consult a registered adviser before investing.",
  },
  {
    q: "Where does the data come from?",
    a: "Supply-chain maps and company exposure are authored from publicly available information; company financials and ratios are drawn from public filings and market data pages. Each sector and company shows a data-status label, so you can tell what is verified and what is not.",
  },
  {
    q: "How is this different from a screener?",
    a: "A screener starts from numbers. We start from the industry: which layer of the chain a company actually sits in, how exposed it is, and what its peers in that layer look like. Then we give you the numbers.",
  },
  {
    q: "Do I need an account?",
    a: "You can browse every sector and company without one. An account is only needed to save companies to a watchlist.",
  },
];

export default function HomePage() {
  const all = listSectors();
  // SectorBrowser is a Client Component, so only plain serializable fields cross
  // the boundary — notably not `build`, each sector's three.js geometry function.
  const sectors = all.map((s) => {
    const sups = Object.values(s.suppliers);
    return {
      slug: s.slug,
      icon: s.icon,
      name: s.name,
      tagline: s.tagline,
      category: s.category,
      muted: s.muted,
      zones: s.zones.length,
      companies: new Set(sups.map(tickerForSupplier)).size,
      listed: new Set(sups.filter((x) => x.listed).map(tickerForSupplier)).size,
      ...sectorNumbers(s.slug),
    };
  });
  const comingSoon = listComingSoonSectors();
  const stats = getPlatformStats();
  const index = buildSearchIndex();
  const ideas = buildIdeas();
  const news = listNews().slice(0, 5);
  const featured = all.find((s) => s.slug === "datacenter" && s.thesisSummary) ?? all.find((s) => s.thesisSummary && !s.muted);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Supply-chain research for Indian equities
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Find the companies behind India&rsquo;s next big theme.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
                Pick an industry, see its entire supply chain mapped in 3D, and know exactly which listed companies sit in each layer —
                with their financials, strengths and risks one click away.
              </p>
              <div className="mt-7">
                <HeroSearch index={index} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="#sectors" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
                  Browse industries
                </Link>
                <Link
                  href={`/sector/${featured?.slug ?? "datacenter"}/explore`}
                  className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
                >
                  Try the 3D map &rarr;
                </Link>
              </div>
            </div>

            {/* Product preview: a stylised stack of value-chain layers */}
            <div aria-hidden className="relative">
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-ink">{featured?.name ?? "Industry map"}</span>
                  <span className="text-ink-soft">value chain</span>
                </div>
                {(featured?.zones.slice(0, 5) ?? []).map((z, i) => (
                  <div
                    key={z.id}
                    className="mb-2 flex items-center justify-between rounded-lg border border-line bg-panel-2 px-3.5 py-2.5"
                    style={{ marginLeft: i * 10, marginRight: (4 - i) * 10 }}
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: z.color }} />
                      {z.label}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">{z.suppliers.length} cos</span>
                  </div>
                ))}
                <div className="mt-4 rounded-lg bg-accent/10 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
                  <b className="text-accent">Tap a layer</b> to see who supplies it, how exposed each company is, and compare them side by side.
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip — computed from the content, not hand-typed */}
          <div className="border-t border-line bg-panel">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-4 px-5 py-6 sm:grid-cols-4">
              {[
                [stats.sectors, "industries & policies mapped"],
                [stats.zones, "value-chain layers"],
                [stats.companies, "companies profiled"],
                [stats.listed, "listed on Indian exchanges"],
              ].map(([n, label]) => (
                <div key={label as string}>
                  <dt className="font-display text-3xl font-bold text-ink">{n}</dt>
                  <dd className="text-xs text-ink-soft">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Featured thesis */}
        {featured && (
          <section className="mx-auto max-w-6xl px-5 py-16">
            <div className="grid gap-8 rounded-3xl border border-line bg-panel p-8 lg:grid-cols-[1fr_1.2fr] lg:p-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-accent">Featured thesis</span>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{featured.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{featured.tagline}</p>
                <Link href={`/sector/${featured.slug}`} className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
                  Read the thesis &rarr;
                </Link>
              </div>
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Why now</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{featured.whyNow}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">The investable idea</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{featured.thesisSummary}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sector grid */}
        <section id="sectors" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20">
          <SectorBrowser sectors={sectors} comingSoon={comingSoon} />
        </section>

        {/* Ideas */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <IdeasSection ideas={ideas} asOf={DATA_AS_OF} />
        </section>

        {/* What's new */}
        <section className="border-t border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">What&rsquo;s new</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Results, deals and announcements for the companies in our maps — each linked to its source.
              </p>
              <Link href="/updates" className="mt-5 inline-block text-sm font-semibold text-accent hover:underline">See all updates &rarr;</Link>
            </div>
            <NewsList items={news} />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-line">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">From theme to shortlist in four steps</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Choose a theme", "An industry or a policy — each mapped end to end, from raw inputs to the finished product."],
                ["Explore the chain", "Open the 3D map. Layers, zones and bottlenecks show where value and risk concentrate."],
                ["Compare the players", "See every company in a layer ranked by exposure and segment revenue, not group totals."],
                ["Track what matters", "Save companies to your watchlist and come back as the story develops."],
              ].map(([t, b], i) => (
                <li key={t} className="relative border-t-2 border-accent pt-4">
                  <span className="font-mono text-xs font-bold text-accent">0{i + 1}</span>
                  <h3 className="mt-1 font-display text-base font-semibold text-ink">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What you get per company */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">What you see on every company</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">The checklist most investors run by hand, in one panel.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Financial snapshot", "Five-year revenue and net profit, plus P/E, ROCE, ROE, market cap and 52-week range."],
              ["Strengths & risks", "A written view of what supports the business and what could go wrong, per company."],
              ["Segment exposure", "How directly a company is tied to each layer — direct supplier, enabler, operator — and how strongly."],
              ["Peer comparison", "Line up every company in a layer side by side on the metrics that matter for that segment."],
              ["Bottlenecks & drivers", "Industry-level choke points and demand drivers, each linked back to the layer they come from."],
              ["Reading list", "Curated research from McKinsey, the IEA and trade bodies, to go deeper on any sector."],
            ].map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-line bg-panel p-5">
                <h3 className="font-display text-base font-semibold text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology + FAQ */}
        <section className="border-t border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Straight answers</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                What we cover, where it comes from, and what it is not. Investing involves risk, including loss of capital.
              </p>
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line bg-bg">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                    {f.q}
                    <span className="text-accent transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="rounded-3xl bg-accent px-8 py-12 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-bg">Build your watchlist around a theme, not a tip.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-bg/80">Create an account to save the companies you want to follow across every sector.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="rounded-lg bg-bg px-6 py-2.5 text-sm font-semibold text-ink hover:opacity-90">Create an account</Link>
              <Link href="#sectors" className="rounded-lg border border-bg/40 px-6 py-2.5 text-sm font-semibold text-bg hover:bg-bg/10">Keep browsing</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="font-display text-base font-bold text-ink">NextResearch</span>
              <p className="mt-1 text-xs text-ink-soft">Supply-chain research for India&rsquo;s public markets.</p>
            </div>
            <nav className="flex gap-6 text-sm text-ink-soft">
              <Link href="#sectors" className="hover:text-ink">Industries</Link>
              <Link href="/docs" className="hover:text-ink">Reading list</Link>
              <Link href="/watchlist" className="hover:text-ink">Watchlist</Link>
              <Link href="/login" className="hover:text-ink">Log in</Link>
            </nav>
          </div>
          <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-ink-soft">
            NextResearch provides information for educational and research purposes only. Nothing on this site is investment advice, a recommendation
            or an offer to buy or sell any security. Data is compiled from public sources and may be incomplete or out of date. Investments in
            securities are subject to market risk; do your own research or consult a registered investment adviser before making decisions.
          </p>
        </div>
      </footer>
    </>
  );
}
