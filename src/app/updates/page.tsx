import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsList } from "@/components/NewsList";
import { listNews } from "@/lib/sector-content/insights";

export const metadata = { title: "Updates — NextResearch" };

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  const { sector } = await searchParams;
  const all = listNews();
  const sectors = [...new Map(all.map((n) => [n.sectorSlug, n.sectorName])).entries()];
  const items = sector ? all.filter((n) => n.sectorSlug === sector) : all;
  const chip = (active: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-xs font-semibold " +
    (active ? "border-accent bg-accent text-bg" : "border-line bg-panel text-ink-soft hover:text-ink");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">What&rsquo;s new</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Recent results, deals and announcements for the companies we cover, newest first. Headlines link to the original source.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/updates" className={chip(!sector)}>All sectors</Link>
          {sectors.map(([slug, name]) => (
            <Link key={slug} href={`/updates?sector=${slug}`} className={chip(sector === slug)}>{name}</Link>
          ))}
        </div>
        {items.length ? <NewsList items={items} /> : <p className="text-sm text-ink-soft">No updates for this sector yet.</p>}
        <p className="text-xs text-ink-soft">
          Tip: save companies to your <Link href="/watchlist" className="text-accent hover:underline">watchlist</Link> to see their news in one place.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
