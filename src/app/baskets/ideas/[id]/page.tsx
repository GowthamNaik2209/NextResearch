import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { getIdea } from "@/lib/baskets/ideas-data";
import { basketStock, dominantIndustry } from "@/lib/baskets/industry";
import { compareProps } from "@/lib/baskets/page-props";

// A basket idea: today's list for one rule, as a basket anyone can chart and save as their own.
// The list moves with prices, so the page is rendered per request from the day's cached lists.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const got = await getIdea(id).catch(() => null);
  if (!got) return { title: "Page not found", robots: { index: false } };
  return {
    title: `${got.idea.title}: a stock basket idea`,
    description: `${got.idea.blurb} Re-ranked daily and backtested against the Nifty 50 on NextResearch.`,
    alternates: { canonical: `/baskets/ideas/${id}` },
  };
}

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [got, user] = await Promise.all([getIdea(id).catch(() => null), getCurrentUser()]);
  if (!got) notFound();
  const { idea, asOf } = got;
  const stocks = idea.stocks.map((s) => basketStock(s.ticker)).filter((s) => s !== null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-7xl flex-1 flex-col gap-4 px-5 py-14">
        <Link href="/baskets#ideas" className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; Basket ideas
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
          {...compareProps(dominantIndustry(stocks.map((s) => s.ticker)))}
        />
      </main>
      <SiteFooter />
    </>
  );
}
