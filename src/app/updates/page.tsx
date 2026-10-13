import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { listSectors } from "@/lib/sector-content";

export const metadata = { title: "Updates — NextResearch" };

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  const { sector } = await searchParams;
  const sectors = listSectors().filter((s) => !s.muted);
  // Ignore an unknown ?sector= value rather than showing an empty feed.
  const active = sectors.find((s) => s.slug === sector)?.slug;
  const chip = (isActive: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-xs font-semibold " +
    (isActive ? "border-accent bg-accent text-bg" : "border-line bg-panel text-ink-soft hover:text-ink");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">What&rsquo;s new</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            The latest headlines on the companies we cover, newest first. Each one links to the original source.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/updates" className={chip(!active)}>All sectors</Link>
          {sectors.map((s) => (
            <Link key={s.slug} href={`/updates?sector=${s.slug}`} className={chip(active === s.slug)}>{s.name}</Link>
          ))}
        </div>
        {/* key: switching sector shows the skeleton again instead of the previous list */}
        <NewsFeed key={active ?? "all"} sectorSlug={active} limit={30} />
        <p className="text-xs text-ink-soft">
          Tip: save companies to your <Link href="/watchlist" className="text-accent hover:underline">watchlist</Link> to see their news in one place.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
