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
import type { PrismaClient } from "@/generated/prisma/client";
import { isTradingDay, latestDueTradingDay } from "@/lib/financials/trading-day";
import { fetchCashFlows, fetchDeals, fetchLatestDealsArchive, fetchParticipantOi } from "./nse";
import { fetchFortnightList, fetchSectorReport } from "./nsdl";
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
  await prisma.$transaction([
    prisma.bulkDeal.deleteMany({ where: { day, kind } }),
    prisma.bulkDeal.createMany({
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
    }),
  ]);
  return rows.length;
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
    for (const day of due) {
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

  return summary;
}
