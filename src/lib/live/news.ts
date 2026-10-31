// Latest headlines per company, from Google News RSS (public, no key) - the live replacement
// for the static curated set. Every function degrades to the curated seed news
// (sector-content/insights.ts) when the live feed returns nothing, so no screen is ever empty
// because an upstream is down.
//
// Caching: the fetch itself is cached by Next's data cache for 15 minutes (shared across
// serverless instances), and parsed per-company results are also memoised in-process.
import { cached } from "./cache";
import { formatNewsDate } from "./news-date";

export { formatNewsDate };
import { CORE_CENTRALITY, listCompanyMetrics, listNews, sectorCompanyMetrics, newsForTickers, type CompanyMetrics, type NewsItem } from "@/lib/sector-content/insights";
import { companyLinkExposure, companyLinkKey, listSectors, tickerForSupplier } from "@/lib/sector-content";

const REVALIDATE_S = 15 * 60;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const MAX_AGE_DAYS = 30;
// Not company news: price-prediction pages, "stock analysis" boilerplate, and multi-stock
// tip lists ("Stocks to watch", "top 3 stocks to buy") - the latter also read as advice.
const NOISE_TITLE =
  /\b(price target|forecast|prediction|stock analysis|dividend history|share price (today|live|history)|stocks? to (watch|buy|sell)|top \d+ stocks|stock picks?|buy or sell|target price|price-to-earnings ratio)\b/i;
// Quote / profile pages that Google News indexes as articles: "Tata Motors Limited (TMCV.NS)
// Stock Price, News, Quote & History", "... Share Price Live Today", "Live Stock Price | NSE/BSE".
const QUOTE_PAGE =
  /\((?:NSE|BSE)?:?\s*[A-Z0-9&-]+\.(?:NS|BO)\)|\b(stock|share) price,? (news|quote|chart|live|today)\b|\bquote (&|and) history\b|\b(live|real[- ]time) (stock|share) price\b|\bstock quote\b|\bshare price (&|and) (chart|news)\b|(&|and) history$|\bis rated (strong )?(buy|sell|hold)\b/i;
// Multi-company round-ups: "Q2 results today: DLF, Tata Elxsi, Indus Towers and more",
// "Stocks in news: ...", "Earnings calendar ...". They mention the company in passing.
const ROUNDUP =
  /\b(results|earnings) (today|tomorrow|this week|calendar)\b|\bstocks? in (focus|news)\b|\b(earnings|results) (calendar|preview)\b|\bbuzzing stocks\b|\b\d+ (?:[a-z0-9]+ ){0,2}stocks\b|\bf&o ban\b|\bothers to (post|report|announce)\b/i;
/** A headline whose tail (after ":" or "-") is a list of 3+ names: "Q2 results: DLF, Havells, KEI, ..." */
export function isListHeadline(headline: string): boolean {
  if (ROUNDUP.test(headline)) return true;
  const tail = headline.split(/[:|]\s+/).slice(1).join(" ") || headline;
  if (!/,/.test(tail)) return false;
  const parts = tail
    .split(/\s*,\s*|\s+(?:and|&)\s+/)
    .map((p) => p.replace(/[.…]+$/, "").trim())
    .filter((p) => p && !/^(more|others?|many more|other stocks)$/i.test(p));
  // Three or more short, capitalised, figure-free parts = names, not clauses
  // ("pre-sales up 14%, collections rise, debt falls" is a story, not a list).
  const nameLike = (p: string) => p.split(/\s+/).length <= 4 && /^[A-Z0-9]/.test(p) && !/%|\d{2,}/.test(p);
  // The last part may carry the verb ("..., Urban Company to post earnings").
  const names = nameLike(parts[parts.length - 1] ?? "") ? parts : parts.slice(0, -1);
  return names.length >= 3 && names.every(nameLike);
}
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
    const rawSource = tag(item, "source");
    const source = cleanSource(rawSource) || "News";
    // Google appends " - Source" to every title; our UI shows the source separately.
    let headline = tag(item, "title");
    for (const suffix of [rawSource, source]) if (suffix && headline.endsWith(` - ${suffix}`)) headline = headline.slice(0, -(suffix.length + 3));
    const url = tag(item, "link");
    const ts = Date.parse(tag(item, "pubDate"));
    if (!headline || !url || !Number.isFinite(ts) || ts > now + 3_600_000) continue;
    if (NOISE_TITLE.test(headline) || QUOTE_PAGE.test(headline) || isListHeadline(headline) || NOT_BUSINESS.test(headline) || NOT_BUSINESS_SOURCES.has(source)) continue;
    out.push({ headline, source, url, ts });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/**
 * A publisher name for display. Google sometimes gives the site URL as the source name
 * ("https://www.siam.in/"); show its bare domain ("siam.in") instead.
 */
