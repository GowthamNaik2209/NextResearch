import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { listSectors } from "@/lib/sector-content";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { listIpoDecks } from "@/lib/ipo-content";

export const metadata = {
  title: "Reading list: research reports on Indian industries, policies and IPOs",
  description: "Curated 10-slide research reports and primary sources for every industry and policy NextResearch maps - data centres, EVs, semiconductors, railways, defence, solar, real estate, pharma and more - plus prospectus summaries of upcoming IPOs.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string }> }) {
  const { report, ipo } = await searchParams;
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
            Ten-slide industry and policy reports for every industry and policy we cover: investor summary, latest developments,
            industry overview, value chain, PESTLE, the listed beneficiaries and their financials, and links to the
            McKinsey, IEA and government research behind it. The IPOs tab summarises the prospectus of each big upcoming
            issue the same way.
          </p>
        </div>
        <ReadingList decks={decks} ipos={listIpoDecks()} initial={report} initialIpo={ipo} />
      </main>
      <SiteFooter />
    </>
  );
}
