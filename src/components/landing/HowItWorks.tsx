const STEPS: [title: string, body: string][] = [
  ["Choose a theme", "An industry or a policy — each mapped end to end, from raw inputs to the finished product."],
  ["Explore the chain", "Open the 3D map. Layers, zones and bottlenecks show where value and risk concentrate."],
  ["Compare the players", "See every company in a layer ranked by exposure and segment revenue, not group totals."],
  ["Track what matters", "Save companies to your watchlist and come back as the story develops."],
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">From theme to shortlist in four steps</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="relative border-t-2 border-accent pt-4">
              <span className="font-mono text-xs font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-1 font-display text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
