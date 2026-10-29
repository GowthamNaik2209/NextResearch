"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { StockLink } from "@/components/stock/StockLink";

// One heatmap for every place that shows one: the Baskets page's theme wall (a tile per industry),
// a basket's Weights tab (a tile per stock, sized by weight) and an industry page's heatmap (a tile
// per listed stock, grouped by layer). Colour is the return: green up, red down, deeper the bigger
// the move, measured against the grid's own spread so one outlier doesn't wash the rest out. The
// tint stops short of a solid fill, so the ink text stays readable in light and dark.

export type HeatCell = {
  key: string;
  label: string;
  /** A second line under the figure (a weight, a stock count). */
  sub?: string;
  /** The return, %; null while it loads or where there is none. */
  value: number | null;
  /** Still loading: a shimmer instead of a dash. Defaults to loading whenever there is no value. */
  pending?: boolean;
  /** Size tier: 1 one cell, 2 two wide, 3 two by two, 4 three by two (phones: 1, 2, 3 and 4 wide, one row high). */
  size?: 1 | 2 | 3 | 4;
  title?: string;
  /** Opens the stock pop-up. */
  ticker?: string;
  href?: string;
  onClick?: () => void;
};

/** The move that takes most of the colour range: most of the grid's moves, at least 5%. */
export function heatScale(values: (number | null)[]): number {
  const abs = values.flatMap((v) => (v != null && Number.isFinite(v) ? [Math.abs(v)] : [])).sort((a, b) => a - b);
  if (!abs.length) return 10;
  return Math.max(5, abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.85))]);
}

// Moves up to the scale take 80% of the tint; bigger ones keep deepening up to four times the
// scale, so the biggest winners still stand apart without one outlier washing out the rest.
const depth = (abs: number, scale: number) => (abs <= scale ? (0.8 * abs) / scale : 0.8 + 0.2 * Math.min(1, Math.log(abs / scale) / Math.log(4)));

export function heatStyle(v: number | null, scale: number): CSSProperties {
  if (v == null || !Number.isFinite(v)) return { background: "var(--panel-2)" };
  const pct = Math.round(8 + depth(Math.abs(v), scale) * 42);
  return { background: `color-mix(in srgb, var(${v >= 0 ? "--pos" : "--danger"}) ${pct}%, var(--panel))` };
}

export const heatFmt = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1)}%`;

// On a phone the bigger tiles grow wider but stay one row high, so a long list stays short.
const SPAN = { 1: "", 2: "col-span-2", 3: "col-span-3 sm:col-span-2 sm:row-span-2", 4: "col-span-4 sm:col-span-3 sm:row-span-2" } as const;

/** The default grid: four across on a phone, six on a tablet, eight from desktop. */
export const HEAT_GRID = "grid grid-flow-row-dense grid-cols-4 auto-rows-[3.25rem] gap-1 sm:grid-cols-6 sm:auto-rows-[3.5rem] lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12";

export function HeatGrid({ cells, scale, className = HEAT_GRID, label }: { cells: HeatCell[]; scale: number; className?: string; label: string }) {
  return (
    <ul aria-label={label} className={className}>
      {cells.map((c) => (
        <li key={c.key} className={"min-w-0 " + SPAN[c.size ?? 1]}>
          <Tile cell={c} scale={scale} />
        </li>
      ))}
    </ul>
  );
}

function Tile({ cell: c, scale }: { cell: HeatCell; scale: number }) {
  const big = (c.size ?? 1) >= 3;
  const body: ReactNode = (
    <>
      <span className={"line-clamp-2 flex-none break-words font-semibold leading-[1.2] text-ink " + (big ? "text-xs sm:text-sm" : "text-[10px] sm:text-[11px]")}>{c.label}</span>
      <span className="mt-auto flex items-baseline justify-between gap-0.5 leading-none">
        <span className={"flex-none font-mono font-bold tabular-nums tracking-tight text-ink " + (big ? "text-sm sm:text-base" : "text-[11px] sm:text-xs")}>
          {c.value != null ? heatFmt(c.value) : (c.pending ?? true) ? <span aria-label="Loading" className="inline-block h-2.5 w-8 animate-pulse rounded bg-line/80 align-middle" /> : <span className="font-normal text-ink-soft">—</span>}
        </span>
        {c.sub && <span className="min-w-0 truncate text-[9px] tracking-tight text-ink-soft sm:text-[10px]">{c.sub}</span>}
      </span>
    </>
  );
  const cls = "flex h-full w-full flex-col overflow-hidden rounded-md border border-line/60 text-left transition hover:border-accent hover:ring-1 hover:ring-accent focus-visible:outline-2 focus-visible:outline-accent";
  const pad = " p-1 sm:p-1.5";
  const style = heatStyle(c.value, scale);
  const title = c.title ?? c.label;
  if (c.ticker)
    return (
      <StockLink ticker={c.ticker} title={title} className={cls}>
        <TileFill style={style}>{body}</TileFill>
      </StockLink>
    );
  if (c.href)
    return (
      <Link href={c.href} title={title} className={cls + pad} style={style}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={c.onClick} title={title} className={cls + pad} style={style}>
      {body}
    </button>
  );
}

// StockLink takes no style prop: the tint goes on an inner layer filling the link.
function TileFill({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <span style={style} className="flex min-h-0 flex-1 flex-col p-1 sm:p-1.5">
      {children}
    </span>
  );
}

/** The key under a grid: what the colour means and the size it tops out at. */
export function HeatLegend({ scale, note }: { scale: number; note?: ReactNode }) {
  const steps = [-1, -0.5, 0, 0.5, 1];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-soft sm:text-[11px]">
      <span className="flex items-center gap-1">
        <span aria-hidden className="h-2.5 w-4 rounded-sm border border-line/60" style={heatStyle(-scale * 4, scale)} />
        <span className="font-mono">{heatFmt(-scale)}</span>
        {steps.map((s) => (
          <span key={s} aria-hidden className="h-2.5 w-4 rounded-sm border border-line/60" style={heatStyle(s * scale, scale)} />
        ))}
        <span className="font-mono">{heatFmt(scale)}</span>
        <span aria-hidden className="h-2.5 w-4 rounded-sm border border-line/60" style={heatStyle(scale * 4, scale)} />
        <span>and beyond</span>
      </span>
      {note && <span>{note}</span>}
    </div>
  );
}
