import { test } from "node:test";
import assert from "node:assert/strict";
import { dayMoves } from "./run";

test("1D moves are all on the latest day nearly every stock has, not each stock's own last day", () => {
  const stored = (c: number[]) => [{ t: "2026-10-27", c: c[0] }, { t: "2026-10-28", c: c[1] }];
  const r = dayMoves([
    { ticker: "A", points: stored([100, 102]) },
    { ticker: "B", points: stored([50, 49]) },
    // Fetched live: it also has today's (29 Oct) bar, which must not be its 1D.
    { ticker: "C", points: [...stored([200, 210]), { t: "2026-10-29", c: 190 }] },
    { ticker: "D", points: null },
  ])!;
  assert.equal(r.dayOf, "2026-10-28");
  assert.equal(r.day.A.toFixed(1), "2.0");
  assert.equal(r.day.B.toFixed(1), "-2.0");
  assert.equal(r.day.C.toFixed(1), "5.0");
  assert.ok(!("D" in r.day));
  assert.equal(dayMoves([{ ticker: "X", points: null }]), null);
});

test("a top-up half done doesn't blank the stocks still on yesterday's close", () => {
  const upTo = (days: string[]) => days.map((t, i) => ({ t, c: 100 + i }));
  const today = ["2026-10-27", "2026-10-28", "2026-10-29"];
  const yday = today.slice(0, 2);
  // 6 of 10 already have today: not enough (80%), so every stock is shown for 28 Oct.
  const r = dayMoves(Array.from({ length: 10 }, (_, i) => ({ ticker: `S${i}`, points: upTo(i < 6 ? today : yday) })))!;
  assert.equal(r.dayOf, "2026-10-28");
  assert.equal(Object.keys(r.day).length, 10);
});
