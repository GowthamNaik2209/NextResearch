import assert from "node:assert/strict";
import { test } from "node:test";
import { monthsBefore, parsePeriod, periodStart } from "./periods";
import { bucketStart, cashView, sectorsView, stakeMoves } from "./query";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

test("periods start the right day and unknown values fall back to 1M", () => {
  const end = d("2026-10-30");
  assert.equal(iso(periodStart("1D", end)), "2026-10-30");
  assert.equal(iso(periodStart("1W", end)), "2026-10-24");
  assert.equal(iso(periodStart("1M", end)), "2026-10-01");
  assert.equal(iso(periodStart("1Y", end)), "2025-10-31");
  assert.equal(iso(periodStart("5Y", end)), "2021-10-31");
  // A month back from 31 Mar is the end of February, not 3 March.
  assert.equal(iso(monthsBefore(d("2026-03-31"), 1)), "2026-02-28");
  assert.equal(iso(monthsBefore(d("2026-09-30"), 60)), "2021-09-30");
  assert.equal(iso(monthsBefore(d("2026-09-30"), 6)), "2026-03-31"); // quarter end to quarter end
  assert.equal(parsePeriod("3y"), "3Y");
  assert.equal(parsePeriod("bogus"), "1M");
  assert.equal(parsePeriod(undefined), "1M");
});

test("cash flows add up over the period in day, week or month bars", () => {
  const days = [
    { day: d("2026-09-29"), fiiNetCr: -100, diiNetCr: 50 },
    { day: d("2026-10-26"), fiiNetCr: 10, diiNetCr: -5 }, // Monday
    { day: d("2026-10-27"), fiiNetCr: 20, diiNetCr: 5 },
    { day: d("2026-10-30"), fiiNetCr: 30, diiNetCr: 10 },
  ];
  const m = cashView(days, "1M")!;
  assert.equal(m.grain, "day");
  assert.deepEqual(m.total, { fiiNetCr: 60, diiNetCr: 10, sessions: 3 });
  // Every weekday of 1-30 Oct has a slot (22), only three have bars.
  assert.equal(m.bars.length, 22);
  assert.equal(m.bars.filter((b) => b.sessions).length, 3);
  assert.equal(cashView(days, "3M")!.grain, "day");
  const y = cashView(days, "1Y")!;
  assert.equal(y.grain, "week");
  assert.deepEqual(
    y.bars.filter((b) => b.sessions).map((b) => [iso(b.start), b.fiiNetCr, b.sessions]),
    [["2026-09-28", -100, 1], ["2026-10-26", 60, 3]],
  );
  assert.equal(iso(y.bars[0].start), "2025-10-27"); // the week of 31 Oct 2025: the axis spans the whole year
  assert.equal(iso(bucketStart(d("2026-11-01"), "week")), "2026-10-26"); // a Sunday belongs to Monday's week
  // History shorter than the period: the total covers what is stored, and says when it starts.
  assert.equal(iso(cashView(days, "5Y")!.firstStored), "2026-09-29");
});

test("stake changes compare the latest filing with the last one far enough back", () => {
  const f = (q: string, fii: number) => ({ quarter: d(q), fii, dii: 10 });
  const all = new Map([
    ["AAA", [f("2021-03-31", 5), f("2022-03-31", 6), f("2026-03-31", 8), f("2026-06-30", 9), f("2026-09-30", 10)]],
    // Filed only up to June: more than a quarter behind everyone else, so left out.
    ["OLD", [f("2025-12-31", 3), f("2026-03-31", 4)]],
  ]);
  const q = stakeMoves(all, "1M").get("AAA")!;
  assert.equal(iso(q.base), "2026-06-30"); // under three months: the quarter before
  assert.equal(q.dFii, 1);
  assert.equal(q.fiiStreak, 2); // up two quarters in a row (Mar -> Jun -> Sep)
  assert.equal(iso(stakeMoves(all, "6M").get("AAA")!.base), "2026-03-31");
  // Five years back from Sep 2026 is Sep 2021; the last filing by then is March 2021.
  const five = stakeMoves(all, "5Y").get("AAA")!;
  assert.equal(iso(five.base), "2021-03-31");
  assert.equal(five.dFii, 5);
  assert.equal(stakeMoves(all, "1M").has("OLD"), false);
});

test("sector flows add up the fortnights in the period; a short period shows the latest one", () => {
  const r = (end: string, sector: string, net: number) => ({ periodEnd: d(end), sector, netEquityCr: net });
  const rows = [r("2026-09-30", "IT", 100), r("2026-09-30", "Grand Total", 50), r("2026-10-15", "IT", -40), r("2026-10-15", "Grand Total", -10)];
  const w = sectorsView(rows, "1W", d("2026-10-30"))!;
  assert.equal(w.fortnights, 1);
  assert.equal(iso(w.from), "2026-10-01");
  assert.deepEqual(w.rows, [{ sector: "IT", netCr: -40 }]);
  const q = sectorsView(rows, "3M", d("2026-10-30"))!;
  assert.equal(q.fortnights, 2);
  assert.equal(q.totalCr, 40);
  assert.equal(q.clipped, true); // the stored fortnights start after the period does
});
