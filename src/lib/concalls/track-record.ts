// The guidance track record: each forward-looking statement management made on a call
// (ConcallGuidance) lined up against what the company then reported (QuarterlyResult, and the
// annual FinancialSnapshot where it covers the year), with a verdict: beat | met | missed |
// pending | not_checkable. The company page shows these rows and their counts as a credibility
// record, and the digests feed the verdicts to Claude so "how did guidance compare with delivery"
// rests on our arithmetic, never on the model's.
//
// Pure functions first (actualFor, verdictFor, checkGuidance): no DB, no clock unless passed, so
// the rules below are unit-tested in ./track-record.test.ts. checkCompanyGuidance is the thin DB
// layer on top. It recomputes every row of a company each time (a few dozen rows of arithmetic),
// so a row that was pending, or not_checkable because a quarter had not been fetched yet, heals on
// the next run without any bookkeeping.
//
// ---- What is checkable
// Only what Screener's quarterly table and our annual figures can measure:
//   revenue_growth   % YoY: FY from the annual figures (both years), else the sum of four quarters
//                    against the same four a year earlier; H1/H2/Q from quarters against the same
//                    quarters a year earlier.
//   revenue          absolute Rs cr for the period (annual figure, else the sum of quarters).
//   ebitda_margin    level in % = sum(operating profit) / sum(revenue) over the period's quarters
//                    (FY needs all four: the annual table has no operating profit). Guidance in bps
//                    (or a small "%" with improve/expand wording) is a change against the same
//                    period a year earlier, measured in bps.
//   net_profit       absolute Rs cr, or % growth when the unit is %.
//   gross_margin, capex, order_book, order_inflow, volume, other: not_checkable (Screener's
//   quarterly table has none of them), with a note saying so.
// A lender (bank / NBFC) has no operating profit line worth the name, so its margin guidance is
// not_checkable; we spot one by interest cost above LENDER_INTEREST_SHARE of revenue (see isLender).
// "$ mn", "x" and "units" cannot be compared with Rs cr figures: not_checkable.
// Companies that report Jan-Dec (financialsNote says so) are not_checkable for now: their
// guidance names calendar periods, and mapping those onto Indian fiscal quarters is unverified.
//
// ---- Verdict rules (verdictFor)
// Every checkable metric is "higher is better" (revenue, growth, margin, profit), so:
//   range [low, high]   met inside the range widened by the tolerance, beat above, missed below.
//   point (low = high)  the same, so met means within tolerance of the number.
//   floor (low only, "at least 15%")  missed below low - tol, beat above low + FLOOR_BEAT_BAND,
//                       met in between.
//   ceiling (high only, "up to 10%")  treated as a point estimate at high.
//   directional only    up: met if the change is > 0, else missed; down: met if < 0; flat: met
//                       within FLAT_BAND. A directional statement is never a beat.
//   direction "down" with positive numbers ("decline of 5-7%") is read as [-7, -5].
// Tolerances (TOLERANCE): 0.5 percentage points for % growth and margin levels, 25 bps for margin
// changes stated in bps, 2% of the target for absolute Rs cr figures. They absorb rounding in what
// management says ("~27%") and the gap between Screener's operating profit and the company's own
// EBITDA definition; anything wider is a real miss or beat.
// Vague guidance with no numbers ("high single digit", "low double-digit", "mid-teens") is given
// a range by vagueRange() before the rules apply, so it is checked like any other range; the
// table is in VAGUE_RANGES and the actual note says the range was inferred.
//
// ---- Pending vs not_checkable
// A period is pending until every quarter it needs is in QuarterlyResult (or the annual figure is
// there, for FY revenue / profit) AND, when something is missing, until the results deadline has
// passed: 45 days after quarter end for Q1-Q3, 60 for Q4 (SEBI LODR) plus RESULTS_GRACE_DAYS for
// our refresh. Past that with figures still missing (Screener shows only ~13 quarters, so H1 FY23
// guidance falls off the end) the row is not_checkable with a note naming the gap.
import type { PrismaClient } from "@/generated/prisma/client";
import { quarterEnd, quarterLabel, type GuidanceMetric, type PeriodKind, type Verdict } from "./types";

