// Corporate filings (NSE's announcements feed): which ones are material, and which chip each goes
// under on /updates?view=filings and /watchlist?feed=filings. NSE labels every filing with a
// subject ("desc"); most subjects decide the type on their own, and a few catch-alls (board-meeting
// outcomes, "Updates", press releases) are read from the filing's summary. Anything not mapped here
// is routine paperwork (call schedules, newspaper copies, trading-window dates...) and is left out.
// Pure functions, so the tests run them on a saved response.

export type FilingType = "results" | "orders" | "deals" | "payouts" | "ratings" | "management" | "other";

/** The chips, in display order (after "All"). */
export const FILING_TYPES: { type: FilingType; label: string }[] = [
  { type: "results", label: "Results" },
  { type: "orders", label: "Orders" },
  { type: "deals", label: "Deals & stakes" },
  { type: "payouts", label: "Payouts" },
  { type: "ratings", label: "Ratings" },
  { type: "management", label: "Management" },
  { type: "other", label: "Other" },
];

export const filingLabel = (t: FilingType) => FILING_TYPES.find((x) => x.type === t)!.label;

export type Filing = {
  ticker: string;
  company: string;
  type: FilingType;
  /** NSE's subject line, e.g. "Bagging/Receiving of orders/contracts". */
  subject: string;
  /** NSE's plain-English summary of the filing. */
  summary: string;
  /** The filing itself (a PDF on NSE's archives). */
  url: string;
  ts: number;
};

const BY_SUBJECT: Record<string, FilingType> = {
  "Integrated Filing- Financial": "results",
  "Clarification - Financial Results": "results",

  "Bagging/Receiving of orders/contracts": "orders",
  "Awarding of order(s)/contract(s)": "orders",
  Agreements: "orders",
  "Arrangements for strategic, technical, manufacturing, or marketing tie up": "orders",
  "Capacity addition": "orders",
  "Commencement of commercial production/operations": "orders",
  "Product launch": "orders",

  Acquisition: "deals",
  "Sale or disposal": "deals",
  "Amalgamation/Merger": "deals",
  Demerger: "deals",
  "Scheme of Arrangement": "deals",
  "Other Restructuring": "deals",
  "Open Offer": "deals",
  "Public Announcement-Open Offer": "deals",
  "Disclosure under SEBI Takeover Regulations": "deals",
  "Issue of Securities": "deals",
  "Preferential issue": "deals",
  "Rights Issue": "deals",

  Dividend: "payouts",
  Buyback: "payouts",
  "Public Announcement - Buyback of Shares": "payouts",
  "Post Buyback Public Announcement": "payouts",
  Bonus: "payouts",
  "Stock split": "payouts",

  "Credit Rating": "ratings",
  "Credit Rating- Revision": "ratings",
  "Credit Rating- New": "ratings",
  "Credit Rating- Others": "ratings",

  "Change in Management": "management",
  Appointment: "management",
  "Resignation of Director/KMP/SMP": "management",
  "Change in Director(s)": "management",
  "Change in Auditors": "management",
  "Resignation of Statutory Auditor": "management",

  "Disclosure of material issue": "other",
  "Action(s) taken or orders passed": "other",
  "Action(s) initiated or orders passed": "other",
  "Pendency of Litigation(s)/dispute(s) or the outcome impacting the Company": "other",
  "Granting/withdrawal/surrender/cancellation/suspension of key licenses/ regulatory approvals": "other",
  "Disruption of Operations": "other",
  "Strikes/Lockouts/Disturbances": "other",
  "Fraud/Default/Arrest": "other",
  "Monthly Business Updates": "other",
};

