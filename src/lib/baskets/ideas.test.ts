import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIdeas, priceStat, sinceRange, withBacktestReturns, type IdeaStockInfo, type PriceSnapshot } from "./ideas";
import { runBacktest } from "./backtest";

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

test("quality skips small and one-off companies, and those where ROCE isn't meaningful", () => {
  const ideas = buildIdeas(
    [
      info("BIG", { roce: 30, pe: 20 }),
      info("SMALL", { roce: 90, pe: 20, mcapCr: 200 }),
      info("ONEOFF", { roce: 80, pe: 20, outlier: true }),
      info("BEST", { roce: 50, pe: 20, book: 120 }),
      // Loss-making on negative equity: a high ROCE that means nothing.
      info("NOPE", { roce: 56, pe: null, book: -40, np: [-900, -800, -700, -600, -500] }),
      info("NEGBOOK", { roce: 70, pe: 12, book: -5 }),
      info("LOSS", { roce: 60, pe: 30, np: [10, 10, 10, 10, -5] }),
    ],
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

test("recent listings roll with today's date, newest first, backtested from each listing", () => {
  const ideas = buildIdeas([info("OLD"), info("NEW"), info("NEWER")], snap({ OLD: st(5, 900), NEW: st(5, 500), NEWER: st(undefined, 60) }), NOW);
  const ipo = ideas.find((i) => i.id === "recent-ipos")!;
  assert.deepEqual(ipo.stocks.map((s) => s.ticker), ["NEWER", "NEW"]);
  assert.equal(ipo.joinAtListing, true);
  // The earliest listing (500 days ago) needs the 2-year range to be in it from its first day.
  assert.equal(ipo.range, "2Y");
});

test("sinceRange picks the shortest range reaching back to the earliest listing", () => {
  assert.equal(sinceRange(ago(20), NOW), "1M");
  assert.equal(sinceRange(ago(100), NOW), "6M");
  assert.equal(sinceRange(ago(300), NOW), "1Y");
  assert.equal(sinceRange(ago(700), NOW), "2Y");
});

test("a recent listings card says since listing and shows each stock's return since its listing", () => {
  const ideas = buildIdeas([info("NEW")], snap({ NEW: st(undefined, 100) }), NOW);
  const [ipo] = withBacktestReturns(
    ideas.filter((i) => i.id === "recent-ipos"),
    { "recent-ipos": { ret: 12, holdings: [{ ticker: "NEW", ret: 12 }] } },
  );
  assert.equal(ipo.retLabel, "since listing");
  assert.match(ipo.stocks[0].stat, /^listed .+ · \+12\.0%$/);
});

test("the company-figure screens join the ideas, past-year backtested", () => {
  const fin = { pe: 15, roce: 25, rev: [1000, 1200, 1400, 1600, 1800], np: [100, 150, 200, 300, 400] };
  const ideas = buildIdeas([info("Q", fin)], snap({ Q: st(10) }), NOW);
  const c = ideas.find((i) => i.id === "compounders")!;
  assert.deepEqual(c.stocks.map((s) => s.ticker), ["Q"]);
  assert.equal(c.range, "1Y");
  near(c.ret ?? undefined, 10);
  // A screen with nobody in it is left out.
  assert.equal(ideas.find((i) => i.id === "turnarounds"), undefined);
});

test("a card's figure is its page's backtest, not the snapshot's average", () => {
  // The snapshot ranks on weekly closes; the page backtests daily closes from the range's first day.
  const ideas = buildIdeas([info("A", { industries: 3 }), info("B", { industries: 4 })], snap({ A: st(10), B: st(40) }), NOW);
  const daily = {
    A: [{ t: ago(366), c: 100 }, { t: ago(200), c: 150 }, { t: ago(0), c: 130 }],
    B: [{ t: ago(366), c: 50 }, { t: ago(0), c: 110 }],
  };
  const backtests = Object.fromEntries(
    ideas.map((i) => {
      const r = runBacktest(i.stocks.map((s) => ({ ticker: s.ticker, weight: 1, points: daily[s.ticker as "A" | "B"] })), 10);
      // The page's return card: last value over first.
      return [i.id, { ret: (r.points[r.points.length - 1].c / r.points[0].c - 1) * 100, holdings: r.holdings }];
    }),
  );
  const out = withBacktestReturns(ideas, backtests);
  const cross = out.find((i) => i.id === "cross-industry")!;
  near(cross.ret!, 75); // (30% + 120%) / 2, where the snapshot said 25%
  assert.equal(cross.retLabel, "1Y");
  const top = out.find((i) => i.id === "top-1y")!;
  near(top.ret!, 75);
  // Rows show the backtest's own return per stock, highest first.
  assert.deepEqual(top.stocks, [
    { ticker: "B", stat: "+120%" },
    { ticker: "A", stat: "+30.0%" },
  ]);
});

test("a card with no backtest shows no figure rather than another calculation's", () => {
  const ideas = buildIdeas([info("A", { industries: 3 })], snap({ A: st(10) }), NOW);
  const out = withBacktestReturns(ideas, {});
  assert.ok(out.every((i) => i.ret === null));
  assert.deepEqual(
    out.find((i) => i.id === "top-1y")!.stocks,
    ideas.find((i) => i.id === "top-1y")!.stocks,
  );
});

test("companies with a one-off year are in no rule-based basket, and each rule says so", () => {
  const sc = { listed: 1, strength: 3, layer: "L", industry: "I" };
  const ideas = buildIdeas(
    [
      info("ONEOFF", { outlier: true, roce: 99, industries: 5, scarce: sc, rev: [1000, 1100, 1200, 1300, 1400], np: [100, -50, 60, 80, 120] }),
      info("PLAIN", { roce: 20, pe: 15, industries: 3, scarce: sc }),
    ],
    snap({ ONEOFF: st(300, 200), PLAIN: st(10, 200) }),
    NOW,
  );
  assert.ok(ideas.length >= 5);
  for (const idea of ideas) {
    assert.ok(!idea.stocks.some((s) => s.ticker === "ONEOFF"), idea.id);
    assert.ok(idea.rule.includes("One-off years left out."), idea.id);
  }
  assert.deepEqual(ideas.find((i) => i.id === "top-1y")!.stocks.map((s) => s.ticker), ["PLAIN"]);
});
