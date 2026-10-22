"use client";

import { InfoTip } from "@/components/InfoTip";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import type { BasketStock } from "@/lib/baskets/industry";
import { StockLink } from "@/components/stock/StockLink";
import { BasketBreakdown, type BreakdownTab } from "./BasketBreakdown";
import { BasketChart, MAX_CHART_STOCKS, defaultSelection, pct, stockLine, useSiteTheme, type ChartSelection, type CompareBasket } from "./BasketChart";
import { DASHARRAY } from "@/components/research/SectorCharts";
import { ReturnCards, picksKey } from "./ReturnCards";
import { BasketStats } from "./BasketStats";
import { BasketAnalysis } from "./BasketAnalysis";
import { MINI_SEG, PANEL, Panel } from "./Panel";
import { IndustryChips } from "./IndustryChips";
import { basketCreateError } from "./NewBasketButton";
import { loadSeries, savedBasketQuery, type Load } from "./series";
import { basketWeights } from "@/lib/baskets/backtest";
import { targetWeights } from "@/lib/baskets/rebalance";
import {
  BAND_CHOICES,
  REBALANCE_RULES,
  RULE_SHORT,
  SCHEME_SHORT,
  WEIGHT_SCHEMES,
  addToWeights,
  customTargets,
  heldStrategy,
  isPlainHold,
  parseStrategy,
  rebalanceLabel,
  removeFromWeights,
  strategyQuery,
  strategyShort,
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

// Only the market beside the basket; indices and other baskets are a "Compare with" pick on the chart.
const NIFTY_ONLY = [{ key: "b:nifty50", label: "Nifty 50" }];

// Market cap in Rs Cr, short: 1,74,575 Cr -> "1.75L Cr", 8,420 -> "8,420 Cr".
const crore = (v: number) => (v >= 100_000 ? `${(v / 100_000).toFixed(2)}L Cr` : `${Math.round(v).toLocaleString("en-IN")} Cr`);

const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
  { id: "2Y", long: "2 years" },
  { id: "3Y", long: "3 years" },
  { id: "5Y", long: "5 years" },
];
const MAX_STOCKS = 75;
// The page's own URL keeps a strategy other than the basket's default, so a link reopens it.
// "wt" for the weighting, so it can't clash with a host page's "w". cap and lcap belonged to the
// removed Capped weighting: still cleared, so an old link's are tidied away.
const STRATEGY_PARAMS = ["wt", "rb", "band", "cw", "cap", "lcap"];
const strategyUrlParams = (s: Strategy) => [...new URLSearchParams(strategyQuery(s))].map(([k, v]) => [k === "w" ? "wt" : k, v] as const);

/** Each stock's share (fractions summing to 1) under a weighting, as the backtest sets it. */
function schemeShares(stocks: BasketStock[], scheme: WeightScheme, custom?: Record<string, number>): Map<string, number> {
  if (!stocks.length) return new Map();
  if (scheme === "custom") return customTargets(stocks.map((s) => s.ticker), custom);
  if (scheme === "layer") return targetWeights(stocks, "layer");
  const raw = basketWeights(stocks, scheme);
  const sum = [...raw.values()].reduce((a, b) => a + b, 0);
  return new Map([...raw].map(([t, v]) => [t, v / sum]));
}

