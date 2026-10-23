"use client";

import type { ReactNode } from "react";
import { DASHARRAY, type Dash } from "./palette";

// The chart menus' controls: the pill that opens a menu ("Compare with 2", "Stocks 5") and the
// on/off rows inside it, each with the swatch of the line it draws.

export function MenuButton({ label, count, open, onClick }: { label: ReactNode; count: number; open: boolean; onClick: (el: HTMLButtonElement) => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e) => onClick(e.currentTarget)}
      className={
        "inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-full border px-4 text-sm font-semibold transition " +
        (open ? "border-accent bg-accent text-bg" : "border-line bg-bg text-ink hover:border-accent")
      }
    >
      {label}
      {/* Always laid out (hidden at 0), so the first pick doesn't widen the button, wrap the row
          and shift the open list under the next tap. */}
      <span aria-hidden={count === 0} className={"rounded-full px-1.5 font-mono text-[11px] " + (count === 0 ? "invisible " : "") + (open ? "bg-bg/25" : "bg-accent text-bg")}>
        {count}
      </span>
      <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className={"transition-transform " + (open ? "rotate-180" : "")}>
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function Switch({
  on,
  disabled,
  disabledTitle,
  onToggle,
  label,
  sub,
  swatch,
  trackColor,
}: {
  on: boolean;
  disabled?: boolean;
  /** Why it can't be switched on (the menu's limit), shown on hover. */
  disabledTitle?: string;
  onToggle: () => void;
  label: string;
  sub?: string;
  swatch?: { color: string; width: number; dash: Dash };
  trackColor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={sub ? `${label}, ${sub}` : label}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onToggle()}
      title={disabled ? disabledTitle : undefined}
      className={"flex min-h-11 w-full items-center gap-3 rounded-lg px-1.5 py-1 text-left transition " + (disabled ? "cursor-not-allowed opacity-45" : "hover:bg-bg/60")}
    >
      <span
        aria-hidden
        className={"relative h-5 w-9 shrink-0 rounded-full border transition-colors " + (on ? "border-transparent" : "border-line bg-bg")}
        style={on ? { background: trackColor ?? "var(--accent)" } : undefined}
      >
        <span className={"absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full shadow transition-all " + (on ? "left-[18px] bg-white" : "left-0.5 bg-ink-soft")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-balance break-words text-sm leading-snug text-ink">{label}</span>
        {sub && <span className="block truncate font-mono text-[10px] text-ink-soft">{sub}</span>}
      </span>
      {swatch && (
        <svg aria-hidden width="22" height="10" className="shrink-0">
          <line x1="2" y1="5" x2="20" y2="5" stroke={swatch.color} strokeWidth={swatch.width} strokeDasharray={DASHARRAY[swatch.dash]} strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
