import Link from "next/link";

// The site's flow in four steps, each linking to where that step happens: Analysis (Deep dive,
// Reports) is the way in, an industry's page holds its 3D map, and Baskets keeps your own.
const STEPS: { title: string; body: string; link: { href: string; label: string } }[] = [
  {
    title: "Pick an industry",
    body: "Start in Analysis on Deep dive: every industry and policy we cover, each mapped end to end from raw inputs to the finished product.",
    link: { href: "#themes", label: "Browse deep dives" },
  },
  {
    title: "Explore the chain",
    body: "Open its 3D map. Layers, zones and bottlenecks show where value and risk concentrate, with every company ranked by exposure and segment revenue.",
    link: { href: "/sector/datacenter/explore", label: "Try the 3D map" },
  },
  {
    title: "Read and chart it",
    body: "Reports sum the industry up in ten slides for investors. Charts show any of its listed stocks, picked by layer.",
    link: { href: "/docs?view=reports", label: "See the reports" },
  },
  {
    title: "Make it yours",
    body: "Copy the industry basket into your own, save companies to your watchlist and share a basket by link as the story develops.",
    link: { href: "/baskets", label: "Open Baskets" },
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line">
      <div className="mx-auto max-w-page px-5 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">From an industry to your own basket in four steps</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col border-t-2 border-accent pt-4">
              <span className="font-mono text-xs font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-1 font-display text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              <Link href={s.link.href} className="tap-target mt-3 self-start py-1 text-xs font-semibold text-accent hover:underline">
                {s.link.label} &rarr;
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
