// Backtest of a basket over a chart range: bought once on the first day at the target weights
// and held (not rebalanced), so each stock's share drifts with its price - what an investor who
// bought the basket that day would hold now. Price change only: dividends are not added back.
// Pure (no fetching), so it is unit-tested on its own.
export type PricePoint = { t: string; c: number };

export type BacktestHolding = {
  ticker: string;
  /** Share of the basket on the first day (0-1). */
  weight: number;
  /** Share of the basket on the last day, after the price moves (0-1). */
  endWeight: number;
  /** The stock's own price change over the period, % */
  ret: number;
  /** Percentage points of the basket's return this stock accounts for (they sum to the basket's return). */
  contribution: number;
};

/** Left out: no prices, listed mid-period ("late"), or set to 0% in a custom weighting ("zero"). */
export type BacktestExcluded = { ticker: string; reason: "no-data" | "late" | "zero"; from?: string };

export type BacktestResult = {
  /** Basket value, 100 on the first day. */
  points: PricePoint[];
  holdings: BacktestHolding[];
  excluded: BacktestExcluded[];
};

const DAY = 86_400_000;

export type BacktestInput = { ticker: string; weight: number; points: PricePoint[] | null };
export type HeldInput = { ticker: string; weight: number; points: PricePoint[] };

/**
 * The stocks a backtest can hold from day one, and the rest with the reason: no price data, or a
 * history that starts more than `slackDays` after the earliest one (listed mid-period).
 */
export function splitHeld(input: BacktestInput[], slackDays: number): { held: HeldInput[]; excluded: BacktestExcluded[] } {
  const excluded: BacktestExcluded[] = [];
  const withData = input.filter((s) => {
    const ok = !!s.points && s.points.length > 1 && s.weight > 0;
    if (!ok) excluded.push({ ticker: s.ticker, reason: s.weight === 0 && s.points && s.points.length > 1 ? "zero" : "no-data" });
    return ok;
  }) as HeldInput[];
  if (!withData.length) return { held: [], excluded };
  const start = withData.reduce((m, s) => (s.points[0].t < m ? s.points[0].t : m), withData[0].points[0].t);
  const held = withData.filter((s) => {
    const late = Date.parse(s.points[0].t) - Date.parse(start) > slackDays * DAY;
    if (late) excluded.push({ ticker: s.ticker, reason: "late", from: s.points[0].t });
    return !late;
  });
  return { held, excluded };
}

/**
 * @param input each stock's target weight (any positive scale) and its closes, oldest first
 * @param slackDays a stock whose history starts more than this long after the earliest one
 *   (listed mid-period) can't have been bought on day one, so it is left out and reported
 */
export function runBacktest(input: BacktestInput[], slackDays: number): BacktestResult {
  const { held, excluded } = splitHeld(input, slackDays);
  if (!held.length) return { points: [], holdings: [], excluded };
  const total = held.reduce((n, s) => n + s.weight, 0);

  // Walk the union of trading dates, carrying each stock's last close forward over days it has
  // no bar (a holiday on one exchange, a suspended day). Before a stock's first bar (a few days'
  // slack at most) it counts at its first close, i.e. flat.
  const dates = [...new Set(held.flatMap((s) => s.points.map((p) => p.t)))].sort();
  const cursor = held.map(() => 0);
  const base = held.map((s) => s.points[0].c);
  const points: PricePoint[] = [];
  let lastRel: number[] = held.map(() => 1);
  for (const t of dates) {
    let value = 0;
    lastRel = held.map((s, i) => {
      while (cursor[i] + 1 < s.points.length && s.points[cursor[i] + 1].t <= t) cursor[i]++;
      const rel = s.points[cursor[i]].c / base[i];
      value += (s.weight / total) * rel;
      return rel;
    });
    points.push({ t, c: value * 100 });
  }

  const endValue = points[points.length - 1].c / 100;
  const holdings = held.map((s, i) => {
    const w = s.weight / total;
    return {
      ticker: s.ticker,
      weight: w,
      endWeight: (w * lastRel[i]) / endValue,
      ret: (lastRel[i] - 1) * 100,
      contribution: w * (lastRel[i] - 1) * 100,
    };
  });
  return { points, holdings, excluded };
}

/** Weights for a basket: equal, or by market cap (a stock with no figure gets the median cap). */
export function basketWeights(stocks: { ticker: string; mcapCr: number | null }[], scheme: "equal" | "mcap"): Map<string, number> {
  if (scheme === "equal") return new Map(stocks.map((s) => [s.ticker, 1]));
  const known = stocks.map((s) => s.mcapCr).filter((v): v is number => v != null && v > 0).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  return new Map(stocks.map((s) => [s.ticker, s.mcapCr && s.mcapCr > 0 ? s.mcapCr : median]));
}
