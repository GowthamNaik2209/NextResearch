import { test } from "node:test";
import assert from "node:assert/strict";
import { fewPeersLine, peerClause, bandOf, MIN_MONTHS, peHistory, peerLine, peMedianLabel, peNote, versus } from "./pe-context";

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
  // Far above: a multiple, not "13297% above".
  assert.equal(versus(3376, 25.2), "134 times");
  assert.equal(versus(149, 50), "198% above");
});

test("a lender or an insurer is compared with covered companies of its own kind, and the text says so", () => {
  const ind = { slug: "energy", name: "Power", median: 20, n: 12 };
  assert.equal(peerLine(ind), "the median of 12 covered Power stocks");
  assert.equal(peerLine({ ...ind, slug: "lender", name: "Lenders", n: 22, group: "lender" as const }), "the median of 22 covered lenders (banks and NBFCs, across industries)");
  assert.equal(peerLine({ ...ind, slug: "insurer", name: "Insurers", n: 8, group: "insurer" as const }), "the median of 8 covered insurers (life and general, across industries)");
  assert.equal(peMedianLabel(ind), "Industry median");
  assert.equal(peMedianLabel({ ...ind, group: "lender" as const }), "Lenders’ median");
  assert.match(peNote(null), /primary industry/);
  assert.match(peNote("lender"), /covered lenders/);
  assert.doesNotMatch(peNote("insurer"), /primary industry/);
});

test("peerClause: one clause with no second bracket", () => {
  const base = { slug: "x", name: "Power", median: 15.5, n: 12 };
  assert.equal(peerClause(base, "15.5x"), "the median of 12 covered Power stocks: 15.5x");
  assert.equal(peerClause({ ...base, slug: "lender", n: 22, group: "lender" }, "15.5x"), "the median of 22 covered banks and NBFCs across industries: 15.5x");
  assert.equal(peerClause({ ...base, slug: "insurer", n: 8, group: "insurer" }, "39.6x"), "the median of 8 covered life and general insurers across industries: 39.6x");
  assert.ok(!/\)\s*[:(]/.test(peerClause({ ...base, group: "lender" }, "1x")));
});

test("too few peers with a P/E says how many and how many are needed", () => {
  assert.equal(fewPeersLine({ name: "Services (Nifty 50)", n: 1, min: 3 }), "Only 1 covered Services (Nifty 50) stock has a P/E (3 needed), so there is no industry median.");
  assert.equal(fewPeersLine({ name: "Power", n: 0, min: 5 }), "No covered Power stocks have a P/E (5 needed), so there is no industry median.");
  assert.equal(fewPeersLine({ name: "Covered lenders", n: 2, min: 5, group: "lender" }), "Only 2 covered lenders have a P/E (5 needed), so there is no peer median.");
});
