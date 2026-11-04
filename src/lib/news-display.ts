// How a headline from the live feed is shown: the feed (lib/live/news.ts) decides which stories are
// about a company; this decides which of them are worth showing and tidies the text. Pure, so the
// rules are tested in news-display.test.ts.

// Words a headline cut off at a word break tends to end on ("…shares rise as the").
const DANGLING = new Set("a an the and or of to for with from by in on at as into than that its their".split(" "));
// Short words a whole headline can end on; any other one- or two-letter lowercase tail is a word cut
// in half ("…Where are p"); units like "cr" are whole.
const SHORT_WORDS = new Set("up is it go be no so we us me do my he ok hi cr rs mn bn km kg yr".split(" "));

/**
 * The headline as shown: a feed that cut it short with "..." gets one ellipsis character, and one cut
 * mid-word or after a dangling "the" / "of" gets an ellipsis added, so it reads as shortened rather
 * than as a typo.
 */
export function tidyHeadline(headline: string): string {
  const h = headline.trim();
  const dots = h.match(/\s*(?:\.{3,}|…)$/);
  if (dots) return h.slice(0, dots.index).trimEnd().replace(/[.,;:]+$/, "") + "…";
  const last = h.split(/\s+/).pop() ?? "";
  if (DANGLING.has(last.toLowerCase()) || (/^[a-z]{1,2}$/.test(last) && !SHORT_WORDS.has(last))) return h + "…";
  return h;
}

// Grey-market premium: the site never reports it (unofficial, unregulated quotes).
const GREY_MARKET = /\bGMP\b|\bgr[ae]y[- ]market\b/i;
// The run-up to a listing: price band, subscription, anchor book, allotment. News only until the
// shares list; afterwards an old "IPO price band" story reads as if the issue were still open.
const IPO_RUN_UP =
  /\bprice band\b|\bsubscri(?:bed|ption)\b|\banchor (?:book|investors?|portion)\b|\ballotment\b|\bIPO (?:opens|closes|to open|day \d|review|date)\b|\bshould you (?:apply|subscribe)\b/i;

/** A headline not to show: any grey-market premium story, and IPO run-up stories once the company has listed. */
export function isStaleOrGreyMarket(headline: string, listed: boolean): boolean {
  return GREY_MARKET.test(headline) || (listed && IPO_RUN_UP.test(headline));
}

// A stock-quote or broker product page the feed picked up as a story: "Max Healthcare Share Price -
// Live NSE: MAXHEALTH Stock Price & Chart", a bare "BPCL Share Price", an ETF's "Share Price, NAV,
// Returns" page, or "Invest in US Stocks on Groww". News items say what happened; a quote page says
// nothing. "Tata Motors share price: stock jumps 5% after Q2" and live-update blogs are kept.
const QUOTE_PAGE = [
  /\b(?:share|stock) price(?:\s+today)?\s*(?:$|[-–—|(]\s*(?:live|nse|bse|today|chart|nav|latest|stock price)\b)/i,
  /\blive (?:nse|bse)\s*:/i,
  /\bstock price (?:&|and) chart\b/i,
  /\b(?:share price|nav)\s*,\s*(?:nav|returns|chart|share price)\b/i,
  /^(?:invest|trade) in\b.*\bon (?:groww|zerodha|upstox|angel one|dhan|paytm money)\b/i,
];

/** A headline that is a stock-quote or broker product page rather than a story. */
export function isQuotePage(headline: string): boolean {
  return QUOTE_PAGE.some((r) => r.test(headline));
}

/** The items worth showing, each headline tidied. `isListed` says whether a ticker's shares trade. */
export function presentableNews<T extends { headline: string; ticker: string }>(items: T[], isListed: (ticker: string) => boolean): T[] {
  return items.filter((n) => !isQuotePage(n.headline) && !isStaleOrGreyMarket(n.headline, isListed(n.ticker))).map((n) => ({ ...n, headline: tidyHeadline(n.headline) }));
}
