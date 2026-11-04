"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";

/** One live 3D map in the switcher: just what the list shows (the explore page builds it on the server). */
export type MapListItem = { slug: string; name: string; category: "industry" | "policy" };

const GROUPS: { key: MapListItem["category"]; label: string }[] = [
  { key: "industry", label: "Industries" },
  { key: "policy", label: "Policies" },
];

// The explorer header's sector title, as a button that opens every live map (industries and
// policies) with a search box. A dropdown under the title from 640px up, a bottom sheet on phones
// (same markup; explorer.css switches the layout). Keyboard: type to filter, arrows to move,
// Enter to open, Esc to close; Tab stays inside while it is open.
export function MapSwitcher({ title, current, maps, initialOpen = false }: { title: string; current: string; maps: MapListItem[]; initialOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState("");
  // The highlighted row, by slug (starts on the current map); null = the first row.
  const [activeSlug, setActiveSlug] = useState<string | null>(current);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Grouped and filtered; `flat` is the keyboard order (Industries first, then Policies).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      items: maps.filter((m) => m.category === g.key && (!q || m.name.toLowerCase().includes(q) || m.slug.includes(q))).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [maps, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeIndex = Math.max(0, flat.findIndex((m) => m.slug === activeSlug));
  const setActive = (i: number) => setActiveSlug(flat[i]?.slug ?? null);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery("");
    setActiveSlug(current);
    // ?maps=1 (the landing page's "3D maps" button) opened it on arrival; once closed it is done.
    const params = new URLSearchParams(window.location.search);
    if (params.has("maps")) {
      params.delete("maps");
      const q = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
    }
    if (refocus) btnRef.current?.focus();
  };

  const choose = (slug: string) => {
    if (slug === current) return close();
    setOpen(false);
    router.push(`/sector/${slug}/explore`);
  };

  // On open: focus the search box (desktop) or the sheet itself (phones, so the keyboard doesn't
  // jump up over the list).
  useEffect(() => {
    if (!open) return;
    const phone = window.matchMedia("(max-width: 639px)").matches;
    if (phone) panelRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // A press outside closes it (the sheet's backdrop is outside the panel, so it counts).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      return close();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + flat.length) % flat.length);
      if (document.activeElement !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      if (document.activeElement === inputRef.current) return;
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : flat.length - 1);
      return;
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
      e.preventDefault();
      if (flat[activeIndex]) choose(flat[activeIndex].slug);
      return;
    }
    // Focus trap: Tab cycles between the panel's own controls.
    if (e.key === "Tab" && panelRef.current) {
      const els = [...panelRef.current.querySelectorAll<HTMLElement>("input, button:not([tabindex='-1'])")];
      if (!els.length) return;
      const i = els.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      els[(i + (e.shiftKey ? -1 : 1) + els.length) % els.length].focus();
    }
  };

  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-o${i}`;

  return (
    <div className="map-switch" ref={wrapRef}>
      <h1 className="map-title">
        <button
          ref={btnRef}
          type="button"
          className="map-switch-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? `${id}-panel` : undefined}
          title={`${title} - switch map`}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span className="t">{title}</span>
          <svg className="chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden>
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h1>
      {open && (
        <>
          <div className="map-switch-backdrop" aria-hidden />
          <div
            ref={panelRef}
            id={`${id}-panel`}
            className="map-switch-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Switch map"
            tabIndex={-1}
            onKeyDown={onKeyDown}
          >
            <div className="map-switch-grab" aria-hidden />
            <div className="map-switch-head">
              <span>Switch map</span>
              <button type="button" className="map-switch-close" aria-label="Close" onClick={() => close()}>
                &times;
              </button>
            </div>
            <input
              ref={inputRef}
              type="search"
              className="map-switch-search"
              placeholder="Search maps"
              aria-label="Search maps"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={flat.length ? optId(activeIndex) : undefined}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveSlug(null);
              }}
            />
            <div ref={listRef} id={listId} role="listbox" aria-label="Maps" className="map-switch-list">
              {groups.map((g) => (
                <div key={g.key} role="group" aria-labelledby={`${id}-${g.key}`}>
                  <div id={`${id}-${g.key}`} className="map-switch-group" role="presentation">
                    {g.label}
                  </div>
                  {g.items.map((m) => {
                    const i = flat.indexOf(m);
                    const isCurrent = m.slug === current;
                    return (
                      <div
                        key={m.slug}
                        id={optId(i)}
                        data-i={i}
                        role="option"
                        aria-selected={i === activeIndex}
                        aria-current={isCurrent ? "page" : undefined}
                        className={"map-switch-opt" + (i === activeIndex ? " active" : "") + (isCurrent ? " current" : "")}
                        onPointerMove={() => i !== activeIndex && setActive(i)}
                        onClick={() => choose(m.slug)}
                      >
                        <span className="nm">{m.name}</span>
                        {isCurrent && <span className="cur">Current</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
              {!flat.length && <p className="map-switch-empty">No maps match &ldquo;{query.trim()}&rdquo;.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
