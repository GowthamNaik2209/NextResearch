// "Readings now": every indicator's value on the stock's last close, with a plain state beside it
// (docs/SIGNALS.md section 4). The states use the usual textbook lines (RSI 70/30, ADX 25) and say
// where a reading sits, not what to do; each fits on one line in its tag. Pure.
import { METRICS, type MetricDef } from "./metrics";
import type { Metrics } from "./compute";

/** "up": the side a trend follower reads as strength; "down": the other side; "flat": neither. */
export type Tone = "up" | "down" | "flat";

export type Reading = { id: string; value: number | null; state: string | null; tone: Tone; unavailable: string | null };

const band = (v: number, hi: number, lo: number, hiText: string, loText: string, mid = "Neutral"): [string, Tone] => (v >= hi ? [hiText, "flat"] : v <= lo ? [loText, "flat"] : [mid, "flat"]);

function stateOf(def: MetricDef, v: number, at: (id: string) => number | null): [string | null, Tone] {
  const close = at("close");
  if (def.kind === "price") {
    if (def.id === "close" || close == null) return [null, "flat"];
    return close > v ? ["Price above", "up"] : ["Price below", "down"];
  }
  switch (def.id) {
    case "rsi14":
    case "mfi14":
    case "stochRsi":
      return band(v, def.id === "stochRsi" ? 80 : 70, def.id === "stochRsi" ? 20 : 30, "Overbought", "Oversold");
    case "rsi2":
      return band(v, 90, 10, "Overbought", "Oversold");
    case "rsi4":
      return band(v, 75, 25, "Overbought", "Oversold");
    case "stochK":
    case "stochD":
      return band(v, 80, 20, "Overbought", "Oversold");
    case "willr":
      return band(v, -20, -80, "Overbought", "Oversold");
    case "cci20":
      return band(v, 100, -100, "Above +100", "Below −100");
    case "adx":
      return v >= 25 ? ["Trending", "up"] : v < 20 ? ["No trend", "flat"] : ["Weak trend", "flat"];
    case "pdi": {
      const m = at("mdi");
      return m == null ? [null, "flat"] : v > m ? ["+DI leads", "up"] : ["−DI leads", "down"];
    }
    case "mdi":
      return [null, "flat"];
    case "macd": {
      const s = at("macdSignal");
      return s == null ? [null, "flat"] : v > s ? ["Above signal", "up"] : ["Below signal", "down"];
    }
    case "macdSignal":
      return [null, "flat"];
    case "aroonUp": {
      const d = at("aroonDown");
      return d == null ? [null, "flat"] : v > d ? ["Up leads", "up"] : ["Down leads", "down"];
    }
    case "aroonDown":
      return [null, "flat"];
    case "obv": {
      const a = at("obvSma20");
      return a == null ? [null, "flat"] : v > a ? ["Above avg", "up"] : ["Below avg", "down"];
    }
    case "obvSma20":
      return [null, "flat"];
    case "bbPctB":
      return v > 1 ? ["Above upper", "up"] : v < 0 ? ["Below lower", "down"] : ["Inside", "flat"];
    case "volRatio":
      return v >= 1.5 ? ["High", "flat"] : v <= 0.7 ? ["Low", "flat"] : ["Normal", "flat"];
    case "cmf20":
      return v > 0.05 ? ["Near highs", "up"] : v < -0.05 ? ["Near lows", "down"] : ["Neutral", "flat"];
    case "trendPct":
      return v >= 80 ? ["Top fifth", "up"] : v <= 20 ? ["Bottom fifth", "down"] : ["Middle", "flat"];
    case "fromHigh52":
      return v <= 5 ? ["Near high", "up"] : [null, "flat"];
    case "fromLow52":
      return v <= 5 ? ["Near low", "down"] : [null, "flat"];
    case "mansfield":
      return v > 0 ? ["Above zero", "up"] : ["Below zero", "down"];
    case "beta252":
    case "hv60":
    case "atrPct":
    case "bbWidth":
    case "bbWidthLow126":
    case "gap":
      return [null, "flat"];
  }
  if (def.kind === "pct" || def.kind === "macdh" || def.kind === "force" || def.kind === "power") return v > 0 ? ["Up", "up"] : v < 0 ? ["Down", "down"] : [null, "flat"];
  return [null, "flat"];
}

/**
 * Every catalogue metric on the last close. `trendNow`: the stock's Trend percentile as every other
 * page shows it (the company table's 1Y return, ranked), so this reading matches them; the backtest's
 * day-by-day Trend comes from the price store and can differ by a point or two.
 */
export function readingsNow(mx: Metrics, trendNow?: number | null, only?: string[]): Reading[] {
  const last = mx.ctx.bars.c.length - 1;
  const at = (id: string) => (mx.unavailable(id) ? null : (mx.get(id)[last] ?? null));
  return (only ? METRICS.filter((m) => only.includes(m.id)) : METRICS).map((def) => {
    if (def.id === "trendPct" && trendNow !== undefined) {
      if (trendNow == null) return { id: def.id, value: null, state: "Too new", tone: "flat" as Tone, unavailable: null };
      const [state, tone] = stateOf(def, trendNow, at);
      return { id: def.id, value: trendNow, state, tone, unavailable: null };
    }
    if (mx.notLoaded(def.id)) return { id: def.id, value: null, state: "When used", tone: "flat" as Tone, unavailable: null };
    const unavailable = mx.unavailable(def.id);
    if (unavailable) return { id: def.id, value: null, state: null, tone: "flat" as Tone, unavailable };
    const value = at(def.id);
    if (value == null) return { id: def.id, value: null, state: "Too new", tone: "flat" as Tone, unavailable: null };
    const [state, tone] = stateOf(def, value, at);
    return { id: def.id, value, state, tone, unavailable: null };
  });
}

/** The readings the basket heatmap shows for each stock, left to right. */
export const HEAT_IDS = ["sma200", "macd", "adx", "supertrend", "rsi14", "bbPctB", "volRatio", "rsNifty63", "trendPct"];
