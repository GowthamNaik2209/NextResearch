import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingList } from "@/components/research/ReadingList";
import { analysisProps, analysisView } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";
import { themeNames } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  await ensureFinancials();
  return {
    title: "Analysis: deep dives, research reports and stock charts for Indian industries, policies and IPOs",
    description: `Every industry and policy NextResearch maps - ${themeNames(10)} - as a deep dive into its supply chain and listed companies, a curated 10-slide research report, and a chart backtesting its listed stocks as a basket against the Nifty 50, plus prospectus summaries of upcoming IPOs.`,
    alternates: { canonical: "/docs" },
  };
}

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ report?: string; ipo?: string; view?: string; sector?: string }> }) {
  await ensureFinancials();
  const { report, ipo, view, sector } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Analysis</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every industry and policy we cover, two ways. Deep dive maps its supply chain: the layers, who supplies them and
            which companies are listed. Reports are ten-slide summaries for investors: latest developments, value chain, PESTLE,
            the listed beneficiaries and their financials, and the research behind it. Each industry&rsquo;s Charts button shows the
            price chart of any of its listed stocks, picked by layer; Baskets backtests them together against the Nifty 50. The IPOs tab summarises the
            prospectus of each big upcoming issue.
          </p>
        </div>
        <ReadingList
          {...analysisProps({ report, ipo, view })}
          initial={report}
          initialIpo={ipo}
          initialView={analysisView(view)}
          initialSector={sector}
          initialCharts={view === "charts"}
        />
      </main>
      <SiteFooter />
    </>
  );
}
