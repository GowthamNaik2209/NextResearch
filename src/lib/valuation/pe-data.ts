// Server side of "P/E in context" (./pe-context.ts): the stock's own month-end P/E history from the
// price store, kept in Next's shared data cache for a day, plus today's P/E and its home industry's
// median from the company table (read fresh, so they move with each published refresh). Callers
// await ensureFinancials() first.
import { unstable_cache } from "next/cache";
import { basketChart } from "@/lib/prices/store";
import { companyFinancials } from "@/lib/sector-content";
import { companySlug, getCompanyPage, primaryAppearance } from "@/lib/sector-content/companies";
import { basketStock, getIndustryBasket } from "@/lib/baskets/industry";
import { isReit } from "@/components/stock/merge";
import { parseCrore } from "@/lib/sector-content/core";
import { MIN_PEERS, historyOf, medianOf, peHistory, peSamples, type PeContext, type PeHistory, type PeIndustry, type PeSample } from "./pe-context";

const DAY_SECONDS = 86_400;

// Keyed by ticker and the inputs that set the share count and profits, so a new FY or a corrected
// market cap gives a new entry rather than a day-old one.
const cachedHistory = unstable_cache(
  async (ticker: string, mcapCr: number, np: (number | null)[]): Promise<PeHistory | null> => {
    const pts = (await basketChart(ticker, "5Y"))?.points;
    return pts?.length ? peHistory(pts, mcapCr, np) : null;
  },
  ["pe-history-5y-v1"],
  { revalidate: DAY_SECONDS },
);

/** The covered stocks in the company's home industry (its primary appearance) with their P/Es. */
function homePeers(ticker: string) {
  const page = getCompanyPage(companySlug(ticker));
  const basket = page ? getIndustryBasket(primaryAppearance(page).sectorSlug) : null;
  return basket ? { basket, peers: basket.stocks.map((s) => ({ ticker: s.ticker, name: s.name, pe: s.pe })) } : null;
}

/** The home industry's median P/E among covered stocks with one (MIN_PEERS needed). */
export function industryPe(ticker: string): PeIndustry | null {
  const home = homePeers(ticker);
  if (!home) return null;
  const pes = home.peers.map((s) => s.pe).filter((v): v is number => v != null);
  const median = medianOf(pes);
  return median != null && pes.length >= MIN_PEERS ? { slug: home.basket.slug, name: home.basket.name, median, n: pes.length } : null;
}

/** Everything the method page's worked example shows for one stock: each month-end sample and each peer. */
export type PeWorking = {
  pe: number | null;
  mcapCr: number | null;
  lastClose: number | null;
  lastDay: string | null;
  samples: PeSample[];
  history: PeHistory | null;
  industry: PeIndustry | null;
  homeName: string | null;
  peers: { ticker: string; name: string; pe: number | null }[];
};

export async function peWorking(ticker: string): Promise<PeWorking | null> {
  const f = companyFinancials(ticker);
  const stock = basketStock(ticker);
  if (!f || !stock) return null;
  const mcap = parseCrore(f.mcap);
  const pts = (await basketChart(ticker, "5Y").catch(() => null))?.points ?? [];
  const samples = peSamples(pts, mcap, f.np);
  const home = homePeers(ticker);
  return {
    pe: stock.pe,
    mcapCr: mcap,
    lastClose: pts.at(-1)?.c ?? null,
    lastDay: pts.at(-1)?.t ?? null,
    samples,
    history: historyOf(samples),
    industry: industryPe(ticker),
    homeName: home?.basket.name ?? null,
    peers: (home?.peers ?? []).slice().sort((a, b) => (a.pe ?? Infinity) - (b.pe ?? Infinity)),
  };
}

/** Null for an unknown ticker or a REIT (P/E isn't meaningful for a trust). */
export async function peContext(ticker: string): Promise<PeContext | null> {
  const f = companyFinancials(ticker);
  const stock = basketStock(ticker);
  if (!f || !stock || isReit(ticker)) return null;
  const mcap = parseCrore(f.mcap);
  const history = mcap && f.np?.length ? await cachedHistory(ticker, mcap, f.np).catch(() => null) : null;
  return { pe: stock.pe, history, industry: industryPe(ticker) };
}
