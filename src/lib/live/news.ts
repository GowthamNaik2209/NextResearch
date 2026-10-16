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
// Entertainment that shares a company's name (Netflix's "Lupin").
const NOT_BUSINESS = /\b(netflix|season \d+|episode|web series|trailer|box office)\b/i;
const NOT_BUSINESS_SOURCES = new Set(["IMDb"]);

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
    if (NOISE_TITLE.test(headline) || NOT_BUSINESS.test(headline) || NOT_BUSINESS_SOURCES.has(source)) continue;
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

// Words too common in company names to identify one on their own ("Bharat", "Industries",
// "Forgings", "Motors", ...).
const GENERIC = new Set(
  ("industries industrial solutions technologies technology engineering systems international infrastructure limited energy power electric " +
    "electronics services enterprises corporation company holdings global india indian private research equipment components products " +
    "manufacturing auto bharat national micro precision advanced of " +
    "forgings mobility automation fasteners motors passenger vehicles wiring exchange semiconductor fluorine fluorochemicals engines " +
    "transformers cables bearings peripherals wagons microsystems future finance railway projects techno equipments container " +
    "shipbuilders shipyard engineers authority welding dynamics premier explosives patterns microwave defence brothers aerospace aviation " +
    "aeronautics telecom digital telematics networks innovations communications teleservices telephone renewable renewables energies " +
    "system orient sterling garden hindustan gujarat mahanagar cochin mishra towers " +
    "pharmaceutical pharmaceuticals pharma laboratories labs lifesciences life sciences healthcare health biotech biosciences " +
    "hospitals scientific chemicals drugs active organics worldwide institute biological " +
    "realty trust reit estates developers properties parks business office mills cement cements steel tubes paints ceramics " +
    "plyboards panels glass pipes fittings financiers housing contracts infraprojects knowledge").split(" ")
);
// "&" and "and" are dropped so "Transformers and Rectifiers" matches "Transformers & Rectifiers".
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Business-group (family) names: several listed companies share them, so on their own they don't
// say which one ("Mahindra Holidays" is not M&M, "Kirloskar Brothers" is not Kirloskar Oil Engines).
const GROUP = new Set(
  ("mahindra tata adani bajaj birla kirloskar motherson minda bharti jsw reliance godrej jindal vedanta sterlite apollo kalpataru " +
    "texmaco waaree borosil cyient hinduja piramal torrent aarti finolex bosch embassy brookfield supreme").split(" ")
);
// Short names headlines use, including a group name that alone conventionally means one company
// here ("Mahindra" = M&M).
const ALIASES: Record<string, string[]> = {
  "M&M": ["mahindra"],
  MOTHERSON: ["motherson"],
  CYIENT: ["cyient"],
  WAAREEENER: ["waaree"],
  STLTECH: ["sterlite tech"],
  FLUOROCHEM: ["gujarat fluoro"],
  SUNPHARMA: ["sun pharma"],
  TORNTPHARM: ["torrent pharma"],
  ZYDUSLIFE: ["zydus"],
  IPCALAB: ["ipca"],
  ALKEM: ["alkem"],
  DRREDDY: ["dr reddys"],
  DIVISLAB: ["divis"],
  LODHA: ["lodha", "macrotech"],
  EMBASSY: ["embassy reit"],
  BIRET: ["brookfield reit", "brookfield india reit"],
  PHOENIXLTD: ["phoenix mills"],
  SBIN: ["sbi"],
  AAVAS: ["aavas"],
};
// Tickers that are ordinary words ("US Embassy ..."), so they don't identify the company on their own.
const WORD_TICKERS = new Set(["EMBASSY"]);
// Separately listed companies, outside our coverage, whose names contain one of ours. A match
// that sits inside one of these (or inside another covered company's name) doesn't count.
const OTHER_COMPANIES = [
  "Tech Mahindra", "Mahindra Holidays", "Club Mahindra", "Mahindra Lifespace", "Mahindra Logistics", "Mahindra Finance",
  "Mahindra & Mahindra Financial", "M&M Financial", "M&M Finance", "Mahindra Susten", "Mahindra CIE", "Mahindra EPC",
  "Tata Motors Commercial", "Tata Motors CV", "Siemens Energy", "Waaree Renewable", "Borosil Ltd", "Kirloskar Ferrous",
  "Kirloskar Industries", "Motherson Sumi Systems", "Indian Railway Catering", "Mahanagar Gas",
  "Sun Pharma Advanced Research", "Torrent Power", "Zydus Wellness", "Apollo Tyres", "Piramal Enterprises", "Piramal Finance",
  "Aarti Industries", "Abbott Laboratories", "Embassy Developments", "Bosch Ltd", "SBI Life", "SBI Cards", "SBI Card",
  "SBI Funds", "SBI Mutual Fund", "SBI General", "HDFC Life", "HDFC AMC", "Brookfield Asset Management",
].map(normalize);

