// Every metric of the catalogue (./metrics.ts) as a daily series for one stock, worked out on first
// use and kept for the request. Pure: the inputs (the stock's bars, the Nifty 50 on the same days,
// the covered-stock panel) are loaded by ./data.ts.
import * as I from "./indicators";
import type { Series } from "./indicators";
import { METRIC_BY_ID, unavailableReason, type DataGaps } from "./metrics";

export type DailyBars = { t: string[]; o: Series; h: Series; l: Series; c: Series; v: Series };

/** Per day (YYYY-MM-DD): the stock's Trend percentile, and its industry's median 3-month return (%). */
export type PanelRows = { trend: Map<string, number>; ind63: Map<string, number> };

export type MetricContext = {
  bars: DailyBars;
  /** The Nifty 50's close on each of the stock's days (the last close on or before it). */
  nifty: Series;
  panel: PanelRows | null;
  /** Whether the panel was asked for: when it wasn't, a panel metric is simply not loaded, not unavailable. */
  panelAsked?: boolean;
  gaps: DataGaps;
};

/** The day's high and low where the stock has them, else its close (52-week and Donchian levels). */
const orClose = (x: Series, c: Series): Series => x.map((v, i) => v ?? c[i]);

/** The stock's gaps: no open/high/low on most days, or no volume on most days. */
export function dataGaps(b: DailyBars): DataGaps {
  const n = b.c.length || 1;
  const hl = b.h.filter((v, i) => v != null && b.l[i] != null).length / n < 0.9;
  const vol = b.v.filter((v) => v != null && v > 0).length / n < 0.5;
  return { hl, vol };
}

/** Benchmark closes put on the stock's days, carrying the last close over a day the benchmark lacks. */
export function alignTo(days: string[], points: { t: string; c: number }[]): Series {
  const out: Series = new Array(days.length).fill(null);
  let j = 0;
  let last: number | null = null;
  for (let i = 0; i < days.length; i++) {
    while (j < points.length && points[j].t <= days[i]) last = points[j++].c;
    out[i] = last;
  }
  return out;
}

export class Metrics {
  private cache = new Map<string, Series>();
  constructor(readonly ctx: MetricContext) {}

  /** Why a metric can't be worked out for this stock, or null. */
  unavailable(id: string): string | null {
    const def = METRIC_BY_ID.get(id);
    if (!def) return "unknown indicator";
    if (def.needs?.includes("panel") && !this.ctx.panel && this.ctx.panelAsked !== false) return "the covered-stock comparison couldn't load";
    return unavailableReason(def, this.ctx.gaps);
  }

  /** A panel metric left unloaded because no rule asked for it. */
  notLoaded(id: string): boolean {
    return !!METRIC_BY_ID.get(id)?.needs?.includes("panel") && !this.ctx.panel && this.ctx.panelAsked === false;
  }

  get(id: string): Series {
    const hit = this.cache.get(id);
    if (hit) return hit;
    for (const [k, s] of Object.entries(this.compute(id))) this.cache.set(k, s);
    return this.cache.get(id) ?? new Array(this.ctx.bars.c.length).fill(null);
  }

