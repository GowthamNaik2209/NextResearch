// Refreshing the company table from Screener.in: reading one company's page, and the daily runs that
// re-snapshot every company and then publish them together. Server side only (it fetches Screener
// and writes the database); shared by the app's automatic refresh (./auto.ts, the visit trigger and
// the cron route) and scripts/refresh-financials.ts (by hand). It takes the Prisma client and imports
// nothing from Next, so it runs under tsx too.
//
// A run is one FinancialsRun row per IST trading day. Each chunk claims the run's lease (one chunk at
// a time across every instance), snapshots the companies that have no KpiSnapshot dated that day
// yet, a few seconds apart, saves progress after each, and releases the lease. When every tracked
// company has been tried, the run is PUBLISHED: the app shows snapshots dated on or before the latest
// published run (./query.ts), so the whole table moves to the new date in one step, and a company
// Screener could not read keeps its previous snapshot and its own (older) date.
//
// Automatic runs write only KpiSnapshot rows (price, valuation, ratios, CAGR, 52-week range). The
// FY22-FY26 revenue/profit history (FinancialSnapshot) is curated and changes only by hand
// (--fix-history, --add), so a run in progress can never change the history the site shows.
//
// Basis: a company whose note says "standalone figures" is read from Screener's standalone page;
// everything else from consolidated, falling back to standalone when the consolidated page is an empty
// template (the same rule as the live pop-up, src/lib/live/screener-company.ts).
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { isUsablePage, parseCompanyPage, parseShareholdingHistory } from "@/lib/live/screener-company";
import { shareholdingWriter } from "@/lib/flows/shareholding";
import type { ShareholdingQuarter } from "@/lib/flows/types";
import type { SupplierFinancials } from "@/lib/sector-content";
import { listIpos } from "@/lib/ipo-content";
import { FISCAL_YEARS, formatAsOf, formatPrice } from "./rows";
import { readCompanyTable } from "./query";
import { latestDueTradingDay } from "./trading-day";
import { writeFinancials } from "./write";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Screener

/** Screener refused us (429 rate limit, 403 block, 503): stop and back off rather than hammer it. */
export class ScreenerBlocked extends Error {
  constructor(readonly status: number) {
    super(`Screener answered ${status}`);
  }
}

export type FetchOptions = { attempts: number; timeoutMs: number; retryDelayMs: number };
// The script's defaults (patient); the automatic refresh passes tighter ones to fit its time budget.
export const SCRIPT_FETCH: FetchOptions = { attempts: 4, timeoutMs: 20_000, retryDelayMs: 3000 };

// "missing" (404) is a real answer; null means the request itself failed (network, timeout, 5xx).
async function get(url: string, o: FetchOptions): Promise<string | "missing" | null> {
  for (let attempt = 0; attempt < o.attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(o.timeoutMs) });
      if (res.status === 404) return "missing";
      if (res.ok) return await res.text();
      if (res.status === 429 || res.status === 403 || res.status === 503) throw new ScreenerBlocked(res.status);
    } catch (e) {
      if (e instanceof ScreenerBlocked) throw e;
      // network error or timeout: retry below
    }
    if (attempt < o.attempts - 1) await sleep(o.retryDelayMs * (attempt + 1));
  }
  return null;
}

// Screener addresses most companies by NSE symbol; SME, BSE-only and trust listings by a BSE code.
async function resolveBase(ticker: string, tlSlug: string | null, o: FetchOptions): Promise<string | null> {
  for (const q of [ticker, tlSlug?.replace(/-/g, " ").replace(/\b(ltd|limited)\b/g, "").trim()]) {
    if (!q) continue;
    const res = await get(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}`, o);
    if (!res || res === "missing") continue;
    const hits = JSON.parse(res) as { url: string }[];
    const url = hits.find((h) => /^\/company\/[^/]+\//.test(h.url))?.url;
    if (url) return `https://www.screener.in${url.match(/^\/company\/[^/]+/)![0]}`;
  }
  return null;
}

export type Snap = {
  name: string | null;
  mcap: string;
  price: number;
  range: [number, number] | null;
  cagr: (number | null)[];
  kpi: (number | null)[];
  basis: "consolidated" | "standalone";
  latestRev: { year: string; value: number | null } | null;
  history: { years: string[]; rev: (number | null)[]; np: (number | null)[] } | null;
  // Every quarter of the shareholding table (src/lib/flows/shareholding.ts stores them).
  shareholding: ShareholdingQuarter[];
};

