import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { findSupplierByTicker, primarySector } from "@/lib/sector-content";
import { getQuote, type Quote } from "@/lib/live/yahoo";
import { basketStock } from "@/lib/baskets/industry";
import { IndustryChips } from "@/components/baskets/IndustryChips";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";
import { parseRupees } from "@/lib/financials/rows";
import { croreShort, fmtDay, NA, signedPct } from "@/lib/format";
import { croreFromLabel, fmtPrice, freshQuote, pctTone } from "@/components/stock/merge";
import { dataAsOf } from "@/lib/sector-content/insights";
import { WatchlistRow } from "./WatchlistRow";
import { WatchlistBacktest, WatchlistNewsGate } from "./WatchlistLive";

export const metadata = { title: "Watchlist", robots: { index: false, follow: false } };


async function quotes(tickers: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  for (let i = 0; i < tickers.length; i += 8) {
    const batch = tickers.slice(i, i + 8);
    const res = await Promise.all(batch.map((t) => getQuote(t).catch(() => null)));
    batch.forEach((t, j) => res[j] && out.set(t, res[j]!));
  }
  return out;
}

export default async function WatchlistPage() {
  await ensureFinancials();
  await ensureRiskStats();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/watchlist");

  const rows = await prisma.watchlist.findMany({
    where: { userId: user.id },
    // Identity only: the figures come from the company table installed by ensureFinancials()
    // (supplier.f), the same copy every other page shows.
    select: { id: true, priceAtAdd: true, addedAt: true, company: { select: { ticker: true, name: true } } },
    orderBy: { addedAt: "desc" },
  });
  const live = await quotes(rows.map((r) => r.company.ticker));
  const basketable = rows.map((r) => r.company.ticker).filter((t) => basketStock(t));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Watchlist</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Companies you&rsquo;ve saved by tapping the heart next to a ticker anywhere in the explorer.
            </p>
          </div>
          {basketable.length > 0 && (
            <WatchlistBacktest tickers={basketable} className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:border-accent" />
          )}
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
              const ticker = row.company.ticker;
              const supplier = findSupplierByTicker(ticker);
              const stock = basketStock(ticker);
              const f = supplier?.f;
              // Home industry by the one rule every page uses (primarySector); the basket draft made
              // by "Save as a basket" labels the stock the same way.
              const homeSlug = primarySector(ticker);
              const home = stock?.industries.find((i) => i.slug === homeSlug) ?? stock?.industries[0] ?? null;
              const q = freshQuote(live.get(ticker));
              const current = q?.price ?? parseRupees(f?.price);
              // 0 = the live price at saving isn't known (yet - the API fills it just after saving): no move.
              const added = row.priceAtAdd.toNumber();
              const priceAtAdd = added > 0 ? added : null;
              const since = current != null && priceAtAdd != null ? ((current - priceAtAdd) / priceAtAdd) * 100 : null;
              const low = f?.range?.[0] ?? null;
              const high = f?.range?.[1] ?? null;
              const pe = f?.kpi?.[0] ?? null;
              // Same snapshot market cap as the company page and pop-up (company table).
              const cap = croreFromLabel(f?.mcap);
              const asOf = f?.asOf ?? dataAsOf();
              // Where today's price sits in its 52-week range, 0 (at the low) to 1 (at the high).
              const pos = current != null && low != null && high != null && high > low ? Math.min(1, Math.max(0, (current - low) / (high - low))) : null;
              const rowClass = "flex flex-col gap-2 rounded-xl border border-line bg-panel p-4" + (supplier ? " transition hover:border-accent" : "");
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{row.company.name}</div>
                      <div className="truncate text-xs text-ink-soft">
                        <span className="font-mono">{ticker}</span>
                        {/* A saved stock has no "picked from" industry (a basket uses that), so name its home
                            industry with the layer: "Artillery & armoured systems" alone read
                            as wrong for Bharat Forge saved from the EV explorer. */}
                        {home && (
                          <>
                            {" "}
                            · {stock!.layerIn[home.slug] ?? stock!.layer} ({home.name})
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-sm text-ink">
                        {fmtPrice(current)}
                        {q?.changePct != null && <span className={" text-xs " + pctTone(q.changePct, 1)}> {signedPct(q.changePct)}</span>}
                      </div>
                      {/* The price is the only live figure in the row; say so, and date the rest. */}
                      <div className="font-mono text-[11px] text-ink-soft">
                        {q ? <span className="text-pos">live</span> : `snapshot ${asOf}`}
                        {" · "}
                        {since != null ? (
                          <span className={pctTone(since, 1)}>{signedPct(since, 1)}</span>
                        ) : (
                          <span title="The live price when you saved this isn't known yet, so there is no move to show.">{NA}</span>
                        )}{" "}
                        since added
                      </div>
                    </div>
                  </div>
                  {/* Same three lines on every card (chips; figures; when added), so cards line up
                      whatever the chip widths. */}
                  {stock ? <IndustryChips industries={stock.industries} /> : null}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] text-ink-soft">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {cap != null && <span>M.cap {croreShort(cap)}</span>}
                      {pe != null && pe > 0 && <span>P/E {pe.toFixed(1)}x</span>}
                      {pos != null && (
                        <span className="flex items-center gap-1.5" title={`52-week range ₹${low!.toLocaleString("en-IN")} – ₹${high!.toLocaleString("en-IN")} (as of ${asOf})`}>
                          52W
                          <span aria-hidden className="relative h-1.5 w-16 rounded-full bg-line">
                            <span className="absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent" style={{ left: `${pos * 100}%` }} />
                          </span>
                          <span className="sr-only">{Math.round(pos * 100)}% of the way from the 52-week low to the high</span>
                        </span>
                      )}
                      {(cap != null || pe != null || pos != null) && <span>as of {asOf}</span>}
                    </div>
                    <span className="text-[10px]">
                      added {fmtDay(row.addedAt)}
                      {priceAtAdd != null && ` at ${fmtPrice(priceAtAdd)}`}
                    </span>
                  </div>
                </>
              );
              return (
                <WatchlistRow key={row.id} ticker={ticker} name={row.company.name} supplier={supplier ?? null} className={rowClass}>
                  {inner}
                </WatchlistRow>
              );
            })}
          </div>
        )}

        {rows.length > 0 && (
          <WatchlistNewsGate tickers={rows.map((r) => r.company.ticker)}>
            <section className="mt-4">
              <h2 className="font-display text-lg font-bold text-ink">News on your watchlist</h2>
              <div className="mt-3">
                <NewsFeed tickers={rows.map((r) => r.company.ticker)} limit={8} showSector={false} />
              </div>
            </section>
          </WatchlistNewsGate>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
