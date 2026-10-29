import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { getIdea } from "@/lib/baskets/ideas-data";
import { basketStock, dominantIndustry } from "@/lib/baskets/industry";
import { compareProps } from "@/lib/baskets/page-props";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsReady } from "@/lib/baskets/projection-risk-data";
import { ProjectionStatsPending } from "@/components/baskets/ProjectionStatsPending";
import { sep } from "@/lib/format";

// A rule-based basket (a "basket idea" in the code): today's list for one rule, as a basket anyone can chart and save as their own.
// The list moves with prices, so the page is rendered per request from the day's cached lists.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The day's lists couldn't be read (being rebuilt after a deploy or a new trading day, or prices
// slow): "unavailable", which the page shows as "being updated", not as a missing page (404).
// null: no idea by that id.
const loadIdea = (id: string) =>
  getIdea(id).catch((e: unknown) => {
    console.error(`[ideas] idea ${id}: lists unavailable`, e);
    return "unavailable" as const;
  });

const dayOf = (iso: string) => sep(new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { id } = await params;
  const got = await loadIdea(id);
  if (got === "unavailable") return { title: "Rule-based basket", robots: { index: false } };
  if (!got) return { title: "Page not found", robots: { index: false } };
  return {
    title: `${got.idea.title}: a rule-based stock basket`,
    description: `${got.idea.blurb} Re-ranked daily and backtested against the Nifty 50 on NextResearch.`,
    alternates: { canonical: `/baskets/ideas/${id}` },
  };
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { id } = await params;
  const [got, user] = await Promise.all([loadIdea(id), getCurrentUser()]);
  if (got === "unavailable") return <Updating />;
  if (!got) notFound();
  const { idea, asOf } = got;
  const stocks = idea.stocks.map((s) => basketStock(s.ticker)).filter((s) => s !== null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-page flex-1 flex-col gap-4 px-5 py-14">
        {!riskStatsReady() && <ProjectionStatsPending />}
        <Link href="/baskets#ideas" className="-my-1 inline-flex min-h-8 items-center self-start text-xs font-semibold text-accent hover:underline pointer-coarse:min-h-9">
          &larr; Rule-based baskets
        </Link>
        <BasketDetail
          mode="idea"
          id={idea.id}
          name={idea.title}
          description={`${idea.rule} As of ${dayOf(asOf)}.`}
          stocks={stocks}
          addPrices={{}}
          weighting="equal"
          isOwner={false}
          isPublic
          signedIn={!!user}
          universe={null}
          watchlist={[]}
          initialRange={idea.range}
          joinAtListing={idea.joinAtListing}
          pickedOn={Object.fromEntries(idea.stocks.map((s) => [s.ticker, s.stat]))}
          {...compareProps(dominantIndustry(stocks.map((s) => s.ticker)))}
        />
      </main>
      <SiteFooter />
    </>
  );
}

function Updating() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 px-5 py-14">
        <Link href="/baskets#ideas" className="-my-1 inline-flex min-h-8 items-center self-start text-xs font-semibold text-accent hover:underline pointer-coarse:min-h-9">
          &larr; Rule-based baskets
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">Today&rsquo;s list is being updated</h1>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">The rule-based baskets are re-ranked from the latest closing prices. Reload in a minute to see this one.</p>
      </main>
      <SiteFooter />
    </>
  );
}
