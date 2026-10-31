import { Suspense, type ReactNode } from "react";
import { NewsList } from "@/components/NewsList";
import { getLatestNews, getNewsForTickers } from "@/lib/live/news";
import { classifyTone, type Tone } from "@/lib/news-tone";
import { getStakeMoves } from "@/lib/flows/query";

type Props = {
  /** Limit the feed to one sector. */
  sectorSlug?: string;
  /** Or show news for specific tickers (e.g. a watchlist) instead of the platform feed. */
  tickers?: string[];
  limit: number;
  showSector?: boolean;
  /** Tag headlines with the company's quarterly FII/DII stake move when it is notable. */
  stakeTags?: boolean;
  /** Show only headlines of this tone. */
  tone?: Tone;
  /** Above the list once headlines have loaded: gets each tone's count (the tone filter). */
  header?: (counts: Record<Tone, number>) => ReactNode;
};

/**
 * Latest headlines (live from Google News, curated fallback). Wrapped in <Suspense> with a
 * skeleton so the page shell renders immediately while headlines load - use <NewsFeed> as is.
 */
export function NewsFeed(props: Props) {
  return (
    <Suspense fallback={<NewsSkeleton rows={Math.min(props.limit, 5)} withHeader={!!props.header} />}>
      <NewsFeedContent {...props} />
    </Suspense>
  );
}

async function NewsFeedContent({ sectorSlug, tickers, limit, showSector = true, stakeTags = false, tone, header }: Props) {
  const { items: all, live } = tickers ? await getNewsForTickers(tickers, limit) : await getLatestNews({ sectorSlug, limit });
  const tones = all.map((n) => classifyTone(n.headline).tone);
  const counts: Record<Tone, number> = { pos: 0, neg: 0, neu: 0 };
  for (const t of tones) counts[t]++;
  const items = tone ? all.filter((_, i) => tones[i] === tone) : all;
  const stakes = stakeTags && items.length ? await getStakeMoves([...new Set(items.map((n) => n.ticker))]) : undefined;
  return (
    <div className="flex flex-col gap-3">
      {header?.(counts)}
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-5 py-6 text-sm text-ink-soft">
          {all.length > 0 ? "No headlines of this kind in the latest news. Pick All to see every headline." : "No recent headlines right now — check back soon."}
        </p>
      ) : (
        <div>
          <NewsList items={items} showSector={showSector} stakes={stakes} />
          <p className="mt-2 text-[11px] text-ink-soft">
            {live ? "Live headlines via Google News, refreshed every 15 minutes." : "Live feed unavailable right now — showing curated headlines."}
          </p>
        </div>
      )}
    </div>
  );
}

function NewsSkeleton({ rows, withHeader }: { rows: number; withHeader: boolean }) {
  // The header row (the tone filter) keeps its place while loading, so the list doesn't jump down.
  return (
    <div className="flex flex-col gap-3">
      {withHeader && <div aria-hidden="true" className="h-9 w-64 max-w-full animate-pulse rounded-full bg-panel" />}
      <div aria-busy="true" aria-label="Loading headlines" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="animate-pulse space-y-2 px-5 py-4">
            <div className="h-3 w-1/3 rounded bg-panel-2" />
            <div className="h-4 w-4/5 rounded bg-panel-2" />
            <div className="h-3 w-1/5 rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
