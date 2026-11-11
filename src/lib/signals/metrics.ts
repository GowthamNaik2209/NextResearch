// The indicators a signal rule can use (docs/SIGNALS.md section 2). Pure: shared by the rule builder,
// the API's validation and the engine. `kind` says what a metric can be compared with: two metrics
// of the same kind (a price level with a price level, %K with %D), or a number for any kind.

export type MetricGroup = "Trend" | "Momentum" | "Volatility" | "Volume" | "Levels" | "Relative";

export type MetricKind =
  | "price" // a price level in rupees
  | "macd"
  | "macdh"
  | "osc" // 0 to 100 (RSI, ADX, MFI, Stochastic RSI, Trend percentile)
  | "di"
  | "aroon"
  | "stoch"
  | "willr" // −100 to 0
  | "cci"
  | "pct" // a percentage or percentage points
  | "pctb" // Bollinger %B, 0 at the lower band, 1 at the upper
  | "ratio" // volume ÷ its average
  | "obv"
  | "cmf"
  | "mansfield"
  | "beta";

/** What a metric needs beyond daily closes: the day's open/high/low, its volume, or every covered stock's closes. */
export type MetricNeed = "hl" | "vol" | "panel";

export type MetricDef = { id: string; label: string; group: MetricGroup; kind: MetricKind; needs?: MetricNeed[]; note: string };

const M = (id: string, label: string, group: MetricGroup, kind: MetricKind, note: string, needs?: MetricNeed[]): MetricDef => ({ id, label, group, kind, note, ...(needs ? { needs } : {}) });

export const METRICS: MetricDef[] = [
  M("close", "Price", "Trend", "price", "The day's close."),
  M("sma20", "SMA 20", "Trend", "price", "Average of the last 20 closes."),
  M("sma50", "SMA 50", "Trend", "price", "Average of the last 50 closes."),
  M("sma100", "SMA 100", "Trend", "price", "Average of the last 100 closes."),
  M("sma200", "SMA 200", "Trend", "price", "Average of the last 200 closes: the usual long-term trend line."),
  M("ema9", "EMA 9", "Trend", "price", "Exponential average of the closes, 9 days: recent days count more."),
  M("ema21", "EMA 21", "Trend", "price", "Exponential average of the closes, 21 days."),
  M("ema50", "EMA 50", "Trend", "price", "Exponential average of the closes, 50 days."),
  M("macd", "MACD line 12,26", "Trend", "macd", "EMA 12 less EMA 26: above zero when the short trend is above the long one."),
  M("macdSignal", "MACD signal 9", "Trend", "macd", "EMA 9 of the MACD line; the line crossing it is the usual MACD signal."),
  M("macdHist", "MACD histogram", "Trend", "macdh", "MACD line less its signal: above zero while the line is above the signal."),
  M("adx", "ADX 14", "Trend", "osc", "Trend strength, 0 to 100, either way: above 25 is usually read as trending.", ["hl"]),
  M("pdi", "+DI 14", "Trend", "di", "Upward directional movement; +DI above −DI means up moves lead.", ["hl"]),
  M("mdi", "−DI 14", "Trend", "di", "Downward directional movement.", ["hl"]),
  M("supertrend", "Supertrend 10,3", "Trend", "price", "A trailing line 3 × ATR 10 from the price; it flips side when the price closes through it.", ["hl"]),
  M("psar", "Parabolic SAR", "Trend", "price", "A trailing stop line that speeds up as a trend runs (0.02 step, 0.2 most).", ["hl"]),
  M("tenkan", "Ichimoku Tenkan 9", "Trend", "price", "Midpoint of the 9-day high and low.", ["hl"]),
  M("kijun", "Ichimoku Kijun 26", "Trend", "price", "Midpoint of the 26-day high and low.", ["hl"]),
  M("cloudTop", "Ichimoku cloud top", "Trend", "price", "Upper edge of the cloud plotted for today (worked out 26 days ago).", ["hl"]),
  M("cloudBottom", "Ichimoku cloud bottom", "Trend", "price", "Lower edge of the cloud plotted for today.", ["hl"]),
  M("aroonUp", "Aroon up 25", "Trend", "aroon", "100 on a day that makes a 25-day high, falling as the high gets older.", ["hl"]),
  M("aroonDown", "Aroon down 25", "Trend", "aroon", "100 on a day that makes a 25-day low.", ["hl"]),

  M("rsi14", "RSI 14", "Momentum", "osc", "Wilder's relative strength, 0 to 100: above 70 is usually read as overbought, below 30 oversold."),
  M("stochK", "Stochastic %K 14,3", "Momentum", "stoch", "Where the close sits in the 14-day range, smoothed over 3 days, 0 to 100.", ["hl"]),
  M("stochD", "Stochastic %D 3", "Momentum", "stoch", "3-day average of %K.", ["hl"]),
  M("stochRsi", "Stochastic RSI 14", "Momentum", "osc", "Where RSI 14 sits in its own 14-day range, 0 to 100."),
  M("willr", "Williams %R 14", "Momentum", "willr", "Where the close sits in the 14-day range, −100 (low) to 0 (high).", ["hl"]),
  M("cci20", "CCI 20", "Momentum", "cci", "How far the typical price is from its 20-day average, in mean deviations; ±100 are the usual lines.", ["hl"]),
  M("roc21", "Return 1M", "Momentum", "pct", "Change over the last 21 trading days, %."),
  M("roc63", "Return 3M", "Momentum", "pct", "Change over the last 63 trading days, %."),
  M("roc126", "Return 6M", "Momentum", "pct", "Change over the last 126 trading days, %."),
  M("roc252", "Return 12M", "Momentum", "pct", "Change over the last 252 trading days, %."),
  M("mom12_1", "Momentum 12-1", "Momentum", "pct", "Return from 12 months ago to 1 month ago, %: the momentum measure that ranked covered stocks best."),

  M("bbUpper", "Bollinger upper 20,2", "Volatility", "price", "SMA 20 plus 2 standard deviations of the closes."),
  M("bbMid", "Bollinger middle 20", "Volatility", "price", "SMA 20."),
  M("bbLower", "Bollinger lower 20,2", "Volatility", "price", "SMA 20 less 2 standard deviations."),
  M("bbPctB", "Bollinger %B", "Volatility", "pctb", "Where the close sits between the bands: 0 at the lower, 1 at the upper."),
  M("bbWidth", "Bollinger width", "Volatility", "pct", "Band width as % of the middle: a low width is a squeeze."),
  M("atrPct", "ATR 14 %", "Volatility", "pct", "Average true range over 14 days, as % of the close.", ["hl"]),
  M("kcUpper", "Keltner upper 20", "Volatility", "price", "EMA 20 plus 2 × ATR 10.", ["hl"]),
  M("kcLower", "Keltner lower 20", "Volatility", "price", "EMA 20 less 2 × ATR 10.", ["hl"]),
  M("hv60", "Historical volatility 60D", "Volatility", "pct", "Standard deviation of daily returns over 60 days, a year's worth, %."),

  M("volRatio", "Volume vs 20D average", "Volume", "ratio", "The day's volume ÷ its 20-day average.", ["vol"]),
  M("obv", "OBV", "Volume", "obv", "On-balance volume: the day's volume added on up days, taken off on down days.", ["vol"]),
  M("obvSma20", "OBV 20D average", "Volume", "obv", "20-day average of OBV.", ["vol"]),
  M("mfi14", "Money flow index 14", "Volume", "osc", "RSI weighted by volume, 0 to 100.", ["hl", "vol"]),
  M("cmf20", "Chaikin money flow 20", "Volume", "cmf", "Volume-weighted position of closes in their daily ranges, −1 to 1: above 0 is closes near the highs.", ["hl", "vol"]),
  M("vwap20", "VWAP 20D", "Volume", "price", "Volume-weighted average typical price over 20 days.", ["hl", "vol"]),

  M("high52", "52W high", "Levels", "price", "Highest high of the 52 weeks before the day: a close above it is a new 52-week high."),
  M("low52", "52W low", "Levels", "price", "Lowest low of the 52 weeks before the day."),
  M("fromHigh52", "% below 52W high", "Levels", "pct", "How far the close is below the 52-week high, %."),
  M("fromLow52", "% above 52W low", "Levels", "pct", "How far the close is above the 52-week low, %."),
  M("dch20", "20D high", "Levels", "price", "Highest high of the 20 days before the day (Donchian): a close above is a breakout."),
  M("dch55", "55D high", "Levels", "price", "Highest high of the 55 days before the day."),
  M("dcl20", "20D low", "Levels", "price", "Lowest low of the 20 days before the day."),
  M("gap", "Gap at open", "Levels", "pct", "The open against the day before's close, %.", ["hl"]),
  M("pivot", "Pivot (classic)", "Levels", "price", "The day before's high, low and close averaged.", ["hl"]),
  M("r1", "Pivot R1", "Levels", "price", "2 × pivot less the day before's low.", ["hl"]),
  M("s1", "Pivot S1", "Levels", "price", "2 × pivot less the day before's high.", ["hl"]),

  M("trendPct", "Trend percentile", "Relative", "osc", "The past-year return ranked among covered stocks that day, 1 to 99.", ["panel"]),
  M("rsNifty63", "RS vs Nifty 50 3M", "Relative", "pct", "3-month return less the Nifty 50's, percentage points."),
  M("rsInd63", "RS vs industry 3M", "Relative", "pct", "3-month return less its industry's median covered stock, percentage points.", ["panel"]),
  M("mansfield", "Mansfield RS", "Relative", "mansfield", "Price ÷ Nifty 50 against its own 52-week average, %: above 0 is outperforming lately."),
  M("beta252", "Beta 1Y", "Relative", "beta", "Sensitivity to the Nifty 50 over the last year of daily returns."),
];

