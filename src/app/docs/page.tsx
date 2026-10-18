import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import type { ChartSector } from "@/components/research/SectorCharts";
import { listSectors } from "@/lib/sector-content";
import { buildDeck, type Deck } from "@/lib/sector-content/reports";
import { BENCHMARKS, MARKET_BENCHMARKS, sectorBenchmarks } from "@/lib/sector-content/benchmarks";
import { listIpoDecks } from "@/lib/ipo-content";

export const metadata = {
  title: "Analysis: research reports and stock charts for Indian industries, policies and IPOs",
  description: "Curated 10-slide research reports for every industry and policy NextResearch maps - data centres, EVs, semiconductors, railways, defence, solar, real estate, pharma and more - charts comparing each industry's listed stocks with its index, the Nifty 50 and the Sensex, plus prospectus summaries of upcoming IPOs.",
  alternates: { canonical: "/docs" },
};

const parseCr = (s?: string) => {
  const n = s ? parseFloat(s.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

// Every listed company an industry covers, biggest first (the chart switches on the top few).
function chartSectors(): ChartSector[] {
  return listSectors()
    .filter((s) => !s.muted)
    .map((s) => {
      const seen = new Set<string>();
      const stocks = Object.values(s.suppliers)
        .flatMap((sup) => {
          const t = sup.f?.ticker;
          if (!sup.listed || !t || seen.has(t)) return [];
          seen.add(t);
          return [{ ticker: t, name: sup.name, mcapCr: parseCr(sup.f?.mcap) }];
        })
        .sort((a, b) => (b.mcapCr ?? -1) - (a.mcapCr ?? -1));
      return { slug: s.slug, name: s.name, icon: s.icon, category: s.category ?? "sector", stocks, indices: sectorBenchmarks(s.slug) };
    });
}

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string; view?: string; sector?: string; from?: string }> }) {
  const { report, ipo, view, sector, from } = await searchParams;
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
          sectors={chartSectors()}
          market={MARKET_BENCHMARKS.map((id) => BENCHMARKS[id])}
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
