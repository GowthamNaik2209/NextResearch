import { Suspense } from "react";
import { NewsList } from "@/components/NewsList";
import { getLatestNews, getNewsForTickers } from "@/lib/live/news";

type Props = {
  /** Limit the feed to one sector. */
  sectorSlug?: string;
  /** Or show news for specific tickers (e.g. a watchlist) instead of the platform feed. */
  tickers?: string[];
  limit: number;
  showSector?: boolean;
};

/**
 * Latest headlines (live from Google News, curated fallback). Wrapped in <Suspense> with a
 * skeleton so the page shell renders immediately while headlines load - use <NewsFeed> as is.
 */
export function NewsFeed(props: Props) {
  return (
    <Suspense fallback={<NewsSkeleton rows={Math.min(props.limit, 5)} />}>
      <NewsFeedContent {...props} />
    </Suspense>
  );
}

async function NewsFeedContent({ sectorSlug, tickers, limit, showSector = true }: Props) {
  const { items, live } = tickers ? await getNewsForTickers(tickers, limit) : await getLatestNews({ sectorSlug, limit });
  if (items.length === 0) {
    return <p className="rounded-2xl border border-line bg-panel px-5 py-6 text-sm text-ink-soft">No recent headlines right now — check back soon.</p>;
  }
  return (
    <div>
      <NewsList items={items} showSector={showSector} />
      <p className="mt-2 text-[11px] text-ink-soft">
        {live ? "Live headlines via Google News, refreshed every 15 minutes." : "Live feed unavailable right now — showing curated headlines."}
      </p>
    </div>
  );
}

function NewsSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading headlines" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse space-y-2 px-5 py-4">
          <div className="h-3 w-1/3 rounded bg-panel-2" />
          <div className="h-4 w-4/5 rounded bg-panel-2" />
          <div className="h-3 w-1/5 rounded bg-panel-2" />
        </div>
      ))}
    </div>
  );
}
