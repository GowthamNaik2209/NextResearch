// How NextResearch works, as fact lines the assistant can answer from: baskets, projections,
// weightings, the watchlist, the 3D map and so on. The wording is the site's own (the "i" notes
// in components/baskets/BasketDetail.tsx, the landing page's How it works, the Analysis page), and
// numbers come from the same constants those pages use, so an answer can't drift from what the
// page says. When a note on the site changes, change its topic here too.
import { DEFAULT_BAND } from "../baskets/strategy";
import { GROWTH_FADE, IC, LONG_RUN_GROWTH, MARGIN_SHIFT_A_YEAR, MARKET, VOL_FLOOR } from "../baskets/projection";
import { MAX_BASKET_STOCKS } from "../baskets/limits";

export type GuideTopic = {
  id: string;
  title: string;
  /** Where the feature lives: the link under an answer. */
  href: string;
  /** Words a question about it would use (lower case; stems are fine: "rebalanc"). */
  keywords: string[];
  /** Questions the search box suggests when a search matches this topic. */
  asks: string[];
  facts: string[];
};

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;

export const GUIDE: GuideTopic[] = [
  {
    id: "overview",
    title: "How NextResearch works",
    href: "/#how",
    keywords: ["how", "work", "start", "use", "what can", "feature", "help", "guide"],
    asks: ["How does NextResearch work?", "Where should I start?"],
    facts: [
      "Pick an industry: start in Analysis on Deep dive, where every industry and policy we cover is mapped end to end from raw inputs to the finished product.",
      "Explore the chain: open its 3D map. Layers, zones and bottlenecks show where value and risk concentrate, with every company ranked by exposure and segment revenue.",
      "Read and chart it: Reports sum the industry up in ten slides for investors. Charts show any of its listed stocks, picked by layer.",
      "Make it yours: copy the industry basket into your own, save companies to your watchlist and share a basket by link as the story develops.",
    ],
  },
  {
    id: "analysis",
    title: "Analysis: deep dives, reports and charts",
    href: "/docs",
    keywords: ["analysis", "deep dive", "report", "slide", "chart", "pestle", "research"],
    asks: ["What is in a ten-slide report?", "What is the difference between Deep dive and Reports?"],
    facts: [
      "Deep dive maps each industry's supply chain: the layers, who supplies them and which companies are listed. Its Charts button shows any of its listed stocks' price chart, picked by layer.",
      "Reports are ten-slide summaries for investors: latest developments, value chain, PESTLE, the listed beneficiaries and their financials, and the research behind it.",
      "Baskets backtests an industry's listed stocks together against the Nifty 50. The IPOs tab summarises the prospectus of each big upcoming issue.",
    ],
  },
  {
    id: "map",
    title: "The 3D supply-chain map",
    href: "/sector/datacenter/explore",
    keywords: ["3d", "map", "explore", "layer", "zone", "bottleneck", "supply chain", "model"],
    asks: ["How do I read the 3D supply-chain map?"],
    facts: [
      "Each industry has a 3D map of its supply chain. Layers, zones and bottlenecks show where value and risk concentrate.",
      "Picking a part of the map opens its layer and lists the companies that supply it, ranked by exposure and segment revenue; unlisted suppliers are shown too.",
    ],
  },
  {
    id: "baskets",
    title: "Baskets",
    href: "/baskets",
    keywords: ["basket", "backtest", "portfolio", "group of stocks", "create", "build", "share", "copy"],
    asks: ["How do I build a basket?", "How do I add stocks to a basket?"],
    facts: [
      "A basket is a group of stocks you test together: how it would have done against the Nifty 50, and a projection of the year ahead.",
      "Each industry has a ready-made basket of its listed stocks; copy it into your own and change it.",
      `To add stocks, pick an industry, then add its stocks one by one or all at once, or add from your watchlist. Switching industry keeps adding to the same basket, so one basket can mix several (up to ${MAX_BASKET_STOCKS} stocks).`,
      "A basket can be shared by link.",
    ],
  },
  {
    id: "weights",
    title: "Basket weightings and rebalancing",
    href: "/baskets",
    keywords: ["weight", "equal", "m-cap", "market cap weight", "custom", "rebalanc", "drift", "band", "monthly", "quarterly"],
    asks: ["What do Equal, M-cap and Custom weights mean?", "What does the drift band do?"],
    facts: [
      "Weightings: Equal gives every stock the same share. M-cap gives bigger companies more, by market cap. Custom lets you set each stock's %; they must total 100%.",
      "Rebalancing trades every stock back to its target weight. Never: bought on day one, then left to move with prices. Monthly / Quarterly: on the first trading day of each month or quarter. Drift: only when a stock moves more than the band above or below its target.",
      `The drift band (${DEFAULT_BAND} points unless you change it): rebalance when any stock is more than the band above or below its target weight; every stock then goes back to its target at the next day's close.`,
    ],
  },
  {
    id: "projections",
    title: "How basket projections work",
    href: "/baskets",
    keywords: ["projection", "project", "forecast", "bear", "bull", "base case", "expected return", "beta", "scenario", "next year", "1y", "2y", "likely range"],
    asks: ["How are basket projections worked out?", "What do Bear, Base and Bull mean?"],
    facts: [
      "Which stocks: only stocks with at least 3 years in a row of revenue and net profit, at least 3 years of trading, and a price and market cap in our last data update. Any other stock is left out and its share is spread over the rest.",
      `Market return: the 10-year G-sec yield (${pct(MARKET.rf)}, ${MARKET.rfAsOf}) plus the stock's beta times India's equity risk premium (${pct(MARKET.erp)}, Damodaran, ${MARKET.erpAsOf}), less its dividend yield. Beta is from 2 years of weekly returns against the Nifty 50, pulled a third of the way to 1.`,
      `Fundamentals tilt: a score from its results (revenue growth faded ${Math.round(GROWTH_FADE * 100)}% of the way toward ${Math.round(LONG_RUN_GROWTH * 100)}% a year, net margin moving toward its usual and its industry's, by at most ${Math.round(MARGIN_SHIFT_A_YEAR * 100)}% a year), standardised against every company we cover; the tilt is IC ${IC} times volatility times that score. Loss-makers get the market return only.`,
      "Base = market return + tilt. It mostly reflects beta, so it isn't a ranking or a stock-picking signal: out of sample its rank correlation with what stocks then did was close to zero.",
      `Bear and Bull are the 10th and 90th percentile of a year at the stock's own volatility over the last year (never below ${Math.round(VOL_FLOOR * 100)}%). Tested out of sample over three one-year periods, the Bear-to-Bull range held 91%, 90% and 81% of what stocks actually did, against an aim of 80%.`,
      "The basket is bought today at your weights and held. Its likely range comes from 1,000 simulated weekly paths around the Base case and holds 8 in 10 paths. Over 2 years the market return is compounded and Bear and Bull are about 1.4 times as far from the middle.",
    ],
  },
  {
    id: "ideas",
    title: "Rule-based basket ideas and one-off years",
    href: "/baskets",
    keywords: ["idea", "screen", "rule", "one-off", "one off", "outlier", "excluded", "left out"],
    asks: ["How are basket ideas picked?", "Why is a company marked one-off?"],
    facts: [
      "Basket ideas are screens with a stated rule (shown in each idea's note), rebuilt from the latest figures.",
      "A company whose latest year is dominated by a one-off is marked one-off: left out of the rule-based baskets and screens, but you can still keep it in yours.",
    ],
  },
  {
    id: "watchlist",
    title: "Your watchlist",
    href: "/watchlist",
    keywords: ["watchlist", "watch list", "save", "follow", "heart"],
    asks: ["How do I save a company to my watchlist?"],
    facts: [
      "Save any company to your watchlist with the heart button (you need to be logged in). The watchlist page shows your companies' figures and the news on them.",
      "You can add stocks to a basket straight from your watchlist.",
    ],
  },
  {
    id: "ipos",
    title: "IPO decks",
    href: "/ipos",
    keywords: ["ipo", "prospectus", "drhp", "listing", "deck", "subscribe", "apply"],
    asks: ["What do the IPO status labels mean?", "What is in an IPO deck?"],
    facts: [
      "Each big upcoming IPO has a 10-slide deck from its offer document: the issue, business, industry, financials, KPIs, use of proceeds and shareholding, peer valuation, strengths and risks, and the outlook with sources.",
      "Status labels: Filed (draft prospectus with SEBI), SEBI approved (cleared; 'on hold' or 'paused' means no dates yet), Upcoming (dates set), Open (you can apply), Closed (bidding ended, lists on the date shown), Listed (recently started trading).",
    ],
  },
  {
    id: "data",
    title: "Where the figures come from",
    href: "/#how",
    keywords: ["data", "source", "figures", "updated", "update", "as of", "accurate", "where from", "financials"],
    asks: ["Where do your figures come from?", "How often is the data updated?"],
    facts: [
      "Company figures (price, market cap, P/E, ROCE, revenue and profit) come from public filings via Screener and are refreshed after each trading day; every page shows the date they are as of.",
      "Daily share prices are stored for five years and topped up each evening.",
      "Answers from Ask NextResearch use only these figures and our written research. They are not investment advice.",
    ],
  },
];

const byId = new Map(GUIDE.map((t) => [t.id, t]));
export const guideTopic = (id: string) => byId.get(id) ?? null;

/**
 * Guide topics a question is about, best first: a keyword counts once, longer keywords (more
 * specific) count more. The general overview ("how", "work") answers only when no specific topic
 * does: "how are bear and bull worked out" is about projections. "how do you do projections in
 * baskets" -> projections, baskets.
 */
export function matchGuide(question: string, limit = 2): GuideTopic[] {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9& -]+/g, " ").replace(/\s+/g, " ")} `;
  const scored = GUIDE.map((t) => ({
    t,
    score: t.keywords.reduce((n, k) => (q.includes(` ${k}`) ? n + (k.length >= 6 ? 2 : 1) : n), 0),
  })).filter((x) => x.score > 0);
  const specific = scored.filter((x) => x.t.id !== "overview");
  const pick = specific.length ? specific : scored.filter((x) => x.score >= 2);
  return pick
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}
