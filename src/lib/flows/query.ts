// The read side of the institutional-money data for /updates (the FII / DII view and the stake tags
// on headlines). Each block is loaded once for the whole site and kept in memory for ten minutes
// (the data changes once a day), then cut to an industry or a watchlist per request.
//
// A block that can't be read (its table is empty, or not created yet) comes back null and the page
// says so in place; one failing never hides the others.
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/live/cache";
import { CORE_CENTRALITY, listCompanyMetrics, sectorCompanyMetrics, type CompanyMetrics } from "@/lib/sector-content/insights";
import { classifyParty } from "./parties";
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

// ---------------------------------------------------------------- market cash

export type CashDay = { day: Date; fiiNetCr: number; diiNetCr: number };
export type CashView = {
  /** Oldest first, at most the last 10 sessions stored. */
  days: CashDay[];
  latest: CashDay;
  /** The latest day's month so far, over the sessions stored for it. */
  month: { day: Date; fiiNetCr: number; diiNetCr: number; sessions: number };
  /** First day stored at all (the history only grows from there). */
  firstDay: Date;
};

export const CASH_SESSIONS = 10;

async function loadCash(): Promise<CashView | null> {
  const rows = await prisma.marketFlowDay.findMany({
    where: { fiiNetCr: { not: null }, diiNetCr: { not: null } },
    orderBy: { day: "desc" },
    take: 31,
    select: { day: true, fiiNetCr: true, diiNetCr: true },
  });
  if (rows.length === 0) return null;
  const all = rows.map((r) => ({ day: r.day, fiiNetCr: r.fiiNetCr!, diiNetCr: r.diiNetCr! }));
  const latest = all[0];
  const sameMonth = all.filter((d) => d.day.getUTCFullYear() === latest.day.getUTCFullYear() && d.day.getUTCMonth() === latest.day.getUTCMonth());
  const first = await prisma.marketFlowDay.findFirst({ where: { fiiNetCr: { not: null } }, orderBy: { day: "asc" }, select: { day: true } });
  return {
    days: all.slice(0, CASH_SESSIONS).reverse(),
    latest,
    month: {
      day: latest.day,
      fiiNetCr: sameMonth.reduce((s, d) => s + d.fiiNetCr, 0),
      diiNetCr: sameMonth.reduce((s, d) => s + d.diiNetCr, 0),
      sessions: sameMonth.length,
    },
    firstDay: first?.day ?? latest.day,
  };
}

// ---------------------------------------------------------------- FII index futures

export type FuturesView = {
  day: Date;
  long: number;
  short: number;
  /** Share of FII index-futures contracts that are long, 0-100. */
  longPct: number;
  /** The same about a week earlier (five sessions back), when stored. */
  before: { day: Date; longPct: number } | null;
};

const longPct = (l: number, s: number) => (l + s > 0 ? (l / (l + s)) * 100 : 0);

async function loadFutures(): Promise<FuturesView | null> {
  const rows = await prisma.marketFlowDay.findMany({
    where: { fiiIdxFutLong: { not: null }, fiiIdxFutShort: { not: null } },
    orderBy: { day: "desc" },
    take: 6,
    select: { day: true, fiiIdxFutLong: true, fiiIdxFutShort: true },
  });
  if (rows.length === 0) return null;
  const [now] = rows;
  const then = rows.length >= 6 ? rows[5] : null;
  return {
    day: now.day,
    long: now.fiiIdxFutLong!,
    short: now.fiiIdxFutShort!,
    longPct: longPct(now.fiiIdxFutLong!, now.fiiIdxFutShort!),
    before: then ? { day: then.day, longPct: longPct(then.fiiIdxFutLong!, then.fiiIdxFutShort!) } : null,
  };
}

// ---------------------------------------------------------------- NSDL sector flows

export type SectorFlowsView = { periodEnd: Date; periodLabel: string; rows: { sector: string; netCr: number }[]; totalCr: number | null };

// NSDL's catch-alls: not a sector anyone can act on.
const NOT_A_SECTOR = new Set(["Grand Total", "Others", "Sovereign", "Diversified"]);

async function loadSectors(): Promise<SectorFlowsView | null> {
  const latest = await prisma.sectorFpiFlow.findFirst({ orderBy: { periodEnd: "desc" }, select: { periodEnd: true, periodLabel: true } });
  if (!latest) return null;
  const rows = await prisma.sectorFpiFlow.findMany({ where: { periodEnd: latest.periodEnd }, select: { sector: true, netEquityCr: true } });
  return {
    periodEnd: latest.periodEnd,
    periodLabel: latest.periodLabel,
    rows: rows
      .filter((r) => !NOT_A_SECTOR.has(r.sector))
      .map((r) => ({ sector: r.sector, netCr: r.netEquityCr }))
      .sort((a, b) => b.netCr - a.netCr),
    totalCr: rows.find((r) => r.sector === "Grand Total")?.netEquityCr ?? null,
  };
}

