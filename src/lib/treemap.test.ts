import { test } from "node:test";
import assert from "node:assert/strict";
import { clampAreas, treemap, type TreemapRect } from "./treemap";

const EPS = 1e-6;
const items = (vs: number[]) => vs.map((value, i) => ({ key: `m${String(i).padStart(2, "0")}`, value }));

function assertFills(rs: TreemapRect[], W: number, H: number) {
  const area = rs.reduce((t, r) => t + r.w * r.h, 0);
  assert.ok(Math.abs(area - W * H) < 1e-3 * W * H, `areas sum to the rectangle (${area} vs ${W * H})`);
  for (const r of rs) {
    assert.ok(r.x >= -EPS && r.y >= -EPS && r.x + r.w <= W + 1e-6 && r.y + r.h <= H + 1e-6, `${r.key} inside the rectangle`);
    assert.ok(r.w > 0 && r.h > 0, `${r.key} has a size`);
  }
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i];
      const b = rs[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(ox <= 1e-6 || oy <= 1e-6, `${a.key} and ${b.key} don't overlap`);
    }
}

test("tile areas are proportional to the values and fill the rectangle", () => {
  const vs = [60, 25, 10, 5];
  const rs = treemap(items(vs), 400, 300);
  assertFills(rs, 400, 300);
  const total = vs.reduce((a, b) => a + b, 0);
  for (const r of rs) {
    const v = vs[Number(r.key.slice(1))];
    assert.ok(Math.abs(r.w * r.h - (v / total) * 400 * 300) < 1e-3, `${r.key} area matches its share`);
  }
});

test("biggest first: the order is by value, ties A to Z, whatever the input order", () => {
  const a = treemap([{ key: "b", value: 1 }, { key: "a", value: 1 }, { key: "c", value: 5 }], 300, 200);
  assert.deepEqual(a.map((r) => r.key), ["c", "a", "b"]);
  assert.equal(a[0].x, 0);
  assert.equal(a[0].y, 0);
});

test("deterministic: the same layout for the same items, in any order", () => {
  const vs = [33.9, 25.1, 23.7, 21.4, 18.4, 17.4, 16.6, 12.1, 11.9, 9.9, 9.7, 8, 7.8, 7.4, 7, 5.9, 5.3, 4.2, 3.5, 2.9, 1.6];
  const one = treemap(items(vs), 1200, 460, { minW: 90, minH: 52 });
  const two = treemap(items(vs).reverse(), 1200, 460, { minW: 90, minH: 52 });
  assert.deepEqual(one, two);
  assert.deepEqual(one, treemap(items(vs), 1200, 460, { minW: 90, minH: 52 }));
});

test("every tile keeps the minimum size, and the map still fills the rectangle", () => {
  // A 20x spread, like the landing map's industries.
  const vs = [33.9, 25.1, 23.7, 21.4, 18.4, 17.4, 16.6, 12.1, 11.9, 9.9, 9.7, 8, 7.8, 7.4, 7, 5.9, 5.3, 4.2, 3.5, 2.9, 1.6];
  for (const [W, H, minW, minH] of [
    [1200, 460, 90, 52],
    [1850, 480, 90, 52],
    [720, 420, 72, 48],
    [310, 520, 60, 46],
  ]) {
    const rs = treemap(items(vs), W, H, { minW, minH });
    assert.equal(rs.length, vs.length);
    assertFills(rs, W, H);
    for (const r of rs) assert.ok(r.w >= minW - EPS && r.h >= minH - EPS, `${W}x${H}: ${r.key} is ${r.w.toFixed(1)}x${r.h.toFixed(1)}`);
    // The big ones still read bigger than the small ones.
    assert.ok(rs[0].w * rs[0].h > rs[rs.length - 1].w * rs[rs.length - 1].h);
  }
});

test("the floor raises the small values and keeps the rest in proportion", () => {
  const a = clampAreas([90, 9, 1], 100, 10);
  assert.ok(Math.abs(a.reduce((x, y) => x + y, 0) - 100) < EPS);
  assert.equal(a[2], 10);
  assert.ok(a[1] >= 10 - EPS);
  assert.ok(Math.abs(a[0] / a[1] - 10) < EPS || a[1] === 10);
  // No room for the floor: equal shares.
  assert.deepEqual(clampAreas([5, 1], 10, 6), [5, 5]);
});

test("too many tiles for the minimum: equal shares, still filling the rectangle", () => {
  const rs = treemap(items([100, 1, 1, 1]), 100, 100, { minW: 60, minH: 60 });
  assertFills(rs, 100, 100);
  for (const r of rs) assert.ok(Math.abs(r.w * r.h - 2500) < 1e-3);
});

test("nothing to lay out: no tiles", () => {
  assert.deepEqual(treemap([], 100, 100), []);
  assert.deepEqual(treemap(items([1]), 0, 100), []);
});
