import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { ThemeChips } from "./ThemeChips";
import { listSectors } from "@/lib/sector-content";
import { ensureFinancials } from "@/lib/financials/load";
import { shareMeta } from "@/lib/site";

export const metadata = {
  title: "Updates: industry, policy and company news",
  description: "Latest news across the industries, policies and listed companies NextResearch covers.",
  alternates: { canonical: "/updates" },
  ...shareMeta({ title: "Industry and company news", line: "The latest across every theme NextResearch maps.", path: "/updates" }),
};

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ sector?: string }> }) {
  await ensureFinancials();
  const { sector } = await searchParams;
  const sectors = listSectors().filter((s) => !s.muted);
  // Ignore an unknown ?sector= value rather than showing an empty feed.
  const active = sectors.find((s) => s.slug === sector)?.slug;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">What&rsquo;s new</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            The latest headlines on the companies we cover, newest first. Each one links to the original source.
          </p>
          {/* Up here, not under the feed: below it, the tip jumped down when the 30 headlines
              replaced the 5-row loading skeleton (a layout shift on every visit). */}
          <p className="mt-1.5 text-xs text-ink-soft">
            Tip: save companies to your <Link href="/watchlist" className="tap-target text-accent hover:underline">watchlist</Link> to see their news in one place.
          </p>
        </div>
        <ThemeChips sectors={sectors.map((s) => ({ slug: s.slug, name: s.name }))} active={active} />
        {/* key: switching sector shows the skeleton again instead of the previous list */}
        <NewsFeed key={active ?? "all"} sectorSlug={active} limit={30} />
      </main>
      <SiteFooter />
    </>
  );
}
