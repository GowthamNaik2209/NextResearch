// Covered companies' material corporate filings, live from NSE's announcements API (public, no
// key), for /updates?view=filings and /watchlist?feed=filings. Which filings count, and under which
// chip, is src/lib/filings/classify.ts.
//
//   Updates    one market-wide call for the last 7 days (every NSE company, several MB), kept to
//              covered companies; a theme is then a filter in memory.
//   Watchlist  one call per saved stock for the last 30 days (a few KB each).
//
// Results are memoised in-process for 15 minutes with cached() - not Next's fetch cache, whose 2 MB
// item limit the market-wide answer is over. There is no curated fallback: when NSE doesn't answer,
// `live` is false and the page says so (filings can't be stood in for).
import { cached } from "./cache";
import { fetchText } from "@/lib/flows/nse";
import { parseAnnouncements, type Filing, type FilingType } from "@/lib/filings/classify";
import { CORE_CENTRALITY, listCompanyMetrics, sectorCompanyMetrics, type CompanyMetrics } from "@/lib/sector-content/insights";

export type FilingItem = Filing & { sectorSlug: string; sectorName: string };
export type FilingsResult = { items: FilingItem[]; live: boolean };

const TTL_MS = 15 * 60_000;
const API = "https://www.nseindia.com/api/corporate-announcements?index=equities";
export const UPDATES_DAYS = 7;
export const WATCHLIST_DAYS = 30;

const pad2 = (n: number) => String(n).padStart(2, "0");
const ddmmyyyy = (d: Date) => `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;

/** The last `days` days, today in India included, as NSE's from_date / to_date (DD-MM-YYYY). */
export function nseRange(days: number, now = new Date()): { from: string; to: string } {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const to = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from: ddmmyyyy(from), to: ddmmyyyy(to) };
}

/** A body that is JSON, parsed; null for anything else (an Access Denied page, an empty body). */
export function readJson(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Material filings for one URL, or null when NSE didn't answer with JSON. */
async function load(url: string): Promise<Filing[] | null> {
  const text = await fetchText(url, "application/json");
  const json = readJson(text);
  if (!Array.isArray(json)) {
    console.warn(`filings: NSE gave no data for ${url} (${text == null ? "request failed" : `body ${text.slice(0, 60)}`})`);
    return null;
  }
  return parseAnnouncements(json);
}

const tag = (f: Filing, c: Pick<CompanyMetrics, "sectorSlug" | "sectorName">): FilingItem => ({ ...f, sectorSlug: c.sectorSlug, sectorName: c.sectorName });

/** The company pool, as the news feed uses it: core companies only, each under its home theme. */
function pool(sectorSlug?: string): Map<string, CompanyMetrics> {
  const list = sectorSlug ? sectorCompanyMetrics(sectorSlug) : listCompanyMetrics();
  return new Map(list.filter((c) => c.centrality >= CORE_CENTRALITY).map((c) => [c.ticker, c]));
}

const emptyCounts = (): Record<FilingType, number> => ({ results: 0, orders: 0, deals: 0, payouts: 0, ratings: 0, management: 0, other: 0 });

/** Every listed covered company, in any theme: what the market-wide answer is kept to before caching. */
const covered = () => new Set(listCompanyMetrics().map((c) => c.ticker));

/** Calls `fn` on every item, at most `limit` at a time. */
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/** Latest filings across covered companies (or one theme's), with each chip's count before the type filter. */
export async function getLatestFilings({ sectorSlug, type, limit = 30 }: { sectorSlug?: string; type?: FilingType; limit?: number } = {}): Promise<FilingsResult & { counts: Record<FilingType, number> }> {
  const { from, to } = nseRange(UPDATES_DAYS);
  // Kept to covered companies before caching: the full answer covers every NSE company (several MB).
  const all = await cached(`filings:market:${from}:${to}`, TTL_MS, async () => {
    const got = await load(`${API}&from_date=${from}&to_date=${to}`);
    if (!got) return null;
    const ours = covered();
    return got.filter((f) => ours.has(f.ticker));
  });
  const counts = emptyCounts();
  if (!all) return { items: [], live: false, counts };
  const companies = pool(sectorSlug);
  const mine = all.filter((f) => companies.has(f.ticker));
  for (const f of mine) counts[f.type]++;
  const items = mine
    .filter((f) => !type || f.type === type)
    .slice(0, limit)
    .map((f) => tag(f, companies.get(f.ticker)!));
  return { items, live: true, counts };
}

/** The last 30 days' filings for specific stocks (a watchlist), newest first. */
export async function getFilingsForTickers(tickers: string[], limit = 20): Promise<FilingsResult> {
  const { from, to } = nseRange(WATCHLIST_DAYS);
  const home = new Map(listCompanyMetrics().map((c) => [c.ticker, c]));
  // Four at a time, so a long watchlist doesn't fire dozens of requests at NSE at once.
  const per = await pooled([...new Set(tickers)], 4, (t) =>
    cached(`filings:sym:${t}:${from}:${to}`, TTL_MS, () => load(`${API}&symbol=${encodeURIComponent(t)}&from_date=${from}&to_date=${to}`))
  );
  // Live when NSE answered for at least one stock; a stock it refused simply shows nothing.
  const live = per.some((p) => p !== null);
  const items = per
    .flatMap((p) => p ?? [])
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map((f) => tag(f, home.get(f.ticker) ?? { sectorSlug: "", sectorName: "" }));
  return { items, live };
}