// ---------------------------------------------------------------- shareholding

export type StakeMove = {
  ticker: string;
  quarter: Date;
  prevQuarter: Date;
  fii: number | null;
  dii: number | null;
  /** Change since the previous quarter, percentage points. */
  dFii: number | null;
  dDii: number | null;
  /** Quarters in a row the holding has moved the latest change's way (1 = just this quarter). */
  fiiStreak: number;
  diiStreak: number;
};

// Changes smaller than this are rounding in the filings, not a move.
const FLAT_PP = 0.01;
// A company whose latest filing is more than about a quarter older than everyone else's is left out
// (a late filer would otherwise show a stale move beside current ones).
const STALE_MS = 100 * DAY_MS;

function streak(values: (number | null)[]): number {
  // values oldest first; counts back from the latest change while each step has the same sign.
  let n = 0;
  let sign = 0;
  for (let i = values.length - 1; i > 0; i--) {
    const a = values[i - 1];
    const b = values[i];
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

async function loadStakes(): Promise<Map<string, StakeMove> | null> {
  const tickers = listCompanyMetrics().map((c) => c.ticker);
  const since = new Date(Date.now() - 2 * 366 * DAY_MS);
  const rows = await prisma.shareholding.findMany({
    where: { quarter: { gte: since }, company: { ticker: { in: tickers } } },
    orderBy: { quarter: "asc" },
    select: { quarter: true, fii: true, dii: true, company: { select: { ticker: true } } },
  });
  if (rows.length === 0) return null;
  const byTicker = new Map<string, typeof rows>();
  // Quarter ends only: a few companies also file after a corporate action (an "Oct 2026" column),
  // which would make "last quarter" mean different things for different companies.
  const ends = rows.filter((q) => [2, 5, 8, 11].includes(q.quarter.getUTCMonth()));
  for (const r of ends) byTicker.set(r.company.ticker, [...(byTicker.get(r.company.ticker) ?? []), r]);
  const newest = Math.max(...ends.map((r) => r.quarter.getTime()));
  const out = new Map<string, StakeMove>();
  for (const [ticker, qs] of byTicker) {
    if (qs.length < 2) continue;
    const now = qs[qs.length - 1];
    const prev = qs[qs.length - 2];
    if (newest - now.quarter.getTime() > STALE_MS) continue;
    out.set(ticker, {
      ticker,
      quarter: now.quarter,
      prevQuarter: prev.quarter,
      fii: now.fii,
      dii: now.dii,
      dFii: now.fii != null && prev.fii != null ? round2(now.fii - prev.fii) : null,
      dDii: now.dii != null && prev.dii != null ? round2(now.dii - prev.dii) : null,
      fiiStreak: streak(qs.map((q) => q.fii)),
      diiStreak: streak(qs.map((q) => q.dii)),
    });
  }
  return out;
}

const stakes = () => cached("flows:stakes:v2", TTL_MS, loadStakes);

/** Each covered company's latest quarterly FII/DII move, for tags beside its headlines. */
export async function getStakeMoves(tickers: string[]): Promise<Map<string, StakeMove>> {
  const all = await safe("stakes", stakes);
  const out = new Map<string, StakeMove>();
  for (const t of tickers) {
    const m = all?.get(t);
    if (m) out.set(t, m);
  }
  return out;
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

export const DEAL_DAYS = 30;

async function loadDeals(): Promise<DealView[] | null> {
  const tickers = listCompanyMetrics().map((c) => c.ticker);
  const rows = await prisma.bulkDeal.findMany({
    where: { day: { gte: new Date(Date.now() - (DEAL_DAYS + 5) * DAY_MS) }, symbol: { in: tickers } },
    orderBy: [{ day: "desc" }, { quantity: "desc" }],
    select: { day: true, kind: true, symbol: true, clientName: true, side: true, quantity: true, price: true },
  });
  // Only institutions: most bulk deals are brokers' own desks and individuals trading in and out the
  // same day, which says nothing about where FII or DII money is going.
  return rows
    .map((r) => {
      const quantity = Number(r.quantity);
      return {
        day: r.day,
        kind: r.kind,
        ticker: r.symbol,
        client: r.clientName,
        party: classifyParty(r.clientName),
        side: r.side,
        quantity,
        price: r.price,
        valueCr: (quantity * r.price) / 1e7,
      };
    })
    .filter((d) => d.party !== "OTHER");
}

// ---------------------------------------------------------------- the FII / DII view

export type CompanyRef = { ticker: string; name: string; sectorSlug: string; sectorName: string };
export type StakeRow = CompanyRef & StakeMove;
export type DealRow = CompanyRef & DealView;

export type FlowsData = {
  cash: CashView | null;
  futures: FuturesView | null;
  sectors: SectorFlowsView | null;
  /** Biggest quarterly FII and DII stake changes among the companies in view (empty = none moved). */
  stakes: { fii: StakeRow[]; dii: StakeRow[]; quarter: Date | null; /** Companies in view with a filing stored (0 = none yet). */ covered: number } | null;
  /** Bulk and block deals in the companies in view, newest first. */
  deals: DealRow[] | null;
};

const ref = (c: CompanyMetrics): CompanyRef => ({ ticker: c.ticker, name: c.name, sectorSlug: c.sectorSlug, sectorName: c.sectorName });

/** The companies an industry filter covers: those central to it (side links like a lender are not its companies). */
export function companiesInView(sectorSlug?: string): Map<string, CompanyRef> {
  const list = sectorSlug ? sectorCompanyMetrics(sectorSlug).filter((c) => c.centrality >= CORE_CENTRALITY) : listCompanyMetrics();
  return new Map(list.map((c) => [c.ticker, ref(c)]));
}

const TOP_MOVES = 8;
const TOP_DEALS = 12;

export async function getFlowsData(sectorSlug?: string): Promise<FlowsData> {
  const companies = companiesInView(sectorSlug);
  const [cash, futures, sectors, stakeMap, deals] = await Promise.all([
    safe("cash", () => cached("flows:cash:v1", TTL_MS, loadCash)),
    safe("futures", () => cached("flows:futures:v1", TTL_MS, loadFutures)),
    safe("sectors", () => cached("flows:sectors:v1", TTL_MS, loadSectors)),
    safe("stakes", stakes),
    safe("deals", () => cached("flows:deals:v1", TTL_MS, loadDeals)),
  ]);

  let stakeView: FlowsData["stakes"] = null;
  if (stakeMap) {
    const rows = [...stakeMap.values()].filter((m) => companies.has(m.ticker)).map((m) => ({ ...companies.get(m.ticker)!, ...m }));
    const top = (key: "dFii" | "dDii") =>
      rows
        .filter((r) => r[key] != null && Math.abs(r[key]!) >= 0.1)
        .sort((a, b) => Math.abs(b[key]!) - Math.abs(a[key]!))
        .slice(0, TOP_MOVES);
    const quarter = rows.reduce<Date | null>((q, r) => (!q || r.quarter > q ? r.quarter : q), null);
    stakeView = { fii: top("dFii"), dii: top("dDii"), quarter, covered: rows.length };
  }

  const cutoff = Date.now() - DEAL_DAYS * DAY_MS;
  const dealRows = deals
    ? deals
        .filter((d) => companies.has(d.ticker) && d.day.getTime() >= cutoff)
        .slice(0, TOP_DEALS)
        .map((d) => ({ ...companies.get(d.ticker)!, ...d }))
    : null;

  return { cash, futures, sectors, stakes: stakeView, deals: dealRows };
}

// ---------------------------------------------------------------- your watchlist

export type WatchRow = CompanyRef & { stake: StakeMove | null; deal: DealView | null };
export type WatchlistFlows = { signedIn: false } | { signedIn: true; total: number; rows: WatchRow[] };

/** The signed-in user's saved stocks (cut to the industry in view) with their stake moves and latest deal. */
export async function getWatchlistFlows(userId: string | null, sectorSlug?: string): Promise<WatchlistFlows> {
  if (!userId) return { signedIn: false };
  const saved = await prisma.watchlist.findMany({
    where: { userId },
    select: { company: { select: { ticker: true, name: true } } },
    orderBy: { addedAt: "desc" },
  });
  const inView = companiesInView(sectorSlug);
  const all = companiesInView();
  const [stakeMap, deals] = await Promise.all([safe("stakes", stakes), safe("deals", () => cached("flows:deals:v1", TTL_MS, loadDeals))]);
  const cutoff = Date.now() - DEAL_DAYS * DAY_MS;
  const rows = saved
    .filter((s) => !sectorSlug || inView.has(s.company.ticker))
    .map((s) => {
      // Labelled with the industry in view when one is picked (a company in several shows under it),
      // otherwise with its home industry.
      const c = (sectorSlug ? inView : all).get(s.company.ticker) ?? { ticker: s.company.ticker, name: s.company.name, sectorSlug: "", sectorName: "" };
      return {
        ...c,
        stake: stakeMap?.get(c.ticker) ?? null,
        deal: deals?.find((d) => d.ticker === c.ticker && d.day.getTime() >= cutoff) ?? null,
      };
    });
  return { signedIn: true, total: saved.length, rows };
}
