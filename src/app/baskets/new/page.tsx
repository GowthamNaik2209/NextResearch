import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketBuilder, type BuilderStock } from "@/components/baskets/BasketBuilder";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_BASKET_STOCKS, basketStock, listBasketUniverse, listIndustryBaskets, type BasketStock } from "@/lib/baskets/industry";

export const metadata = { title: "Create a basket", robots: { index: false, follow: false } };

const lite = (s: BasketStock): BuilderStock => ({ ticker: s.ticker, name: s.name, layer: s.layer });

// ?with=watchlist or ?with=<industry slug>[,<slug>...] opens with those switched on.
export default async function NewBasketPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/baskets/new");
  const liked = await prisma.watchlist
    .findMany({ where: { userId: user.id }, include: { company: { select: { ticker: true } } }, orderBy: { addedAt: "desc" } })
    .catch((e: unknown) => {
      console.error("[baskets/new] loading the watchlist failed", e);
      return [];
    });
  const watchlist = liked.map((r) => basketStock(r.company.ticker)).filter((s) => s !== null).map(lite);
  const industries = listIndustryBaskets().map((b) => ({ slug: b.slug, name: b.name, icon: b.icon, category: b.category, stocks: b.stocks.map(lite) }));
  const initial = ((await searchParams).with ?? "").split(",").map((g) => (g === "watchlist" ? "__watchlist" : g)).filter(Boolean);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-14">
        <Link href="/baskets" className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; Baskets
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Create a basket</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Switch on any mix of industries, keep the stocks you want, and name it. You can add or take off stocks later.
          </p>
        </div>
        <BasketBuilder industries={industries} watchlist={watchlist} universe={listBasketUniverse().map(lite)} max={MAX_BASKET_STOCKS} initialGroups={initial} />
      </main>
      <SiteFooter />
    </>
  );
}
