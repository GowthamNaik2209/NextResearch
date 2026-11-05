// The whole market's breadth for the morning brief: NSE's full bhavcopy (every listed stock's
// previous close and close) gives the advance / decline count. Both are plain files on nsearchives.nseindia.com,
// which serves them without cookies, for any past day. Fetchers return null on any failure (a
// holiday's 404, a timeout) and never throw; the parsers are pure, so the tests run them on text.
import { parseCsv } from "@/lib/flows/nse";
import type { Breadth } from "./types";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const TIMEOUT_MS = 20_000;
const ARCHIVES = "https://nsearchives.nseindia.com";

export type BhavRow = { symbol: string; series: string; prevClose: number; close: number; turnoverLacs: number };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The file's rows (header named, cells trimmed: NSE writes ", " between cells). Rows without prices are dropped. */
export function parseBhavcopy(csv: string): BhavRow[] {
  const [head, ...rows] = parseCsv(csv);
  if (!head) return [];
  const col = (name: string) => head.findIndex((h) => h.trim().toUpperCase() === name);
  const [sym, ser, prev, close, turn] = ["SYMBOL", "SERIES", "PREV_CLOSE", "CLOSE_PRICE", "TURNOVER_LACS"].map(col);
  if ([sym, ser, prev, close, turn].some((i) => i < 0)) return [];
  const out: BhavRow[] = [];
  for (const r of rows) {
    const n = (i: number) => Number((r[i] ?? "").trim());
    const row = { symbol: (r[sym] ?? "").trim(), series: (r[ser] ?? "").trim(), prevClose: n(prev), close: n(close), turnoverLacs: n(turn) };
    if (row.symbol && row.prevClose > 0 && row.close > 0 && Number.isFinite(row.turnoverLacs)) out.push(row);
  }
  return out;
}

/** How many stocks (EQ and BE series) closed up, down and unchanged. */
export function breadth(rows: BhavRow[]): Breadth {
  const out: Breadth = { up: 0, down: 0, flat: 0 };
  for (const r of rows) {
    if (r.series !== "EQ" && r.series !== "BE") continue;
    if (r.close > r.prevClose) out.up++;
    else if (r.close < r.prevClose) out.down++;
    else out.flat++;
  }
  return out;
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/csv,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** The bhavcopy for `day` ("YYYY-MM-DD"), or null (not published yet, a holiday, or NSE unreachable). */
export async function fetchBhavcopy(day: string): Promise<BhavRow[] | null> {
  const [y, m, d] = day.split("-");
  const text = await getText(`${ARCHIVES}/products/content/sec_bhavdata_full_${pad2(+d)}${pad2(+m)}${y}.csv`);
  const rows = text ? parseBhavcopy(text) : [];
  return rows.length ? rows : null;
}