// ------------------------------------------------------------------ Inputs

/** One guidance statement, as stored in ConcallGuidance (numbers already converted from Decimal). */
export type GuidanceInput = {
  metric: GuidanceMetric | string;
  periodKind: PeriodKind | string;
  targetFiscalYear: number | null;
  targetQuarter: number | null;
  low: number | null;
  high: number | null;
  unit: string | null;
  direction: "up" | "down" | "flat" | string | null;
  statement: string;
  /** GuidanceItem.scope; rows stored before scope existed count as company-wide. */
  scope?: "company" | "segment" | "product" | string | null;
};

export type QuarterFigures = {
  fiscalYear: number;
  quarter: number;
  revenueCr: number | null;
  operatingProfitCr: number | null;
  netProfitCr: number | null;
  interestCr?: number | null;
};

/** FinancialSnapshot: `year` is the fiscal year it ends in (2026 = FY26, Apr 2025 - Mar 2026). */
export type AnnualFigures = { year: number; revenueCr: number | null; netProfitCr: number | null };

export type CompanyData = {
  quarters: QuarterFigures[];
  annual: AnnualFigures[];
  /** Reports Jan-Dec (Company.financialsNote): annual columns hold calendar years. */
  calendarYear?: boolean;
  /** Bank / NBFC; isLender() decides when not given. */
  lender?: boolean;
  /** "Today" for the results-deadline rule; defaults to the current time. */
  asOf?: Date;
};

// ------------------------------------------------------------------ Outputs

export type ActualUnit = "%" | "bps" | "Rs cr";
export type Actual =
  | { status: "ok"; value: number; unit: ActualUnit; note: string }
  | { status: "pending"; note: string }
  | { status: "not_checkable"; note: string };

export type GuidanceCheck = { actual: number | null; actualNote: string; verdict: Verdict };

// ------------------------------------------------------------------ Rules (exported for tests / docs)

export const TOLERANCE = { pp: 0.5, bps: 25, relative: 0.02 } as const;
/** A floor ("at least X") is beaten only by more than this (pp, bps, or relative for Rs cr). */
export const FLOOR_BEAT_BAND = { pp: 2, bps: 50, relative: 0.1 } as const;
/** "Flat" guidance is met within this many pp (or bps for margins). */
export const FLAT_BAND = { pp: 2, bps: 50 } as const;
export const RESULTS_GRACE_DAYS = 10;
/** Interest cost above this share of revenue (over the rows we have) marks a lender. */
export const LENDER_INTEREST_SHARE = 0.25;

/** Words investors and managements use for a growth band, with the range we check them against. */
export const VAGUE_RANGES: { re: RegExp; low: number | null; high: number | null; label: string }[] = [
  // Two-band phrases first, or "mid to high single digit" would match "high single digit" alone.
  { re: /\blow[- ]to[- ]mid[- ]single[- ]digits?\b/i, low: 1, high: 6, label: "low to mid single digit = 1-6%" },
  { re: /\bmid[- ]to[- ]high[- ]single[- ]digits?\b/i, low: 4, high: 9, label: "mid to high single digit = 4-9%" },
  { re: /\b(?:high[- ]single[- ]digits?[- ]to[- ]low[- ]double[- ]digits?|high[- ]single[- ]to[- ]low[- ]double[- ]digits?)\b/i, low: 7, high: 13, label: "high single to low double digit = 7-13%" },
  { re: /\blow[- ]to[- ]mid[- ](?:double[- ]digits?|teens?)\b/i, low: 10, high: 16, label: "low to mid double digit = 10-16%" },
  { re: /\blow[- ]single[- ]digits?\b/i, low: 1, high: 4, label: "low single digit = 1-4%" },
  { re: /\bmid[- ]single[- ]digits?\b/i, low: 4, high: 6, label: "mid single digit = 4-6%" },
  { re: /\bhigh[- ]single[- ]digits?\b/i, low: 7, high: 9, label: "high single digit = 7-9%" },
  { re: /\bsingle[- ]digits?\b/i, low: 1, high: 9, label: "single digit = 1-9%" },
  { re: /\blow[- ]double[- ]digits?\b/i, low: 10, high: 13, label: "low double digit = 10-13%" },
  { re: /\bmid[- ]double[- ]digits?\b/i, low: 14, high: 16, label: "mid double digit = 14-16%" },
  { re: /\bhigh[- ]double[- ]digits?\b/i, low: 17, high: 19, label: "high double digit = 17-19%" },
  { re: /\b(?:low|early)[- ]teens?\b/i, low: 11, high: 13, label: "low teens = 11-13%" },
  { re: /\bmid[- ]teens?\b/i, low: 14, high: 16, label: "mid teens = 14-16%" },
  { re: /\bhigh[- ]teens?\b/i, low: 17, high: 19, label: "high teens = 17-19%" },
  { re: /\b(?:low|early)[- ]twenties\b/i, low: 20, high: 23, label: "low twenties = 20-23%" },
  { re: /\bmid[- ]twenties\b/i, low: 24, high: 26, label: "mid twenties = 24-26%" },
  // Plain "double digit" is a floor: management saying it means "10% or more".
  { re: /\bdouble[- ]digits?\b/i, low: 10, high: null, label: "double digit = 10% or more" },
];

