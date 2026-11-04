import Link from "next/link";
import { HeroSearch } from "@/components/HeroSearch";
import type { SectorWithSlug } from "@/lib/sector-content";
import type { SearchEntry } from "@/lib/sector-content/stats";
import { ThemeWindow, type ThemeRow } from "./ThemeWindow";
import type { ThemeTab } from "@/components/research/ThemeCards";

type Props = {
  /** The industry the quick-access buttons open (and listed first in the theme window). */
  featured: Pick<SectorWithSlug, "slug" | "name" | "zones"> | undefined;
  searchIndex: SearchEntry[];
  /** Rows for the theme window on the right (buildHeroThemeRows). */
  themeRows: Record<ThemeTab, ThemeRow[]>;
};

const QUICK = "items-center justify-center whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-semibold";

export function Hero({ featured, searchIndex, themeRows }: Props) {
  const slug = featured?.slug ?? "datacenter";
  return (
    <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-6 px-5 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:py-10">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Supply-chain research for Indian equities
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          All your thematic research on India, in one place.
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          Industries mapped in 3D, policies by beneficiary, and every big IPO&rsquo;s prospectus in ten slides — with each listed
          company&rsquo;s financials, strengths and risks one click away.
        </p>
        <div className="mt-5">
          <HeroSearch index={searchIndex} />
        </div>
        {/* Quick access to each way into the research: one filled (the 3D maps, opened on the map
            switcher), the rest outlined. On phones the 3D maps button spans the row and the other four sit
            2x2 below; one row from 640px up. */}
        <nav aria-label="Quick access" className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <Link href={`/sector/${slug}/explore?maps=1`} className={`${QUICK} col-span-2 inline-flex border-accent bg-accent text-bg hover:opacity-90`}>
            3D maps
          </Link>
          <Link href={`/sector/${slug}?view=heatmap&pick=1`} className={`${QUICK} inline-flex border-btn text-ink hover:bg-accent/10`}>
            Stock heatmaps
          </Link>
          <Link href={`/sector/${slug}?view=pools&pick=1`} className={`${QUICK} inline-flex border-btn text-ink hover:bg-accent/10`}>
            Industry pools
          </Link>
          <Link href="/docs" className={`${QUICK} inline-flex border-btn text-ink hover:bg-accent/10`}>
            Deep dives
          </Link>
          <Link href="/docs?view=reports" className={`${QUICK} inline-flex border-btn text-ink hover:bg-accent/10`}>
            Reports
          </Link>
        </nav>
      </div>
      <ThemeWindow rows={themeRows} />
    </div>
  );
}
