import Link from "next/link";
import { listSectors, listComingSoonSectors } from "@/lib/sector-content";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  const sectors = listSectors();
  const comingSoon = listComingSoonSectors();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-14">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-ink">NextResearch</h1>
          <p className="mt-2 font-semibold text-accent">
            Fund-level research for India&rsquo;s public markets.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-soft">
            Pick a sector, explore its supply chain in 3D, then deep-dive into any
            company&rsquo;s financials.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-soft">
            Explore a sector
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <Link
                key={s.slug}
                href={`/sector/${s.slug}`}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-xs font-bold text-accent">
                  {s.icon}
                </div>
                <h3 className="font-display text-base font-semibold text-ink">{s.name}</h3>
                <p className="text-xs leading-relaxed text-ink-soft">{s.tagline}</p>
              </Link>
            ))}
            {comingSoon.map((s) => (
              <div
                key={s.name}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 opacity-45"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-xs font-bold text-accent">
                  {s.icon}
                </div>
                <h3 className="font-display text-base font-semibold text-ink">{s.name}</h3>
                <p className="text-xs leading-relaxed text-ink-soft">{s.tagline}</p>
                <span className="mt-auto text-[10px] font-semibold uppercase tracking-wide text-accent">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
