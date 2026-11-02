import { test } from "node:test";
import assert from "node:assert/strict";
import { changeBasis, listingRange, rangeInterval, rollUp, startsInside, storedRange, toPoints, type StoredBar } from "./bars";
import type { ChartRange } from "@/lib/live/yahoo";

// "Today" for every fixture: Mon 2 Nov 2026. 1M starts 2 Oct, 1Y 1 Nov 2025, 3Y 29 Oct 2023, 5Y 29 Oct 2021.
const NOW = Date.parse("2026-11-02T10:00:00Z");
const ALL: ChartRange[] = ["1M", "6M", "1Y", "2Y", "3Y", "5Y", "MAX"];

const bar = (t: string, c: number): StoredBar => ({ t, o: c, h: c + 1, l: c - 1, c, v: 100 });
// Weekday daily bars from `from` to `to`, closing 100, 101, 102...
function weekdays(from: string, to: string): StoredBar[] {
  const out: StoredBar[] = [];
  for (let d = Date.parse(`${from}T00:00:00Z`); d <= Date.parse(`${to}T00:00:00Z`); d += 86_400_000) {
    const day = new Date(d).getUTCDay();
    if (day !== 0 && day !== 6) out.push(bar(new Date(d).toISOString().slice(0, 10), 100 + out.length));
  }
  return out;
}
const change = (pts: { c: number }[]) => pts[pts.length - 1].c / pts[0].c - 1;

test("listed inside 1M (JPL, 28 Oct 2026): every range starts on the listing day", () => {
  for (const r of ALL) {
    assert.equal(startsInside(r, "2026-10-28", "1d", NOW), true, r);
    // Daily bars are labelled "Since 28 Oct 2026" on every range, "All" included.
    assert.equal(changeBasis(r, "2026-10-28", "1d", NOW), "day", r);
  }
  // Yahoo's weekly bar is dated Mon 26 Oct, its monthly one 1 Oct: both still read as inside.
  assert.equal(startsInside("5Y", "2026-10-26", "1wk", NOW), true);
  assert.equal(startsInside("MAX", "2026-10-01", "1mo", NOW), true);
  // So the weekly ranges fall back to daily bars.
  assert.equal(rangeInterval("3Y", "1wk", "2026-10-28", NOW), "1d");
  assert.equal(rangeInterval("5Y", "1wk", "2026-10-28", NOW), "1d");
});

test("listed inside 1Y but before the 1M window (KARAMTARA, 17 Sep 2026)", () => {
  // 1M cuts a longer history: its first bar is the window's first trading day (Mon 5 Oct, after
  // Gandhi Jayanti and a weekend).
  assert.equal(changeBasis("1M", "2026-10-05", "1d", NOW), "range");
  for (const r of ["6M", "1Y", "2Y", "3Y", "5Y", "MAX"] as const) assert.equal(changeBasis(r, "2026-09-17", "1d", NOW), "day", r);
  assert.equal(rangeInterval("5Y", "1wk", "2026-09-17", NOW), "1d");
});

test("long history (LT): ranges keep their own bars and read 'Past ...'", () => {
  assert.equal(changeBasis("1M", "2026-10-05", "1d", NOW), "range");
  assert.equal(changeBasis("1Y", "2025-11-03", "1d", NOW), "range");
  assert.equal(changeBasis("2Y", "2024-11-04", "1d", NOW), "range");
  // Weekly bars dated at the week's start, on either side of the window's start.
  assert.equal(changeBasis("3Y", "2023-10-23", "1wk", NOW), "range");
  assert.equal(changeBasis("3Y", "2023-10-30", "1wk", NOW), "range");
  assert.equal(changeBasis("5Y", "2021-11-01", "1wk", NOW), "range");
  // "All" on monthly bars: since the first month, as before.
  assert.equal(changeBasis("MAX", "2002-07-01", "1mo", NOW), "month");
  assert.equal(startsInside("MAX", "2002-07-01", "1mo", NOW), false);
  // The store's daily bars from the 5Y window's first trading day stay weekly.
  assert.equal(rangeInterval("5Y", "1wk", "2021-11-01", NOW), "1wk");
  assert.equal(rangeInterval("3Y", "1wk", "2023-10-30", NOW), "1wk");
  assert.equal(rangeInterval("1Y", "1d", "2025-11-03", NOW), "1d");
});

test("a stock about four years old: 5Y and All start on the listing day, 3Y doesn't", () => {
  assert.equal(changeBasis("3Y", "2023-10-30", "1wk", NOW), "range");
  assert.equal(rangeInterval("5Y", "1wk", "2022-09-14", NOW), "1d");
  assert.equal(startsInside("MAX", "2022-09-01", "1mo", NOW), true);
});

test("store: a recent listing's 5Y bars start on its first day, with the same change as 6M", () => {
  const daily = weekdays("2026-09-17", "2026-10-30");
  const r = storedRange("5Y")!;
  const interval = rangeInterval("5Y", r.interval, daily[0].t, NOW);
  const five = toPoints(rollUp(daily, interval));
  assert.equal(five[0].t, "2026-09-17");
  assert.equal(five[0].c, 100);
  assert.equal(change(five), change(toPoints(daily)));
  // Rolled up weekly, the first bar is dated Mon 14 Sep (before the Thursday listing) with that week's
  // Friday close: the mismatch the fallback avoids.
  const weekly = toPoints(rollUp(daily, "1wk"));
  assert.deepEqual(weekly[0], { t: "2026-09-14", c: 101 });
  assert.notEqual(change(weekly), change(five));
});

test("store: a long history is rolled up weekly as before", () => {
  const daily = weekdays("2021-11-01", "2026-10-30");
  const interval = rangeInterval("5Y", "1wk", daily[0].t, NOW);
  assert.equal(interval, "1wk");
  assert.deepEqual(rollUp(daily, interval), rollUp(daily, "1wk"));
});

test("listingRange: a recent listing reads every longer range over the shortest daily one holding it", () => {
  // Karamtara (17 Sep 2026): 1M cuts it; 6M holds it, so 6M to 5Y all read 6M.
  assert.equal(listingRange("1M", "2026-09-17", NOW), "1M");
  for (const r of ["6M", "1Y", "2Y", "3Y", "5Y"] as ChartRange[]) assert.equal(listingRange(r, "2026-09-17", NOW), "6M", r);
  // JPL (28 Oct 2026): 1M holds it.
  for (const r of ["1M", "6M", "3Y", "5Y"] as ChartRange[]) assert.equal(listingRange(r, "2026-10-28", NOW), "1M", r);
  // Listed 3 Mar 2025: 2Y holds it, so 3Y and 5Y read 2Y; 1Y cuts it.
  assert.equal(listingRange("1Y", "2025-03-03", NOW), "1Y");
  assert.equal(listingRange("3Y", "2025-03-03", NOW), "2Y");
  assert.equal(listingRange("5Y", "2025-03-03", NOW), "2Y");
  // Waaree Energies (28 Oct 2024): just past 2Y's start, so 2Y cuts it and 3Y keeps its own.
  assert.equal(listingRange("3Y", "2024-10-28", NOW), "3Y");
  // Listed 2.5 years ago: no daily range holds it, so 3Y and 5Y keep their own.
  assert.equal(listingRange("3Y", "2024-05-02", NOW), "3Y");
  assert.equal(listingRange("5Y", "2024-05-02", NOW), "5Y");
  // A long history keeps every range.
  for (const r of ALL) assert.equal(listingRange(r, "2002-07-01", NOW), r, r);
});
