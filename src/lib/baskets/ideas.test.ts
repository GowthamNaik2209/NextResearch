import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIdeas, priceStat, sinceRange, themeFootprint, withBacktestReturns, type IdeaStockInfo, type PriceSnapshot } from "./ideas";
import { runBacktest } from "./backtest";
import { onBenchWindow } from "./run";

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

test("a recent listings card says since listing; each row keeps just its listing month", () => {
  const ideas = buildIdeas([info("NEW")], snap({ NEW: st(undefined, 100) }), NOW);
  const [ipo] = withBacktestReturns(
    ideas.filter((i) => i.id === "recent-ipos"),
    { "recent-ipos": { ret: 12, holdings: [{ ticker: "NEW", ret: 12 }] } },
  );
  assert.equal(ipo.retLabel, "since listing");
  near(ipo.ret ?? undefined, 12);
  // No second copy of the stock's return baked in at render: the page's Return column is the one figure.
  assert.match(ipo.stocks[0].stat, /^listed [A-Z][a-z]{2} \d{4}$/);
});

test("recent listings lists every company listed in the past two years, with no cap", () => {
  const n = 40;
  const all = Array.from({ length: n }, (_, i) => info(`L${i}`));
  const stats = Object.fromEntries(all.map((s, i) => [s.ticker, st(undefined, 10 + i * 17)])); // 10 to 673 days ago
  const ipo = buildIdeas([...all, info("OLD")], snap({ ...stats, OLD: st(5, 800) }), NOW).find((i) => i.id === "recent-ipos")!;
  assert.equal(ipo.stocks.length, n);
  assert.ok(!ipo.stocks.some((s) => s.ticker === "OLD"));
  assert.match(ipo.rule, /^Every covered company listed in the past two years/);
  assert.equal(ipo.range, "2Y");
});

test("a recent listing's return is one figure: its backtest holding, its table row and its chart line", () => {
  // The stored Nifty 50's days (the window): the store's last close is day 3.
  const nifty = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"];
  // A stored stock, and one the store lacks read live from Yahoo, with today's tick on day 4.
  const stored = [{ t: "2026-10-27", c: 100 }, { t: "2026-10-28", c: 104 }, { t: "2026-10-29", c: 110 }];
  const live = [{ t: "2026-10-28", c: 50 }, { t: "2026-10-29", c: 55 }, { t: "2026-10-30", c: 70 }];
  const series = { A: onBenchWindow(stored, nifty, "1M"), B: onBenchWindow(live, nifty, "1M") };
  const bt = runBacktest(
    Object.entries(series).map(([ticker, points]) => ({ ticker, weight: 1, points })),
    10,
    { joinLate: true, calendar: nifty },
  );
  // The basket ends on the Nifty's last close, not on the live tick.
  assert.equal(bt.points[bt.points.length - 1].t, "2026-10-29");
  // The chart's line for a stock: its own series, cut at the basket's last day, last over first.
  const line = (pts: { t: string; c: number }[]) => {
    const cut = pts.filter((p) => p.t <= bt.points[bt.points.length - 1].t);
    return (cut[cut.length - 1].c / cut[0].c - 1) * 100;
  };
  const own = new Map(bt.holdings.map((h) => [h.ticker, h.ret]));
  near(own.get("A"), 10);
  near(own.get("B"), 10); // 50 -> 55, not 50 -> 70
  near(own.get("A"), line(stored));
  near(own.get("B"), line(live));
  // The card's row text carries no other figure that could disagree.
  const ideas = buildIdeas([info("A"), info("B")], snap({ A: st(undefined, 40), B: st(undefined, 30) }), NOW);
  const [ipo] = withBacktestReturns(ideas.filter((i) => i.id === "recent-ipos"), { "recent-ipos": { ret: 10, holdings: bt.holdings } });
  assert.ok(ipo.stocks.every((s) => !s.stat.includes("%")));
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

test("themeFootprint counts industries and policies as /connections does, leaving out the index", () => {
  const cat = { a: "sector", b: "sector", c: "policy", nifty50: "index" } as const;
  const f = themeFootprint(["a", "b", "c", "nifty50", "unknown"], (s) => cat[s as keyof typeof cat]);
  // An unknown slug is an industry (category is optional and defaults to one); the index is neither.
  assert.deepEqual(f, { industries: 3, policies: 1 });
  assert.deepEqual(themeFootprint(["nifty50"], (s) => cat[s as keyof typeof cat]), { industries: 0, policies: 0 });
});
