import Link from "next/link";
import { HeroSearch } from "@/components/HeroSearch";
import type { SectorWithSlug } from "@/lib/sector-content";
import type { SearchEntry } from "@/lib/sector-content/stats";

type Props = {
  /** The sector previewed on the right and linked from "Try the 3D map". */
  featured: Pick<SectorWithSlug, "slug" | "name" | "zones"> | undefined;
  searchIndex: SearchEntry[];
};

export function Hero({ featured, searchIndex }: Props) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Supply-chain research for Indian equities
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Find the companies behind India&rsquo;s next big theme.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          Pick an industry, see its entire supply chain mapped in 3D, and know exactly which listed companies sit in each layer —
          with their financials, strengths and risks one click away.
        </p>
        <div className="mt-7">
          <HeroSearch index={searchIndex} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="#sectors" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
            Browse industries
          </Link>
          <Link
            href={`/sector/${featured?.slug ?? "datacenter"}/explore`}
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
          >
            Try the 3D map &rarr;
          </Link>
        </div>
      </div>
      <ChainPreview featured={featured} />
    </div>
  );
}

/** Decorative preview: a stylised stack of the featured sector's value-chain layers. */
function ChainPreview({ featured }: Pick<Props, "featured">) {
  return (
    <div aria-hidden className="relative">
      <div className="rounded-2xl border border-line bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="font-mono font-semibold text-ink">{featured?.name ?? "Industry map"}</span>
          <span className="text-ink-soft">value chain</span>
        </div>
        {(featured?.zones.slice(0, 5) ?? []).map((z, i) => (
          <div
            key={z.id}
            className="mb-2 flex items-center justify-between rounded-lg border border-line bg-panel-2 px-3.5 py-2.5"
            style={{ marginLeft: i * 10, marginRight: (4 - i) * 10 }}
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: z.color }} />
              {z.label}
            </span>
            <span className="font-mono text-xs text-ink-soft">{z.suppliers.length} cos</span>
          </div>
        ))}
        <div className="mt-4 rounded-lg bg-accent/10 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
          <b className="text-accent">Tap a layer</b> to see who supplies it, how exposed each company is, and compare them side by side.
        </div>
      </div>
    </div>
  );
}
