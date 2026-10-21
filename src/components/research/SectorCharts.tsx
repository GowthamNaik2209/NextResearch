"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import type { ChartRange } from "@/lib/live/yahoo";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import Link from "next/link";
import { StockLink } from "@/components/stock/StockLink";
import { ReturnCards, picksKey } from "@/components/baskets/ReturnCards";
import { loadSeries, type Load } from "@/components/baskets/series";
import { ZOOM_OPTIONS, ZoomControls, useChartZoom } from "@/components/charts/ChartZoom";
import { onSharedGrid, sharedInterval } from "@/lib/live/ohlc-format";

export type ChartStock = {
  ticker: string;
  name: string;
  mcapCr: number | null;
};
export type ChartSector = {
  slug: string;
  name: string;
  icon: string;
  category: "sector" | "policy";
  stocks: ChartStock[];
  indices: Benchmark[];
};

const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
  { id: "3Y", long: "3 years" },
  { id: "5Y", long: "5 years" },
];

// More lines than this stop being readable on one chart (and run past the validated palette).
const MAX_STOCKS = 7;
const COLLAPSED = 12;
// The chart opens on the market alone; people add the stocks and indices they want.
const START_BENCHES = ["nifty50"];
// Categorical slots 1-7 of the dataviz reference palette, stepped per theme and validated
// against this site's panel colours. Benchmarks are drawn in ink instead, so they never
// compete with a stock for a hue.
export const SLOTS = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"],
};

type Theme = "light" | "dark";
export type Dash = "solid" | "long" | "dash" | "dot";
type Line = {
  key: string;
  name: string;
  note?: string;
  color: string; // CSS colour for the legend (may be a var())
  token?: string; // CSS variable the chart resolves to a concrete colour
  width: 2 | 3;
  dash: Dash;
  load: Load | undefined;
};

export const STYLE: Record<Dash, LineStyle> = {
  solid: LineStyle.Solid,
  long: LineStyle.LargeDashed,
  dash: LineStyle.Dashed,
  dot: LineStyle.SparseDotted,
};
export const DASHARRAY: Record<Dash, string | undefined> = {
  solid: undefined,
  long: "7 4",
  dash: "4 3",
  dot: "1 4",
};

