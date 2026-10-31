"use client";

import Link from "next/link";
import { useState } from "react";

// The landing page's How it works: example research questions, each walked through the site step
// by step. Every flow follows the same route (STAGES), lit up above the picker for the stages it uses.
type Stage = "industry" | "chain" | "company" | "watch" | "basket";

const STAGES: { id: Stage; label: string }[] = [
  { id: "industry", label: "Industry" },
  { id: "chain", label: "Supply chain" },
  { id: "company", label: "Company" },
  { id: "watch", label: "Watchlist" },
  { id: "basket", label: "Basket" },
];

type Step = { stage: Stage; title: string; where: string; see: string };
type Flow = { kind: string; question: string; steps: Step[]; outcome: string; cta: { href: string; label: string } };

const FLOWS: Flow[] = [
  {
    kind: "A theme",
    question: "AI data centers are booming. Who in India gets paid?",
    steps: [
      { stage: "industry", title: "Open the Data Center deep dive", where: "Deep dive", see: "The whole build, from site and power to compute, and where India’s listed companies fit." },
      { stage: "chain", title: "Open the Site & Power layer on the 3D map", where: "3D map", see: "Grid interconnect, transformers, switchgear and backup power, with the bottlenecks marked." },
      { stage: "chain", title: "See who sits in that layer", where: "3D map", see: "Every listed company in it, with how directly it earns from the layer." },
      { stage: "company", title: "Open a company", where: "Company page", see: "Five years of revenue and profit, P/E and ROCE, strengths and risks, and peers in the same layer." },
      { stage: "basket", title: "Copy the industry basket and backtest it", where: "Baskets", see: "Five years against the Nifty 50, then Bear, Base and Bull for the next 1 and 2 years." },
    ],
    outcome: "You end with a shortlist of power-side suppliers and a basket you can track.",
    cta: { href: "/sector/datacenter", label: "Start with data centers" },
  },
  {
    kind: "A policy shock",
    question: "China curbs rare-earth exports again. Who is exposed?",
    steps: [
      { stage: "industry", title: "Open the rare-earth magnets policy", where: "Deep dive", see: "The Rs 7,280 crore sintered-magnet scheme: its rules, who bid, and where India stands." },
      { stage: "chain", title: "Run the “China’s curbs come back” scenario", where: "Scenarios", see: "The layers it hits light up, and the companies in them are ranked by how exposed they are." },
      { stage: "chain", title: "Then try “Motors move to ferrite”", where: "Scenarios", see: "See who gains if makers design rare earths out of their motors." },
      { stage: "watch", title: "Save the most exposed names", where: "Watchlist", see: "Keep them in one list and follow their news in Updates as the story moves." },
    ],
    outcome: "You know who is hurt and who is helped before the next headline.",
    cta: { href: "/sector/rareearth/explore?scenario=china-curbs-return", label: "Open the rare-earth scenarios" },
  },
  {
    kind: "A stock you own",
    question: "I hold one stock. What else is it tied to?",
    steps: [
      { stage: "company", title: "Find your company", where: "Company page", see: "Its page shows each industry and layer it serves, and how directly." },
      { stage: "chain", title: "Open Connections", where: "Connections", see: "Companies that supply several industries at once, and every chain yours feeds." },
      { stage: "company", title: "Compare it with its peers", where: "Peer table", see: "Every company in the same layer, side by side on the figures that matter for that segment." },
      { stage: "basket", title: "Build a basket of it and its peers", where: "Baskets", see: "Backtest them together and compare with the industry’s own basket." },
    ],
    outcome: "You see your holding in context, and whether a peer looks cheaper for the same exposure.",
    cta: { href: "/companies", label: "Find a company" },
  },
  {
    kind: "A screen",
    question: "Skip the themes. I want quality at a fair price.",
    steps: [
      { stage: "basket", title: "Pick a rule-based basket", where: "Baskets", see: "Growth at a reasonable price, Consistent compounders, Widening margins or Turnarounds, re-ranked daily. Companies with a one-off year are left out." },
      { stage: "company", title: "Check each name", where: "Company page", see: "Strengths and risks, and which industries it actually earns from." },
      { stage: "basket", title: "Copy it and set the rules", where: "Baskets", see: "Equal or market-cap weights, rebalanced monthly, quarterly or on drift, with the turnover it takes." },
      { stage: "watch", title: "Keep the ones you’d buy", where: "Watchlist", see: "Follow them without committing to the whole list." },
    ],
    outcome: "You end with a rules-based list you can test, not a tip.",
    cta: { href: "/baskets#ideas", label: "See rule-based baskets" },
  },
  {
    kind: "An IPO",
    question: "An IPO opens next week. Is it any good?",
    steps: [
      { stage: "company", title: "Read the prospectus in ten slides", where: "IPOs", see: "The business, its numbers, the issue and the risks it lists." },
      { stage: "industry", title: "Find its industry", where: "Deep dive", see: "Where its business sits in the chain, and which listed companies already do the same job." },
      { stage: "company", title: "Compare the listed peers", where: "Peer table", see: "Their P/E, margins and growth: a check on whether the issue price looks rich." },
      { stage: "watch", title: "Watch the peers", where: "Watchlist", see: "See how the space trades into the listing." },
    ],
    outcome: "You go into the IPO with listed peers to measure it against.",
    cta: { href: "/ipos", label: "See upcoming IPOs" },
  },
];

