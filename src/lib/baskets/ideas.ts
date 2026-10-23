// Basket ideas: ready-made stock lists, re-ranked from the latest prices and the maps. The pure
// rules live here (tested in ideas.test.ts); ideas-data.ts feeds them each day's price history.
import { fmtMonth, signedPct } from "@/lib/format";
import type { ChartRange } from "@/lib/live/yahoo";
import { kpiScreens, type KpiStock } from "./kpi-screens";
import { ONE_OFF_NOTE } from "./outliers";

const DAY = 86_400_000;

/** Lookbacks the "Top performers" idea ranks over, each opening the basket chart on that range. */
export const TOP_PERIODS = [
  { id: "6M", days: 183, long: "6 months" },
  { id: "1Y", days: 365, long: "1 year" },
  { id: "2Y", days: 730, long: "2 years" },
  { id: "3Y", days: 1095, long: "3 years" },
  { id: "5Y", days: 1826, long: "5 years" },
] as const satisfies readonly { id: ChartRange; days: number; long: string }[];
export type TopPeriod = (typeof TOP_PERIODS)[number]["id"];

/** One stock's price facts for the day: when its history starts and its return over each lookback. */
export type PriceStat = { first: string; ret: Partial<Record<TopPeriod, number>>; sinceFirst: number };
export type PriceSnapshot = { asOf: string; stats: Record<string, PriceStat> };

// A history reaching back to within this many days of a lookback's start still covers it (weekly
// bars, holidays, and the 5-year fetch starting a few days short of 5 years).
const COVER_SLACK_DAYS = 14;

/**
 * A stock's price facts from its closes (oldest first): the return over each lookback its history
 * covers, measured from the last close on or before the lookback's first day, and since its first close.
 */
export function priceStat(points: { t: string; c: number }[], now: number): PriceStat | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1].c;
  const first = points[0];
  const ret: PriceStat["ret"] = {};
  for (const p of TOP_PERIODS) {
    const start = now - p.days * DAY;
    if (Date.parse(first.t) > start + COVER_SLACK_DAYS * DAY) continue;
    let base = first.c;
    for (const pt of points) {
      if (Date.parse(pt.t) > start) break;
      base = pt.c;
    }
    if (base > 0) ret[p.id] = (last / base - 1) * 100;
  }
  return { first: first.t, ret, sinceFirst: first.c > 0 ? (last / first.c - 1) * 100 : 0 };
}

/** `stat`: a few words on why the stock is in the list, short enough for a card's row. */
export type IdeaStock = { ticker: string; stat: string };
export type Idea = {
  id: string;
  title: string;
  /** One line for the card. */
  blurb: string;
  /** How the list is chosen, in one short line for the idea's page. */
  rule: string;
  /** The range the idea's chart opens on. */
  range: ChartRange;
  stocks: IdeaStock[];
  /** The list's equal-weight return over `retLabel`: the average here, then the page's own backtest for the cards (withBacktestReturns). */
  ret: number | null;
  retLabel: string;
  /**
   * Each stock is backtested from its own listing day (Recent listings): one listed during the
   * range joins the basket on its first trading day at an equal share of the basket then, the others
   * sold down in proportion to pay for it (backtest.ts, JoinOptions), instead of being left out.
   */
  joinAtListing?: boolean;
};

/** What the rules need about each listed stock, from the maps and the company table. */
export type IdeaStockInfo = KpiStock & {
  ticker: string;
  name: string;
  mcapCr: number | null;
  roce: number | null;
  /** Industry maps the company is in (policy maps not counted). */
  industries: number;
  /** Policy maps (PLI, ALMM…) it is also in: with the industries, the "chains" /connections counts. */
  policies?: number;
  /** Its price history starts at a listing that wasn't an IPO (a REIT or InvIT, or a demerger). */
  notIpo?: boolean;
  /** Its strongest place in a layer few listed companies supply (null if none). */
  scarce: { listed: number; strength: number; layer: string; industry: string } | null;
};

