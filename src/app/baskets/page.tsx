import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewBasketButton } from "@/components/baskets/NewBasketButton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basketStock, listIndustryBaskets } from "@/lib/baskets/industry";

export const metadata = {
  title: "Stock baskets: backtest every listed stock in an Indian industry",
  description:
    "Ready-made baskets of every listed company in each industry NextResearch maps, from EVs and railways to defence, pharma and real estate, backtested against the Nifty 50 and, where there is one, the industry's own index, with the Sensex and other industries a tap away. Customise one, build your own, and share it by link.",
  alternates: { canonical: "/baskets" },
};

export default async function BasketsPage() {
  const user = await getCurrentUser();
  // A failed read of the signed-in user's own rows must not take the page down: the industry
  // baskets below don't need the database. The error is logged (Vercel runtime logs, "[baskets]").
  let mineFailed = false;
  const [mine, liked] = user
    ? await Promise.all([
        prisma.basket
          .findMany({ where: { userId: user.id }, include: { items: { select: { ticker: true } } }, orderBy: { createdAt: "desc" } })
          .catch((e: unknown) => {
            console.error("[baskets] loading the user's baskets failed", e);
            mineFailed = true;
            return [];
          }),
        prisma.watchlist.findMany({ where: { userId: user.id }, include: { company: { select: { ticker: true } } } }).catch((e: unknown) => {
          console.error("[baskets] loading the watchlist failed", e);
          return [];
        }),
      ])
    : [[], []];
  const likedTickers = liked.map((r) => r.company.ticker).filter((t) => basketStock(t));
  const industries = listIndustryBaskets();
  const btn = "min-h-10 rounded-lg px-4 text-sm font-semibold";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Baskets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            A basket is a group of stocks you follow as one. Start from an industry basket (every listed company in that
            industry&rsquo;s map), pick and drop stocks to make it yours, or build one from your watchlist. Each one is backtested
            against the Nifty 50 and, where there is one, its industry&rsquo;s index (add the Sensex or other industries to compare). For tracking and research only: nothing here places trades.
          </p>
        </div>

        <section aria-labelledby="mine" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="mine" className="font-display text-xl font-bold text-ink">
              Your baskets
            </h2>
            {user && (
              <div className="flex flex-wrap gap-2">
                {likedTickers.length > 0 && (
                  <NewBasketButton tickers={likedTickers} name="My watchlist basket" label={`From my watchlist (${likedTickers.length})`} className={`${btn} border border-line text-ink hover:border-accent`} />
                )}
                <NewBasketButton label="New basket" className={`${btn} bg-accent text-bg hover:opacity-90`} />
              </div>
            )}
          </div>
          {!user ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              <Link href="/login?next=/baskets" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>{" "}
              to save your own baskets, build them from your watchlist and share them by link. Industry baskets below are open to everyone.
            </div>
          ) : mineFailed ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              Your saved baskets couldn&rsquo;t load right now. Reload in a moment; the industry baskets below still work.
            </div>
          ) : mine.length === 0 ? (
            <div className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
              No baskets yet. Open an industry basket below and tap &ldquo;Customise this basket&rdquo;, or start a new one.
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

        <section aria-labelledby="industry" className="flex flex-col gap-4">
          <div>
            <h2 id="industry" className="font-display text-xl font-bold text-ink">
              Industry baskets
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Every listed company in each industry&rsquo;s map, as one basket.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((b) => (
              <li key={b.slug}>
                <Link href={`/baskets/industry/${b.slug}`} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-panel p-4 transition hover:border-accent">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-accent/10 font-mono text-[10px] font-bold text-accent">
                      {b.icon}
                    </span>
                    <span className="min-w-0 font-semibold text-ink">{b.name}</span>
                  </div>
                  <span className="text-xs text-ink-soft">
                    {b.stocks.length} listed stocks{b.indices[0] ? ` · vs ${b.indices[0].name}` : ""}
                  </span>
                  <span className="line-clamp-2 text-xs text-ink-soft">
                    {b.stocks
                      .slice(0, 4)
                      .map((s) => s.name)
                      .join(", ")}
                    {b.stocks.length > 4 ? ` and ${b.stocks.length - 4} more` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
