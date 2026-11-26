import Link from "next/link";
import { findSupplierByTicker } from "@/lib/sector-content";
import { StockLink } from "@/components/stock/StockLink";
import { NewsTime } from "@/components/stock/NewsTime";
import { formatNewsDate } from "@/lib/live/news-date";
import { filingLabel } from "@/lib/filings/classify";
import type { FilingItem } from "@/lib/live/filings";

// Corporate filings in the news list's look (NewsList): company, theme and time on top, NSE's
// summary as the body (it opens the filing), then the type and NSE's subject line.
export function FilingsList({ items, showSector = true, twoColumns = false }: { items: FilingItem[]; showSector?: boolean; twoColumns?: boolean }) {
  return (
    <ul className={"grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line " + (twoColumns ? "lg:grid-cols-2" : "")}>
      {items.map((f) => (
        <li key={f.url + f.ts} className="bg-panel px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-nowrap items-center gap-x-3 text-xs text-ink-soft">
            {findSupplierByTicker(f.ticker) ? (
              <StockLink ticker={f.ticker} title={f.company} className="-my-1 min-w-0 max-w-[70%] flex-none truncate py-1 font-semibold text-accent hover:underline">
                {displayName(f)}
              </StockLink>
            ) : (
              <span title={f.company} className="min-w-0 max-w-[70%] flex-none truncate font-semibold text-accent">
                {displayName(f)}
              </span>
            )}
            {showSector && f.sectorSlug && (
              <Link href={`/sector/${f.sectorSlug}`} title={f.sectorName} className="-my-1 hidden min-w-0 truncate py-1 underline decoration-line underline-offset-2 hover:text-ink min-[480px]:block">
                {f.sectorName}
              </Link>
            )}
            <NewsTime className="flex-none whitespace-nowrap font-mono" label={formatNewsDate(f.ts)} ts={f.ts} />
          </div>
          <a href={f.url} target="_blank" rel="noopener noreferrer" title={f.summary} className="tap-y mt-1.5 line-clamp-3 text-sm font-medium leading-snug text-ink hover:text-accent pointer-coarse:mt-5">
            {f.summary}
          </a>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft">
            <span className="rounded bg-panel-2 px-1.5 py-px font-semibold text-ink">{filingLabel(f.type)}</span>
            <span className="min-w-0 truncate" title={f.subject}>
              NSE · {f.subject}
            </span>
            <span aria-hidden="true">·</span>
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="tap-y flex-none text-accent hover:underline">
              PDF ↗
            </a>
          </div>
        </li>
      ))}
      {/* An odd count leaves the last row's second cell empty: fill it with the panel colour. */}
      {twoColumns && items.length % 2 === 1 && <li aria-hidden="true" className="hidden bg-panel lg:block" />}
    </ul>
  );
}

/** The platform's name for the company when we cover it ("HAL", not "Hindustan Aeronautics Limited"). */
function displayName(f: FilingItem): string {
  return findSupplierByTicker(f.ticker)?.name ?? f.company.replace(/\s+Limited$/i, "");
}