const NOT_IN_SCREENER: Partial<Record<string, string>> = {
  gross_margin: "Gross margin is not in the quarterly results we hold (Screener reports operating profit only).",
  capex: "Capex is a cash-flow item; the quarterly results we hold have no capex line.",
  order_book: "Order book is disclosed in presentations, not in the quarterly results we hold.",
  order_inflow: "Order inflow is disclosed in presentations, not in the quarterly results we hold.",
  volume: "Volumes / capacity utilisation are not in the quarterly results we hold.",
  other: "Not a reported line item; read the statement against the next calls.",
};

// ------------------------------------------------------------------ Helpers

type Q = { fiscalYear: number; quarter: 1 | 2 | 3 | 4 };
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString("en-IN", { maximumFractionDigits: d });
const fyLabel = (y: number) => `FY${String(y).slice(-2)}`;

/** Bank / NBFC-shaped rows: interest cost a large share of revenue. */
export function isLender(quarters: QuarterFigures[]): boolean {
  let interest = 0;
  let revenue = 0;
  for (const q of quarters)
    if (q.interestCr != null && q.revenueCr != null && q.revenueCr > 0) {
      interest += q.interestCr;
      revenue += q.revenueCr;
    }
  return revenue > 0 && interest / revenue > LENDER_INTEREST_SHARE;
}

/** The range a vague phrase stands for, when the statement has no numbers of its own. */
export function vagueRange(statement: string): { low: number | null; high: number | null; label: string } | null {
  for (const v of VAGUE_RANGES) if (v.re.test(statement)) return { low: v.low, high: v.high, label: v.label };
  return null;
}

/** The quarters a guidance period covers, or why it has none. */
export function periodQuarters(g: Pick<GuidanceInput, "periodKind" | "targetFiscalYear" | "targetQuarter">): Q[] | string {
  const y = g.targetFiscalYear;
  if (g.periodKind === "unspecified") return "No period stated.";
  if (y == null) return "No target year stated.";
  const qs = (list: number[]) => list.map((quarter) => ({ fiscalYear: y, quarter: quarter as Q["quarter"] }));
  switch (g.periodKind) {
    case "FY":
    case "multi_year":
      return qs([1, 2, 3, 4]);
    case "H1":
      return qs([1, 2]);
    case "H2":
      return qs([3, 4]);
    case "Q":
      return g.targetQuarter && g.targetQuarter >= 1 && g.targetQuarter <= 4 ? qs([g.targetQuarter]) : "Quarter not stated.";
    default:
      return `Unknown period kind "${g.periodKind}".`;
  }
}

const periodName = (g: GuidanceInput, qs: Q[]) =>
  g.periodKind === "FY" || g.periodKind === "multi_year"
    ? fyLabel(qs[0].fiscalYear)
    : g.periodKind === "Q"
      ? quarterLabel(qs[0])
      : `${g.periodKind} ${fyLabel(qs[0].fiscalYear)}`;

