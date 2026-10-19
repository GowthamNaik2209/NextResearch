import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { getCurrentUser } from "@/lib/auth";
import { listIndustryBaskets } from "@/lib/baskets/industry";
import { listSectors } from "@/lib/sector-content";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { BENCHMARKS, MARKET_BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { listIpoDecks } from "@/lib/ipo-content";

export const metadata = {
  title: "Analysis: research reports and stock charts for Indian industries, policies and IPOs",
  description: "Curated 10-slide research reports for every industry and policy NextResearch maps - data centres, EVs, semiconductors, railways, defence, solar, real estate, pharma and more - charts comparing each industry's listed stocks with its index, the Nifty 50 and the Sensex, plus prospectus summaries of upcoming IPOs.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string; view?: string; sector?: string; from?: string }> }) {
  const { report, ipo, view, sector, from } = await searchParams;
  const user = await getCurrentUser();
  // The Charts view is each industry's basket page (same component), so it gets the baskets.
  const baskets = listIndustryBaskets();
  const decks = listSectors()
    .filter((s) => !s.muted)
    .map((s) => buildDeck(s.slug))
    .filter((d): d is Deck => d !== null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Analysis</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Ten-slide reports for every industry and policy we cover: investor summary, latest developments, value chain,
            PESTLE, the listed beneficiaries and their financials, and the McKinsey, IEA and government research behind it.
            Charts lets you compare any of an industry&rsquo;s listed stocks with its own index, the Nifty 50 and the Sensex. The IPOs
            tab summarises the prospectus of each big upcoming issue.
          </p>
        </div>
        <ReadingList
          decks={decks}
          ipos={listIpoDecks()}
          baskets={baskets.map(({ slug, name, tagline, category, stocks, indices }) => ({ slug, name, tagline, category, stocks, indices }))}
          industries={baskets.map(({ slug, name, icon }) => ({ slug, name, icon }))}
          market={MARKET_BENCHMARKS.map((id) => BENCHMARKS[id])}
          signedIn={!!user}
          initial={report}
          initialIpo={ipo}
          initialView={view === "charts" ? "charts" : "reports"}
          initialSector={sector}
          fromThemes={from === "themes"}
        />
      </main>
      <SiteFooter />
    </>
  );
}
