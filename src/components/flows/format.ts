// How the FII / DII figures read on screen. Pure, so server and client components share it.
import { fmtDay, fmtMonth, inr, NA } from "@/lib/format";
import type { StakeMove } from "@/lib/flows/query";

const MINUS = "−";

/** Signed ₹ crore without the unit (the panel header says ₹ crore): "+3,106", "−2,418". */
export function signedCr(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const r = Math.round(v);
  return `${r > 0 ? "+" : r < 0 ? MINUS : ""}${inr(Math.abs(r))}`;
}

/** A change in percentage points: "+0.9 pp", "−1.3 pp", "0.0 pp". */
export function signedPp(v: number | null | undefined, dp = 1): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const r = Number(v.toFixed(dp));
  return `${r > 0 ? "+" : r < 0 ? MINUS : ""}${Math.abs(r).toFixed(dp)} pp`;
}

/** A holding, e.g. "17.8%". */
export const holding = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? NA : `${v.toFixed(1)}%`);

/** "Sep 2026 quarter". */
export const quarterName = (q: Date) => `${fmtMonth(q)} quarter`;

// A tag beside a headline only when the move is big enough to matter (half a point of the equity).
export const TAG_MIN_PP = 0.5;

/** The tag shown beside a company's headlines: its bigger quarterly FII or DII move, if notable. */
export function stakeTag(m: StakeMove | undefined): { text: string; title: string; up: boolean } | null {
  if (!m) return null;
  const f = m.dFii ?? 0;
  const d = m.dDii ?? 0;
  const [who, v] = Math.abs(f) >= Math.abs(d) ? (["FII", f] as const) : (["DII", d] as const);
  if (Math.abs(v) < TAG_MIN_PP) return null;
  return {
    text: `${who} ${signedPp(v)} last qtr`,
    title: `${who === "FII" ? "Foreign" : "Domestic"} institutions' stake changed ${signedPp(v)} in the ${quarterName(m.quarter)} (shareholding filing)`,
    up: v > 0,
  };
}

/** "Up 3 qtrs" / "Down 1 qtr" for a holding's streak, or a dash when flat. */
export function streakText(n: number, change: number | null): string {
  // A change that rounds to 0.0 pp shows no streak beside it.
  if (!n || change == null || Math.abs(change) < 0.05) return NA;
  return `${change > 0 ? "Up" : "Down"} ${n} qtr${n > 1 ? "s" : ""}`;
}

/** An NSDL fortnight from its last day: "1–15 Oct 2026", "16–31 Oct 2026" (the site's date style). */
export function fortnight(periodEnd: Date): string {
  const end = periodEnd.getUTCDate();
  return `${end <= 15 ? 1 : 16}–${fmtDay(periodEnd)}`;
}

/** A filing month in a narrow column: "Mar ’21". */
export const shortMonth = (d: Date) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`;
