// Server side of the basket ideas: each listed stock's five-year closes, turned into the day's
// price facts and run through the idea rules (ideas.ts). The result is kept in Next's data cache,
// shared by every server instance, and rebuilt in the background a few hours after it was made,
// so the lists follow each trading day without a visitor waiting on ~260 price histories.
import { unstable_cache } from "next/cache";
import { listSectors, companyLinkKey, companyLinkExposure, findSupplierByTicker } from "@/lib/sector-content";
import { HISTORY_FROM, getChartWithFallback } from "@/lib/live/yahoo";
import { listBasketUniverse } from "./industry";
import { buildIdeas, priceStat, type Idea, type IdeaStockInfo, type PriceSnapshot, type PriceStat } from "./ideas";

const CONCURRENCY = 10;
// Below this share of stocks with prices the day's run is treated as an upstream outage: it
// throws, so the cache keeps serving the last good lists instead of thin ones.
const MIN_COVERAGE = 0.6;
const REVALIDATE_SECONDS = 4 * 60 * 60;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const STRENGTH = { high: 3, medium: 2, low: 1 } as const;

/** What the rules need from the maps, per listed stock. */
export function ideaStockInfo(): IdeaStockInfo[] {
  // Each stock's strongest place in a layer with only one or two listed suppliers.
  const scarce = new Map<string, NonNullable<IdeaStockInfo["scarce"]>>();
  for (const s of listSectors().filter((x) => !x.muted)) {
    for (const z of s.zones) {
      const listed = new Map<string, number>();
      for (const link of z.suppliers) {
        const t = s.suppliers[companyLinkKey(link)]?.listed ? s.suppliers[companyLinkKey(link)]?.f?.ticker : undefined;
        if (!t) continue;
        const { exposureStrength } = companyLinkExposure(link);
        // The older maps carry no strength: a company placed in a layer is read as medium.
        listed.set(t, Math.max(listed.get(t) ?? 0, exposureStrength ? STRENGTH[exposureStrength] : 2));
      }
      if (listed.size === 0 || listed.size > 2) continue;
      for (const [t, strength] of listed) {
        if (strength < 2) continue;
        const prev = scarce.get(t);
        if (!prev || listed.size < prev.listed || (listed.size === prev.listed && strength > prev.strength)) {
          scarce.set(t, { listed: listed.size, strength, layer: z.label, industry: s.name });
        }
      }
    }
  }
  return listBasketUniverse().map((st) => {
    const f = findSupplierByTicker(st.ticker)?.f;
    const roce = f?.kpi?.[3];
    return {
      ticker: st.ticker,
      name: st.name,
      mcapCr: st.mcapCr,
      roce: typeof roce === "number" && Number.isFinite(roce) ? roce : null,
      screenOut: f?.screenOut,
      industries: st.industries.length,
      notIpo: /\b(REIT|InvIT)\b|Trust\b/i.test(st.name) || st.ticker in HISTORY_FROM,
      scarce: scarce.get(st.ticker) ?? null,
    };
  });
}

async function priceSnapshot(): Promise<PriceSnapshot> {
  const tickers = listBasketUniverse().map((s) => s.ticker);
  const now = Date.now();
  const charts = await mapLimit(tickers, CONCURRENCY, (t) => getChartWithFallback(t, "5Y").catch(() => null));
  const stats: Record<string, PriceStat> = {};
  tickers.forEach((t, i) => {
    const st = charts[i] ? priceStat(charts[i]!.points, now) : null;
    if (st) stats[t] = st;
  });
  if (Object.keys(stats).length < tickers.length * MIN_COVERAGE) throw new Error(`basket ideas: prices for only ${Object.keys(stats).length} of ${tickers.length} stocks`);
  return { asOf: new Date(now).toISOString(), stats };
}

export type IdeasPayload = { asOf: string; ideas: Idea[] };

/** The day's ideas, from the shared cache (rebuilt in the background once it is a few hours old). */
export const getIdeas = unstable_cache(
  async (): Promise<IdeasPayload> => {
    const snap = await priceSnapshot();
    return { asOf: snap.asOf, ideas: buildIdeas(ideaStockInfo(), snap, Date.parse(snap.asOf)) };
  },
  ["basket-ideas-v4"],
  { revalidate: REVALIDATE_SECONDS, tags: ["basket-ideas"] },
);

export async function getIdea(id: string): Promise<{ asOf: string; idea: Idea } | null> {
  const { asOf, ideas } = await getIdeas();
  const idea = ideas.find((i) => i.id === id);
  return idea ? { asOf, idea } : null;
}
