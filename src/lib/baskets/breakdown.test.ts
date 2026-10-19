import { test } from "node:test";
import assert from "node:assert/strict";
import { contributionHeadline, contributionRows, industryHeadline, industryRows, returnHeadline, returnRows, weightHeadline, weightRows } from "./breakdown";
import type { BacktestHolding } from "./backtest";

const h = (ticker: string, contribution: number, ret = contribution * 10, weight = 0.1, endWeight = 0.1): BacktestHolding => ({ ticker, contribution, ret, weight, endWeight });
const name = (t: string) => `${t} Ltd`;

test("contribution rows: top adders, the rest combined, biggest drag last", () => {
  const list = [h("A", 27.7), h("B", 10.2), h("C", 6.9), h("D", 5.6), h("E", 3.8), h("F", 1), h("G", 0.5), h("X", -1.1), h("Y", -1.3), h("Z", -1.4)];
  const rows = contributionRows(list);
  assert.deepEqual(
    rows.map((r) => (r.kind === "stock" ? r.ticker : r.kind === "group" ? r.label : "gap")),
    ["A", "B", "C", "D", "E", "2 others", "X", "Y", "Z"],
  );
  const others = rows[5];
  assert.ok(others.kind === "group" && Math.abs(others.value - 1.5) < 1e-9);
});

test("contribution rows: a short list is shown whole", () => {
  assert.equal(contributionRows([h("A", 1), h("B", -1)]).length, 2);
});

test("return rows keep the top and bottom of a long list", () => {
  const list = Array.from({ length: 15 }, (_, i) => h(`S${i}`, 0, i));
  const rows = returnRows(list, 6);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[3], { kind: "gap", count: 9 });
  assert.ok(rows[0].kind === "stock" && rows[0].ticker === "S14");
});

test("weight rows combine the tail and keep where it started", () => {
  const list = Array.from({ length: 10 }, (_, i) => h(`S${i}`, 0, 0, 0.1, (i + 1) / 55));
  const rows = weightRows(list, 4);
  assert.equal(rows.length, 5);
  const tail = rows[4];
  assert.ok(tail.kind === "group" && Math.abs(tail.start! - 60) < 1e-9);
});

test("industry rows sum contribution by industry", () => {
  const rows = industryRows([h("A", 3), h("B", 2), h("C", -1)], (t) => (t === "C" ? "Rail" : "EV"));
  assert.deepEqual(rows, [
    { kind: "group", label: "EV", count: 2, value: 5 },
    { kind: "group", label: "Rail", count: 1, value: -1 },
  ]);
  assert.equal(industryHeadline(rows, "the basket's"), "EV stocks added 5.0 of the basket's 4.0 points");
});

test("contribution headline names the few stocks that made half the return", () => {
  const list = [h("A", 27.7), h("B", 10.2), h("C", 26.1)];
  assert.equal(contributionHeadline(list, name, "the basket's"), "A Ltd and C Ltd added 53.8 of the basket's 64.0 points");
  assert.equal(contributionHeadline([h("A", 40), h("B", 10)], name, "the basket's"), "A Ltd added 40.0 of the basket's 50.0 points");
});

test("contribution headline for a fall names the biggest drag", () => {
  assert.equal(contributionHeadline([h("A", 1), h("B", -6)], name, "your picks'"), "B Ltd took away the most: −6.0 of your picks' −5.0 points");
});

test("return and weight headlines", () => {
  assert.equal(returnHeadline([h("A", 0, 10), h("B", 0, -4), h("C", 0, 2)], "1 year"), "2 of 3 stocks rose over the past 1 year; the middle one gained 2.0%");
  assert.equal(weightHeadline([h("A", 0, 0, 0.1, 0.25), h("B", 0, 0, 0.1, 0.05)], name), "A Ltd is now 25.0% of the basket, from 10.0% at the start");
});

test("contribution headline when the leader added more than the whole gain", () => {
  assert.equal(contributionHeadline([h("A", 7.6), h("B", -1.5)], name, "the basket’s"), "A Ltd added 7.6 points, more than the basket’s 6.1 in all");
});

test("return headline edge wording", () => {
  assert.equal(returnHeadline([h("A", 0, -1), h("B", 0, -3)], "1 month"), "None of the 2 stocks rose over the past 1 month; the middle one lost 2.0%");
  assert.equal(returnHeadline([h("A", 0, 5)], "1 year"), "The stock rose 5.0% over the past 1 year");
  assert.equal(weightHeadline([h("A", 0, 0, 0.5, 0.6), h("B", 0, 0, 0.5, 0.4)], name, "your picks"), "A Ltd is now 60.0% of your picks, from 50.0% at the start");
});
