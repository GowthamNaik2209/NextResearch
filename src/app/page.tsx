import { listSectors } from "@/lib/sector-content";
import { buildIdeas, dataAsOfRange } from "@/lib/sector-content/insights";
import { buildHeroThemeRows, buildSearchIndex, getPlatformStats } from "@/lib/sector-content/stats";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { analysisProps, analysisView } from "@/lib/analysis-props";
import { IdeasSection } from "@/components/IdeasSection";
import { Hero } from "@/components/landing/Hero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { FeaturedThesis } from "@/components/landing/FeaturedThesis";
import { UpdatesSection } from "@/components/landing/UpdatesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CompanyFeatures } from "@/components/landing/CompanyFeatures";
import { FaqSection } from "@/components/landing/FaqSection";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { ensureFinancials } from "@/lib/financials/load";
import { MarketPulse } from "@/components/landing/MarketPulse";
import { getMarketFigures, getMarketStocks, marketTiles } from "@/lib/landing/market-data";

// Landing page: a thin composition of section components (src/components/landing/). All the
// numbers on it come from the sector content via src/lib/sector-content/{stats,insights}.ts.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string; view?: string; sector?: string }> }) {
  await ensureFinancials();
  const { report, ipo, view, sector } = await searchParams;
  const sectors = listSectors();
  // The sector previewed in the hero and featured below: Data Center if it has a thesis,
  // otherwise the first live sector that does.
  const featured = sectors.find((s) => s.slug === "datacenter" && s.thesisSummary?.length) ?? sectors.find((s) => s.thesisSummary?.length && !s.muted);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line">
          <Hero featured={featured} searchIndex={buildSearchIndex()} themeRows={buildHeroThemeRows(featured?.slug)} />
          <StatsStrip stats={getPlatformStats()} />
        </section>

        {/* The market by industry: the tiles render now, the figures stream in (promises, read in the browser with use()). */}
        <MarketPulse tiles={marketTiles()} figures={getMarketFigures()} stocks={getMarketStocks()} />

        {featured && <FeaturedThesis sector={featured} />}

        {/* The Analysis block, the same one as /docs (Deep dive, Reports, the Charts pop-up). It keeps the old
            Themes section's #themes anchor, so the hero's buttons and shared links still land here. */}
        <section id="themes" aria-labelledby="analysis-heading" className="mx-auto flex max-w-page scroll-mt-20 flex-col gap-6 px-5 pb-20">
          {/* Old shared links point at #sectors. */}
          <span id="sectors" aria-hidden className="block scroll-mt-20" />
          <div>
            <h2 id="analysis-heading" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Analysis
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Every covered industry and policy: its supply chain, a ten-slide report and its stocks&rsquo; charts.
            </p>
          </div>
          <ReadingList {...analysisProps({ report, ipo, view })} initial={report} initialIpo={ipo} initialView={analysisView(view)} initialSector={sector} initialCharts={view === "charts"} />
        </section>

        <section className="mx-auto max-w-page px-5 pb-20">
          <IdeasSection ideas={buildIdeas()} asOf={dataAsOfRange()} />
        </section>

        <UpdatesSection />
        <HowItWorks />
        <CompanyFeatures />
        <FaqSection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
