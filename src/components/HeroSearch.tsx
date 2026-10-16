"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/sector-content/stats";

// Match on the label, the short-name aliases (ticker, "l&t") and the sub-line, in that order.
// Aliases count only as a whole match or, from three letters on, a prefix: "be" should not
// surface every company whose initials happen to start with B-E.
function score(e: SearchEntry, term: string): number {
  const l = e.label.toLowerCase();
  if (l.startsWith(term) || e.aliases?.includes(term)) return 0;
  if (l.includes(term) || (term.length >= 3 && e.aliases?.some((a) => a.startsWith(term)))) return 1;
  if (e.sub.toLowerCase().includes(term)) return 2;
  return 9;
}

// Themes (industries and policies) first, then IPOs, then companies.
const KIND_ORDER: Record<SearchEntry["kind"], number> = { sector: 0, ipo: 1, company: 2 };
const KIND_LABEL: Record<SearchEntry["kind"], string> = { sector: "Theme", ipo: "IPO", company: "Company" };

export function HeroSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (term.length < 2) return [];
    return index
      .map((e) => ({ e, score: score(e, term) }))
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind])
      .slice(0, 8)
      .map((x) => x.e);
  }, [term, index]);
  const showList = open && term.length >= 2;

  // Close on a click or tap anywhere outside the box and its results.
  useEffect(() => {
    if (!showList) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showList]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (showList) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!showList) setOpen(true);
      if (!results.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
      return;
    }
    if (e.key === "Enter" && showList && results.length) {
      e.preventDefault();
      const pick = results[active >= 0 ? active : 0];
      setOpen(false);
      router.push(pick.href);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-sm focus-within:border-accent">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none text-ink-soft" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        {/* 16px on phones so iOS Safari does not zoom the page on focus; the placeholder is
            short enough to fit a 360px screen at that size. */}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          placeholder="Company, theme or IPO, e.g. L&T"
          role="combobox"
          aria-label="Search companies, industries, policies and IPOs"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
          {results.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-sm text-ink-soft">
              No match — try a sector name, a ticker or part of a company name.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.href} id={optionId(i)} role="option" aria-selected={i === active}>
              <Link
                href={r.href}
                tabIndex={-1}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                className={"flex items-center justify-between gap-3 px-4 py-2.5 " + (i === active ? "bg-panel-2" : "hover:bg-panel-2")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{r.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.sub}</span>
                </span>
                <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                  {KIND_LABEL[r.kind]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
