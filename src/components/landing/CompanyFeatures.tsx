const FEATURES: [title: string, body: string][] = [
  ["Financial snapshot", "Five-year revenue and net profit, plus P/E, ROCE, ROE, market cap and 52-week range."],
  ["Strengths & risks", "A written view of what supports the business and what could go wrong, per company."],
  ["Segment exposure", "How directly a company is tied to each layer — direct supplier, enabler, operator — and how strongly."],
  ["Peer comparison", "Line up every company in a layer side by side on the metrics that matter for that segment."],
  ["Bottlenecks & drivers", "Industry-level choke points and demand drivers, each linked back to the layer they come from."],
  ["Analysis", "A 10-slide report per industry and policy, a prospectus deck per upcoming IPO, and charts that compare an industry's listed stocks against its index, the Nifty 50 and the Sensex."],
];

export function CompanyFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">What you see on every company</h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">The checklist most investors run by hand, in one panel.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
