// Finding earnings-call transcripts on BSE and NSE: per company over the whole history (the
// backfill) and across every company for one day (the daily job).
//
// BSE: the corporate-announcements JSON the bseindia.com announcements page reads
// (AnnSubCategoryGetData). With strCat=Company Update and subcategory="Earnings Call Transcript" it
// returns only that subcategory, 50 rows a page with the total in Table1[0].ROWCNT. Two limits found
// by asking it (2026-10-26): the date range may not exceed 12 months ("Date range cannot exceed 12
// months.", so the history is asked one fiscal year at a time), and an empty strScrip returns every
// company's filings, so the daily job asks once for all companies and keeps the tracked scrip codes.
// The subcategory is what companies chose, so it also holds audio-recording links, AGM transcripts
// and the odd presentation; the headline decides those (classifyTitle). Headlines alone are not
// enough the other way round ("Please refer the enclosed file."), so a row in the subcategory counts
// as a transcript unless its headline says otherwise.
//
// NSE: /api/corporate-announcements takes a symbol and any date range in one response (no paging),
// or no symbol for every company on a day (~600 rows). Transcripts sit under "Analysts/Institutional
// Investor Meet/Con. Call Updates" with the free-text subject saying "Transcript". NSE is the
// fallback for a company with no BSE code or when BSE fails or has nothing, and the daily job reads
// it too (one request) so NSE-only listings are covered.
//
// Most companies file the same transcript on both exchanges, and some re-file a corrected
// transcript days later; dedupe() keeps one filing per call (BSE over NSE, the latest re-file).
import type { DiscoveredFiling, FiscalQuarter } from "./types";
import { fiscalQuarterOf, HISTORY_FROM_FY } from "./types";
import { politeGet, politeJson, type FailKind } from "./fetch-pdf";

const DAY = 86_400_000;
const BSE_API = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w";
const BSE_REFERER = "https://www.bseindia.com/";
const NSE_API = "https://www.nseindia.com/api/corporate-announcements";
const NSE_REFERER = "https://www.nseindia.com/";
const BSE_SUBCATEGORY = "Earnings Call Transcript";
const BSE_PAGE_ROWS = 50;
/** An NSE filing this close to a BSE one for the same company is the same transcript filed twice. */
export const CROSS_EXCHANGE_DAYS = 3;

/** The first day the history asks about: the start of fiscal year HISTORY_FROM_FY. */
export const HISTORY_FROM = new Date(Date.UTC(HISTORY_FROM_FY - 1, 3, 1));

// ------------------------------------------------------------------ Shapes

export type FilingKind = "transcript" | "not_transcript";
/**
 * A results call discusses a quarter's results; a special call (an acquisition investor call, an
 * investor day, an analyst meet) is a transcript too but never stands for a quarter: it is kept out
 * of re-file dedupe and of "latest results call" logic. Decided from the headline here and again
 * from the first pages (extract.ts callKindFromText) once the PDF is read.
 */
export type CallKind = "results" | "special";

/** A filing as discovered, with what the headline says about it. */
export type Candidate = DiscoveredFiling & {
  kind: FilingKind;
  callKind: CallKind;
  /** Why it is not a transcript (audio link, AGM, presentation, ...). */
  reason?: string;
  /** The results quarter the call most likely discussed: from the headline, else the quarter before filing. */
  guess: FiscalQuarter;
  /** True when `guess` came from the headline rather than the filing date. */
  guessFromTitle: boolean;
};

export type Attempt = { step: string; ok: boolean; kind?: FailKind | "empty"; detail: string };

export type Duplicate = { filing: Candidate; keptId: string; reason: "other_exchange" | "refiled" };

// ------------------------------------------------------------------ Dates

