"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import { StockLink } from "@/components/stock/StockLink";
import { ZOOM_OPTIONS, ZoomControls, useChartZoom } from "@/components/charts/ChartZoom";
import { onSharedGrid, sharedInterval } from "@/lib/live/ohlc-format";
import { DASHARRAY, MenuButton, SLOTS, STYLE, Switch, type Dash } from "@/components/research/SectorCharts";
import { loadSeries, type Load } from "./series";

// A basket's backtest beside the market, its industry's index and other industry baskets, on the
// Analysis charts' conventions: every line starts at 0% on the first day shown, benchmarks are
// drawn in ink, stocks in the categorical palette. The basket itself is the thick accent line.
export type CompareBasket = { slug: string; name: string; icon: string };

// A stock's line: one of six palette colours (slot 6 is kept for the compared industry baskets),
// solid first, then long-dashed, then dotted, so 18 stocks can be told apart.
const STOCK_DASH: Dash[] = ["solid", "long", "dot"];
export const MAX_CHART_STOCKS = 6 * STOCK_DASH.length;
const MAX_STOCKS = MAX_CHART_STOCKS;
export function stockLine(theme: "light" | "dark", slot: number): { color: string; dash: Dash } {
  return { color: SLOTS[theme][slot % 6], dash: STOCK_DASH[Math.floor(slot / 6) % STOCK_DASH.length] };
}
const MAX_COMPARE = 3;
const COMPARE_DASH: Dash[] = ["long", "dash", "dot"];

type Theme = "light" | "dark";
type Line = { key: string; name: string; note?: string; color: string; token?: string; width: 2 | 3; dash: Dash; stock?: string };

