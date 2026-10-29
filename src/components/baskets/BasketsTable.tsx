"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { basketFigures, seriesStats, type BasketFigures } from "@/lib/baskets/stats";
import { NA, signedPct } from "@/lib/format";
import { signedPts } from "@/lib/baskets/fmt";
import { Panel } from "./Panel";
import { industrySeriesKey, loadSeries, savedBasketQuery } from "./series";
import { heldStrategy, strategyQuery } from "@/lib/baskets/strategy";
import { PROJECTION_DISCLAIMER } from "./projection-view";
import { HeatGrid, HeatLegend, heatScale, type HeatCell } from "@/components/charts/Heatmap";
import type { SectorCategory } from "@/lib/sector-content/core";

// The Baskets page's dense tables: one row per basket with its 1Y return, deepest fall and lead
// over the Nifty 50, and its projected return over the next year in the Bear, Base and Bull cases
// (worked out on the server with the page, docs/PROJECTIONS.md). Figures load in the browser after the page shows, through the same series
// loader (and keys) the basket pages use, so opening a row reuses the backtest it just ran.
// A shared queue keeps at most a few backtests in flight (an account may keep 50 baskets).
// The industry rows' figures can arrive already worked out by the server (`seed`), so the table
// shows them with the page instead of after a dozen backtests in the browser.

/** Next year's projected return, [bear, base, bull] (fractions; null where nothing is projected). */
export type RowProjection = [number | null, number | null, number | null] | null;
/** A saved basket of the viewer's, as the page hands it over (plain, serializable). */
export type SavedRow = { kind: "saved"; id: string; name: string; isPublic: boolean; weighting: "equal" | "mcap" | "custom"; weights?: Record<string, number> | null; tickers: string[]; names: string[]; proj?: RowProjection };
/** An industry or policy basket (every listed stock it maps, equal weight). */
export type IndustryRow = { kind: "industry"; slug: string; name: string; category: SectorCategory; count: number; proj?: RowProjection };
export type BasketRow = SavedRow | IndustryRow;

type Fig = BasketFigures;
/** "empty": a saved basket with no stocks left, which has nothing to backtest (no request is made). */
type Entry = "loading" | "error" | "empty" | Fig;
/** Figures the server already has: by series key, and the Nifty 50's own 1Y return. */
export type TableSeed = { figs: Record<string, Fig>; benchRet: number | null };

const RANGE = "1Y" as const;
const BENCH = "b:nifty50";
const MAX_INFLIGHT = 4;

const keyOf = (r: BasketRow) => (r.kind === "saved" ? `x:${savedBasketQuery(r.id, strategyQuery(heldStrategy(r.weighting, r.weights ?? undefined)), r.tickers)}` : industrySeriesKey(r.slug));
const hrefOf = (r: BasketRow) => (r.kind === "saved" ? `/baskets/${r.id}` : `/baskets/industry/${r.slug}`);
const countOf = (r: BasketRow) => (r.kind === "saved" ? r.tickers.length : r.count);

// ---- the shared store: figures by series key, the queue, and who is listening ----

