// The daily top-up of the institutional-money tables (prisma/schema.prisma MarketFlowDay,
// SectorFpiFlow, BulkDeal) after each NSE trading day: NSE's provisional FII/DII cash figures, FII/DII
// index-futures open interest, every bulk and block deal, and NSDL's fortnightly FPI flows by sector.
// Server side only; it takes the Prisma client and imports nothing from Next, so the cron route
// (src/app/api/flows/refresh) and scripts/refresh-flows.ts (backfills, by hand) share it.
//
// Each source is independent: one failing (NSE refusing us, NSDL slow) never stops the others, and
// the summary says what each did. Every write is idempotent (an upsert, or a day's deals replaced as
// a whole), so running twice, or after a partial run, is safe.
//
// What a run covers:
//   cash     the latest day NSE publishes (it keeps no history, so a missed day is lost).
//   OI       the latest due trading day, plus any of the last `backfillDays` trading days still
//            missing (one small file per day).
//   deals    the last five trading days (or `backfillDays`, if more) re-written: NSE sometimes
//            amends a day after it first publishes it.
//   sectors  the newest NSDL fortnight not yet stored, looking at the newest `fortnights` reports.
//   official NSDL's confirmed FPI and DII days and SEBI's mutual-fund days for this month and the
//            last (a few small requests), by trade date; the history before NSE's provisional
//            figures were collected is scripts/refresh-flows.ts --official, by hand.
import type { PrismaClient } from "@/generated/prisma/client";
import { istDay, isTradingDay, latestDueTradingDay } from "@/lib/financials/trading-day";
import { fetchCashFlows, fetchDeals, fetchLatestDealsArchive, fetchParticipantOi } from "./nse";
import { fetchDiiReport, fetchFortnightList, fetchFpiArchiveMonth, fetchSectorReport, tradeDatesFor, type ReportedFlow } from "./nsdl";
import { fetchMfMonth, type MfDay } from "./sebi";
import type { CashFlowDay, Deal, DealKind, ParticipantOiDay, SectorFortnight } from "./types";

