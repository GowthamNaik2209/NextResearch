import Link from "next/link";
import { HeroSearch } from "@/components/HeroSearch";
import type { SectorWithSlug } from "@/lib/sector-content";
import type { SearchEntry, getPlatformStats } from "@/lib/sector-content/stats";
import { ThemeWindow, type ThemeRow } from "./ThemeWindow";
import type { ThemeTab } from "@/components/research/ThemeCards";

type Props = {
  /** The industry the main button and the jump links open (and listed first in the theme window). */
  featured: Pick<SectorWithSlug, "slug" | "name" | "zones"> | undefined;
  searchIndex: SearchEntry[];
  /** Rows for the theme window on the right (buildHeroThemeRows). */
  themeRows: Record<ThemeTab, ThemeRow[]>;
  /** The proof line's numbers, computed from the sector content (never hand-typed). */
  stats: ReturnType<typeof getPlatformStats>;
};

const CTA = "inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-5 py-3 text-sm font-semibold";

// One promise, one main action. The ways into the research (3D maps, heatmaps, pools, deep dives,
// reports) stay one tap away as a small "Jump to" row, not as competing buttons.
export function Hero({ featured, searchIndex, themeRows, stats }: Props) {
  const slug = featured?.slug ?? "datacenter";
  const jump: [string, string][] = [
    [`/sector/${slug}/explore?maps=1`, "3D maps"],
    [`/sector/${slug}?view=heatmap&pick=1`, "Stock heatmaps"],
    [`/sector/${slug}?view=pools&pick=1`, "Industry pools"],
    ["/docs", "Deep dives"],
    ["/docs?view=reports", "Reports"],
  ];
  const proof = [
    `${stats.companies} covered companies`,
    `${stats.sectors} industries & policies`,
    "Figures from company filings",
    "Prices refreshed daily",
  ];
  return (
    <div className="mx-auto grid max-w-page grid-cols-1 items-center gap-6 px-5 py-8 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:py-14">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Supply-chain research for Indian equities
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Who gets paid when India builds?
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Every industry mapped to its listed suppliers. Every policy to the companies it pays. Shortlist them and track them as a basket.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link href={`/sector/${slug}/explore?maps=1`} className={`${CTA} border-accent bg-accent text-bg hover:opacity-90`}>
            Explore an industry &rarr;
          </Link>
          <Link href="#how" className={`${CTA} border-btn text-ink hover:bg-accent/10`}>
            See how it works
          </Link>
        </div>
        {/* A dot before every item (not a separator between them), so a wrapped line never starts with one. */}
        <ul aria-label="About the data" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {proof.map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <HeroSearch index={searchIndex} />
        </div>
        <nav aria-label="Jump to" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="text-ink-soft">Jump to:</span>
          {jump.map(([href, label]) => (
            <Link key={href} href={href} className="font-medium text-ink underline decoration-btn underline-offset-4 hover:decoration-accent">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <ThemeWindow rows={themeRows} />
    </div>
  );
}
