import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketIdeas } from "@/components/baskets/BasketIdeas";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basketStock } from "@/lib/baskets/industry";

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Baskets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            A basket is a group of stocks you follow as one. Create one from any mix of industries and your watchlist, or start
            from one of today&rsquo;s basket ideas and save it as yours. Each one is backtested against the Nifty 50, with indices
            and industries a tap away to compare. For tracking and research only: nothing here places trades.
          </p>
        </div>

        <section aria-labelledby="mine" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="mine" className="font-display text-xl font-bold text-ink">
              Your baskets
            </h2>
            <Link href={user ? "/baskets/new" : "/login?next=/baskets/new"} className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
              Create basket
            </Link>
          </div>
          {!user ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              <Link href="/login?next=/baskets" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>{" "}
              to create your own baskets, build them from your watchlist and share them by link. The basket ideas below are open to everyone.
            </div>
          ) : mineFailed ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              Your saved baskets couldn&rsquo;t load right now. Reload in a moment; the basket ideas below still work.
            </div>
          ) : mine.length === 0 ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              No baskets yet. Tap &ldquo;Create basket&rdquo; to build one from any mix of industries, or save one of the ideas below.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((b) => {
                const names = b.items.map((i) => basketStock(i.ticker)?.name).filter(Boolean);
                return (
                  <li key={b.id}>
                    <Link href={`/baskets/${b.id}`} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-panel p-4 transition hover:border-accent">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words font-semibold text-ink">{b.name}</span>
                        <span className={"flex-none rounded-full border px-2 py-0.5 text-[10px] font-semibold " + (b.isPublic ? "border-accent text-accent" : "border-line text-ink-soft")}>
                          {b.isPublic ? "Shared" : "Private"}
                        </span>
                      </div>
                      <span className="text-xs text-ink-soft">
                        {b.items.length} {b.items.length === 1 ? "stock" : "stocks"} · {b.weighting === "MCAP" ? "market-cap weighted" : "equal weight"}
                      </span>
                      {names.length > 0 && (
                        <span className="line-clamp-2 text-xs text-ink-soft">
                          {names.slice(0, 4).join(", ")}
                          {names.length > 4 ? ` and ${names.length - 4} more` : ""}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="ideas-h" id="ideas" className="flex scroll-mt-20 flex-col gap-4">
          <div>
            <h2 id="ideas-h" className="font-display text-xl font-bold text-ink">
              Basket ideas
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Ready-made lists, re-ranked every day. Open one to chart it, then save it as your own basket.</p>
          </div>
          <BasketIdeas />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
