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
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-soft">How to research here</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Pick a sector",
                body: "Each sector is a full supply chain, mapped end to end — from raw materials and components through to the manufacturers who assemble the finished product.",
              },
              {
                step: "2",
                title: "Explore the 3D map",
                body: "The map is grouped into layers and zones. Click any highlighted part to see its role, who supplies it, and why that layer matters to the value chain.",
              },
              {
                step: "3",
                title: "Compare companies",
                body: "Inside any zone with more than one supplier, open Compare to line up listed companies by their exposure and revenue in that specific segment — not their total company-wide numbers.",
              },
              {
                step: "4",
                title: "Watchlist what matters",
                body: "Found a company worth tracking? Tap the heart next to its ticker anywhere on the site to save it to your watchlist and follow it over time.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
                  {item.step}
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

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
