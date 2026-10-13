import Link from "next/link";
import type { SectorWithSlug } from "@/lib/sector-content";

export function FeaturedThesis({ sector }: { sector: Pick<SectorWithSlug, "slug" | "name" | "tagline" | "whyNow" | "thesisSummary"> }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-8 rounded-3xl border border-line bg-panel p-8 lg:grid-cols-[1fr_1.2fr] lg:p-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Featured thesis</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{sector.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{sector.tagline}</p>
          <Link href={`/sector/${sector.slug}`} className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
            Read the thesis &rarr;
          </Link>
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Why now</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{sector.whyNow}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">The investable idea</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{sector.thesisSummary}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
