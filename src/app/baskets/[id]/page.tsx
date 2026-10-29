import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { basketStock, dominantIndustry } from "@/lib/baskets/industry";
import { compareProps, pickerProps } from "@/lib/baskets/page-props";
import { getVisibleBasket } from "@/lib/baskets/store";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsLoading } from "@/lib/baskets/projection-risk-data";
import { ProjectionStatsPending } from "@/components/baskets/ProjectionStatsPending";

// Shared baskets are reachable by link but never indexed: they are a person's own picks.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { id } = await params;
  const user = await getCurrentUser();
  const b = await getVisibleBasket(id, user?.id ?? null);
  return {
    title: b ? `${b.name}: a stock basket` : "Page not found",
    description: b ? `${b.items.length} stocks, backtested against the Nifty 50 and their industry on NextResearch.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SavedBasketPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  // Read now: the load can finish during the awaits below, after the stocks were built on stand-ins.
  const statsLoading = riskStatsLoading();
  const { id } = await params;
  const user = await getCurrentUser();
  const b = await getVisibleBasket(id, user?.id ?? null);
  if (!b) notFound();
  const stocks = b.items.map((i) => basketStock(i.ticker)).filter((s) => s !== null);
  // Saved stocks the maps no longer list stay visible ("No longer listed") so they can be taken off,
  // rather than silently vanishing; the backtest leaves them out either way.
  const unlisted = b.items.map((i) => i.ticker).filter((t) => !basketStock(t));
  const industry = b.sourceSector ?? dominantIndustry(stocks.map((s) => s.ticker));
  const picker = b.isOwner && user ? await pickerProps(user.id) : { universe: null, watchlist: [] };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-page flex-1 flex-col gap-4 px-5 py-14">
        {statsLoading && <ProjectionStatsPending />}
        <Link href="/baskets" className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; {b.isOwner ? "Your baskets" : "Baskets"}
        </Link>
        <BasketDetail
          mode="saved"
          id={b.id}
          name={b.name}
          description={b.description}
          stocks={stocks}
          addPrices={Object.fromEntries(b.items.map((i) => [i.ticker, i.priceAtAdd]))}
          weighting={b.weighting}
          customWeights={b.weights}
          isOwner={b.isOwner}
          isPublic={b.isPublic}
          signedIn={!!user}
          unlisted={unlisted}
          sourceSector={b.sourceSector}
          pickedFrom={Object.fromEntries(b.items.flatMap((i) => (i.pickedFrom ? [[i.ticker, i.pickedFrom]] : [])))}
          {...picker}
          {...compareProps(industry)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
