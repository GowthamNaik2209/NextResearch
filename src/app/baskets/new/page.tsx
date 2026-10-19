import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { basketStock, getIndustryBasket, listBasketUniverse } from "@/lib/baskets/industry";
import { compareProps, pickerProps } from "@/lib/baskets/page-props";

export const metadata = { title: "Create a basket", robots: { index: false, follow: false } };

// Create basket: the basket page itself, empty and unsaved. Pick an industry on top, add its
// stocks, switch industries and keep adding; the returns and chart follow; "Create basket" saves it.
// ?with=watchlist starts from your liked stocks; ?with=<industry slug> opens on that industry.
export default async function NewBasketPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/baskets/new");
  const start = (await searchParams).with ?? "";
  const picker = await pickerProps(user.id).catch((e: unknown) => {
    console.error("[baskets/new] loading the watchlist failed", e);
    return null;
  });
  const universe = picker?.universe ?? listBasketUniverse();
  const watchlist = picker?.watchlist ?? [];
  const stocks = start === "watchlist" ? watchlist.map((t) => basketStock(t)).filter((s) => s !== null) : [];
  const industry = getIndustryBasket(start)?.slug ?? null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-7xl flex-1 flex-col gap-4 px-5 py-14">
        <Link href="/baskets" className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; Baskets
        </Link>
        <BasketDetail
          mode="draft"
          id="new"
          name=""
          description={null}
          stocks={stocks}
          addPrices={{}}
          weighting="equal"
          isOwner
          isPublic={false}
          signedIn
          universe={universe}
          watchlist={watchlist}
          {...compareProps(industry)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
