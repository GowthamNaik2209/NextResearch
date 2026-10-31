// The read side of the institutional-money data for /updates (the FII / DII view and the stake tags
// on headlines). Each table is loaded once for the whole site and kept in memory for ten minutes
// (the data changes once a day), then cut to the chosen period, an industry or a watchlist per request.
//
// A block that can't be read (its table is empty, or not created yet) comes back null and the page
// says so in place; one failing never hides the others.
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/live/cache";
import { CORE_CENTRALITY, listCompanyMetrics, sectorCompanyMetrics, type CompanyMetrics } from "@/lib/sector-content/insights";
import { classifyParty } from "./parties";
import { monthsBefore, periodMonths, periodStart, type Period } from "./periods";
import type { DealKind, DealSide, PartyType } from "./types";

const TTL_MS = 10 * 60_000;
const DAY_MS = 86_400_000;

async function safe<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (e) {
    console.warn(`flows: ${label} unavailable:`, e instanceof Error ? e.message.trim().split("\n").at(-1) : e);
    return null;
  }
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

// ---------------------------------------------------------------- market cash

/** Where a day's figures come from: NSE's provisional evening figures (collected from 30 Oct 2026),
 * else the official confirmed ones - NSDL for FPI and DII (DII from Jun 2026), SEBI for mutual funds. */
export type FiiSource = "nse" | "nsdl";
export type DiiSource = "nse" | "nsdl" | "sebi-mf";
export type CashDay = { day: Date; fiiNetCr: number; diiNetCr: number; fiiSource?: FiiSource; diiSource?: DiiSource };
export type CashGrain = "day" | "week";
export type CashBar = { start: Date; fiiNetCr: number; diiNetCr: number; sessions: number };
export type CashView = {
  latest: CashDay;
  /** Net buying over the period, and the sessions it adds up (fewer than the period's when history is short). */
  total: { fiiNetCr: number; diiNetCr: number; sessions: number };
  /** One slot per weekday or week across the whole period, oldest first; a slot with no stored day has
   * sessions 0 and draws no bar, so a short history shows as a gap rather than stretching to fill. */
  bars: CashBar[];
  grain: CashGrain;
  /** First day the period covers, and the first day stored at all (history only grows from there). */
  from: Date;
  firstStored: Date;
  /** The sources the period's days use, each with the first and last day it covers. */
  sources: { who: "FII" | "DII"; source: FiiSource | DiiSource; from: Date; to: Date; /** Days in the span that used an older source because this one had none. */ filled: number }[];
};

async function loadCashDays(): Promise<CashDay[] | null> {
  const rows = await prisma.marketFlowDay.findMany({
    where: { OR: [{ fiiNetCr: { not: null } }, { fpiNsdlNetCr: { not: null } }] },
    orderBy: { day: "asc" },
    select: { day: true, fiiNetCr: true, diiNetCr: true, fpiNsdlNetCr: true, diiNsdlNetCr: true, mfSebiNetCr: true },
  });
  // NSE's provisional pair where we have it; otherwise the official confirmed figures. A day needs both
  // sides to be drawn.
  const days: CashDay[] = [];
  for (const r of rows) {
    const fii = r.fiiNetCr != null ? { v: r.fiiNetCr, s: "nse" as const } : r.fpiNsdlNetCr != null ? { v: r.fpiNsdlNetCr, s: "nsdl" as const } : null;
    const dii =
      r.diiNetCr != null
        ? { v: r.diiNetCr, s: "nse" as const }
        : r.diiNsdlNetCr != null
          ? { v: r.diiNsdlNetCr, s: "nsdl" as const }
          : r.mfSebiNetCr != null
            ? { v: r.mfSebiNetCr, s: "sebi-mf" as const }
            : null;
    if (fii && dii) days.push({ day: r.day, fiiNetCr: fii.v, diiNetCr: dii.v, fiiSource: fii.s, diiSource: dii.s });
  }
  return days.length ? days : null;
}

