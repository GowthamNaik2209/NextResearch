import { test } from "node:test";
import assert from "node:assert/strict";
import { BLUME_WEIGHT, IC, MARKET, VOL_FLOOR, Z80, Z_MAX, blume, caseReturn, casesFor, compactProjection, explainStock, fundamentalScore, latestRun, projectStock, scoreScale, usualGrowth, yearsOfResults, type ProjectionInput, type ScoreScale } from "./projection";
import { betaOf, realisedVol, riskOf } from "./projection-risk";
import { annualVol, basketPath, projectBasket, simulate, stockPath, weeklyDates } from "./projection-basket";

const base: ProjectionInput = {
  rev: [1000, 1100, 1210, 1331, 1464.1],
  np: [100, 110, 121, 133.1, 146.41],
  price: 100,
  mcapCr: 2928.2, // P/E 20 on the latest year's profit
  pe: 20,
  cagr: [10, 10, 10],
  divYield: 1,
  asOf: "31 Mar 2026",
  industry: { margin: 0.1 },
  risk: { beta: 1.3, vol: 0.3 },
};
// Scores centred on 10% with a 5-point spread.
const scale: ScoreScale = { median: 0.1, sd: 0.05, n: 100 };
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test("latest run of years: consecutive, ending at the latest reported", () => {
  assert.deepEqual(latestRun([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), [0, 4]);
  assert.deepEqual(latestRun([1, null, 3, 4, 5], [1, 2, 3, 4, 5]), [2, 4]);
  assert.deepEqual(latestRun([1, 2, 3, 4, null], [1, 2, 3, 4, null]), [0, 3]);
  assert.equal(latestRun([null, null], [null, null]), null);
  assert.equal(yearsOfResults([null, null, 3, 4, 5], [null, null, 1, 1, 1]), 3);
  assert.equal(yearsOfResults([null, null, null, 4, 5], [null, null, null, 1, 1]), 2);
});

test("fewer than 3 years, no price, or under 3 years of trading is left out with the reason", () => {
  const p = projectStock({ ...base, rev: [null, null, null, 4, 5], np: [null, null, null, 1, 1] }, scale);
  assert.equal(!p.ok && p.reason, "2 years of results (needs 3)");
  const q = projectStock({ ...base, price: null }, scale);
  assert.equal(!q.ok && q.reason, "No price or market cap in our last data update");
  assert.equal(projectStock({ ...base, rev: [null, null, 3, 4, 5], np: [null, null, 1, 1, 1] }, scale).ok, true);
  const ipo = projectStock({ ...base, cagr: [40, null, null] }, scale);
  assert.equal(!ipo.ok && ipo.reason, "Listed under 3 years ago (needs 3 years of trading)");
});

test("usual growth: lowest of median year, CAGR and a recent slowdown, faded 55% toward 10%", () => {
  near(usualGrowth([1000, 1100, 1210, 1331]).growth, 0.1);
  // 30% a year fades 55% of the way to 10%: 19%.
  near(usualGrowth([1000, 1300, 1690, 2197]).growth, 0.19);
  // A post-Covid jump in the first year doesn't set it: the median year does.
  near(usualGrowth([500, 1000, 1100, 1210, 1331]).growth, 0.1);
  // A recent collapse counts: median +40% but the latest year -50% gives a usual rate of -5%.
  near(usualGrowth([100, 705, 1342, 1209, 603]).hist, -0.05, 0.01);
  assert.equal(usualGrowth([100, 300, 900, 2700, 8100]).growth, 0.4); // capped
});

test("Base is the market return (rf + Blume beta x ERP - dividend yield) plus IC x vol x z", () => {
  const e = explainStock(base, scale);
  assert.ok(e.ok);
  if (!e.ok) return;
  const c = e.ctx;
  near(c.beta, BLUME_WEIGHT * 1.3 + (1 - BLUME_WEIGHT));
  near(c.market, MARKET.rf + c.beta * MARKET.erp - 0.01);
  // 10% growth, margin steady at 10% (own and industry both 10%): score 10%, the middle, so no tilt.
  near(c.fundamentals!.score, 0.1, 1e-9);
  near(c.z, 0, 1e-9);
  near(c.base1, c.market, 1e-9);
  // Faster growth: score above the middle, a small positive tilt.
  const fast = explainStock({ ...base, rev: [1000, 1300, 1690, 2197, 2856.1], np: [100, 130, 169, 219.7, 285.61] }, scale);
  assert.ok(fast.ok);
  if (fast.ok) {
    near(fast.ctx.fundamentals!.growth, 0.19);
    near(fast.ctx.z, (0.19 - 0.1) / 0.05);
    near(fast.ctx.tilt, IC * 0.3 * fast.ctx.z);
  }
  // The score counts at most 3 standard deviations.
  const huge = explainStock({ ...base, rev: [100, 300, 900, 2700, 8100], np: [10, 30, 90, 270, 810] }, scale);
  assert.ok(huge.ok && huge.ctx.z === Z_MAX);
});

test("no measured beta: 1; no price history: volatility from the 52-week range; never below the floor", () => {
  assert.equal(blume(null), 1);
  const e = explainStock({ ...base, risk: null, range: [80, 160] }, scale);
  assert.ok(e.ok);
  if (!e.ok) return;
  assert.equal(e.ctx.betaSource, "default");
  assert.equal(e.ctx.beta, 1);
  assert.equal(e.ctx.volSource, "range");
  near(e.ctx.vol, Math.log(2) / Math.sqrt(8 / Math.PI));
  const calm = explainStock({ ...base, risk: { beta: 0.5, vol: 0.1 } }, scale);
  assert.ok(calm.ok && calm.ctx.vol === VOL_FLOOR && calm.ctx.volSource === "floor");
  const none = explainStock({ ...base, risk: null, range: null }, scale);
  assert.ok(none.ok && none.ctx.vol === VOL_FLOOR && none.ctx.volSource === "floor");
});

test("Bear and Bull: 10th and 90th percentiles of a lognormal outcome with mean Base", () => {
  const c = { market: 0.12, tilt: 0.01, vol: 0.3 };
  const [bear, mid, bull] = casesFor(c, 1);
  near(mid, 0.13);
  const med = (1 + mid) * Math.exp(-0.045);
  near(bear, med * Math.exp(-Z80 * 0.3) - 1);
  near(bull, med * Math.exp(Z80 * 0.3) - 1);
  // Two years: market compounded, tilt once, width by sqrt(2).
  const [b2, m2, u2] = casesFor(c, 2);
  near(m2, 1.12 * 1.13 - 1);
  near(Math.log((1 + u2) / (1 + b2)), 2 * Z80 * 0.3 * Math.SQRT2);
  // Lognormal check: with mean (1 + Base), 10% of outcomes fall below Bear.
  const p = projectStock(base, scale);
  assert.ok(p.ok && p.ret["1"][0] < p.ret["1"][1] && p.ret["1"][2] > p.ret["1"][1]);
});

test("loss-maker: market return and volatility only, no score", () => {
  const p = projectStock({ ...base, np: [-10, -20, -15, -5, -8], pe: null }, scale);
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.equal(p.method, "market");
  assert.equal(p.score, null);
  assert.equal(p.tilt, 0);
  near(p.ret["1"][1], p.market);
  assert.equal(fundamentalScore({ ...base, np: [-10, -20, -15, -5, -8], pe: null }), null);
});

test("margin: a third of the way to the average of its own and its industry's median, at most 15% of itself a year", () => {
  // Margin 2% today, 10% usual, industry 10%: a third of the way is 4.7%, held to 2.3%.
  const e = explainStock({ ...base, np: [100, 110, 121, 133.1, 29.282] }, scale);
  assert.ok(e.ok);
  if (e.ok) near(e.ctx.fundamentals!.marginFactor, 1.15);
  const ind = explainStock({ ...base, industry: { margin: 0.2 } }, scale);
  assert.ok(ind.ok);
  if (ind.ok) {
    near(ind.ctx.fundamentals!.aimMargin, 0.15);
    near(ind.ctx.fundamentals!.marginThen, 0.1 + 0.05 / 3);
  }
});

test("a one-off year is left out of the margins", () => {
  const e = explainStock({ ...base, np: [100, 110, 600, 133.1, 146.41], oneOffIndex: 2 }, scale);
  assert.ok(e.ok);
  if (e.ok) {
    assert.equal(e.ctx.skipped, "FY24");
    assert.ok(Math.max(...e.ctx.fundamentals!.margins) < 0.2);
  }
});

test("score scale: median and sample standard deviation", () => {
  const s = scoreScale([0.1, 0.2, 0.3]);
  near(s.median, 0.2);
  near(s.sd, 0.1);
  assert.equal(scoreScale([]).sd, 0);
  // No spread: no tilt.
  const e = explainStock(base, { median: 0, sd: 0, n: 0 });
  assert.ok(e.ok && e.ctx.z === 0);
});

test("compact keeps the shape and rounds", () => {
  const p = compactProjection(projectStock(base, scale));
  assert.ok(p.ok);
  if (p.ok) assert.equal(Math.round(p.ret["1"][1] * 1e4), p.ret["1"][1] * 1e4);
  assert.equal(caseReturn(p, 1, "base"), p.ok ? p.ret["1"][1] : null);
  assert.equal(caseReturn(undefined, 1, "base"), null);
});

test("price statistics: beta from weekly returns, volatility from the last year's daily ones", () => {
  // A stock moving exactly 1.5x the index every day: beta 1.5.
  const days = Array.from({ length: 760 }, (_, i) => new Date(Date.UTC(2024, 9, 1) + i * 86_400_000).toISOString().slice(0, 10));
  let m = 100, s = 100;
  const index = [], stock = [];
  for (let i = 0; i < days.length; i++) {
    const r = Math.sin(i * 1.7) * 0.01;
    m *= 1 + r;
    s *= 1 + 1.5 * r;
    index.push({ t: days[i], c: m });
    stock.push({ t: days[i], c: s });
  }
  const b = betaOf(stock, index, days[days.length - 1])!;
  assert.ok(Math.abs(b - 1.5) < 0.05, `${b}`);
  const v = realisedVol(stock, days[days.length - 1])!;
  assert.ok(v > 0.1 && v < 0.3, `${v}`);
  assert.deepEqual(riskOf([], index), { beta: null, vol: null });
  // Too short a history: no beta.
  assert.equal(betaOf(stock.slice(-100), index, days[days.length - 1]), null);
});

const proj = (r: number) => ({ ok: true, years: 5, method: "pe", span: "FY22-FY26", beta: 1, betaSource: "prices", vol: 0.3, volSource: "prices", divYield: 0, market: r, growth: null, marginNow: null, marginThen: null, score: null, z: 0, tilt: 0, ret: { "1": [r - 0.1, r, r + 0.1], "2": [r, r, r] } }) as const;

test("basket: left-out share spread in proportion; points sum to the return", () => {
  const b = projectBasket(
    [
      { ticker: "A", weight: 50, proj: proj(0.2) as never },
      { ticker: "B", weight: 30, proj: proj(-0.1) as never },
      { ticker: "C", weight: 20, proj: { ok: false, years: 2, reason: "2 years of results (needs 3)" } },
      { ticker: "D", weight: 0, proj: proj(0.5) as never },
    ],
    { h: 1, scenario: "base" },
  );
  near(b.spread, 0.2);
  assert.deepEqual(b.leftOut.map((l) => l.ticker), ["C"]);
  assert.equal(b.holdings.length, 2);
  near(b.holdings[0].weight, 0.625);
  near(b.holdings[1].weight, 0.375);
  near(b.ret!, 0.625 * 0.2 + 0.375 * -0.1);
  near(b.holdings.reduce((a, h) => a + h.contribution, 0), b.ret! * 100);
  near(b.holdings.reduce((a, h) => a + h.endWeight, 0), 1);
});

test("basket: nothing projected gives no return", () => {
  const b = projectBasket([{ ticker: "C", weight: 1, proj: { ok: false, years: 1, reason: "x" } }], { h: 1, scenario: "base" });
  assert.equal(b.ret, null);
  assert.equal(b.holdings.length, 0);
});

test("paths start at 0% and end at the return", () => {
  const s = stockPath(0.21, 104);
  assert.equal(s[0], 0);
  near(s[104], 21, 1e-9);
  const holdings = [
    { ticker: "A", weight: 0.5, endWeight: 0, ret: 20, contribution: 10 },
    { ticker: "B", weight: 0.5, endWeight: 0, ret: -10, contribution: -5 },
  ];
  const b = basketPath(holdings, 52);
  near(b[0], 0);
  near(b[52], 5);
  const d = weeklyDates("2026-10-23", 2);
  assert.equal(d.length, 105);
  assert.equal(d[0], "2026-10-23");
  assert.equal(d[1], "2026-10-30");
});

test("simulation: average ends near the return (median below it), ranges ordered, seeded", () => {
  const a = simulate(0.12, 1, 0.2, 7);
  const b = simulate(0.12, 1, 0.2, 7);
  assert.deepEqual(a.mid, b.mid);
  // Median end: 1.12 x e^(-0.02) - 1 = 9.8%.
  assert.ok(Math.abs(a.mid[52] - 9.8) < 3, `median end ${a.mid[52]}`);
  assert.ok(a.lo[52] < a.mid[52] && a.mid[52] < a.hi[52]);
  assert.ok(a.maxDdBad <= a.maxDdTypical && a.maxDdTypical <= 0);
  assert.ok(a.pLoss > 0 && a.pLoss < 0.5);
  assert.equal(a.lo[0], 0);
});

test("annual volatility from daily and weekly bars", () => {
  const daily = Array.from({ length: 253 }, (_, i) => ({ t: new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10), c: 100 * (i % 2 ? 1.01 : 1) }));
  const v = annualVol(daily)!;
  assert.ok(v > 0.1 && v < 0.2, `${v}`);
  assert.equal(annualVol(daily.slice(0, 5)), null);
});
