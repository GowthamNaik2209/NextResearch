"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchEntry } from "@/lib/sector-content/stats";

export function HeroSearch({ index }: { index: SearchEntry[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const scored = index
      .map((e) => {
        const l = e.label.toLowerCase();
        const score = l.startsWith(term) ? 0 : l.includes(term) ? 1 : e.sub.toLowerCase().includes(term) ? 2 : 9;
        return { e, score };
      })
      .filter((x) => x.score < 9)
      .sort((a, b) => a.score - b.score || (a.e.kind === "sector" ? -1 : 1));
    return scored.slice(0, 7).map((x) => x.e);
  }, [q, index]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-sm focus-within:border-accent">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none text-ink-soft">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a company, sector or policy — e.g. Kaynes, railways, ALMM"
          aria-label="Search companies, sectors and policies"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
      </div>
      {q.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">No match — try a sector name or part of a company name.</li>}
          {results.map((r) => (
            <li key={r.href + r.label}>
              <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-panel-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{r.label}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.sub}</span>
                </span>
                <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                  {r.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
