// NSDL's fortnightly FPI investment by sector, for the FII / DII view's "where foreign money went"
// table (src/lib/flows/refresh.ts writes it). NSDL publishes one static HTML report per fortnight
// (the 15th and the month end, a few days later) and lists them on a selection page. Fetchers return
// null on failure and never throw; the parsers are pure and tested on saved pages.
//
// A report's main table has four column groups: AUC at the previous fortnight's end, net investment
// in the previous fortnight, net investment in this fortnight, AUC at this fortnight's end. Each
// group is INR then USD, and each currency block starts with Equity. We take, per sector, this
// fortnight's net equity investment and equity AUC, both in ₹ crore. Column positions are worked out
// from the header rows (the blocks were 5 wide before September 2024 and are 12 wide now), so a
// layout change either still reads right or reads nothing.
//
// The same site also has NSDL's confirmed daily figures, read for the history behind NSE's provisional
// cash numbers (which NSE keeps for one day only): the FPI archive (Reports/Archive.aspx, every
// reporting day since 2010, a month per request) and the DII report (Users/DIIGenerateReport.aspx,
// one day per request, from June 2026). Both are ASP.NET pages: a GET hands out a session cookie and
// the form's hidden state, and a POST of that state with the date (hdnDate) returns the report.
//
// Dates: NSDL's "reporting date" carries the trades confirmed since the previous report, normally the
// trading day before. We store a report under the previous REPORTING day in NSDL's own list, which
// follows NSE's calendar for every year (our NSE_HOLIDAYS lists 2026 only). The first day of a list, or
// one after a gap of more than a week, falls back to the previous NSE trading day by our calendar.
// Checked: SEBI's mutual-fund figures, dated by trade date, match NSDL's DII mutual-fund row one
// reporting day later, day after day; NSDL's 30-Oct-2026 report is the 29-Oct trade day.
// Two known imperfections, both NSDL's: (1) on a bank holiday when NSE trades (23 May 2024, 19 Feb
// 2025, 19 Feb 2026) NSDL does not report, and its next report holds two trade days (gross about
// double); we store that under the first of the two, and the second has no NSDL figure. (2) A weekend
// special session (Muhurat, budget day, DR drills) has no report of its own; its trades are inside the
// next report, stored under the Friday before.
import { isTradingDay } from "@/lib/financials/trading-day";
import type { FortnightLink, SectorFlowRow, SectorFortnight } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const TIMEOUT_MS = 60_000; // a report is ~330 KB from a slow server
const BASE = "https://www.fpi.nsdl.co.in/web/";
export const FORTNIGHT_LIST_URL = `${BASE}Reports/FPI_Fortnightly_Selection.aspx`;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "OCT 15, 2026", "October 15, 2026", "Sept 30 2026" to UTC midnight; null otherwise. */
function parseMonthDayYear(s: string): Date | null {
  const m = s.match(/([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  const month = m ? MONTHS.indexOf(m[1].toUpperCase()) : -1;
  return m && month >= 0 ? new Date(Date.UTC(Number(m[3]), month, Number(m[2]))) : null;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
const text = (html: string) => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** "4,98,295" / "-6,533" / "0" to a number; null for blanks and dashes. */
function num(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** The selection page's reports, newest first, one per fortnight. */
export function parseFortnightList(html: string): FortnightLink[] {
  const out = new Map<number, FortnightLink>();
  for (const m of html.matchAll(/<option[^>]*value="([^"]+\.html?)"[^>]*>([^<]*)<\/option>/gi)) {
    const periodEnd = parseMonthDayYear(text(m[2]));
    if (!periodEnd) continue;
    const value = decode(m[1].trim());
    const url = value.startsWith("~/") ? BASE + value.slice(2) : new URL(value, FORTNIGHT_LIST_URL).toString();
    if (!out.has(periodEnd.getTime())) out.set(periodEnd.getTime(), { periodEnd, url });
  }
  return [...out.values()].sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
}

type Cell = { text: string; start: number; span: number };

/** The cells of each <tr> with their starting column (colspans counted). */
function tableRows(html: string): Cell[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((tr) => {
    let col = 0;
    return [...tr[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map((td) => {
      // Quoted either way: reports before Aug 2023 write colspan='10'.
      const span = Number(td[1].match(/colspan\s*=\s*["']?(\d+)/i)?.[1] ?? 1);
      const cell = { text: text(td[2]), start: col, span };
      col += span;
      return cell;
    });
  });
}

/** One fortnight's report: every sector's net equity investment and equity AUC (₹ crore). */
export function parseSectorReport(html: string): SectorFortnight | null {
  const rows = tableRows(html);
  // Group row: "AUC as on ...", "Net Investment ...", "Net Investment ...", "AUC as on ...".
  const g = rows.findIndex((r) => r.some((c) => /^AUC as on/i.test(c.text)) && r.some((c) => /^Net Investment/i.test(c.text)));
  if (g < 0 || g + 1 >= rows.length) return null;
  const groups = rows[g];
  const net = groups.filter((c) => /^Net Investment/i.test(c.text)).at(-1)!;
  const auc = groups.filter((c) => /^AUC as on/i.test(c.text)).at(-1)!;
  // This fortnight's net-investment group comes right before its closing AUC.
  if (auc.start < net.start) return null;
  const periodLabel = net.text.replace(/^Net Investment\s*/i, "").trim();
  const periodEnd = parseMonthDayYear(auc.text);
  if (!periodEnd || !periodLabel) return null;

  // The INR block of a group is the "IN INR" cell of the currency row that starts inside it.
  const currency = rows[g + 1];
  const inrStart = (group: Cell) => currency.find((c) => /INR/i.test(c.text) && c.start >= group.start && c.start < group.start + group.span)?.start ?? -1;
  const netCol = inrStart(net);
  const aucCol = inrStart(auc);
  if (netCol < 0 || aucCol < 0) return null;

  // The column-name row ("Sr. No.", "Sectors", "Equity", ...) must say Equity at both columns.
  const h = rows.findIndex((r, i) => i > g && /^Sr\.? ?No/i.test(r[0]?.text ?? ""));
  if (h < 0) return null;
  const names = rows[h];
  const nameAt = (col: number) => names.find((c) => c.start === col)?.text ?? "";
  if (!/^Equity$/i.test(nameAt(netCol)) || !/^Equity$/i.test(nameAt(aucCol))) return null;
  const sectorCol = names.findIndex((c) => /^Sectors?$/i.test(c.text));
  if (sectorCol < 0) return null;

  const out: SectorFlowRow[] = [];
  for (const r of rows.slice(h + 1)) {
    // Data rows are one cell per column, as wide as the header row; the notes and the "Others" debt
    // table further down are not.
    if (r.length !== names.length) break;
    const sector = r[sectorCol].text;
    const netEquityCr = num(r[netCol].text);
    if (!sector || netEquityCr === null) continue;
    out.push({ sector, netEquityCr, aucEquityCr: num(r[aucCol].text) });
    if (/^Grand Total$/i.test(sector)) break;
  }
  return out.length ? { periodEnd, periodLabel, rows: out } : null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** The reports NSDL lists, newest first; null on failure. */
export async function fetchFortnightList(): Promise<FortnightLink[] | null> {
  const html = await fetchText(FORTNIGHT_LIST_URL);
  const list = html ? parseFortnightList(html) : [];
  return list.length ? list : null;
}

/** One report, parsed; null on failure. */
export async function fetchSectorReport(url: string): Promise<SectorFortnight | null> {
  const html = await fetchText(url);
  return html ? parseSectorReport(html) : null;
}

// ---- confirmed daily FPI and DII figures (₹ crore, equity bought and sold on the exchanges) -------

export const FPI_ARCHIVE_URL = `${BASE}Reports/Archive.aspx`;
export const DII_REPORT_URL = `${BASE}Users/DIIGenerateReport.aspx?Rep=A`;
const DAY_MS = 86_400_000;
// A previous reporting day further back than this is a gap in the list, not the trade date.
const MAX_REPORT_GAP_DAYS = 7;

/** One NSDL reporting day's equity trades on the stock exchanges (reportDay = the day NSDL reported). */
export type ReportedFlow = { reportDay: Date; buyCr: number; sellCr: number; netCr: number };

/** "30-Oct-2026" to UTC midnight; null otherwise. */
function parseDdMonYyyy(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toUpperCase()) : -1;
  return m && month >= 0 ? new Date(Date.UTC(Number(m[3]), month, Number(m[1]))) : null;
}

/** The form NSDL's pages take: "31-Oct-2026". */
export function nsdlDate(day: Date): string {
  const m = MONTHS[day.getUTCMonth()];
  return `${String(day.getUTCDate()).padStart(2, "0")}-${m[0]}${m.slice(1).toLowerCase()}-${day.getUTCFullYear()}`;
}

/** An accounting number: "(9569.57)" is -9569.57. */
function signed(s: string): number | null {
  const t = s.trim();
  const neg = /^\(.*\)$/.test(t);
  const n = num(t.replace(/[()]/g, ""));
  return n === null ? null : neg ? -n : n;
}

/** The FPI archive's equity "Stock Exchange" row for every reporting day on the page, oldest first. */
export function parseFpiArchive(html: string): ReportedFlow[] {
  const out = new Map<number, ReportedFlow>();
  for (const r of tableRows(html)) {
    // [Reporting Date, Equity, Stock Exchange, purchases, sales, net, net US$, rate]; the derivatives
    // table further down also starts with a date but says "Index Futures" etc. in the second cell.
    if (r.length < 6 || !/^Equity$/i.test(r[1].text) || !/^Stock Exchange$/i.test(r[2].text)) continue;
    const reportDay = parseDdMonYyyy(r[0].text);
    const buyCr = signed(r[3].text);
    const sellCr = signed(r[4].text);
    const netCr = signed(r[5].text);
    if (reportDay && buyCr !== null && sellCr !== null && netCr !== null) out.set(reportDay.getTime(), { reportDay, buyCr, sellCr, netCr });
  }
  return [...out.values()].sort((a, b) => a.reportDay.getTime() - b.reportDay.getTime());
}

/**
 * The DII report's "Total / Equity / Stock Exchange" row (every DII type together). The per-type rows
 * and the debt and bullion totals carry obvious errors in NSDL's data, so only this row is read.
 * Null for "No Data Found" (a non-reporting day, or before June 2026).
 */
export function parseDiiReport(html: string): ReportedFlow | null {
  const reportDay = parseDdMonYyyy(html.match(/Report on\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/)?.[1] ?? "");
  if (!reportDay) return null;
  const r = tableRows(html).find((c) => c.length >= 6 && /^Total$/i.test(c[0].text) && /^Equity$/i.test(c[1].text) && /^Stock Exchange$/i.test(c[2].text));
  if (!r) return null;
  const buyCr = signed(r[3].text);
  const sellCr = signed(r[4].text);
  const netCr = signed(r[5].text);
  return buyCr === null || sellCr === null || netCr === null ? null : { reportDay, buyCr, sellCr, netCr };
}

function previousTradingDay(day: Date): Date {
  let d = new Date(day.getTime() - DAY_MS);
  while (!isTradingDay(d)) d = new Date(d.getTime() - DAY_MS);
  return d;
}

/**
 * The trade date of each reporting day (keyed by the reporting day's time): the previous reporting
 * day in the list, or the previous NSE trading day by our calendar for the first one and after a gap
 * (see the header comment). Pass every reporting day known, in any order.
 */
export function tradeDatesFor(reportDays: Date[]): Map<number, Date> {
  const days = [...new Set(reportDays.map((d) => d.getTime()))].sort((a, b) => a - b);
  const out = new Map<number, Date>();
  days.forEach((t, i) => {
    const prev = days[i - 1];
    const byList = prev !== undefined && t - prev <= MAX_REPORT_GAP_DAYS * DAY_MS ? new Date(prev) : null;
    out.set(t, byList ?? previousTradingDay(new Date(t)));
  });
  return out;
}

/** GET an ASP.NET page for its cookie and form state, then POST the form with hdnDate; null on failure. */
async function postback(url: string, hdnDate: string): Promise<string | null> {
  try {
    const page = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!page.ok) return null;
    const html = await page.text();
    const cookie = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    const hidden = (name: string) => decode(html.match(new RegExp(`id="${name}"[^>]*value="([^"]*)"`))?.[1] ?? "");
    const form = new URLSearchParams({
      __EVENTTARGET: "btnSubmit1",
      __EVENTARGUMENT: "",
      __VIEWSTATE: hidden("__VIEWSTATE"),
      __VIEWSTATEGENERATOR: hidden("__VIEWSTATEGENERATOR"),
      __EVENTVALIDATION: hidden("__EVENTVALIDATION"),
      hdnDate,
      hdnFlag: "",
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": UA, Accept: "text/html,*/*", "Content-Type": "application/x-www-form-urlencoded", Referer: url, ...(cookie ? { Cookie: cookie } : {}) },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Every FPI reporting day from the 1st of `upTo`'s month to `upTo`; null on failure. */
export async function fetchFpiArchiveMonth(upTo: Date): Promise<ReportedFlow[] | null> {
  const html = await postback(FPI_ARCHIVE_URL, nsdlDate(upTo));
  return html && /Daily Trends in FPI Investments/i.test(html) ? parseFpiArchive(html) : null;
}

/** The DII report for one reporting day; null on failure or when NSDL has none for that day. */
export async function fetchDiiReport(reportDay: Date): Promise<ReportedFlow | null> {
  const html = await postback(DII_REPORT_URL, nsdlDate(reportDay));
  const r = html ? parseDiiReport(html) : null;
  return r && r.reportDay.getTime() === reportDay.getTime() ? r : null;
}
