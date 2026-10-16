import Link from "next/link";
import type { NewsItem } from "@/lib/sector-content/insights";
import { findSupplierByTicker } from "@/lib/sector-content";
import { StockLink } from "@/components/stock/StockLink";
import { NewsTime } from "@/components/stock/NewsTime";
import { cleanSource } from "@/lib/live/news";

export function NewsList({ items, showSector = true }: { items: NewsItem[]; showSector?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {items.map((n) => (
        <li key={n.url + n.headline} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {/* The company opens its stock pop-up; the sector name is the way to the sector page. */}
            {findSupplierByTicker(n.ticker) ? (
              <StockLink ticker={n.ticker} className="-my-1 py-1 font-semibold text-accent hover:underline">{n.company}</StockLink>
            ) : (
              <Link href={`/sector/${n.sectorSlug}`} className="font-semibold text-accent hover:underline">{n.company}</Link>
            )}
            {showSector && <Link href={`/sector/${n.sectorSlug}`} className="-my-1 py-1 underline decoration-line underline-offset-2 hover:text-ink">{n.sectorName}</Link>}
            <NewsTime className="font-mono" label={n.date} ts={n.ts} />
          </div>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block text-sm font-medium leading-snug text-ink hover:text-accent">
            {n.headline}
          </a>
          <div className="mt-1 text-xs text-ink-soft">{cleanSource(n.source)}</div>
        </li>
      ))}
    </ul>
  );
}