type Sort = "contribution" | "return" | "weight" | "pe" | "mcap" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "contribution", label: "Contribution" },
  { id: "return", label: "Return" },
  { id: "weight", label: "Weight" },
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
  /** A custom-weighted saved basket's weights, % per stock. */
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
  // The custom weights as typed, which may not total 100% yet; the backtest keeps the last ones that did.
  const [customEdit, setCustomEdit] = useState<Record<string, number> | null>(() => (p.weighting === "custom" ? savedCustom(p.stocks) : null));
  // What the server last stored for a saved basket's custom weights (by query value), so an edit saves once.
  const savedRef = useRef<string | null>(p.weighting === "custom" ? weightsParam(savedCustom(p.stocks)) : null);
  const weighting = strategy.weighting;
  const sq = strategyQuery(strategy);
  const rebalanced = strategy.rebalance !== "never";
  // The rebalanced basket's chart also draws it bought and held, unless switched off.
  const [vsHeld, setVsHeld] = useState(true);
  const [stocks, setStocks] = useState(p.stocks);
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
  // Bumped by Retry, so the stats and analysis panels drop a failed load too.
  const [reload, setReload] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [loads, setLoads] = useState<Record<string, Load>>({});

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the strategy a link asked for once on mount
      setCustomEdit(w);
    }
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
  // What a saved basket can store: equal, market cap or custom (layer-balanced saves as equal).
  const savedWeighting = weighting === "mcap" || weighting === "custom" ? weighting : "equal";
  const savedWeights = weighting === "custom" && strategy.weights ? { weights: strategy.weights } : {};
  const pickView = (v: "stocks" | "chart") => {
    setView(v);
    const url = new URL(window.location.href);
    const key = p.viewParam ?? "view";
    if (v === "chart") url.searchParams.set(key, "chart");
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
  };

  const tickers = useMemo(() => stocks.map((s) => s.ticker), [stocks]);
  const keyFor = (q: string) =>
    p.mode === "industry" ? `x:sector=${p.id}&${q}` : p.mode === "idea" || draft ? picksKey(tickers, q) ?? `x:tickers=&${q}` : `x:${savedBasketQuery(p.id, q, tickers)}`;
  const basketKey = keyFor(sq);
  // The same basket at the same weights, bought and held: the rebalanced one's comparison.
  const heldKey = rebalanced ? keyFor(strategyQuery({ ...strategy, rebalance: "never" })) : null;
  // Industry baskets compared alongside run the same strategy; custom weights are this basket's
  // own stocks', so those run at equal weights.
  const compareSq = weighting === "custom" ? strategyQuery({ ...strategy, weighting: "equal", weights: undefined }) : sq;
  const compareKey = p.compareSlug && !(p.mode === "industry" && p.compareSlug === p.id) ? `x:sector=${p.compareSlug}&${compareSq}` : null;
  // Kept here, above the chart, so the reader's picks outlive weighting, range and view switches.
  const compareIndustries = p.industries.filter((i) => !(p.mode === "industry" && i.slug === p.id));
  // A stock's industries with this basket's own first on an industry basket (Bharat Forge sits in
  // EV 4W here, not in its primary industry, defence), so its chip names why it is in the basket.
  const industriesOf = (s: BasketStock) => {
    const own = p.mode === "industry" ? s.industries.find((i) => i.slug === p.id) : undefined;
    return own ? [own, ...s.industries.filter((i) => i !== own)] : s.industries;
  };
  // A saved basket or an idea opens with its stocks drawn on the chart (as many as there are line
  // styles); an industry basket, often 20+ stocks, opens on the benchmarks alone.
  const [chartSel, setChartSel] = useState<ChartSelection>(() => {
    const sel = defaultSelection(p.indices, compareIndustries, compareKey ? p.compareSlug : null);
    if (p.mode !== "industry") sel.picks = Object.fromEntries(p.stocks.slice(0, MAX_CHART_STOCKS).map((s, i) => [s.ticker, i]));
    return sel;
  });
  // The stocks switched on in the chart, backtested together as their own basket (same weighting).
  const picked = useMemo(() => stocks.filter((s) => chartSel.picks[s.ticker] != null), [stocks, chartSel.picks]);
  // Every stock picked is the basket itself: no separate card, and the table needs no second backtest.
  const picksAll = picked.length > 0 && picked.length === stocks.length;
  // Lines drawn by default (the first 18 of a long basket, or stocks as they're added) aren't the
  // reader's choice, so "Your picks" (the return card and the table's scope) waits until they
  // switch a stock on or off in the chart's Stocks menu.
  const [picksChosen, setPicksChosen] = useState(false);
  const pickedKey = picksChosen
    ? picksKey(
        picked.map((s) => s.ticker),
        sq,
      )
    : null;

  // With no picks left, the table goes back to the whole basket.
  const tableScope = scope === "picks" && pickedKey ? "picks" : "all";
  const tableKey = tableScope === "picks" && pickedKey && !picksAll ? pickedKey : basketKey;

  // The basket's own backtest feeds the stock rows and the left list (the cards load their lines
  // themselves); the picks' backtest feeds the table when it shows just the picks.
  useEffect(() => {
    if (!tickers.length) return;
    for (const key of new Set([basketKey, tableKey])) {
      const id = `${key}|${range}`;
      if (loads[id]) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the backtest as loading, then fetches it
      setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
      loadSeries(key, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
    }
  }, [basketKey, tableKey, range, loads, tickers.length]);

  const at = (key: string) => loads[`${key}|${range}`];
  const bt = at(basketKey);
  const btData = bt?.status === "ok" ? bt.data : null;
  const holdings = new Map((btData?.holdings ?? []).map((h) => [h.ticker, h]));
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  const rangeLong = RANGES.find((r) => r.id === range)!.long;

  const tbt = at(tableKey);
  const tData = tbt?.status === "ok" ? tbt.data : null;
  const tHoldings = new Map((tData?.holdings ?? []).map((h) => [h.ticker, h]));
  const rows = [...(tableScope === "picks" ? picked : stocks)].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    // Stocks with no figure go last either way.
    if (sort === "pe") return (a.pe ?? Infinity) - (b.pe ?? Infinity);
    if (sort === "mcap") return (b.mcapCr ?? -1) - (a.mcapCr ?? -1);
    const ha = tHoldings.get(a.ticker);
    const hb = tHoldings.get(b.ticker);
    const v = (h: typeof ha) => (!h ? -Infinity : sort === "return" ? h.ret : sort === "weight" ? h.endWeight : h.contribution);
    return v(hb) - v(ha);
  });

  // ---- owner actions ----
  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/baskets/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      return (await res.json()) as { name: string; items: { ticker: string }[] };
    } catch {
      setNote("Couldn’t save that change. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const universe = useMemo(() => new Map((p.universe ?? []).map((s) => [s.ticker, s])), [p.universe]);
  const syncItems = (res: { items: { ticker: string }[] } | null) => {
    if (res) setStocks(res.items.map((i) => byTicker.get(i.ticker) ?? universe.get(i.ticker)).filter((s): s is BasketStock => !!s));
  };
  // Custom weights follow the stocks: a new one gets an equal share and the rest shrink in
  // proportion; one taken off leaves the rest in proportion, scaled back up to 100%.
  const reweigh = (next: Record<string, number>) => {
    setCustomEdit(next);
    if (ownsWeights) savedRef.current = weightsParam(next);
    if (Object.keys(next).length) pickStrategy({ ...strategy, weights: next });
    return next;
  };
  const add = async (list: string[]) => {
    const fresh = list.filter((t) => !byTicker.has(t)).slice(0, MAX_STOCKS - stocks.length);
    if (!fresh.length) return;
    setStocks((s) => [...s, ...fresh.map((t) => universe.get(t)!).filter(Boolean)]);
    const weights = weighting === "custom" ? { weights: reweigh(addToWeights(customEdit ?? {}, fresh)) } : {};
    // New stocks go straight onto the chart while line colours are free.
    setChartSel((sel) => {
      const picks = { ...sel.picks };
      for (const t of fresh) {
        const used = new Set(Object.values(picks));
        const slot = [...Array(MAX_CHART_STOCKS).keys()].find((i) => !used.has(i));
        if (slot == null) break;
        picks[t] = slot;
      }
      return { ...sel, picks };
    });
    if (!draft) syncItems(await patch({ add: fresh, ...weights }));
  };
  const remove = async (t: string) => {
    setStocks((s) => s.filter((x) => x.ticker !== t));
    const weights = weighting === "custom" ? { weights: reweigh(removeFromWeights(customEdit ?? {}, [t])) } : {};
    // Its line goes to the first stock not yet on the chart, or waits for the next one added.
    setChartSel((sel) => {
      const slot = sel.picks[t];
      if (slot == null) return sel;
      const picks = { ...sel.picks };
      delete picks[t];
      const next = stocks.find((s) => s.ticker !== t && picks[s.ticker] == null);
      if (next) picks[next.ticker] = slot;
      return { ...sel, picks };
    });
    if (!draft) syncItems(await patch({ remove: [t], ...weights }));
  };
  const setWeight = async (w: WeightScheme) => {
    if (w === weighting) return;
    if (w !== "custom") {
      pickStrategy({ ...strategy, weighting: w, weights: undefined });
      // A saved basket keeps equal, market cap or custom as its own; layer-balanced stays in the URL.
      if (ownsWeights && w !== "layer") await patch({ weighting: w });
      return;
    }
    // Custom starts from the weights the basket had a moment ago, so nothing jumps.
    const start = toPercents(schemeShares(stocks, weighting));
    setCustomEdit(start);
    pickStrategy({ ...strategy, weighting: "custom", weights: start });
    if (ownsWeights && stocks.length) {
      savedRef.current = weightsParam(start);
      await patch({ weighting: "custom", weights: start });
    }
  };
  const blockedNote = "Make the custom weights total 100% first.";
  // One stock's % typed (or reset to equal): the backtest follows once they total 100%, and a
  // saved basket of yours keeps them (a moment after the last keystroke).
  const editWeights = (next: Record<string, number>) => {
    setCustomEdit(next);
    if (!weightsValid(next, tickers)) return;
    pickStrategy({ ...strategy, weights: next });
    setNote((n) => (n === blockedNote ? null : n));
  };
  const resetToEqual = () => editWeights(toPercents(schemeShares(stocks, "equal")));
  useEffect(() => {
    if (!ownsWeights || weighting !== "custom" || !strategy.weights) return;
    const q = weightsParam(strategy.weights);
    if (q === savedRef.current) return;
    const w = strategy.weights;
    const timer = setTimeout(() => {
      savedRef.current = q;
      patch({ weights: w });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saves when the weights change, nothing else
  }, [ownsWeights, weighting, strategy.weights]);
  // Copies the link at once (still inside the tap: Safari refuses a clipboard write that comes
  // after a network wait), then makes the basket viewable by link if it isn't yet.
  const share = async () => {
    const url = `${window.location.origin}/baskets/${p.id}`;
    const copied = copyNow(url);
    if (!isPublic) {
      const res = await patch({ isPublic: true });
      if (!res) return setNote("Couldn’t share it right now. Try again.");
      setIsPublic(true);
    }
    setNote((await copied) ? "Link copied. Anyone with it can view this basket." : `Copy this link to share it: ${url}`);
  };
  const unshare = async () => {
    if (await patch({ isPublic: false })) {
      setIsPublic(false);
      setNote("Only you can see this basket now.");
    }
  };
  const destroy = async () => {
    if (!window.confirm(`Delete “${name}”? This can’t be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/baskets/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) router.push("/baskets");
    else {
      setBusy(false);
      setNote("Couldn’t delete the basket right now.");
    }
  };
  // Custom weights that don't total 100% yet can't be saved as a new basket.
  const customBlocked = weighting === "custom" && tickers.length > 0 && !weightsValid(customEdit ?? undefined, tickers);
  const copy = async () => {
    const here = `${window.location.pathname}${window.location.search}`;
    if (customBlocked) return setNote(blockedNote);
    setBusy(true);
    if (!p.signedIn) return router.push(`/login?next=${encodeURIComponent(here)}`);
    const body =
      p.mode === "industry"
        ? { sector: p.id, weighting: savedWeighting, ...savedWeights }
        : p.mode === "idea"
          ? { tickers, name: p.name, weighting: savedWeighting, ...savedWeights }
          : { copyFrom: p.id, ...(weighting === "custom" ? { weighting: "custom", ...savedWeights } : {}) };
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) router.push(withStrategy(`/baskets/${json.id}?edit=1`));
    else {
      setBusy(false);
      setNote(json?.error === "limit" ? basketCreateError(json) : "Couldn’t create your copy right now.");
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a fresh copy opens straight into editing
    if (p.isOwner && new URLSearchParams(window.location.search).get("edit") === "1") setEditing(true);
  }, [p.isOwner]);

  const canEdit = (p.mode === "saved" && p.isOwner) || draft;
  // Create basket: saves the stocks picked so far under the name typed (numbered by the server if taken).
  const createDraft = async () => {
    if (!tickers.length) return;
    if (customBlocked) return setNote(blockedNote);
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, name: name.trim() || undefined, weighting: savedWeighting, ...savedWeights }) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) return router.push(withStrategy(`/baskets/${json.id}`));
    setBusy(false);
    if (res?.status === 401) return router.push(`/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
    setNote(json?.error === "limit" ? basketCreateError(json) : "Couldn’t create the basket right now. Try again.");
  };
  const picker = (layout: "rail" | "bar") => (
    <StockPicker
      layout={layout}
      universe={p.universe ?? []}
      industries={p.industries}
      initialIndustry={p.compareSlug}
      watchlist={p.watchlist}
      have={new Set(tickers)}
      full={stocks.length >= MAX_STOCKS}
      onAdd={add}
      onRemove={draft ? remove : undefined}
    />
  );
  const Title = p.titleAs ?? "h1";
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
  const retry = () => {
    setReload((n) => n + 1);
    setLoads((m) => {
      const rest = { ...m };
      delete rest[`${tableKey}|${range}`];
      return rest;
    });
  };

  const WEIGHT_HELP: Record<WeightScheme, string> = {
    equal: "Every stock the same share",
    mcap: "By market cap",
    custom: "Set each stock's % yourself",
    layer: "Each value-chain layer the same share, split equally between its stocks",
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
    never: "Bought on the first day and held",
    monthly: "Back to the target weights on the first trading day of each month",
    quarterly: "Back to the target weights on the first trading day of each quarter",
    drift: "Back to the target weights once any stock drifts past the band",
  };
  const rebalanceControl = (
    <div className={MINI_SEG} role="group" aria-label="Rebalance">
      {REBALANCE_RULES.map((r) => (
        <button key={r} type="button" aria-pressed={strategy.rebalance === r} onClick={() => pickStrategy({ ...strategy, rebalance: r })} title={RULE_HELP[r]} className={segBtn(strategy.rebalance === r)}>
          {RULE_SHORT[r]}
        </button>
      ))}
    </div>
  );
  // The settings the chosen weighting or rebalancing takes: caps, or the drift band.
  const numSelect = (label: string, value: number, choices: number[], unit: string, set: (v: number) => void) => (
    <label className="flex items-center gap-1">
      <span className={ctlLabel}>{label}</span>
      <select
        value={value}
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
  const strategySettings = strategy.rebalance === "drift" && (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {strategy.rebalance === "drift" && (
        <span className="flex items-center gap-1.5">
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
      )}
    </div>
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

  // The holdings table's sortable headers: numbers sort high to low, P/E low to high, names A to Z.
  const sortHead = (id: Sort, label: string, right = true) => (
    <th scope="col" aria-sort={sort === id ? (id === "name" || id === "pe" ? "ascending" : "descending") : "none"} className={"px-2 py-1.5 font-semibold " + (right ? "text-right" : "text-left")}>
      <button type="button" onClick={() => setSort(id)} className={"tap-y inline-flex min-h-6 items-center whitespace-nowrap uppercase tracking-wider hover:text-ink pointer-coarse:min-h-9 " + (sort === id ? "text-ink" : "")}>
        {label}
        {sort === id && <span aria-hidden>{id === "name" || id === "pe" ? " ▲" : " ▼"}</span>}
      </button>
    </th>
  );
  const sinceShown = p.mode === "saved" && rows.some((s) => p.addPrices[s.ticker]);
  const moveSinceAdded = (t: string) => {
    const added = p.addPrices[t];
    const last = tData?.last?.[t];
    return added && last ? (last / added - 1) * 100 : null;
  };
  const excludedNote = (t: string) => {
    const ex = tData?.excluded?.find((e) => e.ticker === t);
    if (!ex) return null;
    return ex.reason === "late" && ex.from ? `Listed ${new Date(ex.from).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}, not in this period` : "No price data";
  };
  const removeButton = (s: BasketStock, small = false) => (
    <button
      type="button"
      onClick={() => remove(s.ticker)}
      aria-label={`Remove ${s.name}`}
      className={(small ? "h-7 w-7 pointer-coarse:h-9 pointer-coarse:w-9" : "tap-target h-9 w-9") + " flex flex-none items-center justify-center rounded border border-line text-ink-soft hover:border-danger hover:text-danger"}
    >
      <svg aria-hidden width="10" height="10" viewBox="0 0 12 12">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
  const lineSwatch = (t: string) => {
    const slot = chartSel.picks[t];
    return (
      <svg aria-hidden width="16" height="6" viewBox="0 0 16 6" className="flex-none">
        {slot != null && <line x1="1.5" y1="3" x2="14.5" y2="3" stroke={stockLine(theme, slot).color} strokeWidth="2.5" strokeDasharray={DASHARRAY[stockLine(theme, slot).dash]} strokeLinecap="round" />}
      </svg>
    );
  };
  // Below lg the statistics sit in the results column; from lg, compact in the side column.
  const stats = (compact: boolean) =>
    stocks.length > 0 && (
      <BasketStats range={range} basketKey={basketKey} name={name} strategy={strategy} stocks={stocks} compact={compact} heading={heading} reload={reload} scope={tableScope === "picks" ? "whole basket" : undefined} />
    );
  const narrowStats = stocks.length > 0 && <div className="flex min-w-0 flex-col lg:hidden">{stats(false)}</div>;
  const railPicker = canEdit && !draft && (editing || stocks.length === 0) && (
    <Panel title="Add stocks" heading={heading} bodyClassName="p-3">
      {picker("rail")}
    </Panel>
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
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
              </div>
            )}
            {/* An idea's description is its rule, list date and disclaimer, so it is never cut short. */}
            {p.description && <p className="max-w-3xl text-pretty text-xs leading-relaxed text-ink-soft">{p.description}</p>}
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2">
            {draft ? (
              <button type="button" onClick={createDraft} disabled={busy || !tickers.length} aria-disabled={customBlocked || undefined} className={btnPri}>
                {busy ? "Creating…" : tickers.length ? `Create basket (${tickers.length})` : "Create basket"}
              </button>
            ) : canEdit ? (
              <>
                <button
                  type="button"
                  // Editing shows the table, where each stock has its remove button.
                  onClick={() => {
                    if (!editing) setStockView("list");
                    setEditing(!editing);
                  }}
                  aria-pressed={editing}
                  className={editing ? btnPri : btnSec}
                >
                  {editing ? "Done" : "Edit stocks"}
                </button>
                <button type="button" onClick={share} disabled={busy} className={btnSec}>
                  {isPublic ? "Copy link" : "Share"}
                </button>
              </>
            ) : p.mode === "idea" ? (
              // Save keeps the idea as it is; Edit opens it on Create basket to change before saving,
              // with the weighting and rebalancing picked here (signed out, both go to sign in first).
              <>
                <button type="button" onClick={copy} disabled={busy} className={btnPri}>
                  {busy ? "Creating…" : "Save as my basket"}
                </button>
                <Link href={withStrategy(`/baskets/new?idea=${encodeURIComponent(p.id)}`, true)} className={btnSec + " inline-flex items-center"}>
                  Edit
                </Link>
              </>
            ) : (
              <button type="button" onClick={copy} disabled={busy} className={btnPri}>
                {busy ? "Creating…" : p.mode === "industry" ? "Customise this basket" : "Copy to my baskets"}
              </button>
            )}
            {canEdit && !draft && (
              <MoreMenu
                items={[
                  { label: "Rename", onSelect: () => setRenaming(true) },
                  ...(isPublic ? [{ label: "Stop sharing", onSelect: unshare }] : []),
                  { label: "Delete basket", onSelect: destroy, danger: true },
                ]}
              />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-2">
          <div className="flex items-center gap-1.5">
            <span className={ctlLabel + " hidden sm:inline"}>Weight</span>
            {weightingControl}
            <InfoTip label="What the weightings mean">
              <ul className="flex flex-col gap-1">
                <li><b>Equal</b>: every stock the same share.</li>
                <li><b>M-cap</b>: bigger companies get more, by market cap.</li>
                <li><b>Custom</b>: you set each stock&rsquo;s %; they must total 100%.{ownsWeights ? " Saved with the basket." : ""}</li>
                <li><b>Layers</b>: each value-chain layer the same share, split equally between its stocks.</li>
              </ul>
            </InfoTip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={ctlLabel + " hidden sm:inline"}>Rebalance</span>
            {rebalanceControl}
            <InfoTip label="What the rebalance rules mean">
              <p className="mb-1">Rebalancing trades every stock back to its target weight.</p>
              <ul className="flex flex-col gap-1">
                <li><b>Hold</b>: bought on day one, never traded.</li>
                <li><b>Monthly</b> / <b>Quarterly</b>: on the first trading day of each month or quarter.</li>
                <li><b>Drift</b>: only when a stock moves more than the Band above or below its target.</li>
              </ul>
            </InfoTip>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={ctlLabel + " hidden sm:inline"}>Period</span>
            {rangeControl}
          </div>
          {strategySettings}
          {stocks.length > 0 && <span className="hidden font-mono text-[11px] text-ink-soft sm:inline">{stocks.length} stocks</span>}
          {stocks.length > 0 && (
            <div role="tablist" aria-label="View" className={MINI_SEG + " ml-auto lg:hidden"}>
              {(["stocks", "chart"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={segBtn(view === v) + " font-sans"}>
                  {v === "stocks" ? `Stocks (${stocks.length})` : "Chart"}
                </button>
              ))}
            </div>
          )}
        </div>
        {(canEdit || note) && (
          // Owners keep this line reserved, so "Saving…" coming and going doesn't shift the page.
          <p role="status" className={"text-xs text-ink-soft empty:hidden " + (canEdit && !draft ? "min-h-4" : "")}>
            {busy && canEdit ? (draft ? "Creating…" : "Saving…") : (note ?? (draft && !tickers.length ? "Pick an industry below and add its stocks." : null))}
          </p>
        )}
      </header>

      {/* Create basket: the industry and its stocks, like the Analysis charts' industry picker. */}
      {draft && <div className={PANEL + " px-3 py-2.5 sm:px-4"}>{picker("bar")}</div>}

      {weighting === "custom" && stocks.length > 0 && (
        <CustomWeights heading={heading} stocks={stocks} values={customEdit ?? {}} onChange={editWeights} onReset={resetToEqual} saves={ownsWeights} />
      )}

      <div className="flex min-w-0 flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">

        {/* Results: the return strip, the chart, the holdings and the backtest analysis. Phones get
            the stock picker on top while editing. */}
        <div className="flex min-w-0 flex-col gap-2">
          {railPicker && <div className="flex min-w-0 flex-col lg:hidden">{railPicker}</div>}
          {!(draft && stocks.length === 0) && (
            <ReturnCards
              dense
              range={range}
              basket={{ key: basketKey, label: `This basket · ${range}` }}
              picks={pickedKey && !picksAll ? { key: pickedKey, label: `Your ${picked.length} pick${picked.length > 1 ? "s" : ""}`, tickers: picked.map((s) => s.ticker), strategy: strategyShort(strategy) } : null}
              benches={heldKey ? [{ key: heldKey, label: "Bought and held" }, ...NIFTY_ONLY] : NIFTY_ONLY}
            />
          )}
          {view !== "chart" && narrowStats}

          {stocks.length === 0 ? (
            <div className={PANEL + " p-8 text-center text-sm text-ink-soft"}>
              {draft ? (
                "Pick an industry above and add its stocks. The returns and chart fill in as you go."
              ) : canEdit ? (
                <>
                  This basket is empty. <span className="lg:hidden">Pick an industry above and add its stocks.</span>
                  <span className="hidden lg:inline">Pick an industry on the right and add its stocks.</span>
                </>
              ) : (
                "This basket has no stocks yet."
              )}
            </div>
          ) : (
            <>
              <Panel
                heading={heading}
                className={onlyOn("chart")}
                title={`Performance · past ${rangeLong} · ${strategyShort(strategy)}`}
                label="Chart"
                bodyClassName="p-3"
                infoLabel="About the chart"
                info={
                  <>
                    Every line starts at 0% on the first day, so their ends compare directly. <b>Compare with</b> adds up to 3 indices or industry
                    baskets; <b>Stocks</b> draws single stocks. Pinch, or use + and −, to zoom; drag sideways to move.
                    {rebalanced && " vs bought and held also draws the same basket never rebalanced."}
                  </>
                }
                tools={
                  rebalanced && (
                    <button type="button" aria-pressed={vsHeld} onClick={() => setVsHeld((v) => !v)} className={MINI_SEG + " " + segBtn(vsHeld) + " items-center font-sans"}>
                      vs bought and held
                    </button>
                  )
                }
              >
                <BasketChart
                  range={range}
                  rangeLong={rangeLong}
                  basketKey={basketKey}
                  basketName={name}
                  strategy={sq}
                  held={heldKey && vsHeld ? { key: heldKey, name: "Bought and held" } : null}
                  industries={compareIndustries}
                  indices={p.indices}
                  market={p.market}
                  stocks={stocks.map((s) => ({ ticker: s.ticker, name: s.name }))}
                  selection={chartSel}
                  onSelection={setChartSel}
                  onPick={() => setPicksChosen(true)}
                />
              </Panel>
              <Panel
                heading={heading}
                className={onlyOn("stocks")}
                title={`Holdings · ${tableScope === "picks" ? `your ${picked.length} picks` : `${stocks.length} stocks`}`}
                label="Stocks in this basket"
                infoLabel="About the holdings"
                info={
                  <>
                    <b>Wt</b>: the stock&rsquo;s share of the basket now. <b>Return</b>: its own price change. <b>Pts</b>: what it added to the
                    basket&rsquo;s return. <b>Breakdown</b> shows the same as charts.
                  </>
                }
                tools={
                  <>
                    {pickedKey && (
                      <div role="group" aria-label="Measure within" className={MINI_SEG}>
                        {(["all", "picks"] as const).map((v) => (
                          <button key={v} type="button" aria-pressed={tableScope === v} onClick={() => setScope(v)} className={segBtn(tableScope === v) + " font-sans"}>
                            {v === "all" ? "All" : "Your picks"}
                          </button>
                        ))}
                      </div>
                    )}
                    <div role="tablist" aria-label="Show stocks as" className={MINI_SEG}>
                      {(["list", "charts"] as const).map((v) => (
                        <button key={v} type="button" role="tab" aria-selected={stockView === v} onClick={() => setStockView(v)} className={segBtn(stockView === v) + " font-sans"}>
                          {v === "list" ? "Table" : "Breakdown"}
                        </button>
                      ))}
                    </div>
                  </>
                }
              >
                {stockView === "charts" ? (
                  tData ? (
                    <BasketBreakdown
                      holdings={(tData.holdings ?? []).filter((h) => rows.some((s) => s.ticker === h.ticker))}
                      stockOf={(t) => byTicker.get(t)}
                      rangeLong={rangeLong}
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
                        <b className="font-semibold">wt</b> share now · <b className="font-semibold">pts</b> added to the return
                      </span>
                      <label className="flex items-center gap-1.5">
                        <span className="sr-only">Sort by</span>
                        <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-9 rounded border border-line bg-bg px-1.5 text-xs text-ink">
                          {SORTS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <ul className="divide-y divide-line/70 sm:hidden">
                      {rows.map((s) => {
                        const h = tHoldings.get(s.ticker);
                        const ex = excludedNote(s.ticker);
                        const since = moveSinceAdded(s.ticker);
                        return (
                          <li key={s.ticker} className="flex items-start gap-2 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              {/* Names wrap rather than cut off; the figures on the right stay narrow to leave them room. */}
                              <StockLink ticker={s.ticker} className="relative block text-[13px] font-semibold leading-snug text-accent [overflow-wrap:anywhere] before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:underline">
                                {s.name}
                              </StockLink>
                              {/* Balanced, so a long layer never leaves one word on a line of its own. */}
                              <div className="text-balance text-[11px] leading-snug text-ink-soft">
                                <span className="font-mono">{s.ticker}</span> · {s.layer}
                              </div>
                              <div className="font-mono text-[11px] text-ink-soft">
                                P/E {s.pe != null ? s.pe.toFixed(1) : "—"} · <span className="whitespace-nowrap">{s.mcapCr != null ? `₹${crore(s.mcapCr)}` : "mcap —"}</span>
                              </div>
                              <IndustryChips industries={industriesOf(s)} className="mt-1" />
                            </div>
                            <div className="flex-none text-right">
                              {h ? (
                                <>
                                  <div className={"font-mono text-[13px] font-semibold " + (h.ret >= 0 ? "text-pos" : "text-danger")}>{pct(h.ret)}</div>
                                  <div className="whitespace-nowrap font-mono text-[11px] text-ink-soft">wt {(h.endWeight * 100).toFixed(1)}%</div>
                                  <div className="whitespace-nowrap font-mono text-[11px] text-ink-soft">
                                    {h.contribution >= 0 ? "+" : "−"}
                                    {Math.abs(h.contribution).toFixed(2)} pts
                                  </div>
                                </>
                              ) : ex ? (
                                <div className="max-w-[7rem] text-[11px] leading-snug text-ink-soft">{ex}</div>
                              ) : (
                                <div className="font-mono text-sm text-ink-soft">{tbt?.status === "error" ? "—" : "…"}</div>
                              )}
                              {since != null && (
                                <div className="font-mono text-[11px] text-ink-soft">
                                  {pct(since)}
                                  <span className="block font-sans">since added</span>
                                </div>
                              )}
                            </div>
                            {canEdit && editing && removeButton(s)}
                          </li>
                        );
                      })}
                    </ul>
                    {/* From sm: the dense table, sortable by its headers. */}
                    <div className="hidden overflow-x-auto sm:block">
                      <table className="w-full border-collapse text-xs">
                        <thead className="bg-panel-2/60 text-[10px] uppercase tracking-wider text-ink-soft">
                          <tr className="border-b border-line">
                            <th scope="col" className="w-6 px-0">
                              <span className="sr-only">Chart line</span>
                            </th>
                            {sortHead("name", "Stock", false)}
                            {sortHead("weight", "Wt")}
                            {sortHead("return", "Return")}
                            {sortHead("contribution", "Pts")}
                            {sortHead("pe", "P/E")}
                            {sortHead("mcap", "Mcap ₹ Cr")}
                            {sinceShown && (
                              <th scope="col" className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">
                                Since added
                              </th>
                            )}
                            {canEdit && editing && (
                              <th scope="col" className="w-9 px-1">
                                <span className="sr-only">Remove</span>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((s) => {
                            const h = tHoldings.get(s.ticker);
                            const ex = excludedNote(s.ticker);
                            const since = moveSinceAdded(s.ticker);
                            const inds = industriesOf(s);
                            const others = inds.length - 1;
                            return (
                              <tr key={s.ticker} className="border-b border-line/60 even:bg-panel-2/30 hover:bg-accent/5">
                                <td className="pl-2">{lineSwatch(s.ticker)}</td>
                                <td className="w-full max-w-0 px-2 py-1.5">
                                  {/* Touch screens: the name is padded to 36px and the line below spaced out so the
                                      industry link's 36px area (tap-y) does not overlap it. */}
                                  <StockLink ticker={s.ticker} title={s.name} className="block truncate font-semibold text-accent hover:underline pointer-coarse:py-2.5">
                                    {s.name}
                                  </StockLink>
                                  {/* Wraps rather than cuts off: a tablet held upright has no hover to show a title. */}
                                  <span className="block text-balance text-[10px] leading-snug text-ink-soft pointer-coarse:mt-3">
                                    <span className="font-mono">{s.ticker}</span> · {s.layer}
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
                                {h ? (
                                  <>
                                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono">{(h.endWeight * 100).toFixed(1)}%</td>
                                    <td className={"whitespace-nowrap px-2 py-1.5 text-right font-mono font-semibold " + (h.ret >= 0 ? "text-pos" : "text-danger")}>{pct(h.ret)}</td>
                                    <td className={"whitespace-nowrap px-2 py-1.5 text-right font-mono " + (h.contribution >= 0 ? "text-pos" : "text-danger")}>
                                      {h.contribution >= 0 ? "+" : "−"}
                                      {Math.abs(h.contribution).toFixed(2)}
                                    </td>
                                  </>
                                ) : (
                                  <td colSpan={3} className="px-2 py-1.5 text-right text-[11px] text-ink-soft">
                                    {ex ?? (tbt?.status === "error" ? "—" : "…")}
                                  </td>
                                )}
                                <td className="px-2 py-1.5 text-right font-mono">{s.pe != null ? s.pe.toFixed(1) : "—"}</td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono">{s.mcapCr != null ? Math.round(s.mcapCr).toLocaleString("en-IN") : "—"}</td>
                                {sinceShown && <td className={"whitespace-nowrap px-2 py-1.5 text-right font-mono " + (since == null ? "text-ink-soft" : since >= 0 ? "text-pos" : "text-danger")}>{since != null ? pct(since) : "—"}</td>}
                                {canEdit && editing && <td className="px-1 py-1">{removeButton(s, true)}</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="border-t border-line/70 px-3 py-1.5 text-[11px] text-ink-soft">
                      Return over the past {rangeLong} · <b className="font-semibold">wt</b> its share of {tableScope === "picks" ? "your picks" : "the basket"} now ·{" "}
                      <b className="font-semibold">pts</b> what it added to {tableScope === "picks" ? "your picks’" : "the basket’s"} return · P/E and market cap from our last data update
                    </p>
                  </>
                )}
                {tbt?.status === "error" && (
                  <p className="px-3 pb-2 text-xs text-ink-soft">
                    Couldn&rsquo;t backtest the basket right now.{" "}
                    <button type="button" onClick={retry} className="font-semibold text-accent underline">
                      Retry
                    </button>
                  </p>
                )}
              </Panel>
              <div className={"flex min-w-0 flex-col " + onlyOn("chart")}>
                <BasketAnalysis range={range} basketKey={basketKey} strategyName={strategyShort(strategy)} heading={heading} reload={reload} />
              </div>
              {view === "chart" && narrowStats}
            </>
          )}

          <p className="text-[11px] leading-relaxed text-ink-soft">
            Backtest: bought on the first day of the period at {weighting === "equal" ? "equal weights" : weighting === "layer" ? "equal weights per value-chain layer (equal within each)" : weighting === "custom" ? "your custom weights (a stock with no prices for the period has its share spread over the rest, in proportion)" : "weights by market cap"}
            {weighting === "mcap" ? " (today’s market caps, from our last data update, so slightly flattering to winners)" : ""}
            {rebalanced
              ? `, then ${rebalanceLabel(strategy)}, trading at that day’s close${strategy.rebalance === "drift" ? " (the day after the drift is seen)" : ""}. Turnover and trades are shown, but no brokerage, taxes or slippage are taken off. Price change only, no dividends.`
              : " and held without rebalancing. Price change only, no dividends, costs or taxes."} Stocks listed during the period are left out of it, and the basket is today&rsquo;s list of stocks, so companies that fell out of the industry before now are missing. A tracking and research tool, not investment advice.
            {p.mode === "industry" && (
              <>
                {" "}
                Every listed company on the{" "}
                <Link href={`/sector/${p.id}`} className="tap-y text-accent hover:underline">
                  {p.name.replace(/ basket$/, "")} map
                </Link>
                .
              </>
            )}
          </p>
        </div>
        {/* Side column (from lg, beside the results and kept in view): the statistics, the stock
            picker while editing and the stocks at a glance. After the results in the page order,
            so keyboards and screen readers reach the chart and table first. */}
        <aside aria-label="Basket controls" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] min-w-0 flex-col gap-2 overflow-y-auto lg:flex">
          {stats(true)}
          {railPicker}
          {stocks.length > 0 && (
            <Panel heading={heading} title={`In this basket (${stocks.length})`} className="flex min-h-0 flex-col" bodyClassName="flex min-h-0 flex-col">
              <p className="px-3 pt-1.5 text-[11px] leading-snug text-ink-soft">
                {picked.length > 0 ? "The mark beside a stock is its line on the chart. " : ""}Add or take off lines with the chart&rsquo;s Stocks menu.
              </p>
              <ul className="max-h-[22rem] divide-y divide-line/70 overflow-y-auto overscroll-contain px-3 py-1">
                {/* Stocks on the chart first (in the order their lines were given), then the rest A to Z. */}
                {[...stocks]
                  .sort((a, b) => {
                    const sa = chartSel.picks[a.ticker];
                    const sb = chartSel.picks[b.ticker];
                    if (sa != null && sb != null) return sa - sb;
                    if (sa != null || sb != null) return sa != null ? -1 : 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((s) => {
                    const h = holdings.get(s.ticker);
                    const slot = chartSel.picks[s.ticker];
                    return (
                      <li key={s.ticker} className="flex items-center gap-2 py-1">
                        {lineSwatch(s.ticker)}
                        <StockLink ticker={s.ticker} className={"min-w-0 flex-1 truncate text-xs hover:text-accent hover:underline " + (slot == null ? "text-ink" : "font-semibold text-ink")}>
                          {s.name}
                          {slot != null && <span className="sr-only"> (on the chart)</span>}
                        </StockLink>
                        <span className={"flex-none font-mono text-[11px] " + (!h ? "text-ink-soft" : h.ret >= 0 ? "text-pos" : "text-danger")}>{h ? pct(h.ret) : "—"}</span>
                        {canEdit && editing && removeButton(s, true)}
                      </li>
                    );
                  })}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

// Custom weighting: each stock's % as a typed number, a running total that has to reach 100% (the
// backtest keeps the last weights that did until then), and Reset to equal.
function CustomWeights({
  heading,
  stocks,
  values,
  onChange,
  onReset,
  saves,
}: {
  heading: "h2" | "h3";
  stocks: BasketStock[];
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  onReset: () => void;
  /** A saved basket of yours: the weights are kept with it. */
  saves: boolean;
}) {
  const total = weightsTotal(Object.fromEntries(stocks.map((s) => [s.ticker, values[s.ticker] ?? 0])));
  const off = Math.round((100 - total) * 10) / 10;
  const ok = Math.abs(off) < 0.05;
  return (
    <Panel
      heading={heading}
      title={`Custom weights · ${stocks.length} stock${stocks.length > 1 ? "s" : ""}`}
      label="Custom weights"
      infoLabel="About custom weights"
      info={
        <>
          Type each stock&rsquo;s share of the basket; together they must make 100%. Rebalancing trades back to these.
          {saves ? " Saved with the basket." : ""}
        </>
      }
      tools={
        <>
          <span className={"font-mono text-[11px] font-semibold " + (ok ? "text-pos" : "text-danger")}>Total {total.toFixed(1)}%</span>
          <button type="button" onClick={onReset} className="inline-flex min-h-9 items-center rounded border border-line bg-bg px-2 text-[11px] font-semibold text-ink hover:border-accent sm:min-h-6 pointer-coarse:min-h-9">
            Reset to equal
          </button>
        </>
      }
    >
      <p role="status" className={"px-3 pt-1.5 text-[11px] leading-snug " + (ok ? "text-ink-soft" : "font-semibold text-danger")}>
        {ok
          ? "The backtest uses these weights."
          : `Total is ${total.toFixed(1)}%: ${off > 0 ? `add ${off.toFixed(1)}%` : `take off ${(-off).toFixed(1)}%`} to make 100%. The backtest waits until then.`}
      </p>
      <ul className="grid max-h-72 grid-cols-1 gap-x-4 overflow-y-auto overscroll-contain px-3 py-1 sm:grid-cols-2 lg:grid-cols-3">
        {stocks.map((s) => (
          <li key={s.ticker} className="flex items-center gap-2 border-b border-line/60 py-1">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink" title={s.name}>
                {s.name}
              </span>
              <span className="block truncate font-mono text-[10px] text-ink-soft">{s.ticker}</span>
            </span>
            <WeightInput label={`${s.name} weight, %`} value={values[s.ticker] ?? 0} onCommit={(v) => onChange({ ...values, [s.ticker]: v })} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// A % field that lets "12." or an empty box sit while typing; any number it can read goes up at once.
function WeightInput({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const read = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() !== "" && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : null;
  };
  return (
    <label className="flex flex-none items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={text ?? String(value)}
        onChange={(e) => {
          setText(e.target.value);
          const n = read(e.target.value);
          if (n != null) onCommit(n);
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          if (text != null && read(text) == null) onCommit(0);
          setText(null);
        }}
        // 16px on phones, so iOS doesn't zoom the page on focus.
        className="min-h-9 w-16 rounded border border-line bg-bg px-1.5 text-right font-mono text-base text-ink focus:border-accent focus:outline-none sm:min-h-7 sm:text-xs pointer-coarse:min-h-9"
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

// Pick stocks to add, industry first: choose an industry, then add from its listed stocks (one by
// one or all at once). Switching industries keeps adding to the same basket. The watchlist's
// stocks sit underneath as one-tap chips.
function StockPicker({
  layout = "rail",
  universe,
  industries,
  initialIndustry,
  watchlist,
  have,
  full,
  onAdd,
  onRemove,
}: {
  /** "rail": stacked in the basket's left column. "bar": one row across the top (Create basket). */
  layout?: "rail" | "bar";
  /** When set, a stock already in the basket can be taken off from the list too. */
  onRemove?: (ticker: string) => void;
  universe: BasketStock[];
  industries: CompareBasket[];
  initialIndustry: string | null;
  watchlist: string[];
  have: Set<string>;
  full: boolean;
  onAdd: (tickers: string[]) => void;
}) {
  const [industry, setIndustry] = useState(() => (initialIndustry && industries.some((i) => i.slug === initialIndustry) ? initialIndustry : (industries[0]?.slug ?? "")));
  const [filter, setFilter] = useState("");
  // The page can hold two pickers (results column below lg, side column from lg), so the list's id is per instance.
  const listId = useId();
  // The stocks list is a dropdown: it opens from the Stocks button or on picking an industry,
  // stays open while adding, and closes on a tap anywhere else or Escape.
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // Closing also clears the filter, so the list reopens whole.
    const close = () => {
      setOpen(false);
      setFilter("");
    };
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // Stocks already in the basket list first (as they were when the list opened or the industry
  // changed, so a row never jumps under a tap), then the rest A to Z.
  const [pinned, setPinned] = useState<Set<string>>(() => new Set(have));
  const inIndustry = useMemo(
    () =>
      universe
        .filter((s) => s.industries.some((i) => i.slug === industry))
        .sort((a, b) => Number(pinned.has(b.ticker)) - Number(pinned.has(a.ticker)) || a.name.localeCompare(b.name)),
    [universe, industry, pinned],
  );
  const f = filter.trim().toLowerCase();
  const matches = f ? inIndustry.filter((s) => s.name.toLowerCase().includes(f) || s.ticker.toLowerCase().includes(f)) : inIndustry;
  const addable = matches.filter((s) => !have.has(s.ticker));
  const industryName = industries.find((i) => i.slug === industry)?.name ?? "this industry";
  const added = inIndustry.filter((s) => have.has(s.ticker)).length;
  const bar = layout === "bar";
  const liked = watchlist.filter((t) => !have.has(t)).map((t) => universe.find((s) => s.ticker === t)).filter((s): s is BasketStock => !!s);

  return (
    <section
      aria-label="Add stocks"
      className={"flex flex-col gap-3 " + (bar ? "max-w-4xl" : "")}
    >
      <div ref={boxRef} className="relative">
        <div className={"flex flex-col gap-2 sm:flex-row " + (bar ? "sm:items-center sm:gap-4" : "lg:flex-col")}>
          {/* In the bar each label sits beside its control, as on the Analysis charts' industry picker. */}
          <label className={"flex min-w-0 gap-1 " + (bar ? "flex-col sm:flex-1 sm:flex-row sm:items-center sm:gap-2" : "flex-col sm:flex-1 lg:w-full")}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry</span>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setFilter("");
                setOpen(true);
                setPinned(new Set(have));
              }}
              className={"rounded-lg border border-line px-3 py-2 text-base text-ink sm:text-sm " + (bar ? "min-h-[42px] min-w-0 flex-1 bg-panel font-semibold" : "bg-bg")}
            >
              {industries.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <div className={"flex min-w-0 gap-1 " + (bar ? "flex-col sm:flex-1 sm:flex-row sm:items-center sm:gap-2" : "flex-col sm:flex-1 lg:w-full")}>
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Stocks
              <InfoTip label="How to add stocks">
                Pick an industry, then add its stocks one by one or all at once. Switching industry keeps adding to the same basket, so one basket can
                mix several (up to {MAX_STOCKS} stocks).
              </InfoTip>
            </span>
            <button
              type="button"
              onClick={() => {
                if (!open) setPinned(new Set(have));
                setOpen(!open);
              }}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-label={`${industryName} stocks: ${inIndustry.length} listed${added > 0 ? `, ${added} in this basket` : ""}`}
              className={"flex min-h-[42px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-base text-ink sm:text-sm " + (bar ? "min-w-0 flex-1 bg-panel " : "bg-bg ") + (open ? "border-accent" : "border-line")}
            >
              <span className="truncate">
                {inIndustry.length} listed{added > 0 ? ` · ${added} in this basket` : ""}
              </span>
              <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className={"flex-none transition-transform " + (open ? "rotate-180" : "")}>
                <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div
            id={listId}
            className={"absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-line bg-panel p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] " + (bar ? "sm:left-auto sm:w-[min(28rem,100%)]" : "lg:static lg:mt-2 lg:bg-bg lg:shadow-none")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-ink-soft">{industryName}</span>
              {addable.length > 1 && (
                <button type="button" disabled={full} onClick={() => onAdd(addable.map((s) => s.ticker))} className="flex-none text-xs font-semibold text-accent hover:underline">
                  Add all {addable.length}
                </button>
              )}
            </div>
            {inIndustry.length > 12 && (
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${inIndustry.length} stocks`}
                aria-label={`Filter ${industryName} stocks`}
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
              />
            )}
            <ul role="listbox" aria-label={`${industryName} stocks`} className="mt-1 max-h-[min(45vh,22rem)] divide-y divide-line overflow-y-auto overscroll-contain">
              {matches.map((s) => {
                const inIt = have.has(s.ticker);
                return (
                  <li key={s.ticker} role="option" aria-selected={inIt} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className={"truncate text-sm " + (inIt ? "font-semibold text-accent" : "text-ink")}>
                        {inIt && <span aria-hidden>✓ </span>}
                        {s.name}
                      </div>
                      <div className="truncate text-[11px] text-ink-soft">
                        <span className="font-mono">{s.ticker}</span> · {s.layer}
                      </div>
                    </div>
                    {inIt && onRemove ? (
                      <button type="button" onClick={() => onRemove(s.ticker)} aria-label={`Remove ${s.name}`} className="min-h-9 flex-none rounded-full border border-line px-3 text-xs font-semibold text-ink-soft hover:border-danger hover:text-danger">
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={inIt || full}
                        onClick={() => onAdd([s.ticker])}
                        aria-label={inIt ? `${s.name} is in this basket` : `Add ${s.name}`}
                        className={"min-h-9 flex-none rounded-full px-3 text-xs font-semibold " + (inIt ? "text-ink-soft" : "border border-accent text-accent hover:bg-accent hover:text-bg")}
                      >
                        {inIt ? "Added" : "+ Add"}
                      </button>
                    )}
                  </li>
                );
              })}
              {matches.length === 0 && <li className="py-2 text-xs text-ink-soft">No {industryName} stock matches &ldquo;{filter}&rdquo;.</li>}
            </ul>
          </div>
        )}
      </div>
      {full && <p className="text-xs text-ink-soft">This basket is full ({MAX_STOCKS} stocks). Remove one to add another.</p>}

      {liked.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              From your watchlist
              <InfoTip label="About From your watchlist">Stocks you saved with the heart, one tap to add. Only those not already in the basket show here.</InfoTip>
            </span>
            {liked.length > 1 && (
              <button type="button" disabled={full} onClick={() => onAdd(liked.map((s) => s.ticker))} className="-my-2 px-1 py-2 text-xs font-semibold text-accent hover:underline">
                Add all {liked.length}
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {liked.map((s) => (
              <button key={s.ticker} type="button" disabled={full} onClick={() => onAdd([s.ticker])} className="min-h-9 rounded-full border border-line px-3 text-xs text-ink hover:border-accent">
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
