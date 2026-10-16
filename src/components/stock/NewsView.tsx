import type { SectorSupplier } from "@/lib/sector-content";
import type { StockApi } from "./types";
import { ExtLink } from "./SummaryView";
import { NewsTime } from "./NewsTime";

export function NewsView({ ticker, name, supplier, api }: { ticker: string; name: string; supplier: SectorSupplier; api: StockApi | null }) {
  const items = api?.news ?? [];
  const tl = supplier.f?.tl;
  return (
    <div className="flex flex-col gap-5">
      {items.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {items.map((n) => (
            <li key={n.url + n.headline} className="px-4 py-3.5">
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold leading-snug text-ink hover:text-accent">
                {n.headline}
              </a>
              <div className="mt-1 font-mono text-[11px] text-ink-soft">
                {n.source} · <NewsTime label={n.date} ts={n.ts} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-line bg-panel px-4 py-5 text-sm text-ink-soft">
          No recent headlines for {name} — use the links below for the latest coverage.
        </p>
      )}
      {items.length > 0 && (
        <p className="-mt-3 text-[11px] text-ink-soft">
          {api?.newsLive ? "Live headlines via Google News, refreshed every 15 minutes." : "Live feed unavailable right now — showing curated headlines."}
        </p>
      )}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">More coverage</div>
        <div className="flex flex-col gap-1.5">
          <ExtLink href={`https://news.google.com/search?q=${encodeURIComponent(name + " share")}&hl=en-IN&gl=IN&ceid=IN:en`}>Google News</ExtLink>
          {tl && <ExtLink href={`https://trendlyne.com/latest-news/${tl[0]}/${encodeURIComponent(ticker)}/${tl[1]}/`}>Latest news &amp; announcements (Trendlyne)</ExtLink>}
          <ExtLink href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(ticker)}`}>Exchange filings &amp; announcements (NSE)</ExtLink>
        </div>
      </div>
    </div>
  );
}