  /** One metric, or a family worked out together (MACD's three lines, Bollinger's five). */
  private compute(id: string): Record<string, Series> {
    const { bars, nifty, panel } = this.ctx;
    const { o, h, l, c, v, t } = bars;
    const m = /^(sma|ema|roc)(\d+)$/.exec(id);
    if (m) {
      const n = Number(m[2]);
      return { [id]: m[1] === "sma" ? I.sma(c, n) : m[1] === "ema" ? I.ema(c, n) : I.roc(c, n) };
    }
    switch (id) {
      case "close":
        return { close: c };
      case "macd":
      case "macdSignal":
      case "macdHist": {
        const x = I.macd(c);
        return { macd: x.line, macdSignal: x.signal, macdHist: x.hist };
      }
      case "adx":
      case "pdi":
      case "mdi": {
        const x = I.adx(h, l, c);
        return { adx: x.adx, pdi: x.pdi, mdi: x.mdi };
      }
      case "supertrend":
        return { supertrend: I.supertrend(h, l, c) };
      case "psar":
        return { psar: I.psar(h, l) };
      case "tenkan":
      case "kijun":
      case "cloudTop":
      case "cloudBottom":
        return I.ichimoku(h, l);
      case "aroonUp":
      case "aroonDown": {
        const x = I.aroon(h, l);
        return { aroonUp: x.up, aroonDown: x.down };
      }
      case "rsi14":
        return { rsi14: I.rsi(c, 14) };
      case "stochK":
      case "stochD": {
        const x = I.stochastic(h, l, c);
        return { stochK: x.k, stochD: x.d };
      }
      case "stochRsi":
        return { stochRsi: I.stochRsi(c) };
      case "willr":
        return { willr: I.williamsR(h, l, c) };
      case "cci20":
        return { cci20: I.cci(h, l, c) };
      case "mom12_1":
        return { mom12_1: I.lagReturn(c, 252, 21) };
      case "bbUpper":
      case "bbMid":
      case "bbLower":
      case "bbPctB":
      case "bbWidth": {
        const x = I.bollinger(c);
        return { bbUpper: x.upper, bbMid: x.mid, bbLower: x.lower, bbPctB: x.pctB, bbWidth: x.width };
      }
      case "atrPct": {
        const a = I.atr(h, l, c, 14);
        return { atrPct: a.map((x, i) => (x != null && c[i] ? (x / (c[i] as number)) * 100 : null)) };
      }
      case "kcUpper":
      case "kcLower": {
        const x = I.keltner(h, l, c);
        return { kcUpper: x.upper, kcLower: x.lower };
      }
      case "hv60":
        return { hv60: I.histVol(c, 60) };
      case "volRatio": {
        const avg = I.sma(v, 20);
        return { volRatio: v.map((x, i) => (x != null && avg[i] ? x / (avg[i] as number) : null)) };
      }
      case "obv":
      case "obvSma20": {
        const x = I.obv(c, v);
        return { obv: x, obvSma20: I.sma(x, 20) };
      }
      case "mfi14":
        return { mfi14: I.mfi(h, l, c, v) };
      case "cmf20":
        return { cmf20: I.cmf(h, l, c, v) };
      case "vwap20":
        return { vwap20: I.vwap(h, l, c, v) };
      case "high52":
      case "low52":
      case "fromHigh52":
      case "fromLow52": {
        const hi = orClose(h, c), lo = orClose(l, c);
        const hiIn = I.highest(hi, 252), loIn = I.lowest(lo, 252);
        return {
          high52: I.highest(hi, 252, true),
          low52: I.lowest(lo, 252, true),
          fromHigh52: c.map((x, i) => (x != null && hiIn[i] ? (1 - x / (hiIn[i] as number)) * 100 : null)),
          fromLow52: c.map((x, i) => (x != null && loIn[i] ? (x / (loIn[i] as number) - 1) * 100 : null)),
        };
      }
      case "dch20":
        return { dch20: I.highest(orClose(h, c), 20, true) };
      case "dch55":
        return { dch55: I.highest(orClose(h, c), 55, true) };
      case "dcl20":
        return { dcl20: I.lowest(orClose(l, c), 20, true) };
      case "gap":
        return { gap: o.map((x, i) => (x != null && i > 0 && c[i - 1] ? (x / (c[i - 1] as number) - 1) * 100 : null)) };
      case "pivot":
      case "r1":
      case "s1": {
        const p: Series = c.map((_, i) => (i > 0 && h[i - 1] != null && l[i - 1] != null && c[i - 1] != null ? ((h[i - 1] as number) + (l[i - 1] as number) + (c[i - 1] as number)) / 3 : null));
        return {
          pivot: p,
          r1: p.map((x, i) => (x == null ? null : 2 * x - (l[i - 1] as number))),
          s1: p.map((x, i) => (x == null ? null : 2 * x - (h[i - 1] as number))),
        };
      }
      case "trendPct":
        return { trendPct: t.map((d) => panel?.trend.get(d) ?? null) };
      case "rsNifty63": {
        const a = I.roc(c, 63), b = I.roc(nifty, 63);
        return { rsNifty63: a.map((x, i) => (x != null && b[i] != null ? x - (b[i] as number) : null)) };
      }
      case "rsInd63": {
        const a = I.roc(c, 63);
        return { rsInd63: a.map((x, i) => (x != null && panel?.ind63.has(t[i]) ? x - (panel.ind63.get(t[i]) as number) : null)) };
      }
      case "mansfield": {
        const rs: Series = c.map((x, i) => (x != null && nifty[i] ? x / (nifty[i] as number) : null));
        const avg = I.sma(rs, 252);
        return { mansfield: rs.map((x, i) => (x != null && avg[i] ? (x / (avg[i] as number) - 1) * 100 : null)) };
      }
      case "beta252":
        return { beta252: I.beta(c, nifty, 252) };
      case "atr22":
        return { atr22: I.atr(h, l, c, 22) };
      default:
        return {};
    }
  }
}
