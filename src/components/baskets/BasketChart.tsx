"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import type { BasketCaseReturns } from "@/lib/baskets/projection-data";
import { SCENARIOS } from "@/lib/baskets/projection";
import { stockPath, type ProjectionSettings } from "@/lib/baskets/projection-basket";
import { StockLink } from "@/components/stock/StockLink";
import { ZOOM_OPTIONS, ZoomControls, useChartZoom } from "@/components/charts/ChartZoom";
import { onSharedGrid, sharedInterval } from "@/lib/live/ohlc-format";
import { DASHARRAY, SLOTS, STYLE, type Dash } from "@/components/charts/palette";
import { MenuButton, Switch } from "@/components/charts/controls";
import { tickLabel } from "@/components/charts/ticks";
import { cssVar, useSiteTheme, type SiteTheme } from "@/lib/theme";
import { axisPct, fmtDay, fmtMonth, NA, signedPct } from "@/lib/format";
import { slackDaysFor } from "@/lib/baskets/backtest";
import { useSeries } from "./use-series";
import { LINES_FULL, MAX_CHART_STOCKS, type ChartSelection } from "@/lib/baskets/selection";

export { MAX_CHART_STOCKS, type ChartSelection };

// A basket's backtest beside the market, its industry's index and other industry baskets, on the
// Analysis charts' conventions: every line starts at 0% on the first day shown, benchmarks are
// drawn in ink, stocks in the categorical palette. The basket itself is the thick accent line.
export type CompareBasket = {
  slug: string;
  name: string;
  icon: string;
  /** Its projected return at each weighting, for every horizon, case and exit (docs/PROJECTIONS.md). */
  proj?: Record<"equal" | "mcap", BasketCaseReturns>;
};

// A stock's line: one of six palette colours (slot 6 is kept for the compared industry baskets),
// solid first, then long-dashed, then dotted, so 18 stocks can be told apart.
const STOCK_DASH: Dash[] = ["solid", "long", "dot"];
export function stockLine(theme: SiteTheme, slot: number): { color: string; dash: Dash } {
  return { color: SLOTS[theme][slot % 6], dash: STOCK_DASH[Math.floor(slot / 6) % STOCK_DASH.length] };
}
const MAX_COMPARE = 3;
/** The legend box's tallest (14rem, about five rows); past that it scrolls. */
const LEGEND_MAX = 224;
/** A stock's legend row (name and ticker lines), the legend's spare row. */
const LEGEND_STOCK_ROW = 52;
const COMPARE_DASH: Dash[] = ["long", "dash", "dot"];

type Line = { key: string; name: string; note?: string; color: string; token?: string; width: 2 | 3; dash: Dash; stock?: string };

/** The first view: the Nifty 50 and the industry index, plus the default comparison basket if there is one. */
export function defaultSelection(indices: Benchmark[], industries: CompareBasket[], defaultCompare: string | null): ChartSelection {
  return {
    benches: ["nifty50", ...(indices[0] ? [indices[0].id] : [])],
    compare: defaultCompare && industries.some((i) => i.slug === defaultCompare) ? [defaultCompare] : [],
    picks: {},
  };
}

/** The chart in Projections mode (docs/PROJECTIONS.md): every line from 0% today, one point a week. */
export type ChartProjection = {
  /** "next 1 year". */
  label: string;
  settings: ProjectionSettings;
  /** Compared industry baskets' weighting (equal when this basket is custom). */
  compareWeighting: "equal" | "mcap";
  dates: string[];
  /** % from today per date, by line key: the basket and each projected stock ("s:TICKER"). */
  values: Record<string, number[]>;
  /** Why a stock's line isn't projected, by line key ("Left out: 2 years of results (needs 3)"). */
  why: Record<string, string>;
  /** The basket's likely range (8 in 10 simulated paths), % per date; null while it can't be worked out. */
  band: { lo: number[]; hi: number[] } | null;
};
const LO = "p:lo";
const HI = "p:hi";

