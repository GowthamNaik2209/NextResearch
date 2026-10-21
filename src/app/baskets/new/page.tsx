import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { getIdea } from "@/lib/baskets/ideas-data";
import { basketStock, dominantIndustry, getIndustryBasket, listBasketUniverse } from "@/lib/baskets/industry";
import { compareProps, pickerProps } from "@/lib/baskets/page-props";
import { ensureFinancials } from "@/lib/financials/load";

export const metadata = { title: "Create a basket", robots: { index: false, follow: false } };

// Create basket: the basket page itself, empty and unsaved. Pick an industry on top, add its
// stocks, switch industries and keep adding; the returns and chart follow; "Create basket" saves it.
// ?with=watchlist starts from your liked stocks; ?with=<industry slug> opens on that industry;
// ?idea=<id> (an idea's "Edit") starts from that idea's stocks, name and period.
export default async function NewBasketPage({ searchParams }: { searchParams: Promise<{ with?: string; idea?: string }> }) {
  await ensureFinancials();
  const sp = await searchParams;
  const start = sp.with ?? "";
  const ideaId = sp.idea ?? "";
  const user = await getCurrentUser();
  if (!user) {
    const back = new URLSearchParams(Object.entries({ with: start, idea: ideaId }).filter(([, v]) => v)).toString();
    redirect(`/login?next=${encodeURIComponent(`/baskets/new${back ? `?${back}` : ""}`)}`);
  }
  const picker = await pickerProps(user.id).catch((e: unknown) => {
    console.error("[baskets/new] loading the watchlist failed", e);
    return null;
  });
  const universe = picker?.universe ?? listBasketUniverse();
  const watchlist = picker?.watchlist ?? [];
  const idea = ideaId ? ((await getIdea(ideaId).catch(() => null))?.idea ?? null) : null;
  const stocks = idea
    ? idea.stocks.map((s) => basketStock(s.ticker)).filter((s) => s !== null)
    : start === "watchlist"
      ? watchlist.map((t) => basketStock(t)).filter((s) => s !== null)
      : [];
  const industry = idea ? dominantIndustry(stocks.map((s) => s.ticker)) : (getIndustryBasket(start)?.slug ?? null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-7xl flex-1 flex-col gap-4 px-5 py-14">
        <Link href={idea ? `/baskets/ideas/${idea.id}` : "/baskets"} className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; {idea ? idea.title : "Baskets"}
        </Link>
        <BasketDetail
          mode="draft"
          id="new"
          name={idea?.title ?? ""}
          description={idea ? `Starting from the ${idea.title} idea. Add stocks from any industry or policy, take off the ones you don\u2019t want, then create it as your basket.` : null}
          stocks={stocks}
          addPrices={{}}
          weighting="equal"
          isOwner
          isPublic={false}
          signedIn
          universe={universe}
          watchlist={watchlist}
          initialRange={idea?.range}
          {...compareProps(industry)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