const pad = (n: number) => String(n).padStart(2, "0");
/** yyyymmdd of a date's calendar day in IST. */
const ymdIst = (d: Date) => {
  const t = new Date(d.getTime() + 330 * 60_000);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
};
const dmyIst = (d: Date) => {
  const s = ymdIst(d);
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`;
};
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** BSE's NEWS_DT ("2026-10-23T23:26:38.503", IST) as an instant. */
export function parseBseDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return new Date(NaN);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - 330 * 60_000);
}

/** NSE's an_dt ("23-Oct-2026 22:50:22", IST) as an instant. */
export function parseNseDate(s: string): Date {
  const m = /^(\d{1,2})-(\w{3})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m || MONTHS[m[2].toLowerCase()] === undefined) return new Date(NaN);
  return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +m[4], +m[5], +m[6]) - 330 * 60_000);
}

/** Splits [from, to] into fiscal-year pieces (Apr-Mar), each inside BSE's 12-month limit. */
export function fiscalWindows(from: Date, to: Date): { from: Date; to: Date }[] {
  const out: { from: Date; to: Date }[] = [];
  let start = from;
  while (start.getTime() <= to.getTime()) {
    const fy = fiscalQuarterOf(start).fiscalYear;
    const fyEnd = new Date(Date.UTC(fy, 2, 31));
    const end = fyEnd.getTime() < to.getTime() ? fyEnd : to;
    out.push({ from: start, to: end });
    start = new Date(fyEnd.getTime() + DAY);
  }
  return out;
}

/** Splits [from, to] into calendar-quarter pieces (BSE's fallback when a year window comes back empty). */
export function quarterWindows(from: Date, to: Date): { from: Date; to: Date }[] {
  const out: { from: Date; to: Date }[] = [];
  let start = from;
  while (start.getTime() <= to.getTime()) {
    const m = start.getUTCMonth();
    const qEnd = new Date(Date.UTC(start.getUTCFullYear(), m - (m % 3) + 3, 0));
    const end = qEnd.getTime() < to.getTime() ? qEnd : to;
    out.push({ from: start, to: end });
    start = new Date(qEnd.getTime() + DAY);
  }
  return out;
}

// ------------------------------------------------------------------ Headlines

/** Not an earnings-call transcript, though filed under the heading: returns the reason. */
export function notTranscriptReason(text: string): string | null {
  const t = text.replace(/\s+/g, " ");
  if (/annual general meeting|\bAGM\b|extra-?ordinary general meeting|\bEGM\b|postal ballot/i.test(t)) return "AGM/EGM";
  if (/\bmedia\b|press (conference|meet)/i.test(t) && !/analyst|investor|earnings/i.test(t)) return "media call";
  const saysTranscript = /transcri/i.test(t);
  if (!saysTranscript && /audio|recording|webcast|video|\blink\b/i.test(t)) return "audio/video link";
  if (!saysTranscript && /presentation/i.test(t)) return "presentation";
  if (!saysTranscript && /(intimation|schedule|invitation|notice) (of|for|about)|will be held|to be held/i.test(t)) return "call intimation";
  return null;
}

// Only occasions that are never a results call. "Analyst meet" / "investor day" are not here: Sun
// Pharma files its Q4 results call as "Transcript for 22 May 2026 Analyst Meet"; the opening pages
// decide those (extract.ts callKindFromText).
const SPECIAL_CALL = /acqui|merger|amalgamation|demerger|scheme of arrangement|open offer|fund ?rais|\bQIP\b/i;
const RESULTS_CALL = /result|earnings|quarter|\bQ[1-4]\b|Q[1-4]\s*FY|half[- ]year|H[12]\s*FY|financial performance|year ended|months ended/i;

/** "special" when the headline names a non-results occasion (an acquisition, a merger) and nothing about results. */
export function callKindFromTitle(text: string): CallKind {
  return SPECIAL_CALL.test(text) && !RESULTS_CALL.test(text) ? "special" : "results";
}

const QUARTER_END_MONTH: Record<string, 1 | 2 | 3 | 4> = { jun: 1, june: 1, sep: 2, sept: 2, september: 2, dec: 3, december: 3, mar: 4, march: 4 };

/** The results quarter a headline names ("Q2FY27", "Q2 FY 2026-27", "quarter ended September 30, 2026"). */
export function quarterFromTitle(text: string): FiscalQuarter | null {
  const t = text.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ");
  let m = /\bQ\s*([1-4])\s*[-' ]?\s*(?:of\s+)?FY\s*'?\s*(\d{2,4})(?:\s*-\s*(\d{2,4}))?/i.exec(t);
  if (m) {
    // "FY 2026-27" names the year it ends in; "FY27" / "FY2027" name it directly.
    const y = m[3] ? +m[3] : +m[2];
    const fy = y < 100 ? 2000 + y : y;
    return { fiscalYear: fy, quarter: +m[1] as 1 | 2 | 3 | 4 };
  }
  m = /(?:quarter|period|year|months)\s+(?:and\s+(?:half\s+)?(?:year|nine months)\s+)?ended\s+(?:on\s+)?(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(june?|sept?(?:ember)?|dec(?:ember)?|mar(?:ch)?)\.?\s*(?:\d{1,2}(?:st|nd|rd|th)?)?,?\s*(\d{4})/i.exec(t);
  if (m) {
    const q = QUARTER_END_MONTH[m[2].toLowerCase()];
    const y = +m[3];
    if (q) return { fiscalYear: q === 4 ? y : y + 1, quarter: q };
  }
  return null;
}

/** The quarter before the one a date falls in: the results a call held then most likely discussed. */
export function quarterBefore(d: Date): FiscalQuarter {
  const q = fiscalQuarterOf(d);
  return q.quarter === 1 ? { fiscalYear: q.fiscalYear - 1, quarter: 4 } : { fiscalYear: q.fiscalYear, quarter: (q.quarter - 1) as 1 | 2 | 3 };
}

function candidate(f: DiscoveredFiling, fromSubcategory: boolean): Candidate | null {
  const reason = notTranscriptReason(f.title);
  // NSE has no transcript subcategory: the subject has to say so.
  if (!fromSubcategory && !/transcri/i.test(f.title)) return null;
  const fromTitle = quarterFromTitle(f.title);
  return {
    ...f,
    kind: reason ? "not_transcript" : "transcript",
    callKind: callKindFromTitle(f.title),
    ...(reason ? { reason } : {}),
    guess: fromTitle ?? quarterBefore(f.filedAt),
    guessFromTitle: !!fromTitle,
  };
}

// ------------------------------------------------------------------ BSE

type BseRow = { NEWSID?: string; SCRIP_CD?: number | string; NEWSSUB?: string; HEADLINE?: string; NEWS_DT?: string; ATTACHMENTNAME?: string; SUBCATNAME?: string };

const bseUrl = (scrip: string, from: Date, to: Date, page: number) =>
  `${BSE_API}?pageno=${page}&strCat=Company+Update&strPrevDate=${ymdIst(from)}&strScrip=${scrip}&strSearch=P` +
  `&strToDate=${ymdIst(to)}&strType=C&subcategory=${encodeURIComponent(BSE_SUBCATEGORY).replace(/%20/g, "+")}`;

/** Every row in the transcript subcategory for one scrip ("" = all companies) over a window of at most 12 months. */
export async function bseRows(scrip: string, from: Date, to: Date): Promise<{ ok: true; rows: BseRow[] } | { ok: false; kind: FailKind | "api"; detail: string }> {
  const rows: BseRow[] = [];
  for (let page = 1; page <= 40; page++) {
    const r = await politeJson(bseUrl(scrip, from, to, page), BSE_REFERER);
    if (!r.ok) return page === 1 || !rows.length ? r : { ok: false, kind: r.kind, detail: `page ${page}: ${r.detail}` };
    const d = r.data as { Table?: BseRow[]; Table1?: { ROWCNT?: number }[]; Status?: boolean; Message?: string };
    if (d.Status === false) return { ok: false, kind: "api", detail: d.Message ?? "Status false" };
    const got = d.Table ?? [];
    rows.push(...got);
    if (got.length < BSE_PAGE_ROWS || rows.length >= Number(d.Table1?.[0]?.ROWCNT ?? 0)) break;
  }
  return { ok: true, rows };
}

function fromBseRow(r: BseRow, ticker: string): Candidate | null {
  if (!r.NEWSID || !r.ATTACHMENTNAME) return null;
  const title = `${r.HEADLINE ?? ""}`.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim() || `${r.NEWSSUB ?? ""}`;
  return candidate(
    {
      ticker,
      exchange: "BSE",
      exchangeId: r.NEWSID,
      // Recent filings sit under AttachLive; downloadPdf() falls back to AttachHis.
      url: `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${r.ATTACHMENTNAME}`,
      title,
      filedAt: parseBseDate(String(r.NEWS_DT ?? "")),
    },
    /transcript/i.test(r.SUBCATNAME ?? BSE_SUBCATEGORY),
  );
}

// ------------------------------------------------------------------ NSE

type NseRow = { seq_id?: string; symbol?: string; desc?: string; attchmntText?: string; attchmntFile?: string; an_dt?: string };

async function nseRows(symbol: string | null, from: Date, to: Date): Promise<{ ok: true; rows: NseRow[] } | { ok: false; kind: FailKind | "api"; detail: string }> {
  const url = `${NSE_API}?index=equities${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ""}&from_date=${dmyIst(from)}&to_date=${dmyIst(to)}`;
  const r = await politeJson(url, NSE_REFERER, 45_000);
  if (!r.ok) return r;
  if (!Array.isArray(r.data)) return { ok: false, kind: "api", detail: "unexpected response shape" };
  return { ok: true, rows: r.data as NseRow[] };
}

function fromNseRow(r: NseRow, ticker: string): Candidate | null {
  if (!r.seq_id || !r.attchmntFile) return null;
  const title = `${r.attchmntText ?? ""}`.replace(/\s+/g, " ").trim() || `${r.desc ?? ""}`;
  return candidate(
    { ticker, exchange: "NSE", exchangeId: String(r.seq_id), url: r.attchmntFile, title: `${title}`.slice(0, 500), filedAt: parseNseDate(String(r.an_dt ?? "")) },
    false,
  );
}

// ------------------------------------------------------------------ Dedupe

/**
 * One filing per call. An NSE transcript within CROSS_EXCHANGE_DAYS of a BSE transcript from the
 * same company is the same document (BSE kept: its scrip-coded feed is the primary source). A
 * company re-filing a corrected transcript leaves two filings for one call: same company and
 * same quarter (named in both headlines, or both inferred and within 15 days) -> the latest kept.
 * Non-transcripts pass through untouched.
 */
export function dedupe(list: Candidate[]): { kept: Candidate[]; duplicates: Duplicate[] } {
  const duplicates: Duplicate[] = [];
  const transcripts = list.filter((c) => c.kind === "transcript");
  const others = list.filter((c) => c.kind !== "transcript");
  const sameCo = (a: Candidate, b: Candidate) => a.ticker === b.ticker;
  const daysApart = (a: Candidate, b: Candidate) => Math.abs(a.filedAt.getTime() - b.filedAt.getTime()) / DAY;

  // 1. The same transcript on both exchanges.
  const bse = transcripts.filter((c) => c.exchange === "BSE");
  let pool = transcripts.filter((c) => {
    if (c.exchange !== "NSE") return true;
    // The nearest BSE filing within the window, whatever its kind: NSE subjects are generic ("has
    // informed the Exchange about Transcript"), so an NSE twin of a special BSE call looks like a
    // results call (Sun Pharma's Organon call, 2026-05-05, on both exchanges).
    const twin = bse
      .filter((b) => sameCo(b, c) && daysApart(b, c) <= CROSS_EXCHANGE_DAYS)
      .sort((x, y) => daysApart(x, c) - daysApart(y, c))[0];
    if (twin) duplicates.push({ filing: c, keptId: twin.exchangeId, reason: "other_exchange" });
    return !twin;
  });

  // 2. Re-filed transcripts of one results call: newest first, an older one in the same call is
  // dropped. Special calls are never merged this way (an acquisition call in the same quarter as the
  // results call is a different call).
  const special = pool.filter((c) => c.callKind === "special");
  pool = pool.filter((c) => c.callKind === "results");
  pool = [...pool].sort((a, b) => b.filedAt.getTime() - a.filedAt.getTime());
  const kept: Candidate[] = [];
  for (const c of pool) {
    const newer = kept.find(
      (k) =>
        sameCo(k, c) &&
        k.guess.fiscalYear === c.guess.fiscalYear &&
        k.guess.quarter === c.guess.quarter &&
        (k.guessFromTitle && c.guessFromTitle ? daysApart(k, c) <= 60 : daysApart(k, c) <= 15),
    );
    if (newer) duplicates.push({ filing: c, keptId: newer.exchangeId, reason: "refiled" });
    else kept.push(c);
  }
  return { kept: [...kept, ...special, ...others].sort((a, b) => a.filedAt.getTime() - b.filedAt.getTime()), duplicates };
}

// ------------------------------------------------------------------ Per company (backfill)

export type CompanyRef = { ticker: string; bseCode: string | null; nseSymbol?: string };

export type CompanyDiscovery = { ticker: string; candidates: Candidate[]; duplicates: Duplicate[]; attempts: Attempt[] };

/**
 * Every transcript filing for one company in [from, to]: BSE one fiscal year at a time, and NSE
 * in one request (no paging, any range). NSE is asked even when BSE answered: on the sample, some
 * companies filed a quarter's transcript on one exchange only (BEL's FY22 calls, HAL's on NSE
 * only). dedupe() then drops the NSE twin of every BSE filing.
 */
export async function discoverCompany(co: CompanyRef, from: Date = HISTORY_FROM, to: Date = new Date()): Promise<CompanyDiscovery> {
  const attempts: Attempt[] = [];
  const found: Candidate[] = [];
  if (co.bseCode) {
    for (const w of fiscalWindows(from, to)) {
      let r = await bseRows(co.bseCode, w.from, w.to);
      // A long window has come back empty (or refused as too long) where quarter windows answered:
      // ask again a quarter at a time before believing a year with no transcripts.
      if ((r.ok && !r.rows.length) || (!r.ok && r.kind === "api")) {
        const rows: BseRow[] = [];
        let failedQ: typeof r | null = null;
        for (const q of quarterWindows(w.from, w.to)) {
          const x = await bseRows(co.bseCode, q.from, q.to);
          if (x.ok) rows.push(...x.rows);
          else failedQ = x;
        }
        r = failedQ && !rows.length ? failedQ : { ok: true, rows };
      }
      const label = `BSE ${ymdIst(w.from)}-${ymdIst(w.to)}`;
      if (!r.ok) {
        attempts.push({ step: label, ok: false, kind: r.kind === "api" ? "http" : r.kind, detail: r.detail });
        // Refused: the rest of the windows would be too.
        if (r.kind === "refused") break;
        continue;
      }
      const c = r.rows.map((x) => fromBseRow(x, co.ticker)).filter((x): x is Candidate => !!x);
      found.push(...c);
      attempts.push({ step: label, ok: true, detail: `${r.rows.length} rows` });
    }
  } else {
    attempts.push({ step: "BSE", ok: false, kind: "empty", detail: "no BSE scrip code" });
  }
  {
    const r = await nseRows(co.nseSymbol ?? co.ticker, from, to);
    if (!r.ok) attempts.push({ step: "NSE", ok: false, kind: r.kind === "api" ? "http" : r.kind, detail: r.detail });
    else {
      const c = r.rows.map((x) => fromNseRow(x, co.ticker)).filter((x): x is Candidate => !!x);
      found.push(...c);
      attempts.push({ step: "NSE", ok: true, detail: `${r.rows.length} announcements, ${c.length} transcript-like` });
    }
  }
  const inRange = found.filter((c) => c.filedAt.getTime() >= from.getTime() - DAY && c.filedAt.getTime() <= to.getTime() + DAY);
  const { kept, duplicates } = dedupe(inRange);
  return { ticker: co.ticker, candidates: kept, duplicates, attempts };
}

// ------------------------------------------------------------------ All companies (daily)

export type DayDiscovery = { candidates: Candidate[]; duplicates: Duplicate[]; attempts: Attempt[]; bseRows: number; nseRows: number };

/**
 * Transcripts filed by tracked companies over [from, to] (the daily job asks for yesterday and
 * today in IST, so a filing after the cron's 21:00 run is picked up the next evening). One BSE
 * query for all companies (paged) and one NSE query for all companies; rows are kept for tracked
 * scrip codes / symbols only, then deduped. Either exchange failing leaves the other's filings.
 */
export async function discoverDay(tracked: CompanyRef[], from: Date, to: Date): Promise<DayDiscovery> {
  const byBse = new Map(tracked.filter((c) => c.bseCode).map((c) => [String(c.bseCode), c.ticker]));
  const byNse = new Map(tracked.map((c) => [(c.nseSymbol ?? c.ticker).toUpperCase(), c.ticker]));
  const attempts: Attempt[] = [];
  const found: Candidate[] = [];
  let bseCount = 0;
  let nseCount = 0;

  const b = await bseRows("", from, to);
  if (!b.ok) attempts.push({ step: "BSE all companies", ok: false, kind: b.kind === "api" ? "http" : b.kind, detail: b.detail });
  else {
    bseCount = b.rows.length;
    for (const r of b.rows) {
      const ticker = byBse.get(String(r.SCRIP_CD ?? ""));
      const c = ticker ? fromBseRow(r, ticker) : null;
      if (c) found.push(c);
    }
    attempts.push({ step: "BSE all companies", ok: true, detail: `${b.rows.length} rows` });
  }

  const n = await nseRows(null, from, to);
  if (!n.ok) attempts.push({ step: "NSE all companies", ok: false, kind: n.kind === "api" ? "http" : n.kind, detail: n.detail });
  else {
    nseCount = n.rows.length;
    for (const r of n.rows) {
      const ticker = byNse.get(String(r.symbol ?? "").toUpperCase());
      const c = ticker ? fromNseRow(r, ticker) : null;
      if (c) found.push(c);
    }
    attempts.push({ step: "NSE all companies", ok: true, detail: `${n.rows.length} announcements` });
  }
  const { kept, duplicates } = dedupe(found);
  return { candidates: kept, duplicates, attempts, bseRows: bseCount, nseRows: nseCount };
}

/** An NSE filing in `fresh` that is the twin of a BSE filing already stored (the daily job's cross-run dedupe). */
export function isTwinOf(fresh: Candidate, stored: { exchange: string; filedAt: Date; companyTicker: string }[]): boolean {
  if (fresh.exchange !== "NSE") return false;
  return stored.some((s) => s.exchange === "BSE" && s.companyTicker === fresh.ticker && Math.abs(s.filedAt.getTime() - fresh.filedAt.getTime()) <= CROSS_EXCHANGE_DAYS * DAY);
}

// ------------------------------------------------------------------ BSE scrip codes

/**
 * A company's BSE scrip code from BSE's own quote search (the box on bseindia.com), matching the
 * NSE symbol it lists beside each hit. Used to fill the backfill's local code map before
 * Company.bseCode is populated; null when BSE lists no match.
 */
export async function lookupBseCode(nseSymbol: string): Promise<string | null> {
  const r = await politeGet(`https://api.bseindia.com/BseIndiaAPI/api/PeerSmartSearch/w?Type=SS&text=${encodeURIComponent(nseSymbol)}`, {
    referer: BSE_REFERER,
    accept: "application/json",
  });
  if (!r.ok) return null;
  const html = r.body.toString("utf8").replace(/\\"/g, '"');
  for (const m of html.matchAll(/liclick\('(\d{6})'[^]*?<strong>([^<]+)<\/strong>/g)) {
    if (m[2].trim().toUpperCase() === nseSymbol.toUpperCase()) return m[1];
  }
  return null;
}
