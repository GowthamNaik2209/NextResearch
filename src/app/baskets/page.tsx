import { Suspense, cache } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { InfoTip } from "@/components/InfoTip";
import { BasketIdeas } from "@/components/baskets/BasketIdeas";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basketStock, listIndustryBaskets } from "@/lib/baskets/industry";
import { BasketsPanel, BasketsSummary, IndustryBaskets, type IndustryRow, type SavedRow } from "@/components/baskets/BasketsTable";
import { industrySeriesKey } from "@/components/baskets/series";
import { toSaved } from "@/lib/baskets/store";
import { industryFigures } from "@/lib/baskets/industry-figures";
import { readBasketReturns } from "@/lib/baskets/basket-returns";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsLoading } from "@/lib/baskets/projection-risk-data";
import { ProjectionStatsPending } from "@/components/baskets/ProjectionStatsPending";
import { basketCases } from "@/lib/baskets/projection-data";
import { shareMeta } from "@/lib/site";
import type { BasketFigures } from "@/lib/baskets/stats";

export const metadata = {
  title: "Stock baskets: build your own from any mix of Indian industries",
  description:
    "Create a stock basket from any mix of the industries NextResearch maps, from EVs and railways to defence, pharma and real estate, or start from a rule-based basket re-ranked daily: biggest gainers, highest ROCE, scarce suppliers, companies in 3+ industries, recent listings, consistent compounders, growth at a reasonable price, turnarounds and widening margins. Each one is backtested against the Nifty 50 and shareable by link.",
  alternates: { canonical: "/baskets" },
  ...shareMeta({ title: "Stock baskets", line: "Mix any Indian industries, backtested against the Nifty 50.", path: "/baskets" }),
};

// The industry table and the summary strip above it read the same figures: worked out once per request.
const figures = cache(industryFigures);

