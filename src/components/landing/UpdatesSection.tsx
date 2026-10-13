import Link from "next/link";
import { NewsList } from "@/components/NewsList";
import type { NewsItem } from "@/lib/sector-content/insights";

export function UpdatesSection({ items }: { items: NewsItem[] }) {
  return (
    <section className="border-t border-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">What&rsquo;s new</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Results, deals and announcements for the companies in our maps — each linked to its source.
          </p>
          <Link href="/updates" className="mt-5 inline-block text-sm font-semibold text-accent hover:underline">
            See all updates &rarr;
          </Link>
        </div>
        <NewsList items={items} />
      </div>
    </section>
  );
}
