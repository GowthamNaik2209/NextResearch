"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// A small "i" button that opens a short explanation on tap or click (title tooltips never show on
// a phone). The note is fixed-positioned under the button and kept 16px inside the screen; a tap
// outside, Escape, a second tap or scrolling the page closes it (so it never slides under the
// sticky header).
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      const left = Math.max(16, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - 16 - width));
      setPos({ top: r.bottom + 6, left, width });
    };
    place();
    // A scroll inside the note itself is fine; the page scrolling closes it.
    const onScroll = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-line font-serif text-[11px] font-bold italic leading-none text-ink-soft before:absolute before:-inset-[9px] before:content-[''] hover:border-accent hover:text-ink aria-expanded:border-accent aria-expanded:text-accent"
      >
        i
      </button>
      {open && pos && (
        <div
          ref={box}
          id={id}
          role="note"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-50 rounded-md border border-line bg-panel p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg"
        >
          {children}
        </div>
      )}
    </>
  );
}
