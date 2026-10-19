// Server-side props every basket page passes to <BasketDetail>.
import { BENCHMARKS, MARKET_BENCHMARKS, sectorBenchmarks } from "@/lib/sector-content/benchmarks";
import { prisma } from "@/lib/prisma";
import { getIndustryBasket, listBasketUniverse, listIndustryBaskets } from "./industry";

export function compareProps(industrySlug: string | null) {
  const ind = industrySlug ? getIndustryBasket(industrySlug) : null;
  return {
    industries: listIndustryBaskets().map(({ slug, name, icon }) => ({ slug, name, icon })),
    compareSlug: ind?.slug ?? null,
    compareName: ind?.name ?? null,
    indices: ind ? sectorBenchmarks(ind.slug) : [],
    market: MARKET_BENCHMARKS.map((id) => BENCHMARKS[id]),
  };
}

/** What the owner's stock picker needs: every listed company, and their watchlist. */
export async function pickerProps(userId: string) {
  const rows = await prisma.watchlist.findMany({ where: { userId }, include: { company: { select: { ticker: true } } }, orderBy: { addedAt: "desc" } });
  return { universe: listBasketUniverse(), watchlist: rows.map((r) => r.company.ticker) };
}
