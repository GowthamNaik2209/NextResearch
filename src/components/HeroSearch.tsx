"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/sector-content/stats";
import { askAssistant } from "./AssistantWidget";
import type { Suggestion } from "@/lib/assistant/suggest";

// Lower is better. The label leads: an exact name, then a name that starts with the term, then
// one with a word that does ("steel" -> "Tata Steel"), then anywhere in it. Aliases (ticker,
// "l&t") count as a whole match or, from three letters on, a prefix: "be" should not surface every
// company whose initials happen to start with B-E. The sub-line (sector names) comes last.
function score(e: SearchEntry, term: string): number {
  const l = e.label.toLowerCase();
  if (l === term || e.aliases?.includes(term)) return 0;
  if (l.startsWith(term)) return 1;
  if (l.split(/[\s/&(),.-]+/).some((w) => w.startsWith(term))) return 2;
  if (l.includes(term) || (term.length >= 3 && e.aliases?.some((a) => a.startsWith(term)))) return 3;
  if (e.sub.toLowerCase().includes(term)) return 4;
  return 9;
}

// Within a score: themes (industries and policies), then IPOs, then companies (listed first); then A-Z.
const KIND_ORDER: Record<SearchEntry["kind"], number> = { sector: 0, ipo: 1, company: 2 };
const KIND_LABEL: Record<SearchEntry["kind"], string> = { sector: "Theme", ipo: "IPO", company: "Company" };
// Listed companies before unlisted ones in the same tier: "tata" should lead with Tata Steel and
// Tata Motors, not Tata 1mg. The index marks unlisted companies in the sub-line (buildSearchIndex).
const unlisted = (e: SearchEntry) => (e.kind === "company" && e.sub.startsWith("Unlisted") ? 1 : 0);
/** Results shown before "Show all": enough to scan, short enough to fit under the box on a phone. */
const FIRST = 8;
// Text that reads as a question rather than a name gets an "Ask AI" row on top, which Enter picks:
// a question mark, a question word first, or three words or more ("hal vs bel valuation").
const QUESTION = /^(what|which|who|whom|how|why|when|where|is|are|was|does|do|did|can|could|should|will|compare|tell|show|list|explain)\b/;
// One row of the dropdown, in keyboard order.
type Row =
  | { type: "ask"; text: string }
  | { type: "question"; text: string }
  | { type: "page"; label: string; sub: string; href: string; badge: string };

const SPARKLE = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="flex-none text-accent" aria-hidden>
    <path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L13 17.5 12 13l-4.8-1.4L12 9.6z" />
    <path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);
const QUESTIONS_SHOWN = 3;

const isQuestion = (t: string) => t.length >= 6 && (t.includes("?") || QUESTION.test(t) || t.split(/\s+/).length >= 3);

export function HeroSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // "Show all N results" lifts the cap until the term changes.
  const [all, setAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const term = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (term.length < 2) return [];
    return index
      .map((e) => ({ e, score: score(e, term) }))
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || unlisted(a.e) - unlisted(b.e) || a.e.label.localeCompare(b.e.label))
      .map((x) => x.e);
  }, [term, index]);
  const results = all ? matches : matches.slice(0, FIRST);
  const askable = isQuestion(term);

  // Suggestions from our data for what was typed (/api/assistant/suggest: the pages the words
  // point to and questions about them), fetched a moment after typing stops.
  const [sugg, setSugg] = useState<{ term: string; s: Suggestion } | null>(null);
  useEffect(() => {
    if (term.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/assistant/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Suggestion>) : Promise.reject()))
        .then((s) => setSugg({ term, s }))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);
  const s = sugg && sugg.term === term ? sugg.s : null;

  // A question leads with Ask AI, then suggested questions and the pages it names; a name leads
  // with the matching pages, so Enter still opens HAL when "hal" is typed.
  const rows = useMemo((): Row[] => {
    const shown = new Set(results.map((r) => r.href));
    const questions: Row[] = (s?.questions ?? [])
      .filter((x) => x.toLowerCase() !== term)
      .slice(0, QUESTIONS_SHOWN)
      .map((text) => ({ type: "question", text }));
    const pages: Row[] = (s?.pages ?? [])
      .filter((p) => !shown.has(p.href))
      .map((p) => ({ type: "page", label: p.title, sub: p.kind === "Guide" ? "How NextResearch works" : p.kind, href: p.href, badge: p.kind }));
    const names: Row[] = results.map((r) => ({ type: "page", label: r.label, sub: r.sub, href: r.href, badge: KIND_LABEL[r.kind] }));
    return askable ? [{ type: "ask", text: q.trim() }, ...questions, ...pages, ...names] : [...names, ...pages, ...questions];
  }, [askable, q, results, s, term]);
  const total = rows.length;
  const pick = (row: Row) => {
    setOpen(false);
    if (row.type === "page") router.push(row.href);
    else askAssistant(row.text);
  };
  const hidden = matches.length - results.length;
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
      if (!total) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + total) % total);
      return;
    }
    if (e.key === "Enter" && showList && total) {
      e.preventDefault();
      pick(rows[active >= 0 ? active : 0]);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  // Keep the arrow-key highlight in view once the list scrolls ("Show all").
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 shadow-sm focus-within:border-accent">
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
            setAll(false);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          placeholder="Search or ask, e.g. HAL vs BEL"
          role="combobox"
          aria-label="Search companies, industries, policies and IPOs, or ask a question"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          className="w-full min-w-0 bg-transparent py-3 text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {showList && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
        <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain">
          {total === 0 && (
            <li role="presentation" className="px-4 py-3 text-sm text-ink-soft">
              No match — try a sector name, a ticker or part of a company name.
            </li>
          )}
          {rows.map((row, i) => {
            const cls =
              "flex w-full items-center gap-3 px-4 py-2.5 text-left " +
              (i === active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-panel-2") +
              (row.type !== "page" && rows[i + 1]?.type === "page" ? " border-b border-line" : "");
            return (
              <li key={`${row.type}:${row.type === "page" ? row.href : row.text}`} id={optionId(i)} role="option" aria-selected={i === active}>
                {row.type === "page" ? (
                  <Link href={row.href} tabIndex={-1} onClick={() => setOpen(false)} onMouseEnter={() => setActive(i)} className={cls + " justify-between"}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{row.label}</span>
                      <span className="block truncate text-xs text-ink-soft">{row.sub}</span>
                    </span>
                    <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">{row.badge}</span>
                  </Link>
                ) : (
                  <button type="button" tabIndex={-1} onClick={() => pick(row)} onMouseEnter={() => setActive(i)} className={cls}>
                    {SPARKLE}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{row.type === "ask" ? <>Ask AI: &ldquo;{row.text}&rdquo;</> : row.text}</span>
                      <span className="block truncate text-xs text-ink-soft">{row.type === "ask" ? "Answered from NextResearch data" : "Suggested question"}</span>
                    </span>
                  </button>
                )}
              </li>
            );
          })}
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
