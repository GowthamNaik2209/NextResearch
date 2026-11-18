// P/B and ROE medians across the covered companies of one kind (lenders or insurers): what the stock
// pop-up's Fundamentals tab sets a lender's or an insurer's P/B and ROE against, as Screener's
// industry table has no median for them, and an industry median would mix a lender with the cable or
// transformer makers it is mapped beside (the P/E in context peers follow the same rule). Pure.
import type { SupplierFinancials } from "@/lib/sector-content";
import { keyRatios } from "./key-ratios";
import { companyKind } from "./kinds";

export type KindMedians = { kind: "lender" | "insurer"; /** Covered companies of that kind with a P/B or an ROE. */ n: number; pb: number | null; roe: number | null;
  /** The P/E median of the same peers as "P/E in context" (valuation/pe-data.ts), so the pop-up shows one number. */ pe?: number | null };

const fin = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function kindMedians(fs: SupplierFinancials[], kind: "lender" | "insurer"): KindMedians {
  const rows = fs
    .filter((f) => (f.kind ?? companyKind(f.ticker)) === kind)
    .map((f) => ({ pb: keyRatios(f).pb, roe: f.kpi?.[4] }))
    .filter((r) => fin(r.pb) || fin(r.roe));
  return { kind, n: rows.length, pb: median(rows.map((r) => r.pb).filter(fin)), roe: median(rows.map((r) => r.roe).filter(fin)) };
}
