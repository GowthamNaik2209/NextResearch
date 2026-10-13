import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { findSupplierByTicker } from "@/lib/sector-content";
import { OpenStockCard } from "@/components/stock/OpenStockCard";

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/watchlist");

  const rows = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: { company: { include: { kpis: { orderBy: { asOf: "desc" }, take: 1 } } } },
    orderBy: { addedAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Watchlist</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Companies you&rsquo;ve saved by tapping the heart next to a ticker anywhere in the explorer.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center">
            <p className="text-sm text-ink-soft">
              Nothing saved yet. Open any{" "}
              <Link href="/" className="text-accent hover:underline">
                sector
              </Link>
              , click into a component, and tap the heart next to a listed company&rsquo;s ticker.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => {
              const priceAtAdd = row.priceAtAdd.toNumber();
              const current = row.company.kpis[0]?.price?.toNumber() ?? null;
              const change = current != null && priceAtAdd > 0 ? ((current - priceAtAdd) / priceAtAdd) * 100 : null;
              const supplier = findSupplierByTicker(row.company.ticker);
              const Row = supplier ? OpenStockCard : null;
              const rowClass = "flex items-center justify-between gap-4 rounded-xl border border-line bg-panel p-4" + (supplier ? " transition hover:border-accent" : "");
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{row.company.name}</div>
                    <div className="font-mono text-xs text-ink-soft">{row.company.ticker}</div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="font-mono text-sm text-ink">
                      {current != null ? `Rs ${current.toLocaleString("en-IN")}` : "n/a"}
                    </div>
                    <div className="font-mono text-xs text-ink-soft">
                      added at Rs {priceAtAdd.toLocaleString("en-IN")}
                      {change != null && (
                        <span className={change >= 0 ? " text-accent" : " text-danger"}>
                          {" "}
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );
              return Row && supplier ? (
                <Row key={row.id} ticker={row.company.ticker} supplier={supplier} className={rowClass}>
                  {inner}
                </Row>
              ) : (
                <div key={row.id} className={rowClass}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}

        {rows.length > 0 && (
          <section className="mt-4">
            <h2 className="font-display text-lg font-bold text-ink">News on your watchlist</h2>
            <div className="mt-3">
              <NewsFeed tickers={rows.map((r) => r.company.ticker)} limit={8} showSector={false} />
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
