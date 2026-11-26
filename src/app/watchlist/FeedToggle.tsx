import Link from "next/link";

export type WatchlistFeed = "news" | "filings";

// News or corporate filings for the saved stocks. Links (?feed=filings), so the choice can be linked,
// survives a reload and works without JavaScript.
export function FeedToggle({ feed }: { feed: WatchlistFeed }) {
  const views: { feed: WatchlistFeed; label: string; href: string }[] = [
    { feed: "news", label: "News", href: "/watchlist" },
    { feed: "filings", label: "Filings", href: "/watchlist?feed=filings" },
  ];
  return (
    <nav aria-label="Stock updates view" className="-my-1 inline-flex flex-none rounded-full border border-btn bg-panel p-[3px]">
      {views.map((v) => {
        const on = v.feed === feed;
        return (
          <Link
            key={v.feed}
            href={v.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={"tap-y inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold " + (on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
