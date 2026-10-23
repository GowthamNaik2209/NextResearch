"use client";

import { InfoTip } from "@/components/InfoTip";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import type { BasketStock } from "@/lib/baskets/industry";
import { StockLink } from "@/components/stock/StockLink";
import { BasketBreakdown, type BreakdownTab } from "./BasketBreakdown";
import { BasketChart, defaultSelection, stockLine, type CompareBasket } from "./BasketChart";
import { LINES_FULL, MAX_CHART_STOCKS, planAdd } from "@/lib/baskets/selection";
import { useBasketSelection } from "./use-basket-selection";
import { isWatched, subscribeWatchlist, watchlistSnapshot } from "@/components/sector-explorer/WatchlistButton";
import { DASHARRAY } from "@/components/charts/palette";
import { useSiteTheme } from "@/lib/theme";
import { croreShort, fmtMonth, NA, signedPct } from "@/lib/format";
import { shownPct, signedPts } from "@/lib/baskets/fmt";
import { MAX_BASKET_STOCKS } from "@/lib/baskets/limits";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReturnCards, picksKey } from "./ReturnCards";
import { BasketStats } from "./BasketStats";
import { BasketAnalysis } from "./BasketAnalysis";
import { MINI_SEG, PANEL, Panel } from "./Panel";
import { IndustryChips } from "./IndustryChips";
import { OneOffMark } from "./OneOffMark";
import { MoreBelow, useMoreBelow } from "./MoreBelow";
import { basketCreateError } from "./NewBasketButton";
import { industrySeriesKey, savedBasketQuery } from "./series";
import { useSeries } from "./use-series";
import { NOT_REBALANCED, REBALANCE_BUTTON, WEIGHTING_WORDS, basisLabel, pastPeriod } from "./labels";
import { useProjection, schemeShares } from "./use-projection";
import { ProjectionCards } from "./ProjectionCards";
import { ProjectionStats } from "./ProjectionStats";
import { ProjectionAnalysis } from "./ProjectionAnalysis";
import { EXIT_LABEL, HORIZON_LONG, PROJECTION_DISCLAIMER, SCENARIO_LABEL } from "./projection-view";
import type { ChartProjection } from "./BasketChart";
import { caseReturn, HORIZONS, SCENARIOS, type ExitBasis, type Horizon, type Scenario } from "@/lib/baskets/projection";
import { stockPath, type ProjectionSettings } from "@/lib/baskets/projection-basket";
import {
  BAND_CHOICES,
  REBALANCE_RULES,
  SCHEME_SHORT,
  WEIGHT_SCHEMES,
  customTargets,
  heldStrategy,
  isPlainHold,
  parseStrategy,
  rebalanceLabel,
  strategyQuery,
  toPercents,
  weightsParam,
  weightsTotal,
  weightsValid,
  type Strategy,
  type WeightScheme,
} from "@/lib/baskets/strategy";

// One basket - an industry's (derived from the content) or a saved one - with a Stocks view
// (holdings, weights, each one's return and share of the basket's return) and a Chart view
// (the backtest against the market, its industry index and other industry baskets). The owner
// of a saved basket can rename, reweight, share, delete, and pick and drop stocks.
// Copies text while still inside the tap. The Clipboard API first; where it is refused (some
// browsers and embedded views), the older select-and-copy, which works synchronously.
function copyNow(text: string): Promise<boolean> {
  const legacy = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  };
  if (!navigator.clipboard) return Promise.resolve(legacy());
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => legacy(),
  );
}

/** sessionStorage key prefix: a new basket's chart comparisons, handed from Create basket to its page. */
const CHART_HANDOFF = "nr-basket-chart:";
// Only the market beside the basket; indices and other baskets are a "Compare with" pick on the chart.
const NIFTY_ONLY = [{ key: "b:nifty50", label: "Nifty 50" }];
const stocksWord = (n: number) => `${n} stock${n === 1 ? "" : "s"}`;
/** Why a P/E shows "—": the company table has none for it. */
const NO_PE = "No P/E in our last data update: a loss over the latest twelve months, or none reported";
/** A 0-1 share as a percentage, one decimal. */
const pct1 = (share: number) => `${(share * 100).toFixed(1)}%`;

const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
  { id: "2Y", long: "2 years" },
  { id: "3Y", long: "3 years" },
  { id: "5Y", long: "5 years" },
];
// The page's own URL keeps a strategy other than the basket's default, so a link reopens it.
// "wt" for the weighting, so it can't clash with a host page's "w". cap and lcap belonged to the
// removed Capped weighting: still cleared, so an old link's are tidied away.
const STRATEGY_PARAMS = ["wt", "rb", "band", "cw", "cap", "lcap"];
const strategyUrlParams = (s: Strategy) => [...new URLSearchParams(strategyQuery(s))].map(([k, v]) => [k === "w" ? "wt" : k, v] as const);

// Projections' settings in the page URL (docs/PROJECTIONS.md), so a link reopens the same projection.
const PROJECTION_PARAMS = ["proj", "ph", "ps", "pe"];
const DEFAULT_PROJECTION: ProjectionSettings = { h: 1, scenario: "base", exit: "own" };

/** A stock just taken off, held as a placeholder row at its place in the list (see `display`). */
type Ghost = { ticker: string; name: string; index: number; h: { table?: number; phone?: number } };

type Sort = "contribution" | "return" | "weight" | "pe" | "mcap" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "contribution", label: "Pts added" },
  { id: "return", label: "Return" },
  { id: "weight", label: "Share now" },
  { id: "pe", label: "P/E (low first)" },
  { id: "mcap", label: "Market cap" },
  { id: "name", label: "Name" },
];

export type BasketDetailProps = {
  /** An industry's basket, a saved one, a basket idea (a list re-ranked each day), or a new basket
   * being put together on Create basket (nothing is saved until "Create basket"). */
  mode: "industry" | "saved" | "idea" | "draft";
  /** Saved basket id, the industry's slug, or the idea's id. */
  id: string;
  name: string;
  description: string | null;
  stocks: BasketStock[];
  addPrices: Record<string, number | null>;
  weighting: "equal" | "mcap" | "custom";
  /** A saved basket's custom weights, % per stock (in use, or kept from when it was last custom). */
  customWeights?: Record<string, number> | null;
  isOwner: boolean;
  isPublic: boolean;
  signedIn: boolean;
  industries: CompareBasket[];
  /** The industry basket to compare with (its source or most-represented industry). */
  compareSlug: string | null;
  compareName: string | null;
  indices: Benchmark[];
  market: Benchmark[];
  /** Owner only: every listed company that can be added, and their watchlist. */
  universe: BasketStock[] | null;
  watchlist: string[];
  /** URL parameter the phone's Stocks / Chart switch is kept in ("view" on basket pages). */
  viewParam?: string;
  /** The basket name's heading level: h1 on its own page, h2 inside another page. */
  titleAs?: "h1" | "h2";
  /** The range the chart opens on (1Y unless an idea ranks over another period). */
  initialRange?: ChartRange;
  /** A saved basket's tickers the maps no longer list: shown as "No longer listed" rows. */
  unlisted?: string[];
  /** A draft: the industry it was copied from, saved with it as its source. A saved basket: its
   * source industry, the layer labels' fallback for stocks not picked from an industry. */
  sourceSector?: string | null;
  /** A line for the status bar on opening (a draft that couldn't take every stock, say). */
  notice?: string | null;
  /** Backtest each stock from its listing day: one listed during the period joins on its first
   * trading day instead of being left out (the Recent listings rule-based basket). */
  joinAtListing?: boolean;
  /** A saved basket: the industry each stock was picked from (saved with it), so its layer label
   * stays the one it was picked in after a reload. */
  pickedFrom?: Record<string, string>;
  /** A rule-based basket: the figure each stock was picked on ("ROCE 56%", "PEG 0.80 · P/E 20.1x"),
   * shown beside it so the list can be checked against its rule. */
  pickedOn?: Record<string, string>;
};