const nameWords = (name: string) => normalize(name.replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
// The company's opening words: the first two, extended while they are all generic ("Indian
// Railway Finance ..." is not identified by "Indian Railway").
function openingOf(words: string[]): string {
  let n = Math.min(2, words.length);
  while (n < words.length && words.slice(0, n).every((w) => GENERIC.has(w))) n++;
  return words.slice(0, n).join(" ");
}

let rivalCache: { ticker: string; name: string; phrases: string[] }[] | null = null;
const rivals = () =>
  (rivalCache ??= listCompanyMetrics().map((c) => {
    const words = nameWords(c.name);
    return { ticker: c.ticker, name: words.join(" "), phrases: [words.join(" "), openingOf(words)] };
  }));

/** Every [start, end) span in `h` where the phrase occurs as whole words. */
function spans(h: string, phrase: string): [number, number][] {
  const out: [number, number][] = [];
  for (let i = h.indexOf(` ${phrase} `); i >= 0; i = h.indexOf(` ${phrase} `, i + 1)) out.push([i, i + phrase.length + 2]);
  return out;
}

/**
 * Is this headline actually about the company? Google News matches the body text too, so a
 * market wrap that merely lists the stock would otherwise show up. The headline itself must
 * contain the company's opening words ("CG Power"), a distinctive word from its name
 * ("Ramkrishna"), its ticker, or an alias ("Mahindra" for M&M) - and that mention must not be
 * part of a longer company name ("Tech Mahindra", "Mahindra Holidays", "Motherson Sumi Wiring").
 */
export function isAbout(headline: string, company: { name: string; ticker: string }): boolean {
  const h = ` ${normalize(headline)} `;
  const words = nameWords(company.name);
  const own = words.join(" ");
  const distinctive = words.filter((w) => w.length >= 6 && !GENERIC.has(w) && !GROUP.has(w));
  const ticker = WORD_TICKERS.has(company.ticker) ? "" : normalize(company.ticker);
  const keys = [openingOf(words), ticker, ...distinctive, ...(ALIASES[company.ticker] ?? [])].filter((k) => k.length >= 3);
  const otherNames = [...rivals().filter((r) => r.ticker !== company.ticker && r.name !== own).flatMap((r) => r.phrases), ...OTHER_COMPANIES];
  const covering = otherNames.filter((p) => !` ${own} `.includes(` ${p} `)).flatMap((p) => spans(h, p));
  return keys.some((k) => spans(h, k).some(([s, e]) => !covering.some(([cs, ce]) => cs <= s && ce >= e && ce - cs > e - s)));
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
// (their news is what investors follow, and it bounds the number of upstream requests),
// discounted by how central the sector is to them - otherwise a mega-cap lender or steel
// maker with a side exposure fills a sector's feed with news about its own business.
const PER_SECTOR_ALL = 5;
const PER_SECTOR_SINGLE = 12;
const feedWeight = (c: CompanyMetrics) => (c.mcapCr ?? 0) * c.centrality;

/** Latest headlines for the whole platform, or one sector, newest first. */
export async function getLatestNews({ sectorSlug, limit = 20 }: { sectorSlug?: string; limit?: number } = {}): Promise<NewsResult> {
  const bySector = new Map<string, CompanyMetrics[]>();
  for (const c of listCompanyMetrics()) {
    if (sectorSlug && c.sectorSlug !== sectorSlug) continue;
    bySector.set(c.sectorSlug, [...(bySector.get(c.sectorSlug) ?? []), c]);
  }
  const perSector = sectorSlug ? PER_SECTOR_SINGLE : PER_SECTOR_ALL;
  const companies = [...bySector.values()].flatMap((cs) => cs.sort((a, b) => feedWeight(b) - feedWeight(a)).slice(0, perSector));
  const live = dedupe((await mapPool(companies, 6, liveForCompany)).flat()).sort((a, b) => b.ts - a.ts).slice(0, limit);
  if (live.length >= 3) return { items: live, live: true };
  const curated = listNews().filter((n) => !sectorSlug || n.sectorSlug === sectorSlug);
  return { items: curated.slice(0, limit), live: false };
}
