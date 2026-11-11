// Server side of the signal backtests (docs/SIGNALS.md section 1): a stock's daily bars and the
// Nifty 50 from the price store, and the covered-stock panel (each day's Trend percentile, and each
// industry's median 3-month return) that the Relative indicators read. The panel reads every covered
// stock's closes, so it is built once per server instance and kept for six hours.
import { storedDailyBars, storedDailyChart } from "@/lib/prices/store";
import { listBasketUniverse } from "@/lib/baskets/industry";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { rankIn } from "@/lib/financials/trend";
import { alignTo, dataGaps, Metrics, type DailyBars, type PanelRows } from "./compute";

const PANEL_TTL_MS = 6 * 60 * 60 * 1000;
const TREND_DAYS = 252;
const IND_DAYS = 63;
// An industry's median needs this many covered stocks with a 3-month return that day.
const MIN_INDUSTRY = 5;
const READS_AT_ONCE = 8;

type Panel = { days: string[]; byTicker: Map<string, PanelRows> };

async function buildPanel(): Promise<Panel | null> {
  const universe = listBasketUniverse();
  const nifty = await storedDailyChart(BENCHMARKS.nifty50.symbol, "5Y");
  if (!nifty?.length) return null;
  const days = nifty.map((p) => p.t);
  const closes = new Map<string, (number | null)[]>();
  for (let i = 0; i < universe.length; i += READS_AT_ONCE) {
    const batch = universe.slice(i, i + READS_AT_ONCE);
    const got = await Promise.all(batch.map((s) => storedDailyChart(s.ticker, "5Y").catch(() => null)));
    batch.forEach((s, j) => {
      const pts = got[j];
      // Carried over a missing day, but not back before the stock's first close.
      if (pts?.length) closes.set(s.ticker, alignTo(days, pts).map((c, k) => (days[k] < pts[0].t ? null : c)));
    });
  }
  if (closes.size < universe.length / 2) return null;
  const industry = new Map(universe.map((s) => [s.ticker, s.industries[0]?.slug ?? null]));
  const byTicker = new Map<string, PanelRows>([...closes.keys()].map((t) => [t, { trend: new Map(), ind63: new Map() }]));
  const ret = (c: (number | null)[], i: number, n: number) => (i >= n && c[i] != null && c[i - n] != null && (c[i - n] as number) > 0 ? ((c[i] as number) / (c[i - n] as number) - 1) * 100 : null);
  for (let i = 0; i < days.length; i++) {
    const yearly: { t: string; r: number }[] = [];
    const quarterly = new Map<string, number[]>();
    for (const [t, c] of closes) {
      const r = ret(c, i, TREND_DAYS);
      if (r != null) yearly.push({ t, r });
      const q = ret(c, i, IND_DAYS);
      const ind = industry.get(t);
      if (q != null && ind) quarterly.set(ind, [...(quarterly.get(ind) ?? []), q]);
    }
    if (yearly.length > 1) {
      const sorted = yearly.map((x) => x.r).sort((a, b) => a - b);
      for (const { t, r } of yearly) byTicker.get(t)!.trend.set(days[i], rankIn(sorted, r).pct);
    }
    const medians = new Map<string, number>();
    for (const [ind, qs] of quarterly) {
      if (qs.length < MIN_INDUSTRY) continue;
      const s = qs.sort((a, b) => a - b);
      const mid = s.length >> 1;
      medians.set(ind, s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
    }
    for (const [t] of closes) {
      const ind = industry.get(t);
      const med = ind ? medians.get(ind) : undefined;
      if (med != null) byTicker.get(t)!.ind63.set(days[i], med);
    }
  }
  return { days, byTicker };
}

// One build at a time per instance, however long it takes (a cold price cache means ~450 reads);
// the last one built serves for six hours, and readings use it when no rule asks for it.
let built: { at: number; panel: Panel } | null = null;
let building: Promise<Panel | null> | null = null;
const peekPanel = () => (built && Date.now() - built.at < PANEL_TTL_MS ? built.panel : null);
function panel(): Promise<Panel | null> {
  const ready = peekPanel();
  if (ready) return Promise.resolve(ready);
  building ??= buildPanel()
    .then((p) => {
      if (p) built = { at: Date.now(), panel: p };
      return p;
    })
    .catch((e) => (console.error("signals: panel build failed", e), null))
    .finally(() => (building = null));
  return building;
}
// How long a request waits for a panel still building before answering "try again shortly".
const PANEL_WAIT_MS = 25_000;
const PENDING = Symbol("pending");

export type StockData = { mx: Metrics; source: string; lastDay: string };

/** The panel isn't built yet: it carries on in the background, and the request should be made again shortly. */
export class PanelPending extends Error {
  constructor() {
    super("signals: covered-stock panel still building");
  }
}

/**
 * A covered stock's metrics, or null when the store has no prices for it. `needPanel`: the rules read
 * the Trend percentile or RS vs industry, so the panel is built if this instance hasn't one.
 */
export async function loadStock(ticker: string, needPanel: boolean): Promise<StockData | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const waitPanel = () => Promise.race([panel(), new Promise<typeof PENDING>((r) => (timer = setTimeout(() => r(PENDING), PANEL_WAIT_MS)))]).finally(() => clearTimeout(timer));
  const [stock, nifty, p] = await Promise.all([storedDailyBars(ticker, "5Y"), storedDailyChart(BENCHMARKS.nifty50.symbol, "5Y"), needPanel ? waitPanel() : Promise.resolve(peekPanel())]);
  if (p === PENDING) throw new PanelPending();
  if (!stock || stock.bars.length < 30) return null;
  const b = stock.bars;
  const bars: DailyBars = { t: b.map((x) => x.t), o: b.map((x) => x.o), h: b.map((x) => x.h), l: b.map((x) => x.l), c: b.map((x) => x.c), v: b.map((x) => x.v) };
  const mx = new Metrics({ bars, nifty: alignTo(bars.t, nifty ?? []), panel: p?.byTicker.get(ticker) ?? null, panelAsked: needPanel, gaps: dataGaps(bars) });
  return { mx, source: stock.source, lastDay: bars.t[bars.t.length - 1] };
}

// Stocks read at once when loading a basket.
const BASKET_READS = 8;

export type BasketData = { stocks: { ticker: string; mx: Metrics }[]; missing: string[]; nifty: { t: string; c: number }[] };

/** Every stock of a basket (those with prices), and the Nifty 50's closes for the basket's calendar. */
export async function loadBasket(tickers: string[], needPanel: boolean): Promise<BasketData | null> {
  const nifty = await storedDailyChart(BENCHMARKS.nifty50.symbol, "5Y");
  if (!nifty?.length) return null;
  const stocks: { ticker: string; mx: Metrics }[] = [];
  const missing: string[] = [];
  for (let i = 0; i < tickers.length; i += BASKET_READS) {
    const batch = tickers.slice(i, i + BASKET_READS);
    const got = await Promise.all(batch.map((t) => loadStock(t, needPanel)));
    batch.forEach((t, j) => (got[j] ? stocks.push({ ticker: t, mx: got[j]!.mx }) : missing.push(t)));
  }
  return { stocks, missing, nifty };
}
