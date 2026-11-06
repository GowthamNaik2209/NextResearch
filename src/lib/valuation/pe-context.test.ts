import { test } from "node:test";
import assert from "node:assert/strict";
import { bandOf, MIN_MONTHS, peHistory, versus } from "./pe-context";

// Month-end closes from Jun 2022 for `months` months, at a constant price unless `price` says otherwise.
function closes(months: number, price: (i: number) => number = () => 100) {
  const out: { t: string; c: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(2022, 5 + i + 1, 0)); // last day of the month
    out.push({ t: d.toISOString().slice(0, 10), c: price(i) });
  }
  return out;
}

test("P/E uses the fiscal year public on each date: FY y from 1 June y", () => {
  // Market cap 1000 at the last close; profit 50 in FY22..FY24, 100 in FY25 and FY26.
  const h = peHistory(closes(40), 1000, [50, 50, 50, 100, 100])!;
  assert.equal(h.from, "2022-06-30");
  // Jun 2022..May 2025 on profit 50 (P/E 20): 36 months; Jun 2025 on: 100 (P/E 10): 4 months.
  assert.equal(h.n, 40);
  assert.equal(h.median, 20);
  assert.ok(h.p10 < 20 && h.p10 >= 10);
});

test("a loss year has no P/E, and too few months gives no history", () => {
  assert.equal(peHistory(closes(40), 1000, [-5, 50, 50, 50, 50])!.n, 28); // Jun 2022..May 2023 dropped
  assert.equal(peHistory(closes(MIN_MONTHS - 1), 1000, [50, 50, 50, 50, 50]), null);
  assert.equal(peHistory(closes(40), null, [50, 50, 50, 50, 50]), null);
});

test("market cap then scales with the price", () => {
  // Price doubles over the period, profit flat: past P/Es are below today's 20.
  const h = peHistory(closes(30, (i) => 50 + (50 * i) / 29), 1000, [50, 50, 50, 50, 50])!;
  assert.ok(h.median < 20 && h.p90 <= 20);
  assert.equal(bandOf(20, h), "high");
  assert.equal(bandOf(h.median, h), "usual");
});

test("versus reads within 5% as in line", () => {
  assert.equal(versus(52, 50), "in line with");
  assert.equal(versus(40, 50), "20% below");
  assert.equal(versus(60, 50), "20% above");
});