const cssVar = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const readTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
/** The site's light/dark theme, following the toggle live (line colours differ per theme). */
export function useSiteTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the theme set by the inline script
    setTheme(readTheme());
    const mo = new MutationObserver(() => setTheme(readTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}
export const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1)}%`;
// Axis ticks: whole steps drop the ".0" (+8%, not +8.0%); half steps keep it (−12.5%, not −13%).
const axisPct = (v: number) => {
  const a = Math.round(Math.abs(v) * 10) / 10;
  return `${v > 0 && a ? "+" : v < 0 && a ? "−" : ""}${a.toFixed(Number.isInteger(a) ? 0 : 1)}%`;
};
const day = (t: string) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const month = (t: string) => new Date(t).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** What the reader has switched on: indices, other industry baskets, and stocks (ticker → palette slot). */
export type ChartSelection = { benches: string[]; compare: string[]; picks: Record<string, number> };

/** The first view: the Nifty 50 and the industry index, plus the default comparison basket if there is one. */
export function defaultSelection(indices: Benchmark[], industries: CompareBasket[], defaultCompare: string | null): ChartSelection {
  return {
    benches: ["nifty50", ...(indices[0] ? [indices[0].id] : [])],
    compare: defaultCompare && industries.some((i) => i.slug === defaultCompare) ? [defaultCompare] : [],
    picks: {},
  };
}

// The selection is held by the page, not here, so switching weighting, range or the Stocks/Chart
// view never puts the reader's picks back to the defaults.
export function BasketChart({
  range,
  rangeLong,
  basketKey,
  basketName,
  weighting,
  industries,
  indices,
  market,
  stocks,
  selection,
  onSelection,
}: {
  range: ChartRange;
  rangeLong: string;
  /** Series key of the basket itself ("x:<query>"). */
  basketKey: string;
  basketName: string;
  weighting: "equal" | "mcap";
  /** Industry baskets it can be compared with (its own industry excluded by the caller if it is one). */
  industries: CompareBasket[];
  /** Its industry's index(es), then the broad market. */
  indices: Benchmark[];
  market: Benchmark[];
  stocks: { ticker: string; name: string }[];
  selection: ChartSelection;
  onSelection: Dispatch<SetStateAction<ChartSelection>>;
}) {
  const { benches, compare, picks } = selection;
  const setPicks = (f: (p: Record<string, number>) => Record<string, number>) => onSelection((s) => ({ ...s, picks: f(s.picks) }));
  const setBenches = (f: (b: string[]) => string[]) => onSelection((s) => ({ ...s, benches: f(s.benches) }));
  const setCompare = (f: (c: string[]) => string[]) => onSelection((s) => ({ ...s, compare: f(s.compare) }));
  const [menu, setMenu] = useState<"compare" | "stocks" | null>(null);
  const [menuLeft, setMenuLeft] = useState(0);
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [hover, setHover] = useState<{ t: string; values: Record<string, number> } | null>(null);
  const theme = useSiteTheme();
  const [query, setQuery] = useState("");
  // The stocks on the chart when the Stocks menu opened: listed first, so picks made in any
  // industry are easy to find. Fixed while it is open, so a row never jumps under a tap.
  const [onTop, setOnTop] = useState<Record<string, number>>({});
  const menusRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef(new Map<string, ISeriesApi<"Line">>());
  const zeroRef = useRef<ISeriesApi<"Line"> | null>(null);

  const toggleMenu = (name: "compare" | "stocks", btn: HTMLButtonElement) => {
    const row = menusRef.current;
    setMenuLeft(row && window.innerWidth >= 640 ? Math.max(0, Math.min(btn.offsetLeft, row.clientWidth - 384)) : 0);
    if (name === "stocks" && menu !== "stocks") setOnTop(picks);
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
    compare.forEach((slug, i) => {
      const b = industries.find((x) => x.slug === slug);
      if (b) out.push({ key: `x:sector=${slug}&w=${weighting}`, name: `${b.name} basket`, note: "industry basket", color: SLOTS[theme][6], width: 2, dash: COMPARE_DASH[i % 3] });
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
  }, [basketKey, basketName, compare, industries, weighting, indices, market, benches, stocks, picks, theme]);

  const fetchLine = (key: string, fresh = false) => {
    const id = `${key}|${range}`;
    setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
    loadSeries(key, range, fresh).then((l) => setLoads((m) => ({ ...m, [id]: l })));
  };
  useEffect(() => {
    for (const l of lines) {
      const id = `${l.key}|${range}`;
      if (loads[id]) continue;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the switched-on lines as loading, then fetches them
      setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
      loadSeries(l.key, range).then((r) => setLoads((m) => ({ ...m, [id]: r })));
    }
  }, [lines, range, loads]);

  const series = useMemo(() => {
    const ok = lines.flatMap((l) => {
      const ld = loads[`${l.key}|${range}`];
      return ld?.status === "ok" && ld.data.points.length > 1 ? [{ line: l, points: ld.data.points }] : [];
    });
    const start = ok.reduce<string | null>((m, s) => (!m || s.points[0].t < m ? s.points[0].t : m), null);
    const slackDays = range === "3Y" || range === "5Y" ? 35 : 10;
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
  }, [lines, loads, range]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const map = seriesRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--ink-soft", "#888"), fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVar("--grid", "#ddd") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
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
  const full = picked >= MAX_STOCKS;
  const toggleStock = (t: string) =>
    setPicks((p) => {
      if (p[t] != null) {
        const rest = { ...p };
        delete rest[t];
        return rest;
      }
      if (Object.keys(p).length >= MAX_STOCKS) return p;
      const used = new Set(Object.values(p));
      return { ...p, [t]: [...Array(MAX_STOCKS).keys()].find((i) => !used.has(i))! };
    });
  const toggleBench = (id: string) => setBenches((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  const toggleCompare = (slug: string) => setCompare((c) => (c.includes(slug) ? c.filter((x) => x !== slug) : c.length >= MAX_COMPARE ? c : [...c, slug]));

  const byKey = new Map(series.list.map((s) => [s.line.key, s]));
  const rows = lines
    .map((l) => {
      const s = byKey.get(l.key);
      const value = hover ? hover.values[l.key] : s?.last;
      return { line: l, value: series.short.has(l.key) ? undefined : value, late: s?.late ?? series.short.get(l.key) ?? null, short: series.short.has(l.key), load: loads[`${l.key}|${range}`] };
    })
    .sort((a, b) => (a.line.key === basketKey ? -1 : b.line.key === basketKey ? 1 : (b.value ?? -Infinity) - (a.value ?? -Infinity)));
  const anyLoading = lines.some((l) => loads[`${l.key}|${range}`]?.status !== "ok" && loads[`${l.key}|${range}`]?.status !== "error");
  const etfs = indices.filter((b) => b.via && benches.includes(b.id));
  const compareCount = compare.length + [...indices, ...market].filter((b) => benches.includes(b.id)).length;
  const q = query.trim().toLowerCase();
  const ordered = [...stocks].sort((a, b) => {
    const sa = onTop[a.ticker];
    const sb = onTop[b.ticker];
    if (sa != null && sb != null) return sa - sb;
    return sa != null ? -1 : sb != null ? 1 : 0;
  });
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
            aria-label={menu === "compare" ? "Choose what to compare with" : "Choose stocks"}
            className="absolute top-full z-20 mt-2 flex max-h-[min(60vh,440px)] w-full flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] sm:w-96"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {menu === "compare" ? (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Indices</div>
                  <div className="mt-1 flex flex-col">
                    {indices.map((b, i) => (
                      <Switch key={b.id} on={benches.includes(b.id)} onToggle={() => toggleBench(b.id)} label={b.name} sub={b.via ? "Industry index · via ETF" : "Industry index"} swatch={{ color: "var(--ink)", width: 2, dash: i === 0 ? "solid" : "long" }} />
                    ))}
                    {market.map((b) => (
                      <Switch key={b.id} on={benches.includes(b.id)} onToggle={() => toggleBench(b.id)} label={b.name} sub="Market" swatch={{ color: "var(--ink-soft)", width: 2, dash: b.id === "sensex" ? "dot" : "dash" }} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Industry baskets</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {compare.length}/{MAX_COMPARE} on
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">Every listed stock an industry maps, weighted the same way as this basket.</p>
                  <div className="mt-1 flex flex-col">
                    {industries.map((b) => {
                      const i = compare.indexOf(b.slug);
                      const on = i >= 0;
                      return (
                        <Switch
                          key={b.slug}
                          on={on}
                          disabled={!on && compare.length >= MAX_COMPARE}
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{stocks.length} in this basket</span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {picked}/{MAX_STOCKS} on
                    </span>
                  </div>
                  {full && <p className="mt-1 text-xs text-ink-soft">Up to {MAX_STOCKS} at a time. Switch one off to add another.</p>}
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
                          onToggle={() => toggleStock(st.ticker)}
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
              <button type="button" onClick={() => setMenu(null)} className="w-full rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg">
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
            {anyLoading ? "Backtesting the basket…" : "Couldn’t load price history right now."}
          </div>
        )}
      </div>
      <ZoomControls zoom={zoom} />

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[11px] uppercase tracking-wide text-ink-soft">
          <span>{hover ? `${series.step === "1wk" ? "Week of" : series.step === "1mo" ? "Month of" : "On"} ${day(hover.t)}` : `Return, past ${rangeLong}`}</span>
          {anyLoading && series.list.length > 0 && <span className="normal-case tracking-normal">Loading…</span>}
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line bg-bg/60">
          {rows.map(({ line, value, late, short, load }) => {
            const failed = load?.status === "error";
            const sub = [line.note, short && late ? `history from ${month(late)}, pick a shorter range` : late ? `data from ${month(late)}` : null, failed ? "no price data available" : null]
              .filter(Boolean)
              .join(" · ");
            const mine = line.key === basketKey;
            return (
              // Stock rows are phone-only: from lg the left column lists every stock with its line colour.
              <li key={line.key} className={"flex items-center gap-3 px-3 py-2 text-sm " + (mine ? "bg-accent/5 " : "") + (line.stock ? "lg:hidden" : "")}>
                <svg aria-hidden width="22" height="10" className={"shrink-0 " + (short || failed ? "opacity-30" : "")}>
                  <line x1="2" y1="5" x2="20" y2="5" stroke={line.color} strokeWidth={line.width} strokeDasharray={DASHARRAY[line.dash]} strokeLinecap="round" />
                </svg>
                <span className="min-w-0 flex-1">
                  {line.stock ? (
                    <StockLink ticker={line.stock} className="block truncate font-medium text-accent hover:underline">
                      {line.name}
                    </StockLink>
                  ) : (
                    <span className={"block truncate text-ink " + (mine ? "font-semibold" : "")}>{line.name}</span>
                  )}
                  {sub && <span className="block text-[10px] leading-snug text-ink-soft">{sub}</span>}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                  {failed ? (
                    <button type="button" onClick={() => fetchLine(line.key, true)} className="text-xs font-semibold text-accent underline">
                      Retry
                    </button>
                  ) : value != null ? (
                    pct(value)
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Closing prices{range === "3Y" || range === "5Y" ? " (weekly)" : ""}, rebased to 0%. Price change only.
        {etfs.length > 0 && ` ${etfs.map((b) => b.name).join(" and ")} via ${etfs.length > 1 ? "ETFs that track them" : "an ETF that tracks it"}.`}
      </p>
    </div>
  );
}
