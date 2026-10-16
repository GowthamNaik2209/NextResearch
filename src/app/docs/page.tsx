import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { listSectors } from "@/lib/sector-content";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";

export const metadata = {
  title: "Reading list: curated research reports on Indian sectors",
  description: "Curated 10-slide research reports and primary sources for every sector NextResearch maps - data centres, EVs, semiconductors, railways, defence, solar, real estate, pharma and more.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const { report } = await searchParams;
  const decks = listSectors()
    .filter((s) => !s.muted)
    .map((s) => buildDeck(s.slug))
    .filter((d): d is Deck => d !== null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Reading list</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Ten-slide industry and policy reports for every sector we cover: investor summary, latest developments,
            industry overview, value chain, PESTLE, the listed beneficiaries and their financials, and links to the
            McKinsey, IEA and government research behind it.
          </p>
        </div>
        <ReadingList decks={decks} initial={report} />
      </main>
      <SiteFooter />
    </>
  );
}