// Each side's sources as eras that follow one another: a source runs from its first day to the day
// before the next one starts (SEBI's MF figures until NSDL's DII report begins, and so on). Every day
// uses one source only; a day the era's source missed used an older one and is counted in `filled`.
const RANK: Record<FiiSource | DiiSource, number> = { "sebi-mf": 0, nsdl: 1, nse: 2 };
function sourceSpans(days: CashDay[]): CashView["sources"] {
  const out: CashView["sources"] = [];
  for (const who of ["FII", "DII"] as const) {
    const src = (d: CashDay) => (who === "FII" ? d.fiiSource : d.diiSource) ?? "nse";
    const starts = new Map<FiiSource | DiiSource, Date>();
    for (const d of days) if (!starts.has(src(d))) starts.set(src(d), d.day);
    const eras = [...starts.entries()].sort((a, b) => RANK[a[0]] - RANK[b[0]]);
    eras.forEach(([source, from], i) => {
      const until = eras[i + 1]?.[1];
      const inEra = days.filter((d) => d.day >= from && (!until || d.day < until));
      if (!inEra.length) return;
      out.push({ who, source, from, to: inEra[inEra.length - 1].day, filled: inEra.filter((d) => src(d) !== source).length });
    });
  }
  return out;
}

/** The finest bars that stay readable: daily up to three months (about 65), weekly beyond (up to ~260 for 5Y). */
export const cashGrain = (p: Period): CashGrain => (periodMonths(p) <= 3 ? "day" : "week");

/** The bucket a day falls in: itself, or its week's Monday. */
export function bucketStart(day: Date, grain: CashGrain): Date {
  if (grain === "day") return day;
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS);
}

export function cashView(days: CashDay[], period: Period): CashView | null {
  if (!days.length) return null;
  const latest = days[days.length - 1];
  const from = periodStart(period, latest.day);
  const inPeriod = days.filter((d) => d.day >= from);
  const grain = cashGrain(period);
  const bars = new Map<number, CashBar>();
  // Every weekday (or week) of the period first, so the axis spans the whole period.
  for (let t = bucketStart(from, grain).getTime(); t <= latest.day.getTime(); t += (grain === "day" ? 1 : 7) * DAY_MS) {
    const wd = new Date(t).getUTCDay();
    if (grain === "day" && (wd === 0 || wd === 6)) continue;
    bars.set(t, { start: new Date(t), fiiNetCr: 0, diiNetCr: 0, sessions: 0 });
  }
  for (const d of inPeriod) {
    const start = bucketStart(d.day, grain);
    const b = bars.get(start.getTime()) ?? { start, fiiNetCr: 0, diiNetCr: 0, sessions: 0 };
    b.fiiNetCr += d.fiiNetCr;
    b.diiNetCr += d.diiNetCr;
    b.sessions++;
    bars.set(start.getTime(), b);
  }
  return {
    latest,
    total: { fiiNetCr: sum(inPeriod.map((d) => d.fiiNetCr)), diiNetCr: sum(inPeriod.map((d) => d.diiNetCr)), sessions: inPeriod.length },
    bars: [...bars.values()],
    grain,
    from,
    firstStored: days[0].day,
    sources: sourceSpans(inPeriod),
  };
}

// ---------------------------------------------------------------- FII index futures

export type FuturesPoint = { day: Date; longPct: number };
export type FuturesView = {
  day: Date;
  long: number;
  short: number;
  /** Share of FII index-futures contracts that are long, 0-100. */
  longPct: number;
  /** The last stored day before the period, to compare with (null when nothing is stored that far back). */
  base: FuturesPoint | null;
  /** The long share across the period, oldest first (weekly when the period is long). */
  points: FuturesPoint[];
  /** First day stored at all: a period reaching further back has no base to compare with. */
  firstStored: Date;
};

const longPct = (l: number, s: number) => (l + s > 0 ? (l / (l + s)) * 100 : 0);
type OiDay = { day: Date; long: number; short: number };

