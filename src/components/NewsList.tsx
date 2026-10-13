import Link from "next/link";
import type { NewsItem } from "@/lib/sector-content/insights";

export function NewsList({ items, showSector = true }: { items: NewsItem[]; showSector?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {items.map((n) => (
        <li key={n.url + n.headline} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <Link href={`/sector/${n.sectorSlug}`} className="font-semibold text-accent hover:underline">{n.company}</Link>
            {showSector && <span>{n.sectorName}</span>}
            <span className="font-mono">{n.date}</span>
          </div>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block text-sm font-medium leading-snug text-ink hover:text-accent">
            {n.headline}
          </a>
          <div className="mt-1 text-xs text-ink-soft">{n.source}</div>
        </li>
      ))}
    </ul>
  );
}
