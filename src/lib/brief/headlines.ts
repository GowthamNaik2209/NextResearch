// The morning brief's market headlines: Google News RSS (public, no key; the same feed and filters
// as the company news, live/news.ts) searched for the Sensex and Nifty over the last day, so at
// 7:30 am it holds the evening's close coverage and the morning's outlook pieces. The headlines
// go out as written, linked to the publisher; near-duplicates of one story are kept once.
import { parseGoogleNewsRss, type Headline } from "@/lib/live/news";
import type { MarketHeadline } from "./types";

const QUERY = "(Sensex OR Nifty) when:1d";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const TIMEOUT_MS = 10_000;

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

/** Share of the shorter headline's words found in the other: 0.5+ is the same story retold. */
function overlap(a: string, b: string): number {
  const [x, y] = [words(a), words(b)];
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  if (!small.size) return 0;
  let n = 0;
  for (const w of small) if (big.has(w)) n++;
  return n / small.size;
}

/** The newest `n` headlines, one per story. */
export function pickHeadlines(all: Headline[], n = 3): MarketHeadline[] {
  const out: MarketHeadline[] = [];
  for (const h of all) {
    if (out.length >= n) break;
    if (out.some((o) => overlap(o.headline, h.headline) >= 0.5)) continue;
    out.push({ headline: h.headline, source: h.source, url: h.url });
  }
  return out;
}

/** The morning's market headlines, or [] when the feed is unreachable. */
export async function fetchMarketHeadlines(n = 3): Promise<MarketHeadline[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return res.ok ? pickHeadlines(parseGoogleNewsRss(await res.text()), n) : [];
  } catch {
    return [];
  }
}
