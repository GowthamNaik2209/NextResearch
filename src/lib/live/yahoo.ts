// Quotes, price history and a fallback set of fundamentals from Yahoo Finance via
// the `yahoo-finance2` library (handles Yahoo's cookie/crumb auth and response
// validation, which our own fetch calls didn't). NSE prices on Yahoo are ~15 min
// delayed. Degrades to Screener's price chart if Yahoo has no data for a symbol.
import YahooFinance from "yahoo-finance2";
import { cached } from "./cache";
import { isFreshQuote, MAX_QUOTE_AGE_DAYS } from "./freshness";
import type { Fundamentals } from "./screener-company";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"], validation: { logErrors: false } });
// Yahoo occasionally returns a shape the library's schema rejects (symbol-specific);
// the fields we read are all individually optional, so don't fail the whole call.
const LENIENT = { validateResult: false } as const;
// ...which also makes the library return `unknown`, so type just what we read.
type Split = { date?: Date | string; numerator?: number; denominator?: number };
type ChartRes = { quotes: { date: Date; close?: number | null }[]; events?: { splits?: Split[] } };
type SummaryRes = { assetProfile?: { sector?: string; industry?: string }; financialData?: { returnOnEquity?: number } };

export type ChartRange = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";
export type PricePoint = { t: string; c: number }; // t = YYYY-MM-DD (IST)
export type Exchange = "NSE" | "BSE";
export type Quote = {
  price: number;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string;
  asOf: string;
  delayedMin: number | null;
  /** The Yahoo symbol that answered (e.g. EMBASSY-RR.NS) and its exchange, for the label. */
  symbol: string;
  exchange: Exchange;
};
export type ChartData = { range: ChartRange; points: PricePoint[]; source: "yahoo" | "screener"; exchange?: Exchange };

// yahoo-finance2 calls have no deadline of their own, and a hung one would sit in cache.ts's
// in-flight map forever, hanging every later request for that ticker (seen with TEJASNET).
const TIMEOUT_MS = 8000;
function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("yahoo timeout")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const DAY = 86_400_000;

// Interval chosen so each range lands at a few hundred points: enough detail,
// small payload. (MAX uses monthly: decades of daily bars aren't useful here.)
const PARAMS: Record<ChartRange, { days: number | null; interval: "1d" | "1wk" | "1mo" }> = {
  "1M": { days: 31, interval: "1d" },
  "6M": { days: 183, interval: "1d" },
  "1Y": { days: 366, interval: "1d" },
  "3Y": { days: 1100, interval: "1wk" },
  "5Y": { days: 1830, interval: "1wk" },
  MAX: { days: null, interval: "1mo" },
};

export function isChartRange(v: string | null): v is ChartRange {
  return v === "1M" || v === "6M" || v === "1Y" || v === "3Y" || v === "5Y" || v === "MAX";
}

// Yahoo symbols to try for an NSE ticker, best first. Yahoo keeps serving a *frozen* quote for
// some delisted-and-relisted series: every Indian REIT's plain `.NS` symbol answers with a July
// 2024 price (the units moved to NSE's "RR" series, which Yahoo lists as `<T>-RR.NS`), and newer
// REITs (KRT, BAGMANE) have no plain `.NS` symbol at all. NSE Emerge (SME) stocks have the same
// problem with their "SM" series (`<T>-SM.NS`). So a quote is only accepted when it is fresh
// (see isFreshQuote), and otherwise we fall through to those series and then to BSE.
// Charts need history, which the RR symbols lack (they start at the series switch), so charts
// try `.NS`, the SME series, then `.BO`, and accept the first series that is itself up to date.
// (Checked against every listed ticker in the content, Oct 2026 - see the audit in the PR notes.)
// Content tickers that aren't the company's exchange symbol: ADC India (formerly Krone
// Communications) is BSE-only as ADCINDIA; Screener still resolves the content ticker.
const YAHOO_ALIAS: Record<string, string> = { KRONECOMM: "ADCINDIA.BO" };
const withAlias = (ticker: string, list: string[]) => (YAHOO_ALIAS[ticker] ? [YAHOO_ALIAS[ticker], ...list] : list);
const quoteSymbols = (ticker: string) => withAlias(ticker, [`${ticker}.NS`, `${ticker}-RR.NS`, `${ticker}-SM.NS`, `${ticker}.BO`]);
const chartSymbols = (ticker: string) => withAlias(ticker, [`${ticker}.NS`, `${ticker}-SM.NS`, `${ticker}.BO`]);
const exchangeOf = (symbol: string): Exchange => (symbol.endsWith(".BO") ? "BSE" : "NSE");
// The symbol that last gave a fresh quote/chart, tried first next time so a REIT doesn't cost
// three upstream calls per refresh. Per server instance; a miss just re-walks the list.
const resolved = new Map<string, string>();
const ordered = (ticker: string, kind: "q" | "c", list: string[]) => {
  const hit = resolved.get(`${kind}:${ticker}`);
  return hit && list.includes(hit) ? [hit, ...list.filter((s) => s !== hit)] : list;
};

