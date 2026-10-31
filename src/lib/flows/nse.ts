// NSE's market-wide institutional figures for the FII / DII view (src/lib/flows/refresh.ts writes
// them): the day's provisional FII/FPI and DII cash buying and selling, FII/DII index-futures open
// interest from the participant-wise OI file, and every bulk and block deal. Fetchers return null on
// any failure (a timeout, a refusal, a 404 on a holiday) and never throw; the parsers are pure, so
// the tests run them on saved files.
//
// Sources:
//   cash   www.nseindia.com/api/fiidiiTradeReact: the latest day only; NSE keeps no history of it.
//   OI     nsearchives.nseindia.com/content/nsccl/fao_participant_oi_DDMMYYYY.csv: any past day.
//   deals  www.nseindia.com/api/historicalOR/bulk-block-short-deals with &csv=true: any date range.
//          The same URL without csv=true answers JSON but stops at 70 rows (a busy day has 200 bulk
//          deals), so the CSV is what we read. nsearchives.../equities/bulk.csv and block.csv hold
//          the latest day only; they are the fallback when the API refuses us.
//
// www.nseindia.com sits behind Akamai, which sometimes refuses requests without its cookies
// (especially from cloud IPs; production runs on Vercel in Sydney). Each API call is tried once
// bare; on a 401 or 403 we load the home page, keep the cookies it sets, and try once more with them.
// nsearchives.nseindia.com serves files without cookies.
import type { CashFlowDay, Deal, DealKind, ParticipantOiDay } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const TIMEOUT_MS = 20_000;
const NSE_HOME = "https://www.nseindia.com/";
const ARCHIVES = "https://nsearchives.nseindia.com/content";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const pad2 = (n: number) => String(n).padStart(2, "0");

/** "30-Oct-2026" / "30-OCT-2026" to UTC midnight; null if it isn't a date. */
export function parseDayMonYear(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toUpperCase()) : -1;
  return m && month >= 0 ? new Date(Date.UTC(Number(m[3]), month, Number(m[1]))) : null;
}

/** "DD-MM-YYYY", the form NSE's date-range APIs take. */
const ddmmyyyy = (day: Date, sep = "-") => [pad2(day.getUTCDate()), pad2(day.getUTCMonth() + 1), day.getUTCFullYear()].join(sep);

/** A number as NSE prints it: "16643.55", "-817.51", or with Indian grouping "6,70,611". */
function num(s: unknown): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string") return null;
  const t = s.replace(/,/g, "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Rows of a CSV file. Handles quoted cells (with commas or doubled quotes inside), CRLF line ends,
 * a byte-order mark and a missing final newline; that's everything NSE's files use.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---- fetching -------------------------------------------------------------------------------------

async function get(url: string, accept: string, cookie?: string): Promise<Response | null> {
  try {
    const headers: Record<string, string> = { "User-Agent": UA, Accept: accept, "Accept-Language": "en-US,en;q=0.9" };
    if (cookie) headers.Cookie = cookie;
    if (url.includes("www.nseindia.com/api/")) headers.Referer = NSE_HOME;
    return await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    return null;
  }
}

/** Cookies the NSE home page sets ("name=value; name=value"), or undefined. */
async function nseCookies(): Promise<string | undefined> {
  const res = await get(NSE_HOME, "text/html,application/xhtml+xml");
  if (!res) return undefined;
  await res.text().catch(() => "");
  const set = res.headers.getSetCookie?.() ?? [];
  const jar = set.map((c) => c.split(";")[0]).filter(Boolean);
  return jar.length ? jar.join("; ") : undefined;
}

/**
 * The body of a GET, or null on any failure. For www.nseindia.com a 401/403 gets one retry with the
 * home page's cookies (see the header comment).
 */
async function fetchText(url: string, accept = "*/*"): Promise<string | null> {
  let res = await get(url, accept);
  if (res && (res.status === 401 || res.status === 403) && url.startsWith(NSE_HOME)) {
    await res.text().catch(() => "");
    const cookie = await nseCookies();
    if (cookie) res = await get(url, accept, cookie);
  }
  if (!res || !res.ok) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}

// ---- cash market: FII/FPI and DII buy, sell, net (₹ crore) ---------------------------------------

/** NSE's fiidiiTradeReact answer to one day's figures; null unless both FII and DII rows are there. */
export function parseCashFlows(json: unknown): CashFlowDay | null {
  if (!Array.isArray(json)) return null;
  type Row = { category?: unknown; date?: unknown; buyValue?: unknown; sellValue?: unknown; netValue?: unknown };
  const rows = json as Row[];
  const pick = (re: RegExp) => rows.find((r) => typeof r?.category === "string" && re.test(r.category));
  const fii = pick(/FII|FPI/i);
  const dii = pick(/^DII/i);
  if (!fii || !dii || fii.date !== dii.date || typeof fii.date !== "string") return null;
  const day = parseDayMonYear(fii.date);
  const side = (r: Row) => {
    const buyCr = num(r.buyValue);
    const sellCr = num(r.sellValue);
    const netCr = num(r.netValue) ?? (buyCr !== null && sellCr !== null ? buyCr - sellCr : null);
    return buyCr === null || sellCr === null || netCr === null ? null : { buyCr, sellCr, netCr };
  };
  const f = side(fii);
  const d = side(dii);
  return day && f && d ? { day, fii: f, dii: d } : null;
}

/** The latest day's cash figures NSE has published (it may still be the previous day's). */
export async function fetchCashFlows(): Promise<CashFlowDay | null> {
  const text = await fetchText("https://www.nseindia.com/api/fiidiiTradeReact", "application/json,text/plain,*/*");
  if (!text) return null;
  try {
    return parseCashFlows(JSON.parse(text));
  } catch {
    return null;
  }
}

// ---- participant-wise open interest: FII and DII index futures (contracts) -----------------------

/** The participant OI file: index-futures long and short for FII and DII, dated by its title line. */
export function parseParticipantOi(csv: string): ParticipantOiDay | null {
  // Title: "Participant wise Open Interest (no. of contracts) in Equity Derivatives as on Oct 30, 2026"
  // Files before about mid-2025 print the date without a space after the comma ("Jan 03,2022").
  const t = csv.match(/as on\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})/i);
  const month = t ? MONTHS.indexOf(t[1].toUpperCase()) : -1;
  if (!t || month < 0) return null;
  const day = new Date(Date.UTC(Number(t[3]), month, Number(t[2])));
  const rows = parseCsv(csv.slice(csv.indexOf("\n") + 1)).map((r) => r.map((c) => c.trim()));
  const header = rows.find((r) => /client type/i.test(r[0] ?? ""));
  if (!header) return null;
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const longCol = col("Future Index Long");
  const shortCol = col("Future Index Short");
  if (longCol < 0 || shortCol < 0) return null;
  const side = (who: string) => {
    const r = rows.find((x) => x[0]?.toUpperCase() === who);
    const idxFutLong = r ? num(r[longCol]) : null;
    const idxFutShort = r ? num(r[shortCol]) : null;
    return idxFutLong === null || idxFutShort === null ? null : { idxFutLong, idxFutShort };
  };
  const fii = side("FII");
  const dii = side("DII");
  return fii && dii ? { day, fii, dii } : null;
}