const DAY_MS = 86_400_000;
const DEAL_DAYS = 5;
// The deals API is asked for at most this many trading days at a time (a month of bulk deals is ~300 KB).
const DEAL_WINDOW = 20;
const KINDS: DealKind[] = ["BULK", "BLOCK"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The `n` trading days ending at `latest`, newest first. */
export function tradingDaysBack(latest: Date, n: number): Date[] {
  const out: Date[] = [];
  for (let d = latest; out.length < n; d = new Date(d.getTime() - DAY_MS)) if (isTradingDay(d)) out.push(d);
  return out;
}

// ---- writes ---------------------------------------------------------------------------------------

/** One day's cash figures; leaves the day's OI columns as they are. */
export async function writeCashFlows(prisma: PrismaClient, c: CashFlowDay): Promise<void> {
  const data = {
    fiiBuyCr: c.fii.buyCr,
    fiiSellCr: c.fii.sellCr,
    fiiNetCr: c.fii.netCr,
    diiBuyCr: c.dii.buyCr,
    diiSellCr: c.dii.sellCr,
    diiNetCr: c.dii.netCr,
  };
  await prisma.marketFlowDay.upsert({ where: { day: c.day }, create: { day: c.day, ...data }, update: data });
}

/** One day's index-futures OI; leaves the day's cash columns as they are. */
export async function writeParticipantOi(prisma: PrismaClient, o: ParticipantOiDay): Promise<void> {
  const data = {
    fiiIdxFutLong: o.fii.idxFutLong,
    fiiIdxFutShort: o.fii.idxFutShort,
    diiIdxFutLong: o.dii.idxFutLong,
    diiIdxFutShort: o.dii.idxFutShort,
  };
  await prisma.marketFlowDay.upsert({ where: { day: o.day }, create: { day: o.day, ...data }, update: data });
}

/** Every sector row of one fortnight (Grand Total included), in one transaction. */
export async function writeSectorFortnight(prisma: PrismaClient, f: SectorFortnight): Promise<void> {
  // An interactive transaction with a longer wait (as src/lib/financials/write.ts): a batch of 25 upserts
  // timed out waiting for a connection on the shared pooler.
  await prisma.$transaction(
    async (tx) => {
      for (const r of f.rows) {
        const data = { periodLabel: f.periodLabel, netEquityCr: r.netEquityCr, aucEquityCr: r.aucEquityCr };
        await tx.sectorFpiFlow.upsert({
          where: { periodEnd_sector: { periodEnd: f.periodEnd, sector: r.sector } },
          create: { periodEnd: f.periodEnd, sector: r.sector, ...data },
          update: data,
        });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

/** One day's deals of one kind, replacing what was stored for that day and kind (every symbol). */
export async function replaceDeals(prisma: PrismaClient, day: Date, kind: DealKind, deals: Deal[]): Promise<number> {
  const rows = deals.filter((d) => d.kind === kind && d.day.getTime() === day.getTime());
  // Interactive, with the longer wait the company figures use: under load the shared pooler can take
  // more than the default 2 s to hand out a connection for a batch.
  await prisma.$transaction(
    async (tx) => {
      await tx.bulkDeal.deleteMany({ where: { day, kind } });
      await tx.bulkDeal.createMany({
        data: rows.map((d) => ({
          day,
          kind,
          symbol: d.symbol,
          securityName: d.securityName,
          clientName: d.clientName,
          side: d.side,
          quantity: BigInt(Math.round(d.quantity)),
          price: d.price,
        })),
      });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  return rows.length;
}

// ---- official daily history: NSDL FPI, NSDL DII, SEBI mutual funds -------------------------------

/** One trade date's official net figures (₹ crore); a source left out is not touched. */
export type OfficialFlowDay = { day: Date; fpiNsdlNetCr?: number; diiNsdlNetCr?: number; mfSebiNetCr?: number };

/** What the official sources returned: NSDL rows by reporting day, SEBI rows by trade date. */
export type OfficialFetch = { fpi: ReportedFlow[]; dii: ReportedFlow[]; mf: MfDay[]; failed: string[] };

/**
 * The fetched rows merged by trade date. NSDL's reporting days become trade dates through
 * tradeDatesFor (src/lib/flows/nsdl.ts), using every reporting day either NSDL list holds.
 */
export function officialByTradeDate(f: Pick<OfficialFetch, "fpi" | "dii" | "mf">): OfficialFlowDay[] {
  const trade = tradeDatesFor([...f.fpi, ...f.dii].map((r) => r.reportDay));
  const out = new Map<number, OfficialFlowDay>();
  const row = (day: Date) => {
    const have = out.get(day.getTime());
    if (have) return have;
    const fresh: OfficialFlowDay = { day };
    out.set(day.getTime(), fresh);
    return fresh;
  };
  for (const r of f.fpi) row(trade.get(r.reportDay.getTime())!).fpiNsdlNetCr = r.netCr;
  for (const r of f.dii) row(trade.get(r.reportDay.getTime())!).diiNsdlNetCr = r.netCr;
  for (const r of f.mf) row(r.day).mfSebiNetCr = r.netCr;
  return [...out.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

/** Upserts the three official columns only (the provisional NSE and OI columns stay as they are). */
export async function writeOfficialFlows(prisma: PrismaClient, rows: OfficialFlowDay[]): Promise<number> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.$transaction(
      async (tx) => {
        for (const r of rows.slice(i, i + CHUNK)) {
          const data = { fpiNsdlNetCr: r.fpiNsdlNetCr, diiNsdlNetCr: r.diiNsdlNetCr, mfSebiNetCr: r.mfSebiNetCr };
          await tx.marketFlowDay.upsert({ where: { day: r.day }, create: { day: r.day, ...data }, update: data });
        }
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  }
  return rows.length;
}

// NSDL's DII report starts here ("No Data Found" before).
export const DII_REPORT_FROM = Date.UTC(2026, 5, 1);
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0));

/**
 * Fetches the official sources from the start of `from`'s month to `to` (an IST date): NSDL's FPI
 * archive and SEBI's mutual-fund trends one request per month, NSDL's DII report one request per
 * reporting day (from June 2026; only the newest `diiDays` when given). `paceMs` between requests.
 */
export async function fetchOfficialFlows(opts: { from: Date; to: Date; diiDays?: number; paceMs?: number; log?: (m: string) => void }): Promise<OfficialFetch> {
  const log = opts.log ?? (() => {});
  const pace = () => new Promise((r) => setTimeout(r, opts.paceMs ?? 0));
  // One retry after a pause: NSDL's server drops the odd request in a long run.
  const retry = async <T,>(get: () => Promise<T | null>): Promise<T | null> => {
    const first = await get();
    if (first !== null) return first;
    await new Promise((r) => setTimeout(r, 3000));
    return get();
  };
  const out: OfficialFetch = { fpi: [], dii: [], mf: [], failed: [] };
  const months: Date[] = [];
  for (let first = Date.UTC(opts.from.getUTCFullYear(), opts.from.getUTCMonth(), 1); first <= opts.to.getTime(); ) {
    const d = new Date(first);
    const end = monthEnd(d.getUTCFullYear(), d.getUTCMonth());
    months.push(end.getTime() > opts.to.getTime() ? opts.to : end);
    first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  for (const [i, upTo] of months.entries()) {
    const label = upTo.toISOString().slice(0, 7);
    if (i > 0) await pace();
    const fpi = await retry(() => fetchFpiArchiveMonth(upTo));
    if (fpi) out.fpi.push(...fpi);
    else out.failed.push(`fpi ${label}`);
    await pace();
    const mf = await retry(() => fetchMfMonth(upTo));
    if (mf) out.mf.push(...mf);
    else out.failed.push(`mf ${label}`);
    log(`official ${label}: NSDL FPI ${fpi ? fpi.length : "failed"}, SEBI MF ${mf ? mf.length : "failed"}`);
  }
  // DII: NSDL's own reporting days (from the FPI archive), newest first when limited.
  let diiDays = out.fpi.map((r) => r.reportDay).filter((d) => d.getTime() >= DII_REPORT_FROM).reverse();
  if (opts.diiDays) diiDays = diiDays.slice(0, opts.diiDays);
  for (const day of diiDays) {
    await pace();
    const r = await retry(() => fetchDiiReport(day));
    if (r) out.dii.push(r);
    else out.failed.push(`dii ${day.toISOString().slice(0, 10)}`);
  }
  if (diiDays.length) log(`official: NSDL DII ${out.dii.length} of ${diiDays.length} reporting days`);
  return out;
}

// ---- the run --------------------------------------------------------------------------------------

/** "ok": the latest due day; "missing": NSE still shows an older day (stored anyway); "failed": nothing. */
export type CashStatus = "ok" | "missing" | "failed";
export type FlowsSummary = {
  target: string;
  cash: { status: CashStatus; day: string | null };
  oi: { status: "ok" | "partial" | "missing" | "failed"; written: string[]; missing: string[] };
  deals: { status: "ok" | "partial" | "failed"; source: "api" | "archive" | null; days: number; rows: Record<DealKind, number>; failed: DealKind[] };
  sectors: { status: "ok" | "up-to-date" | "partial" | "failed"; written: string[]; missing: string[] };
  /** Days written per official source, the newest trade date each reached, and requests that failed. */
  official: { status: "ok" | "partial" | "failed"; days: number; latest: { fpi: string | null; dii: string | null; mf: string | null }; failed: string[] };
};

export type FlowsOptions = {
  now?: Date;
  log?: (msg: string) => void;
  /** OI days looked back for gaps, and deal days re-written when more than five (default 5). */
  backfillDays?: number;
  /** Newest NSDL reports checked for one not yet stored (default 2). */
  fortnights?: number;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message.trim().split("\n").at(-1) : String(e));

export async function runFlowsRefresh(prisma: PrismaClient, opts: FlowsOptions = {}): Promise<FlowsSummary> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const backfillDays = Math.max(1, opts.backfillDays ?? DEAL_DAYS);
  const latest = latestDueTradingDay(now);
  const summary: FlowsSummary = {
    target: iso(latest),
    cash: { status: "failed", day: null },
    oi: { status: "failed", written: [], missing: [] },
    deals: { status: "failed", source: null, days: 0, rows: { BULK: 0, BLOCK: 0 }, failed: [] },
    sectors: { status: "failed", written: [], missing: [] },
    official: { status: "failed", days: 0, latest: { fpi: null, dii: null, mf: null }, failed: [] },
  };

  // Cash: NSE's latest published day.
  try {
    const cash = await fetchCashFlows();
    if (cash) {
      await writeCashFlows(prisma, cash);
      summary.cash = { status: cash.day.getTime() >= latest.getTime() ? "ok" : "missing", day: iso(cash.day) };
      log(`cash ${iso(cash.day)}: FII net ${cash.fii.netCr} Cr, DII net ${cash.dii.netCr} Cr`);
    } else log("cash: NSE did not answer");
  } catch (e) {
    log(`cash: ${errMsg(e)}`);
  }

  // Participant OI: the latest due day and any gap in the window.
  try {
    const window = tradingDaysBack(latest, backfillDays);
    const stored = await prisma.marketFlowDay.findMany({
      where: { day: { in: window }, fiiIdxFutLong: { not: null } },
      select: { day: true },
    });
    const have = new Set(stored.map((s) => s.day.getTime()));
    const due = window.filter((d) => !have.has(d.getTime()));
    for (const [i, day] of due.entries()) {
      // A long backfill paces itself: hundreds of files back to back got throttled after about 300.
      if (i > 0 && due.length > 5) await new Promise((r) => setTimeout(r, 400));
      const oi = await fetchParticipantOi(day);
      if (oi && oi.day.getTime() === day.getTime()) {
        await writeParticipantOi(prisma, oi);
        summary.oi.written.push(iso(day));
      } else summary.oi.missing.push(iso(day));
    }
    summary.oi.status = summary.oi.missing.length === 0 ? "ok" : summary.oi.written.length ? "partial" : "missing";
    log(`oi: ${window.length - due.length} already stored, ${summary.oi.written.length} written, missing ${summary.oi.missing.join(", ") || "none"}`);
  } catch (e) {
    log(`oi: ${errMsg(e)}`);
  }

  // Deals: the last few trading days, re-written whole, per kind.
  try {
    const days = tradingDaysBack(latest, Math.max(DEAL_DAYS, backfillDays));
    let written = 0;
    for (const kind of KINDS) {
      for (let i = 0; i < days.length; i += DEAL_WINDOW) {
        const chunk = days.slice(i, i + DEAL_WINDOW); // newest first
        const from = chunk[chunk.length - 1];
        const to = chunk[0];
        let deals = await fetchDeals(kind, from, to);
        let source: "api" | "archive" = "api";
        // A five-day window with no bulk deals at all is NSE answering badly, not a quiet market.
        if (deals && kind === "BULK" && deals.length === 0) deals = null;
        if (!deals && i === 0) {
          // The archive holds the latest day only: write just the day its rows carry.
          const latestRows = await fetchLatestDealsArchive(kind);
          if (latestRows?.length) {
            deals = latestRows;
            source = "archive";
          }
        }
        if (!deals) {
          if (!summary.deals.failed.includes(kind)) summary.deals.failed.push(kind);
          log(`deals ${kind} ${iso(from)}..${iso(to)}: NSE did not answer`);
          continue;
        }
        // Every trading day of the window (an empty one clears what was stored), plus any other day
        // the rows carry (a special session); from the archive, only the day it holds.
        const byDay = new Map<number, Deal[]>();
        if (source === "api") for (const d of chunk) byDay.set(d.getTime(), []);
        for (const d of deals) {
          if (d.day.getTime() < from.getTime() || d.day.getTime() > to.getTime()) continue;
          const list = byDay.get(d.day.getTime());
          if (list) list.push(d);
          else byDay.set(d.day.getTime(), [d]);
        }
        for (const [t, rows] of byDay) {
          summary.deals.rows[kind] += await replaceDeals(prisma, new Date(t), kind, rows);
          written++;
        }
        if (summary.deals.source !== "archive") summary.deals.source = source;
        log(`deals ${kind} ${iso(from)}..${iso(to)} (${source}): ${byDay.size} days, ${[...byDay.values()].reduce((s, r) => s + r.length, 0)} rows`);
      }
    }
    summary.deals.days = written;
    summary.deals.status = summary.deals.failed.length === 0 ? "ok" : written ? "partial" : "failed";
  } catch (e) {
    log(`deals: ${errMsg(e)}`);
  }

  // NSDL sectors: the newest fortnights not yet stored.
  try {
    const list = await fetchFortnightList();
    if (!list) throw new Error("NSDL's list did not load");
    const newest = list.slice(0, Math.max(1, opts.fortnights ?? 2));
    const stored = await prisma.sectorFpiFlow.findMany({
      where: { periodEnd: { in: newest.map((l) => l.periodEnd) } },
      distinct: ["periodEnd"],
      select: { periodEnd: true },
    });
    const have = new Set(stored.map((s) => s.periodEnd.getTime()));
    const due = newest.filter((l) => !have.has(l.periodEnd.getTime()));
    for (const link of due) {
      const report = await fetchSectorReport(link.url);
      if (report && report.periodEnd.getTime() === link.periodEnd.getTime()) {
        await writeSectorFortnight(prisma, report);
        summary.sectors.written.push(report.periodLabel);
        log(`sectors ${report.periodLabel}: ${report.rows.length} rows`);
      } else {
        summary.sectors.missing.push(iso(link.periodEnd));
        log(`sectors ${iso(link.periodEnd)}: report did not load or parse (${link.url})`);
      }
    }
    summary.sectors.status = due.length === 0 ? "up-to-date" : summary.sectors.missing.length === 0 ? "ok" : summary.sectors.written.length ? "partial" : "failed";
  } catch (e) {
    log(`sectors: ${errMsg(e)}`);
  }

  // Official figures: this month and the last (so the month's first reporting day has the one before
  // it, and SEBI's week-late figures for last month's end arrive), and NSDL's DII for its newest days.
  try {
    const today = istDay(now);
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const got = await fetchOfficialFlows({ from, to: today, diiDays: 3, paceMs: 500, log });
    const rows = officialByTradeDate(got);
    summary.official.days = await writeOfficialFlows(prisma, rows);
    const latestOf = (k: "fpiNsdlNetCr" | "diiNsdlNetCr" | "mfSebiNetCr") => {
      const r = rows.filter((x) => x[k] !== undefined).at(-1);
      return r ? iso(r.day) : null;
    };
    summary.official.latest = { fpi: latestOf("fpiNsdlNetCr"), dii: latestOf("diiNsdlNetCr"), mf: latestOf("mfSebiNetCr") };
    summary.official.failed = got.failed;
    summary.official.status = got.failed.length === 0 ? "ok" : rows.length ? "partial" : "failed";
  } catch (e) {
    log(`official: ${errMsg(e)}`);
  }

  return summary;
}
