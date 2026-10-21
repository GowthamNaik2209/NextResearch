import type { ReactNode } from "react";

// The dense layout's building block on the basket pages: a flat panel (1px border, small radius)
// with a small-caps header line holding a title and, on the right, its controls. Everything on
// the baskets and backtest pages sits in one of these so the pages read as one terminal-like grid.
export const PANEL = "min-w-0 rounded-md border border-line bg-panel";
export const PANEL_TITLE = "truncate text-[10px] font-semibold uppercase tracking-wider text-ink-soft sm:text-[11px]";
/** A small segmented control inside a panel header (Table / Breakdown, All / Your picks). */
export const MINI_SEG = "inline-flex flex-none overflow-hidden rounded border border-line bg-bg";
export const miniSegBtn = (on: boolean) => "min-h-9 px-2 text-[11px] font-semibold sm:min-h-6 pointer-coarse:min-h-9 " + (on ? "bg-ink text-bg" : "text-ink-soft hover:text-ink");

export function Panel({
  title,
  tools,
  label,
  className = "",
  bodyClassName = "",
  children,
  as: Tag = "section",
  heading: H = "h3",
}: {
  title?: ReactNode;
  /** Controls on the right of the header line. */
  tools?: ReactNode;
  /** Accessible name when the title isn't plain text. */
  label?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  as?: "section" | "div";
  /** The title's heading level: h3 inside a page section, h2 when the panel is a section itself. */
  heading?: "h2" | "h3";
}) {
  return (
    <Tag aria-label={label ?? (typeof title === "string" ? title : undefined)} className={PANEL + " " + className}>
      {(title || tools) && (
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-line px-3 py-1">
          {title ? <H className={PANEL_TITLE}>{title}</H> : <span />}
          {tools && <div className="flex flex-wrap items-center gap-1.5">{tools}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}
