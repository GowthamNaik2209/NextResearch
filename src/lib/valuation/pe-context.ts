// P/E in context: today's P/E against the stock's own past P/Es and against the median of covered
// stocks in its primary industry. Context, not a call: the factor test (docs/FACTOR-BACKTEST.md) found
// that a low multiple alone did not rank covered stocks. Pure: no server-only imports.
//
// Past P/E at each month-end = market cap then ÷ the latest reported fiscal year's net profit public
// on that day (FY y, ending 31 Mar y, counts from 1 June y). Market cap then = today's × close then ÷
// today's price (share-count changes ignored). A month with a loss in that year has no P/E. Today's
// P/E is the company table's (trailing twelve months), so the basis differs slightly; the note says so.
import { FISCAL_YEARS } from "@/lib/financials/rows";

export type PeHistory = {
  /** First and last month-end sampled (ISO dates). */
  from: string;
  to: string;
  /** Month-ends with a P/E (a profit in the year then reported). */
  n: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
};

/**
 * The covered stocks today's P/E is set against. For an operating company, its primary industry (or
 * Nifty 50 bracket). A lender or an insurer is compared with covered companies of its own kind across
 * industries instead (`group`): REC beside cable makers, or an insurer beside banks, says nothing.
 */
export type PeIndustry = { slug: string; name: string; median: number; n: number; group?: "lender" | "insurer" };

const GROUP_PEERS = { lender: "lenders (banks and NBFCs, across industries)", insurer: "insurers (life and general, across industries)" } as const;
const GROUP_SCOPE = { lender: "banks and NBFCs", insurer: "life and general insurers" } as const;

/** "the median of 12 covered Power stocks" / "the median of 22 covered lenders (banks and NBFCs, across industries)". */
export function peerLine(ind: PeIndustry): string {
  return ind.group ? `the median of ${ind.n} covered ${GROUP_PEERS[ind.group]}` : `the median of ${ind.n} covered ${ind.name} stocks`;
}

/** The sentence's tail, one bracket-free clause: "the median of 12 covered Power stocks: 15.5x" / "the median of 22 covered banks and NBFCs across industries: 15.5x". */
export function peerClause(ind: PeIndustry, median: string): string {
  return ind.group ? `the median of ${ind.n} covered ${GROUP_SCOPE[ind.group]} across industries: ${median}` : `${peerLine(ind)}: ${median}`;
}

/** The legend's name for the peers' median tick. */
export const peMedianLabel = (ind: PeIndustry) => (ind.group === "lender" ? "Lenders’ median" : ind.group === "insurer" ? "Insurers’ median" : "Industry median");

export type PeContext = {
  /** A lender or an insurer: its P/E is set against its own kind (PeIndustry). */
  group?: "lender" | "insurer";
  pe: number | null;
  history: PeHistory | null;
  industry: PeIndustry | null;
  /** No industry median because too few peers have a P/E: who they are and how many there are against the fewest needed. */
  fewPeers?: { name: string; n: number; min: number; group?: "lender" | "insurer" } | null;
};

/** "Only 1 covered Services (Nifty 50) stock has a P/E (3 needed), so there is no industry median." */
export function fewPeersLine(p: NonNullable<PeContext["fewPeers"]>): string {
  const who = p.group ? `covered ${p.group === "lender" ? "lender" : "insurer"}` : `covered ${p.name} stock`;
  return `${p.n === 0 ? "No" : `Only ${p.n}`} ${who}${p.n === 1 ? " has" : "s have"} a P/E (${p.min} needed), so there is no ${p.group ? "peer" : "industry"} median.`;
}

/** Fewest month-ends with a P/E before a history is shown (two years). */
export const MIN_MONTHS = 24;
/** Fewest covered companies with a P/E before an industry median is shown. */
export const MIN_PEERS = 5;
/** Fewest within one Nifty 50 bracket (Financial Services, Information Technology), which hold fewer stocks. */
export const MIN_INDEX_PEERS = 3;

function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo);
}

export function medianOf(xs: number[]): number | null {
  if (!xs.length) return null;
  return quantile([...xs].sort((a, b) => a - b), 0.5);
}