/** The participant OI file for one trading day; null if NSE has none (a holiday, or not out yet). */
export async function fetchParticipantOi(day: Date): Promise<ParticipantOiDay | null> {
  const text = await fetchText(`${ARCHIVES}/nsccl/fao_participant_oi_${ddmmyyyy(day, "")}.csv`, "text/csv,*/*");
  return text ? parseParticipantOi(text) : null;
}

// ---- bulk and block deals --------------------------------------------------------------------------

function toDeal(kind: DealKind, f: { date: unknown; symbol: unknown; name: unknown; client: unknown; side: unknown; qty: unknown; price: unknown }): Deal | null {
  const day = typeof f.date === "string" ? parseDayMonYear(f.date) : null;
  const side = typeof f.side === "string" ? f.side.trim().toUpperCase() : "";
  const symbol = typeof f.symbol === "string" ? f.symbol.trim() : "";
  const clientName = typeof f.client === "string" ? f.client.trim().replace(/\s+/g, " ") : "";
  const quantity = num(f.qty);
  const price = num(f.price);
  if (!day || !symbol || !clientName || (side !== "BUY" && side !== "SELL") || quantity === null || price === null) return null;
  return { day, kind, symbol, securityName: typeof f.name === "string" ? f.name.trim() : "", clientName, side, quantity, price };
}

/**
 * Deals from the historicalOR API's JSON ({ data: [{ BD_DT_DATE, BD_SYMBOL, ... }] }; bulk and block
 * use the same fields). Kept for completeness: that answer stops at 70 rows, so the refresh reads the CSV.
 */
export function parseDealsJson(json: unknown, kind: DealKind): Deal[] {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((r: Record<string, unknown>) =>
      toDeal(kind, { date: r.BD_DT_DATE, symbol: r.BD_SYMBOL, name: r.BD_SCRIP_NAME, client: r.BD_CLIENT_NAME, side: r.BD_BUY_SELL, qty: r.BD_QTY_TRD, price: r.BD_TP_WATP }),
    )
    .filter((d): d is Deal => d !== null);
}

/**
 * Deals from a CSV: the historicalOR API's (quoted cells, "6,70,611" quantities, header cells with
 * trailing spaces, "Buy / Sell") or the archive's bulk.csv / block.csv (plain cells, "Buy/Sell").
 * Columns are found by header name, so either layout reads the same.
 */
export function parseDealsCsv(csv: string, kind: DealKind): Deal[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const key = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");
  const header = rows[0].map(key);
  const at = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const c = {
    date: at("date"),
    symbol: at("symbol"),
    name: at("securityname"),
    client: at("clientname"),
    side: at("buysell"),
    qty: at("quantitytraded"),
    price: at("tradepricewghtavgprice"),
  };
  if (Object.values(c).some((i) => i < 0)) return [];
  return rows
    .slice(1)
    .map((r) => toDeal(kind, { date: r[c.date], symbol: r[c.symbol], name: r[c.name], client: r[c.client], side: r[c.side], qty: r[c.qty], price: r[c.price] }))
    .filter((d): d is Deal => d !== null);
}

/** Every deal of one kind between two trading days (inclusive), or null if NSE didn't answer. */
export async function fetchDeals(kind: DealKind, from: Date, to: Date): Promise<Deal[] | null> {
  const option = kind === "BULK" ? "bulk_deals" : "block_deals";
  const url = `https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=${option}&from=${ddmmyyyy(from)}&to=${ddmmyyyy(to)}&csv=true`;
  const text = await fetchText(url, "text/csv,application/json,*/*");
  // A good answer starts with the CSV header; anything else (an HTML error page, JSON) is a failure.
  if (!text || !/^﻿?"?Date/i.test(text)) return null;
  return parseDealsCsv(text, kind);
}

/** The latest day's deals of one kind from NSE's archive (the fallback), or null on failure. */
export async function fetchLatestDealsArchive(kind: DealKind): Promise<Deal[] | null> {
  const text = await fetchText(`${ARCHIVES}/equities/${kind === "BULK" ? "bulk" : "block"}.csv`, "text/csv,*/*");
  if (!text || !/^﻿?"?Date/i.test(text)) return null;
  return parseDealsCsv(text, kind);
}
