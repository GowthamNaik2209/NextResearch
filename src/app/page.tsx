import { listSectors, listComingSoonSectors } from "@/lib/sector-content";
import { buildHeroThemeRows, buildSearchIndex, buildSectorCards, getPlatformStats } from "@/lib/sector-content/stats";
import { buildIdeas, dataAsOfRange } from "@/lib/sector-content/insights";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectorBrowser } from "@/components/SectorBrowser";
import { listIpoDecks } from "@/lib/ipo-content";
import { IdeasSection } from "@/components/IdeasSection";
import { Hero } from "@/components/landing/Hero";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { FeaturedThesis } from "@/components/landing/FeaturedThesis";
import { UpdatesSection } from "@/components/landing/UpdatesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CompanyFeatures } from "@/components/landing/CompanyFeatures";
import { FaqSection } from "@/components/landing/FaqSection";
import { ClosingCta } from "@/components/landing/ClosingCta";

// Landing page: a thin composition of section components (src/components/landing/). All the
// numbers on it come from the sector content via src/lib/sector-content/{stats,insights}.ts.
export default function HomePage() {
  const sectors = listSectors();
  // The sector previewed in the hero and featured below: Data Center if it has a thesis,
  // otherwise the first live sector that does.
  const featured = sectors.find((s) => s.slug === "datacenter" && s.thesisSummary) ?? sectors.find((s) => s.thesisSummary && !s.muted);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line">
          <Hero featured={featured} searchIndex={buildSearchIndex()} themeRows={buildHeroThemeRows(featured?.slug)} />
          <StatsStrip stats={getPlatformStats()} />
        </section>

        {featured && <FeaturedThesis sector={featured} />}

        <section id="themes" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20">
          {/* Old shared links point at #sectors. */}
          <span id="sectors" aria-hidden className="block scroll-mt-20" />
          <SectorBrowser sectors={buildSectorCards()} comingSoon={listComingSoonSectors()} ipos={listIpoDecks()} />
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
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