const TOP_N = 10;
const LIST_N = 12;
const QUALITY_MIN_MCAP_CR = 1000;
const IPO_WINDOW_DAYS = 730;
// The chart ranges a Recent listings backtest can open on, shortest first, with the days each
// covers: the shortest one reaching back to the earliest listing in the list is used.
const SINCE_RANGES = [
  { id: "1M", days: 28 },
  { id: "6M", days: 180 },
  { id: "1Y", days: 362 },
  { id: "2Y", days: IPO_WINDOW_DAYS },
] as const satisfies readonly { id: ChartRange; days: number }[];

/** The shortest chart range whose first day is on or before `first` (the earliest listing). */
export function sinceRange(first: string, now: number): ChartRange {
  const age = (now - Date.parse(first)) / DAY;
  return (SINCE_RANGES.find((r) => r.days >= age) ?? SINCE_RANGES[SINCE_RANGES.length - 1]).id;
}

/** The Recent listings method, in the words its "i" and page use. */
export const SINCE_LISTING_NOTE =
  "Each stock is backtested from its first trading day: it joins the basket then at an equal share, the others trimmed in proportion to pay for it.";

const pctTxt = (v: number) => signedPct(v);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const monthYear = (t: string) => fmtMonth(t);

/**
 * Every idea for the day. An idea with no stocks (no price data yet, say) is left out. Companies
 * with a one-off year (outlier, ./outliers.ts) are in none of them: a ranking on distorted figures
 * (or a price move on a one-off) mostly ranks the one-off. Users can still add them to their own baskets.
 */
export function buildIdeas(all: IdeaStockInfo[], snap: PriceSnapshot, now: number): Idea[] {
  const stocks = all.filter((s) => !s.outlier);
  const stat = (t: string) => snap.stats[t];
  const ret1y = (list: string[]) => mean(list.map((t) => stat(t)?.ret["1Y"]).filter((v): v is number => v != null));
  const ideas: Idea[] = [];

  for (const p of TOP_PERIODS) {
    const ranked = stocks
      .filter((s) => stat(s.ticker)?.ret[p.id] != null)
      .sort((a, b) => stat(b.ticker).ret[p.id]! - stat(a.ticker).ret[p.id]! || a.name.localeCompare(b.name))
      .slice(0, TOP_N);
    ideas.push({
      id: `top-${p.id.toLowerCase()}`,
      title: `Biggest gainers · ${p.id}`,
      blurb: `The ${TOP_N} listed stocks in our maps that rose most over the past ${p.long}.`,
      rule: `The ${TOP_N} biggest gainers over the past ${p.long} across our maps, re-ranked daily. ${ONE_OFF_NOTE} Past returns, not a recommendation.`,
      range: p.id,
      stocks: ranked.map((s) => ({ ticker: s.ticker, stat: pctTxt(stat(s.ticker).ret[p.id]!) })),
      ret: mean(ranked.map((s) => stat(s.ticker).ret[p.id]!)),
      retLabel: p.id,
    });
  }

  const quality = stocks
    .filter((s) => s.roce != null && (s.mcapCr ?? 0) >= QUALITY_MIN_MCAP_CR)
    .sort((a, b) => b.roce! - a.roce! || a.name.localeCompare(b.name))
    .slice(0, LIST_N);
  ideas.push({
    id: "quality",
    title: "Highest ROCE",
    blurb: "The highest return on capital employed across every industry we map.",
    rule: `Highest ROCE in our maps, among companies worth ₹${QUALITY_MIN_MCAP_CR.toLocaleString("en-IN")} Cr or more. ${ONE_OFF_NOTE}`,
    range: "1Y",
    stocks: quality.map((s) => ({ ticker: s.ticker, stat: `ROCE ${s.roce!.toFixed(0)}%` })),
    ret: ret1y(quality.map((s) => s.ticker)),
    retLabel: "1Y",
  });

  const scarce = stocks
    .filter((s) => s.scarce)
    .sort((a, b) => a.scarce!.listed - b.scarce!.listed || b.scarce!.strength - a.scarce!.strength || (b.mcapCr ?? -1) - (a.mcapCr ?? -1))
    .slice(0, LIST_N);
  ideas.push({
    id: "bottlenecks",
    title: "Scarce suppliers",
    blurb: "Listed companies in supply-chain layers that only one or two listed names supply.",
    rule: `Companies in supply-chain layers that only one or two listed companies supply, scarcest first. ${ONE_OFF_NOTE}`,
    range: "1Y",
    stocks: scarce.map((s) => ({ ticker: s.ticker, stat: s.scarce!.listed === 1 ? "sole listed name" : "1 of 2 listed" })),
    ret: ret1y(scarce.map((s) => s.ticker)),
    retLabel: "1Y",
  });

  const cross = stocks
    .filter((s) => s.industries >= 3)
    .sort((a, b) => b.industries - a.industries || (b.mcapCr ?? -1) - (a.mcapCr ?? -1))
    .slice(0, 15);
  ideas.push({
    id: "cross-industry",
    title: "In 3+ industries",
    blurb: "Companies that turn up in three or more of our industry maps (policy maps not counted).",
    rule: `Companies in three or more of our industry maps, widest reach first. ${ONE_OFF_NOTE}`,
    range: "1Y",
    stocks: cross.map((s) => ({ ticker: s.ticker, stat: s.policies ? `${s.industries} industries + ${s.policies} ${s.policies === 1 ? "policy" : "policies"}` : `${s.industries} industries` })),
    ret: ret1y(cross.map((s) => s.ticker)),
    retLabel: "1Y",
  });

  const ipos = stocks
    .filter((s) => {
      const st = stat(s.ticker);
      return !!st && !s.notIpo && Date.parse(st.first) > now - IPO_WINDOW_DAYS * DAY;
    })
    .sort((a, b) => Date.parse(stat(b.ticker).first) - Date.parse(stat(a.ticker).first))
    .slice(0, 15);
  const earliest = ipos.reduce<string | null>((m, s) => (!m || stat(s.ticker).first < m ? stat(s.ticker).first : m), null);
  ideas.push({
    id: "recent-ipos",
    title: "Recent listings",
    blurb: "Companies in our maps that listed in the past two years, each backtested from its listing day.",
    rule: `Listed in the past two years, newest first; REITs, InvITs and demergers left out. ${ONE_OFF_NOTE} ${SINCE_LISTING_NOTE}`,
    range: earliest ? sinceRange(earliest, now) : "1Y",
    stocks: ipos.map((s) => ({ ticker: s.ticker, stat: `listed ${monthYear(stat(s.ticker).first)}` })),
    ret: mean(ipos.map((s) => stat(s.ticker).sinceFirst)),
    retLabel: "since listing",
    joinAtListing: true,
  });

  // Screens on the company table's figures (kpi-screens.ts): today's list, backtested over the past year.
  for (const k of kpiScreens(stocks)) {
    ideas.push({ ...k, range: "1Y", ret: ret1y(k.stocks.map((s) => s.ticker)), retLabel: "1Y" });
  }

  return ideas.filter((i) => i.stocks.length > 0);
}

