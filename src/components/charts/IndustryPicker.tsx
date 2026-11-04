"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { IndustryViewOption } from "./IndustryHeatmap";

// The industry picker in a full-screen view's header: the current industry's name as a button,
// opening a searchable list grouped into industries and policies (the current one marked). Picking
// one switches the view in place. Arrow keys move through the list, Enter on the search box takes
// the first match, Escape or a tap outside closes it.

const GROUPS: { id: IndustryViewOption["group"]; label: string }[] = [
  { id: "industry", label: "Industries" },
  { id: "policy", label: "Policies" },
  { id: "index", label: "Index" },
];

export function IndustryPicker({ options, current, onPick, openOnMount = false }: { options: IndustryViewOption[]; current: string; onPick: (slug: string) => void; /** Open with the search box focused (?pick=1). */ openOnMount?: boolean }) {
  const [open, setOpen] = useState(openOnMount);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const name = options.find((o) => o.slug === current)?.name ?? current;

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const shown = options.filter((o) => !needle || o.name.toLowerCase().includes(needle) || o.slug.includes(needle));
  const close = () => {
    setOpen(false);
    setQ("");
    btn.current?.focus();
  };
  const pick = (slug: string) => {
    close();
    if (slug !== current) onPick(slug);
  };
  const items = () => [...(list.current?.querySelectorAll<HTMLButtonElement>("button[data-opt]") ?? [])];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // Closes the list only: the full-screen view checks defaultPrevented before closing itself.
      e.preventDefault();
      return close();
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (at < 0 ? 0 : Math.min(all.length - 1, at + 1)) : at <= 0 ? -1 : at - 1;
    if (next < 0) input.current?.focus();
    else all[next]?.focus();
  };

  return (
    <div ref={box} className="relative min-w-0" onKeyDown={open ? onKey : undefined}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={"flex min-h-9 max-w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm font-semibold text-ink transition sm:min-h-10 sm:text-base " + (open ? "border-accent bg-accent/15" : "border-btn hover:bg-accent/10")}
      >
        <span className="truncate">{name}</span>
        <span aria-hidden className={"flex-none text-[10px] text-ink-soft transition-transform " + (open ? "rotate-180" : "")}>
          &#9662;
        </span>
      </button>
      {open && (
        <div id={id} className="absolute left-0 z-30 mt-1.5 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-lg border border-line bg-panel p-2 shadow-lg">
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) {
                e.preventDefault();
                pick(shown[0].slug);
              }
            }}
            placeholder="Search industries and policies"
            aria-label="Search industries and policies"
            className="min-h-9 w-full rounded-md border border-line bg-bg px-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none"
          />
          <ul ref={list} role="listbox" aria-label="Industries and policies" className="mt-1.5 max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain">
            {GROUPS.map((g) => {
              const opts = shown.filter((o) => o.group === g.id);
              if (!opts.length) return null;
              return (
                <li key={g.id} role="presentation">
                  <p className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft">{g.label}</p>
                  <ul role="presentation">
                    {opts.map((o) => {
                      const on = o.slug === current;
                      return (
                        <li key={o.slug} role="presentation">
                          <button
                            type="button"
                            data-opt
                            role="option"
                            aria-selected={on}
                            onClick={() => pick(o.slug)}
                            className={"flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-[13px] transition hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none " + (on ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")}
                          >
                            <span className="min-w-0 truncate">{o.name}</span>
                            {on && <span className="flex-none text-[10px] font-semibold uppercase tracking-wide text-accent">Current</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
            {!shown.length && <li className="px-2 py-3 text-xs text-ink-soft">No industry or policy matches &ldquo;{q.trim()}&rdquo;.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