export function BasketDetail(p: BasketDetailProps) {
  const router = useRouter();
  const [view, setView] = useState<"stocks" | "chart">("stocks");
  const [range, setRange] = useState<ChartRange>(p.initialRange ?? "1Y");
  // How the basket is weighted and rebalanced. Starts as the basket's own weighting, bought and
  // held; anything else lives in the URL (a saved basket stores equal, market cap or custom).
  // Custom weights always cover the basket's stocks and total 100: a stock missing one gets the
  // others' average, then all are scaled to fit.
  const savedCustom = (list: BasketStock[]) => toPercents(schemeShares(list, "custom", p.customWeights ?? undefined));
  const [strategy, setStrategy] = useState<Strategy>(() => heldStrategy(p.weighting, p.weighting === "custom" ? savedCustom(p.stocks) : undefined));
  // The one stock selection every list here reads (lib/baskets/selection.ts): the stocks, the custom
  // weights as typed (which may not total 100% yet; the backtest keeps the last ones that did, and
  // they are kept while another weighting is picked, so going back to Custom brings the same split
  // back), the chart's lines, where each stock was picked from and what was just taken off.
  // Every kind of basket (industry, rule-based, saved, a draft) opens with no stock lines: the
  // chart shows the basket and its benchmarks, and the reader ticks the stocks they want drawn.
  // One rule everywhere, so the first tap always adds a line (docs/STRATEGIES.md).
  const { sel, act, current, tickers } = useBasketSelection(() => {
    const ownIndustry = p.mode === "industry" && p.compareSlug === p.id;
    const chart = defaultSelection(p.indices, p.industries.filter((i) => !(p.mode === "industry" && i.slug === p.id)), p.compareSlug && !ownIndustry ? p.compareSlug : null);
    return { stocks: p.stocks, unlisted: p.unlisted, custom: p.weighting === "custom" || p.customWeights ? savedCustom(p.stocks) : null, chart, pickedFrom: p.pickedFrom };
  });
  const { stocks, confirmed, unlisted, custom: customEdit, chart: chartSel, pickedFrom, picksChosen } = sel;
  const setCustomEdit = (weights: Record<string, number> | null) => act({ type: "setCustom", weights });
  // The stocks as one string: lists that keep their order or height while on screen reset on it.
  const listKey = tickers.join(",");
  // What the server last stored for a saved basket's custom weights (by query value), so an edit saves once.
  const savedRef = useRef<string | null>(p.weighting === "custom" ? weightsParam(savedCustom(p.stocks)) : null);
  // The custom weights are typed in the stock table's Target % column: its boxes are open when
  // Custom is picked, closed with Done once they total 100% (and on a basket that opens already
  // custom); tapping Custom again, or Edit weights, opens them.
  const [weightsOpen, setWeightsOpen] = useState(p.weighting !== "custom");
  // Weight boxes holding something that isn't a number from 0 to 100 (cleared when they're left).
  const [badWeights, setBadWeights] = useState<ReadonlySet<string>>(() => new Set());
  const markBad = (t: string, on: boolean) =>
    setBadWeights((b) => {
      if (b.has(t) === on) return b;
      const next = new Set(b);
      if (on) next.add(t);
      else next.delete(t);
      return next;
    });
  const weighting = strategy.weighting;
  const sq = strategyQuery(strategy);
  const rebalanced = strategy.rebalance !== "never";
  // The rebalanced basket's chart also draws it bought and held, unless switched off.
  const [vsHeld, setVsHeld] = useState(true);
  const [name, setName] = useState(p.name);
  const [isPublic, setIsPublic] = useState(p.isPublic);
  // An empty basket of yours opens in editing, so the picker stays up while you fill it.
  const draft = p.mode === "draft";
  const [editing, setEditing] = useState(draft || (p.isOwner && p.mode === "saved" && p.stocks.length === 0));
  const [renaming, setRenaming] = useState(false);
  const [sort, setSort] = useState<Sort>("contribution");
  // The stock table measures weight and contribution within the whole basket, or (once stocks
  // are picked on the chart) within just those picks, backtested as their own basket.
  const [scope, setScope] = useState<"all" | "picks">("all");
  // Under the chart: the stocks as the dense holdings table, or as bar charts (who made the
  // return, returns, weights, industries).
  const [stockView, setStockView] = useState<"charts" | "list">("list");
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("contribution");
  const [busy, setBusy] = useState(false);
  // Create basket: "creating" while the server saves it, then "opening" while its page loads.
  const [createStep, setCreateStep] = useState<"creating" | "opening" | null>(null);
  // The confirm dialogs: sharing by link, and deleting.
  const [confirm, setConfirm] = useState<"share" | "delete" | null>(null);
  // "Link copied" on the button for a moment after a copy.
  const [copied, setCopied] = useState(false);
  // Bumped by Retry, so the stats and analysis panels drop a failed load too.
  const [reload, setReload] = useState(0);
  const [note, setNote] = useState<string | null>(p.notice ?? null);
  // Projections: off, the page is the backtest; on, every panel looks 1 or 2 years ahead from today.
  const [projOn, setProjOn] = useState(false);
  const [projSet, setProjSet] = useState<ProjectionSettings>(DEFAULT_PROJECTION);
  // The note naming the stocks left out of the projection: opens by itself the first time, and from the chip.
  const [leftNote, setLeftNote] = useState(false);
  const leftSeen = useRef(false);
  // The live settings, so two quick taps (1Y then Bear) each build on the other, never on a stale copy.
  const projRef = useRef({ on: false, set: DEFAULT_PROJECTION });
  const pickProjection = (on: boolean, change: Partial<ProjectionSettings> = {}) => {
    const next = { ...projRef.current.set, ...change };
    projRef.current = { on, set: next };
    setProjOn(on);
    setProjSet(next);
    const url = new URL(window.location.href);
    for (const k of PROJECTION_PARAMS) url.searchParams.delete(k);
    if (on) {
      url.searchParams.set("proj", "1");
      if (next.h !== DEFAULT_PROJECTION.h) url.searchParams.set("ph", String(next.h));
      if (next.scenario !== DEFAULT_PROJECTION.scenario) url.searchParams.set("ps", next.scenario);
      if (next.exit !== DEFAULT_PROJECTION.exit) url.searchParams.set("pe", next.exit);
    }
    window.history.replaceState(window.history.state, "", url);
  };
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("proj") !== "1") return;
    const h = Number(q.get("ph"));
    const sc = q.get("ps");
    const ex = q.get("pe");
    const set: ProjectionSettings = {
      h: (HORIZONS as number[]).includes(h) ? (h as Horizon) : DEFAULT_PROJECTION.h,
      scenario: (SCENARIOS as string[]).includes(sc ?? "") ? (sc as Scenario) : DEFAULT_PROJECTION.scenario,
      exit: ex === "ind" || ex === "own" ? (ex as ExitBasis) : DEFAULT_PROJECTION.exit,
    };
    projRef.current = { on: true, set };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the projection a link asked for once on mount
    setProjSet(set);
    setProjOn(true);
    // A link with a value we don't know (ph=7) is rewritten with what is shown.
    const url = new URL(window.location.href);
    for (const k of PROJECTION_PARAMS) url.searchParams.delete(k);
    url.searchParams.set("proj", "1");
    if (set.h !== DEFAULT_PROJECTION.h) url.searchParams.set("ph", String(set.h));
    if (set.scenario !== DEFAULT_PROJECTION.scenario) url.searchParams.set("ps", set.scenario);
    if (set.exit !== DEFAULT_PROJECTION.exit) url.searchParams.set("pe", set.exit);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the view the URL asked for once on mount
    if (new URLSearchParams(window.location.search).get(p.viewParam ?? "view") === "chart") setView("chart");
  }, [p.viewParam]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!STRATEGY_PARAMS.some((k) => q.has(k))) return;
    const s = parseStrategy(q, p.weighting, { w: "wt" });
    if (s.weighting === "custom") {
      // A link's weights fitted to the stocks here; none in the link: the basket's own (or equal).
      const w = s.weights ? toPercents(customTargets(p.stocks.map((x) => x.ticker), s.weights)) : savedCustom(p.stocks);
      s.weights = w;
      setCustomEdit(w);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the strategy a link asked for once on mount
    setStrategy(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount, with the server's props
  }, [p.weighting]);
  // A saved basket of yours keeps its custom weights itself, so its URL needn't carry them.
  const ownsWeights = p.mode === "saved" && p.isOwner;
  const pickStrategy = (next: Strategy) => {
    setStrategy(next);
    const url = new URL(window.location.href);
    for (const k of STRATEGY_PARAMS) url.searchParams.delete(k);
    if (!(isPlainHold(next) && next.weighting === p.weighting)) for (const [k, v] of strategyUrlParams(ownsWeights ? { ...next, weights: undefined } : next)) url.searchParams.set(k, v);
    window.history.replaceState(window.history.state, "", url);
  };
  // Carries a strategy onto the page a copy or a new basket opens on. A new saved basket stores
  // custom weights itself (they go in the create request), so `keepWeights` is only for a draft.
  const withStrategy = (path: string, keepWeights = false) => {
    if (isPlainHold(strategy) && strategy.weighting === p.weighting) return path;
    const q = new URLSearchParams(strategyUrlParams(keepWeights ? strategy : { ...strategy, weights: undefined }) as [string, string][]);
    return `${path}${path.includes("?") ? "&" : "?"}${q}`;
  };
  // What a saved basket stores: equal, market cap or custom (every weighting there is).
  const savedWeighting = weighting;
  const savedWeights = weighting === "custom" && strategy.weights ? { weights: strategy.weights } : {};
  const pickView = (v: "stocks" | "chart") => {
    setView(v);
    const url = new URL(window.location.href);
    const key = p.viewParam ?? "view";
    if (v === "chart") url.searchParams.set(key, "chart");
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
  };

  // A saved basket is backtested by its id only for the stocks the server has confirmed: the id
  // route reads the stocks from the database, so asking for it mid-save would run the old list.
  // While an add or remove is saving, the same stocks go by list (tickers=), which needs no save.
  const savedList = confirmed.length === tickers.length && tickers.every((t) => confirmed.includes(t));
  // Stocks joining on their listing day ride on every backtest of this basket (whole, picks, not
  // rebalanced), never on the industry baskets compared alongside.
  const joinQ = p.joinAtListing ? "&join=listing" : "";
  const keyFor = (q: string) =>
    p.mode === "industry"
      ? industrySeriesKey(p.id, q)
      : p.mode === "idea" || draft || !savedList
        ? (picksKey(tickers, q + joinQ) ?? `x:tickers=&${q}${joinQ}`)
        : `x:${savedBasketQuery(p.id, q, confirmed)}`;
  const basketKey = keyFor(sq);
  // The same basket at the same weights, bought and held: the rebalanced one's comparison.
  const heldKey = rebalanced ? keyFor(strategyQuery({ ...strategy, rebalance: "never" })) : null;
  // Industry baskets compared alongside run the same strategy; custom weights are this basket's
  // own stocks', so those run at equal weights.
  const compareSq = weighting === "custom" ? strategyQuery({ ...strategy, weighting: "equal", weights: undefined }) : sq;
  // Kept here, above the chart, so the reader's picks outlive weighting, range and view switches.
  const compareIndustries = p.industries.filter((i) => !(p.mode === "industry" && i.slug === p.id));
  // The industry a stock is read in here: the one it was picked from (this visit, or saved with a
  // basket), else the basket's own (an industry basket's; a saved basket's source industry; a draft's
  // or an idea's most-held one). Bharat Forge picked from EV reads as an EV part ("Electric motor &
  // e-axle"), not its home layer in defence; a stock not in that industry keeps its home layer
  // (its primary industry's).
  const contextOf = (s: BasketStock) => {
    const slug = pickedFrom[s.ticker] ?? (p.mode === "industry" ? p.id : p.mode === "saved" ? (p.sourceSector ?? null) : p.compareSlug);
    return slug && s.layerIn?.[slug] ? slug : null;
  };
  const layerOf = (s: BasketStock) => {
    const slug = contextOf(s);
    return slug ? s.layerIn[slug] : s.layer;
  };
  // Its industries with that one first, so its chip names why it is in the basket.
  const industriesOf = (s: BasketStock) => {
    const slug = contextOf(s);
    const own = slug ? s.industries.find((i) => i.slug === slug) : undefined;
    return own ? [own, ...s.industries.filter((i) => i !== own)] : s.industries;
  };
  // The stocks switched on in the chart, backtested together as their own basket (same weighting).
  const picked = useMemo(() => stocks.filter((s) => chartSel.picks[s.ticker] != null), [stocks, chartSel.picks]);
  // Every stock picked is the basket itself: no separate card, and the table needs no second backtest.
  const picksAll = picked.length > 0 && picked.length === stocks.length;
  // "Your picks" (the return card and the table's scope) waits until the reader switches a stock's
  // line on or off.
  const pickedKey = picksChosen
    ? picksKey(
        picked.map((s) => s.ticker),
        sq + joinQ,
      )
    : null;

  // With no picks left, the table goes back to the whole basket.
  const tableScope = scope === "picks" && pickedKey ? "picks" : "all";
  const tableKey = tableScope === "picks" && pickedKey && !picksAll ? pickedKey : basketKey;

  // The projection (null while Projections is off): the same stocks, weights, picks and scope as the
  // backtest, so every list and box keeps working the same with it on.
  const projection = useProjection({
    on: projOn && stocks.length > 0,
    settings: projSet,
    stocks,
    weighting,
    weights: strategy.weights,
    picked,
    picksChosen,
    scopePicks: tableScope === "picks" && !picksAll,
    volKey: stocks.length ? basketKey : null,
    reload,
  });
  const leftCount = projection?.basket.leftOut.length ?? 0;
  // The chart's lines in Projections mode: the basket's path, each stock's own (a left-out stock says why).
  const chartProjection = useMemo((): ChartProjection | null => {
    if (!projection) return null;
    const steps = projection.dates.length - 1;
    const { h, scenario, exit } = projection.settings;
    const values: Record<string, number[]> = { [basketKey]: projection.path };
    const why: Record<string, string> = {};
    for (const st of stocks) {
      const r = caseReturn(st.proj, h, scenario, exit);
      if (r != null) values[`s:${st.ticker}`] = stockPath(r, steps);
      else why[`s:${st.ticker}`] = `left out: ${(st.proj && !st.proj.ok ? st.proj.reason : "no figures in our last data update").replace(/^./, (c) => c.toLowerCase())}`;
    }
    return {
      label: projection.period,
      settings: projection.settings,
      compareWeighting: weighting === "mcap" ? "mcap" : "equal",
      dates: projection.dates,
      values,
      why,
      band: projection.sim ? { lo: projection.sim.lo, hi: projection.sim.hi } : null,
    };
  }, [projection, basketKey, stocks, weighting]);
  useEffect(() => {
    if (!projOn || !leftCount || leftSeen.current) return;
    leftSeen.current = true;
    setLeftNote(true);
  }, [projOn, leftCount]);

  // The table's backtest: the basket's own, or the picks' when it shows just the picks (the cards
  // and panels load their lines themselves; the basket's is asked for here too, so it is ready).
  const { get: at, retry: retryLoad } = useSeries(tickers.length ? [basketKey, tableKey] : [], range, { reload });
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  const rangeLong = RANGES.find((r) => r.id === range)!.long;

  const tbt = at(tableKey);
  const tData = tbt?.status === "ok" ? tbt.data : null;
  const tHoldings = new Map(((projection ? projection.table.holdings : tData?.holdings) ?? []).map((h) => [h.ticker, h]));
  // Every stock in the table's current sort: the table's rows, the chart's Stocks menu and Select
  // all (in either place) all follow this one order, so Select all ticks the top rows you see.
  const sortedLive = [...stocks].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    // Stocks with no figure go last either way.
    if (sort === "pe") return (a.pe ?? Infinity) - (b.pe ?? Infinity);
    if (sort === "mcap") return (b.mcapCr ?? -1) - (a.mcapCr ?? -1);
    const ha = tHoldings.get(a.ticker);
    const hb = tHoldings.get(b.ticker);
    const v = (h: typeof ha) => (!h ? -Infinity : sort === "return" ? h.ret : sort === "weight" ? h.endWeight : h.contribution);
    return v(hb) - v(ha);
  });
  // While the weight boxes are open the rows keep the order they had when the boxes opened: typing a
  // weight moves its stock's figures (and, with Projections on, at once), and a row that jumped would
  // take the next Tab to another stock's box. They re-sort when the boxes close.
  const boxesOpen = weighting === "custom" && stocks.length > 0 && (weightsOpen || !weightsValid(customEdit ?? undefined, tickers));
  const [heldOrder, setHeldOrder] = useState<string[] | null>(null);
  const liveOrder = sortedLive.map((x) => x.ticker).join(",");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- takes the order once as the boxes open, drops it as they close
    setHeldOrder(boxesOpen ? liveOrder.split(",") : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on opening or closing the boxes, or a new sort picked (which re-sorts at once)
  }, [boxesOpen, sort]);
  const sortedAll = heldOrder
    ? [...stocks].sort((a, b) => {
        const ia = heldOrder.indexOf(a.ticker);
        const ib = heldOrder.indexOf(b.ticker);
        // A stock added while the boxes are open goes after the rest.
        return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
      })
    : sortedLive;
  const rows = tableScope === "picks" ? sortedAll.filter((s) => chartSel.picks[s.ticker] != null) : sortedAll;
  // A stock just taken off leaves a placeholder row where it was ("Removed X · Undo"), at the
  // row's own height, while the Undo offer is open: the Undo is where the tap was (a phone's
  // header is far above), and the rows under it don't move until the offer goes.
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const ghostsShown = tableScope === "all" ? ghosts.filter((g) => sel.burst.includes(g.ticker) && !stocks.some((x) => x.ticker === g.ticker)) : [];
  const display: ({ kind: "stock"; s: BasketStock } | { kind: "ghost"; g: Ghost })[] = rows.map((x) => ({ kind: "stock", s: x }));
  for (const g of [...ghostsShown].sort((a, b) => a.index - b.index)) display.splice(Math.min(g.index, display.length), 0, { kind: "ghost", g });
  // The removed row's Undo takes the focus when the × was pressed by keyboard or tap in that row.
  const focusGhost = useRef<string | null>(null);

  // ---- owner actions ----
  // Every change is sent in order, one after the other (a quick add then remove can't reach the
  // server the other way round), and the page shows "Saving…" until the last one is back. The
  // stock list changes at once on a tap; a reply only replaces it when it is the reply to the
  // latest change, so an earlier reply can never bring back a stock taken off since.
  type Saved = { name: string; items: { ticker: string }[]; weights?: Record<string, number> | null };
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const inFlight = useRef(0);
  const itemsSeq = useRef(0);
  const patch = (body: Record<string, unknown>): Promise<Saved | null> => {
    inFlight.current++;
    setBusy(true);
    setNote(null);
    const run = queue.current.then(async () => {
      try {
        const res = await fetch(`/api/baskets/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        return (await res.json()) as Saved;
      } catch {
        setNote("Couldn’t save that change. Check your connection and try again.");
        return null;
      } finally {
        if (--inFlight.current === 0) setBusy(false);
      }
    });
    queue.current = run;
    return run;
  };
  const universe = useMemo(() => new Map((p.universe ?? []).map((s) => [s.ticker, s])), [p.universe]);
  // An add or remove: the list already shows it; the server's list is applied only from the reply
  // to the latest one (the server may have left out a stock past the limit). A failed latest
  // change reloads the basket as saved, so the page never shows what the server doesn't have; the
  // selection then brings back a stock's weight and chart line with it (or drops them), together.
  const patchItems = async (body: Record<string, unknown>) => {
    const seq = ++itemsSeq.current;
    let res = await patch(body);
    if (seq !== itemsSeq.current) return;
    if (!res) res = await fetch(`/api/baskets/${p.id}`).then((r) => (r.ok ? (r.json() as Promise<Saved>) : null), () => null);
    if (!res || seq !== itemsSeq.current) return;
    const cur = current();
    const known = new Map<string, BasketStock>([...universe, ...cur.stocks.map((s) => [s.ticker, s] as const), ...Object.values(cur.takenOff).map((o) => [o.stock.ticker, o.stock] as const)]);
    act({ type: "sync", items: res.items.map((i) => i.ticker), known, weights: weighting === "custom" ? res.weights : null });
    const w = current().custom;
    if (weighting === "custom" && w && Object.keys(w).length) reweigh(w);
  };
  // Custom weights follow the stocks (the selection keeps them over exactly the stocks in it): a
  // new one gets an equal share and the rest shrink in proportion; one taken off leaves the rest
  // in proportion, scaled back up to 100%; one put back gets the % it had.
  const reweigh = (next: Record<string, number>) => {
    if (ownsWeights) savedRef.current = weightsParam(next);
    if (Object.keys(next).length) pickStrategy({ ...strategy, weights: next });
    return next;
  };
  // The weights to send with an add or remove (a custom basket's, after the change).
  const weightsAfter = () => {
    const w = current().custom;
    return weighting === "custom" && w ? { weights: reweigh(w) } : {};
  };
  // The industry each of these stocks was picked from, for the server to keep with them (so its
  // layer label survives a reload). Left out when none was picked from an industry.
  const pickedFromFor = (list: string[]) => {
    const from = current().pickedFrom;
    const keep = list.filter((t) => from[t]);
    return keep.length ? { pickedFrom: Object.fromEntries(keep.map((t) => [t, from[t]])) } : {};
  };
  // Nothing changes while "Create basket" is saving the list or the basket is being deleted.
  const [deleting, setDeleting] = useState(false);
  const locked = createStep != null || deleting;
  const add = async (list: string[], fromIndustry?: string) => {
    if (locked) return;
    const { fresh, asked } = planAdd(current().stocks, list.flatMap((t) => (universe.has(t) ? [universe.get(t)!] : [])));
    // The limit cut some off: say so, rather than quietly adding fewer.
    if (asked > fresh.length) setNote(`Added ${fresh.length} of ${asked}: a basket holds up to ${MAX_BASKET_STOCKS} stocks.`);
    else setNote(null);
    if (!fresh.length) return;
    act({ type: "add", stocks: fresh, from: fromIndustry });
    const weights = weightsAfter();
    if (!draft) await patchItems({ add: fresh.map((s) => s.ticker), ...weights, ...pickedFromFor(fresh.map((s) => s.ticker)) });
  };
  // Taking a stock off is soft: it goes at once, with "Removed X · Undo" in the status line.
  const remove = async (t: string) => {
    if (locked) return;
    // A saved stock the maps no longer list: it can only be taken off (no weight, line or Undo).
    if (current().unlisted.includes(t)) {
      act({ type: "removeUnlisted", ticker: t });
      return void (await patchItems({ remove: [t] }));
    }
    if (!current().stocks.some((s) => s.ticker === t)) return;
    const index = display.findIndex((it) => it.kind === "stock" && it.s.ticker === t);
    if (index >= 0) {
      // Each list's row height (the phone list and the table are both rendered; CSS shows one).
      const h: Ghost["h"] = {};
      for (const el of document.querySelectorAll<HTMLElement>(`[data-basket-row="${CSS.escape(t)}"]`)) {
        if (el.dataset.list === "table" || el.dataset.list === "phone") h[el.dataset.list] = el.offsetHeight || undefined;
        if (el.contains(document.activeElement)) focusGhost.current = t;
      }
      const offerOpen = current().lastRemoved != null;
      const name = current().stocks.find((x) => x.ticker === t)?.name ?? t;
      setGhosts((g) => [...(offerOpen ? g.filter((x) => x.ticker !== t) : []), { ticker: t, name, index, h }]);
    }
    act({ type: "remove", ticker: t });
    setNote(null);
    const weights = weightsAfter();
    if (!draft) await patchItems({ remove: [t], ...weights });
  };
  // Undo brings back every stock taken off while the offer was open (two quick removes are one
  // Undo), latest first, so each goes back to its place with the weight it had.
  const undo = async () => {
    const list = [...current().burst].reverse();
    if (locked || !list.length) return;
    for (const t of list) act({ type: "restore", ticker: t });
    const back = list.filter((t) => current().stocks.some((s) => s.ticker === t));
    if (!back.length) return;
    const weights = weightsAfter();
    if (!draft) await patchItems({ add: back, ...weights, ...pickedFromFor(back) });
  };
  // The Undo offer stays a while, then the line goes back to its usual text.
  const lastRemoved = sel.lastRemoved;
  useEffect(() => {
    if (!lastRemoved) return;
    const timer = setTimeout(() => act({ type: "dismissUndo" }), 12_000);
    return () => clearTimeout(timer);
  }, [lastRemoved, act]);
  // A stock's chart line on or off: the table's tick and the chart's Stocks menu both come here,
  // so they always agree. With every line slot taken, a note opens beside the box that was tapped
  // (over the row, so nothing moves) and says why nothing happened.
  const [fullAt, setFullAt] = useState<string | null>(null);
  useEffect(() => {
    if (!fullAt) return;
    const timer = setTimeout(() => setFullAt(null), 4000);
    return () => clearTimeout(timer);
  }, [fullAt]);
  const togglePick = (t: string) => {
    const cur = current().chart.picks;
    if (cur[t] == null && Object.keys(cur).length >= MAX_CHART_STOCKS) return setFullAt(t);
    act({ type: "togglePick", ticker: t });
    setFullAt(null);
  };
  const pickAll = () => act({ type: "pickAll", order: sortedAll.map((x) => x.ticker) });
  const pickNone = () => {
    act({ type: "pickNone" });
    setFullAt(null);
  };
  const removedName = !lastRemoved ? null : sel.burst.length > 1 ? `${sel.burst.length} stocks` : (sel.takenOff[lastRemoved]?.stock.name ?? lastRemoved);
  const setWeight = async (w: WeightScheme) => {
    if (w === "custom") setWeightsOpen(true);
    if (w === weighting) return;
    if (w !== "custom") {
      pickStrategy({ ...strategy, weighting: w, weights: undefined });
      // A saved basket keeps equal or market cap as its own.
      if (ownsWeights) await patch({ weighting: w });
      return;
    }
    // Custom brings back the split set before (this visit, or saved with the basket); the first
    // time, it starts from the weights the basket had a moment ago, so nothing jumps.
    const start = toPercents(customEdit && tickers.some((t) => customEdit[t] != null) ? customTargets(tickers, customEdit) : schemeShares(stocks, weighting));
    setCustomEdit(start);
    pickStrategy({ ...strategy, weighting: "custom", weights: start });
    if (ownsWeights && stocks.length) {
      savedRef.current = weightsParam(start);
      await patch({ weighting: "custom", weights: start });
    }
  };
  // Starting points for the custom weights, worked out from the stocks in the basket right now.
  const resetTargets = useMemo(
    () => ({ equal: toPercents(schemeShares(stocks, "equal")), mcap: toPercents(schemeShares(stocks, "mcap")) }),
    [stocks],
  );
  const blockedNote = "Make the custom weights total 100% first.";
  // One stock's % typed (or a Reset): the backtest follows once they total 100%, and a
  // saved basket of yours keeps them (a moment after the last keystroke).
  const editWeights = (next: Record<string, number>) => {
    setCustomEdit(next);
    if (!weightsValid(next, tickers)) return;
    // Reset to market cap shows each share to one decimal; the backtest takes the exact shares, so
    // it gives the M-cap weighting's figure to the last digit (equal ones snap in customTargets).
    const isMcap = tickers.every((t) => Math.abs((next[t] ?? 0) - (resetTargets.mcap[t] ?? 0)) < 1e-9);
    const exact = isMcap ? Object.fromEntries([...schemeShares(stocks, "mcap")].map(([t, v]) => [t, v * 100])) : next;
    pickStrategy({ ...strategy, weights: exact });
    setNote((n) => (n === blockedNote ? null : n));
  };
  // Weights typed but not yet sent (the 700ms wait): leaving the page sends them at once, so the
  // last edit is never lost to a navigation.
  const unsent = useRef<Record<string, number> | null>(null);
  useEffect(() => {
    // Nothing to send (or an add/remove already sent these weights): nothing waits to be flushed.
    if (!ownsWeights || weighting !== "custom" || !strategy.weights) return void (unsent.current = null);
    const q = weightsParam(strategy.weights);
    if (q === savedRef.current) return void (unsent.current = null);
    const w = strategy.weights;
    unsent.current = w;
    const timer = setTimeout(() => {
      savedRef.current = q;
      unsent.current = null;
      patch({ weights: w });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saves when the weights change, nothing else
  }, [ownsWeights, weighting, strategy.weights]);
  useEffect(() => {
    // keepalive lets the request finish after the page is gone (a tab closed, a link followed).
    const flush = () => {
      const w = unsent.current;
      if (!w) return;
      unsent.current = null;
      fetch(`/api/baskets/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights: w }), keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [p.id]);
  // Sharing: a private basket asks first (what "shared by link" means), then copies the link inside
  // that tap (Safari refuses a clipboard write that comes after a network wait) and opens it to
  // anyone with the link. A shared one just copies. The button says "Link copied" for a moment.
  const shareUrl = () => `${window.location.origin}/baskets/${p.id}`;
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCopied = (ok: boolean) => {
    if (!ok) return setNote(`Copy this link to share it: ${shareUrl()}`);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2500);
  };
  const copyLink = async () => showCopied(await copyNow(shareUrl()));
  const share = async () => {
    const copiedOk = copyNow(shareUrl());
    setConfirm(null);
    // The badge and button change at once; a failed save puts them back.
    setIsPublic(true);
    const res = await patch({ isPublic: true });
    if (!res) {
      setIsPublic(false);
      return setNote("Couldn’t share it right now. Try again.");
    }
    const ok = await copiedOk;
    showCopied(ok);
    if (ok) setNote("Link copied. Anyone with it can view this basket; “Make private” in the ⋯ menu stops that.");
  };
  const unshare = async () => {
    setIsPublic(false);
    if (await patch({ isPublic: false })) setNote("Private again: only you can see this basket. The old link no longer opens it.");
    else setIsPublic(true);
  };
  const destroy = async () => {
    setDeleting(true);
    const res = await fetch(`/api/baskets/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) router.push("/baskets");
    else {
      setDeleting(false);
      setConfirm(null);
      setNote("Couldn’t delete the basket right now.");
    }
  };
  // Custom weights that don't total 100% yet can't be saved as a new basket.
  const customBlocked = weighting === "custom" && tickers.length > 0 && !weightsValid(customEdit ?? undefined, tickers);
  // Copy to my baskets opens Create basket with this basket's stocks, name and settings, as an
  // unsaved draft: nothing is saved until "Create basket" there, so looking never leaves a basket
  // behind. Signed out, sign in first and come back to the same draft.
  const copy = () => {
    if (customBlocked) return setNote(blockedNote);
    const from = p.mode === "industry" ? `industry:${p.id}` : p.mode === "idea" ? `idea:${p.id}` : `basket:${p.id}`;
    const to = withStrategy(`/baskets/new?from=${encodeURIComponent(from)}`, true);
    setBusy(true);
    router.push(p.signedIn ? to : `/login?next=${encodeURIComponent(to)}`);
  };
  useEffect(() => {
    // A basket just created on Create basket: the chart's comparisons as they were there.
    if (p.mode !== "saved") return;
    let got: { benches?: unknown; compare?: unknown } | null = null;
    try {
      const raw = sessionStorage.getItem(`${CHART_HANDOFF}${p.id}`);
      sessionStorage.removeItem(`${CHART_HANDOFF}${p.id}`);
      got = raw ? JSON.parse(raw) : null;
    } catch {}
    if (!got || !Array.isArray(got.benches) || !Array.isArray(got.compare)) return;
    const benchIds = new Set([...p.indices, ...p.market].map((b) => b.id));
    const slugs = new Set(p.industries.map((i) => i.slug));
    const benches = got.benches.filter((b): b is string => typeof b === "string" && benchIds.has(b));
    const compare = got.compare.filter((c): c is string => typeof c === "string" && slugs.has(c));
    act({ type: "chart", next: (c) => ({ ...c, benches, compare }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [p.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a fresh copy opens straight into editing
    if (p.isOwner && new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, [p.isOwner]);

  const canEdit = (p.mode === "saved" && p.isOwner) || draft;
  // The foot-of-screen note (baskets you can't edit) goes by itself after a few seconds.
  useEffect(() => {
    if (canEdit || !note) return;
    const timer = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(timer);
  }, [canEdit, note]);
  // Create basket: saves the stocks picked so far under the name typed (numbered by the server if
  // taken). It needs a name, at least one stock and, when custom, weights that total 100%; until
  // then the button is off and the line under it says what is missing.
  const createBlocker = !tickers.length ? "Add at least one stock to create the basket." : !name.trim() ? "Name your basket to create it." : customBlocked ? blockedNote : null;
  const createDraft = async () => {
    if (createBlocker) return setNote(createBlocker);
    setBusy(true);
    setCreateStep("creating");
    setNote(null);
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, name: name.trim(), weighting: savedWeighting, ...savedWeights, ...pickedFromFor(tickers), ...(p.sourceSector ? { sourceSector: p.sourceSector } : {}) }) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) {
      // What the chart was compared with here goes with it, so the new basket's page opens on the
      // same lines (its own default would add its industry's index and basket).
      try {
        sessionStorage.setItem(`${CHART_HANDOFF}${json.id}`, JSON.stringify({ benches: chartSel.benches, compare: chartSel.compare }));
      } catch {}
      setCreateStep("opening");
      return router.push(withStrategy(`/baskets/${json.id}`));
    }
    setBusy(false);
    setCreateStep(null);
    if (res?.status === 401) return router.push(`/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
    setNote(json?.error === "limit" ? basketCreateError(json) : "Couldn’t create the basket right now. Try again.");
  };
  // The stock picker (draft and your saved baskets): the same bar in the same place, under the header.
  const picker = (
    <StockPicker
      universe={p.universe ?? []}
      industries={p.industries}
      initialIndustry={p.compareSlug}
      watchlist={p.watchlist}
      have={new Set(tickers)}
      room={MAX_BASKET_STOCKS - stocks.length}
      locked={locked}
      onAdd={add}
      onRemove={remove}
    />
  );
  const Title = p.titleAs ?? "h1";
  const statusId = useId();
  // Desktop shows the chart and the stock table together; phones switch between them. CSS
  // decides (max-lg:hidden), so a resize or rotation across the breakpoint needs no event.
  const theme = useSiteTheme();
  const onlyOn = (v: "stocks" | "chart") => (view === v ? "" : "max-lg:hidden");
  // Dense controls: flat segmented groups with mono labels, at least 36px tall on phones for taps.
  const segBtn = (on: boolean) =>
    "min-h-9 border-r border-line px-2 font-mono text-[11px] font-semibold last:border-r-0 sm:min-h-7 sm:px-2.5 pointer-coarse:min-h-9 pointer-coarse:min-w-9 " + (on ? "bg-ink text-bg" : "text-ink-soft hover:text-ink");
  const btn = "inline-flex min-h-9 items-center justify-center rounded border px-3 text-xs font-semibold disabled:opacity-40 sm:min-h-8 pointer-coarse:min-h-9";
  const btnPri = btn + " border-accent bg-accent text-bg hover:opacity-90";
  const btnSec = btn + " border-line bg-bg text-ink hover:border-accent";
  const ctlLabel = "text-[10px] font-semibold uppercase tracking-wider text-ink-soft";
  // Headings under the basket's name: h2 on its own page, h3 where the basket is itself an h2.
  const heading = Title === "h2" ? "h3" : "h2";
  // Retry: the table's backtest, and every panel's failed load with it (reload).
  const retry = () => {
    setReload((n) => n + 1);
    retryLoad(tableKey);
  };

  const WEIGHT_HELP: Record<WeightScheme, string> = {
    equal: "Every stock the same share",
    mcap: "By market cap",
    custom: "Set each stock's % yourself",
  };
  const weightingControl = (
    <div className={MINI_SEG} role="group" aria-label="Weighting">
      {WEIGHT_SCHEMES.map((w) => (
        <button key={w} type="button" aria-pressed={weighting === w} onClick={() => setWeight(w)} title={WEIGHT_HELP[w]} className={segBtn(weighting === w)}>
          {SCHEME_SHORT[w]}
        </button>
      ))}
    </div>
  );
  const RULE_HELP = {
    never: "No rebalancing: bought on the first day, then left to move with prices",
    monthly: "Back to the target weights on the first trading day of each month",
    quarterly: "Back to the target weights on the first trading day of each quarter",
    drift: "Back to the target weights once any stock drifts past the band",
  };
  const rebalanceControl = (
    <div className={MINI_SEG} role="group" aria-label="Rebalancing">
      {REBALANCE_RULES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={!projOn && strategy.rebalance === r}
          disabled={projOn}
          onClick={() => pickStrategy({ ...strategy, rebalance: r })}
          title={projOn ? "Projections are bought today and held, so rebalancing doesn’t apply" : RULE_HELP[r]}
          className={segBtn(!projOn && strategy.rebalance === r) + " disabled:cursor-default disabled:opacity-40"}
        >
          {REBALANCE_BUTTON[r]}
        </button>
      ))}
    </div>
  );
  // The setting the drift rule takes: its band.
  const numSelect = (label: string, value: number, choices: number[], unit: string, set: (v: number) => void) => (
    <label className="flex items-center gap-1">
      <span className={ctlLabel}>{label}</span>
      <select
        value={value}
        disabled={!drift}
        onChange={(e) => set(Number(e.target.value))}
        className="min-h-9 rounded border border-line bg-bg px-1 font-mono text-[11px] text-ink sm:min-h-7 pointer-coarse:min-h-9"
      >
        {[...new Set([...choices, value])]
          .sort((a, b) => a - b)
          .map((c) => (
            <option key={c} value={c}>
              {c}
              {unit}
            </option>
          ))}
      </select>
    </label>
  );
  // A target weight wide enough for the band's example to have a lower trigger above zero.
  const bandEx = Math.max(20, strategy.band * 2);
  // Always laid out, hidden unless Drift is picked, so picking it never re-wraps the controls row.
  const drift = strategy.rebalance === "drift";
  const strategySettings = (
    <span aria-hidden={!drift || undefined} className={"flex items-center gap-1.5 " + (drift ? "" : "invisible")}>
      {numSelect("Band", strategy.band, BAND_CHOICES, " pts", (v) => pickStrategy({ ...strategy, band: v }))}
      <InfoTip label="What the drift band means">
        <p>
          Rebalance when any stock is more than <b>{strategy.band} pts above or below</b> its target weight. Every stock then goes back
          to its target at the next day&rsquo;s close.
        </p>
        <p className="mt-1.5 text-ink-soft">
          Example: a {bandEx}% target triggers above {bandEx + strategy.band}% or below {bandEx - strategy.band}%. A stock whose target is
          {" "}{strategy.band}% or less can only trigger on the way up.
        </p>
      </InfoTip>
    </span>
  );
  const rangeControl = (
    <div className={MINI_SEG} role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={segBtn(range === r.id) + " min-w-9 sm:min-w-0"}>
          {r.id}
        </button>
      ))}
    </div>
  );

  // Projections: the switch, then (on) how far ahead, which case and where the multiple ends up.
  const projSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={projOn}
      disabled={!stocks.length}
      onClick={() => pickProjection(!projRef.current.on)}
      title={!stocks.length ? "Add stocks to see a projection" : projOn ? "Back to the backtest" : "Project the basket 1 or 2 years ahead from today"}
      className={
        "inline-flex flex-none items-center gap-1.5 rounded border px-2 font-sans text-[11px] font-semibold min-h-9 sm:min-h-7 pointer-coarse:min-h-9 disabled:opacity-40 " +
        (projOn ? "border-accent bg-accent/10 text-ink" : "border-line bg-bg text-ink-soft hover:text-ink")
      }
    >
      <span aria-hidden className={"relative inline-block h-3.5 w-6 flex-none rounded-full transition-colors " + (projOn ? "bg-accent" : "bg-line")}>
        <span className={"absolute top-0.5 h-2.5 w-2.5 rounded-full bg-bg transition-[left] " + (projOn ? "left-3" : "left-0.5")} />
      </span>
      Projections
    </button>
  );
  const projSeg = <K extends keyof ProjectionSettings>(label: string, field: K, choices: readonly ProjectionSettings[K][], text: (v: ProjectionSettings[K]) => string, help: (v: ProjectionSettings[K]) => string) => (
    <div className="flex items-center gap-1.5">
      <span className={ctlLabel}>{label}</span>
      <div className={MINI_SEG} role="group" aria-label={label}>
        {choices.map((c) => (
          <button key={String(c)} type="button" aria-pressed={projSet[field] === c} onClick={() => pickProjection(true, { [field]: c })} title={help(c)} className={segBtn(projSet[field] === c) + " min-w-9 sm:min-w-0"}>
            {text(c)}
          </button>
        ))}
      </div>
    </div>
  );
  const projControls = (
    <>
      {projSeg("Next", "h", HORIZONS, (h) => `${h}Y`, (h) => `Project ${HORIZON_LONG[h]} ahead`)}
      {projSeg("Case", "scenario", SCENARIOS, (c) => SCENARIO_LABEL[c], (c) =>
        c === "bear" ? "Slower growth, lowest margin, exit multiple 10% lower" : c === "bull" ? "Faster growth, highest margin, exit multiple 10% higher" : "Its usual growth and margin",
      )}
      <div className="flex items-center gap-1.5">
        {projSeg("Exit at", "exit", ["own", "ind"] as const, (e) => EXIT_LABEL[e as ExitBasis], (e) =>
          e === "own" ? "Today’s P/E moves toward the stock’s own median of the last 3 years" : "Today’s P/E moves toward its industry’s median P/E",
        )}
        <InfoTip label="How projections work">
          <p>
            Each stock grows from today&rsquo;s earnings at its usual pace, valued at a P/E moving toward its own or its industry&rsquo;s median.
            Bear and Bull take slower or faster growth, margins and multiples. Details in the Assumptions tab.
          </p>
          <p className="mt-1.5 text-ink-soft">{PROJECTION_DISCLAIMER}</p>
        </InfoTip>
      </div>
      {leftCount > 0 && (
        <button type="button" onClick={() => setLeftNote(true)} className="inline-flex min-h-9 items-center rounded border border-amber px-2 text-[11px] font-semibold text-amber-ink sm:min-h-7 pointer-coarse:min-h-9">
          {leftCount} left out ›
        </button>
      )}
    </>
  );

  // The holdings table's sortable headers: numbers sort high to low, P/E low to high, names A to Z.
  const sortHead = (id: Sort, label: string, right = true) => (
    <th scope="col" aria-sort={sort === id ? (id === "name" || id === "pe" ? "ascending" : "descending") : "none"} className={"px-2 py-1.5 font-semibold " + (right ? "text-right" : "text-left")}>
      <button type="button" onClick={() => setSort(id)} className={"tap-y inline-flex min-h-6 items-center whitespace-nowrap uppercase tracking-wider hover:text-ink pointer-coarse:min-h-9 " + (sort === id ? "text-ink" : "")}>
        {label}
        {sort === id && <span aria-hidden>{id === "name" || id === "pe" ? " ▲" : " ▼"}</span>}
      </button>
    </th>
  );
  // A saved basket always has the column: a stock whose price at adding isn't recorded yet shows
  // "—" with the reason, rather than the column coming and going.
  const sinceShown = p.mode === "saved";
  const sinceWhy = (t: string) =>
    p.addPrices[t] == null
      ? "The price when it was added isn't recorded yet: it is taken from the live quote a few seconds after adding. Reload to see the move."
      : "No closing price for it in this range.";
  const moveSinceAdded = (t: string) => {
    const added = p.addPrices[t];
    const last = tData?.last?.[t];
    return added && last ? (last / added - 1) * 100 : null;
  };
  // One rule at every width: green up, red down, and a move that shows as 0.0% in neutral grey.
  const sinceTone = (v: number | null) => {
    const r = v == null ? 0 : shownPct(v);
    return r > 0 ? "text-pos" : r < 0 ? "text-danger" : "text-ink-soft";
  };
  const excludedNote = (t: string) => {
    if (projection) {
      const lo = projection.table.leftOut.find((l) => l.ticker === t);
      if (lo) return `Left out: ${lo.reason}`;
      return (projection.shares.get(t) ?? 0) <= 0 ? "Set to 0%" : null;
    }
    const ex = tData?.excluded?.find((e) => e.ticker === t);
    if (!ex) return null;
    if (ex.reason === "zero") return "Set to 0%";
    return ex.reason === "late" && ex.from ? `Listed ${fmtMonth(ex.from)}, not in this period` : "No price data";
  };
  const removeButton = (s: { ticker: string; name: string }, small = false) => (
    <RemoveButton ticker={s.ticker} name={s.name} small={small} disabled={locked} onRemove={remove} />
  );
  // While editing toggles, the remove column keeps its width (an empty cell when not editing), so
  // the table never re-flows under the reader.
  const showRemove = canEdit && editing;
  // The table's × means one of two things, never both: in Your picks it hides the stock's line (so
  // it leaves the picks; the basket keeps it), in All stocks on a basket being edited it takes the
  // stock out of the basket (with Undo; its line goes with it). Elsewhere a row has no ×.
  const xColumn = canEdit || tableScope === "picks";
  const xFor = (s: { ticker: string; name: string }, small = false) =>
    tableScope === "picks" ? (
      <RemoveButton ticker={s.ticker} name={s.name} small={small} label={`Hide ${s.name}'s line`} title="Hide line: off the chart and out of your picks (it stays in the basket)" onRemove={togglePick} />
    ) : showRemove ? (
      removeButton(s, small)
    ) : null;
  const emptyText = draft
    ? "No stocks yet. Pick an industry or your watchlist above and add stocks; the returns and chart fill in as you go."
    : canEdit
      ? "This basket is empty. Add stocks with the picker above."
      : "This basket has no stocks yet.";
  // Table / Breakdown: the body keeps the height it had at the switch (until the stocks change),
  // so going to the shorter view never pulls the panels below it up.
  const stockBodyRef = useRef<HTMLDivElement>(null);
  const [bodyLock, setBodyLock] = useState<{ key: string; h: number } | null>(null);
  const stockBodyMin = bodyLock?.key === `${listKey}|${range}|${tableScope}` ? bodyLock.h : null;
  const pickStockView = (v: "charts" | "list") => {
    if (v === stockView) return;
    const h = stockBodyRef.current?.offsetHeight;
    if (h) setBodyLock({ key: `${listKey}|${range}|${tableScope}`, h: Math.max(h, stockBodyMin ?? 0) });
    setStockView(v);
  };
  // The stock's chart line as a tick: its colour and dash when on, an empty box when off. The same
  // action as its switch in the chart's Stocks menu.
  const linesFull = Object.keys(chartSel.picks).length >= MAX_CHART_STOCKS;
  const lineTick = (s: { ticker: string; name: string }) => {
    const slot = chartSel.picks[s.ticker];
    const on = slot != null;
    const line = on ? stockLine(theme, slot) : null;
    return (
      <span className="relative flex flex-none">
      <button
        type="button"
        data-line-box
        role="checkbox"
        aria-checked={on}
        aria-disabled={(!on && linesFull) || undefined}
        aria-label={`Show ${s.name}'s line on the chart`}
        title={on ? "Line on the chart: tap to hide it" : linesFull ? LINES_FULL : "Draw its line on the chart"}
        onClick={() => togglePick(s.ticker)}
        // Up and down move between the line boxes (Tab goes through the row as usual).
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          const boxes = [...(e.currentTarget.closest("table, ul")?.querySelectorAll<HTMLElement>("[data-line-box]") ?? [])];
          const next = boxes[boxes.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
          if (next) {
            e.preventDefault();
            next.focus();
          }
        }}
        className={
          "flex h-7 w-8 flex-none items-center justify-center rounded border bg-bg pointer-coarse:h-9 pointer-coarse:w-9 max-sm:h-9 max-sm:w-9 " +
          (on ? "border-2" : "border-line hover:border-accent ") +
          (!on && linesFull ? "cursor-not-allowed opacity-45" : "")
        }
        style={line ? { borderColor: line.color } : undefined}
      >
        <svg aria-hidden width="18" height="8" viewBox="0 0 18 8">
          {line && <line x1="2" y1="4" x2="16" y2="4" stroke={line.color} strokeWidth="2.5" strokeDasharray={DASHARRAY[line.dash]} strokeLinecap="round" />}
        </svg>
      </button>
      {fullAt === s.ticker && (
        <span role="status" className="absolute left-full top-1/2 z-10 ml-2 w-52 -translate-y-1/2 rounded border border-line bg-panel px-2 py-1 text-[11px] leading-snug text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.45)]">
          {LINES_FULL}
        </span>
      )}
      </span>
    );
  };
  // Custom weights, typed in the Target % column while Custom is open (one place to edit them).
  const editingWeights = weighting === "custom" && stocks.length > 0 && (weightsOpen || customBlocked);
  const weightValues = customEdit ?? {};
  const weightTotal = weightsTotal(Object.fromEntries(stocks.map((s) => [s.ticker, weightValues[s.ticker] ?? 0])));
  const weightOff = Math.round((100 - weightTotal) * 10) / 10;
  const weightsOk = Math.abs(weightOff) < 0.05 && badWeights.size === 0;
  // In Your picks each box still sets the stock's % of the whole basket; its share of the picks is
  // those %s scaled up in proportion, shown on hover.
  const pickShare = pickedKey && !picksAll ? toPercents(customTargets(picked.map((s) => s.ticker), weightValues)) : null;
  const weightBox = (s: BasketStock) => (
    <WeightInput
      label={`${s.name} weight, %`}
      title={pickShare?.[s.ticker] != null ? `Its % of the whole basket (${pickShare[s.ticker].toFixed(1)}% of your picks)` : "Its % of the whole basket"}
      value={weightValues[s.ticker] ?? 0}
      onCommit={(v) => editWeights({ ...weightValues, [s.ticker]: v })}
      onBad={(b) => markBad(s.ticker, b)}
    />
  );
  // Every column of the desktop table, for a row that spans them all (a removed stock's placeholder).
  const tableCols = 8 + (p.pickedOn ? 1 : 0) + (sinceShown ? 1 : 0) + (xColumn ? 1 : 0);
  // A removed stock's placeholder: its name and the Undo (which brings back every stock taken off
  // while the offer is open, as the header's does).
  const ghostLine = (g: Ghost) => (
    <span className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-soft">
      <span>
        Removed <b className="font-semibold text-ink">{g.name}</b>
        {busy && canEdit && !draft ? " · Saving…" : ""}
      </span>
      <button
        type="button"
        ref={(el) => {
          // Keeps the keyboard where the × was: the visible copy (phone list or table) takes the focus.
          if (el && focusGhost.current === g.ticker && el.offsetParent) {
            focusGhost.current = null;
            el.focus({ preventScroll: true });
          }
        }}
        onClick={undo}
        disabled={locked}
        title={sel.burst.length > 1 ? `Brings back the ${sel.burst.length} stocks just removed` : undefined}
        className="tap-y font-semibold text-accent underline disabled:opacity-40"
      >
        Undo
      </button>
    </span>
  );
  const stripBtn =
    "inline-flex min-h-9 items-center rounded border border-line bg-bg px-2 text-[11px] font-semibold text-ink hover:border-accent disabled:cursor-default disabled:text-ink-soft disabled:hover:border-line sm:min-h-6 pointer-coarse:min-h-9";
  // The strip over the stock list: chart lines (Select all, Clear all) or, when Custom, the weights'
  // total and its Resets. Always laid out at one height (three rows on phones, two from sm), so
  // switching the weighting or a message coming never moves the list or the panels below.
  const linesStrip = (() => {
    const custom = weighting === "custom" && stocks.length > 0;
    const pickedCount = picked.length;
    const message = custom
      ? editingWeights
        ? badWeights.size
          ? "Type a number from 0 to 100 in each box."
          : Math.abs(weightOff) < 0.05
            ? `Type each stock's % in Target %; they total 100%.${ownsWeights ? " Saved with the basket." : ""}`
            : `Total is ${weightTotal.toFixed(1)}%: ${weightOff > 0 ? `add ${weightOff.toFixed(1)}%` : `take off ${(-weightOff).toFixed(1)}%`} to make 100%. Results wait until then.`
        : "Target % shows your weights. Edit weights to change them."
      : pickedCount === 0
        ? `Tick a stock to draw its line on the chart (up to ${MAX_CHART_STOCKS}).`
        : linesFull && stocks.length > MAX_CHART_STOCKS
          ? `${MAX_CHART_STOCKS} lines on: the chart's limit. Untick one to show another.`
          : pickedCount === stocks.length
            ? "Every stock's line is on the chart. Untick a box to hide one."
            : `Lines on the chart for the ticked stocks. Tick more (up to ${MAX_CHART_STOCKS}) or untick to hide.`;
    return (
      <div className="flex flex-col gap-1 border-b border-line/70 px-3 py-1.5">
        <div className="flex flex-col gap-1 sm:min-h-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <span className="flex min-h-4 items-baseline gap-2">
            <span className={ctlLabel}>{custom ? "Custom weights" : "Chart lines"}</span>
            {custom ? (
              <span className={"font-mono text-[11px] font-semibold " + (weightsOk || !editingWeights ? "text-pos" : "text-danger")}>Total {weightTotal.toFixed(1)}%</span>
            ) : (
              <span className="font-mono text-[11px] text-ink-soft">
                {pickedCount} of {stocks.length} on
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {custom && editingWeights ? (
              <>
                {(
                  [
                    ["equal", "Reset to equal"],
                    ["mcap", "Reset to market cap"],
                  ] as const
                ).map(([k, text]) => {
                  // Greyed out while the weights already are that scheme's, so the buttons show where you are.
                  const now = stocks.every((st) => Math.abs((weightValues[st.ticker] ?? 0) - (resetTargets[k][st.ticker] ?? 0)) < 0.05);
                  return (
                    <button key={k} type="button" onClick={() => editWeights(resetTargets[k])} disabled={now} title={now ? `The weights are ${k === "equal" ? "equal" : "by market cap"} now` : undefined} className={stripBtn}>
                      {text}
                    </button>
                  );
                })}
                {/* A text button, so closing the boxes never looks like removing a stock. Off until they total 100%. */}
                <button
                  type="button"
                  onClick={() => setWeightsOpen(false)}
                  disabled={!weightsOk}
                  title={!weightsOk ? "Make the weights total 100% first" : undefined}
                  className="inline-flex min-h-9 items-center rounded bg-accent px-3 text-[11px] font-semibold text-bg hover:opacity-90 disabled:opacity-40 sm:min-h-6 pointer-coarse:min-h-9"
                >
                  Done
                </button>
              </>
            ) : custom ? (
              <button type="button" onClick={() => setWeightsOpen(true)} className={stripBtn}>
                Edit weights
              </button>
            ) : (
              <>
                <button type="button" onClick={pickAll} disabled={pickedCount >= Math.min(stocks.length, MAX_CHART_STOCKS)} title={stocks.length > MAX_CHART_STOCKS ? `Draws the first ${MAX_CHART_STOCKS}: the chart's line limit` : undefined} className={stripBtn}>
                  Select all
                </button>
                <button type="button" onClick={pickNone} disabled={pickedCount === 0} className={stripBtn}>
                  Clear all
                </button>
              </>
            )}
          </span>
        </div>
        <p role={custom ? "status" : undefined} className={"min-h-[1.875rem] text-[11px] leading-snug sm:min-h-4 " + (custom && editingWeights && !weightsOk ? "font-semibold text-danger" : "text-ink-soft")}>
          {message}
        </p>
      </div>
    );
  })();
  // Below lg the statistics sit in the results column; from lg, compact in the side column. Both
  // are rendered and CSS shows one (the side column is lg:flex, this copy lg:hidden), so the server
  // sends the panel in its place and nothing appears after the page loads.
  const empty = stocks.length === 0;
  const stats = (compact: boolean) =>
    projOn ? (
      <ProjectionStats view={projection} compact={compact} heading={heading} empty={empty} scope={tableScope === "picks" ? "whole basket" : undefined} />
    ) : (
    <BasketStats range={range} basketKey={basketKey} name={name} strategy={strategy} stocks={stocks} compact={compact} heading={heading} reload={reload} empty={empty} scope={tableScope === "picks" ? "whole basket" : undefined} />
    );
  const narrowStats = <div className="flex min-w-0 flex-col lg:hidden">{stats(false)}</div>;
  const [tableBoxRef, tableMore] = useMoreBelow<HTMLDivElement>("tbody > tr");
  // What the status line under the header says, most pressing first. Always laid out (one line),
  // so a message coming or going never moves the page.
  const statusText =
    draft && createStep
      ? createStep === "opening"
        ? "Saved. Opening your basket…"
        : "Creating your basket…"
      : busy && canEdit && !draft
        ? "Saving…"
        : (note ??
          (customBlocked
            ? "The custom weights don’t total 100%, so the results are still for the last ones that did."
            : draft
              ? createBlocker
              : null));
  return (
    // No browser scroll anchoring: where something grows above the reader, the page scrolls by it
    // itself (the chart's legend box), so the two never both move the page.
    <div className="flex min-w-0 flex-col gap-2 [overflow-anchor:none]">
      {/* Header strip: the basket's name and actions, then how it is measured. */}
      <header className={PANEL + " flex flex-col gap-2 px-3 py-2.5 sm:px-4"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {draft && <Title className="sr-only">Create a basket</Title>}
            {draft ? (
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name your basket"
                aria-label="Basket name"
                className="w-full max-w-md rounded border border-line bg-bg px-2.5 py-1.5 font-display text-lg font-bold text-ink placeholder:font-normal placeholder:text-ink-soft focus:border-accent focus:outline-none"
              />
            ) : renaming ? (
              <form
                className="flex max-w-md flex-wrap items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const v = name.trim() || p.name;
                  setName(v);
                  setRenaming(false);
                  // The server may number it ("My basket 2") when another of yours has that name.
                  const res = await patch({ name: v });
                  if (res) {
                    setName(res.name);
                    if (res.name !== v) setNote(`You already have a basket called “${v}”, so this one is “${res.name}”.`);
                  }
                }}
              >
                <input
                  autoFocus
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setName(p.name);
                      setRenaming(false);
                    }
                  }}
                  aria-label="Basket name"
                  className="min-w-0 flex-1 rounded border border-line bg-bg px-2.5 py-1 font-display text-lg font-bold text-ink focus:border-accent focus:outline-none"
                />
                <button type="submit" className={btnPri}>
                  Save
                </button>
              </form>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Title className="min-w-0 break-words font-display text-lg font-bold leading-tight text-ink sm:text-xl">{name}</Title>
                {p.mode === "saved" && (
                  <span className={"rounded border px-1.5 py-px text-[10px] font-semibold " + (isPublic ? "border-accent text-accent" : "border-line text-ink-soft")}>{isPublic ? "Shared by link" : "Private"}</span>
                )}
                {/* A rule-based basket is a list picked by a fixed rule, not a pick of ours: the badge says so beside its name. */}
                {p.mode === "idea" && <span className="rounded border border-line px-1.5 py-px text-[10px] font-semibold text-ink-soft">Rule-based</span>}
              </div>
            )}
            {/* An idea's description is its rule, list date and disclaimer, so it is never cut short. */}
            {p.description && <p className="max-w-3xl text-pretty text-xs leading-relaxed text-ink-soft">{p.description}</p>}
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2">
            {draft ? (
              <button type="button" onClick={createDraft} disabled={busy || !!createBlocker} aria-describedby={statusId} className={btnPri}>
                {createStep === "opening" ? "Opening…" : createStep ? "Creating…" : tickers.length ? `Create basket (${tickers.length})` : "Create basket"}
              </button>
            ) : canEdit ? (
              <>
                <button
                  type="button"
                  // Editing shows the table, where each stock has its remove button.
                  onClick={() => {
                    if (!editing) pickStockView("list");
                    setEditing(!editing);
                  }}
                  aria-pressed={editing}
                  className={editing ? btnPri : btnSec}
                >
                  {editing ? "Done" : "Edit stocks"}
                </button>
                <button type="button" onClick={isPublic ? copyLink : () => setConfirm("share")} disabled={busy && !isPublic} className={btnSec}>
                  {copied ? "Link copied ✓" : isPublic ? "Copy link" : "Share"}
                </button>
              </>
            ) : (
              // Industry, rule-based and shared baskets: one way to make it yours, an unsaved draft on
              // Create basket with these stocks and settings (signed out, sign in first).
              <button type="button" onClick={copy} disabled={busy} className={btnPri}>
                {busy ? "Copying…" : "Copy to my baskets"}
              </button>
            )}
            {canEdit && !draft && (
              <MoreMenu
                items={[
                  { label: "Rename", onSelect: () => setRenaming(true) },
                  isPublic ? { label: "Make private", onSelect: unshare } : { label: "Share by link…", onSelect: () => setConfirm("share") },
                  { label: "Delete basket…", onSelect: () => setConfirm("delete"), danger: true },
                ]}
              />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-2">
          <div className="flex items-center gap-1.5">
            <span className={ctlLabel + " hidden sm:inline"}>Weighting</span>
            {weightingControl}
            <InfoTip label="What the weightings mean">
              <ul className="flex flex-col gap-1">
                <li><b>Equal</b>: every stock the same share.</li>
                <li><b>M-cap</b>: bigger companies get more, by market cap.</li>
                <li><b>Custom</b>: you set each stock&rsquo;s %; they must total 100%.{ownsWeights ? " Saved with the basket." : ""} Type them in the stock table&rsquo;s Target % column (Edit weights opens them again).</li>
              </ul>
            </InfoTip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={ctlLabel + " hidden sm:inline"}>Rebalancing</span>
            {rebalanceControl}
            <InfoTip label="What the rebalancing rules mean">
              <p className="mb-1">Rebalancing trades every stock back to its target weight.</p>
              <ul className="flex flex-col gap-1">
                <li><b>Never</b>: bought on day one, then left to move with prices.</li>
                <li><b>Monthly</b> / <b>Quarterly</b>: on the first trading day of each month or quarter.</li>
                <li><b>Drift</b>: only when a stock moves more than the Band above or below its target.</li>
              </ul>
            </InfoTip>
          </div>
          {projSwitch}
          {projOn ? (
            projControls
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className={ctlLabel + " hidden sm:inline"}>Period</span>
                {rangeControl}
              </div>
              {strategySettings}
            </>
          )}
          <span className="hidden font-mono text-[11px] text-ink-soft sm:inline">{stocksWord(stocks.length)}</span>
          <div role="tablist" aria-label="View" className={MINI_SEG + " ml-auto lg:hidden"}>
            {(["stocks", "chart"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={segBtn(view === v) + " font-sans"}>
                {v === "stocks" ? `Stocks (${stocks.length})` : "Chart"}
              </button>
            ))}
          </div>
        </div>
        {/* Your basket and a draft: reserved, so "Saving…", a note or the Undo offer never shifts
            the page. Industry and rule-based baskets have no line here (their few notes come up
            at the foot of the screen instead), so their header holds no empty strip. */}
        {canEdit && (
        <p id={statusId} role="status" className={"flex min-h-4 flex-wrap items-baseline gap-x-2 text-xs " + (customBlocked && !note && !(busy && canEdit) ? "font-semibold text-danger" : "text-ink-soft")}>
          {removedName && !(draft && createStep) ? (
            <>
              <span>
                Removed <b className="font-semibold text-ink">{removedName}</b>
                {busy && canEdit && !draft ? " · Saving…" : ""}
              </span>
              <button type="button" onClick={undo} disabled={locked} className="font-semibold text-accent underline disabled:opacity-40">
                Undo
              </button>
            </>
          ) : (
            statusText
          )}
        </p>
        )}
      </header>
      {!canEdit && note && (
        // Over the page at the foot of the screen, so it is seen wherever the reader has scrolled
        // and nothing moves. Goes by itself after a few seconds, or with its ×.
        <div role="status" className="fixed inset-x-4 bottom-4 z-40 flex items-start gap-3 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] sm:left-auto sm:max-w-sm">
          <span className="min-w-0 flex-1">{note}</span>
          <button type="button" onClick={() => setNote(null)} aria-label="Dismiss" className="tap-target -m-1 flex-none p-1 text-ink-soft hover:text-ink">
            <svg aria-hidden width="10" height="10" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Draft and your own baskets: the stock picker, always in this place (its lists open over the
          page), so editing never pushes the results down. */}
      {canEdit && p.universe && <div className={PANEL + " px-3 py-2.5 sm:px-4"}>{picker}</div>}


      <div className="flex min-w-0 flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">

        {/* Results, in a fixed order whatever the mode: the return strip, the chart, the stock table
            and the backtest analysis. An empty basket keeps every panel, with its empty state inside. */}
        <div className="flex min-w-0 flex-col gap-2">
          {/* Always four cards (placeholders for Your picks and Not rebalanced until they apply), so
              the strip never changes shape. */}
          {projOn ? (
            <ProjectionCards view={projection} empty={empty} dense />
          ) : (
          <ReturnCards
            dense
            range={range}
            basket={{ key: empty ? "" : basketKey, label: `This basket · ${range}`, note: empty ? "add stocks to see" : undefined }}
            picks={pickedKey && !picksAll ? { key: pickedKey, label: `Your ${picked.length} pick${picked.length > 1 ? "s" : ""}`, tickers: picked.map((s) => s.ticker), strategy: basisLabel(strategy) } : null}
            picksSlot={{ label: "Your picks", note: picksAll ? "all stocks: same as this basket" : "tick stocks in the table or the chart’s Stocks menu" }}
            benches={[
              heldKey && !empty ? { key: heldKey, label: NOT_REBALANCED } : { key: "", label: NOT_REBALANCED, note: rebalanced ? "add stocks to see" : "shown when rebalanced" },
              ...NIFTY_ONLY,
            ]}
          />
          )}
          {view !== "chart" && narrowStats}

          <>
              <Panel
                heading={heading}
                className={onlyOn("chart")}
                title={
                  projOn ? (
                    <>
                      Projection · <span className="sm:hidden">{projSet.h}Y</span>
                      <span className="max-sm:hidden">next {HORIZON_LONG[projSet.h]}</span> · {SCENARIO_LABEL[projSet.scenario].toLowerCase()} case · {WEIGHTING_WORDS[weighting]}
                    </>
                  ) : (
                  <>
                    Backtest · <span className="sm:hidden">{range}</span>
                    <span className="max-sm:hidden">{pastPeriod(range)}</span> · {basisLabel(strategy)}
                  </>
                  )
                }
                label={projOn ? `Projection chart, next ${HORIZON_LONG[projSet.h]}, ${projSet.scenario} case` : `Backtest chart, ${pastPeriod(range)}, ${basisLabel(strategy)}`}
                bodyClassName="p-3"
                infoLabel="About the backtest chart"
                toolsInline
                info={
                  projOn ? (
                    <>
                      Every line starts at 0% today and runs {HORIZON_LONG[projSet.h]} ahead in the {projSet.scenario} case: the basket bought today at your
                      weights and held, each compared industry basket the same way, and each ticked stock on its own. The dotted lines are the range 8 in 10
                      simulated paths end within. Indices aren&rsquo;t projected. {PROJECTION_DISCLAIMER}
                    </>
                  ) : (
                  <>
                    Every line starts at 0% on the first day, so their ends compare directly. <b>Compare with</b> adds up to 3 indices or industry
                    baskets; <b>Stocks</b> draws single stocks. Pinch, or use + and −, to zoom; drag sideways to move.
                    {rebalanced && " vs not rebalanced also draws the same basket left unrebalanced."}
                  </>
                  )
                }
                tools={
                  // Laid out even when hidden (not rebalanced), so the header keeps its height.
                  <button
                    type="button"
                    aria-pressed={vsHeld}
                    aria-hidden={!rebalanced || projOn || undefined}
                    tabIndex={rebalanced && !projOn ? undefined : -1}
                    onClick={() => setVsHeld((v) => !v)}
                    className={MINI_SEG + " " + segBtn(vsHeld) + " items-center font-sans " + (rebalanced && !empty && !projOn ? "" : "invisible")}
                  >
                    vs not rebalanced
                  </button>
                }
              >
                {/* Empty: one short line, not a chart-sized blank; the prompt to add stocks is in the Stocks panel. */}
                {empty ? (
                  <div className="flex min-h-24 items-center justify-center px-6 text-center text-sm text-ink-soft">The backtest chart appears with the first stock.</div>
                ) : (
                <BasketChart
                  range={range}
                  rangeLong={rangeLong}
                  basketKey={basketKey}
                  basketName={name}
                  strategy={compareSq}
                  held={heldKey && vsHeld ? { key: heldKey, name: NOT_REBALANCED } : null}
                  industries={compareIndustries}
                  indices={p.indices}
                  market={p.market}
                  // In the table's order, so the Stocks menu and its Select all match the table.
                  stocks={sortedAll.map((s) => ({ ticker: s.ticker, name: s.name }))}
                  selection={chartSel}
                  onSelection={(next) => act({ type: "chart", next })}
                  onToggleStock={togglePick}
                  onPickAll={pickAll}
                  onPickNone={pickNone}
                  projection={chartProjection}
                />
                )}
              </Panel>
              <Panel
                heading={heading}
                className={onlyOn("stocks")}
                title={`${tableScope === "picks" ? `Your ${picked.length} pick${picked.length === 1 ? "" : "s"}` : `Stocks (${stocks.length})`} · ${projOn ? `next ${HORIZON_LONG[projSet.h]} · ${projSet.scenario} case` : pastPeriod(range)}`}
                label="Stocks in this basket"
                infoLabel="About the stock table"
                info={
                  <>
                    <b>Target %</b>: its share when bought{rebalanced ? " and after each rebalance" : ""} (your % when Custom). <b>Now %</b>: its share at the end, after price moves.{" "}
                    <b>Return</b>: its own price change. <b>Pts added</b>: what it added to the basket&rsquo;s return. The box beside a stock
                    draws its line on the chart (the same as the chart&rsquo;s Stocks menu); <b>Your picks</b> measures just those stocks, and
                    there the × hides a line.{canEdit ? " While editing, the × in All stocks takes a stock out of the basket." : ""}
                    {p.joinAtListing && (
                      <span className="mt-1.5 block">
                        Since listing: each stock&rsquo;s share is set aside on the first day and waits in cash until it lists, so its return runs from
                        listing and, not rebalanced, its pts added are its target share times that return.
                      </span>
                    )}
                  </>
                }
                tools={
                  <>
                    {/* Always there; Your picks is off until stocks are picked on the chart. */}
                    <div role="group" aria-label="Measure within" className={MINI_SEG}>
                      {(["all", "picks"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={tableScope === v}
                          disabled={v === "picks" && !pickedKey}
                          title={v === "picks" && !pickedKey ? "Tick stocks in the table or the chart’s Stocks menu first" : undefined}
                          onClick={() => setScope(v)}
                          className={segBtn(tableScope === v) + " font-sans disabled:cursor-default disabled:opacity-40"}
                        >
                          {v === "all" ? "All stocks" : "Your picks"}
                        </button>
                      ))}
                    </div>
                    <div role="tablist" aria-label="Show stocks as" className={MINI_SEG}>
                      {(["list", "charts"] as const).map((v) => (
                        <button key={v} type="button" role="tab" aria-selected={stockView === v} onClick={() => pickStockView(v)} className={segBtn(stockView === v) + " font-sans"}>
                          {v === "list" ? "Table" : "Breakdown"}
                        </button>
                      ))}
                    </div>
                  </>
                }
              >
                {/* The body keeps at least the height it had before a Table / Breakdown switch, so the
                    panels under it don't jump up when the shorter view shows. */}
                {/* No stocks, no line or weight controls: the empty state alone. */}
                {!empty && linesStrip}
                <div ref={stockBodyRef} style={stockBodyMin ? { minHeight: stockBodyMin } : undefined}>
                {empty ? (
                  <div className="flex min-h-20 items-center justify-center px-6 py-6 text-center text-sm text-ink-soft">{emptyText}</div>
                ) : stockView === "charts" ? (
                  projection || tData ? (
                    <BasketBreakdown
                      holdings={((projection ? projection.table.holdings : tData?.holdings) ?? []).filter((h) => rows.some((s) => s.ticker === h.ticker))}
                      stockOf={(t) => byTicker.get(t)}
                      rangeLong={projOn ? HORIZON_LONG[projSet.h] : rangeLong}
                      ahead={projOn}
                      picks={tableScope === "picks"}
                      byIndustry={p.mode !== "industry"}
                      tab={breakdownTab}
                      onTab={setBreakdownTab}
                    />
                  ) : tbt?.status !== "error" ? (
                    <div aria-busy className="m-3 h-80 animate-pulse rounded bg-line/50" />
                  ) : null
                ) : (
                  <>
                    {/* Phones: one compact row per stock, sorted from the menu. */}
                    <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-1.5 text-[11px] text-ink-soft sm:hidden">
                      <span className="text-balance">
                        <b className="font-semibold">target → {projOn ? "end" : "now"}</b> share · <b className="font-semibold">pts</b> added to the return
                      </span>
                      <label className="flex items-center gap-1.5">
                        <span className="sr-only">Sort by</span>
                        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-9 rounded border border-line bg-bg px-1.5 text-xs text-ink">
                          {SORTS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {projOn && s.id === "weight" ? "Share at end" : projOn && s.id === "return" ? "Projected return" : s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <ul className="divide-y divide-line/70 sm:hidden">
                      {display.map((it) => {
                        if (it.kind === "ghost") return <li key={`ghost:${it.g.ticker}`} style={{ height: it.g.h.phone }} className="flex min-h-12 items-center bg-accent/5 px-3 py-2">{ghostLine(it.g)}</li>;
                        const s = it.s;
                        const h = tHoldings.get(s.ticker);
                        const ex = excludedNote(s.ticker);
                        const since = moveSinceAdded(s.ticker);
                        return (
                          <li key={s.ticker} data-basket-row={s.ticker} data-list="phone" className="flex items-start gap-2 px-3 py-2">
                            {lineTick(s)}
                            <div className="min-w-0 flex-1">
                              {/* Names wrap rather than cut off; the figures on the right stay narrow to leave them room. */}
                              <StockLink ticker={s.ticker} className="relative block text-[13px] font-semibold leading-snug text-accent [overflow-wrap:anywhere] before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:underline">
                                {s.name}
                              </StockLink>
                              {/* Balanced, so a long layer never leaves one word on a line of its own. */}
                              <div className="text-balance text-[11px] leading-snug text-ink-soft">
                                <span className="font-mono">{s.ticker}</span> · {layerOf(s)}
                              </div>
                              {p.pickedOn?.[s.ticker] && (
                                <div className="font-mono text-[11px] text-ink">
                                  <span className="font-sans text-ink-soft">Picked on </span>
                                  {p.pickedOn[s.ticker]}
                                </div>
                              )}
                              <div className="font-mono text-[11px] text-ink-soft">
                                <span title={s.pe == null ? NO_PE : undefined}>P/E {s.pe != null ? `${s.pe.toFixed(1)}x` : NA}</span> · <span className="whitespace-nowrap">{s.mcapCr != null ? croreShort(s.mcapCr) : `mcap ${NA}`}</span>
                              </div>
                              {s.oneOff ? (
                                // Beside the industry chip (a 24-28px line), so the marker never adds a line to the row.
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <IndustryChips industries={industriesOf(s)} />
                                  <span className="text-[11px]">
                                    <OneOffMark name={s.name} reason={s.oneOff} />
                                  </span>
                                </div>
                              ) : (
                                <IndustryChips industries={industriesOf(s)} className="mt-1" />
                              )}
                            </div>
                            <div className="flex flex-none flex-col items-end text-right">
                              {editingWeights && <div className="mb-1">{weightBox(s)}</div>}
                              {h ? (
                                <>
                                  <div className={"font-mono text-[13px] font-semibold " + (h.ret >= 0 ? "text-pos" : "text-danger")}>{signedPct(h.ret)}</div>
                                  <div className="whitespace-nowrap font-mono text-[11px] text-ink-soft" title={projOn ? (editingWeights ? "Share at the end" : "Target share today → share at the end") : editingWeights ? "Share now" : "Target share → share now"}>
                                    {editingWeights ? `${projOn ? "end" : "now"} ${pct1(h.endWeight)}` : `${pct1(h.weight)} → ${pct1(h.endWeight)}`}
                                  </div>
                                  <div className="whitespace-nowrap font-mono text-[11px] text-ink-soft">{signedPts(h.contribution, 2)} pts</div>
                                </>
                              ) : ex ? (
                                <div className="max-w-[7rem] text-[11px] leading-snug text-ink-soft">{ex}</div>
                              ) : (
                                <div className="font-mono text-sm text-ink-soft">{tbt?.status === "error" ? NA : "…"}</div>
                              )}
                              {sinceShown && (
                                <div className="font-mono text-[11px] text-ink-soft" title={since == null ? sinceWhy(s.ticker) : undefined}>
                                  <span className={sinceTone(since)}>{signedPct(since)}</span>
                                  <span className="block font-sans">since added</span>
                                </div>
                              )}
                            </div>
                            {xColumn && (xFor(s) ?? <span aria-hidden className="w-9 flex-none" />)}
                          </li>
                        );
                      })}
                      {tableScope === "all" &&
                        unlisted.map((t) => (
                          <li key={t} className="flex items-center gap-2 px-3 py-2">
                            <span aria-hidden className="w-9 flex-none" />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[13px] font-semibold text-ink-soft">{t}</div>
                              <div className="text-[11px] text-ink-soft">No longer listed in our maps, so it is left out of the backtest.</div>
                            </div>
                            {canEdit && (showRemove ? removeButton({ ticker: t, name: t }, false) : <span aria-hidden className="w-9 flex-none" />)}
                          </li>
                        ))}
                    </ul>
                    {/* From sm: the dense table, sortable by its headers. A long basket scrolls inside a
                        box about the Breakdown's height (header kept in view, "N more" at the foot),
                        so switching Table / Breakdown neither moves the panels below nor leaves a
                        tall empty space under the shorter one. */}
                    <div className="relative hidden sm:block">
                    <div ref={tableBoxRef} className="max-h-[36rem] overflow-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 z-[1] bg-panel-2 text-[10px] uppercase tracking-wider text-ink-soft">
                          <tr className="border-b border-line">
                            <th scope="col" className="w-10 pl-2 pr-0">
                              <span className="sr-only">Line on the chart</span>
                            </th>
                            {sortHead("name", "Stock", false)}
                            {p.pickedOn && (
                              <th scope="col" title="The figure the rule picked this stock on (see the rule above)" className="whitespace-nowrap px-2 py-1.5 text-left font-semibold">
                                Picked on
                              </th>
                            )}
                            <th scope="col" title={editingWeights ? "Your % of the whole basket: type to change it (they must total 100%)" : `Its share when bought${rebalanced ? " and after each rebalance" : ""} (your % when Custom)`} className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">
                              {/* As wide as a weight box, so opening Custom never narrows the names and re-wraps the rows. */}
                              <span className="inline-block min-w-[4.75rem]">Target %</span>
                            </th>
                            {sortHead("weight", projOn ? "End %" : "Now %")}
                            {sortHead("return", "Return")}
                            {sortHead("contribution", "Pts added")}
                            {sortHead("pe", "P/E")}
                            {sortHead("mcap", "M-cap")}
                            {sinceShown && (
                              <th scope="col" title="The stock's move since it was added to this basket (from its live price then)" className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">
                                Since added
                              </th>
                            )}
                            {xColumn && (
                              <th scope="col" className="w-9 px-1">
                                <span className="sr-only">{tableScope === "picks" ? "Hide line" : "Remove"}</span>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {display.map((it) => {
                            if (it.kind === "ghost")
                              return (
                                <tr key={`ghost:${it.g.ticker}`} style={{ height: it.g.h.table }} className="border-b border-line/60 bg-accent/5">
                                  <td colSpan={tableCols} className="px-3 py-1.5">
                                    {ghostLine(it.g)}
                                  </td>
                                </tr>
                              );
                            const s = it.s;
                            const h = tHoldings.get(s.ticker);
                            const ex = excludedNote(s.ticker);
                            const since = moveSinceAdded(s.ticker);
                            const inds = industriesOf(s);
                            const others = inds.length - 1;
                            return (
                              <tr key={s.ticker} data-basket-row={s.ticker} data-list="table" className="border-b border-line/60 even:bg-panel-2/30 hover:bg-accent/5">
                                <td className="py-1 pl-2 pr-0">{lineTick(s)}</td>
                                <td className="w-full max-w-0 px-2 py-1.5">
                                  {/* Touch screens: the name is padded to 36px and the line below spaced out so the
                                      industry link's 36px area (tap-y) does not overlap it. */}
                                  <StockLink ticker={s.ticker} title={s.name} className="block truncate font-semibold text-accent hover:underline pointer-coarse:py-2.5">
                                    {s.name}
                                  </StockLink>
                                  {/* Wraps rather than cuts off: a tablet held upright has no hover to show a title. */}
                                  <span className="block text-balance text-[10px] leading-snug text-ink-soft pointer-coarse:mt-3">
                                    <span className="font-mono">{s.ticker}</span> · {s.oneOff && <><OneOffMark name={s.name} reason={s.oneOff} /> · </>}{layerOf(s)}
                                    {inds[0] && (
                                      <>
                                        {" · "}
                                        <Link href={`/sector/${inds[0].slug}`} className="tap-y hover:text-accent hover:underline">
                                          {inds[0].name}
                                        </Link>
                                        {others > 0 && <span className="text-accent"> +{others}</span>}
                                      </>
                                    )}
                                  </span>
                                </td>
                                {p.pickedOn && <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px] text-ink">{p.pickedOn[s.ticker] ?? NA}</td>}
                                {editingWeights && <td className="whitespace-nowrap px-2 py-1 text-right">{weightBox(s)}</td>}
                                {h ? (
                                  <>
                                    {!editingWeights && <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono text-ink-soft">{pct1(h.weight)}</td>}
                                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono">{pct1(h.endWeight)}</td>
                                    <td className={"whitespace-nowrap px-2 py-1.5 text-right font-mono font-semibold " + (h.ret >= 0 ? "text-pos" : "text-danger")}>{signedPct(h.ret)}</td>
                                    <td className={"whitespace-nowrap px-2 py-1.5 text-right font-mono " + (h.contribution >= 0 ? "text-pos" : "text-danger")}>{signedPts(h.contribution, 2)}</td>
                                  </>
                                ) : (
                                  <td colSpan={editingWeights ? 3 : 4} className="px-2 py-1.5 text-right text-[11px] text-ink-soft">
                                    {ex ?? (tbt?.status === "error" ? NA : "…")}
                                  </td>
                                )}
                                <td title={s.pe == null ? NO_PE : undefined} className="px-2 py-1.5 text-right font-mono">{s.pe != null ? `${s.pe.toFixed(1)}x` : NA}</td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono">{croreShort(s.mcapCr)}</td>
                                {sinceShown && (
                                  <td title={since == null ? sinceWhy(s.ticker) : undefined} className={"whitespace-nowrap px-2 py-1.5 text-right font-mono " + sinceTone(since)}>
                                    {signedPct(since)}
                                  </td>
                                )}
                                {/* An empty cell keeps the ×'s width, so Edit stocks never narrows the names and re-wraps a row. */}
                                {xColumn && <td className="w-9 px-1 py-1">{xFor(s, true) ?? <span aria-hidden className="block w-7 pointer-coarse:w-9" />}</td>}
                              </tr>
                            );
                          })}
                          {tableScope === "all" &&
                            unlisted.map((t) => (
                              <tr key={t} className="border-b border-line/60 text-ink-soft">
                                <td className="pl-2" />
                                <td className="px-2 py-1.5">
                                  <span className="block font-mono font-semibold">{t}</span>
                                  <span className="block text-[10px]">No longer listed in our maps</span>
                                </td>
                                <td colSpan={(sinceShown ? 7 : 6) + (p.pickedOn ? 1 : 0)} className="px-2 py-1.5 text-right text-[11px]">
                                  Left out of the backtest
                                </td>
                                {xColumn && <td className="w-9 px-1 py-1">{showRemove ? removeButton({ ticker: t, name: t }, true) : <span aria-hidden className="block w-7 pointer-coarse:w-9" />}</td>}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <MoreBelow count={tableMore} noun={tableMore === 1 ? "more stock" : "more stocks"} />
                    </div>
                    <p className="border-t border-line/70 px-3 py-1.5 text-[11px] text-ink-soft">
                      {projOn ? (
                        <>
                          Projected return over the next {HORIZON_LONG[projSet.h]}, {projSet.scenario} case · <b className="font-semibold">target</b> its share of {tableScope === "picks" ? "your picks" : "the basket"} today (a left-out stock&rsquo;s share spread over the rest),{" "}
                          <b className="font-semibold">end</b> if held to the end · <b className="font-semibold">pts</b> what it adds to the projected return · P/E and market cap from our last data update
                        </>
                      ) : (
                      <>
                      Return over the past {rangeLong} · <b className="font-semibold">target</b> its share of {tableScope === "picks" ? "your picks" : "the basket"} when bought{rebalanced ? " and after each rebalance" : ""},{" "}
                      <b className="font-semibold">now</b> after the price moves ·{" "}
                      <b className="font-semibold">pts</b> what it added to {tableScope === "picks" ? "your picks’" : "the basket’s"} return · P/E and market cap from our last data update
                      </>
                      )}
                    </p>
                  </>
                )}
                </div>
                {!empty && !projOn && tbt?.status === "error" && (
                  <p className="px-3 pb-2 text-xs text-ink-soft">
                    Couldn&rsquo;t backtest the basket right now.{" "}
                    <button type="button" onClick={retry} className="font-semibold text-accent underline">
                      Retry
                    </button>
                  </p>
                )}
              </Panel>
              <div className={"flex min-w-0 flex-col " + onlyOn("chart")}>
                {projOn ? <ProjectionAnalysis view={projection} heading={heading} empty={empty} /> : <BasketAnalysis range={range} basketKey={basketKey} heading={heading} reload={reload} empty={empty} />}
              </div>
              {view === "chart" && narrowStats}
            </>

          {projOn ? (
            <p className="text-[11px] leading-relaxed text-ink-soft">
              How it is projected: each stock with at least 3 consecutive years of revenue and net profit grows from today&rsquo;s earnings at its
              usual revenue growth, faded part of the way toward 10% a year, with its margin moving toward its usual one (Bear: slower growth, lowest
              margin; Bull: faster growth, highest margin), valued at a P/E moving a third of the way a year toward{" "}
              {projSet.exit === "own" ? "its own median" : "its home industry’s median"}, held within 0.7× and 1.4× today&rsquo;s (price to sales for loss-makers), with each case kept within
              −60% and +80% a year. The basket is bought today at {weighting === "equal" ? "equal weights" : weighting === "custom" ? "your custom weights" : "weights by market cap"} and held;
              a stock left out has its share spread over the rest in proportion. The likely range and drawdowns come from 1,000 simulated paths that swing
              like the basket did over the past year. Price change only. {PROJECTION_DISCLAIMER} See the Assumptions tab for each stock&rsquo;s inputs.
            </p>
          ) : (
          <p className="text-[11px] leading-relaxed text-ink-soft">
            How it is backtested: bought on the first day of the period at {weighting === "equal" ? "equal weights" : weighting === "custom" ? "your custom weights (a stock with no prices for the period has its share spread over the rest, in proportion)" : "weights by market cap"}
            {weighting === "mcap" ? " (today’s market caps, from our last data update, so slightly flattering to winners)" : ""}
            {rebalanced
              ? `, then ${rebalanceLabel(strategy)}, trading at that day’s close${strategy.rebalance === "drift" ? " (the day after the drift is seen)" : ""}. Turnover and trades are shown, but no brokerage, taxes or slippage are taken off. Price change only, no dividends.`
              : " and held without rebalancing. Price change only, no dividends, costs or taxes."}{p.joinAtListing
              ? " Each stock is backtested from its first trading day: its share of the money is set aside on the first day and waits in cash (earning nothing) until the stock lists, then buys it at that close. So its return is since listing, the targets total 100%, and, not rebalanced, each stock adds its target share times its return."
              : " Stocks listed during the period are left out of it."}{" "}
            The basket is today&rsquo;s list of stocks, so companies that fell out of the industry before now are missing. A tracking and research tool, not investment advice.
            {p.mode === "industry" && (
              <>
                {" "}
                Every listed company on the{" "}
                <Link href={`/sector/${p.id}`} className="tap-y text-accent hover:underline">
                  {p.name.replace(/ (industry|policy) basket$/, "")} map
                </Link>
                .
              </>
            )}
          </p>
          )}
        </div>
        {/* Side column (from lg, beside the results and kept in view while they scroll): the
            statistics. The stocks and their chart lines are in the Stocks table. After the results
            in the page order, so keyboards and screen readers reach the chart and table first. */}
        <aside aria-label="Backtest statistics" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] min-w-0 flex-col gap-2 overflow-y-auto lg:flex">
          {stats(true)}
        </aside>
      </div>
      <ConfirmDialog open={leftNote} notice title={`${leftCount} stock${leftCount === 1 ? "" : "s"} left out of the projection`} confirmLabel="Got it" onConfirm={() => setLeftNote(false)} onCancel={() => setLeftNote(false)}>
        <ul className="flex flex-col gap-1">
          {projection?.basket.leftOut.map((l) => (
            <li key={l.ticker}>
              <b className="font-semibold text-ink">{byTicker.get(l.ticker)?.name ?? l.ticker}</b>: {l.reason.charAt(0).toLowerCase() + l.reason.slice(1)}.
            </li>
          ))}
        </ul>
        <p className="mt-2">
          A projection needs at least 3 years of results and a price and market cap in our last data update. {leftCount === 1 ? "Its" : "Their"}{" "}
          {pct1(projection?.basket.spread ?? 0)} of the basket is shared across the other {projection?.basket.holdings.length ?? 0} stocks in proportion to their
          weights. This changes only the projection, not the backtest.
        </p>
      </ConfirmDialog>
      {canEdit && !draft && (
        <>
          <ConfirmDialog open={confirm === "share"} title="Share this basket by link?" confirmLabel="Share and copy link" onConfirm={share} onCancel={() => setConfirm(null)}>
            <p>Anyone with the link can open this basket and see its stocks, weights and backtest. It isn&rsquo;t listed anywhere or shown in search, and they can&rsquo;t change it.</p>
            <p className="mt-2">You can make it private again at any time from the ⋯ menu.</p>
          </ConfirmDialog>
          <ConfirmDialog open={confirm === "delete"} title={`Delete “${name}”?`} confirmLabel={deleting ? "Deleting…" : "Delete basket"} danger busy={deleting} onConfirm={destroy} onCancel={() => setConfirm(null)}>
            This can&rsquo;t be undone.{isPublic ? " Its shared link will stop working." : ""}
          </ConfirmDialog>
        </>
      )}
    </div>
  );
}

// The one remove control, the same on every row that stands for a stock in the basket (the
// picker's list, the stock table and phone list, the side list): an × named "Remove <stock>".
// Panels close with a "Done" text button instead, so the two are never confused.
function RemoveButton({
  ticker,
  name,
  small = false,
  disabled = false,
  onRemove,
  label = `Remove ${name}`,
  title = `Remove ${name} from the basket`,
}: {
  ticker: string;
  name: string;
  small?: boolean;
  disabled?: boolean;
  onRemove: (ticker: string) => void;
  /** The stock table's Your picks reuses it to hide a line ("Hide X's line"). */
  label?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(ticker)}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={
        (small ? "h-7 w-7 pointer-coarse:h-9 pointer-coarse:w-9" : "tap-target h-9 w-9") +
        " flex flex-none items-center justify-center rounded border border-line text-ink-soft hover:border-danger hover:text-danger disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
      }
    >
      <svg aria-hidden width="10" height="10" viewBox="0 0 12 12">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// A % field that lets "12." or an empty box sit while typing; any number from 0 to 100 goes up at
// once (an empty box counts as 0). Anything else is marked, and leaving the box puts the last
// good value back.
function WeightInput({ label, title, value, onCommit, onBad }: { label: string; title?: string; value: number; onCommit: (v: number) => void; onBad: (bad: boolean) => void }) {
  const [text, setText] = useState<string | null>(null);
  const read = (v: string) => {
    if (v.trim() === "") return 0;
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
  };
  const bad = text != null && read(text) == null;
  return (
    <label className="flex flex-none items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        title={title}
        aria-invalid={bad || undefined}
        // What's being typed, unless the value moved underneath it (a Reset, a stock added).
        value={text != null && (bad || read(text) === value) ? text : String(value)}
        onChange={(e) => {
          setText(e.target.value);
          const n = read(e.target.value);
          onBad(n == null);
          if (n != null) onCommit(n);
        }}
        onFocus={(e) => e.target.select()}
        data-weight-box
        // Tab goes straight to the next stock's box (Shift+Tab the one before), so typing weights is
        // one Tab per row; the line boxes and links stay reachable with Tab from elsewhere.
        onKeyDown={(e) => {
          if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
          const boxes = [...(e.currentTarget.closest("table, ul")?.querySelectorAll<HTMLInputElement>("[data-weight-box]") ?? [])];
          const next = boxes[boxes.indexOf(e.currentTarget) + (e.shiftKey ? -1 : 1)];
          if (next) {
            e.preventDefault();
            next.focus();
          }
        }}
        onBlur={() => {
          if (bad) onBad(false);
          setText(null);
        }}
        // 16px on phones, so iOS doesn't zoom the page on focus.
        className={
          "min-h-9 w-16 rounded border bg-bg px-1.5 text-right font-mono text-base text-ink focus:outline-none sm:min-h-7 sm:text-xs pointer-coarse:min-h-9 " +
          (bad ? "border-danger focus:border-danger" : "border-line focus:border-accent")
        }
      />
      <span aria-hidden className="font-mono text-[11px] text-ink-soft">
        %
      </span>
    </label>
  );
}

// The ⋯ button: less frequent actions (rename, stop sharing, delete), so they don't take a row.
function MoreMenu({ items }: { items: { label: string; onSelect: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative flex-none">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="More basket actions" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-ink">
        <svg aria-hidden width="14" height="4" viewBox="0 0 14 4">
          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          <circle cx="7" cy="2" r="1.5" fill="currentColor" />
          <circle cx="12" cy="2" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-line bg-panel p-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={"block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bg " + (it.danger ? "text-danger" : "text-ink")}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The watchlist as the hearts have it right now (shared with every heart on the page), in the
// order the page was given, then any saved since. Before the hearts' list loads: the page's.
function useLiveWatchlist(initial: string[]): string[] {
  const live = useSyncExternalStore(subscribeWatchlist, watchlistSnapshot, () => null);
  return useMemo(() => {
    if (live == null) return initial;
    const now = live ? live.split(",") : [];
    return [...initial.filter((t) => isWatched(t) !== false), ...now.filter((t) => !initial.includes(t))];
  }, [live, initial]);
}

// Pick stocks to add: from an industry (choose it, then add its listed stocks one by one or all at
// once; switching industries keeps adding to the same basket) or from your watchlist. One bar in
// a fixed place; the list opens over the page. Every row stands for a stock: "+ Add" when it isn't
// in the basket, ✓ and the same × as the stock table when it is, so it can be taken off here too.
function StockPicker({
  universe,
  industries,
  initialIndustry,
  watchlist: initialWatchlist,
  have,
  room,
  locked,
  onAdd,
  onRemove,
}: {
  universe: BasketStock[];
  industries: CompareBasket[];
  initialIndustry: string | null;
  watchlist: string[];
  have: Set<string>;
  /** Stocks the basket can still take before its limit. */
  room: number;
  /** Nothing can change (the basket is being created). */
  locked: boolean;
  /** The stocks, and the industry list they were picked from (none from the watchlist). */
  onAdd: (tickers: string[], fromIndustry?: string) => void;
  onRemove: (ticker: string) => void;
}) {
  const [industry, setIndustry] = useState(() => (initialIndustry && industries.some((i) => i.slug === initialIndustry) ? initialIndustry : (industries[0]?.slug ?? "")));
  const [source, setSource] = useState<"industry" | "watchlist">("industry");
  const [filter, setFilter] = useState("");
  const listId = useId();
  const watchlist = useLiveWatchlist(initialWatchlist);
  // The list is a dropdown over the page: it opens from the Stocks or Watchlist button or on
  // picking an industry, stays open while adding and taking off, and closes with Done, a tap
  // anywhere else or Escape.
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setFilter("");
  };
  useEffect(() => {
    if (!open) return;
    const shut = () => {
      setOpen(false);
      setFilter("");
    };
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) shut();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && shut();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // Stocks already in the basket list first, as they were when the list opened or the industry
  // changed: the order never changes while it is on screen, so a row never jumps under a tap.
  const [pinned, setPinned] = useState<Set<string>>(() => new Set(have));
  // The list opened by switching the industry rather than by its button: the button's first tap
  // then keeps it open (it would otherwise read as a tap that did nothing), a second one closes it.
  const [openedBySwitch, setOpenedBySwitch] = useState(false);
  const openOn = (src: "industry" | "watchlist") => {
    if (!open || src !== source) setPinned(new Set(have));
    setSource(src);
    setFilter("");
    setOpen(!(open && src === source && !openedBySwitch));
    setOpenedBySwitch(false);
  };
  const byTicker = useMemo(() => new Map(universe.map((s) => [s.ticker, s])), [universe]);
  const inIndustry = useMemo(
    () =>
      universe
        .filter((s) => s.industries.some((i) => i.slug === industry))
        .sort((a, b) => Number(pinned.has(b.ticker)) - Number(pinned.has(a.ticker)) || a.name.localeCompare(b.name)),
    [universe, industry, pinned],
  );
  const liked = useMemo(() => watchlist.flatMap((t) => (byTicker.has(t) ? [byTicker.get(t)!] : [])), [watchlist, byTicker]);
  const list = source === "industry" ? inIndustry : liked;
  const f = filter.trim().toLowerCase();
  const matches = f ? list.filter((s) => s.name.toLowerCase().includes(f) || s.ticker.toLowerCase().includes(f)) : list;
  const addable = matches.filter((s) => !have.has(s.ticker));
  const industryName = industries.find((i) => i.slug === industry)?.name ?? "this industry";
  const listName = source === "industry" ? industryName : "Your watchlist";
  const added = inIndustry.filter((s) => have.has(s.ticker)).length;
  const likedIn = liked.filter((s) => have.has(s.ticker)).length;
  const full = room <= 0;
  // "Add all" says how many will go in when the basket can't take them all.
  const addAllLabel = addable.length <= room ? `Add all ${addable.length}` : `Add ${room} of ${addable.length}`;
  const btn = (on: boolean) =>
    "flex min-h-[42px] min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border bg-panel px-3 py-2 text-left text-base text-ink sm:text-sm " + (on ? "border-accent" : "border-line");
  const chevron = (on: boolean) => (
    <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className={"flex-none transition-transform " + (on ? "rotate-180" : "")}>
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <section aria-label="Add stocks" className="max-w-4xl">
      <div ref={boxRef} className="relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex min-w-0 flex-col gap-1 sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry</span>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setSource("industry");
                setFilter("");
                setOpen(true);
                setOpenedBySwitch(true);
                setPinned(new Set(have));
              }}
              className="min-h-[42px] min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base font-semibold text-ink sm:text-sm"
            >
              {industries.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-w-0 flex-col gap-1 sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Stocks
              <InfoTip label="How to add stocks">
                Pick an industry, then add its stocks one by one or all at once, or add from your watchlist. Switching industry keeps adding to the
                same basket, so one basket can mix several (up to {MAX_BASKET_STOCKS} stocks). The × on a ticked row takes it off again.
              </InfoTip>
            </span>
            <div className="flex min-w-0 flex-1 gap-2">
              <button
                type="button"
                onClick={() => openOn("industry")}
                aria-haspopup="listbox"
                aria-expanded={open && source === "industry"}
                aria-controls={listId}
                aria-label={`${industryName} stocks: ${inIndustry.length} listed${added > 0 ? `, ${added} in this basket` : ""}`}
                className={btn(open && source === "industry")}
              >
                {/* Short enough to fit beside the Watchlist button at every width; the full wording is its label. */}
                <span className="truncate">
                  {inIndustry.length} listed{added > 0 ? ` · ${added} added` : ""}
                </span>
                {chevron(open && source === "industry")}
              </button>
              <button
                type="button"
                onClick={() => openOn("watchlist")}
                aria-haspopup="listbox"
                aria-expanded={open && source === "watchlist"}
                aria-controls={listId}
                aria-label={`Your watchlist: ${liked.length} stocks${likedIn > 0 ? `, ${likedIn} in this basket` : ""}`}
                className={btn(open && source === "watchlist") + " max-w-[11rem] flex-none sm:flex-1"}
              >
                <span className="truncate">Watchlist · {liked.length}</span>
                {chevron(open && source === "watchlist")}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <div
            id={listId}
            className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-line bg-panel p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] sm:left-auto sm:w-[min(28rem,100%)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-ink-soft">{listName}</span>
              <span className="flex flex-none items-center gap-3">
                {addable.length > 1 && (
                  <button
                    type="button"
                    disabled={full || locked}
                    onClick={() => onAdd(addable.map((s) => s.ticker), source === "industry" ? industry : undefined)}
                    className="-my-2 py-2 text-xs font-semibold text-accent hover:underline disabled:text-ink-soft disabled:no-underline"
                  >
                    {addAllLabel}
                  </button>
                )}
                <button type="button" onClick={close} className="inline-flex min-h-8 items-center rounded bg-accent px-3 text-xs font-semibold text-bg hover:opacity-90 pointer-coarse:min-h-9">
                  Done
                </button>
              </span>
            </div>
            {/* Laid out whether or not the basket is full, so the list doesn't move when it fills. */}
            <p className={"mt-1 text-[11px] leading-snug " + (full ? "text-danger" : "text-ink-soft")}>
              {full ? `This basket is full (${MAX_BASKET_STOCKS} stocks). Take one off to add another.` : `Room for ${room} more · up to ${MAX_BASKET_STOCKS} stocks`}
            </p>
            {list.length > 12 && (
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${list.length} stocks`}
                aria-label={`Filter ${listName} stocks`}
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
              />
            )}
            <ul role="listbox" aria-label={`${listName} stocks`} className="mt-1 max-h-[min(45vh,22rem)] divide-y divide-line overflow-y-auto overscroll-contain">
              {matches.map((s) => {
                const inIt = have.has(s.ticker);
                return (
                  <li key={s.ticker} role="option" aria-selected={inIt} className="flex min-h-[3.25rem] items-center gap-3 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className={"truncate text-sm " + (inIt ? "font-semibold text-accent" : "text-ink")}>
                        {inIt && <span aria-hidden>✓ </span>}
                        {s.name}
                      </div>
                      <div className="truncate text-[11px] text-ink-soft">
                        {/* Its layer in this industry (Bharat Forge reads as an EV part here, not artillery). */}
                        <span className="font-mono">{s.ticker}</span> · {source === "industry" ? (s.layerIn?.[industry] ?? s.layer) : s.layer}
                        {inIt && <span className="sr-only"> (in this basket)</span>}
                      </div>
                    </div>
                    {s.oneOff && (
                      <span className="flex-none text-[11px]">
                        <OneOffMark name={s.name} reason={s.oneOff} />
                      </span>
                    )}
                    {/* The add and remove controls share one slot of the same width, so a row never re-flows. */}
                    <span className="flex w-[4.5rem] flex-none justify-end">
                      {inIt ? (
                        <RemoveButton ticker={s.ticker} name={s.name} disabled={locked} onRemove={onRemove} />
                      ) : (
                        <button
                          type="button"
                          disabled={full || locked}
                          onClick={() => onAdd([s.ticker], source === "industry" ? industry : undefined)}
                          aria-label={`Add ${s.name}`}
                          className="min-h-9 rounded-full border border-accent px-3 text-xs font-semibold text-accent hover:bg-accent hover:text-bg disabled:border-line disabled:text-ink-soft disabled:hover:bg-transparent"
                        >
                          + Add
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
              {matches.length === 0 && (
                <li className="py-2 text-xs text-ink-soft">
                  {f ? <>No {listName} stock matches &ldquo;{filter}&rdquo;.</> : source === "watchlist" ? "Your watchlist is empty. Save stocks with the heart anywhere on the site to see them here." : "No listed stocks in this industry."}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
