import { test } from "node:test";
import assert from "node:assert/strict";
import type { BasketStock } from "./industry";
import { MAX_BASKET_STOCKS } from "./limits";
import { initSelection, planAdd, selectionReducer as reduce, type SelectionState } from "./selection";
import { weightsTotal } from "./strategy";

const stock = (ticker: string): BasketStock => ({ ticker, name: ticker, mcapCr: 100, pe: 10, role: "", layer: "", industries: [], layerIn: {} });
const tickers = (s: SelectionState) => s.stocks.map((x) => x.ticker);
const chart = (picks: Record<string, number> = {}) => ({ benches: [], compare: [], picks });
const start = (list: string[], custom: Record<string, number> | null = null, picks: Record<string, number> = {}) =>
  initSelection({ stocks: list.map(stock), custom, chart: chart(picks) });

test("add de-duplicates, caps at the basket limit and reports what was asked", () => {
  let s = start(["A", "B"]);
  s = reduce(s, { type: "add", stocks: [stock("B"), stock("C"), stock("C"), stock("D")] });
  assert.deepEqual(tickers(s), ["A", "B", "C", "D"]);
  const many = Array.from({ length: 100 }, (_, i) => stock(`T${i}`));
  const plan = planAdd(s.stocks, many);
  assert.equal(plan.asked, 100);
  assert.equal(plan.fresh.length, MAX_BASKET_STOCKS - 4);
  s = reduce(s, { type: "add", stocks: many });
  assert.equal(s.stocks.length, MAX_BASKET_STOCKS);
  assert.equal(reduce(s, { type: "add", stocks: [stock("Z")] }), s);
});

test("remove drops the stock, its weight and its line; weights stay at 100", () => {
  let s = start(["A", "B", "C"], { A: 50, B: 30, C: 20 }, { A: 0, B: 1, C: 2 });
  s = reduce(s, { type: "choosePicks" });
  s = reduce(s, { type: "remove", ticker: "B" });
  assert.deepEqual(tickers(s), ["A", "C"]);
  assert.equal(s.custom!.B, undefined);
  assert.equal(weightsTotal(s.custom!), 100);
  assert.deepEqual(s.chart.picks, { A: 0, C: 2 });
  assert.equal(s.lastRemoved, "B");
});

test("a removed line passes on only while the lines are the page's defaults", () => {
  const s0 = start(["A", "B", "C"], null, { A: 0, B: 1 });
  const auto = reduce(s0, { type: "remove", ticker: "A" });
  assert.deepEqual(auto.chart.picks, { B: 1, C: 0 });
  const chosen = reduce(reduce(s0, { type: "choosePicks" }), { type: "remove", ticker: "A" });
  assert.deepEqual(chosen.chart.picks, { B: 1 });
});

test("add draws a line only before the reader has chosen picks", () => {
  const s0 = start(["A"], null, { A: 0 });
  assert.deepEqual(reduce(s0, { type: "add", stocks: [stock("B")] }).chart.picks, { A: 0, B: 1 });
  const chosen = reduce(reduce(s0, { type: "choosePicks" }), { type: "add", stocks: [stock("B")] });
  assert.deepEqual(chosen.chart.picks, { A: 0 });
});

test("undo puts the stock back where it was, with its weight and its line", () => {
  let s = start(["A", "B", "C"], { A: 50, B: 30, C: 20 }, { A: 0, B: 1, C: 2 });
  s = reduce(s, { type: "choosePicks" });
  const removed = reduce(s, { type: "remove", ticker: "B" });
  const back = reduce(removed, { type: "restore", ticker: "B" });
  assert.deepEqual(tickers(back), ["A", "B", "C"]);
  assert.deepEqual(back.custom, { A: 50, B: 30, C: 20 });
  assert.deepEqual(back.chart.picks, { A: 0, B: 1, C: 2 });
  assert.equal(back.lastRemoved, null);
  // Adding it back from the picker instead also brings back its %.
  const readded = reduce(removed, { type: "add", stocks: [stock("B")] });
  assert.equal(readded.custom!.B, 30);
  assert.equal(weightsTotal(readded.custom!), 100);
});

