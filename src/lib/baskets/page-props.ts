// Server-side props every basket page passes to <BasketDetail>.
import { BENCHMARKS, MARKET_BENCHMARKS, sectorBenchmarks } from "@/lib/sector-content/benchmarks";
import { prisma } from "@/lib/prisma";
import { getIndustryBasket, listBasketUniverse, listIndustryBaskets } from "./industry";
import { memoByFinancials } from "@/lib/financials/store";
import { basketCases } from "./projection-data";

// Each industry basket's projected return at both weightings (the chart's compared lines when
// Projections is on), worked out here so the page needn't load their stocks.
const industryCases = memoByFinancials(() => new Map(listIndustryBaskets().map((b) => [b.slug, { equal: basketCases(b.stocks, "equal"), mcap: basketCases(b.stocks, "mcap") }])));

export function compareProps(industrySlug: string | null) {
  const ind = industrySlug ? getIndustryBasket(industrySlug) : null;
  return {
    industries: listIndustryBaskets().map(({ slug, name, icon }) => ({ slug, name, icon, proj: industryCases().get(slug) })),
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
