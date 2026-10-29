import Link from "next/link";
import { NewsFeed } from "@/components/NewsFeed";

export function UpdatesSection() {
  return (
    <section className="border-t border-line bg-panel">
      {/* minmax(0, …) tracks + min-w-0: a grid item's default min width is its min-content, and a
          headline row (company · sector · time on one nowrap line) is wider than a phone, which
          pushed the whole page sideways. Zero minimums let the rows truncate instead. */}
      <div className="mx-auto grid max-w-page grid-cols-1 gap-8 px-5 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">What&rsquo;s new</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Results, deals and announcements for the companies in our maps — each linked to its source.
          </p>
          <Link href="/updates" className="tap-target mt-5 inline-block text-sm font-semibold text-accent hover:underline">
            See all updates &rarr;
          </Link>
        </div>
        <div className="min-w-0">
          <NewsFeed limit={5} />
        </div>
      </div>
    </section>
  );
}