// Exchange-local (IST) calendar day, so a bar never lands on the previous date.
const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

async function yahooChart(ticker: string, range: ChartRange): Promise<ChartData | null> {
  // An up-to-date symbol can still hold only weeks of history (SIKA/TANAA/SPELS on `.NS` start
  // Aug 2026 while `.BO` goes back years), so a short one is kept as a fallback and the next
  // symbol is tried for the full range.
  // "All" has no fixed start; a series under three years old is treated as short there too.
  const days = PARAMS[range].days ?? 1100;
  let best: { symbol: string; data: ChartData } | null = null;
  for (const symbol of ordered(ticker, "c", chartSymbols(ticker))) {
    const data = await yahooChartFor(symbol, range).catch(() => null);
    // A frozen symbol's history ends where it froze. Weekly/monthly bars are dated at the start
    // of their period, so allow that much extra slack for 3Y/MAX.
    const lastT = data?.points[data.points.length - 1]?.t;
    const slackDays = MAX_QUOTE_AGE_DAYS + (range === "MAX" ? 31 : range === "3Y" || range === "5Y" ? 7 : 0);
    if (!data || !lastT || Date.now() - Date.parse(lastT) > slackDays * DAY) continue;
    const firstT = data.points[0].t;
    if (Date.parse(firstT) - (Date.now() - days * DAY) <= 45 * DAY) {
      resolved.set(`c:${ticker}`, symbol);
      return data;
    }
    if (!best || firstT < best.data.points[0].t) best = { symbol, data };
  }
  if (best) resolved.set(`c:${ticker}`, best.symbol);
  return best?.data ?? null;
}

// Yahoo lists some Indian splits without adjusting the prices before them (BONDADA 5:1,
// PARAS 2:1), and dates the event up to ~6 months away from the actual drop. So for each
// listed split, find the bar-to-bar fall near its date that matches its ratio and scale
// everything before it. No matching fall means Yahoo already adjusted, and nothing changes.
// Weekly/monthly bars mix pre- and post-split days, so they get a looser match.
const SPLIT_WINDOW_DAYS = 240;
function adjustSplits(points: PricePoint[], splits: Split[], coarse: boolean) {
  const tolerance = coarse ? 0.3 : 0.15;
  for (const sp of splits) {
    const r = (sp.numerator ?? 0) / (sp.denominator || 1);
    const on = sp.date ? new Date(sp.date).getTime() : NaN;
    if (!Number.isFinite(r) || r <= 0 || r === 1 || !Number.isFinite(on)) continue;
    let at = -1;
    let miss = Infinity;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(Date.parse(points[i].t) - on) > SPLIT_WINDOW_DAYS * DAY) continue;
      const m = Math.abs((points[i].c / points[i - 1].c) * r - 1);
      if (m < miss) [at, miss] = [i, m];
    }
    if (at > 0 && miss < tolerance) for (let i = 0; i < at; i++) points[i].c /= r;
  }
}