export const METRIC_BY_ID: ReadonlyMap<string, MetricDef> = new Map(METRICS.map((m) => [m.id, m]));
export const GROUPS: MetricGroup[] = ["Trend", "Momentum", "Volatility", "Volume", "Levels", "Relative"];

/** What a stock's data lacks: no open/high/low (Screener-priced), no volume at all. */
export type DataGaps = { hl: boolean; vol: boolean };

/** Why a metric can't be worked out for a stock, or null when it can. */
export function unavailableReason(def: MetricDef, gaps: DataGaps): string | null {
  if (def.needs?.includes("hl") && gaps.hl) return "needs the day's high and low, which this stock's prices don't have";
  if (def.needs?.includes("vol") && gaps.vol) return "needs volume, which this stock's prices don't have";
  return null;
}

/** A sensible first number for a metric compared with a number (the rule builder's default, and the readings' "+"). */
export function defaultLevel(kind: MetricKind): number {
  switch (kind) {
    case "osc":
    case "stoch":
    case "aroon":
      return 50;
    case "willr":
      return -50;
    case "pctb":
      return 0.5;
    case "ratio":
      return 1.5;
    case "beta":
      return 1;
    default:
      return 0;
  }
}

/** Each group as the question it answers: the indicator picker's headings. */
export const GROUP_QUESTION: Record<MetricGroup, string> = {
  Trend: "Is it trending?",
  Momentum: "Is it stretched, or gaining speed?",
  Volatility: "How wide are the swings?",
  Volume: "Is volume backing the move?",
  Levels: "Is it near a high or a low?",
  Relative: "Is it beating the market?",
};
