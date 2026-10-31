// SEBI's daily trends in mutual-fund investment: what Indian mutual funds bought and sold in equity on
// the stock exchanges each trading day (₹ crore), from custodians' reports to SEBI. It is the long
// official history on the domestic side (from 2021 at least), where NSDL's DII report starts only in
// June 2026; mutual funds are the larger part of DII money, so the FII / DII view shows it as a proxy.
// src/lib/flows/refresh.ts writes it to MarketFlowDay.mfSebiNetCr.
//
// The page takes a date (DD-MM-YYYY, the reporting date) and answers with that month's trading days
// up to the trades reported by then, about a week behind. Its rows are dated by TRADE date (the column
// says "Trading Date"; checked against NSDL's DII mutual-fund row, which matches one reporting day
// later), so they are stored as they come. A GET of the form page hands out the session cookie the
// search needs. Fetchers return null on failure and never throw; the parser is pure.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const TIMEOUT_MS = 30_000;
const FORM_URL = "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doMfdTrends=yes";
const SEARCH_URL = "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doMfdTrendsSearch=yes";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** One trading day of mutual-fund equity trades on the exchanges (₹ crore). */
export type MfDay = { day: Date; buyCr: number; sellCr: number; netCr: number };

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

/** "1,234.56" / "(259.58)" (negative) to a number; null otherwise. */
function signed(s: string): number | null {
  const t = s.trim();
  const neg = /^\(.*\)$/.test(t);
  const n = Number(t.replace(/[(),]/g, ""));
  return t === "" || !Number.isFinite(n) ? null : neg ? -n : n;
}

/** "01 Oct, 2026" to UTC midnight; null otherwise. */
function parseDayMonYear(s: string): Date | null {
  const m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]*,? (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2].toUpperCase()) : -1;
  return m && month >= 0 ? new Date(Date.UTC(Number(m[3]), month, Number(m[1]))) : null;
}

/** The DD-MM-YYYY date SEBI's search takes. */
export function sebiDate(day: Date): string {
  return [String(day.getUTCDate()).padStart(2, "0"), String(day.getUTCMonth() + 1).padStart(2, "0"), day.getUTCFullYear()].join("-");
}

/** The equity row of every trading day in SEBI's answer, oldest first. */
export function parseMfTrends(html: string): MfDay[] {
  const out = new Map<number, MfDay>();
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => text(m[1]));
    // [Trading Date, Equity, purchases, sales, net]; the "Total" row and the derivatives table below
    // (dated rows with "INDEX FUTURES" etc.) don't match.
    if (c.length !== 5 || !/^Equity$/i.test(c[1])) continue;
    const day = parseDayMonYear(c[0]);
    const buyCr = signed(c[2]);
    const sellCr = signed(c[3]);
    const netCr = signed(c[4]);
    // SEBI lists the odd day with nothing at all (Saturday 12 Jul 2025, no session): not a trading day.
    if (buyCr === 0 && sellCr === 0) continue;
    if (day && buyCr !== null && sellCr !== null && netCr !== null) out.set(day.getTime(), { day, buyCr, sellCr, netCr });
  }
  return [...out.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
}

/**
 * The trading days of `asOf`'s month that SEBI has by `asOf` (pass a month end for a whole past month).
 * Null on failure; an empty list early in a month, before its first figures are out.
 */
export async function fetchMfMonth(asOf: Date): Promise<MfDay[] | null> {
  try {
    const page = await fetch(FORM_URL, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!page.ok) return null;
    await page.text();
    const cookie = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "User-Agent": UA, Accept: "text/html,*/*", "Content-Type": "application/x-www-form-urlencoded", Referer: FORM_URL, ...(cookie ? { Cookie: cookie } : {}) },
      body: new URLSearchParams({ date: sebiDate(asOf) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    // A month with nothing reported yet comes back as the bare form page, without the table.
    return /Trading Date|Mutual Funds Trends/i.test(html) ? parseMfTrends(html) : null;
  } catch {
    return null;
  }
}
