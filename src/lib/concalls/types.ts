// Shared shapes for the earnings-call history (see the Concall* models in prisma/schema.prisma).
// The pipeline (discover/fetch/summarise), the track record and the company-page views all read
// these; change them only together with every user.

// ------------------------------------------------------------------ Fiscal periods
// Indian fiscal year ends 31 March: FY27 = Apr 2026 - Mar 2027 -> fiscalYear 2027. Q1 = Apr-Jun.

export type FiscalQuarter = { fiscalYear: number; quarter: 1 | 2 | 3 | 4 };

/** The fiscal quarter a date falls in. */
export function fiscalQuarterOf(d: Date): FiscalQuarter {
  const m = d.getUTCMonth(); // 0 = Jan
  const y = d.getUTCFullYear();
  const fiscalYear = m >= 3 ? y + 1 : y;
  const quarter = (m >= 3 ? Math.floor((m - 3) / 3) + 1 : 4) as FiscalQuarter["quarter"];
  return { fiscalYear, quarter };
}

/** Last day of a fiscal quarter (UTC midnight). */
export function quarterEnd({ fiscalYear, quarter }: FiscalQuarter): Date {
  // Q1 ends 30 Jun of fiscalYear-1, Q2 30 Sep, Q3 31 Dec, Q4 31 Mar of fiscalYear.
  const [y, m] = quarter === 4 ? [fiscalYear, 3] : [fiscalYear - 1, 3 + quarter * 3];
  return new Date(Date.UTC(y, m, 0));
}

/** fiscalYear * 10 + quarter: sortable, and what ConcallDigest.throughKey stores. */
export const quarterKey = (q: FiscalQuarter) => q.fiscalYear * 10 + q.quarter;
export const quarterLabel = (q: FiscalQuarter) => `Q${q.quarter} FY${String(q.fiscalYear).slice(-2)}`;

/** The first fiscal year the history covers. */
export const HISTORY_FROM_FY = 2022;

// ------------------------------------------------------------------ Filings

export type FilingStatus =
  | "found" // listed on the exchange, not yet downloaded
  | "fetched" // PDF downloaded and text extracted, waiting to be batched
  | "batched" // sent to the Batch API (ConcallFiling.batchId)
  | "summarised"
  | "scanned" // image-only PDF, needs OCR
  | "not_transcript" // presentation / AGM / audio link filed under the same heading
  | "download_failed"
  | "failed";

/** A transcript filing as discovered on an exchange, before it is stored. */
export type DiscoveredFiling = {
  ticker: string;
  exchange: "BSE" | "NSE";
  exchangeId: string;
  url: string;
  title: string;
  filedAt: Date;
};

// ------------------------------------------------------------------ Summary (Claude output)

export type Quoted = { quote: string; page: number };

export const GUIDANCE_METRICS = [
  "revenue_growth", // % growth (YoY unless stated)
  "revenue", // absolute, Rs cr / $ mn
  "ebitda_margin", // % or bps change
  "gross_margin",
  "net_profit", // absolute or growth
  "capex",
  "order_book",
  "order_inflow",
  "volume", // units / tonnes / capacity utilisation
  "other",
] as const;
export type GuidanceMetric = (typeof GUIDANCE_METRICS)[number];

export const PERIOD_KINDS = ["FY", "H1", "H2", "Q", "multi_year", "unspecified"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];

export type GuidanceItem = Quoted & {
  metric: GuidanceMetric;
  period_kind: PeriodKind;
  /** e.g. 2027 for FY27; for multi_year the last year of the range. null when not stated. */
  target_fiscal_year: number | null;
  target_quarter: number | null;
  /** Numbers as stated (a point estimate has low = high); null when only directional. */
  low: number | null;
  high: number | null;
  unit: "%" | "bps" | "Rs cr" | "$ mn" | "x" | "units" | null;
  direction: "up" | "down" | "flat" | null;
  statement: string;
};

export type Point = Quoted & { point: string };
export type KeyQA = Quoted & { analyst_question: string; management_answer: string };

export const TONES = ["positive", "cautiously positive", "neutral", "cautious", "negative"] as const;
export type Tone = (typeof TONES)[number];

/** What Claude returns for one call; ConcallSummary.summary stores it whole. */
export type ConcallSummaryJson = {
  fiscal_year: number;
  quarter: number;
  call_date: string; // YYYY-MM-DD, or "" when not stated
  guidance: GuidanceItem[];
  demand: Point[];
  risks: Point[];
  initiatives: Point[];
  tone: { label: Tone; rationale: string };
  key_qa: KeyQA[];
};

/** Result of checking one item's quote and numbers against the PDF text. */
export type ItemCheck = {
  section: "guidance" | "demand" | "risks" | "initiatives" | "key_qa";
  index: number;
  quoteFound: "page" | "elsewhere" | "missing";
  missingNumbers: string[];
};

// ------------------------------------------------------------------ Track record

export type Verdict = "beat" | "met" | "missed" | "pending" | "not_checkable";

// ------------------------------------------------------------------ Digests (ConcallDigest.digest)

export type DigestScope = "year" | "multi_year";

export type ConcallDigestJson = {
  scope: DigestScope;
  from: string; // quarterLabel of the first call included
  through: string; // quarterLabel of the latest call included
  calls: number;
  headline: string; // 1-2 sentences
  narrative_shifts: { theme: string; detail: string; quarters: string[] }[];
  guidance_path: { metric: GuidanceMetric; path: string; delivered: string }[];
  credibility: { verdicts: Record<Verdict, number>; note: string };
  recurring_risks: string[];
};

// ------------------------------------------------------------------ Model + cost

export const CONCALL_MODEL = "claude-opus-5-5";
/** $ per million tokens, claude-opus-5-5 first-party API (cached 2026-10-06). Batch API = half. */
export const OPUS_PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
export const BATCH_DISCOUNT = 0.5;