export function ResearchFlows() {
  const [picked, setPicked] = useState(0);
  const flow = FLOWS[picked];
  const used = new Set(flow.steps.map((s) => s.stage));

  return (
    <div className="flex flex-col gap-5">
      {/* Phones drop the arrows so a wrapped row doesn't start with a lone one. */}
      <ol aria-label="Stages of the route" className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-semibold">
        {STAGES.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="hidden text-ink-soft sm:inline">&rarr;</span>}
            <span className={`rounded-full border px-2.5 py-1 transition-colors ${used.has(s.id) ? "border-accent bg-accent text-bg" : "border-line text-ink-soft"}`}>
              {s.label}
              <span className="sr-only">{used.has(s.id) ? " (used in this flow)" : " (not used)"}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid overflow-hidden rounded-2xl border border-line bg-bg md:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Phones: the questions scroll sideways as cards above the flow. */}
        <div role="group" aria-label="Research questions" className="scrollbar-none flex overflow-x-auto border-b border-line bg-panel md:flex-col md:overflow-visible md:border-r md:border-b-0">
          {FLOWS.map((f, i) => {
            const on = i === picked;
            return (
              <button
                key={f.kind}
                type="button"
                aria-pressed={on}
                onClick={(e) => {
                  setPicked(i);
                  // Phones: bring a half-hidden card fully into the strip.
                  e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                }}
                className={`flex w-[78%] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent max-w-72 shrink-0 cursor-pointer flex-col gap-1 border-line px-4 py-3.5 text-left transition-colors md:w-auto md:max-w-none md:border-b md:border-l-[3px] md:last:border-b-0 border-r md:border-r-0 border-t-[3px] md:border-t-0 ${
                  on ? "border-t-accent bg-bg md:border-l-accent" : "border-t-transparent hover:bg-panel-2 md:border-l-transparent"
                }`}
              >
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{f.kind}</span>
                <span className="font-display text-[15px] leading-snug font-semibold text-ink">{f.question}</span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-5 px-4 py-5 sm:px-7 sm:py-6">
          <h3 aria-live="polite" className="font-display text-lg font-semibold text-balance text-ink">{flow.question}</h3>
          <ol className="flex flex-col">
            {flow.steps.map((s, n) => (
              <li key={s.title} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3.5 pb-4 last:pb-0">
                {n < flow.steps.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-line" />}
                <span className="relative grid size-7 place-items-center rounded-full border-2 border-accent bg-bg font-mono text-xs font-semibold text-accent">{n + 1}</span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-sm font-semibold text-ink">{s.title}</span>
                    <span className="rounded border border-line px-1.5 font-mono text-[11px] whitespace-nowrap text-ink-soft">{s.where}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-soft">{s.see}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-line pt-4">
            <p className="max-w-md text-sm text-ink">{flow.outcome}</p>
            <Link href={flow.cta.href} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
              {flow.cta.label} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
