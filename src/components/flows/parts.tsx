import type { ReactNode } from "react";
import { StockLink } from "@/components/stock/StockLink";

// Small pieces shared by the FII / DII view's server blocks and its sortable (client) tables.

export { NotYet } from "./FlowCard";

export type Sort<K extends string> = { key: K; desc: boolean };

/** A column heading that sorts its table: tap to sort by it (largest first), tap again to reverse. */
export function SortHead<K extends string>({
  label,
  k,
  sort,
  onSort,
  last = false,
  left = false,
  className = "",
}: {
  label: string;
  k: K;
  sort: Sort<K>;
  onSort: (k: K) => void;
  last?: boolean;
  left?: boolean;
  className?: string;
}) {
  const on = sort.key === k;
  return (
    <th aria-sort={on ? (sort.desc ? "descending" : "ascending") : "none"} className={"w-px whitespace-nowrap py-1 font-semibold " + (left ? "pr-2 text-left" : last ? "pl-2 text-right" : "px-2 text-right") + " " + className}>
      <button type="button" onClick={() => onSort(k)} className={"tap-y inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink " + (on ? "text-ink" : "")}>
        {label}
        <span aria-hidden="true" className={on ? "" : "opacity-30"}>
          {on && !sort.desc ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

/** "Show all 128 companies" under a table that shows its first rows. */
export function ShowAll({ shown, total, all, onToggle, noun }: { shown: number; total: number; all: boolean; onToggle: () => void; noun: string }) {
  if (total <= shown && !all) return null;
  return (
    <button type="button" onClick={onToggle} className="tap-y mt-2 text-xs font-semibold text-accent hover:underline">
      {all ? "Show fewer" : `Show all ${total} ${noun}`}
    </button>
  );
}

export function Ticker({ ticker, name }: { ticker: string; name: string }) {
  return (
    <StockLink ticker={ticker} title={name} className="tap-y inline-block flex-none whitespace-nowrap rounded border border-line px-1.5 font-mono text-[11px] text-amber-ink hover:border-accent">
      {ticker}
    </StockLink>
  );
}

/**
 * A company in a table: its name on a line of its own (the whole cell's width, so a phone shows it),
 * then its ticker (opens the stock pop-up) and, when given, its industry.
 */
export function Company({ ticker, name, sub }: { ticker: string; name: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div title={name} className="truncate text-[12.5px] leading-snug text-ink">
        {shortName(name)}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Ticker ticker={ticker} name={name} />
        {sub && <span className="min-w-0 truncate text-[11px] text-ink-soft">{sub}</span>}
      </div>
    </div>
  );
}

// "Bharat Forge Ltd" reads as "Bharat Forge" in a narrow row.
const shortName = (name: string) => name.replace(/\s+(Ltd\.?|Limited)$/i, "");

export const toneText = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.005 ? "text-ink-soft" : v > 0 ? "text-pos" : "text-danger");
export const arrow = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.05 ? "" : v > 0 ? "▲ " : "▼ ");

// Deal clients are published in capitals ("GOLDMAN SACHS (SINGAPORE) PTE"); short words that are
// abbreviations stay upper case.
const KEEP_CAPS = new Set(["LLP", "LLC", "PTE", "PLC", "LP", "SA", "SE", "AG", "BV", "B.V.", "UBS", "HSBC", "BNP", "BOFA", "SBI", "HDFC", "ICICI", "LIC", "UTI", "DSP", "AMC", "MF", "II", "III", "FPI", "JP", "J.P.", "ODI", "CLSA", "ABSL", "EPFO", "NPS", "PSU", "GIC", "ADIA", "VCC", "PCC"]);
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|\(|\))/)
    .map((w) => (KEEP_CAPS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}
