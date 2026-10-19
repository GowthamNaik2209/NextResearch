"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import type { BasketStock } from "@/lib/baskets/industry";
import { StockLink } from "@/components/stock/StockLink";
import { BasketChart, defaultSelection, pct, type ChartSelection, type CompareBasket } from "./BasketChart";
import { ReturnCards, picksKey } from "./ReturnCards";
import { IndustryChips } from "./IndustryChips";
import { basketCreateError } from "./NewBasketButton";
import { loadSeries, savedBasketQuery, type Load } from "./series";

// One basket - an industry's (derived from the content) or a saved one - with a Stocks view
// (holdings, weights, each one's return and share of the basket's return) and a Chart view
// (the backtest against the market, its industry index and other industry baskets). The owner
// of a saved basket can rename, reweight, share, delete, and pick and drop stocks.
const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
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
  mode: "industry" | "saved";
  /** Saved basket id, or the industry's slug. */
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
};

export function BasketDetail(p: BasketDetailProps) {
  const router = useRouter();
  const [view, setView] = useState<"stocks" | "chart">("stocks");
  const [range, setRange] = useState<ChartRange>("1Y");
  const [weighting, setWeighting] = useState(p.weighting);
  const [stocks, setStocks] = useState(p.stocks);
  const [name, setName] = useState(p.name);
  const [isPublic, setIsPublic] = useState(p.isPublic);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sort, setSort] = useState<Sort>("contribution");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [loads, setLoads] = useState<Record<string, Load>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the view the URL asked for once on mount
    if (new URLSearchParams(window.location.search).get("view") === "chart") setView("chart");
  }, []);
  const pickView = (v: "stocks" | "chart") => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "chart") url.searchParams.set("view", "chart");
    else url.searchParams.delete("view");
    window.history.replaceState(window.history.state, "", url);
  };

  const tickers = useMemo(() => stocks.map((s) => s.ticker), [stocks]);
  const basketKey = p.mode === "industry" ? `x:sector=${p.id}&w=${weighting}` : `x:${savedBasketQuery(p.id, weighting, tickers)}`;
  const compareKey = p.compareSlug && !(p.mode === "industry" && p.compareSlug === p.id) ? `x:sector=${p.compareSlug}&w=${weighting}` : null;
  // Kept here, above the chart, so the reader's picks outlive weighting, range and view switches.
  const compareIndustries = p.industries.filter((i) => !(p.mode === "industry" && i.slug === p.id));
  const [chartSel, setChartSel] = useState<ChartSelection>(() => defaultSelection(p.indices, compareIndustries, compareKey ? p.compareSlug : null));
  // The stocks switched on in the chart, backtested together as their own basket (same weighting).
  const picked = useMemo(() => stocks.filter((s) => chartSel.picks[s.ticker] != null), [stocks, chartSel.picks]);
  const pickedKey = picksKey(
    picked.map((s) => s.ticker),
    weighting,
  );

  // The basket's own backtest feeds the stock rows (the cards load their lines themselves).
  useEffect(() => {
    if (!tickers.length) return;
    const id = `${basketKey}|${range}`;
    if (loads[id]) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the backtest as loading, then fetches it
    setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
    loadSeries(basketKey, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
  }, [basketKey, range, loads, tickers.length]);

  const at = (key: string) => loads[`${key}|${range}`];
  const bt = at(basketKey);
  const btData = bt?.status === "ok" ? bt.data : null;
  const holdings = new Map((btData?.holdings ?? []).map((h) => [h.ticker, h]));
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
  const rangeLong = RANGES.find((r) => r.id === range)!.long;

  const rows = [...stocks].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const ha = holdings.get(a.ticker);
    const hb = holdings.get(b.ticker);
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
      return (await res.json()) as { items: { ticker: string }[] };
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
    syncItems(await patch({ add: fresh }));
  };
  const remove = async (t: string) => {
    setStocks((s) => s.filter((x) => x.ticker !== t));
    syncItems(await patch({ remove: [t] }));
  };
  const setWeight = async (w: "equal" | "mcap") => {
    setWeighting(w);
    if (p.mode === "saved" && p.isOwner) await patch({ weighting: w });
  };
  const share = async () => {
    if (!isPublic) {
      const res = await patch({ isPublic: true });
      if (!res) return;
      setIsPublic(true);
    }
    const url = `${window.location.origin}/baskets/${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: name, text: `${name}: a stock basket on NextResearch`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNote("Link copied. Anyone with it can view this basket.");
      }
    } catch {
      // Closing the share sheet is not an error.
    }
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
    if (!p.signedIn) return router.push(`/login?next=${encodeURIComponent(here)}`);
    setBusy(true);
    const body = p.mode === "industry" ? { sector: p.id, weighting } : { copyFrom: p.id };
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

  const canEdit = p.mode === "saved" && p.isOwner;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Title + actions */}
      <div className="flex flex-col gap-3">
        {renaming ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = name.trim() || p.name;
              setName(v);
              setRenaming(false);
              await patch({ name: v });
            }}
          >
            <input
              autoFocus
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              aria-label="Basket name"
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 font-display text-xl font-bold text-ink focus:border-accent focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">
              Save
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 break-words font-display text-2xl font-bold text-ink sm:text-3xl">{name}</h1>
            {canEdit && (
              <button type="button" onClick={() => setRenaming(true)} className="text-xs font-semibold text-accent hover:underline">
                Rename
              </button>
            )}
            {p.mode === "saved" && (
              <span className={"rounded-full border px-2 py-0.5 text-[11px] font-semibold " + (isPublic ? "border-accent text-accent" : "border-line text-ink-soft")}>
                {isPublic ? "Shared by link" : "Private"}
              </span>
            )}
          </div>
        )}
        {p.description && <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{p.description}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing} className={"min-h-10 rounded-lg px-4 text-sm font-semibold " + (editing ? "bg-accent text-bg" : "border border-line text-ink hover:border-accent")}>
                {editing ? "Done editing" : "Add or remove stocks"}
              </button>
              <button type="button" onClick={share} disabled={busy} className="min-h-10 rounded-lg border border-line px-4 text-sm text-ink hover:border-accent">
                {isPublic ? "Share link" : "Share"}
              </button>
              {isPublic && (
                <button type="button" onClick={unshare} disabled={busy} className="min-h-10 rounded-lg border border-line px-4 text-sm text-ink-soft hover:border-accent hover:text-ink">
                  Stop sharing
                </button>
              )}
              <button type="button" onClick={destroy} disabled={busy} className="min-h-10 rounded-lg border border-line px-4 text-sm text-ink-soft hover:border-danger hover:text-danger">
                Delete
              </button>
            </>
          ) : (
            <button type="button" onClick={copy} disabled={busy} className="min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
              {p.mode === "industry" ? "Customise this basket" : "Copy to my baskets"}
            </button>
          )}
          {busy && <span className="text-xs text-ink-soft">Saving…</span>}
        </div>
        {note && (
          <p role="status" className="text-xs text-ink-soft">
            {note}
          </p>
        )}
      </div>

      {canEdit && editing && <StockPicker universe={p.universe ?? []} industries={p.industries} watchlist={p.watchlist} have={new Set(tickers)} full={stocks.length >= MAX_STOCKS} onAdd={add} />}

      {/* Return summary */}
      <ReturnCards
        range={range}
        basket={{ key: basketKey, label: `This basket, ${rangeLong}` }}
        picks={pickedKey ? { key: pickedKey, label: `Your ${picked.length} picked stock${picked.length > 1 ? "s" : ""}`, tickers: picked.map((s) => s.ticker), weighting } : null}
        benches={[
          { key: "b:nifty50", label: "Nifty 50" },
          ...(compareKey && p.compareName ? [{ key: compareKey, label: `${p.compareName} basket` }] : []),
          ...(p.indices[0] ? [{ key: `b:${p.indices[0].id}`, label: p.indices[0].name }] : []),
        ]}
      />

      {/* Controls shared by both views */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="View" className="flex gap-1 rounded-full border border-line bg-panel p-1">
          {(["stocks", "chart"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={"min-h-8 rounded-full px-4 text-xs font-semibold transition " + (view === v ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
              {v === "stocks" ? `Stocks (${stocks.length})` : "Chart"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-line bg-panel p-1" role="group" aria-label="Weighting">
            {(["equal", "mcap"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={weighting === w} onClick={() => setWeight(w)} className={"min-h-8 rounded-full px-3 text-xs font-semibold transition " + (weighting === w ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
                {w === "equal" ? "Equal weight" : "Market cap"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-line bg-panel p-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={"min-h-8 min-w-9 rounded-full px-2 text-xs font-semibold transition " + (range === r.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
                {r.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-ink-soft">
          {canEdit ? "This basket is empty. Use “Add or remove stocks” to pick some." : "This basket has no stocks yet."}
        </div>
      ) : view === "chart" ? (
        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
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
      ) : (
        <section aria-label="Stocks in this basket" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-soft">
            <span>
              Return over the past {rangeLong} · <b className="font-semibold">wt</b> its share of the basket now · <b className="font-semibold">pts</b> what it added to the basket&rsquo;s return
            </span>
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
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
            {rows.map((s) => {
              const h = holdings.get(s.ticker);
              const ex = btData?.excluded?.find((e) => e.ticker === s.ticker);
              const added = p.addPrices[s.ticker];
              const last = btData?.last?.[s.ticker];
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
                      <div className="font-mono text-sm text-ink-soft">{bt?.status === "error" ? "—" : "…"}</div>
                    )}
                    {since != null && <div className="mt-0.5 font-mono text-[11px] text-ink-soft">{pct(since)} since added</div>}
                  </div>
                  {canEdit && editing && (
                    <button type="button" onClick={() => remove(s.ticker)} aria-label={`Remove ${s.name}`} className="tap-target -mr-1 flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line text-ink-soft hover:border-danger hover:text-danger">
                      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {bt?.status === "error" && (
            <p className="text-xs text-ink-soft">
              Couldn&rsquo;t backtest the basket right now.{" "}
              <button type="button" onClick={() =>
                  setLoads((m) => {
                    const rest = { ...m };
                    delete rest[`${basketKey}|${range}`];
                    return rest;
                  })
                } className="font-semibold text-accent underline">
                Retry
              </button>
            </p>
          )}
        </section>
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
  );
}

// Pick stocks to add: search every listed company, narrow to one industry (with "add all"), or
// pick from the watchlist.
function StockPicker({
  universe,
  industries,
  watchlist,
  have,
  full,
  onAdd,
}: {
  universe: BasketStock[];
  industries: CompareBasket[];
  watchlist: string[];
  have: Set<string>;
  full: boolean;
  onAdd: (tickers: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const liked = watchlist.filter((t) => !have.has(t)).map((t) => universe.find((s) => s.ticker === t)).filter((s): s is BasketStock => !!s);
  const q = query.trim().toLowerCase();
  const matches = universe.filter((s) => (!industry || s.industries.some((i) => i.slug === industry)) && (!q || s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)));
  const addable = matches.filter((s) => !have.has(s.ticker));
  const shown = q || industry ? matches.slice(0, 60) : [];

  return (
    <section aria-label="Add stocks" className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-panel p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any listed company"
          aria-label="Search companies to add"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
        />
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Filter by industry" className="rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink sm:text-sm">
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i.slug} value={i.slug}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      {full && <p className="text-xs text-ink-soft">This basket is full ({MAX_STOCKS} stocks). Remove one to add another.</p>}

      {liked.length > 0 && !q && !industry && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">From your watchlist</span>
            {liked.length > 1 && (
              <button type="button" disabled={full} onClick={() => onAdd(liked.map((s) => s.ticker))} className="text-xs font-semibold text-accent hover:underline">
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
      {!q && !industry && liked.length === 0 && <p className="text-xs text-ink-soft">Search for a company, or pick an industry to see its listed stocks.</p>}

      {(q || industry) && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              {matches.length} {matches.length === 1 ? "company" : "companies"}
            </span>
            {industry && addable.length > 1 && (
              <button type="button" disabled={full} onClick={() => onAdd(addable.map((s) => s.ticker))} className="text-xs font-semibold text-accent hover:underline">
                Add all {addable.length}
              </button>
            )}
          </div>
          <ul className="mt-1 max-h-80 divide-y divide-line overflow-y-auto">
            {shown.map((s) => {
              const inIt = have.has(s.ticker);
              return (
                <li key={s.ticker} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{s.name}</div>
                    <div className="truncate text-[11px] text-ink-soft">
                      <span className="font-mono">{s.ticker}</span> · {s.industries.length > 1 ? `${s.industries.length} industries` : s.industries[0]?.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={inIt || full}
                    onClick={() => onAdd([s.ticker])}
                    className={"min-h-9 flex-none rounded-full px-3 text-xs font-semibold " + (inIt ? "text-ink-soft" : "border border-accent text-accent hover:bg-accent hover:text-bg")}
                  >
                    {inIt ? "Added" : "+ Add"}
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && <li className="py-2 text-xs text-ink-soft">No listed company matches &ldquo;{query}&rdquo;.</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
