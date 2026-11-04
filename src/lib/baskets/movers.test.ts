import { test } from "node:test";
import assert from "node:assert/strict";
import { MOVERS_N, MOVERS_SHOWN, rankMovers, rankMoversByFilter, shareUp, stockPeriodReturns, type MoverInput } from "./movers";
import { PERIODS } from "./periods";

const row = (ticker: string, d1: number | null | undefined, extra: Partial<MoverInput> = {}): MoverInput => ({
  ticker,
  name: extra.name ?? `Co ${ticker}`,
  industry: extra.industry ?? "Railways",
  ...(extra.oneOff ? { oneOff: extra.oneOff } : {}),
  ret: extra.ret ?? { "1D": d1 },
  ...(extra.sector ? { sector: extra.sector } : {}),
  ...(extra.policy ? { policy: extra.policy } : {}),
});
const tickers = (ms: { ticker: string }[] | undefined) => (ms ?? []).map((m) => m.ticker);

test("gainers are the biggest rises first, losers the biggest falls first, five each when asked for five", () => {
  const rows = [9, 1, -3, 7, 5, -8, 3, -1, 11, -6, -2, 2].map((v, i) => row(`T${i}`, v));
  const m = rankMovers(rows, 5)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["T8", "T0", "T3", "T4", "T6"]);
  assert.deepEqual(tickers(m.losers), ["T5", "T9", "T2", "T10", "T7"]);
  assert.equal(m.ranked, 12);
});

test("by default each list holds the top 20 (the landing page shows 5, then all 20 on Show more)", () => {
  assert.equal(MOVERS_N, 20);
  assert.equal(MOVERS_SHOWN, 5);
  // 30 risers and 30 fallers, one of each a one-off.
  const rows = Array.from({ length: 60 }, (_, i) => row(`T${i}`, i < 30 ? i + 1 : -(i - 29), i === 29 || i === 59 ? { oneOff: "FY26 one-off" } : {}));
  const m = rankMovers(rows)["1D"]!;
  assert.equal(m.gainers.length, 20);
  assert.equal(m.losers.length, 20);
  assert.deepEqual(tickers(m.gainers).slice(0, 3), ["T29", "T28", "T27"]);
  assert.equal(m.gainers.at(-1)!.ticker, "T10");
  assert.deepEqual(tickers(m.losers).slice(0, 2), ["T59", "T58"]);
  assert.equal(m.gainers[0].oneOff, "FY26 one-off");
  assert.equal(m.losers[0].oneOff, "FY26 one-off");
  // The first five are the same five a top-5 ranking gives.
  assert.deepEqual(tickers(m.gainers).slice(0, MOVERS_SHOWN), tickers(rankMovers(rows, 5)["1D"]!.gainers));
  // Under 20 either way: shorter lists, never padded.
  assert.equal(rankMovers(rows.slice(0, 25))["1D"]!.losers.length, 0);
});

test("one-off companies are ranked like any other, carrying the reason for their tag", () => {
  const why = "FY26 profit includes a one-off gain";
  const rows = [row("SPARC", 40, { oneOff: why }), row("A", 5), row("B", -5), row("JSWSTEEL", -30, { oneOff: why })];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["SPARC", "A"]);
  assert.deepEqual(tickers(m.losers), ["JSWSTEEL", "B"]);
  assert.equal(m.ranked, 4);
  assert.equal(m.gainers[0].oneOff, why);
  // A plain row has no tag at all (not an empty one).
  assert.equal("oneOff" in m.gainers[1], false);
});

test("one-off companies are kept under every filter", () => {
  const rows = [
    row("ONEOFF", 12, { oneOff: "FY26 one-off", sector: "Railways", policy: "PLI" }),
    row("IND", 3, { sector: "Railways" }),
    row("POL", -2, { policy: "PLI" }),
  ];
  const by = rankMoversByFilter(rows, 5, 0);
  for (const f of ["all", "sector", "policy"] as const) {
    assert.equal(by[f]["1D"]!.gainers[0].ticker, "ONEOFF");
    assert.equal(by[f]["1D"]!.gainers[0].oneOff, "FY26 one-off");
  }
});

test("a ticker listed twice (a company in several industries) counts once, its first entry", () => {
  const rows = [row("LT", 6, { industry: "Railways" }), row("LT", 6, { industry: "Defence" }), row("A", 2)];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["LT", "A"]);
  assert.equal(m.gainers[0].industry, "Railways");
  assert.equal(m.ranked, 2);
});

test("equal moves are ordered by name, then ticker, so the lists are stable", () => {
  const rows = [row("Z", 4, { name: "Beta" }), row("Y", 4, { name: "Alpha" }), row("X", 4, { name: "Alpha" }), row("W", -4, { name: "Delta" }), row("V", -4, { name: "Charlie" })];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["X", "Y", "Z"]);
  assert.deepEqual(tickers(m.losers), ["V", "W"]);
});

test("missing, non-finite and flat figures are skipped; a gainer is never also a loser", () => {
  const rows = [row("A", 3), row("B", null), row("C", undefined), row("D", Number.NaN), row("E", Infinity), row("F", 0), row("G", -2)];
  const m = rankMovers(rows, 5, 0)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["A"]);
  assert.deepEqual(tickers(m.losers), ["G"]);
  assert.equal(m.ranked, 3);
});

