// One-off years: companies whose recent figures are distorted by a one-off (an impairment, a
// write-down, an asset or voucher sale, a demerger gain, a mark-to-market loss). Every rule-based
// basket and the landing page's stock screens leave them out, since a ranking on distorted figures
// would mostly rank the one-off; a user can still add them to their own baskets, where they carry a
// small "one-off" marker with the reason (the owner's rule: remove outliers, let users add them with
// a note). Pure and dependency-free, so the screens (src/lib/baskets, src/lib/sector-content) and
// the basket UI share one definition; outliers.test.ts pins it on fixtures.
//
// A company is flagged when the company table marks it (Company.screenOut, set by hand when the
// latest year is dominated by a one-off) or when its FY22-FY26 revenue and net profit show one:
//  1. A single loss year between profitable ones (FY23-FY25), the swing into it at least
//     LOSS_MIN_REV_SHARE of that year's revenue: Tata Steel's FY24 impairments, Info Edge's FY23
//     mark-to-market loss.
//  2. A year (FY23-FY26) where net profit moved by more rupees than revenue did, by at least
//     SWING_MIN_REV_SHARE of revenue, with a profit on at least one side: a trading business's
//     profit moves by a fraction of its sales, so a bigger swing is something else. A middle year
//     must also partly reverse the next year (a spike, not a new level); the latest year can't be
//     checked that way yet, so it is judged on the swing alone (JSW Steel's FY26 other income).
// Both also need the swing to be large against the company's own usual profit (the median of its
// other years, SWING_MIN_TYPICAL times), so a high-margin company's ordinary wobble and a
// fast grower's operating leverage (profit up 2.5x on 30% more sales) don't count. FY22 is not
// judged: there is no FY21 to compare it with, and it is too old to call recent.

/** What the detector reads: a company's figures as the company table gives them (supplier.f). */
export type OutlierInput = {
  /** Revenue and net profit, ₹ Cr, FY22..FY26 (index 4 is the latest year). */
  rev?: (number | null)[] | null;
  np?: (number | null)[] | null;
  screenOut?: boolean;
  note?: string | null;
};

export type Outlier = { year: string; reason: string };

/** Rule 1: the drop into a one-year loss, as a share of that year's revenue. */
export const LOSS_MIN_REV_SHARE = 0.03;
/** Rule 2: the profit swing, as a share of the year's revenue. */
export const SWING_MIN_REV_SHARE = 0.08;
/** Rule 2: the swing against the revenue change (1: profit moved by more rupees than sales). */
export const SWING_MIN_VS_REVENUE = 1;
/** Rule 2, middle years: the next year's move back, as a share of the swing. */
export const SWING_MIN_REVERSAL = 0.5;
/** Both rules: the swing against the company's usual profit (median |profit| of its other years). */
export const SWING_MIN_TYPICAL = 1.25;

/** The few words every list's "i" adds about the exclusion. */
export const ONE_OFF_NOTE = "One-off years left out.";

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const FY = (i: number) => `FY${22 + i}`;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// The company's own note, cut to the clause about the one-off when it has several ("FY22 figures not
// on Screener; FY26 revenue is almost entirely a one-off ..." -> the second clause).
function noteReason(note: string | null | undefined): string {
  const parts = (note ?? "").split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  const pick = parts.find((p) => /one-off|one-time|exceptional|impairment|write|gain|sale/i.test(p)) ?? parts[0];
  return pick ? pick[0].toUpperCase() + pick.slice(1) : "Latest year dominated by a one-off";
}

/** The company's latest one-off year and why, or null when its figures look ordinary. */
export function detectOutlier(f: OutlierInput | null | undefined): Outlier | null {
  if (!f) return null;
  if (f.screenOut) return { year: FY(4), reason: noteReason(f.note) };
  const rev = f.rev ?? [];
  const np = f.np ?? [];
  // Latest year first: the reason names the most recent one.
  for (let i = 4; i >= 1; i--) {
    const [r0, r1, p0, p1] = [rev[i - 1], rev[i], np[i - 1], np[i]];
    if (!ok(r0) || !ok(r1) || !ok(p0) || !ok(p1) || r1 <= 0) continue;
    const others = np.filter((v, j) => j !== i && ok(v)).map((v) => Math.abs(v!));
    if (others.length < 2) continue;
    const typical = median(others);
    const dP = p1 - p0;
    if (typical > 0 && Math.abs(dP) < SWING_MIN_TYPICAL * typical) continue;
    const next = i < 4 ? np[i + 1] : undefined;
    if (i < 4 && ok(next) && p1 < 0 && p0 > 0 && next > 0 && -dP >= LOSS_MIN_REV_SHARE * r1) {
      return { year: FY(i), reason: `${FY(i)} loss looks one-off (profits either side)` };
    }
    if (Math.max(p0, p1) <= 0) continue; // loss to a different loss: no profit to distort
    if (Math.abs(dP) < SWING_MIN_REV_SHARE * r1 || Math.abs(dP) < SWING_MIN_VS_REVENUE * Math.abs(r1 - r0)) continue;
    if (i < 4) {
      if (!ok(next)) continue;
      const back = next - p1;
      if (!(back * dP < 0 && Math.abs(back) >= SWING_MIN_REVERSAL * Math.abs(dP))) continue;
    }
    return { year: FY(i), reason: `${FY(i)} profit ${dP > 0 ? "jump" : "drop"} looks one-off (profit swung far more than sales)` };
  }
  return null;
}

/** Just the reason, for records that carry it (BasketStock.oneOff, the screens' inputs). */
export function oneOffReason(f: OutlierInput | null | undefined): string | undefined {
  return detectOutlier(f)?.reason;
}
