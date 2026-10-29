import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDetail } from "@/components/baskets/BasketDetail";
import { getCurrentUser } from "@/lib/auth";
import { getIdea } from "@/lib/baskets/ideas-data";
import { MAX_BASKET_STOCKS, basketStock, dominantIndustry, getIndustryBasket, listBasketUniverse, type BasketStock } from "@/lib/baskets/industry";
import { getVisibleBasket } from "@/lib/baskets/store";
import { parseWeights } from "@/lib/baskets/strategy";
import { compareProps, pickerProps } from "@/lib/baskets/page-props";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats } from "@/lib/baskets/projection-risk-data";
import { primarySector } from "@/lib/sector-content";

export const metadata = { title: "Create a basket", robots: { index: false, follow: false } };

type Search = { with?: string; idea?: string; from?: string; wt?: string; cw?: string };

// Create basket: the basket page itself, unsaved. Pick an industry or the watchlist on top, add
// stocks, take some off; the returns and chart follow; "Create basket" saves it. Nothing is saved
// before that, so every "start from" path opens here prefilled rather than saving a basket first:
//   ?from=industry:<slug>  an industry or policy basket's "Copy to my baskets"
//   ?from=idea:<id>        a rule-based basket's "Copy to my baskets" (also the older ?idea=<id>)
//   ?from=basket:<id>      a shared basket's "Copy to my baskets"
//   ?from=watchlist        the watchlist's "Save as a basket" (also the older ?with=watchlist)
//   ?with=<slug>           opens empty on that industry
// A link with custom weights (wt=custom&cw=...) starts from those stocks, so a reload or a shared
// link keeps them. A start with more stocks than a basket holds takes the first ones and says so.
export default async function NewBasketPage({ searchParams }: { searchParams: Promise<Search> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    // Back to the same draft after signing in, with every parameter it had.
    const back = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && !!e[1])).toString();
    redirect(`/login?next=${encodeURIComponent(`/baskets/new${back ? `?${back}` : ""}`)}`);
  }
  const from = sp.from ?? (sp.idea ? `idea:${sp.idea}` : sp.with === "watchlist" ? "watchlist" : "");
  const cut = from.indexOf(":");
  const kind = cut < 0 ? from : from.slice(0, cut);
  const ref = cut < 0 ? "" : from.slice(cut + 1);

  const picker = await pickerProps(user.id).catch((e: unknown) => {
    console.error("[baskets/new] loading the watchlist failed", e);
    return null;
  });
  const universe = picker?.universe ?? listBasketUniverse();
  const watchlist = picker?.watchlist ?? [];
  const listed = (tickers: string[]) => tickers.map((t) => basketStock(t)).filter((s): s is BasketStock => s !== null);

  const idea = kind === "idea" && ref ? ((await getIdea(ref).catch(() => null))?.idea ?? null) : null;
  const ind = kind === "industry" ? getIndustryBasket(ref) : null;
  const src = kind === "basket" && ref ? await getVisibleBasket(ref, user.id).catch(() => null) : null;
  const linked = sp.wt === "custom" ? Object.keys(parseWeights(sp.cw ?? null) ?? {}) : [];

  let all: BasketStock[] = [];
  let name = "";
  let description: string | null = null;
  let back = { href: "/baskets", label: "Baskets" };
  let industry: string | null = getIndustryBasket(sp.with ?? "")?.slug ?? null;
  let unlistedLeft = 0;
  if (idea) {
    all = listed(idea.stocks.map((s) => s.ticker));
    name = idea.title;
    description = `Starting from the ${idea.title} rule-based basket. Add stocks from any industry or policy, take off the ones you don’t want, then create it as your basket.`;
    back = { href: `/baskets/ideas/${idea.id}`, label: idea.title };
    industry = dominantIndustry(all.map((s) => s.ticker));
  } else if (ind) {
    const word = ind.category === "policy" ? "policy" : "industry";
    all = ind.stocks;
    name = `My ${ind.name} basket`;
    description = `Starting from the ${ind.name} ${word} basket. Take off the stocks you don’t want, add others, then create it as your basket.`;
    back = { href: `/baskets/industry/${ind.slug}`, label: `${ind.name} ${word} basket` };
    industry = ind.slug;
  } else if (src) {
    all = listed(src.items.map((i) => i.ticker));
    unlistedLeft = src.items.length - all.length;
    name = (src.isOwner ? `${src.name} (copy)` : src.name).slice(0, 60);
    description = `Starting from “${src.name}”. Change it as you like, then create it as your basket.`;
    back = { href: `/baskets/${src.id}`, label: src.name };
    industry = src.sourceSector ?? dominantIndustry(all.map((s) => s.ticker));
  } else if (kind === "watchlist") {
    all = listed(watchlist);
    name = "My watchlist basket";
    description = "Starting from your watchlist. Take off the stocks you don’t want, add others, then create it as your basket.";
    back = { href: "/watchlist", label: "Watchlist" };
    industry = dominantIndustry(all.map((s) => s.ticker));
  } else if (linked.length) {
    all = listed(linked);
  }
  const stocks = all.slice(0, MAX_BASKET_STOCKS);
  const notice = [
    all.length > stocks.length ? `Added ${stocks.length} of ${all.length}: a basket holds up to ${MAX_BASKET_STOCKS} stocks.` : null,
    unlistedLeft > 0 ? `${unlistedLeft} stock${unlistedLeft === 1 ? "" : "s"} no longer listed in our maps ${unlistedLeft === 1 ? "was" : "were"} left out.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl lg:max-w-page flex-1 flex-col gap-4 px-5 py-14">
        <Link href={back.href} className="self-start text-xs font-semibold text-accent hover:underline">
          &larr; {back.label}
        </Link>
        <BasketDetail
          mode="draft"
          id="new"
          name={name}
          description={description}
          stocks={stocks}
          addPrices={{}}
          weighting={src?.weighting ?? "equal"}
          customWeights={src?.weights ?? null}
          isOwner
          isPublic={false}
          signedIn
          universe={universe}
          watchlist={watchlist}
          // A saved basket backtests every stock from the period's first day (it doesn't keep "from
          // listing"), so a copy of Recent listings opens on the usual 1Y rather than its 2Y range.
          initialRange={idea && !idea.joinAtListing ? idea.range : undefined}
          sourceSector={ind?.slug ?? src?.sourceSector ?? null}
          // From the watchlist each stock keeps its home industry, the one its watchlist card names
          // (primarySector), rather than reading as a role in whichever industry most of them share.
          pickedFrom={
            src
              ? Object.fromEntries(src.items.flatMap((i) => (i.pickedFrom ? [[i.ticker, i.pickedFrom]] : [])))
              : kind === "watchlist"
                ? Object.fromEntries(stocks.flatMap((s) => [[s.ticker, primarySector(s.ticker)] as const].filter((e): e is [string, string] => e[1] != null)))
                : undefined
          }
          notice={notice || null}
          {...compareProps(industry)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
