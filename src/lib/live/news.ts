// Latest headlines per company, from Google News RSS (public, no key) - the live replacement
// for the static curated set. Every function degrades to the curated seed news
// (sector-content/insights.ts) when the live feed returns nothing, so no screen is ever empty
// because an upstream is down.
//
// Caching: the fetch itself is cached by Next's data cache for 15 minutes (shared across
// serverless instances), and parsed per-company results are also memoised in-process.
import { cached } from "./cache";
import { listCompanyMetrics, listNews, newsForTickers, type CompanyMetrics, type NewsItem } from "@/lib/sector-content/insights";

const REVALIDATE_S = 15 * 60;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const MAX_AGE_DAYS = 30;
// Not company news: price-prediction pages, "stock analysis" boilerplate, and multi-stock
// tip lists ("Stocks to watch", "top 3 stocks to buy") - the latter also read as advice.
const NOISE_TITLE =
  /\b(price target|forecast|prediction|stock analysis|share price (today|live|history)|stocks? to (watch|buy|sell)|top \d+ stocks|stock picks?|buy or sell)\b/i;

export type Headline = { headline: string; source: string; url: string; ts: number };

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };
const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
const tag = (item: string, name: string) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

/** Parse a Google News RSS document into headlines (newest first, noise and bad dates dropped). */
export function parseGoogleNewsRss(xml: string, now = Date.now()): Headline[] {
  const out: Headline[] = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const source = tag(item, "source") || "News";
    // Google appends " - Source" to every title; our UI shows the source separately.
    let headline = tag(item, "title");
    if (headline.endsWith(` - ${source}`)) headline = headline.slice(0, -(source.length + 3));
    const url = tag(item, "link");
    const ts = Date.parse(tag(item, "pubDate"));
    if (!headline || !url || !Number.isFinite(ts) || ts > now + 3_600_000) continue;
    if (NOISE_TITLE.test(headline)) continue;
    out.push({ headline, source, url, ts });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/** "3h ago" for today's items, "12 Oct 2026" for older ones. */
export function formatNewsDate(ts: number, now = Date.now()): string {
  const hours = (now - ts) / 3_600_000;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// null = the request failed (so the cache only remembers it briefly); [] = it worked but found nothing.
async function fetchHeadlines(companyName: string): Promise<Headline[] | null> {
  // Quoted name keeps results on-topic; the keyword OR-group biases toward market news.
  const q = `"${companyName}" (shares OR stock OR results OR order OR earnings) when:${MAX_AGE_DAYS}d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), next: { revalidate: REVALIDATE_S } });
    return res.ok ? parseGoogleNewsRss(await res.text()) : null;
  } catch {
    return null;
  }
}

// Words too common in company names to identify one on their own ("Bharat", "Industries", ...).
const GENERIC = new Set(
  ("industries industrial solutions technologies technology engineering systems international infrastructure limited energy power electric " +
    "electronics services enterprises corporation company holdings global india indian private research equipment components products " +
    "manufacturing auto bharat national micro precision advanced").split(" ")
);
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Is this headline actually about the company? Google News matches the body text too, so a
 * market wrap that merely lists the stock would otherwise show up. The headline itself must
 * contain the company's opening words ("CG Power"), a distinctive word from its name
 * ("Motherson"), or its ticker.
 */
export function isAbout(headline: string, company: { name: string; ticker: string }): boolean {
  const h = ` ${normalize(headline)} `;
  const words = normalize(company.name.replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
  const opening = words.slice(0, 2).join(" ");
  const distinctive = words.filter((w) => w.length >= 6 && !GENERIC.has(w));
  return [opening, company.ticker.toLowerCase(), ...distinctive].some((k) => k.length >= 3 && h.includes(` ${k} `));
}

const toItem = (h: Headline, c: CompanyMetrics): NewsItem => ({
  ticker: c.ticker,
  company: c.name,
  sectorSlug: c.sectorSlug,
  sectorName: c.sectorName,
  date: formatNewsDate(h.ts),
  ts: h.ts,
  headline: h.headline,
  source: h.source,
  url: h.url,
});

const metricsByTicker = () => new Map(listCompanyMetrics().map((c) => [c.ticker, c]));

/** Run `fn` over `items` with at most `limit` in flight (be polite to the upstream). */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

const dedupe = (items: NewsItem[]) => {
  const seen = new Set<string>();
  return items.filter((n) => {
    const key = n.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function liveForCompany(c: CompanyMetrics): Promise<NewsItem[]> {
  const headlines = await cached(`news:${c.ticker}`, REVALIDATE_S * 1000, () => fetchHeadlines(c.name));
  return (headlines ?? []).filter((h) => isAbout(h.headline, c)).map((h) => toItem(h, c));
}

export type NewsResult = { items: NewsItem[]; live: boolean };

/** Latest headlines for one company; falls back to its curated headlines. */
export async function getCompanyNews(ticker: string, limit = 8): Promise<NewsResult> {
  const c = metricsByTicker().get(ticker);
  const live = c ? dedupe(await liveForCompany(c)).slice(0, limit) : [];
  if (live.length > 0) return { items: live, live: true };
  return { items: newsForTickers([ticker]).slice(0, limit), live: false };
}

/** Latest headlines across a set of tickers (e.g. a watchlist), newest first. */
export async function getNewsForTickers(tickers: string[], limit = 8): Promise<NewsResult> {
  const byTicker = metricsByTicker();
  const companies = tickers.map((t) => byTicker.get(t)).filter((c): c is CompanyMetrics => !!c);
  const live = dedupe((await mapPool(companies, 6, liveForCompany)).flat()).sort((a, b) => b.ts - a.ts).slice(0, limit);
  if (live.length > 0) return { items: live, live: true };
  return { items: newsForTickers(tickers).slice(0, limit), live: false };
}

// Which companies stand in for a sector when building a feed: the biggest by market cap
// (their news is what investors follow, and it bounds the number of upstream requests).
const PER_SECTOR_ALL = 5;
const PER_SECTOR_SINGLE = 12;

/** Latest headlines for the whole platform, or one sector, newest first. */
export async function getLatestNews({ sectorSlug, limit = 20 }: { sectorSlug?: string; limit?: number } = {}): Promise<NewsResult> {
  const bySector = new Map<string, CompanyMetrics[]>();
  for (const c of listCompanyMetrics()) {
    if (sectorSlug && c.sectorSlug !== sectorSlug) continue;
    bySector.set(c.sectorSlug, [...(bySector.get(c.sectorSlug) ?? []), c]);
  }
  const perSector = sectorSlug ? PER_SECTOR_SINGLE : PER_SECTOR_ALL;
  const companies = [...bySector.values()].flatMap((cs) => cs.sort((a, b) => (b.mcapCr ?? 0) - (a.mcapCr ?? 0)).slice(0, perSector));
  const live = dedupe((await mapPool(companies, 6, liveForCompany)).flat()).sort((a, b) => b.ts - a.ts).slice(0, limit);
  if (live.length >= 3) return { items: live, live: true };
  const curated = listNews().filter((n) => !sectorSlug || n.sectorSlug === sectorSlug);
  return { items: curated.slice(0, limit), live: false };
}
