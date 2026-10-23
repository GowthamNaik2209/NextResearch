"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { LazyIpoDeck, intentProps, prefetchIpo, useForwardReopen } from "@/components/research/LazyDecks";
import { THEME_TAB_EVENT, type ThemeTab } from "@/components/research/ThemeCards";

export type ThemeRow = {
  key: string;
  icon: string;
  name: string;
  sub: string;
  /** Chip on the right: "3D map", an IPO's status, or "Coming soon". */
  chip: string;
  chipTone: "accent" | "live" | "soon";
  /** Absent for coming-soon rows. */
  href?: string;
  /** IPO rows open that deck here, on the landing page (href is the fallback without JS). Only
   *  set for an IPO that has a deck (buildHeroThemeRows). */
  ipoSlug?: string;
};

const TABS: { id: ThemeTab; label: string }[] = [
  { id: "sector", label: "Industries" },
  { id: "policy", label: "Policies" },
  { id: "ipo", label: "IPOs" },
];

const CHIP = {
  accent: "bg-accent/10 text-accent",
  live: "border border-pos/40 text-pos",
  soon: "border border-dashed border-line text-ink-soft",
} as const;

const scrollToThemes = () => document.getElementById("themes")?.scrollIntoView({ behavior: "smooth" });
// "Browse deep dives" always lands on every industry and policy, whatever tab the window is on.
const browseDeepDives = () => {
  window.dispatchEvent(new CustomEvent<ThemeTab | "all">(THEME_TAB_EVENT, { detail: "all" }));
  scrollToThemes();
};

// The hero's "Browse deep dives": scrolls to the Analysis block (#themes) every time (a bare
// #themes link does nothing once the URL already ends in #themes). It follows the window's tab.
export function BrowseThemesButton({ className }: { className: string }) {
  return (
    <button type="button" onClick={browseDeepDives} className={className}>
      Browse deep dives
    </button>
  );
}

// The hero's window onto the three themes: a few rows per tab and "Explore more", which scrolls
// to the Analysis block's Deep dive on the same tab. Picking a tab here also switches it, so the
// two never disagree. Theme rows open the theme's overview page; IPO rows open the deck on top
// of the landing page, and closing it leaves the reader where they were.
export function ThemeWindow({ rows }: { rows: Record<ThemeTab, ThemeRow[]> }) {
  const [tab, setTab] = useState<ThemeTab>("sector");
  const [openIpo, setOpenIpo] = useState<string | null>(null);
  const closeIpo = useCallback(() => setOpenIpo(null), []);

  // ?ipo=<slug> sits on the open deck's own history entry (Presentation's urlParam); browser
  // Forward onto that entry opens the deck again there (adopt).
  const [adopt, setAdopt] = useState(false);
  const ipoSlugs = rows.ipo.flatMap((r) => (r.ipoSlug ? [r.ipoSlug] : []));
  useForwardReopen(
    "ipo",
    openIpo,
    (slug) => ipoSlugs.includes(slug),
    (slug) => {
      setAdopt(true);
      setOpenIpo(slug);
    }
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pick = (t: ThemeTab) => {
    setTab(t);
    window.dispatchEvent(new CustomEvent<ThemeTab>(THEME_TAB_EVENT, { detail: t }));
  };
  // Arrow keys move between tabs (one Tab stop for the whole list).
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = TABS.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    pick(TABS[to].id);
    tabRefs.current[to]?.focus();
  };

  const exploreMore = (e: React.MouseEvent) => {
    e.preventDefault();
    pick(tab);
    scrollToThemes();
  };

  return (
    <div className="w-full min-w-0 max-w-xl rounded-2xl border border-line bg-panel p-4 shadow-xl sm:p-5 lg:max-w-none">
      <div role="tablist" aria-label="Themes" className="mb-4 inline-flex rounded-full border border-line bg-bg/60 p-1">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`theme-window-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="theme-window-rows"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => pick(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={"tap-target rounded-full px-4 py-1.5 text-xs font-semibold transition-colors " + (tab === t.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="theme-window-rows" role="tabpanel" aria-labelledby={`theme-window-tab-${tab}`}>
        <ul className="flex flex-col gap-2">
          {rows[tab].map((r, i) => {
            const body = (
              <>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line bg-bg font-mono text-[11px] font-bold text-accent">{r.icon}</span>
                <span className="min-w-0 flex-1">
                  {/* Wraps rather than truncating: "Data Center / AI Infras…" hid what the row was. */}
                  <span className="block text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{r.name}</span>
                  <span className="block text-xs text-ink-soft [overflow-wrap:anywhere]">{r.sub}</span>
                </span>
                <span className={"flex-none whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + CHIP[r.chipTone]}>{r.chip}</span>
              </>
            );
            // Phones show two rows per tab; the third joins from sm up.
            const cls = "flex items-center gap-3 rounded-lg border border-line px-3 py-2.5";
            return (
              <li key={r.key} className={i >= 2 ? "hidden sm:block" : undefined}>
                {r.href ? (
                  <Link
                    href={r.href}
                    onClick={(e) => {
                      if (!r.ipoSlug) return;
                      e.preventDefault();
                      setAdopt(false);
                      setOpenIpo(r.ipoSlug);
                    }}
                    {...(r.ipoSlug ? intentProps(() => prefetchIpo(r.ipoSlug!)) : {})}
                    aria-haspopup={r.ipoSlug ? "dialog" : undefined}
                    className={cls + " bg-panel-2 transition hover:border-accent"}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={cls + " border-dashed"}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Link
        href="/#themes"
        onClick={exploreMore}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-accent/60 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
      >
        Explore more <span aria-hidden>&rarr;</span>
      </Link>
      {openIpo && <LazyIpoDeck key={openIpo} slug={openIpo} onClose={closeIpo} urlParam="ipo" adoptHistoryEntry={adopt} />}
    </div>
  );
}
