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
import { hasQuote } from "./no-quote";
import { latestDueTradingDay } from "./trading-day";
import { lenderColumnsKnownMissing, writeFinancials } from "./write";
import { companyKind } from "./kinds";
import { lenderFromStandalone, type LenderFigures } from "./lender";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** The pause between requests to Screener (a chunk's default gap between companies, and before a lender's extra request). */
export const DEFAULT_GAP_MS = 1000;

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
  // Lenders only (companyKind "lender"), standalone basis: NPAs, financing margin, net profit, total assets, deposits.
  lender?: LenderFigures;
};

// A full year's column: "Mar 2026", or "Mar 2022 (S)", a year Screener's consolidated view fills from
// the standalone accounts (before the company had subsidiaries). Not "Mar 2023 15m" or "TTM".
const FULL_YEAR = /^[A-Z][a-z]{2} \d{4}(?: \(S\))?$/;
const yearLabel = (label: string) => label.replace(/ \(S\)$/, "");
const yearOf = (label: string) => Number(yearLabel(label).match(/(\d{4})$/)?.[1] ?? 0);
const annualYears = (html: string) => parseCompanyPage(html).annual?.years.filter((y) => FULL_YEAR.test(y)).map(yearLabel) ?? [];
const latestRevenueOf = (html: string) => {
  const a = parseCompanyPage(html).annual;
  const sales = a?.series.find((x) => x.label === "Sales");
  const i = a ? a.years.findLastIndex((y) => FULL_YEAR.test(y)) : -1;
  return i >= 0 ? (sales?.values[i] ?? null) : null;
};
const latestOf = (ys: string[]) => (ys.length ? yearOf(ys[ys.length - 1]) : 0);

/** Consolidated accounts with fewer full years than this (a group that began consolidating lately) are checked against the standalone page. */
export const SHORT_CONSOLIDATED_YEARS = 3;

/**
 * The latest March fiscal year whose annual results should be out by `now`: listed companies file
 * within 60 days of 31 March, so from July the year just ended (FY26 from July 2026), before that the
 * one before. A consolidated page whose accounts stop earlier is checked against the standalone page
 * (Screener's consolidated view lagged a year for HATSUN, JYOTHYLAB, UCOBANK, FACT and others in 2026).
 */
