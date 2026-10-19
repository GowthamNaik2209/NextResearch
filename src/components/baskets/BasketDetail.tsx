"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  // Desktop shows the chart and the stock table together; phones switch between them.
  const wide = useWide();
  const showChart = wide || view === "chart";
  const showTable = wide || view === "stocks";
  const seg = (on: boolean) => "min-h-9 rounded-full px-2.5 text-[11px] font-semibold transition sm:text-xs lg:min-h-8 " + (on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink");
  const retry = () =>
    setLoads((m) => {
      const rest = { ...m };
      delete rest[`${basketKey}|${range}`];
      return rest;
    });

  const weightingControl = (
    <div className="inline-flex rounded-full border border-line bg-panel p-0.5" role="group" aria-label="Weighting">
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
    <div className="inline-flex rounded-full border border-line bg-panel p-0.5" role="group" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={seg(range === r.id) + " min-w-9 px-2 lg:min-w-8"}>
          {r.id}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Control rail: everything that changes the basket or how it's measured. Phones get it as
          three compact rows on top; from lg it is a column beside the results that stays in view. */}
      <aside aria-label="Basket controls" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-line lg:bg-panel lg:p-4">
        {/* Row 1: name, sharing state, more actions */}
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
              <h1 className="min-w-0 break-words font-display text-xl font-bold leading-tight text-ink lg:text-2xl">{name}</h1>
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
        {p.description && <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft lg:line-clamp-none">{p.description}</p>}

        {/* Row 2: the main actions, plus the phone's Stocks / Chart switch */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing} className={"min-h-9 rounded-lg px-3 text-xs font-semibold lg:hidden " + (editing ? "bg-accent text-bg" : "border border-line text-ink hover:border-accent")}>
                {editing ? "Done" : "Add stocks"}
              </button>
              <button type="button" onClick={share} disabled={busy} className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:border-accent">
                {isPublic ? "Copy link" : "Share"}
              </button>
            </>
          ) : (
            <button type="button" onClick={copy} disabled={busy} className="min-h-9 rounded-lg bg-accent px-3 text-xs font-semibold text-bg hover:opacity-90 lg:w-full lg:text-sm">
              {busy ? "Creating…" : p.mode === "industry" ? "Customise this basket" : "Copy to my baskets"}
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
          <p role="status" className={"text-xs text-ink-soft " + (canEdit ? "min-h-4" : "")}>
            {busy && canEdit ? "Saving…" : note}
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

        {canEdit && (
          <div className={editing ? "" : "hidden lg:block"}>
            <StockPicker universe={p.universe ?? []} industries={p.industries} initialIndustry={p.compareSlug} watchlist={p.watchlist} have={new Set(tickers)} full={stocks.length >= MAX_STOCKS} onAdd={add} />
          </div>
        )}

        {/* In this basket: the holdings at a glance (desktop only; phones have the Stocks view) */}
        {stocks.length > 0 && (
          <section aria-label="In this basket" className="hidden flex-col gap-1 lg:flex">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">In this basket ({stocks.length})</span>
            <ul className="divide-y divide-line">
              {[...stocks]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => {
                  const h = holdings.get(s.ticker);
                  return (
                    <li key={s.ticker} className="flex items-center gap-2 py-1.5">
                      <StockLink ticker={s.ticker} className="min-w-0 flex-1 truncate text-xs text-ink hover:text-accent hover:underline">
                        {s.name}
                      </StockLink>
                      <span className={"flex-none font-mono text-[11px] " + (!h ? "text-ink-soft" : h.ret >= 0 ? "text-pos" : "text-danger")}>{h ? pct(h.ret) : "—"}</span>
                      {canEdit && (
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
        <ReturnCards
          range={range}
          basket={{ key: basketKey, label: `This basket, ${rangeLong}` }}
          picks={pickedKey ? { key: pickedKey, label: `Your ${picked.length} picked stock${picked.length > 1 ? "s" : ""}`, tickers: picked.map((s) => s.ticker), weighting } : null}
          benches={NIFTY_ONLY}
        />

        {stocks.length === 0 ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-ink-soft">
            {canEdit ? (
              <>
                This basket is empty. <span className="lg:hidden">Tap &ldquo;Add stocks&rdquo; to pick some.</span>
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
                  <span>
                    <span className="hidden font-semibold text-ink lg:inline">Stock by stock · </span>
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
                {bt?.status === "error" && (
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
  universe,
  industries,
  initialIndustry,
  watchlist,
  have,
  full,
  onAdd,
}: {
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
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
  const liked = watchlist.filter((t) => !have.has(t)).map((t) => universe.find((s) => s.ticker === t)).filter((s): s is BasketStock => !!s);

  return (
    <section aria-label="Add stocks" className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-panel p-4 lg:border-0 lg:bg-transparent lg:p-0">
      <div ref={boxRef} className="relative">
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <label className="flex min-w-0 flex-col gap-1 sm:w-1/2 lg:w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry</span>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setFilter("");
                setOpen(true);
              }}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink sm:text-sm"
            >
              {industries.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-w-0 flex-col gap-1 sm:w-1/2 lg:w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Stocks</span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls="add-stock-list"
              aria-label={`${industryName} stocks: ${inIndustry.length} listed${added > 0 ? `, ${added} in this basket` : ""}`}
              className={"flex min-h-[42px] items-center justify-between gap-2 rounded-lg border bg-bg px-3 py-2 text-left text-base text-ink sm:text-sm " + (open ? "border-accent" : "border-line")}
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
          <div id="add-stock-list" className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-line bg-panel p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] lg:static lg:mt-2 lg:bg-bg lg:shadow-none">
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
                      <div className="truncate text-sm text-ink">{s.name}</div>
                      <div className="truncate text-[11px] text-ink-soft">
                        <span className="font-mono">{s.ticker}</span> · {s.layer}
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
    </section>
  );
}
