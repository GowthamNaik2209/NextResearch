"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HeatTile, type HeatCell } from "./Heatmap";
import { treemap } from "@/lib/treemap";

// A heatmap whose tiles are sized by a weight (a market treemap): the landing page's industry &
// policy map, each tile as big as its core companies' market cap. The layout is a squarified
// treemap (lib/treemap.ts), biggest first, laid out for the box's measured size; every tile keeps
// a minimum size so its name and figure stay readable. Colour and tile body are the shared
// heatmap's (Heatmap.tsx).

export type WeightedHeatCell = HeatCell & { weight: number };

// The gap between tiles, px: each tile is inset by half of it, and the map is laid out on a box
// that much bigger than the frame, so the outer tiles sit flush with it.
const GAP = 4;
// Before the box is measured (the server render): a desktop-sized layout, in percentages.
const FALLBACK = { w: 1200, h: 460 };

/** The smallest tile that keeps a name and a return readable, by the map's width. */
const minTile = (w: number) => (w < 480 ? { minW: 64, minH: 48 } : w < 1000 ? { minW: 76, minH: 50 } : { minW: 96, minH: 54 });
/** Tiles at least this big get the bigger type. */
const BIG = { w: 150, h: 84 };

export function HeatTreemap({ cells, scale, label, className }: { cells: WeightedHeatCell[]; scale: number; label: string; /** The frame's height (and anything else): the map fills it. */ className: string }) {
  const box = useRef<HTMLUListElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : w > 0 && h > 0 ? { w, h } : s));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size ?? { w: FALLBACK.w + GAP, h: FALLBACK.h + GAP };
  const rects = useMemo(() => {
    const { minW, minH } = minTile(w - GAP);
    return treemap(
      cells.map((c) => ({ key: c.key, value: c.weight })),
      w,
      h,
      { minW: minW + GAP, minH: minH + GAP },
    );
  }, [cells, w, h]);
  const byKey = new Map(cells.map((c) => [c.key, c]));

  return (
    <div className={"relative " + className}>
      <ul ref={box} aria-label={label} className="absolute" style={{ inset: -GAP / 2 }}>
        {rects.map((r) => {
          const c = byKey.get(r.key)!;
          const big = r.w - GAP >= BIG.w && r.h - GAP >= BIG.h;
          return (
            <li
              key={r.key}
              className="absolute min-w-0"
              style={{ left: `${(r.x / w) * 100}%`, top: `${(r.y / h) * 100}%`, width: `${(r.w / w) * 100}%`, height: `${(r.h / h) * 100}%`, padding: GAP / 2 }}
            >
              <HeatTile cell={{ ...c, size: big ? 3 : 1 }} scale={scale} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
