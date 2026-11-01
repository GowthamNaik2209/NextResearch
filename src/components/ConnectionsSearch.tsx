"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { connectionRowId, type ConnectionsSearchEntry } from "@/lib/connections-search";

// Lower is better: exact name or ticker, then a name or ticker that starts with the term, then a
// word in the name that does ("power" -> "CG Power"), then anywhere in it, then the sub-line
// (a company's industries), so "steel" also finds companies that supply steel.
function score(e: ConnectionsSearchEntry, term: string): number {
  const l = e.label.toLowerCase();
  const t = e.kind === "company" ? e.ticker.toLowerCase() : "";
  if (l === term || t === term) return 0;
  if (l.startsWith(term) || (t && t.startsWith(term))) return 1;
  if (l.split(/[\s/&(),.-]+/).some((w) => w.startsWith(term))) return 2;
  if (l.includes(term)) return 3;
  if (term.length >= 2 && e.sub.toLowerCase().includes(term)) return 4;
  return 9;
}

const KIND_ORDER = { company: 0, sector: 1 } as const;
const KIND_LABEL = { company: "Company", sector: "Industry" } as const;
const FIRST = 8;

export function ConnectionsSearch({ index }: { index: ConnectionsSearchEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [all, setAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    return index
      .map((e) => ({ e, score: score(e, term) }))
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.e.label.localeCompare(b.e.label))
      .map((x) => x.e);
  }, [term, index]);
  const results = all ? matches : matches.slice(0, FIRST);
  const hidden = matches.length - results.length;
  const showList = open && term.length > 0;

  // Close on a click or tap anywhere outside the box and its results.
  useEffect(() => {
    if (!showList) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [showList]);

  // Company: scroll its row into view and flash it. Industry: open its page.
  const pick = (r: ConnectionsSearchEntry) => {
    setOpen(false);
    setActive(-1);
    if (r.kind === "sector") {
      router.push(r.href);
      return;
    }
    const row = document.getElementById(connectionRowId(r.ticker));
    if (!row) return;
    inputRef.current?.blur();
    // An instant jump: a smooth scroll down the long list outlasts the flash.
    row.scrollIntoView({ block: "center" });
    row.classList.remove("nr-row-flash");
    void row.offsetWidth; // restart the animation on a repeat pick
    row.classList.add("nr-row-flash");
    window.setTimeout(() => row.classList.remove("nr-row-flash"), 1800);
  };

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
      pick(results[active >= 0 ? active : 0]);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 shadow-sm focus-within:border-accent">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none text-ink-soft" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        {/* 16px on phones so iOS Safari does not zoom the page on focus. */}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
            setAll(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          placeholder="Search company or industry"
          role="combobox"
          aria-label="Search connected companies and industries"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          className="w-full min-w-0 bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setActive(-1);
              inputRef.current?.focus();
            }}
            className="-mr-2 flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-soft hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      {showList && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain">
            {results.length === 0 && (
              <li role="presentation" className="px-4 py-3 text-sm text-ink-soft">
                No match among connected companies — try a ticker or an industry name.
              </li>
            )}
            {results.map((r, i) => (
              <li key={r.key} id={optionId(i)} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => pick(r)}
                  onMouseEnter={() => setActive(i)}
                  className={"flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left " + (i === active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-panel-2")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{r.label}</span>
                    <span className="block truncate text-xs text-ink-soft">{r.sub}</span>
                  </span>
                  <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    {KIND_LABEL[r.kind]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="block w-full border-t border-line px-4 py-2.5 text-left text-xs font-semibold text-accent hover:bg-panel-2"
            >
              Show all {matches.length} results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
