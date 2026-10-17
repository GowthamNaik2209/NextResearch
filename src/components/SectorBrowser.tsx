"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IpoDeck } from "@/lib/ipo-content";
import { IpoGrid } from "@/components/ipo/IpoGrid";

type SectorCard = {
  slug: string;
  icon: string;
  name: string;
  tagline: string;
  category?: "sector" | "policy";
  muted?: boolean;
  zones: number;
  companies: number;
  listed: number;
  medianPe: number | null;
  medianRoce: number | null;
  combinedRevenueCr: number | null;
};
type ComingSoonSector = { icon: string; name: string; tagline: string; category?: "sector" | "policy" };

const fmtCr = (cr: number | null) =>
  cr == null ? "–" : cr >= 100000 ? `₹${(cr / 100000).toFixed(1)}L Cr` : `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;

// Shown as the Revenue stat's tooltip: what the sum does and does not include (insights.ts).
const REVENUE_NOTE =
  "Combined latest-year revenue of listed companies with a medium or high exposure to this industry or policy (company-wide figures). Lenders, enablers and low-exposure names are left out.";

type Props = {
  sectors: SectorCard[];
  comingSoon: ComingSoonSector[];
  ipos: IpoDeck[];
};

export type ThemeTab = "sector" | "policy" | "ipo";
type Tab = ThemeTab;
/** Fired by the hero's theme window ("Explore more") to open this section on the same tab. */
export const THEME_TAB_EVENT = "nr-theme-tab";
const TABS: { id: Tab; label: string; heading: string; blurb: string }[] = [
  {
    id: "sector",
    label: "Industries",
    heading: "Start with an industry",
    blurb: "Each industry is mapped as a supply chain — pick one to see the layers, who supplies them and which are listed.",
  },
  {
    id: "policy",
    label: "Policies",
    heading: "Start with a policy",
    blurb: "Government and regulatory moves that create an identifiable set of beneficiaries, mapped the same way as an industry.",
  },
  {
    id: "ipo",
    label: "IPOs",
    heading: "Start with an IPO",
    blurb: "The biggest issues in the pipeline and the latest large listings, each prospectus summarised as a ten-slide deck: the issue, the business, its numbers, peers and risks.",
  },
];

export function SectorBrowser({ sectors, comingSoon, ipos }: Props) {
  const [tab, setTab] = useState<Tab>("sector");
  // A shared IPO link (/?ipo=<slug>) lands on the IPOs tab with that deck open.
  const [initialIpo, setInitialIpo] = useState<string | undefined>();
  useEffect(() => {
    const slug = new URL(window.location.href).searchParams.get("ipo");
    if (!slug) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL on mount */
    setTab("ipo");
    setInitialIpo(slug);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    const onTab = (e: Event) => setTab((e as CustomEvent<Tab>).detail);
    window.addEventListener(THEME_TAB_EVENT, onTab);
    return () => window.removeEventListener(THEME_TAB_EVENT, onTab);
  }, []);
  const current = TABS.find((t) => t.id === tab)!;

  const inTab = sectors.filter((s) => (s.category ?? "sector") === tab);
  const liveSectors = inTab.filter((s) => !s.muted);
  const soonSectors = [...inTab.filter((s) => s.muted), ...comingSoon.filter((s) => (s.category ?? "sector") === tab)];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {current.heading}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{current.blurb}</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-panel p-1" role="tablist" aria-label="Browse by">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "tap-target rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:px-5 " +
                (tab === t.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "ipo" ? (
        <>
          <IpoGrid ipos={ipos} initial={initialIpo} />
          <p className="mt-4 text-xs text-ink-soft">
            Summaries of draft and red herring prospectuses plus public reporting; terms can change until the final prospectus. Not investment advice.{" "}
            <Link href="/ipos" className="ml-1 inline-flex items-center rounded-full border border-line px-3 py-1.5 font-semibold text-accent hover:border-accent">
              All IPOs &rarr;
            </Link>
          </p>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liveSectors.map((s) => (
            <Link
              key={s.slug}
              href={`/sector/${s.slug}`}
              className="group flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 font-mono text-xs font-bold text-accent">
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-ink-soft transition group-hover:text-accent">Open map &rarr;</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">{s.name}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{s.tagline}</p>
              <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3">
                {[
                  ["Revenue", fmtCr(s.combinedRevenueCr), REVENUE_NOTE],
                  ["Median P/E", s.medianPe != null ? `${s.medianPe.toFixed(1)}x` : "–"],
                  ["Median ROCE", s.medianRoce != null ? `${s.medianRoce.toFixed(1)}%` : "–"],
                ].map(([k, v, note]) => (
                  <div key={k} title={note}>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-soft">{k}</dt>
                    <dd className="font-mono text-sm font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2 font-mono text-[11px] text-ink-soft">
                <span><b className="text-ink">{s.zones}</b> layers</span>
                <span>·</span>
                <span><b className="text-ink">{s.companies}</b> companies</span>
                <span>·</span>
                <span><b className="text-ink">{s.listed}</b> listed</span>
              </div>
            </Link>
          ))}
          {soonSectors.map((s) => (
            <div key={s.name} className="flex flex-col gap-3 rounded-2xl border border-dashed border-line p-5 opacity-60">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel-2 font-mono text-xs font-bold text-ink-soft">{s.icon}</div>
              <h3 className="font-display text-lg font-semibold text-ink">{s.name}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{s.tagline}</p>
              <span className="mt-auto text-[10px] font-bold uppercase tracking-wide text-accent">Coming soon</span>
            </div>
          ))}
          {liveSectors.length === 0 && soonSectors.length === 0 && <p className="text-sm text-ink-soft">Nothing here yet — check back soon.</p>}
        </div>
      )}
    </div>
  );
}
