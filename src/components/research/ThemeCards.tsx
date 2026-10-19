"use client";

import Link from "next/link";

// The Analysis "Deep dive" view: one card per industry or policy (it used to be the landing page's
// Themes grid). The card opens the industry's page; its Charts button switches the Analysis block
// to that industry's chart in place.
export type SectorCard = {
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
export type ComingSoonSector = { icon: string; name: string; tagline: string; category?: "sector" | "policy" };

export type ThemeTab = "sector" | "policy" | "ipo";
/** Fired by the hero's theme window to open the Analysis block's Deep dive on a tab ("all" from "Browse deep dives"). */
export const THEME_TAB_EVENT = "nr-theme-tab";

const fmtCr = (cr: number | null) =>
  cr == null ? "–" : cr >= 100000 ? `₹${(cr / 100000).toFixed(1)}L Cr` : `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;

// Shown as the Revenue stat's tooltip: what the sum does and does not include (insights.ts).
const REVENUE_NOTE =
  "Combined latest-year revenue of listed companies with a medium or high exposure to this industry or policy (company-wide figures). Lenders, enablers and low-exposure names are left out.";

export function ThemeCards({
  sectors,
  comingSoon,
  filter,
  onCharts,
}: {
  sectors: SectorCard[];
  comingSoon: ComingSoonSector[];
  filter: "all" | "sector" | "policy";
  onCharts: (slug: string) => void;
}) {
  const inTab = sectors.filter((s) => filter === "all" || (s.category ?? "sector") === filter);
  const live = inTab.filter((s) => !s.muted);
  const soon = [...inTab.filter((s) => s.muted), ...comingSoon.filter((s) => filter === "all" || (s.category ?? "sector") === filter)];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {live.map((s) => (
        // The whole card opens the industry's page (the title link stretches over it); the Charts
        // button sits above that overlay and shows the industry's chart instead.
        <div
          key={s.slug}
          className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 font-mono text-xs font-bold text-accent">{s.icon}</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onCharts(s.slug)}
                className="relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent px-3 text-xs font-semibold text-accent transition hover:bg-accent hover:text-bg"
              >
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 10l3.5-4 2.5 2.5L11 3" />
                </svg>
                Charts
              </button>
              <span className="text-xs font-semibold text-ink-soft transition group-hover:text-accent">Open overview &rarr;</span>
            </div>
          </div>
          <h3 className="font-display text-lg font-semibold text-ink">
            <Link href={`/sector/${s.slug}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
              {s.name}
            </Link>
          </h3>
          <p className="text-sm leading-relaxed text-ink-soft">{s.tagline}</p>
          <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3">
            {[
              ["Revenue", fmtCr(s.combinedRevenueCr), REVENUE_NOTE],
              ["Median P/E", s.medianPe != null ? `${s.medianPe.toFixed(1)}x` : "–"],
              ["Median ROCE", s.medianRoce != null ? `${s.medianRoce.toFixed(1)}%` : "–"],
            ].map(([k, v, note]) => (
              <div key={k} title={note} className={note ? "relative z-10" : undefined}>
                <dt className="text-[10px] uppercase tracking-wide text-ink-soft">{k}</dt>
                <dd className="font-mono text-sm font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-2 font-mono text-[11px] text-ink-soft">
            <span>
              <b className="text-ink">{s.zones}</b> layers
            </span>
            <span>·</span>
            <span>
              <b className="text-ink">{s.companies}</b> companies
            </span>
            <span>·</span>
            <span>
              <b className="text-ink">{s.listed}</b> listed
            </span>
          </div>
        </div>
      ))}
      {soon.map((s) => (
        <div key={s.name} className="flex flex-col gap-3 rounded-2xl border border-dashed border-line p-5 opacity-60">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel-2 font-mono text-xs font-bold text-ink-soft">{s.icon}</div>
          <h3 className="font-display text-lg font-semibold text-ink">{s.name}</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{s.tagline}</p>
          <span className="mt-auto text-[10px] font-bold uppercase tracking-wide text-accent">Coming soon</span>
        </div>
      ))}
      {live.length === 0 && soon.length === 0 && <p className="text-sm text-ink-soft">Nothing here yet. Check back soon.</p>}
    </div>
  );
}