async function loadOi(): Promise<OiDay[] | null> {
  const rows = await prisma.marketFlowDay.findMany({
    where: { fiiIdxFutLong: { not: null }, fiiIdxFutShort: { not: null } },
    orderBy: { day: "asc" },
    select: { day: true, fiiIdxFutLong: true, fiiIdxFutShort: true },
  });
  return rows.length ? rows.map((r) => ({ day: r.day, long: r.fiiIdxFutLong!, short: r.fiiIdxFutShort! })) : null;
}

export function futuresView(days: OiDay[], period: Period): FuturesView | null {
  if (!days.length) return null;
  const now = days[days.length - 1];
  const from = periodStart(period, now.day);
  const before = days.filter((d) => d.day < from).at(-1);
  const inPeriod = days.filter((d) => d.day >= from);
  // A point a week beyond six months, so a five-year line stays a few hundred points.
  const weekly = periodMonths(period) > 6;
  const kept = weekly ? inPeriod.filter((d, i) => i === inPeriod.length - 1 || bucketStart(d.day, "week").getTime() !== bucketStart(inPeriod[i + 1].day, "week").getTime()) : inPeriod;
  const point = (d: OiDay) => ({ day: d.day, longPct: longPct(d.long, d.short) });
  return {
    day: now.day,
    long: now.long,
    short: now.short,
    longPct: longPct(now.long, now.short),
    base: before ? point(before) : null,
    points: [...(before ? [point(before)] : []), ...kept.map(point)],
    firstStored: days[0].day,
  };
}

// ---------------------------------------------------------------- NSDL sector flows

export type SectorFlowsView = {
  /** First and last day the summed fortnights cover. */
  from: Date;
  to: Date;
  fortnights: number;
  rows: { sector: string; netCr: number }[];
  totalCr: number | null;
  /** The period starts before the first fortnight stored, and whether that is because NSDL's current
   * sector list only starts in May 2022 (else the stored history simply starts later). */
  clipped: boolean;
  beforeSectorList: boolean;
  storedFrom: Date;
};

// NSDL's catch-alls: not a sector anyone can act on.
const NOT_A_SECTOR = new Set(["Grand Total", "Others", "Sovereign", "Diversified"]);
// NSDL moved to BSE's current 22-sector classification with the 30 Apr 2022 report; earlier reports
// use other sector names, so sums start after it.
export const NSDL_CURRENT_SECTORS_FROM = new Date(Date.UTC(2022, 3, 30));

type FortnightRow = { periodEnd: Date; sector: string; netEquityCr: number };

async function loadSectorRows(): Promise<FortnightRow[] | null> {
  const rows = await prisma.sectorFpiFlow.findMany({
    where: { periodEnd: { gt: NSDL_CURRENT_SECTORS_FROM } },
    orderBy: { periodEnd: "asc" },
    select: { periodEnd: true, sector: true, netEquityCr: true },
  });
  return rows.length ? rows : null;
}

/** The first day of the fortnight ending on `end`: the 1st for the 15th, the 16th for a month end. */
const fortnightStart = (end: Date) => new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() <= 15 ? 1 : 16));

export function sectorsView(rows: FortnightRow[], period: Period, latestDay: Date): SectorFlowsView | null {
  if (!rows.length) return null;
  const ends = [...new Set(rows.map((r) => r.periodEnd.getTime()))].sort((a, b) => a - b);
  const newest = ends[ends.length - 1];
  const from = periodStart(period, new Date(Math.max(newest, latestDay.getTime())));
  // Fortnights that start inside the period; a period shorter than one fortnight shows the latest.
  let picked = ends.filter((t) => fortnightStart(new Date(t)) >= from);
  if (!picked.length) picked = [newest];
  const set = new Set(picked);
  const by = new Map<string, number>();
  for (const r of rows) if (set.has(r.periodEnd.getTime())) by.set(r.sector, (by.get(r.sector) ?? 0) + r.netEquityCr);
  return {
    from: fortnightStart(new Date(picked[0])),
    to: new Date(picked[picked.length - 1]),
    fortnights: picked.length,
    rows: [...by.entries()]
      .filter(([s]) => !NOT_A_SECTOR.has(s))
      .map(([sector, netCr]) => ({ sector, netCr }))
      .sort((a, b) => b.netCr - a.netCr),
    totalCr: by.get("Grand Total") ?? null,
    clipped: from < fortnightStart(new Date(ends[0])),
    beforeSectorList: from <= NSDL_CURRENT_SECTORS_FROM,
    storedFrom: fortnightStart(new Date(ends[0])),
  };
}