export function latestFiscalYearDue(now: Date): number {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/**
 * Whether to read a company's standalone page instead of its consolidated one: the consolidated page
 * is an empty template, its accounts stop years earlier (a stale consolidated filing, e.g. RailTel),
 * or they start much later - fewer than SHORT_CONSOLIDATED_YEARS years to the same latest year where
 * the standalone page has more (UGRO Capital: consolidated from FY26 only, standalone back to FY22).
 */
export function preferStandalone(
  cons: { usable: boolean; years: string[]; latestRev?: number | null },
  sa: { usable: boolean; years: string[]; latestRev?: number | null } | null,
): boolean {
  if (!sa?.usable) return false;
  if (!cons.usable) return true;
  const [lc, ls] = [latestOf(cons.years), latestOf(sa.years)];
  if (ls > lc) return true;
  if (ls === lc && cons.years.length < SHORT_CONSOLIDATED_YEARS && sa.years.length > cons.years.length) return true;
  // The consolidated view skips years the standalone page has (AGI: Mar 2019 then Mar 2025) and the two
  // agree on the latest revenue (within 5%), so the subsidiaries are small: standalone, with every year.
  const close = cons.latestRev != null && sa.latestRev != null && Math.abs(cons.latestRev - sa.latestRev) <= 0.05 * Math.max(1, Math.abs(sa.latestRev));
  return ls === lc && close && hasYearGap(cons.years) && !hasYearGap(sa.years);
}

/** Whether a page's last five full years skip one (Mar 2019, Mar 2025: four years missing). */
export function hasYearGap(years: string[]): boolean {
  const ys = years.slice(-5).map(yearOf);
  return ys.some((y, i) => i > 0 && y - ys[i - 1] > 1);
}

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
  let saPage: string | "missing" | null | undefined; // the standalone page when this check fetched it
  if (!standalone) {
    // Consolidated is the default; standalone when it is an empty template or its accounts stop
    // years earlier than the standalone page's (a stale consolidated filing, e.g. RailTel), or start
    // much later (preferStandalone).
    const usable = isUsablePage(html);
    const consYears = usable ? annualYears(html) : [];
    if (!usable || latestOf(consYears) < latestFiscalYearDue(new Date()) || consYears.length < SHORT_CONSOLIDATED_YEARS || hasYearGap(consYears)) {
      const sa = await get(`${base}/`, o);
      saPage = sa;
      if (sa === null) return null;
      const consSide = { usable, years: consYears, latestRev: usable ? latestRevenueOf(html) : null };
      if (sa !== "missing" && preferStandalone(consSide, { usable: isUsablePage(sa), years: annualYears(sa), latestRev: latestRevenueOf(sa) })) {
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
    const idxs = page.annual.years.map((y, i) => (FULL_YEAR.test(y) ? i : -1)).filter((i) => i >= 0);
    const idx = idxs.at(-1);
    if (idx != null) latestRev = { year: yearLabel(page.annual.years[idx]), value: sales.values[idx] };
    // every full year on the page (about five); aligned by year in fiscalColumns()
    history = {
      years: idxs.map((i) => yearLabel(page.annual!.years[i])),
      rev: idxs.map((i) => sales.values[i] ?? null),
      np: idxs.map((i) => profit?.values[i] ?? null),
    };
  }
  const lender = companyKind(ticker) === "lender" ? await lenderFigures(basis === "standalone" ? html : saPage, base, o) : undefined;
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
    ...(lender ? { lender } : {}),
  };
}

/**
 * Where a lender's figures come from: the standalone page already read ("page"), one more request
 * ("fetch"), or none ("skip") when that request would be pointless because this process already
 * found the database has no lender columns to store them in (./write.ts; migration not applied).
 */
export function lenderSource(standalonePage: string | "missing" | null | undefined, columnsMissing: boolean): "page" | "fetch" | "skip" {
  if (standalonePage !== undefined) return "page";
  return columnsMissing ? "skip" : "fetch";
}

// A lender's figures, always from its standalone page (./lender.ts says why): a page already read
// (the snapshot's own when standalone, or the basis check's), else one more request, after the
// usual pause between requests. A standalone page that cannot be read gives an all-null block, never
// consolidated figures (the app then shows the latest earlier day's, ./blocks.ts). ScreenerBlocked
// propagates like the main request's.
async function lenderFigures(standalonePage: string | "missing" | null | undefined, base: string, o: FetchOptions): Promise<LenderFigures | undefined> {
  const from = lenderSource(standalonePage, lenderColumnsKnownMissing());
  if (from === "skip") return undefined;
  if (from === "page" && standalonePage !== undefined) return lenderFromStandalone(standalonePage);
  await sleep(DEFAULT_GAP_MS);
  return lenderFromStandalone(await get(`${base}/`, o));
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

/**
 * When a company listed, as far as we can tell (only years that ended before it count as "before
 * its listing"): the price store's first day (it holds five years, so a long-listed company's first
 * day is just the store's start), pulled earlier by Screener's price CAGRs (a 5-year CAGR means listed
 * at least five years ago). With no price day and no CAGR at all it listed within the year, so a
 * year before asOf minus one year is safely before it. Null when nothing is known.
 */
export function listingBound(cagr: (number | null)[] | null | undefined, firstPriceDay: Date | null, asOf: Date): Date | null {
  const back = (n: number) => new Date(Date.UTC(asOf.getUTCFullYear() - n, asOf.getUTCMonth(), asOf.getUTCDate()));
  const yearsBack = cagr?.[2] != null ? 5 : cagr?.[1] != null ? 3 : cagr?.[0] != null ? 1 : null;
  const atLeast = yearsBack == null ? null : back(yearsBack);
  if (firstPriceDay) return atLeast && atLeast < firstPriceDay ? atLeast : firstPriceDay;
  if (atLeast) return atLeast;
  return cagr && cagr.length ? back(1) : null;
}

// The generic clause older adds wrote, and the ones blankYearsNote writes.
const BLANK_CLAUSE = /^(?:years before its listing or not on Screener left blank|(?:FY|CY)\d\d.*(?:before its listing|not on Screener)[^;]*left blank)$/i;

const yearsLabel = (idx: number[], dec: boolean) => {
  const name = (i: number) => (dec ? `CY${FISCAL_YEARS[i] - 1}` : `FY${String(FISCAL_YEARS[i]).slice(2)}`);
  const runs: number[][] = [];
  for (const i of idx) (runs.length && runs.at(-1)!.at(-1) === i - 1 ? runs.at(-1)!.push(i) : runs.push([i]));
  return runs.map((r) => (r.length > 1 ? `${name(r[0])}-${name(r.at(-1)!)}` : name(r[0]))).join(", ");
};

/**
 * Why a company's blank FY22-FY26 columns are blank, from the year each one ended and when the
 * company listed: "FY22-FY23 before its listing, left blank" only for years that ended before it
 * listed, "FY22 not on Screener, left blank" otherwise (ACC, PGHH: listed for decades). With no
 * listing date known every blank year is "not on Screener". Null when no year is blank.
 */
export function blankYearsNote(rev: (number | null)[], np: (number | null)[], o: { listedOn: Date | null; dec: boolean }): string | null {
  const blank = FISCAL_YEARS.map((_, i) => i).filter((i) => rev[i] == null || np[i] == null);
  if (!blank.length) return null;
  const ended = (i: number) => (o.dec ? Date.UTC(FISCAL_YEARS[i] - 1, 11, 31) : Date.UTC(FISCAL_YEARS[i], 2, 31));
  const pre = blank.filter((i) => o.listedOn != null && ended(i) < o.listedOn.getTime());
  const other = blank.filter((i) => !pre.includes(i));
  return [pre.length ? `${yearsLabel(pre, o.dec)} before its listing, left blank` : null, other.length ? `${yearsLabel(other, o.dec)} not on Screener, left blank` : null]
    .filter(Boolean)
    .join("; ");
}

/**
 * A company's note with its blank-years clause rewritten for the history it now has (after
 * --fix-history, or to correct the reason): the generic or earlier clause is replaced by
 * blankYearsNote's; when no year is blank any more every "... left blank" clause is dropped (null if
 * nothing else is left). Other clauses stay as authored. A history read from the standalone page
 * adds "standalone figures" when the note does not say so yet.
 */
export function noteAfterHistoryFix(
  note: string | null | undefined,
  rev: (number | null)[],
  np: (number | null)[],
  basis: Snap["basis"] = "consolidated",
  o: { listedOn: Date | null; dec: boolean } = { listedOn: null, dec: /jan-dec/i.test(note ?? "") && !/moved from/i.test(note ?? "") },
): string | null {
  // History now read from the standalone page: say so, so later refreshes read that page too (isStandalone).
  let clauses = note ? note.split("; ") : [];
  if (basis === "standalone" && !/standalone figures/i.test(note ?? "")) clauses.push("standalone figures");
  const full = !rev.some((v) => v == null) && !np.some((v) => v == null);
  if (full) return clauses.filter((c) => !/left blank/i.test(c)).join("; ") || null;
  const hadGeneric = clauses.some((c) => BLANK_CLAUSE.test(c));
  clauses = clauses.filter((c) => !BLANK_CLAUSE.test(c));
  // A curated reason for the blanks (NESTLEIND's change of year) is kept, and no generic clause added.
  if (hadGeneric || !clauses.some((c) => /left blank/i.test(c))) clauses.push(blankYearsNote(rev, np, o)!);
  return clauses.join("; ") || null;
}

/** A company new to the table (--add, or an IPO on its listing day): figures and full FY history from Screener. */
export function newCompanyFigures(ticker: string, s: Snap, asOf: Date, firstPriceDay: Date | null = null): SupplierFinancials | null {
  if (!s.history) return null;
  const cols = fiscalColumns(s.history);
  const note =
    [
      s.basis === "standalone" ? "standalone figures" : null,
      cols.dec ? "Reports Jan-Dec fiscal year: the FY22-FY26 columns hold CY2021-CY2025" : null,
      blankYearsNote(cols.rev, cols.np, { listedOn: listingBound(s.cagr, firstPriceDay, asOf), dec: cols.dec }),
    ]
      .filter(Boolean)
      .join("; ") || null;
  return { ticker, rev: cols.rev, np: cols.np, mcap: s.mcap, price: formatPrice(s.price), note, cagr: s.cagr, range: s.range, tl: null, kpi: s.kpi, asOf: formatAsOf(asOf) };
}

/**
 * How a company new to the table is written (--add, an IPO on its listing day): listed, under its
 * name and role, with a lender's own figures from the same Screener read (never dropped, or its
 * lending block stays empty until the next full refresh).
 */
export function newCompanyWriteOptions(s: Pick<Snap, "lender">, name: string, role = ""): Parameters<typeof writeFinancials>[3] {
  return { identity: { name, listed: true, role }, lender: s.lender ?? null };
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
// can't read just keep their older snapshot and date (listings with no traded price are not tried).
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
    // Listings with no traded price (./no-quote.ts) keep their stored figures and are not tried.
    const all: SupplierFinancials[] = [...Object.values(table), ...ipos.map((i) => ({ ticker: i.ticker }))].filter((f) => hasQuote(f.ticker));
    const todo = all.filter((f) => !done.has(f.ticker) && !failed.has(f.ticker));
    run.total = all.length;
    run.done = all.filter((f) => done.has(f.ticker)).length;

    let wrote = 0;
    let blocked = false;
    const saveShareholding = shareholdingWriter(prisma, log);
    let next = 0;
    const gap = opts.gapMs ?? DEFAULT_GAP_MS;
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
        const fresh = s && name ? newCompanyFigures(old.ticker, s, target, target) : null; // listing today
        if (s && name && fresh) {
          await writeFinancials(prisma, fresh, target, newCompanyWriteOptions(s, name));
          await saveShareholding(old.ticker, s.shareholding);
          log(`added newly listed ${old.ticker} (${name})`);
          run.done++;
          wrote++;
        } else if (s && !name) {
          await writeFinancials(prisma, withSnapshot(old, s, target), target, { identity: { name: old.ticker }, history: false, lender: s.lender });
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