test("weights stay at 100 through removes and re-adds", () => {
  let s = start(["A", "B", "C", "D"], { A: 40, B: 30, C: 20, D: 10 });
  for (const t of ["A", "C"]) s = reduce(s, { type: "remove", ticker: t });
  assert.equal(weightsTotal(s.custom!), 100);
  s = reduce(s, { type: "add", stocks: [stock("E")] });
  s = reduce(s, { type: "restore", ticker: "A" });
  assert.equal(weightsTotal(s.custom!), 100);
  assert.deepEqual(Object.keys(s.custom!).sort(), tickers(s).sort());
});

test("removing the last stock leaves an empty basket with no weights or lines", () => {
  let s = start(["A"], { A: 100 }, { A: 0 });
  s = reduce(s, { type: "remove", ticker: "A" });
  assert.deepEqual(tickers(s), []);
  assert.deepEqual(s.custom, {});
  assert.deepEqual(s.chart.picks, {});
  s = reduce(s, { type: "restore", ticker: "A" });
  assert.deepEqual(tickers(s), ["A"]);
  assert.equal(weightsTotal(s.custom!), 100);
});

test("sync after a failed save brings the stock back with its line and weight; strays are pruned", () => {
  let s = start(["A", "B", "C"], { A: 50, B: 30, C: 20 }, { A: 0, B: 1, C: 2 });
  s = reduce(s, { type: "choosePicks" });
  s = reduce(s, { type: "remove", ticker: "B" });
  const known = new Map(["A", "B", "C", "D"].map((t) => [t, stock(t)] as const));
  const synced = reduce(s, { type: "sync", items: ["A", "B", "C", "GONE"], known });
  assert.deepEqual(tickers(synced), ["A", "B", "C"]);
  assert.deepEqual(synced.confirmed, ["A", "B", "C"]);
  assert.deepEqual(synced.unlisted, ["GONE"]);
  assert.deepEqual(synced.custom, { A: 50, B: 30, C: 20 });
  assert.deepEqual(synced.chart.picks, { A: 0, B: 1, C: 2 });
  assert.equal(synced.lastRemoved, null);
  // The server dropped C: its line and weight go too.
  const dropped = reduce(synced, { type: "sync", items: ["A", "B"], known });
  assert.deepEqual(dropped.chart.picks, { A: 0, B: 1 });
  assert.deepEqual(Object.keys(dropped.custom!).sort(), ["A", "B"]);
  assert.equal(weightsTotal(dropped.custom!), 100);
});

test("sync takes the server's weights when it sends a full set", () => {
  const s = start(["A", "B"], { A: 50, B: 50 });
  const known = new Map(["A", "B"].map((t) => [t, stock(t)] as const));
  assert.deepEqual(reduce(s, { type: "sync", items: ["A", "B"], known, weights: { A: 70, B: 30 } }).custom, { A: 70, B: 30 });
});

test("chart lines are kept only for stocks in the basket", () => {
  const s = start(["A", "B"]);
  const next = reduce(s, { type: "chart", next: (c) => ({ ...c, picks: { A: 0, X: 1 } }) });
  assert.deepEqual(next.chart.picks, { A: 0 });
});

test("a saved basket opens with where each stock was picked from, and keeps it through remove and Undo", () => {
  let s = initSelection({ stocks: [stock("BHARATFORG"), stock("TCS")], custom: null, chart: chart(), pickedFrom: { BHARATFORG: "ev4w", GONE: "ev4w" } });
  // Only stocks in the basket keep an entry.
  assert.deepEqual(s.pickedFrom, { BHARATFORG: "ev4w" });
  s = reduce(s, { type: "remove", ticker: "BHARATFORG" });
  assert.deepEqual(s.pickedFrom, {});
  s = reduce(s, { type: "restore", ticker: "BHARATFORG" });
  assert.deepEqual(s.pickedFrom, { BHARATFORG: "ev4w" });
});