// ---------------------------------------------------------------- shareholding

type Filing = { quarter: Date; fii: number | null; dii: number | null };

export type StakeMove = {
  ticker: string;
  /** The latest filing and the one compared with (the last before the period's start). */
  quarter: Date;
  base: Date;
  fii: number | null;
  dii: number | null;
  /** Change since `base`, percentage points of the company's equity. */
  dFii: number | null;
  dDii: number | null;
  /** Quarters in a row the holding has moved the latest quarter's way (1 = just this quarter). */
  fiiStreak: number;
  diiStreak: number;
};

// Changes smaller than this are rounding in the filings, not a move.
const FLAT_PP = 0.01;
// A company whose latest filing is more than about a quarter older than everyone else's is left out
// (a late filer would otherwise show a stale move beside current ones).
const STALE_MS = 100 * DAY_MS;

function streak(fs: Filing[], key: "fii" | "dii"): number {
  // Oldest first; counts back from the latest change while each step has the same sign and the
  // filings are consecutive quarters (the older yearly March filings are a year apart, not a quarter).
  let n = 0;
  let sign = 0;
  for (let i = fs.length - 1; i > 0; i--) {
    if (fs[i].quarter.getTime() - fs[i - 1].quarter.getTime() > 100 * DAY_MS) break;
    const a = fs[i - 1][key];
    const b = fs[i][key];
    if (a == null || b == null) break;
    const d = b - a;
    const s = Math.abs(d) < FLAT_PP ? 0 : Math.sign(d);
    if (s === 0 || (sign !== 0 && s !== sign)) break;
    sign = s;
    n++;
  }
  return n;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const diff = (a: number | null, b: number | null) => (a != null && b != null ? round2(a - b) : null);

async function loadFilings(): Promise<Map<string, Filing[]> | null> {
  const tickers = listCompanyMetrics().map((c) => c.ticker);
  const rows = await prisma.shareholding.findMany({
    where: { company: { ticker: { in: tickers } } },
    orderBy: { quarter: "asc" },
    select: { quarter: true, fii: true, dii: true, company: { select: { ticker: true } } },
  });
  if (rows.length === 0) return null;
  // Quarter ends only: a few companies also file after a corporate action (an "Oct 2026" column),
  // which would make "last quarter" mean different things for different companies.
  const out = new Map<string, Filing[]>();
  for (const r of rows) {
    if (![2, 5, 8, 11].includes(r.quarter.getUTCMonth())) continue;
    out.set(r.company.ticker, [...(out.get(r.company.ticker) ?? []), { quarter: r.quarter, fii: r.fii, dii: r.dii }]);
  }
  return out;
}

const filings = () => cached("flows:filings:v1", TTL_MS, loadFilings);

/**
 * Each company's holding change over the period. Holdings change only with a quarterly filing, so a
 * period under three months compares the latest filing with the one before; longer ones with the
 * last filing at least that many months older (before the last 12 quarters only March filings are
 * stored, so a 3Y or 5Y change may start at an earlier March: `base` says which).
 */
export function stakeMoves(all: Map<string, Filing[]>, period: Period): Map<string, StakeMove> {
  const newest = Math.max(...[...all.values()].map((fs) => fs.at(-1)?.quarter.getTime() ?? 0));
  const back = Math.max(3, periodMonths(period));
  const out = new Map<string, StakeMove>();
  for (const [ticker, fs] of all) {
    const now = fs.at(-1);
    if (!now || fs.length < 2 || newest - now.quarter.getTime() > STALE_MS) continue;
    const target = monthsBefore(now.quarter, back).getTime();
    const base = fs.filter((f) => f.quarter.getTime() <= target).at(-1);
    if (!base) continue;
    out.set(ticker, {
      ticker,
      quarter: now.quarter,
      base: base.quarter,
      fii: now.fii,
      dii: now.dii,
      dFii: diff(now.fii, base.fii),
      dDii: diff(now.dii, base.dii),
      fiiStreak: streak(fs, "fii"),
      diiStreak: streak(fs, "dii"),
    });
  }
  return out;
}

/** Each covered company's latest quarterly FII/DII move, for tags beside its headlines. */
export async function getStakeMoves(tickers: string[]): Promise<Map<string, StakeMove>> {
  const all = await safe("stakes", filings);
  const moves = all ? stakeMoves(all, "3M") : new Map<string, StakeMove>();
  return new Map(tickers.filter((t) => moves.has(t)).map((t) => [t, moves.get(t)!]));
}

// ---------------------------------------------------------------- deals

export type DealView = {
  day: Date;
  kind: DealKind;
  ticker: string;
  client: string;
  party: PartyType;
  side: DealSide;
  quantity: number;
  price: number;
  valueCr: number;
};

async function loadDeals(): Promise<DealView[] | null> {
  const tickers = listCompanyMetrics().map((c) => c.ticker);
  const rows = await prisma.bulkDeal.findMany({
    where: { day: { gte: new Date(Date.now() - (5 * 366 + 10) * DAY_MS) }, symbol: { in: tickers } },
    orderBy: [{ day: "desc" }, { quantity: "desc" }],
    select: { day: true, kind: true, symbol: true, clientName: true, side: true, quantity: true, price: true },
  });
  // NSE lists a block deal again among the day's bulk deals (the block row is kept), and sometimes the
  // same trade twice under slightly different spellings of the client ("KOTAK MAHINDRA MUTUAL FUND .").
  const key = (r: (typeof rows)[number]) => [r.day.getTime(), r.symbol, clientName(r.clientName), r.side, r.quantity].join("|");
  const blocks = new Set(rows.filter((r) => r.kind === "BLOCK").map(key));
  const seen = new Set<string>();
  // Only institutions: most bulk deals are brokers' own desks and individuals trading in and out the
  // same day, which says nothing about where FII or DII money is going.
  return rows
    .filter((r) => r.kind === "BLOCK" || !blocks.has(key(r)))
    .filter((r) => {
      const k = `${r.kind}|${key(r)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((r) => {
      const quantity = Number(r.quantity);
      return {
        day: r.day,
        kind: r.kind,
        ticker: r.symbol,
        client: clientName(r.clientName),
        party: classifyParty(r.clientName),
        side: r.side,
        quantity,
        price: r.price,
        valueCr: (quantity * r.price) / 1e7,
      };
    })
    // A trade under a crore is a fund's small counter-trade on a day it dealt big the other way (NSE lists
    // every trade of a client that crossed 0.5%), not a position worth showing.
    .filter((d) => d.party !== "OTHER" && d.valueCr >= 1);
}

// NSE sometimes ends a name with a stray full stop ("KOTAK MAHINDRA MUTUAL FUND ."); an abbreviation's
// own full stop ("PTE. LTD.") stays.
const clientName = (s: string) => s.replace(/\s+\.$/, "").replace(/(?<!\b(?:LTD|PTE|INC|CO|CORP|PLC|LLC|LP|BV|NV|SA|AG|SE)\.?)\.$/i, "").trim();

const deals = () => cached("flows:deals:v4", TTL_MS, loadDeals);

// ---------------------------------------------------------------- the FII / DII view

export type CompanyRef = { ticker: string; name: string; sectorSlug: string; sectorName: string };
export type StakeRow = CompanyRef & StakeMove;
export type DealRow = CompanyRef & DealView;

export type FlowsData = {
  /** The day the period ends on (the latest trading day with data) and the day it starts. */
  latest: Date;
  from: Date;
  cash: CashView | null;
  futures: FuturesView | null;
  sectors: SectorFlowsView | null;
  /** Every company in view with a filing to compare, with its change over the period. */
  stakes: { rows: StakeRow[]; quarter: Date | null } | null;
  /** FII and DII bulk and block deals in the companies in view, over the period, newest first. */
  deals: DealRow[] | null;
};

const ref = (c: CompanyMetrics): CompanyRef => ({ ticker: c.ticker, name: c.name, sectorSlug: c.sectorSlug, sectorName: c.sectorName });

/** The companies an industry filter covers: those central to it (side links like a lender are not its companies). */
export function companiesInView(sectorSlug?: string): Map<string, CompanyRef> {
  const list = sectorSlug ? sectorCompanyMetrics(sectorSlug).filter((c) => c.centrality >= CORE_CENTRALITY) : listCompanyMetrics();
  return new Map(list.map((c) => [c.ticker, ref(c)]));
}

/**
 * The FII / DII view for one period. The industry narrows only the blocks that are per company and
 * exact - stake changes and deals; everything else is market-wide.
 */
export async function getFlowsData(period: Period, sectorSlug?: string): Promise<FlowsData> {
  const companies = companiesInView(sectorSlug);
  const [cashDays, oiDays, sectorRows, all, dealList] = await Promise.all([
    safe("cash", () => cached("flows:cash:v3", TTL_MS, loadCashDays)),
    safe("futures", () => cached("flows:oi:v1", TTL_MS, loadOi)),
    safe("sectors", () => cached("flows:sectors:v2", TTL_MS, loadSectorRows)),
    safe("stakes", filings),
    safe("deals", deals),
  ]);
  const latest = new Date(Math.max(cashDays?.at(-1)?.day.getTime() ?? 0, oiDays?.at(-1)?.day.getTime() ?? 0) || Date.now());
  const from = periodStart(period, latest);

  let stakes: FlowsData["stakes"] = null;
  if (all) {
    const rows = [...stakeMoves(all, period).values()].filter((m) => companies.has(m.ticker)).map((m) => ({ ...companies.get(m.ticker)!, ...m }));
    stakes = { rows, quarter: rows.reduce<Date | null>((q, r) => (!q || r.quarter > q ? r.quarter : q), null) };
  }

  return {
    latest,
    from,
    cash: cashDays ? cashView(cashDays, period) : null,
    futures: oiDays ? futuresView(oiDays, period) : null,
    sectors: sectorRows ? sectorsView(sectorRows, period, latest) : null,
    stakes,
    deals: dealList ? dealList.filter((d) => companies.has(d.ticker) && d.day >= from).map((d) => ({ ...companies.get(d.ticker)!, ...d })) : null,
  };
}

// ---------------------------------------------------------------- your watchlist

export type WatchRow = CompanyRef & { stake: StakeMove | null; deals: DealView[] };
export type WatchlistFlows = { signedIn: false } | { signedIn: true; rows: WatchRow[] };

/** The signed-in user's saved stocks - always all of them, whatever industry is picked - over the period. */
export async function getWatchlistFlows(userId: string | null, period: Period, from: Date): Promise<WatchlistFlows> {
  if (!userId) return { signedIn: false };
  const saved = await prisma.watchlist.findMany({
    where: { userId },
    select: { company: { select: { ticker: true, name: true } } },
    orderBy: { addedAt: "desc" },
  });
  const known = companiesInView();
  const [all, dealList] = await Promise.all([safe("stakes", filings), safe("deals", deals)]);
  const moves = all ? stakeMoves(all, period) : null;
  return {
    signedIn: true,
    rows: saved.map((s) => {
      const c = known.get(s.company.ticker) ?? { ticker: s.company.ticker, name: s.company.name, sectorSlug: "", sectorName: "" };
      return { ...c, stake: moves?.get(c.ticker) ?? null, deals: dealList?.filter((d) => d.ticker === c.ticker && d.day >= from) ?? [] };
    }),
  };
}
