// The rows of the lender and insurer blocks (LenderBlock.tsx, InsurerBlock.tsx) as label, value and
// the period each figure is for, shared by the stock pop-up and the company page. Pure: the
// components only lay these out. A figure that is not known reads "—", never 0.
import { keyRatios } from "@/lib/financials/key-ratios";
import type { SupplierFinancials } from "@/lib/sector-content";
import { NA, pct, signedPct } from "@/lib/format";

export type BlockRow = {
  label: string;
  value: string;
  /** The period the figure is for ("Sep 2026", "FY26", "Q2 FY27"); none for snapshot figures (P/B, ROE). */
  period?: string;
  /** A hand-kept figure's source (the insurer's public disclosure). */
  source?: string;
  /** A hand-kept figure from a quarter more than 200 days back (financials/insurer.ts). */
  stale?: boolean;
};

export type Block = {
  rows: BlockRow[];
  /** No stored lender figures / no hand-kept insurer row yet. */
  missing: boolean;
};

const fin = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const times = (v: number | null | undefined, dp: number) => (fin(v) ? `${v.toFixed(dp)}x` : NA);
const opt = (s: string | null | undefined) => s ?? undefined;

/** P/B and ROE, from the company snapshot like every other company's. */
function snapshotRows(f: SupplierFinancials): BlockRow[] {
  return [
    { label: "P/B", value: times(keyRatios(f).pb, 1) },
    { label: "ROE", value: pct(f.kpi?.[4]) },
  ];
}

/** A lender's block: P/B, ROE, ROA, gross and net NPA (of `quarter`), financing margin, deposit growth (banks only) and balance-sheet growth. */
export function lenderRows(f: SupplierFinancials): Block {
  const l = f.lender ?? null;
  const year = opt(l?.year);
  const bsYear = opt(l?.bsYear);
  const rows: BlockRow[] = [
    ...snapshotRows(f),
    { label: "ROA", value: pct(l?.roa, 2), period: year },
    { label: "Gross NPA", value: pct(l?.gnpa, 2), period: opt(l?.quarter) },
    { label: "Net NPA", value: pct(l?.nnpa, 2), period: opt(l?.quarter) },
    { label: "Financing margin", value: pct(l?.finMargin, 1), period: year },
  ];
  // An NBFC takes no deposits: no row rather than a dash that reads as "not reported".
  if (l?.bank) rows.push({ label: "Deposit growth", value: signedPct(l.depositGrowth, 1), period: bsYear });
  rows.push({ label: "Balance-sheet growth", value: signedPct(l?.bsGrowth, 1), period: bsYear });
  return { rows, missing: !l };
}

/**
 * An insurer's block: P/B, ROE and premium growth from the snapshot, then the hand-kept quarter's VNB
 * margin and P/EV (life insurers), combined ratio (general and health insurers) and solvency ratio,
 * each with its quarter and source. A row the insurer's kind of business does not report is left out
 * (a life insurer has no combined ratio; a general insurer no VNB or embedded value).
 */
export function insurerRows(f: SupplierFinancials): Block {
  const k = keyRatios(f);
  const rows: BlockRow[] = [
    ...snapshotRows(f),
    { label: "Premium growth", value: signedPct(k.revGrowth, 1), period: opt(k.fy) },
  ];
  const i = f.insurer ?? null;
  if (!i) return { rows, missing: true };
  const life = fin(i.vnbMargin) || fin(i.pev);
  const general = fin(i.combinedRatio);
  const kept = (label: string, value: string): BlockRow => ({ label, value, period: i.period, source: i.sourceUrl, stale: i.fresh === "stale" });
  if (life || !general) rows.push(kept("VNB margin", pct(i.vnbMargin, 1)), kept("P/EV", times(i.pev, 2)));
  if (general || !life) rows.push(kept("Combined ratio", pct(i.combinedRatio, 1)));
  rows.push(kept("Solvency ratio", times(i.solvency, 2)));
  return { rows, missing: false };
}
