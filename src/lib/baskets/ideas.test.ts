import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIdeas, priceStat, type IdeaStockInfo, type PriceSnapshot } from "./ideas";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-19T12:00:00Z");
const ago = (d: number) => new Date(NOW - d * DAY).toISOString().slice(0, 10);
const near = (a: number | undefined, b: number) => assert.ok(a != null && Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("priceStat measures each lookback from the last close on or before its start", () => {
  const pts = [
    { t: ago(400), c: 50 },
    { t: ago(370), c: 80 }, // last close before the 1Y start
    { t: ago(360), c: 90 },
    { t: ago(100), c: 100 },
    { t: ago(0), c: 120 },
  ];
  const s = priceStat(pts, NOW)!;
  near(s.ret["1Y"], 50); // 80 -> 120
  near(s.ret["6M"], 33.33333333333333); // 90 -> 120
  assert.equal(s.ret["2Y"], undefined); // history starts 400 days ago
  near(s.sinceFirst, 140);
  assert.equal(s.first, ago(400));
});

test("priceStat accepts a history starting a few days after a lookback's start", () => {
  const s = priceStat([{ t: ago(1820), c: 10 }, { t: ago(0), c: 30 }], NOW)!;
  near(s.ret["5Y"], 200);
});

test("priceStat needs two closes", () => {
  assert.equal(priceStat([{ t: ago(1), c: 10 }], NOW), null);
});

const info = (ticker: string, o: Partial<IdeaStockInfo> = {}): IdeaStockInfo => ({ ticker, name: ticker, mcapCr: 5000, roce: null, industries: 1, scarce: null, ...o });
const snap = (stats: PriceSnapshot["stats"]): PriceSnapshot => ({ asOf: new Date(NOW).toISOString(), stats });
const st = (ret1y: number | undefined, firstDaysAgo = 2000) => ({ first: ago(firstDaysAgo), ret: ret1y == null ? {} : { "1Y": ret1y }, sinceFirst: 0 });

test("top performers rank by the period's return and average it", () => {
  const ideas = buildIdeas([info("A"), info("B"), info("C")], snap({ A: st(10), B: st(40), C: st(undefined) }), NOW);
  const top = ideas.find((i) => i.id === "top-1y")!;
  assert.deepEqual(top.stocks.map((s) => s.ticker), ["B", "A"]);
  near(top.ret ?? undefined, 25);
  assert.equal(top.range, "1Y");
  // No stock has 5-year history, so that idea is left out.
  assert.equal(ideas.find((i) => i.id === "top-5y"), undefined);
});

test("quality skips small and one-off companies", () => {
  const ideas = buildIdeas(
    [info("BIG", { roce: 30 }), info("SMALL", { roce: 90, mcapCr: 200 }), info("ONEOFF", { roce: 80, screenOut: true }), info("BEST", { roce: 50 })],
    snap({}),
    NOW,
  );
  assert.deepEqual(ideas.find((i) => i.id === "quality")!.stocks.map((s) => s.ticker), ["BEST", "BIG"]);
});

test("bottleneck plays put the scarcest layers first", () => {
  const sc = (listed: number, strength: number) => ({ listed, strength, layer: "L", industry: "I" });
  const ideas = buildIdeas([info("TWO", { scarce: sc(2, 3) }), info("ONE", { scarce: sc(1, 2) }), info("NONE")], snap({}), NOW);
  const b = ideas.find((i) => i.id === "bottlenecks")!;
  assert.deepEqual(b.stocks.map((s) => s.ticker), ["ONE", "TWO"]);
  assert.equal(b.stocks[0].stat, "sole listed name");
});

test("across industries needs three or more maps", () => {
  const ideas = buildIdeas([info("A", { industries: 2 }), info("B", { industries: 4 }), info("C", { industries: 3 })], snap({}), NOW);
  assert.deepEqual(ideas.find((i) => i.id === "cross-industry")!.stocks.map((s) => s.ticker), ["B", "C"]);
});

test("recent listings roll with today's date, newest first", () => {
  const ideas = buildIdeas([info("OLD"), info("NEW"), info("NEWER")], snap({ OLD: st(5, 900), NEW: st(5, 500), NEWER: st(undefined, 60) }), NOW);
  assert.deepEqual(ideas.find((i) => i.id === "recent-ipos")!.stocks.map((s) => s.ticker), ["NEWER", "NEW"]);
});
