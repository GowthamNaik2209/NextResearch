// Quarterly results from Screener.in (QuarterlyResult in prisma/schema.prisma): the "Quarterly
// Results" table on a company's page, one row per fiscal quarter, so management guidance on revenue,
// margin and profit can be checked against what was delivered. Also the company's BSE scrip code,
// which the page links to (bseindia.com/stock-share-price/<name>/<symbol>/<code>/) and which BSE's
// filings feed keys on. Server side only; takes the Prisma client and imports nothing from Next, so
// scripts/refresh-quarterly.ts and the concall daily job both run it under tsx.
//
// Basis: the same rule as the annual figures (./refresh.ts). A company whose note says "standalone
// figures" is read from the standalone page; everything else from consolidated, falling back to
// standalone when the consolidated page is an empty template, has no quarters, its quarters stop
// earlier than the standalone page's (a stale consolidated filing), or it skips quarters that the
// standalone page has (consolidated filed only some quarters).
//
// Screener shows the latest 13 quarters (about three years) to anonymous visitors; older quarters
// are not on the page, so the stored history grows from there as the daily job keeps upserting.
import type { PrismaClient } from "@/generated/prisma/client";
import { fiscalQuarterOf, HISTORY_FROM_FY, quarterEnd, quarterKey, type FiscalQuarter } from "@/lib/concalls/types";
import { isUsablePage, parseDataTable, sectionTable } from "@/lib/live/screener-company";
import { SCRIPT_FETCH, ScreenerBlocked, type FetchOptions } from "./refresh";

export type QuarterlyRow = {
  fiscalYear: number;
  quarter: 1 | 2 | 3 | 4;
  periodEnd: Date;
  revenueCr: number | null;
  expensesCr: number | null;
  operatingProfitCr: number | null;
  opmPct: number | null;
  otherIncomeCr: number | null;
  depreciationCr: number | null;
  interestCr: number | null;
  pbtCr: number | null;
  netProfitCr: number | null;
  epsRs: number | null;
};