export default async function BasketsPage() {
  await ensureFinancials();
  await ensureRiskStats();
  // Read now: the load can finish during the awaits below, after the stocks were built on stand-ins.
  const statsLoading = riskStatsLoading();
  const user = await getCurrentUser();
  // A failed read of the signed-in user's own rows must not take the page down: the basket ideas
  // below don't need the database. The error is logged (Vercel runtime logs, "[baskets]").
  let mineFailed = false;
  const mine = user
    ? await prisma.basket
        .findMany({ where: { userId: user.id }, include: { items: { orderBy: { addedAt: "asc" } } }, orderBy: { createdAt: "desc" } })
        .catch((e: unknown) => {
          console.error("[baskets] loading the user's baskets failed", e);
          mineFailed = true;
          return [];
        })
    : [];

  // Plain rows for the tables (figures load in the browser). Tickers the content no longer lists
  // are left out, as on the basket page, so both read the same backtest.
  // The weighting and weights read as the basket page reads them (toSaved), so a row and its page
  // backtest the same basket.
  const mineRows: SavedRow[] = mine.map((row) => {
    const b = toSaved(row, user?.id ?? null);
    const stocks = b.items.map((i) => basketStock(i.ticker)).filter((s) => s !== null);
    return {
      kind: "saved",
      id: b.id,
      name: b.name,
      isPublic: b.isPublic,
      weighting: b.weighting,
      weights: b.weighting === "custom" ? b.weights : null,
      tickers: stocks.map((s) => s.ticker),
      names: stocks.map((s) => s.name),
      // Next year's Bear, Base and Bull at the basket's own weighting (docs/PROJECTIONS.md).
      proj: stocks.length ? basketCases(stocks, b.weighting, b.weighting === "custom" ? b.weights : null)["1"] : null,
    };
  });
  const mineCount = user && !mineFailed ? mine.length : null;
  const industryRows: IndustryRow[] = listIndustryBaskets().map((b) => ({ kind: "industry", slug: b.slug, name: b.name, category: b.category, count: b.stocks.length, proj: b.stocks.length ? basketCases(b.stocks, "equal")["1"] : null }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-5 pt-6 pb-14 sm:py-14 lg:max-w-page">
        {statsLoading && <ProjectionStatsPending />}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Baskets</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-ink-soft sm:text-sm">
            A basket is a group of stocks you follow as one. Start from an industry basket or a rule-based list, or create your own from any
            mix of industries and your watchlist. Each one is backtested against the Nifty 50, with indices and industries a tap away
            to compare. For tracking and research only: nothing here places trades.
          </p>
        </div>

        {/* Order: ready-made ideas first, then your own (create + saved), then the industry and policy baskets. */}
        <section aria-labelledby="ideas-h" id="ideas" className="flex scroll-mt-20 flex-col gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="ideas-h" className="font-display text-lg font-bold text-ink sm:text-xl">
                Rule-based baskets
              </h2>
              <InfoTip label="About rule-based baskets">
                Each list is picked by a fixed rule (past return, company figures, our maps) and re-ranked daily; tap a card&rsquo;s i for its rule. Returns shown are past performance, not a
                recommendation or forecast.
              </InfoTip>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">Lists picked by a fixed rule, re-ranked daily. Open one to backtest it, or copy it to your baskets.</p>
          </div>
          <BasketIdeas />
        </section>

        {/* One summary for the two tables below (yours, then industry & policy). The Nifty's figure
            streams in from the server; the strip shows at its final size meanwhile. */}
        <div className="mt-4">
          <Suspense fallback={<BasketsSummary mineCount={mineCount} />}>
            <Summary mineCount={mineCount} />
          </Suspense>
        </div>

        <section aria-labelledby="mine-h" className="mt-2 flex flex-col gap-2">
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
                to create your own baskets, build them from your watchlist and share them by link. The rule-based baskets above are open to everyone.
              </>
            ) : mineFailed ? (
              <>Your saved baskets couldn&rsquo;t load right now. Reload in a moment; the rule-based baskets above still work.</>
            ) : (
              <>No baskets yet. Tap &ldquo;Create basket&rdquo; to build one from any mix of industries, or copy one of the rule-based baskets above.</>
            )}
          </BasketsPanel>
        </section>

        <section aria-labelledby="industry-h" className="mt-4 flex flex-col gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="industry-h" className="font-display text-lg font-bold text-ink sm:text-xl">
                Industry &amp; policy baskets
              </h2>
              <InfoTip label="What the columns mean">
                <b>Period</b>: the menu above the heatmap picks the span (1D to 3Y) for the heatmap and the return, drawdown and vs Nifty columns; 1Y by default. <b>Return</b>: bought at the start of the period and not rebalanced. <b>Drawdown</b>: the deepest fall from a high in that period (a column from tablet width up).{" "}
                <b>vs Nifty</b>: the basket&rsquo;s return minus the Nifty 50&rsquo;s, in percentage points.{" "}
                <b>Bear · Base · Bull</b>: the basket&rsquo;s projected return over the next year in each case (a model projection, not a forecast; columns from tablet width, and in the Sort menu on phones).{" "}
                Tap a column heading to sort (again to reverse), or use the Sort menu on a phone.
              </InfoTip>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">Every listed stock on each industry or policy map, at equal weight. The heatmap shows the period you pick at a glance; tap a tile to jump to its row.</p>
          </div>
          {/* The figures are worked out on the server and stream in; until then the rows show loading. */}
          <Suspense fallback={<IndustryBaskets rows={industryRows} deferred />}>
            <IndustryTable rows={industryRows} />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function IndustryTable({ rows }: { rows: IndustryRow[] }) {
  // 1Y from the page's own backtests (as before); the period menu's other spans from the stored table.
  const [{ figs, benchRet }, stored] = await Promise.all([figures(), readBasketReturns(prisma)]);
  const bySeriesKey = (bySlug: Record<string, BasketFigures>) => Object.fromEntries(Object.entries(bySlug).map(([slug, f]) => [industrySeriesKey(slug), f]));
  const seed = {
    figs: bySeriesKey(figs),
    benchRet,
    byPeriod: Object.fromEntries(Object.entries(stored).map(([p, bySlug]) => [p, bySeriesKey(bySlug)])),
  };
  return <IndustryBaskets rows={rows} seed={seed} />;
}

async function Summary({ mineCount }: { mineCount: number | null }) {
  const { benchRet } = await figures();
  return <BasketsSummary mineCount={mineCount} benchRet={benchRet} />;
}
