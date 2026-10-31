import type { ReactNode } from "react";
import { InfoTip } from "@/components/InfoTip";

/**
 * One block of the FII / DII view: a title with its "i", then where the figures come from and how
 * often they change (every block says so), then the block itself.
 */
export function FlowCard({
  title,
  info,
  source,
  note,
  className = "",
  mine = false,
  children,
}: {
  title: string;
  info: ReactNode;
  source: ReactNode;
  /** An amber line under the source (e.g. "Market-wide · not split by industry"). */
  note?: ReactNode;
  /** Grid placement (column spans). */
  className?: string;
  /** The user's own block (their watchlist): set apart with an accent border. */
  mine?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={"min-w-0 rounded-2xl border bg-panel px-4 py-3.5 " + (mine ? "border-accent/50 " : "border-line ") + className}>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-[15px] font-medium text-ink">{title}</h2>
        <InfoTip label={`About ${title}`}>{info}</InfoTip>
      </div>
      <p className="mt-0.5 font-mono text-[11px] leading-snug text-ink-soft">{source}</p>
      {note && <p className="font-mono text-[11px] leading-snug text-amber-ink">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** What a block shows before its data has been collected for the first time. */
export function NotYet({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink-soft">{children}</p>;
}