/** Results for a quarter are due 45 days after it ends (60 for Q4), plus our refresh's grace. */
export function resultsDue(q: Q): Date {
  const end = quarterEnd(q);
  return new Date(end.getTime() + ((q.quarter === 4 ? 60 : 45) + RESULTS_GRACE_DAYS) * 86_400_000);
}

const lastYear = (qs: Q[]): Q[] => qs.map((q) => ({ fiscalYear: q.fiscalYear - 1, quarter: q.quarter }));

type Sum = { value: number } | { missing: Q[] };
function sumOf(data: CompanyData, qs: Q[], field: "revenueCr" | "operatingProfitCr" | "netProfitCr"): Sum {
  const missing: Q[] = [];
  let value = 0;
  for (const q of qs) {
    const row = data.quarters.find((r) => r.fiscalYear === q.fiscalYear && r.quarter === q.quarter);
    const v = row?.[field];
    if (v == null || !Number.isFinite(v)) missing.push(q);
    else value += v;
  }
  return missing.length ? { missing } : { value };
}

/** Pending while a missing quarter's results are not yet due; not_checkable once they are overdue. */
function missingOutcome(missing: Q[], data: CompanyData, what: string): Actual {
  const asOf = data.asOf ?? new Date();
  const notDue = missing.filter((q) => resultsDue(q) > asOf);
  if (notDue.length) {
    const wholeYear = notDue.length === 4 && notDue.every((q) => q.fiscalYear === notDue[0].fiscalYear);
    return { status: "pending", note: `Waiting for ${wholeYear ? fyLabel(notDue[0].fiscalYear) : notDue.map(quarterLabel).join(", ")} results.` };
  }
  return { status: "not_checkable", note: `No ${what} for ${missing.map(quarterLabel).join(", ")} in the results we hold.` };
}

const annualOf = (data: CompanyData, y: number, field: "revenueCr" | "netProfitCr") => {
  const v = data.annual.find((a) => a.year === y)?.[field];
  return v != null && Number.isFinite(v) ? v : null;
};

/** Period total from the annual figure (FY only) or the sum of its quarters. */
function totalFor(data: CompanyData, qs: Q[], field: "revenueCr" | "netProfitCr"): Sum & { source?: string } {
  if (qs.length === 4) {
    const a = annualOf(data, qs[0].fiscalYear, field);
    if (a != null) return { value: a, source: "annual" };
  }
  const s = sumOf(data, qs, field);
  return "value" in s ? { ...s, source: qs.length > 1 ? `sum of ${qs.length} quarters` : "quarter" } : s;
}

/** Growth % of a period over the same period a year earlier; both sides from the same source. */
function growthFor(data: CompanyData, g: GuidanceInput, qs: Q[], field: "revenueCr" | "netProfitCr", what: string): Actual {
  const prev = lastYear(qs);
  const name = periodName(g, qs);
  if (qs.length === 4) {
    const a = annualOf(data, qs[0].fiscalYear, field);
    const b = annualOf(data, prev[0].fiscalYear, field);
    if (a != null && b != null && b > 0)
      return { status: "ok", value: (a / b - 1) * 100, unit: "%", note: `${name} ${what} Rs ${fmt(a, 0)} cr vs ${fmt(b, 0)} cr (annual figures)` };
  }
  const cur = sumOf(data, qs, field);
  if ("missing" in cur) return missingOutcome(cur.missing, data, what);
  const base = sumOf(data, prev, field);
  if ("missing" in base) return { status: "not_checkable", note: `No ${what} for the base period ${base.missing.map(quarterLabel).join(", ")}.` };
  if (base.value <= 0) return { status: "not_checkable", note: `Base-period ${what} is zero or negative; growth is not meaningful.` };
  const src = qs.length > 1 ? `sum of ${qs.length} quarters` : "quarterly";
  return { status: "ok", value: (cur.value / base.value - 1) * 100, unit: "%", note: `${name} ${what} Rs ${fmt(cur.value, 0)} cr vs ${fmt(base.value, 0)} cr a year earlier (${src})` };
}