// The selection is held by the page, not here, so switching strategy, range or the Stocks/Chart
// view never puts the reader's picks back to the defaults.
export function BasketChart({
  range,
  rangeLong,
  basketKey,
  basketName,
  strategy,
  held = null,
  industries,
  indices,
  market,
  stocks,
  selection,
  onSelection,
  onToggleStock,
  onPickAll,
  onPickNone,
  projection = null,
}: {
  range: ChartRange;
  rangeLong: string;
  /** Series key of the basket itself ("x:<query>"). */
  basketKey: string;
  basketName: string;
  /** The strategy's query ("w=equal", see strategy.ts): compared industry baskets run the same one. */
  strategy: string;
  /** The same basket bought and held, drawn beside a rebalanced one for comparison. */
  held?: { key: string; name: string } | null;
  /** Industry baskets it can be compared with (its own industry excluded by the caller if it is one). */
  industries: CompareBasket[];
  /** Its industry's index(es), then the broad market. */
  indices: Benchmark[];
  market: Benchmark[];
  stocks: { ticker: string; name: string }[];
  selection: ChartSelection;
  onSelection: Dispatch<SetStateAction<ChartSelection>>;
  /** A stock's line on or off. The page's selection does it (the stock table's line ticks do the
   * same), so the two always agree and the line limit is kept in one place. */
  onToggleStock: (ticker: string) => void;
  /** Every stock's line on, up to the line limit. */
  onPickAll: () => void;
  /** Every stock's line off; the basket, benchmarks and compared baskets stay. */
  onPickNone: () => void;
  /** Set when Projections is on: the chart runs from today instead of over the past range. */
  projection?: ChartProjection | null;
}) {
  const { benches, compare, picks } = selection;
  const setBenches = (f: (b: string[]) => string[]) => onSelection((s) => ({ ...s, benches: f(s.benches) }));
  const setCompare = (f: (c: string[]) => string[]) => onSelection((s) => ({ ...s, compare: f(s.compare) }));
  const [menu, setMenu] = useState<"compare" | "stocks" | null>(null);
  const [menuLeft, setMenuLeft] = useState(0);
  const [hover, setHover] = useState<{ t: string; values: Record<string, number> } | null>(null);
  const theme = useSiteTheme();
  const [query, setQuery] = useState("");
  // The menu lists the stocks in the order the page passes (the stock table's sort), as they were
  // when it opened: fixed while it is open, so a row never jumps under a tap.
  const [frozen, setFrozen] = useState<string[] | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef(new Map<string, ISeriesApi<"Line">>());
  const zeroRef = useRef<ISeriesApi<"Line"> | null>(null);

  const toggleMenu = (name: "compare" | "stocks", btn: HTMLButtonElement) => {
    const row = menusRef.current;
    setMenuLeft(row && window.innerWidth >= 640 ? Math.max(0, Math.min(btn.offsetLeft, row.clientWidth - 384)) : 0);
    if (name === "stocks" && menu !== "stocks") setFrozen(stocks.map((s) => s.ticker));
    setMenu((m) => (m === name ? null : name));
  };
  useEffect(() => {
    if (menu) popRef.current?.scrollIntoView({ block: "nearest" });
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!menusRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  const lines: Line[] = useMemo(() => {
    const out: Line[] = [{ key: basketKey, name: basketName, note: "this basket", color: "var(--accent)", token: "--accent", width: 3, dash: "solid" }];
    // Projections: the basket's likely range in its place, and no unrebalanced line (a projection is held).
    if (projection?.band) {
      out.push({ key: HI, name: "Likely range, top", note: "8 in 10 simulated paths are between top and bottom", color: "var(--accent)", token: "--accent", width: 2, dash: "dot" });
      out.push({ key: LO, name: "Likely range, bottom", note: "1 in 10 are below the bottom, 1 in 10 above the top", color: "var(--accent)", token: "--accent", width: 2, dash: "dot" });
    }
    if (held && !projection) out.push({ key: held.key, name: held.name, note: "same stocks, no rebalancing", color: "var(--accent)", token: "--accent", width: 2, dash: "dot" });
    compare.forEach((slug, i) => {
      const b = industries.find((x) => x.slug === slug);
      if (b) out.push({ key: `x:sector=${slug}&${strategy}`, name: `${b.name} basket`, note: "industry basket", color: SLOTS[theme][6], width: 2, dash: COMPARE_DASH[i % 3] });
    });
    indices.forEach((b, i) => {
      if (benches.includes(b.id)) out.push({ key: `b:${b.id}`, name: b.name, note: b.via ? "via ETF" : undefined, color: "var(--ink)", token: "--ink", width: 2, dash: i === 0 ? "solid" : "long" });
    });
    market.forEach((b) => {
      if (benches.includes(b.id)) out.push({ key: `b:${b.id}`, name: b.name, color: "var(--ink-soft)", token: "--ink-soft", width: 2, dash: b.id === "sensex" ? "dot" : "dash" });
    });
    for (const st of stocks) {
      const slot = picks[st.ticker];
      if (slot != null) out.push({ key: `s:${st.ticker}`, name: st.name, note: st.ticker, ...stockLine(theme, slot), width: 2, stock: st.ticker });
    }
    return out;
  }, [basketKey, basketName, held, compare, industries, strategy, indices, market, benches, stocks, picks, theme, projection]);

  // Projections draw from the page's figures: nothing to load.
  const { get: loadOf, retry } = useSeries(projection ? [] : lines.map((l) => l.key), range);

  // Projections: each line's % from today per week, or why it has none (an index, a left-out stock).
  const projected = useMemo(() => {
    if (!projection) return null;
    const steps = projection.dates.length - 1;
    const { h, scenario, exit } = projection.settings;
    const values = new Map<string, number[]>();
    const why = new Map<string, string>();
    for (const l of lines) {
      if (l.key === LO || l.key === HI) {
        if (projection.band) values.set(l.key, l.key === LO ? projection.band.lo : projection.band.hi);
        continue;
      }
      const own = projection.values[l.key];
      if (own) {
        values.set(l.key, own);
        continue;
      }
      if (l.key.startsWith("x:sector=")) {
        const slug = decodeURIComponent(l.key.slice(9).split("&")[0]);
        const r = industries.find((b) => b.slug === slug)?.proj?.[projection.compareWeighting]?.[exit]?.[`${h}`]?.[SCENARIOS.indexOf(scenario)];
        if (r != null) values.set(l.key, stockPath(r, steps));
        else why.set(l.key, "no stock in it has 3 years of results");
        continue;
      }
      why.set(l.key, projection.why[l.key] ?? (l.key.startsWith("b:") ? "not projected: we don’t forecast indices" : "not projected"));
    }
    return { values, why };
  }, [projection, lines, industries]);

  const series = useMemo(() => {
    if (projection && projected) {
      const dates = projection.dates;
      const list = lines.flatMap((line) => {
        const v = projected.values.get(line.key);
        if (!v || v.length !== dates.length) return [];
        const values = dates.map((t, k) => ({ time: t as Time, value: v[k] }));
        return [{ line, values, last: values[values.length - 1].value, late: null as string | null }];
      });
      const home = dates.length > 1 && list.length ? { from: 0, to: dates.length - 1 } : null;
      return { start: dates[0] ?? null, end: dates[dates.length - 1] ?? null, list, home, step: "1wk" as const, short: new Map<string, string>() };
    }
    const ok = lines.flatMap((l) => {
      const ld = loadOf(l.key);
      return ld?.status === "ok" && ld.data.points.length > 1 ? [{ line: l, points: ld.data.points }] : [];
    });
    const start = ok.reduce<string | null>((m, s) => (!m || s.points[0].t < m ? s.points[0].t : m), null);
    const slackDays = slackDaysFor(range);
    // One date grid for every line, so a daily line beside weekly ones can't stretch the axis.
    const grid = onSharedGrid(ok.map((s) => s.points));
    const step = sharedInterval(ok.map((s) => s.points));
    const all = ok.map(({ line }, i) => {
      const points = grid[i];
      const base = points[0].c;
      const values = points.map((p) => ({ time: p.t as Time, value: (p.c / base - 1) * 100 }));
      const late = start && Date.parse(points[0].t) - Date.parse(start) > slackDays * 86_400_000 ? points[0].t : null;
      return { line, values, last: values[values.length - 1].value, late };
    });
    // An index that begins mid-chart would start at 0% beside lines already well up or down, so it
    // is left off and its row says why (as on the Analysis charts). Stocks and baskets are drawn.
    const isShort = (s: (typeof all)[number]) => !!s.late && s.line.key.startsWith("b:");
    const list = all.filter((s) => !isShort(s));
    const drawnStart = list.reduce<string | null>((m, s) => (!m || (s.values[0].time as string) < m ? (s.values[0].time as string) : m), null);
    const drawnEnd = list.reduce<string | null>((m, s) => {
      const t = s.values[s.values.length - 1].time as string;
      return !m || t > m ? t : m;
    }, null);
    // The full view in bar positions: every date any drawn line has.
    const count = new Set(list.flatMap((s) => s.values.map((v) => v.time as string))).size;
    const home = count > 1 ? { from: 0, to: count - 1 } : null;
    return { start: drawnStart, end: drawnEnd, list, home, step, short: new Map(all.filter(isShort).map((s) => [s.line.key, s.late!])) };
  }, [lines, loadOf, range, projection, projected]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const map = seriesRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--ink-soft", "#888"), fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVar("--grid", "#ddd") } },
      // entireTextOnly: no half-cut "+400%" at the top or bottom edge; the label goes when it can't fit.
      rightPriceScale: { borderVisible: false, entireTextOnly: true },
      timeScale: { borderVisible: false, timeVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true, tickMarkFormatter: tickLabel },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter: (v: number) => axisPct(v) },
      ...ZOOM_OPTIONS,
    });
    chartRef.current = chart;
    zeroRef.current = chart.addSeries(LineSeries, { lineWidth: 1, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.subscribeCrosshairMove((p) => {
      if (!p.time) return setHover(null);
      const values: Record<string, number> = {};
      for (const [key, s] of map) {
        const v = p.seriesData.get(s) as { value?: number } | undefined;
        if (v?.value != null) values[key] = v.value;
      }
      setHover({ t: String(p.time), values });
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      zeroRef.current = null;
      map.clear();
    };
  }, []);

  const zoom = useChartZoom(chartRef, boxRef, series.home);

  useEffect(() => {
    const chart = chartRef.current;
    const map = seriesRef.current;
    if (!chart) return;
    const want = new Set(series.list.map((s) => s.line.key));
    for (const [key, s] of map) {
      if (!want.has(key)) {
        chart.removeSeries(s);
        map.delete(key);
      }
    }
    for (const { line, values } of series.list) {
      let s = map.get(line.key);
      if (!s) {
        s = chart.addSeries(LineSeries, { priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 4 });
        map.set(line.key, s);
      }
      s.applyOptions({ color: line.token ? cssVar(line.token, "#888") : line.color, lineWidth: line.width, lineStyle: STYLE[line.dash] });
      s.setData(values);
    }
    zeroRef.current?.applyOptions({ color: cssVar("--line", "#ccc") });
    zeroRef.current?.setData(
      series.start && series.end && series.start < series.end
        ? [
            { time: series.start as Time, value: 0 },
            { time: series.end as Time, value: 0 },
          ]
        : [],
    );
    chart.applyOptions({ layout: { textColor: cssVar("--ink-soft", "#888") }, grid: { horzLines: { color: cssVar("--grid", "#ddd") } } });
    if (series.home) chart.timeScale().setVisibleLogicalRange(series.home);
  }, [series, theme]);

  const picked = Object.keys(picks).length;
  const full = picked >= MAX_CHART_STOCKS;
  // Select all can't draw every stock of a basket longer than the line limit: it draws the first ones.
  const capped = stocks.length > MAX_CHART_STOCKS;
  const allOn = picked >= Math.min(stocks.length, MAX_CHART_STOCKS);
  const toggleBench = (id: string) => setBenches((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  const toggleCompare = (slug: string) => setCompare((c) => (c.includes(slug) ? c.filter((x) => x !== slug) : c.length >= MAX_COMPARE ? c : [...c, slug]));

  const byKey = new Map(series.list.map((s) => [s.line.key, s]));
  // In the lines' own order (the basket, then what it is compared with, then stocks), never by
  // value: a row doesn't jump while the crosshair moves or a line loads.
  const rows = lines.map((l) => {
    const s = byKey.get(l.key);
    const value = hover ? hover.values[l.key] : s?.last;
    const why = projected?.why.get(l.key) ?? null;
    return { line: l, value: series.short.has(l.key) || why ? undefined : value, late: s?.late ?? series.short.get(l.key) ?? null, short: series.short.has(l.key) || !!why, load: loadOf(l.key), why };
  });
  // The legend box's height: the rows on plus one spare row, up to five rows (then it scrolls).
  // After the first measure it only grows, and only when the rows no longer fit (then to the rows
  // plus one again): a line switched off never pulls the panels below up, and the next line
  // switched on fits in the spare row without moving them. A few lines no longer leave a mostly empty box. Measured before paint; estimated (about
  // 48px a row) for the first render.
  const legendRef = useRef<HTMLUListElement>(null);
  const [legendH, setLegendH] = useState(() => Math.min(LEGEND_MAX, (lines.length + 1) * 48));
  const legendSet = useRef(false);
  const legendHRef = useRef(legendH);
  useLayoutEffect(() => {
    const ul = legendRef.current;
    if (!ul) return;
    const fit = () => {
      const items = [...ul.children] as HTMLElement[];
      const content = items.reduce((sum, el) => sum + el.offsetHeight, 0) + 2;
      // The spare row is a stock's (its name and ticker: the tallest usual row), so the next line fits.
      const row = Math.max(LEGEND_STOCK_ROW, items.length ? content / items.length : 0);
      const want = Math.min(LEGEND_MAX, Math.ceil(content + row));
      const now = legendHRef.current;
      // The first measure sets it; after that it grows only once the rows no longer fit.
      if (!legendSet.current) legendSet.current = true;
      else if (content <= now || want <= now) return;
      if (want === now) return;
      // A tick in the stock table (below the box) keeps its row under the pointer: the page scrolls
      // by what the box grew. Done here, not left to the browser's scroll anchoring, which some
      // browsers lack and Chrome skips here (the basket page turns it off, so the two never add up).
      const below = want > now && document.activeElement instanceof HTMLElement && ul.getBoundingClientRect().bottom <= document.activeElement.getBoundingClientRect().top;
      if (below) window.scrollBy(0, want - now);
      legendHRef.current = want;
      ul.style.height = `${want}px`;
      setLegendH(want);
    };
    fit();
    // A row that gets taller later (its "data from…" note once its prices load) is caught when it
    // happens, not at some later unrelated re-render.
    const ro = new ResizeObserver(fit);
    for (const el of ul.children) ro.observe(el);
    return () => ro.disconnect();
  }, [lines]);
  const anyLoading = !projection && lines.some((l) => loadOf(l.key)?.status !== "ok" && loadOf(l.key)?.status !== "error");
  const etfs = indices.filter((b) => b.via && benches.includes(b.id));
  const compareCount = compare.length + [...indices, ...market].filter((b) => benches.includes(b.id)).length;
  const q = query.trim().toLowerCase();
  const at = (t: string) => {
    const i = menu === "stocks" && frozen ? frozen.indexOf(t) : -1;
    return i < 0 ? stocks.length : i;
  };
  const ordered = menu === "stocks" && frozen ? [...stocks].sort((a, b) => at(a.ticker) - at(b.ticker)) : stocks;
  const visible = q ? ordered.filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)) : ordered;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={menusRef} className="relative flex flex-wrap items-center gap-2">
        <MenuButton label="Compare with" count={compareCount} open={menu === "compare"} onClick={(el) => toggleMenu("compare", el)} />
        <MenuButton label="Stocks" count={picked} open={menu === "stocks"} onClick={(el) => toggleMenu("stocks", el)} />
        {menu && (
          <div
            ref={popRef}
            style={{ left: menuLeft }}
            role="dialog"
            aria-label={menu === "compare" ? "Choose what to compare with" : "Choose stocks to show on the chart"}
            className="absolute top-full z-20 mt-2 flex max-h-[min(60vh,440px)] w-full flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] sm:w-96"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {menu === "compare" ? (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Indices</div>
                  <div className="mt-1 flex flex-col">
                    {indices.map((b, i) => (
                      <Switch key={b.id} on={benches.includes(b.id)} onToggle={() => toggleBench(b.id)} label={b.name} sub={(b.via ? "Industry index · via ETF" : "Industry index") + (projection ? " · not projected" : "")} swatch={{ color: "var(--ink)", width: 2, dash: i === 0 ? "solid" : "long" }} />
                    ))}
                    {market.map((b) => (
                      <Switch key={b.id} on={benches.includes(b.id)} onToggle={() => toggleBench(b.id)} label={b.name} sub={projection ? "Market · not projected" : "Market"} swatch={{ color: "var(--ink-soft)", width: 2, dash: b.id === "sensex" ? "dot" : "dash" }} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry baskets</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {compare.length}/{MAX_COMPARE} on
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">Every listed stock on an industry&rsquo;s map, at this basket&rsquo;s settings (equal weight when this one is custom).</p>
                  <div className="mt-1 flex flex-col">
                    {industries.map((b) => {
                      const i = compare.indexOf(b.slug);
                      const on = i >= 0;
                      return (
                        <Switch
                          key={b.slug}
                          on={on}
                          disabled={!on && compare.length >= MAX_COMPARE}
                          disabledTitle={`Up to ${MAX_COMPARE} industry baskets at a time`}
                          onToggle={() => toggleCompare(b.slug)}
                          label={b.name}
                          sub={`${b.icon} basket`}
                          swatch={on ? { color: SLOTS[theme][6], width: 2, dash: COMPARE_DASH[i % 3] } : undefined}
                          trackColor={on ? SLOTS[theme][6] : undefined}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Show on chart</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {picked === stocks.length ? `all ${picked} on` : `${picked} of ${stocks.length} on`}
                    </span>
                  </div>
                  {/* Always here, whatever the basket's size, so the menu's rows never move under a tap. */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onPickAll}
                      disabled={allOn}
                      title={capped ? `Draws the first ${MAX_CHART_STOCKS}: the chart's line limit` : undefined}
                      className="inline-flex min-h-9 items-center rounded border border-line bg-bg px-2.5 text-xs font-semibold text-ink hover:border-accent disabled:cursor-default disabled:text-ink-soft disabled:hover:border-line sm:min-h-7 pointer-coarse:min-h-9"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={onPickNone}
                      disabled={picked === 0}
                      className="inline-flex min-h-9 items-center rounded border border-line bg-bg px-2.5 text-xs font-semibold text-ink hover:border-accent disabled:cursor-default disabled:text-ink-soft disabled:hover:border-line sm:min-h-7 pointer-coarse:min-h-9"
                    >
                      Clear all
                    </button>
                  </div>
                  {/* Visibility only: these switch a stock's line on or off; they don't change the basket. */}
                  <p className={"mt-1.5 text-[11px] leading-snug " + (full ? "text-ink" : "text-ink-soft")}>
                    {full && capped ? `First ${MAX_CHART_STOCKS} shown · chart limit. Switch one off to show another.` : full ? LINES_FULL : `Lines only: the ${stocks.length} stocks stay in the basket either way.`}
                  </p>
                  {stocks.length > 12 && (
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search stocks"
                      aria-label="Search this basket's stocks"
                      className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
                    />
                  )}
                  <div className="mt-2 flex flex-col">
                    {visible.map((st) => {
                      const slot = picks[st.ticker];
                      const on = slot != null;
                      return (
                        <Switch
                          key={st.ticker}
                          on={on}
                          disabled={!on && full}
                          disabledTitle={`Up to ${MAX_CHART_STOCKS} stocks at a time`}
                          onToggle={() => onToggleStock(st.ticker)}
                          label={st.name}
                          sub={st.ticker}
                          swatch={on ? { ...stockLine(theme, slot), width: 2 } : undefined}
                          trackColor={on ? stockLine(theme, slot).color : undefined}
                        />
                      );
                    })}
                    {visible.length === 0 && <p className="py-2 text-xs text-ink-soft">No stock matches &ldquo;{query}&rdquo;.</p>}
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-line p-2">
              <button type="button" onClick={() => setMenu(null)} className="min-h-9 w-full rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg">
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative h-[300px] sm:h-[400px]">
        <div ref={boxRef} className="h-full w-full" />
        {series.list.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-soft">
            {projection ? "No stock in this basket has 3 years of results, so nothing is projected." : anyLoading ? "Backtesting the basket…" : "Couldn’t load price history right now."}
          </div>
        )}
      </div>
      <ZoomControls zoom={zoom} />

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[11px] uppercase tracking-wide text-ink-soft">
          <span>{hover ? `${series.step === "1wk" ? "Week of" : series.step === "1mo" ? "Month of" : "On"} ${fmtDay(hover.t)}` : projection ? `Projected, ${projection.label}` : `Return, past ${rangeLong}`}</span>
          {anyLoading && series.list.length > 0 && <span className="normal-case tracking-normal">Loading…</span>}
        </div>
        {/* Sized to its rows plus one, only ever growing (see legendH), so switching lines on or off rarely moves what is below. */}
        <ul ref={legendRef} style={{ height: legendH }} className="divide-y divide-line overflow-y-auto overscroll-contain rounded-xl border border-line bg-bg/60">
          {rows.map(({ line, value, late, short, load, why }) => {
            const failed = !projection && load?.status === "error";
            const sub = [line.note, why, short && late ? `history from ${fmtMonth(late)}, pick a shorter range` : late ? `data from ${fmtMonth(late)}` : null, failed ? "no price data available" : null]
              .filter(Boolean)
              .join(" · ");
            const mine = line.key === basketKey;
            return (
              // Stock names are ink, not accent: the basket's own line is accent, and the swatch
              // already shows each stock's colour.
              <li key={line.key} className={"flex items-center gap-3 px-3 py-2 text-sm " + (mine ? "bg-accent/5" : "")}>
                <svg aria-hidden width="22" height="10" className={"shrink-0 " + (short || failed ? "opacity-30" : "")}>
                  <line x1="2" y1="5" x2="20" y2="5" stroke={line.color} strokeWidth={line.width} strokeDasharray={DASHARRAY[line.dash]} strokeLinecap="round" />
                </svg>
                <span className="min-w-0 flex-1">
                  {line.stock ? (
                    <StockLink ticker={line.stock} className="relative block text-balance break-words font-medium leading-snug text-ink underline decoration-line underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:text-accent">
                      {line.name}
                    </StockLink>
                  ) : (
                    <span className={"block text-balance break-words leading-snug text-ink " + (mine ? "font-semibold" : "")}>{line.name}</span>
                  )}
                  {sub && <span className="block text-[10px] leading-snug text-ink-soft">{sub}</span>}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                  {failed ? (
                    <button type="button" onClick={() => retry(line.key)} className="text-xs font-semibold text-accent underline">
                      Retry
                    </button>
                  ) : value != null ? (
                    signedPct(value)
                  ) : (
                    <span className="text-ink-soft">{NA}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        {projection ? (
          <>
            Weekly steps from the last close, every line from 0% today; each stock grows smoothly to its projected return. The likely range is from 1,000 simulated paths that swing like the basket did over the past year. Indices aren&rsquo;t projected. Model projection from reported financials and past prices, not a forecast or a recommendation.
          </>
        ) : (
          <>
        Closing prices{range === "3Y" || range === "5Y" ? " (weekly)" : ""}, rebased to 0%. Price change only.
        {etfs.length > 0 && ` ${etfs.map((b) => b.name).join(" and ")} via ${etfs.length > 1 ? "ETFs that track them" : "an ETF that tracks it"}.`}
          </>
        )}
      </p>
    </div>
  );
}