const yearOf = (label: string) => Number(label.match(/(\d{4})$/)?.[1] ?? 0);
const latestYear = (html: string) => {
  const ys = parseCompanyPage(html).annual?.years.filter((y) => /^[A-Z][a-z]{2} \d{4}$/.test(y)) ?? [];
  return ys.length ? yearOf(ys[ys.length - 1]) : 0;
};

// Screener addresses a few listings by a code its search doesn't return for the ticker.
const SCREENER_ID: Record<string, string> = { ALTIUSINVIT: "543225" };

export const isStandalone = (f: SupplierFinancials) => /standalone figures/i.test(f.note ?? "");

/** One company's current figures from Screener, or null when its page could not be read. Throws ScreenerBlocked. */
export async function fetchSnapshot(ticker: string, standalone: boolean, tlSlug: string | null, o: FetchOptions = SCRIPT_FETCH): Promise<Snap | null> {
  let base = `https://www.screener.in/company/${encodeURIComponent(SCREENER_ID[ticker] ?? ticker)}`;
  let basis: Snap["basis"] = standalone ? "standalone" : "consolidated";
  let html = await get(standalone ? `${base}/` : `${base}/consolidated/`, o);
  if (html === "missing") {
    const found = await resolveBase(ticker, tlSlug, o);
    if (!found) return null;
    base = found;
    html = await get(standalone ? `${base}/` : `${base}/consolidated/`, o);
  }
  if (html === null || html === "missing") return null;
  if (!standalone) {
    // Consolidated is the default; standalone when it is an empty template or its accounts stop
    // years earlier than the standalone page's (a stale consolidated filing, e.g. RailTel).
    const usable = isUsablePage(html);
    if (!usable || latestYear(html) < new Date().getFullYear() - 1) {
      const sa = await get(`${base}/`, o);
      if (sa === null) return null;
      if (sa !== "missing" && isUsablePage(sa) && (!usable || latestYear(sa) > latestYear(html))) {
        html = sa;
        basis = "standalone";
      }
    }
  }
  const page = parseCompanyPage(html);
  const k = page.kpi;
  if (!k || k.price == null || !k.marketCap) return null;
  const pct = (title: string, period: string) => {
    const v = page.growth.find((g) => g.title === title)?.rows.find((r) => r.period === period)?.value;
    const n = v ? parseFloat(v.replace(/[%,]/g, "")) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const cagr = [pct("Stock Price CAGR", "1 Year"), pct("Stock Price CAGR", "3 Years"), pct("Stock Price CAGR", "5 Years")];
  // Latest full fiscal year's revenue: Screener labels lenders' top line "Revenue", others "Sales".
  // Lenders' P&L has a "Revenue" row instead of "Sales"; parseCompanyPage keeps only Sales, so read it here.
  const sales = page.annual?.series.find((s) => s.label === "Sales") ?? revenueRow(html, page.annual?.years ?? []);
  const profit = page.annual?.series.find((s) => s.label === "Net Profit");
  let latestRev: Snap["latestRev"] = null;
  let history: Snap["history"] = null;
  if (page.annual && sales) {
    const idxs = page.annual.years.map((y, i) => (/^[A-Z][a-z]{2} \d{4}$/.test(y) ? i : -1)).filter((i) => i >= 0);
    const idx = idxs.at(-1);
    if (idx != null) latestRev = { year: page.annual.years[idx], value: sales.values[idx] };
    // every full year on the page (about five); aligned by year in fiscalColumns()
    history = {
      years: idxs.map((i) => page.annual!.years[i]),
      rev: idxs.map((i) => sales.values[i] ?? null),
      np: idxs.map((i) => profit?.values[i] ?? null),
    };
  }
  return {
    name: html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1].trim() ?? null,
    mcap: k.marketCap,
    price: k.price,
    range: k.low52w != null && k.high52w != null ? [k.low52w, k.high52w] : null,
    cagr,
    kpi: [k.pe, k.bookValue, k.divYield, k.roce, k.roe, k.faceValue],
    basis,
    latestRev,
    history,
    shareholding: parseShareholdingHistory(html),
  };
}

