import Link from "next/link";
import { HeroSearch } from "@/components/HeroSearch";
import type { SectorWithSlug } from "@/lib/sector-content";
import type { SearchEntry } from "@/lib/sector-content/stats";
import { BrowseThemesButton, ThemeWindow, type ThemeRow } from "./ThemeWindow";
import type { ThemeTab } from "@/components/research/ThemeCards";

type Props = {
  /** The industry linked from "Try the 3D map" (and listed first in the theme window). */
  featured: Pick<SectorWithSlug, "slug" | "name" | "zones"> | undefined;
  searchIndex: SearchEntry[];
  /** Rows for the theme window on the right (buildHeroThemeRows). */
  themeRows: Record<ThemeTab, ThemeRow[]>;
};

export function Hero({ featured, searchIndex, themeRows }: Props) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Supply-chain research for Indian equities
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Find the companies behind India&rsquo;s next big theme.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          Industries mapped in 3D, policies by beneficiary, and every big IPO&rsquo;s prospectus in ten slides — with each listed
          company&rsquo;s financials, strengths and risks one click away.
        </p>
        <div className="mt-7">
          <HeroSearch index={searchIndex} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <BrowseThemesButton className="rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90" />
          <Link
            href={`/sector/${featured?.slug ?? "datacenter"}/explore`}
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
          >
            Try the 3D map &rarr;
          </Link>
        </div>
      </div>
      <ThemeWindow rows={themeRows} />
    </div>
  );
}
