import type { SupplierFinancials } from "@/lib/sector-content";
import { InfoTip } from "@/components/InfoTip";
import { lenderRows, type BlockRow } from "./kind-blocks";

// A lender's own figures under the usual Key stats in the stock pop-up and on the company page
// (the rows come from kind-blocks.ts). One i button for the whole block.

export const LENDER_NOTE =
  "How a bank or a lending company (NBFC) is read: its price against its book (P/B), its return on equity and on assets, bad loans as a share of its loans (gross and net NPA), what it earns on its lending (financing margin) and how fast its balance sheet grew, and a bank's deposits. The lending figures are from the company's standalone accounts on Screener.in, with the quarter or year each is for.";

/** The block's frame: a heading with one i button, the rows in a card (two columns from tablet width), and a footnote. */
export function BlockCard({
  title,
  info,
  rows,
  compact,
  children,
  className = "",
}: {
  title: string;
  info: string;
  rows: BlockRow[];
  /** The explorer's side panel (~400px at any viewport): one column. */
  compact?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{title}</h3>
        <InfoTip label={`About ${title.toLowerCase()}`}>{info}</InfoTip>
      </div>
      <dl className={"mt-2 grid grid-cols-1 gap-x-5 rounded-lg border border-line bg-panel-2 px-3 py-0.5" + (compact ? "" : " sm:grid-cols-2")}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={"flex min-w-0 items-baseline justify-between gap-3 py-1.5" + (i === 0 ? "" : " border-t border-line") + (i === 1 && !compact ? " sm:border-t-0" : "")}
          >
            <dt className="min-w-0 text-[12px] text-ink-soft">{r.label}</dt>
            <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-1.5 text-right">
              <span className={"font-mono text-[13px] font-semibold " + (r.value === "—" ? "text-ink-soft" : "text-ink")}>{r.value}</span>
              {r.period &&
                (r.source ? (
                  <a href={r.source} target="_blank" rel="noopener noreferrer" className="text-[10.5px] text-accent hover:underline" title="Source: the company's public disclosure">
                    {r.period}&nbsp;&#8599;
                  </a>
                ) : (
                  <span className="text-[10.5px] text-ink-soft">{r.period}</span>
                ))}
              {r.note && <span className="text-[10.5px] text-ink-soft">{r.note}</span>}
              {r.stale && (
                <span className="rounded border border-line px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-ink" title="From a quarter more than 200 days back">
                  older figure
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

export function LenderBlock({ f, compact, className }: { f: SupplierFinancials; compact?: boolean; className?: string }) {
  const { rows, missing, footnote } = lenderRows(f);
  return (
    <BlockCard title="Lending figures" info={LENDER_NOTE} rows={rows} compact={compact} className={className}>
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">
        {missing && "Lending figures not yet added. "}
        {footnote && `${footnote} `}P/B and ROE: company snapshot{f.asOf ? ` as of ${f.asOf}` : ""}.
      </p>
    </BlockCard>
  );
}