// Read from the summary, for the catch-all subjects. A notice that results *will* be considered
// (a board-meeting date) is not results.
const RESULTS = /\b(financial results|quarterly results|results for the (quarter|year|half)|(un)?audited (standalone |consolidated )?(financial )?results)\b/i;
const NOTICE_ONLY = /\b(to consider|will consider|is scheduled|scheduled (on|for)|will be held|intimation of (the )?board meeting)\b/i;
const ORDERS = /\b(received (an? |the )?([\w-]+ ){0,3}(orders?|contracts?)|(orders?|contracts?) (worth|valued|aggregating|from|of rs)|awarded (an? |the )?([\w-]+ ){0,3}(orders?|contracts?|projects?|works?)|letters? of (award|intent)|LoA|LoI|work orders?|purchase orders?|selected bidder|lowest bidder|L1 bidder|commissioned (an? |the )?(additional |new )?([\d.,]+ ?(k?w|mw|mwp|gw|mtpa|tpd)\b|plant|unit|capacity|line|facility))/i;
// Court and regulator matters ("order of the tribunal") are material, but not order wins. Checked
// after ORDERS, so a contract from a High Court's building authority is still an order win.
const LEGAL = /\b(litigation|court|tribunal|nclt|nclat|arbitration|penalty|show cause|sebi order)\b/i;
// A meet or call that only goes over what is already out.
const ALREADY_OUT = /\balready (been )?(disclosed|in the public domain|available)\b/i;
// Insider-trading paperwork filed under the catch-all subjects.
const PAPERWORK = /\b(insider trading|form c\b|regulation 7\s*\(2\)|reg\.? 7\s*\(2\)|trading window|loss of share certificate|newspaper)/i;
// Meets and calls: dropped only when the filing has nothing else (a results release that mentions
// its earnings call is still results).
const MEET = /\b((analysts?|investors?)( and (analysts?|investors?))? (meet|meeting|call)|con(ference)? call|earnings call)\b/i;
const DEALS = /\b(acqui(re|red|res|sition)|merger|amalgamation|demerger|stake|joint venture|open offer|preferential|qip|rights issue)\b/i;
const PAYOUTS = /\b(dividend|buy-?back|bonus|stock split|sub-division)\b/i;
const RATINGS = /\b(credit rating|rating (agency|action)|reaffirmed|upgraded)\b/i;

/** The chip a filing goes under, or null when it is routine and left out. */
export function classifyFiling(subject: string, text: string): FilingType | null {
  const s = subject.trim();
  const mapped = BY_SUBJECT[s];
  if (mapped) return mapped;
  // Per sentence, so "approved the results ... the next meeting is scheduled for" is still results.
  const results = text.split(/[.;]\s+/).some((x) => RESULTS.test(x) && !NOTICE_ONLY.test(x));
  // A results deck is results; a deck for a conference repeats what is already out.
  if (s === "Investor Presentation") return results ? "results" : null;
  // A record date for a shareholder payout, not for bond interest.
  if (s === "Record Date") return /\b(dividend|bonus|split|buy-?back|rights)\b/i.test(text) ? "payouts" : null;
  if (s === "Outcome of Board Meeting") {
    if (results) return "results";
    if (PAYOUTS.test(text)) return "payouts";
    return "other";
  }
  if (s === "General Updates" || s === "Updates" || s === "Press Release" || s === "Press Release (Revised)") {
    if (PAPERWORK.test(text) || (MEET.test(text) && ALREADY_OUT.test(text))) return null;
    if (results) return "results";
    if (ORDERS.test(text)) return "orders";
    if (LEGAL.test(text)) return "other";
    if (DEALS.test(text)) return "deals";
    if (PAYOUTS.test(text)) return "payouts";
    if (RATINGS.test(text)) return "ratings";
    if (MEET.test(text)) return null;
    // A press release is the company choosing to speak; a bare "Updates" filing with none of the
    // above is usually paperwork (insider forms, standstill extensions).
    return s.startsWith("Press Release") ? "other" : null;
  }
  return null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : "");

/** "2026-11-26 20:39:57" in India time to epoch ms; NaN if it isn't one. */
export function istToMs(s: string): number {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - 330 * 60_000;
}

/** NSE's announcements JSON to material filings, newest first. Anything unexpected gives []. */
export function parseAnnouncements(json: unknown): Filing[] {
  if (!Array.isArray(json)) return [];
  const out: Filing[] = [];
  for (const row of json) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const ticker = str(r.symbol);
    const url = str(r.attchmntFile);
    const subject = str(r.desc);
    const ts = istToMs(str(r.sort_date));
    if (!ticker || !url || !subject || !Number.isFinite(ts)) continue;
    const summary = str(r.voiceSummary) || str(r.attchmntText);
    const type = classifyFiling(subject, `${str(r.voiceSummary)} ${str(r.attchmntText)}`);
    if (!type) continue;
    out.push({ ticker, company: str(r.sm_name) || ticker, type, subject, summary, url, ts });
  }
  // One event filed under two subjects (an order win also sent as "Capacity addition") reads the
  // same twice: keep the newest of each company's identical summaries.
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.ts - a.ts)
    .filter((f) => {
      const key = `${f.ticker}|${f.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
