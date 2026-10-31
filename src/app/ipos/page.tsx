import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IpoGrid } from "@/components/ipo/IpoGrid";
import { getIpoDeck, ipoCards } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";
import { shareMeta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Upcoming IPOs in India: prospectus summaries",
  description:
    "Ten-slide summaries of the biggest upcoming Indian IPOs - issue structure, business model, DRHP financials, use of proceeds, shareholding, peer valuation and risk factors.",
  alternates: { canonical: "/ipos" },
  ...shareMeta({ title: "Upcoming IPOs in India", line: "Each prospectus in ten slides.", path: "/ipos", image: null }),
};

export default async function IposPage({ searchParams }: { searchParams: Promise<{ ipo?: string }> }) {
  await ensureFinancials();
  const { ipo } = await searchParams;
  // Cards only; a deck loads when opened, except the one a ?ipo= link opens (see analysis-props.ts).
  const ipos = ipoCards();
  const initialDeck = ipo ? (getIpoDeck(ipo) ?? undefined) : undefined;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-5 pt-6 pb-14 sm:py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">IPOs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The biggest issues in the pipeline and the latest large listings, each draft or red herring prospectus read for you: how the issue is split
            between fresh capital and an offer for sale, what the business does, its restated financials, where the money goes, who is
            selling, how it prices against listed peers and the risk factors that matter.
          </p>
        </div>
        <IpoGrid ipos={ipos} initial={ipo} initialDeck={initialDeck} />
        <p className="text-xs text-ink-soft">
          Compiled from offer documents filed with SEBI and the exchanges, and from dated public reporting. Price bands, issue sizes and
          dates can change until the final prospectus. Not investment advice.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