async function yahooChartFor(symbol: string, range: ChartRange): Promise<ChartData | null> {
  const p = PARAMS[range];
  const res = (await withTimeout(
    yf.chart(symbol, { period1: p.days ? new Date(Date.now() - p.days * DAY) : new Date("1990-01-01"), interval: p.interval, events: "split" }, LENIENT),
  )) as ChartRes;
  const points: PricePoint[] = [];
  for (const q of res.quotes) {
    if (q.close == null || !Number.isFinite(q.close)) continue;
    const t = istDay(q.date);
    // Weekly/monthly bars can repeat the in-progress period's date; keep the last.
    if (points.length && points[points.length - 1].t === t) points[points.length - 1].c = q.close;
    else points.push({ t, c: q.close });
  }
  if (res.events?.splits?.length) adjustSplits(points, res.events.splits, p.interval !== "1d");
  return points.length >= 2 ? { range, points, source: "yahoo", exchange: exchangeOf(symbol) } : null;
}

const SCREENER_DAYS: Record<ChartRange, number> = { "1M": 31, "6M": 183, "1Y": 366, "3Y": 1100, "5Y": 1830, MAX: 3650 };

async function screenerChart(companyId: string, range: ChartRange): Promise<ChartData | null> {
  const url = `https://www.screener.in/api/company/${companyId}/chart/?q=Price&days=${SCREENER_DAYS[range]}&consolidated=true`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const values: [string, string][] | undefined = json?.datasets?.find((d: { metric: string }) => d.metric === "Price")?.values;
  const points = (values ?? []).map(([t, c]) => ({ t, c: parseFloat(c) })).filter((p) => Number.isFinite(p.c));
  return points.length > 1 ? { range, points, source: "screener" } : null;
}

const chartTtl = (range: ChartRange) => (range === "MAX" || range === "3Y" || range === "5Y" ? 60 * 60 * 1000 : 5 * 60 * 1000);

/** History for one fixed Yahoo symbol (an index such as ^NSEI, or an ETF standing in for one). */
export async function getSymbolChart(symbol: string, range: ChartRange): Promise<ChartData | null> {
  return cached(`symchart4:${symbol}:${range}`, chartTtl(range), () => yahooChartFor(symbol, range).catch(() => null));
}

// Corporate actions that make earlier prices a different security: history starts after them.
// Tata Motors' demerger (14 Oct 2025) split off the commercial-vehicle arm; the listed
// passenger-vehicle company (TMPV) is not comparable with the pre-demerger stock.
const HISTORY_FROM: Record<string, string> = { TMPV: "2025-10-14" };

export async function getChart(ticker: string, range: ChartRange, screenerCompanyId?: string | null): Promise<ChartData | null> {
  const data = await getRawChart(ticker, range, screenerCompanyId);
  const from = HISTORY_FROM[ticker];
  if (!data || !from) return data;
  const points = data.points.filter((p) => p.t >= from);
  return points.length >= 2 ? { ...data, points } : null;
}

async function getRawChart(ticker: string, range: ChartRange, screenerCompanyId?: string | null): Promise<ChartData | null> {
  // 5 min for short ranges (they show recent movement), longer for coarse ones.
  const ttl = chartTtl(range);
  // The Screener fallback gets its own key: the plain key may hold a (briefly cached) null
  // from Yahoo, which would otherwise short-circuit the retry with a Screener id.
  return cached(`chart4:${ticker}:${range}:${screenerCompanyId ?? "yahoo"}`, ttl, async () => {
    try {
      const y = await yahooChart(ticker, range);
      if (y) return y;
    } catch {}
    try {
      if (screenerCompanyId) return await screenerChart(screenerCompanyId, range);
    } catch {}
    return null;
  });
}

async function quoteFor(symbol: string): Promise<Quote | null> {
  const q = await withTimeout(yf.quote(symbol, {}, LENIENT));
  // No timestamp = can't tell live from frozen, so don't claim it is live.
  if (typeof q?.regularMarketPrice !== "number" || !q.regularMarketTime) return null;
  return {
    price: q.regularMarketPrice,
    prevClose: q.regularMarketPreviousClose ?? null,
    change: q.regularMarketChange ?? null,
    changePct: q.regularMarketChangePercent ?? null,
    currency: q.currency ?? "INR",
    asOf: new Date(q.regularMarketTime).toISOString(),
    delayedMin: q.exchangeDataDelayedBy ?? null,
    symbol,
    exchange: exchangeOf(symbol),
  };
}