/** What a card needs from the idea's own backtest: the basket's return and each held stock's. */
export type IdeaBacktest = { ret: number; holdings: { ticker: string; ret: number }[] };

/**
 * The cards' figures from the same backtest the idea's page runs (bought at equal weights on the
 * first day of `range` and held; Recent listings: each stock from its listing day), so the card and
 * the page show one number. A top-performers row shows that backtest's own return for the stock,
 * highest first; a Recent listings row adds the stock's return since its listing. With no backtest
 * the figure is left out rather than shown from a different calculation.
 */
export function withBacktestReturns(ideas: Idea[], backtests: Record<string, IdeaBacktest | null>): Idea[] {
  return ideas.map((idea) => {
    const label = idea.joinAtListing ? "since listing" : idea.range;
    const bt = backtests[idea.id];
    if (!bt) return { ...idea, ret: null, retLabel: label };
    const own = new Map(bt.holdings.map((h) => [h.ticker, h.ret]));
    const stocks = idea.id.startsWith("top-")
      ? idea.stocks
          .map((s) => (own.has(s.ticker) ? { ...s, stat: pctTxt(own.get(s.ticker)!) } : s))
          .sort((a, b) => (own.get(b.ticker) ?? -Infinity) - (own.get(a.ticker) ?? -Infinity))
      : idea.joinAtListing
        ? idea.stocks.map((s) => (own.has(s.ticker) ? { ...s, stat: `${s.stat} · ${pctTxt(own.get(s.ticker)!)}` } : s))
        : idea.stocks;
    return { ...idea, stocks, ret: bt.ret, retLabel: label };
  });
}
