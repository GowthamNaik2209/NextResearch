import { test } from "node:test";
import assert from "node:assert/strict";
import { ANNUAL_MAX, ANNUAL_MIN, bound, caseReturn, compactProjection, growthCases, latestRun, marginCases, projectStock, yearsOfResults, type ProjectionInput } from "./projection";
import { annualVol, basketPath, projectBasket, simulate, stockPath, weeklyDates } from "./projection-basket";

const base: ProjectionInput = {
  rev: [1000, 1100, 1210, 1331, 1464.1],
  np: [100, 110, 121, 133.1, 146.41],
  price: 100,
  mcapCr: 2928.2, // P/E 20 on the latest year's profit
  pe: 20,
  cagr: [10, 10, 10],
  asOf: "31 Mar 2026",
  industry: { pe: 25, ps: 3 },
};
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test("latest run of years: consecutive, ending at the latest reported", () => {
  assert.deepEqual(latestRun([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), [0, 4]);
  assert.deepEqual(latestRun([1, null, 3, 4, 5], [1, 2, 3, 4, 5]), [2, 4]);
  assert.deepEqual(latestRun([1, 2, 3, 4, null], [1, 2, 3, 4, null]), [0, 3]);
  assert.equal(latestRun([null, null], [null, null]), null);
  assert.equal(yearsOfResults([null, null, 3, 4, 5], [null, null, 1, 1, 1]), 3);
  assert.equal(yearsOfResults([null, null, null, 4, 5], [null, null, null, 1, 1]), 2);
});

test("fewer than 3 years, or no price, is left out with the reason", () => {
  const p = projectStock({ ...base, rev: [null, null, null, 4, 5], np: [null, null, null, 1, 1] });
  assert.equal(p.ok, false);
  assert.equal(!p.ok && p.reason, "2 years of results (needs 3)");
  const q = projectStock({ ...base, price: null });
  assert.equal(!q.ok && q.reason, "No price or market cap in our last data update");
  assert.equal(projectStock({ ...base, rev: [null, null, 3, 4, 5], np: [null, null, 1, 1, 1] }).ok, true);
});

test("growth cases: the median year faded toward 10%, bear and bull the same distance away", () => {
  const [bear, mid, bull] = growthCases([1000, 1100, 1210, 1331]);
  near(mid, 0.1);
  near(bear, 0.07);
  near(bull, 0.13);
  // 30% a year fades 40% of the way to 10%: 22%.
  near(growthCases([1000, 1300, 1690, 2197])[1], 0.22);
  // A post-Covid jump in the first year doesn't set the base: the median year does.
  near(growthCases([500, 1000, 1100, 1210, 1331])[1], 0.1);
  const g = growthCases([100, 300, 900, 2700, 8100]);
  assert.equal(g[1], 0.4); // capped
  assert.ok(g[0] <= g[1] && g[2] >= g[1]);
});

test("margin cases: lowest, median, highest", () => {
  assert.deepEqual(marginCases([0.1, 0.3, 0.2]), [0.1, 0.2, 0.3]);
});

test("steady compounder at its own P/E: base return is its growth", () => {
  const p = projectStock(base);
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.equal(p.method, "pe");
  assert.equal(p.years, 5);
  // Constant 10% margin and growth, own P/E stays ~20 (CAGR 10% and profit 10%: same multiple),
  // as of the fiscal year end (no time passed): base = 10% over 1 year, 21% over 2.
  near(p.ret.own["1"][1], 0.1, 1e-6);
  near(p.ret.own["2"][1], 0.21, 1e-6);
  assert.ok(p.ret.own["1"][0] < p.ret.own["1"][1] && p.ret.own["1"][2] > p.ret.own["1"][1]);
  // Industry P/E 25: a third of the way there in a year, so better than own.
  assert.ok(p.ret.ind["1"][1] > p.ret.own["1"][1]);
  assert.ok(p.ret.ind["2"][1] - p.ret.own["2"][1] > p.ret.ind["1"][1] - p.ret.own["1"][1]);
});

test("earnings grow from today's (trailing P/E), whenever the data is from", () => {
  const later = projectStock({ ...base, asOf: "30 Sep 2026" });
  const p = projectStock(base);
  assert.ok(later.ok && p.ok);
  if (later.ok && p.ok) near(later.ret.own["1"][1], p.ret.own["1"][1], 1e-9);
});

test("a thin margin recovers slowly: at most 15% of itself a year", () => {
  // Margin 2% today, 10% usual: Base aims at 6%, a third of the way in a year is 3.3%, held to 2.3%.
  const p = projectStock({ ...base, np: [100, 110, 121, 133.1, 29.282], pe: 20 });
  assert.ok(p.ok);
  if (p.ok) near(p.ret.own["1"][1], 1.1 * 1.15 * (p.targetOwn === 20 ? 1 : (20 + (p.targetOwn - 20) / 3) / 20) - 1, 1e-6);
});

test("loss-maker uses price to sales", () => {
  const p = projectStock({ ...base, np: [-10, -20, -15, -5, -8], pe: null });
  assert.ok(p.ok);
  if (!p.ok) return;
  assert.equal(p.method, "ps");
  assert.equal(p.margin, null);
  near(p.multipleNow, 2928.2 / 1464.1);
});

test("a case's return stays within the yearly bounds and says so", () => {
  assert.deepEqual(bound(0.5, 1), [0.5, false]);
  const [up, cut] = bound(3, 1);
  near(up, ANNUAL_MAX);
  assert.equal(cut, true);
  near(bound(-1.2, 2)[0], Math.pow(1 + ANNUAL_MIN, 2) - 1);
  const p = projectStock({ ...base, pe: 400, industry: { pe: 10, ps: 1 } });
  assert.ok(p.ok);
  if (!p.ok) return;
  for (const basis of ["own", "ind"] as const)
    for (const h of ["1", "2"] as const)
      for (const r of p.ret[basis][h]) {
        const a = Math.pow(1 + r, 1 / Number(h)) - 1;
        assert.ok(a >= ANNUAL_MIN - 1e-9 && a <= ANNUAL_MAX + 1e-9, `${basis} ${h}: ${a}`);
      }
  // Industry P/E far below: the target is held to 0.7x today's, a third of the way in a year.
  near(p.targetInd!, 280);
});

test("a one-off year is left out of the margins", () => {
  const p = projectStock({ ...base, np: [100, 110, 600, 133.1, 146.41], oneOffIndex: 2 });
  assert.ok(p.ok);
  if (p.ok) {
    assert.equal(p.skipped, "FY24");
    assert.ok(p.margin![2] < 0.2);
  }
});

test("no industry median: industry exit falls back to its own", () => {
  const p = projectStock({ ...base, industry: { pe: null, ps: null } });
  assert.ok(p.ok);
  if (p.ok) assert.deepEqual(p.ret.ind, p.ret.own);
});

test("compact keeps the shape and rounds", () => {
  const p = compactProjection(projectStock(base));
  assert.ok(p.ok);
  if (p.ok) assert.equal(Math.round(p.ret.own["1"][1] * 1e4), p.ret.own["1"][1] * 1e4);
  assert.equal(caseReturn(p, 1, "base", "own"), p.ok ? p.ret.own["1"][1] : null);
  assert.equal(caseReturn(undefined, 1, "base", "own"), null);
});

const proj = (r: number) => ({ ok: true, years: 5, method: "pe", growth: [0, 0, 0], margin: null, multipleNow: 10, targetOwn: 10, targetInd: null, span: "FY22-FY26", capped: false, ret: { own: { "1": [r - 0.1, r, r + 0.1], "2": [r, r, r] }, ind: { "1": [r, r, r], "2": [r, r, r] } } }) as const;

test("basket: left-out share spread in proportion; points sum to the return", () => {
  const b = projectBasket(
    [
      { ticker: "A", weight: 50, proj: proj(0.2) as never },
      { ticker: "B", weight: 30, proj: proj(-0.1) as never },
      { ticker: "C", weight: 20, proj: { ok: false, years: 2, reason: "2 years of results (needs 3)" } },
      { ticker: "D", weight: 0, proj: proj(0.5) as never },
    ],
    { h: 1, scenario: "base", exit: "own" },
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
  const b = projectBasket([{ ticker: "C", weight: 1, proj: { ok: false, years: 1, reason: "x" } }], { h: 1, scenario: "base", exit: "own" });
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

test("simulation: median ends near the return, ranges ordered, seeded", () => {
  const a = simulate(0.12, 1, 0.2, 7);
  const b = simulate(0.12, 1, 0.2, 7);
  assert.deepEqual(a.mid, b.mid);
  assert.ok(Math.abs(a.mid[52] - 12) < 3, `median end ${a.mid[52]}`);
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
