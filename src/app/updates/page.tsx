import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NewsFeed } from "@/components/NewsFeed";
import { FlowsView } from "@/components/flows/FlowsView";
import { listSectors } from "@/lib/sector-content";
import { ensureFinancials } from "@/lib/financials/load";
import { shareMeta } from "@/lib/site";
import type { Tone } from "@/lib/news-tone";
import { IndustrySelect } from "./IndustrySelect";
import { ViewSwitch } from "./ViewSwitch";
import { ToneChips } from "./ToneChips";
import { TONES, type UpdatesView } from "./controls";
import { PeriodSelect } from "./PeriodSelect";
import { parsePeriod } from "@/lib/flows/periods";

export const metadata = {
  title: "Updates: industry, policy and company news",
  description: "Latest news across the industries, policies and listed companies NextResearch covers, and where foreign and domestic institutions are putting money.",
  alternates: { canonical: "/updates" },
  ...shareMeta({ title: "Industry and company news", line: "The latest across every theme NextResearch maps.", path: "/updates" }),
};

const GROUP = { policy: "Policies", index: "Indices" } as const;

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ sector?: string; view?: string; tone?: string; period?: string }> }) {
  await ensureFinancials();
  const params = await searchParams;
  const sectors = listSectors().filter((s) => !s.muted);
  // Ignore an unknown ?sector= or ?tone= value rather than showing an empty page.
  const active = sectors.find((s) => s.slug === params.sector);
  const view: UpdatesView = params.view === "flows" ? "flows" : "news";
  const tone = TONES.find((t) => t === params.tone) as Tone | undefined;
  const period = parsePeriod(params.period);

  return (
    <>
      <SiteHeader />
      {/* The page width of the site's data pages, so a desktop uses its room: headlines in two columns,
          the FII / DII blocks side by side. The heading and controls keep a reading width. */}
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-5 px-5 py-14">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">What&rsquo;s new</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">The latest headlines on the companies we cover, plus where institutional money is moving.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <IndustrySelect
            options={sectors.map((s) => ({ slug: s.slug, name: s.name, group: s.category === "policy" || s.category === "index" ? GROUP[s.category] : "Industries" }))}
            active={active?.slug}
            view={view}
            period={period}
          />
          <ViewSwitch view={view} sector={active?.slug} period={period} />
        </div>
        {/* key: switching industry or view shows the loading state again instead of the previous one */}
        {view === "flows" ? (
          <>
            <PeriodSelect period={period} sector={active?.slug} />
            <FlowsView key={`flows-${active?.slug ?? "all"}-${period}`} period={period} sectorSlug={active?.slug} sectorName={active?.name} />
          </>
        ) : (
          <NewsFeed
            key={`news-${active?.slug ?? "all"}-${tone ?? "all"}`}
            sectorSlug={active?.slug}
            limit={30}
            stakeTags
            twoColumns
            // With one industry picked, every row would repeat its name.
            showSector={!active}
            tone={tone}
            header={(counts) => <ToneChips counts={counts} active={tone} sector={active?.slug} period={period} />}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
