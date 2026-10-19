"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { IndustryChips } from "./IndustryChips";
import { basketCreateError } from "./NewBasketButton";
import { loadSeries, savedBasketQuery, type Load } from "./series";

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

const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
  { id: "2Y", long: "2 years" },
  { id: "3Y", long: "3 years" },
  { id: "5Y", long: "5 years" },
];
const MAX_STOCKS = 75;

type Sort = "contribution" | "return" | "weight" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "contribution", label: "Contribution" },
  { id: "return", label: "Return" },
  { id: "weight", label: "Weight" },
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
  weighting: "equal" | "mcap";
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
  const [weighting, setWeighting] = useState(p.weighting);
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
  // Under the chart: the stocks as bar charts (who made the return, returns, weights,
  // industries) or as the stock-by-stock list.
  const [stockView, setStockView] = useState<"charts" | "list">("charts");
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("contribution");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [loads, setLoads] = useState<Record<string, Load>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the view the URL asked for once on mount
    if (new URLSearchParams(window.location.search).get(p.viewParam ?? "view") === "chart") setView("chart");
  }, [p.viewParam]);
  const pickView = (v: "stocks" | "chart") => {
    setView(v);
    const url = new URL(window.location.href);
    const key = p.viewParam ?? "view";
    if (v === "chart") url.searchParams.set(key, "chart");
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
  };

  const tickers = useMemo(() => stocks.map((s) => s.ticker), [stocks]);
  const basketKey =
    p.mode === "industry" ? `x:sector=${p.id}&w=${weighting}` : p.mode === "idea" || draft ? picksKey(tickers, weighting) ?? `x:tickers=&w=${weighting}` : `x:${savedBasketQuery(p.id, weighting, tickers)}`;
  const compareKey = p.compareSlug && !(p.mode === "industry" && p.compareSlug === p.id) ? `x:sector=${p.compareSlug}&w=${weighting}` : null;
  // Kept here, above the chart, so the reader's picks outlive weighting, range and view switches.
  const compareIndustries = p.industries.filter((i) => !(p.mode === "industry" && i.slug === p.id));
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
  const pickedKey = picksKey(
    picked.map((s) => s.ticker),
    weighting,
  );

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
  const add = async (list: string[]) => {
    const fresh = list.filter((t) => !byTicker.has(t)).slice(0, MAX_STOCKS - stocks.length);
    if (!fresh.length) return;
    setStocks((s) => [...s, ...fresh.map((t) => universe.get(t)!).filter(Boolean)]);
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
    if (!draft) syncItems(await patch({ add: fresh }));
  };
  const remove = async (t: string) => {
    setStocks((s) => s.filter((x) => x.ticker !== t));
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
    if (!draft) syncItems(await patch({ remove: [t] }));
  };
  const setWeight = async (w: "equal" | "mcap") => {
    setWeighting(w);
    if (p.mode === "saved" && p.isOwner) await patch({ weighting: w });
  };
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
  const copy = async () => {
    const here = `${window.location.pathname}${window.location.search}`;
    setBusy(true);
    if (!p.signedIn) return router.push(`/login?next=${encodeURIComponent(here)}`);
    const body = p.mode === "industry" ? { sector: p.id, weighting } : p.mode === "idea" ? { tickers, name: p.name, weighting } : { copyFrom: p.id };
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) router.push(`/baskets/${json.id}?edit=1`);
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
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, name: name.trim() || undefined, weighting }) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) return router.push(`/baskets/${json.id}`);
    setBusy(false);
    if (res?.status === 401) return router.push("/login?next=/baskets/new");
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
  // Desktop shows the chart and the stock table together; phones switch between them.
  const wide = useWide();
  const theme = useSiteTheme();
  const showChart = wide || view === "chart";
  const showTable = wide || view === "stocks";
  const seg = (on: boolean) => "min-h-9 rounded-full px-2.5 text-[11px] font-semibold transition sm:text-xs lg:min-h-8 " + (on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink");
  const retry = () =>
    setLoads((m) => {
      const rest = { ...m };
      delete rest[`${tableKey}|${range}`];
      return rest;
    });

  const weightingControl = (
    // In the rail (lg) the group spans the column, so its halves are made equal.
    <div className="inline-flex rounded-full border border-line bg-panel p-0.5 lg:grid lg:grid-cols-2" role="group" aria-label="Weighting">
      {(["equal", "mcap"] as const).map((w) => (
        <button key={w} type="button" aria-pressed={weighting === w} onClick={() => setWeight(w)} className={seg(weighting === w)}>
          {w === "equal" ? (
            <>
              Equal<span className="hidden lg:inline"> weight</span>
            </>
          ) : (
            <>
              <span className="lg:hidden">M-cap</span>
              <span className="hidden lg:inline">Market cap</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
  const rangeControl = (
    <div className="inline-flex rounded-full border border-line bg-panel p-0.5 lg:grid lg:grid-cols-6" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={seg(range === r.id) + " min-w-8 px-1.5 sm:min-w-9 sm:px-2 lg:min-w-0 lg:px-1"}>
          {r.id}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Create basket: the industry and its stocks on top, like the Analysis charts' industry picker. */}
      {draft && picker("bar")}
    <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Control rail: everything that changes the basket or how it's measured. Phones get it as
          three compact rows on top; from lg it is a column beside the results that stays in view. */}
      <aside aria-label="Basket controls" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-line lg:bg-panel lg:p-4">
        {/* Row 1: name, sharing state, more actions */}
        {draft && <Title className="sr-only">Create a basket</Title>}
        {draft ? (
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your basket"
            aria-label="Basket name"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 font-display text-lg font-bold text-ink placeholder:font-normal placeholder:text-ink-soft focus:border-accent focus:outline-none"
          />
        ) : renaming ? (
          <form
            className="flex flex-wrap items-center gap-2"
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
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 font-display text-lg font-bold text-ink focus:border-accent focus:outline-none"
            />
            <button type="submit" className="min-h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-bg">
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Title className="min-w-0 break-words font-display text-xl font-bold leading-tight text-ink lg:text-2xl">{name}</Title>
              {p.mode === "saved" && (
                <span className={"rounded-full border px-2 py-0.5 text-[11px] font-semibold " + (isPublic ? "border-accent text-accent" : "border-line text-ink-soft")}>
                  {isPublic ? "Shared by link" : "Private"}
                </span>
              )}
            </div>
            {canEdit && (
              <MoreMenu
                items={[
                  { label: "Rename", onSelect: () => setRenaming(true) },
                  ...(isPublic ? [{ label: "Stop sharing", onSelect: unshare }] : []),
                  { label: "Delete basket", onSelect: destroy, danger: true },
                ]}
              />
            )}
          </div>
        )}
        {/* An idea's description is its rule, list date and disclaimer, so it is never cut short. */}
        {p.description && <p className={"text-xs leading-relaxed text-ink-soft " + (p.mode === "idea" ? "" : "line-clamp-2 lg:line-clamp-none")}>{p.description}</p>}

        {/* Row 2: the main actions, plus the phone's Stocks / Chart switch */}
        <div className="flex flex-wrap items-center gap-2">
          {draft ? (
            <button type="button" onClick={createDraft} disabled={busy || !tickers.length} className="min-h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-40 lg:w-full lg:text-sm">
              {busy ? "Creating…" : tickers.length ? `Create basket (${tickers.length})` : "Create basket"}
            </button>
          ) : canEdit ? (
            <>
              <button
                type="button"
                // Editing shows the list, where phones have each stock's remove button.
                onClick={() => {
                  if (!editing) setStockView("list");
                  setEditing(!editing);
                }}
                aria-pressed={editing} className={"min-h-9 rounded-lg px-3 text-xs font-semibold " + (editing ? "bg-accent text-bg" : "border border-line text-ink hover:border-accent")}>
                {editing ? "Done" : "Edit"}
              </button>
              <button type="button" onClick={share} disabled={busy} className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-accent">
                {isPublic ? "Copy link" : "Share"}
              </button>
            </>
          ) : (
            <button type="button" onClick={copy} disabled={busy} className="min-h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-bg hover:opacity-90 lg:w-full lg:text-sm">
              {busy ? "Creating…" : p.mode === "industry" ? "Customise this basket" : p.mode === "idea" ? "Save as my basket" : "Copy to my baskets"}
            </button>
          )}
          {stocks.length > 0 && (
            <div role="tablist" aria-label="View" className="ml-auto flex rounded-full border border-line bg-panel p-0.5 lg:hidden">
              {(["stocks", "chart"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={seg(view === v)}>
                  {v === "stocks" ? `Stocks (${stocks.length})` : "Chart"}
                </button>
              ))}
            </div>
          )}
        </div>
        {(canEdit || note) && (
          // Owners keep this line reserved, so "Saving…" coming and going doesn't shift the page.
          <p role="status" className={"text-xs text-ink-soft empty:hidden " + (canEdit && !draft ? "min-h-4" : "")}>
            {busy && canEdit ? (draft ? "Creating…" : "Saving…") : note ?? (draft && !tickers.length ? "Pick an industry above and add its stocks." : null)}
          </p>
        )}

        {/* Row 3: how the backtest is measured. One line on phones, labelled stack in the rail. */}
        <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-col lg:items-stretch lg:gap-3">
          <div className="flex flex-col gap-1">
            <span className="hidden text-[11px] font-bold uppercase tracking-wider text-ink-soft lg:block">Weighting</span>
            {weightingControl}
          </div>
          <div className="flex flex-col gap-1">
            <span className="hidden text-[11px] font-bold uppercase tracking-wider text-ink-soft lg:block">Period</span>
            {rangeControl}
          </div>
        </div>

        {canEdit && !draft && (editing || stocks.length === 0) && <div>{picker("rail")}</div>}

        {/* In this basket: the holdings at a glance (desktop only; phones have the Stocks view) */}
        {stocks.length > 0 && (
          // The list takes the rail's leftover height and scrolls on its own, so the name, buttons
          // and controls above it never scroll out of view.
          <section aria-label="In this basket" className="hidden flex-col gap-1 lg:flex lg:min-h-0 lg:flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">In this basket ({stocks.length})</span>
            <span className="text-[11px] leading-snug text-ink-soft">
              {picked.length > 0 ? "The mark beside a stock is its line on the chart. " : ""}Add or take off lines with the chart&rsquo;s Stocks menu.
            </span>
            <ul className="divide-y divide-line lg:min-h-24 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              {[...stocks]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const h = holdings.get(s.ticker);
                  const slot = chartSel.picks[s.ticker];
                  return (
                    <li key={s.ticker} className="flex items-center gap-2 py-1.5">
                      {/* The stock's line (colour and dash) when it is drawn on the chart; an empty slot keeps names aligned. */}
                      <svg aria-hidden width="16" height="6" viewBox="0 0 16 6" className="flex-none">
                        {slot != null && (
                          <line x1="1.5" y1="3" x2="14.5" y2="3" stroke={stockLine(theme, slot).color} strokeWidth="2.5" strokeDasharray={DASHARRAY[stockLine(theme, slot).dash]} strokeLinecap="round" />
                        )}
                      </svg>
                      <StockLink ticker={s.ticker} className={"min-w-0 flex-1 truncate text-xs hover:text-accent hover:underline " + (slot == null ? "text-ink" : "font-semibold text-ink")}>
                        {s.name}
                        {slot != null && <span className="sr-only"> (on the chart)</span>}
                      </StockLink>
                      <span className={"flex-none font-mono text-[11px] " + (!h ? "text-ink-soft" : h.ret >= 0 ? "text-pos" : "text-danger")}>{h ? pct(h.ret) : "—"}</span>
                      {canEdit && editing && (
                        <button type="button" onClick={() => remove(s.ticker)} aria-label={`Remove ${s.name}`} className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger">
                          <svg aria-hidden width="10" height="10" viewBox="0 0 12 12">
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </aside>

      {/* Results: the return cards, then the chart and the stock-by-stock table */}
      <div className="flex min-w-0 flex-col gap-4">
        {!(draft && stocks.length === 0) && (
        <ReturnCards
          range={range}
          basket={{ key: basketKey, label: `This basket · ${range}` }}
          picks={pickedKey && !picksAll ? { key: pickedKey, label: `Your ${picked.length} pick${picked.length > 1 ? "s" : ""}`, tickers: picked.map((s) => s.ticker), weighting } : null}
          benches={NIFTY_ONLY}
        />
        )}

        {stocks.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-ink-soft">
            {draft ? (
              "Pick an industry above and add its stocks. The returns and chart fill in as you go."
            ) : canEdit ? (
              <>
                This basket is empty. <span className="lg:hidden">Pick an industry above and add its stocks.</span>
                <span className="hidden lg:inline">Pick an industry on the left and add its stocks.</span>
              </>
            ) : (
              "This basket has no stocks yet."
            )}
          </div>
        ) : (
          <>
            {showChart && (
              <section aria-label="Chart" className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
                <BasketChart
                  range={range}
                  rangeLong={rangeLong}
                  basketKey={basketKey}
                  basketName={name}
                  weighting={weighting}
                  industries={compareIndustries}
                  indices={p.indices}
                  market={p.market}
                  stocks={stocks.map((s) => ({ ticker: s.ticker, name: s.name }))}
                  selection={chartSel}
                  onSelection={setChartSel}
                />
              </section>
            )}
            {showTable && (
              <section aria-label="Stocks in this basket" className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
                  <div role="tablist" aria-label="Show stocks as" className="inline-flex rounded-full border border-line bg-panel p-0.5">
                    {(["charts", "list"] as const).map((v) => (
                      <button key={v} type="button" role="tab" aria-selected={stockView === v} onClick={() => setStockView(v)} className={seg(stockView === v)}>
                        {v === "charts" ? "Charts" : "List"}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {pickedKey && (
                    <div role="group" aria-label="Measure within" className="inline-flex rounded-full border border-line bg-panel p-0.5">
                      {(["all", "picks"] as const).map((v) => (
                        <button key={v} type="button" aria-pressed={tableScope === v} onClick={() => setScope(v)} className={seg(tableScope === v)}>
                          {v === "all" ? "All" : "Your picks"}
                        </button>
                      ))}
                    </div>
                  )}
                  {stockView === "list" && (
                  <label className="flex items-center gap-1.5">
                    Sort by
                    <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-ink">
                      {SORTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  )}
                  </div>
                </div>
                {stockView === "list" && (
                  <p className="text-[11px] text-ink-soft">
                    Return over the past {rangeLong} · <b className="font-semibold">wt</b> its share of {tableScope === "picks" ? "your picks" : "the basket"} now ·{" "}
                    <b className="font-semibold">pts</b> what it added to {tableScope === "picks" ? "your picks\u2019" : "the basket\u2019s"} return
                  </p>
                )}
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
                    <div aria-busy className="h-80 animate-pulse rounded-2xl bg-line/60" />
                  ) : null
                ) : (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
                  {rows.map((s) => {
                    const h = tHoldings.get(s.ticker);
                    const ex = tData?.excluded?.find((e) => e.ticker === s.ticker);
                    const added = p.addPrices[s.ticker];
                    const last = tData?.last?.[s.ticker];
                    const since = added && last ? (last / added - 1) * 100 : null;
                    return (
                      <li key={s.ticker} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                        <div className="min-w-0 flex-1">
                          <StockLink ticker={s.ticker} className="block truncate text-sm font-semibold text-accent hover:underline">
                            {s.name}
                          </StockLink>
                          <div className="mt-0.5 truncate text-xs text-ink-soft">
                            <span className="font-mono">{s.ticker}</span> · {s.layer}
                          </div>
                          <IndustryChips industries={s.industries} className="mt-1.5" />
                        </div>
                        <div className="flex-none text-right">
                          {h ? (
                            <>
                              <div className={"font-mono text-sm font-semibold " + (h.ret >= 0 ? "text-pos" : "text-danger")}>{pct(h.ret)}</div>
                              <div className="mt-0.5 font-mono text-[11px] text-ink-soft">
                                wt {(h.endWeight * 100).toFixed(1)}% · {h.contribution >= 0 ? "+" : "−"}
                                {Math.abs(h.contribution).toFixed(2)} pts
                              </div>
                            </>
                          ) : ex ? (
                            <div className="max-w-[9rem] text-[11px] leading-snug text-ink-soft">{ex.reason === "late" && ex.from ? `Listed ${new Date(ex.from).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}, not in this period` : "No price data"}</div>
                          ) : (
                            <div className="font-mono text-sm text-ink-soft">{tbt?.status === "error" ? "—" : "…"}</div>
                          )}
                          {since != null && <div className="mt-0.5 font-mono text-[11px] text-ink-soft">{pct(since)} since added</div>}
                        </div>
                        {canEdit && editing && (
                          <button type="button" onClick={() => remove(s.ticker)} aria-label={`Remove ${s.name}`} className="tap-target -mr-1 flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line text-ink-soft hover:border-danger hover:text-danger lg:hidden">
                            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
                              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                )}
                {tbt?.status === "error" && (
                  <p className="text-xs text-ink-soft">
                    Couldn&rsquo;t backtest the basket right now.{" "}
                    <button type="button" onClick={retry} className="font-semibold text-accent underline">
                      Retry
                    </button>
                  </p>
                )}
              </section>
            )}
          </>
        )}

        <p className="text-[11px] leading-relaxed text-ink-soft">
          Backtest: bought on the first day of the period at {weighting === "equal" ? "equal weights" : "weights by market cap (today’s, from our last data update, so slightly flattering to winners)"} and held without rebalancing. Price change only, no dividends, costs or taxes. Stocks listed during the period are left out of it. A tracking and research tool, not investment advice.
          {p.mode === "industry" && (
            <>
              {" "}
              Every listed company on the{" "}
              <Link href={`/sector/${p.id}`} className="text-accent hover:underline">
                {p.name.replace(/ basket$/, "")} map
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </div>
    </div>
  );
}

/** True from the lg breakpoint (1024px) up, where the chart and stock table sit together. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
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
  const inIndustry = useMemo(
    () => universe.filter((s) => s.industries.some((i) => i.slug === industry)).sort((a, b) => a.name.localeCompare(b.name)),
    [universe, industry],
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
      className={"flex flex-col gap-3 " + (bar ? "max-w-4xl" : "rounded-2xl border border-accent/40 bg-panel p-4 lg:border-0 lg:bg-transparent lg:p-0")}
    >
      <div ref={boxRef} className="relative">
        <div className={"flex flex-col gap-2 sm:flex-row " + (bar ? "sm:items-center sm:gap-4" : "lg:flex-col")}>
          {/* In the bar each label sits beside its control, as on the Analysis charts' industry picker. */}
          <label className={"flex min-w-0 gap-1 " + (bar ? "flex-col sm:flex-1 sm:flex-row sm:items-center sm:gap-2" : "flex-col sm:w-1/2 lg:w-full")}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry</span>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setFilter("");
                setOpen(true);
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
          <div className={"flex min-w-0 gap-1 " + (bar ? "flex-col sm:flex-1 sm:flex-row sm:items-center sm:gap-2" : "flex-col sm:w-1/2 lg:w-full")}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Stocks</span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls="add-stock-list"
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
            id="add-stock-list"
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">From your watchlist</span>
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