function marginOf(data: CompanyData, qs: Q[]): { value: number } | { missing: Q[] } | { zero: true } {
  const op = sumOf(data, qs, "operatingProfitCr");
  const rev = sumOf(data, qs, "revenueCr");
  const missing = [...("missing" in op ? op.missing : []), ...("missing" in rev ? rev.missing : [])];
  if (missing.length) return { missing: [...new Map(missing.map((q) => [quarterLabel(q), q])).values()] };
  const r = (rev as { value: number }).value;
  if (r <= 0) return { zero: true };
  return { value: ((op as { value: number }).value / r) * 100 };
}

/** Is this margin guidance about the change (bps / "improve by 1%") rather than the level? */
export function isMarginChange(g: GuidanceInput): boolean {
  if (g.unit === "bps") return true;
  if (g.unit !== "%") return g.low == null && g.high == null; // directional only: compare with a year earlier
  const big = Math.max(Math.abs(g.low ?? 0), Math.abs(g.high ?? 0));
  return big <= 5 && /\b(improv|expan|increas|uptick|contract|declin|reduc|compress|by\s+\d)/i.test(g.statement);
}

// ------------------------------------------------------------------ actualFor

/** What the company reported for the guided metric and period, or why it can't be said yet. */
export function actualFor(g: GuidanceInput, data: CompanyData): Actual {
  const fixed = NOT_IN_SCREENER[g.metric];
  if (fixed) return { status: "not_checkable", note: fixed };
  if (data.calendarYear)
    return { status: "not_checkable", note: "Reports Jan-Dec: calendar periods are not yet mapped onto the fiscal quarters we hold." };
  if (g.unit && !["%", "bps", "Rs cr"].includes(g.unit))
    return { status: "not_checkable", note: `Guided in ${g.unit}; our figures are in Rs cr.` };

  const qs = periodQuarters(g);
  if (typeof qs === "string") return { status: "not_checkable", note: qs };
  const name = periodName(g, qs);

  switch (g.metric) {
    case "revenue_growth":
    case "revenue":
    case "net_profit": {
      const field = g.metric === "net_profit" ? "netProfitCr" : "revenueCr";
      const what = g.metric === "net_profit" ? "net profit" : "revenue";
      // Absolute when stated in Rs cr; growth when in % or directional, or for revenue_growth.
      const absolute = g.unit === "Rs cr";
      if (!absolute && g.periodKind === "multi_year")
        return { status: "not_checkable", note: "Multi-year growth target: the base year is not stated, so the CAGR can't be checked." };
      if (absolute) {
        const t = totalFor(data, qs, field);
        if ("missing" in t) return missingOutcome(t.missing, data, what);
        return { status: "ok", value: t.value, unit: "Rs cr", note: `${name} ${what} Rs ${fmt(t.value, 0)} cr (${t.source})` };
      }
      return growthFor(data, g, qs, field, what);
    }
    case "ebitda_margin": {
      if (data.lender ?? isLender(data.quarters))
        return { status: "not_checkable", note: "Lender: Screener's quarterly table has no operating margin comparable to EBITDA." };
      if (g.unit === "Rs cr") {
        // Absolute EBITDA guidance: Screener's operating profit for the period.
        const op = sumOf(data, qs, "operatingProfitCr");
        if ("missing" in op) return missingOutcome(op.missing, data, "operating profit");
        return { status: "ok", value: op.value, unit: "Rs cr", note: `${name} operating profit Rs ${fmt(op.value, 0)} cr (EBITDA as Screener reports it)` };
      }
      const cur = marginOf(data, qs);
      if ("missing" in cur) return missingOutcome(cur.missing, data, "operating profit / revenue");
      if ("zero" in cur) return { status: "not_checkable", note: "Revenue is zero or negative for the period." };
      if (!isMarginChange(g))
        return { status: "ok", value: cur.value, unit: "%", note: `${name} operating margin ${fmt(cur.value)}% (operating profit / revenue, ${qs.length > 1 ? `${qs.length} quarters` : "quarter"})` };
      const base = marginOf(data, lastYear(qs));
      if (!("value" in base)) return { status: "not_checkable", note: `No base-period margin for ${periodName(g, lastYear(qs))}.` };
      const bps = (cur.value - base.value) * 100;
      return { status: "ok", value: bps, unit: "bps", note: `${name} operating margin ${fmt(cur.value)}% vs ${fmt(base.value)}% a year earlier (${bps >= 0 ? "+" : ""}${fmt(bps, 0)} bps)` };
    }
    default:
      return { status: "not_checkable", note: `Unknown metric "${g.metric}".` };
  }
}