/** Latest fresh quote across the ticker's Yahoo symbols, or null (the UI then shows the seed price, labelled cached). */
export async function getQuote(ticker: string): Promise<Quote | null> {
  return cached(`quote:${ticker}`, 60 * 1000, async () => {
    // Only remember a fallback symbol when the ones before it answered (stale / no data), not
    // when they merely errored - a rate-limited `.NS` must not pin a stock to BSE.
    let errored = false;
    for (const symbol of ordered(ticker, "q", quoteSymbols(ticker))) {
      const q = await quoteFor(symbol).catch(() => {
        errored = true;
        return null;
      });
      if (q && isFreshQuote(q.asOf)) {
        if (!errored) resolved.set(`q:${ticker}`, symbol);
        return q;
      }
    }
    return null;
  });
}

const CR = 1e7; // Yahoo reports INR; Indian convention here is ₹ Crore
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fallback when Screener.in is unreachable: Yahoo's headline ratios + annual
// financials. No ROCE, shareholding or industry medians (Yahoo doesn't carry them
// for Indian stocks), so those parts of the UI stay empty and say so.
export async function getYahooFundamentals(ticker: string): Promise<Fundamentals | null> {
  return cached(`yfund:${ticker}`, 6 * 60 * 60 * 1000, async () => {
    try {
      // Same symbol as the quote, so a REIT doesn't read a frozen `.NS` record.
      const live = await getQuote(ticker);
      const symbol = live?.symbol ?? `${ticker}.NS`;
      const [rawQ, profile, ts] = await Promise.all([
        withTimeout(yf.quote(symbol, {}, LENIENT)).catch(() => null),
        withTimeout(yf.quoteSummary(symbol, { modules: ["assetProfile", "financialData"] }, LENIENT) as Promise<SummaryRes>).catch(() => null),
        withTimeout(yf.fundamentalsTimeSeries(symbol, { period1: new Date(Date.now() - 6 * 365 * DAY), type: "annual", module: "all" }, LENIENT)).catch(() => []),
      ]);
      // A frozen symbol's price/market cap/52-week range are as stale as its quote.
      const q = rawQ && isFreshQuote(rawQ.regularMarketTime) ? rawQ : null;
      if (!q && !ts.length) return null;

      const rows = [...ts].sort((a, b) => +a.date - +b.date).slice(-6);
      const label = (d: Date) => `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      const cr = (v: number | undefined | null) => (v == null ? null : Math.round(v / CR));
      const annual: Fundamentals["annual"] = rows.length
        ? {
            years: rows.map((r) => label(r.date)),
            series: [
              { label: "Sales", values: rows.map((r) => cr(r.totalRevenue)) },
              { label: "Operating Profit", values: rows.map((r) => cr(r.operatingIncome)) },
              { label: "OPM %", values: rows.map((r) => (r.totalRevenue && r.operatingIncome != null ? +((r.operatingIncome / r.totalRevenue) * 100).toFixed(1) : null)) },
              { label: "Net Profit", values: rows.map((r) => cr(r.netIncome)) },
              { label: "EPS in Rs", values: rows.map((r) => r.dilutedEPS ?? null) },
            ],
          }
        : null;

      const roe = profile?.financialData?.returnOnEquity;
      return {
        source: "yahoo",
        basis: null,
        companyId: null,
        classification: { sector: profile?.assetProfile?.sector, industry: profile?.assetProfile?.industry },
        kpi: q
          ? {
              price: q.regularMarketPrice ?? null,
              marketCap: q.marketCap ? `Rs ${Math.round(q.marketCap / CR).toLocaleString("en-IN")} Cr` : null,
              pe: q.trailingPE ?? null,
              bookValue: q.bookValue ?? null,
              divYield: q.dividendYield ?? null, // already a percentage on Yahoo's NSE quotes
              roce: null,
              roe: roe != null ? +(roe * 100).toFixed(1) : null,
              faceValue: null,
              low52w: q.fiftyTwoWeekLow ?? null,
              high52w: q.fiftyTwoWeekHigh ?? null,
            }
          : null,
        industry: null,
        growth: [],
        shareholding: null,
        annual,
        fetchedAt: new Date().toISOString(),
      } satisfies Fundamentals;
    } catch {
      return null;
    }
  });
}