function revenueRow(html: string, years: string[]): { label: string; values: (number | null)[] } | undefined {
  const i = html.indexOf('id="profit-loss"');
  if (i < 0 || !years.length) return undefined;
  const table = html.slice(html.indexOf("<table", i), html.indexOf("</table>", i));
  const row = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/\s*\+\s*$/, "").trim()))
    .find((cells) => cells[0] === "Revenue");
  if (!row) return undefined;
  const vals = row.slice(1).map((v) => {
    const n = parseFloat(v.replace(/[,%\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  });
  return { label: "Revenue", values: vals.slice(-years.length) };
}

// FY22-FY26 from Screener's years: Mar 2022-Mar 2026, or Dec 2021-Dec 2025 for a company whose page
// reports calendar years.
export function fiscalColumns(h: NonNullable<Snap["history"]>) {
  const dec = h.years.at(-1)?.startsWith("Dec");
  const want = FISCAL_YEARS.map((y) => (dec ? `Dec ${y - 1}` : `Mar ${y}`));
  const pick = (vals: (number | null)[]) =>
    want.map((y) => {
      const j = h.years.indexOf(y);
      return j < 0 ? null : (vals[j] ?? null);
    });
  return { dec: !!dec, want, rev: pick(h.rev), np: pick(h.np) };
}

/** A company's figures with today's price/valuation from Screener; its history and notes unchanged. */
export function withSnapshot(old: SupplierFinancials, s: Snap, asOf: Date): SupplierFinancials {
  // A KPI authored as null is a curated "not meaningful" (e.g. a REIT's P/E and ROE): keep it null.
  const kpi = old.kpi ? s.kpi.map((v, i) => (old.kpi![i] === null ? null : v)) : s.kpi;
  return { ...old, mcap: s.mcap, price: formatPrice(s.price), cagr: s.cagr, range: s.range, kpi, asOf: formatAsOf(asOf) };
}

/** A company new to the table (--add, or an IPO on its listing day): figures and full FY history from Screener. */
export function newCompanyFigures(ticker: string, s: Snap, asOf: Date): SupplierFinancials | null {
  if (!s.history) return null;
  const cols = fiscalColumns(s.history);
  const note =
    [
      s.basis === "standalone" ? "standalone figures" : null,
      cols.dec ? "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025" : null,
      cols.rev.some((v) => v == null) ? "years before its listing or not on Screener left blank" : null,
    ]
      .filter(Boolean)
      .join("; ") || null;
  return { ticker, rev: cols.rev, np: cols.np, mcap: s.mcap, price: formatPrice(s.price), note, cagr: s.cagr, range: s.range, tl: null, kpi: s.kpi, asOf: formatAsOf(asOf) };
}

/**
 * IPOs that are listed by `day` (their deck's live stage, src/lib/ipo-content/status.ts) and carry a
 * ticker the company table doesn't track yet: a run adds them, so a new listing publishes with
 * everyone else on one date. A listed deck without a ticker is skipped (symbols are never guessed).
 */
export function listedIposToAdd(tracked: ReadonlySet<string>, day: Date, log: (msg: string) => void): { ticker: string; name: string }[] {
  const out: { ticker: string; name: string }[] = [];
  for (const r of listIpos(day.getTime())) {
    if (r.status.stage !== "listed") continue;
    if (!r.ticker) {
      log(`IPO "${r.name}" is listed but its deck has no ticker yet - not added (set IpoReport.ticker)`);
      continue;
    }
    if (!tracked.has(r.ticker)) out.push({ ticker: r.ticker, name: r.name });
  }
  return out;
}

// ---------------------------------------------------------------- runs

export type Run = { id: string; snapshotDate: Date; status: "RUNNING" | "PUBLISHED" | "FAILED"; done: number; total: number; failed: string[] };

const dayStr = (d: Date) => d.toISOString().slice(0, 10);
const NOW_UTC = "(now() AT TIME ZONE 'UTC')";

/**
 * Claims the run for `date` (creating it), atomically, or returns null when another chunk holds a
 * live lease on it or on any other run. Automatic chunks claim only a RUNNING run; `manual` (the
 * script) may also re-run a published or failed date, keeping its status until it publishes again.
 */
export async function claimRun(prisma: PrismaClient, date: Date, opts: { leaseSeconds: number; manual?: boolean }): Promise<Run | null> {
  const day = dayStr(date);
  const lease = `${Math.ceil(opts.leaseSeconds)} seconds`;
  const rows = await prisma.$queryRawUnsafe<Run[]>(
    `INSERT INTO "FinancialsRun" ("id", "snapshotDate", "status", "leaseUntil", "startedAt")
     SELECT $1, $2::timestamp(3), 'RUNNING'::"FinancialsRunStatus", ${NOW_UTC} + $3::interval, ${NOW_UTC}
     WHERE NOT EXISTS (
       SELECT 1 FROM "FinancialsRun" o WHERE o."snapshotDate" <> $2::timestamp(3) AND o."leaseUntil" > ${NOW_UTC}
     )
     ON CONFLICT ("snapshotDate") DO UPDATE SET "leaseUntil" = EXCLUDED."leaseUntil"
     WHERE ("FinancialsRun"."status" = 'RUNNING' OR $4::boolean)
       AND ("FinancialsRun"."leaseUntil" IS NULL OR "FinancialsRun"."leaseUntil" < ${NOW_UTC})
     RETURNING "id", "snapshotDate", "status"::text AS "status", "done", "total", "failed"`,
    randomUUID(),
    day,
    lease,
    !!opts.manual,
  );
  return rows[0] ?? null;
}

/** Records progress and extends the lease. */
export async function saveProgress(prisma: PrismaClient, run: Run, leaseSeconds: number) {
  await prisma.financialsRun.update({
    where: { id: run.id },
    data: { done: run.done, total: run.total, failed: run.failed, leaseUntil: new Date(Date.now() + leaseSeconds * 1000) },
  });
}

/** Releases the lease; `backoffSeconds` keeps it held that long instead (Screener refused us). */
export async function releaseRun(prisma: PrismaClient, run: Run, backoffSeconds = 0) {
  await prisma.financialsRun.update({
    where: { id: run.id },
    data: { done: run.done, total: run.total, failed: run.failed, leaseUntil: backoffSeconds ? new Date(Date.now() + backoffSeconds * 1000) : null },
  });
}

/** Marks the run published (the site switches to its date) and releases the lease. */
export async function publishRun(prisma: PrismaClient, run: Run) {
  await prisma.financialsRun.update({
    where: { id: run.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), done: run.done, total: run.total, failed: run.failed, leaseUntil: null },
  });
  run.status = "PUBLISHED";
}

export type ChunkResult =
  | { status: "up-to-date"; date: string }
  | { status: "busy"; date: string }
  | { status: "progress" | "published" | "blocked" | "failed"; date: string; done: number; total: number; failed: string[]; wrote: number };

export type ChunkOptions = {
  now?: Date;
  /** Stop starting new companies after this long (a company already started finishes). */
  budgetMs: number;
  /** Each worker's pause between companies, to be polite to Screener (default 1s). */
  gapMs?: number;
  log?: (msg: string) => void;
  /** Called once the run is published (the app revalidates its cache here). */
  onPublished?: (run: Run) => void | Promise<void>;
};

// Tighter than the script's: a chunk runs after a response, inside the function's time limit.
const CHUNK_FETCH: FetchOptions = { attempts: 2, timeoutMs: 10_000, retryDelayMs: 2000 };
const CHUNK_WORKERS = 2;
// More misses than this and a run is not published (see runChunk); a couple of companies Screener
// can't read (e.g. DIGIFIBRE, STONEINDIA) just keep their older snapshot and date.
export const maxFailures = (total: number) => Math.max(5, Math.ceil(total * 0.05));
// Screener refused us: no chunk for this long (the lease is held, so every instance waits).
const BLOCKED_BACKOFF_SECONDS = 15 * 60;

/**
 * Runs one chunk of the refresh that is due (the latest NSE trading day past 18:30 IST, see
 * ./trading-day.ts), if no other chunk is running: up to `budgetMs` of companies, then saves
 * progress, and publishes when every company has been tried.
 */
export async function runChunk(prisma: PrismaClient, opts: ChunkOptions): Promise<ChunkResult> {
  const log = opts.log ?? ((m: string) => console.log(`financials refresh: ${m}`));
  const started = Date.now();
  const target = latestDueTradingDay(opts.now ?? new Date());
  const date = formatAsOf(target);

  const published = await prisma.financialsRun.findFirst({ where: { status: "PUBLISHED" }, orderBy: { snapshotDate: "desc" }, select: { snapshotDate: true } });
  if (published && published.snapshotDate.getTime() >= target.getTime()) return { status: "up-to-date", date };

  // The lease outlives the budget by the slowest company (a few fetches with timeouts) and the writes.
  const leaseSeconds = Math.ceil(opts.budgetMs / 1000) + 120;
  const run = await claimRun(prisma, target, { leaseSeconds });
  if (!run) return { status: "busy", date };

  try {
    // An older run that never finished is superseded: its writes stay hidden (dated before this run,
    // but the published date moves straight past them) and it no longer counts as in progress.
    await prisma.financialsRun.updateMany({
      where: { status: "RUNNING", snapshotDate: { lt: target }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
      data: { status: "FAILED", leaseUntil: null },
    });

    const table = await readCompanyTable(prisma);
    const doneRows = await prisma.kpiSnapshot.findMany({ where: { asOf: target, company: { tracked: true } }, select: { company: { select: { ticker: true } } } });
    const done = new Set(doneRows.map((r) => r.company.ticker));
    const failed = new Set(run.failed);
    // Newly listed IPOs join this run (full history, tracked from now on); until it publishes they
    // have no snapshot on or before the published date, so the site doesn't show them yet (query.ts).
    const ipos = listedIposToAdd(new Set(Object.keys(table)), target, log);
    const newNames = new Map(ipos.map((i) => [i.ticker, i.name]));
    const all: SupplierFinancials[] = [...Object.values(table), ...ipos.map((i) => ({ ticker: i.ticker }))];
    const todo = all.filter((f) => !done.has(f.ticker) && !failed.has(f.ticker));
    run.total = all.length;
    run.done = all.filter((f) => done.has(f.ticker)).length;

    let wrote = 0;
    let blocked = false;
    const saveShareholding = shareholdingWriter(prisma, log);
    let next = 0;
    const gap = opts.gapMs ?? 1000;
    // A couple of companies at a time, each worker pausing between requests (the script runs three).
    const worker = async () => {
      while (!blocked && next < todo.length && Date.now() - started < opts.budgetMs) {
        const old = todo[next++];
        let s: Snap | null = null;
        try {
          s = await fetchSnapshot(old.ticker, isStandalone(old), old.tl?.[1] ?? null, CHUNK_FETCH);
          if (!s && !blocked && Date.now() - started < opts.budgetMs) {
            await sleep(3000);
            s = await fetchSnapshot(old.ticker, isStandalone(old), old.tl?.[1] ?? null, CHUNK_FETCH);
          }
        } catch (e) {
          if (!(e instanceof ScreenerBlocked)) throw e;
          if (!blocked) log(`${e.message} at ${old.ticker}; backing off ${BLOCKED_BACKOFF_SECONDS / 60} min`);
          blocked = true; // this company stays untried (no snapshot for the day, not failed): the next chunk takes it
          return;
        }
        const name = newNames.get(old.ticker);
        const fresh = s && name ? newCompanyFigures(old.ticker, s, target) : null;
        if (s && name && fresh) {
          await writeFinancials(prisma, fresh, target, { identity: { name, listed: true, role: "" } });
          await saveShareholding(old.ticker, s.shareholding);
          log(`added newly listed ${old.ticker} (${name})`);
          run.done++;
          wrote++;
        } else if (s && !name) {
          await writeFinancials(prisma, withSnapshot(old, s, target), target, { identity: { name: old.ticker }, history: false });
          await saveShareholding(old.ticker, s.shareholding);
          run.done++;
          wrote++;
        } else {
          run.failed = [...run.failed, old.ticker];
        }
        await saveProgress(prisma, run, leaseSeconds);
        await sleep(gap);
      }
    };
    // On an error, stop the other worker before giving the lease back (allSettled waits for it).
    const settled = await Promise.allSettled(
      Array.from({ length: CHUNK_WORKERS }, () =>
        worker().catch((e) => {
          blocked = true;
          throw e;
        }),
      ),
    );
    const err = settled.find((r) => r.status === "rejected");
    if (err) throw (err as PromiseRejectedResult).reason;

    const finished = !blocked && next >= todo.length;
    if (finished && run.failed.length > maxFailures(run.total)) {
      // Too many misses (Screener down or its markup changed): publishing would show a mix of new and
      // old dates. The run is abandoned; the site stays on the last published date and tomorrow's run
      // tries again. Fix with scripts/refresh-financials.ts (dry run first).
      await prisma.financialsRun.update({ where: { id: run.id }, data: { status: "FAILED", done: run.done, total: run.total, failed: run.failed, leaseUntil: null } });
      console.error(`financials refresh: NOT published ${date} - ${run.failed.length}/${run.total} companies could not be read: ${run.failed.slice(0, 20).join(", ")}`);
      return { status: "failed", date, done: run.done, total: run.total, failed: run.failed, wrote };
    }
    if (finished) {
      await publishRun(prisma, run);
      log(`published ${date}: ${run.done}/${run.total} companies${run.failed.length ? `, kept older figures for ${run.failed.join(", ")}` : ""}`);
      await opts.onPublished?.(run);
    } else {
      await releaseRun(prisma, run, blocked ? BLOCKED_BACKOFF_SECONDS : 0);
      log(`${date}: ${run.done}/${run.total} done (+${wrote} this chunk), ${run.failed.length} failed`);
    }
    return { status: finished ? "published" : blocked ? "blocked" : "progress", date, done: run.done, total: run.total, failed: run.failed, wrote };
  } catch (e) {
    // Give the lease back so the next visit can carry on; the error goes to the caller's log.
    await releaseRun(prisma, run).catch(() => {});
    throw e;
  }
}