// ------------------------------------------------------------------ verdictFor

type Kind = "pp" | "bps" | "relative";
const kindOf = (unit: ActualUnit): Kind => (unit === "bps" ? "bps" : unit === "%" ? "pp" : "relative");
const band = (b: { pp: number; bps: number; relative: number }, kind: Kind, target: number) =>
  kind === "relative" ? Math.abs(target) * b.relative : b[kind];

/** The numbers to check against: as stated, else inferred from vague wording; signs follow `direction`. */
export function targetOf(g: GuidanceInput, actualUnit: ActualUnit): { low: number | null; high: number | null; inferred?: string } {
  let low = g.low;
  let high = g.high;
  let inferred: string | undefined;
  if (low == null && high == null) {
    const v = actualUnit === "%" ? vagueRange(g.statement) : null;
    if (v) {
      low = v.low;
      high = v.high;
      inferred = v.label;
    }
  }
  // Margin guidance in % that we read as a change: percentage points -> bps.
  if (actualUnit === "bps" && g.unit === "%") {
    low = low == null ? null : low * 100;
    high = high == null ? null : high * 100;
  }
  // "Decline of 5-7%" stored as 5..7 with direction down means -7..-5.
  if (g.direction === "down" && (low ?? 0) >= 0 && (high ?? 0) >= 0 && (low != null || high != null) && actualUnit !== "Rs cr") {
    [low, high] = [high == null ? null : -high, low == null ? null : -low];
  }
  return { low, high, inferred };
}

/** The verdict for a guidance statement given what was reported. */
export function verdictFor(g: GuidanceInput, actual: Actual): Verdict {
  if (actual.status !== "ok") return actual.status;
  const v = actual.value;
  const kind = kindOf(actual.unit);
  const { low, high } = targetOf(g, actual.unit);

  if (low == null && high == null) {
    const flat = kind === "bps" ? FLAT_BAND.bps : FLAT_BAND.pp;
    if (g.direction === "up") return v > 0 ? "met" : "missed";
    if (g.direction === "down") return v < 0 ? "met" : "missed";
    if (g.direction === "flat") return Math.abs(v) <= flat ? "met" : "missed";
    return "not_checkable";
  }
  if (low != null && high == null) {
    if (v < low - band(TOLERANCE, kind, low)) return "missed";
    if (v > low + band(FLOOR_BEAT_BAND, kind, low)) return "beat";
    return "met";
  }
  const lo = low ?? high!; // ceiling only: a point estimate at high
  const hi = high!;
  const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
  if (v < a - band(TOLERANCE, kind, a)) return "missed";
  if (v > b + band(TOLERANCE, kind, b)) return "beat";
  return "met";
}

/** actualFor + verdictFor, in the shape ConcallGuidance stores. */
export function checkGuidance(g: GuidanceInput, data: CompanyData): GuidanceCheck {
  // A product or segment remark ("generic Revlimid sales will be small") says nothing about the
  // company's total, so it is never judged against the company's results.
  if (g.scope && g.scope !== "company") {
    return { actual: null, actualNote: `About one ${g.scope}, not the whole company: not checked against company results.`, verdict: "not_checkable" };
  }
  const actual = actualFor(g, data);
  const verdict = verdictFor(g, actual);
  if (actual.status !== "ok") return { actual: null, actualNote: actual.note, verdict };
  const t = targetOf(g, actual.unit);
  const shown = actual.unit === "Rs cr" ? `Rs ${fmt(actual.value, 0)} cr` : actual.unit === "bps" ? `${fmt(actual.value, 0)} bps` : `${fmt(actual.value)}%`;
  const note = [`${actual.note}.`, `Actual ${shown}.`, t.inferred ? `Range inferred from wording: ${t.inferred}.` : ""].filter(Boolean).join(" ");
  return { actual: Math.round(actual.value * 100) / 100, actualNote: note, verdict };
}

