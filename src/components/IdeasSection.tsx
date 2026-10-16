"use client";

import { useState } from "react";
import Link from "next/link";
import type { Idea } from "@/lib/sector-content/insights";

export function IdeasSection({ ideas, asOf }: { ideas: Idea[]; asOf: string }) {
  const [id, setId] = useState(ideas[0]?.id);
  const idea = ideas.find((i) => i.id === id) ?? ideas[0];
  if (!idea) return null;
  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Ideas to start from</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Rule-based screens across every company we profile. Each shows its rule, so you can see exactly why a name is on the list.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-2 gap-y-3" role="tablist" aria-label="Idea screens">
        {ideas.map((i) => (
          <button
            key={i.id}
            type="button"
            role="tab"
            aria-selected={i.id === idea.id}
            onClick={() => setId(i.id)}
            className={
              "tap-target rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors " +
              (i.id === idea.id ? "border-accent bg-accent text-bg" : "border-line bg-panel text-ink-soft hover:text-ink")
            }
          >
            {i.title}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 text-xs text-ink-soft">
          <span>{idea.rule}</span>
          <span className="flex-none font-mono">{idea.metricLabel}</span>
        </div>
        <ul className="divide-y divide-line">
          {idea.rows.map((r, n) => (
            <li key={r.name}>
              <Link href={r.href} className="flex items-center gap-4 px-5 py-3 hover:bg-panel-2">
                <span className="w-5 font-mono text-xs text-ink-soft">{n + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.sector}</span>
                </span>
                <span className="font-mono text-sm font-semibold text-accent">{r.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[11px] text-ink-soft">
        Figures as of {asOf}, from public sources. These are screens on reported numbers, not recommendations.
      </p>
    </div>
  );
}
