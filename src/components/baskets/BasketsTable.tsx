"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { seriesStats, relativeStats } from "@/lib/baskets/stats";
import { Panel } from "./Panel";
import { loadSeries, savedBasketQuery } from "./series";

// The Baskets page's dense tables: one row per basket with its 1Y return, deepest fall and lead
// over the Nifty 50. Figures load in the browser after the page shows, through the same series
// loader (and keys) the basket pages use, so opening a row reuses the backtest it just ran.
// A shared queue keeps at most a few backtests in flight (an account may keep 50 baskets).

/** A saved basket of the viewer's, as the page hands it over (plain, serializable). */
export type SavedRow = { kind: "saved"; id: string; name: string; isPublic: boolean; weighting: "equal" | "mcap"; tickers: string[]; names: string[] };
/** An industry or policy basket (every listed stock it maps, equal weight). */
export type IndustryRow = { kind: "industry"; slug: string; name: string; category: "sector" | "policy"; count: number };
export type BasketRow = SavedRow | IndustryRow;

type Fig = { ret: number; maxDd: number; vs: number };
type Entry = "loading" | "error" | Fig;

const RANGE = "1Y" as const;
const BENCH = "b:nifty50";
const MAX_INFLIGHT = 4;

const keyOf = (r: BasketRow) => (r.kind === "saved" ? `x:${savedBasketQuery(r.id, `w=${r.weighting}`, r.tickers)}` : `x:sector=${r.slug}&w=equal`);
const hrefOf = (r: BasketRow) => (r.kind === "saved" ? `/baskets/${r.id}` : `/baskets/industry/${r.slug}`);
const countOf = (r: BasketRow) => (r.kind === "saved" ? r.tickers.length : r.count);

// ---- the shared store: figures by series key, the queue, and who is listening ----

const figs = new Map<string, Entry>();
/** Every basket a table on the page lists (with its name), for the summary strip. */
const listed = new Map<string, string>();
const queue: string[] = [];
let inflight = 0;
let bench: "loading" | "error" | { ret: number; points: { t: string; c: number }[] } = "loading";
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

function startBench() {
  if (benchStarted) return;
  benchStarted = true;
  loadSeries(BENCH, RANGE).then((l) => {
    const st = l.status === "ok" ? seriesStats(l.data.points) : null;
    bench = l.status === "ok" && st ? { ret: st.ret, points: l.data.points } : "error";
    emit();
  });
}

function pump() {
  while (inflight < MAX_INFLIGHT && queue.length) {
    const key = queue.shift()!;
    inflight++;
    Promise.all([loadSeries(key, RANGE), loadSeries(BENCH, RANGE)])
      .then(([l, b]) => {
        const st = l.status === "ok" ? seriesStats(l.data.points) : null;
        if (l.status !== "ok" || !st) return figs.set(key, "error");
        // The lead over the Nifty across the basket's own dates (its last close on or before each).
        const rel = b.status === "ok" ? relativeStats(l.data.points, b.data.points) : null;
        const benchRet = rel?.benchRet ?? (typeof bench === "object" ? bench.ret : null);
        figs.set(key, { ret: st.ret, maxDd: st.maxDd, vs: benchRet == null ? NaN : st.ret - benchRet });
      })
      .catch(() => figs.set(key, "error"))
      .finally(() => {
        inflight--;
        emit();
        pump();
      });
  }
}

function request(keys: string[]) {
  startBench();
  for (const k of keys) {
    if (figs.has(k)) continue;
    figs.set(k, "loading");
    queue.push(k);
  }
  pump();
}

// ---- formatting ----