const cssVar = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const readTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1)}%`;
// Axis ticks: whole steps drop the ".0" (+8%, not +8.0%); half steps keep it (−12.5%, not −13%).
const axisPct = (v: number) => {
  const a = Math.round(Math.abs(v) * 10) / 10;
  return `${v > 0 && a ? "+" : v < 0 && a ? "−" : ""}${a.toFixed(Number.isInteger(a) ? 0 : 1)}%`;
};
const day = (t: string) =>
  new Date(t).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const month = (t: string) => new Date(t).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

// Compare an industry's listed stocks with its own index, the Nifty 50 and the Sensex: every
// line starts at 0% on the first day shown, so a ₹3,000 stock and a ₹300 one share one scale.
export function SectorCharts({ sectors, market, initialSector }: { sectors: ChartSector[]; market: Benchmark[]; initialSector?: string }) {
  const [slug, setSlug] = useState(() => (sectors.some((s) => s.slug === initialSector) ? initialSector! : sectors[0]?.slug));
  const sector = sectors.find((s) => s.slug === slug) ?? sectors[0];
  const [range, setRange] = useState<ChartRange>("1Y");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [benches, setBenches] = useState<string[]>(START_BENCHES);
  const [menu, setMenu] = useState<"industry" | "indices" | "stocks" | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [menuLeft, setMenuLeft] = useState(0);
  // Opens under the button that was pressed (phones: the full card width), kept inside the card.
  const toggleMenu = (name: "industry" | "indices" | "stocks", btn: HTMLButtonElement) => {
    const row = menusRef.current;
    setMenuLeft(row && window.innerWidth >= 640 ? Math.max(0, Math.min(btn.offsetLeft, row.clientWidth - 384)) : 0);
    setMenu((m) => (m === name ? null : name));
  };
  // A menu opened low on the screen scrolls just enough to show it whole (Done included).
  useEffect(() => {
    if (menu) popRef.current?.scrollIntoView({ block: "nearest" });
  }, [menu]);
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [hover, setHover] = useState<{
    t: string;
    values: Record<string, number>;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  // Each stock's return over the range, from the industry basket's backtest (the same request the
  // return cards make, so it is shared, not repeated). Keyed so a stale range never shows.
  const [returns, setReturns] = useState<{ id: string; ret: Map<string, number> } | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef(new Map<string, ISeriesApi<"Line">>());
  const zeroRef = useRef<ISeriesApi<"Line"> | null>(null);

  const pickSector = (next: ChartSector) => {
    setSlug(next.slug);
    setPicks({});
    setBenches(START_BENCHES);
    setMenu(null);
    setQuery("");
    setShowAll(false);
    setHover(null);
  };

  // A tap outside the open menu (or Escape) closes it.
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

  useEffect(() => {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("sector", slug);
    window.history.replaceState(window.history.state, "", url);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the theme set by the inline script
    setTheme(readTheme());
    const mo = new MutationObserver(() => setTheme(readTheme()));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => mo.disconnect();
  }, []);

  // The industry's equal-weight basket: the chart's first line, the return cards' first card and
  // the left list's returns (one request, shared through loadSeries).
  const basketKey = sector ? `x:sector=${sector.slug}&w=equal` : null;
  const lines: Line[] = useMemo(() => {
    if (!sector || !basketKey) return [];
    const at = (key: string) => loads[`${key}|${range}`];
    const kind = sector.category === "policy" ? "policy" : "industry";
    // Drawn like the basket pages' own basket: the thick accent line, first in the legend.
    const out: Line[] = [
      { key: basketKey, name: `${sector.name} basket`, note: `this ${kind}, equal weight`, color: "var(--accent)", token: "--accent", width: 3, dash: "solid", load: at(basketKey) },
    ];
    sector.indices.forEach((b, i) => {
      if (!benches.includes(b.id)) return;
      out.push({
        key: `b:${b.id}`,
        name: b.name,
        note: b.via ? "via ETF" : undefined,
        color: "var(--ink)",
        token: "--ink",
        width: 3,
        dash: i === 0 ? "solid" : "long",
        load: at(`b:${b.id}`),
      });
    });
    market.forEach((b) => {
      if (!benches.includes(b.id)) return;
      const dash = b.id === "sensex" ? "dot" : "dash";
      out.push({
        key: `b:${b.id}`,
        name: b.name,
        color: "var(--ink-soft)",
        token: "--ink-soft",
        width: 2,
        dash,
        load: at(`b:${b.id}`),
      });
    });
    for (const st of sector.stocks) {
      const slot = picks[st.ticker];
      if (slot == null) continue;
      out.push({
        key: `s:${st.ticker}`,
        name: st.name,
        note: st.ticker,
        color: SLOTS[theme][slot],
        width: 2,
        dash: "solid",
        load: at(`s:${st.ticker}`),
      });
    }
    return out;
  }, [sector, basketKey, market, benches, picks, range, loads, theme]);

  // Fetch whatever is switched on and not yet loaded for this range.
  // Loaded series survive switching industries, ranges and views (same key, same data); a
  // request still running is shared rather than repeated.
  const fetchLine = useCallback((key: string, r: ChartRange, fresh = false) => {
    const id = `${key}|${r}`;
    setLoads((m) => ({ ...m, [id]: { status: "loading" } }));
    loadSeries(key, r, fresh).then((l) => setLoads((m) => ({ ...m, [id]: l })));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the switched-on lines as loading, then fetches them
    for (const l of lines) if (!l.load) fetchLine(l.key, range);
  }, [lines, range, fetchLine]);

  // Rebase each loaded line to % change from its own first point.
  const series = useMemo(() => {
    const ok = lines.flatMap((l) => (l.load?.status === "ok" && l.load.data.points.length > 1 ? [{ line: l, points: l.load.data.points }] : []));
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
    // An index whose history begins mid-chart (an ETF launched in 2024, say) would start at 0%
    // beside lines already well up or down, so it is left off and its row says why. A stock
    // that starts late is still drawn: it listed (or its data begins) later, and its row says when.
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
  }, [lines, range]);

  // Create the chart once; the effect below keeps its series in step with the switches.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const map = seriesRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: cssVar("--ink-soft", "#888"),
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: cssVar("--grid", "#ddd") },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter: (v: number) => axisPct(v) },
      ...ZOOM_OPTIONS,
    });
    chartRef.current = chart;
    zeroRef.current = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
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
        s = chart.addSeries(LineSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerRadius: 4,
        });
        map.set(line.key, s);
      }
      s.applyOptions({
        color: line.token ? cssVar(line.token, "#888") : line.color,
        lineWidth: line.width,
        lineStyle: STYLE[line.dash],
      });
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
    chart.applyOptions({
      layout: { textColor: cssVar("--ink-soft", "#888") },
      grid: { horzLines: { color: cssVar("--grid", "#ddd") } },
    });
    if (series.home) chart.timeScale().setVisibleLogicalRange(series.home);
  }, [series, theme]);

  useEffect(() => {
    if (!basketKey) return;
    let live = true;
    loadSeries(basketKey, range).then((l) => {
      if (live && l.status === "ok") setReturns({ id: `${basketKey}|${range}`, ret: new Map((l.data.holdings ?? []).map((h) => [h.ticker, h.ret])) });
    });
    return () => {
      live = false;
    };
  }, [basketKey, range]);
  if (!sector || !basketKey) return null;

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
      const slot = [...Array(MAX_STOCKS).keys()].find((i) => !used.has(i))!;
      return { ...p, [t]: slot };
    });
  const toggleBench = (id: string) => setBenches((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));

  const q = query.trim().toLowerCase();
  const matches = q ? sector.stocks.filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)) : sector.stocks;
  const visible = q || showAll ? matches : matches.slice(0, COLLAPSED);
  const byKey = new Map(series.list.map((s) => [s.line.key, s]));
  const rows = lines
    .map((l) => {
      const s = byKey.get(l.key);
      const value = hover ? hover.values[l.key] : s?.last;
      return { line: l, value: series.short.has(l.key) ? undefined : value, late: s?.late ?? series.short.get(l.key) ?? null, short: series.short.has(l.key) };
    })
    .sort((a, b) => (a.line.key === basketKey ? -1 : b.line.key === basketKey ? 1 : (b.value ?? -Infinity) - (a.value ?? -Infinity)));
  const anyLoading = lines.some((l) => !l.load || l.load.status === "loading");
  const benchCount = [...sector.indices, ...market].filter((b) => benches.includes(b.id)).length;
  const etfs = sector.indices.filter((b) => b.via && benches.includes(b.id));
  const rangeLong = RANGES.find((r) => r.id === range)!.long;
  // The same return cards as the basket pages: the industry's listed stocks as one equal-weight
  // basket, the stocks picked here as their own basket, and the indices.
  const pickedTickers = sector.stocks.filter((st) => picks[st.ticker] != null).map((st) => st.ticker);
  const pickedKey = picksKey(pickedTickers, "w=equal");

  const returnsId = `${basketKey}|${range}`;
  const stockRet = returns?.id === returnsId ? returns.ret : null;
  const listed = [...sector.stocks].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Left column on desktop (stays in view): the industry, period, the way into its basket and
          its stocks with their returns, a colour marking the ones drawn on the chart. Phones get
          the title and period on top and the stocks through the Stocks menu. */}
      <aside aria-label="Chart controls" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-line lg:bg-panel lg:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-stretch">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{sector.name}</h2>
            <p className="text-xs text-ink-soft">% change over the past {rangeLong}</p>
          </div>
          <div className="inline-flex rounded-full border border-line bg-bg p-1 lg:grid lg:grid-cols-5" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRange(r.id);
                  setHover(null);
                }}
                aria-pressed={range === r.id}
                className={"min-w-10 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors " + (range === r.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
              >
                {r.id}
              </button>
            ))}
          </div>
        </div>

        <Link href={`/baskets/industry/${sector.slug}`} className="self-start py-1 text-xs font-semibold text-accent hover:underline">
          Open as a basket (market-cap weight, each stock&rsquo;s contribution) &rarr;
        </Link>
        <section aria-label={`In ${sector.name}`} className="hidden flex-col gap-1 lg:flex">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            In this {sector.category === "policy" ? "policy" : "industry"} ({listed.length})
          </span>
          <span className="text-[11px] leading-snug text-ink-soft">
            {picked > 0 ? "A colour marks a stock drawn on the chart. " : ""}Add or take off lines with the Stocks menu.
          </span>
          <ul className="divide-y divide-line">
            {listed.map((st) => {
              const slot = picks[st.ticker];
              const r = stockRet?.get(st.ticker);
              return (
                <li key={st.ticker} className="flex items-center gap-2 py-1.5">
                  <span aria-hidden className="h-1 w-3 flex-none rounded-full" style={slot == null ? undefined : { background: SLOTS[theme][slot] }} />
                  <StockLink ticker={st.ticker} className={"min-w-0 flex-1 truncate text-xs text-ink hover:text-accent hover:underline " + (slot == null ? "" : "font-semibold")}>
                    {st.name}
                    {slot != null && <span className="sr-only"> (on the chart)</span>}
                  </StockLink>
                  <span className={"flex-none font-mono text-[11px] " + (r == null ? "text-ink-soft" : r >= 0 ? "text-pos" : "text-danger")}>{r == null ? "—" : pct(r)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>

      <section aria-label={`${sector.name} price comparison`} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <ReturnCards
            range={range}
            basket={{
              key: basketKey,
              label: `${sector.category === "policy" ? "Policy" : "Industry"} basket, ${rangeLong}`,
              note: `all ${sector.stocks.length} listed stocks · equal weight`,
            }}
            picks={pickedKey ? { key: pickedKey, label: `Your ${pickedTickers.length} picked stock${pickedTickers.length > 1 ? "s" : ""}`, tickers: pickedTickers, strategy: "equal weight" } : null}
            benches={[{ key: "b:nifty50", label: "Nifty 50" }]}
          />
        </div>

        <div ref={menusRef} className="relative flex flex-wrap items-center gap-2">
          <MenuButton
            label={
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={"font-normal " + (menu === "industry" ? "" : "text-ink-soft")}>{sector.category === "policy" ? "Policy" : "Industry"}</span>
                <span className="max-w-[13rem] truncate sm:max-w-[18rem]">{sector.name}</span>
              </span>
            }
            count={0}
            open={menu === "industry"}
            onClick={(el) => toggleMenu("industry", el)}
          />
          <MenuButton label="Indices" count={benchCount} open={menu === "indices"} onClick={(el) => toggleMenu("indices", el)} />
          <MenuButton label="Stocks" count={picked} open={menu === "stocks"} onClick={(el) => toggleMenu("stocks", el)} />
          {picked === 0 && menu === null && <span className="text-xs text-ink-soft">Add stocks to compare them with the market.</span>}
          {menu && (
            <div
              ref={popRef}
              style={{ left: menuLeft }}
              role="dialog"
              aria-label={menu === "industry" ? "Choose industry" : menu === "indices" ? "Choose indices" : "Choose stocks"}
              className="absolute top-full z-20 mt-2 flex max-h-[min(60vh,440px)] w-full flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] sm:w-96"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {menu === "industry" ? (
                  <div className="flex flex-col">
                    {sectors.map((s) => {
                      const current = s.slug === sector.slug;
                      return (
                        <button
                          key={s.slug}
                          type="button"
                          aria-pressed={current}
                          onClick={() => pickSector(s)}
                          className={"flex min-h-11 w-full items-center gap-3 rounded-lg px-1.5 text-left transition " + (current ? "bg-bg" : "hover:bg-bg/60")}
                        >
                          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 font-mono text-[10px] font-bold text-accent">
                            {s.icon}
                          </span>
                          <span className={"min-w-0 flex-1 text-sm " + (current ? "font-semibold text-ink" : "text-ink")}>{s.name}</span>
                          {current && (
                            <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-accent">
                              <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : menu === "indices" ? (
                  <>
                    <div>
                      <div className="flex flex-col">
                        {sector.indices.map((b, i) => (
                          <Switch
                            key={b.id}
                            on={benches.includes(b.id)}
                            onToggle={() => toggleBench(b.id)}
                            label={b.name}
                            sub={b.via ? "Industry index · via ETF" : "Industry index"}
                            swatch={{
                              color: "var(--ink)",
                              width: 3,
                              dash: i === 0 ? "solid" : "long",
                            }}
                          />
                        ))}
                        {market.map((b) => (
                          <Switch
                            key={b.id}
                            on={benches.includes(b.id)}
                            onToggle={() => toggleBench(b.id)}
                            label={b.name}
                            sub="Market"
                            swatch={{
                              color: "var(--ink-soft)",
                              width: 2,
                              dash: b.id === "sensex" ? "dot" : "dash",
                            }}
                          />
                        ))}
                      </div>
                      {sector.indices.length === 0 && (
                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">No Indian index tracks this industry yet, so compare with the Nifty 50 and Sensex.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{sector.stocks.length} listed</span>
                        <span className="font-mono text-[11px] text-ink-soft">
                          {picked}/{MAX_STOCKS} on
                        </span>
                      </div>
                      {full && <p className="mt-1 text-xs text-ink-soft">Up to {MAX_STOCKS} at a time. Switch one off to add another.</p>}
                      {sector.stocks.length > COLLAPSED && (
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search stocks"
                          aria-label={`Search ${sector.name} stocks`}
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
                              swatch={
                                on
                                  ? {
                                      color: SLOTS[theme][slot],
                                      width: 2,
                                      dash: "solid",
                                    }
                                  : undefined
                              }
                              trackColor={on ? SLOTS[theme][slot] : undefined}
                            />
                          );
                        })}
                        {visible.length === 0 && <p className="py-2 text-xs text-ink-soft">No stock matches &ldquo;{query}&rdquo;.</p>}
                      </div>
                      {!q && matches.length > COLLAPSED && (
                        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-semibold text-accent hover:underline">
                          {showAll ? "Show fewer" : `Show all ${matches.length}`}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Picking an industry closes the menu by itself; the switch menus need a Done. */}
              {menu !== "industry" && (
                <div className="border-t border-line p-2">
                  <button type="button" onClick={() => setMenu(null)} className="w-full rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg">
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative h-[300px] sm:h-[400px]">
          <div ref={boxRef} className="h-full w-full" />
          {series.list.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-soft">
              {lines.length === 0
                ? "Pick an index or a stock from the menus above to start comparing."
                : anyLoading
                  ? "Loading price history…"
                  : "Couldn’t load price history right now."}
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
            {rows.map(({ line, value, late, short }) => {
              const failed = line.load?.status === "error";
              const sub = [
                line.note,
                short && late ? `history from ${month(late)}, pick a shorter range` : late ? `data from ${month(late)}` : null,
                failed ? "no price data available" : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                // Stock rows are phone-only: from lg the left column lists the stocks with their colours.
                <li key={line.key} className={"flex items-center gap-3 px-3 py-2 text-sm " + (line.key === basketKey ? "bg-accent/5 " : "") + (line.key.startsWith("s:") ? "lg:hidden" : "")}>
                  <svg aria-hidden width="22" height="10" className={"shrink-0 " + (short || failed ? "opacity-30" : "")}>
                    <line x1="2" y1="5" x2="20" y2="5" stroke={line.color} strokeWidth={line.width} strokeDasharray={DASHARRAY[line.dash]} strokeLinecap="round" />
                  </svg>
                  <span className="min-w-0 flex-1">
                    {line.key.startsWith("s:") ? (
                      // Opens the stock pop-up (Summary / Chart / News / Fundamentals) in place.
                      <StockLink ticker={line.key.slice(2)} className="block truncate font-medium text-accent hover:underline">
                        {line.name}
                      </StockLink>
                    ) : (
                      <span className="block truncate text-ink">{line.name}</span>
                    )}
                    {sub && <span className="block text-[10px] leading-snug text-ink-soft">{sub}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                    {failed ? (
                      <button type="button" onClick={() => fetchLine(line.key, range, true)} className="text-xs font-semibold text-accent underline">
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
            {rows.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">Nothing switched on.</li>}
          </ul>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-soft">
          Closing prices{range === "3Y" || range === "5Y" ? " (weekly)" : ""}, rebased to 0%. Price change only.
          {etfs.length > 0 && ` ${etfs.map((b) => b.name).join(" and ")} via ${etfs.length > 1 ? "ETFs that track them" : "an ETF that tracks it"}.`}
        </p>
      </section>
    </div>
  );
}

export function MenuButton({ label, count, open, onClick }: { label: ReactNode; count: number; open: boolean; onClick: (el: HTMLButtonElement) => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e) => onClick(e.currentTarget)}
      className={
        "inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-full border px-4 text-sm font-semibold transition " +
        (open ? "border-accent bg-accent text-bg" : "border-line bg-bg text-ink hover:border-accent")
      }
    >
      {label}
      {/* Always laid out (hidden at 0), so the first pick doesn't widen the button, wrap the row
          and shift the open list under the next tap. */}
      <span aria-hidden={count === 0} className={"rounded-full px-1.5 font-mono text-[11px] " + (count === 0 ? "invisible " : "") + (open ? "bg-bg/25" : "bg-accent text-bg")}>
        {count}
      </span>
      <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className={"transition-transform " + (open ? "rotate-180" : "")}>
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function Switch({
  on,
  disabled,
  onToggle,
  label,
  sub,
  swatch,
  trackColor,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  sub?: string;
  swatch?: { color: string; width: number; dash: Dash };
  trackColor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={sub ? `${label}, ${sub}` : label}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onToggle()}
      title={disabled ? `Up to ${MAX_STOCKS} stocks at a time` : undefined}
      className={"flex min-h-11 w-full items-center gap-3 rounded-lg px-1.5 text-left transition " + (disabled ? "cursor-not-allowed opacity-45" : "hover:bg-bg/60")}
    >
      <span
        aria-hidden
        className={"relative h-5 w-9 shrink-0 rounded-full border transition-colors " + (on ? "border-transparent" : "border-line bg-bg")}
        style={on ? { background: trackColor ?? "var(--accent)" } : undefined}
      >
        <span className={"absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full shadow transition-all " + (on ? "left-[18px] bg-white" : "left-0.5 bg-ink-soft")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{label}</span>
        {sub && <span className="block truncate font-mono text-[10px] text-ink-soft">{sub}</span>}
      </span>
      {swatch && (
        <svg aria-hidden width="22" height="10" className="shrink-0">
          <line x1="2" y1="5" x2="20" y2="5" stroke={swatch.color} strokeWidth={swatch.width} strokeDasharray={DASHARRAY[swatch.dash]} strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
