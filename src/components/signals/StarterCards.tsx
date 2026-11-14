"use client";

import { BOOKS, type IdeaSet } from "@/lib/signals/books";
import { FIELD, ctlLabel } from "./ui";

// "Start from an idea": the ready-made rules as cards, each with the plain idea behind it, so a first
// visit starts from something that makes sense rather than an empty builder. The set on show is the
// site's popular ideas or one trading book's rules (BookPicker). The card whose rules are on screen
// is marked "In use" until the rules are edited.
export function StarterCards({ set, active, onPick }: { set: IdeaSet; active: string; onPick: (id: string) => void }) {
  return (
    <section aria-label="Start from an idea" className="flex flex-col gap-1.5">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{set.author ? `Start from ${set.author}'s rules` : "Start from an idea"}</h2>
      {set.author && (
        <p className="text-[11px] leading-snug text-ink-soft">
          From <i>{set.title}</i> ({set.year}): our versions of its rules for testing, not reviewed by the {set.author.includes(" and ") ? "authors" : "author"}. {set.adapted}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {set.ideas.map((p) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(p.id)}
              className={"relative flex min-w-0 flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left hover:bg-accent/10 " + (on ? "border-accent bg-accent/15 ring-2 ring-accent" : "border-btn bg-panel")}
            >
              <span className="flex w-full items-center justify-between gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">{p.idea}</span>
                {on && <span className="shrink-0 rounded bg-accent px-1.5 py-px text-[10px] font-semibold text-bg">✓ In use</span>}
              </span>
              <span className="text-sm font-semibold text-ink">{p.label}</span>
              <span title={p.note} className="line-clamp-3 text-[11px] leading-snug text-ink-soft">
                {p.note}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Which set of ideas the cards show: the popular ones, or a trading book's (title and author). */
export function BookPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={ctlLabel}>Rules from the books</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD + " w-full min-w-0 max-w-[26rem] font-sans"}>
        <option value="classic">Popular ideas</option>
        <optgroup label="Trading books">
          {BOOKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} · {b.author}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