// ------------------------------------------------------------------ DB layer

const num = (d: { toString(): string } | number | null | undefined): number | null => (d == null ? null : Number(d.toString()));
const CALENDAR_NOTE = /Jan-Dec|calendar year/i;

/** Everything checkGuidance needs for one company, read from the DB. */
export async function loadCompanyData(prisma: PrismaClient, companyId: string, asOf?: Date): Promise<CompanyData> {
  const [company, quarters, annual] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { financialsNote: true } }),
    prisma.quarterlyResult.findMany({ where: { companyId }, orderBy: [{ fiscalYear: "asc" }, { quarter: "asc" }] }),
    prisma.financialSnapshot.findMany({ where: { companyId } }),
  ]);
  return {
    calendarYear: CALENDAR_NOTE.test(company.financialsNote ?? ""),
    asOf,
    quarters: quarters.map((q) => ({
      fiscalYear: q.fiscalYear,
      quarter: q.quarter,
      revenueCr: num(q.revenueCr),
      operatingProfitCr: num(q.operatingProfitCr),
      netProfitCr: num(q.netProfitCr),
      interestCr: num(q.interestCr),
    })),
    annual: annual.map((a) => ({ year: a.year, revenueCr: num(a.revenueCr), netProfitCr: num(a.netProfitCr) })),
  };
}

export type CheckedRow = GuidanceCheck & { id: string; metric: string; period: string; statement: string; low: number | null; high: number | null; unit: string | null; changed: boolean };

/**
 * Recompute actual / actualNote / verdict for every ConcallGuidance row of a company and write
 * the ones that changed (checkedAt = now). `apply: false` computes without writing.
 */
export async function checkCompanyGuidance(
  prisma: PrismaClient,
  companyId: string,
  opts: { apply?: boolean; asOf?: Date } = {},
): Promise<CheckedRow[]> {
  const apply = opts.apply ?? true;
  const [data, rows] = await Promise.all([
    loadCompanyData(prisma, companyId, opts.asOf),
    prisma.concallGuidance.findMany({ where: { companyId }, orderBy: [{ targetFiscalYear: "asc" }, { metric: "asc" }] }),
  ]);
  const out: CheckedRow[] = [];
  for (const r of rows) {
    const g: GuidanceInput = {
      metric: r.metric,
      periodKind: r.periodKind,
      targetFiscalYear: r.targetFiscalYear,
      targetQuarter: r.targetQuarter,
      low: num(r.low),
      high: num(r.high),
      unit: r.unit,
      direction: r.direction,
      statement: r.statement,
    };
    const c = checkGuidance(g, data);
    const changed = c.verdict !== r.verdict || c.actualNote !== r.actualNote || c.actual !== num(r.actual);
    out.push({ ...c, id: r.id, metric: r.metric, period: periodText(g), statement: r.statement, low: g.low, high: g.high, unit: g.unit, changed });
  }
  if (apply) {
    const now = new Date();
    const writes = out.filter((c) => c.changed);
    for (let i = 0; i < writes.length; i += 50)
      await prisma.$transaction(
        writes.slice(i, i + 50).map((c) =>
          prisma.concallGuidance.update({ where: { id: c.id }, data: { actual: c.actual, actualNote: c.actualNote, verdict: c.verdict, checkedAt: now } }),
        ),
      );
  }
  return out;
}

/** "FY27", "H2 FY27", "Q3 FY27", "by FY28", "unspecified": how a guidance period is shown. */
export function periodText(g: Pick<GuidanceInput, "periodKind" | "targetFiscalYear" | "targetQuarter">): string {
  const y = g.targetFiscalYear;
  if (y == null || g.periodKind === "unspecified") return "unspecified";
  if (g.periodKind === "FY") return fyLabel(y);
  if (g.periodKind === "multi_year") return `by ${fyLabel(y)}`;
  if (g.periodKind === "Q") return g.targetQuarter ? quarterLabel({ fiscalYear: y, quarter: g.targetQuarter as Q["quarter"] }) : fyLabel(y);
  return `${g.periodKind} ${fyLabel(y)}`;
}
