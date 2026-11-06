// Server side of "P/E in context" (./pe-context.ts): the stock's own month-end P/E history from the
// price store, kept in Next's shared data cache for a day, plus today's P/E and its primary industry's
// median from the company table (read fresh, so they move with each published refresh). Callers
// await ensureFinancials() first.
import { unstable_cache } from "next/cache";
import { basketChart } from "@/lib/prices/store";
import { companyFinancials, getSector } from "@/lib/sector-content";
import { companySlug, getCompanyPage, primaryIndustry } from "@/lib/sector-content/companies";
import { basketStock, getIndustryBasket } from "@/lib/baskets/industry";
import { isReit } from "@/components/stock/merge";
import { parseCrore } from "@/lib/sector-content/core";
import { MIN_INDEX_PEERS, MIN_PEERS, historyOf, medianOf, peHistory, peSamples, type PeContext, type PeHistory, type PeIndustry, type PeSample } from "./pe-context";

const DAY_SECONDS = 86_400;

/** The company table's price label ("Rs 395") as a number. */
const tablePrice = (s: string | null | undefined) => {
  const n = parseFloat((s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Keyed by ticker and the inputs that set the share count and profits, so a new FY or a corrected
// market cap gives a new entry rather than a day-old one.
const cachedHistory = unstable_cache(
  async (ticker: string, mcapCr: number, np: (number | null)[], price: number | null): Promise<PeHistory | null> => {
    const pts = (await basketChart(ticker, "5Y"))?.points;
    return pts?.length ? peHistory(pts, mcapCr, np, price) : null;
  },
  ["pe-history-5y-v2"],
  { revalidate: DAY_SECONDS },
);

/**
 * The covered stocks the company's P/E is compared with: those in its primary industry
 * (primaryIndustry), or, for a company that falls back to the Nifty 50, those in its bracket of the
 * index (SBI with the Nifty 50's Financial Services stocks), with the fewest needed for a median.
 */
export function pePeers(ticker: string) {
  const page = getCompanyPage(companySlug(ticker));
  if (!page) return null;
  const a = primaryIndustry(page);
  const basket = getIndustryBasket(a.sectorSlug);
  if (!basket) return null;
  const all = basket.stocks.map((s) => ({ ticker: s.ticker, name: s.name, pe: s.pe }));
  if (getSector(a.sectorSlug)?.category !== "index") return { slug: basket.slug, name: basket.name, bracket: false, peers: all, min: MIN_PEERS };
  const inBracket = (t: string) => !!getCompanyPage(companySlug(t))?.appearances.some((b) => b.sectorSlug === a.sectorSlug && b.zoneId === a.zoneId);
  return { slug: basket.slug, name: `${a.zoneLabel} (${basket.name})`, bracket: true, peers: all.filter((s) => inBracket(s.ticker)), min: MIN_INDEX_PEERS };
}

/** The median P/E of those covered stocks that have one (pePeers' minimum needed). */
export function industryPe(ticker: string): PeIndustry | null {
  const home = pePeers(ticker);
  if (!home) return null;
  const pes = home.peers.map((s) => s.pe).filter((v): v is number => v != null);
  const median = medianOf(pes);
  return median != null && pes.length >= home.min ? { slug: home.slug, name: home.name, median, n: pes.length } : null;
}

/** Everything the method page's worked example shows for one stock: each month-end sample and each peer. */
export type PeWorking = {
  pe: number | null;
  mcapCr: number | null;
  /** The company table's price, which its market cap is at (the share count is worked from it). */
  price: number | null;
  lastClose: number | null;
  lastDay: string | null;
  samples: PeSample[];
  history: PeHistory | null;
  industry: PeIndustry | null;
  homeName: string | null;
  /** Fewest peers with a P/E needed for the median. */
  minPeers: number;
  /** The peers are a bracket of the Nifty 50, not an industry. */
  bracket: boolean;
  peers: { ticker: string; name: string; pe: number | null }[];
};

export async function peWorking(ticker: string): Promise<PeWorking | null> {
  const f = companyFinancials(ticker);
  const stock = basketStock(ticker);
  if (!f || !stock) return null;
  const mcap = parseCrore(f.mcap);
  const pts = (await basketChart(ticker, "5Y").catch(() => null))?.points ?? [];
  const price = tablePrice(f.price);
  const samples = peSamples(pts, mcap, f.np, price);
  const home = pePeers(ticker);
  return {
    pe: stock.pe,
    mcapCr: mcap,
    price,
    lastClose: pts.at(-1)?.c ?? null,
    lastDay: pts.at(-1)?.t ?? null,
    samples,
    history: historyOf(samples),
    industry: industryPe(ticker),
    homeName: home?.name ?? null,
    minPeers: home?.min ?? MIN_PEERS,
    bracket: home?.bracket ?? false,
    peers: (home?.peers ?? []).slice().sort((a, b) => (a.pe ?? Infinity) - (b.pe ?? Infinity)),
  };
}

/** Null for an unknown ticker or a REIT (P/E isn't meaningful for a trust). */
export async function peContext(ticker: string): Promise<PeContext | null> {
  const f = companyFinancials(ticker);
  const stock = basketStock(ticker);
  if (!f || !stock || isReit(ticker)) return null;
  const mcap = parseCrore(f.mcap);
  const history = mcap && f.np?.length ? await cachedHistory(ticker, mcap, f.np, tablePrice(f.price)).catch(() => null) : null;
  return { pe: stock.pe, history, industry: industryPe(ticker) };
}
