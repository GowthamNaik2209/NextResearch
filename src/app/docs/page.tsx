import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { getCurrentUser } from "@/lib/auth";
import { analysisProps, analysisView } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";

export const metadata = {
  title: "Analysis: deep dives, research reports and stock charts for Indian industries, policies and IPOs",
  description: "Every industry and policy NextResearch maps - data centres, EVs, chips and phones, electronic components, rare-earth magnets, railways, defence procurement, solar, real estate, pharma and more - as a deep dive into its supply chain and listed companies, a curated 10-slide research report, and a chart backtesting its listed stocks as a basket against the Nifty 50, plus prospectus summaries of upcoming IPOs.",
  alternates: { canonical: "/docs" },
};

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string; view?: string; sector?: string }> }) {
  await ensureFinancials();
  const { report, ipo, view, sector } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Analysis</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every industry and policy we cover, three ways. Deep dive maps its supply chain: the layers, who supplies them and
            which companies are listed. Reports are ten-slide summaries for investors: latest developments, value chain, PESTLE,
            the listed beneficiaries and their financials, and the research behind it. Charts backtest the industry&rsquo;s listed
            stocks as a basket against the Nifty 50, which you can customise into your own. The IPOs tab summarises the
            prospectus of each big upcoming issue.
          </p>
        </div>
        <ReadingList
          {...analysisProps()}
          signedIn={!!user}
          initial={report}
          initialIpo={ipo}
          initialView={analysisView(view)}
          initialSector={sector}
        />
      </main>
      <SiteFooter />
    </>
  );
}