export type QuarterlyFetch = {
  basis: "consolidated" | "standalone";
  bseCode: string | null;
  rows: QuarterlyRow[];
  /**
   * "lender": banks/NBFCs, whose table reads Revenue / Interest (expended) / Financing Profit /
   * Financing Margin %. Financing Profit is net of provisions and often negative, so it is stored in
   * operatingProfitCr/opmPct but is not an operating margin; compare it only with itself.
   */
  layout?: "standard" | "lender";
  /** Column headers that are not a quarter ending Mar/Jun/Sep/Dec (odd year-ends): left out. */
  skipped?: string[];
  /**
   * The table holds half-years, not quarters (SME listings file half-yearly; Screener puts them in
   * the same table, e.g. Mar 2025, Sep 2025, Mar 2026, or only every September). Rows are then
   * empty: an H2 is not a Q4.
   */
  halfYearly?: boolean;
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- parsing

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jun 2026" -> Q1 FY27. null for anything else, including a quarter ending in another month. */
export function quarterOfHeader(header: string): FiscalQuarter | null {
  const m = header.trim().match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  if (month < 0 || month % 3 !== 2) return null; // quarters end in Mar, Jun, Sep or Dec
  return fiscalQuarterOf(new Date(Date.UTC(Number(m[2]), month, 1)));
}

// Screener's row label (trailing "+" already stripped) -> our column. Lenders' labels in the second set.
const FIELDS: Record<string, keyof Omit<QuarterlyRow, "fiscalYear" | "quarter" | "periodEnd">> = {
  Sales: "revenueCr",
  Revenue: "revenueCr",
  Expenses: "expensesCr",
  "Operating Profit": "operatingProfitCr",
  "Financing Profit": "operatingProfitCr",
  "OPM %": "opmPct",
  "Financing Margin %": "opmPct",
  "Other Income": "otherIncomeCr",
  Depreciation: "depreciationCr",
  Interest: "interestCr",
  "Profit before tax": "pbtCr",
  "Net Profit": "netProfitCr",
  "EPS in Rs": "epsRs",
};

export type ParsedQuarters = { rows: QuarterlyRow[]; layout: "standard" | "lender"; skipped: string[]; halfYearly: boolean };

// Quarters since a fixed origin, so consecutive quarters differ by 1.
const seq = (q: FiscalQuarter) => q.fiscalYear * 4 + q.quarter;

/** Parse the quarters section of a Screener company page (whole page or just the section). */
export function parseQuarters(html: string): ParsedQuarters {
  const table = sectionTable(html, "quarters");
  if (!table) return { rows: [], layout: "standard", skipped: [], halfYearly: false };
  const t = parseDataTable(table);
  const byLabel = new Map(t.rows.map((r) => [r.label, r.values]));
  const layout = byLabel.has("Financing Profit") ? "lender" : "standard";
  const byKey = new Map<number, QuarterlyRow>();
  const skipped: string[] = [];
  t.cols.forEach((col, i) => {
    const q = quarterOfHeader(col);
    // Columns from before the history (stray ones, e.g. KIRLPNU's 2014-2016 or a REIT's "Mar 2000"
    // placeholder) are left out like odd ones, but not reported.
    if (q && q.fiscalYear < HISTORY_FROM_FY) return;
    if (!q) {
      if (col) skipped.push(col);
      return;
    }
    const row: QuarterlyRow = {
      ...(q as { fiscalYear: number; quarter: 1 | 2 | 3 | 4 }),
      periodEnd: quarterEnd(q),
      revenueCr: null,
      expensesCr: null,
      operatingProfitCr: null,
      opmPct: null,
      otherIncomeCr: null,
      depreciationCr: null,
      interestCr: null,
      pbtCr: null,
      netProfitCr: null,
      epsRs: null,
    };
    for (const [label, field] of Object.entries(FIELDS)) {
      const v = byLabel.get(label)?.[i];
      if (v != null) row[field] = v === 0 ? 0 : v; // Screener prints "-0" for lenders' depreciation
    }
    // An empty column (a quarter the company hasn't reported on this basis) is not a row.
    if (Object.keys(FIELDS).some((l) => byLabel.get(l)?.[i] != null)) byKey.set(quarterKey(q), row);
  });
  const rows = [...byKey.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
  // Half-yearly: every step between columns is a whole number of half-years (FROG: Sep 2022, Sep 2023,
  // Sep 2024, Mar 2025, Sep 2025, Mar 2026). A quarterly table has at least one one-quarter step.
  const halfYearly = rows.length >= 2 && rows.every((r, i) => i === 0 || (seq(r) - seq(rows[i - 1])) % 2 === 0);
  return { rows: halfYearly ? [] : rows, layout, skipped, halfYearly };
}

/** The BSE scrip code the page links to; null for an NSE-only listing. */
export function parseBseCode(html: string): string | null {
  return html.match(/bseindia\.com\/stock-share-price\/[^/"]+\/[^/"]+\/(\d{6})\//)?.[1] ?? null;
}

// ---------------------------------------------------------------- fetching

// The same request rules as ./refresh.ts's (not exported there): 404 is an answer, 429/403/503 throw
// ScreenerBlocked for the caller to back off, anything else retries and then gives null.
async function get(url: string, o: FetchOptions): Promise<string | "missing" | null> {
  for (let attempt = 0; attempt < o.attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(o.timeoutMs) });
      if (res.status === 404) return "missing";
      if (res.ok) return await res.text();
      if (res.status === 429 || res.status === 403 || res.status === 503) throw new ScreenerBlocked(res.status);
    } catch (e) {
      if (e instanceof ScreenerBlocked) throw e;
    }
    if (attempt < o.attempts - 1) await sleep(o.retryDelayMs * (attempt + 1));
  }
  return null;
}

// Screener addresses a few listings by a code its search doesn't return for the ticker (as ./refresh.ts).
const SCREENER_ID: Record<string, string> = { ALTIUSINVIT: "543225" };

// SME, BSE-only and trust listings are addressed by a BSE code: find the page through the search API.
async function resolveBase(ticker: string, tlSlug: string | null, o: FetchOptions): Promise<string | null> {
  for (const q of [ticker, tlSlug?.replace(/-/g, " ").replace(/\b(ltd|limited)\b/g, "").trim()]) {
    if (!q) continue;
    const res = await get(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}`, o);
    if (!res || res === "missing") continue;
    const url = (JSON.parse(res) as { url: string }[]).find((h) => /^\/company\/[^/]+\//.test(h.url))?.url;
    if (url) return `https://www.screener.in${url.match(/^\/company\/[^/]+/)![0]}`;
  }
  return null;
}

