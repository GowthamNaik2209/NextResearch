// The 8 am morning brief email: the market part (built once per trading day's close by
// src/lib/brief/market.ts and stored in MorningBrief.data as JSON) and the per-user watchlist part
// (src/lib/brief/watchlist.ts). Plain data only, so it survives the trip through the database.

export type IndexClose = { name: string; close: number; change: number; pct: number };

/** NSE stocks (EQ and BE series) that closed up, down and unchanged. */
export type Breadth = { up: number; down: number; flat: number };

/** An industry or policy basket (a theme on the site) and its return on the brief day. */
export type Theme = { slug: string; name: string; kind: "Industry" | "Policy"; ret: number };

/** A market news headline, linked to the publisher. */
export type MarketHeadline = { headline: string; source: string; url: string };

export type BriefFlows = {
  /** The day the figures are for, "YYYY-MM-DD" (NSE's provisional figures can lag the close). */
  day: string;
  fiiNetCr: number;
  diiNetCr: number;
  /** Days in a row the FII figure has had today's sign (1 = today only). */
  fiiStreak: number;
  /** DII net summed over the month so far. */
  diiMonthCr: number;
};

export type BriefIpo = { slug: string; name: string; label: string; size: string };
export type KeyDate = { day: string; what: string };

export type MarketBrief = {
  /** The trading day the brief covers (its close), "YYYY-MM-DD". */
  day: string;
  indices: IndexClose[];
  flows: BriefFlows | null;
  breadth: Breadth | null;
  /** The best-performing themes on the brief day, best first (at most three). */
  themes: Theme[];
  /** The morning's market headlines, newest first (at most three). */
  headlines: MarketHeadline[];
  ipos: BriefIpo[];
  /** The IPOs are open or dated to open; false: none is, so these are SEBI-approved ones waiting. */
  iposDated?: boolean;
  /** Market-wide dates ahead (data releases, central banks); each user's stock dates are added per email. */
  keyDates: KeyDate[];
  /** The one-line summary over the headlines (highlights.ts). */
  summary: string;
};

export type WatchItem = {
  ticker: string;
  /** The company page's slug (/company/<slug>). */
  slug: string;
  name: string;
  close: number;
  /** The brief day's move, %. */
  dayPct: number | null;
  /** Since the user saved it, % (null when the price at saving isn't known). */
  sincePct: number | null;
  /** A since-added level crossed on the brief day (+10, +25, -25, ...). */
  milestone?: number;
};

export type WatchDeal = { ticker: string; name: string; text: string };

export type WatchBrief = {
  items: WatchItem[];
  deals: WatchDeal[];
  /** The saved stocks' dates ahead: results, ex-dividend. */
  events: KeyDate[];
};
