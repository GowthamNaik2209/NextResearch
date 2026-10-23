// Keep these answers accurate - they are the site's plain-language statement of what it is
// (information, not advice) and where its data comes from.
const FAQ = [
  {
    q: "Is NextResearch giving buy or sell recommendations?",
    a: "No. We map industries and the companies in them so you can see where the opportunity and the risks sit. Everything here is for information and research only — it is not investment advice, and you should do your own diligence or consult a registered adviser before investing.",
  },
  {
    q: "Where does the data come from?",
    a: "Supply-chain maps and company exposure are authored from publicly available information; company financials and ratios are drawn from public filings and market data pages. Each industry, policy and company shows a data-status label, so you can tell what is verified and what is not.",
  },
  {
    q: "How is this different from a screener?",
    a: "A screener starts from numbers. We start from the industry: which layer of the chain a company actually sits in, how exposed it is, and what its peers in that layer look like. Then we give you the numbers.",
  },
  {
    q: "Do I need an account?",
    a: "You can browse every industry, report, chart and company without one. An account is only needed to save companies to a watchlist and to keep your own baskets.",
  },
];

export function FaqSection() {
  return (
    <section className="border-t border-line bg-panel">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Straight answers</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            What we cover, where it comes from, and what it is not. Investing involves risk, including loss of capital.
          </p>
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line bg-bg">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-ink">
                {f.q}
                <span className="text-accent transition group-open:rotate-45">+</span>
              </summary>
              <p className="-mt-1 pb-4 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
