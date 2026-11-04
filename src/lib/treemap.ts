// A squarified treemap (Bruls, Huizing & van Wijk): tiles with area proportional to a value, laid
// out in rows along the rectangle's shorter side so each tile stays close to square. Deterministic:
// the biggest value goes first (ties A to Z by key), whatever order the items come in.
//
// A minimum tile size keeps every label readable: values too small for it are raised to a floor
// (the rest shrink to make room, keeping their proportions), and the floor is raised until every
// tile is at least minW x minH. Tiny items share space rather than vanish.

export type TreemapItem = { key: string; value: number };
export type TreemapRect = { key: string; x: number; y: number; w: number; h: number; /** The value the tile was laid out at (raised to the floor if it was below it). */ area: number };

type Box = { x: number; y: number; w: number; h: number };

/** Values in, areas out: each scaled to the box's area, every one at least `floor` (water-filling). */
export function clampAreas(values: number[], total: number, floor: number): number[] {
  const n = values.length;
  if (!n) return [];
  if (floor * n >= total) return values.map(() => total / n);
  const v = values.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const fixed = new Set<number>();
  for (;;) {
    const free = total - fixed.size * floor;
    const sum = v.reduce((t, x, i) => (fixed.has(i) ? t : t + x), 0);
    // Nothing left with a value: the rest share what's left equally.
    if (sum <= 0) {
      const each = free / (n - fixed.size);
      return v.map((_, i) => (fixed.has(i) ? floor : each));
    }
    const k = free / sum;
    let grew = false;
    v.forEach((x, i) => {
      if (!fixed.has(i) && x * k < floor) {
        fixed.add(i);
        grew = true;
      }
    });
    if (!grew) return v.map((x, i) => (fixed.has(i) ? floor : x * k));
  }
}

// The worst aspect ratio in a row of areas laid along a side of length `side`.
function worst(row: number[], side: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = s * s;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

/** Squarify areas (already scaled to the box, biggest first) into the box. */
function squarify(areas: number[], box: Box): Box[] {
  const out: Box[] = [];
  let rest = { ...box };
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(rest.w, rest.h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) row.push(areas[j++]);
    // The last row takes the whole remaining box (no rounding sliver left over).
    const sum = row.reduce((a, b) => a + b, 0);
    const last = j >= areas.length;
    if (rest.w >= rest.h) {
      // A column on the left, as wide as its areas need.
      const cw = last ? rest.w : sum / rest.h;
      let y = rest.y;
      row.forEach((a, k) => {
        const h = k === row.length - 1 ? rest.y + rest.h - y : a / cw;
        out.push({ x: rest.x, y, w: cw, h });
        y += h;
      });
      rest = { x: rest.x + cw, y: rest.y, w: rest.w - cw, h: rest.h };
    } else {
      // A row along the top.
      const rh = last ? rest.h : sum / rest.w;
      let x = rest.x;
      row.forEach((a, k) => {
        const w = k === row.length - 1 ? rest.x + rest.w - x : a / rh;
        out.push({ x, y: rest.y, w, h: rh });
        x += w;
      });
      rest = { x: rest.x, y: rest.y + rh, w: rest.w, h: rest.h - rh };
    }
    i = j;
  }
  return out;
}

/**
 * Lays out `items` in a `width` x `height` rectangle, biggest first. With `minW`/`minH`, every
 * tile ends at least that size where the rectangle has room for it (the floor is raised step by
 * step; at worst every tile gets an equal share).
 */
export function treemap(items: TreemapItem[], width: number, height: number, { minW = 0, minH = 0 }: { minW?: number; minH?: number } = {}): TreemapRect[] {
  if (!items.length || width <= 0 || height <= 0) return [];
  const sorted = [...items].sort((a, b) => b.value - a.value || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const total = width * height;
  const fits = (rs: Box[]) => rs.every((r) => r.w >= minW - 1e-6 && r.h >= minH - 1e-6);
  let floor = minW * minH;
  let best: { areas: number[]; rects: Box[] } | null = null;
  for (let step = 0; step < 40; step++) {
    const areas = clampAreas(
      sorted.map((x) => x.value),
      total,
      floor,
    );
    // Raising the small ones to the floor keeps the order: still biggest first.
    const rects = squarify(areas, { x: 0, y: 0, w: width, h: height });
    best = { areas, rects };
    if (fits(rects) || floor * sorted.length >= total) break;
    floor = Math.min(total / sorted.length, Math.max(floor * 1.15, 1));
  }
  return sorted.map((it, i) => ({ key: it.key, ...best!.rects[i], area: best!.areas[i] }));
}
