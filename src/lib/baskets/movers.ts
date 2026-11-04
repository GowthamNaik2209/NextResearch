// The landing page's "Top movers": the covered companies that rose and fell most over each period
// of the Baskets page's menu (periods.ts, 1D to 3Y). Pure (tested in movers.test.ts); movers-data.ts
// feeds it each trading day's closes from the price store and caches the result for the day.
import type { ChartRange, PricePoint } from "@/lib/live/yahoo";
import { PERIODS, PERIOD_SRC, benchWindow, cutTo, onWindow, type Period } from "./periods";

/** One covered company with its return over each period (missing where its history can't say). */
export type MoverInput = {
  ticker: string;
  name: string;
  /** Its home industry's name (where the company's strongest link is). */
  industry: string;
  /** Its strongest-linked live industry (category "sector") and live policy, by name; absent when it is in none. */
  sector?: string;
  policy?: string;
  /** Why its latest results are marked one-off (./outliers.ts detectOutlier), absent when they aren't. Still
   * ranked (no covered company is left out of the movers); the row carries a "one-off" tag. */
  oneOff?: string;
  ret: Partial<Record<Period, number | null>>;
};
export type Mover = { ticker: string; name: string; industry: string; ret: number; oneOff?: string };
/** A period's lists; `ranked` is how many companies had a figure for it. */
export type PeriodMovers = { gainers: Mover[]; losers: Mover[]; ranked: number };
/** Per period its lists, or null while too few companies have a figure for it (shown as "updating"). */
export type MoversByPeriod = Record<Period, PeriodMovers | null>;

/** The landing page's All / Industries / Policies filter: which companies the movers rank. */
export type MoverFilter = "all" | "sector" | "policy";
export const MOVER_FILTERS: MoverFilter[] = ["all", "sector", "policy"];

/** Ranked per list on the server; the landing page shows the first MOVERS_SHOWN and "Show more" the rest. */
export const MOVERS_N = 20;
export const MOVERS_SHOWN = 5;
// Below this share of companies with a figure, a period's lists would rank whoever loaded, not the
// market: the period shows "updating" instead.
export const MIN_MOVER_COVERAGE = 0.6;

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
// Equal moves: A to Z by name, then ticker, so the lists never reshuffle between renders.
const byName = (a: Mover, b: Mover) => a.name.localeCompare(b.name) || a.ticker.localeCompare(b.ticker);

/**
 * The top `n` gainers (rose, biggest first) and losers (fell, biggest fall first) for every period.
 * Every company is ranked, one-off ones too (tagged); a ticker listed twice counts once (its first entry); a company
 * with no figure for a period sits that period out; a flat 0% is neither a gainer nor a loser.
 */
export function rankMovers(rows: MoverInput[], n = MOVERS_N, minCoverage = MIN_MOVER_COVERAGE): MoversByPeriod {
  const seen = new Set<string>();
  const pool = rows.filter((r) => {
    if (seen.has(r.ticker)) return false;
    seen.add(r.ticker);
    return true;
  });
  const out = {} as MoversByPeriod;
  for (const p of PERIODS) {
    const all = pool.flatMap((r): Mover[] =>
      finite(r.ret[p]) ? [{ ticker: r.ticker, name: r.name, industry: r.industry, ret: r.ret[p]!, ...(r.oneOff ? { oneOff: r.oneOff } : {}) }] : [],
    );
    if (!pool.length || all.length < pool.length * minCoverage) {
      out[p] = null;
      continue;
    }
    const gainers = all.filter((m) => m.ret > 0).sort((a, b) => b.ret - a.ret || byName(a, b)).slice(0, n);
    const losers = all.filter((m) => m.ret < 0).sort((a, b) => a.ret - b.ret || byName(a, b)).slice(0, n);
    out[p] = { gainers, losers, ranked: all.length };
  }
  return out;
}

/**
 * The movers under each filter: "all" ranks every covered company (tagged with its home industry),
 * "sector" only those in a live industry and "policy" only those in a live policy, each row tagged
 * with its industry or policy of that kind. Coverage is counted within each filter's own companies.
 */
export function rankMoversByFilter(rows: MoverInput[], n = MOVERS_N, minCoverage = MIN_MOVER_COVERAGE): Record<MoverFilter, MoversByPeriod> {
  const only = (kind: "sector" | "policy") => rows.flatMap((r) => (r[kind] ? [{ ...r, industry: r[kind]! }] : []));
  return { all: rankMovers(rows, n, minCoverage), sector: rankMovers(only("sector"), n, minCoverage), policy: rankMovers(only("policy"), n, minCoverage) };
}

// A history starting more than this many days after a period's first day (a recent listing) doesn't
// cover the period: its "3Y" would be its return since listing. Weekly bars are dated at the week's start.
const COVER_SLACK_DAYS = 10;
const DAY_MS = 86_400_000;

/**
 * A stock's return over each period, %, from its closes per source range (PERIOD_SRC) and the
 * Nifty 50's: measured over the period's fixed window (periods.ts benchWindow, the same first and
 * last day the industry heatmap's figures use; 1D is the last close against the one before), or its
 * own series cut to the period without a benchmark. Missing where it has no closes or doesn't cover the window.
 */
export function stockPeriodReturns(
  charts: Partial<Record<ChartRange, PricePoint[] | null>>,
  bench: Partial<Record<ChartRange, PricePoint[] | null>>,
): Partial<Record<Period, number>> {
  const out: Partial<Record<Period, number>> = {};
  for (const p of PERIODS) {
    const { range } = PERIOD_SRC[p];
    const pts = charts[range];
    if (!pts || pts.length < 2) continue;
    const b = bench[range];
    const win = b && b.length >= 2 ? benchWindow(b, p) : cutTo(pts, p);
    if (win.length < 2) continue;
    if (Date.parse(pts[0].t) > Date.parse(win[0].t) + COVER_SLACK_DAYS * DAY_MS) continue;
    const line = b && b.length >= 2 ? onWindow(pts, win) : win;
    const first = line[0].c;
    const last = line[line.length - 1].c;
    if (first > 0 && Number.isFinite(last)) out[p] = (last / first - 1) * 100;
  }
  return out;
}

/** A module's stocks that rose over a period: `up` of the `n` with a figure, of `m` listed in all. */
export type UpShare = { up: number; n: number; m: number };

/**
 * Per period and module (industry or policy), how many of its covered listed stocks rose: a return
 * above zero, counted over the stocks with a figure for that period only (a flat 0% isn't up). A
 * module with no stock figures for a period is left out of that period.
 */
export function shareUp(modules: { slug: string; tickers: string[] }[], returns: Record<string, Partial<Record<Period, number | null>>>): Record<Period, Record<string, UpShare>> {
  const out = {} as Record<Period, Record<string, UpShare>>;
  for (const p of PERIODS) {
    out[p] = {};
    for (const mod of modules) {
      const tickers = [...new Set(mod.tickers)];
      const vals = tickers.map((t) => returns[t]?.[p]).filter(finite);
      if (vals.length) out[p][mod.slug] = { up: vals.filter((v) => v > 0).length, n: vals.length, m: tickers.length };
    }
  }
  return out;
}
