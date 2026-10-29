import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { getIndustryBasket, listIndustryBaskets } from "@/lib/baskets/industry";
import { compareProps } from "@/lib/baskets/page-props";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";

export async function generateStaticParams() {
  await ensureFinancials();
  await ensureRiskStats();
  return listIndustryBaskets().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { slug } = await params;
  const b = getIndustryBasket(slug);
  if (!b) return { title: "Page not found", robots: { index: false } };
  return {
    title: `${b.name} stock basket: ${b.stocks.length} listed stocks backtested`,
    description: `All ${b.stocks.length} listed ${b.name} stocks NextResearch maps, as one basket backtested against the Nifty 50${b.indices[0] ? ` and the ${b.indices[0].name}` : ""}, with each stock's return and contribution.`,
    alternates: { canonical: `/baskets/industry/${b.slug}` },
  };
}

export default async function IndustryBasketPage({ params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { slug } = await params;
  const b = getIndustryBasket(slug);
  if (!b) notFound();
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-page flex-1 flex-col gap-4 px-5 py-14">
        {/* Back to the theme the basket is built from (where "Open industry basket" opens it), and to the hub. */}
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href={`/sector/${b.slug}`} className="inline-flex min-h-8 items-center text-balance hover:underline pointer-coarse:min-h-9">
            &larr; Back to {b.name} theme
          </Link>
          <Link href="/baskets" className="inline-flex min-h-8 items-center text-ink-soft hover:text-accent hover:underline pointer-coarse:min-h-9">
            All baskets
          </Link>
        </nav>
        <BasketDetail
          mode="industry"
          id={b.slug}
          name={`${b.name} ${b.category === "policy" ? "policy" : "industry"} basket`}
          description={`All ${b.stocks.length} listed companies on the ${b.name} map: ${b.tagline}`}
          stocks={b.stocks}
          addPrices={{}}
          weighting="equal"
          isOwner={false}
          isPublic
          signedIn={!!user}
          universe={null}
          watchlist={[]}
          {...compareProps(b.slug)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