test("a period with too few figures reads as updating (null), not a thin list", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(`T${i}`, null, { ret: { "1D": i < 7 ? i - 3 : null, "1Y": i < 5 ? i : null } }));
  const all = rankMovers(rows);
  assert.ok(all["1D"]);
  assert.equal(all["1Y"], null);
  assert.equal(all["3Y"], null);
  assert.deepEqual(Object.keys(all).sort(), [...PERIODS].sort());
  assert.deepEqual(rankMovers([])["1D"], null);
});

test("fewer than five risers: the gainers list is shorter, never padded with fallers", () => {
  const m = rankMovers([row("A", 1), row("B", -1), row("C", -2), row("D", -3)])["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["A"]);
  assert.deepEqual(tickers(m.losers), ["D", "C", "B"]);
});

test("the filter decides who is ranked: industry stocks, policy stocks, or every covered stock", () => {
  const rows = [
    row("POL", 9, { industry: "PLI", policy: "PLI" }),
    row("IND", 7, { industry: "Railways", sector: "Railways" }),
    row("BOTH", 5, { industry: "Defence", sector: "Defence", policy: "Make in India" }),
    row("DOWN", -4, { industry: "Railways", sector: "Railways" }),
  ];
  const by = rankMoversByFilter(rows, 5, 0);
  assert.deepEqual(tickers(by.all["1D"]?.gainers), ["POL", "IND", "BOTH"]);
  assert.deepEqual(tickers(by.sector["1D"]?.gainers), ["IND", "BOTH"]);
  assert.deepEqual(tickers(by.sector["1D"]?.losers), ["DOWN"]);
  assert.deepEqual(tickers(by.policy["1D"]?.gainers), ["POL", "BOTH"]);
  assert.deepEqual(tickers(by.policy["1D"]?.losers), []);
  // Each row is tagged with a module of the filter's kind; "all" keeps the home industry.
  assert.equal(by.all["1D"]!.gainers[2].industry, "Defence");
  assert.equal(by.sector["1D"]!.gainers[1].industry, "Defence");
  assert.equal(by.policy["1D"]!.gainers[1].industry, "Make in India");
  // Coverage is counted within the filter's own companies.
  assert.equal(by.policy["1D"]!.ranked, 2);
  assert.equal(rankMoversByFilter([row("IND", 3, { sector: "Railways" })]).policy["1D"], null);
});

// ---- per-stock returns from the store's closes

const days = (n: number, from = "2026-10-01") => Array.from({ length: n }, (_, i) => new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10));

test("1D is the last close against the one before; 1M runs over the Nifty's window", () => {
  const d = days(31);
  const bench = d.map((t, i) => ({ t, c: 100 + i }));
  const stock = d.map((t, i) => ({ t, c: i === 30 ? 110 : 100 }));
  const r = stockPeriodReturns({ "1M": stock }, { "1M": bench });
  assert.ok(Math.abs(r["1D"]! - 10) < 1e-9);
  assert.ok(Math.abs(r["1M"]! - 10) < 1e-9);
  // No 6M / 1Y / 3Y closes: those periods are missing, not zero.
  assert.equal(r["6M"], undefined);
  assert.equal(r["3Y"], undefined);
});

test("a stock that missed the latest day reads flat for 1D, not yesterday's move", () => {
  const d = days(10);
  const bench = d.map((t, i) => ({ t, c: 100 + i }));
  const stock = d.slice(0, 9).map((t, i) => ({ t, c: 50 + i * 5 }));
  assert.equal(stockPeriodReturns({ "1M": stock }, { "1M": bench })["1D"], 0);
});

test("a recent listing doesn't count for a period its history doesn't cover", () => {
  const bench = days(31).map((t) => ({ t, c: 100 }));
  const listed = days(5, "2026-10-27").map((t, i) => ({ t, c: 10 + i }));
  const r = stockPeriodReturns({ "1M": listed }, { "1M": bench });
  assert.equal(r["1M"], undefined);
  assert.ok(r["1D"] != null);
});

// ---- % of stocks up in each industry

test("% up counts rises over the stocks with a figure, per module and period", () => {
  const returns = { A: { "1D": 2, "1W": -1 }, B: { "1D": -3, "1W": 4 }, C: { "1D": 0 }, D: {}, E: { "1D": Number.NaN } };
  const up = shareUp(
    [
      { slug: "rail", tickers: ["A", "B", "C", "D", "A"] },
      { slug: "empty", tickers: ["D", "E", "Z"] },
    ],
    returns,
  );
  // A up, B down, C flat (not up), D no figure; A listed twice counts once.
  assert.deepEqual(up["1D"].rail, { up: 1, n: 3, m: 4 });
  assert.deepEqual(up["1W"].rail, { up: 1, n: 2, m: 4 });
  // No figures at all (or only NaN, or an unknown ticker): the module sits the period out.
  assert.equal(up["1D"].empty, undefined);
  assert.deepEqual(Object.keys(up["3Y"]), []);
});
