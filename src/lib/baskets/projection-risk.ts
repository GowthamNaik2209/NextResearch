// A stock's price statistics for its projection (./projection.ts): beta to the Nifty 50 from 2 years
// of weekly returns, and realised volatility over the last year from daily closes. Pure, so it is
// unit-tested and the validation scripts use the same arithmetic.
import type { PricePoint } from "./backtest";
import type { RiskInput } from "./projection";

const DAY = 86_400_000;
/** Fewer weekly returns than this and the beta is left out (the model then uses 1). */
export const MIN_WEEKS = 52;
/** Fewer daily returns in the last year than this and the volatility is left out. */
export const MIN_DAYS = 40;

/** Week number (Monday to Sunday) of an ISO date; epoch day 0 was a Thursday. */
const weekOf = (t: string) => Math.floor((Date.parse(t) / DAY + 3) / 7);
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * DAY).toISOString().slice(0, 10);

/** The last close of each week, keyed by week number. */
function weekly(pts: PricePoint[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of pts) if (p.c > 0) out.set(weekOf(p.t), p.c);
  return out;
}

/** Beta to the index: the slope of the stock's weekly returns on the index's, over 2 years to `day`. */
export function betaOf(pts: PricePoint[], index: PricePoint[], day: string): number | null {
  const from = addDays(day, -731);
  const inWin = (p: PricePoint) => p.t > from && p.t <= day;
  const s = weekly(pts.filter(inWin));
  const m = weekly(index.filter(inWin));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [w, c] of s) {
    const c0 = s.get(w - 1), m1 = m.get(w), m0 = m.get(w - 1);
    if (c0 == null || m1 == null || m0 == null) continue;
    ys.push(c / c0 - 1);
    xs.push(m1 / m0 - 1);
  }
  if (xs.length < MIN_WEEKS) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let cov = 0;
  let vx = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
  }
  return vx > 0 ? cov / vx : null;
}

/** Realised volatility over the year to `day`: sqrt(250 x mean squared daily log return). */
export function realisedVol(pts: PricePoint[], day: string): number | null {
  const from = addDays(day, -365);
  const s = pts.filter((p) => p.t > from && p.t <= day && p.c > 0);
  const r: number[] = [];
  for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].c / s[i - 1].c));
  if (r.length < MIN_DAYS) return null;
  return Math.sqrt((r.reduce((a, x) => a + x * x, 0) / r.length) * 250);
}

/** Both, as of the stock's last close. */
export function riskOf(pts: PricePoint[], index: PricePoint[]): RiskInput {
  const day = pts[pts.length - 1]?.t;
  if (!day) return { beta: null, vol: null };
  return { beta: betaOf(pts, index, day), vol: realisedVol(pts, day) };
}
