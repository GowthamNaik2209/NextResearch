import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { basketStock, dominantIndustry } from "@/lib/baskets/industry";
import { compareProps, pickerProps } from "@/lib/baskets/page-props";
import { getVisibleBasket } from "@/lib/baskets/store";

// Shared baskets are reachable by link but never indexed: they are a person's own picks.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;
  const user = await getCurrentUser();
  const b = await getVisibleBasket(id, user?.id ?? null);
  if (!b) notFound();
  const stocks = b.items.map((i) => basketStock(i.ticker)).filter((s) => s !== null);
  const industry = b.sourceSector ?? dominantIndustry(stocks.map((s) => s.ticker));
  const picker = b.isOwner && user ? await pickerProps(user.id) : { universe: null, watchlist: [] };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-5 py-14">
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
          isOwner={b.isOwner}
          isPublic={b.isPublic}
          signedIn={!!user}
          {...picker}
          {...compareProps(industry)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
