// The rows of the lender and insurer blocks (LenderBlock.tsx, InsurerBlock.tsx) as label, value and
// the period each figure is for, shared by the stock pop-up and the company page. Pure: the
// components only lay these out. A figure that is not known reads "—", never 0, with the reason
// beside it where one is known (a row's note, or the block's footnote). P/B, ROE and revenue growth
// are left to the Key stats tiles right above the block, so no figure is shown twice.
import { isBank, isHoldingCompany, isLifeInsurer } from "@/lib/financials/kinds";
import type { SupplierFinancials } from "@/lib/sector-content";
import { NA, pct, signedPct } from "@/lib/format";

export type BlockRow = {
  label: string;
  value: string;
  /** The period the figure is for ("Sep 2026", "FY26", "Q2 FY27"); none while the figure is not yet added. */
  period?: string;
  /** A hand-kept figure's source (the insurer's public disclosure). */
  source?: string;
  /** A hand-kept figure from a quarter more than 200 days back (financials/insurer.ts). */
  stale?: boolean;
  /** Why the figure is not known, beside its dash ("Not reported on Screener"). */
  note?: string;
};

export type Block = {
  rows: BlockRow[];
  /** No stored lender figures / no hand-kept insurer row yet. */
  missing: boolean;
  /** One line under the block saying why its figures are not known (a lender block stored with none). */
  footnote?: string;
};

/** A row's note when Screener's standalone quarters show no NPA figures. */
export const NPA_NOT_REPORTED = "Not reported on Screener";
/** The footnote when a lender's block is stored but no lending figure could be read. */
export const LENDER_UNREAD = "The lending figures couldn't be read from the company's standalone page on Screener.in.";
/** The footnote for a holding company with a lending kind (Bajaj Finserv): the lending is its subsidiaries'. */
export const HOLDING_LENDER = "A holding company: the lending is done by its subsidiaries, whose own pages carry the lending figures.";
/** A hand-kept insurer row that leaves a figure out. */
export const NOT_IN_DISCLOSURE = "Not in the disclosure";

const fin = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const times = (v: number | null | undefined, dp: number) => (fin(v) ? `${v.toFixed(dp)}x` : NA);
const opt = (s: string | null | undefined) => s ?? undefined;

/** A lender's block: ROA, gross and net NPA (of `quarter`), financing profit over revenue (Screener's "financing margin", not NIM), deposit growth (banks only) and balance-sheet growth. */
export function lenderRows(f: SupplierFinancials): Block {
  // A holding company's own accounts hold no loan book to read: no rows of dashes, one line saying why.
  if (isHoldingCompany(f.ticker) && !f.lender) return { rows: [], missing: false, footnote: HOLDING_LENDER };
  const l = f.lender ?? null;
  const year = opt(l?.year);
  const bsYear = opt(l?.bsYear);
  // A block is stored but nothing in it could be read (the standalone page failed or changed): one
  // footnote says so, rather than a note on every row.
  const unread = !!l && [l.roa, l.gnpa, l.nnpa, l.finMargin, l.depositGrowth, l.bsGrowth].every((v) => !fin(v));
  // NPAs with no quarter: Screener's standalone quarters show neither figure.
  const npaNote = l && !unread && !l.quarter ? { note: NPA_NOT_REPORTED } : {};
  const rows: BlockRow[] = [
    { label: "ROA", value: pct(l?.roa, 2), period: year },
    { label: "Gross NPA", value: pct(l?.gnpa, 2), period: opt(l?.quarter), ...npaNote },
    { label: "Net NPA", value: pct(l?.nnpa, 2), period: opt(l?.quarter), ...npaNote },
    { label: "Financing profit / revenue", value: pct(l?.finMargin, 1), period: year },
  ];
  // Only a bank takes deposits (kinds.ts BANKS): an NBFC gets no row rather than a dash that reads as
  // "not reported"; a bank without stored deposits reads "—".
  if (isBank(f.ticker)) rows.push({ label: "Deposit growth", value: signedPct(l?.depositGrowth, 1), period: bsYear });
  rows.push({ label: "Balance-sheet growth", value: signedPct(l?.bsGrowth, 1), period: bsYear });
  // A stored, read block with one figure missing (HDBFS's gross NPA beside its net NPA): the dash
  // says why, and no period is shown beside a figure that isn't there.
  const out = l && !unread ? rows.map((r) => (r.value === NA && !r.note ? { label: r.label, value: r.value, note: NPA_NOT_REPORTED } : r)) : rows;
  return { rows: out, missing: !l, ...(unread ? { footnote: LENDER_UNREAD } : {}) };
}

/**
 * An insurer's block: the hand-kept quarter's VNB margin and P/EV (life insurers), combined ratio
 * (general and health insurers) and solvency ratio, each with its quarter and source. A row the
 * insurer's kind of business does not report is left out (a life insurer has no combined ratio; a
 * general insurer no VNB or embedded value). Before its quarter is added the same rows are listed as
 * dashes, life or general by kinds.ts LIFE_INSURERS, and the block says the figures are not yet added.
 */
export function insurerRows(f: SupplierFinancials): Block {
  const i = f.insurer ?? null;
  if (!i) {
    const dash = (label: string): BlockRow => ({ label, value: NA });
    const rows = isLifeInsurer(f.ticker) ? [dash("VNB margin"), dash("P/EV")] : [dash("Combined ratio")];
    return { rows: [...rows, dash("Solvency ratio")], missing: true };
  }
  const rows: BlockRow[] = [];
  const life = fin(i.vnbMargin) || fin(i.pev);
  const general = fin(i.combinedRatio);
  // A figure the row leaves out reads "—" with a note; its quarter and source stay beside it.
  const kept = (label: string, value: string): BlockRow => ({
    label, value, period: i.period, source: i.sourceUrl, stale: i.fresh === "stale", ...(value === NA ? { note: NOT_IN_DISCLOSURE } : {}),
  });
  if (life || !general) rows.push(kept("VNB margin", pct(i.vnbMargin, 1)), kept("P/EV", times(i.pev, 2)));
  if (general || !life) rows.push(kept("Combined ratio", pct(i.combinedRatio, 1)));
  rows.push(kept("Solvency ratio", times(i.solvency, 2)));
  return { rows, missing: false };
}