const signed = (v: number, unit: string) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1)}${unit}`;
const tone = (v: number) => (v > 0 ? "text-pos" : v < 0 ? "text-danger" : "text-ink-soft");

function Num({ entry, pick, unit }: { entry: Entry | undefined; pick: (f: Fig) => number; unit: string }) {
  if (!entry || entry === "loading") return <span className="text-ink-soft">…</span>;
  if (entry === "error") return <span className="text-ink-soft">—</span>;
  const v = pick(entry);
  if (!Number.isFinite(v)) return <span className="text-ink-soft">—</span>;
  return <span className={tone(v)}>{signed(v, unit)}</span>;
}

// ---- the table ----

type Sort = "ret" | "dd" | "vs" | "count" | "name";
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

// Columns: name grows; the stock count and max drawdown give way on phones (the count moves into
// the sub-line), so a row fits 375px without sideways scroll.
const GRID = "grid grid-cols-[minmax(0,1fr)_4rem_4.25rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_3rem_4.25rem_4.25rem_4.5rem]";

export function BasketsTable({ rows, sort, onSort, label }: { rows: BasketRow[]; sort: SortState | null; onSort: (s: SortState) => void; label: string }) {
  const keys = useMemo(() => rows.map(keyOf), [rows]);
  // Bumps as figures arrive, so the rows (and a sort by them) re-read the store.
  const v = useSyncExternalStore(subscribe, getVersion, getVersion);

  useEffect(() => {
    rows.forEach((r, i) => listed.set(keys[i], r.name));
    emit();
    request(keys);
    return () => {
      keys.forEach((k) => listed.delete(k));
      emit();
    };
  }, [rows, keys]);

  const sorted = useMemo(() => {
    const items = rows.map((r, i) => ({ r, key: keys[i] }));
    if (!sort) return items;
    const { by, dir } = sort;
    const sign = dir === "desc" ? -1 : 1;
    const num = (key: string, f: (x: Fig) => number) => {
      const e = figs.get(key);
      const v = e && typeof e === "object" ? f(e) : NaN;
      return Number.isFinite(v) ? v : null;
    };
    const val = (x: { r: BasketRow; key: string }) =>
      by === "ret" ? num(x.key, (f) => f.ret) : by === "dd" ? num(x.key, (f) => f.maxDd) : by === "vs" ? num(x.key, (f) => f.vs) : countOf(x.r);
    if (by === "name") return [...items].sort((a, b) => sign * a.r.name.localeCompare(b.r.name));
    // Rows still loading (or without a figure) stay at the bottom either way.
    return [...items].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va == null || vb == null) return va == null && vb == null ? a.r.name.localeCompare(b.r.name) : va == null ? 1 : -1;
      return sign * (va - vb) || a.r.name.localeCompare(b.r.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v: re-sort as figures arrive
  }, [rows, keys, sort, v]);

  const head = (id: Sort, text: string, place: string) => {
    const on = sort?.by === id ? sort : null;
    // What a tap does: sorts by this column, or reverses it when it is already the sort.
    const next: SortState = on ? { by: id, dir: on.dir === "desc" ? "asc" : "desc" } : { by: id, dir: firstDir(id) };
    const name = id === "count" ? "number of stocks" : id === "dd" ? "max drawdown" : text;
    return (
      <button
        type="button"
        onClick={() => onSort(next)}
        aria-pressed={!!on}
        aria-label={on ? `Sorted by ${name}, ${dirWords(on)}. Tap for ${dirWords(next)}` : `Sort by ${name}, ${dirWords(next)}`}
        title={on ? `${dirWords(on)} · tap again for ${dirWords(next)}` : dirWords(next)}
        className={"flex min-h-8 items-center gap-0.5 uppercase tracking-wider hover:text-ink pointer-coarse:min-h-9 " + place + (on ? " text-ink" : "")}
      >
        {text}
        {on && <span aria-hidden>{on.dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    );
  };

  return (
    <div className="text-xs">
      {/* The column headers are the sort controls: tap one to sort by it (numbers high to low, Basket A to Z), again to reverse. */}
      <div className={GRID + " border-b border-line px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-soft"}>
        {head("name", "Basket", "justify-start")}
        {head("count", "#", "hidden justify-end sm:flex")}
        {head("ret", "1Y", "justify-end")}
        {head("dd", "Max DD", "hidden justify-end sm:flex")}
        {head("vs", "vs Nifty", "justify-end")}
      </div>
      <ul aria-label={label}>
        {sorted.map(({ r, key }) => {
          const e = figs.get(key);
          const n = countOf(r);
          const badge =
            r.kind === "saved"
              ? { text: r.isPublic ? "Shared" : "Private", on: r.isPublic }
              : { text: r.category === "policy" ? "Policy" : "Sector", on: r.category === "policy" };
          const sub =
            r.kind === "saved"
              ? [r.weighting === "mcap" ? "Mcap wt" : "Equal wt", r.names.slice(0, 3).join(", ") + (r.names.length > 3 ? ` +${r.names.length - 3}` : "")].filter(Boolean).join(" · ")
              : "Equal weight";
          return (
            <li key={key} className="border-b border-line last:border-b-0">
              <Link href={hrefOf(r)} className={GRID + " min-h-10 px-3 py-1.5 transition hover:bg-panel-2 focus-visible:bg-panel-2"}>
                <span className="flex min-w-0 flex-col">
                  <span title={r.name} className="line-clamp-2 min-w-0 break-words font-semibold leading-snug text-ink">
                    {r.name}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-soft">
                    <span className={"flex-none rounded border px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide " + (badge.on ? "border-accent text-accent" : "border-line text-ink-soft")}>{badge.text}</span>
                    <span className="min-w-0 truncate">
                      <span className="sm:hidden">
                        {n} {n === 1 ? "stock" : "stocks"} ·{" "}
                      </span>
                      {sub}
                    </span>
                  </span>
                </span>
                <span className="hidden text-right font-mono tabular-nums text-ink-soft sm:block">
                  <span className="sr-only">Stocks </span>
                  {n}
                </span>
                <span className="text-right font-mono tabular-nums">
                  <span className="sr-only">1 year </span>
                  <Num entry={e} pick={(f) => f.ret} unit="%" />
                </span>
                <span className="hidden text-right font-mono tabular-nums sm:block">
                  <span className="sr-only">Max drawdown </span>
                  <Num entry={e} pick={(f) => f.maxDd} unit="%" />
                </span>
                <span className="text-right font-mono tabular-nums">
                  <span className="sr-only">Versus Nifty 50 </span>
                  <Num entry={e} pick={(f) => f.vs} unit=" pts" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-3 py-1.5 text-[10px] text-ink-soft">1Y, equal or saved weighting, bought a year ago and held; price only, no dividends or costs.</p>
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
  children,
}: {
  title: string;
  rows: BasketRow[];
  initialSort?: Sort | null;
  tools?: ReactNode;
  children?: ReactNode;
}) {
  const [sort, setSort] = useState<SortState | null>(initialSort && { by: initialSort, dir: firstDir(initialSort) });
  const has = rows.length > 0;
  return (
    <Panel label={title} tools={tools}>
      {has ? <BasketsTable rows={rows} sort={sort} onSort={setSort} label={title} /> : <div className="px-3 py-3 text-xs leading-relaxed text-ink-soft">{children}</div>}
    </Panel>
  );
}

// ---- the summary strip ----

export function BasketsSummary({ mineCount }: { mineCount: number | null }) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(() => startBench(), []);
  const all = [...listed.keys()];
  const done = all.map((k) => figs.get(k)).filter((e): e is Fig => !!e && typeof e === "object" && Number.isFinite(e.vs));
  const pending = all.filter((k) => figs.get(k) === "loading").length;
  const beat = done.filter((f) => f.vs > 0).length;
  let best: { name: string; ret: number } | null = null;
  for (const k of all) {
    const e = figs.get(k);
    if (e && typeof e === "object" && (!best || e.ret > best.ret)) best = { name: listed.get(k) ?? "", ret: e.ret };
  }

  const cell = "flex min-w-0 flex-col gap-0.5 px-3 py-2";
  const head = "truncate text-[10px] font-semibold uppercase tracking-wider text-ink-soft";
  return (
    <dl className="grid grid-cols-2 divide-line rounded-md border border-line bg-panel sm:grid-cols-4 [&>div]:border-line [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0 [&>div:nth-child(even)]:border-l sm:[&>div:nth-child(n+2)]:border-l">
      <div className={cell}>
        <dt className={head}>Nifty 50 · 1Y</dt>
        <dd className="font-mono text-sm font-bold tabular-nums">
          {bench === "loading" ? <span className="text-ink-soft">…</span> : bench === "error" ? <span className="text-ink-soft">—</span> : <span className={tone(bench.ret)}>{signed(bench.ret, "%")}</span>}
        </dd>
      </div>
      <div className={cell}>
        <dt className={head}>Beat the Nifty · 1Y</dt>
        <dd className="font-mono text-sm font-bold tabular-nums text-ink">
          {all.length === 0 ? "—" : `${beat} of ${done.length}`}
          {pending > 0 && <span className="ml-1 font-sans text-[10px] font-normal text-ink-soft">({pending} loading)</span>}
        </dd>
      </div>
      <div className={cell}>
        <dt className={head}>Best 1Y</dt>
        <dd className="flex min-w-0 items-baseline gap-1.5 text-sm">
          {best ? (
            <>
              <span className={"flex-none font-mono font-bold tabular-nums " + tone(best.ret)}>{signed(best.ret, "%")}</span>
              <span className="min-w-0 truncate text-[11px] text-ink-soft">{best.name}</span>
            </>
          ) : (
            <span className="font-mono text-ink-soft">{pending ? "…" : "—"}</span>
          )}
        </dd>
      </div>
      <div className={cell}>
        <dt className={head}>Your baskets</dt>
        <dd className="font-mono text-sm font-bold tabular-nums text-ink">{mineCount == null ? <span className="font-sans text-xs font-normal text-ink-soft">Sign in to save</span> : mineCount}</dd>
      </div>
    </dl>
  );
}
