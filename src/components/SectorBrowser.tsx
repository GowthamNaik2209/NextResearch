"use client";

import { useState } from "react";
import Link from "next/link";

type SectorCard = {
  slug: string;
  icon: string;
  name: string;
  tagline: string;
  category?: "sector" | "policy";
  muted?: boolean;
};
type ComingSoonSector = { icon: string; name: string; tagline: string; category?: "sector" | "policy" };

type Props = {
  sectors: SectorCard[];
  comingSoon: ComingSoonSector[];
};

export function SectorBrowser({ sectors, comingSoon }: Props) {
  const [tab, setTab] = useState<"sector" | "policy">("sector");

  const inTab = sectors.filter((s) => (s.category ?? "sector") === tab);
  const liveSectors = inTab.filter((s) => !s.muted);
  const mutedSectors = inTab.filter((s) => s.muted);
  const soonSectors = comingSoon.filter((s) => (s.category ?? "sector") === tab);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          {tab === "sector" ? "Explore a sector" : "Explore a policy"}
        </h2>
        <div className="inline-flex rounded-full border border-line bg-panel-2 p-1" role="tablist" aria-label="Browse by">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "sector"}
            onClick={() => setTab("sector")}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors " +
              (tab === "sector" ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")
            }
          >
            Sector
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "policy"}
            onClick={() => setTab("policy")}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors " +
              (tab === "policy" ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")
            }
          >
            Policy
          </button>
        </div>
      </div>

      {tab === "policy" && (
        <p className="mb-4 text-xs leading-relaxed text-ink-soft">
          Government and regulatory moves that create a direct, identifiable winner set of stocks — mapped the same
          way as a sector: pick the policy, explore the stack it benefits, then the companies in it.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {liveSectors.map((s) => (
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
        {mutedSectors.map((s) => (
          <div key={s.slug} className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 opacity-45">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-xs font-bold text-accent">
              {s.icon}
            </div>
            <h3 className="font-display text-base font-semibold text-ink">{s.name}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">{s.tagline}</p>
            <span className="mt-auto text-[10px] font-semibold uppercase tracking-wide text-accent">Coming soon</span>
          </div>
        ))}
        {soonSectors.map((s) => (
          <div key={s.name} className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 opacity-45">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel-2 font-mono text-xs font-bold text-accent">
              {s.icon}
            </div>
            <h3 className="font-display text-base font-semibold text-ink">{s.name}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">{s.tagline}</p>
            <span className="mt-auto text-[10px] font-semibold uppercase tracking-wide text-accent">Coming soon</span>
          </div>
        ))}
        {liveSectors.length === 0 && mutedSectors.length === 0 && soonSectors.length === 0 && (
          <p className="text-sm text-ink-soft">Nothing here yet — check back soon.</p>
        )}
      </div>
    </section>
  );
}