/** One month-end in a P/E history: the working behind each past P/E (the method page's worked example). */
export type PeSample = { t: string; close: number; mcapCr: number; fy: number; profitCr: number | null; pe: number | null };

/**
 * The stock's month-end P/E samples from its closes (oldest first, ISO `t`), today's market cap (₹ Cr)
 * and its FY22..FY26 net profits (₹ Cr, FISCAL_YEARS order). `pe` is null for a month whose year then
 * reported a loss or isn't in the table.
 */
export function peSamples(points: { t: string; c: number }[], mcapNowCr: number | null, np: (number | null)[] | null | undefined, priceNow?: number | null): PeSample[] {
  const last = points[points.length - 1];
  // The share count from the company table's own price when given (the price its market cap is at), else the last close.
  const at = priceNow && priceNow > 0 ? priceNow : last?.c;
  if (!last || !mcapNowCr || !(at && at > 0) || !np?.length) return [];
  const shares = mcapNowCr / at;
  const out: PeSample[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // The last close of each month (the final point stands for the month still running).
    if (points[i + 1] && points[i + 1].t.slice(0, 7) === p.t.slice(0, 7)) continue;
    let fy = Number(p.t.slice(0, 4));
    if (p.t.slice(5) < "06-01") fy -= 1;
    const idx = FISCAL_YEARS.indexOf(fy as (typeof FISCAL_YEARS)[number]);
    // Before the first fiscal year in the table there is nothing to divide by: not sampled.
    if (idx < 0) continue;
    const profit = np[idx];
    const mcap = shares * p.c;
    out.push({ t: p.t, close: p.c, mcapCr: mcap, fy, profitCr: typeof profit === "number" ? profit : null, pe: typeof profit === "number" && profit > 0 && p.c > 0 ? mcap / profit : null });
  }
  return out;
}

/** The quartiles of a stock's month-end P/Es (peSamples). Null under MIN_MONTHS P/Es. */
export function historyOf(samples: PeSample[]): PeHistory | null {
  const withPe = samples.filter((x): x is PeSample & { pe: number } => x.pe != null);
  if (withPe.length < MIN_MONTHS) return null;
  const s = withPe.map((x) => x.pe).sort((a, b) => a - b);
  return { from: withPe[0].t, to: withPe[withPe.length - 1].t, n: withPe.length, p10: quantile(s, 0.1), p25: quantile(s, 0.25), median: quantile(s, 0.5), p75: quantile(s, 0.75), p90: quantile(s, 0.9) };
}

/** peSamples then historyOf. */
export function peHistory(points: { t: string; c: number }[], mcapNowCr: number | null, np: (number | null)[] | null | undefined, priceNow?: number | null): PeHistory | null {
  return historyOf(peSamples(points, mcapNowCr, np, priceNow));
}

export type PeBand = "low" | "usual" | "high";

/** Where today's P/E sits in its own past: below the lower quartile, between the quartiles, or above. */
export function bandOf(pe: number, h: PeHistory): PeBand {
  return pe < h.p25 ? "low" : pe > h.p75 ? "high" : "usual";
}

export const BAND_LABEL: Record<PeBand, string> = { low: "Below its usual range", usual: "Within its usual range", high: "Above its usual range" };

/** "12% below" / "8% above" / "in line with" (within 5%), for today's P/E against a median. */
export function versus(pe: number, median: number): string {
  const d = pe / median - 1;
  if (Math.abs(d) < 0.05) return "in line with";
  // Several times the median reads better as a multiple than as "13297% above".
  if (pe / median >= 3) return `${Math.round(pe / median)} times`;
  return `${Math.round(Math.abs(d) * 100)}% ${d < 0 ? "below" : "above"}`;
}

/** The "i" note: what today's P/E is set against (a lender's or insurer's peers are its own kind). */
export function peNote(group: PeIndustry["group"] | null | undefined): string {
  const peers = group ? `the median of covered ${group === "lender" ? "lenders" : "insurers"} (a ${group} is compared with ${group}s, not with its industry's other companies)` : "the median of covered stocks in its primary industry";
  return `Today's P/E against its own past P/Es since 2022 (the shaded band is the middle half) and ${peers}. Context, not a call.`;
}

export const PE_NOTE = peNote(null);