export function cleanSource(source: string): string {
  const s = source.trim();
  if (!/^(https?:\/\/|www\.)/i.test(s) && !/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?$/i.test(s)) return s;
  try {
    return new URL(/^https?:/i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./i, "");
  } catch {
    return s;
  }
}

// null = the request failed (so the cache only remembers it briefly); [] = it worked but found nothing.
async function fetchHeadlines(companyName: string): Promise<Headline[] | null> {
  // Quoted name keeps results on-topic; the keyword OR-group biases toward market news.
  const q = `"${companyName}" (shares OR stock OR results OR order OR earnings) when:${MAX_AGE_DAYS}d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  // The abort signal covers the request; the race also covers reading the body and Next's data
  // cache (a /updates request once hung for 50+ minutes), so one stuck upstream can't hold a feed.
  const load = (async () => {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), next: { revalidate: REVALIDATE_S } });
    return res.ok ? parseGoogleNewsRss(await res.text()) : null;
  })().catch(() => null);
  return withDeadline(load, FETCH_TIMEOUT_MS + 1000, null);
}

const FETCH_TIMEOUT_MS = 8000;
// A whole feed waits at most this long; companies still loading are left out of this render and
// keep loading into the cache, so the next visit has them. Keeps /updates from taking 10-15 s
// (75 companies, 6 at a time) on a cold cache.
const FEED_BUDGET_MS = 3500;

/** `p`, or `fallback` once `ms` have passed (the promise keeps running). */
function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
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
  GMDCLTD: ["gmdc"],
  MINDACORP: ["minda corp", "spark minda"],
  BHARATFORG: ["bharat forge", "kalyani strategic"],
  CGPOWER: ["cg power", "cg semi"],
  // Nifty 50 names (Oct 2026).
  RELIANCE: ["reliance", "ril", "reliance jio", "reliance retail"],
  KOTAKBANK: ["kotak bank", "kotak mahindra bank"],
  HINDUNILVR: ["hul"],
  HCLTECH: ["hcl tech", "hcltech"],
  INDIGO: ["indigo"],
  ETERNAL: ["zomato", "blinkit"],
  EICHERMOT: ["eicher", "royal enfield"],
  TITAN: ["titan"],
  TRENT: ["zudio"],
  ADANIPORTS: ["apsez"],
  MAXHEALTH: ["max healthcare"],
};
// Headlines that name the company but are about a sibling it no longer owns. Tata Motors
// demerged in Oct 2025: the commercial-vehicle business kept the "Tata Motors Ltd" name (TMCV),
// so "Tata Motors" + CV/truck wording is TMCV's news, not TMPV's.
const NOT_ABOUT: Record<string, RegExp> = {
  TMPV: /\b(tmcv|commercial vehicles?|cvs?|trucks?|buses|iveco|tata motors (ltd|limited) \(tmcv)/i,
  // The word, not the company: weather alerts, traffic lights.
  AMBER: /\bamber (alert|warning|light|signal|zone)/i,
  // "Below poverty line" ration cards and households.
  // The US region, not the company.
  MIDWESTLTD: /\b(us|u s|american|the) midwest\b|\bmidwest (farmers?|states?|region|storms?|weather|drought|crops?)/i,
  // The 2009 Pricol workers' case (convicts, prisoners), not the company's business.
  PRICOLLTD: /\b(convicts?|prisoners?|life sentence|murder)\b/i,
  // Vodafone Group plc and its other operators, not the Indian listing.
  IDEA: /\bvodafone (group|plc|uk|spain|germany|egypt|turkey)\b|\bxavier niel\b/i,
  BPL: /\bbpl (cards?|card ?holders?|families|households|category|list|beneficiar)|below (the )?poverty/i,
  // The exchange's indices and listings, not the company's own news.
  BSE: /\b(bse )?sensex\b|\bbse[- ](listed|smallcap|midcap|500|100|200|sme)\b|\bon (the )?bse\b|\bnse (and|&) bse\b|\bbse (and|&) nse\b/i,
  // Unilever plc and the global group, not its Indian listing.
  HINDUNILVR: /\bunilever (plc|ceo|global|group)\b/i,
  // The word and the moon of Saturn, not the jeweller; the lost submersible.
  TITAN: /\btitan (submersible|sub|moon)\b|\boceangate\b/i,
};
// Name words that are also ordinary English ("England skipper", "Skipper Cup final", "Prince Harry"):
// on their own they count only when company context follows them ("Skipper Ltd", "Skipper Q2",
// "Skipper share price", "Skipper bags order"). A longer key ("Mankind Pharma") is context in itself.
const COMMON_WORDS = new Set(
  "skipper astral trent eternal mankind endurance anthem concord prestige century quadrant panacea jupiter brigade prince craftsman".split(" "),
);
const COMPANY_NEXT =
  /^ (?:ltd|limited|india|share price|shares? (?:jump|rise|gain|fall|slip|surge|rally|tank|drop|zoom|climb|soar|plunge|decline)\w*|stock|q[1-4]|fy\d{2}|results?|earnings|ns|bse|nse|order|bags?|wins?|secures?|reports?|posts?|ipo|profit|revenue|net profit|board|plant|capacity|announces?|declares?|acquires?|share)\b/;

// Tickers that are ordinary words ("US Embassy ..."), so they don't identify the company on their own.
const WORD_TICKERS = new Set(["EMBASSY", "ACI"]);
// Separately listed companies, outside our coverage, whose names contain one of ours. A match
// that sits inside one of these (or inside another covered company's name) doesn't count.
const OTHER_COMPANIES = [
  "Tech Mahindra", "Mahindra Holidays", "Club Mahindra", "Mahindra Lifespace", "Mahindra Logistics", "Mahindra Finance",
  "Mahindra & Mahindra Financial", "M&M Financial", "M&M Finance", "Mahindra Susten", "Mahindra CIE", "Mahindra EPC",
  "Tata Motors Commercial", "Tata Motors CV", "Siemens Energy", "Waaree Renewable", "Borosil Ltd", "Kirloskar Ferrous",
  "Kirloskar Industries", "Motherson Sumi Systems", "Indian Railway Catering", "Mahanagar Gas",
  "Sun Pharma Advanced Research", "Torrent Power", "Zydus Wellness", "Apollo Tyres", "Piramal Enterprises", "Piramal Finance",
  "Aarti Industries", "Abbott Laboratories", "Embassy Developments", "Bosch Ltd", "SBI Cards", "SBI Card",
  "SBI Funds", "SBI Mutual Fund", "SBI General", "HDFC AMC", "HDFC Asset Management", "HDFC Securities", "HDFC Ergo",
  "ICICI Prudential", "ICICI Lombard", "ICICI Securities", "ICICI Pru", "Axis Mutual Fund", "Axis Securities", "Axis Finance",
  "Axis Max Life", "Kotak Mahindra AMC", "Kotak Securities", "Kotak Mutual Fund", "Bajaj Housing Finance", "Bajaj Allianz",
  "Bajaj Electricals", "Bajaj Consumer", "Bajaj Hindusthan", "Reliance Power", "Reliance Infrastructure", "Reliance Infra",
  "Reliance Capital", "Reliance Communications", "Reliance Home Finance", "Reliance Nippon", "Reliance General Insurance",
  "Jio BlackRock", "ITC Hotels", "HCL Infosystems", "Indigo Paints", "Max Financial", "Max Life", "Max Estates",
  "Shriram Properties", "Shriram Pistons", "Power Grid InvIT", "PowerGrid InvIT", "Tata Investment", "Nestle SA",
  "Brookfield Asset Management", "NTPC Green Energy", "NTPC Green",
  "Midwest Energy", "Midwest Advanced Materials", "Bajaj Auto Credit", "Hinduja Leyland Finance", "ACI Worldwide",
  "Jyoti Structures", "Kalyani Steels", "Ola Cabs", "ASM International", "Bharat FIH", "Indian Rare Earths",
  "NMDC Steel", "TVS Supply Chain", "TVS Srichakra", "TVS Holdings",
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
  if (NOT_ABOUT[company.ticker]?.test(headline)) return false;
  const h = ` ${normalize(headline)} `;
  const words = nameWords(company.name);
  const own = words.join(" ");
  const distinctive = words.filter((w) => w.length >= 6 && !GENERIC.has(w) && !GROUP.has(w));
  const ticker = WORD_TICKERS.has(company.ticker) ? "" : normalize(company.ticker);
  const keys = [openingOf(words), ticker, ...distinctive, ...(ALIASES[company.ticker] ?? [])].filter((k) => k.length >= 3);
  const otherNames = [...rivals().filter((r) => r.ticker !== company.ticker && r.name !== own).flatMap((r) => r.phrases), ...OTHER_COMPANIES];
  const covering = otherNames.filter((p) => !` ${own} `.includes(` ${p} `)).flatMap((p) => spans(h, p));
  return keys.some((k) =>
    spans(h, k).some(
      ([s, e]) => !covering.some(([cs, ce]) => cs <= s && ce >= e && ce - cs > e - s) && (!COMMON_WORDS.has(k) || COMPANY_NEXT.test(h.slice(e - 1))),
    ),
  );
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

/**
 * Run `fn` over `items` with at most `limit` in flight (be polite to the upstream), returning
 * whatever has finished after `budgetMs` (unfinished items are left out; they keep running).
 */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>, budgetMs = FEED_BUDGET_MS): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  let next = 0;
  const all = Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  ).then(() => true);
  await withDeadline(all, budgetMs, false);
  return results.filter((r): r is R => r !== undefined);
}

// Newest first, but no company takes more than its share while others have news: a watchlist
// feed of eight was all one company's stories once it had a busy week.
function balanced(items: NewsItem[], limit: number): NewsItem[] {
  const sorted = [...items].sort((a, b) => b.ts - a.ts);
  const companies = new Set(sorted.map((n) => n.ticker)).size;
  const cap = Math.max(2, Math.ceil(limit / Math.max(1, companies)));
  const count = new Map<string, number>();
  const first: NewsItem[] = [];
  const rest: NewsItem[] = [];
  for (const n of sorted) {
    const c = count.get(n.ticker) ?? 0;
    count.set(n.ticker, c + 1);
    (c < cap ? first : rest).push(n);
  }
  return [...first.slice(0, limit), ...rest].slice(0, limit).sort((a, b) => b.ts - a.ts);
}

// One story, many outlets: "DLF Q2 profit rises 15%" and "DLF Q2 Results: net profit up 15%"
// are the same news. Within a company and ~1.5 days, two results headlines (or two headlines
// sharing most of their words) count as one, so a feed isn't five copies of one earnings release.
const EARNINGS = /\b(q[1-4]|quarter(ly)?|results?|net profit|earnings|pat)\b/i;
const STOP = new Set("the a an of to in on for and with at as by from its is are was rs crore cr per cent percent".split(" "));
const words = (h: string) => new Set(h.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w) => w && !STOP.has(w)));
const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / Math.max(1, Math.min(a.size, b.size));
};
const SAME_STORY_MS = 36 * 3_600_000;
export function sameStory(a: { ticker: string; headline: string; ts: number }, b: { ticker: string; headline: string; ts: number }) {
  if (a.ticker !== b.ticker || Math.abs(a.ts - b.ts) > SAME_STORY_MS) return false;
  if (EARNINGS.test(a.headline) && EARNINGS.test(b.headline)) return true;
  return overlap(words(a.headline), words(b.headline)) >= 0.6;
}

const dedupe = (items: NewsItem[]) => {
  const seen = new Set<string>();
  const kept: NewsItem[] = [];
  for (const n of items) {
    const key = n.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70);
    if (seen.has(key) || kept.some((k) => sameStory(k, n))) continue;
    seen.add(key);
    kept.push(n);
  }
  return kept;
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
  const live = balanced(dedupe((await mapPool(companies, 6, liveForCompany)).flat()), limit);
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

// Centrality alone isn't enough: a cement or paint maker is a *high-strength* supplier to real
// estate (centrality 1) and dwarfs most developers by market cap, so the real estate feed came
// out as cement/paints/steel news. The companies that *are* the sector - owners and operators
// (developers, REITs, hospital chains), or anyone in its integrator zone (EV OEMs, shipyards) -
// get most of the slots; suppliers fill the rest by weight.
const CORE_SHARE = 0.75;
const CORE_TYPES = new Set(["owner", "operator"]);
let coreCache: Map<string, Set<string>> | null = null;
function coreTickers(sectorSlug: string): Set<string> {
  if (!coreCache) {
    coreCache = new Map();
    for (const s of listSectors().filter((x) => !x.muted)) {
      const core = new Set<string>();
      for (const z of s.zones)
        for (const link of z.suppliers) {
          const sup = s.suppliers[companyLinkKey(link)];
          if (!sup?.listed) continue;
          const { exposureType, exposureStrength } = companyLinkExposure(link);
          const central = exposureStrength !== "low" && exposureStrength !== "medium";
          if (central && (z.id === s.integratorZoneId || (exposureType && CORE_TYPES.has(exposureType)))) core.add(tickerForSupplier(sup));
        }
      coreCache.set(s.slug, core);
    }
  }
  return coreCache.get(sectorSlug) ?? new Set();
}

/** The companies whose headlines make up a sector's feed (exported for tests). */
export function feedCompanies(sectorSlug: string, companies: CompanyMetrics[], n: number): CompanyMetrics[] {
  const core = coreTickers(sectorSlug);
  const ranked = [...companies].sort((a, b) => feedWeight(b) - feedWeight(a));
  const lead = ranked.filter((c) => core.has(c.ticker)).slice(0, Math.ceil(n * CORE_SHARE));
  const rest = ranked.filter((c) => !lead.includes(c)).slice(0, n - lead.length);
  return [...lead, ...rest];
}

/** Latest headlines for the whole platform, or one sector, newest first. */
export async function getLatestNews({ sectorSlug, limit = 20 }: { sectorSlug?: string; limit?: number } = {}): Promise<NewsResult> {
  // One theme: every company in it (a company shared with other themes counts here too), tagged
  // with this theme. All themes: each company once, under the theme most central to it. Either
  // way side-exposed companies are left out - Hindalco's aluminium news isn't ECMS news.
  const bySector = new Map<string, CompanyMetrics[]>();
  const pool = sectorSlug ? sectorCompanyMetrics(sectorSlug) : listCompanyMetrics();
  for (const c of pool) {
    if (c.centrality < CORE_CENTRALITY) continue;
    bySector.set(c.sectorSlug, [...(bySector.get(c.sectorSlug) ?? []), c]);
  }
  const perSector = sectorSlug ? PER_SECTOR_SINGLE : PER_SECTOR_ALL;
  const companies = [...bySector.entries()].flatMap(([slug, cs]) => feedCompanies(slug, cs, perSector));
  const live = dedupe((await mapPool(companies, 6, liveForCompany)).flat()).sort((a, b) => b.ts - a.ts).slice(0, limit);
  if (live.length >= 3) return { items: live, live: true };
  const curated = listNews().filter((n) => !sectorSlug || n.sectorSlug === sectorSlug);
  return { items: curated.slice(0, limit), live: false };
}
