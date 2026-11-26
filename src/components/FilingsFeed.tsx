import { Suspense, type ReactNode } from "react";
import { FilingsList } from "@/components/FilingsList";
import { getFilingsForTickers, getLatestFilings, UPDATES_DAYS, WATCHLIST_DAYS, type FilingsResult } from "@/lib/live/filings";
import type { FilingType } from "@/lib/filings/classify";

type Props = {
  /** One theme's covered companies (/updates with a theme picked). */
  sectorSlug?: string;
  /** Or specific stocks (a watchlist) instead of every covered company. */
  tickers?: string[];
  /** Show only this type. */
  type?: FilingType;
  limit: number;
  showSector?: boolean;
  twoColumns?: boolean;
  /** Classes for the box around the list (a max height that scrolls in place). */
  listClassName?: string;
  /** Above the list once filings have loaded: gets each type's count (the type filter). */
  header?: (counts: Record<FilingType, number>) => ReactNode;
};

const NSE_FILINGS = "https://www.nseindia.com/companies-listing/corporate-filings-announcements";

/**
 * Covered companies' material corporate filings, live from NSE. Wrapped in <Suspense> with a
 * skeleton so the page shell renders while NSE answers - use <FilingsFeed> as is.
 */
export function FilingsFeed(props: Props) {
  return (
    <Suspense fallback={<FilingsSkeleton rows={Math.min(props.limit, 5)} withHeader={!!props.header} className={props.listClassName} />}>
      <FilingsFeedContent {...props} />
    </Suspense>
  );
}

async function FilingsFeedContent({ sectorSlug, tickers, type, limit, showSector = true, twoColumns = false, listClassName, header }: Props) {
  let res: FilingsResult;
  let counts: Record<FilingType, number> | null = null;
  if (tickers) res = await getFilingsForTickers(tickers, limit);
  else {
    const latest = await getLatestFilings({ sectorSlug, type, limit });
    res = latest;
    counts = latest.counts;
  }
  const days = tickers ? WATCHLIST_DAYS : UPDATES_DAYS;
  const box = "rounded-2xl border border-line bg-panel px-5 py-6 text-sm text-ink-soft";
  return (
    <div className="flex flex-col gap-3">
      {/* No chips when NSE didn't answer: every count would read 0. */}
      {counts && res.live && header?.(counts)}
      {!res.live ? (
        <p className={box}>
          NSE&rsquo;s filings aren&rsquo;t answering right now. Try again in a few minutes, or see them on{" "}
          <a href={NSE_FILINGS} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            nseindia.com
          </a>
          .
        </p>
      ) : res.items.length === 0 ? (
        <p className={box}>
          {type && counts && Object.values(counts).some((n) => n > 0)
            ? "No filings of this kind in the last week. Pick All to see every filing."
            : tickers
              ? `No material filings from your stocks in the last ${days} days.`
              : `No material filings from these companies in the last ${days} days.`}
        </p>
      ) : (
        <div>
          <div className={listClassName}>
            <FilingsList items={res.items} showSector={showSector} twoColumns={twoColumns} />
          </div>
          <p className="mt-2 text-[11px] text-ink-soft">Material filings from NSE over the last {days} days, refreshed every 15 minutes.</p>
        </div>
      )}
    </div>
  );
}

function FilingsSkeleton({ rows, withHeader, className }: { rows: number; withHeader: boolean; className?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {withHeader && <div aria-hidden="true" className="h-9 w-80 max-w-full animate-pulse rounded-full bg-panel" />}
      <div aria-busy="true" aria-label="Loading filings" className={"divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel " + (className ?? "")}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="animate-pulse space-y-2 px-5 py-4">
            <div className="h-3 w-1/3 rounded bg-panel-2" />
            <div className="h-4 w-full rounded bg-panel-2" />
            <div className="h-4 w-3/5 rounded bg-panel-2" />
            <div className="h-3 w-1/4 rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
