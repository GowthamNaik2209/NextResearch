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
      const span = Number(td[1].match(/colspan\s*=\s*"?(\d+)/i)?.[1] ?? 1);
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
