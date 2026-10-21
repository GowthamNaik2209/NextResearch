import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getQuote, type Quote } from "@/lib/live/yahoo";
import { basketStock } from "@/lib/baskets/industry";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { IndustryChips } from "@/components/baskets/IndustryChips";
import { NewBasketButton } from "@/components/baskets/NewBasketButton";
import { ensureFinancials } from "@/lib/financials/load";

export const metadata = { title: "Watchlist", robots: { index: false, follow: false } };

const parseNum = (s?: string | null) => {
  const n = s ? parseFloat(s.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
// "Rs 1,74,575 Cr" -> "₹1.75 L Cr": a lakh crore reads faster than seven digits on a phone.
const fmtCap = (cr: number) => (cr >= 1e5 ? `₹${(cr / 1e5).toFixed(2)} L Cr` : `₹${Math.round(cr).toLocaleString("en-IN")} Cr`);

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
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/watchlist");

  const rows = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: { company: { include: { kpis: { orderBy: { asOf: "desc" }, take: 1 } } } },
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
            <NewBasketButton
              tickers={basketable}
              name="My watchlist basket"
              label="Backtest as a basket"
              className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:border-accent"
            />
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
              const kpi = row.company.kpis[0];
              const q = live.get(ticker);
              const current = q?.price ?? kpi?.price?.toNumber() ?? parseNum(supplier?.f?.price);
              const priceAtAdd = row.priceAtAdd.toNumber();
              const since = current != null && priceAtAdd > 0 ? ((current - priceAtAdd) / priceAtAdd) * 100 : null;
              const low = kpi?.low52w?.toNumber() ?? supplier?.f?.range?.[0] ?? null;
              const high = kpi?.high52w?.toNumber() ?? supplier?.f?.range?.[1] ?? null;
              const pe = kpi?.pe?.toNumber() ?? supplier?.f?.kpi?.[0] ?? null;
              const cap = stock?.mcapCr ?? null;
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
                        {stock && <> · {stock.layer}</>}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="font-mono text-sm text-ink">
                        {current != null ? `₹${current.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "n/a"}
                        {q?.changePct != null && <span className={" text-xs " + (q.changePct >= 0 ? "text-pos" : "text-danger")}> {pct(q.changePct)}</span>}
                      </div>
                      <div className="font-mono text-[11px] text-ink-soft">
                        {q ? "today" : "last close we have"}
                        {since != null && (
                          <>
                            {" · "}
                            <span className={since >= 0 ? "text-pos" : "text-danger"}>{pct(since)}</span> since added
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    {stock ? <IndustryChips industries={stock.industries} /> : <span />}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-soft">
                      {cap != null && <span>M.cap {fmtCap(cap)}</span>}
                      {pe != null && pe > 0 && <span>P/E {pe.toFixed(1)}</span>}
                      {pos != null && (
                        <span className="flex items-center gap-1.5" title={`52-week range ₹${low!.toLocaleString("en-IN")} – ₹${high!.toLocaleString("en-IN")}`}>
                          52W
                          <span aria-hidden className="relative h-1.5 w-16 rounded-full bg-line">
                            <span className="absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent" style={{ left: `${pos * 100}%` }} />
                          </span>
                          <span className="sr-only">{Math.round(pos * 100)}% of the way from the 52-week low to the high</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-ink-soft">added {row.addedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{priceAtAdd > 0 && ` at ₹${priceAtAdd.toLocaleString("en-IN")}`}</div>
                </>
              );
              return supplier ? (
                <OpenStockCard key={row.id} ticker={ticker} supplier={supplier} className={rowClass}>
                  {inner}
                </OpenStockCard>
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
