import { test } from "node:test";
import assert from "node:assert/strict";
import { Metrics, alignTo, dataGaps, type DailyBars } from "./compute";
import { isCheckDay, runSignals } from "./engine";
import { readingsNow } from "./readings";
import { runBasketSignals } from "./basket";
import { NSE_HOLIDAYS } from "@/lib/financials/trading-day";
import { decodeStrategy, encodeStrategy, parseStrategy, PRESETS, type Strategy } from "./strategy";

const near = (a: number | null | undefined, b: number, eps = 1e-6) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} != ${b}`);

// Weekdays from Mon 6 Jan 2025, one bar per close; highs and lows 1% either side unless given.
function bars(closes: number[], opts: { hl?: boolean } = {}): DailyBars {
  const t: string[] = [];
  let d = Date.UTC(2025, 0, 6);
  while (t.length < closes.length) {
    const wd = new Date(d).getUTCDay();
    if (wd !== 0 && wd !== 6) t.push(new Date(d).toISOString().slice(0, 10));
    d += 86_400_000;
  }
  const hl = opts.hl !== false;
  return { t, o: closes.map((c) => (hl ? c : null)), h: closes.map((c) => (hl ? c * 1.01 : null)), l: closes.map((c) => (hl ? c * 0.99 : null)), c: closes, v: closes.map(() => 1000) };
}

const metrics = (b: DailyBars) => new Metrics({ bars: b, nifty: b.c.map(() => 100), panel: null, gaps: dataGaps(b) });

const strat = (s: Partial<Strategy>): Strategy => ({ entry: { all: true, conds: [] }, exit: { all: false, conds: [] }, stops: {}, check: "d", cost: 0, range: "5Y", ...s });

test("a rule met on a close trades at the next close, not the same one", () => {
  // Price steps above 105 on day 3; entry trades at day 4's close (110), exit rule (below 105) on day 6 trades on day 7.
  const c = [100, 101, 102, 106, 110, 108, 104, 90, 95];
  const s = strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] }, exit: { all: false, conds: [{ m: "close", op: "below", v: 105 }] } });
  const r = runSignals(metrics(bars(c)), s, 0)!;
  assert.equal(r.trades.length, 1);
  const [first] = r.trades;
  assert.equal(first.entryPx, 110);
  assert.equal(first.exitPx, 90);
  assert.equal(first.reason, "rule");
  near(first.ret, (90 / 110 - 1) * 100);
  // Why: the entry rule was met on 106 (the close before), the exit on 104.
  assert.equal(first.entrySignal?.values.close, 106);
  assert.equal(first.exitSignal?.values.close, 104);
  // 95 stays under 105, so no new entry: out at the end.
  assert.equal(r.now.in, false);
});

test("costs come off half on each side", () => {
  const c = [100, 100, 106, 110, 120, 100, 100];
  const s = strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] }, exit: { all: false, conds: [{ m: "close", op: "below", v: 105 }] }, cost: 1 });
  const r = runSignals(metrics(bars(c)), s, 0)!;
  const t = r.trades[0];
  // In at 110 (the close after 106), signal out on 100, out at the next close, 100.
  assert.equal(t.entryPx, 110);
  assert.equal(t.exitPx, 100);
  near(t.ret, ((100 * 0.995) / (110 / 0.995) - 1) * 100);
  near(r.curve[r.curve.length - 1].rules, 100 * 0.995 * (100 / 110) * 0.995);
});

test("a trailing stop exits on the close after the price falls that far from its peak", () => {
  const c = [100, 101, 110, 120, 130, 125, 116, 115, 140];
  const s = strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 100.5 }] }, stops: { trail: 10 } });
  const r = runSignals(metrics(bars(c)), s, 0)!;
  const t = r.trades[0];
  assert.equal(t.entryPx, 110);
  // Peak 130; 116 is 10.8% below -> exits at the next close, 115.
  assert.equal(t.reason, "trail");
  assert.equal(t.exitPx, 115);
});

test("stop loss, take profit and time stop", () => {
  const entry = { all: true, conds: [{ m: "close", op: "above" as const, v: 100.5 }] };
  const loss = runSignals(metrics(bars([100, 101, 100, 92, 90, 95])), strat({ entry, stops: { loss: 5 } }), 0)!;
  assert.equal(loss.trades[0].reason, "loss");
  assert.equal(loss.trades[0].exitPx, 90);
  const profit = runSignals(metrics(bars([100, 101, 100, 112, 115, 95])), strat({ entry, stops: { profit: 10 } }), 0)!;
  assert.equal(profit.trades[0].reason, "profit");
  assert.equal(profit.trades[0].exitPx, 115);
  const time = runSignals(metrics(bars([100, 101, 102, 103, 104, 105, 106])), strat({ entry, stops: { days: 2 } }), 0)!;
  assert.equal(time.trades[0].reason, "days");
  assert.equal(time.trades[0].days, 3);
});

test("the newest close counts as a weekly or monthly check only when its week or month is over", () => {
  // Wed 8 Jan 2025 is the newest close: mid-week, so no weekly check; a Friday newest close is one.
  const midweek = bars(new Array(3).fill(100));
  assert.equal(isCheckDay(midweek.t, 2, "w"), false);
  assert.equal(isCheckDay(midweek.t, 2, "d"), true);
  const friday = bars(new Array(5).fill(100));
  assert.equal(isCheckDay(friday.t, 4, "w"), true);
  assert.equal(isCheckDay(friday.t, 4, "m"), false);
  // Fri 31 Jan 2025: the month's last weekday.
  const monthEnd = bars(new Array(20).fill(100));
  assert.equal(monthEnd.t[19], "2025-01-31");
  assert.equal(isCheckDay(monthEnd.t, 19, "m"), true);
});

test("a holiday Friday makes the Thursday close the week's check", () => {
  const fri = [...NSE_HOLIDAYS].find((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 5);
  assert.ok(fri, "the calendar has a Friday holiday");
  const thu = new Date(Date.parse(`${fri}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const wed = new Date(Date.parse(`${fri}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
  assert.equal(isCheckDay([wed, thu], 1, "w"), true);
  assert.equal(isCheckDay([wed], 0, "w"), false);
});

test("a weekly rule met mid-week is not reported as met on the newest close", () => {
  const b = bars([100, 100, 110]);
  const r = runSignals(metrics(b), strat({ check: "w", entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] } }), 0)!;
  assert.equal(r.pending, null);
});

test("weekly checks read the rules only on each week's last close", () => {
  const b = bars(new Array(10).fill(100));
  // 6-10 Jan, 13-17 Jan: Fridays are index 4 and 9.
  const fridays = b.t.map((_, i) => isCheckDay(b.t, i, "w")).flatMap((x, i) => (x ? [i] : []));
  assert.deepEqual(fridays, [4, 9]);
  const months = bars(new Array(25).fill(100));
  const ends = months.t.map((_, i) => isCheckDay(months.t, i, "m")).flatMap((x, i) => (x ? [i] : []));
  assert.equal(months.t[ends[0]], "2025-01-31");
});

test("an exit with no rules and no controls holds to the end, as an open trade", () => {
  const c = [100, 110, 120, 130];
  const r = runSignals(metrics(bars(c)), strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] } }), 0)!;
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].reason, "open");
  assert.equal(r.now.in, true);
  assert.equal(r.stats.closed, 0);
});

test("rules that never enter have no Sharpe or Sortino, not a huge number", () => {
  const r = runSignals(metrics(bars([100, 101, 102, 103, 104])), strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 1000 }] } }), 0.055)!;
  assert.equal(r.trades.length, 0);
  assert.equal(r.rules.sharpe, null);
  assert.equal(r.rules.sortino, null);
});

test("a signal on the last close is reported as pending", () => {
  const r = runSignals(metrics(bars([100, 100, 100, 110])), strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] } }), 0)!;
  assert.equal(r.pending, "entry");
  assert.equal(r.trades.length, 0);
});

test("the Nifty is carried onto the stock's days", () => {
  assert.deepEqual(alignTo(["2025-01-01", "2025-01-02", "2025-01-03"], [{ t: "2025-01-01", c: 1 }, { t: "2025-01-03", c: 3 }]), [1, 1, 3]);
  assert.deepEqual(alignTo(["2025-01-01"], [{ t: "2025-01-02", c: 1 }]), [null]);
});

test("closes-only prices make the high/low indicators unavailable, not wrong", () => {
  const b = bars(Array.from({ length: 300 }, (_, i) => 100 + i), { hl: false });
  const mx = metrics(b);
  assert.ok(mx.unavailable("adx"));
  assert.equal(mx.unavailable("rsi14"), null);
  assert.equal(mx.unavailable("high52"), null);
  const rd = readingsNow(mx);
  assert.ok(rd.find((x) => x.id === "supertrend")?.unavailable);
  assert.equal(rd.find((x) => x.id === "sma200")?.state, "Price above");
});

test("Readings now show the site's Trend, not the price-store ranking", () => {
  const mx = metrics(bars(Array.from({ length: 30 }, (_, i) => 100 + i)));
  const tr = (x: ReturnType<typeof readingsNow>) => x.find((r) => r.id === "trendPct")!;
  assert.equal(tr(readingsNow(mx, 48)).value, 48);
  assert.equal(tr(readingsNow(mx, 85)).state, "Top fifth");
  assert.equal(tr(readingsNow(mx, null)).state, "Too new");
});

test("strategies are checked: unknown indicators, mismatched kinds, numbers kept in range", () => {
  assert.equal(parseStrategy({ entry: { conds: [] } }).ok, false);
  assert.equal(parseStrategy({ entry: { conds: [{ m: "nope", op: "above", v: 1 }] } }).ok, false);
  assert.equal(parseStrategy({ entry: { conds: [{ m: "rsi14", op: "above", r: "sma200" }] } }).ok, false);
  const p = parseStrategy({ entry: { conds: [{ m: "close", op: "crossAbove", r: "sma200" }] }, stops: { trail: 99, days: 3.6 }, cost: 9, range: "10Y", check: "x" });
  assert.ok(p.ok);
  if (p.ok) {
    assert.equal(p.strategy.stops.trail, 60);
    assert.equal(p.strategy.stops.days, 4);
    assert.equal(p.strategy.cost, 2);
    assert.equal(p.strategy.range, "5Y");
    assert.equal(p.strategy.check, "d");
  }
});

test("every preset is a valid strategy and survives the URL", () => {
  for (const pr of PRESETS) {
    const p = parseStrategy(pr.strategy);
    assert.ok(p.ok, pr.id);
    assert.deepEqual(decodeStrategy(encodeStrategy(pr.strategy)), p.ok ? p.strategy : null, pr.id);
  }
  assert.equal(decodeStrategy("not-base64!!"), null);
});

test("figures: a steady 1% a day stock held for the range", () => {
  const c = Array.from({ length: 260 }, (_, i) => 100 * 1.001 ** i);
  const r = runSignals(metrics(bars(c)), strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 0 }] } }), 0)!;
  assert.equal(r.hold.maxDd, 0);
  assert.ok((r.hold.cagr as number) > 20);
  assert.equal(r.trades[0].entryT, r.curve[1].t);
  near(r.stats.timeIn, ((r.curve.length - 1) / r.curve.length) * 100);
});

test("a basket is the average of its stocks' slots, an idle slot in cash", () => {
  const up = bars([100, 101, 106, 110, 120, 130]);
  const flat = bars([100, 100, 100, 100, 100, 100]);
  const s = strat({ entry: { all: true, conds: [{ m: "close", op: "above", v: 105 }] } });
  const r = runBasketSignals([{ ticker: "UP", mx: metrics(up) }, { ticker: "FLAT", mx: metrics(flat) }], s, 0, up.t, up.c.map(() => 100))!;
  // UP: in at 110 (the close after 106), worth 130/110 of its slot at the end; FLAT never enters.
  near(r.curve[r.curve.length - 1].rules, (100 * (130 / 110) + 100) / 2);
  near(r.curve[r.curve.length - 1].hold, (130 + 100) / 2);
  assert.deepEqual(r.curve.map((p) => p.held), [0, 0, 0, 1, 1, 1]);
  assert.equal(r.stocks.find((x) => x.ticker === "UP")?.in, true);
  assert.equal(r.stocks.find((x) => x.ticker === "FLAT")?.in, false);
  near(r.stats.timeIn, (3 / 6 / 2) * 100);
});
