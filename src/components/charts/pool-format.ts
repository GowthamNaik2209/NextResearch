// How the industry pools panel (IndustryPools.tsx) prints each metric: pools in ₹ Cr, margin and
// growth as fractions shown as %, ROCE and the lender and insurer rates (ROE, ROA, NPAs, VNB margin,
// combined ratio) already in %, P/E, P/B and solvency as multiples.
import { NA, croreShort, pct } from "@/lib/format";
import type { PoolMetricId } from "@/lib/baskets/pools";

const FRACTION: ReadonlySet<PoolMetricId> = new Set(["margin", "growth"]);
const PERCENT: ReadonlySet<PoolMetricId> = new Set(["roce", "roe", "roa", "gnpa", "nnpa", "vnb", "combined"]);
const MULTIPLE: ReadonlySet<PoolMetricId> = new Set(["pb", "solvency"]);
// Asset quality and ROA are small numbers read to two places (an NPA of 0.37%, an ROA of 1.90%).
const TWO_PLACES: ReadonlySet<PoolMetricId> = new Set(["roa", "gnpa", "nnpa"]);

/** A value as the panel prints it. */
export function poolFmt(id: PoolMetricId, v: number | null): string {
  if (v == null) return NA;
  if (FRACTION.has(id)) return pct(v * 100);
  if (id === "pe") return `${v.toFixed(1)}×`;
  if (MULTIPLE.has(id)) return `${v.toFixed(1)}x`;
  if (PERCENT.has(id)) return pct(v, TWO_PLACES.has(id) ? 2 : 1);
  return croreShort(v);
}

/** Axis labels: rates as on the bars; ₹ Cr in one unit across the axis (lakh crore once it reaches one). */
export function poolTick(id: PoolMetricId, t: number, top: number): string {
  if (t === 0) return "0";
  if (FRACTION.has(id)) return pct(t * 100, 0);
  if (id === "pe") return `${t}×`;
  if (MULTIPLE.has(id)) return `${+t.toFixed(2)}x`;
  if (PERCENT.has(id)) return `${+t.toFixed(2)}%`.replace(/^-/, "−");
  const a = Math.abs(t);
  return `${t < 0 ? "−" : ""}${top >= 100_000 ? `₹${+(a / 100_000).toFixed(2)}L Cr` : `₹${(a / 1000).toLocaleString("en-IN")}k Cr`}`;
}
