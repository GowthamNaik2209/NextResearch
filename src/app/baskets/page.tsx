import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketIdeas } from "@/components/baskets/BasketIdeas";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basketStock, listIndustryBaskets } from "@/lib/baskets/industry";
import { BasketsPanel, BasketsSummary, type IndustryRow, type SavedRow } from "@/components/baskets/BasketsTable";

export const metadata = {
  title: "Stock baskets: build your own from any mix of Indian industries",
  description:
    "Create a stock basket from any mix of the industries NextResearch maps, from EVs and railways to defence, pharma and real estate, or start from a daily basket idea: top performers, quality leaders, bottleneck plays, companies across industries and recent listings. Each one is backtested against the Nifty 50 and shareable by link.",
  alternates: { canonical: "/baskets" },
};

export default async function BasketsPage() {
  const user = await getCurrentUser();
  // A failed read of the signed-in user's own rows must not take the page down: the basket ideas
  // below don't need the database. The error is logged (Vercel runtime logs, "[baskets]").
  let mineFailed = false;
  const mine = user
    ? await prisma.basket
        .findMany({ where: { userId: user.id }, include: { items: { select: { ticker: true } } }, orderBy: { createdAt: "desc" } })
        .catch((e: unknown) => {
          console.error("[baskets] loading the user's baskets failed", e);
          mineFailed = true;
          return [];
        })
    : [];

  // Plain rows for the tables (figures load in the browser). Tickers the content no longer lists
  // are left out, as on the basket page, so both read the same backtest.
  const mineRows: SavedRow[] = mine.map((b) => {
    const stocks = b.items.map((i) => basketStock(i.ticker)).filter((s) => s !== null);
    return {
      kind: "saved",
      id: b.id,
      name: b.name,
      isPublic: b.isPublic,
      weighting: b.weighting === "MCAP" ? "mcap" : "equal",
      tickers: stocks.map((s) => s.ticker),
      names: stocks.map((s) => s.name),
    };
  });
  const industryRows: IndustryRow[] = listIndustryBaskets().map((b) => ({ kind: "industry", slug: b.slug, name: b.name, category: b.category, count: b.stocks.length }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-5 py-14 lg:max-w-7xl">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Baskets</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-ink-soft sm:text-sm">
            A basket is a group of stocks you follow as one. Start from one of today&rsquo;s basket ideas, or create your own from any
            mix of industries and your watchlist. Each one is backtested against the Nifty 50, with indices and industries a tap away
            to compare. For tracking and research only: nothing here places trades.
          </p>
        </div>

        {/* Order: ready-made ideas first, then your own (create + saved), then the industry and policy baskets. */}
        <section aria-labelledby="ideas-h" id="ideas" className="flex scroll-mt-20 flex-col gap-2">
          <div>
            <h2 id="ideas-h" className="font-display text-lg font-bold text-ink sm:text-xl">
              Basket ideas
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">Ready-made lists, re-ranked every day. Open one to chart it, then save it as your own basket.</p>
          </div>
          <BasketIdeas />
        </section>

        <section aria-labelledby="mine-h" className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id="mine-h" className="font-display text-lg font-bold text-ink sm:text-xl">
                Your baskets
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">Pick industries and stocks, choose a weighting, and save it to follow.</p>
            </div>
            <Link href={user ? "/baskets/new" : "/login?next=/baskets/new"} className="inline-flex min-h-10 flex-none items-center rounded-md bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
              Create basket
            </Link>
          </div>
          <BasketsPanel title="Saved" rows={mineRows}>
            {!user ? (
              <>
                <Link href="/login?next=/baskets" className="font-semibold text-accent hover:underline">
                  Sign in
                </Link>{" "}
                to create your own baskets, build them from your watchlist and share them by link. The basket ideas above are open to everyone.
              </>
            ) : mineFailed ? (
              <>Your saved baskets couldn&rsquo;t load right now. Reload in a moment; the basket ideas above still work.</>
            ) : (
              <>No baskets yet. Tap &ldquo;Create basket&rdquo; to build one from any mix of industries, or save one of the ideas above.</>
            )}
          </BasketsPanel>
        </section>

        <section aria-labelledby="industry-h" className="mt-4 flex flex-col gap-2">
          <div>
            <h2 id="industry-h" className="font-display text-lg font-bold text-ink sm:text-xl">
              Industry &amp; policy baskets
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">Every listed stock each industry or policy maps, equal weight. Tap a column heading to sort.</p>
          </div>
          <BasketsSummary mineCount={user && !mineFailed ? mine.length : null} />
          <BasketsPanel title="All industries & policies" rows={industryRows} initialSort="ret" />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
