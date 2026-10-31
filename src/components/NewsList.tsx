import Link from "next/link";
import type { NewsItem } from "@/lib/sector-content/insights";
import { findSupplierByTicker } from "@/lib/sector-content";
import { StockLink } from "@/components/stock/StockLink";
import { NewsTime } from "@/components/stock/NewsTime";
import { ToneLight } from "@/components/ToneLight";
import { cleanSource } from "@/lib/live/news";
import { classifyTone } from "@/lib/news-tone";
import type { StakeMove } from "@/lib/flows/query";
import { stakeTag } from "@/components/flows/format";

export function NewsList({ items, showSector = true, stakes }: { items: NewsItem[]; showSector?: boolean; /** Quarterly FII/DII moves, tagged on each company's headlines. */ stakes?: Map<string, StakeMove> }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {items.map((n) => {
        const { tone, reason } = classifyTone(n.headline);
        const tag = stakes && stakeTag(stakes.get(n.ticker));
        return (
          <li key={n.url + n.headline} className="flex gap-3 py-4 pl-4 pr-5 sm:pl-5">
            <ToneLight tone={tone} reason={reason} className="mt-0.5 self-start" />
            <div className="min-w-0 flex-1">
              {/* Touch screens space the rows out so each link's 36px tap area (tap-y) has room. */}
              {/* One line on phones too: the company name shows in full (up to 70% of the line) and the theme
                  gives way first, so the time stays beside them instead of wrapping onto its own line. Below
                  480px the theme is left out: there it shrank to a letter or two. */}
              <div className="flex min-w-0 flex-nowrap items-center gap-x-3 text-xs text-ink-soft">
                {/* The company opens its stock pop-up; the sector name is the way to the sector page. */}
                {findSupplierByTicker(n.ticker) ? (
                  <StockLink ticker={n.ticker} title={n.company} className="-my-1 min-w-0 max-w-[70%] flex-none truncate py-1 font-semibold text-accent hover:underline">{n.company}</StockLink>
                ) : (
                  <Link href={`/sector/${n.sectorSlug}`} title={n.company} className="min-w-0 max-w-[70%] flex-none truncate font-semibold text-accent hover:underline">{n.company}</Link>
                )}
                {showSector && <Link href={`/sector/${n.sectorSlug}`} title={n.sectorName} className="-my-1 hidden min-w-0 truncate py-1 min-[480px]:block underline decoration-line underline-offset-2 hover:text-ink">{n.sectorName}</Link>}
                <NewsTime className="flex-none whitespace-nowrap font-mono" label={n.date} ts={n.ts} />
              </div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="tap-y mt-1.5 block text-sm font-medium leading-snug text-ink hover:text-accent pointer-coarse:mt-5">
                {n.headline}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft">
                <span>{cleanSource(n.source)}</span>
                {reason && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{reason}</span>
                  </>
                )}
                {tag && (
                  <span title={tag.title} className={"rounded bg-panel-2 px-1.5 font-mono text-[11px] " + (tag.up ? "text-pos" : "text-danger")}>
                    {tag.text}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