const figs = new Map<string, Entry>();
/** Every basket a table on the page lists (with its name), for the summary strip. */
const listed = new Map<string, string>();
const queue: string[] = [];
let inflight = 0;
let bench: "loading" | "error" | { ret: number } = "loading";
let benchStarted = false;
let version = 0;
const subs = new Set<() => void>();
const emit = () => {
  version++;
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
const getVersion = () => version;
// The store lives in the browser only, and may already hold figures when a table hydrates (the
// page's loading state ran first). Until hydration is done, render what the server rendered: the
// server's seed, or loading.
const noSub = () => () => {};
const useHydrated = () => useSyncExternalStore(noSub, () => true, () => false);

function startBench() {
  if (benchStarted) return;
  benchStarted = true;
  loadSeries(BENCH, RANGE).then((l) => {
    const st = l.status === "ok" ? seriesStats(l.data.points) : null;
    // The loader's Nifty (the series the basket pages read) replaces the server's figure; a failed
    // load keeps the server's.
    if (l.status === "ok" && st) bench = { ret: st.ret };
    else if (typeof bench !== "object") bench = "error";
    emit();
  });
}

function pump() {
  while (inflight < MAX_INFLIGHT && queue.length) {
    const key = queue.shift()!;
    inflight++;
    Promise.all([loadSeries(key, RANGE), loadSeries(BENCH, RANGE)])
      .then(([l, b]) => {
        const fig = l.status === "ok" ? basketFigures(l.data.points, b.status === "ok" ? b.data.points : null) : null;
        if (fig) figs.set(key, fig);
        // A failed load keeps the server's figure, if there is one.
        else if (typeof figs.get(key) !== "object") figs.set(key, "error");
      })
      .catch(() => figs.set(key, "error"))
      .finally(() => {
        inflight--;
        emit();
        pump();
      });
  }
}

/** Keys already measured in the browser, or queued to be. */
const measured = new Set<string>();

/**
 * Figures the server worked out, into the store, shown at once. Each row is still measured again
 * through the browser's series loader (the same request and cache the basket pages use), and that
 * figure replaces the server's: the price series can differ by the day's latest bar between the
 * page's render and the API's cache, and the row must read exactly as the basket page does.
 */
function seedStore(seed: TableSeed) {
  for (const [k, f] of Object.entries(seed.figs)) {
    const e = figs.get(k);
    if (!e || e === "error" || e === "loading") figs.set(k, f);
  }
  if (seed.benchRet != null && typeof bench !== "object") bench = { ret: seed.benchRet };
}

function request(keys: string[]) {
  startBench();
  for (const k of keys) {
    if (measured.has(k)) continue;
    measured.add(k);
    if (!figs.has(k)) figs.set(k, "loading");
    queue.push(k);
  }
  pump();
}

// ---- formatting ----

const signed = (v: number, unit: string) => (unit === "%" ? signedPct(v) : `${signedPts(v)}${unit}`);
const tone = (v: number) => (Number(v.toFixed(1)) > 0 ? "text-pos" : Number(v.toFixed(1)) < 0 ? "text-danger" : "text-ink-soft");

/** A figure still being worked out: a shimmering bar the width of a number, so the table never looks empty. */
const Pending = () => (
  <span role="img" aria-label="Loading" className="ml-auto inline-block h-3 w-10 animate-pulse rounded bg-line/80 align-middle" />
);

function Num({ entry, pick, unit }: { entry: Entry | undefined; pick: (f: Fig) => number | null; unit: string }) {
  if (!entry || entry === "loading") return <Pending />;
  if (entry === "error" || entry === "empty") return <span className="text-ink-soft">{NA}</span>;
  const v = pick(entry);
  if (v == null || !Number.isFinite(v)) return <span className="text-ink-soft">{NA}</span>;
  return <span className={tone(v)}>{signed(v, unit)}</span>;
}

/** A projected case, %, as worked out on the server (no loading state). */
function CaseNum({ v }: { v: number | null }) {
  if (v == null) return <span className="text-ink-soft">{NA}</span>;
  return <span className={tone(v)}>{signedPct(v)}</span>;
}

// ---- the table ----

type Sort = "ret" | "dd" | "vs" | "count" | "name" | "bear" | "base" | "bull";
const CASES = ["bear", "base", "bull"] as const;
const caseOf = (r: BasketRow, c: (typeof CASES)[number]) => {
  const v = r.proj?.[CASES.indexOf(c)];
  return v != null && Number.isFinite(v) ? v * 100 : null;
};
/** A column and its direction: "desc" puts the highest number first (Basket: Z to A). */
type SortState = { by: Sort; dir: "asc" | "desc" };
// The first tap on a heading: numbers high to low (▼), Basket A to Z (▲). Max DD is a negative
// number, so high to low is the smallest fall first (−5% above −25%), the same "best first" as 1Y
// and vs Nifty; a second tap reverses any column, deepest fall first for Max DD.
const firstDir = (by: Sort): SortState["dir"] => (by === "name" ? "asc" : "desc");
const DIR_WORDS: Partial<Record<Sort, Record<SortState["dir"], string>>> = {
  name: { asc: "A to Z", desc: "Z to A" },
  dd: { desc: "smallest fall first", asc: "deepest fall first" },
};
const dirWords = (s: SortState) => DIR_WORDS[s.by]?.[s.dir] ?? (s.dir === "desc" ? "high to low" : "low to high");
const COL_NAMES: Record<Sort, string> = { name: "Basket", count: "Number of stocks", ret: "1Y return", dd: "Drawdown", vs: "vs Nifty 50", bear: "Next 1Y Bear case", base: "Next 1Y Base case", bull: "Next 1Y Bull case" };
/** The phone's sort menu: each column both ways, the first-tap direction first. */
const PHONE_SORTS: SortState[] = (["ret", "vs", "dd", "base", "bear", "bull", "count", "name"] as Sort[]).flatMap((by) => {
  const d = firstDir(by);
  return [{ by, dir: d }, { by, dir: d === "desc" ? "asc" : "desc" }];
});

// Columns: name grows; the stock count and max drawdown give way on phones (the count moves into
// the sub-line, and the sort menu still sorts by both), so a row fits 360px without sideways scroll.
// The projected cases show from md; below it the sort menu still sorts by them and the sorted case
// joins the sub-line.
const GRID =
  "grid grid-cols-[minmax(0,1fr)_4rem_4.25rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_3rem_4.25rem_4.25rem_4.5rem] md:grid-cols-[minmax(0,1fr)_3rem_4.25rem_4.25rem_4.5rem_4.25rem_4.25rem_4.25rem]";

export function BasketsTable({
  rows,
  sort,
  onSort,
  label,
  seed,
  deferred = false,
}: {
  rows: BasketRow[];
  sort: SortState | null;
  onSort: (s: SortState) => void;
  label: string;
  seed?: TableSeed;
  /** The server is still working the figures out: show the rows loading, fetch nothing yet. */
  deferred?: boolean;
}) {
  const keys = useMemo(() => rows.map(keyOf), [rows]);
  // Saved baskets edited down to no stocks: shown as such, never backtested or counted.
  const empties = useMemo(() => new Set(rows.flatMap((r, i) => (countOf(r) === 0 ? [keys[i]] : []))), [rows, keys]);
  // Bumps as figures arrive, so the rows (and a sort by them) re-read the store.
  const v = useSyncExternalStore(subscribe, getVersion, getVersion);
  // Before the effect below puts the server's figures in the store, read them from the props.
  const hydrated = useHydrated();
  const entryOf = (key: string): Entry | undefined => {
    if (empties.has(key)) return "empty";
    if (!hydrated) return seed?.figs[key];
    const e = figs.get(key);
    return e && e !== "loading" ? e : (seed?.figs[key] ?? e);
  };

  useEffect(() => {
    const live = keys.filter((k) => !empties.has(k));
    rows.forEach((r, i) => !empties.has(keys[i]) && listed.set(keys[i], r.name));
    if (seed) seedStore(seed);
    emit();
    if (!deferred) request(live);
    return () => {
      live.forEach((k) => listed.delete(k));
      emit();
    };
  }, [rows, keys, empties, seed, deferred]);

  const sorted = useMemo(() => {
    const items = rows.map((r, i) => ({ r, key: keys[i] }));
    if (!sort) return items;
    const { by, dir } = sort;
    const sign = dir === "desc" ? -1 : 1;
    const num = (key: string, f: (x: Fig) => number | null) => {
      const e = entryOf(key);
      const v = e && typeof e === "object" ? f(e) : null;
      return v != null && Number.isFinite(v) ? v : null;
    };
    const val = (x: { r: BasketRow; key: string }) =>
      by === "ret" ? num(x.key, (f) => f.ret) : by === "dd" ? num(x.key, (f) => f.maxDd) : by === "vs" ? num(x.key, (f) => f.vs) : by === "bear" || by === "base" || by === "bull" ? caseOf(x.r, by) : countOf(x.r);
    if (by === "name") return [...items].sort((a, b) => sign * a.r.name.localeCompare(b.r.name));
    // Rows still loading (or without a figure) stay at the bottom either way.
    return [...items].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va == null || vb == null) return va == null && vb == null ? a.r.name.localeCompare(b.r.name) : va == null ? 1 : -1;
      return sign * (va - vb) || a.r.name.localeCompare(b.r.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v: re-sort as figures arrive (entryOf reads the store and seed)
  }, [rows, keys, empties, sort, v, seed, hydrated]);

  const head = (id: Sort, text: string, place: string) => {
    const on = sort?.by === id ? sort : null;
    // What a tap does: sorts by this column, or reverses it when it is already the sort.
    const next: SortState = on ? { by: id, dir: on.dir === "desc" ? "asc" : "desc" } : { by: id, dir: firstDir(id) };
    const name = COL_NAMES[id];
    return (
      <div role="columnheader" aria-sort={on ? (on.dir === "asc" ? "ascending" : "descending") : "none"} className={place}>
        <button
          type="button"
          onClick={() => onSort(next)}
          aria-label={on ? `${name}, ${dirWords(on)}. Tap for ${dirWords(next)}` : `Sort by ${name}, ${dirWords(next)}`}
          title={on ? `${dirWords(on)} · tap again for ${dirWords(next)}` : dirWords(next)}
          className={"flex min-h-8 w-full items-center gap-0.5 uppercase tracking-wider hover:text-ink pointer-coarse:min-h-9 " + (id === "name" ? "justify-start" : "justify-end") + (on ? " text-ink" : "")}
        >
          {text}
          {on && <span aria-hidden>{on.dir === "asc" ? "▲" : "▼"}</span>}
        </button>
      </div>
    );
  };

  return (
    <div className="text-xs">
      {/* What the sort is, in words (an arrow alone doesn't say which way a fall sorts). Phones sort
          from a menu, which also reaches the stock count and Max DD columns they don't show. */}
      <div className="flex min-h-9 items-center gap-2 border-b border-line px-3 py-1 text-[11px] text-ink-soft">
        <p aria-live="polite" className="hidden sm:block">
          {sort ? (
            <>
              Sorted by <b className="font-semibold text-ink">{COL_NAMES[sort.by]}</b>, {dirWords(sort)}. Tap a heading to change.
            </>
          ) : (
            "Tap a column heading to sort."
          )}
        </p>
        <label className="flex w-full min-w-0 items-center gap-2 sm:hidden">
          <span className="flex-none">Sort</span>
          <select
            value={sort ? `${sort.by}:${sort.dir}` : ""}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(":") as [Sort, SortState["dir"]];
              if (by) onSort({ by, dir });
            }}
            className="min-h-9 min-w-0 flex-1 rounded border border-line bg-bg px-1.5 text-xs text-ink"
          >
            {!sort && <option value="">Original order</option>}
            {PHONE_SORTS.map((o) => (
              <option key={`${o.by}:${o.dir}`} value={`${o.by}:${o.dir}`}>
                {COL_NAMES[o.by]}: {dirWords(o)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div role="table" aria-label={label}>
        <div role="rowgroup">
          {/* The column headers are the sort controls: tap one to sort by it (numbers high to low, Basket A to Z), again to reverse. */}
          <div role="row" className={GRID + " border-b border-line px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-soft"}>
            {head("name", "Basket", "min-w-0")}
            {head("count", "Stocks", "hidden sm:block")}
            {head("ret", "1Y", "")}
            {head("dd", "Drawdown", "hidden sm:block")}
            {head("vs", "vs Nifty", "")}
            {head("bear", "Bear", "hidden md:block")}
            {head("base", "Base", "hidden md:block")}
            {head("bull", "Bull", "hidden md:block")}
          </div>
        </div>
        <ul role="rowgroup">
          {sorted.map(({ r, key }) => {
            const e = entryOf(key);
            const n = countOf(r);
            const badge =
              r.kind === "saved"
                ? { text: r.isPublic ? "Shared" : "Private", on: r.isPublic }
                : { text: r.category === "policy" ? "Policy" : r.category === "index" ? "Index" : "Sector", on: r.category !== "sector" };
            const stocksWord = `${n} ${n === 1 ? "stock" : "stocks"}`;
            // Sorted by Max DD on a phone, where that column is hidden: the figure joins the sub-line.
            const sortedCase = sort && (sort.by === "bear" || sort.by === "base" || sort.by === "bull") ? sort.by : null;
            const ddNote = (
              <>
                {sort?.by === "dd" && (
                  <span className="block whitespace-nowrap sm:hidden">
                    Max DD <Num entry={e} pick={(f) => f.maxDd} unit="%" />
                  </span>
                )}
              </>
            );
            return (
              // The whole row opens the basket: the name's link stretches over it (::after).
              <li role="row" key={key} id={r.kind === "industry" ? rowId(r.slug) : undefined} className={GRID + " relative min-h-10 scroll-mt-24 border-b border-line px-3 py-1.5 transition last:border-b-0 hover:bg-panel-2 has-[a:focus-visible]:bg-panel-2"}>
                <span role="rowheader" className="flex min-w-0 flex-col">
                  <Link
                    href={hrefOf(r)}
                    title={r.name}
                    className="line-clamp-2 min-w-0 text-balance break-words font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
                  >
                    {r.name}
                  </Link>
                  <span className="flex min-w-0 items-start gap-1.5 text-[11px] leading-4 text-ink-soft">
                    <span className={"flex-none rounded border px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide " + (badge.on ? "border-accent text-accent" : "border-line text-ink-soft")}>{badge.text}</span>
                    {r.kind === "saved" ? (
                      // Wraps to a second line rather than cutting off; the stock count shows only on phones (a column from sm).
                      <span className="min-w-0">
                        <span className="line-clamp-2 break-words">
                          <span className="sm:hidden">{n ? stocksWord : "No stocks"} · </span>
                          {n === 0 && <span className="hidden sm:inline">No stocks · </span>}
                          {r.weighting === "mcap" ? "M-cap weight" : r.weighting === "custom" ? "Custom weights" : "Equal weight"}
                          {r.names.length > 0 && ` · ${r.names.slice(0, 3).join(", ")}${r.names.length > 3 ? ` +${r.names.length - 3}` : ""}`}
                        </span>
                        {ddNote}
                      </span>
                    ) : (
                      // Every industry basket is equal weight (the section says so), so a phone shows just the count.
                      <span className="min-w-0">
                        <span className="sm:hidden">{stocksWord}</span>
                        {ddNote}
                        <span className="hidden sm:inline">Equal weight</span>
                      </span>
                    )}
                  </span>
                  {/* Sorted by a projected case below md, where those columns are hidden: the three show under the name. */}
                  {sortedCase && (
                    <span className="text-[11px] leading-4 text-ink-soft md:hidden">
                      {CASES.map((c, i) => (
                        <span key={c}>
                          {i > 0 && " · "}
                          <span className={"whitespace-nowrap " + (c === sortedCase ? "font-semibold text-ink" : "")}>
                            {c === "bear" ? "Bear" : c === "base" ? "Base" : "Bull"} <CaseNum v={caseOf(r, c)} />
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span role="cell" className="hidden text-right font-mono tabular-nums text-ink-soft sm:block">
                  <span className="sr-only">Stocks </span>
                  {n}
                </span>
                <span role="cell" className="text-right font-mono tabular-nums">
                  <span className="sr-only">1 year </span>
                  <Num entry={e} pick={(f) => f.ret} unit="%" />
                </span>
                <span role="cell" className="hidden text-right font-mono tabular-nums sm:block">
                  <span className="sr-only">Max drawdown </span>
                  <Num entry={e} pick={(f) => f.maxDd} unit="%" />
                </span>
                <span role="cell" title={e && typeof e === "object" && e.vs == null ? "The Nifty 50's prices couldn't load, so the lead can't be worked out" : undefined} className="text-right font-mono tabular-nums">
                  <span className="sr-only">Versus Nifty 50 </span>
                  <Num entry={e} pick={(f) => f.vs} unit=" pts" />
                </span>
                {CASES.map((c) => (
                  <span key={c} role="cell" className="hidden text-right font-mono tabular-nums md:block">
                    <span className="sr-only">Next 1 year {c} case </span>
                    <CaseNum v={caseOf(r, c)} />
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="border-t border-line px-3 py-1.5 text-[10px] text-ink-soft">
        1Y: past year, bought a year ago and not rebalanced, at each basket&rsquo;s saved weighting (industry baskets at equal weight). Price only, no dividends or costs.{" "}
        <b className="font-semibold">Bear · Base · Bull</b>: projected return over the next year at the same weighting (stocks it can&rsquo;t project left out, their share spread over the rest);{" "}
        <Link href="/baskets/projections" className="underline hover:text-ink">
          how projections work
        </Link>
        . {PROJECTION_DISCLAIMER}
      </p>
    </div>
  );
}

/**
 * A table in its panel. The page's section heading names it (the title is the panel's accessible
 * name); the column headers sort. With no
 * rows it shows its children instead (sign-in prompt, an error, the empty state).
 */
export function BasketsPanel({
  title,
  rows,
  initialSort = null,
  tools,
  seed,
  deferred,
  children,
}: {
  title: string;
  rows: BasketRow[];
  initialSort?: Sort | null;
  tools?: ReactNode;
  /** Figures the server already worked out (the industry rows). */
  seed?: TableSeed;
  /** The server is still working them out (the page's loading state). */
  deferred?: boolean;
  children?: ReactNode;
}) {
  const [sort, setSort] = useState<SortState | null>(initialSort && { by: initialSort, dir: firstDir(initialSort) });
  const has = rows.length > 0;
  return (
    <Panel label={title} tools={tools}>
      {has ? <BasketsTable rows={rows} sort={sort} onSort={setSort} label={title} seed={seed} deferred={deferred} /> : <div className="px-3 py-3 text-xs leading-relaxed text-ink-soft">{children}</div>}
    </Panel>
  );
}

// ---- the theme wall ----

const rowId = (slug: string) => `basket-row-${slug}`;
/** A tile's name: the part before any bracket, slash or "&" ("Data Center / AI Infrastructure" is "Data Center"). */
const shortName = (name: string) => name.split(/ \(| \/ | & | \+ /)[0];
const FLASH = ["bg-accent/15", "ring-2", "ring-inset", "ring-accent"];

/** Scrolls the industry table to a basket's row and lights it up for a moment. */
function jumpToRow(slug: string) {
  // The visible row: a streamed page can briefly keep a hidden copy of the table with the same ids.
  const el = [...document.querySelectorAll<HTMLElement>(`[id="${rowId(slug)}"]`)].find((x) => x.offsetParent);
  if (!el) return;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  el.classList.add(...FLASH);
  window.setTimeout(() => el.classList.remove(...FLASH), 1800);
}

/**
 * Every industry and policy basket as a tile, best 1Y return first, green to red. It reads the
 * same figures as the table under it (the server's seed, then the browser's own backtests), so a
 * tile and its row always agree; tapping a tile scrolls to that row.
 */
export function ThemeWall({ rows, seed }: { rows: IndustryRow[]; seed?: TableSeed }) {
  const v = useSyncExternalStore(subscribe, getVersion, getVersion);
  const hydrated = useHydrated();
  const cells = useMemo(() => {
    const retOf = (slug: string) => {
      const key = industrySeriesKey(slug);
      const e = hydrated ? (typeof figs.get(key) === "object" ? figs.get(key) : seed?.figs[key]) : seed?.figs[key];
      return e && typeof e === "object" && Number.isFinite(e.ret) ? e.ret : null;
    };
    return rows
      .filter((r) => r.count > 0)
      .map((r): HeatCell => {
        const ret = retOf(r.slug);
        return {
          key: r.slug,
          label: shortName(r.name),
          value: ret,
          sub: r.category === "policy" ? "Policy" : r.category === "index" ? "Index" : undefined,
          title: `${r.name}${ret != null ? `: ${ret >= 0 ? "+" : ""}${ret.toFixed(1)}% over the past year` : ""} · tap to see its row`,
          onClick: () => jumpToRow(r.slug),
        };
      })
      .sort((a, b) => (a.value == null ? 1 : b.value == null ? -1 : b.value - a.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v: re-read the store as figures arrive
  }, [rows, seed, hydrated, v]);
  const scale = heatScale(cells.map((c) => c.value));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-panel p-2 sm:p-3">
      <HeatGrid
        cells={cells}
        scale={scale}
        label="Industry and policy baskets by 1Y return"
        className="grid grid-cols-3 auto-rows-[3.25rem] gap-1 min-[480px]:grid-cols-4 sm:auto-rows-[3.5rem] md:grid-cols-6 lg:grid-cols-8"
      />
      <HeatLegend scale={scale} note="1Y return at equal weight, best first · tap a tile for its row below" />
    </div>
  );
}

// ---- the summary strip ----

/** A table row's key says which table it is in: a saved basket's backtest goes by id=, an industry's by sector=. */
const isSavedKey = (k: string) => k.startsWith("x:id=");

/**
 * One strip above both tables (your baskets, then industry & policy baskets) that counts across
 * them, and says so: the rule-based baskets aren't counted. Every tile keeps one height whatever
 * it shows (loading, a figure, a two-line name), so nothing below moves as the figures arrive.
 */
export function BasketsSummary({ mineCount, benchRet = null }: { mineCount: number | null; /** The Nifty's 1Y return the server measured the rows against. */ benchRet?: number | null }) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(() => startBench(), []);
  const hydrated = useHydrated();
  const all = hydrated ? [...listed.keys()] : [];
  const fig = (k: string) => {
    const e = figs.get(k);
    return e && typeof e === "object" ? e : null;
  };
  const withVs = (keys: string[]) => keys.map(fig).filter((f): f is Fig => !!f && f.vs != null && Number.isFinite(f.vs));
  const mineKeys = all.filter(isSavedKey);
  const indKeys = all.filter((k) => !isSavedKey(k));
  const done = withVs(all);
  const beat = (fs: Fig[]) => fs.filter((f) => (f.vs ?? 0) > 0).length;
  // Rows not yet asked for (the server is still working on them) count as loading too.
  const pending = all.filter((k) => !figs.has(k) || figs.get(k) === "loading").length;
  const nifty = hydrated && typeof bench === "object" ? bench : benchRet != null ? { ret: benchRet } : hydrated ? bench : "loading";
  let best: { name: string; ret: number; mine: boolean } | null = null;
  for (const k of all) {
    const e = fig(k);
    if (e && (!best || e.ret > best.ret)) best = { name: listed.get(k) ?? "", ret: e.ret, mine: isSavedKey(k) };
  }
  const mineDone = withVs(mineKeys);
  const indDone = withVs(indKeys);

  const cell = "flex min-w-0 flex-col gap-0.5 px-3 py-2";
  const head = "truncate text-[10px] font-semibold uppercase tracking-wider text-ink-soft";
  // One line for the figure and two for the words under it, in every tile and every state.
  const value = "flex h-5 items-center font-mono text-sm font-bold tabular-nums";
  const sub = "line-clamp-2 h-7 break-words text-[11px] leading-[0.875rem] text-ink-soft";
  return (
    <div className="flex flex-col gap-1">
      <dl
        aria-label="Your and industry baskets at a glance"
        className="grid grid-cols-2 divide-line rounded-md border border-line bg-panel sm:grid-cols-4 [&>div]:border-line [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0 [&>div:nth-child(even)]:border-l sm:[&>div:nth-child(n+2)]:border-l"
      >
        <div className={cell}>
          <dt className={head}>Nifty 50 · 1Y</dt>
          <dd className={value}>
            {nifty === "loading" ? <Pending /> : nifty === "error" ? <span className="text-ink-soft">{NA}</span> : <span className={tone(nifty.ret)}>{signed(nifty.ret, "%")}</span>}
          </dd>
          {/* Said plainly, so the dashes in "vs Nifty" read as a missing benchmark, not a broken table. */}
          <dd className={sub}>{nifty === "error" ? "Couldn’t load right now" : "The benchmark every basket is measured against"}</dd>
        </div>
        <div className={cell}>
          <dt className={head}>Ahead of Nifty · 1Y</dt>
          <dd className={value + " text-ink"}>
            {nifty === "error" && done.length === 0 ? <span className="text-ink-soft">{NA}</span> : all.length === 0 ? hydrated ? NA : <Pending /> : `${beat(done)} of ${done.length}`}
          </dd>
          <dd className={sub}>
            {nifty === "error" && done.length === 0
              ? "Needs the Nifty 50, which couldn’t load"
              : pending > 0
                ? `Your and industry baskets · ${pending} loading`
                : all.length
                  ? `Yours ${beat(mineDone)} of ${mineDone.length} · industry & policy ${beat(indDone)} of ${indDone.length}`
                  : "Your and industry baskets"}
          </dd>
        </div>
        <div className={cell}>
          <dt className={head}>Best basket · 1Y</dt>
          <dd className={value}>{best ? <span className={tone(best.ret)}>{signed(best.ret, "%")}</span> : pending || !hydrated ? <Pending /> : <span className="text-ink-soft">{NA}</span>}</dd>
          {/* Under the figure, wrapping to two lines, so a long basket name isn't cut off in a half-width tile. */}
          <dd title={best?.name} className={sub + " text-balance"}>
            {best ? `${best.name}${best.mine ? " (yours)" : ""}` : "Of your and industry baskets"}
          </dd>
        </div>
        <div className={cell}>
          <dt className={head}>Your baskets</dt>
          <dd className={value + " text-ink"}>{mineCount == null ? <span className="text-ink-soft">{NA}</span> : mineCount}</dd>
          <dd className={sub}>{mineCount == null ? "Sign in to save your own" : mineCount === 1 ? "Saved basket" : "Saved baskets"}</dd>
        </div>
      </dl>
      <p className="text-[10px] text-ink-soft sm:text-[11px]">
        1Y: past year, bought a year ago and not rebalanced. Counts your baskets and the industry &amp; policy baskets below, not the rule-based baskets above.
      </p>
    </div>
  );
}
