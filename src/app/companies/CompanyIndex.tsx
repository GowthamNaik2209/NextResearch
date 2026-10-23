"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type IndexCompany = { slug: string; name: string; sectors: string[] };

const letterOf = (name: string) => (/[A-Z]/i.test(name[0]) ? name[0].toUpperCase() : "#");
const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

// The A-Z list with a filter box and a sticky letter bar: 280 names ran ~7,900px with nothing to
// jump with. Every company is still in the server HTML (crawlers read the whole list); filtering
// only hides rows. The filter matches the name or a theme ("defence" finds every defence name).
export function CompanyIndex({ companies }: { companies: IndexCompany[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = useMemo(
    () => (term ? companies.filter((c) => c.name.toLowerCase().includes(term) || c.sectors.some((s) => s.toLowerCase().includes(term))) : companies),
    [companies, term]
  );
  const byLetter = useMemo(() => {
    const m = new Map<string, IndexCompany[]>();
    for (const c of shown) m.set(letterOf(c.name), [...(m.get(letterOf(c.name)) ?? []), c]);
    return m;
  }, [shown]);

  return (
    <>
      {/* Sticks under the site header (57px tall) while the list scrolls. The letter headings'
          scroll-margin clears header + this bar (two rows on phones), so a jump lands in view. */}
      <div className="sticky top-[57px] z-30 -mx-5 flex flex-col gap-2 border-b border-line bg-bg/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or theme"
          aria-label="Filter companies by name or theme"
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base text-ink outline-none placeholder:text-ink-soft focus:border-accent sm:w-64 sm:flex-none sm:text-sm"
        />
        <nav aria-label="Jump to letter" className="-mx-1 flex gap-0.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          {LETTERS.map((l) =>
            byLetter.has(l) ? (
              <a key={l} href={`#letter-${l === "#" ? "num" : l}`} className="tap-target flex h-7 min-w-7 flex-none items-center justify-center rounded-md font-mono text-xs font-semibold text-accent hover:bg-panel-2">
                {l}
              </a>
            ) : (
              <span key={l} aria-hidden className="flex h-7 min-w-7 flex-none items-center justify-center font-mono text-xs text-ink-soft/50">
                {l}
              </span>
            )
          )}
        </nav>
      </div>
      {term && (
        <p className="text-xs text-ink-soft" role="status">
          {shown.length === 0 ? `No company matches “${q.trim()}”.` : `${shown.length} of ${companies.length} companies`}
        </p>
      )}
      {[...byLetter.entries()].map(([letter, list]) => (
        <section key={letter} id={`letter-${letter === "#" ? "num" : letter}`} className="scroll-mt-[200px] sm:scroll-mt-[140px]">
          <h2 className="font-display text-lg font-bold text-accent">{letter}</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <li key={c.slug} className="text-sm">
                <Link href={`/company/${c.slug}`} className="tap-y font-semibold text-ink hover:text-accent hover:underline">
                  {c.name}
                </Link>
                <span className="block text-xs text-ink-soft">{c.sectors.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