const latestKey = (p: ParsedQuarters) => (p.rows.length ? quarterKey(p.rows[p.rows.length - 1]) : 0);
// Quarters missing between the first and the last column (ABB's consolidated page shows Jun 2019,
// Sep 2019, Mar 2022, Jun 2022, then Sep 2024 on: consolidated accounts filed only in some quarters).
const gaps = (p: ParsedQuarters) => (p.rows.length ? seq(p.rows[p.rows.length - 1]) - seq(p.rows[0]) + 1 - p.rows.length : 0);
// Consolidated quarters this far behind today are checked against the standalone page.
const STALE_DAYS = 200;

/**
 * Read one company's quarterly table (and BSE scrip code) from its Screener page. No DB access.
 * Throws ScreenerBlocked (back off) and an Error when the page can't be read or has no quarters.
 */
export async function fetchQuarterly(
  ticker: string,
  financialsNote: string | null,
  opts: { tlSlug?: string | null; fetch?: FetchOptions } = {},
): Promise<QuarterlyFetch> {
  const o = opts.fetch ?? SCRIPT_FETCH;
  const standalone = /standalone figures/i.test(financialsNote ?? "");
  let base = `https://www.screener.in/company/${encodeURIComponent(SCREENER_ID[ticker] ?? ticker)}`;
  let basis: QuarterlyFetch["basis"] = standalone ? "standalone" : "consolidated";
  let html = await get(standalone ? `${base}/` : `${base}/consolidated/`, o);
  if (html === "missing") {
    const found = await resolveBase(ticker, opts.tlSlug ?? null, o);
    if (!found) throw new Error("not found on Screener");
    base = found;
    html = await get(standalone ? `${base}/` : `${base}/consolidated/`, o);
  }
  if (html === null || html === "missing") throw new Error("page could not be read");
  let parsed = parseQuarters(html);
  if (!standalone) {
    const usable = isUsablePage(html) && parsed.rows.length > 0;
    const latest = parsed.rows.at(-1)?.periodEnd.getTime() ?? 0;
    if (!usable || Date.now() - latest > STALE_DAYS * 86_400_000 || gaps(parsed) > 0) {
      const sa = await get(`${base}/`, o);
      if (sa !== null && sa !== "missing" && isUsablePage(sa)) {
        const p = parseQuarters(sa);
        const better = latestKey(p) > latestKey(parsed) || (latestKey(p) === latestKey(parsed) && p.rows.length > parsed.rows.length);
        if ((p.rows.length || p.halfYearly) && (!usable || better)) {
          html = sa;
          parsed = p;
          basis = "standalone";
        }
      }
    }
  }
  if (!parsed.rows.length && !parsed.halfYearly) throw new Error("no quarterly results on the page");
  return { basis, bseCode: parseBseCode(html), rows: parsed.rows, layout: parsed.layout, skipped: parsed.skipped, halfYearly: parsed.halfYearly || undefined };
}

/** Fetch + upsert QuarterlyResult rows and set Company.bseCode when it was null. */
export async function refreshCompanyQuarterly(
  prisma: PrismaClient,
  company: { id: string; ticker: string; financialsNote: string | null; bseCode: string | null },
  opts: { tlSlug?: string | null; fetch?: FetchOptions } = {},
): Promise<{ written: number; bseCode: string | null; basis: string }> {
  const f = await fetchQuarterly(company.ticker, company.financialsNote, opts);
  const fetchedAt = new Date();
  // Screener restates past quarters (regrouping, mergers), so every row on the page is rewritten.
  for (const r of f.rows) {
    const { fiscalYear, quarter, ...values } = r;
    await prisma.quarterlyResult.upsert({
      where: { companyId_fiscalYear_quarter: { companyId: company.id, fiscalYear, quarter } },
      create: { companyId: company.id, fiscalYear, quarter, basis: f.basis, ...values, source: "screener", fetchedAt },
      update: { basis: f.basis, ...values, source: "screener", fetchedAt },
    });
  }
  let bseCode = company.bseCode;
  if (!bseCode && f.bseCode) {
    await prisma.company.update({ where: { id: company.id }, data: { bseCode: f.bseCode } });
    bseCode = f.bseCode;
  }
  return { written: f.rows.length, bseCode, basis: f.basis };
}
