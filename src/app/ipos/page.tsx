import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IpoGrid } from "@/components/ipo/IpoGrid";
import { listIpoDecks } from "@/lib/ipo-content";
import { ensureFinancials } from "@/lib/financials/load";

export const metadata: Metadata = {
  title: "Upcoming IPOs in India: prospectus summaries",
  description:
    "Ten-slide summaries of the biggest upcoming Indian IPOs - issue structure, business model, DRHP financials, use of proceeds, shareholding, peer valuation and risk factors.",
  alternates: { canonical: "/ipos" },
  openGraph: {
    title: "Upcoming IPOs in India: prospectus summaries",
    description: "Ten-slide summaries of the biggest upcoming Indian IPOs - issue, business, financials, peers and risks.",
    url: "/ipos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Upcoming IPOs in India: prospectus summaries",
    description: "Ten-slide summaries of the biggest upcoming Indian IPOs - issue, business, financials, peers and risks.",
  },
};

export default async function IposPage({ searchParams }: { searchParams: Promise<{ ipo?: string }> }) {
  await ensureFinancials();
  const { ipo } = await searchParams;
  const ipos = listIpoDecks();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">IPOs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The biggest issues in the pipeline and the latest large listings, each draft or red herring prospectus read for you: how the issue is split
            between fresh capital and an offer for sale, what the business does, its restated financials, where the money goes, who is
            selling, how it prices against listed peers and the risk factors that matter.
          </p>
        </div>
        <IpoGrid ipos={ipos} initial={ipo} />
        <p className="text-xs text-ink-soft">
          Compiled from offer documents filed with SEBI and the exchanges, and from dated public reporting. Price bands, issue sizes and
          dates can change until the final prospectus. Not investment advice.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
